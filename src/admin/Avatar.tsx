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

function colorFor(name: string): string {
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
