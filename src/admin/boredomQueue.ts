import type { Report } from '../firebase/reports';
import type { GameContent } from '../firebase/validate';
import { validateContent } from '../firebase/validate';
import { canModerate, type Role } from '../firebase/roles';

/**
 * Kolejka Strefy Nudy — drobne rzeczy do sprawdzenia, po jednej na raz.
 *
 * Pomysł Alana: zamiast szukać po zakładkach, co jeszcze wymaga uwagi,
 * dostajesz fiszki i przeklikujesz je, kiedy masz chwilę. Każda fiszka to
 * jedna decyzja, nie zadanie na pół godziny.
 *
 * Kolejka jest WSPÓLNA — rzecz sprawdzona przez jedną osobę znika wszystkim.
 * Ale nie każdy widzi to samo: fiszka trafia wyłącznie do kogoś, kto ma prawo
 * ją rozstrzygnąć. Milena nie potwierdzi za Marcina, że jego zgłoszenie
 * działa, a rzeczy czekające na akceptację widzą tylko admin i co-admin —
 * inaczej połowa zespołu klikałaby w karty, przy których i tak dostanie odmowę
 * z reguł bazy.
 */

export type BoredomKind = 'draft' | 'verify' | 'empty' | 'blocker';

export interface BoredomItem {
  /** Stabilny identyfikator — po nim poznajemy, że rzecz już sprawdzono. */
  id: string;
  kind: BoredomKind;
  /** Nagłówek fiszki — co to jest. */
  title: string;
  /** Treść do oceny: opis karty, treść zgłoszenia, brakujące pole. */
  body: string;
  /** Dokąd prowadzi „otwórz w zakładce". */
  link?: string;
}

/** Ile fiszek pokazujemy naraz — reszta doczeka kolejnej sesji. */
export const BOREDOM_LIMIT = 60;

/**
 * Składa kolejkę z tego, co naprawdę czeka.
 *
 * Kolejność ma znaczenie: najpierw rzeczy blokujące zapis (bez nich nikt nie
 * wypuści zmian), potem zgłoszenia czekające na potwierdzenie (ktoś czeka na
 * odpowiedź), potem robocze treści, na końcu puste pola.
 */
export function buildBoredomQueue(input: {
  content: GameContent;
  reports: Report[];
  role: Role;
  /** Imię zalogowanego — po nim poznajemy własne zgłoszenia. */
  author: string;
  /** Rzeczy już sprawdzone (id), wspólne dla zespołu. */
  done: string[];
}): BoredomItem[] {
  const zrobione = new Set(input.done);
  const items: BoredomItem[] = [];

  // 1. Blokady zapisu — dopóki są, nikt nie wypuści zmian treści.
  const walidacja = validateContent(input.content);
  if (!walidacja.ok) {
    for (const [i, blad] of walidacja.errors.entries()) {
      items.push({
        id: `blocker-${i}-${blad.slice(0, 40)}`,
        kind: 'blocker',
        title: 'Blokuje zapis treści',
        body: blad,
      });
    }
  }

  // 2. Zgłoszenia oznaczone jako naprawione — czekają na potwierdzenie.
  //
  // Tylko własne: „czy działa" rozstrzyga ten, kto zgłaszał, bo tylko on wie,
  // co miał na myśli. Moderator widzi dodatkowo te czekające na akceptację.
  const mojePodpisy = input.author.trim().toLowerCase();
  for (const report of input.reports) {
    const czyjes = (report.author ?? '').trim().toLowerCase();

    if (report.status === 'fixed' && czyjes && czyjes === mojePodpisy) {
      items.push({
        id: `verify-${report.id}`,
        kind: 'verify',
        title: `Twoje zgłoszenie: ${report.title}`,
        body: report.description || '(bez opisu)',
        link: `/admin/reports/fixed?open=${report.id}`,
      });
    }

    if (report.status === 'pending' && canModerate(input.role)) {
      items.push({
        id: `pending-${report.id}`,
        kind: 'verify',
        title: `Czeka na akceptację: ${report.title}`,
        body: report.description || '(bez opisu)',
        link: `/admin/reports/pending?open=${report.id}`,
      });
    }
  }

  // 3. Treść robocza — dopisana technicznie, czeka na ocenę merytoryczną.
  for (const card of input.content.cards) {
    if (!card.draft) continue;
    items.push({
      id: `draft-card-${card.id}`,
      kind: 'draft',
      title: `Karta robocza: ${card.name}`,
      body: card.description || '(bez opisu)',
      link: `/admin/cards?filter=${encodeURIComponent(card.name)}`,
    });
  }
  for (const problem of input.content.problems) {
    if (!problem.draft) continue;
    items.push({
      id: `draft-problem-${problem.id}`,
      kind: 'draft',
      title: `Problem roboczy: ${problem.name}`,
      body: problem.story || problem.goal || '(bez opisu)',
      link: `/admin/problems?open=${problem.id}`,
    });
  }

  // 4. Puste pola — nie blokują zapisu, ale zostawiają dziury na ekranie.
  for (const problem of input.content.problems) {
    if (problem.draft) continue;
    if (!problem.antagonist?.trim()) {
      items.push({
        id: `empty-antagonist-${problem.id}`,
        kind: 'empty',
        title: `Brak przeciwnika: ${problem.name}`,
        body: 'Kto albo co stoi na drodze? To pole pokazuje się dziecku na karcie problemu.',
        link: `/admin/problems?open=${problem.id}`,
      });
    }
    if (!problem.consequence?.trim()) {
      items.push({
        id: `empty-consequence-${problem.id}`,
        kind: 'empty',
        title: `Brak skutku: ${problem.name}`,
        body: 'Co się stanie, jeśli drużyna nie zdąży? Pokazuje się na karcie problemu.',
        link: `/admin/problems?open=${problem.id}`,
      });
    }
  }
  for (const [category, families] of Object.entries(input.content.families ?? {})) {
    for (const family of families ?? []) {
      if (family.name?.trim()) continue;
      items.push({
        id: `empty-family-${category}-${family.id}`,
        kind: 'empty',
        title: 'Rodzina bez nazwy',
        body: `W kategorii „${category}" rodzina ${family.id} nie ma nazwy — dziecko zobaczy sam kolor.`,
        link: '/admin/families',
      });
    }
  }

  return items.filter((item) => !zrobione.has(item.id)).slice(0, BOREDOM_LIMIT);
}
