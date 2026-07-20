import { describe, it, expect } from 'vitest';
import {
  cardFitsSlot,
  requiredCountForSlot,
  isSlotFilled,
  isMissionSolved,
} from './rules';
import type { Card, MissionState, Problem, SlotKey } from './types';

const card = (id: string, category: Card['category']): Card => ({
  id,
  name: id,
  category,
  description: '',
  icon: 'star',
});

const problem: Problem = {
  id: 'p1',
  name: 'Test',
  story: '',
  antagonist: '',
  consequence: '',
  goal: '',
  type: 'action',
  icon: 'star',
  slots: [
    { key: 'psychological', hint: '', bonusCardIds: [] },
    { key: 'digital', hint: '', bonusCardIds: [] },
    { key: 'social', hint: '', bonusCardIds: [] },
    { key: 'mentorTalent', hint: '', bonusCardIds: [] },
  ],
};

const mission = (overrides: Partial<MissionState> = {}): MissionState => ({
  problems: [problem],
  played: [],
  round: 1,
  phase: 'playing',
  matUsedBy: [],
  activeBlackSwans: [],
  slotsFilledBeforeDoubling: [],
  takenToMat: [],
  sharedCardIds: [],
  ...overrides,
});

const play = (c: Card, slotKey: SlotKey) => ({
  card: c,
  playerId: 'pl1',
  slotKey,
  problemId: 'p1',
  fromMat: false,
});

describe('cardFitsSlot', () => {
  it('kompetencja psychologiczna pasuje do swojego slotu', () => {
    expect(cardFitsSlot(card('a', 'psychological'), 'psychological')).toBe(true);
  });

  it('kompetencja cyfrowa nie pasuje do slotu psychologicznego', () => {
    expect(cardFitsSlot(card('a', 'digital'), 'psychological')).toBe(false);
  });

  it('talent pasuje do slotu mentor/talent', () => {
    expect(cardFitsSlot(card('a', 'talent'), 'mentorTalent')).toBe(true);
  });

  it('mentor pasuje do slotu mentor/talent', () => {
    expect(cardFitsSlot(card('a', 'mentor'), 'mentorTalent')).toBe(true);
  });

  it('talent nie pasuje do slotu społecznego', () => {
    expect(cardFitsSlot(card('a', 'talent'), 'social')).toBe(false);
  });

  it('ETER11 pasuje do każdego slotu', () => {
    const eter = card('e', 'eter11');
    expect(cardFitsSlot(eter, 'psychological')).toBe(true);
    expect(cardFitsSlot(eter, 'digital')).toBe(true);
    expect(cardFitsSlot(eter, 'social')).toBe(true);
    expect(cardFitsSlot(eter, 'mentorTalent')).toBe(true);
  });

  it('Czarny Łabędź nie pasuje do żadnego slotu', () => {
    expect(cardFitsSlot(card('b', 'blackswan'), 'social')).toBe(false);
    expect(cardFitsSlot(card('b', 'blackswan'), 'mentorTalent')).toBe(false);
  });
});

describe('requiredCountForSlot', () => {
  it('domyślnie wymaga 1 karty', () => {
    expect(requiredCountForSlot(mission(), 'p1', 'social')).toBe(1);
  });

  it('po podwojeniu wymaga 2 kart', () => {
    const m = mission({ activeBlackSwans: ['doubleRequirements'] });
    expect(requiredCountForSlot(m, 'p1', 'social')).toBe(2);
  });

  it('slot zapełniony przed podwojeniem nadal wymaga 1 karty', () => {
    const m = mission({
      activeBlackSwans: ['doubleRequirements'],
      slotsFilledBeforeDoubling: ['p1:social'],
    });
    expect(requiredCountForSlot(m, 'p1', 'social')).toBe(1);
  });
});

describe('isSlotFilled', () => {
  it('slot z jedną pasującą kartą jest zapełniony', () => {
    const m = mission({ played: [play(card('a', 'social'), 'social')] });
    expect(isSlotFilled(m, 'p1', 'social')).toBe(true);
  });

  it('pusty slot nie jest zapełniony', () => {
    expect(isSlotFilled(mission(), 'p1', 'social')).toBe(false);
  });

  it('po podwojeniu jedna karta nie wystarcza', () => {
    const m = mission({
      activeBlackSwans: ['doubleRequirements'],
      played: [play(card('a', 'social'), 'social')],
    });
    expect(isSlotFilled(m, 'p1', 'social')).toBe(false);
  });

  it('po podwojeniu dwie karty zapełniają slot', () => {
    const m = mission({
      activeBlackSwans: ['doubleRequirements'],
      played: [
        play(card('a', 'social'), 'social'),
        play(card('b', 'social'), 'social'),
      ],
    });
    expect(isSlotFilled(m, 'p1', 'social')).toBe(true);
  });
});

describe('isMissionSolved', () => {
  const fullBoard = [
    play(card('a', 'psychological'), 'psychological'),
    play(card('b', 'digital'), 'digital'),
    play(card('c', 'social'), 'social'),
    play(card('d', 'mentor'), 'mentorTalent'),
  ];

  it('komplet 4 slotów rozwiązuje problem', () => {
    expect(isMissionSolved(mission({ played: fullBoard }))).toBe(true);
  });

  it('3 z 4 slotów nie rozwiązuje problemu', () => {
    expect(isMissionSolved(mission({ played: fullBoard.slice(0, 3) }))).toBe(false);
  });

  it('przy dwóch problemach oba muszą być rozwiązane', () => {
    const second: Problem = { ...problem, id: 'p2' };
    const m = mission({ problems: [problem, second], played: fullBoard });
    expect(isMissionSolved(m)).toBe(false);
  });

  it('oba problemy rozwiązane kończą misję sukcesem', () => {
    const second: Problem = { ...problem, id: 'p2' };
    const secondBoard = fullBoard.map((p) => ({ ...p, problemId: 'p2' }));
    const m = mission({
      problems: [problem, second],
      played: [...fullBoard, ...secondBoard],
    });
    expect(isMissionSolved(m)).toBe(true);
  });
});
