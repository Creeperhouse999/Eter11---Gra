import { KIND_LABELS, PRIORITY_LABELS, type Report, type ReportStatus } from './reports';
import type { Discussion } from './discussions';

/**
 * Wiadomości na kanał Discorda.
 *
 * Alan: „można zrobić webhook Discorda, żeby tam była ładna lista, co się
 * dzieje, i ona będzie sama z panelu brać, a nie od ciebie". Sedno jest
 * w drugiej połowie zdania: wysyła PANEL w chwili, gdy ktoś coś zrobi, a nie
 * ja przy okazji swojej pracy. Dzięki temu zespół widzi zmianę od razu i nie
 * zależy to od tego, czy akurat pracuję.
 *
 * Tu siedzi samo układanie wiadomości — bez sieci, żeby dało się sprawdzić
 * wprost, co poleci na kanał. Wysyłkę robi `sendToDiscord`.
 */

/** Kolor paska ramki — Discord przyjmuje liczbę, nie zapis „#rrggbb". */
const KOLOR = {
  krytyczny: 0xe5484d,
  wysoki: 0xf5a524,
  zwykly: 0x7c3aed,
  zrobione: 0x30a46c,
  wrocilo: 0xe5484d,
  rozmowa: 0x1f9d8b,
} as const;

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
  /**
   * Zrzut ekranu dołączony do zgłoszenia albo wypowiedzi.
   *
   * Alan: „obrazek dodawaj, jak jest w dyskusji/zgłoszeniu/wiadomości".
   * Przy usterce zrzut mówi więcej niż opis, a bez niego trzeba i tak wejść
   * do panelu — czyli kanał traciłby sens. Discord pokazuje pierwszy obraz
   * pod ramką; resztę widać po kliknięciu w tytuł.
   */
  image?: { url: string };
}

/** Adres panelu — link w wiadomości ma prowadzić wprost do sprawy. */
const PANEL = 'https://savetheworld-eter11.web.app/admin';

/**
 * Skrót treści do ramki.
 *
 * Discord i tak przycina długie opisy, ale robi to w pół słowa. Lepiej uciąć
 * samemu na granicy zdania i dopisać wielokropek — na kanale ma być zajawka,
 * nie całe zgłoszenie; od czytania całości jest link.
 */
export function skrot(tekst: string, limit = 300): string {
  const czysty = tekst.trim().replace(/\s+/g, ' ');
  if (czysty.length <= limit) return czysty;
  const uciety = czysty.slice(0, limit);
  const spacja = uciety.lastIndexOf(' ');
  return `${spacja > limit * 0.6 ? uciety.slice(0, spacja) : uciety}…`;
}

/** Nowe zgłoszenie — to, po co ten kanał głównie powstaje. */
export function embedNoweZgloszenie(report: Report): DiscordEmbed {
  const pilnosc = report.priority ?? 'medium';
  return {
    title: report.title,
    url: `${PANEL}/reports/${report.status}?open=${report.id}`,
    description: skrot(report.description ?? ''),
    color:
      pilnosc === 'ultra' ? KOLOR.krytyczny : pilnosc === 'high' ? KOLOR.wysoki : KOLOR.zwykly,
    fields: [
      { name: 'Rodzaj', value: KIND_LABELS[report.kind], inline: true },
      { name: 'Pilność', value: PRIORITY_LABELS[pilnosc], inline: true },
      { name: 'Zgłasza', value: report.author || 'nieznany', inline: true },
    ],
    footer: { text: 'Nowe zgłoszenie' },
    timestamp: report.createdAt,
    ...(report.images?.[0] ? { image: { url: report.images[0] } } : {}),
  };
}

/** Napisy stanów — te same słowa, co w panelu, żeby nie uczyć dwóch nazw. */
const STAN: Partial<Record<ReportStatus, { tekst: string; kolor: number }>> = {
  fixed: { tekst: 'Naprawione — czeka na sprawdzenie', kolor: KOLOR.zrobione },
  reopened: { tekst: 'Zwrócone do poprawki', kolor: KOLOR.wrocilo },
  done: { tekst: 'Potwierdzone — działa', kolor: KOLOR.zrobione },
  dismissed: { tekst: 'Odrzucone', kolor: KOLOR.zwykly },
};

/**
 * Zmiana stanu zgłoszenia.
 *
 * `null` dla stanów, o których nie ma co pisać: „nowe" ma własną wiadomość,
 * a „czeka na akceptację" to sprawa wewnętrzna moderatora.
 */
export function embedZmianaStanu(
  report: Report,
  status: ReportStatus,
  komentarz?: string,
  /** Zrzut dołączony do komentarza — np. dowód, że dalej nie działa. */
  obrazek?: string,
): DiscordEmbed | null {
  const stan = STAN[status];
  if (!stan) return null;

  return {
    title: report.title,
    url: `${PANEL}/reports/${status}?open=${report.id}`,
    description: komentarz ? skrot(komentarz) : undefined,
    color: stan.kolor,
    footer: { text: stan.tekst },
    timestamp: new Date().toISOString(),
    ...(obrazek ? { image: { url: obrazek } } : {}),
  };
}

/** Nowy wątek dyskusji. */
export function embedNowyWatek(discussion: Discussion): DiscordEmbed {
  // Zrzut dołączony przy zakładaniu wątku wchodzi jako pierwsza wypowiedź
  // (sam wątek nie ma pola na obraz) — stamtąd go bierzemy.
  const obrazek = discussion.messages?.find((m) => m.image)?.image;
  return {
    title: discussion.title,
    url: `${PANEL}/discussions?open=${discussion.id}`,
    description: skrot(discussion.description ?? ''),
    color: KOLOR.rozmowa,
    fields: [{ name: 'Zakłada', value: discussion.author || 'nieznany', inline: true }],
    footer: { text: 'Nowy wątek' },
    timestamp: discussion.createdAt,
    ...(obrazek ? { image: { url: obrazek } } : {}),
  };
}

/** Odpowiedź w wątku — najczęściej przeoczana rzecz w panelu. */
export function embedOdpowiedz(
  discussion: Pick<Discussion, 'id' | 'title'>,
  autor: string,
  tekst: string,
  obrazek?: string,
): DiscordEmbed {
  return {
    title: discussion.title,
    url: `${PANEL}/discussions?open=${discussion.id}`,
    // Obrazek bez tekstu też jest wypowiedzią — mówimy o nim wprost, zamiast
    // wysyłać pustą ramkę.
    description: skrot(tekst) || '(załączony obrazek)',
    color: KOLOR.rozmowa,
    fields: [{ name: 'Pisze', value: autor || 'nieznany', inline: true }],
    footer: { text: 'Nowa odpowiedź w dyskusji' },
    timestamp: new Date().toISOString(),
    ...(obrazek ? { image: { url: obrazek } } : {}),
  };
}
