import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { GuideBubble } from './GuideBubble';

/**
 * Tekst ETER11 wystukuje się litera po literze; klik ma pokazać całość od razu
 * (szybko czytający nie czekają). Klik MUSI zatrzymać wystukiwanie — inaczej
 * interwał na kolejnym ticku cofał tekst z powrotem do połowy i pełna treść
 * migała tylko na jedną klatkę.
 */
const MSG = 'To jest dość długa wiadomość ETER11 do przeczytania na spokojnie razem.';

function renderBubble() {
  return render(
    <GuideBubble
      message={MSG}
      step={1}
      total={3}
      done={false}
      onNext={() => {}}
      onBack={null}
      onSkip={() => {}}
      anchor={null}
    />,
  );
}

describe('GuideBubble — klik pokazuje całość', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('po kliknięciu tekst zostaje pełny i nie cofa się do wystukiwania', () => {
    const { container } = renderBubble();

    // Kilka ticków — tekst dopiero się wystukuje, jeszcze niepełny.
    act(() => void vi.advanceTimersByTime(48));
    const p = container.querySelector('p')!;
    expect(p.textContent ?? '').not.toContain(MSG);

    // Klik „pokaż całość".
    act(() => {
      fireEvent.click(p);
    });
    // Kolejne ticki NIE mogą cofnąć tekstu do wystukiwania.
    act(() => void vi.advanceTimersByTime(160));

    expect(container.querySelector('p')!.textContent ?? '').toContain(MSG);
  });
});
