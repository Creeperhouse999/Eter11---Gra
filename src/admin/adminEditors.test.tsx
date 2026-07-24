import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen, fireEvent, within, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToastProvider } from '../ui/controls/Toast';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
import { DEFAULT_FAMILIES } from '../data/families';
import { DEFAULT_THEME } from '../data/theme';
import { DEFAULT_UI_TEXT } from '../data/uiText';
import { DEFAULT_CONFIG } from '../engine/reducer';
import type { GameContent } from '../firebase/validate';
import { CardEditor } from './CardEditor';
import { CharacterEditor } from './CharacterEditor';
import { DeckOverview } from './DeckOverview';
import { RulesEditor } from './RulesEditor';
import { TextEditor } from './TextEditor';
import { ThemeEditor } from './ThemeEditor';

/** Komponenty panelu korzystają z useToast — wymagają providera. */
const render = (ui: ReactElement) => rtlRender(<ToastProvider>{ui}</ToastProvider>);

const content = (): GameContent => ({
  cards: structuredClone(ALL_CARDS),
  problems: structuredClone(ALL_PROBLEMS),
  characters: structuredClone(ALL_CHARACTERS),
  rules: { ...DEFAULT_CONFIG },
  text: { ...DEFAULT_UI_TEXT },
  theme: { ...DEFAULT_THEME },
  families: structuredClone(DEFAULT_FAMILIES),
});

describe('RulesEditor', () => {
  it('zmiana liczby rund wywołuje onChange z nową wartością', () => {
    const onChange = vi.fn();
    render(<RulesEditor rules={DEFAULT_CONFIG} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Rundy na misję/), { target: { value: '10' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ roundsPerMission: 10 }),
    );
  });

  it('ostrzega, gdy gry nie da się wygrać', () => {
    render(
      <RulesEditor
        rules={{ ...DEFAULT_CONFIG, teamWinThreshold: 10, missionsPerGame: 5 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('nie da się wygrać');
  });

  it('nie ostrzega przy poprawnych wartościach', () => {
    render(<RulesEditor rules={DEFAULT_CONFIG} onChange={vi.fn()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('CharacterEditor', () => {
  it('dodaje nową postać', () => {
    const onChange = vi.fn();
    render(<CharacterEditor characters={ALL_CHARACTERS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj postać' }));
    expect(onChange.mock.calls[0][0]).toHaveLength(ALL_CHARACTERS.length + 1);
  });

  it('nowa postać ma id niekolidujące z istniejącymi', () => {
    // Regresja: id z Date.now() dawało duplikat przy dwóch dodaniach w tej
    // samej milisekundzie, przez co dwie postacie zlewały się w jedną.
    const onChange = vi.fn();
    render(<CharacterEditor characters={ALL_CHARACTERS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj postać' }));
    const next = onChange.mock.calls[0][0];
    const ids = next.map((c: { id: string }) => c.id);
    expect(new Set(ids).size, 'wszystkie id unikalne').toBe(ids.length);
  });

  it('blokuje usunięcie, gdy zostałaby mniej niż jedna para postaci', async () => {
    const onChange = vi.fn();
    render(<CharacterEditor characters={ALL_CHARACTERS.slice(0, 2)} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń' })[0]);
    expect(await screen.findByText(/co najmniej dwie postacie/)).toBeDefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('usuwa postać po potwierdzeniu w oknie', async () => {
    const onChange = vi.fn();
    render(<CharacterEditor characters={ALL_CHARACTERS} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń' })[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Usunąć postać?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń' }));

    await waitFor(() =>
      expect(onChange.mock.calls[0][0]).toHaveLength(ALL_CHARACTERS.length - 1),
    );
  });

  it('anulowanie w oknie nie usuwa postaci', async () => {
    const onChange = vi.fn();
    render(<CharacterEditor characters={ALL_CHARACTERS} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń' })[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Usunąć postać?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Anuluj' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('zmienia nazwę postaci', () => {
    const onChange = vi.fn();
    const characters = structuredClone(ALL_CHARACTERS);
    render(<CharacterEditor characters={characters} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(`Nazwa postaci ${characters[0].name}`), {
      target: { value: 'Zmieniona' },
    });
    expect(onChange.mock.calls[0][0][0].name).toBe('Zmieniona');
  });
});

describe('CardEditor', () => {
  it('filtruje karty po kategorii', async () => {
    render(
      <CardEditor cards={ALL_CARDS} onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filtruj kategorię' }));

    const list = await screen.findByRole('listbox', { name: 'Filtruj kategorię' });
    fireEvent.click(within(list).getByRole('option', { name: /Mentor/ }));

    const mentorCount = ALL_CARDS.filter((c) => c.category === 'mentor').length;
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(
        `${mentorCount} z ${ALL_CARDS.length}`,
      ),
    );
  });

  it('lista kategorii obsługuje klawiaturę', async () => {
    render(
      <CardEditor cards={ALL_CARDS} onChange={vi.fn()} />,
    );
    const trigger = screen.getByRole('button', { name: 'Filtruj kategorię' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(await screen.findByRole('listbox', { name: 'Filtruj kategorię' })).toBeDefined();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });

  
  });

describe('TextEditor', () => {
  it('zmiana tytułu gry wywołuje onChange', () => {
    const onChange = vi.fn();
    render(<TextEditor text={DEFAULT_UI_TEXT} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Tytuł gry'), { target: { value: 'ETER22' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gameTitle: 'ETER22' }));
  });
});

describe('ThemeEditor', () => {
  it('pokazuje kontrast tekstu', () => {
    render(<ThemeEditor theme={DEFAULT_THEME} onChange={vi.fn()} />);
    expect(screen.getByText(/Kontrast tekstu głównego/)).toBeDefined();
  });

  it('zmiana koloru wywołuje onChange', async () => {
    const onChange = vi.fn();
    render(<ThemeEditor theme={DEFAULT_THEME} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Akcent główny/ }));
    fireEvent.change(await screen.findByLabelText('Kod koloru'), {
      target: { value: '#ff0000' },
    });

    // Sygnatura: onChange(mode, colors). Domyślnie edytujemy tryb ciemny.
    expect(onChange).toHaveBeenCalledWith(
      'dark',
      expect.objectContaining({ accent: '#ff0000' }),
    );
  });

  it('po przełączeniu na jasny edytuje tryb jasny', async () => {
    const onChange = vi.fn();
    render(<ThemeEditor theme={DEFAULT_THEME} onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /Jasny/ }));
    fireEvent.click(screen.getByRole('button', { name: /Akcent główny/ }));
    fireEvent.change(await screen.findByLabelText('Kod koloru'), {
      target: { value: '#00ff00' },
    });

    expect(onChange).toHaveBeenCalledWith(
      'light',
      expect.objectContaining({ accent: '#00ff00' }),
    );
  });

  it('ostrzega o zbyt niskim kontraście', () => {
    // Tekst prawie w kolorze tła — nieczytelny dla dziecka.
    render(
      <ThemeEditor
        theme={{ ...DEFAULT_THEME, ink: '#151d33', surface: '#141d33' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/za mało/)).toBeDefined();
  });
});

describe('DeckOverview', () => {
  it('pokazuje liczbę problemów', () => {
    render(<DeckOverview content={content()} />);
    expect(screen.getByText('Problemów')).toBeDefined();
  });

  it('ostrzega, gdy problemów jest mniej niż misji', () => {
    const data = content();
    data.problems = data.problems.slice(0, 2);
    render(<DeckOverview content={data} />);
    expect(screen.getByText(/mniej niż misji/)).toBeDefined();
  });

  
  it('wypisuje treści oznaczone do weryfikacji', () => {
    render(<DeckOverview content={content()} />);
    expect(screen.getByText(/Do weryfikacji merytorycznej/)).toBeDefined();
  });

  it('potwierdza spójność przy domyślnej zawartości', () => {
    render(<DeckOverview content={content()} />);

    // Pierwsze pytanie redaktora brzmi „czy da się w to grać", więc
    // odpowiedź stoi na górze zakładki, przed liczbami i skrótami.
    expect(screen.getByText(/Gra jest gotowa/)).toBeDefined();
    expect(screen.getByText(/Każdą ściankę da się zamknąć/)).toBeDefined();
  });

  it('pokazuje pokrycie kategoria × rodzina', () => {
    render(<DeckOverview content={content()} />);

    // Paski kategorii mówią, ile jest kart danego rodzaju, ale ścianka
    // wymaga kategorii ORAZ rodziny — dziura chowa się w jednej z dwudziestu
    // kombinacji i nie widać jej w żadnym z pozostałych zestawień.
    expect(screen.getByText(/Pokrycie: kategoria × rodzina/)).toBeDefined();
  });

  it('mówi, jak długa będzie partia', () => {
    render(<DeckOverview content={content()} />);

    // Rundy i misje ustawia się w innej zakładce, bez widoku na to, ile
    // czasu przy stole z tego wychodzi.
    expect(screen.getByText(/Ile trwa partia/)).toBeDefined();
  });

  it('wylicza, co jest nie tak, gdy talia ma dziurę', () => {
    const broken = content();
    // Usunięcie wszystkich kart jednej kategorii zostawia ścianki,
    // których nie ma czym domknąć.
    broken.cards = broken.cards.filter((card) => card.category !== 'digital');

    render(<DeckOverview content={broken} />);

    expect(screen.getByText(/do sprawdzenia/i)).toBeDefined();
    expect(screen.queryByText(/Gra jest gotowa/)).toBeNull();
  });
});
