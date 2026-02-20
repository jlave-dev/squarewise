import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  getHint,
  hasUniqueSolution,
  solvePuzzle,
} from '../src/engine/solver/BacktrackSolver';

function singleCellPuzzle(solution) {
  const size = solution.length;
  const cages = [];
  let id = 0;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cages.push({
        id: id++,
        cells: [{ row, col }],
        clue: { target: solution[row][col], operation: 'none' },
      });
    }
  }

  return { size, cages };
}

test('solvePuzzle solves a simple valid puzzle', () => {
  const expected = [
    [1, 2],
    [2, 1],
  ];
  const puzzle = singleCellPuzzle(expected);

  const actual = solvePuzzle(puzzle);

  assert.deepEqual(actual, expected);
});

test('hasUniqueSolution returns true for a fully constrained puzzle', async () => {
  const puzzle = singleCellPuzzle([
    [1, 2],
    [2, 1],
  ]);

  assert.equal(await hasUniqueSolution(puzzle), true);
});

test('hasUniqueSolution returns false when puzzle allows multiple latin-square completions', async () => {
  const puzzle = {
    size: 2,
    cages: [
      {
        id: 0,
        cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
        clue: { target: 3, operation: '+' },
      },
      {
        id: 1,
        cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }],
        clue: { target: 3, operation: '+' },
      },
    ],
  };

  assert.equal(await hasUniqueSolution(puzzle), false);
});

test('getHint returns a single-candidate empty cell when available', () => {
  const puzzle = singleCellPuzzle([
    [1, 2],
    [2, 1],
  ]);
  const currentGrid = [
    [1, 0],
    [0, 0],
  ];

  assert.deepEqual(getHint(puzzle, currentGrid), { row: 0, col: 1 });
});

test('getHint falls back to the first empty cell and returns null when solved', () => {
  const puzzle = singleCellPuzzle([
    [1, 2],
    [2, 1],
  ]);

  assert.deepEqual(
    getHint(puzzle, [
      [0, 0],
      [0, 0],
    ]),
    { row: 0, col: 0 }
  );
  assert.equal(
    getHint(puzzle, [
      [1, 2],
      [2, 1],
    ]),
    null
  );
});
