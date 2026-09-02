import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import type { GameContent } from '../firebase/validate';
import type { Preset, PresetBundle } from '../firebase/presets';

/**
 * Druga część zgłoszenia „Presety w każdej zakładce": preset całej apki
 * (zestaw), który WSKAZUJE presety sekcji zamiast kopiować ich treść.
 * Warstwa danych (`saveBundle`/`applyBundle`…) ma już testy w
 * `presets.test.ts` — tu sprawdzamy tylko panel: kto co widzi i czy
 * wczytanie faktycznie podmienia treść przez `onApply`.
 */

const cardsPreset: Preset = {
  id: 'preset-cards',
  section: 'cards',
  name: 'Święta',
  author: 'Ola',
  createdAt: new Date().toISOString(),
  data: BUILTIN_CONTENT.cards,
};

const bundle: PresetBundle = {
  id: 'bundle-1',
  name: 'Zestaw świąteczny',
  author: 'Ola',
  createdAt: new Date().toISOString(),
  parts: { cards: 'preset-cards' },
};

let presets: Preset[] = [];
let bundles: PresetBundle[] = [];

const saveBundle = vi.fn(
  async (_input: unknown): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);
const removeBundle = vi.fn(
  async (_id: string): Promise<{ ok: boolean; error?: string }> => ({ ok: true }),
);

vi.mock('../firebase/presets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/presets')>();
  return {
    ...actual,
    watchPresets: (cb: (p: Preset[]) => void) => {
      cb(presets);
      return () => {};
    },
    watchBundles: (cb: (b: PresetBundle[]) => void) => {
      cb(bundles);
      return () => {};
    },
    saveBundle: (input: unknown) => saveBundle(input),
    removeBundle: (id: string) => removeBundle(id),
  };
});

const { PresetBundleBar } = await import('./PresetBundleBar');

const renderBar = (role: 'admin' | 'co-admin' | 'coworker', onApply = vi.fn()) =>
  render(
    <ToastProvider>
      <PresetBundleBar content={BUILTIN_CONTENT} role={role} author="Test" onApply={onApply} />
    </ToastProvider>,
  );

beforeEach(() => {
  presets = [cardsPreset];
  bundles = [bundle];
  saveBundle.mockClear();
  removeBundle.mockClear();
});

describe('PresetBundleBar', () => {
  it('bez żadnego zapisanego presetu w żadnej sekcji nie da się złożyć zestawu', () => {
    presets = [];
    bundles = [];
    renderBar('admin');
    expect(screen.getByText('Złóż zestaw')).toHaveProperty('disabled', true);
  });

  it('wczytanie zestawu podmienia treść przez onApply zawartością wskazanego presetu', async () => {
    const onApply = vi.fn();
    renderBar('admin', onApply);

    fireEvent.click(screen.getByLabelText('Wczytaj zestaw'));
    fireEvent.click(screen.getByRole('option', { name: 'Zestaw świąteczny' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Wczytaj' }));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const wynik = onApply.mock.calls[0][0] as GameContent;
    expect(wynik.cards).toBe(cardsPreset.data);
  });

  it('co-admin widzi listę i wczytywanie, ale nie przycisk usuwania zestawu (usuwa tylko admin/programista)', () => {
    renderBar('co-admin');
    expect(screen.getByLabelText('Wczytaj zestaw')).toBeTruthy();
    expect(screen.queryByLabelText(/Usuń zestaw/)).toBeNull();
  });

  it('admin widzi przycisk usuwania zestawu', () => {
    renderBar('admin');
    expect(screen.getByLabelText(/Usuń zestaw/)).toBeTruthy();
  });

  it('coworker (bez moderacji) widzi tylko listę nazw, bez selecta wczytywania', () => {
    renderBar('coworker');
    expect(screen.queryByLabelText('Wczytaj zestaw')).toBeNull();
    expect(screen.getByText(/Zapisane: Zestaw świąteczny/)).toBeTruthy();
  });
});
