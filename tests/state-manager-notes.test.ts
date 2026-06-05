import { test } from 'vitest';
import assert from 'node:assert/strict';
import { StateManager } from '../src/app/StateManager';
import type { Puzzle } from '../src/types/puzzle';

const puzzle: Puzzle = {
  id: 'state-notes-fixture',
  size: 4,
  difficulty: 'easy',
  cages: [
    {
      id: 0,
      cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }],
      clue: { target: 3, operation: '+' },
    },
    {
      id: 1,
      cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }],
      clue: { target: 5, operation: '+' },
    },
  ],
  solution: [
    [1, 2, 3, 4],
    [2, 3, 4, 1],
    [3, 4, 1, 2],
    [4, 1, 2, 3],
  ],
};

test('getCellsAffectedByPlacement includes same row, same column, and same cage only', () => {
  const manager = new StateManager(puzzle);

  assert.deepEqual(
    Array.from(manager.getCellsAffectedByPlacement({ row: 0, col: 0 })).sort(),
    ['0,1', '0,2', '0,3', '1,0', '2,0', '3,0']
  );
});

test('setCell clears placed-cell notes and optionally removes peer candidates', () => {
  const manager = new StateManager(puzzle);
  manager.setNotes({ row: 0, col: 0 }, new Set([1, 2]));
  manager.setNotes({ row: 0, col: 1 }, new Set([1, 3]));
  manager.setNotes({ row: 1, col: 0 }, new Set([1, 4]));
  manager.setNotes({ row: 1, col: 1 }, new Set([1, 2, 3]));

  manager.setCell({ row: 0, col: 0 }, 1, { autoRemoveNotes: true });
  const state = manager.getState();

  assert.deepEqual(Array.from(state.notes[0][0]), []);
  assert.deepEqual(Array.from(state.notes[0][1]), [3]);
  assert.deepEqual(Array.from(state.notes[1][0]), [4]);
  assert.deepEqual(Array.from(state.notes[1][1]), [1, 2, 3]);
});

test('setCell with auto-remove does not touch filled peer cells notes', () => {
  const manager = new StateManager(puzzle);
  manager.setCell({ row: 0, col: 1 }, 2);
  manager.setNotes({ row: 0, col: 1 }, new Set([1, 2]));
  manager.setNotes({ row: 0, col: 2 }, new Set([1, 2]));

  manager.setCell({ row: 0, col: 0 }, 1, { autoRemoveNotes: true });
  const state = manager.getState();

  assert.deepEqual(Array.from(state.notes[0][1]), [1, 2]);
  assert.deepEqual(Array.from(state.notes[0][2]), [2]);
});

test('setCell leaves peer notes alone when auto-remove is disabled', () => {
  const manager = new StateManager(puzzle);
  manager.setNotes({ row: 0, col: 1 }, new Set([1, 3]));

  manager.setCell({ row: 0, col: 0 }, 1);

  assert.deepEqual(Array.from(manager.getState().notes[0][1]), [1, 3]);
});

test('useHint increments raw and tiered hint counters', () => {
  const manager = new StateManager(puzzle);

  manager.useHint(1);
  manager.useHint(4);

  const state = manager.getState();
  assert.equal(state.hintsUsed, 2);
  assert.deepEqual(state.hintUsage, {
    tier1: 1,
    tier2: 0,
    tier3: 0,
    tier4: 1,
  });
});

test('recordMistake tracks committed mistakes and survives grid undo-style restores', () => {
  const manager = new StateManager(puzzle);

  manager.setCell({ row: 0, col: 0 }, 4);
  manager.recordMistake();
  manager.restoreState(
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    manager.getState().notes
  );

  assert.equal(manager.getState().mistakeCount, 1);
});

test('restoreSession restores persisted mistake count', () => {
  const manager = new StateManager(puzzle);

  manager.restoreSession({
    grid: [
      [1, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    notes: manager.getState().notes,
    selectedCell: { row: 0, col: 0 },
    status: 'playing',
    timer: 30,
    hintsUsed: 0,
    mistakeCount: 2,
  });

  assert.equal(manager.getState().mistakeCount, 2);
});
