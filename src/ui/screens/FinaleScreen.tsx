import { useState } from 'react';
import {
  awardTitles,
  fulfillmentProgress,
  hasFulfillment,
  playerScore,
  teamResult,
} from '../../engine/scoring';
import type { Game } from '../useGame';

interface FinaleScreenProps {
  game: Game;
  onRestart: () => void;
}

const PROGRESS_LABELS: Record<string, string> = {
  psychological: 'Kompetencja psychologiczna',
  digital: 'Kompetencja cyfrowa',
  social: 'Kompetencja społeczna',
  talent: 'Talent',
  mentor: 'Mentor',
  receivedFromOthers: 'Karta od innego gracza',
  sharedWithOthers: 'Karta przekazana innym',
  experienceSolve: 'Doświadczenie za rozwiązanie',
  experienceShare: 'Doświadczenie za uczenie innych',
};

const JOB_EXAMPLES = [
  'RoboOgrodnik',
  'EkoBudowniczy',
  'Projektant Emocji AI',
  'Nauczyciel Robotów',
  'Strażnik Danych',
  'Architekt Dobrostanu',
  'Mediator Przyszłości',
];

/** Ekran końcowy: wynik drużynowy, wyniki indywidualne, zawody przyszłości. */
export function FinaleScreen({ game, onRestart }: FinaleScreenProps) {
  const { state } = game;
  const team = teamResult(state);
  const titles = awardTitles(state.players);
  const [jobs, setJobs] = useState<Record<string, string>>({});

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-10">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative">
        <span className="eter-label">Koniec gry</span>
        <h1 className="font-display text-4xl font-bold text-accent">Podsumowanie misji</h1>
      </header>

      <section
        className="relative mt-6 overflow-hidden rounded-xl border bg-surface"
        style={{ borderColor: team.won ? 'var(--eter-success)' : 'var(--eter-edge)' }}
      >
        <div
          aria-hidden="true"
          className="h-1"
          style={{ background: team.won ? 'var(--eter-success)' : 'var(--eter-edge)' }}
        />
        <div className="p-5">
          <h2 className="font-display text-2xl font-bold">
            {team.won ? 'Wygraliście wspólnie' : 'Świat wciąż czeka na Wasz powrót'}
          </h2>
          <p className="mt-2 text-sm">
            Rozwiązane problemy: <strong className="font-mono">{team.solved}</strong> z{' '}
            {state.config.missionsPerGame}.
            {!team.won && ' Możecie przegrać bitwę, ale nie wojnę.'}
          </p>
          {state.unsolvedProblems.length > 0 && (
            <p className="mt-2 text-xs text-ink-dim">
              Nierozwiązane: {state.unsolvedProblems.map((p) => p.name).join(', ')}
            </p>
          )}
        </div>
      </section>

      <section className="relative mt-6 space-y-4">
        <h2 className="font-display text-xl font-bold">Wyniki indywidualne</h2>
        {state.players.map((player) => {
          const progress = fulfillmentProgress(player);
          const playerTitles = Object.entries(titles)
            .filter(([, ids]) => ids.includes(player.id))
            .map(([title]) => title);

          return (
            <div key={player.id} className="rounded-xl border border-edge bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-bold">{player.name}</h3>
                <span className="font-mono text-2xl font-bold text-accent">
                  {playerScore(player, state.config)} pkt
                </span>
              </div>

              {hasFulfillment(player) && (
                <p className="mt-1 text-sm font-bold text-success">
                  Spełnienie osiągnięte — Twoja postać rozwinęła się w pełni.
                </p>
              )}

              {playerTitles.length > 0 && (
                <p className="mt-1 text-sm text-accent-2">{playerTitles.join(' · ')}</p>
              )}

              <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
                {Object.entries(progress).map(([key, done]) => (
                  <li key={key} className={done ? 'text-success' : 'text-ink-dim'}>
                    <span className="font-mono">{done ? '[x]' : '[ ]'}</span>{' '}
                    {PROGRESS_LABELS[key]}
                  </li>
                ))}
              </ul>

              <label className="mt-4 block">
                <span className="text-sm text-ink-dim">
                  Twój zawód przyszłości — połącz talent, kompetencję i problem,
                  który Cię zaciekawił
                </span>
                <input
                  value={jobs[player.id] ?? ''}
                  onChange={(e) => setJobs((prev) => ({ ...prev, [player.id]: e.target.value }))}
                  placeholder={JOB_EXAMPLES[state.players.indexOf(player) % JOB_EXAMPLES.length]}
                  className="mt-1 w-full rounded-lg border border-edge bg-bg px-3 py-2 text-ink placeholder:text-ink-dim/60"
                />
              </label>
            </div>
          );
        })}
      </section>

      <p className="relative mt-6 text-xs text-ink-dim">
        Przykłady zawodów przyszłości: {JOB_EXAMPLES.join(', ')}.
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="relative mt-8 rounded-lg bg-accent px-6 py-3 font-display font-bold text-bg"
      >
        Nowa gra
      </button>
    </main>
  );
}
