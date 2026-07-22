import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { useTabRoute, type TabRoute } from './useTabRoute';

type Tab = 'overview' | 'reports' | 'discussions' | 'story' | 'cards';
const TABS: Tab[] = ['overview', 'reports', 'discussions', 'story', 'cards'];

/** Komponent testowy: wystawia setter i route, żeby test nimi sterował. */
let setter: (tab: Tab) => void;
let route: TabRoute<Tab>;
function Probe() {
  const [tab, setTab] = useState<Tab>('overview');
  setter = setTab;
  // Walidator tworzony inline przy każdym renderze — dokładnie jak w panelu.
  // Gdyby hook trzymał go w zależnościach efektu, ten test by to złapał.
  const validate = (v: string): v is Tab => (TABS as string[]).includes(v);
  route = useTabRoute(tab, setTab, validate);
  return (
    <span data-testid="tab">
      {tab}
      {route.sub ? `/${route.sub}` : ''}
      {route.params.filter ? `?${route.params.filter}` : ''}
    </span>
  );
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

describe('routing pod-zakładek i parametrów', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/admin');
  });
  afterEach(() => {
    window.history.pushState(null, '', '/');
  });

  it('adres z pod-zakładką otwiera właściwy widok', () => {
    window.history.pushState(null, '', '/admin/story/adults');
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('tab').textContent).toBe('story/adults');
  });

  it('adres z parametrem czyta filtr', () => {
    window.history.pushState(null, '', '/admin/cards?filter=hejt');
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('tab').textContent).toBe('cards?hejt');
  });

  it('setSub zapisuje pod-zakładkę do adresu', () => {
    render(<Probe />);
    act(() => setter('story'));
    act(() => route.setSub('adults'));
    expect(window.location.pathname).toBe('/admin/story/adults');
  });

  it('setParam zapisuje filtr do query stringa', () => {
    render(<Probe />);
    act(() => setter('cards'));
    act(() => route.setParam('filter', 'hejt'));
    expect(window.location.pathname + window.location.search).toBe(
      '/admin/cards?filter=hejt',
    );
  });

  it('zmiana zakładki czyści pod-zakładkę i filtr', () => {
    window.history.pushState(null, '', '/admin/story/adults');
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('tab').textContent).toBe('story/adults');

    act(() => setter('reports'));
    // Nowa zakładka zaczyna czysto — pod-stan poprzedniej nie przecieka.
    expect(getByTestId('tab').textContent).toBe('reports');
    expect(window.location.pathname).toBe('/admin/reports');
  });

  it('navigate skacze do zakładki z pod-stanem jednym ruchem', () => {
    // To robi wyszukiwarka: skok do „karty + fraza". Pod-stan musi przetrwać
    // czyszczenie, które robi zmiana zakładki.
    render(<Probe />);
    act(() => route.navigate('cards', null, { filter: 'hejt' }));
    expect(getByFilter()).toBe('/admin/cards?filter=hejt');
  });

  it('navigate niesie pod-zakładkę do wstępu', () => {
    render(<Probe />);
    act(() => route.navigate('story', 'adults'));
    expect(window.location.pathname).toBe('/admin/story/adults');
  });

  it('wstecz cofa zmianę pod-zakładki, nie wychodzi z zakładki', () => {
    render(<Probe />);
    act(() => setter('story'));
    act(() => route.setSub('adults'));
    expect(window.location.pathname).toBe('/admin/story/adults');

    act(() => {
      window.history.pushState(null, '', '/admin/story');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    // Wróciliśmy do story bez pod-zakładki — nadal w zakładce, nie poza nią.
    expect(window.location.pathname).toBe('/admin/story');
  });
});

/** Skrót: pełny adres z filtrem, żeby asercja czytała się jasno. */
function getByFilter(): string {
  return window.location.pathname + window.location.search;
}
