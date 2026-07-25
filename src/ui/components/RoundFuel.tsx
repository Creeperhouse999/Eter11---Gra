interface RoundFuelProps {
  round: number;
  total: number;
}

/**
 * Licznik rund jako paliwo misji.
 *
 * Kreska na rundę, zużyte gasną. Dziecko widzi, ile czasu zostało, bez
 * czytania liczby; ostatnie dwie rundy świecą na czerwono.
 */
export function RoundFuel({ round, total }: RoundFuelProps) {
  const remaining = total - round + 1;

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="eter-label">Runda</span>
        {/* `key={round}`: przy nowej rundzie React montuje ten element od nowa,
            więc animacja podbicia odpala się przy każdej zmianie — dziecko
            widzi, że runda ruszyła, bez wpatrywania się w cyfrę. */}
        <span key={round} className="eter-bump font-mono text-sm font-bold">
          {round}/{total}
        </span>
      </div>
      <div
        // `flex-wrap`: liczba rund idzie z zasad (redaktor może ustawić do 30),
        // a rząd kresek po 20 px nie mieści się wtedy w kolumnie na telefonie
        // i wychodził poza ekran w bok. Zawijanie do kolejnych rzędów trzyma
        // wszystkie kreski w kadrze — tak samo jak pasek ścianek (MissionProgress).
        className="mt-1.5 flex flex-wrap gap-1"
        role="img"
        aria-label={`Runda ${round} z ${total}. Zostało ${remaining}.`}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className="eter-fuel-bar w-5"
            data-spent={index < round - 1}
            data-critical={index >= round - 1 && remaining <= 2}
          />
        ))}
      </div>
    </div>
  );
}
