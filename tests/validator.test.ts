import { test } from 'vitest';
import assert from 'node:assert/strict';
import { Validator } from '../src/engine/validation/Validator';

const puzzle = {
  id: 'validator-fixture',
  size: 3,
  difficulty: 'easy',
  cages: [
    { id: 1, cells: [{ row: 0, col: 0 }], clue: { target: 1, operation: 'none' } },
    { id: 2, cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }], clue: { target: 5, operation: '+' } },
    { id: 3, cells: [{ row: 1, col: 0 }, { row: 2, col: 0 }], clue: { target: 1, operation: '-' } },
    { id: 4, cells: [{ row: 1, col: 1 }, { row: 2, col: 1 }], clue: { target: 3, operation: '×' } },
    { id: 5, cells: [{ row: 1, col: 2 }, { row: 2, col: 2 }], clue: { target: 2, operation: '÷' } },
  ],
  solution: [
    [1, 2, 3],
    [2, 3, 1],
    [3, 1, 2],
  ],
};

function emptyGrid() {
  return [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
}

test('isValidMove reports row and column conflicts', () => {
  const validator = new Validator(puzzle);
  const grid = [
    [1, 2, 0],
    [2, 0, 3],
    [0, 3, 0],
  ];

  const result = validator.isValidMove(grid, { row: 0, col: 2 }, 2);

  assert.equal(result.valid, false);
  assert.deepEqual(result.conflicts, [{ row: 0, col: 1 }]);
  assert.deepEqual(result.cageErrors, [{ row: 0, col: 1 }, { row: 0, col: 2 }]);
});

test('findCageErrors ignores incomplete cages', () => {
  const validator = new Validator(puzzle);
  const grid = emptyGrid();

  const errors = validator.findCageErrors(grid, { row: 0, col: 2 }, 3);

  assert.deepEqual(errors, []);
});

test('none cage validation is enforced through isValidMove', () => {
  const validator = new Validator(puzzle);

  const valid = validator.isValidMove(emptyGrid(), { row: 0, col: 0 }, 1);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.cageErrors, []);

  const invalid = validator.isValidMove(emptyGrid(), { row: 0, col: 0 }, 2);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.cageErrors, [{ row: 0, col: 0 }]);
});

test('addition cage validation is enforced through isValidMove', () => {
  const validator = new Validator(puzzle);
  const grid = emptyGrid();
  grid[0][1] = 2;

  const valid = validator.isValidMove(grid, { row: 0, col: 2 }, 3);
  assert.equal(valid.valid, true);

  const invalid = validator.isValidMove(grid, { row: 0, col: 2 }, 1);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.cageErrors, [{ row: 0, col: 1 }, { row: 0, col: 2 }]);
});

test('subtraction cage validation is enforced through isValidMove', () => {
  const validator = new Validator(puzzle);
  const grid = emptyGrid();
  grid[2][0] = 3;

  const valid = validator.isValidMove(grid, { row: 1, col: 0 }, 2);
  assert.equal(valid.valid, true);

  const invalid = validator.isValidMove(grid, { row: 1, col: 0 }, 1);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.cageErrors, [{ row: 1, col: 0 }, { row: 2, col: 0 }]);
});

test('multiplication cage validation is enforced through isValidMove', () => {
  const validator = new Validator(puzzle);
  const grid = emptyGrid();
  grid[2][1] = 1;

  const valid = validator.isValidMove(grid, { row: 1, col: 1 }, 3);
  assert.equal(valid.valid, true);

  const invalid = validator.isValidMove(grid, { row: 1, col: 1 }, 2);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.cageErrors, [{ row: 1, col: 1 }, { row: 2, col: 1 }]);
});

test('division cage validation is enforced through isValidMove', () => {
  const validator = new Validator(puzzle);
  const grid = emptyGrid();
  grid[2][2] = 2;

  const valid = validator.isValidMove(grid, { row: 1, col: 2 }, 1);
  assert.equal(valid.valid, true);

  const invalid = validator.isValidMove(grid, { row: 1, col: 2 }, 3);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.cageErrors, [{ row: 1, col: 2 }, { row: 2, col: 2 }]);
});

test('validateCage handles all operation types directly', () => {
  const validator = new Validator(puzzle);
  const solved = [
    [1, 2, 3],
    [2, 3, 1],
    [3, 1, 2],
  ];

  for (const cage of puzzle.cages) {
    assert.equal(validator.validateCage(cage, solved), true);
  }

  const broken = [
    [2, 2, 3],
    [2, 2, 1],
    [3, 1, 3],
  ];

  assert.equal(validator.validateCage(puzzle.cages[0], broken), false);
  assert.equal(validator.validateCage(puzzle.cages[1], broken), true);
  assert.equal(validator.validateCage(puzzle.cages[2], broken), true);
  assert.equal(validator.validateCage(puzzle.cages[3], broken), false);
  assert.equal(validator.validateCage(puzzle.cages[4], broken), false);
});

test('completion/full/progress and full-grid error scanning behave correctly', () => {
  const validator = new Validator(puzzle);
  const partial = [
    [1, 0, 3],
    [2, 3, 1],
    [0, 0, 2],
  ];
  const solved = [
    [1, 2, 3],
    [2, 3, 1],
    [3, 1, 2],
  ];
  const wrong = [
    [1, 2, 3],
    [2, 1, 3],
    [3, 3, 2],
  ];

  assert.equal(validator.isFull(partial), false);
  assert.equal(validator.isComplete(partial), false);

  assert.equal(validator.isFull(solved), true);
  assert.equal(validator.isComplete(solved), true);

  const progress = validator.getProgress(partial);
  assert.deepEqual(progress, {
    filled: 6,
    total: 9,
    percentage: 66.66666666666666,
  });

  assert.deepEqual(validator.findAllErrors(wrong), [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
  ]);
});
