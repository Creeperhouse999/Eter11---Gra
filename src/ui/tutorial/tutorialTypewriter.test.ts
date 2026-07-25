import { describe, it, expect } from 'vitest';
import { typewriterKey } from './useTutorial';

/**
 * Dymek ETER11 pisze tekst literą po literze, a efekt restartuje się przy
 * zmianie komunikatu. Komunikat etapu wymiany osadza licznik zaznaczonych kart
 * („Zaznaczone: 2…"), więc każde kliknięcie karty zmieniało treść i re-animowało
 * całą linię — rozpraszające przy zaznaczaniu kilku kart pod rząd. `typewriterKey`
 * daje stabilny klucz animacji: ten sam komunikat z innym licznikiem = ten sam
 * klucz (bez restartu), inny komunikat = inny klucz (animacja gra).
 */
describe('typewriterKey — klucz animacji dymka samouczka', () => {
  it('jest identyczny dla komunikatu wymiany z różnym licznikiem', () => {
    const two = 'Zaznaczone: 2. Naciśnij „Wymień 2", żeby dostać tyle samo nowych kart.';
    const three = 'Zaznaczone: 3. Naciśnij „Wymień 3", żeby dostać tyle samo nowych kart.';
    expect(two).not.toBe(three);
    expect(typewriterKey(two)).toBe(typewriterKey(three));
  });

  it('różni się dla różnych komunikatów kroków', () => {
    expect(typewriterKey('Zagraj tę kartę na ściankę.')).not.toBe(
      typewriterKey('Teraz kliknij karty, których nie chcesz.'),
    );
  });

  it('rozróżnia przejście „kliknij karty" → „Zaznaczone: 1" (animacja gra raz)', () => {
    const none = 'Teraz kliknij karty, których nie chcesz. Możesz zaznaczyć jedną albo wszystkie.';
    const one = 'Zaznaczone: 1. Naciśnij „Wymień 1", żeby dostać tyle samo nowych kart.';
    expect(typewriterKey(none)).not.toBe(typewriterKey(one));
  });
});
