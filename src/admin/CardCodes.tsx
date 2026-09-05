import { useMemo, useState } from 'react';
import type { Card, Character, Problem } from '../engine/types';
import { categoryLabel, familyLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';
import { ImageUpload } from './ImageUpload';
import { CATEGORY_ORDER } from '../data/categories';
import { themeFamilyColor, withFamilyColor } from '../data/families';
import { LIGHT_THEME, type ThemeColors, type ThemeMode } from '../data/theme';
import type { CardCategory, FamilyId } from '../engine/types';

interface CardCodesProps {
  cards: Card[];
  onChange: (cards: Card[]) => void;
  /**
   * Problemy i postacie — Adam poprosił, żeby tabela obejmowała wszystko,
   * z czego składa się gra, nie tylko karty kompetencji. Grafik potrzebuje
   * ich kodów tak samo, a nazwy poprawia się tu równie wygodnie.
   *
   * Opcjonalne, bo tabelę woła też test samych kart.
   */
  problems?: Problem[];
  onProblemsChange?: (problems: Problem[]) => void;
  characters?: Character[];
  onCharactersChange?: (characters: Character[]) => void;
  /**
   * Motyw — kolor karty jest kolorem RODZINY w motywie gry (dokładnie ten
   * sam, który maluje kartę na stole i który zmienia się w zakładce
   * „Kolory"), nie polem osobnym dla każdej kategorii. Adam zgłosił, że
   * zmiana koloru stąd nie było widać w „Kartach" ani w „Drukuj karty" —
   * bo próbnik zapisywał się w nieużywanym gdzie indziej polu rodziny.
   * Zapis idzie teraz do obu wariantów motywu, żeby próbnik działał
   * niezależnie od tego, w którym trybie (jasny/ciemny) akurat jest panel.
   */
  theme?: ThemeColors;
  themeLight?: ThemeColors;
  onThemeChange?: (mode: ThemeMode, theme: ThemeColors) => void;
  /**
   * Skok do pełnej edycji — Adam poprosił wprost: „mogę edytować pojedyncze
   * elementy, ale zrób przycisk, który przeniesie mnie do danej karty do
   * zakładki »karty« albo »problemy«". Tabela tutaj poprawia szybko literówkę
   * czy kod; pełny opis, wymagania i historię edytuje się tam. Ten sam wzorzec
   * (nazwa dla kart, id dla problemów) już działa w „Drukuj karty" — patrz
   * `PrintCards.onEdit`/`onEditProblem`.
   */
  onEditCard?: (cardName: string) => void;
  onEditProblem?: (problemId: string) => void;
}

/** Nazwa grupy, w której stoi dany wpis. */
type Grupa = 'Karty kompetencji' | 'Karty specjalne' | 'Problemy świata' | 'Karty postaci';

/**
 * Kategorie do wyboru w tabeli.
 *
 * `CATEGORY_ORDER` to ścianki problemu; karty mają jeszcze dwie kategorie
 * specjalne (ETER11, Czarny Łabędź), które też trzeba dać się ustawić —
 * Adam prosił, żeby dało się je przypisać właśnie stąd.
 */
const KATEGORIE: CardCategory[] = [...CATEGORY_ORDER, 'eter11', 'blackswan'];

/** Rodziny (kolory). Pusty wybór znaczy „karta specjalna, bez rodziny". */
const RODZINY: FamilyId[] = ['red', 'blue', 'yellow', 'green'];

/**
 * Tabela kodów kart — przegląd całej talii w jednym miejscu.
 *
 * Adam poprosił o listę wszystkich kart z kodem: „prosta czytelna tabela —
 * nazwa, kod, rodzina, kolor, grafika, i aby można było łatwo edytować
 * z poziomu tej tabelki".
 *
 * Kod karty to jej identyfikator (`psy-r-odpornosc`). Jest ważny poza panelem:
 * biblioteka grafik dopasowuje wgrany plik do karty właśnie po nim, więc
 * grafik musi wiedzieć, jak nazwać plik, zanim go odda.
 *
 * Różnica wobec zakładki „Karty": tam edytuje się jedną kartę w pełni,
 * z opisem i ikoną; tutaj widać całą talię naraz, wiersz po wierszu. To dwa
 * różne zadania — przegląd i poprawka literówki kontra praca nad treścią.
 */
export function CardCodes({
  cards,
  onChange,
  problems,
  onProblemsChange,
  characters,
  onCharactersChange,
  theme,
  themeLight,
  onThemeChange,
  onEditCard,
  onEditProblem,
}: CardCodesProps) {
  const toast = useToast();
  const [szukaj, setSzukaj] = useState('');
  // Kod zmienia się rzadko, a pomyłka boli (grafiki są przypięte właśnie po
  // nim), więc pole odsłaniamy dopiero po kliknięciu — zamiast wystawiać je
  // obok nazwy, gdzie łatwo wpisać coś przez przypadek.
  const [edytowanyKod, setEdytowanyKod] = useState<string | null>(null);

  /**
   * Wszystkie wpisy w jednym kształcie: karty, problemy i postacie.
   *
   * Problem i postać nie mają kategorii ani rodziny w sensie kart, więc ich
   * kolumny zostają puste — ale kod, nazwa i grafika są wspólne, i o to
   * właśnie chodziło Adamowi („dodaj do »kody kart« również karty problemów
   * oraz karty postaci").
   */
  const wszystkie = useMemo(() => {
    const wpisy: Array<{
      id: string;
      name: string;
      grupa: Grupa;
      card?: Card;
      problem?: Problem;
      character?: Character;
      image?: string;
    }> = [];

    for (const card of cards) {
      const specjalna = card.category === 'eter11' || card.category === 'blackswan';
      wpisy.push({
        id: card.id,
        name: card.name,
        // Adam: „karty eter11 oraz cz. łabędź — dodaj do rodziny »karty
        // specjalne«". Nie mają rodziny-koloru, więc bez tej grupy wisiały
        // w tabeli z samą kreską.
        grupa: specjalna ? 'Karty specjalne' : 'Karty kompetencji',
        card,
        image: card.image,
      });
    }
    for (const problem of problems ?? []) {
      wpisy.push({
        id: problem.id,
        name: problem.name,
        grupa: 'Problemy świata',
        problem,
        image: problem.image,
      });
    }
    for (const character of characters ?? []) {
      wpisy.push({
        id: character.id,
        name: character.name,
        grupa: 'Karty postaci',
        character,
      });
    }
    return wpisy;
  }, [cards, problems, characters]);

  const widoczne = useMemo(() => {
    const fraza = szukaj.trim().toLowerCase();
    if (!fraza) return wszystkie;
    return wszystkie.filter(
      (w) =>
        w.name.toLowerCase().includes(fraza) ||
        w.id.toLowerCase().includes(fraza) ||
        w.grupa.toLowerCase().includes(fraza) ||
        (w.card ? categoryLabel(w.card.category).toLowerCase().includes(fraza) : false),
    );
  }, [wszystkie, szukaj]);

  /** Wpisy pogrupowane — kolejność stała, żeby lista nie skakała. */
  const grupy = useMemo(() => {
    const kolejnosc: Grupa[] = [
      'Karty kompetencji',
      'Karty specjalne',
      'Problemy świata',
      'Karty postaci',
    ];
    return kolejnosc
      .map((nazwa) => ({ nazwa, wpisy: widoczne.filter((w) => w.grupa === nazwa) }))
      .filter((g) => g.wpisy.length > 0);
  }, [widoczne]);

  const zmien = (id: string, patch: Partial<Card>) => {
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  /**
   * Zmiana kodu karty.
   *
   * Kod to identyfikator, po którym silnik rozpoznaje kartę, a biblioteka
   * grafik dopasowuje plik. Dwie karty z tym samym kodem zachowałyby się
   * w grze jak jedna, a walidacja treści i tak zablokowałaby zapis całej gry —
   * więc duplikat odrzucamy od razu, z wyjaśnieniem, zamiast wpuszczać go
   * i wywalać zapis kilka kliknięć później.
   */
  const zmienKod = (stary: string, nowy: string) => {
    const kod = nowy.trim();
    if (!kod) return;
    if (kod !== stary && cards.some((c) => c.id === kod)) {
      toast(`Kod „${kod}" ma już inna karta — kody muszą być różne.`, 'danger');
      return;
    }
    setEdytowanyKod(kod);
    zmien(stary, { id: kod });
  };

  /** Wpis w tabeli — karta, problem albo postać. */
  type Wpis = (typeof wszystkie)[number];

  /** Zmiana nazwy trafia tam, skąd wpis pochodzi. */
  const zmienNazwe = (wpis: Wpis, nazwa: string) => {
    if (wpis.card) {
      zmien(wpis.card.id, { name: nazwa });
      return;
    }
    if (wpis.problem && onProblemsChange) {
      onProblemsChange(
        (problems ?? []).map((p) => (p.id === wpis.id ? { ...p, name: nazwa } : p)),
      );
      return;
    }
    if (wpis.character && onCharactersChange) {
      onCharactersChange(
        (characters ?? []).map((c) => (c.id === wpis.id ? { ...c, name: nazwa } : c)),
      );
    }
  };

  /** To samo dla grafiki: karta i problem mają własne pole `image`. */
  const zmienGrafike = (wpis: Wpis, url: string | undefined) => {
    if (wpis.card) {
      zmien(wpis.card.id, { image: url });
      return;
    }
    if (wpis.problem && onProblemsChange) {
      onProblemsChange(
        (problems ?? []).map((p) => (p.id === wpis.id ? { ...p, image: url } : p)),
      );
    }
  };

  /**
   * Zmiana koloru karty = zmiana koloru jej RODZINY w motywie gry.
   *
   * Kolor nie należy do pojedynczej karty ani do jednej kategorii: wszystkie
   * czerwone karty w całej grze dzielą jeden odcień (`--eter-family-red`),
   * bo to po nim gracz poznaje, że pasują do tej samej ścianki — dokładnie
   * tak samo, jak już działa zakładka „Rodziny kart". Zapisujemy w obu
   * wariantach motywu (jasny i ciemny), żeby próbnik działał niezależnie od
   * tego, w którym trybie akurat jest panel.
   */
  const zmienKolor = (card: Card, kolor: string) => {
    if (!card.family || !onThemeChange || !theme) return;
    onThemeChange('dark', withFamilyColor(theme, card.family, kolor));
    // Motyw jasny startuje od wbudowanego, gdy zespół jeszcze go nie
    // dotknął (`themeLight` bywa `undefined`) — tak samo jak w zakładce
    // „Kolory". Bez tego edycja tutaj poprawiałaby tylko ciemny wariant,
    // a próbnik w trybie jasnym dalej pokazywałby stary kolor.
    onThemeChange('light', withFamilyColor(themeLight ?? LIGHT_THEME, card.family, kolor));
  };

  const kopiuj = async (kod: string) => {
    try {
      await navigator.clipboard.writeText(kod);
      toast(`Skopiowano „${kod}".`, 'success');
    } catch {
      // Przeglądarka bez dostępu do schowka (albo strona bez HTTPS) — mówimy
      // wprost zamiast udawać, że się udało.
      toast('Przeglądarka nie pozwoliła skopiować — zaznacz kod ręcznie.', 'danger');
    }
  };

  return (
    <section>
      <h2 className="font-display text-lg font-bold">Kody kart</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-dim">
        Cała talia w jednej tabeli. <strong>Kod</strong> to nazwa, jakiej używa
        biblioteka grafik — plik nazwany tak jak kod (np.{' '}
        <code className="font-mono text-xs">psy-r-odpornosc.png</code>) sam
        przypnie się do karty. Nazwę poprawisz tutaj, a zmiana wejdzie do całej
        gry po zapisaniu.
      </p>

      <div className="mt-3 max-w-xs">
        <TextField
          label="Szukaj karty"
          value={szukaj}
          placeholder="nazwa, kod albo kategoria"
          onChange={(e) => setSzukaj(e.target.value)}
        />
      </div>

      <p className="mt-2 font-mono text-[11px] text-ink-dim">
        {/* Liczymy WSZYSTKIE wpisy, nie same karty: w tabeli są też problemy
            i postacie, więc porównanie z `cards.length` dawało bzdurę
            w rodzaju „9 z 5 kart". */}
        {widoczne.length === wszystkie.length
          ? `${wszystkie.length} pozycji`
          : `${widoczne.length} z ${wszystkie.length} pozycji`}
      </p>

      {/* Tabela szersza niż telefon — przewija się w swoim pudełku, żeby nie
          rozpychać całej strony w bok. */}
      <div className="mt-2 overflow-x-auto rounded-lg border border-edge">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge bg-raised text-left">
              <th className="p-2 font-display text-xs uppercase tracking-wide">Nazwa</th>
              <th className="p-2 font-display text-xs uppercase tracking-wide">Kod</th>
              <th className="p-2 font-display text-xs uppercase tracking-wide">Kategoria</th>
              <th className="p-2 font-display text-xs uppercase tracking-wide">Rodzina</th>
              <th className="p-2 font-display text-xs uppercase tracking-wide">Kolor</th>
              <th className="p-2 font-display text-xs uppercase tracking-wide">Grafika</th>
            </tr>
          </thead>
          {grupy.map((grupa) => (
            <tbody key={grupa.nazwa}>
              {/* Nagłówek grupy: bez niego problem, postać i karta wyglądają
                  w tabeli identycznie. */}
              <tr className="border-b border-edge bg-raised/60">
                <th
                  colSpan={6}
                  className="p-1.5 text-left font-display text-[11px] uppercase tracking-wide text-ink-dim"
                >
                  {grupa.nazwa} · {grupa.wpisy.length}
                </th>
              </tr>

              {grupa.wpisy.map((wpis) => {
                const card = wpis.card;
                return (
                  <tr key={`${grupa.nazwa}-${wpis.id}`} className="border-b border-edge/60">
                    <td className="p-1.5">
                      <span className="flex items-center gap-1">
                        <input
                          className="w-full rounded border border-edge bg-surface px-2 py-1 text-sm"
                          value={wpis.name}
                          aria-label={`Nazwa: ${wpis.id}`}
                          onChange={(e) => zmienNazwe(wpis, e.target.value)}
                        />
                        {/* Skok do pełnej edycji — patrz komentarz przy
                            `onEditCard`/`onEditProblem` w propsach. Postać nie
                            ma tu przycisku: Adam prosił konkretnie o „karty"
                            i „problemy". */}
                        {wpis.card && onEditCard && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="arrowRight"
                            aria-label={`Edytuj w zakładce Karty: ${wpis.name}`}
                            onClick={() => onEditCard(wpis.name)}
                          />
                        )}
                        {wpis.problem && onEditProblem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="arrowRight"
                            aria-label={`Edytuj w zakładce Problemy: ${wpis.name}`}
                            onClick={() => onEditProblem(wpis.id)}
                          />
                        )}
                      </span>
                      {card?.draft && (
                        <span className="mt-0.5 inline-block font-mono text-[9px] uppercase text-ink-dim">
                          robocza
                        </span>
                      )}
                    </td>

                    <td className="p-1.5">
                      {edytowanyKod === wpis.id && card ? (
                        <input
                          className="w-40 rounded border border-accent bg-surface px-2 py-1 font-mono text-xs"
                          value={card.id}
                          autoFocus
                          aria-label={`Kod karty ${card.name}`}
                          onChange={(e) => zmienKod(card.id, e.target.value)}
                          onBlur={() => setEdytowanyKod(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                          }}
                        />
                      ) : (
                        <span className="flex items-center gap-1">
                          <code className="font-mono text-xs">{wpis.id}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="clipboard"
                            aria-label={`Kopiuj kod ${wpis.id}`}
                            onClick={() => void kopiuj(wpis.id)}
                          />
                          {/* Kod zmieniamy tylko kartom: problem i postać mają
                              go wpisanego w treści gry w wielu miejscach naraz
                              (ścianki, samouczek), więc zmiana stąd zerwałaby
                              te powiązania po cichu. */}
                          {card && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon="pencil"
                              aria-label={`Zmień kod ${card.id}`}
                              onClick={() => setEdytowanyKod(card.id)}
                            />
                          )}
                        </span>
                      )}
                    </td>

                    <td className="p-1.5">
                      {card ? (
                        <select
                          className="rounded border border-edge bg-surface px-1.5 py-1 text-xs"
                          value={card.category}
                          aria-label={`Kategoria karty ${card.name}`}
                          onChange={(e) =>
                            zmien(card.id, { category: e.target.value as CardCategory })
                          }
                        >
                          {KATEGORIE.map((k) => (
                            <option key={k} value={k}>
                              {categoryLabel(k)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-ink-dim">{grupa.nazwa}</span>
                      )}
                    </td>

                    <td className="p-1.5">
                      {card && grupa.nazwa === 'Karty kompetencji' ? (
                        <select
                          className="rounded border border-edge bg-surface px-1.5 py-1 text-xs"
                          value={card.family ?? ''}
                          aria-label={`Rodzina karty ${card.name}`}
                          onChange={(e) =>
                            zmien(card.id, {
                              family: (e.target.value || undefined) as FamilyId | undefined,
                            })
                          }
                        >
                          <option value="">— (bez rodziny)</option>
                          {RODZINY.map((r) => (
                            <option key={r} value={r}>
                              {familyLabel(r, card.category)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-ink-dim">{grupa.nazwa}</span>
                      )}
                    </td>

                    <td className="p-1.5">
                      {card?.family ? (
                        onThemeChange && theme ? (
                          <input
                            type="color"
                            data-testid="probka-koloru"
                            aria-label={`Kolor karty ${card.name}`}
                            value={themeFamilyColor(theme, card.family)}
                            onChange={(e) => zmienKolor(card, e.target.value)}
                            className="h-6 w-8 cursor-pointer rounded border border-edge bg-surface align-middle"
                          />
                        ) : (
                          <span
                            data-testid="probka-koloru"
                            title={card.family}
                            className="inline-block h-4 w-4 rounded border border-edge align-middle"
                            style={{ backgroundColor: `var(--eter-family-${card.family})` }}
                          />
                        )
                      ) : (
                        <span className="text-xs text-ink-dim">—</span>
                      )}
                    </td>

                    <td className="p-1.5 text-xs">
                      {wpis.character ? (
                        // Postać ma ikonę, nie grafikę — nie ma tu czego wgrywać.
                        <span className="text-ink-dim">ikona</span>
                      ) : (
                        <ImageUpload
                          value={wpis.image ? [wpis.image] : []}
                          onChange={(urls) => zmienGrafike(wpis, urls[0])}
                          folder="cards"
                          max={1}
                          namePrefix={wpis.id}
                          label={wpis.name}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {widoczne.length === 0 && (
        <p className="mt-3 text-sm text-ink-dim">
          Nic nie pasuje do „{szukaj}". Spróbuj samej nazwy albo fragmentu kodu.
        </p>
      )}
    </section>
  );
}
