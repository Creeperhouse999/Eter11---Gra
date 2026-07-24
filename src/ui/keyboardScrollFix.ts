/**
 * Naprawa scrolla po zamknięciu klawiatury ekranowej (iOS Safari).
 *
 * Objaw: gracz klika pole (np. imię w ustawieniach), wysuwa się klawiatura,
 * a po jej schowaniu strona zostaje przewinięta o wysokość klawiatury — pod
 * treścią jest wielka pusta przestrzeń, w którą da się scrollować.
 *
 * `interactive-widget=resizes-content` w meta viewport rozwiązuje to na
 * nowszych przeglądarkach (głównie Android). iOS Safari go (jeszcze) nie
 * respektuje, więc dokładamy zabezpieczenie w JS: gdy widoczny obszar wraca do
 * pełnej wysokości (klawiatura zniknęła), a strona jest przewinięta poza swój
 * koniec, cofamy scroll do maksymalnej sensownej pozycji.
 *
 * Bezpieczne, gdy `visualViewport` nie istnieje — po prostu nic nie robimy.
 */
export function installKeyboardScrollFix(): void {
  const vv = window.visualViewport;
  if (!vv) return;

  let lastHeight = vv.height;

  const onResize = () => {
    const grew = vv.height > lastHeight + 40; // klawiatura właśnie zniknęła
    lastHeight = vv.height;
    if (!grew) return;

    // Poczekaj na ustabilizowanie układu, potem przytnij nadmiarowy scroll.
    requestAnimationFrame(() => {
      const doc = document.documentElement;
      const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
      if (window.scrollY > maxScroll) window.scrollTo(0, maxScroll);
    });
  };

  vv.addEventListener('resize', onResize);
}
