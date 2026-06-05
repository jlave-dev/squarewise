import { test } from 'vitest';
import assert from 'node:assert/strict';
import { validatePuzzle } from '../src/engine/generator/PuzzleGenerator';
import type { Puzzle } from '../src/types/puzzle';

test('validatePuzzle rejects disconnected cages even when coverage and clue math are valid', () => {
  const puzzle: Puzzle = {
    id: 'disconnected-cage-fixture',
    size: 2,
    difficulty: 'beginner',
    solution: [
      [1, 2],
      [2, 1],
    ],
    cages: [
      {
        id: 0,
        cells: [{ row: 0, col: 0 }, { row: 1, col: 1 }],
        clue: { target: 2, operation: '+' },
      },
      {
        id: 1,
        cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }],
        clue: { target: 4, operation: '+' },
      },
    ],
  };

  const validation = validatePuzzle(puzzle);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes('Cage 0 is disconnected'));
  assert.ok(validation.errors.includes('Cage 1 is disconnected'));
  assert.equal(validation.errors.some((error) => error.includes('Not all cells are covered')), false);
  assert.equal(validation.errors.some((error) => error.includes('clue does not match')), false);
});
