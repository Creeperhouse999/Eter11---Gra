import { describe, it, expect } from 'vitest';
import { podpisNotatki } from './noteAuthor';

/**
 * Alan zgłosił, patrząc na wątek zgłoszenia: „znowu bug z tym twoim
 * zgłaszający". Na zrzucie ten sam człowiek — Adam — raz podpisany jest
 * imieniem, raz bezosobowym „Zgłaszający", w jednym wątku, jedna pod drugą.
 * Wygląda to, jakby w rozmowie brała udział trzecia osoba.
 *
 * Powód: notatka bez pola `author` spadała do generycznej etykiety, choć imię
 * zgłaszającego stoi w samym zgłoszeniu i można je stamtąd wziąć.
 */

describe('podpis pod notatką w zgłoszeniu', () => {
  it('imię z notatki ma pierwszeństwo', () => {
    expect(podpisNotatki({ from: 'reporter', author: 'Marcin' }, { author: 'Adam' })).toBe(
      'Marcin',
    );
  });

  it('stara notatka zgłaszającego bierze imię ze zgłoszenia', () => {
    expect(podpisNotatki({ from: 'reporter' }, { author: 'Adam' })).toBe('Adam');
  });

  it('notatka zespołu podpisuje się Claude', () => {
    expect(podpisNotatki({ from: 'dev' }, { author: 'Adam' })).toBe('Claude');
  });

  it('zgłoszenie bez imienia zostaje przy generycznym podpisie', () => {
    expect(podpisNotatki({ from: 'reporter' }, { author: '' })).toBe('Zgłaszający');
  });
});
