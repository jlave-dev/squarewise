import { expect, test } from 'vitest';
import { UndoStack } from '../src/core/UndoStack';
import type { GameAction } from '../src/types/game';

const action: GameAction = { type: 'SET_CELL', cell: { row: 0, col: 0 }, value: 1, previousValue: 0 };
const notes = (values: number[]) => [[new Set(values)]];

test('multiple undo/redo cycles restore values and independent note snapshots', () => {
  const history = new UndoStack();
  const initialNotes = notes([1, 2]);
  history.push([[0]], initialNotes, action);
  initialNotes[0][0].clear();
  history.push([[1]], notes([]), action);
  let state = history.undo([[2]], notes([3]))!;
  expect(state.grid).toEqual([[1]]);
  state = history.undo(state.grid, state.notes)!;
  expect(state.grid).toEqual([[0]]);
  expect([...state.notes[0][0]]).toEqual([1, 2]);
  state = history.redo(state.grid, state.notes)!;
  expect(state.grid).toEqual([[1]]);
  state = history.undo(state.grid, state.notes)!;
  expect(state.grid).toEqual([[0]]);
  expect([...state.notes[0][0]]).toEqual([1, 2]);
  state = history.redo(state.grid, state.notes)!;
  state = history.redo(state.grid, state.notes)!;
  expect(state.grid).toEqual([[2]]);
  expect([...state.notes[0][0]]).toEqual([3]);
});

test('editing after undo discards only the redo branch', () => {
  const history = new UndoStack();
  history.push([[0]], notes([]), action);
  const undone = history.undo([[1]], notes([]))!;
  history.push(undone.grid, undone.notes, { ...action, value: 2 });
  expect(history.canRedo()).toBe(false);
  expect(history.undo([[2]], notes([]))?.grid).toEqual([[0]]);
});
