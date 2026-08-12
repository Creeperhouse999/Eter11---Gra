import { useEffect, useState } from 'react';
import { watchTeam } from '../firebase/roles';

/**
 * Kolory i podpisy zespołu, wspólne dla całego panelu.
 *
 * Awatar stoi w wątkach, w pamięci, w ogłoszeniach i w dzwonku — wszędzie tam
 * zna tylko podpis („Adam"), a kolor ustawiony przy członku siedzi w bazie.
 * Bez tego mostu każde z tych miejsc rysowało kolor wyliczony z imienia, więc
 * ta sama osoba miała jeden kolor w zakładce zespołu i inny w rozmowie.
 *
 * Nasłuch jest jeden na cały panel: `watchTeam` woła Firestore, a moduł trzyma
 * wynik i rozdaje go wszystkim awatarom. Inaczej każdy awatar w wątku
 * otwierałby własne połączenie.
 */
type Entry = { name?: string; email: string; color?: string };

let members: Entry[] = [];
let stop: (() => void) | null = null;
const listeners = new Set<(value: Entry[]) => void>();

function start(): void {
  if (stop) return;
  stop = watchTeam((next) => {
    members = next.map((member) => ({
      name: member.name,
      email: member.email,
      color: member.color,
    }));
    listeners.forEach((listener) => listener(members));
  });
}

/** Podpis → kolor nadany przy członku zespołu; `undefined`, gdy nie nadano. */
export function colorForAuthor(author: string, team: Entry[]): string | undefined {
  const wanted = author.trim().toLowerCase();
  if (!wanted) return undefined;

  const hit = team.find((member) => {
    if (member.name?.trim().toLowerCase() === wanted) return true;
    if (member.email.trim().toLowerCase() === wanted) return true;
    // Podpis bywa adresem e-mail albo samą jego częścią przed małpą — wpisy
    // sprzed ujednolicenia imion wyglądają właśnie tak.
    return member.email.split('@')[0].toLowerCase() === wanted;
  });
  return hit?.color;
}

/**
 * Lista zespołu na potrzeby awatarów. Współdzielona: pierwszy komponent
 * uruchamia nasłuch, kolejne dostają gotowy wynik.
 */
export function useTeamColors(): Entry[] {
  const [value, setValue] = useState<Entry[]>(members);

  useEffect(() => {
    start();
    listeners.add(setValue);
    // Pierwszy render po zamontowaniu dostaje to, co już wiadomo.
    setValue(members);
    return () => {
      listeners.delete(setValue);
    };
  }, []);

  return value;
}
