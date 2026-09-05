import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CardView } from './CardView';
import type { Card } from '../../engine/types';

const card: Card = {
  id: 'c1',
  name: 'Rozwiązywanie problemów',
  category: 'talent',
  family: 'red',
  description: 'Długa nazwa, żeby sprawdzić szerokość.',
  icon: 'lion',
};

/**
 * Karta wyłożona na ściankę (compact) musi mieć węższą szerokość na telefonie.
 * Regresja: sztywne w-24 (96 px) nie mieściło się w ściance przy trzech
 * ściankach w rzędzie (~82 px) i `overflow-hidden` ucinało kartę z prawej.
 * Ten test pilnuje, że wariant compact ma telefonową szerokość (w-20) i
 * dopiero od sm wraca do 96 px — cofnięcie do samego w-24 go wywala.
 */
describe('CardView — szerokość karty na ściance (compact)', () => {
  it('compact zwęża kartę na telefonie i rośnie od sm', () => {
    const { container } = render(<CardView card={card} compact />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('w-20');
    expect(root.className).toContain('sm:w-24');
  });

  it('zwykła karta nie używa telefonowej szerokości ścianki', () => {
    const { container } = render(<CardView card={card} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toContain('w-20');
    expect(root.className).toContain('w-[6.5rem]');
  });
});

/**
 * Poświata kafla w wyglądzie „Kolorowy" (theme.css, `.eter-tile`) liczy się
 * z `--eter-tile-accent`, nie z `currentColor` — bo `currentColor` na tym
 * elemencie to zwykły kolor tekstu, nie kolor rodziny karty (żadne dziecko
 * karty nie ustawia `color` na SAMYM SOBIE, więc `currentColor` nie miał
 * skąd wziąć barwy rodziny). Bez tej zmiennej każda karta świeciła tym samym
 * blado-białym poświatem — stąd zgłoszenie Adama „nie różni się wiele od
 * klasycznego". Ten test pilnuje źródła, nie samego CSS: element musi
 * naprawdę NIEŚĆ kolor swojej rodziny w tej zmiennej.
 */
describe('CardView — zmienna koloru kafla dla wyglądu Kolorowy', () => {
  it('kafel niesie kolor rodziny karty w --eter-tile-accent', () => {
    const { container } = render(<CardView card={card} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue('--eter-tile-accent')).toBe('var(--eter-family-red)');
  });

  it('bez rodziny kafel bierze kolor kategorii', () => {
    const bezRodziny: Card = { ...card, family: undefined };
    const { container } = render(<CardView card={bezRodziny} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.getPropertyValue('--eter-tile-accent')).not.toBe('');
    expect(root.style.getPropertyValue('--eter-tile-accent')).not.toBe('var(--eter-family-red)');
  });
});
