import { buildDeck, playableCards } from '../data/cards';
import { kolorPostaci } from '../data/characters';
import type { GameContent } from '../firebase/validate';
import type { Card, Problem, ProblemSlot, SlotKey } from '../engine/types';
import { categoryLabel, familyLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { Icon, type IconName } from '../ui/icons/Icon';

interface PrintCardsProps {
  content: GameContent;
  /**
   * Skok do edycji karty (zakładka „Karty”, przefiltrowana po nazwie).
   *
   * Bez tego lista w „Drukuj karty” była czysto do oglądania — literówkę czy
   * złą grafikę widać tu od razu, ale poprawić dało się tylko po ręcznym
   * odszukaniu tej samej karty w zakładce „Karty”.
   */
  onEdit?: (cardName: string) => void;
  /**
   * Skok do edycji problemu i postaci — Adam poprosił o to samo, co przy
   * kartach: „abym mógł klikać w karty problemów i postaci i być
   * przeniesionym do edycji".
   */
  onEditProblem?: (problemId: string) => void;
  onEditCharacter?: (characterName: string) => void;
}

/**
 * Kolory rodzin na wydruku.
 *
 * Wpisane wprost, nie przez zmienne CSS: przeglądarki nie przenoszą tła ani
 * zmiennych motywu na wydruk bez zgody użytkownika, a kolor rodziny NIESIE
 * ZASADĘ GRY — karta pasuje do ścianki tylko przy zgodnej rodzinie. Bez niego
 * fizyczna talia jest nie do rozegrania.
 */
const KOLOR_RODZINY: Record<string, string> = {
  red: '#d92626',
  blue: '#1f6fd0',
  yellow: '#c98a00',
  green: '#1f9d4d',
};

/**
 * Kolory kart bez rodziny — na stole mają się odróżniać od kompetencji.
 *
 * Adam wybrał je wprost: „karty eter — zrób je na fioletowo", „karty łabędzia
 * — niech pozostaną czarne". Kolor karty postaci bierze się z niej samej
 * (`kolorPostaci`), bo Adam poprosił, żeby każda miała inny.
 */
const KOLOR_ETER = '#7c3aed';
const KOLOR_LABEDZ = '#000000';

/** Kolor obramowania karty kompetencji — rodzina, albo ETER11/Łabędź. */
function kolorKarty(card: Card): string {
  if (card.family) return KOLOR_RODZINY[card.family] ?? KOLOR_LABEDZ;
  return card.category === 'eter11' ? KOLOR_ETER : KOLOR_LABEDZ;
}

/**
 * Karta kompetencji, talentu, mentora albo karta specjalna — dokładnie tak,
 * jak wygląda na fizycznym wydruku w „Drukuj karty". Używana też w stronie
 * „Podsumowanie techniczne" instrukcji, żeby obie zakładki pokazywały tę
 * samą kartę tym samym wyglądem — Adam poprosił wprost o „pełną wizualizację
 * każdej karty, wg tego jak wyglądają one w »drukuj karty«".
 */
export function KartaKompetencji({
  card,
  onEdit,
}: {
  card: Card;
  onEdit?: (cardName: string) => void;
}) {
  const label = card.family ? familyLabel(card.family, card.category) : undefined;
  const kolor = kolorKarty(card);
  return (
    <article
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={onEdit ? () => onEdit(card.name) : undefined}
      onKeyDown={
        onEdit
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit(card.name);
              }
            }
          : undefined
      }
      style={{ borderColor: kolor }}
      className={[
        'break-inside-avoid-page rounded-lg border-2 bg-white p-3 text-black print:rounded-none',
        onEdit ? 'cursor-pointer transition hover:opacity-80 print:cursor-auto' : '',
      ].join(' ')}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: kolor }}>
        {categoryLabel(card.category)}
        {label ? ` · ${label}` : ''}
      </p>
      <span className="mt-1 inline-block" style={{ color: kolor }}>
        <Icon name={card.icon as IconName} size={22} />
      </span>
      <p className="mt-1 font-display text-sm font-bold leading-tight">{card.name}</p>
      <p className="mt-1 text-xs leading-snug text-black/80">{card.description}</p>
    </article>
  );
}

/** Gdzie na karcie problemu siedzi która ścianka — układ zamówiony przez Adama. */
const UKLAD_SCIANEK: Record<SlotKey, string> = {
  // Psychologiczna po lewej, cyfrowa po prawej, społeczna na dole,
  // talent w lewym górnym rogu, mentor w prawym górnym.
  psychological: 'col-start-1 row-start-2',
  talent: 'col-start-1 row-start-1',
  mentor: 'col-start-3 row-start-1',
  digital: 'col-start-3 row-start-2',
  social: 'col-start-2 row-start-3',
};

/** Jedna ścianka problemu: czego wymaga i w jakim kolorze. */
function Scianka({ slot }: { slot: ProblemSlot }) {
  const kolor = KOLOR_RODZINY[slot.family] ?? '#000000';

  return (
    <div
      data-testid={`slot-${slot.key}`}
      className={`${UKLAD_SCIANEK[slot.key] ?? ''} rounded border-2 p-1 text-center`}
      style={{ borderColor: kolor, color: kolor }}
    >
      <p className="text-[8px] font-bold uppercase leading-tight">
        {categoryLabel(slot.key)}
      </p>
      <p className="text-[8px] font-bold leading-tight">
        {familyLabel(slot.family, slot.key)}
      </p>
      <p className="mt-0.5 text-[7px] leading-tight text-black/70">{slot.hint}</p>
    </div>
  );
}

/**
 * Karta problemu — większa niż kompetencja, bo musi pomieścić historię
 * i wszystkie wymagania. Adam prosił o to wprost: „może być większa
 * wielkościowo, aby pomieścić opis oraz wymagania do rozwiązania problemu".
 */
function KartaProblemu({
  problem,
  onEdit,
}: {
  problem: Problem;
  onEdit?: (problemId: string) => void;
}) {
  return (
    <article
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={onEdit ? () => onEdit(problem.id) : undefined}
      onKeyDown={
        onEdit
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit(problem.id);
              }
            }
          : undefined
      }
      className={[
        'col-span-2 break-inside-avoid-page rounded-lg border-4 border-black bg-white p-3 text-black print:rounded-none',
        onEdit ? 'cursor-pointer print:cursor-auto' : '',
      ].join(' ')}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-black/60">
        Problem
      </p>
      <div className="mt-1 flex items-center gap-2">
        <Icon name={problem.icon as IconName} size={24} />
        <p className="font-display text-base font-bold leading-tight">{problem.name}</p>
      </div>

      <p className="mt-1 text-[10px] leading-snug text-black/80">{problem.story}</p>
      <p className="mt-1 text-[10px] leading-snug">
        <strong>Cel:</strong> {problem.goal}
      </p>
      <p className="text-[10px] leading-snug">
        <strong>Przeciwnik:</strong> {problem.antagonist}
      </p>
      <p className="text-[10px] leading-snug">
        <strong>Jeśli nie rozwiążecie:</strong> {problem.consequence}
      </p>

      {/* Ścianki w układzie jak na stole: trzy kolumny, trzy wiersze,
          a w środku zostaje miejsce na odkładane karty. */}
      <div className="mt-2 grid grid-cols-3 grid-rows-3 gap-1">
        {problem.slots.map((slot) => (
          <Scianka key={slot.key} slot={slot} />
        ))}
      </div>
    </article>
  );
}

/**
 * Karty do wydruku — fizyczna talia do gry przy stole.
 *
 * Drukuje wszystko, z czego składa się gra: karty kompetencji (w tym ETER11
 * i Czarnego Łabędzia), problemy i postacie. Adam zgłosił to jako krytyczne —
 * „celem tej zakładki jest możliwość druku kart, abym fizycznie mógł
 * wydrukować i zagrać w tę grę ze wspólnikami" — a wydruk bez problemów
 * i postaci nie pozwala rozegrać partii.
 *
 * Karty robocze (`draft`) są pomijane, a kompetencje wychodzą w dwóch
 * egzemplarzach — tak samo jak buduje talię silnik gry (`buildDeck`). Inaczej
 * fizyczna talia różniłaby się od cyfrowej i test przy stole nie
 * odzwierciedlałby prawdziwego balansu.
 */
export function PrintCards({
  content,
  onEdit,
  onEditProblem,
  onEditCharacter,
}: PrintCardsProps) {
  const deck = buildDeck(playableCards(content.cards), {
    specialCopies: content.rules?.specialCardCopies,
  });
  const razem = deck.length + content.problems.length + content.characters.length;

  return (
    <section>
      {/* Ten blok znika przy druku (print:hidden) — instrukcja i przycisk są
          bez sensu na wydrukowanej stronie. */}
      <div className="print:hidden">
        <h2 className="font-display text-lg font-bold">Drukuj karty</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-dim">
          Wszystko, czego trzeba do gry na papierze: {deck.length} kart
          kompetencji, {content.problems.length} problemów
          i {content.characters.length} postaci. Karty robocze pominięte,
          kompetencje i talenty w dwóch egzemplarzach — dokładnie tak, jak
          w rozgrywce cyfrowej. Wydrukuj i potnij wzdłuż obramowania.
        </p>
        <p className="mt-1 max-w-prose text-xs text-ink-dim">
          W oknie drukowania włącz „Grafika tła" (Chrome: Więcej ustawień),
          inaczej kolory rodzin nie wyjdą na papier — a to one decydują, która
          karta pasuje do której ścianki.
        </p>
        <Button
          variant="primary"
          icon="printer"
          className="mt-3"
          onClick={() => window.print()}
        >
          Drukuj ({razem} kart)
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:mt-0 print:grid-cols-3 print:gap-3">
        {/* Problemy najpierw: przy stole rozkłada się je jako pierwsze. */}
        {content.problems.map((problem) => (
          <KartaProblemu key={problem.id} problem={problem} onEdit={onEditProblem} />
        ))}

        {/* Postacie — każdy gracz bierze jedną na start. Karta jest duża jak
            karta problemu, bo mieści pola na zbierane karty: Adam prosił, żeby
            gracz widział wprost, gdzie co odkładać. */}
        {content.characters.map((postac) => (
          <article
            key={postac.id}
            role={onEditCharacter ? 'button' : undefined}
            tabIndex={onEditCharacter ? 0 : undefined}
            onClick={onEditCharacter ? () => onEditCharacter(postac.name) : undefined}
            onKeyDown={
              onEditCharacter
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEditCharacter(postac.name);
                    }
                  }
                : undefined
            }
            style={{ borderColor: kolorPostaci(postac, content.characters) }}
            className={[
              'col-span-2 break-inside-avoid-page rounded-lg border-4 bg-white p-3 text-black print:rounded-none',
              onEditCharacter ? 'cursor-pointer print:cursor-auto' : '',
            ].join(' ')}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: kolorPostaci(postac, content.characters) }}
            >
              Postać
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span style={{ color: kolorPostaci(postac, content.characters) }}>
                <Icon name={postac.icon as IconName} size={24} />
              </span>
              <p className="font-display text-base font-bold leading-tight">{postac.name}</p>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-black/80">{postac.traits}</p>

            <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-black/50">
              Tu odkładaj zdobyte karty
            </p>
            {/* Ten sam układ co na karcie problemu — gracz uczy się go raz. */}
            <div className="mt-1 grid grid-cols-3 grid-rows-3 gap-1">
              {(Object.keys(UKLAD_SCIANEK) as SlotKey[]).map((klucz) => (
                <div
                  key={klucz}
                  data-testid={`mat-${klucz}`}
                  className={`${UKLAD_SCIANEK[klucz]} rounded border-2 border-dashed p-1 text-center`}
                  style={{
                    borderColor: kolorPostaci(postac, content.characters),
                    color: kolorPostaci(postac, content.characters),
                  }}
                >
                  <p className="text-[8px] font-bold uppercase leading-tight">
                    {categoryLabel(klucz)}
                  </p>
                </div>
              ))}
              <div className="col-start-2 row-start-2 flex items-center justify-center rounded border border-dashed border-black/30 p-1 text-center text-[7px] leading-tight text-black/50">
                karta postaci
              </div>
            </div>
          </article>
        ))}

        {deck.map((card) => (
          <KartaKompetencji key={card.id} card={card} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}
