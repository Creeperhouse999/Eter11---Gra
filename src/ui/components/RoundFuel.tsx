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
        <span className="font-mono text-sm font-bold">
          {round}/{total}
        </span>
      </div>
      <div
        className="mt-1.5 flex gap-1"
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
