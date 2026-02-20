import type { Difficulty, Puzzle } from '../../types/puzzle';
import { getDifficultyPreset, type DifficultyPreset } from './presets';

/**
 * Engine for calculating and adjusting puzzle difficulty
 */
export class DifficultyEngine {
  private preset: DifficultyPreset;

  constructor(difficulty: Difficulty) {
    this.preset = getDifficultyPreset(difficulty);
  }

  /**
   * Get the current preset
   */
  getPreset(): DifficultyPreset {
    return this.preset;
  }

  /**
   * Calculate an estimated difficulty score for a generated puzzle
   * Higher score = more difficult
   */
  estimateDifficulty(puzzle: Puzzle): number {
    let score = 0;

    // Base score from grid size
    score += puzzle.size * 10;

    // Add score for each operation type
    const opComplexity = new Map<string, number>([
      ['+', 5],
      ['-', 10],
      ['×', 15],
      ['÷', 20],
    ]);

    for (const cage of puzzle.cages) {
      score += opComplexity.get(cage.clue.operation) ?? 0;
    }

    // Larger cages are generally easier (more constraints)
    const avgCageSize = puzzle.cages.reduce((sum, c) => sum + c.cells.length, 0) / puzzle.cages.length;
    score -= avgCageSize * 2;

    // Single-cell cages are easy
    const singleCellCages = puzzle.cages.filter(c => c.cells.length === 1).length;
    score -= singleCellCages * 5;

    return Math.max(0, score);
  }

  /**
   * Check if a puzzle matches the expected difficulty
   */
  matchesDifficulty(puzzle: Puzzle, tolerance: number = 20): boolean {
    const estimated = this.estimateDifficulty(puzzle);
    const expected = this.getExpectedScore();

    return Math.abs(estimated - expected) <= tolerance;
  }

  /**
   * Get expected score range for current difficulty
   */
  private getExpectedScore(): number {
    const baseScore = this.preset.gridSize * 10;
    const avgOpScore = this.preset.operations.length * 10;
    const avgCageBonus = ((this.preset.minCageSize + this.preset.maxCageSize) / 2) * 2;

    return baseScore + avgOpScore - avgCageBonus;
  }

  /**
   * Get recommended cage size for next cage to generate
   */
  getRecommendedCageSize(): number {
    const min = this.preset.minCageSize;
    const max = this.preset.maxCageSize;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Should generate a single-cell cage?
   */
  shouldGenerateSingleCell(): boolean {
    if (!this.preset.singleCellRate) return false;
    return Math.random() < this.preset.singleCellRate;
  }
}
