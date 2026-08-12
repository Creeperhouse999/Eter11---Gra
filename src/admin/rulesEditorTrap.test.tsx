import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RulesEditor } from './RulesEditor';
import { DEFAULT_CONFIG } from '../engine/reducer';

/**
 * Redaktor nie może wpaść w pułapkę bez wyjścia.
 *
 * Zapis w panelu jest WSPÓLNY dla całej treści — kart, problemów, tekstów
 * i zasad. Gdy walidacja odrzuca jedną wartość, blokuje się wszystko, co
 * zrobiono w tej sesji.
 *
 * `maxHandSize` jest żywą zasadą silnika (na nowej rundzie gracz dobiera tylko
 * gdy `hand.length < maxHandSize`) i walidacja odrzuca zestaw, w którym limit
 * jest mniejszy od rozdania. Ale pola do jego zmiany w panelu NIE BYŁO:
 * podniesienie „Kart na ręce" ponad domyślny limit blokowało zapis, a limitu
 * nie było czym odkręcić. Jedynym wyjściem było „Odrzuć zmiany", czyli utrata
 * całej pracy.
 */

describe('RulesEditor — pułapka limitu ręki', () => {
  it('limit kart w ręce da się zmienić z panelu', () => {
    render(<RulesEditor rules={DEFAULT_CONFIG} onChange={vi.fn()} />);

    // Bez tego pola nie ma jak wyjść z blokady zapisu.
    expect(screen.getByLabelText('Limit kart w ręce')).toBeTruthy();
  });

  it('ostrzega od razu, gdy limit jest mniejszy niż rozdanie', () => {
    render(
      <RulesEditor
        rules={{ ...DEFAULT_CONFIG, handSize: 8, maxHandSize: 7 }}
        onChange={vi.fn()}
      />,
    );

    // Komunikat przy polach, nie tylko w pasku na górze strony — po
    // przewinięciu tamten bywa poza widokiem, a przycisk „Zapisz" wygląda
    // po prostu na zepsuty.
    expect(screen.getByText(/nie dobraliby ani jednej karty/i)).toBeTruthy();
  });

  it('przy poprawnych zasadach nie straszy bez powodu', () => {
    render(<RulesEditor rules={DEFAULT_CONFIG} onChange={vi.fn()} />);

    expect(screen.queryByText(/nie dobraliby ani jednej karty/i)).toBeNull();
    expect(screen.queryByText(/nie da się wygrać/i)).toBeNull();
  });
});
