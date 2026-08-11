import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountPanel } from './AccountPanel';

/**
 * Konto pokazuje, kim jesteś — ale imienia się tu nie zmienia.
 *
 * Wcześniej każdy wpisywał je sobie sam (`displayName` konta) i ta sama osoba
 * podpisywała się raz „Adam", raz „ADam", raz adresem e-mail; uporządkować się
 * tego nie dało, bo imienia w cudzym koncie zmienić nie można. Teraz nadaje je
 * admin przy wpisie członka, a Konto ma je tylko pokazać — gdyby wróciło tu
 * pole edycji, podpisy znów zaczęłyby się rozjeżdżać.
 */
describe('AccountPanel', () => {
  it('pokazuje imię, którym podpisują się wpisy', () => {
    render(<AccountPanel email="adam@eter11.pl" displayName="Adam" />);
    expect(screen.getByText('Adam')).toBeTruthy();
  });

  it('pokazuje adres konta', () => {
    render(<AccountPanel email="adam@eter11.pl" displayName="Adam" />);
    expect(screen.getByText('adam@eter11.pl')).toBeTruthy();
  });

  it('bez nadanego imienia pokazuje adres zamiast pustego miejsca', () => {
    render(<AccountPanel email="adam@eter11.pl" displayName={null} />);
    // Adres pojawia się dwa razy: jako konto i jako podpis zastępczy.
    expect(screen.getAllByText('adam@eter11.pl').length).toBeGreaterThan(1);
  });

  it('nie da się tu zmienić imienia', () => {
    render(<AccountPanel email="adam@eter11.pl" displayName="Adam" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Zapisz/ })).toBeNull();
  });
});
