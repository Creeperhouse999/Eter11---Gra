/**
 * Kod pokoju: losowanie i odczytywanie tego, co wpisało dziecko.
 *
 * Adam zgłaszał dwa razy, że dołączanie nie działa — „wpisywałem kod np. UA6E,
 * a wychodzi »nie ma pokoju o takim kodzie«". Ścieżka w bazie była sprawna:
 * kodu `UA6E` gra po prostu nie mogła wydać, bo w zestawie były i `6`, i `G`.
 * Ktoś przeczytał `G` z ekranu jako `6`.
 *
 * Kod przepisuje się ręcznie z jednego telefonu na drugi, często przez
 * ośmiolatka i często w pośpiechu przy stole. Znaki, które na małym ekranie
 * wyglądają tak samo, są więc realną usterką, nie drobiazgiem.
 */

/**
 * Znaki, z których losujemy kod.
 *
 * Wyrzucone są wszystkie pary mylące przy przepisywaniu: `0/O`, `1/I/L`,
 * `6/G`, `5/S`, `8/B`, `2/Z`, `U/V`. Z każdej pary zostaje jeden znak —
 * litera, bo litery czyta się na ekranie pewniej niż cyfry.
 *
 * Zostaje 21 znaków, czyli 194 481 kombinacji czteroznakowych. Przy
 * kilkunastu pokojach naraz kolizja jest praktycznie niemożliwa, a i tak
 * `createRoom` sprawdza, czy kod jest wolny.
 */
export const CODE_CHARS = 'ACDEFGHJKMNPQRTUWXY34579';

/** Ile znaków ma kod. Krótki, bo wpisuje go dziecko. */
export const CODE_LENGTH = 4;

/**
 * Znaki mylące → ten, który naprawdę może być w kodzie.
 *
 * Działa w jedną stronę: skoro w zestawie nie ma już `6`, wpisane `6` na
 * pewno miało być `G`. Dzięki temu kod przepisany z pomyłką i tak trafia
 * do właściwego pokoju, zamiast odbić się komunikatem „nie ma takiego".
 */
const ZAMIENNIKI: Record<string, string> = {
  '0': 'O',
  O: 'Q', // `O` też wypadło z zestawu — najbliższy kształtem jest `Q`.
  '1': 'I',
  I: 'J',
  L: 'J',
  '6': 'G',
  '5': 'S',
  S: 'C', // `S` wypadło; z kształtu najbliżej mu do `C`.
  '8': 'B',
  B: 'P', // `B` wypadło; zostaje `P`.
  '2': 'Z',
  Z: 'X', // `Z` wypadło; zostaje `X`.
  V: 'U',
};

/**
 * Sprowadza wpisany kod do postaci, jakiej szukamy w bazie.
 *
 * Wielkość liter i spacje nie mają znaczenia (klawiatura telefonu lubi
 * dokleić spację), a znaki mylące zamieniamy na ten wariant, który naprawdę
 * mógł trafić do kodu.
 */
export function normalizeCode(input: string): string {
  const oczyszczony = input.trim().toUpperCase().replace(/\s+/g, '');

  let wynik = '';
  for (const znak of oczyszczony) {
    // Zamiana bywa łańcuchem (`0` → `O` → `Q`), więc idziemy nią do końca —
    // z zabezpieczeniem, żeby błąd w tablicy nie zapętlił wpisywania kodu.
    let biezacy = znak;
    for (let krok = 0; krok < 4 && ZAMIENNIKI[biezacy]; krok += 1) {
      biezacy = ZAMIENNIKI[biezacy];
    }
    wynik += biezacy;
  }
  return wynik;
}

/** Losowy kod pokoju. */
export function makeCode(random: () => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  }
  return code;
}
