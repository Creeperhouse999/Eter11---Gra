import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { ToastProvider } from '../ui/controls/Toast';
import type { Card } from '../engine/types';
import type { CardImage } from '../data/cardImages';

/**
 * Zgłoszenie: dopasowanie grafiki do karty dało się robić tylko pojedynczo
 * w zakładce Karty, bez podglądu, co już jest wgrane. Te testy pokrywają
 * nową bibliotekę grafik: wgranie wielu plików naraz, automatyczne
 * dopasowanie po nazwie pliku i ręczną zmianę przez listę rozwijaną.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));

const uploadImage = vi.fn(async (input: { name: string }) => ({
  ok: true,
  url: `https://s/cards/${input.name}`,
}));
vi.mock('../firebase/upload', () => ({
  uploadImage: (i: unknown) => uploadImage(i as { name: string }),
}));

const { CardImagesEditor } = await import('./CardImagesEditor');

const CARDS: Card[] = [
  {
    id: 'psy-r-odpornosc',
    name: 'Odporność psychiczna',
    category: 'psychological',
    description: '',
    icon: 'shield',
    family: 'red',
  },
  {
    id: 'dig-y-programowanie',
    name: 'Programowanie',
    category: 'digital',
    description: '',
    icon: 'code',
    family: 'yellow',
  },
];

function Harness({ initialImages = [] }: { initialImages?: CardImage[] }) {
  const [state, setState] = useState<{ cardImages: CardImage[]; cards: Card[] }>({
    cardImages: initialImages,
    cards: CARDS,
  });
  return (
    <>
      <CardImagesEditor
        cardImages={state.cardImages}
        cards={state.cards}
        onChange={setState}
      />
      <pre data-testid="cards-json">{JSON.stringify(state.cards)}</pre>
      <pre data-testid="images-json">{JSON.stringify(state.cardImages)}</pre>
    </>
  );
}

const uploadFiles = (files: File[]) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
};

const cardsState = (): Card[] =>
  JSON.parse(screen.getByTestId('cards-json').textContent ?? '[]');

const imagesState = (): CardImage[] =>
  JSON.parse(screen.getByTestId('images-json').textContent ?? '[]');

beforeEach(() => {
  uploadImage.mockClear();
});

describe('CardImagesEditor', () => {
  it('pusta biblioteka pokazuje stan pusty', () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    expect(screen.getByText(/Biblioteka jest pusta/)).toBeTruthy();
  });

  it('plik nazwany jak id karty dopasowuje się i ustawia jej grafikę automatycznie', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    const matched = new File(['x'], 'psy-r-odpornosc.png', { type: 'image/png' });
    const unmatched = new File(['x'], 'losowy-plik.png', { type: 'image/png' });
    uploadFiles([matched, unmatched]);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Karta dla grafiki psy-r-odpornosc' }).textContent,
      ).toContain('Odporność psychiczna'),
    );

    expect(
      screen.getByRole('button', { name: 'Karta dla grafiki losowy-plik' }).textContent,
    ).toContain('nieprzypisana');

    await waitFor(() => expect(uploadImage).toHaveBeenCalled());
    const uploadedName = uploadImage.mock.calls[0][0].name;
    await waitFor(() =>
      expect(cardsState().find((c) => c.id === 'psy-r-odpornosc')?.image).toBe(
        `https://s/cards/${uploadedName}`,
      ),
    );
  });

  it('ręczna zmiana w liście rozwijanej przypisuje grafikę do wybranej karty', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    uploadFiles([new File(['x'], 'losowy-plik.png', { type: 'image/png' })]);
    const trigger = await screen.findByRole('button', {
      name: 'Karta dla grafiki losowy-plik',
    });

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Programowanie' }));

    await waitFor(() =>
      expect(cardsState().find((c) => c.id === 'dig-y-programowanie')?.image).toMatch(
        /^https:\/\/s\/cards\//,
      ),
    );
  });

  it('usunięcie grafiki zwalnia przypisaną kartę', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    uploadFiles([new File(['x'], 'psy-r-odpornosc.png', { type: 'image/png' })]);
    await waitFor(() =>
      expect(cardsState().find((c) => c.id === 'psy-r-odpornosc')?.image).toBeTruthy(),
    );

    fireEvent.click(screen.getByLabelText('Usuń grafikę psy-r-odpornosc'));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć grafikę?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń' }));

    await waitFor(() =>
      expect(cardsState().find((c) => c.id === 'psy-r-odpornosc')?.image).toBeUndefined(),
    );
    expect(screen.queryByText('psy-r-odpornosc')).toBeNull();
  });

  it('grafika osierocona po usuniętej karcie nie psuje licznika kart bez grafiki', () => {
    // Regresja: licznik liczony jako `cards.length - liczba przypisanych`
    // schodził poniżej zera, gdy grafika wciąż wskazywała kartę usuniętą w
    // zakładce Karty (ten wpis nie ma odpowiednika wśród `cards`).
    const orphan: CardImage = { id: 'i1', url: 'https://s/x.png', fileName: 'x', cardId: 'nie-istnieje' };
    render(
      <ToastProvider>
        <CardImagesEditor cardImages={[orphan]} cards={CARDS} onChange={vi.fn()} />
      </ToastProvider>,
    );
    expect(screen.getByText(/2 kart bez grafiki/)).toBeTruthy();
  });

  it('przypisanie karty do nowej grafiki zwalnia poprzednią, która ją trzymała', async () => {
    // Regresja: `assign` zerował tylko `cardId` grafiki, którą edytujemy
    // (jej WŁASNE poprzednie przypisanie), ale nie sprawdzał, czy jakaś INNA
    // grafika w bibliotece już trzyma tę samą kartę. Dwie grafiki mogły więc
    // wskazywać tę samą kartę naraz — biblioteka pokazywała starą grafikę
    // jako wciąż „przypisaną”, choć karta realnie nosiła już nową.
    const first: CardImage = {
      id: 'img1',
      url: 'https://s/first.png',
      fileName: 'pierwsza',
      cardId: 'psy-r-odpornosc',
    };
    const second: CardImage = { id: 'img2', url: 'https://s/second.png', fileName: 'druga' };

    render(
      <ToastProvider>
        <Harness initialImages={[first, second]} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Karta dla grafiki druga' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Odporność psychiczna' }));

    await waitFor(() =>
      expect(imagesState().find((i) => i.id === 'img2')?.cardId).toBe('psy-r-odpornosc'),
    );
    expect(imagesState().find((i) => i.id === 'img1')?.cardId).toBeUndefined();
    expect(
      screen.getByRole('button', { name: 'Karta dla grafiki pierwsza' }).textContent,
    ).toContain('nieprzypisana');
  });
});
