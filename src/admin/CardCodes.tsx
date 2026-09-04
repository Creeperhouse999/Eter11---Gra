import { useMemo, useState } from 'react';
import type { Card } from '../engine/types';
import { categoryLabel, familyLabel } from '../ui/components/categoryStyles';
import { Button } from '../ui/controls/Button';
import { TextField } from '../ui/controls/Field';
import { useToast } from '../ui/controls/Toast';
import { Icon, type IconName } from '../ui/icons/Icon';

interface CardCodesProps {
  cards: Card[];
  onChange: (cards: Card[]) => void;
}

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
                  <span className="flex items-center gap-1">
                    <code className="font-mono text-xs">{card.id}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="clipboard"
                      aria-label={`Kopiuj kod ${card.id}`}
                      onClick={() => void kopiuj(card.id)}
                    />
                  </span>
                </td>

                <td className="p-1.5 text-xs">{categoryLabel(card.category)}</td>

                <td className="p-1.5 text-xs">
                  {card.family ? familyLabel(card.family, card.category) : '—'}
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
                  {card.image ? (
                    <span className="flex items-center gap-1 text-success">
                      <Icon name={'tick' as IconName} size={12} />
                      jest
                    </span>
                  ) : (
                    <span className="text-ink-dim">brak</span>
                  )}
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
