import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  assignClues,
  calculateClue,
  formatClue,
  isCluePossible,
  validateClue,
} from '../src/engine/generator/ClueCalculator';

const MUL = '\u00d7';
const DIV = '\u00f7';

test('calculateClue handles single-cell cages', () => {
  const clue = calculateClue([{ row: 0, col: 0 }], [[3]], ['+']);
  assert.deepEqual(clue, { target: 3, operation: 'none' });
});

test('calculateClue prefers highest-priority valid operation for two cells', () => {
  const clue = calculateClue(
    [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    [[4, 2]],
    ['+', '-', MUL, DIV]
  );
  assert.deepEqual(clue, { target: 2, operation: DIV });
});

test('calculateClue falls back to addition when no configured two-cell operation is applicable', () => {
  const clue = calculateClue(
    [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    [[2, 2]],
    ['-']
  );
  assert.deepEqual(clue, { target: 4, operation: '+' });
});

test('calculateClue uses addition fallback for multi-cell cages without + or multiplication enabled', () => {
  const clue = calculateClue(
    [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
    [[1, 2, 3]],
    ['-']
  );
  assert.deepEqual(clue, { target: 6, operation: '+' });
});

test('assignClues populates clues for all cages', () => {
  const cages = [
    {
      id: 0,
      cells: [{ row: 0, col: 0 }],
      clue: { target: 0, operation: '+' },
    },
    {
      id: 1,
      cells: [{ row: 0, col: 1 }, { row: 1, col: 1 }],
      clue: { target: 0, operation: '+' },
    },
  ];
  const solution = [
    [1, 4],
    [2, 2],
  ];

  assignClues(cages, solution, ['+', '-', MUL, DIV], { next: () => 0 });

  assert.deepEqual(cages[0].clue, { target: 1, operation: 'none' });
  assert.deepEqual(cages[1].clue, { target: 2, operation: DIV });
});

test('formatClue renders both none and operator clues', () => {
  assert.equal(formatClue({ target: 7, operation: 'none' }), '7');
  assert.equal(formatClue({ target: 9, operation: MUL }), `9${MUL}`);
});

test('validateClue accepts valid clues and rejects invalid ones', () => {
  assert.equal(validateClue({ target: 3, operation: '+' }, [1, 2]), true);
  assert.equal(validateClue({ target: 1, operation: '-' }, [4, 2]), false);
  assert.equal(validateClue({ target: 6, operation: MUL }, [2, 3]), true);
  assert.equal(validateClue({ target: 2, operation: DIV }, [3, 2]), false);
  assert.equal(validateClue({ target: 5, operation: 'none' }, [5]), true);
  assert.equal(validateClue({ target: 5, operation: 'none' }, [5, 1]), false);
});

test('isCluePossible enforces operation-specific bounds', () => {
  assert.equal(isCluePossible({ target: 4, operation: 'none' }, 4), true);
  assert.equal(isCluePossible({ target: 5, operation: 'none' }, 4), false);
  assert.equal(isCluePossible({ target: 2, operation: '+' }, 4), true);
  assert.equal(isCluePossible({ target: 40, operation: '+' }, 4), false);
  assert.equal(isCluePossible({ target: 0, operation: '-' }, 4), true);
  assert.equal(isCluePossible({ target: 4, operation: '-' }, 4), false);
  assert.equal(isCluePossible({ target: 64, operation: MUL }, 4), true);
  assert.equal(isCluePossible({ target: 65, operation: MUL }, 4), false);
  assert.equal(isCluePossible({ target: 4, operation: DIV }, 4), true);
  assert.equal(isCluePossible({ target: 5, operation: DIV }, 4), false);
});
