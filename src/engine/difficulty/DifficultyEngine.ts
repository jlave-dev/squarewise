import type { Difficulty, Puzzle } from '../../types/puzzle';
import { getDifficultyPreset, type DifficultyPreset } from './presets';

export type UniquenessStatus = 'unique' | 'multiple' | 'skipped' | 'unknown';

export interface DifficultySignals {
  gridSize: number;
  cageCount: number;
  averageCageSize: number;
  maxCageSize: number;
  singleCellCageCount: number;
  operationCounts: Record<string, number>;
  arithmeticComplexity: number;
  approachableOpeningCount: number;
  forcedPlacementCount: number;
  averageBranchingFactor: number;
  rowColumnPressure: number;
  cageShapeComplexity: number;
  uniquenessStatus: UniquenessStatus;
}

export interface DifficultyReport {
  difficulty: Difficulty;
  score: number;
  targetScoreRange: {
    min: number;
    max: number;
  };
  inTargetBand: boolean;
  signals: DifficultySignals;
  summary: string;
}

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
    return this.getReport(puzzle).score;
  }

  /**
   * Return a structured difficulty report suitable for tests, tuning, and UI copy.
   */
  getReport(puzzle: Puzzle, options: { uniquenessStatus?: UniquenessStatus } = {}): DifficultyReport {
    const signals = this.getSignals(puzzle, options.uniquenessStatus ?? 'unknown');
    const score = this.scoreSignals(signals);
    const targetScoreRange = this.preset.targetScoreRange;

    return {
      difficulty: puzzle.difficulty,
      score,
      targetScoreRange,
      inTargetBand: score >= targetScoreRange.min && score <= targetScoreRange.max,
      signals,
      summary: this.summarize(signals, score),
    };
  }

  /**
   * Check if a puzzle matches the expected difficulty
   */
  matchesDifficulty(puzzle: Puzzle, tolerance: number = 20): boolean {
    const estimated = this.getReport(puzzle).score;
    const expected = this.getExpectedScore();

    return Math.abs(estimated - expected) <= tolerance;
  }

  /**
   * Get expected score range for current difficulty
   */
  private getExpectedScore(): number {
    return (this.preset.targetScoreRange.min + this.preset.targetScoreRange.max) / 2;
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

  private getSignals(puzzle: Puzzle, uniquenessStatus: UniquenessStatus): DifficultySignals {
    const operationCounts: Record<string, number> = {
      none: 0,
      '+': 0,
      '-': 0,
      '×': 0,
      '÷': 0,
    };

    let totalCells = 0;
    let maxCageSize = 0;
    let singleCellCageCount = 0;
    let arithmeticComplexity = 0;
    let forcedPlacementCount = 0;
    let totalBranching = 0;
    let cageShapeComplexity = 0;

    for (const cage of puzzle.cages) {
      const cageSize = cage.cells.length;
      totalCells += cageSize;
      maxCageSize = Math.max(maxCageSize, cageSize);
      operationCounts[cage.clue.operation] = (operationCounts[cage.clue.operation] ?? 0) + 1;
      arithmeticComplexity += getOperationWeight(cage.clue.operation) * Math.max(1, cageSize - 1);

      if (cageSize === 1) {
        singleCellCageCount++;
      }

      const assignments = countCageAssignments(cage, puzzle.size);
      totalBranching += assignments;
      if (assignments === 1) {
        forcedPlacementCount += cageSize;
      }

      cageShapeComplexity += getCageShapeComplexity(cage.cells);
    }

    const averageCageSize = puzzle.cages.length === 0 ? 0 : totalCells / puzzle.cages.length;
    const averageBranchingFactor = puzzle.cages.length === 0 ? 0 : totalBranching / puzzle.cages.length;
    const rowColumnPressure = puzzle.cages.length === 0 ? 0 : (puzzle.size * puzzle.size) / puzzle.cages.length;
    const approachableOpeningCount = singleCellCageCount + forcedPlacementCount;

    return {
      gridSize: puzzle.size,
      cageCount: puzzle.cages.length,
      averageCageSize,
      maxCageSize,
      singleCellCageCount,
      operationCounts,
      arithmeticComplexity,
      approachableOpeningCount,
      forcedPlacementCount,
      averageBranchingFactor,
      rowColumnPressure,
      cageShapeComplexity,
      uniquenessStatus,
    };
  }

  private scoreSignals(signals: DifficultySignals): number {
    let score = signals.gridSize * 14;
    score += signals.averageCageSize * 9;
    score += signals.maxCageSize * 4;
    score += signals.arithmeticComplexity;
    score += signals.averageBranchingFactor * 2.5;
    score += signals.rowColumnPressure * 8;
    score += signals.cageShapeComplexity * 3;

    score -= signals.singleCellCageCount * 9;
    score -= signals.forcedPlacementCount * 2;

    if (signals.uniquenessStatus === 'multiple') {
      score += 45;
    } else if (signals.uniquenessStatus === 'unique') {
      score -= 5;
    }

    return Math.max(0, Math.round(score));
  }

  private summarize(signals: DifficultySignals, score: number): string {
    const opening = signals.approachableOpeningCount > 0 ? 'has an opening deduction' : 'has no immediate opening';
    return `${signals.gridSize}x${signals.gridSize}, ${signals.cageCount} cages, ${opening}, score ${score}`;
  }
}

function getOperationWeight(operation: string): number {
  switch (operation) {
    case 'none':
      return 0;
    case '+':
      return 4;
    case '-':
      return 10;
    case '×':
      return 15;
    case '÷':
      return 18;
    default:
      return 0;
  }
}

function getCageShapeComplexity(cells: { row: number; col: number }[]): number {
  if (cells.length <= 2) return 0;

  const rows = new Set(cells.map(cell => cell.row));
  const cols = new Set(cells.map(cell => cell.col));
  const linePenalty = rows.size === 1 || cols.size === 1 ? 0 : 1;
  const boundingArea = rows.size * cols.size;
  return linePenalty + Math.max(0, boundingArea - cells.length);
}

function countCageAssignments(cage: Puzzle['cages'][number], size: number, limit = 200): number {
  const values: number[] = [];
  let count = 0;

  function canPlace(index: number, value: number): boolean {
    const cell = cage.cells[index];
    for (let i = 0; i < index; i++) {
      const other = cage.cells[i];
      if ((other.row === cell.row || other.col === cell.col) && values[i] === value) {
        return false;
      }
    }
    return true;
  }

  function visit(index: number): void {
    if (count >= limit) return;

    if (!isPartialCageAssignmentViable(cage.clue.operation, cage.clue.target, values, index)) {
      return;
    }

    if (index === cage.cells.length) {
      if (isFullCageAssignmentValid(cage.clue.operation, cage.clue.target, values)) {
        count++;
      }
      return;
    }

    for (let value = 1; value <= size; value++) {
      if (!canPlace(index, value)) continue;
      values[index] = value;
      visit(index + 1);
    }
  }

  visit(0);
  return count;
}

function isPartialCageAssignmentViable(
  operation: string,
  target: number,
  values: number[],
  length: number
): boolean {
  const placed = values.slice(0, length);

  switch (operation) {
    case 'none':
      return length === 0 || placed[0] === target;
    case '+':
      return placed.reduce((sum, value) => sum + value, 0) <= target;
    case '×':
      const product = placed.reduce((total, value) => total * value, 1);
      return product <= target && (product === 0 || target % product === 0);
    default:
      return true;
  }
}

function isFullCageAssignmentValid(operation: string, target: number, values: number[]): boolean {
  switch (operation) {
    case 'none':
      return values.length === 1 && values[0] === target;
    case '+':
      return values.reduce((sum, value) => sum + value, 0) === target;
    case '-':
      return values.length === 2 && Math.abs(values[0] - values[1]) === target;
    case '×':
      return values.reduce((product, value) => product * value, 1) === target;
    case '÷':
      if (values.length !== 2) return false;
      const larger = Math.max(values[0], values[1]);
      const smaller = Math.min(values[0], values[1]);
      return smaller !== 0 && larger / smaller === target;
    default:
      return false;
  }
}
