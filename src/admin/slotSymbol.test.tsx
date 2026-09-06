import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { PrintCards } from './PrintCards';
import { FamilyEditor } from './FamilyEditor';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Adam po pierwszej wersji symboli kolorów, dwie uwagi:
 *
 * 1. „dodaj do wizualizacji kart problemów w »drukuj karty«, aby tam, gdzie
 *    są karty potrzebne do wygrania z problemem, też były te symbole".
 *    Symbol na karcie bez symbolu na ściance to połowa zasady: gracz
 *    niewidzący kolorów rozpoznaje, co trzyma, ale nie wie, gdzie to dołożyć.
 *
 * 2. „nie widzę w zakładce Rodziny możliwości edycji symbolu". Sekcja była —
 *    na samym dole, pod dwudziestoma wierszami rodzin, gdzie nikt nie
 *    przewija. Test pilnuje, że stoi PRZED pierwszą rodziną.
 */

// Panel ciągnie klienta Firebase przez ImageUpload (Storage) i App Check —
// w teście żadne z nich nie ma się łączyć z siecią.
vi.mock('../firebase/client', () => ({ app: {}, db: {}, auth: {}, rtdb: {} }));
// `upload.ts` woła `getStorage(app)` już przy imporcie — z atrapą `app`
// wywraca się na `getProvider`, dlatego mockujemy cały moduł uploadu, jak
// robią to pozostałe testy panelu.
vi.mock('../firebase/upload', () => ({
  uploadImage: async () => ({ ok: true, url: 'https://s/x.png' }),
}));

describe('symbole na ściankach kart problemów (wydruk)', () => {
  it('każda ścianka na wydruku ma znaczek rodziny', () => {
    const { container } = render(<PrintCards content={BUILTIN_CONTENT} />);
    const scianki = container.querySelectorAll('[data-testid^="slot-"]');
    expect(scianki.length).toBeGreaterThan(0);
    for (const scianka of scianki) {
      expect(
        scianka.querySelector('svg'),
        `ścianka ${scianka.getAttribute('data-testid')} bez symbolu`,
      ).toBeTruthy();
    }
  });
});

describe('edytor symboli w zakładce Rodziny', () => {
  it('stoi na górze, przed pierwszą rodziną — tam, gdzie Adam go szukał', () => {
    render(
      // ImageUpload w edytorze symboli woła useToast — bez providera render
      // rzuca, zanim cokolwiek się pokaże.
      <ToastProvider>
        <FamilyEditor
          families={BUILTIN_CONTENT.families}
          cards={BUILTIN_CONTENT.cards}
          onChange={() => {}}
          symbols={undefined}
          onSymbolsChange={() => {}}
        />
      </ToastProvider>,
    );
    const naglowekSymboli = screen.getByText('Symbole kolorów');
    // Pierwsze pole nazwy rodziny — cokolwiek z listy rodzin.
    const pierwszaRodzina = screen.getAllByRole('textbox')[0];
    // `compareDocumentPosition`: bit FOLLOWING oznacza, że pole rodziny jest
    // ZA nagłówkiem symboli w kolejności dokumentu.
    const pozycja = naglowekSymboli.compareDocumentPosition(pierwszaRodzina);
    expect(pozycja & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('bez obsługi zmian sekcja nie pojawia się wcale', () => {
    render(
      <ToastProvider>
        <FamilyEditor
          families={BUILTIN_CONTENT.families}
          cards={BUILTIN_CONTENT.cards}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    expect(screen.queryByText('Symbole kolorów')).toBeNull();
  });
});
