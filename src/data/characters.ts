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
