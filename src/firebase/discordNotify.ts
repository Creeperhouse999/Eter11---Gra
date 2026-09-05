import { loadDiscordSettings, sendToDiscord, type DiscordSettings } from './discord';
import type { DiscordEmbed } from './discordMessage';

/**
 * Wysyłka powiadomienia „przy okazji" akcji w panelu.
 *
 * Zawsze wołana przez `void` i nigdy nie rzucająca: Discord jest dodatkiem,
 * a nie warunkiem zapisu. Gdyby wysyłka mogła wywrócić akcję, niedostępny
 * kanał blokowałby wysłanie zgłoszenia — czyli dokładnie odwrotnie, niż
 * chcemy.
 *
 * Ramkę budujemy dopiero PO sprawdzeniu ustawień (stąd funkcja, nie gotowy
 * obiekt): gdy zespół wyłączył dany rodzaj powiadomień albo webhooka nie ma,
 * nie ma po co jej składać.
 */
export async function wyslijNaDiscord(
  rodzaj: keyof Omit<DiscordSettings, 'webhookUrl'>,
  zbuduj: () => DiscordEmbed | null,
): Promise<void> {
  try {
    const ustawienia = await loadDiscordSettings();
    if (!ustawienia.webhookUrl || !ustawienia[rodzaj]) return;

    const embed = zbuduj();
    if (!embed) return;

    await sendToDiscord([embed], ustawienia);
  } catch {
    // Cicho: powiadomienie, które się nie udało, nie może psuć niczego, co
    // użytkownik właśnie zrobił.
  }
}
