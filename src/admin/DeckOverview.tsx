import { buildDeck } from '../data/cards';
import type { CardCategory } from '../engine/types';
import type { GameContent } from '../firebase/validate';
import { categoryColorVar, categoryLabel, problemTypeLabel, slotLabel } from '../ui/components/categoryStyles';

interface DeckOverviewProps {
  content: GameContent;
}

const CATEGORIES: CardCategory[] = [
  'psychological', 'digital', 'social', 'talent', 'mentor', 'eter11', 'blackswan',
];

/**
 * Przegląd talii — statystyki i ostrzeżenia o balansie.
 *
 * Wyłapuje problemy, które inaczej wyszłyby dopiero przy stole: za mało kart
 * na liczbę graczy, problemy bez podpowiedzi, karty nieużywane jako bonus.
 */
export function DeckOverview({ content }: DeckOverviewProps) {
  const deck = buildDeck(content.cards);
  const { rules, problems, cards } = content;

  const maxPlayers = 4;
  const cardsDealt = rules.handSize * maxPlayers;
  // Każda runda to jedno dobranie na gracza; misja może trwać pełne rundy.
  const cardsPerGame = cardsDealt + rules.roundsPerMission * maxPlayers * rules.missionsPerGame;

  const bonusIds = new Set(
    problems.flatMap((p) => p.slots.flatMap((s) => s.bonusCardIds)),
  );

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

  const noBonus = problems.filter((p) => p.slots.every((s) => s.bonusCardIds.length === 0));
  if (noBonus.length > 0) {
    warnings.push(
      `Problemy bez żadnej karty bonusowej: ${noBonus.map((p) => p.name).join(', ')}. Gracze nie mają jak zdobyć dodatkowego doświadczenia.`,
    );
  }

  const drafts = [
    ...problems.filter((p) => p.draft).map((p) => `problem „${p.name}"`),
    ...cards.filter((c) => c.draft).map((c) => `karta „${c.name}"`),
  ];

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Przegląd talii</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Podsumowanie zawartości i ostrzeżenia o balansie.
      </p>

      {warnings.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-danger bg-surface p-3">
          <h3 className="text-sm font-bold text-danger">Do sprawdzenia</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
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

      <h3 className="eter-label mt-6">Karty bonusowe w ściankach</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {(['mentor', 'talent', 'psychological', 'social', 'digital'] as const).map((slot) => {
          const total = problems.reduce(
            (sum, p) => sum + (p.slots.find((s) => s.key === slot)?.bonusCardIds.length ?? 0),
            0,
          );
          return (
            <span key={slot} className="rounded border border-edge px-3 py-1.5 text-xs">
              {slotLabel(slot)}: {total}
            </span>
          );
        })}
        <span className="rounded border border-edge px-3 py-1.5 text-xs text-ink-dim">
          kart użytych jako bonus: {bonusIds.size} z {cards.length}
        </span>
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
