/**
 * Odblokowanie funkcji ETER (AI) kodem z menu głównego.
 *
 * Alan: „zrób na razie to, że w menu głównym wpisujesz kod, który aktywuje
 * w ogóle funkcje AI, kod to ZanklodVanWriter i wtedy można używać".
 *
 * ⚠️ To NIE jest zabezpieczenie. Kod jest wpisany w kod strony, a strona jest
 * publiczna — każdy, kto otworzy źródło, go znajdzie. To przełącznik dla
 * zespołu: funkcja nie włącza się przypadkiem u dziecka, które dostało link
 * do gry, i nie generuje kosztów, o które nikt nie prosił. Przed realnym
 * nadużyciem chroni App Check po stronie Firebase, nie ten kod.
 *
 * Zapamiętujemy odblokowanie w przeglądarce, żeby nie wpisywać go przy każdym
 * wejściu — to wygoda tego samego urządzenia, nie konto.
 */

const KLUCZ = 'eter11:ai';
const KOD = 'zanklodvanwriter';

/**
 * Czy podany kod odblokowuje ETER.
 *
 * Porównanie bez oglądania się na wielkość liter i spacje: kod bywa
 * przepisywany z kartki albo dyktowany, a literówka w wielkości liter nie jest
 * powodem, żeby powiedzieć „zły kod".
 */
export function kodPasuje(wpisany: string): boolean {
  return wpisany.trim().toLowerCase().replace(/\s+/g, '') === KOD;
}

/** Czy ETER jest odblokowana na tym urządzeniu. */
export function czyOdblokowane(): boolean {
  try {
    return localStorage.getItem(KLUCZ) === '1';
  } catch {
    // Prywatne okno albo zablokowane dane stron — funkcja po prostu zostaje
    // wyłączona, zamiast wywracać menu.
    return false;
  }
}

/** Zapisuje odblokowanie; zwraca `false`, gdy kod jest zły. */
export function odblokuj(wpisany: string): boolean {
  if (!kodPasuje(wpisany)) return false;
  try {
    localStorage.setItem(KLUCZ, '1');
  } catch {
    // Bez pamięci przeglądarki odblokowanie działa do końca sesji.
  }
  return true;
}

/** Wyłącza ETER na tym urządzeniu — np. przed oddaniem tabletu dzieciom. */
export function zablokuj(): void {
  try {
    localStorage.removeItem(KLUCZ);
  } catch {
    // Nie ma czego czyścić.
  }
}
