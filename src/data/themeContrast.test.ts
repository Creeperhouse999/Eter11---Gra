import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, LIGHT_THEME, type ThemeColors } from './theme';

/**
 * Kolory rodzin, kategorii i typów NIOSĄ znaczenie i są malowane jako TEKST
 * oraz ikony na tle karty (`--eter-surface` / `--eter-raised`) — patrz
 * CardView (nazwa, etykieta, ikona), LearningSummary, MissionProgress,
 * ProblemCard. Muszą więc być czytelne w obu motywach.
 *
 * Regresja, którą to łapie: w trybie JASNYM żółć rodziny/kategorii/typu była
 * `#e8a800`, co na wyniesionym tle (#eef2f9) daje ~1.86:1 — żółte karty
 * i podpisy „Współpraca"/„Społeczna" były prawie nieczytelne, choć reszta
 * rodzin trzymała ~3:1+.
 *
 * Próg 3:1 (WCAG dla dużego/pogrubionego tekstu i elementów graficznych):
 * nazwa karty to pogrubiony `font-display`, a ikony to grafika. Żółć `#e8a800`
 * padała na tym progu z ogromnym zapasem; `#9a6b00` przechodzi.
 */

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Kolory motywu używane jako kolor TEKSTU/ikony na tle karty. */
const TEXT_ROLE_KEYS: Array<keyof ThemeColors> = [
  'familyRed',
  'familyBlue',
  'familyYellow',
  'familyGreen',
  'catPsychological',
  'catDigital',
  'catSocial',
  'catTalent',
  'catMentor',
  'catEter11',
  'catBlackswan',
  'typeAction',
  'typeThinking',
  'typeCooperation',
  'typeSelfchange',
];

const MIN_CONTRAST = 3;

describe.each([
  ['ciemny', DEFAULT_THEME],
  ['jasny', LIGHT_THEME],
])('kontrast kolorów niosących znaczenie — motyw %s', (_name, theme) => {
  it.each(TEXT_ROLE_KEYS)('%s czytelny na tle karty (surface i raised)', (key) => {
    const color = theme[key];
    expect(contrast(color, theme.surface)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(contrast(color, theme.raised)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
});

describe('sanity: żółć w trybie jasnym', () => {
  it('nowa żółć rodziny przechodzi próg, a stara #e8a800 by nie przeszła', () => {
    expect(contrast(LIGHT_THEME.familyYellow, LIGHT_THEME.raised)).toBeGreaterThanOrEqual(3);
    // Stara wartość — dowód, że test faktycznie łapał usterkę.
    expect(contrast('#e8a800', LIGHT_THEME.raised)).toBeLessThan(2);
  });
});
