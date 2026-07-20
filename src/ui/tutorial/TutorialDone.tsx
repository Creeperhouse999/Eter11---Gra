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
