import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buildWinSharePayload } from '../src/app/share/SharePayload';

test('buildWinSharePayload produces deterministic title text and url', () => {
  const payload = buildWinSharePayload(
    {
      time: 125,
      difficulty: 'hard',
      gridSize: 5,
      hintsUsed: 1,
      isNewBest: true,
    },
    'https://squarewise.app'
  );

  assert.equal(payload.title, 'SquareWise Puzzle Complete');
  assert.equal(
    payload.text,
    'I solved a 5×5 hard SquareWise puzzle in 2:05 (1 hint). Can you beat me?'
  );
  assert.equal(payload.url, 'https://squarewise.app');
});

test('buildWinSharePayload pluralizes hints correctly', () => {
  const payload = buildWinSharePayload(
    {
      time: 59,
      difficulty: 'easy',
      gridSize: 4,
      hintsUsed: 0,
      isNewBest: false,
    },
    'https://squarewise.app/daily'
  );

  assert.match(payload.text, /0 hints/);
  assert.match(payload.text, /0:59/);
});
