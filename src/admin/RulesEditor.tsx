import type { RulesConfig } from '../engine/types';

interface RulesEditorProps {
  rules: RulesConfig;
  onChange: (rules: RulesConfig) => void;
}

interface Field {
  key: keyof RulesConfig;
  label: string;
  hint: string;
  min: number;
  max: number;
}

const FIELDS: Field[] = [
  { key: 'roundsPerMission', label: 'Rundy na misję', hint: 'Po tylu rundach problem wygrywa.', min: 1, max: 30 },
  { key: 'handSize', label: 'Kart na ręce', hint: 'Ile kart trzyma gracz.', min: 1, max: 12 },
  { key: 'missionsPerGame', label: 'Misji w grze', hint: 'Po tylu misjach gra się kończy.', min: 1, max: 20 },
  { key: 'teamWinThreshold', label: 'Próg zwycięstwa drużyny', hint: 'Tyle rozwiązanych problemów daje wspólną wygraną.', min: 1, max: 20 },
  { key: 'maxMatCardsPerMission', label: 'Kart z postaci na misję', hint: 'Ile kart ze swojej postaci gracz może użyć.', min: 0, max: 5 },
  { key: 'pointsPerExperience', label: 'Punkty za doświadczenie', hint: 'Punktacja końcowa.', min: 0, max: 10 },
  { key: 'pointsPerFulfillment', label: 'Punkty za spełnienie', hint: 'Punktacja końcowa.', min: 0, max: 20 },
];

export function RulesEditor({ rules, onChange }: RulesEditorProps) {
  // Ten sam warunek pilnuje walidacja przed zapisem — tutaj ostrzegamy od razu.
  const impossibleToWin = rules.teamWinThreshold > rules.missionsPerGame;

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Parametry zasad</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Zmiany obowiązują od następnej rozpoczętej gry.
      </p>

      {impossibleToWin && (
        <p role="alert" className="mt-3 rounded border border-danger bg-surface px-3 py-2 text-sm text-danger">
          Próg zwycięstwa ({rules.teamWinThreshold}) jest wyższy niż liczba misji (
          {rules.missionsPerGame}). Przy tych wartościach gry nie da się wygrać — zapis
          zostanie odrzucony.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className="block rounded-lg border border-edge bg-surface p-3 text-sm"
          >
            <span className="font-semibold">{field.label}</span>
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={rules[field.key]}
              onChange={(e) => onChange({ ...rules, [field.key]: Number(e.target.value) })}
              className="mt-1 w-full rounded border border-edge bg-bg px-2 py-1.5 font-mono text-ink"
            />
            <span className="mt-1 block text-xs text-ink-dim">{field.hint}</span>
            <span className="mt-0.5 block font-mono text-[10px] text-ink-dim">
              zakres {field.min}–{field.max}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
