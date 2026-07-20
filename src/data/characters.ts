import type { Character } from '../engine/types';

/** Karty postaci — gracz wybiera jedną na całą rozgrywkę. */
export const ALL_CHARACTERS: Character[] = [
  { id: 'ch-odkrywca', name: 'Dziecko Odkrywca', kind: 'child', art: '🧭', traits: 'Zadaje pytania, na które dorośli nie znają odpowiedzi.' },
  { id: 'ch-artysta', name: 'Dziecko Artysta', kind: 'child', art: '🎨', traits: 'Widzi rozwiązania tam, gdzie inni widzą tylko problem.' },
  { id: 'ch-wynalazca', name: 'Dziecko Wynalazca', kind: 'child', art: '🔩', traits: 'Rozkłada wszystko na części i składa lepiej.' },
  { id: 'pa-organizator', name: 'Rodzic Organizator', kind: 'parent', art: '📋', traits: 'Zamienia chaos w plan, który da się wykonać.' },
  { id: 'pa-opiekun', name: 'Rodzic Opiekun', kind: 'parent', art: '🫖', traits: 'Zauważa, że komuś jest źle — zanim ten ktoś to powie.' },
  { id: 'te-inspirator', name: 'Nauczyciel Inspirator', kind: 'teacher', art: '🌟', traits: 'Sprawia, że chce się próbować jeszcze raz.' },
  { id: 'te-praktyk', name: 'Nauczyciel Praktyk', kind: 'teacher', art: '🔨', traits: 'Pokazuje, jak zrobić — nie tylko opowiada.' },
];
