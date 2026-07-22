import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { useTabRoute } from './useTabRoute';

type Tab = 'overview' | 'reports' | 'discussions';
const TABS: Tab[] = ['overview', 'reports', 'discussions'];
const isTab = (v: string): v is Tab => (TABS as string[]).includes(v);

/** Komponent testowy: wystawia setter, żeby test mógł zmienić zakładkę. */
let setter: (tab: Tab) => void;
function Probe() {
  const [tab, setTab] = useState<Tab>('overview');
  setter = setTab;
  useTabRoute(tab, setTab, isTab);
  return <span data-testid="tab">{tab}</span>;
}

describe('routing zakładek', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/admin');
  });
  afterEach(() => {
    window.history.pushState(null, '', '/');
  });

  it('zmiana zakładki zmienia adres', () => {
    render(<Probe />);
    act(() => setter('reports'));
    expect(window.location.pathname).toBe('/admin/reports');
  });

  it('wpisany adres otwiera właściwą zakładkę', () => {
    window.history.pushState(null, '', '/admin/discussions');
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('tab').textContent).toBe('discussions');
  });

  it('przycisk wstecz wraca do poprzedniej zakładki', () => {
    const { getByTestId } = render(<Probe />);

    act(() => setter('reports'));
    act(() => setter('discussions'));

    // popstate to sygnał „wstecz"; ręcznie ustawiamy adres i emitujemy.
    act(() => {
      window.history.pushState(null, '', '/admin/reports');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(getByTestId('tab').textContent).toBe('reports');
  });

  it('nieznany slug nie zmienia zakładki', () => {
    window.history.pushState(null, '', '/admin/nie-ma-takiej');
    const { getByTestId } = render(<Probe />);
    // Zostaje domyślna, bo slug nie jest znaną zakładką.
    expect(getByTestId('tab').textContent).toBe('overview');
  });
});
