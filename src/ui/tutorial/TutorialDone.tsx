import { Button } from '../controls/Button';
import { Icon, type IconName } from '../icons/Icon';

interface TutorialDoneProps {
  onBack: () => void;
}

const LEARNED: Array<{ icon: IconName; text: string }> = [
  { icon: 'palette', text: 'Kolor karty musi pasować do koloru ścianki' },
  { icon: 'handshake', text: 'Pięć ścianek zamyka problem' },
  { icon: 'undo', text: 'Gdy nic nie pasuje — wymieniasz karty' },
];

/**
 * Trzy poziomy wygranej.
 *
 * Samouczek gra jedna osoba, więc nie da się ich pokazać w akcji: dwa
 * z trzech wymagają drugiego gracza przy stole. Dlatego są opisane tutaj,
 * na końcu — gracz wie już, jak działa tura, i może to odnieść do czegoś
 * konkretnego.
 */
const WIN_LEVELS: Array<{
  icon: IconName;
  color: string;
  title: string;
  text: string;
}> = [
  {
    icon: 'handshake',
    color: 'var(--eter-success)',
    title: 'Wspólny sukces',
    text: 'Rozwiązujecie problem razem. To wygrana całej drużyny — albo wygrywacie wszyscy, albo problem wygrywa z Wami.',
  },
  {
    icon: 'medal',
    color: 'var(--eter-accent)',
    title: 'Sukces osobisty',
    text: 'Punkt za każdą kartę na Twojej postaci i za każde doświadczenie. Im więcej zbierzesz, tym wyższy Twój wynik.',
  },
  {
    icon: 'heart',
    color: 'var(--eter-cat-social)',
    title: 'Spełnienie',
    text: 'Najcenniejsze i niezależne od punktów. Możecie nie rozwiązać wszystkich problemów, możesz nie mieć najwięcej punktów — ale jeśli masz karty z każdej kategorii, oddałeś komuś swoją i dostałeś kartę od kogoś innego, osiągasz spełnienie.',
  },
];

/**
 * Koniec samouczka.
 *
 * Zamyka ścieżkę zamiast wpuszczać gracza w kolejną misję: samouczek ma
 * jeden problem i po jego rozwiązaniu nie ma czego uczyć. Podsumowanie
 * wymienia trzy rzeczy, których gracz właśnie się nauczył — powtórzenie
 * na koniec pomaga je zapamiętać.
 */
export function TutorialDone({ onBack }: TutorialDoneProps) {
  return (
    <main className="eter-fade-in relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div aria-hidden="true" className="eter-grid pointer-events-none fixed inset-0" />

      <div className="relative rounded-2xl border-2 border-success bg-surface p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-raised text-success">
          <Icon name="tick" size={30} />
        </span>

        <span className="eter-label mt-4 block text-success">Samouczek ukończony</span>
        <h1 className="mt-1 font-display text-3xl font-bold">Brawo!</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-dim">
          Umiesz już wszystko, czego trzeba. W prawdziwej grze siadacie razem —
          każdy dokłada, co ma, i możecie przekazywać sobie karty.
        </p>

        <ul className="eter-stagger mt-5 space-y-2 text-left">
          {LEARNED.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-2.5 rounded-lg border border-edge bg-raised px-3 py-2"
            >
              <span className="shrink-0 text-accent">
                <Icon name={item.icon} size={16} />
              </span>
              <span className="text-sm">{item.text}</span>
            </li>
          ))}
        </ul>

        {/* Przekazywanie kart i trzy poziomy wygranej wymagają drugiego
            gracza — samouczek nie mógł ich pokazać, więc tłumaczy je tutaj. */}
        <div className="mt-6 rounded-xl border border-accent bg-raised p-4 text-left">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-accent">
              <Icon name="handshake" size={18} />
            </span>
            <p className="text-sm leading-relaxed">
              W grze z innymi zamiast brać kartę dla siebie możesz{' '}
              <strong className="text-accent">oddać ją innemu graczowi</strong>. Dostajesz
              wtedy punkt doświadczenia za uczenie innych — dzielenie się opłaca się tak
              samo jak zbieranie.
            </p>
          </div>
        </div>

        <div className="mt-4 text-left">
          <span className="eter-label">Wygrać można na trzy sposoby</span>
          <ol className="eter-stagger mt-2 space-y-2">
            {WIN_LEVELS.map((level, index) => (
              <li
                key={level.title}
                className="rounded-lg border border-edge bg-raised p-3"
                style={{ borderLeftColor: level.color, borderLeftWidth: 3 }}
              >
                <span className="flex items-center gap-2">
                  <span className="shrink-0" style={{ color: level.color }}>
                    <Icon name={level.icon} size={16} />
                  </span>
                  <span className="font-display text-sm font-bold">
                    {index + 1}. {level.title}
                  </span>
                </span>
                <p className="mt-1 text-xs leading-relaxed text-ink-dim">{level.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <Button
          variant="primary"
          size="lg"
          icon="rocket"
          onClick={onBack}
          className="mt-6 w-full"
        >
          Wróć do menu
        </Button>
      </div>
    </main>
  );
}
