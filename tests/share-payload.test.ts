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

test('buildWinSharePayload describes no-reveal hint usage', () => {
  const payload = buildWinSharePayload(
    {
      time: 180,
      difficulty: 'medium',
      gridSize: 6,
      hintsUsed: 2,
      hintUsage: {
        tier1: 1,
        tier2: 1,
        tier3: 0,
        tier4: 0,
      },
      isNewBest: false,
    },
    'https://squarewise.app'
  );

  assert.match(payload.text, /2 hints, no reveals/);
});

test('buildWinSharePayload describes reveal-tier hint usage', () => {
  const payload = buildWinSharePayload(
    {
      time: 180,
      difficulty: 'medium',
      gridSize: 6,
      hintsUsed: 3,
      hintUsage: {
        tier1: 1,
        tier2: 1,
        tier3: 0,
        tier4: 1,
      },
      isNewBest: false,
    },
    'https://squarewise.app'
  );

  assert.match(payload.text, /3 hints, 1 reveal/);
});

test('buildWinSharePayload includes daily identity and badges without solution data', () => {
  const payload = buildWinSharePayload(
    {
      time: 300,
      difficulty: 'medium',
      gridSize: 6,
      hintsUsed: 0,
      hintUsage: {
        tier1: 0,
        tier2: 0,
        tier3: 0,
        tier4: 0,
      },
      isNewBest: true,
      mode: 'daily',
      date: '2026-06-05',
      badges: ['no-hint', 'mistake-free'],
    },
    'https://squarewise.app'
  );

  assert.match(payload.text, /daily 2026-06-05/);
  assert.match(payload.text, /Badges: No hint, Mistake-free/);
  assert.doesNotMatch(payload.text, /solution|row|column|cage target/i);
});

test('buildWinSharePayload includes committed mistake count when provided', () => {
  const payload = buildWinSharePayload(
    {
      time: 240,
      difficulty: 'easy',
      gridSize: 5,
      hintsUsed: 1,
      mistakes: 2,
      isNewBest: false,
    },
    'https://squarewise.app'
  );

  assert.match(payload.text, /1 hint, 2 mistakes/);
});
