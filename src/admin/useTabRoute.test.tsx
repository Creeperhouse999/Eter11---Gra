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
  // Walidator tworzony inline przy każdym renderze — dokładnie jak w panelu.
  // Gdyby hook trzymał go w zależnościach efektu, ten test by to złapał.
  const validate = (v: string): v is Tab => (TABS as string[]).includes(v);
  useTabRoute(tab, setTab, validate);
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

  it('klik zakładki na podstronie przełącza, nie cofa', () => {
    // Regresja: będąc na /admin/history, kliknięcie innej zakładki cofało
    // się natychmiast, bo efekt „adres → zakładka" odpalał się po każdym
    // renderze (niestabilny walidator w zależnościach) i czytał jeszcze
    // stary adres. Panel wyglądał, jakby nie dało się przełączyć zakładki.
    window.history.pushState(null, '', '/admin/discussions');
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('tab').textContent).toBe('discussions');

    act(() => setter('reports'));
    expect(getByTestId('tab').textContent).toBe('reports');
    expect(window.location.pathname).toBe('/admin/reports');
  });

  it('goły /admin poprawia adres bez dopisywania wpisu', () => {
    // Wejście na /admin ustawia overview i musi poprawić adres — ale przez
    // zamianę, nie dopisanie. Inaczej „wstecz" wracałby na /admin i pętlił.
    window.history.pushState(null, '', '/admin');
    const before = window.history.length;
    render(<Probe />);

    expect(window.location.pathname).toBe('/admin/overview');
    // replaceState nie zwiększa długości historii; pushState by zwiększył.
    expect(window.history.length).toBe(before);
  });

  it('nieznany slug nie zmienia zakładki', () => {
    window.history.pushState(null, '', '/admin/nie-ma-takiej');
    const { getByTestId } = render(<Probe />);
    // Zostaje domyślna, bo slug nie jest znaną zakładką.
    expect(getByTestId('tab').textContent).toBe('overview');
  });
});
