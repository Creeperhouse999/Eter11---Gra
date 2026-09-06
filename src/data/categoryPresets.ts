import type { CategoryMap } from './categories';
import { DEFAULT_CATEGORIES } from './categories';

/**
 * Gotowe zestawy nazw kategorii — do przełączenia jednym kliknięciem.
 *
 * Alan: „dodaj presety, chyba o tym pisałem — te co są dziecięce, super
 * dziecięce i normalne, dodaj te jako presety".
 *
 * Nazwy kategorii wybieraliśmy w dyskusji „Dziecięce nazwy" i Adam zdecydował
 * się na „Supermoce". Ale wybór nie jest raz na zawsze: gra idzie i do
 * ośmiolatków, i do trzynastolatków, i do nauczycieli, którzy chcą mówić
 * językiem podstawy programowej. Zamiast przepisywać siedem pól za każdym
 * razem, zespół przełącza zestaw.
 *
 * Ikony zostają wspólne — zmienia się tylko język, nie znaczenie.
 */
export interface CategoryPreset {
  id: string;
  name: string;
  /** Dla kogo ten zestaw — pomaga wybrać bez klikania każdego po kolei. */
  hint: string;
  labels: Record<keyof CategoryMap, string>;
}

export const CATEGORY_PRESETS: CategoryPreset[] = [
  {
    id: 'normalne',
    name: 'Normalne',
    hint: 'Język, którym o tych rzeczach mówi się w szkole i w dokumentach. Dla nauczycieli i starszych dzieci.',
    labels: {
      psychological: 'Kompetencje psychologiczne',
      digital: 'Kompetencje cyfrowe',
      social: 'Kompetencje społeczne',
      mentor: 'Mentor',
      talent: 'Talent',
      eter11: 'ETER11',
      blackswan: 'Czarny Łabędź',
    },
  },
  {
    id: 'dzieciece',
    name: 'Dziecięce',
    hint: 'Wariant wybrany przez Adama — obecny w grze. Zrozumiały dla dziecka, ale wciąż mówi, o co chodzi.',
    labels: {
      psychological: DEFAULT_CATEGORIES.psychological.label,
      digital: DEFAULT_CATEGORIES.digital.label,
      social: DEFAULT_CATEGORIES.social.label,
      mentor: DEFAULT_CATEGORIES.mentor.label,
      talent: DEFAULT_CATEGORIES.talent.label,
      eter11: DEFAULT_CATEGORIES.eter11.label,
      blackswan: DEFAULT_CATEGORIES.blackswan.label,
    },
  },
  {
    id: 'super-dzieciece',
    name: 'Super dziecięce',
    hint: 'Najprostszy język, dla najmłodszych i pierwszej partii. Same krótkie słowa, żadnych rzeczowników odczasownikowych.',
    labels: {
      psychological: 'Moc Serca',
      digital: 'Moc Maszyn',
      social: 'Moc Przyjaźni',
      mentor: 'Pomocnik',
      talent: 'Twoja Moc',
      eter11: 'ETER11',
      blackswan: 'Czarny Łabędź',
    },
  },
];

/**
 * Nakłada zestaw nazw na obecne kategorie, zostawiając ikony bez zmian.
 *
 * Ikony należą do znaczenia, nie do języka: „Supermoc Umysłu" i „Kompetencje
 * psychologiczne" to ta sama rzecz powiedziana inaczej, więc mózg zostaje
 * mózgiem. Gdyby preset podmieniał też ikony, przełączenie języka zmieniałoby
 * wygląd kart, a dzieci rozpoznają je właśnie po ikonie.
 */
export function zastosujPreset(obecne: CategoryMap, preset: CategoryPreset): CategoryMap {
  const wynik = { ...obecne };
  for (const klucz of Object.keys(preset.labels) as Array<keyof CategoryMap>) {
    wynik[klucz] = {
      ...(obecne[klucz] ?? DEFAULT_CATEGORIES[klucz]),
      label: preset.labels[klucz],
    };
  }
  return wynik;
}

/**
 * Który zestaw jest teraz włączony — albo `null`, gdy zespół pozmieniał nazwy
 * ręcznie. Panel podświetla wtedy nic, zamiast kłamać, że coś jest wybrane.
 */
export function ktoryPreset(obecne: CategoryMap): CategoryPreset | null {
  return (
    CATEGORY_PRESETS.find((preset) =>
      (Object.keys(preset.labels) as Array<keyof CategoryMap>).every(
        (klucz) => obecne[klucz]?.label === preset.labels[klucz],
      ),
    ) ?? null
  );
}
