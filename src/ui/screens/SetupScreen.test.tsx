import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SetupScreen } from './SetupScreen';
import type { Character } from '../../engine/types';

/**
 * Ekran startowy przy stole: imiona i UNIKALNE postacie.
 *
 * Postać identyfikuje gracza na planszy (awatar, kolor). Dwóch graczy z tą
 * samą postacią jest nie do odróżnienia. Ekran pilnuje tego, wyłączając
 * postać już wybraną przez kogoś — ale liczba postaci pochodzi z panelu
 * redakcyjnego i może być mniejsza niż czterech graczy. Wtedy „Dodaj gracza"
 * nie ma z czego przydzielić unikalnej postaci i musi zniknąć, inaczej nowy
 * gracz dostaje duplikat.
 */

const char = (id: string): Character => ({
  id,
  name: id.toUpperCase(),
  kind: 'child',
  traits: 'cecha',
  icon: 'compass',
});

const noop = () => {};

describe('SetupScreen — unikalne postacie', () => {
  it('nie pozwala dodać więcej graczy niż jest postaci (inaczej duplikat postaci)', () => {
    // Tylko dwie postacie: dwaj startowi gracze wypełniają komplet, trzeciego
    // nie da się przydzielić unikalnie.
    render(<SetupScreen onStart={noop} characters={[char('a'), char('b')]} />);
    expect(screen.queryByRole('button', { name: /dodaj gracza/i })).toBeNull();
  });

  it('przy komplecie postaci pozwala dodać graczy aż do czterech', () => {
    render(<SetupScreen onStart={noop} />); // 7 domyślnych postaci
    const addBtn = () => screen.queryByRole('button', { name: /dodaj gracza/i });
    expect(addBtn()).not.toBeNull(); // start: 2 graczy
    fireEvent.click(addBtn()!); // 3 graczy
    fireEvent.click(addBtn()!); // 4 graczy — komplet
    expect(addBtn()).toBeNull();
  });

  it('startowi dwaj gracze mają różne postacie', () => {
    render(<SetupScreen onStart={noop} characters={['a', 'b', 'c', 'd'].map(char)} />);
    const checkedIn = (label: RegExp) => {
      const group = screen.getByRole('radiogroup', { name: label });
      return within(group)
        .getAllByRole('radio')
        .find((b) => b.getAttribute('aria-checked') === 'true')
        ?.getAttribute('aria-label');
    };
    const p1 = checkedIn(/Postać gracza 1/i);
    const p2 = checkedIn(/Postać gracza 2/i);
    expect(p1).toBeTruthy();
    expect(p2).toBeTruthy();
    expect(p1).not.toBe(p2);
  });

  it('postać wybrana przez innego gracza jest niedostępna do wyboru', () => {
    render(<SetupScreen onStart={noop} characters={['a', 'b', 'c', 'd'].map(char)} />);
    const p1 = screen.getByRole('radiogroup', { name: /Postać gracza 1/i });
    // Gracz 2 startuje z postacią o indeksie min(3, len-1)=3 → 'D'.
    const takenBtn = within(p1).getByRole('radio', { name: 'D' }) as HTMLButtonElement;
    expect(takenBtn.disabled).toBe(true);
    // Wolna postać zostaje klikalna.
    const freeBtn = within(p1).getByRole('radio', { name: 'B' }) as HTMLButtonElement;
    expect(freeBtn.disabled).toBe(false);
  });
});
