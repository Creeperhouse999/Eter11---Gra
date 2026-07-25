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
