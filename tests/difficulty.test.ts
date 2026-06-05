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
import { generatePuzzleSync, generatePuzzleWithReport } from '../src/engine/generator/PuzzleGenerator';

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

  for (const difficulty of difficulties) {
    const range = getDifficultyPreset(difficulty).targetScoreRange;
    assert.ok(range.min >= 0);
    assert.ok(range.max > range.min);
  }
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

  assert.equal(score, 162);
});

test('DifficultyEngine matchesDifficulty honors tolerance boundaries', () => {
  const engine = new DifficultyEngine('easy');
  const puzzle = makeDifficultyPuzzle();

  assert.equal(engine.matchesDifficulty(puzzle), true);
  assert.equal(engine.matchesDifficulty(puzzle, 1), false);
  assert.equal(engine.matchesDifficulty(puzzle, 2), true);
});

test('DifficultyEngine returns a structured score report', () => {
  const engine = new DifficultyEngine('easy');
  const puzzle = makeDifficultyPuzzle();

  const report = engine.getReport(puzzle, { uniquenessStatus: 'unique' });

  assert.equal(report.difficulty, 'easy');
  assert.equal(report.score, 157);
  assert.deepEqual(report.targetScoreRange, DIFFICULTY_PRESETS.easy.targetScoreRange);
  assert.equal(report.inTargetBand, true);
  assert.equal(report.signals.gridSize, 4);
  assert.equal(report.signals.cageCount, 4);
  assert.equal(report.signals.singleCellCageCount, 1);
  assert.equal(report.signals.operationCounts['×'], 1);
  assert.equal(report.signals.uniquenessStatus, 'unique');
  assert.ok(report.signals.approachableOpeningCount > 0);
  assert.match(report.summary, /has an opening deduction/);
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

test('generated beginner and easy puzzles are unique and include approachable openings', async () => {
  for (const difficulty of ['beginner', 'easy'] as const) {
    const preset = getDifficultyPreset(difficulty);
    const result = await generatePuzzleWithReport({
      size: preset.gridSize,
      difficulty,
      seed: `difficulty-opening-${difficulty}`,
      maxAttempts: 12,
    });

    assert.equal(result.difficultyReport.signals.uniquenessStatus, 'unique');
    assert.ok(result.difficultyReport.signals.approachableOpeningCount > 0);
    assert.equal(result.attemptLog.at(-1)?.accepted, true);
    assert.ok(result.attempts <= 12);
  }
});

test('deterministic seed suites mostly land in target difficulty bands', async () => {
  for (const difficulty of getDifficulties()) {
    const preset = getDifficultyPreset(difficulty);
    const engine = new DifficultyEngine(difficulty);
    const seeds = ['alpha', 'bravo', 'charlie'];
    const reports = [];

    for (const suffix of seeds) {
      const puzzle = generatePuzzleSync({
        size: preset.gridSize,
        difficulty,
        seed: `difficulty-band-${difficulty}-${suffix}`,
      });
      reports.push(engine.getReport(puzzle, { uniquenessStatus: 'skipped' }));
    }

    const inBandCount = reports.filter(report => report.inTargetBand).length;
    assert.ok(inBandCount >= 2, `${difficulty} expected at least 2/3 in band, got ${reports.map(r => r.score).join(', ')}`);
  }
});

test('hard and expert reports score deeper than easy and medium reports', () => {
  const easyPuzzle = generatePuzzleSync({
    size: DIFFICULTY_PRESETS.easy.gridSize,
    difficulty: 'easy',
    seed: 'difficulty-depth-easy',
  });
  const mediumPuzzle = generatePuzzleSync({
    size: DIFFICULTY_PRESETS.medium.gridSize,
    difficulty: 'medium',
    seed: 'difficulty-depth-medium',
  });
  const hardPuzzle = generatePuzzleSync({
    size: DIFFICULTY_PRESETS.hard.gridSize,
    difficulty: 'hard',
    seed: 'difficulty-depth-hard',
  });
  const expertPuzzle = generatePuzzleSync({
    size: DIFFICULTY_PRESETS.expert.gridSize,
    difficulty: 'expert',
    seed: 'difficulty-depth-expert',
  });

  const easy = new DifficultyEngine('easy').getReport(easyPuzzle);
  const medium = new DifficultyEngine('medium').getReport(mediumPuzzle);
  const hard = new DifficultyEngine('hard').getReport(hardPuzzle);
  const expert = new DifficultyEngine('expert').getReport(expertPuzzle);

  assert.ok(hard.score > easy.score);
  assert.ok(expert.score > medium.score);
});
