import { GuideBubble } from './GuideBubble';
import { Spotlight } from './Spotlight';
import type { TutorialControl } from './useTutorial';

interface TutorialLayerProps {
  /** Stan samouczka z useTutorial. */
  tutorial: TutorialControl | { active: false };
}

/**
 * Warstwa samouczka: przyciemnienie z wyciętym otworem plus ETER11 mówiący,
 * co zrobić. Renderowana nad grą, ale nie blokuje jej — gracz klika to,
 * co jest podświetlone.
 */
export function TutorialLayer({ tutorial }: TutorialLayerProps) {
  if (!tutorial.active) return null;

  return (
    <>
      <Spotlight target={tutorial.anchor} from={tutorial.source} />
      <GuideBubble
        message={tutorial.message}
        step={tutorial.stepNumber}
        total={tutorial.total}
        done={tutorial.done}
        anchor={tutorial.anchor}
        onNext={tutorial.next}
        onBack={tutorial.back}
        onSkip={tutorial.skip}
      />
    </>
  );
}
