import { buildDeck } from '../data/cards';
import type { CardCategory } from '../engine/types';
import type { GameContent } from '../firebase/validate';
import { categoryColorVar, categoryLabel, problemTypeLabel, slotLabel } from '../ui/components/categoryStyles';
import { Alert } from '../ui/controls/Alert';
import { Icon, type IconName } from '../ui/icons/Icon';

interface DeckOverviewProps {
  content: GameContent;
  /** Przejście do zakładki — skróty prowadzą tam, gdzie trzeba popracować. */
  onGoTo?: (tab: 'problems' | 'cards' | 'families' | 'rules' | 'test') => void;
}

interface Shortcut {
  tab: 'problems' | 'cards' | 'families' | 'rules' | 'test';
  icon: IconName;
  label: string;
  hint: string;
}

const SHORTCUTS: Shortcut[] = [
  { tab: 'problems', icon: 'clash', label: 'Popraw problem', hint: 'Historia, cel, ścianki' },
  { tab: 'cards', icon: 'clipboard', label: 'Dodaj kartę', hint: 'Kompetencje, talenty, mentorzy' },
  { tab: 'families', icon: 'palette', label: 'Nazwij rodziny', hint: 'Kolory i symbole' },
  { tab: 'test', icon: 'flask', label: 'Rozegraj partię', hint: 'Sprawdź, jak gra się zmieniła' },
];

const CATEGORIES: CardCategory[] = [
  'psychological', 'digital', 'social', 'talent', 'mentor', 'eter11', 'blackswan',
];

/**
 * Przegląd talii — statystyki i ostrzeżenia o balansie.
 *
 * Wyłapuje problemy, które inaczej wyszłyby dopiero przy stole: za mało kart
 * na liczbę graczy, problemy bez podpowiedzi, ścianki nie do domknięcia.
 */
export function DeckOverview({ content, onGoTo }: DeckOverviewProps) {
  const deck = buildDeck(content.cards);
  const { rules, problems, cards } = content;

  const maxPlayers = 4;
  const cardsDealt = rules.handSize * maxPlayers;
  // Każda runda to jedno dobranie na gracza; misja może trwać pełne rundy.
  const cardsPerGame = cardsDealt + rules.roundsPerMission * maxPlayers * rules.missionsPerGame;

  const warnings: string[] = [];

  if (deck.length < cardsDealt) {
    warnings.push(
      `Talia (${deck.length} kart) nie wystarcza nawet na rozdanie startowe dla ${maxPlayers} graczy (${cardsDealt} kart).`,
    );
  }

  if (problems.length < rules.missionsPerGame) {
    warnings.push(
      `Problemów (${problems.length}) jest mniej niż misji w grze (${rules.missionsPerGame}). Gra skończy się wcześniej.`,
    );
  }

  const missingHints = problems.filter((p) => p.slots.some((s) => !s.hint.trim()));
  if (missingHints.length > 0) {
    warnings.push(
      `Problemy bez podpowiedzi w ściankach: ${missingHints.map((p) => p.name).join(', ')}.`,
    );
  }

  // Ścianka wymaga kategorii ORAZ rodziny. Jeśli talia nie ma takiej karty,
  // problemu nie da się domknąć — to blokuje całą misję, więc ostrzegamy.
  const deadSlots = problems.flatMap((p) =>
    p.slots
      .filter(
        (s) => !cards.some((c) => c.category === s.key && c.family === s.family),
      )
      .map((s) => `${p.name} → ${slotLabel(s.key)} (${s.family})`),
  );
  if (deadSlots.length > 0) {
    warnings.push(
      `Ścianki bez ani jednej pasującej karty w talii: ${deadSlots.join(', ')}. Tych problemów nie da się rozwiązać.`,
    );
  }

  const drafts = [
    ...problems.filter((p) => p.draft).map((p) => `problem „${p.name}"`),
    ...cards.filter((c) => c.draft).map((c) => `karta „${c.name}"`),
  ];

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Przegląd talii</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Stan zawartości gry. Zmiany zapisujesz przyciskiem u góry — gracze
        zobaczą je po odświeżeniu strony.
      </p>

      {onGoTo && (
        <div className="eter-stagger mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.tab}
              type="button"
              onClick={() => onGoTo(shortcut.tab)}
              className="flex items-start gap-2.5 rounded-lg border border-edge bg-surface p-3 text-left transition hover:border-accent"
            >
              <span className="mt-0.5 text-accent">
                <Icon name={shortcut.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{shortcut.label}</span>
                <span className="block text-xs text-ink-dim">{shortcut.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4">
          <Alert tone="warning" title={`Do sprawdzenia (${warnings.length})`}>
            <ul className="list-inside list-disc space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      {warnings.length === 0 && (
        <div className="mt-4">
          <Alert tone="success">
            Zawartość jest spójna — każdą ściankę da się zamknąć kartą z talii.
          </Alert>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Kart w talii</span>
          <p className="mt-1 font-mono text-2xl font-bold text-accent">{deck.length}</p>
          <span className="text-xs text-ink-dim">
            unikalnych: {cards.length}; kompetencje, talenty i mentorzy są podwajani
          </span>
        </div>
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Problemów</span>
          <p className="mt-1 font-mono text-2xl font-bold text-accent">{problems.length}</p>
          <span className="text-xs text-ink-dim">misji w grze: {rules.missionsPerGame}</span>
        </div>
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Zapotrzebowanie</span>
          <p className="mt-1 font-mono text-2xl font-bold">{cardsPerGame}</p>
          <span className="text-xs text-ink-dim">
            maksymalnie przy 4 graczach; brakujące karty są dobierane ze stosu odrzuconych
          </span>
        </div>
      </div>

      <h3 className="eter-label mt-6">Karty według kategorii</h3>
      <div className="mt-2 space-y-1.5">
        {CATEGORIES.map((category) => {
          const count = cards.filter((c) => c.category === category).length;
          const share = cards.length > 0 ? (count / cards.length) * 100 : 0;
          return (
            <div key={category} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs">{categoryLabel(category)}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-edge">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${share}%`, background: categoryColorVar(category) }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs">{count}</span>
            </div>
          );
        })}
      </div>

      <h3 className="eter-label mt-6">Problemy według typu</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {(['action', 'thinking', 'cooperation', 'selfchange'] as const).map((type) => (
          <span
            key={type}
            className="rounded border border-edge px-3 py-1.5 text-xs"
            style={{ color: `var(--eter-type-${type})` }}
          >
            {problemTypeLabel(type)}: {problems.filter((p) => p.type === type).length}
          </span>
        ))}
      </div>

      <h3 className="eter-label mt-6">Karty pasujące do ścianek</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {(['mentor', 'talent', 'psychological', 'social', 'digital'] as const).map((slot) => (
          <span key={slot} className="rounded border border-edge px-3 py-1.5 text-xs">
            {slotLabel(slot)}: {cards.filter((c) => c.category === slot).length}
          </span>
        ))}
      </div>

      {drafts.length > 0 && (
        <div className="mt-6 rounded-lg border border-accent-2 bg-surface p-3">
          <h3 className="text-sm font-bold text-accent-2">
            Do weryfikacji merytorycznej ({drafts.length})
          </h3>
          <p className="mt-1 text-xs text-ink-dim">
            Te treści zostały dopisane technicznie i czekają na sprawdzenie przez zespół.
          </p>
          <p className="mt-2 text-xs">{drafts.join(' · ')}</p>
        </div>
      )}
    </section>
  );
}
