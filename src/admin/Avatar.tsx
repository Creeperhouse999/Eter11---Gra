interface AvatarProps {
  /** Imię — z niego bierze się inicjał i kolor. */
  name: string;
  size?: number;
  /**
   * Kolor ustawiony ręcznie w zakładce Zespół — ma pierwszeństwo przed mapą
   * i paletą. Pusty/`undefined` (większość miejsc) znaczy „licz jak dotąd".
   */
  color?: string;
}

/**
 * Kolor tła awatara z imienia.
 *
 * Ten sam człowiek zawsze dostaje ten sam kolor, więc w wątku da się go
 * rozpoznać po plamie koloru, zanim przeczyta się imię — dokładnie jak na
 * Slacku. Kolory z palety gry, żeby awatary nie kłóciły się z resztą panelu.
 */
const PALETTE = [
  'var(--eter-cat-psychological)',
  'var(--eter-cat-digital)',
  'var(--eter-cat-social)',
  'var(--eter-cat-talent)',
  'var(--eter-cat-mentor)',
];

/**
 * Stałe kolory zespołu.
 *
 * Kolor z sumy znaków imienia wychodził losowo i kilka osób trafiało na ten
 * sam odcień — w wątku wszyscy wyglądali tak samo. Zespół jest mały i stały,
 * więc każdy dostaje swój kolor na własność: Claude pomarańczowy (jak jego
 * znak), Alan jasnoniebieski, Adam czerwony, Marcin zielony, Joanna purpurowy.
 * Kto nie jest na liście (gość, nowa osoba), dostaje kolor z palety jak dotąd.
 *
 * Klucz to imię zapisane małymi literami bez ogonków — podpis bywa raz „Alan",
 * raz „alan", a kolor ma być ten sam.
 */
/**
 * Firmowy pomarańcz Claude.
 *
 * Znak nosi go zawsze — to jego kolor, nie kolor motywu. Pod spodem zmienia się
 * tło kółka (jasne albo ciemne, zależnie od trybu), więc rozbłysk zostaje
 * rozpoznawalny w obu.
 */
const CLAUDE_ORANGE = '#d97757';

export const TEAM_COLORS: Record<string, string> = {
  claude: CLAUDE_ORANGE,
  alan: '#38bdf8',
  adam: '#ef4444',
  marcin: '#22c55e',
  joanna: '#a855f7',
  // Milena nie pracuje już przy grze, ale jej wypowiedzi zostają w wątkach —
  // niech mają swój kolor zamiast losowego z palety.
  milena: '#ec4899',
};

/** Imię do postaci porównywalnej: małe litery, bez ogonków, bez spacji wokół. */
function normalizeName(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Kolor domyślny dla imienia — mapa zespołu, a gdy kogoś w niej nie ma,
 * paleta z sumy znaków. Wyeksportowany, bo zakładka Zespół pokazuje w
 * ColorPickerze kolor, który członek ma TERAZ, także zanim ktoś nada mu
 * własny; inaczej picker startowałby od przypadkowego odcienia.
 */
export function colorFor(name: string): string {
  // Pierwsze słowo — podpis bywa pełnym imieniem i nazwiskiem albo adresem
  // e-mail, a kolor ma zależeć od osoby, nie od zapisu.
  const first = normalizeName(name).split(/[\s@._-]+/)[0];
  const own = TEAM_COLORS[first];
  if (own) return own;

  // Suma kodów znaków — stabilna, więc kolor nie skacze między renderami.
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

/**
 * Znak Claude — rozbłysk, ten sam co w jego logo (Wikimedia, CC).
 *
 * Rysowany ścieżką, nie plikiem: skaluje się bez rozmycia i bierze kolor
 * z `fill="currentColor"`, więc dopasowuje się do tła awatara w obu motywach.
 * Nie trafia do biblioteki ikon panelu — to podpis jednej osoby, nie ikona
 * do wyboru przy kartach.
 */
const CLAUDE_MARK =
  'm19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z';

/** Kółko z inicjałem — jak w komunikatorze. */
export function Avatar({ name, size = 32, color: own }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  // Claude zamiast litery nosi swój znak — w wątku widać od razu, że to nie
  // człowiek z zespołu. Rozpoznanie po pierwszym słowie, jak przy kolorze.
  const isClaude = normalizeName(name).split(/[\s@._-]+/)[0] === 'claude';
  // Tylko poprawny hex wygrywa z wyliczonym kolorem. Śmieć w bazie (pusty
  // string, ucięty zapis) dałby awatar bez tła — czyli inicjał w kolorze
  // tła, niewidoczny; wtedy lepiej wrócić do koloru z imienia.
  const color = own && /^#[0-9a-fA-F]{6}$/.test(own) ? own : colorFor(name || '?');

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-bg"
      style={{
        width: size,
        height: size,
        // Claude: tło z motywu (zmienia się jasny/ciemny), znak w stałym
        // pomarańczu. Pozostali: kółko w swoim kolorze, inicjał na nim.
        background: isClaude ? 'var(--eter-surface)' : color,
        ...(isClaude ? { boxShadow: `inset 0 0 0 1px ${CLAUDE_ORANGE}` } : {}),
        fontSize: size * 0.42,
      }}
    >
      {isClaude ? (
        // 52% średnicy: przy większym znaku promienie dotykają krawędzi kółka,
        // przy mniejszym gubi się w 32 px, w których awatar stoi w wątku.
        // Znak zawsze w firmowym pomarańczu — to jego kolor, nie motywu;
        // zmienia się pod nim tło (patrz niżej, kółko bierze kolor panelu).
        <svg
          viewBox="0 0 100 100"
          width={Math.round(size * 0.52)}
          height={Math.round(size * 0.52)}
          fill={CLAUDE_ORANGE}
        >
          <path d={CLAUDE_MARK} />
        </svg>
      ) : (
        initial
      )}
    </span>
  );
}
