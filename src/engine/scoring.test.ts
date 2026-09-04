import { describe, it, expect } from 'vitest';
import {
  awardTitles,
  hasFulfillment,
  fulfillmentProgress,
  fulfillmentCount,
  playerScore,
} from './scoring';
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
  specialCardCopies: 4,
  maxHandSize: 7,
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

describe('fulfillmentCount', () => {
  it('komplet to wszystkie warunki spełnione', () => {
    const { done, total } = fulfillmentCount(completePlayer());
    expect(done).toBe(total);
    expect(total).toBe(9); // pięć kategorii + otrzymanie + przekazanie + dwa doświadczenia
  });

  it('total liczy WSZYSTKIE warunki, nie tylko pięć kategorii', () => {
    // Regresja: ekran finału mówił „brakuje X z pięciu kategorii", licząc X
    // ze wszystkich dziewięciu warunków — więc brak zdarzał się > 5 albo przy
    // kompletnych kategoriach.
    const p = completePlayer();
    p.mat = []; // zero kategorii
    p.receivedCardIds = [];
    p.sharedCount = 0;
    p.experience = [];
    const { done, total } = fulfillmentCount(p);
    expect(done).toBe(0);
    expect(total).toBe(9);
  });

  it('komplet kategorii, brak przekazania — brak liczony z dziewięciu, nie z pięciu', () => {
    const p = completePlayer();
    p.sharedCount = 0; // wszystkie 5 kategorii są, brakuje 1 warunku niekategoryjnego
    const { done, total } = fulfillmentCount(p);
    expect(total - done, 'brakuje dokładnie jednego warunku').toBe(1);
    expect(total).toBe(9);
    // Tekst „brakuje 1 z pięciu kategorii" byłby kłamstwem — kategorie są komplet.
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
