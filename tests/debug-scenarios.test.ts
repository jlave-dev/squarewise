import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  buildDebugScenarioQuery,
  buildDebugSession,
  parseDebugScenarioFromSearch,
} from '../src/debug/scenarios';

const puzzle = {
  id: 'fixture-puzzle',
  size: 4,
  difficulty: 'easy',
  cages: [],
  solution: [
    [1, 2, 3, 4],
    [2, 3, 4, 1],
    [3, 4, 1, 2],
    [4, 1, 2, 3],
  ],
} as const;

test('parseDebugScenarioFromSearch parses valid scenario and options', () => {
  const parsed = parseDebugScenarioFromSearch('?scenario=almost-won&difficulty=hard&timer=125&hints=2');

  assert.equal(parsed?.scenario, 'almost-won');
  assert.equal(parsed?.difficulty, 'hard');
  assert.equal(parsed?.timer, 125);
  assert.equal(parsed?.hints, 2);
});

test('parseDebugScenarioFromSearch ignores invalid scenario', () => {
  const parsed = parseDebugScenarioFromSearch('?scenario=nope');
  assert.equal(parsed, null);
});

test('parseDebugScenarioFromSearch accepts aliases and normalized values', () => {
  const parsed = parseDebugScenarioFromSearch('?state=ALMOST_WON&difficulty=hard');

  assert.equal(parsed?.scenario, 'almost-won');
  assert.equal(parsed?.difficulty, 'hard');
});

test('parseDebugScenarioFromSearch tolerates trailing separators', () => {
  const parsed = parseDebugScenarioFromSearch('?scenario=almost-won/&difficulty=HARD');

  assert.equal(parsed?.scenario, 'almost-won');
  assert.equal(parsed?.difficulty, 'hard');
});

test('buildDebugScenarioQuery serializes scenario options for refresh persistence', () => {
  const query = buildDebugScenarioQuery('won-modal', {
    difficulty: 'expert',
    timer: 444,
    hints: 3,
  });

  assert.equal(query, '?scenario=won-modal&difficulty=expert&timer=444&hints=3');
});

test('buildDebugSession creates almost-won with exactly one empty cell', () => {
  const session = buildDebugSession(puzzle, 'almost-won', {
    timer: 222,
    hints: 1,
  });

  const empties = session.grid.flat().filter((value) => value === 0).length;
  assert.equal(empties, 1);
  assert.equal(session.status, 'playing');
  assert.equal(session.timer, 222);
  assert.equal(session.hintsUsed, 1);
  assert.deepEqual(session.selectedCell, { row: 3, col: 3 });
});

test('buildDebugSession creates won with full solution and won status', () => {
  const session = buildDebugSession(puzzle, 'won', {
    timer: 333,
    hints: 0,
  });

  assert.deepEqual(session.grid, puzzle.solution);
  assert.equal(session.status, 'won');
  assert.equal(session.timer, 333);
  assert.equal(session.hintsUsed, 0);
});
