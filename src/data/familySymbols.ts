import type { FamilyId } from './families';

/**
 * Symbole rodzin — dla graczy, którzy nie rozróżniają kolorów.
 *
 * Adam: „wprowadź do każdej karty, która ma dany kolor, symbol w górnym
 * środkowym miejscu karty, aby osoby, które nie widzą kolorów, mogły rozpoznać
 * po symbolu ten kolor". Podał też, który symbol do którego koloru.
 *
 * To jest sprawa dostępności, nie ozdoba. Kolor rodziny NIESIE ZASADĘ GRY:
 * karta pasuje do ścianki tylko przy zgodnej rodzinie. Dziecko, które myli
 * czerwień z zielenią (a to najczęstsza postać daltonizmu, dotyczy około
 * jednego chłopca na dwunastu), bez symbolu nie ma jak zagrać samodzielnie —
 * musi pytać innych przy każdej karcie.
 *
 * Symbol jest CELOWO ten sam we wszystkich kategoriach, w odróżnieniu od ikon
 * rodzin (`Family.icon`), które są różne w każdej — czerwona psychologiczna ma
 * tarczę, czerwona społeczna pelerynę. Tamte opowiadają, czym rodzina jest;
 * ten mówi jedno: „to jest czerwona". Jedna rzecz do zapamiętania zamiast
 * dwudziestu.
 */

/** Nazwa ikony z zestawu albo `url:…` dla grafiki wgranej przez zespół. */
export type FamilySymbols = Record<FamilyId, string>;

/**
 * Domyślne symbole — dokładnie te, które wskazał Adam.
 *
 * Kształty różnią się SYLWETKĄ, nie detalem: koło, trójkąt, kwadrat i gwiazda
 * dają się rozpoznać nawet w rozmiarze znaczka na rogu karty i po wydrukowaniu
 * w skali szarości.
 */
export const DEFAULT_FAMILY_SYMBOLS: FamilySymbols = {
  red: 'circleShape',
  green: 'triangleUp',
  blue: 'squareShape',
  yellow: 'star',
};

/** Nazwy kształtów po polsku — do panelu i do legendy na wydruku. */
export const SYMBOL_LABELS: Record<string, string> = {
  circleShape: 'Koło',
  triangleUp: 'Trójkąt',
  squareShape: 'Kwadrat',
  star: 'Gwiazda',
  diamond: 'Romb',
  heart: 'Serce',
  bolt: 'Błyskawica',
  droplet: 'Kropla',
};

/** Kształty do wyboru w panelu — proste sylwetki, rozpoznawalne w miniaturze. */
export const SYMBOL_CHOICES = Object.keys(SYMBOL_LABELS);

/**
 * Symbol danej rodziny, z zapasem, gdy zespół go nie ustawił.
 *
 * Brak zapisanego zestawu (treść sprzed tej zmiany) czyta się jako domyślny —
 * inaczej karty zostałyby bez symboli u wszystkich, którzy nie wejdą do panelu.
 */
export function symbolRodziny(
  family: FamilyId,
  symbole?: Partial<FamilySymbols>,
): string {
  return symbole?.[family] || DEFAULT_FAMILY_SYMBOLS[family];
}
