import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createEmptyHintUsage,
  getTotalHintUsage,
  HintSystem,
  incrementHintUsage,
} from '../src/core/HintSystem';
import type { Puzzle } from '../src/types/puzzle';

const puzzle: Puzzle = {
  id: 'hint-fixture',
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

const oneEmptyGrid = [
  [1, 0, 3],
  [2, 3, 1],
  [3, 1, 2],
];

test('tier 1 focuses without revealing a value', () => {
  const hint = new HintSystem(puzzle).getHintStep(oneEmptyGrid, 1);

  assert.equal(hint?.tier, 1);
  assert.equal(hint?.reveal, false);
  assert.equal(hint?.value, undefined);
  assert.equal(hint?.focus.cageId, 2);
  assert.deepEqual(hint?.focus.cells[0], { row: 0, col: 1 });
});

test('tier 2 explains without revealing or placing a value', () => {
  const hint = new HintSystem(puzzle).getHintStep(oneEmptyGrid, 2);

  assert.equal(hint?.tier, 2);
  assert.equal(hint?.reveal, false);
  assert.equal(hint?.value, undefined);
  assert.match(hint?.explanation ?? '', /rule out|cage/i);
});

test('tier 3 identifies an eliminated value and reason cells', () => {
  const hint = new HintSystem(puzzle).getHintStep(oneEmptyGrid, 3);

  assert.equal(hint?.tier, 3);
  assert.equal(hint?.reveal, false);
  assert.equal(typeof hint?.focus.eliminatedValue, 'number');
  assert.ok((hint?.focus.reasonCells?.length ?? 0) > 0);
});

test('tier 4 reveals exactly one target value', () => {
  const hint = new HintSystem(puzzle).getHintStep(oneEmptyGrid, 4);

  assert.equal(hint?.tier, 4);
  assert.equal(hint?.reveal, true);
  assert.equal(hint?.value, 2);
  assert.deepEqual(hint?.focus.cells[0], { row: 0, col: 1 });
});

test('hint usage counters increment independently while total remains available', () => {
  let usage = createEmptyHintUsage();
  usage = incrementHintUsage(usage, 1);
  usage = incrementHintUsage(usage, 3);
  usage = incrementHintUsage(usage, 4);

  assert.deepEqual(usage, {
    tier1: 1,
    tier2: 0,
    tier3: 1,
    tier4: 1,
  });
  assert.equal(getTotalHintUsage(usage), 3);
});

test('does not reveal or claim a deduction on inconsistent entries', () => {
  const grid = oneEmptyGrid.map(row => [...row]);
  grid[0][0] = 3;
  const before = grid.map(row => [...row]);
  for (const tier of [1, 2, 3, 4] as const) {
    assert.equal(new HintSystem(puzzle).getHintStep(grid, tier), null);
  }
  assert.deepEqual(grid, before);
});

test('ambiguous subtraction and division candidates are not claimed as deductions', () => {
  for (const [operation, target, visible] of [['-', 1, 3], ['÷', 2, 2]] as const) {
    const witness = operation === '-' ? [[2, 3, 4, 1], [3, 4, 1, 2], [4, 1, 2, 3], [1, 2, 3, 4]] :
      [[1, 2, 3, 4], [2, 3, 4, 1], [3, 4, 1, 2], [4, 1, 2, 3]];
    const ambiguous: Puzzle = {
      id: 'ambiguous-cage', size: 4, difficulty: 'easy', solution: witness,
      cages: [
        { id: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], clue: { target, operation } },
        { id: 1, cells: [{ row: 0, col: 2 }, { row: 0, col: 3 }], clue: { target: witness[0][2] + witness[0][3], operation: '+' } },
        ...[1, 2, 3].map(row => ({ id: row + 1, cells: [0, 1, 2, 3].map(col => ({ row, col })), clue: { target: 10, operation: '+' as const } })),
      ],
    };
    const grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    grid[0][1] = visible;
    const hints = new HintSystem(ambiguous);
    const hint = hints.getHintStep(grid, 4);
    assert.equal(hint?.value, witness[0][0]);
    assert.equal(hint?.reason, 'solver-fallback');
  }
});

test('audit-easy-2 reveals remain compatible with its unique solution', async () => {
  const { generatePuzzle } = await import('../src/engine/generator/PuzzleGenerator');
  const { Validator } = await import('../src/engine/validation/Validator');
  const generated = await generatePuzzle({ size: 5, difficulty: 'easy', seed: 'audit-easy-2' });
  const grid = generated.solution.map((row, r) => row.map((value, c) => (r + c) % 2 ? value : 0));
  const hints = new HintSystem(generated);
  const validator = new Validator(generated);
  while (!validator.isFull(grid)) {
    const hint = hints.getHintStep(grid, 4);
    assert.ok(hint?.reveal);
    const { row, col } = hint.focus.cells[0];
    assert.equal(grid[row][col], 0);
    assert.equal(hint.value, generated.solution[row][col]);
    grid[row][col] = hint.value!;
    assert.deepEqual(validator.findAllErrors(grid), []);
  }
  assert.equal(validator.isComplete(grid), true);
});
