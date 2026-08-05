import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ app: {} }));
vi.mock('firebase/storage', () => ({
  getStorage: () => ({}),
  ref: () => ({}),
  uploadBytes: vi.fn(async () => {}),
  getDownloadURL: vi.fn(async () => 'https://example.test/file'),
}));

import { uploadImage } from './upload';

function svgFile(name = 'payload.svg') {
  return new File(['<svg onload="alert(1)"></svg>'], name, { type: 'image/svg+xml' });
}

describe('uploadImage — SVG stored-XSS guard', () => {
  it('odrzuca SVG dla zgłoszeń — wgrywa je anonim bez konta, bez podglądu przed publikacją', async () => {
    const result = await uploadImage({ file: svgFile(), folder: 'reports', name: 'x' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/SVG/);
  });

  it('odrzuca SVG dla dyskusji — ta sama ścieżka wgrywania co zgłoszenia', async () => {
    const result = await uploadImage({ file: svgFile(), folder: 'discussions', name: 'x' });
    expect(result.ok).toBe(false);
  });

  it('dopuszcza SVG dla ikon — wgrywa wyłącznie zalogowany zespół', async () => {
    const result = await uploadImage({ file: svgFile(), folder: 'icons', name: 'x' });
    expect(result.ok).toBe(true);
  });

  it('dopuszcza SVG dla grafik kart — wgrywa wyłącznie zalogowany zespół', async () => {
    const result = await uploadImage({ file: svgFile(), folder: 'cards', name: 'x' });
    expect(result.ok).toBe(true);
  });
});
