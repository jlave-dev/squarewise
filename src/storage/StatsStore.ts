import { getStat, setStat } from './IndexedDB';
import type { PlayerStats } from '../types/game';
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
});

const STATS_KEY = 'playerStats';

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
  async recordCompletion(difficulty: Difficulty, time: number, usedHints: boolean): Promise<void> {
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

  isBestTime(difficulty: Difficulty, time: number): boolean {
    const currentBest = this.stats.bestTimes[difficulty];
    return currentBest === null || time < currentBest;
  }
}

// Singleton instance
export const statsStore = new StatsStore();
