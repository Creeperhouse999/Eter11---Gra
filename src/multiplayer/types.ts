import type { Action, GameState } from '../engine/types';

/**
 * Model pokoju gry wieloosobowej.
 *
 * Stan gry (`GameState`) jest czystym JSON-em, a silnik czystym reduktorem
 * `(state, action) => result`, więc do sieci wystarczy synchronizować sam
 * stan i ostatnią akcję — każde urządzenie i tak liczy tak samo. Nie ma
 * „serwera": wspólny stan mieszka w bazie, a kolejność tur pilnuje reguła.
 */

/** Faza pokoju, niezależna od fazy samej rozgrywki. */
export type RoomPhase =
  | 'lobby' // Zbieramy graczy, host jeszcze nie zaczął.
  | 'playing' // Partia trwa.
  | 'finished'; // Gra dobiegła końca (finał).

/** Gracz w pokoju — to, co widzą inni. Ręka NIE jest tu jawna. */
export interface RoomPlayer {
  /** Ukryty identyfikator sesji (anonimowe auth). Klucz gracza. */
  uid: string;
  name: string;
  characterId: string;
  /** Czy gracz jest w tej chwili połączony (obecność w RTDB). */
  online: boolean;
  /** Czy kliknął „gotów" na ekranie zbiórki przed misją. */
  ready: boolean;
  /** Kolejność dołączenia — ustala porządek tur. */
  joinedAt: number;
}

/**
 * Gotowe reakcje zamiast czatu — bezpieczne dla dzieci, bez wpisywania.
 *
 * `daj-karte` niesie cel (uid gracza) i pokazuje mu prośbę; reszta to zwykłe
 * zawołania na wspólny widok.
 */
export type ReactionKind =
  | 'brawo'
  | 'daj-karte'
  | 'zrob-to'
  | 'twoja-kolej'
  | 'super'
  | 'dziekuje'
  | 'pomysl'
  | 'ojej'
  | 'czekam'
  | 'gramy';

/** Tekst i ikona każdej reakcji — jedno źródło dla przycisków i dymków. */
export const REACTIONS: Record<ReactionKind, { label: string; icon: string }> = {
  brawo: { label: 'Brawo!', icon: 'tick' },
  super: { label: 'Super!', icon: 'spark' },
  dziekuje: { label: 'Dziękuję!', icon: 'heart' },
  'daj-karte': { label: 'Daj mi kartę', icon: 'clipboard' },
  'zrob-to': { label: 'Zrób to', icon: 'bulb' },
  'twoja-kolej': { label: 'Twoja kolej!', icon: 'rocket' },
  pomysl: { label: 'Mam pomysł', icon: 'bulb' },
  ojej: { label: 'Ojej…', icon: 'swan' },
  czekam: { label: 'Czekam', icon: 'flag' },
  gramy: { label: 'Gramy?', icon: 'people' },
};

export interface Reaction {
  from: string; // uid nadawcy
  kind: ReactionKind;
  /** Czego dotyczy — np. uid gracza, którego prosimy o kartę. */
  target?: string;
  at: number;
}

/**
 * Prośba o przekazanie karty, czekająca na potwierdzenie biorącego.
 *
 * Przekazanie w grze przy stole jest natychmiastowe, ale online biorący
 * musi potwierdzić — inaczej nie wiadomo, czy w ogóle patrzy na ekran.
 */
export interface CardOffer {
  fromUid: string;
  toUid: string;
  cardId: string;
  at: number;
}

/**
 * Cały pokój, tak jak leży w bazie pod kluczem = kod pokoju.
 *
 * `state` jest wspólnym stanem gry — każdy ruch to zapis nowego stanu przez
 * gracza, którego jest kolej. `lastAction` służy tylko do pokazania „co się
 * właśnie stało" (np. animacja); rozstrzyga zawsze `state`.
 */
export interface Room {
  code: string;
  phase: RoomPhase;
  /** uid hosta — jedyny, kto może zacząć grę i wyrzucać. */
  hostUid: string;
  players: Record<string, RoomPlayer>;
  /** Stan gry. Null w lobby, zanim host zacznie. */
  state: GameState | null;
  lastAction: Action | null;
  /** Znacznik początku tury bieżącego gracza — do timeoutu rozłączenia. */
  turnStartedAt: number;
  reactions: Reaction[];
  offer: CardOffer | null;
  createdAt: number;
}
