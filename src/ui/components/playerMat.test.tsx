import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PlayerMat } from './PlayerMat';
import type { Card, Character, Player } from '../../engine/types';

const card = (id: string, name: string, category: Card['category']): Card => ({
  id,
  name,
  category,
  family: 'red',
  description: '',
  icon: 'star',
});

const character: Character = {
  id: 'ch',
  name: 'Dziecko Odkrywca',
  kind: 'child',
  traits: 'Pyta.',
  icon: 'compass',
};

const player = (mat: Card[] = []): Player => ({
  id: 'p1',
  name: 'Ala',
  characterId: 'ch',
  hand: [],
  mat,
  receivedCardIds: [],
  sharedCount: 0,
  experience: [],
});

describe('PlayerMat', () => {
  it('pokazuje puste miejsca na karty', () => {
    render(<PlayerMat player={player()} character={character} />);
    // Pięć kategorii, pięć obrysów.
    expect(screen.getAllByTitle(/Puste miejsce/)).toHaveLength(5);
  });

  it('pokazuje zabraną kartę na właściwym miejscu', () => {
    const mat = [card('a', 'Odwaga', 'talent')];
    render(<PlayerMat player={player(mat)} character={character} revealed />);
    expect(screen.getByText('Odwaga')).toBeDefined();
  });

  it('nie gubi drugiej karty tej samej kategorii', () => {
    // Gracz może zabrać kilka kart tej samej kategorii przez wiele misji.
    const mat = [
      card('a', 'Odwaga', 'talent'),
      card('b', 'Wytrwałość', 'talent'),
    ];
    render(<PlayerMat player={player(mat)} character={character} revealed />);

    expect(screen.getByText('Odwaga')).toBeDefined();
    expect(screen.getByText('Wytrwałość')).toBeDefined();
  });

  it('liczy karty doświadczenia osobno za misje i za uczenie', () => {
    const withExperience: Player = {
      ...player(),
      experience: [
        { id: '1', kind: 'solve' },
        { id: '2', kind: 'solve' },
        { id: '3', kind: 'share' },
      ],
    };
    render(<PlayerMat player={withExperience} character={character} />);

    const solve = screen.getByTitle(/za rozwiązane problemy/i);
    expect(within(solve).getByText('2')).toBeDefined();

    const share = screen.getByTitle(/za przekazane karty/i);
    expect(within(share).getByText('1')).toBeDefined();
  });

  it('zakryta mata nie zdradza nazw kart', () => {
    const mat = [card('a', 'Odwaga', 'talent')];
    render(<PlayerMat player={player(mat)} character={character} />);
    expect(screen.queryByText('Odwaga')).toBeNull();
  });

  it('oznacza kartę otrzymaną od innego gracza', () => {
    const mat = [card('a', 'Odwaga', 'talent')];
    const receiver: Player = { ...player(mat), receivedCardIds: ['a'] };
    render(<PlayerMat player={receiver} character={character} revealed />);
    expect(screen.getByTitle('Karta od innego gracza')).toBeDefined();
  });

  it('nie pozwala klikać kart, gdy limit z postaci wyczerpany', () => {
    const onCardClick = vi.fn();
    const mat = [card('a', 'Odwaga', 'talent')];
    render(
      <PlayerMat
        player={player(mat)}
        character={character}
        revealed
        cardsDisabled
        onCardClick={onCardClick}
      />,
    );

    const cardButton = screen.getByRole('button', { name: /Odwaga/ });
    expect(cardButton.hasAttribute('disabled')).toBe(true);
  });

  it('pokazuje, ilu warunków brakuje do spełnienia', () => {
    // Bez licznika cel był niewidzialny — gracz nie wiedział, czy jest
    // blisko, więc spełnienie osiągało się przypadkiem albo wcale.
    render(<PlayerMat player={player([])} character={character} revealed />);

    const counter = screen.getByText('spełnienie');
    expect(counter).toBeDefined();
    // Świeży gracz nie ma jeszcze żadnego warunku.
    expect(screen.getByText('0/9')).toBeDefined();
  });
});
