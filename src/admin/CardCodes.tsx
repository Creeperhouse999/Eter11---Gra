import { useMemo, useState } from 'react';
import type { Card } from '../engine/types';
import { categoryLabel, familyLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';
import { ImageUpload } from './ImageUpload';
import { CATEGORY_ORDER } from '../data/categories';
import type { CardCategory, FamilyId } from '../engine/types';

interface CardCodesProps {
  cards: Card[];
  onChange: (cards: Card[]) => void;
}

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
export function CardCodes({ cards, onChange }: CardCodesProps) {
  const toast = useToast();
  const [szukaj, setSzukaj] = useState('');
  // Kod zmienia się rzadko, a pomyłka boli (grafiki są przypięte właśnie po
  // nim), więc pole odsłaniamy dopiero po kliknięciu — zamiast wystawiać je
  // obok nazwy, gdzie łatwo wpisać coś przez przypadek.
  const [edytowanyKod, setEdytowanyKod] = useState<string | null>(null);

  const widoczne = useMemo(() => {
    const fraza = szukaj.trim().toLowerCase();
    if (!fraza) return cards;
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(fraza) ||
        c.id.toLowerCase().includes(fraza) ||
        categoryLabel(c.category).toLowerCase().includes(fraza),
    );
  }, [cards, szukaj]);

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
        {widoczne.length === cards.length
          ? `${cards.length} kart`
          : `${widoczne.length} z ${cards.length} kart`}
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
          <tbody>
            {widoczne.map((card) => (
              <tr key={card.id} className="border-b border-edge/60 last:border-0">
                <td className="p-1.5">
                  <input
                    className="w-full rounded border border-edge bg-surface px-2 py-1 text-sm"
                    value={card.name}
                    aria-label={`Nazwa karty ${card.id}`}
                    onChange={(e) => zmien(card.id, { name: e.target.value })}
                  />
                  {card.draft && (
                    <span className="mt-0.5 inline-block font-mono text-[9px] uppercase text-ink-dim">
                      robocza
                    </span>
                  )}
                </td>

                <td className="p-1.5">
                  {edytowanyKod === card.id ? (
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
                      <code className="font-mono text-xs">{card.id}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="clipboard"
                        aria-label={`Kopiuj kod ${card.id}`}
                        onClick={() => void kopiuj(card.id)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="pencil"
                        aria-label={`Zmień kod ${card.id}`}
                        onClick={() => setEdytowanyKod(card.id)}
                      />
                    </span>
                  )}
                </td>

                <td className="p-1.5">
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
                </td>

                <td className="p-1.5">
                  <select
                    className="rounded border border-edge bg-surface px-1.5 py-1 text-xs"
                    value={card.family ?? ''}
                    aria-label={`Rodzina karty ${card.name}`}
                    onChange={(e) =>
                      zmien(card.id, {
                        // Pusty wybór = karta bez rodziny (specjalna): pole
                        // musi zniknąć, a nie zostać pustym napisem, bo silnik
                        // sprawdza jego OBECNOŚĆ przy dopasowaniu do ścianki.
                        family: (e.target.value || undefined) as FamilyId | undefined,
                      })
                    }
                  >
                    <option value="">— (specjalna)</option>
                    {RODZINY.map((r) => (
                      <option key={r} value={r}>
                        {familyLabel(r, card.category)}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-1.5">
                  {card.family ? (
                    <span
                      data-testid="probka-koloru"
                      title={card.family}
                      className="inline-block h-4 w-4 rounded border border-edge align-middle"
                      style={{ backgroundColor: `var(--eter-family-${card.family})` }}
                    />
                  ) : (
                    <span className="text-xs text-ink-dim">—</span>
                  )}
                </td>

                <td className="p-1.5 text-xs">
                  <ImageUpload
                    value={card.image ? [card.image] : []}
                    onChange={(urls) => zmien(card.id, { image: urls[0] })}
                    folder="cards"
                    max={1}
                    namePrefix={card.id}
                    label={`Grafika karty ${card.name}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
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
