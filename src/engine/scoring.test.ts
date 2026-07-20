import { describe, it, expect } from 'vitest';
import { awardTitles, hasFulfillment, fulfillmentProgress, playerScore } from './scoring';
import type { Card, Player, RulesConfig } from './types';

const card = (id: string, category: Card['category']): Card => ({
  id, name: id, category, description: '', icon: 'star',
});

const config: RulesConfig = {
  roundsPerMission: 7,
  handSize: 5,
  missionsPerGame: 7,
  teamWinThreshold: 5,
  maxMatCardsPerMission: 1,
  pointsPerExperience: 1,
  pointsPerFulfillment: 2,
};

/** Gracz spełniający wszystkie warunki spełnienia. */
const completePlayer = (): Player => ({
  id: 'p1',
  name: 'Ala',
  characterId: 'c1',
  hand: [],
  mat: [
    card('psy', 'psychological'),
    card('dig', 'digital'),
    card('soc', 'social'),
    card('tal', 'talent'),
    card('men', 'mentor'),
  ],
  receivedCardIds: ['soc'],
  sharedCount: 1,
  experience: [
    { id: 'e1', kind: 'solve' },
    { id: 'e2', kind: 'share' },
  ],
});

describe('hasFulfillment', () => {
  it('komplet warunków daje spełnienie', () => {
    expect(hasFulfillment(completePlayer())).toBe(true);
  });

  it('brak mentora blokuje spełnienie', () => {
    const p = completePlayer();
    p.mat = p.mat.filter((c) => c.category !== 'mentor');
    expect(hasFulfillment(p)).toBe(false);
  });

  it('brak talentu blokuje spełnienie', () => {
    const p = completePlayer();
    p.mat = p.mat.filter((c) => c.category !== 'talent');
    expect(hasFulfillment(p)).toBe(false);
  });

  it('brak karty otrzymanej od innego gracza blokuje spełnienie', () => {
    const p = completePlayer();
    p.receivedCardIds = [];
    expect(hasFulfillment(p)).toBe(false);
  });

  it('brak przekazania karty innym blokuje spełnienie', () => {
    const p = completePlayer();
    p.sharedCount = 0;
    expect(hasFulfillment(p)).toBe(false);
  });

  it('same karty za rozwiązanie nie wystarczą — trzeba karty za dzielenie się', () => {
    const p = completePlayer();
    p.experience = [
      { id: 'e1', kind: 'solve' },
      { id: 'e2', kind: 'solve' },
      { id: 'e3', kind: 'solve' },
    ];
    expect(hasFulfillment(p)).toBe(false);
  });
});

describe('fulfillmentProgress', () => {
  it('raportuje brakujące elementy', () => {
    const p = completePlayer();
    p.mat = p.mat.filter((c) => c.category !== 'digital');
    p.sharedCount = 0;
    const progress = fulfillmentProgress(p);
    expect(progress.digital).toBe(false);
    expect(progress.sharedWithOthers).toBe(false);
    expect(progress.psychological).toBe(true);
  });
});

describe('playerScore', () => {
  it('1 punkt za kartę doświadczenia, 2 za spełnienie', () => {
    // 2 karty doświadczenia + spełnienie = 2 + 2 = 4
    expect(playerScore(completePlayer(), config)).toBe(4);
  });

  it('bez spełnienia liczy tylko doświadczenie', () => {
    const p = completePlayer();
    p.sharedCount = 0; // traci spełnienie, zachowuje 2 karty doświadczenia
    expect(playerScore(p, config)).toBe(2);
  });
});

describe('awardTitles', () => {
  it('przyznaje tytuł graczowi z najwyższym wynikiem', () => {
    const a = completePlayer();
    const b: Player = { ...completePlayer(), id: 'p2', name: 'Bartek', sharedCount: 5 };
    const titles = awardTitles([a, b]);
    expect(titles['Mistrz Współpracy']).toEqual(['p2']);
  });

  it('przy remisie tytuł dostaje kilku graczy', () => {
    const a = completePlayer();
    const b: Player = { ...completePlayer(), id: 'p2', name: 'Bartek' };
    const titles = awardTitles([a, b]);
    expect(titles['Mistrz Współpracy']).toEqual(['p1', 'p2']);
  });

  it('nie przyznaje tytułu, gdy nikt nie ma punktów w kategorii', () => {
    const a: Player = { ...completePlayer(), sharedCount: 0 };
    const b: Player = { ...completePlayer(), id: 'p2', sharedCount: 0 };
    const titles = awardTitles([a, b]);
    expect(titles['Mistrz Współpracy']).toEqual([]);
  });
});
