import { getStat, setStat } from './IndexedDB';
import { formatLocalDate } from '../core/DailyChallenge';
import type { DailyBadge, DailyCompletion, HintUsage, PlayerStats } from '../types/game';
import type { Difficulty } from '../types/puzzle';

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
});

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

export interface DailyCompletionResult {
  completion: DailyCompletion;
  created: boolean;
  currentDailyStreak: number;
  longestDailyStreak: number;
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
      this.stats = { ...createDefaultStats(), ...saved };
      this.loaded = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.stats = createDefaultStats();
    }
  }

  /**
   * Save stats to IndexedDB
   */
  async save(): Promise<void> {
    try {
      await setStat(STATS_KEY, this.stats);
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  /**
   * Get current stats
   */
  getStats(): Readonly<PlayerStats> {
    return this.stats;
  }

  /**
   * Record a completed puzzle
   */
  async recordCompletion(difficulty: Difficulty, time: number, _usedHints: boolean): Promise<void> {
    // Increment completion count
    this.stats.puzzlesCompleted[difficulty]++;

    // Update best time if better
    const currentBest = this.stats.bestTimes[difficulty];
    if (currentBest === null || time < currentBest) {
      this.stats.bestTimes[difficulty] = time;
    }

    // Add to total time
    this.stats.totalTime += time;

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    if (this.stats.lastPlayedDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (this.stats.lastPlayedDate === yesterday) {
        this.stats.currentStreak++;
      } else {
        this.stats.currentStreak = 1;
      }
      this.stats.longestStreak = Math.max(this.stats.longestStreak, this.stats.currentStreak);
      this.stats.lastPlayedDate = today;
    }

    await this.save();
    this.notifyListeners();
  }

  async recordDailyCompletion(input: {
    date: string;
    difficulty: Difficulty;
    puzzleId: string;
    time: number;
    hintUsage: HintUsage;
    mistakes: number;
    completedAt?: string;
  }): Promise<DailyCompletionResult> {
    const key = getDailyCompletionKey(input.date, input.difficulty);
    const existing = this.stats.dailyCompletions[key];

    if (existing) {
      const currentDailyStreak = calculateDailyStreak(this.stats.dailyCompletions, input.date);
      const longestDailyStreak = this.calculateLongestDailyStreak();
      return {
        completion: existing,
        created: false,
        currentDailyStreak,
        longestDailyStreak,
      };
    }

    const previousBestTime = this.getBestTime(input.difficulty);
    const completion = createDailyCompletion({
      ...input,
      completedAt: input.completedAt ?? new Date().toISOString(),
      previousBestTime,
    });

    this.stats.dailyCompletions[key] = completion;
    await this.save();
    this.notifyListeners();

    const currentDailyStreak = calculateDailyStreak(this.stats.dailyCompletions, input.date);
    const longestDailyStreak = this.calculateLongestDailyStreak();
    return {
      completion,
      created: true,
      currentDailyStreak,
      longestDailyStreak,
    };
  }

  /**
   * Increment play time
   */
  async addPlayTime(seconds: number): Promise<void> {
    this.stats.totalTime += seconds;
    await this.save();
    this.notifyListeners();
  }

  /**
   * Reset all stats
   */
  async reset(): Promise<void> {
    this.stats = createDefaultStats();
    await this.save();
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
    return this.stats.currentStreak;
  }

  getDailyCompletion(date: string, difficulty: Difficulty): DailyCompletion | null {
    return this.stats.dailyCompletions[getDailyCompletionKey(date, difficulty)] ?? null;
  }

  getDailyCalendarMonth(year: number, month: number): CalendarDaySummary[] {
    return getCalendarMonthData(this.stats.dailyCompletions, year, month);
  }

  isBestTime(difficulty: Difficulty, time: number): boolean {
    const currentBest = this.stats.bestTimes[difficulty];
    return currentBest === null || time < currentBest;
  }

  private calculateLongestDailyStreak(): number {
    const dates = Array.from(new Set(
      Object.values(this.stats.dailyCompletions).map((completion) => completion.date)
    )).sort();
    if (dates.length === 0) return 0;

    let longest = 0;
    for (const date of dates) {
      longest = Math.max(longest, calculateDailyStreak(this.stats.dailyCompletions, date));
    }
    return longest;
  }
}

// Singleton instance
export const statsStore = new StatsStore();
