import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';

const setup = () => [
  { id: 'p1', name: 'Ala', characterId: 'ch-odkrywca' },
  { id: 'p2', name: 'Bartek', characterId: 'pa-opiekun' },
];

describe('useGame', () => {
  it('startuje w fazie setup', () => {
    const { result } = renderHook(() => useGame(setup(), 42));
    expect(result.current.state.phase).toBe('setup');
  });

  it('rozdaje karty z wbudowanej talii', () => {
    const { result } = renderHook(() => useGame(setup(), 42));
    expect(result.current.state.players[0].hand).toHaveLength(5);
  });

  it('dispatch zmienia stan', () => {
    const { result } = renderHook(() => useGame(setup(), 42));
    act(() => result.current.dispatch({ type: 'START_MISSION' }));
    expect(result.current.state.phase).toBe('mission');
  });

  it('odrzucony ruch nie zmienia stanu i ustawia komunikat', () => {
    const { result } = renderHook(() => useGame(setup(), 42));
    act(() => result.current.dispatch({ type: 'START_MISSION' }));
    const stateBefore = result.current.state;
    act(() => result.current.dispatch({ type: 'START_MISSION' }));
    expect(result.current.state).toBe(stateBefore);
    expect(result.current.rejection).toBeTruthy();
  });

  it('dismissRejection czyści komunikat', () => {
    const { result } = renderHook(() => useGame(setup(), 42));
    act(() => result.current.dispatch({ type: 'START_MISSION' }));
    act(() => result.current.dispatch({ type: 'START_MISSION' }));
    act(() => result.current.dismissRejection());
    expect(result.current.rejection).toBeNull();
  });

  it('undo cofa ostatni ruch', () => {
    const { result } = renderHook(() => useGame(setup(), 42));
    const initial = result.current.state;
    act(() => result.current.dispatch({ type: 'START_MISSION' }));
    act(() => result.current.undo());
    expect(result.current.state).toEqual(initial);
  });

  it('undo na pustej historii nie psuje stanu', () => {
    const { result } = renderHook(() => useGame(setup(), 42));
    const initial = result.current.state;
    act(() => result.current.undo());
    expect(result.current.state).toEqual(initial);
  });

  it('przyjmuje karty i problemy z zewnątrz', () => {
    const problems = [
      {
        id: 'custom', name: 'Własny problem', story: 'x', antagonist: 'y',
        consequence: 'z', goal: 'g', type: 'action' as const, icon: 'star',
        slots: [
          { key: 'psychological' as const, family: 'red' as const, hint: 'h', bonusCardIds: [] },
          { key: 'digital' as const, family: 'red' as const, hint: 'h', bonusCardIds: [] },
          { key: 'social' as const, family: 'red' as const, hint: 'h', bonusCardIds: [] },
          { key: 'mentor' as const, family: 'red' as const, hint: 'h', bonusCardIds: [] },
          { key: 'talent' as const, family: 'red' as const, hint: 'h', bonusCardIds: [] },
        ],
      },
    ];
    const { result } = renderHook(() =>
      useGame(setup(), 1, undefined, { problems }),
    );
    act(() => result.current.dispatch({ type: 'START_MISSION' }));
    expect(result.current.state.mission?.problems[0].name).toBe('Własny problem');
  });
});
