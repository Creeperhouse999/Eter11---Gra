import { describe, it, expect } from 'vitest';
import {
  INTRO_STORY,
  INTRO_STORY_GOOD,
  INTRO_BOX,
  INTRO_FAQ,
  DEFAULT_INTRO,
  NARRATIVE_LABELS,
} from './intro';

/**
 * Dwie wersje narracji do porównania na żywych graczach.
 *
 * Adam poprosił: „zrób dodatkową wersję narracji 1 strony — obecna niech
 * zostanie, nazwijmy ją »Zły 2111«, ale zrób jeszcze dodatkową »Dobry 2111«.
 * (…) Chodzi o to, abyśmy mieli dwie różne narracje gry i abyśmy ze
 * wspólnikami i testowymi graczami wybrali, która narracja lepiej trafia do
 * graczy dzieci i rodziców".
 *
 * Różnica jest w postawie ETER11, nie w kosmetyce: w pierwszej przybywa
 * z przyszłości, którą zniszczyły nierozwiązane problemy; w drugiej z takiej,
 * która sobie poradziła — i przychodzi nauczyć, jak to zrobić.
 *
 * Obie muszą być pełne i samodzielne. Wariant „na próbę", krótszy albo
 * niedokończony, nie da się uczciwie porównać z dopracowanym.
 */

describe('dwie narracje wstępu', () => {
  it('obie mają nazwy, po których zespół je rozróżni', () => {
    expect(NARRATIVE_LABELS.dark).toMatch(/zły/i);
    expect(NARRATIVE_LABELS.bright).toMatch(/dobry/i);
  });

  it('druga narracja jest osobnym tekstem, nie kopią pierwszej', () => {
    const pierwsza = INTRO_STORY.map((s) => s.body).join(' ');
    const druga = INTRO_STORY_GOOD.map((s) => s.body).join(' ');

    expect(druga).not.toBe(pierwsza);
    // Porównanie ma sens tylko między dwoma dopracowanymi wersjami — szkic
    // przegrałby z gotowym tekstem niezależnie od tego, która idea jest lepsza.
    expect(druga.length).toBeGreaterThan(pierwsza.length * 0.6);
  });

  it('druga narracja mówi o przyszłości, która sobie poradziła', () => {
    const tekst = INTRO_STORY_GOOD.map((s) => `${s.heading} ${s.body}`).join(' ').toLowerCase();

    // Sedno prośby Adama: 2111 jest w niej udany, a ETER11 przybywa pomóc,
    // nie ratować się.
    expect(tekst).toMatch(/udało|poradzi|naprawi|rozwiąza/);
  });

  it('obie wersje zwracają się do gracza bezpośrednio', () => {
    // Reszta wstępu jest pisana drugą osobą; wariant w trzeciej brzmiałby
    // dla dziecka jak cudza historia, nie jak zaproszenie.
    for (const wersja of [INTRO_STORY, INTRO_STORY_GOOD]) {
      const tekst = wersja.map((s) => s.body).join(' ').toLowerCase();
      expect(tekst).toMatch(/\b(was|wam|wy|ciebie|twoj|masz|jesteś)/);
    }
  });

  it('każda scena ma nagłówek, treść i ikonę', () => {
    // Brak któregokolwiek pola wywraca ekran wstępu — sceny renderują się
    // bez sprawdzania.
    for (const scena of INTRO_STORY_GOOD) {
      expect(scena.heading.trim().length).toBeGreaterThan(0);
      expect(scena.body.trim().length).toBeGreaterThan(0);
      expect(scena.icon.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('strony wydruku edytowalne w panelu', () => {
  it('opis „na pudełko" i FAQ są danymi, nie tekstem w komponencie', () => {
    // Alan dopisał przy każdej stronie „to też edytowalne w panelu", a Adam
    // powtórzył: „możliwość edycji każdej strony". Strony 2 i 5 miałem wpisane
    // na sztywno w wydruku — poprawka wymagałaby wdrożenia.
    expect(INTRO_BOX.length).toBeGreaterThan(0);
    expect(INTRO_FAQ.length).toBeGreaterThan(0);
  });

  it('FAQ ma pytania i odpowiedzi, nie same hasła', () => {
    for (const wpis of INTRO_FAQ) {
      // Nagłówek to pytanie, treść to odpowiedź — bez tego strona nie
      // odpowiada na nic.
      expect(wpis.heading).toMatch(/\?/);
      expect(wpis.body.trim().length).toBeGreaterThan(20);
    }
  });

  it('domyślna treść wstępu obejmuje wszystkie pięć części', () => {
    // Brakująca część zostawiłaby pustą stronę w wydruku i pustą zakładkę
    // w panelu.
    for (const klucz of ['story', 'box', 'adults', 'rules', 'faq'] as const) {
      expect(DEFAULT_INTRO[klucz]?.length, `brak części ${klucz}`).toBeGreaterThan(0);
    }
  });
});
