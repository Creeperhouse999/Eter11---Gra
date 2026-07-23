/** Preferowana szerokość dymka samouczka. */
export const BUBBLE_WIDTH = 320;

/** Odstęp od krawędzi ekranu i od podświetlonego elementu. */
export const BUBBLE_GAP = 14;

/**
 * Szerokość, którą dymek naprawdę zajmie na tym ekranie.
 *
 * Na wąskim telefonie 320 px z marginesami nie mieści się w oknie, a element
 * i tak jest ścinany CSS-em (`max-w`). Pozycję trzeba liczyć z realnej
 * szerokości — inaczej wyliczenia mówią „mieści się", a przycisk „Dalej"
 * ląduje poza krawędzią i samouczka nie da się przejść.
 */
export function bubbleWidth(vw: number): number {
  // `Math.max(1, …)`: na absurdalnie wąskim oknie (vw < 2*GAP) różnica byłaby
  // ujemna i psuła obliczenia pozycji. Realne ekrany tego nie osiągają, ale
  // niech funkcja nigdy nie zwraca szerokości ≤ 0.
  return Math.min(BUBBLE_WIDTH, Math.max(1, vw - BUBBLE_GAP * 2));
}

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
export interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export function pickPlacement(
  target: Box,
  height: number,
  vw: number,
  vh: number,
  /**
   * Obszary, których dymek ma nie zasłaniać, choć nie są podświetlone —
   * przede wszystkim ręka z kartami. Gracz sięga po nie na każdym kroku,
   * więc dymek stojący na nich blokuje ruch, mimo że „nie nachodzi na cel".
   */
  avoid: Box[] = [],
): Placement {
  const width = bubbleWidth(vw);
  const clampX = (x: number) => Math.min(Math.max(BUBBLE_GAP, x), vw - width - BUBBLE_GAP);
  const clampY = (y: number) => Math.min(Math.max(BUBBLE_GAP, y), vh - height - BUBBLE_GAP);

  const centeredX = clampX(target.left + target.width / 2 - width / 2);
  const centeredY = clampY(target.top + target.height / 2 - height / 2);

  const candidates: Placement[] = [
    { top: target.bottom + BUBBLE_GAP, left: centeredX },
    { top: target.top - height - BUBBLE_GAP, left: centeredX },
    { top: centeredY, left: target.right + BUBBLE_GAP },
    { top: centeredY, left: target.left - width - BUBBLE_GAP },
  ];

  const onScreen = (p: Placement) =>
    p.top >= 0 && p.left >= 0 && p.top + height <= vh && p.left + width <= vw;

  const hits = (p: Placement, box: Box) =>
    p.left < box.right &&
    p.left + width > box.left &&
    p.top < box.bottom &&
    p.top + height > box.top;

  const overlapsTarget = (p: Placement) => hits(p, target);
  const overlapsAvoided = (p: Placement) => avoid.some((box) => hits(p, box));

  // Najpierw miejsce wolne od wszystkiego: ani podświetlenia, ani ręki.
  const chosen = candidates.find(
    (c) => onScreen(c) && !overlapsTarget(c) && !overlapsAvoided(c),
  );
  if (chosen) return chosen;

  // Gdy takiego nie ma, ustępuje ręka — podświetlenie musi zostać widoczne,
  // bo to na nie ETER11 właśnie wskazuje.
  const fallback = candidates.find((c) => onScreen(c) && !overlapsTarget(c));
  if (fallback) return fallback;

  const corners: Placement[] = [
    { top: BUBBLE_GAP, left: BUBBLE_GAP },
    { top: BUBBLE_GAP, left: vw - width - BUBBLE_GAP },
    { top: vh - height - BUBBLE_GAP, left: BUBBLE_GAP },
    { top: vh - height - BUBBLE_GAP, left: vw - width - BUBBLE_GAP },
  ];

  const areaOver = (p: Placement, box: Box) => {
    const w = Math.min(p.left + width, box.right) - Math.max(p.left, box.left);
    const h = Math.min(p.top + height, box.bottom) - Math.max(p.top, box.top);
    return w > 0 && h > 0 ? w * h : 0;
  };

  /**
   * Koszt rogu: ile zakryje. Podświetlenie liczy się podwójnie — zasłonić
   * to, co ETER11 właśnie pokazuje, jest gorsze niż zasłonić rękę.
   */
  const cost = (p: Placement) =>
    areaOver(p, target) * 2 + avoid.reduce((sum, box) => sum + areaOver(p, box), 0);

  const best = corners.reduce((a, b) => (cost(b) < cost(a) ? b : a));

  // Na bardzo małym ekranie (niski telefon, otwarta klawiatura) dymek bywa
  // wyższy niż okno — wtedy dosuwamy go do lewego górnego rogu, żeby widać
  // było początek tekstu. Ucięty koniec jest lepszy niż ucięty początek.
  return {
    top: Math.max(0, Math.min(best.top, vh - height - BUBBLE_GAP)),
    left: Math.max(0, Math.min(best.left, vw - width - BUBBLE_GAP)),
  };
}
