import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { ToastProvider } from '../ui/controls/Toast';
import type { CustomIcon } from '../data/customIcons';

/**
 * Nazwy plików ikon w Storage muszą być unikalne na cały czas życia biblioteki.
 *
 * Regresja: nazwa obiektu była liczona z długości tablicy (`icon-${count}-${i}`),
 * więc po usunięciu ikony licznik się cofał i kolejne wgranie trafiało na
 * ścieżkę wciąż używaną przez ocalałą ikonę — uploadBytes nadpisywał jej plik i
 * ikona cicho znikała. Test przechodzi ścieżkę wgraj A, wgraj B, usuń A, wgraj C
 * i sprawdza, że żadne dwie ikony nie dostały tej samej nazwy w Storage.
 */

vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));

const uploadNames: string[] = [];
const uploadImage = vi.fn(async (input: { name: string }) => {
  uploadNames.push(input.name);
  // URL = ścieżka: unikalna nazwa ⇒ unikalny url; kolizja nazwy ⇒ ten sam url
  // (i nadpisany plik w Storage).
  return { ok: true, url: `https://s/icons/${input.name}` };
});
vi.mock('../firebase/upload', () => ({
  uploadImage: (i: unknown) => uploadImage(i as { name: string }),
}));

const { IconEditor } = await import('./IconEditor');

function Harness() {
  const [icons, setIcons] = useState<CustomIcon[]>([]);
  return <IconEditor icons={icons} onChange={setIcons} />;
}

const uploadFile = (fileName: string) => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], fileName, { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
};

beforeEach(() => {
  uploadNames.length = 0;
  uploadImage.mockClear();
});

describe('IconEditor — unikalne nazwy plików ikon', () => {
  it('wgranie po usunięciu nie nadpisuje ocalałej ikony', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    uploadFile('a.png');
    await waitFor(() => expect(screen.getByLabelText('Usuń ikonę a')).toBeTruthy());

    uploadFile('b.png');
    await waitFor(() => expect(screen.getByLabelText('Usuń ikonę b')).toBeTruthy());

    // Usuń A (potwierdzenie w oknie).
    fireEvent.click(screen.getByLabelText('Usuń ikonę a'));
    const dialog = await screen.findByRole('dialog', { name: 'Usunąć ikonę?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń' }));
    await waitFor(() => expect(screen.queryByLabelText('Usuń ikonę a')).toBeNull());

    uploadFile('c.png');
    await waitFor(() => expect(screen.getByLabelText('Usuń ikonę c')).toBeTruthy());

    // Bez fixu: A="icon-0-0", B="icon-1-0", C="icon-1-0" ⇒ C nadpisuje B.
    expect(uploadNames).toHaveLength(3);
    expect(new Set(uploadNames).size).toBe(uploadNames.length);
  });
});
