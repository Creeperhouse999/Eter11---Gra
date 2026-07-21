// Test: P1 ma kartę A, P2 ma kartę B
// Test oczekuje: Po swapHands P1 dostaje B (ręka P2)

// Kod:
// hands[(index - 1 + hands.length) % hands.length]
// index=0: (0-1+2)%2 = 1 -> dostaje hands[1] -> rękę P2 (B)
// index=1: (1-1+2)%2 = 0 -> dostaje hands[0] -> rękę P1 (A)

// Zatem P0 dostaje rękę P1, P1 dostaje rękę P0
// Test: after.players[1].hand === p1Hand
// Test: after.players[1] dostaje p1Hand - ZGADZA SIĘ

// Dla 4 graczy:
// P0 dostaje P3 (wstecz)
// P1 dostaje P0 (wstecz) 
// P2 dostaje P1 (wstecz)
// P3 dostaje P2 (wstecz)

// To znaczy: 3→0→1→2→3 (wstecz przeciwko ruchowi wskazówek)

// Test komentarz: "zgodnie z ruchem wskazówek zegara"
// Ale jeśli gracze siedzą: P0 (top) P1 (right) P2 (bottom) P3 (left)
// Ruch wskazówek: 0→1→2→3→0
// Ręka wędruje: 3→0→1→2→3 (WSTECZ)

// ALBO gracze siedzą inaczej? Sprawdzić fizyczną grę.
