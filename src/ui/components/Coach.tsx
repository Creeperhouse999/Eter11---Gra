import { FAMILY_LABELS } from '../../data/families';
import { roundsForPlayers } from '../../engine/reducer';
import { cardFitsSlot } from '../../engine/rules';
import type { Card, GameState, Player } from '../../engine/types';
import { Icon, type IconName } from '../icons/Icon';
import { slotLabel } from './categoryStyles';

interface CoachProps {
  state: GameState;
  player: Player;
  selectedCard: Card | null;
  handRevealed: boolean;
  swapMode: boolean;
}

interface Hint {
  icon: IconName;
  text: string;
  tone: 'neutral' | 'good' | 'warn';
}

/**
 * Pasek podpowiedzi prowadzący przez turę.
 *
 * Odbiorcą jest ośmiolatek, który siada do gry pierwszy raz i nie przeczyta
 * instrukcji. Zamiast osobnego ekranu pomocy pasek mówi jedną rzecz naraz,
 * dopasowaną do tego, co widać na ekranie — i milknie, gdy gracz wie,
 * co robić.
 *
 * Kolejność sprawdzania odpowiada temu, co blokuje gracza najbardziej:
 * najpierw zakryte karty, potem brak pasujących kart, potem wybór ścianki.
 */
function buildHint(props: CoachProps): Hint | null {
  const { state, player, selectedCard, handRevealed, swapMode } = props;
  const mission = state.mission;
  if (!mission) return null;

  if (swapMode) {
    return {
      icon: 'undo',
      tone: 'neutral',
      text: 'Zaznacz karty, których nie chcesz. Dostaniesz w zamian tyle samo nowych.',
    };
  }

  if (!handRevealed) {
    return {
      icon: 'eyeOn',
      tone: 'neutral',
      text: `Kolej gracza ${player.name}. Podaj urządzenie i odkryj karty.`,
    };
  }

  // Karta w ręku: pokaż, gdzie pasuje.
  if (selectedCard) {
    const targets = mission.problems.flatMap((problem) =>
      problem.slots
        .filter((slot) => cardFitsSlot(selectedCard, slot.key, slot.family))
        .map((slot) => `${slotLabel(slot.key)} ${FAMILY_LABELS[slot.family].toLowerCase()}`),
    );

    if (targets.length === 0) {
      return {
        icon: 'warning',
        tone: 'warn',
        text: `„${selectedCard.name}" nie pasuje do żadnej wolnej ścianki. Wybierz inną kartę albo spasuj.`,
      };
    }

    return {
      icon: 'tick',
      tone: 'good',
      text: `Ta karta pasuje do ścianki: ${targets.join(', ')}. Przeciągnij ją tam albo kliknij ściankę.`,
    };
  }

  // Pusta ręka: wymiana nic nie da, bo nie ma czego wymieniać.
  if (player.hand.length === 0) {
    return {
      icon: 'warning',
      tone: 'warn',
      text: 'Nie masz już kart, a talia się skończyła. Możesz tylko spasować — poczekaj na pozostałych graczy.',
    };
  }

  // Nic nie wybrano: czy w ogóle jest czym zagrać?
  const playable = player.hand.filter((card) =>
    mission.problems.some((problem) =>
      problem.slots.some((slot) => cardFitsSlot(card, slot.key, slot.family)),
    ),
  );

  if (playable.length === 0) {
    return {
      icon: 'warning',
      tone: 'warn',
      text: 'Żadna Twoja karta nie pasuje do wolnych ścianek. Wymień karty albo spasuj.',
    };
  }

  // Limit zależy od liczby graczy — podpowiedź musi liczyć tak samo
  // jak silnik, inaczej mówiłaby o rundach, których już nie ma.
  const remaining =
    roundsForPlayers(state.players.length, state.config.roundsPerMission) -
    mission.round +
    1;
  if (remaining <= 2) {
    return {
      icon: 'warning',
      tone: 'warn',
      text: `Zostały ${remaining === 1 ? 'ostatnia runda' : 'dwie rundy'}. Masz ${playable.length} pasujących kart — wybierz jedną.`,
    };
  }

  return {
    icon: 'bulb',
    tone: 'neutral',
    text: `Masz ${playable.length} ${playable.length === 1 ? 'pasującą kartę' : 'pasujących kart'}. Kliknij kartę, żeby zobaczyć, gdzie ją położyć.`,
  };
}

const TONES: Record<Hint['tone'], string> = {
  neutral: 'var(--eter-accent)',
  good: 'var(--eter-success)',
  warn: 'var(--eter-cat-social)',
};

export function Coach(props: CoachProps) {
  const hint = buildHint(props);
  if (!hint) return null;

  const color = TONES[hint.tone];

  return (
    <div
      // Zmiana treści ma być zauważona, ale nie ma przerywać czytania.
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-lg border border-edge bg-surface px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-2"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <span className="shrink-0" style={{ color }}>
        <Icon name={hint.icon} size={16} />
      </span>
      <p className="text-xs leading-snug sm:text-sm">{hint.text}</p>
    </div>
  );
}
