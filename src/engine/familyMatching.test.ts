import { describe, it, expect } from 'vitest';
import { cardFitsSlot, cardFitsProblemSlot } from './rules';
import { reduce } from './reducer';
import { giveCard, makeCard, newGame } from './testFixtures';
import type { Card, FamilyId, Problem } from './types';

const card = (category: Card['category'], family?: FamilyId): Card => ({
  id: `${category}-${family ?? 'none'}`,
  name: 'Karta',
  category,
  family,
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
  icon: 'earth',
  slots: [
    { key: 'psychological', family: 'red', hint: '' },
    { key: 'digital', family: 'blue', hint: '' },
    { key: 'social', family: 'yellow', hint: '' },
    { key: 'mentor', family: 'green', hint: '' },
    { key: 'talent', family: 'red', hint: '' },
  ],
};

describe('cardFitsSlot z rodziną', () => {
  it('karta właściwej kategorii i rodziny pasuje', () => {
    expect(cardFitsSlot(card('psychological', 'red'), 'psychological', 'red')).toBe(true);
  });

  it('karta właściwej kategorii, ale innej rodziny nie pasuje', () => {
    expect(cardFitsSlot(card('psychological', 'blue'), 'psychological', 'red')).toBe(false);
  });

  it('karta właściwej rodziny, ale innej kategorii nie pasuje', () => {
    expect(cardFitsSlot(card('digital', 'red'), 'psychological', 'red')).toBe(false);
  });

  it('ETER11 pasuje do każdej rodziny', () => {
    for (const family of ['red', 'blue', 'yellow', 'green'] as FamilyId[]) {
      expect(cardFitsSlot(card('eter11'), 'psychological', family)).toBe(true);
      expect(cardFitsSlot(card('eter11'), 'talent', family)).toBe(true);
    }
  });

  it('Czarny Łabędź nie pasuje nigdzie', () => {
    expect(cardFitsSlot(card('blackswan'), 'psychological', 'red')).toBe(false);
  });

  it('bez podanej rodziny sprawdzana jest sama kategoria', () => {
    expect(cardFitsSlot(card('psychological', 'blue'), 'psychological')).toBe(true);
  });

  it('mentor nie pasuje już do ścianki talentu', () => {
    expect(cardFitsSlot(card('mentor', 'red'), 'talent', 'red')).toBe(false);
    expect(cardFitsSlot(card('talent', 'red'), 'mentor', 'red')).toBe(false);
  });
});

describe('cardFitsProblemSlot', () => {
  it('czyta wymaganą rodzinę ze ścianki problemu', () => {
    expect(cardFitsProblemSlot(card('digital', 'blue'), problem, 'digital')).toBe(true);
    expect(cardFitsProblemSlot(card('digital', 'red'), problem, 'digital')).toBe(false);
  });

  it('nieznana ścianka nie przyjmuje żadnej karty', () => {
    expect(cardFitsProblemSlot(card('digital', 'blue'), problem, 'eter11' as never)).toBe(false);
  });
});

describe('reducer respektuje rodziny', () => {
  it('odrzuca kartę właściwej kategorii w złej rodzinie', () => {
    const started = reduce(newGame(), { type: 'START_MISSION' }).state;
    const problemId = started.mission!.problems[0].id;
    const slot = started.mission!.problems[0].slots[0];

    // Fixture tworzy karty w rodzinie 'red', a ścianka też wymaga 'red' —
    // dlatego wstrzykujemy kartę w innej rodzinie.
    const wrongFamily: FamilyId = slot.family === 'red' ? 'blue' : 'red';
    const injected: Card = { ...makeCard('zla-rodzina', slot.key), family: wrongFamily };
    const state = giveCard(started, 'p1', injected);

    const result = reduce(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardId: injected.id,
      slotKey: slot.key,
      problemId,
      fromMat: false,
    });

    expect(result.rejected).toContain('nie pasuje');
  });

  it('przyjmuje kartę we właściwej rodzinie', () => {
    const started = reduce(newGame(), { type: 'START_MISSION' }).state;
    const problemId = started.mission!.problems[0].id;
    const slot = started.mission!.problems[0].slots[0];

    const injected: Card = { ...makeCard('dobra-rodzina', slot.key), family: slot.family };
    const state = giveCard(started, 'p1', injected);

    const result = reduce(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardId: injected.id,
      slotKey: slot.key,
      problemId,
      fromMat: false,
    });

    expect(result.rejected).toBeUndefined();
    expect(result.state.mission?.played).toHaveLength(1);
  });

  it('ETER11 zapełnia ściankę niezależnie od rodziny', () => {
    const started = reduce(newGame(), { type: 'START_MISSION' }).state;
    const problemId = started.mission!.problems[0].id;
    const slot = started.mission!.problems[0].slots[1];

    const eter: Card = {
      id: 'eter-test',
      name: 'ETER11',
      category: 'eter11',
      description: '',
      icon: 'spark',
    };
    const state = giveCard(started, 'p1', eter);

    const result = reduce(state, {
      type: 'PLAY_CARD',
      playerId: 'p1',
      cardId: eter.id,
      slotKey: slot.key,
      problemId,
      fromMat: false,
    });

    expect(result.rejected).toBeUndefined();
  });
});
