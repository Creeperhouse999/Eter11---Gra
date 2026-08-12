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
  | 'message' | 'puzzle' | 'wrench' | 'telescope' | 'hearts' | 'megaphone' | 'bell'
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
  | 'tick' | 'close' | 'chevronDown' | 'warning' | 'info' | 'dot' | 'eyeOn'
  // Tryb jasny/ciemny
  | 'sun' | 'moon'
  // Twarze i emocje
  | 'faceSmile' | 'faceLaugh' | 'faceSad' | 'faceSurprised' | 'faceWink' | 'faceThinking'
  | 'faceSleep' | 'faceAngry' | 'faceCalm' | 'faceNeutral' | 'faceCool' | 'faceLove'
  // Gesty
  | 'thumbUp' | 'thumbDown' | 'handStop' | 'handWave' | 'clap' | 'salute' | 'fist' | 'handOk'
  | 'pointUp' | 'handshakeDeal'
  // Reakcje i symbole
  | 'starFilledOutline' | 'heartPlus' | 'fire' | 'sparkles' | 'exclamation' | 'question'
  | 'minus' | 'ban' | 'checkBox' | 'crossBox' | 'crownIcon' | 'lightning' | 'shieldCheck'
  // Strzałki i kierunki
  | 'arrowUp' | 'arrowDown' | 'arrowRight' | 'refresh' | 'back' | 'forward' | 'swap'
  | 'sortAsc' | 'sortDesc' | 'expand' | 'collapse' | 'triangleUp' | 'triangleDown'
  // Przyroda
  | 'tree' | 'leaf' | 'flower' | 'cloud' | 'rain' | 'snow' | 'wind' | 'frog' | 'cat' | 'dog'
  | 'bird' | 'fish' | 'butterfly' | 'paw' | 'mushroom' | 'seedling'
  // Przedmioty i szkoła
  | 'book' | 'notebook' | 'pencil' | 'backpack' | 'ruler' | 'scissors' | 'mug' | 'apple'
  | 'gift' | 'balloon' | 'cake' | 'paperclip' | 'pin' | 'folder' | 'bookmark' | 'note'
  // Czas i miejsca
  | 'clock' | 'calendar' | 'home' | 'school' | 'door' | 'key' | 'signpost' | 'hourglass'
  | 'alarm' | 'pinMap'
  // Technika
  | 'laptop' | 'battery' | 'wifi' | 'envelope' | 'cloudData' | 'usb' | 'camera' | 'headphones'
  | 'printer' | 'database' | 'link' | 'settingsSliders'
  // Gra i zabawa
  | 'dice' | 'trophy' | 'target' | 'gamepad' | 'cards' | 'chess' | 'ticket' | 'music'
  | 'football' | 'kite' | 'magnet' | 'crownSimple';

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
  bell: 'M18 16V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2ZM10 21a2 2 0 0 0 4 0',
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
  // Słońce: tarcza + promienie. Tryb jasny.
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 2v2m0 16v2M4 12H2m20 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4',
  // Księżyc: półksiężyc. Tryb ciemny.
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',

  // --- Twarze i emocje ---
  faceSmile: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6.5h.01M15 9.5h.01M8.5 14a4.5 4.5 0 0 0 7 0',
  faceLaugh: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM7.5 9.5 10 11l-2.5 1.5M16.5 9.5 14 11l2.5 1.5M8 14.5h8a4 4 0 0 1-8 0Z',
  faceSad: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6.5h.01M15 9.5h.01M8.5 16a4.5 4.5 0 0 1 7 0',
  faceSurprised: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6.5h.01M15 9.5h.01M12 13a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  faceWink: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM7.5 10h3M15 9.5h.01M8.5 14a4.5 4.5 0 0 0 7 0',
  faceThinking: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6.5h.01M15 9.5h.01M9 15.5h4M17 17a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  faceSleep: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM7.5 10h3m4 0h3M9.5 15h5M16 4h4l-4 4h4',
  faceAngry: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM7.5 8.5 10.5 10M16.5 8.5 13.5 10M9 11h.01M15 11h.01M8.5 16.5a4.5 4.5 0 0 1 7 0',
  faceCalm: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM7.5 10h3m4 0h3M9.5 15h5',
  faceNeutral: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6.5h.01M15 9.5h.01M9 15h6',
  faceCool: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM6.5 9.5h4v2h-4v-2Zm7 0h4v2h-4v-2Zm-3 1h3M8.5 15a4.5 4.5 0 0 0 7 0',
  faceLove: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM7 8.5 9 11l2-2.5M13 8.5l2 2.5 2-2.5M8.5 14a4.5 4.5 0 0 0 7 0',

  // --- Gesty ---
  thumbUp: 'M7 21V10l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 16.6 21H7Zm0 0H3V10h4',
  thumbDown: 'M7 3v11l4 7a2 2 0 0 0 2-2v-4h5a2 2 0 0 0 2-2.4l-1.4-7A2 2 0 0 0 16.6 3H7Zm0 0H3v11h4',
  handStop: 'M9 11V5a1.5 1.5 0 0 1 3 0v5m0-1V4.5a1.5 1.5 0 0 1 3 0V10m0-1a1.5 1.5 0 0 1 3 0v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-4a1.5 1.5 0 0 1 3 0v1',
  handWave: 'M8 12V6a1.5 1.5 0 0 1 3 0v4m0-1V4.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-11 3l-2-4a1.5 1.5 0 0 1 2.5-1.6L8 14M19 4l2-1M20 8h2',
  clap: 'M8 13 5 10a1.5 1.5 0 0 1 2-2l3 3m0 0-2-4a1.5 1.5 0 0 1 2.6-1.4L13 9m0 0-1-3a1.5 1.5 0 0 1 3-.8l1.5 5a5 5 0 0 1-7.5 6L6 13M18 4l2-1M19 8h3M17 2v-1',
  salute: 'M4 21v-6a2 2 0 0 1 2-2h5l8-4 1 2-7 4h6a2 2 0 0 1 0 4H9M4 21h6',
  fist: 'M5 11a3 3 0 0 1 3-3h7a4 4 0 0 1 4 4v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-4Zm3 2h9M9 8V6.5a2.5 2.5 0 0 1 5 0V8',
  handOk: 'M6 20a5 5 0 0 1-1-3v-4a1.5 1.5 0 0 1 3 0v1M9 13V5a1.5 1.5 0 0 1 3 0v6M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm3-1a1.5 1.5 0 0 1 3 0v6',
  pointUp: 'M11 11V5a1.5 1.5 0 0 1 3 0v6m0-2a1.5 1.5 0 0 1 3 0v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-2a1.5 1.5 0 0 1 3 0v1',
  handshakeDeal: 'M2 8h4v8H2V8Zm20 0h-4v8h4V8ZM6 9h3l3 2 3-2h3M6 15l4 3 2-1 2 1 4-3',

  // --- Reakcje i symbole ---
  starFilledOutline: 'm12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8L12 3Zm0 5.2 1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-2 2.8-.4L12 8.2Z',
  heartPlus: 'M12 20S5 15 5 10a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 1-.3 2-.9 3M18 15v6m-3-3h6',
  fire: 'M12 21a6 6 0 0 0 6-6c0-5-6-12-6-12S6 10 6 15a6 6 0 0 0 6 6Zm0 0a3 3 0 0 0 3-3c0-2-3-5-3-5s-3 3-3 5a3 3 0 0 0 3 3Z',
  sparkles: 'm9 3 1.6 4.4L15 9l-4.4 1.6L9 15l-1.6-4.4L3 9l4.4-1.6L9 3Zm8 9 1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1 1-2.6Z',
  exclamation: 'M12 4v11m0 4h.01',
  question: 'M8.5 8.5a3.5 3.5 0 1 1 4.5 3.4c-.7.2-1 .9-1 1.6v1M12 19h.01',
  minus: 'M5 12h14',
  ban: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-6.4 2.6 12.8 12.8',
  checkBox: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 8 3 3 5-6',
  crossBox: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4 4 6 6m0-6-6 6',
  crownIcon: 'M4 18h16M4 18l1-9 4 4 3-6 3 6 4-4 1 9M5 9a1 1 0 1 0 0 .01ZM12 7a1 1 0 1 0 0 .01ZM19 9a1 1 0 1 0 0 .01Z',
  lightning: 'M13 2 4 13h7l-1 9 9-11h-7l1-9Z',
  shieldCheck: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Zm-3 8.5 2.5 2.5 4.5-5',

  // --- Strzałki i kierunki ---
  arrowUp: 'M12 20V5m0 0-6 6m6-6 6 6',
  arrowDown: 'M12 4v15m0 0 6-6m-6 6-6-6',
  arrowRight: 'M5 12h14m0 0-6-6m6 6-6 6',
  refresh: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5',
  back: 'M9 6 3 12l6 6M3 12h12a6 6 0 0 1 0 12h-1',
  forward: 'm15 6 6 6-6 6M21 12H9a6 6 0 0 0 0 12h1',
  swap: 'M4 8h13m0 0-4-4m4 4-4 4M20 16H7m0 0 4-4m-4 4 4 4',
  sortAsc: 'M4 6h12M4 12h8M4 18h4m10 3V9m0 0-3 3m3-3 3 3',
  sortDesc: 'M4 6h4M4 12h8M4 18h12m2-15v12m0 0 3-3m-3 3-3-3',
  expand: 'M9 4H4v5M4 4l6 6m5-6h5v5m0-5-6 6M9 20H4v-5m0 5 6-6m5 6h5v-5m0 5-6-6',
  collapse: 'M4 9h5V4M9 9 3 3m17 6h-5V4m0 5 6-6M4 15h5v5m-5 0 6-6m10 6h-5v-5m5 5-6-6',
  triangleUp: 'M12 6 4 17h16L12 6Z',
  triangleDown: 'M12 18 4 7h16l-8 11Z',

  // --- Przyroda ---
  tree: 'M12 3 6 11h12L12 3Zm0 5-4 6h8l-4-6Zm0 6v7M8 21h8',
  leaf: 'M4 20C4 11 10 5 20 4c0 10-5 16-14 16Zm2-2 9-9',
  flower: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6a3 3 0 0 1 0 6 3 3 0 0 1 0-6Zm0 12a3 3 0 0 1 0 6 3 3 0 0 1 0-6ZM6 9a3 3 0 0 1 0 6 3 3 0 0 1 0-6Zm12 0a3 3 0 0 1 0 6 3 3 0 0 1 0-6Z',
  cloud: 'M7 19a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 19H7Z',
  rain: 'M7 15a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 15M8 18l-1 3m5-3-1 3m5-3-1 3',
  snow: 'M7 14a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 14M8 18h.01M12 20h.01M16 18h.01',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h8',
  frog: 'M5 10a3 3 0 0 1 6 0m2 0a3 3 0 0 1 6 0M8 10h.01M16 10h.01M5 13c0 4 3 6 7 6s7-2 7-6M9 16h6M4 19l3-2m13 2-3-2',
  cat: 'M5 8 4 4l4 2.4A8 8 0 0 1 12 6c1.5 0 2.9.3 4 .9L20 4l-1 4a7 7 0 0 1 1 3.5c0 4-3.6 6.5-8 6.5s-8-2.5-8-6.5A7 7 0 0 1 5 8Zm4.5 4h.01M14.5 12h.01M12 14v1m-3 .5h6M3 13h3m12 0h3',
  dog: 'M7 7 5 5v4a7 6.5 0 0 0-1 3.5C4 16.5 7.6 19 12 19s8-2.5 8-6.5A7 6.5 0 0 0 19 9V5l-2 2a9 9 0 0 0-10 0Zm2.5 5h.01M14.5 12h.01M12 14.5v1m-1.5 1h3',
  bird: 'M3 14c2.5 0 4-1 5.5-2.5S11 8 12 8s2 2 3.5 3.5S18.5 14 21 14M12 8v3',
  fish: 'M4 12c3-4 8-5 12-3 2 1 3 2 4 3-1 1-2 2-4 3-4 2-9 1-12-3Zm14 0h.01M4 12 2 9m2 3-2 3',
  butterfly: 'M12 6v12M12 7 5 4v7l7 1M12 7l7-3v7l-7 1M12 13l-7 1v6l7-3M12 13l7 1v6l-7-3M12 6l-2-2m2 2 2-2',
  paw: 'M12 13c2.5 0 4 1.6 4 3.4 0 1.6-1.4 2.6-4 2.6s-4-1-4-2.6C8 14.6 9.5 13 12 13ZM7 9.5a1.6 2 0 1 0 0 .01Zm10 0a1.6 2 0 1 0 0 .01ZM10 6a1.5 2 0 1 0 0 .01Zm4 0a1.5 2 0 1 0 0 .01Z',
  mushroom: 'M3 12a9 7 0 0 1 18 0H3Zm6 0v5a3 3 0 0 0 6 0v-5M8 8.5h.01M14.5 7.5h.01M11.5 10h.01',
  seedling: 'M12 21v-8m0 0c0-3-2-5-6-5 0 3 2 5 6 5Zm0 0c0-3 2-5 6-5 0 3-2 5-6 5ZM8 21h8',

  // --- Przedmioty i szkoła ---
  book: 'M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5V4Zm14 0h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6V4Z',
  notebook: 'M7 3h12v18H7V3Zm0 4H4m3 5H4m3 5H4m8-9h4m-4 5h4',
  pencil: 'm4 20 1-4L16 5l3 3L8 19l-4 1Zm10-14 3 3M5 16l3 3',
  backpack: 'M7 8h10a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a3 3 0 0 1 3-3Zm2 0V6a3 3 0 0 1 6 0v2m-6 5h6m-4 4h2',
  ruler: 'M4 15 15 4l5 5L9 20l-5-5Zm4-1 2 2m1-5 2 2m1-5 2 2',
  scissors: 'M7 4l10 12m0-12L7 16M6 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm12 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  mug: 'M5 6h11v9a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V6Zm11 2h2a3 3 0 0 1 0 6h-2M8 3v1m4-1v1',
  apple: 'M12 8c-1-1.5-3-2-4.5-1C5.5 8 5 10.5 6 14s3 6 4.5 6 1.5-1 1.5-1 0 1 1.5 1 3-2.5 4-6 .5-6-1.5-7c-1.5-1-3.5-.5-4.5 1Zm0 0V5m0 0c0-1.5 1.5-2.5 3-2',
  gift: 'M4 10h16v10H4V10Zm0-3h16v3H4V7Zm8 0v13M12 7c-1-3-5-4-5-1.5S10 7 12 7Zm0 0c1-3 5-4 5-1.5S14 7 12 7Z',
  balloon: 'M12 3a5 5 0 0 1 5 5c0 3.5-3 7-5 7s-5-3.5-5-7a5 5 0 0 1 5-5Zm0 12-1 2h2l-1 2m0 0c0 1-3 1-3 2',
  cake: 'M4 20h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6Zm0-3c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M9 8V6m3 2V5m3 3V6',
  paperclip: 'M18 10 10 18a4 4 0 0 1-6-6l8-8a3 3 0 0 1 4 4l-8 8a2 2 0 0 1-3-3l7-7',
  pin: 'M9 3h6l-1 6 4 4H6l4-4-1-6Zm3 10v8',
  folder: 'M3 6h6l2 3h10v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z',
  bookmark: 'M6 3h12v18l-6-5-6 5V3Z',
  note: 'M5 3h9l5 5v13H5V3Zm9 0v5h5M8 13h8m-8 4h5',

  // --- Czas i miejsca ---
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3.5 2',
  calendar: 'M4 6h16v14H4V6Zm4-3v5m8-5v5M4 11h16M9 15h.01M13 15h.01M17 15h.01',
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z',
  school: 'M12 3 3 8v12h18V8l-9-5Zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-2 12v-4h4v4',
  door: 'M6 3h12v18H6V3Zm9 9h.01M4 21h16',
  key: 'M8 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm4 4h9m-2 0v3m-3-3v2',
  signpost: 'M12 3v18M12 5h6l2 2.5L18 10h-6V5Zm0 7H6l-2 2.5L6 17h6v-5Z',
  hourglass: 'M6 3h12M6 21h12M7 3v3c0 3 5 4 5 6s-5 3-5 6v3m10-18v3c0 3-5 4-5 6s5 3 5 6v3',
  alarm: 'M12 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3.5V13l2.5 1.5M5 6 3 4m16 2 2-2M6 19l-2 2m14-2 2 2',
  pinMap: 'M12 3a6 6 0 0 1 6 6c0 4.5-6 12-6 12S6 13.5 6 9a6 6 0 0 1 6-6Zm0 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',

  // --- Technika ---
  laptop: 'M5 6h14v10H5V6Zm-3 10h20l-2 3H4l-2-3Z',
  battery: 'M3 8h15v8H3V8Zm18 2v4M6 11v2m4-2v2',
  wifi: 'M2 9c6-5 14-5 20 0M5.5 12.5c4-3.5 9-3.5 13 0M9 16c2-1.7 4-1.7 6 0M12 20h.01',
  envelope: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  cloudData: 'M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 18M9 14h6m-5 3h4',
  usb: 'M9 3h6v5H9V3Zm3 5v13M12 14l-3-2v-2m3 4 3-2v-2M6 10h.01M18 10h.01',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3V8Zm9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  headphones: 'M4 16v-4a8 8 0 0 1 16 0v4M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5Z',
  printer: 'M7 9V4h10v5M7 20v-5h10v5H7ZM4 9h16v7h-3M7 16H4V9m3 3h3',
  database: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  link: 'M10 14a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-6-6l-1.5 1.5M14 10a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 6 6L12.5 17',
  settingsSliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM9 14.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',

  // --- Gra i zabawa ---
  dice: 'M5 5h14v14H5V5Zm3.5 3.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 1H5v2a3 3 0 0 0 3 3m8-5h3v2a3 3 0 0 1-3 3m-4 3v4m-3 0h6m-8 3h10',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
  gamepad: 'M8 8h8a5 5 0 0 1 5 5v2a3 3 0 0 1-5.5 1.7L15 15H9l-.5 1.7A3 3 0 0 1 3 15v-2a5 5 0 0 1 5-5Zm-2 3v3m-1.5-1.5h3M16 11h.01M18 13h.01',
  cards: 'M9 6h9v13H9V6ZM6 8 4 9l3 9M12 10h3m-3 3h3',
  chess: 'M10 5a2 2 0 1 1 4 0c0 1-1 1.5-1 2h2l-1 3h-4l-1-3h2c0-.5-1-1-1-2Zm0 5-1 6h6l-1-6M7 19h10M7 19l1-3h8l1 3',
  ticket: 'M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V8Zm7 0v2m0 3v2m0 3v-2',
  music: 'M9 18V5l10-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM9 9l10-2',
  football: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.5 4 3-1.5 5h-5L8 10.5l4-3Zm0-4.5v4.5M4 9l4 1.5M20 9l-4 1.5M7 19l2.5-5.5M17 19l-2.5-5.5',
  kite: 'M12 2 4 10l8 10 8-10-8-8Zm0 0v18M4 10h16m-8 10c0 1-2 1-2 2',
  magnet: 'M5 5v7a7 7 0 0 0 14 0V5h-5v7a2 2 0 0 1-4 0V5H5Zm0 3.5h5m4 0h5',
  crownSimple: 'M4 18h16M4 18l1-9 4 4 3-6 3 6 4-4 1 9',
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
