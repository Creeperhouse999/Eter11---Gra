import { buildDeck } from '../data/cards';
import type { CardCategory } from '../engine/types';
import type { GameContent } from '../firebase/validate';
import { FAMILY_IDS } from '../data/families';
import { categoryColorVar, categoryLabel, problemTypeLabel, slotLabel } from '../ui/components/categoryStyles';
import { Tooltip } from '../ui/controls/Tooltip';
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

  /**
   * Ile kart w talii pasuje do najrzadszej pary kategoria+rodzina.
   *
   * Zero jest już wyłapane wyżej. Ale i jedna karta na ściankę oznacza, że
   * misja rozstrzyga się losowaniem: jeśli ta jedna karta nie trafi do ręki
   * przez siedem rund, problemu nie da się domknąć niezależnie od tego, jak
   * dobrze dzieci grają. Przy rozdaniu pięciu kart i talii ~65 sztuk trzy
   * karty to próg, poniżej którego trafienie przestaje być prawdopodobne.
   */
  const SCARCE = 3;
  const scarce = problems.flatMap((p) =>
    p.slots
      .map((s) => ({
        slot: s,
        problem: p,
        count: cards.filter((c) => c.category === s.key && c.family === s.family).length,
      }))
      .filter((entry) => entry.count > 0 && entry.count < SCARCE)
      .map(
        (entry) =>
          `${entry.problem.name} → ${slotLabel(entry.slot.key)} (${entry.slot.family}): ${entry.count}`,
      ),
  );
  if (scarce.length > 0) {
    warnings.push(
      `Ścianki, do których pasują mniej niż ${SCARCE} karty: ${scarce.join(', ')}. ` +
        'Te misje zależą od szczęścia w losowaniu, a nie od decyzji graczy.',
    );
  }

  // Rozkład kart między rodzinami. Rodzina decyduje o dopasowaniu do ścianki,
  // więc talia przechylona w jedną stronę robi część problemów nierozwiązywalną
  // dużo wcześniej, niż którakolwiek ścianka zostanie bez kart.
  const familyCounts = new Map<string, number>();
  for (const card of cards) {
    if (!card.family) continue;
    familyCounts.set(card.family, (familyCounts.get(card.family) ?? 0) + 1);
  }
  const familyValues = [...familyCounts.values()];
  if (familyValues.length > 1) {
    const min = Math.min(...familyValues);
    const max = Math.max(...familyValues);
    // Trzykrotna różnica: przy takim przechyle rzadka rodzina praktycznie
    // nie pojawia się w ręce, choć problemy nadal jej wymagają.
    if (max >= min * 3) {
      const breakdown = [...familyCounts.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([family, count]) => `${family}: ${count}`)
        .join(', ');
      warnings.push(
        `Talia jest przechylona między rodzinami (${breakdown}). ` +
          'Ścianki rzadkiej rodziny będą trudne do domknięcia.',
      );
    }
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

      {/* Stan zdrowia na samej górze i na całą szerokość.
          Wcześniej wszystko na tej zakładce wyglądało jednakowo ważne:
          skróty, ostrzeżenia i liczby stały równo obok siebie, więc
          „czegoś brakuje w talii" ginęło między „kart w talii: 130".
          Pierwsze pytanie brzmi „czy da się w to grać", więc odpowiedź
          na nie idzie przed wszystkim innym. */}
      <div
        className={[
          'eter-rise mt-4 flex items-start gap-3 rounded-xl border-2 p-4',
          warnings.length > 0 ? 'border-accent-2' : 'border-success',
        ].join(' ')}
        style={{ background: 'var(--eter-surface)' }}
      >
        <span
          className="mt-0.5 shrink-0"
          style={{
            color: warnings.length > 0 ? 'var(--eter-accent-2)' : 'var(--eter-success)',
          }}
        >
          <Icon name={warnings.length > 0 ? 'bulb' : 'tick'} size={24} />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="font-display text-lg font-bold"
            style={{
              color: warnings.length > 0 ? 'var(--eter-accent-2)' : 'var(--eter-success)',
            }}
          >
            {warnings.length > 0
              ? `${warnings.length} ${warnings.length === 1 ? 'rzecz' : 'rzeczy'} do sprawdzenia`
              : 'Gra jest gotowa'}
          </p>

          {warnings.length === 0 ? (
            <p className="mt-1 text-sm text-ink-dim">
              Każdą ściankę da się zamknąć kartą z talii, nic nie czeka
              w wersji roboczej.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
              {warnings.map((warning, index) => (
                <li key={index} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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

      {/* Siatka pokrycia: kategoria × rodzina.
          Powyższe paski mówią, ile jest kart danej kategorii, ale ścianka
          wymaga kategorii ORAZ rodziny. Dziura w tej siatce to ścianka,
          której nie ma czym domknąć — a przy pięciu kategoriach i czterech
          rodzinach jest dwadzieścia miejsc, w których może się schować. */}
      <h3 className="eter-label mt-6">Pokrycie: kategoria × rodzina</h3>
      <p className="mt-1 text-xs text-ink-dim">
        Ile kart pasuje do każdej możliwej ścianki. Zero znaczy, że takiej
        ścianki nie da się zamknąć.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1.5 text-left font-normal text-ink-dim">Kategoria</th>
              {FAMILY_IDS.map((family) => (
                <th key={family} className="p-1.5 text-center font-normal">
                  <span
                    className="inline-block h-3 w-3 rounded-full align-middle"
                    style={{ background: `var(--eter-family-${family})` }}
                  />
                </th>
              ))}
              <th className="p-1.5 text-right font-normal text-ink-dim">Razem</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.filter((c) => c !== 'eter11' && c !== 'blackswan').map((category) => {
              const total = cards.filter((c) => c.category === category).length;

              return (
                <tr key={category} className="border-t border-edge">
                  <td className="p-1.5" style={{ color: categoryColorVar(category) }}>
                    {categoryLabel(category)}
                  </td>

                  {FAMILY_IDS.map((family) => {
                    const count = cards.filter(
                      (c) => c.category === category && c.family === family,
                    ).length;

                    return (
                      <td key={family} className="p-1.5 text-center">
                        {/* Custom podpowiedź zamiast natywnego `title` — szary
                            systemowy dymek odstawał od reszty panelu, a na
                            telefonie Google Translate tłumaczył jego treść. */}
                        <Tooltip
                          label={
                            count === 0
                              ? 'Brak karty — ścianki tej rodziny nie da się zamknąć'
                              : count < 3
                                ? 'Mało kart — misja zależy od losowania'
                                : ''
                          }
                        >
                          <span
                            className={[
                              'inline-flex h-6 w-8 items-center justify-center rounded font-mono',
                              count === 0
                                ? 'bg-danger/20 font-bold text-danger'
                                : count < 3
                                  ? 'bg-accent-2/20 text-accent-2'
                                  : 'bg-raised text-ink-dim',
                            ].join(' ')}
                          >
                            {count}
                          </span>
                        </Tooltip>
                      </td>
                    );
                  })}

                  <td className="p-1.5 text-right font-mono text-ink-dim">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ile rzeczywiście trwa partia — z parametrów zasad, nie z wyczucia.
          Redaktor zmienia „rund na misję" i „misji w grze" w innej zakładce,
          nie widząc, że właśnie zrobił grę na półtorej godziny dla ośmiolatka. */}
      <h3 className="eter-label mt-6">Ile trwa partia</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Tur w partii</span>
          <p className="mt-1 font-mono text-2xl font-bold text-accent">
            {rules.missionsPerGame * rules.roundsPerMission}
          </p>
          <span className="text-xs text-ink-dim">
            {rules.missionsPerGame} misji × {rules.roundsPerMission} rund
          </span>
        </div>
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Ruchów przy 4 graczach</span>
          <p className="mt-1 font-mono text-2xl font-bold text-accent">
            {rules.missionsPerGame * rules.roundsPerMission * 4}
          </p>
          <span className="text-xs text-ink-dim">każdy gracz raz na rundę</span>
        </div>
        <div className="rounded-lg border border-edge bg-surface p-3">
          <span className="eter-label">Szacowany czas</span>
          <p className="mt-1 font-mono text-2xl font-bold text-accent">
            ~{Math.round((rules.missionsPerGame * rules.roundsPerMission * 4 * 15) / 60)} min
          </p>
          <span className="text-xs text-ink-dim">
            licząc 15 sekund na ruch; dzieci grają wolniej
          </span>
        </div>
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
