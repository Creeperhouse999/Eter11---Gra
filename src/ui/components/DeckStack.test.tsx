import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DeckStack } from './DeckStack';

/**
 * Talia na widoku: karta wylatuje ze stosu, gdy się dobiera. Testy pilnują,
 * że lecąca karta pojawia się TYLKO przy ubytku (dobranie), a nie przy
 * dosypaniu ze stosu odrzuconych — inaczej animacja myliłaby kierunek.
 */
describe('DeckStack', () => {
  it('pokazuje liczbę kart w etykiecie', () => {
    const { container } = render(<DeckStack count={42} label="Talia" />);
    expect(container.textContent).toContain('Talia · 42');
  });

  it('lecąca karta pojawia się przy dobraniu', () => {
    const { container, rerender } = render(<DeckStack count={40} label="Talia" />);
    expect(container.querySelectorAll('.eter-deck-fly')).toHaveLength(0);

    // Talia zmalała o dwie — dwie karty w locie.
    rerender(<DeckStack count={38} label="Talia" />);
    expect(container.querySelectorAll('.eter-deck-fly')).toHaveLength(2);
  });

  it('dosypanie do talii nie animuje', () => {
    const { container, rerender } = render(<DeckStack count={10} label="Talia" />);
    // Recykling stosu odrzuconych — talia rośnie. Nic nie leci.
    rerender(<DeckStack count={30} label="Talia" />);
    expect(container.querySelectorAll('.eter-deck-fly')).toHaveLength(0);
  });

  it('duży ubytek pokazuje najwyżej trzy lecące', () => {
    const { container, rerender } = render(<DeckStack count={50} label="Talia" />);
    rerender(<DeckStack count={10} label="Talia" />);
    expect(container.querySelectorAll('.eter-deck-fly')).toHaveLength(3);
  });

  it('mała talia świeci ostrzegawczo', () => {
    // Kart zostało mało — wierzch stosu dostaje kolor ostrzegawczy, żeby
    // dziecko widziało, że talia się kończy.
    const { container } = render(<DeckStack count={4} label="Talia" />);
    expect(container.querySelector('.border-accent-2')).not.toBeNull();
  });

  it('pełna talia nie świeci ostrzegawczo', () => {
    const { container } = render(<DeckStack count={40} label="Talia" />);
    expect(container.querySelector('.border-accent-2')).toBeNull();
  });

  it('pusta talia pokazuje etykietę z zerem', () => {
    const { container } = render(<DeckStack count={0} label="Talia" />);
    expect(container.textContent).toContain('Talia · 0');
  });
});
