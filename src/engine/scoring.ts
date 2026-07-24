import type { GameState, Player, RulesConfig } from './types';

export interface FulfillmentProgress {
  psychological: boolean;
  digital: boolean;
  social: boolean;
  talent: boolean;
  mentor: boolean;
  receivedFromOthers: boolean;
  sharedWithOthers: boolean;
  experienceSolve: boolean;
  experienceShare: boolean;
}

/**
 * Postęp gracza w kierunku spełnienia.
 * Warunek dotyczy DWÓCH RÓŻNYCH TYPÓW karty doświadczenia, nie ich liczby —
 * kartę za rozwiązanie dostają wszyscy przy każdej udanej misji, więc sama
 * liczba nie różnicowałaby graczy.
 */
export function fulfillmentProgress(player: Player): FulfillmentProgress {
  const has = (category: string) => player.mat.some((c) => c.category === category);
  return {
    psychological: has('psychological'),
    digital: has('digital'),
    social: has('social'),
    talent: has('talent'),
    mentor: has('mentor'),
    receivedFromOthers: player.receivedCardIds.length > 0,
    sharedWithOthers: player.sharedCount > 0,
    experienceSolve: player.experience.some((e) => e.kind === 'solve'),
    experienceShare: player.experience.some((e) => e.kind === 'share'),
  };
}

export function hasFulfillment(player: Player): boolean {
  return Object.values(fulfillmentProgress(player)).every(Boolean);
}

/**
 * Ile warunków spełnienia gracz ma, a ile ich w ogóle jest.
 *
 * `total` liczony z samego `FulfillmentProgress`, nie wpisany na sztywno:
 * spełnienie to WSZYSTKIE warunki (pięć kategorii plus otrzymanie i przekazanie
 * karty oraz dwa typy doświadczenia), nie same kategorie. Ekran finału mówił
 * „brakuje X z pięciu kategorii", licząc X ze wszystkich dziewięciu — więc przy
 * skompletowanych kategoriach, ale bez np. przekazania, potrafił napisać
 * „brakuje 2 z pięciu", co jest sprzeczne samo w sobie.
 */
export function fulfillmentCount(player: Player): { done: number; total: number } {
  const values = Object.values(fulfillmentProgress(player));
  return { done: values.filter(Boolean).length, total: values.length };
}

export function playerScore(player: Player, config: RulesConfig): number {
  const experiencePoints = player.experience.length * config.pointsPerExperience;
  const fulfillmentPoints = hasFulfillment(player) ? config.pointsPerFulfillment : 0;
  return experiencePoints + fulfillmentPoints;
}

export function teamResult(state: GameState): { solved: number; won: boolean } {
  const solved = state.solvedProblems.length;
  return { solved, won: solved >= state.config.teamWinThreshold };
}

/**
 * Tytuły końcowe. Każdy tytuł trafia do gracza z najwyższą wartością;
 * remis oznacza, że tytuł dostaje kilku graczy.
 */
export function awardTitles(players: Player[]): Record<string, string[]> {
  const titleFor = (
    label: string,
    value: (p: Player) => number,
  ): [string, string[]] => {
    const max = Math.max(...players.map(value));
    if (max === 0) return [label, []];
    return [label, players.filter((p) => value(p) === max).map((p) => p.id)];
  };

  return Object.fromEntries([
    titleFor('Mistrz Doświadczenia', (p) => p.experience.length),
    titleFor('Mistrz Rozwoju', (p) => p.mat.length),
    titleFor('Mistrz Współpracy', (p) => p.sharedCount),
    titleFor('Architekt Przyszłości', (p) => (hasFulfillment(p) ? 1 : 0)),
  ]);
}
