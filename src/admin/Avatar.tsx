interface AvatarProps {
  /** Imię — z niego bierze się inicjał i kolor. */
  name: string;
  size?: number;
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
const TEAM_COLORS: Record<string, string> = {
  claude: '#d97757',
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

function colorFor(name: string): string {
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

/** Kółko z inicjałem — jak w komunikatorze. */
export function Avatar({ name, size = 32 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const color = colorFor(name || '?');

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-bg"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </span>
  );
}
