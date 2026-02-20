import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  generateCages,
  getAdjacentCells,
  validateCageCoverage,
} from '../src/engine/generator/CageGenerator';

function makeDeterministicRng(targetSize = 2) {
  return {
    nextInt() {
      return targetSize;
    },
    pick(items) {
      return items[0];
    },
  };
}

function areOrthogonallyAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

test('generateCages covers the full grid with non-overlapping cages', () => {
  const size = 4;
  const cages = generateCages(size, makeDeterministicRng(2), {
    minSize: 1,
    maxSize: 2,
  });

  assert.equal(validateCageCoverage(cages, size), true);

  const seen = new Set();
  let totalCells = 0;
  for (const cage of cages) {
    assert.ok(cage.cells.length >= 1 && cage.cells.length <= 2);
    totalCells += cage.cells.length;

    for (const cell of cage.cells) {
      const key = `${cell.row},${cell.col}`;
      assert.equal(seen.has(key), false);
      seen.add(key);
    }

    for (let i = 1; i < cage.cells.length; i++) {
      const cell = cage.cells[i];
      const hasNeighborInCage = cage.cells
        .slice(0, i)
        .some((other) => areOrthogonallyAdjacent(cell, other));
      assert.equal(hasNeighborInCage, true);
    }
  }

  assert.equal(totalCells, size * size);
});

test('generateCages supports forced single-cell cages', () => {
  const size = 3;
  const cages = generateCages(size, makeDeterministicRng(1), {
    minSize: 1,
    maxSize: 1,
  });

  assert.equal(cages.length, size * size);
  assert.ok(cages.every((cage) => cage.cells.length === 1));
  assert.equal(validateCageCoverage(cages, size), true);
});

test('validateCageCoverage rejects overlap and missing cells', () => {
  const overlapping = [
    {
      id: 0,
      cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      clue: { target: 1, operation: '+' },
    },
    {
      id: 1,
      cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }],
      clue: { target: 1, operation: '+' },
    },
  ];
  const missing = [
    {
      id: 0,
      cells: [{ row: 0, col: 0 }],
      clue: { target: 1, operation: 'none' },
    },
  ];

  assert.equal(validateCageCoverage(overlapping, 2), false);
  assert.equal(validateCageCoverage(missing, 2), false);
});

test('getAdjacentCells returns in-bounds orthogonal neighbors', () => {
  assert.deepEqual(getAdjacentCells(0, 0, 4), [
    { row: 1, col: 0 },
    { row: 0, col: 1 },
  ]);
  assert.deepEqual(getAdjacentCells(0, 2, 4), [
    { row: 1, col: 2 },
    { row: 0, col: 1 },
    { row: 0, col: 3 },
  ]);
  assert.deepEqual(getAdjacentCells(1, 1, 4), [
    { row: 0, col: 1 },
    { row: 2, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 2 },
  ]);

  for (const cell of getAdjacentCells(2, 2, 5)) {
    assert.ok(cell.row >= 0 && cell.row < 5);
    assert.ok(cell.col >= 0 && cell.col < 5);
    assert.equal(Math.abs(cell.row - 2) + Math.abs(cell.col - 2), 1);
  }
});
