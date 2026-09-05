import { useEffect, useState } from 'react';
import {
  loadDiscordSettings,
  saveDiscordSettings,
  poprawnyWebhook,
  sendToDiscord,
  DOMYSLNE,
  type DiscordSettings,
} from '../firebase/discord';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';

/**
 * Podpięcie kanału Discorda.
 *
 * Alan poprosił: „można zrobić webhook Discorda, żeby tam była ładna lista,
 * co się dzieje, i ona będzie sama z panelu brać, a nie od ciebie". Kanał
 * dostaje więc zmiany w chwili, gdy ktoś je zrobi w panelu — niezależnie od
 * tego, czy agent akurat pracuje.
 *
 * Ustawienia widzi tylko admin, bo to decyzja o tym, dokąd wychodzą treści
 * zgłoszeń i dyskusji.
 */
export function DiscordSettingsPanel() {
  const [settings, setSettings] = useState<DiscordSettings>(DOMYSLNE);
  const [wczytane, setWczytane] = useState(false);
  const [zapisuje, setZapisuje] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void loadDiscordSettings().then((s) => {
      setSettings(s);
      setWczytane(true);
    });
  }, []);

  const adresPusty = settings.webhookUrl.trim() === '';
  const adresZly = !adresPusty && !poprawnyWebhook(settings.webhookUrl);

  const zapisz = async () => {
    if (adresZly) return;
    setZapisuje(true);
    try {
      await saveDiscordSettings({ ...settings, webhookUrl: settings.webhookUrl.trim() });
      toast('Ustawienia kanału zapisane.', 'success');
    } catch {
      toast('Nie udało się zapisać. Sprawdź, czy jesteś zalogowany jako admin.', 'danger');
    }
    setZapisuje(false);
  };

  const wyslijProbna = async () => {
    const ok = await sendToDiscord(
      [
        {
          title: 'Wiadomość próbna z panelu ETER11',
          description: 'Jeśli to widzisz, kanał jest podpięty poprawnie.',
          color: 0x7c3aed,
          footer: { text: 'Sprawdzenie połączenia' },
        },
      ],
      { ...settings, webhookUrl: settings.webhookUrl.trim() },
    );
    toast(
      ok ? 'Wysłano — sprawdź kanał.' : 'Nie udało się wysłać. Sprawdź adres webhooka.',
      ok ? 'success' : 'danger',
    );
  };

  const przelacznik = (
    klucz: keyof Omit<DiscordSettings, 'webhookUrl'>,
    etykieta: string,
    opis: string,
  ) => (
    <label className="flex items-start gap-2.5 rounded-lg border border-edge bg-surface p-3">
      <input
        type="checkbox"
        checked={settings[klucz]}
        onChange={(e) => setSettings({ ...settings, [klucz]: e.target.checked })}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="block font-display text-sm font-bold">{etykieta}</span>
        <span className="block text-xs text-ink-dim">{opis}</span>
      </span>
    </label>
  );

  return (
    <section className="mt-8 border-t border-edge pt-6">
      <h3 className="font-display text-lg font-bold">Kanał Discorda</h3>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Panel może sam wysyłać na Wasz kanał to, co się dzieje: nowe zgłoszenia,
        zmiany ich stanu i wypowiedzi w dyskusjach. Wiadomość leci w chwili,
        gdy ktoś coś zrobi w panelu.
      </p>

      {!wczytane ? (
        <p className="mt-3 text-sm text-ink-dim">Wczytuję…</p>
      ) : (
        <>
          <div className="mt-3 max-w-xl">
            <TextField
              label="Adres webhooka"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/…"
            />
            {/* Adres webhooka działa jak hasło do kanału — kto go ma, może tam
                pisać. Mówimy o tym wprost, bo z wyglądu to zwykły link. */}
            <p className="mt-1 text-xs text-ink-dim">
              Zrobisz go w Discordzie: ustawienia kanału → Integracje → Webhooki.
              Traktuj ten adres jak hasło — kto go ma, może pisać na kanał.
            </p>
            {adresZly && (
              <p className="mt-1 text-xs text-danger">
                To nie wygląda na adres webhooka Discorda. Wklej cały link,
                razem z „https://discord.com/api/webhooks/".
              </p>
            )}
          </div>

          <div className="mt-3 grid max-w-xl gap-2">
            {przelacznik('zgloszenia', 'Nowe zgłoszenia', 'Tytuł, pilność, autor i zrzut ekranu.')}
            {przelacznik(
              'zmianyStanu',
              'Zmiany stanu zgłoszeń',
              'Naprawione, zwrócone do poprawki, potwierdzone.',
            )}
            {przelacznik('dyskusje', 'Dyskusje', 'Nowe wątki i odpowiedzi w nich.')}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon="tick" onClick={() => void zapisz()} disabled={zapisuje || adresZly}>
              {zapisuje ? 'Zapisuję…' : 'Zapisz'}
            </Button>
            <Button
              variant="ghost"
              icon="megaphone"
              onClick={() => void wyslijProbna()}
              disabled={adresPusty || adresZly}
            >
              Wyślij próbną wiadomość
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
