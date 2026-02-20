import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createRNG } from '../src/utils/rng';
import {
  generateLatinSquare,
  isValidLatinSquare,
  createEmptyGrid,
  copyGrid,
} from '../src/engine/generator/LatinSquare';

test('generateLatinSquare produces valid NxN Latin square', () => {
  const size = 6;
  const square = generateLatinSquare(size, createRNG(2026));

  assert.equal(square.length, size);
  for (const row of square) {
    assert.equal(row.length, size);
    for (const value of row) {
      assert.ok(value >= 1);
      assert.ok(value <= size);
    }
  }

  assert.equal(isValidLatinSquare(square), true);
});

test('generateLatinSquare is deterministic for same seed', () => {
  const size = 5;
  const a = generateLatinSquare(size, createRNG('latin-seed'));
  const b = generateLatinSquare(size, createRNG('latin-seed'));

  assert.deepEqual(a, b);
});

test('isValidLatinSquare rejects invalid row duplicates', () => {
  const invalid = [
    [1, 1, 3],
    [2, 3, 1],
    [3, 2, 2],
  ];

  assert.equal(isValidLatinSquare(invalid), false);
});

test('isValidLatinSquare rejects invalid column duplicates', () => {
  const invalid = [
    [1, 2, 3],
    [1, 3, 2],
    [2, 1, 3],
  ];

  assert.equal(isValidLatinSquare(invalid), false);
});

test('isValidLatinSquare rejects out-of-range values', () => {
  const invalid = [
    [1, 2, 3],
    [2, 3, 1],
    [3, 1, 4],
  ];

  assert.equal(isValidLatinSquare(invalid), false);
});

test('createEmptyGrid builds independent rows initialized to zero', () => {
  const grid = createEmptyGrid(4);

  assert.deepEqual(grid, [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);

  grid[0][0] = 9;
  assert.equal(grid[1][0], 0);
});

test('copyGrid deep-copies rows and preserves values', () => {
  const original = [
    [1, 2, 3],
    [3, 1, 2],
    [2, 3, 1],
  ];

  const copied = copyGrid(original);

  assert.deepEqual(copied, original);
  assert.notEqual(copied, original);
  assert.notEqual(copied[0], original[0]);

  copied[0][0] = 99;
  assert.equal(original[0][0], 1);
});
