import { getStat, updateStat } from './IndexedDB';
import { formatLocalDate } from '../core/DailyChallenge';
import type { DailyBadge, DailyCompletion, HintUsage, PlayerStats } from '../types/game';
import type { Difficulty } from '../types/puzzle';
import { getDifficulties } from '../engine/difficulty/presets';

const createDefaultStats = (): PlayerStats => ({
  puzzlesCompleted: {
    beginner: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
  },
  bestTimes: {
    beginner: null,
    easy: null,
    medium: null,
    hard: null,
    expert: null,
  },
  totalTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPlayedDate: null,
  dailyCompletions: {},
  completedPuzzleIds: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isCount = (value: unknown): value is number => isNonNegative(value) && Number.isSafeInteger(value);
const isDate = (value: unknown): value is string => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) && formatLocalDate(new Date(`${value}T00:00:00`)) === value;

/** Migrate partial older records and retain every independently valid field. */
export function normalizeStats(value: unknown): PlayerStats {
  const result = createDefaultStats();
  if (!isRecord(value)) return result;
  for (const difficulty of getDifficulties()) {
    const count = isRecord(value.puzzlesCompleted) ? value.puzzlesCompleted[difficulty] : undefined;
    const best = isRecord(value.bestTimes) ? value.bestTimes[difficulty] : undefined;
    if (isCount(count)) result.puzzlesCompleted[difficulty] = count;
    if (isNonNegative(best)) result.bestTimes[difficulty] = best;
  }
  if (isNonNegative(value.totalTime)) result.totalTime = value.totalTime;
  if (isCount(value.currentStreak)) result.currentStreak = value.currentStreak;
  if (isCount(value.longestStreak)) result.longestStreak = value.longestStreak;
  if (isDate(value.lastPlayedDate)) result.lastPlayedDate = value.lastPlayedDate;
  if (Array.isArray(value.completedPuzzleIds)) result.completedPuzzleIds = [...new Set(value.completedPuzzleIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (isRecord(value.dailyCompletions)) {
    for (const entry of Object.values(value.dailyCompletions)) {
      if (!isRecord(entry) || !isDate(entry.date) || !getDifficulties().includes(entry.difficulty as Difficulty) ||
          typeof entry.puzzleId !== 'string' || !entry.puzzleId.trim() ||
          typeof entry.completedAt !== 'string' || !Number.isFinite(Date.parse(entry.completedAt)) ||
          !isNonNegative(entry.time) || !isCount(entry.mistakes) || !isRecord(entry.hintUsage)) continue;
      const usage = entry.hintUsage;
      if (!isCount(usage.tier1) || !isCount(usage.tier2) || !isCount(usage.tier3) || !isCount(usage.tier4)) continue;
      const difficulty = entry.difficulty as Difficulty;
      result.dailyCompletions[getDailyCompletionKey(entry.date, difficulty)] = {
        date: entry.date, difficulty, puzzleId: entry.puzzleId, completedAt: entry.completedAt,
        time: entry.time, mistakes: entry.mistakes,
        hintUsage: { tier1: usage.tier1, tier2: usage.tier2, tier3: usage.tier3, tier4: usage.tier4 },
        badges: Array.isArray(entry.badges) ? entry.badges.filter((badge): badge is DailyBadge =>
          ['no-hint', 'no-reveal', 'mistake-free', 'personal-best'].includes(badge)) : [],
      };
    }
  }
  return result;
}

const STATS_KEY = 'playerStats';

export interface DailyCompletionInput {
  date: string;
  difficulty: Difficulty;
  puzzleId: string;
  completedAt: string;
  time: number;
  hintUsage: HintUsage;
  mistakes: number;
  previousBestTime: number | null;
}

export interface CalendarDaySummary {
  date: string;
  completions: DailyCompletion[];
}

export interface CompletionInput {
  mode: 'fresh' | 'daily' | 'archive' | 'tutorial';
  date: string | null;
  difficulty: Difficulty;
  puzzleId: string;
  time: number;
  hintUsage: HintUsage;
  mistakes: number;
  completedAt?: string;
}

export type RecordingStatus = 'counted' | 'tutorial' | 'reveal' | 'repeat' | 'save-failed';
export interface CompletionResult {
  recordingStatus: RecordingStatus;
  isNewBest: boolean;
  badges: DailyBadge[];
  dailyStreak: number | null;
}

function previousDate(date: Date): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return formatLocalDate(yesterday);
}

export function getCurrentStreak(stats: PlayerStats, now = new Date()): number {
  return stats.lastPlayedDate === formatLocalDate(now) || stats.lastPlayedDate === previousDate(now) ? stats.currentStreak : 0;
}

/** Apply the same eligibility and deduplication policy to all completion counters. */
export function applyCompletion(stats: PlayerStats, input: CompletionInput): CompletionResult {
  const now = new Date(input.completedAt ?? new Date().toISOString());
  const today = formatLocalDate(now);
  const dated = (input.mode === 'daily' || input.mode === 'archive') && input.date !== null;
  const repeatedDate = dated && Object.values(stats.dailyCompletions).some(completion => completion.date === input.date);
  const recordingStatus: RecordingStatus = input.mode === 'tutorial' ? 'tutorial' :
    input.hintUsage.tier4 > 0 ? 'reveal' :
    stats.completedPuzzleIds.includes(input.puzzleId) || repeatedDate ? 'repeat' : 'counted';
  const result: CompletionResult = { recordingStatus, isNewBest: false, badges: [], dailyStreak: null };
  if (recordingStatus !== 'counted') return result;

  const previousBestTime = stats.bestTimes[input.difficulty];
  result.isNewBest = previousBestTime === null || input.time < previousBestTime;
  if (result.isNewBest) stats.bestTimes[input.difficulty] = input.time;
  stats.puzzlesCompleted[input.difficulty]++;
  stats.totalTime += input.time;
  stats.completedPuzzleIds.push(input.puzzleId);
  if (stats.lastPlayedDate !== today) {
    stats.currentStreak = stats.lastPlayedDate === previousDate(now) ? stats.currentStreak + 1 : 1;
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastPlayedDate = today;
  }
  if (dated) {
    const completion = createDailyCompletion({ ...input, date: input.date!, completedAt: now.toISOString(), previousBestTime });
    stats.dailyCompletions[getDailyCompletionKey(input.date!, input.difficulty)] = completion;
    result.badges = completion.badges;
    result.dailyStreak = calculateDailyStreak(stats.dailyCompletions, today) ||
      calculateDailyStreak(stats.dailyCompletions, previousDate(now));
  }
  return result;
}

export function getDailyCompletionKey(date: string, difficulty: Difficulty): string {
  return `${date}:${difficulty}`;
}

export function getHintTotal(usage: HintUsage): number {
  return usage.tier1 + usage.tier2 + usage.tier3 + usage.tier4;
}

export function deriveDailyBadges(input: {
  hintUsage: HintUsage;
  mistakes: number;
  time: number;
  previousBestTime: number | null;
}): DailyBadge[] {
  const badges: DailyBadge[] = [];

  if (getHintTotal(input.hintUsage) === 0) badges.push('no-hint');
  if (input.hintUsage.tier4 === 0) badges.push('no-reveal');
  if (input.mistakes === 0) badges.push('mistake-free');
  if (input.previousBestTime === null || input.time < input.previousBestTime) {
    badges.push('personal-best');
  }

  return badges;
}

export function createDailyCompletion(input: DailyCompletionInput): DailyCompletion {
  return {
    date: input.date,
    difficulty: input.difficulty,
    puzzleId: input.puzzleId,
    completedAt: input.completedAt,
    time: input.time,
    hintUsage: { ...input.hintUsage },
    mistakes: input.mistakes,
    badges: deriveDailyBadges(input),
  };
}

export function calculateDailyStreak(
  completions: Record<string, DailyCompletion>,
  fromDate: string
): number {
  let streak = 0;
  const date = new Date(`${fromDate}T00:00:00`);

  while (true) {
    const dateString = formatLocalDate(date);
    const hasCompletion = Object.values(completions).some(
      (completion) => completion.date === dateString
    );

    if (!hasCompletion) return streak;
    streak++;
    date.setDate(date.getDate() - 1);
  }
}

export function getCalendarMonthData(
  completions: Record<string, DailyCompletion>,
  year: number,
  month: number
): CalendarDaySummary[] {
  return Object.values(completions)
    .filter((completion) => {
      const date = new Date(`${completion.date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .reduce<CalendarDaySummary[]>((days, completion) => {
      let day = days.find((candidate) => candidate.date === completion.date);
      if (!day) {
        day = { date: completion.date, completions: [] };
        days.push(day);
      }
      day.completions.push(completion);
      return days;
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Statistics store for player progress
 */
class StatsStore {
  private stats: PlayerStats;
  private listeners: Set<(stats: PlayerStats) => void> = new Set();
  private loaded: boolean = false;

  constructor() {
    this.stats = createDefaultStats();
  }

  /**
   * Load stats from IndexedDB
   */
  async load(): Promise<void> {
    try {
      const saved = await getStat<PlayerStats>(STATS_KEY, createDefaultStats());
      this.stats = normalizeStats(saved);
      this.loaded = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.stats = createDefaultStats();
    }
  }

  getStats(): Readonly<PlayerStats> {
    return { ...this.stats, currentStreak: getCurrentStreak(this.stats) };
  }

  async recordWin(input: CompletionInput): Promise<CompletionResult> {
    let result: CompletionResult;
    this.stats = await updateStat(STATS_KEY, current => {
      const latest = normalizeStats(current);
      result = applyCompletion(latest, input);
      return latest;
    });
    this.notifyListeners();
    return result!;
  }

  async reset(): Promise<void> {
    this.stats = await updateStat(STATS_KEY, () => createDefaultStats());
    this.notifyListeners();
  }

  /**
   * Subscribe to stats changes
   */
  subscribe(listener: (stats: PlayerStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.stats);
    }
  }

  /**
   * Check if stats have been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  // Convenience getters
  getTotalCompleted(): number {
    return Object.values(this.stats.puzzlesCompleted).reduce((a, b) => a + b, 0);
  }

  getBestTime(difficulty: Difficulty): number | null {
    return this.stats.bestTimes[difficulty];
  }

  getStreak(): number {
    return getCurrentStreak(this.stats);
  }

  getDailyCompletion(date: string, difficulty: Difficulty): DailyCompletion | null {
    return this.stats.dailyCompletions[getDailyCompletionKey(date, difficulty)] ?? null;
  }

  getDailyCalendarMonth(year: number, month: number): CalendarDaySummary[] {
    return getCalendarMonthData(this.stats.dailyCompletions, year, month);
  }


}

// Singleton instance
export const statsStore = new StatsStore();
