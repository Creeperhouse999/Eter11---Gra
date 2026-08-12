import { useEffect, useState } from 'react';
import { FAMILY_COLORS, FAMILY_IDS, FAMILY_LABELS } from '../data/families';
import type { BlackSwanKind, Card, CardCategory, FamilyId } from '../engine/types';
import { categoryColorVar, categoryLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { Checkbox } from '../ui/controls/Checkbox';
import { TextField } from '../ui/controls/Field';
import { Select } from '../ui/controls/Select';
import { useToast } from '../ui/controls/Toast';
import { useConfirm } from '../ui/controls/useConfirm';
import { IconPicker } from './IconPicker';
import { ImageUpload } from './ImageUpload';
import { CardView } from '../ui/components/CardView';
import { newId } from './newId';

interface CardEditorProps {
  cards: Card[];
  onChange: (cards: Card[]) => void;
  /**
   * Fraza, z którą otwiera się edytor — przekazuje ją wyszukiwarka panelu.
   *
   * Bez tego kliknięcie wyniku „Programowanie" przenosiło na pełną listę
   * kart bez wskazania, której szukać. Zgłaszający napisał wprost, że
   * wyszukiwarka „nie przechodzi do niej".
   */
  initialSearch?: string;
  /**
   * Zgłasza zmianę frazy w górę, żeby trafiła do adresu (`?filter=…`).
   * Dzięki temu link do przefiltrowanej listy da się wysłać komuś dalej.
   */
  onSearchChange?: (value: string) => void;
}

const CATEGORIES: CardCategory[] = [
  'psychological', 'digital', 'social', 'talent', 'mentor', 'eter11', 'blackswan',
];

const SWAN_KINDS: Array<[BlackSwanKind, string]> = [
  ['extraProblem', 'Dodatkowy problem'],
  ['doubleRequirements', 'Podwojone wymagania'],
  ['swapHands', 'Wymiana rąk'],
];

const FAMILY_OPTIONS = FAMILY_IDS.map((id) => ({
  value: id,
  label: FAMILY_LABELS[id],
  color: FAMILY_COLORS[id],
}));

const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  value: category,
  label: categoryLabel(category),
  color: categoryColorVar(category),
}));

/**
 * Pola, które muszą zmienić się RAZEM z kategorią, żeby karta przeszła
 * walidację: zwykła karta wymaga rodziny, Czarny Łabędź wariantu, a ETER11
 * i Czarny Łabędź nie chcą rodziny.
 *
 * Jedno źródło dla zmiany pojedynczej i hurtowej. Hurtowa liczyła samą
 * kategorię i zostawiała starą rodzinę oraz brak wariantu — karta lądowała
 * w stanie nie do zapisania, a ukryte wtedy pole rodziny pokazywało zmyślone
 * „red", więc redaktor nie miał jak jej naprawić i cały panel odmawiał zapisu.
 */
function categoryPatch(card: Card, category: CardCategory): Partial<Card> {
  const special = category === 'blackswan' || category === 'eter11';
  return {
    category,
    family: special ? undefined : (card.family ?? 'red'),
    blackSwanKind:
      category === 'blackswan' ? (card.blackSwanKind ?? 'extraProblem') : undefined,
  };
}

export function CardEditor({ cards, onChange, initialSearch = '', onSearchChange }: CardEditorProps) {
  const [filter, setFilter] = useState<CardCategory | 'all'>('all');
  const [family, setFamily] = useState<string>('all');
  const [sort, setSort] = useState<'order' | 'name' | 'category'>('order');
  const [search, setSearch] = useState(initialSearch);
  /** Karty zaznaczone do zmiany hurtem. */
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { confirm, dialog } = useConfirm();
  const toast = useToast();
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  /**
   * Wyróżnienie nowo dodanej karty gaśnie po chwili.
   *
   * Bez tego po dodaniu kilku kart świeci się kilka wierszy naraz i „nowa"
   * przestaje cokolwiek znaczyć. Timer w efekcie, a nie w handlerze, żeby
   * zniknął razem z komponentem.
   */
  useEffect(() => {
    if (!justAddedId) return;
    const timer = window.setTimeout(() => setJustAddedId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [justAddedId]);

  // Sześćdziesiąt kilka kart w jednej liście: bez szukania poprawa literówki
  // w nazwie oznacza przewijanie kilkunastu ekranów na oślep.
  const needle = search.trim().toLowerCase();

  /**
   * Szukanie po słowach, nie po całej frazie.
   *
   * „krytyczne myślenie" nie znajdowało karty „Myślenie krytyczne" — a to
   * dokładnie ten przypadek, w którym redaktor sprawdza, czy taka karta już
   * istnieje. Każde słowo musi wystąpić, ale kolejność nie ma znaczenia.
   */
  const terms = needle.split(/\s+/).filter(Boolean);

  const visible = cards
    .filter((card) => {
      if (filter !== 'all' && card.category !== filter) return false;
      if (family !== 'all' && card.family !== family) return false;
      if (terms.length === 0) return true;

      const haystack = `${card.name} ${card.description} ${card.category}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'pl');
      if (sort === 'category') {
        return (
          a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'pl')
        );
      }
      // `order` zostawia kolejność z pliku — tak, jak karty leżą w talii.
      return 0;
    });

  // Ile zaznaczonych kart wypadło poza bieżący filtr. Zmiana hurtem ruszy je
  // razem z widocznymi, więc redaktor musi o nich wiedzieć, zanim kliknie.
  const widoczneId = new Set(visible.map((card) => card.id));
  const pickedOffScreen = [...picked].filter((id) => !widoczneId.has(id)).length;

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Zmiana wspólnej cechy wielu kart naraz.
   *
   * Przestawienie rodziny dziesięciu kart to było dziesięć kliknięć
   * w dziesięciu wierszach, z przewijaniem między nimi — a przy porządkach
   * w talii to najczęstsza czynność w tym edytorze.
   */
  const updatePicked = (patch: Partial<Card>) => {
    onChange(cards.map((c) => (picked.has(c.id) ? { ...c, ...patch } : c)));
    toast(`Zmieniono ${picked.size} ${picked.size === 1 ? 'kartę' : 'kart'}.`);
  };

  /**
   * Hurtowa zmiana kategorii — każda karta dostaje własny łatek, bo rodzina
   * zależy od jej dotychczasowej. Przez `categoryPatch`, tak samo jak zmiana
   * pojedynczej karty, żeby żadna nie została w stanie nie do zapisania.
   */
  const updatePickedCategory = (category: CardCategory) => {
    onChange(
      cards.map((c) => (picked.has(c.id) ? { ...c, ...categoryPatch(c, category) } : c)),
    );
    toast(`Zmieniono ${picked.size} ${picked.size === 1 ? 'kartę' : 'kart'}.`);
  };

  const update = (id: string, patch: Partial<Card>) => {
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  /**
   * Kopia karty tuż pod oryginałem.
   *
   * Większość kart to warianty istniejących — ta sama kategoria i rodzina,
   * inna nazwa i opis. Bez tego redaktor zaczynał od pustej karty i ustawiał
   * te same cztery pola od nowa przy każdym wariancie.
   */
  const duplicate = (card: Card) => {
    const copy: Card = { ...card, id: newId('card'), name: `${card.name} (kopia)` };
    const index = cards.findIndex((c) => c.id === card.id);

    // Wstawiamy obok oryginału, nie na koniec listy: kopia dopisana na
    // sześćdziesiątej pozycji ginie z oczu i trzeba jej szukać.
    onChange([...cards.slice(0, index + 1), copy, ...cards.slice(index + 1)]);
    setJustAddedId(copy.id);
    toast('Skopiowano. Zmień nazwę i opis.');
  };

  const add = () => {
    const category: CardCategory = filter === 'all' ? 'psychological' : filter;
    // Pola zależne od kategorii idą przez `categoryPatch`, tak samo jak zmiana
    // kategorii istniejącej karty — jedno źródło reguły „karta specjalna nie ma
    // rodziny, Czarny Łabędź ma wariant". Wcześniej `add()` wpisywał na sztywno
    // `family: 'red'`, więc dodanie karty przy filtrze ETER11/Czarny Łabędź
    // tworzyło kartę-potwora (specjalną z rodziną): zapisywała się, ale liczyła
    // się jako dodatkowa kombinacja kategoria/rodzina i zaśmiecała bilans talii.
    const base: Card = {
      id: newId('card'),
      name: 'Nowa karta',
      category,
      description: '',
      icon: 'star',
      family: 'red' as FamilyId,
      draft: true,
    };
    const created: Card = { ...base, ...categoryPatch(base, category) };

    // Nowa karta trafia na początek listy. Na końcu ginęłaby poniżej
    // kilkudziesięciu pozycji i trzeba by jej szukać przewijaniem.
    onChange([created, ...cards]);
    setJustAddedId(created.id);
    toast('Dodano kartę na górze listy.');
  };

  const remove = async (id: string) => {
    const card = cards.find((c) => c.id === id);
    // Ostrzegamy, gdy karta jest ostatnią, która potrafi zamknąć swoją
    // kombinację kategorii i rodziny — bez niej ścianka byłaby nie do domknięcia.
    const lastOfKind =
      card !== undefined &&
      card.family !== undefined &&
      cards.filter((c) => c.category === card.category && c.family === card.family)
        .length === 1;

    const confirmed = await confirm({
      title: 'Usunąć kartę?',
      message: lastOfKind
        ? `„${card?.name}" to jedyna karta tej kategorii w tym kolorze. Bez niej ścianki wymagające tej kombinacji będą nie do zamknięcia — zapis zostanie odrzucony.`
        : `„${card?.name}" zniknie z talii. Zmiana wejdzie w życie po zapisaniu.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (confirmed) {
      onChange(cards.filter((c) => c.id !== id));
      toast(`Usunięto kartę „${card?.name}".`);
    }
  };

  return (
    <section>
      {dialog}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          Karty ({visible.length}
          {visible.length !== cards.length && ` z ${cards.length}`})
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <TextField
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            placeholder="Szukaj w nazwach i opisach"
            aria-label="Szukaj karty"
            className="w-full sm:w-56"
          />
          <Select
            value={filter}
            ariaLabel="Filtruj kategorię"
            className="w-full sm:w-52"
            options={[
              { value: 'all' as const, label: 'Wszystkie kategorie' },
              ...CATEGORY_OPTIONS,
            ]}
            onChange={setFilter}
          />
          <Select
            value={family}
            ariaLabel="Filtruj rodzinę"
            className="w-full sm:w-44"
            options={[
              { value: 'all', label: 'Wszystkie rodziny' },
              ...FAMILY_OPTIONS.map((option) => ({
                value: option.value as string,
                label: option.label,
              })),
            ]}
            onChange={setFamily}
          />
          <Select
            value={sort}
            ariaLabel="Sortowanie"
            className="w-full sm:w-44"
            options={[
              { value: 'order' as const, label: 'Kolejność w talii' },
              { value: 'name' as const, label: 'Alfabetycznie' },
              { value: 'category' as const, label: 'Po kategorii' },
            ]}
            onChange={setSort}
          />
          <Button icon="plus" onClick={add}>
            Dodaj kartę
          </Button>
        </div>
      </div>

      {picked.size > 0 && (
        <div className="eter-rise mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-raised p-3">
          {/* Zaznaczenie przeżywa zmianę filtra, a zmiana hurtem działa na
              WSZYSTKICH zaznaczonych — także na tych, których po przefiltrowaniu
              nie widać. Bez tej informacji redaktor zaznaczał kilkanaście kart,
              przełączał kategorię i zmieniał rodzinę „temu, co przed oczami",
              po cichu ruszając zupełnie inne karty. */}
          <span className="text-sm font-semibold text-accent">
            Zaznaczono {picked.size}
            {pickedOffScreen > 0 && (
              <span className="font-normal text-ink-dim">
                {' '}
                (w tym {pickedOffScreen} poza widokiem)
              </span>
            )}
          </span>

          <Select
            value=""
            ariaLabel="Zmień rodzinę zaznaczonym"
            className="w-full sm:w-48"
            options={[
              { value: '', label: 'Zmień rodzinę…' },
              ...FAMILY_OPTIONS.map((option) => ({
                value: option.value as string,
                label: option.label,
              })),
            ]}
            onChange={(family) => {
              if (!family) return;
              updatePicked({ family: family as Card['family'] });
            }}
          />

          <Select
            value=""
            ariaLabel="Zmień kategorię zaznaczonym"
            className="w-full sm:w-52"
            options={[{ value: '', label: 'Zmień kategorię…' }, ...CATEGORY_OPTIONS]}
            onChange={(category) => {
              if (!category) return;
              updatePickedCategory(category as Card['category']);
            }}
          />

          <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>
            Odznacz
          </Button>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {visible.map((card) => (
          <li
            key={card.id}
            className={[
              'eter-rise rounded-lg border-l-4 border bg-surface p-3 transition',
              card.id === justAddedId ? 'border-accent' : 'border-edge',
            ].join(' ')}
            style={{ borderLeftColor: categoryColorVar(card.category) }}
          >
            <div className="grid gap-2 sm:grid-cols-[auto_9rem_1fr_10rem_auto]">
              <label className="flex items-start pt-2">
                <input
                  type="checkbox"
                  checked={picked.has(card.id)}
                  onChange={() => toggle(card.id)}
                  aria-label={`Zaznacz kartę ${card.name}`}
                  className="h-4 w-4 accent-[var(--eter-accent)]"
                />
              </label>
              <IconPicker
                value={card.icon}
                label=""
                onChange={(icon) => update(card.id, { icon })}
              />
              <TextField
                value={card.name}
                onChange={(e) => update(card.id, { name: e.target.value })}
                aria-label={`Nazwa karty ${card.name}`}
              />
              <Select
                value={card.category}
                ariaLabel={`Kategoria karty ${card.name}`}
                options={CATEGORY_OPTIONS}
                onChange={(category) => {
                  // Zmiana kategorii musi doprowadzić kartę do stanu, który
                  // przejdzie walidację — przez `categoryPatch`, tak samo jak
                  // zmiana hurtem.
                  update(card.id, categoryPatch(card, category));
                }}
              />
              <div className="flex gap-1 self-start">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="plus"
                  aria-label={`Skopiuj kartę ${card.name}`}
                  onClick={() => duplicate(card)}
                >
                  Kopiuj
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  onClick={() => remove(card.id)}
                  className="text-danger"
                >
                  Usuń
                </Button>
              </div>
            </div>

            <div className="mt-2 flex items-start gap-3">
              <TextField
                value={card.description}
                onChange={(e) => update(card.id, { description: e.target.value })}
                placeholder="Opis karty"
                aria-label={`Opis karty ${card.name}`}
                className="min-w-0 flex-1"
              />

              {/* Podgląd tej samej karty, którą zobaczy dziecko.
                  Formularz nie mówi, czy nazwa się zmieści ani jak wygląda
                  opis na 112 px — redaktor pisał w ciemno i sprawdzał efekt
                  dopiero w grze, po zapisie. */}
              <div className="hidden shrink-0 lg:block">
                <CardView card={card} />
              </div>
            </div>

            {/* Grafika karty: w grze pokazuje się jako awers, klik odwraca na
                zwykły widok z nazwą i opisem. Jedna na kartę. */}
            <div className="mt-2">
              <ImageUpload
                label="Grafika karty (opcjonalnie)"
                folder="cards"
                max={1}
                namePrefix={`card-${card.id}`}
                value={card.image ? [card.image] : []}
                onChange={(urls) => update(card.id, { image: urls[0] })}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-4">
              {/* Rodzina zależy od kategorii, nie od tego, czy karta już ją
                  ma. Wcześniej pole pokazywało się tylko przy ustawionej
                  rodzinie — karta zmieniona z Czarnego Łabędzia na zwykłą
                  nie miała jak jej dostać, a walidacja blokowała zapis
                  całego panelu bez możliwości poprawy. */}
              {card.category !== 'blackswan' && card.category !== 'eter11' && (
                <Select
                  value={card.family ?? 'red'}
                  label="Rodzina"
                  className="w-full sm:w-44"
                  options={FAMILY_OPTIONS}
                  onChange={(family) => update(card.id, { family })}
                />
              )}

              {card.category === 'blackswan' && (
                <Select
                  value={card.blackSwanKind ?? 'extraProblem'}
                  label="Wariant"
                  className="w-full sm:w-56"
                  options={SWAN_KINDS.map(([kind, label]) => ({ value: kind, label }))}
                  onChange={(blackSwanKind) => update(card.id, { blackSwanKind })}
                />
              )}

              <Checkbox
                checked={Boolean(card.draft)}
                onChange={(draft) => update(card.id, { draft })}
              >
                Wymaga weryfikacji merytorycznej
              </Checkbox>

            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
