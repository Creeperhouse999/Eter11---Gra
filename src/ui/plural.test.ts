import { describe, expect, it } from 'vitest';
import { counted, plural } from './plural';

// Rzeczownik testowy w trzech formach: 1 karta, 2 karty, 5 kart.
const forms = ['karta', 'karty', 'kart'] as const;
const p = (n: number) => plural(n, ...forms);

describe('plural — polska odmiana po liczbie', () => {
  it('1 bierze formę pojedynczą', () => {
    expect(p(1)).toBe('karta');
  });

  it('2–4 biorą formę „few"', () => {
    expect(p(2)).toBe('karty');
    expect(p(3)).toBe('karty');
    expect(p(4)).toBe('karty');
  });

  it('0 i 5–21 biorą formę „many"', () => {
    expect(p(0)).toBe('kart');
    expect(p(5)).toBe('kart');
    expect(p(11)).toBe('kart');
    // 21 kończy się na 1, ale nie jest równe 1 — dopełniacz mnogi, nie pojedyncza.
    expect(p(21)).toBe('kart');
  });

  it('wyjątek nastu: 12–14 biorą „many" mimo końcówki 2–4', () => {
    expect(p(12)).toBe('kart');
    expect(p(13)).toBe('kart');
    expect(p(14)).toBe('kart');
    // 11 też — końcówka 1, ale nie „karta".
    expect(p(11)).toBe('kart');
  });

  it('powrót do „few" po nastu: 22–24, 102–104', () => {
    expect(p(22)).toBe('karty');
    expect(p(23)).toBe('karty');
    expect(p(24)).toBe('karty');
    expect(p(102)).toBe('karty');
    // 112–114 znów wpadają w wyjątek nastu.
    expect(p(112)).toBe('kart');
    expect(p(113)).toBe('kart');
  });

  it('counted skleja liczbę z odmienioną formą', () => {
    expect(counted(1, ...forms)).toBe('1 karta');
    expect(counted(3, ...forms)).toBe('3 karty');
    expect(counted(13, ...forms)).toBe('13 kart');
    expect(counted(0, ...forms)).toBe('0 kart');
  });
});
