/**
 * Zestaw ikon ETER11.
 *
 * Ikony są rysowane inline jako SVG — bez plików, bez CDN, bez zależności.
 * Gra działa offline, a kolor dziedziczy się z `currentColor`, więc ta sama
 * ikona wygląda poprawnie na karcie, w ściance i w panelu.
 *
 * Styl: kreska 1.5, zaokrąglone końce, siatka 24×24. Geometryczny rysunek
 * pasuje do konsoli operacyjnej i pozostaje czytelny w rozmiarze 16 px.
 */

export type IconName =
  // Ścianki i kategorie
  | 'brain' | 'chip' | 'handshake' | 'star'
  // Kompetencje psychologiczne
  | 'balance' | 'shield' | 'eye' | 'hand' | 'ear' | 'dove' | 'sprout' | 'medal' | 'sage'
  // Kompetencje cyfrowe
  | 'code' | 'robot' | 'chart' | 'network' | 'search' | 'globe' | 'lock' | 'bulb' | 'map' | 'radio'
  // Kompetencje społeczne
  | 'message' | 'puzzle' | 'wrench' | 'telescope' | 'hearts' | 'megaphone'
  | 'cape' | 'check' | 'heartHands' | 'peace' | 'earth'
  // Talenty
  | 'palette' | 'heart' | 'lion' | 'mountain' | 'lens' | 'clipboard' | 'bolt' | 'people'
  // Mentorzy
  | 'flask' | 'crystal' | 'handsOpen' | 'flag' | 'microscope' | 'crane'
  | 'columns' | 'sunrise' | 'elder' | 'rocket'
  // Karty specjalne
  | 'spark' | 'swan' | 'arrowLeft'
  // Problemy
  | 'park' | 'web' | 'robotFace' | 'gear' | 'plug' | 'phone' | 'planet'
  | 'city' | 'bubbles' | 'clash' | 'wheat' | 'wave' | 'virus'
  // Postacie
  | 'compass' | 'brush' | 'bolt2' | 'checklist' | 'teapot' | 'sparkle' | 'hammer'
  // Interfejs
  | 'lockedSlot' | 'plus' | 'trash' | 'download' | 'upload' | 'logout' | 'undo' | 'eyeOff'
  | 'tick' | 'close' | 'chevronDown' | 'warning' | 'info' | 'dot' | 'eyeOn';

interface IconProps {
  /**
   * Nazwa ikony z zestawu albo `url:…` dla ikony wgranej przez zespół.
   * Typ dopuszcza dowolny łańcuch, bo własne ikony nie są znane w czasie
   * kompilacji — Icon sam rozpoznaje, z czym ma do czynienia.
   */
  name: IconName | (string & {});
  /** Rozmiar w pikselach. */
  size?: number;
  className?: string;
  /** Etykieta dla czytników ekranu. Bez niej ikona jest dekoracyjna. */
  label?: string;
}

/** Ścieżki ikon. Każda mieści się w siatce 24×24. */
const PATHS: Record<IconName, string> = {
  // --- Ścianki i kategorie ---
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 6 17a3 3 0 0 0 3 3V4Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 18 17a3 3 0 0 1-3 3V4Zm-3 0v16',
  chip: 'M7 7h10v10H7zM4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3',
  handshake: 'M2 10h3l3.5 3.5a1.8 1.8 0 0 0 2.5-2.5L9 9l2-2 4 4M22 10h-3l-4 4-2-2M5 10v5m14-5v5',
  star: 'm12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8L12 3Z',

  // --- Psychologiczne ---
  balance: 'M12 4v16M6 8h12M6 8 3 15h6L6 8Zm12 0-3 7h6l-3-7ZM8 20h8',
  shield: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  hand: 'M9 11V5a1.5 1.5 0 0 1 3 0v6m0-1V4a1.5 1.5 0 0 1 3 0v7m0-2a1.5 1.5 0 0 1 3 0v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-3a1.5 1.5 0 0 1 3 0',
  ear: 'M7 9a5 5 0 0 1 10 0c0 3-2 4-3 6s0 4-2.5 4S9 17 9 15',
  dove: 'M4 14c4 0 6-2 8-5s5-4 8-2c-1 3-3 4-3 7s-3 6-7 6-6-3-6-6Zm8-5L9 5',
  sprout: 'M12 20v-7m0 0C12 9 9 7 5 7c0 4 3 6 7 6Zm0 0c0-4 3-6 7-6 0 4-3 6-7 6Z',
  medal: 'M12 3 8 9h8l-4-6Zm0 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6L8.2 15.8l2.6-.4L12 13Z',
  sage: 'M12 4a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V8a4 4 0 0 1 4-4Zm-6 16a6 6 0 0 1 12 0M9 8h6',

  // --- Cyfrowe ---
  code: 'm8 8-5 4 5 4m8-8 5 4-5 4M14 4l-4 16',
  robot: 'M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm5-5v5M9 14h.01M15 14h.01M3 13v2M21 13v2',
  chart: 'M4 20V4m0 16h16M8 16V9m4 7V6m4 10v-4',
  network: 'M12 3v4m0 10v4M5 8l3 2m8 4 3 2M5 16l3-2m8-4 3-2M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm16 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm16 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c-3 3-3 15 0 18m0-18c3 3 3 15 0 18M3.5 9h17M3.5 15h17',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v9H6v-9Zm6 3v3',
  bulb: 'M9 18h6m-5 3h4m-5-6a6 6 0 1 1 6 0c-.6.5-1 1.2-1 2H10c0-.8-.4-1.5-1-2Z',
  map: 'm3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Zm6-2v14m6-12v14',
  radio: 'M4 10h16v10H4V10Zm3-6 10 4M8 15h.01M13 14h5m-5 3h5',

  // --- Społeczne ---
  message: 'M4 5h16v11H9l-5 4V5Z',
  puzzle: 'M9 4h6v3a2 2 0 1 0 4 0h1v5h-3a2 2 0 1 0 0 4h3v4H9v-3a2 2 0 1 0-4 0H4V9h1a2 2 0 1 0 4 0V4Z',
  wrench: 'M15 4a5 5 0 0 0-4.6 7L4 17.4 6.6 20l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3a5 5 0 0 0-1-1Z',
  telescope: 'm3 15 12-8 3 4-12 8-3-4Zm8 0 3 6M6 17l2 4M18 4l2 3',
  hearts: 'M8 6c1.5 0 2.5 1 3 2 .5-1 1.5-2 3-2a3 3 0 0 1 3 3c0 3.5-6 8-6 8s-6-4.5-6-8a3 3 0 0 1 3-3Z',
  megaphone: 'M4 10v4l10 5V5L4 10Zm10-1 6-3v12l-6-3M6 15v4h3',
  cape: 'M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-6 8 6-2 6 2-2 8H8l-2-8Zm0 0-3 6m15-6 3 6',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6',
  heartHands: 'M12 8c.6-1 1.6-2 3-2a2.5 2.5 0 0 1 2.5 2.5C17.5 11 12 15 12 15S6.5 11 6.5 8.5A2.5 2.5 0 0 1 9 6c1.4 0 2.4 1 3 2ZM4 14v5m16-5v5M7 20h10',
  peace: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0v18m0-9-6 6m6-6 6 6',
  earth: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM4 10c2 1 3 0 5 1s1 3 0 4-1 3 0 4m11-11c-2 0-3 1-3 3s2 2 2 4',

  // --- Talenty ---
  palette: 'M12 3a9 9 0 0 0 0 18c1 0 2-1 2-2s-1-1-1-2 1-2 2-2h2a4 4 0 0 0 4-4c0-4-4-8-9-8Zm-4 8h.01M11 7h.01M15 8h.01',
  heart: 'M12 20S4 14 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-8 11-8 11Z',
  lion: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM10 11h.01M14 11h.01M12 13v1.5m-1.5 1h3',
  mountain: 'm3 19 6-11 4 6 2-3 6 8H3Zm6-11 1.5 2.5',
  lens: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3a4 4 0 0 1 4 4m1 6 5 5',
  clipboard: 'M9 4h6v3H9V4Zm-2 1H5v15h14V5h-2M8 11h8M8 15h5',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-13 9a6 6 0 0 1 12 0m1-7a6 6 0 0 1 5 7',

  // --- Mentorzy ---
  flask: 'M10 3v6L5 18a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M9 3h6M7.5 14h9',
  crystal: 'M12 4 5 10l7 10 7-10-7-6Zm0 0v16M5 10h14',
  handsOpen: 'M8 12V6a1.5 1.5 0 0 1 3 0v5m0-1V5a1.5 1.5 0 0 1 3 0v6m0-2a1.5 1.5 0 0 1 3 0v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9a1.5 1.5 0 0 1 3 0',
  flag: 'M6 21V4m0 0 12 3-12 4',
  microscope: 'M9 4h4v7H9V4Zm2 7v3m-5 3a5 5 0 0 0 10 0M4 20h16M15 6a5 5 0 0 1 3 5',
  crane: 'M4 20V5h12M4 8h12m2-3v9m0 0-3 3m3-3 3 3M6 20h14',
  columns: 'M4 9h16L12 4 4 9Zm2 0v9m4-9v9m4-9v9m4-9v9M3 20h18',
  sunrise: 'M12 4v3m-6 3H3m18 0h-3M6.5 6.5 5 5m14 1.5L20.5 5M7 14a5 5 0 0 1 10 0M3 18h18',
  elder: 'M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-5 16a5 5 0 0 1 10 0M9 7h6M17 13v8m0-8 3 2',
  rocket: 'M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10Zm0 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM9 16l-2 5 3-2m5-3 2 5-3-2',

  // --- Specjalne ---
  spark: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z',
  swan: 'M6 20c0-5 3-9 8-9 2 0 3-1 3-3s-2-3-4-2c-1-2 1-3 3-2s3 3 3 6c0 6-5 10-13 10m0 0h14',

  // --- Problemy ---
  park: 'M8 20v-4m0 0c-3 0-5-2-5-4s2-4 5-4 5 2 5 4-2 4-5 4Zm8 4v-6m0 0-3-4h6l-3 4ZM3 20h18',
  web: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4M12 7a5 5 0 0 0-5 5m10 0a5 5 0 0 0-5-5',
  robotFace: 'M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm6-5v5M9 13h.01M15 13h.01M9 17h6',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6 1.5 3 3.3-.8.8 3.3L21 12l-3.4 3.5.8 3.3-3.3.8L12 21l-1.5-3-3.3.8-.8-3.3L3 12l3.4-3.5-.8-3.3 3.3.8L12 3Z',
  plug: 'M9 3v6m6-6v6M6 9h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V9Zm6 15v-3',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm2 15h4',
  planet: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-9 9c4 3 14 3 18-2M3 14c-1-2 1-4 4-5',
  city: 'M4 20V9h6v11m0-11 5-5 5 5v11M4 20h16M7 13h.01M7 16h.01M17 13h.01M17 16h.01',
  bubbles: 'M9 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  clash: 'm12 3 2 5 5-2-3 5 4 3-5 1 1 5-4-3-4 3 1-5-5-1 4-3-3-5 5 2 2-5Z',
  wheat: 'M12 21V9m0 0c0-2-2-4-4-4 0 2 2 4 4 4Zm0 0c0-2 2-4 4-4 0 2-2 4-4 4Zm0 4c0-2-2-4-4-4 0 2 2 4 4 4Zm0 0c0-2 2-4 4-4 0 2-2 4-4 4Z',
  wave: 'M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0',
  virus: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-4v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8',

  // --- Postacie ---
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  brush: 'M4 20s1-4 3-4 2 2 4 2 3-2 3-4M14 12l6-7 1 1-6 7M9 15l6-6',
  bolt2: 'M12 3v7m0 0-4 3h8l-4-3Zm-5 5-3 2m14-2 3 2M9 16v5m6-5v5M12 13v8',
  checklist: 'M9 4h6v3H9V4ZM7 5H5v15h14V5h-2m-9 7 1.5 1.5L13 10m-5 6 1.5 1.5L13 14',
  teapot: 'M6 10h10a4 4 0 0 1 0 8H6a4 4 0 0 1 0-8Zm10 2h3m-9-2V7m-2 0h4M4 20h14',
  sparkle: 'm12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z',
  hammer: 'm14 6 4 4M6 20l8-8m-2-6 2-2a3 3 0 0 1 4 0l2 2a3 3 0 0 1 0 4l-2 2-6-6ZM4 22l3-3',

  // --- Interfejs ---
  lockedSlot: 'M8 11V8a4 4 0 0 1 8 0v3m-9 0h10v8H7v-8Z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M9 7V5h6v2m-8 0 1 13h8l1-13M10 11v5m4-5v5',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
  upload: 'M12 16V5m0 0-4 4m4-4 4 4M5 19h14',
  logout: 'M14 4h5v16h-5M10 8l-4 4 4 4m-4-4h11',
  undo: 'M9 8H5V4m0 4a8 8 0 1 1 0 8',
  eyeOff: 'm4 4 16 16M9.5 9.6A2.5 2.5 0 0 0 12 14.5c.7 0 1.3-.3 1.8-.7M6.5 7.3C4 9 2 12 2 12s4 6 10 6c1.6 0 3-.4 4.2-1M10 6.2A8 8 0 0 1 12 6c6 0 10 6 10 6s-1 1.5-2.7 3',
  eyeOn: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  tick: 'm5 13 4.5 4.5L19 7',
  close: 'M6 6l12 12M18 6 6 18',
  chevronDown: 'm6 9 6 6 6-6',
  arrowLeft: 'M19 12H5m0 0 6-6m-6 6 6 6',
  warning: 'M12 4 2.5 20h19L12 4Zm0 6v5m0 3h.01',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5h.01M11 12h1v5h1',
  dot: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
};

/** Prefiks nazwy własnej ikony — po nim odróżniamy URL od klucza z zestawu. */
export const CUSTOM_ICON_PREFIX = 'url:';

export function Icon({ name, size = 20, className, label }: IconProps) {
  // Własna ikona: nazwa to `url:https://…`. Renderujemy jako obraz, nie
  // ścieżkę — to bitmapa albo obcy SVG, którego nie da się wpisać w `path`.
  // Kolor `currentColor` na niej nie działa, więc własne ikony niosą swój
  // wygląd same, w przeciwieństwie do wbudowanych.
  if (typeof name === 'string' && name.startsWith(CUSTOM_ICON_PREFIX)) {
    return (
      <img
        src={name.slice(CUSTOM_ICON_PREFIX.length)}
        width={size}
        height={size}
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  // Nieznana nazwa nie może wywalić całego ekranu — brak ikony to pusty
  // kwadrat, nie biały ekran. Zdarza się, gdy zawartość odwołuje się do
  // ikony usuniętej z zestawu.
  const path = PATHS[name as IconName];
  if (!path) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

/** Czy nazwa ikony istnieje w zestawie — używane przy walidacji danych. */
export function isIconName(value: string): value is IconName {
  return value in PATHS;
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[];
