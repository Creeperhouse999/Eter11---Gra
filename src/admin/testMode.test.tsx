import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestMode } from './TestMode';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Regresja: ziarno partii testowej startowało zawsze na `1`, więc każde
 * wejście do zakładki „Tryb testowy" rozdawało identyczną partię — testerzy
 * balansujący grę w kółko sprawdzali to samo rozdanie, dopóki ktoś ręcznie
 * nie wpisał innej liczby w pole „Ziarno". Zgłoszenie prosiło o losowe
 * ziarno przy każdym wejściu ORAZ osobny przycisk do wylosowania nowego.
 */
describe('TestMode — losowe ziarno', () => {
  afterEach(() => vi.restoreAllMocks());

  it('startowe ziarno jest losowe, nie zawsze 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    render(<TestMode content={BUILTIN_CONTENT} />);

    const input = screen.getByLabelText('Ziarno') as HTMLInputElement;
    // Bez fixu: zawsze „1", niezależnie od Math.random.
    expect(input.value).not.toBe('1');
  });

  it('przycisk „Losuj" losuje nowe ziarno, różne od poprzedniego', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    render(<TestMode content={BUILTIN_CONTENT} />);
    const seedBefore = (screen.getByLabelText('Ziarno') as HTMLInputElement).value;

    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    fireEvent.click(screen.getByRole('button', { name: /losuj/i }));

    const seedAfter = (screen.getByLabelText('Ziarno') as HTMLInputElement).value;
    expect(seedAfter).not.toBe(seedBefore);
  });
});
