import type { GameState } from '../../engine/types';
import { GuideBubble } from './GuideBubble';
import { Spotlight } from './Spotlight';
import { useTutorial, type TutorialContext } from './useTutorial';

interface TutorialLayerProps {
  active: boolean;
  state: GameState;
  context: TutorialContext;
  onFinish: () => void;
}

/**
 * Warstwa samouczka: przyciemnienie z wyciętym otworem plus ETER11 mówiący,
 * co zrobić. Renderowana nad grą, ale nie blokuje jej — gracz klika to,
 * co jest podświetlone.
 */
export function TutorialLayer({ active, state, context, onFinish }: TutorialLayerProps) {
  const tutorial = useTutorial(active, state, context, onFinish);

  if (!tutorial.active) return null;

  return (
    <>
      <Spotlight target={tutorial.anchor} />
      <GuideBubble
        message={tutorial.message}
        step={tutorial.stepNumber}
        total={tutorial.total}
        done={tutorial.done}
        anchor={tutorial.anchor}
        onNext={tutorial.next}
        onSkip={tutorial.skip}
      />
    </>
  );
}
