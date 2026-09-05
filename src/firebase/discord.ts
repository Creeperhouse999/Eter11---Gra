import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './client';
import type { DiscordEmbed } from './discordMessage';

/**
 * Wysyłka na kanał Discorda.
 *
 * Wysyła PANEL, w chwili gdy ktoś coś zrobi — nie ja przy okazji swojej pracy.
 * Dlatego zespół widzi zmianę od razu, niezależnie od tego, czy akurat siedzę
 * nad projektem.
 *
 * ⚠️ Adres webhooka jest jak hasło: kto go ma, może pisać na Wasz kanał.
 * Dlatego NIE stoi w kodzie (repozytorium jest publiczne), tylko w Firestore,
 * z regułą pozwalającą czytać go wyłącznie zalogowanym.
 */

const USTAWIENIA = 'settings';
const DOKUMENT = 'discord';

export interface DiscordSettings {
  /** Adres webhooka; pusty = wysyłka wyłączona. */
  webhookUrl: string;
  /** Co wysyłać — zespół może wyciszyć część, gdy kanał robi się gęsty. */
  zgloszenia: boolean;
  zmianyStanu: boolean;
  dyskusje: boolean;
}

export const DOMYSLNE: DiscordSettings = {
  webhookUrl: '',
  zgloszenia: true,
  zmianyStanu: true,
  dyskusje: true,
};

export async function loadDiscordSettings(): Promise<DiscordSettings> {
  try {
    const snap = await getDoc(doc(db, USTAWIENIA, DOKUMENT));
    if (!snap.exists()) return DOMYSLNE;
    return { ...DOMYSLNE, ...(snap.data() as Partial<DiscordSettings>) };
  } catch {
    // Brak dostępu albo brak sieci nie może wywrócić panelu — powiadomienia
    // są dodatkiem, a nie warunkiem pracy.
    return DOMYSLNE;
  }
}

export async function saveDiscordSettings(settings: DiscordSettings): Promise<void> {
  await setDoc(doc(db, USTAWIENIA, DOKUMENT), settings);
}

/** Czy adres wygląda na webhooka Discorda — chroni przed wklejeniem czegokolwiek. */
export function poprawnyWebhook(url: string): boolean {
  return /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(
    url.trim(),
  );
}

/**
 * Wysyła ramki na kanał.
 *
 * Nigdy nie rzuca wyjątkiem: powiadomienie ma być dodatkiem do zapisu, a nie
 * jego warunkiem. Gdyby wysyłka wywracała akcję, nieosiągalny Discord
 * blokowałby wysłanie zgłoszenia — czyli dokładnie odwrotnie, niż chcemy.
 *
 * Discord przyjmuje do 10 ramek w jednej wiadomości i tnie przy zalewie
 * (~5 wiadomości na kilka sekund), więc wysyłamy je razem, nie po jednej.
 */
export async function sendToDiscord(
  embeds: DiscordEmbed[],
  settings?: DiscordSettings,
): Promise<boolean> {
  if (embeds.length === 0) return false;

  const konfiguracja = settings ?? (await loadDiscordSettings());
  if (!poprawnyWebhook(konfiguracja.webhookUrl)) return false;

  try {
    const response = await fetch(konfiguracja.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: embeds.slice(0, 10) }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
