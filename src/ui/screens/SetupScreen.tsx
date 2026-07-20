import { useState } from 'react';
import { ALL_CHARACTERS } from '../../data/characters';
import { DEFAULT_UI_TEXT, type UiText } from '../../data/uiText';
import type { Character } from '../../engine/types';
import { Button } from '../controls/Button';
import { Icon, type IconName } from '../icons/Icon';
import { hasSeenTutorial } from '../tutorial/useTutorial';
import type { PlayerSetup } from '../useGame';

interface SetupScreenProps {
  /** `tutorial` uruchamia grę z ETER11 prowadzącym krok po kroku. */
  onStart: (players: PlayerSetup[], tutorial: boolean) => void;
  characters?: Character[];
  text?: UiText;
}

interface Draft {
  name: string;
  characterId: string;
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

/**
 * Ekran startowy: imiona i postacie.
 *
 * Każdy gracz mieści się w jednym kafelku, a postacie są siatką ikon zamiast
 * listy z opisami — przy czterech graczach i siedmiu postaciach opisy
 * zamieniały ekran w kilka ekranów przewijania. Nazwa i cechy wybranej
 * postaci są pod siatką, a pozostałych w podpowiedzi pod kursorem.
 */
export function SetupScreen({
  onStart,
  characters = ALL_CHARACTERS,
  text = DEFAULT_UI_TEXT,
}: SetupScreenProps) {
  const seenTutorial = hasSeenTutorial();
  const [drafts, setDrafts] = useState<Draft[]>(() => [
    { name: '', characterId: characters[0].id },
    { name: '', characterId: characters[Math.min(3, characters.length - 1)].id },
  ]);

  const update = (index: number, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addPlayer = () => {
    if (drafts.length >= MAX_PLAYERS) return;
    // Nowy gracz dostaje postać, której nikt jeszcze nie wziął.
    const taken = new Set(drafts.map((d) => d.characterId));
    const free = characters.find((c) => !taken.has(c.id)) ?? characters[0];
    setDrafts((prev) => [...prev, { name: '', characterId: free.id }]);
  };

  const removePlayer = (index: number) => {
    if (drafts.length <= MIN_PLAYERS) return;
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const namesFilled = drafts.every((d) => d.name.trim().length > 0);

  const start = (tutorial: boolean) => {
    // Samouczek gra jedna osoba na ustawionym scenariuszu — nie wymaga
    // wpisywania imion ani wybierania postaci.
    if (tutorial) {
      onStart([], true);
      return;
    }

    if (!namesFilled) return;
    onStart(
      drafts.map((d, i) => ({
        id: `player-${i + 1}`,
        name: d.name.trim(),
        characterId: d.characterId,
      })),
      false,
    );
  };

  return (
    <main className="eter-fade-in relative mx-auto max-w-3xl px-4 py-8">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative">
        <span className="eter-label">Misja ratunkowa</span>
        <h1 className="font-display text-4xl font-bold tracking-tight text-accent sm:text-5xl">
          {text.gameTitle}
        </h1>
        <p className="font-display text-lg text-ink-dim">{text.gameSubtitle}</p>
      </header>

      {/* Samouczek przed ustawieniami: kto nie zna zasad, ma go pod ręką
          i nie musi najpierw wypełniać formularza. */}
      <button
        type="button"
        onClick={() => start(true)}
        className="eter-rise relative mt-6 flex w-full items-center gap-3 rounded-xl border-2 border-accent bg-surface p-4 text-left transition hover:bg-raised"
      >
        <span className="shrink-0 text-accent">
          <Icon name="spark" size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-accent">
            Naucz mnie grać
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-ink-dim">
            {seenTutorial
              ? 'Znasz zasady, ale możesz powtórzyć. Grasz sam, zajmie kilka minut.'
              : 'ETER11 poprowadzi Cię krok po kroku. Grasz sam, zajmie kilka minut.'}
          </span>
        </span>
        <span className="shrink-0 text-ink-dim">
          <Icon name="chevronDown" size={18} className="-rotate-90" />
        </span>
      </button>

      <div className="relative mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-edge" />
        <span className="eter-label">albo zagrajcie razem</span>
        <span className="h-px flex-1 bg-edge" />
      </div>

      <section className="relative mt-4 space-y-2" aria-label="Gracze">
        {drafts.map((draft, index) => {
          const chosen = characters.find((c) => c.id === draft.characterId);

          return (
            <div
              key={index}
              className="eter-rise rounded-xl border border-edge bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                <span className="eter-label w-[4.5rem] shrink-0">Gracz {index + 1}</span>

                <input
                  value={draft.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="Imię"
                  aria-label={`Imię gracza ${index + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-edge bg-bg px-3 py-2 text-ink placeholder:text-ink-dim/50 focus:border-accent focus:outline-none"
                />

                {drafts.length > MIN_PLAYERS && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    aria-label={`Usuń gracza ${index + 1}`}
                    className="shrink-0 text-danger"
                    onClick={() => removePlayer(index)}
                  />
                )}
              </div>

              {/* Postacie jako siatka ikon — mieszczą się w jednym rzędzie */}
              <div
                role="radiogroup"
                aria-label={`Postać gracza ${index + 1}`}
                className="mt-2 flex flex-wrap gap-1.5"
              >
                {characters.map((character) => {
                  const active = draft.characterId === character.id;
                  const takenBy = drafts.findIndex(
                    (d, i) => i !== index && d.characterId === character.id,
                  );

                  return (
                    <button
                      key={character.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={character.name}
                      title={`${character.name} — ${character.traits}${
                        takenBy >= 0 ? ` (wybrał gracz ${takenBy + 1})` : ''
                      }`}
                      onClick={() => update(index, { characterId: character.id })}
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-lg border transition',
                        active
                          ? 'border-accent bg-raised text-accent'
                          : 'border-edge text-ink-dim hover:border-ink-dim hover:text-ink',
                        // Ta sama postać u dwóch graczy jest dozwolona,
                        // ale warto to zaznaczyć.
                        takenBy >= 0 && !active ? 'opacity-40' : '',
                      ].join(' ')}
                    >
                      <Icon name={character.icon as IconName} size={20} />
                    </button>
                  );
                })}
              </div>

              {chosen && (
                <p className="mt-2 text-xs leading-snug text-ink-dim">
                  <span className="font-semibold text-ink">{chosen.name}</span> —{' '}
                  {chosen.traits}
                </p>
              )}
            </div>
          );
        })}

        {drafts.length < MAX_PLAYERS && (
          <Button icon="plus" size="sm" onClick={addPlayer} className="w-full">
            Dodaj gracza
          </Button>
        )}
      </section>

      <Button
        variant="primary"
        size="lg"
        icon="rocket"
        onClick={() => start(false)}
        disabled={!namesFilled}
        className="relative mt-4 w-full"
      >
        {text.setupStartButton}
      </Button>

      {!namesFilled && (
        <p className="relative mt-2 text-center text-xs text-ink-dim">
          {text.setupNamesHint}
        </p>
      )}

      <p className="relative mt-6 max-w-prose text-xs leading-relaxed text-ink-dim">
        {text.gameIntro}
      </p>
    </main>
  );
}
