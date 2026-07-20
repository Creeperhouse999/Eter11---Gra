import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ALL_CARDS } from '../data/cards';
import { ALL_CHARACTERS } from '../data/characters';
import { ALL_PROBLEMS } from '../data/problems';
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

const content = (): GameContent => ({
  cards: structuredClone(ALL_CARDS),
  problems: structuredClone(ALL_PROBLEMS),
  characters: structuredClone(ALL_CHARACTERS),
  rules: { ...DEFAULT_CONFIG },
  text: { ...DEFAULT_UI_TEXT },
  theme: { ...DEFAULT_THEME },
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

  it('blokuje usunięcie, gdy zostałaby mniej niż jedna para postaci', () => {
    const onChange = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<CharacterEditor characters={ALL_CHARACTERS.slice(0, 2)} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń' })[0]);
    expect(onChange).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
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
  it('filtruje karty po kategorii', () => {
    render(
      <CardEditor cards={ALL_CARDS} problemBonusIds={new Set()} onChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText('Filtruj kategorię'), {
      target: { value: 'mentor' },
    });
    const mentorCount = ALL_CARDS.filter((c) => c.category === 'mentor').length;
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain(
      `${mentorCount} z ${ALL_CARDS.length}`,
    );
  });

  it('oznacza karty używane jako bonus', () => {
    const bonusId = ALL_CARDS[0].id;
    render(
      <CardEditor
        cards={ALL_CARDS.slice(0, 3)}
        problemBonusIds={new Set([bonusId])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByText('karta bonusowa')).toHaveLength(1);
  });

  it('ostrzega przed usunięciem karty bonusowej', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const card = ALL_CARDS[0];
    render(
      <CardEditor
        cards={[card]}
        problemBonusIds={new Set([card.id])}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }));
    expect(confirmSpy.mock.calls[0][0]).toContain('bonusową');
    confirmSpy.mockRestore();
  });
});

describe('TextEditor', () => {
  it('zmiana tytułu gry wywołuje onChange', () => {
    const onChange = vi.fn();
    render(<TextEditor text={DEFAULT_UI_TEXT} onChange={onChange} />);
    const field = screen.getByText('Tytuł gry').closest('label')!;
    fireEvent.change(within(field).getByRole('textbox'), { target: { value: 'ETER22' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gameTitle: 'ETER22' }));
  });
});

describe('ThemeEditor', () => {
  it('pokazuje kontrast tekstu', () => {
    render(<ThemeEditor theme={DEFAULT_THEME} onChange={vi.fn()} />);
    expect(screen.getByText(/Kontrast tekstu głównego/)).toBeDefined();
  });

  it('zmiana koloru wywołuje onChange', () => {
    const onChange = vi.fn();
    render(<ThemeEditor theme={DEFAULT_THEME} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Kod koloru: Akcent główny'), {
      target: { value: '#ff0000' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ accent: '#ff0000' }));
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
    expect(screen.getByRole('alert').textContent).toContain('mniej niż misji');
  });

  it('ostrzega o problemach bez kart bonusowych', () => {
    const data = content();
    data.problems = data.problems.map((p) => ({
      ...p,
      slots: p.slots.map((s) => ({ ...s, bonusCardIds: [] })),
    }));
    render(<DeckOverview content={data} />);
    expect(screen.getByRole('alert').textContent).toContain('bez żadnej karty bonusowej');
  });

  it('wypisuje treści oznaczone do weryfikacji', () => {
    render(<DeckOverview content={content()} />);
    expect(screen.getByText(/Do weryfikacji merytorycznej/)).toBeDefined();
  });

  it('nie ostrzega przy domyślnej zawartości', () => {
    render(<DeckOverview content={content()} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
