import type { GameState } from '../engine/types';

/**
 * Czy to MOJA tura — liczone z tego samego źródła, z którego ekran misji bierze
 * aktywnego gracza.
 *
 * `useRoom` liczy turę z `playersInOrder(room)` — listy graczy POKOJU, sortowanej
 * po czasie dołączenia. `MissionScreen` bierze aktywnego z `state.players`
 * silnika, zamrożonej w chwili startu partii. Zwykle to ta sama kolejność, bo
 * stan gry powstaje właśnie z `playersInOrder`. Ale nie zawsze: gdy ktoś opuści
 * pokój, wpis znika z `room.players`, a `state.players` zostaje bez zmian —
 * i od tej chwili ten sam `activePlayerIndex` wskazuje w każdej z list KOGO
 * INNEGO.
 *
 * Rozjazd był nieszkodliwy, dopóki ekran nie blokował ruchów: gracz klikał,
 * a zapis i tak sprawdzał turę po swojemu. Odkąd blokujemy karty na ekranie,
 * rozjazd znaczy „aktywny gracz nie może zagrać" — czyli partia stoi. Adam
 * zgłosił to natychmiast: „gracz 1 nie może dodać karty do problemu pomimo,
 * że pasuje".
 *
 * Dlatego blokadę liczymy z `state.players` — tak jak `MissionScreen` liczy,
 * czyją rękę pokazuje i w czyim imieniu wysyła ruch.
 */
/**
 * Uid aktywnego gracza wg `state.players` — TO SAMO źródło, którego używa
 * `czyMojaTura` i `MissionScreen`. `useRoom` miał WŁASNE, drugie liczenie tego
 * samego pytania z `playersInOrder(room)` (kolejność POKOJU) — dokładnie ten
 * rozjazd, który wyżej opisuje komentarz przy `czyMojaTura`. Skutek: ekran
 * poprawnie ODBLOKOWAŁ kartę aktywnemu graczowi (liczy z `state.players`), ale
 * `useRoom.dispatch` i tak odrzucał zapis („To nie Twoja kolej") — liczył
 * z kolejności pokoju, która po odejściu gracza wskazywała już kogoś innego.
 * Jedna poprawka nie mogła tego złapać, bo obie strony (odblokowanie w UI
 * i zapis do bazy) miały osobne, rozjeżdżające się implementacje tego samego
 * pytania. Ten helper jest teraz jedynym źródłem dla obu.
 */
export function aktywnyUid(state: GameState | null | undefined): string | undefined {
  return state?.players?.[state.activePlayerIndex]?.id;
}

export function czyMojaTura(state: GameState | null | undefined, uid: string): boolean {
  return aktywnyUid(state) === uid;
}
