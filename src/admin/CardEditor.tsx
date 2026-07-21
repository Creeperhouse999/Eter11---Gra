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
import { CardView } from '../ui/components/CardView';
import { newId } from './newId';

interface CardEditorProps {
  cards: Card[];
  onChange: (cards: Card[]) => void;
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

export function CardEditor({ cards, onChange }: CardEditorProps) {
  const [filter, setFilter] = useState<CardCategory | 'all'>('all');
  const [family, setFamily] = useState<string>('all');
  const [sort, setSort] = useState<'order' | 'name' | 'category'>('order');
  const [search, setSearch] = useState('');
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
    const created: Card = {
      id: newId('card'),
      name: 'Nowa karta',
      category,
      description: '',
      icon: 'star',
      family: 'red' as FamilyId,
      draft: true,
      ...(category === 'blackswan' ? { blackSwanKind: 'extraProblem' as BlackSwanKind } : {}),
    };

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
            onChange={(e) => setSearch(e.target.value)}
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
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr_10rem_auto]">
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
                  // przejdzie walidację: zwykła karta wymaga rodziny, Czarny
                  // Łabędź wariantu, a ETER11 nie chce ani jednego, ani drugiego.
                  const special = category === 'blackswan' || category === 'eter11';
                  update(card.id, {
                    category,
                    family: special ? undefined : (card.family ?? 'red'),
                    blackSwanKind:
                      category === 'blackswan'
                        ? (card.blackSwanKind ?? 'extraProblem')
                        : undefined,
                  });
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
