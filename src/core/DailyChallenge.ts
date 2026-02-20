import type { Puzzle, Difficulty, PuzzleConfig } from '../types/puzzle';
import { generatePuzzle } from '../engine/generator/PuzzleGenerator';
import { getDifficultyPreset } from '../engine/difficulty/presets';

interface DailyProgress {
  date: string;
  completed: Record<Difficulty, boolean>;
  times: Record<Difficulty, number | null>;
}

/**
 * Daily challenge system
 */
export class DailyChallenge {
  private currentDate: Date;
  private progress: Map<string, DailyProgress> = new Map();

  constructor() {
    this.currentDate = new Date();
  }

  /**
   * Get today's date as YYYY-MM-DD string
   */
  getTodayString(): string {
    return this.currentDate.toISOString().split('T')[0];
  }

  /**
   * Get the seed for a specific date and difficulty
   */
  getSeed(date: Date, difficulty: Difficulty): string {
    const dateStr = date.toISOString().split('T')[0];
    return `daily-${dateStr}-${difficulty}`;
  }

  /**
   * Generate today's puzzle for a difficulty
   */
  async getTodayPuzzle(difficulty: Difficulty): Promise<Puzzle> {
    return this.getPuzzleForDate(this.currentDate, difficulty);
  }

  /**
   * Generate a puzzle for a specific date
   */
  async getPuzzleForDate(date: Date, difficulty: Difficulty): Promise<Puzzle> {
    const seed = this.getSeed(date, difficulty);
    const preset = getDifficultyPreset(difficulty);

    const config: PuzzleConfig = {
      size: preset.gridSize,
      difficulty,
      seed,
    };

    return generatePuzzle(config);
  }

  /**
   * Record completion of a daily puzzle
   */
  recordCompletion(difficulty: Difficulty, time: number): void {
    const today = this.getTodayString();
    let progress = this.progress.get(today);

    if (!progress) {
      progress = this.createEmptyProgress(today);
      this.progress.set(today, progress);
    }

    progress.completed[difficulty] = true;
    progress.times[difficulty] = time;
  }

  /**
   * Check if today's puzzle for a difficulty is completed
   */
  isCompleted(difficulty: Difficulty): boolean {
    const today = this.getTodayString();
    const progress = this.progress.get(today);
    return progress?.completed[difficulty] ?? false;
  }

  /**
   * Get completion time for today's puzzle
   */
  getCompletionTime(difficulty: Difficulty): number | null {
    const today = this.getTodayString();
    const progress = this.progress.get(today);
    return progress?.times[difficulty] ?? null;
  }

  /**
   * Get streak (consecutive days played)
   */
  getStreak(): number {
    let streak = 0;
    let date = new Date(this.currentDate);

    while (true) {
      const dateStr = date.toISOString().split('T')[0];
      const progress = this.progress.get(dateStr);

      // Check if any puzzle was completed on this day
      const anyCompleted = progress && Object.values(progress.completed).some(c => c);

      if (!anyCompleted) break;

      streak++;
      date.setDate(date.getDate() - 1);
    }

    return streak;
  }

  /**
   * Get calendar data for a month
   */
  getMonthData(year: number, month: number): Map<string, DailyProgress> {
    const result = new Map<string, DailyProgress>();

    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (const [dateStr, progress] of this.progress) {
      const progressDate = new Date(dateStr);
      if (progressDate >= firstDay && progressDate <= lastDay) {
        result.set(dateStr, progress);
      }
    }

    return result;
  }

  /**
   * Load progress from saved data
   */
  loadProgress(data: Record<string, DailyProgress>): void {
    for (const [date, progress] of Object.entries(data)) {
      this.progress.set(date, progress);
    }
  }

  /**
   * Export progress for saving
   */
  exportProgress(): Record<string, DailyProgress> {
    const result: Record<string, DailyProgress> = {};
    for (const [date, progress] of this.progress) {
      result[date] = progress;
    }
    return result;
  }

  /**
   * Create empty progress entry
   */
  private createEmptyProgress(date: string): DailyProgress {
    return {
      date,
      completed: {
        beginner: false,
        easy: false,
        medium: false,
        hard: false,
        expert: false,
      },
      times: {
        beginner: null,
        easy: null,
        medium: null,
        hard: null,
        expert: null,
      },
    };
  }

  /**
   * Get available difficulties for daily challenges
   */
  getAvailableDifficulties(): Difficulty[] {
    return ['beginner', 'easy', 'medium', 'hard', 'expert'];
  }
}

// Singleton instance
export const dailyChallenge = new DailyChallenge();
