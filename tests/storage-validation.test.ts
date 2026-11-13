import { afterEach, expect, test, vi } from 'vitest';
import { loadActiveGame, saveActiveGame, type ActiveGameSnapshot } from '../src/storage/ActiveGameStore';
import { normalizeSettings } from '../src/storage/SettingsStore';
import { createDailyCompletion, normalizeStats } from '../src/storage/StatsStore';
import { createTutorialPuzzle } from '../src/tutorial/TutorialPuzzle';

const key = 'squarewise.activeGame.v1';
function snapshot(): ActiveGameSnapshot {
  const puzzle = createTutorialPuzzle();
  return {
    puzzle, grid: puzzle.solution.map(row => row.map(() => 0)), notes: puzzle.solution.map(row => row.map(() => [])),
    timer: 42, hintsUsed: 0, hintUsage: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 }, mistakeCount: 0,
    status: 'playing', selectedCell: { row: 0, col: 0 }, notesMode: false,
  };
}
function storage() {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
  return entries;
}
afterEach(() => vi.unstubAllGlobals());

for (const [name, corrupt] of Object.entries({
  'null cage': (value: any) => { value.puzzle.cages = [null]; },
  'missing solution': (value: any) => { delete value.puzzle.solution; },
  'unknown difficulty': (value: any) => { value.puzzle.difficulty = 'invalid'; },
  'out-of-bounds cage': (value: any) => { value.puzzle.cages[0].cells[0].row = 99; },
  'overlapping cages': (value: any) => { value.puzzle.cages[1].cells[0] = { row: 0, col: 0 }; },
  'wrong clue': (value: any) => { value.puzzle.cages[0].clue.target = 99; },
  'invalid grid': (value: any) => { value.grid[0][0] = 99; },
  'invalid notes': (value: any) => { value.notes[0][0] = [0]; },
  'out-of-bounds selection': (value: any) => { value.selectedCell.col = -1; },
  'negative timer': (value: any) => { value.timer = -1; },
  'invalid hint counter': (value: any) => { value.hintUsage.tier4 = 1.5; },
})) {
  test(`rejects ${name} without touching unrelated data`, () => {
    const entries = storage();
    const value = snapshot();
    corrupt(value);
    entries.set(key, JSON.stringify(value));
    entries.set('unrelated', 'keep');
    expect(loadActiveGame()).toBeNull();
    expect(entries.has(key)).toBe(false);
    expect(entries.get('unrelated')).toBe('keep');
  });
}

test('clears malformed JSON and migrates a valid older save', () => {
  const entries = storage();
  entries.set(key, '{broken');
  expect(loadActiveGame()).toBeNull();
  expect(entries.has(key)).toBe(false);
  const legacy = snapshot() as Partial<ActiveGameSnapshot>;
  delete legacy.hintUsage;
  delete legacy.mistakeCount;
  entries.set(key, JSON.stringify(legacy));
  const restored = loadActiveGame();
  expect(restored?.grid).toEqual(legacy.grid);
  expect(restored?.timer).toBe(42);
  expect(restored?.mistakeCount).toBe(0);
  saveActiveGame(restored!);
  expect(loadActiveGame()).toEqual(restored);
});

test('normalizes settings and statistics field by field', () => {
  expect(normalizeSettings(null).theme).toBe('light');
  expect(normalizeSettings({ theme: 'dark', showTimer: 'false', soundEnabled: true })).toMatchObject({
    theme: 'dark', showTimer: true, soundEnabled: true,
  });
  const completion = createDailyCompletion({ date: '2026-11-06', difficulty: 'easy', puzzleId: 'daily',
    completedAt: '2026-11-06T12:00:00Z', time: 90, hintUsage: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 }, mistakes: 0, previousBestTime: null });
  const stats = normalizeStats({ puzzlesCompleted: { easy: 7, hard: 'bad' }, bestTimes: { easy: 90 },
    totalTime: -1, dailyCompletions: { good: completion, bad: null, impossible: { ...completion, date: '2026-02-31' } } });
  expect(stats.puzzlesCompleted.easy).toBe(7);
  expect(stats.puzzlesCompleted.hard).toBe(0);
  expect(stats.bestTimes.easy).toBe(90);
  expect(stats.totalTime).toBe(0);
  expect(Object.values(stats.dailyCompletions)).toEqual([completion]);
});

test('tabs retain their own active save without overwriting or clearing another owner', async () => {
  const { claimActiveGame, clearActiveGame } = await import('../src/storage/ActiveGameStore');
  const entries = storage();
  const tab = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => tab.get(key) ?? null,
    setItem: (key: string, value: string) => tab.set(key, value),
    removeItem: (key: string) => tab.delete(key),
  });
  const own = snapshot();
  claimActiveGame();
  saveActiveGame(own);
  const other = { ...snapshot(), puzzle: { ...own.puzzle, id: 'other-tab' } };
  entries.set(key, JSON.stringify(other));
  entries.set('squarewise.activeGame.owner', 'another-owner');
  own.timer = 99;
  saveActiveGame(own);
  expect(loadActiveGame()?.timer).toBe(99);
  expect(JSON.parse(entries.get(key)!).puzzle.id).toBe('other-tab');
  clearActiveGame();
  expect(tab.has(key)).toBe(false);
  expect(JSON.parse(entries.get(key)!).puzzle.id).toBe('other-tab');
});
