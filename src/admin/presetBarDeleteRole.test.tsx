import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastProvider } from '../ui/controls/Toast';
import { BUILTIN_CONTENT } from '../data/builtinContent';
import type { Preset } from '../firebase/presets';

/**
 * Regresja: przycisk usuwania presetu pokazywał się każdemu, kogo
 * `canModerate` uznaje za moderatora (admin, programmer, co-admin) — ale
 * `firestore.rules` pozwala skasować preset tylko `jestAdmin()` (admin,
 * programmer, BEZ co-admina — tak samo jak przy moderacji zgłoszeń: "Admin
 * i co-admin moderują, ale usuwa tylko admin"). Co-admin klikający „×" dostawał
 * więc zawsze 403 z bazy i mylący toast „Nie udało się usunąć presetu",
 * mimo że przycisk sugerował, że operacja się uda.
 */

const preset: Preset = {
  id: 'p1',
  section: 'cards',
  name: 'Wersja świąteczna',
  author: 'Ola',
  createdAt: new Date().toISOString(),
  data: BUILTIN_CONTENT.cards,
};

vi.mock('../firebase/presets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../firebase/presets')>();
  return {
    ...actual,
    watchPresets: (cb: (p: Preset[]) => void) => {
      cb([preset]);
      return () => {};
    },
  };
});

const { PresetBar } = await import('./PresetBar');

const renderBar = (role: 'admin' | 'co-admin' | 'programmer') =>
  render(
    <ToastProvider>
      <PresetBar
        section="cards"
        content={BUILTIN_CONTENT}
        role={role}
        author="Test"
        onApply={() => {}}
      />
    </ToastProvider>,
  );

describe('PresetBar — kto może usuwać preset', () => {
  it('co-admin widzi listę i wczytywanie, ale NIE przycisk usuwania (reguła pozwala tylko adminowi/programiście)', () => {
    renderBar('co-admin');
    expect(screen.getByLabelText(/Wczytaj preset/)).toBeTruthy();
    expect(screen.queryByLabelText(/Usuń preset/)).toBeNull();
  });

  it('admin widzi przycisk usuwania — tu reguła faktycznie pozwala', () => {
    renderBar('admin');
    expect(screen.getByLabelText(/Usuń preset/)).toBeTruthy();
  });

  it('programmer (traktowany jak admin w regułach) też widzi przycisk usuwania', () => {
    renderBar('programmer');
    expect(screen.getByLabelText(/Usuń preset/)).toBeTruthy();
  });
});
