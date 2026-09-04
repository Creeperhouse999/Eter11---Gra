import type { Character } from '../engine/types';

/** Karty postaci — gracz wybiera jedną na całą rozgrywkę. */
export const ALL_CHARACTERS: Character[] = [
  { id: 'ch-odkrywca', name: 'Dziecko Odkrywca', kind: 'child', icon: 'compass', traits: 'Zadaje pytania, na które dorośli nie znają odpowiedzi.' },
  { id: 'ch-artysta', name: 'Dziecko Artysta', kind: 'child', icon: 'brush', traits: 'Widzi rozwiązania tam, gdzie inni widzą tylko problem.' },
  { id: 'ch-wynalazca', name: 'Dziecko Wynalazca', kind: 'child', icon: 'bolt2', traits: 'Rozkłada wszystko na części i składa lepiej.' },
  { id: 'pa-organizator', name: 'Rodzic Organizator', kind: 'parent', icon: 'checklist', traits: 'Zamienia chaos w plan, który da się wykonać.' },
  { id: 'pa-opiekun', name: 'Rodzic Opiekun', kind: 'parent', icon: 'teapot', traits: 'Zauważa, że komuś jest źle — zanim ten ktoś to powie.' },
  { id: 'te-inspirator', name: 'Nauczyciel Inspirator', kind: 'teacher', icon: 'sparkle', traits: 'Sprawia, że chce się próbować jeszcze raz.' },
  { id: 'te-praktyk', name: 'Nauczyciel Praktyk', kind: 'teacher', icon: 'hammer', traits: 'Pokazuje, jak zrobić — nie tylko opowiada.' },
];

/**
 * Domyślne kolory kart postaci.
 *
 * Adam poprosił, żeby „każda postać miała inny kolor" — przy stole karty leżą
 * obok siebie i jednakowe wyglądają jak komplet, a nie jak „moja i twoja".
 *
 * Barwy są nasycone i wyraźnie różne od siebie, ale świadomie NIE pokrywają
 * się z kolorami rodzin (czerwony, niebieski, żółty, zielony): tamte niosą
 * zasadę gry, a przypadkowa zbieżność sugerowałaby, że postać też pasuje do
 * jakiejś ścianki.
 */
export const DOMYSLNY_KOLOR_POSTACI = [
  '#0d9488', // morski
  '#c2410c', // rdzawy
  '#7c3aed', // fioletowy
  '#be185d', // malinowy
  '#0369a1', // stalowy błękit
  '#4d7c0f', // oliwkowy
  '#a16207', // musztardowy
  '#9333ea', // ametyst
  '#0f766e', // butelkowy
  '#b91c1c', // ceglasty
];

/**
 * Kolor tej postaci: ustawiony w panelu albo domyślny z listy.
 *
 * Domyślny wybieramy po pozycji w zestawie postaci, a nie losowo — dzięki
 * temu ta sama postać ma zawsze ten sam kolor, także na wydruku zrobionym
 * innego dnia.
 */
export function kolorPostaci(
  character: { id: string; color?: string },
  wszystkie: Array<{ id: string }> = ALL_CHARACTERS,
): string {
  if (character.color) return character.color;

  const index = wszystkie.findIndex((c) => c.id === character.id);
  const pozycja = index >= 0 ? index : 0;
  return DOMYSLNY_KOLOR_POSTACI[pozycja % DOMYSLNY_KOLOR_POSTACI.length];
}
