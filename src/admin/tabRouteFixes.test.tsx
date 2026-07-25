import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { useTabRoute, type TabRoute } from './useTabRoute';

type Tab = 'overview' | 'reports' | 'story' | 'cards';
const TABS: Tab[] = ['overview', 'reports', 'story', 'cards'];

let setter: (t: Tab) => void;
let route: TabRoute<Tab>;

/**
 * Zakładka inicjowana Z ADRESU — dokładnie jak AdminApp (initialTab). To
 * odróżnia ten przypadek od Probe w useTabRoute.test.tsx (zawsze 'overview'),
 * a właśnie przy inicjacji z adresu ujawniał się wyciek pod-stanu.
 */
function ProbeFromUrl() {
  const slug = window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'overview';
  const [tab, setTab] = useState<Tab>((TABS as string[]).includes(slug) ? (slug as Tab) : 'overview');
  setter = setTab;
  const validate = (v: string): v is Tab => (TABS as string[]).includes(v);
  route = useTabRoute(tab, setTab, validate);
  return null;
}

beforeEach(() => window.history.replaceState(null, '', '/admin'));
afterEach(() => window.history.replaceState(null, '', '/'));

describe('useTabRoute — wyciek pod-stanu i historia', () => {
  it('klik zakładki po wejściu z adresu z pod-zakładką nie przenosi tej pod-zakładki', () => {
    window.history.replaceState(null, '', '/admin/story/adults');
    render(<ProbeFromUrl />); // tab startuje 'story' z adresu

    act(() => setter('cards')); // pierwsze kliknięcie zakładki

    // Bez fixu: /admin/cards/adults (wyciek 'adults'). Z fixem: /admin/cards.
    expect(window.location.pathname).toBe('/admin/cards');
    expect(route.sub).toBeNull();
  });

  it('setParam podmienia adres (replace), nie dopisuje wpisu (push)', () => {
    window.history.replaceState(null, '', '/admin/cards');
    render(<ProbeFromUrl />);

    // Spy po montażu — pierwsze wyrównanie adresu nas nie interesuje.
    const push = vi.spyOn(window.history, 'pushState');
    const replace = vi.spyOn(window.history, 'replaceState');

    act(() => route.setParam('filter', 'h'));
    act(() => route.setParam('filter', 'he'));

    // Bez fixu: pushState na każdy znak (spam historii). Z fixem: replaceState.
    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?filter=he');

    push.mockRestore();
    replace.mockRestore();
  });
});
