import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createAccessibleCellLabel } from '../src/ui/AccessibleBoard';
import type { GameSnapshot } from '../src/app/Game';

function makeSnapshot(): GameSnapshot {
  return {
    grid: [
      [1, 0],
      [0, 2],
    ],
    notes: [
      [[], [1, 2]],
      [[2], []],
    ],
    selectedCell: { row: 0, col: 1 },
    status: 'playing',
    timer: 12,
    hintsUsed: 0,
    hintUsage: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 },
    mistakeCount: 0,
    lastHint: null,
    notesMode: true,
    canUndo: true,
    canRedo: false,
    errors: [{ row: 0, col: 1 }],
    cages: [
      {
        id: 1,
        cells: [{ row: 0, col: 0 }],
        clue: { target: 1, operation: 'none' },
      },
      {
        id: 2,
        cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }],
        clue: { target: 4, operation: '+' },
      },
      {
        id: 3,
        cells: [{ row: 1, col: 0 }],
        clue: { target: 2, operation: 'none' },
      },
    ],
    puzzleId: 'accessible-fixture',
    difficulty: 'beginner',
    gridSize: 2,
    mode: 'fresh',
    date: null,
    renderState: {
      selectedCell: { row: 0, col: 1 },
      selectedNumber: null,
      selectedCageId: 2,
      relatedCells: [],
      selectedCageCells: [{ row: 0, col: 1 }, { row: 1, col: 1 }],
      matchingValueCells: [],
      matchingNoteCells: [],
      notesMode: true,
      errors: [{ row: 0, col: 1 }],
    },
  };
}

test('accessible cell labels include position, value, notes, cage clue, selection, and error state', () => {
  const label = createAccessibleCellLabel(makeSnapshot(), { row: 0, col: 1 });

  assert.equal(
    label,
    'Row 1, column 2, empty, notes 1, 2, cage 4+, selected, conflict'
  );
});

test('accessible cell labels describe filled cells without notes', () => {
  const label = createAccessibleCellLabel(makeSnapshot(), { row: 0, col: 0 });

  assert.equal(label, 'Row 1, column 1, value 1, no notes, cage 1');
});
