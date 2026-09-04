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
export function czyMojaTura(state: GameState | undefined, uid: string): boolean {
  const aktywny = state?.players?.[state.activePlayerIndex];
  if (!aktywny) return false;
  return aktywny.id === uid;
}
