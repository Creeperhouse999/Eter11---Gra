import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintManual } from './PrintManual';
import { BUILTIN_CONTENT } from '../data/builtinContent';

/**
 * Adam: „zrób jeszcze dostęp do edycji poprzez kliknięcie na daną stronę
 * w zakładce »Drukuj instrukcję«".
 *
 * Sedno jest w tym, że KAŻDA strona prowadzi do WŁAŚCIWEJ pod-zakładki.
 * Wiedza, że strona 5 bierze się z „Pytań graczy", a 2 z „Opisu na pudełko",
 * istniała dotąd wyłącznie w głowie autora panelu — a to właśnie ona jest tu
 * przekazywana użytkownikowi. Przycisk prowadzący nie tam, gdzie trzeba, jest
 * gorszy niż brak przycisku.
 */

describe('edycja treści z wydruku instrukcji', () => {
  it('każda strona prowadzi do swojej pod-zakładki', () => {
    const onEdit = vi.fn();
    render(<PrintManual content={BUILTIN_CONTENT} onEdit={onEdit} />);

    const przyciski = screen.getAllByRole('button', { name: 'Edytuj treść' });
    // Strony 1–5 i 7 mają źródło w treści; strona 6 (podsumowanie techniczne)
    // liczy się z danych gry, więc edytować w niej nie ma czego.
    expect(przyciski).toHaveLength(6);

    for (const [index, cel] of ['story', 'box', 'adults', 'rules', 'faq', 'handbook'].entries()) {
      onEdit.mockClear();
      przyciski[index].click();
      expect(onEdit, `strona ${index + 1}`).toHaveBeenCalledWith(cel);
    }
  });

  it('bez obsługi edycji przycisków nie ma — wydruk zostaje wydrukiem', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);
    expect(screen.queryAllByRole('button', { name: 'Edytuj treść' })).toHaveLength(0);
  });
});

/**
 * Adam: „to, co mamy, to instrukcja główna, a teraz potrzebujemy krótkiej
 * instrukcji, którą będzie miał każdy gracz przy sobie — skrót najważniejszych.
 * Zrób zakładkę »Zasady« pt. »Skrócona instrukcja«, zrób edytowalną wersję.
 * Zrób w »drukuj instrukcję« zakładkę do druku ze skróconą instrukcją".
 *
 * Instrukcja główna ma sześć stron i leży na środku stołu — w trakcie partii
 * nikt jej nie czyta, bo trzeba by ją komuś zabrać. Ta jedna kartka jest po to,
 * żeby każdy miał swoją.
 */
describe('skrócona instrukcja na wydruku', () => {
  it('jest osobną stroną, na końcu — drukuje się ją tyle razy, ilu graczy', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);
    const strony = screen.getAllByText(/^Strona \d+$/).map((el) => el.textContent);
    expect(strony[strony.length - 1]).toBe('Strona 7');
  });

  it('mówi wprost, co z nią zrobić', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);
    expect(screen.getByText(/po jednej kartce dla każdego gracza/i)).toBeTruthy();
  });

  it('numery stron idą po kolei, bez dziur i powtórzeń', () => {
    render(<PrintManual content={BUILTIN_CONTENT} />);
    const numery = screen
      .getAllByText(/^Strona \d+$/)
      .map((el) => Number(el.textContent!.replace('Strona ', '')));
    expect(numery).toEqual([...numery].sort((a, b) => a - b));
    expect(new Set(numery).size).toBe(numery.length);
  });
});
