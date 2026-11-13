import { test } from 'vitest';
import assert from 'node:assert/strict';
import { validatePuzzle } from '../src/engine/generator/PuzzleGenerator';
import { Validator } from '../src/engine/validation/Validator';
import { HintSystem } from '../src/core/HintSystem';
import { solvePuzzle } from '../src/engine/solver/BacktrackSolver';
import type { Puzzle } from '../src/types/puzzle';

import fixture from './fixtures/expert-alternative.json';

// Captured Expert board from issue #10.
const puzzle = fixture.puzzle as Puzzle;
const alternative = fixture.alternative;

test('accepts both captured Expert completions without conflicts or mistaken placements', () => {
  const validator = new Validator(puzzle);
  for (const grid of [puzzle.solution, alternative]) {
    assert.equal(validatePuzzle({ ...puzzle, solution: grid }).valid, true);
    assert.equal(validator.isComplete(grid), true);
    assert.deepEqual(validator.findAllErrors(grid), []);
    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        assert.equal(validator.isValidMove(grid, { row, col }, grid[row][col]).valid, true);
      }
    }
  }
});

test('reveals a compatible alternative instead of forcing the stored witness', () => {
  const grid = alternative.map(row => [...row]);
  grid[4][0] = 0;
  const before = grid.map(row => [...row]);
  assert.deepEqual(solvePuzzle(puzzle, grid), alternative);
  const hint = new HintSystem(puzzle).getHintStep(grid, 4);
  assert.equal(hint?.value, alternative[4][0]);
  assert.notEqual(hint?.value, puzzle.solution[4][0]);
  assert.deepEqual(grid, before);
});
