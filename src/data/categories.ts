import type { CardCategory, SlotKey } from '../engine/types';

/**
 * Nazwa i ikona kategorii kart.
 *
 * Klucze (`psychological`, `digital`…) są częścią silnika: na nich opiera się
 * dopasowanie karty do ścianki, więc zostają. Zmienia się to, co widzi gracz —
 * jak kategoria się nazywa i jaką ma ikonę.
 *
 * Kolory mieszkają osobno, w motywie (`theme.ts`), bo zakładka „Kolory”
 * pokazuje je razem z resztą palety — rozdzielanie ich zmuszałoby redaktora
 * do skakania między dwiema zakładkami przy jednej decyzji.
 */
export interface CategoryStyle {
  label: string;
  /** Nazwa ikony z zestawu albo `url:…` dla ikony wgranej przez zespół. */
  icon: string;
}

export type CategoryMap = Record<CardCategory, CategoryStyle>;

/**
 * Wartości wbudowane — punkt wyjścia dla panelu i zapas, gdy zawartość
 * z Firestore ich nie ma.
 *
 * ETER11 i Czarny Łabędź też tu są: nie są ściankami, ale mają nazwy
 * i ikony pokazywane graczowi, a redaktor ma prawo je zmienić.
 */
export const DEFAULT_CATEGORIES: CategoryMap = {
  // „Supermoce" zamiast nazw z podręcznika: gra jest dla dzieci 8–13 lat,
  // a „kompetencja psychologiczna" to słownik dla dorosłych. Adam wybrał ten
  // wariant w dyskusji „Dziecięce nazwy"; Talent i Mentor zostawił bez zmian,
  // bo oba są krótkie i zrozumiałe same z siebie.
  psychological: { label: 'Supermoc Umysłu', icon: 'brain' },
  digital: { label: 'Supermoc Technologii', icon: 'chip' },
  social: { label: 'Supermoc Ludzi', icon: 'handshake' },
  mentor: { label: 'Mentor', icon: 'compass' },
  talent: { label: 'Talent', icon: 'star' },
  eter11: { label: 'ETER11', icon: 'spark' },
  blackswan: { label: 'Czarny Łabędź', icon: 'swan' },
};

/**
 * Kolejność, w jakiej kategorie pokazują się graczowi.
 *
 * Osobno od mapy, bo obiekty w JavaScripcie nie gwarantują kolejności kluczy
 * po przejściu przez Firestore, a układ ścianek wokół problemu jest stały.
 */
// Typ `SlotKey`, nie `CardCategory`: ta lista to ścianki wokół problemu,
// a ETER11 i Czarny Łabędź do żadnej nie pasują.
export const CATEGORY_ORDER: SlotKey[] = [
  'psychological',
  'digital',
  'social',
  'mentor',
  'talent',
];
