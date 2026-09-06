import { describe, it, expect } from 'vitest';
import {
  CATEGORY_PRESETS,
  zastosujPreset,
  ktoryPreset,
} from './categoryPresets';
import { DEFAULT_CATEGORIES } from './categories';

/**
 * Alan: „dodaj presety, chyba o tym pisałem — te co są dziecięce, super
 * dziecięce i normalne, dodaj te jako presety".
 *
 * Gra idzie i do ośmiolatków, i do trzynastolatków, i do nauczycieli, którzy
 * chcą mówić językiem podstawy programowej. Zamiast przepisywać siedem pól za
 * każdym razem, zespół przełącza zestaw jednym kliknięciem.
 */

describe('zestawy nazw kategorii', () => {
  it('są trzy: normalne, dziecięce, super dziecięce', () => {
    expect(CATEGORY_PRESETS.map((p) => p.id)).toEqual([
      'normalne',
      'dzieciece',
      'super-dzieciece',
    ]);
  });

  it('każdy zestaw nazywa wszystkie kategorie', () => {
    const klucze = Object.keys(DEFAULT_CATEGORIES).sort();
    for (const preset of CATEGORY_PRESETS) {
      expect(Object.keys(preset.labels).sort(), preset.name).toEqual(klucze);
      for (const [klucz, nazwa] of Object.entries(preset.labels)) {
        expect(nazwa.trim(), `${preset.name}/${klucz}`).not.toBe('');
      }
    }
  });

  it('każdy zestaw mówi, dla kogo jest', () => {
    for (const preset of CATEGORY_PRESETS) {
      expect(preset.hint.length, preset.name).toBeGreaterThan(20);
    }
  });

  /**
   * Zestawy mają się realnie różnić językiem — trzy warianty brzmiące tak samo
   * byłyby trzema kliknięciami bez żadnego skutku.
   */
  it('zestawy różnią się między sobą nazwami głównych kategorii', () => {
    const glowne = ['psychological', 'digital', 'social'] as const;
    for (const klucz of glowne) {
      const nazwy = CATEGORY_PRESETS.map((p) => p.labels[klucz]);
      expect(new Set(nazwy).size, `wszystkie zestawy mają to samo dla ${klucz}`).toBe(
        nazwy.length,
      );
    }
  });

  it('„Normalne" używa języka szkolnego, „Super dziecięce" nie', () => {
    const normalne = CATEGORY_PRESETS.find((p) => p.id === 'normalne')!;
    const super_ = CATEGORY_PRESETS.find((p) => p.id === 'super-dzieciece')!;

    expect(normalne.labels.psychological.toLowerCase()).toContain('kompetencj');
    expect(super_.labels.psychological.toLowerCase()).not.toContain('kompetencj');
  });
});

describe('przełączanie zestawu', () => {
  it('zmienia nazwy, ale NIE rusza ikon', () => {
    const preset = CATEGORY_PRESETS.find((p) => p.id === 'normalne')!;
    const wynik = zastosujPreset(DEFAULT_CATEGORIES, preset);

    expect(wynik.psychological.label).toBe('Kompetencje psychologiczne');
    // Ikona należy do znaczenia, nie do języka — dzieci rozpoznają karty
    // właśnie po niej, więc przełączenie nazw nie może zmieniać wyglądu.
    expect(wynik.psychological.icon).toBe(DEFAULT_CATEGORIES.psychological.icon);
  });

  it('nie psuje pozostałych pól kategorii', () => {
    const preset = CATEGORY_PRESETS.find((p) => p.id === 'super-dzieciece')!;
    const wynik = zastosujPreset(DEFAULT_CATEGORIES, preset);
    for (const klucz of Object.keys(DEFAULT_CATEGORIES) as Array<
      keyof typeof DEFAULT_CATEGORIES
    >) {
      expect(wynik[klucz].icon, klucz).toBe(DEFAULT_CATEGORIES[klucz].icon);
    }
  });
});

describe('rozpoznanie włączonego zestawu', () => {
  it('wbudowane nazwy to zestaw „Dziecięce"', () => {
    expect(ktoryPreset(DEFAULT_CATEGORIES)?.id).toBe('dzieciece');
  });

  it('po przełączeniu rozpoznaje nowy zestaw', () => {
    const preset = CATEGORY_PRESETS.find((p) => p.id === 'normalne')!;
    expect(ktoryPreset(zastosujPreset(DEFAULT_CATEGORIES, preset))?.id).toBe('normalne');
  });

  /**
   * Ręczna zmiana jednej nazwy znaczy, że zespół chce czegoś własnego. Panel
   * ma wtedy nie podświetlać żadnego zestawu, zamiast twierdzić, że wybrany
   * jest ten, od którego zaczęto.
   */
  it('po ręcznej zmianie nie wskazuje żadnego zestawu', () => {
    const wlasne = {
      ...DEFAULT_CATEGORIES,
      psychological: { ...DEFAULT_CATEGORIES.psychological, label: 'Nasza nazwa' },
    };
    expect(ktoryPreset(wlasne)).toBeNull();
  });
});
