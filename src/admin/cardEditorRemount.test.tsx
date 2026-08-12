import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { CardEditor } from './CardEditor';
import { ALL_CARDS } from '../data/cards';

/**
 * Pisanie w wyszukiwarce kart nie może kasować pracy redaktora.
 *
 * Fraza filtra żyje w adresie (`?filter=…`), żeby dało się wysłać komuś link do
 * przefiltrowanej listy. Panel przekazywał ją jednak z powrotem jako `key`
 * komponentu — a to znaczy, że przy KAŻDYM wciśniętym klawiszu React niszczył
 * edytor i montował nowy. Ginęło wtedy wszystko, co lokalne: zaznaczenie kart
 * do zmiany hurtem, filtr kategorii, sortowanie, wyróżnienie świeżo dodanej
 * karty — a pole traciło fokus w połowie wyrazu.
 *
 * Ten test odtwarza dokładnie układ z panelu (fraza wraca z „adresu" do
 * komponentu) i sprawdza obie strony: że stary sposób NAPRAWDĘ gubił
 * zaznaczenie i że obecny je utrzymuje. Bez tej pierwszej połowy nie byłoby
 * wiadomo, czy test w ogóle bada właściwą rzecz.
 */

/** Układ jak w `AdminApp`: fraza z pola wraca do komponentu jako `initialSearch`. */
function Panel({ zKey }: { zKey: boolean }) {
  const [fraza, setFraza] = useState('');
  const karty = [ALL_CARDS.find((card) => card.category === 'psychological')!];
  return (
    <ToastProvider>
      <CardEditor
        // Stary sposób: `key` z frazy — czyli remount przy każdym znaku.
        {...(zKey ? { key: fraza } : {})}
        cards={karty}
        onChange={() => {}}
        initialSearch={fraza}
        onSearchChange={setFraza}
      />
    </ToastProvider>
  );
}

const zaznaczIWpisz = () => {
  fireEvent.click(screen.getByLabelText(/^Zaznacz kartę/));
  expect(screen.getByText(/Zaznaczono 1/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Szukaj/i), { target: { value: 'o' } });
};

describe('edytor kart nie montuje się od nowa przy pisaniu', () => {
  it('zaznaczenie przeżywa wpisanie znaku w wyszukiwarce', () => {
    render(<Panel zKey={false} />);
    zaznaczIWpisz();

    expect(screen.getByText(/Zaznaczono 1/)).toBeTruthy();
  });

  it('dla porównania: przy remouncie zaznaczenie ginie po jednym znaku', () => {
    render(<Panel zKey />);
    zaznaczIWpisz();

    // Tak wyglądał błąd. Ta asercja pilnuje, że test bada właściwą rzecz —
    // gdyby przestała być prawdziwa, znaczyłoby to, że remount przestał być
    // szkodliwy i pierwszy test niczego już nie dowodzi.
    expect(screen.queryByText(/Zaznaczono/)).toBeNull();
  });
});
