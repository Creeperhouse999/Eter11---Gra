import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  categoryLabel,
  getCustomIcons,
  setCategoryStyles,
  setCustomIcons,
  slotIcon,
  slotLabel,
  useContentStyleSync,
} from './categoryStyles';
import { DEFAULT_CATEGORIES } from '../../data/categories';

/**
 * Nazwy i ikony kategorii pochodzą z panelu redakcyjnego. Te testy pilnują,
 * że zmiana faktycznie dociera na ekran i że brak zapisu nie zostawia gracza
 * z pustą etykietą.
 */
describe('nazwy kategorii', () => {
  // Rejestr jest modułowy, więc test musi po sobie posprzątać — inaczej
  // podmieniona nazwa wyciekłaby do kolejnych plików testowych.
  afterEach(() => setCategoryStyles(undefined));

  it('domyślnie używa nazw wbudowanych', () => {
    expect(categoryLabel('psychological')).toBe('Supermoc Umysłu');
    expect(slotIcon('digital')).toBe('chip');
  });

  it('przyjmuje nazwę i ikonę z panelu', () => {
    setCategoryStyles({
      psychological: { label: 'Głowa', icon: 'bulb' },
    });

    expect(categoryLabel('psychological')).toBe('Głowa');
    expect(slotIcon('psychological')).toBe('bulb');
  });

  it('nietknięte kategorie zostają przy swoich nazwach', () => {
    setCategoryStyles({ psychological: { label: 'Głowa', icon: 'bulb' } });

    // Panel zapisuje tylko to, co zmieniono. Reszta musi przetrwać scalanie,
    // bo brakująca nazwa zostawiłaby na ściance puste miejsce.
    expect(categoryLabel('digital')).toBe(DEFAULT_CATEGORIES.digital.label);
    expect(slotIcon('social')).toBe(DEFAULT_CATEGORIES.social.icon);
  });

  it('ścianka nazywa się tak samo jak kategoria', () => {
    setCategoryStyles({ social: { label: 'Ludzie', icon: 'people' } });

    // Nazwy ścianek miały własną kopię, więc zmiana nazwy kategorii mijała je
    // bokiem i gracz widział dwie nazwy tej samej rzeczy.
    expect(slotLabel('social')).toBe('Ludzie');
    expect(slotLabel('social')).toBe(categoryLabel('social'));
  });

  it('karty specjalne też dają się przemianować', () => {
    setCategoryStyles({ blackswan: { label: 'Czarny Ptak', icon: 'swan' } });

    expect(categoryLabel('blackswan')).toBe('Czarny Ptak');
  });

  it('pusta nazwa z panelu wraca do wbudowanej (nie zostawia pustej etykiety)', () => {
    // Redaktor wyczyścił pole nazwy i zapisał. `?? ` nie łapie pustego stringa,
    // więc bez fixu ścianka/karta pokazywała puste miejsce.
    setCategoryStyles({ psychological: { label: '', icon: 'brain' } });
    expect(categoryLabel('psychological')).toBe(DEFAULT_CATEGORIES.psychological.label);

    setCategoryStyles({ social: { label: '   ', icon: 'people' } });
    expect(categoryLabel('social')).toBe(DEFAULT_CATEGORIES.social.label);
    // Ścianka dziedziczy tę samą, niepustą nazwę.
    expect(slotLabel('social')).toBe(DEFAULT_CATEGORIES.social.label);
  });
});

describe('useContentStyleSync', () => {
  afterEach(() => {
    setCategoryStyles(undefined);
    setCustomIcons(undefined);
  });

  it('odświeża własne ikony, gdy zmieniają się bez zmiany kategorii', () => {
    const { rerender } = renderHook(
      ({ categories, customIcons }) => useContentStyleSync(categories, customIcons),
      { initialProps: { categories: undefined, customIcons: [] as Array<{ name: string; url: string }> } },
    );
    expect(getCustomIcons()).toEqual([]);

    // Redaktor wgrywa ikonę: `customIcons` się zmienia, `categories` nie —
    // dokładnie tak, jak wygląda edycja w IconEditorze. Bez zależności od
    // `customIcons` w efekcie rejestr modułowy zostawał stary, a IconPicker
    // (który czyta go bezpośrednio, poza Reactem) nie widział nowej ikony.
    const uploaded = [{ name: 'nowa', url: 'https://x/nowa.png' }];
    rerender({ categories: undefined, customIcons: uploaded });

    expect(getCustomIcons()).toEqual(uploaded);
  });
});
