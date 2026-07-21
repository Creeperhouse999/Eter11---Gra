/** Szerokość dymka samouczka. */
export const BUBBLE_WIDTH = 320;
/** Odstęp od krawędzi ekranu i od podświetlonego elementu. */
export const BUBBLE_GAP = 14;

export interface Placement {
  top: number;
  left: number;
}

/**
 * Gdzie postawić dymek ETER11, żeby nie zasłonił podświetlenia.
 *
 * Sprawdza cztery strony celu (pod, nad, z prawej, z lewej) i wybiera
 * pierwszą, na której dymek mieści się w oknie i nie nachodzi na cel.
 *
 * Kluczowe: pozycje kandydatów są sklampowane do ekranu ZANIM sprawdzimy
 * nachodzenie. Wcześniej kandydat wyglądał na dobry, po czym clamp przesuwał
 * go z powrotem na podświetlony element — dlatego dymek siadał na tym, co
 * miał tłumaczyć.
 *
 * Gdy żadna strona nie jest wolna (cel wypełnia większość ekranu), wybiera
 * róg zakrywający najmniejszy kawałek celu.
 */
export function pickPlacement(
  target: { top: number; left: number; right: number; bottom: number; width: number; height: number },
  height: number,
  vw: number,
  vh: number,
): Placement {
  const clampX = (x: number) => Math.min(Math.max(BUBBLE_GAP, x), vw - BUBBLE_WIDTH - BUBBLE_GAP);
  const clampY = (y: number) => Math.min(Math.max(BUBBLE_GAP, y), vh - height - BUBBLE_GAP);

  const centeredX = clampX(target.left + target.width / 2 - BUBBLE_WIDTH / 2);
  const centeredY = clampY(target.top + target.height / 2 - height / 2);

  const candidates: Placement[] = [
    { top: target.bottom + BUBBLE_GAP, left: centeredX },
    { top: target.top - height - BUBBLE_GAP, left: centeredX },
    { top: centeredY, left: target.right + BUBBLE_GAP },
    { top: centeredY, left: target.left - BUBBLE_WIDTH - BUBBLE_GAP },
  ];

  const onScreen = (p: Placement) =>
    p.top >= 0 && p.left >= 0 && p.top + height <= vh && p.left + BUBBLE_WIDTH <= vw;

  const overlapsTarget = (p: Placement) =>
    p.left < target.right &&
    p.left + BUBBLE_WIDTH > target.left &&
    p.top < target.bottom &&
    p.top + height > target.top;

  const chosen = candidates.find((c) => onScreen(c) && !overlapsTarget(c));
  if (chosen) return chosen;

  const corners: Placement[] = [
    { top: BUBBLE_GAP, left: BUBBLE_GAP },
    { top: BUBBLE_GAP, left: vw - BUBBLE_WIDTH - BUBBLE_GAP },
    { top: vh - height - BUBBLE_GAP, left: BUBBLE_GAP },
    { top: vh - height - BUBBLE_GAP, left: vw - BUBBLE_WIDTH - BUBBLE_GAP },
  ];

  const overlapArea = (p: Placement) => {
    const w = Math.min(p.left + BUBBLE_WIDTH, target.right) - Math.max(p.left, target.left);
    const h = Math.min(p.top + height, target.bottom) - Math.max(p.top, target.top);
    return w > 0 && h > 0 ? w * h : 0;
  };

  const best = corners.reduce((a, b) => (overlapArea(b) < overlapArea(a) ? b : a));

  // Na bardzo małym ekranie (niski telefon, otwarta klawiatura) dymek bywa
  // wyższy niż okno — wtedy dosuwamy go do lewego górnego rogu, żeby widać
  // było początek tekstu. Ucięty koniec jest lepszy niż ucięty początek.
  return {
    top: Math.max(0, Math.min(best.top, vh - height - BUBBLE_GAP)),
    left: Math.max(0, Math.min(best.left, vw - BUBBLE_WIDTH - BUBBLE_GAP)),
  };
}
