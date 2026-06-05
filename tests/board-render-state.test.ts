import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildBoardRenderState } from '../src/renderer/boardRenderState';
import type { NotesGrid, Puzzle } from '../src/types/puzzle';

const puzzle: Puzzle = {
  id: 'render-fixture',
  size: 4,
  difficulty: 'easy',
  cages: [
    {
      id: 0,
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      clue: { target: 3, operation: '+' },
    },
    {
      id: 1,
      cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }],
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

function createNotes(): NotesGrid {
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => new Set<number>())
  );
}

test('buildBoardRenderState derives row, column, and cage context', () => {
  const notes = createNotes();
  const state = buildBoardRenderState({
    puzzle,
    grid: [
      [1, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    notes,
    selectedCell: { row: 0, col: 0 },
    errors: [],
    notesMode: false,
  });

  assert.equal(state.selectedNumber, 1);
  assert.equal(state.selectedCageId, 0);
  assert.deepEqual(state.selectedCageCells, [{ row: 0, col: 0 }, { row: 0, col: 1 }]);
  assert.ok(state.relatedCells.some((cell) => cell.row === 0 && cell.col === 3));
  assert.ok(state.relatedCells.some((cell) => cell.row === 3 && cell.col === 0));
  assert.deepEqual(state.matchingValueCells, []);
});

test('buildBoardRenderState keeps selected number without exposing board-wide matches', () => {
  const notes = createNotes();
  notes[0][1].add(2);
  notes[2][2].add(2);
  notes[3][3].add(4);

  const state = buildBoardRenderState({
    puzzle,
    grid: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    notes,
    selectedCell: { row: 0, col: 0 },
    errors: [{ row: 1, col: 1 }],
    notesMode: true,
    selectedNumberOverride: 2,
  });

  assert.equal(state.selectedNumber, 2);
  assert.equal(state.notesMode, true);
  assert.deepEqual(state.matchingNoteCells, []);
  assert.deepEqual(state.matchingValueCells, []);
  assert.deepEqual(state.errors, [{ row: 1, col: 1 }]);
});

test('buildBoardRenderState does not expose solution data', () => {
  const state = buildBoardRenderState({
    puzzle,
    grid: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    notes: createNotes(),
    selectedCell: null,
    errors: [],
    notesMode: false,
  });

  assert.deepEqual(Object.keys(state).sort(), [
    'errors',
    'matchingNoteCells',
    'matchingValueCells',
    'notesMode',
    'relatedCells',
    'selectedCageCells',
    'selectedCageId',
    'selectedCell',
    'selectedNumber',
  ]);
});
