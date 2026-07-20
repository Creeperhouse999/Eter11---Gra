import type { RulesConfig } from '../engine/types';
import { Alert } from '../ui/controls/Alert';
import { NumberField } from '../ui/controls/Field';

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
        <div className="mt-3">
          <Alert tone="danger" title="Gry nie da się wygrać">
            Próg zwycięstwa ({rules.teamWinThreshold}) jest wyższy niż liczba misji (
            {rules.missionsPerGame}). Przy tych wartościach zapis zostanie odrzucony.
          </Alert>
        </div>
      )}

      <div className="eter-stagger mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="rounded-lg border border-edge bg-surface p-3">
            <NumberField
              label={field.label}
              value={rules[field.key]}
              min={field.min}
              max={field.max}
              hint={`${field.hint} Zakres ${field.min}–${field.max}.`}
              onChange={(value) => onChange({ ...rules, [field.key]: value })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
