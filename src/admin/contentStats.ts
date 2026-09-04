import { CATEGORY_ORDER } from '../data/categories';
import { categoryLabel, problemTypeLabel } from '../ui/components/categoryStyles';
import { FAMILY_IDS } from '../data/families';
import { ICON_NAMES } from '../ui/icons/Icon';
import type { GameContent } from '../firebase/validate';

export interface StatEntry {
  label: string;
  value: string;
  /** Doprecyzowanie pod liczbą — bez tego liczba bywa myląca. */
  note?: string;
  /** Coś wymaga uwagi redaktora. */
  warn?: boolean;
}

export interface StatGroup {
  title: string;
  entries: StatEntry[];
}

/**
 * Liczy słowa tak, jak liczy je człowiek: ciągi oddzielone spacjami.
 *
 * Toleruje brak wartości: walidacja treści nie wymaga np. `description` karty
 * ani `consequence` problemu (sprawdza je tylko, gdy są), więc dokument z bazy
 * potrafi ich nie mieć. Bez `?? ''` `undefined.split` wywracał CAŁY panel
 * statystyk na biało — a to panel ma pokazać, że czegoś brakuje, nie paść.
 */
function words(text: string | undefined): number {
  return (text ?? '').split(/\s+/).filter(Boolean).length;
}

/**
 * Statystyki treści gry.
 *
 * Liczone z zawartości przy każdym otwarciu, nie zapisywane — treść zmienia
 * się w tym samym panelu, więc każda zapisana liczba byłaby nieaktualna
 * zanim redaktor skończy pisać.
 *
 * Poza samymi liczbami szukamy rzeczy, które warto zobaczyć zawczasu:
 * powtórzonych nazw, kart bez opisu i kategorii, których problemy wymagają
 * częściej, niż talia jest w stanie dostarczyć.
 */
export function contentStats(content: GameContent): StatGroup[] {
  const { cards, problems, characters } = content;

  const competences = cards.filter((c) => CATEGORY_ORDER.includes(c.category as never));
  const specials = cards.filter((c) => c.category === 'eter11' || c.category === 'blackswan');
  const swans = cards.filter((c) => c.category === 'blackswan');

  // Ile ścianek wymaga danej kategorii i ile kart tej kategorii jest w talii.
  // Popyt większy od podaży nie jest błędem — karty wracają na stos i krążą —
  // ale mówi, które kategorie są najbardziej napięte.
  const demand = new Map<string, number>();
  const supply = new Map<string, number>();
  for (const problem of problems) {
    for (const slot of problem.slots) {
      demand.set(slot.key, (demand.get(slot.key) ?? 0) + 1);
    }
  }
  for (const card of cards) {
    supply.set(card.category, (supply.get(card.category) ?? 0) + 1);
  }

  const tightest = CATEGORY_ORDER.map((key) => ({
    key,
    ratio: (demand.get(key) ?? 0) / Math.max(1, supply.get(key) ?? 0),
  })).sort((a, b) => b.ratio - a.ratio)[0];

  const cardWords = cards.reduce((sum, c) => sum + words(c.description), 0);
  const storyWords = problems.reduce(
    (sum, p) => sum + words(p.story) + words(p.consequence) + words(p.goal),
    0,
  );
  const introWords = content.intro
    ? [
        // Każda część osobno domknięta: wstęp bywa zapisany częściowo (np. sama
        // historia bez zasad), a rozłożenie `undefined` przez `...` wywalało
        // panel. Brakująca część to zero scen, nie wyjątek.
        ...(content.intro.story ?? []),
        ...(content.intro.rules ?? []),
        ...(content.intro.adults ?? []),
      ].reduce((sum, scene) => sum + words(scene.heading) + words(scene.body), 0)
    : 0;
  const tutorialWords = (content.tutorial ?? []).reduce(
    (sum, step) => sum + words(step.say) + words(step.praise) + words(step.nudge ?? ''),
    0,
  );

  const usedIcons = new Set([
    ...cards.map((c) => c.icon),
    ...problems.map((p) => p.icon),
    ...characters.map((c) => c.icon),
  ]);

  // `Set` domyka liczenie: `indexOf !== index` zostawia KAŻDE wystąpienie po
  // pierwszym, więc nazwa w N egzemplarzach dawała N-1 wpisów (trzy „Echo" →
  // „2" i nota „Echo, Echo"). Powtórzona nazwa to jedna pozycja, nieważne ile
  // razy się powtarza — dedup przed policzeniem i wypisaniem.
  const duplicateNames = [
    ...new Set(
      cards
        .map((c) => c.name)
        .filter((name, index, all) => all.indexOf(name) !== index),
    ),
    // ETER11 występuje w talii wielokrotnie z założenia — to ta sama karta.
  ].filter((name) => name !== 'ETER11');

  const noDescription = cards.filter((c) => !(c.description ?? '').trim()).length;
  const drafts = [
    ...cards.filter((c) => c.draft),
    ...problems.filter((p) => p.draft),
  ].length;

  const descriptionLengths = cards.map((c) => (c.description ?? '').length).filter((n) => n > 0);
  const longestName = [...cards].sort((a, b) => b.name.length - a.name.length)[0];

  const problemTypes = new Map<string, number>();
  for (const problem of problems) {
    problemTypes.set(problem.type, (problemTypes.get(problem.type) ?? 0) + 1);
  }

  const pairs = new Set(
    cards.filter((c) => c.family).map((c) => `${c.category}/${c.family}`),
  );

  return [
    {
      title: 'Z czego składa się gra',
      entries: [
        {
          label: 'Karty',
          value: String(cards.length),
          note: `${competences.length} do zagrania, ${specials.length} specjalnych`,
        },
        {
          label: 'Problemy',
          value: String(problems.length),
          note: `${problems.reduce((s, p) => s + p.slots.length, 0)} ścianek razem`,
        },
        { label: 'Postacie', value: String(characters.length) },
        {
          label: 'Rodziny',
          value: String(FAMILY_IDS.length),
          note: `${CATEGORY_ORDER.length} kategorii × ${FAMILY_IDS.length} rodzin`,
        },
        {
          label: 'Czarne Łabędzie',
          value: String(swans.length),
          note: `${new Set(swans.map((s) => s.blackSwanKind)).size} różne warianty`,
        },
        {
          label: 'Typy problemów',
          value: String(problemTypes.size),
          // Też nazwy, nie klucze: `action` i `thinking` to identyfikatory,
          // których redaktor nigdzie indziej w panelu nie widzi.
          note: [...problemTypes.entries()]
            .map(([kind, count]) => `${problemTypeLabel(kind as never)}: ${count}`)
            .join(', '),
        },
      ],
    },
    {
      title: 'Ile jest do przeczytania',
      entries: [
        {
          label: 'Słowa na kartach',
          value: String(cardWords),
          note: `średnio ${Math.round(cardWords / Math.max(1, cards.length))} na kartę`,
        },
        { label: 'Słowa w problemach', value: String(storyWords) },
        { label: 'Słowa we wstępie', value: String(introWords) },
        { label: 'Słowa ETER11 w samouczku', value: String(tutorialWords) },
        {
          label: 'Razem',
          value: String(cardWords + storyWords + introWords + tutorialWords),
          note: `około ${Math.max(1, Math.round((cardWords + storyWords + introWords + tutorialWords) / 200))} min czytania`,
        },
        {
          label: 'Najdłuższa nazwa karty',
          value: `${longestName?.name.length ?? 0} zn.`,
          note: longestName?.name,
        },
      ],
    },
    {
      title: 'Na co warto spojrzeć',
      entries: [
        {
          label: 'Karty bez opisu',
          value: String(noDescription),
          warn: noDescription > 0,
          note: noDescription > 0 ? 'dziecko zobaczy pustą kartę' : 'każda coś mówi',
        },
        {
          label: 'Powtórzone nazwy',
          value: String(duplicateNames.length),
          warn: duplicateNames.length > 0,
          note: duplicateNames.length > 0 ? duplicateNames.join(', ') : 'wszystkie różne',
        },
        {
          label: 'Wersje robocze',
          value: String(drafts),
          note: drafts > 0 ? 'nie trafiają do gry' : 'nic nie czeka w szufladzie',
        },
        {
          label: 'Najbardziej napięta kategoria',
          // Nazwa, nie klucz: `psychological` to identyfikator dla silnika,
          // a redaktor zna tę kategorię jako „Supermoc Umysłu".
          value: tightest ? categoryLabel(tightest.key) : '—',
          note: tightest
            ? `${demand.get(tightest.key) ?? 0} ścianek na ${supply.get(tightest.key) ?? 0} kart`
            : undefined,
        },
        {
          label: 'Kombinacje kategoria + rodzina',
          value: `${pairs.size} / ${CATEGORY_ORDER.length * FAMILY_IDS.length}`,
          warn: pairs.size < CATEGORY_ORDER.length * FAMILY_IDS.length,
          note:
            pairs.size < CATEGORY_ORDER.length * FAMILY_IDS.length
              ? 'brakujące kombinacje to ścianki nie do domknięcia'
              : 'komplet',
        },
        {
          label: 'Użyte ikony',
          value: `${usedIcons.size} / ${ICON_NAMES.length}`,
          note: `${ICON_NAMES.length - usedIcons.size} czeka nieużytych`,
        },
        {
          label: 'Opisy kart',
          value: descriptionLengths.length
            ? `${Math.min(...descriptionLengths)}–${Math.max(...descriptionLengths)} zn.`
            : '—',
          note: 'najkrótszy i najdłuższy',
        },
      ],
    },
  ];
}
