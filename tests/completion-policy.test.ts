import { expect, test } from 'vitest';
import { applyCompletion, getCurrentStreak, normalizeStats, type CompletionInput } from '../src/storage/StatsStore';

const input = (overrides: Partial<CompletionInput> = {}): CompletionInput => ({
  mode: 'fresh', date: null, difficulty: 'easy', puzzleId: 'practice-1', time: 100,
  hintUsage: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 }, mistakes: 0,
  completedAt: new Date(2026, 10, 5, 17, 30).toISOString(), ...overrides,
});

test('tutorials and any reveal are excluded; other hints remain eligible', () => {
  const stats = normalizeStats(null);
  expect(applyCompletion(stats, input({ mode: 'tutorial' })).recordingStatus).toBe('tutorial');
  expect(applyCompletion(stats, input({ hintUsage: { tier1: 0, tier2: 0, tier3: 0, tier4: 1 } })).recordingStatus).toBe('reveal');
  expect(stats.puzzlesCompleted.easy).toBe(0);
  expect(stats.bestTimes.easy).toBeNull();
  const result = applyCompletion(stats, input({ hintUsage: { tier1: 1, tier2: 0, tier3: 0, tier4: 0 } }));
  expect(result.recordingStatus).toBe('counted');
  expect(result.isNewBest).toBe(true);
  expect(stats.puzzlesCompleted.easy).toBe(1);
});

test('each puzzle and daily date counts once, with no badges borrowed from the first win', () => {
  const stats = normalizeStats(null);
  const first = input({ mode: 'daily', date: '2026-11-05' });
  expect(applyCompletion(stats, first).badges).toContain('personal-best');
  expect(applyCompletion(stats, input()).recordingStatus).toBe('repeat');
  const replay = applyCompletion(stats, input({ mode: 'archive', date: first.date, difficulty: 'hard', puzzleId: 'other-id', time: 10 }));
  expect(replay).toMatchObject({ recordingStatus: 'repeat', isNewBest: false, badges: [] });
  expect(stats.totalTime).toBe(100);
  expect(stats.puzzlesCompleted.hard).toBe(0);
  expect(Object.values(stats.dailyCompletions)[0].time).toBe(100);
});

test('streaks use local days and expire after a missed day without another win', () => {
  const stats = normalizeStats(null);
  for (const [id, date] of [
    ['a', new Date(2026, 10, 5, 17, 30)], ['b', new Date(2026, 10, 5, 18, 30)],
  ] as const) applyCompletion(stats, input({ puzzleId: id, completedAt: date.toISOString() }));
  expect(stats.currentStreak).toBe(1);
  applyCompletion(stats, input({ puzzleId: 'c', completedAt: new Date(2026, 10, 6, 0, 1).toISOString() }));
  expect(stats.currentStreak).toBe(2);
  expect(getCurrentStreak(stats, new Date(2026, 10, 7, 23, 59))).toBe(2);
  expect(getCurrentStreak(stats, new Date(2026, 10, 8, 0, 0))).toBe(0);
  applyCompletion(stats, input({ puzzleId: 'd', completedAt: new Date(2026, 10, 9).toISOString() }));
  expect(stats.currentStreak).toBe(1);
  expect(stats.longestStreak).toBe(2);
});
