import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Icon, CUSTOM_ICON_PREFIX } from './Icon';

/**
 * Ikony wgrane przez zespół są zapisane jako `url:…` i muszą działać wszędzie
 * tam, gdzie wbudowane — na kartach, kategoriach, rodzinach. Wbudowana rysuje
 * się jako ścieżka SVG, własna jako obraz; te dwa przypadki nie mogą się
 * pomylić, bo obcego SVG nie da się wcisnąć w `<path>`.
 */
describe('Icon z własną ikoną', () => {
  it('rysuje ikonę wbudowaną jako svg', () => {
    const { container } = render(<Icon name="star" />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('rysuje ikonę wgraną jako obraz', () => {
    const { container } = render(
      <Icon name={`${CUSTOM_ICON_PREFIX}https://example.com/lisek.png`} />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/lisek.png');
  });

  it('nieznana nazwa nie wywala ekranu, tylko nic nie rysuje', () => {
    // Zdarza się, gdy zawartość odwołuje się do ikony usuniętej z zestawu —
    // pusty kwadrat jest gorszy niż biały ekran, ale biały ekran jest
    // najgorszy ze wszystkich.
    const { container } = render(<Icon name="tej-ikony-nie-ma" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
