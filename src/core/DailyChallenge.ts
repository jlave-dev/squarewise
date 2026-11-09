import type { Puzzle, Difficulty, PuzzleConfig } from '../types/puzzle';
import { generatePuzzle } from '../engine/generator/PuzzleGenerator';
import { getDifficultyPreset } from '../engine/difficulty/presets';

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Daily challenge system
 */
export class DailyChallenge {
  /**
   * Get the seed for a specific date and difficulty
   */
  getSeed(date: Date, difficulty: Difficulty): string {
    const dateStr = formatLocalDate(date);
    return `daily-${dateStr}-${difficulty}`;
  }

  /**
   * Generate today's puzzle for a difficulty
   */
  async getTodayPuzzle(difficulty: Difficulty): Promise<Puzzle> {
    return this.getPuzzleForDate(new Date(), difficulty);
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
   * Generate an archive puzzle for a previous date.
   * The puzzle content uses the same dated seed as the daily; only identity is relabeled.
   */
  async getArchivePuzzleForDate(date: Date, difficulty: Difficulty): Promise<Puzzle> {
    const puzzle = await this.getPuzzleForDate(date, difficulty);
    const dateStr = formatLocalDate(date);
    return {
      ...puzzle,
      id: `archive-${dateStr}-${difficulty}-${puzzle.size}x${puzzle.size}`,
      seed: `archive-${dateStr}-${difficulty}`,
    };
  }

}

// Singleton instance
export const dailyChallenge = new DailyChallenge();
