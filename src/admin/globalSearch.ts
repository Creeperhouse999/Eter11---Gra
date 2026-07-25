import { categoryLabel } from '../ui/components/categoryStyles';
import { FAMILY_LABELS } from '../data/families';
import type { GameContent } from '../firebase/validate';

export interface SearchHit {
  /** Zakładka, w której to siedzi. */
  tab: string;
  /**
   * Pod-zakładka w obrębie zakładki, jeśli trafienie tam siedzi.
   *
   * Zakładka „Wstęp i ETER11" ma cztery pod-widoki (historia, zasady,
   * dla dorosłych, kwestie ETER11). Bez tego kliknięcie wyniku z „Dla
   * dorosłych" otwierało domyślną historię — zgłoszone jako „idzie nie tam,
   * gdzie było".
   */
  part?: string;
  /** Nazwa zakładki dla człowieka. */
  where: string;
  /** Co znaleziono — nazwa karty, temat sceny, klucz tekstu. */
  title: string;
  /** Fragment z trafieniem. */
  excerpt: string;
}

/** Skraca fragment do okolic trafienia — bez tego wynik to ściana tekstu. */
function excerpt(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  const at = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0));
  if (!Number.isFinite(at)) return text.slice(0, 90);

  const from = Math.max(0, at - 30);
  const cut = text.slice(from, from + 90).trim();
  return `${from > 0 ? '…' : ''}${cut}${from + 90 < text.length ? '…' : ''}`;
}

/**
 * Szukanie w całej zawartości gry.
 *
 * Wyszukiwarka istniała tylko w kartach, a redaktor pisze też problemy,
 * teksty interfejsu, wstęp i kwestie ETER11. Pytanie „gdzie ja wpisałem to
 * zdanie o hejcie" wymagało obejścia siedmiu zakładek i czytania ich po
 * kolei — więc w praktyce przepisywano zdanie od nowa.
 *
 * Dopasowanie po słowach, nie po całej frazie: nikt nie pamięta zdania
 * dosłownie, pamięta dwa słowa z niego.
 */
export function searchContent(content: GameContent, query: string): SearchHit[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];
  const matches = (text: string) => {
    const lower = text.toLowerCase();
    return terms.every((term) => lower.includes(term));
  };

  const add = (
    tab: string,
    where: string,
    title: string,
    text: string,
    part?: string,
  ) => {
    if (!text || !matches(text)) return;
    hits.push({ tab, where, title, excerpt: excerpt(text, terms), part });
  };

  for (const card of content.cards) {
    // Nazwa kategorii i rodziny, nie klucz silnika: redaktor szuka „cyfrowe"
    // i „czerwona", a nie `digital` i `red`. Bez tego wpisanie nazwy
    // kategorii nie znajdowało żadnej z jej kart.
    const meta = [
      categoryLabel(card.category),
      card.family ? FAMILY_LABELS[card.family] : '',
    ].join(' ');
    add('cards', 'Karty', card.name, `${card.name} ${card.description} ${meta}`);
  }

  for (const problem of content.problems) {
    add(
      'problems',
      'Problemy',
      problem.name,
      `${problem.name} ${problem.story} ${problem.consequence} ${problem.goal} ${problem.antagonist}`,
    );
    for (const slot of problem.slots) {
      // Ścianka wyszukiwana też po nazwie kategorii i rodziny, których
      // wymaga — „cyfrowa czerwona" ma trafić w problem z taką ścianką.
      const slotMeta = `${categoryLabel(slot.key)} ${FAMILY_LABELS[slot.family]}`;
      add('problems', 'Problemy → ścianki', problem.name, `${slot.hint} ${slotMeta}`);
    }
  }

  for (const character of content.characters) {
    add('characters', 'Postacie', character.name, `${character.name} ${character.traits}`);
  }

  for (const [key, value] of Object.entries(content.text)) {
    if (typeof value !== 'string') continue;
    add('text', 'Teksty w grze', key, value);
  }

  if (content.intro) {
    // Klucz pod-zakładki (`part`) prowadzi kliknięcie wprost do właściwego
    // widoku edytora wstępu, nie do domyślnej historii.
    const parts: Array<[keyof typeof content.intro, string]> = [
      ['story', 'Wstęp → Historia'],
      ['rules', 'Wstęp → Zasady'],
      ['adults', 'Wstęp → Dla dorosłych'],
    ];
    for (const [key, label] of parts) {
      // Wstęp bywa zapisany częściowo (sama historia bez zasad itd.) — brakująca
      // część to zero scen, nie `undefined.forEach`, które wywracało wyszukiwarkę.
      (content.intro[key] ?? []).forEach((scene, index) => {
        add(
          'story',
          label,
          scene.heading || `Scena ${index + 1}`,
          `${scene.heading} ${scene.body}`,
          key,
        );
      });
    }
  }

  for (const step of content.tutorial ?? []) {
    add(
      'story',
      'Co mówi ETER11',
      step.id,
      `${step.say} ${step.praise} ${step.nudge ?? ''}`,
      'tutorial',
    );
  }

  return hits;
}
