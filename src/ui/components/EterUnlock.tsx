import { useState } from 'react';
import { czyOdblokowane, odblokuj, zablokuj } from '../aiUnlock';
import { Icon } from '../icons/Icon';

/**
 * Włączanie funkcji ETER kodem — w menu głównym.
 *
 * Alan: „zrób na razie to, że w menu głównym wpisujesz kod, który aktywuje
 * w ogóle funkcje AI, kod to ZanklodVanWriter i wtedy można używać".
 *
 * Powód jest kosztowy: pytania do modelu kosztują za każdym razem, a gra idzie
 * do klas i domów. Bez tej bramki funkcja chodziłaby u każdego dziecka, które
 * dostało link.
 *
 * Wygląda jak zwykły, cichy odnośnik na dole menu — kto nie wie, że tu coś
 * jest, nie zauważy. Kto wie, klika i wpisuje kod.
 */
export function EterUnlock() {
  const [wlaczone, setWlaczone] = useState(czyOdblokowane);
  const [otwarte, setOtwarte] = useState(false);
  const [kod, setKod] = useState('');
  const [blad, setBlad] = useState(false);

  if (wlaczone) {
    return (
      <p className="relative mt-4 text-center text-xs text-ink-dim">
        <span className="text-accent">
          <Icon name="spark" size={12} />
        </span>{' '}
        ETER odpowiada na pytania w grze.{' '}
        <button
          type="button"
          onClick={() => {
            zablokuj();
            setWlaczone(false);
          }}
          className="underline transition hover:text-ink"
        >
          Wyłącz
        </button>
      </p>
    );
  }

  if (!otwarte) {
    return (
      <p className="relative mt-4 text-center">
        <button
          type="button"
          onClick={() => setOtwarte(true)}
          className="text-xs text-ink-dim underline transition hover:text-ink"
        >
          Mam kod do ETER
        </button>
      </p>
    );
  }

  return (
    <form
      className="relative mt-4 flex justify-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (odblokuj(kod)) {
          setWlaczone(true);
          setOtwarte(false);
          setBlad(false);
        } else {
          setBlad(true);
        }
      }}
    >
      <span className="min-w-0">
        <input
          value={kod}
          onChange={(e) => {
            setKod(e.target.value);
            setBlad(false);
          }}
          placeholder="Kod ETER"
          aria-label="Kod do funkcji ETER"
          autoFocus
          className="w-40 rounded-lg border border-edge bg-raised px-2.5 py-1.5 text-sm"
          style={blad ? { borderColor: 'var(--eter-danger)' } : undefined}
        />
        {blad && (
          <span className="mt-1 block text-center text-xs text-danger">
            Ten kod nie pasuje.
          </span>
        )}
      </span>
      <button
        type="submit"
        className="h-fit rounded-lg border border-edge px-2.5 py-1.5 text-sm transition hover:border-accent"
      >
        Włącz
      </button>
    </form>
  );
}
