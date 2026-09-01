import { describe, it, expect } from 'vitest';
import { buildBoredomQueue } from './boredomQueue';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_FAMILIES } from '../data/families';
import { DEFAULT_THEME } from '../data/theme';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import { DEFAULT_CONFIG } from '../engine/reducer';
import type { GameContent } from '../firebase/validate';
import type { Report } from '../firebase/reports';

/**
 * Kolejka Strefy Nudy — co komu pokazujemy.
 *
 * Kolejka jest WSPÓLNA (rzecz odhaczona przez jedną osobę znika wszystkim),
 * ale nie każdy widzi to samo. Alan postawił sprawę wprost: Milena nie ma
 * potwierdzać za Marcina, że jego zgłoszenie działa, a rzeczy czekające na
 * akceptację widzą tylko admin i co-admin. Inaczej połowa zespołu klikałaby
 * w fiszki, przy których i tak dostanie odmowę z reguł bazy — a to gorsze niż
 * brak zakładki, bo wygląda jak usterka.
 */

const content = (): GameContent => ({
  cards: structuredClone(ALL_CARDS),
  problems: structuredClone(ALL_PROBLEMS),
  characters: structuredClone(ALL_CHARACTERS),
  rules: { ...DEFAULT_CONFIG },
  text: { ...DEFAULT_UI_TEXT },
  theme: { ...DEFAULT_THEME },
  families: structuredClone(DEFAULT_FAMILIES),
});

const report = (patch: Partial<Report>): Report => ({
  id: 'r1',
  kind: 'bug',
  title: 'Coś nie działa',
  description: 'opis',
  status: 'fixed',
  author: 'Marcin',
  createdAt: '2026-08-01T10:00:00.000Z',
  ...patch,
});

describe('buildBoredomQueue — kto co widzi', () => {
  it('do potwierdzenia trafia WŁASNE zgłoszenie, nie cudze', () => {
    const items = buildBoredomQueue({
      content: content(),
      reports: [report({ id: 'moje', author: 'Marcin' }), report({ id: 'cudze', author: 'Adam' })],
      role: 'coworker',
      author: 'Marcin',
      done: [],
    });

    const idki = items.map((i) => i.id);
    expect(idki).toContain('verify-moje');
    // Sedno: „czy działa" rozstrzyga ten, kto zgłaszał — tylko on wie, co miał
    // na myśli.
    expect(idki).not.toContain('verify-cudze');
  });

  it('zgłoszenia czekające na akceptację widzi moderator, nie każdy', () => {
    const czekajace = [report({ id: 'czeka', status: 'pending', author: 'Joanna' })];

    const uCoworkera = buildBoredomQueue({
      content: content(),
      reports: czekajace,
      role: 'coworker',
      author: 'Marcin',
      done: [],
    });
    const uModeratora = buildBoredomQueue({
      content: content(),
      reports: czekajace,
      role: 'co-admin',
      author: 'Adam',
      done: [],
    });

    expect(uCoworkera.map((i) => i.id)).not.toContain('pending-czeka');
    expect(uModeratora.map((i) => i.id)).toContain('pending-czeka');
  });

  it('karta robocza trafia do kolejki', () => {
    const tresc = content();
    tresc.cards[0].draft = true;

    const items = buildBoredomQueue({
      content: tresc,
      reports: [],
      role: 'coworker',
      author: 'Marcin',
      done: [],
    });

    expect(items.some((i) => i.id === `draft-card-${tresc.cards[0].id}`)).toBe(true);
  });

  it('rzecz odhaczona przez kogokolwiek znika wszystkim', () => {
    const tresc = content();
    tresc.cards[0].draft = true;
    const id = `draft-card-${tresc.cards[0].id}`;

    const items = buildBoredomQueue({
      content: tresc,
      reports: [],
      role: 'coworker',
      author: 'Marcin',
      // Odhaczył Adam — Marcin ma tego nie zobaczyć.
      done: [id],
    });

    expect(items.map((i) => i.id)).not.toContain(id);
  });

  it('blokady zapisu idą przed resztą — bez nich nikt nie wypuści zmian', () => {
    const tresc = content();
    tresc.cards[0].draft = true;
    // Zawartość nie do zapisania: próg wygranej wyższy niż liczba misji.
    tresc.rules.teamWinThreshold = 99;

    const items = buildBoredomQueue({
      content: tresc,
      reports: [],
      role: 'admin',
      author: 'Alan',
      done: [],
    });

    expect(items[0]?.kind).toBe('blocker');
  });

  it('puste pole problemu trafia do kolejki, ale dopiero po ważniejszych', () => {
    const tresc = content();
    const problem = tresc.problems.find((p) => !p.draft)!;
    problem.antagonist = '';

    const items = buildBoredomQueue({
      content: tresc,
      reports: [],
      role: 'coworker',
      author: 'Marcin',
      done: [],
    });

    const pusty = items.findIndex((i) => i.id === `empty-antagonist-${problem.id}`);
    expect(pusty).toBeGreaterThanOrEqual(0);
    // Puste pole nie blokuje niczego, więc nie może wypychać rzeczy pilnych.
    expect(items.slice(0, pusty).every((i) => i.kind !== 'empty')).toBe(true);
  });

  it('pusta kolejka, gdy nie ma czego sprawdzać', () => {
    // Wbudowana treść jest kompletna i przechodzi walidację.
    const items = buildBoredomQueue({
      content: content(),
      reports: [],
      role: 'coworker',
      author: 'Marcin',
      done: [],
    });

    expect(items.filter((i) => i.kind === 'blocker')).toHaveLength(0);
  });
});
