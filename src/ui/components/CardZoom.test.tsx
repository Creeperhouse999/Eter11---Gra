import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Card } from '../../engine/types';
import { CardZoom } from './CardZoom';

/**
 * Powiększenie karty na telefonie: dotknięcie zamyka („Dotknij, żeby wrócić"),
 * ale PRZEWIJANIE długiego opisu na niskim ekranie (telefon w poziomie) nie
 * może zamykać. Przewijanie zaczyna się od `pointerdown` w treści — gdyby to
 * zamykało okno, dziecko nigdy nie doczytałoby przyciętego opisu, czyli tego,
 * po co w ogóle powiększyło kartę.
 */

const CARD: Card = {
  id: 'c1',
  name: 'Empatia',
  category: 'social',
  family: 'blue',
  description:
    'Bardzo długi opis kompetencji, który na niskim ekranie w poziomie nie mieści się w kadrze i trzeba go przewinąć, żeby doczytać do końca.',
  icon: 'handshake',
};

describe('CardZoom — dotyk vs przewijanie', () => {
  it('dotknięcie (klik) karty zamyka — „Dotknij, żeby wrócić"', () => {
    const onClose = vi.fn();
    render(<CardZoom card={CARD} onClose={onClose} />);
    fireEvent.click(screen.getByText(/Bardzo długi opis/));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('start przewijania (pointerdown w treści) NIE zamyka', () => {
    const onClose = vi.fn();
    render(<CardZoom card={CARD} onClose={onClose} />);
    fireEvent.pointerDown(screen.getByText(/Bardzo długi opis/));
    expect(onClose).not.toHaveBeenCalled();
  });
});
