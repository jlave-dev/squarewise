import { test } from 'vitest';
import assert from 'node:assert/strict';
import { DailyChallenge, formatLocalDate } from '../src/core/DailyChallenge';

test('formatLocalDate returns a local YYYY-MM-DD date string', () => {
  assert.equal(formatLocalDate(new Date(2026, 5, 5, 23, 30)), '2026-06-05');
});

test('same date plus difficulty generates stable daily puzzle identity and solution', async () => {
  const daily = new DailyChallenge();
  const date = new Date(2026, 5, 5);

  const one = await daily.getPuzzleForDate(date, 'easy');
  const two = await daily.getPuzzleForDate(date, 'easy');

  assert.equal(one.id, 'daily-2026-06-05-easy-5x5');
  assert.equal(two.id, one.id);
  assert.deepEqual(two.solution, one.solution);
});

test('different dates generate different daily puzzle identities', async () => {
  const daily = new DailyChallenge();

  const one = await daily.getPuzzleForDate(new Date(2026, 5, 5), 'easy');
  const two = await daily.getPuzzleForDate(new Date(2026, 5, 6), 'easy');

  assert.notEqual(two.id, one.id);
});

test('archive puzzle reuses dated daily content with archive identity', async () => {
  const daily = new DailyChallenge();
  const date = new Date(2026, 5, 5);

  const dailyPuzzle = await daily.getPuzzleForDate(date, 'medium');
  const archivePuzzle = await daily.getArchivePuzzleForDate(date, 'medium');

  assert.equal(archivePuzzle.id, 'archive-2026-06-05-medium-6x6');
  assert.equal(archivePuzzle.seed, 'archive-2026-06-05-medium');
  assert.deepEqual(archivePuzzle.solution, dailyPuzzle.solution);
  assert.deepEqual(archivePuzzle.cages, dailyPuzzle.cages);
});
