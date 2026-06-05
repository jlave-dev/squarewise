import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createTutorialPuzzle } from '../src/tutorial/TutorialPuzzle';
import {
  getNextTutorialStepId,
  getTutorialStepIndex,
  getTutorialSteps,
  isTutorialStepId,
} from '../src/tutorial/TutorialController';
import { validateClue } from '../src/engine/generator/ClueCalculator';
import type { GameSnapshot } from '../src/app/Game';

test('tutorial puzzle is deterministic and covers every cell exactly once', () => {
  const puzzle = createTutorialPuzzle();
  const puzzleAgain = createTutorialPuzzle();

  assert.deepEqual(puzzle, puzzleAgain);
  assert.equal(puzzle.id, 'tutorial-4x4-opening');
  assert.equal(puzzle.size, 4);
  assert.equal(puzzle.seed, 'tutorial-opening-v1');

  const covered = new Set<string>();
  for (const cage of puzzle.cages) {
    for (const cell of cage.cells) {
      const key = `${cell.row},${cell.col}`;
      assert.equal(covered.has(key), false, `duplicate cell ${key}`);
      covered.add(key);
    }
  }

  assert.equal(covered.size, 16);
});

test('tutorial cage clues match the tutorial solution', () => {
  const puzzle = createTutorialPuzzle();

  for (const cage of puzzle.cages) {
    const values = cage.cells.map((cell) => puzzle.solution[cell.row][cell.col]);
    assert.equal(validateClue(cage.clue, values), true, `cage ${cage.id}`);
  }
});

test('tutorial steps expose stable ids for debug booting', () => {
  const ids = getTutorialSteps().map((step) => step.id);

  assert.deepEqual(ids, ['intro', 'select-cage', 'add-note', 'place-value', 'complete']);
  assert.equal(isTutorialStepId('add-note'), true);
  assert.equal(isTutorialStepId('not-a-step'), false);
  assert.equal(getTutorialStepIndex('place-value'), 3);
});

test('tutorial progression advances only after required interactions', () => {
  const snapshot = makeTutorialSnapshot();

  assert.equal(getNextTutorialStepId('select-cage', snapshot), 'select-cage');
  assert.equal(
    getNextTutorialStepId('select-cage', {
      ...snapshot,
      selectedCell: { row: 0, col: 0 },
    }),
    'add-note'
  );

  assert.equal(
    getNextTutorialStepId('add-note', {
      ...snapshot,
      selectedCell: { row: 0, col: 0 },
      notes: [[[], [], [], []], [[], [], [], []], [[], [], [], []], [[], [], [], []]],
      notesMode: true,
    }),
    'add-note'
  );
  assert.equal(
    getNextTutorialStepId('add-note', {
      ...snapshot,
      selectedCell: { row: 0, col: 0 },
      notes: [[[1], [], [], []], [[], [], [], []], [[], [], [], []], [[], [], [], []]],
      notesMode: true,
    }),
    'place-value'
  );

  assert.equal(
    getNextTutorialStepId('place-value', {
      ...snapshot,
      grid: [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      notesMode: true,
    }),
    'place-value'
  );
  assert.equal(
    getNextTutorialStepId('place-value', {
      ...snapshot,
      grid: [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      notesMode: false,
    }),
    'complete'
  );
});

function makeTutorialSnapshot(): GameSnapshot {
  const puzzle = createTutorialPuzzle();
  return {
    grid: Array.from({ length: 4 }, () => Array(4).fill(0)),
    notes: Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => [])),
    selectedCell: null,
    status: 'playing',
    timer: 0,
    hintsUsed: 0,
    hintUsage: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 },
    mistakeCount: 0,
    lastHint: null,
    notesMode: false,
    errors: [],
    cages: puzzle.cages.map((cage) => ({
      id: cage.id,
      cells: cage.cells,
      clue: cage.clue,
    })),
    puzzleId: puzzle.id,
    difficulty: puzzle.difficulty,
    gridSize: puzzle.size,
    mode: 'tutorial',
    date: null,
    renderState: {
      selectedCell: null,
      selectedNumber: null,
      selectedCageId: null,
      relatedCells: [],
      selectedCageCells: [],
      matchingValueCells: [],
      matchingNoteCells: [],
      notesMode: false,
      errors: [],
    },
  };
}
