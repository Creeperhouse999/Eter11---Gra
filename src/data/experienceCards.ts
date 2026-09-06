/**
 * Karty doświadczeń — do druku, dla gry przy stole.
 *
 * Adam: „zrób do druku karty doświadczeń (dodaj do zakładki »Karty« kategorię
 * karty doświadczeń) oraz dodaj do kart do druku" — trzy rodzaje po cztery
 * sztuki, każdy z jednym zdaniem mówiącym, za co się ją dostaje.
 *
 * To NIE jest nowa kategoria karty w silniku. Silnik zna doświadczenie jako
 * `ExperienceCard` na graczu (`solve` / `share`), liczone automatycznie —
 * cyfrowa gra nie potrzebuje fizycznych kart. Przy stole potrzebuje: dziecko
 * musi coś dostać do ręki, żeby wiedzieć, że coś zdobyło. Dlatego to treść
 * do wydruku, edytowalna w panelu, a nie nowy `CardCategory`, który rozlałby
 * się po ściankach, talii i walidacji.
 *
 * Identyfikatory `solve` i `share` są te same, co w silniku — żeby instrukcja,
 * wydruk i ekran finału mówiły jednym językiem. `growth` (komplet pięciu kart
 * na postaci) istnieje tylko na papierze: w grze cyfrowej ten sam warunek
 * silnik sprawdza wprost na macie (`fulfillmentProgress`).
 */
export type ExperienceKind = 'solve' | 'share' | 'growth';

export interface ExperienceCardDef {
  kind: ExperienceKind;
  /** Tytuł na karcie. */
  title: string;
  /** Jedno zdanie: za co się ją dostaje. */
  text: string;
  /** Ile sztuk wydrukować. */
  count: number;
}

export const EXPERIENCE_KIND_LABELS: Record<ExperienceKind, string> = {
  solve: 'Za rozwiązanie problemu',
  share: 'Za uczenie innych',
  growth: 'Za rozwój postaci',
};

/** Domyślne karty — dokładnie w brzmieniu, które podał Adam. */
export const DEFAULT_EXPERIENCE_CARDS: ExperienceCardDef[] = [
  {
    kind: 'solve',
    title: 'Doświadczenie za rozwiązanie problemu',
    text: 'Zyskujesz kartę doświadczenia za wspólne rozwiązanie problemu.',
    count: 4,
  },
  {
    kind: 'share',
    title: 'Doświadczenie za uczenie innych',
    text: 'Zyskujesz kartę doświadczenia za przekazanie karty umiejętności lub mentora innemu graczowi.',
    count: 4,
  },
  {
    kind: 'growth',
    title: 'Doświadczenie za rozwój postaci',
    text: 'Zyskujesz tę kartę doświadczenia, jeśli na karcie postaci masz wszystkie 5 kart — po jednej z każdej kategorii.',
    count: 4,
  },
];

/** Górna granica sztuk jednego rodzaju — żeby literówka „44" nie dała 44 stron. */
export const MAX_EXPERIENCE_COPIES = 20;

/**
 * Karty do użycia: z treści gry, a przy jej braku domyślne.
 *
 * Pusta lista liczy się jak brak: redaktor mógł skasować wszystkie wpisy
 * przez pomyłkę, a wydruk bez kart doświadczeń to gra bez jednej z nagród.
 */
export function kartyDoswiadczen(defs?: ExperienceCardDef[]): ExperienceCardDef[] {
  return defs && defs.length > 0 ? defs : DEFAULT_EXPERIENCE_CARDS;
}

/** Ile kartoników w sumie idzie do pudełka. */
export function liczbaKartDoswiadczen(defs: ExperienceCardDef[]): number {
  return defs.reduce((suma, d) => suma + Math.max(0, d.count), 0);
}

/**
 * Rozwija definicje na pojedyncze kartoniki do wydruku — `count` kopii
 * każdego rodzaju, każda z własnym identyfikatorem do klucza w liście.
 */
export function rozwinDoDruku(
  defs: ExperienceCardDef[],
): Array<ExperienceCardDef & { id: string }> {
  return defs.flatMap((d) =>
    Array.from({ length: Math.max(0, d.count) }, (_, i) => ({ ...d, id: `${d.kind}-${i + 1}` })),
  );
}
