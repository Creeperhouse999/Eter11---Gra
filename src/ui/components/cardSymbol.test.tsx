import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CardView } from './CardView';
import { setFamilySymbols, familySymbol } from './categoryStyles';
import type { Card } from '../../engine/types';

/**
 * Adam: „wprowadź do każdej karty, która ma dany kolor, symbol w górnym
 * środkowym miejscu karty, aby osoby, które nie widzą kolorów, mogły rozpoznać
 * po symbolu ten kolor".
 *
 * To dostępność, nie ozdoba. Kolor rodziny NIESIE ZASADĘ GRY: karta pasuje do
 * ścianki tylko przy zgodnej rodzinie. Dziecko mylące czerwień z zielenią (a to
 * najczęstsza postać daltonizmu) bez symbolu musi pytać innych przy każdej
 * karcie — czyli nie gra samodzielnie.
 */

function karta(over: Partial<Card> = {}): Card {
  return {
    id: 'k1',
    name: 'Odwaga',
    category: 'psychological',
    description: 'Powiedz, co myślisz.',
    icon: 'star',
    family: 'red',
    ...over,
  } as Card;
}

/** Ile kształtów SVG jest na karcie — ikona karty plus symbol rodziny. */
function ileIkon(container: HTMLElement): number {
  return container.querySelectorAll('svg').length;
}

beforeEach(() => {
  setFamilySymbols(undefined);
});

describe('symbol rodziny na karcie', () => {
  it('karta z rodziną dostaje dodatkowy znaczek', () => {
    const zRodzina = render(<CardView card={karta({ family: 'red' })} />);
    const bezRodziny = render(<CardView card={karta({ family: undefined })} />);

    expect(ileIkon(zRodzina.container)).toBeGreaterThan(ileIkon(bezRodziny.container));
  });

  /**
   * Karty specjalne (ETER11, Czarny Łabędź) nie należą do żadnej rodziny —
   * pasują wszędzie. Symbol koloru byłby przy nich kłamstwem.
   */
  it('karta bez rodziny nie dostaje symbolu', () => {
    const { container } = render(<CardView card={karta({ family: undefined, category: 'eter11' })} />);
    // Sama ikona karty, bez znaczka rodziny.
    expect(ileIkon(container)).toBe(1);
  });
});

describe('symbol bierze się z treści gry', () => {
  it('domyślnie to kształty wskazane przez Adama', () => {
    expect(familySymbol('red')).toBe('circleShape');
    expect(familySymbol('green')).toBe('triangleUp');
    expect(familySymbol('blue')).toBe('squareShape');
    expect(familySymbol('yellow')).toBe('star');
  });

  it('zespół może je wymienić w panelu', () => {
    setFamilySymbols({ red: 'heart' });
    expect(familySymbol('red')).toBe('heart');
    // Nietknięte rodziny zostają przy domyślnych.
    expect(familySymbol('blue')).toBe('squareShape');
  });

  it('wgrana grafika działa jak kształt', () => {
    setFamilySymbols({ green: 'url:https://x/znak.png' });
    expect(familySymbol('green')).toBe('url:https://x/znak.png');
  });
});
