import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  calculateDailyStreak,
  createDailyCompletion,
  deriveDailyBadges,
  getCalendarMonthData,
  getDailyCompletionKey,
} from '../src/storage/StatsStore';
import type { DailyCompletion, HintUsage } from '../src/types/game';

const noHints: HintUsage = {
  tier1: 0,
  tier2: 0,
  tier3: 0,
  tier4: 0,
};

test('deriveDailyBadges handles no-hint, no-reveal, mistake-free, and personal best', () => {
  assert.deepEqual(
    deriveDailyBadges({
      hintUsage: noHints,
      mistakes: 0,
      time: 120,
      previousBestTime: 150,
    }),
    ['no-hint', 'no-reveal', 'mistake-free', 'personal-best']
  );

  assert.deepEqual(
    deriveDailyBadges({
      hintUsage: { tier1: 1, tier2: 0, tier3: 0, tier4: 1 },
      mistakes: 2,
      time: 180,
      previousBestTime: 150,
    }),
    []
  );
});

test('createDailyCompletion writes the daily completion record shape', () => {
  const completion = createDailyCompletion({
    date: '2026-06-05',
    difficulty: 'medium',
    puzzleId: 'daily-2026-06-05-medium-6x6',
    completedAt: '2026-06-05T12:00:00.000Z',
    time: 222,
    hintUsage: noHints,
    mistakes: 0,
    previousBestTime: null,
  });

  assert.deepEqual(completion, {
    date: '2026-06-05',
    difficulty: 'medium',
    puzzleId: 'daily-2026-06-05-medium-6x6',
    completedAt: '2026-06-05T12:00:00.000Z',
    time: 222,
    hintUsage: noHints,
    mistakes: 0,
    badges: ['no-hint', 'no-reveal', 'mistake-free', 'personal-best'],
  });
});

test('calculateDailyStreak counts consecutive local dates once per day', () => {
  const completions: Record<string, DailyCompletion> = {
    [getDailyCompletionKey('2026-06-03', 'easy')]: makeCompletion('2026-06-03', 'easy'),
    [getDailyCompletionKey('2026-06-04', 'hard')]: makeCompletion('2026-06-04', 'hard'),
    [getDailyCompletionKey('2026-06-04', 'medium')]: makeCompletion('2026-06-04', 'medium'),
    [getDailyCompletionKey('2026-06-05', 'medium')]: makeCompletion('2026-06-05', 'medium'),
  };

  assert.equal(calculateDailyStreak(completions, '2026-06-05'), 3);
  assert.equal(calculateDailyStreak(completions, '2026-06-04'), 2);
  assert.equal(calculateDailyStreak(completions, '2026-06-02'), 0);
});

test('getCalendarMonthData groups completions for one month', () => {
  const completions: Record<string, DailyCompletion> = {
    [getDailyCompletionKey('2026-06-05', 'medium')]: makeCompletion('2026-06-05', 'medium'),
    [getDailyCompletionKey('2026-06-05', 'hard')]: makeCompletion('2026-06-05', 'hard'),
    [getDailyCompletionKey('2026-07-01', 'easy')]: makeCompletion('2026-07-01', 'easy'),
  };

  const month = getCalendarMonthData(completions, 2026, 5);

  assert.equal(month.length, 1);
  assert.equal(month[0].date, '2026-06-05');
  assert.equal(month[0].completions.length, 2);
});

function makeCompletion(date: string, difficulty: 'easy' | 'medium' | 'hard'): DailyCompletion {
  return {
    date,
    difficulty,
    puzzleId: `daily-${date}-${difficulty}-fixture`,
    completedAt: `${date}T12:00:00.000Z`,
    time: 100,
    hintUsage: noHints,
    mistakes: 0,
    badges: ['no-hint'],
  };
}
