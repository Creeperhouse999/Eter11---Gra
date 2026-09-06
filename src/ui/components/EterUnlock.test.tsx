import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EterUnlock } from './EterUnlock';
import { czyOdblokowane, zablokuj } from '../aiUnlock';

/**
 * Bramka kodu w menu głównym — Alan: „w menu głównym wpisujesz kod, który
 * aktywuje w ogóle funkcje AI".
 *
 * `aiUnlock.test.ts` sprawdza sam kod; tu chodzi o to, co widzi człowiek:
 * że bramka jest cicha (kto nie wie, nie zauważy), że zły kod dostaje
 * czytelną odmowę zamiast ciszy, i że da się wyłączyć z powrotem — np. przed
 * oddaniem tabletu dzieciom.
 */

beforeEach(() => {
  zablokuj();
});

describe('bramka kodu ETER w menu', () => {
  it('na starcie to tylko cichy odnośnik, bez pola', () => {
    render(<EterUnlock />);
    expect(screen.getByText('Mam kod do ETER')).toBeTruthy();
    expect(screen.queryByLabelText('Kod do funkcji ETER')).toBeNull();
  });

  it('zły kod dostaje odmowę i niczego nie włącza', () => {
    render(<EterUnlock />);
    fireEvent.click(screen.getByText('Mam kod do ETER'));
    fireEvent.change(screen.getByLabelText('Kod do funkcji ETER'), {
      target: { value: 'nie ten' },
    });
    fireEvent.click(screen.getByText('Włącz'));

    expect(screen.getByText('Ten kod nie pasuje.')).toBeTruthy();
    expect(czyOdblokowane()).toBe(false);
  });

  it('poprawny kod włącza ETER i chowa formularz', () => {
    render(<EterUnlock />);
    fireEvent.click(screen.getByText('Mam kod do ETER'));
    fireEvent.change(screen.getByLabelText('Kod do funkcji ETER'), {
      target: { value: 'ZanklodVanWriter' },
    });
    fireEvent.click(screen.getByText('Włącz'));

    expect(czyOdblokowane()).toBe(true);
    expect(screen.getByText(/ETER odpowiada na pytania/)).toBeTruthy();
    expect(screen.queryByLabelText('Kod do funkcji ETER')).toBeNull();
  });

  it('„Wyłącz" cofa odblokowanie — przed oddaniem tabletu dzieciom', () => {
    render(<EterUnlock />);
    fireEvent.click(screen.getByText('Mam kod do ETER'));
    fireEvent.change(screen.getByLabelText('Kod do funkcji ETER'), {
      target: { value: 'ZanklodVanWriter' },
    });
    fireEvent.click(screen.getByText('Włącz'));
    fireEvent.click(screen.getByText('Wyłącz'));

    expect(czyOdblokowane()).toBe(false);
    expect(screen.getByText('Mam kod do ETER')).toBeTruthy();
  });

  it('poprawka złego kodu kasuje komunikat o błędzie', () => {
    render(<EterUnlock />);
    fireEvent.click(screen.getByText('Mam kod do ETER'));
    const pole = screen.getByLabelText('Kod do funkcji ETER');
    fireEvent.change(pole, { target: { value: 'zle' } });
    fireEvent.click(screen.getByText('Włącz'));
    expect(screen.getByText('Ten kod nie pasuje.')).toBeTruthy();

    fireEvent.change(pole, { target: { value: 'zl' } });
    expect(screen.queryByText('Ten kod nie pasuje.')).toBeNull();
  });
});
