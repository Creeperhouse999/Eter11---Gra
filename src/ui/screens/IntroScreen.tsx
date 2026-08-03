import { useEffect, useRef, useState } from 'react';
import {
  INTRO_STORY,
  INTRO_RULES,
  INTRO_FOR_ADULTS,
  type IntroContent,
  type IntroScene,
} from '../../data/intro';
import { Button } from '../controls/Button';
import { Icon, type IconName } from '../icons/Icon';

interface IntroScreenProps {
  /** Gracz obejrzał wstęp i chce zacząć. */
  onDone: () => void;
  /** Wstęp da się pominąć w każdej chwili — nie każdy czyta go raz drugi. */
  onSkip: () => void;
  /**
   * Sceny z panelu redakcyjnego. Brak = teksty wbudowane w kod.
   *
   * Zapas jest istotny: zawartość zapisana przed dodaniem wstępu nie ma
   * tego pola, a pusty ekran powitalny byłby gorszy niż tekst domyślny.
   */
  intro?: IntroContent;
}

type Tab = 'story' | 'rules' | 'adults';

const TABS: Array<{ id: Tab; label: string; icon: IconName; hint: string }> = [
  { id: 'story', label: 'Historia', icon: 'spark', hint: 'Po co tu jesteś' },
  { id: 'rules', label: 'Zasady', icon: 'clipboard', hint: 'Jak się gra' },
  { id: 'adults', label: 'Dla dorosłych', icon: 'sage', hint: 'Rodzice i nauczyciele' },
];

const BUILTIN: Record<Tab, IntroScene[]> = {
  story: INTRO_STORY,
  rules: INTRO_RULES,
  adults: INTRO_FOR_ADULTS,
};

/**
 * Wstęp przed grą: historia, zasady i wersja dla dorosłych.
 *
 * Historia jest podzielona na sceny pokazywane po jednej. Ściana tekstu
 * zniechęca ośmiolatka, a klikanie „dalej" nadaje rytm i pozwala mu
 * kontrolować tempo — to ta sama zasada, co w dymkach samouczka.
 *
 * Zasady i wersja dla dorosłych są listami: tam czytelnik szuka
 * konkretnej informacji, a nie przeżycia, więc przewijanie jest lepsze
 * od przeklikiwania.
 */
export function IntroScreen({ onDone, onSkip, intro }: IntroScreenProps) {
  const [tab, setTab] = useState<Tab>('story');
  const [scene, setScene] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Pusta lista scen z panelu też liczy się jako brak — redaktor mógł
  // wyczyścić jedną część wstępu, a wtedy pokazujemy wersję wbudowaną
  // zamiast pustki.
  const scenes = intro?.[tab]?.length ? intro[tab] : BUILTIN[tab];
  const current = scenes[Math.min(scene, scenes.length - 1)];
  const storyMode = tab === 'story';
  const last = scene >= scenes.length - 1;

  // Zmiana sceny przenosi uwagę czytnika ekranu na nowy nagłówek —
  // inaczej osoba niewidoma nie wie, że treść się zmieniła.
  useEffect(() => {
    if (storyMode) headingRef.current?.focus();
  }, [scene, storyMode]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setScene(0);
  };

  return (
    <main className="eter-fade-in relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <header className="relative flex items-baseline justify-between gap-3">
        <div>
          <span className="eter-label">Zanim zaczniecie</span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-accent">
            ETER11
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Pomiń wstęp
        </Button>
      </header>

      <nav className="relative mt-4 flex gap-1.5" aria-label="Części wstępu">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={[
                // min-h-11 (44px): na telefonie podpowiedź pod nazwą jest ukryta
                // (sm:block), więc bez tego tab miał ~36px — poniżej minimum celu
                // dotyku dla dziecka, a to główna interakcja tego ekranu.
                'flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left transition',
                active
                  ? 'border-accent bg-raised'
                  : 'border-edge bg-surface hover:border-ink-dim',
              ].join(' ')}
            >
              <span className={active ? 'text-accent' : 'text-ink-dim'}>
                <Icon name={item.icon} size={16} />
              </span>
              <span className="min-w-0">
                <span
                  className={[
                    'block truncate text-sm font-semibold',
                    active ? 'text-accent' : '',
                  ].join(' ')}
                >
                  {item.label}
                </span>
                <span className="hidden truncate text-[11px] text-ink-dim sm:block">
                  {item.hint}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {storyMode ? (
        <section
          className="relative mt-5 flex flex-1 flex-col"
          aria-label="Historia"
        >
          <article
            key={scene}
            className="eter-fade-in flex flex-1 flex-col rounded-xl border border-edge bg-surface p-5"
          >
            <span className="text-accent">
              <Icon name={current.icon as IconName} size={28} />
            </span>

            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-3 font-display text-xl font-bold leading-tight outline-none sm:text-2xl"
              style={{ overflowWrap: 'anywhere' }}
            >
              {current.heading}
            </h2>

            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-dim">
              {current.body.split('\n\n').map((paragraph, index) => (
                <p key={index} style={{ overflowWrap: 'anywhere' }}>
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-auto pt-5">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {scenes.map((_, index) => (
                  <span
                    key={index}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      background:
                        index <= scene ? 'var(--eter-accent)' : 'var(--eter-edge)',
                    }}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScene((n) => Math.max(0, n - 1))}
                  disabled={scene === 0}
                >
                  Wstecz
                </Button>

                <span className="font-mono text-[11px] text-ink-dim">
                  {scene + 1} / {scenes.length}
                </span>

                {last ? (
                  <Button variant="primary" size="sm" onClick={onDone}>
                    Zaczynamy
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setScene((n) => n + 1)}>
                    Dalej
                  </Button>
                )}
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section className="relative mt-5 flex-1" aria-label={tab === 'rules' ? 'Zasady' : 'Dla dorosłych'}>
          <ul className="eter-stagger space-y-2.5">
            {scenes.map((item) => (
              <li
                key={item.heading}
                className="eter-rise rounded-xl border border-edge bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-accent">
                    <Icon name={item.icon as IconName} size={20} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display font-bold" style={{ overflowWrap: 'anywhere' }}>
                      {item.heading}
                    </h2>
                    <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-ink-dim">
                      {item.body.split('\n\n').map((paragraph, index) => (
                        <p key={index} style={{ overflowWrap: 'anywhere' }}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={onDone}>
              Zaczynamy
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
