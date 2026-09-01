import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from './client';
import type { GameContent } from './validate';

/**
 * Presety — zapisane warianty sekcji treści.
 *
 * Pomysł Alana: zamiast trzymać „trzy style" w głowie albo w cudzej gałęzi,
 * zapisujesz je pod nazwą i wczytujesz jednym kliknięciem. Preset obejmuje
 * CAŁĄ sekcję (wszystkie karty, cały motyw), bo częściowy zostawiałby pytanie
 * „co właściwie jest w środku" przy każdym wczytaniu.
 *
 * Preset całej apki nie kopiuje treści, tylko WSKAZUJE presety sekcji — więc
 * poprawka w presecie kolorów przechodzi na wszystkie zestawy, które go
 * używają. Alan nazwał to wprost: „preset całej apki, który zawiera podłączone
 * presety każdej kategorii".
 *
 * Kto: zapisuje każdy redaktor (własny wariant to jego praca), wczytuje admin
 * i co-admin — wczytanie podmienia treść całemu zespołowi naraz.
 */

const SECTIONS = 'presets';
const BUNDLES = 'presetBundles';

/** Sekcje, dla których preset ma sens — czyli te z treścią do podmiany. */
export const PRESET_SECTIONS = [
  'cards',
  'problems',
  'characters',
  'rules',
  'text',
  'theme',
  'families',
  'categories',
] as const;

export type PresetSection = (typeof PRESET_SECTIONS)[number];

export const SECTION_LABELS: Record<PresetSection, string> = {
  cards: 'Karty',
  problems: 'Problemy',
  characters: 'Postacie',
  rules: 'Zasady',
  text: 'Teksty',
  theme: 'Kolory',
  families: 'Rodziny',
  categories: 'Kategorie',
};

export interface Preset {
  id: string;
  section: PresetSection;
  name: string;
  author: string;
  createdAt: string;
  /** Zawartość sekcji — kształt zależy od `section`. */
  data: unknown;
}

/** Preset całej apki: nazwa plus wskazania na presety sekcji. */
export interface PresetBundle {
  id: string;
  name: string;
  author: string;
  createdAt: string;
  /** Sekcja → id presetu. Sekcje pominięte zostają bez zmian. */
  parts: Partial<Record<PresetSection, string>>;
}

export const MAX_NAME = 60;

/** Wycina z treści to, co należy do danej sekcji. */
export function sectionData(content: GameContent, section: PresetSection): unknown {
  // `theme` bierze oba warianty naraz: jasny i ciemny to jeden wygląd, a nie
  // dwa niezależne — preset „ciemny bez jasnego" dałby po wczytaniu zestaw
  // rozjechany w połowie.
  if (section === 'theme') {
    return { theme: content.theme, themeLight: content.themeLight };
  }
  return content[section];
}

/** Wkłada zawartość presetu z powrotem do treści. */
export function applySection(
  content: GameContent,
  section: PresetSection,
  data: unknown,
): GameContent {
  if (section === 'theme') {
    const oba = data as { theme?: unknown; themeLight?: unknown };
    return {
      ...content,
      theme: (oba.theme ?? content.theme) as GameContent['theme'],
      themeLight: (oba.themeLight ?? content.themeLight) as GameContent['themeLight'],
    };
  }
  return { ...content, [section]: data } as GameContent;
}

export async function savePreset(input: {
  section: PresetSection;
  name: string;
  author: string;
  content: GameContent;
  /** Id istniejącego presetu — wtedy nadpisujemy zamiast dokładać kolejny. */
  overwriteId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Nazwij preset — bez nazwy nikt go nie odnajdzie.' };
  if (name.length > MAX_NAME) {
    return { ok: false, error: `Nazwa ma ${name.length} znaków, a mieści się ${MAX_NAME}.` };
  }

  const dane = {
    section: input.section,
    name,
    author: input.author.trim(),
    createdAt: new Date().toISOString(),
    data: sectionData(input.content, input.section),
  };

  try {
    if (input.overwriteId) {
      await setDoc(doc(db, SECTIONS, input.overwriteId), dane);
    } else {
      await addDoc(collection(db, SECTIONS), dane);
    }
    return { ok: true };
  } catch (error) {
    console.error('Nie udało się zapisać presetu:', error);
    return { ok: false, error: 'Nie udało się zapisać presetu.' };
  }
}

export async function removePreset(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, SECTIONS, id));
    return { ok: true };
  } catch (error) {
    console.error('Nie udało się usunąć presetu:', error);
    return { ok: false, error: 'Nie udało się usunąć presetu.' };
  }
}

export function watchPresets(onChange: (presets: Preset[]) => void): () => void {
  return onSnapshot(
    query(collection(db, SECTIONS), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<Preset, 'id'>;
          return {
            id: entry.id,
            section: data.section,
            name: data.name ?? '',
            author: data.author ?? '',
            createdAt: data.createdAt ?? '',
            data: data.data,
          };
        }),
      );
    },
    (error) => {
      console.error('Podgląd presetów nie działa:', error);
      onChange([]);
    },
  );
}

export async function saveBundle(input: {
  name: string;
  author: string;
  parts: Partial<Record<PresetSection, string>>;
  overwriteId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Nazwij zestaw.' };
  if (name.length > MAX_NAME) {
    return { ok: false, error: `Nazwa ma ${name.length} znaków, a mieści się ${MAX_NAME}.` };
  }
  if (Object.keys(input.parts).length === 0) {
    return { ok: false, error: 'Wybierz co najmniej jeden preset do zestawu.' };
  }

  const dane = {
    name,
    author: input.author.trim(),
    createdAt: new Date().toISOString(),
    parts: input.parts,
  };

  try {
    if (input.overwriteId) {
      await setDoc(doc(db, BUNDLES, input.overwriteId), dane);
    } else {
      await addDoc(collection(db, BUNDLES), dane);
    }
    return { ok: true };
  } catch (error) {
    console.error('Nie udało się zapisać zestawu:', error);
    return { ok: false, error: 'Nie udało się zapisać zestawu.' };
  }
}

export async function removeBundle(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, BUNDLES, id));
    return { ok: true };
  } catch (error) {
    console.error('Nie udało się usunąć zestawu:', error);
    return { ok: false, error: 'Nie udało się usunąć zestawu.' };
  }
}

export function watchBundles(onChange: (bundles: PresetBundle[]) => void): () => void {
  return onSnapshot(
    query(collection(db, BUNDLES), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data() as Omit<PresetBundle, 'id'>;
          return {
            id: entry.id,
            name: data.name ?? '',
            author: data.author ?? '',
            createdAt: data.createdAt ?? '',
            parts: data.parts ?? {},
          };
        }),
      );
    },
    (error) => {
      console.error('Podgląd zestawów nie działa:', error);
      onChange([]);
    },
  );
}

/**
 * Składa treść z zestawu.
 *
 * Zestaw wskazuje presety, więc bierzemy ich AKTUALNĄ zawartość — poprawka
 * w presecie kolorów przechodzi na każdy zestaw, który go używa. Preset, który
 * w międzyczasie skasowano, pomijamy: sekcja zostaje wtedy bez zmian, zamiast
 * wywracać całe wczytanie.
 */
export function applyBundle(
  content: GameContent,
  bundle: PresetBundle,
  presets: Preset[],
): { content: GameContent; missing: PresetSection[] } {
  let wynik = content;
  const missing: PresetSection[] = [];

  for (const [section, presetId] of Object.entries(bundle.parts) as Array<
    [PresetSection, string]
  >) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) {
      missing.push(section);
      continue;
    }
    wynik = applySection(wynik, section, preset.data);
  }

  return { content: wynik, missing };
}
