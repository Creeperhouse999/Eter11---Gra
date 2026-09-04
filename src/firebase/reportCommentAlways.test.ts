import { describe, it, expect } from 'vitest';
import { mozeDopisacUwage } from './reports';

/**
 * Zgłaszający musi móc dopisać uwagę zawsze, gdy sprawa jest w toku.
 *
 * Adam zgłosił: „w Twojej odpowiedzi na ten błąd nie mogę Ci odpowiedzieć,
 * nie mogę klikać »dalej nie działa«". Trafił na zgłoszenie ze statusem
 * `reopened` — odesłał je już raz do poprawki, chciał dołożyć zrzut, a formularz
 * uwagi pokazywał się TYLKO przy `fixed`.
 *
 * Skutek był podwójnie zły: zgłaszający nie mógł dosłać dowodu, a jedyną drogą
 * było czekanie, aż programista znów oznaczy „naprawione" — czyli rozmowa
 * o zgłoszeniu zależała od cudzego kliknięcia.
 */

describe('kiedy zgłaszający może dopisać uwagę', () => {
  it('może przy zgłoszeniu czekającym na sprawdzenie', () => {
    expect(mozeDopisacUwage('fixed')).toBe(true);
  });

  it('może przy zgłoszeniu, które już raz odesłał do poprawki', () => {
    // Dokładnie przypadek Adama: chce dołożyć zrzut do swojej uwagi.
    expect(mozeDopisacUwage('reopened')).toBe(true);
  });

  it('może przy zgłoszeniu czekającym na programistę', () => {
    // Doprecyzowanie („zapomniałem dodać, że dzieje się tylko na telefonie")
    // jest cenne właśnie zanim ktoś zacznie naprawiać.
    expect(mozeDopisacUwage('new')).toBe(true);
  });

  it('nie może przy zgłoszeniu zamkniętym', () => {
    // `done` i `dismissed` kończą sprawę. Dopisek pod zamkniętym zgłoszeniem
    // nikogo nie powiadomi i zginie — lepiej założyć nowe.
    expect(mozeDopisacUwage('done')).toBe(false);
    expect(mozeDopisacUwage('dismissed')).toBe(false);
  });

  it('nie może przy zgłoszeniu czekającym na akceptację', () => {
    // `pending` czeka na decyzję moderatora, nie na rozmowę.
    expect(mozeDopisacUwage('pending')).toBe(false);
  });
});
