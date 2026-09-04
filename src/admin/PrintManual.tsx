import { useState } from 'react';
import { playableCards } from '../data/cards';
import {
  INTRO_STORY,
  INTRO_STORY_GOOD,
  INTRO_RULES,
  INTRO_FOR_ADULTS,
  INTRO_BOX,
  INTRO_FAQ,
  NARRATIVE_LABELS,
  type NarrativeVariant,
} from '../data/intro';
import type { GameContent } from '../firebase/validate';
import { categoryLabel, familyLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { Icon, type IconName } from '../ui/icons/Icon';

interface PrintManualProps {
  content: GameContent;
}

/** Kolory rodzin — te same, co na wydruku kart (zmienne CSS nie idą na papier). */
const KOLOR_RODZINY: Record<string, string> = {
  red: '#d92626',
  blue: '#1f6fd0',
  yellow: '#c98a00',
  green: '#1f9d4d',
};

/** Strona wydruku — każda zaczyna się od nowej kartki. */
function Strona({
  numer,
  tytul,
  children,
}: {
  numer: number;
  tytul: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mb-6 break-after-page rounded-lg border-2 border-black bg-white p-6 text-black print:mb-0 print:rounded-none print:border-0 print:p-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-black/50">
        Strona {numer}
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold leading-tight">{tytul}</h2>
      <div className="mt-3">{children}</div>
    </article>
  );
}

/** Miniatura karty — instrukcja tłumaczy zasady, pokazując prawdziwą kartę. */
function Miniatura({
  nazwa,
  opis,
  kategoria,
  rodzina,
  ikona,
}: {
  nazwa: string;
  opis: string;
  kategoria: string;
  rodzina?: string;
  ikona: string;
}) {
  const kolor = rodzina ? KOLOR_RODZINY[rodzina] ?? '#000000' : '#000000';
  return (
    <div
      className="inline-block w-40 rounded border-2 p-2 align-top"
      style={{ borderColor: kolor }}
    >
      <p className="text-[8px] font-bold uppercase" style={{ color: kolor }}>
        {kategoria}
        {rodzina ? ` · ${rodzina}` : ''}
      </p>
      <span className="mt-0.5 inline-block" style={{ color: kolor }}>
        <Icon name={ikona as IconName} size={18} />
      </span>
      <p className="mt-0.5 text-xs font-bold leading-tight">{nazwa}</p>
      <p className="mt-0.5 text-[9px] leading-tight text-black/70">{opis}</p>
    </div>
  );
}

/**
 * Instrukcja do wydruku — pięć stron dla pięciu różnych czytelników.
 *
 * Adam zgłosił to jako krytyczne razem z wydrukiem kart: chce zagrać przy
 * stole, a do tego potrzebna jest instrukcja na papierze. Alan dopisał przy
 * każdej stronie „to też edytowalne w panelu", dlatego treść bierze się
 * z zawartości gry (zakładki „Wstęp i ETER11", „Zasady", „Karty"), nie
 * z tekstu wpisanego tutaj — inaczej pierwsza poprawka wymagałaby wdrożenia.
 *
 * Liczby też są liczone, nie przepisane: próg wygranej, liczba rund i kart
 * idą z zasad, więc wydrukowana kartka nie zacznie kłamać po zmianie
 * ustawień w panelu.
 */
export function PrintManual({ content }: PrintManualProps) {
  // Którą narrację drukujemy. Adam chce porównać obie na żywych graczach,
  // więc wybór jest przy wydruku, a nie zaszyty w treści gry.
  const [narracja, setNarracja] = useState<NarrativeVariant>('dark');

  // Wersja z panelu ma pierwszeństwo tylko dla narracji „Zły 2111" —
  // redaktor edytuje właśnie ją w zakładce „Wstęp i ETER11". Druga wersja
  // istnieje na razie po to, żeby ją z pierwszą porównać.
  const story =
    narracja === 'bright'
      ? INTRO_STORY_GOOD
      : content.intro?.story?.length
        ? content.intro.story
        : INTRO_STORY;
  const rules = content.intro?.rules?.length ? content.intro.rules : INTRO_RULES;
  const adults = content.intro?.adults?.length ? content.intro.adults : INTRO_FOR_ADULTS;
  // Strony 2 i 5 miałem wpisane wprost w tym komponencie — Adam poprosił
  // o „możliwość edycji każdej strony", więc idą z treści jak reszta.
  const box = content.intro?.box?.length ? content.intro.box : INTRO_BOX;
  const faq = content.intro?.faq?.length ? content.intro.faq : INTRO_FAQ;

  const grywalne = playableCards(content.cards);
  const przyklad = grywalne.find((c) => c.family) ?? grywalne[0];
  const eter = grywalne.find((c) => c.category === 'eter11');
  const labedz = grywalne.find((c) => c.category === 'blackswan');
  const problem = content.problems[0];
  const zasady = content.rules;

  return (
    <section>
      <div className="print:hidden">
        <h2 className="font-display text-lg font-bold">Drukuj instrukcję</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-dim">
          Pięć stron do wydruku: opowieść wciągająca w świat gry, krótki opis
          dla dziecka, opis dla rodzica, instrukcja krok po kroku z pokazanymi
          kartami i pytania z odpowiedziami. Treść bierze się z zakładek
          „Wstęp i ETER11" oraz „Zasady" — popraw ją tam, a wydruk pójdzie za
          zmianą.
        </p>
        <p className="mt-1 max-w-prose text-xs text-ink-dim">
          W oknie drukowania włącz „Grafika tła", inaczej kolory rodzin nie
          wyjdą na papier.
        </p>
        {/* Wybór narracji. Adam poprosił o dwie wersje pierwszej strony, żeby
            sprawdzić na żywych graczach, która lepiej trafia — więc obie
            trzeba móc wydrukować i porównać na papierze. */}
        <div className="mt-3">
          <span className="eter-label">Narracja na pierwszej stronie</span>
          <div className="mt-1 inline-flex rounded-lg border border-edge p-0.5" role="tablist">
            {(['dark', 'bright'] as NarrativeVariant[]).map((wariant) => (
              <button
                key={wariant}
                type="button"
                role="tab"
                aria-selected={narracja === wariant}
                onClick={() => setNarracja(wariant)}
                className={[
                  'rounded-md px-3 py-1.5 text-sm transition',
                  narracja === wariant
                    ? 'bg-accent font-semibold text-bg'
                    : 'text-ink-dim hover:text-ink',
                ].join(' ')}
              >
                {NARRATIVE_LABELS[wariant]}
              </button>
            ))}
          </div>
          <p className="mt-1 max-w-prose text-xs text-ink-dim">
            {narracja === 'dark'
              ? 'ETER11 przybywa ze zniszczonej przyszłości i prosi o pomoc.'
              : 'ETER11 przybywa z przyszłości, której się udało, i przychodzi nauczyć, jak to zrobić.'}
          </p>
        </div>

        <Button
          variant="primary"
          icon="printer"
          className="mt-3"
          onClick={() => window.print()}
        >
          Drukuj instrukcję (5 stron)
        </Button>
      </div>

      <div className="mt-4 print:mt-0">
        {/* 1 — narracja. Adam prosił, żeby czytało się jak prolog książki. */}
        <Strona
          numer={1}
          tytul={
            // Tytuł idzie za wybraną narracją: „potrzebują was" pasuje do
            // świata w ruinie, nie do takiego, któremu się udało.
            narracja === 'bright'
              ? 'Świat, który pokazuje wam drogę'
              : 'Świat, w którym potrzebują właśnie was'
          }
        >
          {story.map((scena, i) => (
            <div key={i} className="mb-3">
              <h3 className="font-display text-base font-bold">{scena.heading}</h3>
              {scena.body.split('\n\n').map((akapit, j) => (
                <p key={j} className="mt-1 text-sm leading-relaxed">
                  {akapit}
                </p>
              ))}
            </div>
          ))}
        </Strona>

        {/* 2 — krótko dla dziecka, w sam raz na tył pudełka. */}
        <Strona numer={2} tytul="Co to za gra?">
          {box.map((scena, i) => (
            <div key={i} className="mb-3">
              <h3 className="font-display text-base font-bold">{scena.heading}</h3>
              {scena.body.split('\n\n').map((akapit, j) => (
                <p key={j} className="mt-1 text-sm leading-relaxed">
                  {akapit}
                </p>
              ))}
            </div>
          ))}
        </Strona>

        {/* 3 — dla rodzica: co gra ćwiczy. Bierze z części „Dla dorosłych". */}
        <Strona numer={3} tytul="Dla rodziców i nauczycieli">
          {adults.map((scena, i) => (
            <div key={i} className="mb-3">
              <h3 className="font-display text-base font-bold">{scena.heading}</h3>
              {scena.body.split('\n\n').map((akapit, j) => (
                <p key={j} className="mt-1 text-sm leading-relaxed">
                  {akapit}
                </p>
              ))}
            </div>
          ))}
        </Strona>

        {/* 4 — instrukcja krok po kroku, z pokazanymi kartami. */}
        <Strona numer={4} tytul="Jak grać — krok po kroku">
          {rules.map((scena, i) => (
            <div key={i} className="mb-2">
              <h3 className="font-display text-sm font-bold">{scena.heading}</h3>
              <p className="mt-0.5 text-sm leading-snug">{scena.body}</p>
            </div>
          ))}

          <h3 className="mt-4 font-display text-sm font-bold">Czym są karty</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {przyklad && (
              <Miniatura
                nazwa={przyklad.name}
                opis={przyklad.description}
                kategoria={categoryLabel(przyklad.category)}
                rodzina={
                  przyklad.family
                    ? familyLabel(przyklad.family, przyklad.category)
                    : undefined
                }
                ikona={przyklad.icon}
              />
            )}
            {eter && (
              <Miniatura
                nazwa={eter.name}
                opis={eter.description}
                kategoria={categoryLabel(eter.category)}
                ikona={eter.icon}
              />
            )}
            {labedz && (
              <Miniatura
                nazwa={labedz.name}
                opis={labedz.description}
                kategoria={categoryLabel(labedz.category)}
                ikona={labedz.icon}
              />
            )}
          </div>

          <p className="mt-2 text-sm leading-snug">
            <strong>Karta kompetencji</strong> ma kategorię (np.{' '}
            {categoryLabel('psychological')}) i kolor rodziny. Pasuje tylko
            tam, gdzie zgadza się jedno i drugie —{' '}
            <strong>sam kolor nie wystarczy</strong>.
          </p>
          <p className="mt-1 text-sm leading-snug">
            <strong>ETER11</strong> to karta-dżoker: pasuje do każdego
            wymagania, więc trzymajcie ją na ciężki moment.
          </p>
          <p className="mt-1 text-sm leading-snug">
            <strong>Czarny Łabędź</strong> to niespodzianka — zdarzenie, którego
            nikt nie planował. Wchodzi na stół i zmienia sytuację.
          </p>

          {problem && (
            <>
              <h3 className="mt-4 font-display text-sm font-bold">
                Jak rozłożyć karty na stole
              </h3>
              <p className="mt-1 text-sm leading-snug">
                Kartę problemu kładziecie na środku. Wokół niej są miejsca na
                karty — każde z własnym wymaganiem. Na przykładzie problemu
                „{problem.name}":
              </p>
              <div className="mt-2 grid max-w-md grid-cols-3 grid-rows-3 gap-1">
                {problem.slots.map((slot) => (
                  <div
                    key={slot.key}
                    className={[
                      'rounded border-2 p-1 text-center text-[8px] leading-tight',
                      slot.key === 'talent' ? 'col-start-1 row-start-1' : '',
                      slot.key === 'mentor' ? 'col-start-3 row-start-1' : '',
                      slot.key === 'psychological' ? 'col-start-1 row-start-2' : '',
                      slot.key === 'digital' ? 'col-start-3 row-start-2' : '',
                      slot.key === 'social' ? 'col-start-2 row-start-3' : '',
                    ].join(' ')}
                    style={{
                      borderColor: KOLOR_RODZINY[slot.family] ?? '#000',
                      color: KOLOR_RODZINY[slot.family] ?? '#000',
                    }}
                  >
                    <p className="font-bold uppercase">{categoryLabel(slot.key)}</p>
                    <p className="font-bold">{familyLabel(slot.family, slot.key)}</p>
                  </div>
                ))}
                <div className="col-start-2 row-start-2 flex items-center justify-center rounded border-2 border-dashed border-black/40 p-1 text-center text-[8px] leading-tight">
                  karta problemu
                </div>
              </div>
              <p className="mt-1 text-sm leading-snug">
                Kolejność jest zawsze ta sama: talent po lewej u góry, mentor po
                prawej u góry, {categoryLabel('psychological')} po lewej,{' '}
                {categoryLabel('digital')} po prawej, {categoryLabel('social')} na
                dole.
              </p>
            </>
          )}

          <h3 className="mt-4 font-display text-sm font-bold">
            Co po każdej rundzie
          </h3>
          <p className="mt-1 text-sm leading-snug">
            Po zagraniu karty dobieracie nową, żeby wrócić do{' '}
            {zasady.handSize} kart na ręce (najwyżej {zasady.maxHandSize}).
            Kto nie ma czym zagrać, pasuje. Runda kończy się, gdy wszyscy
            zagrali albo spasowali. Macie {zasady.roundsPerMission} rund na
            jeden problem — gdy się skończą, problem zostaje nierozwiązany
            i przechodzicie do następnego.
          </p>
        </Strona>

        {/* 5 — FAQ. */}
        <Strona numer={5} tytul="Pytania, które pewnie zadacie">
          {faq.map((wpis, i) => (
            <div key={i} className="mb-2">
              {/* Nagłówek to pytanie, treść to odpowiedź — tak redaguje się je
                  w panelu, w zakładce „Wstęp i ETER11". */}
              <h3 className="font-display text-sm font-bold">{wpis.heading}</h3>
              <p className="mt-0.5 text-sm leading-snug">{wpis.body}</p>
            </div>
          ))}
        </Strona>
      </div>
    </section>
  );
}
