import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DIFFICULTY_PRESETS,
  getDifficultyPreset,
  getDifficulties,
  getGridSize,
  isOperationAvailable,
  getDifficultyDescription,
} from '../src/engine/difficulty/presets';
import { DifficultyEngine } from '../src/engine/difficulty/DifficultyEngine';

function makeDifficultyPuzzle() {
  return {
    id: 'difficulty-fixture',
    size: 4,
    difficulty: 'easy',
    cages: [
      { id: 1, cells: [{ row: 0, col: 0 }], clue: { target: 1, operation: 'none' } },
      { id: 2, cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }], clue: { target: 5, operation: '+' } },
      { id: 3, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }], clue: { target: 1, operation: '-' } },
      {
        id: 4,
        cells: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
        clue: { target: 24, operation: '×' },
      },
    ],
    solution: [
      [1, 2, 3, 4],
      [2, 3, 4, 1],
      [3, 4, 1, 2],
      [4, 1, 2, 3],
    ],
  };
}

test('difficulty preset helpers return expected values', () => {
  assert.deepEqual(getDifficultyPreset('beginner'), DIFFICULTY_PRESETS.beginner);
  assert.equal(getGridSize('expert'), 9);

  const difficulties = getDifficulties();
  assert.deepEqual(difficulties, ['beginner', 'easy', 'medium', 'hard', 'expert']);

  assert.equal(getDifficultyDescription('hard'), DIFFICULTY_PRESETS.hard.description);
});

test('operation availability reflects per-difficulty presets', () => {
  assert.equal(isOperationAvailable('beginner', '+'), true);
  assert.equal(isOperationAvailable('beginner', '-'), false);
  assert.equal(isOperationAvailable('easy', '-'), true);
  assert.equal(isOperationAvailable('medium', '×'), true);
  assert.equal(isOperationAvailable('hard', '÷'), true);
  assert.equal(isOperationAvailable('expert', 'none'), false);
});

test('DifficultyEngine estimates score deterministically for known puzzle shape', () => {
  const engine = new DifficultyEngine('easy');
  const puzzle = makeDifficultyPuzzle();

  const score = engine.estimateDifficulty(puzzle);

  assert.equal(score, 61);
});

test('DifficultyEngine matchesDifficulty honors tolerance boundaries', () => {
  const engine = new DifficultyEngine('easy');
  const puzzle = makeDifficultyPuzzle();

  assert.equal(engine.matchesDifficulty(puzzle), true);
  assert.equal(engine.matchesDifficulty(puzzle, 3), false);
  assert.equal(engine.matchesDifficulty(puzzle, 5), true);
});

test('DifficultyEngine getPreset exposes preset for configured difficulty', () => {
  const engine = new DifficultyEngine('medium');
  assert.deepEqual(engine.getPreset(), DIFFICULTY_PRESETS.medium);
});

test('DifficultyEngine random helpers can be checked deterministically', () => {
  const originalRandom = Math.random;

  try {
    const engine = new DifficultyEngine('hard');

    Math.random = () => 0;
    assert.equal(engine.getRecommendedCageSize(), DIFFICULTY_PRESETS.hard.minCageSize);
    assert.equal(engine.shouldGenerateSingleCell(), true);

    Math.random = () => 0.999999;
    assert.equal(engine.getRecommendedCageSize(), DIFFICULTY_PRESETS.hard.maxCageSize);
    assert.equal(engine.shouldGenerateSingleCell(), false);

    const expertEngine = new DifficultyEngine('expert');
    Math.random = () => 0;
    assert.equal(expertEngine.shouldGenerateSingleCell(), false);
  } finally {
    Math.random = originalRandom;
  }
});
