import type { Difficulty, Operation } from '../../types/puzzle';

export interface DifficultyPreset {
  gridSize: number;
  operations: Operation[];
  minCageSize: number;
  maxCageSize: number;
  singleCellRate: number;
  targetScoreRange: {
    min: number;
    max: number;
  };
  description: string;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  beginner: {
    gridSize: 4,
    operations: ['+'],
    minCageSize: 1,
    maxCageSize: 2,
    singleCellRate: 0.3,
    targetScoreRange: { min: 0, max: 85 },
    description: 'Addition only. Great for learning.',
  },
  easy: {
    gridSize: 5,
    operations: ['+', '-'],
    minCageSize: 1,
    maxCageSize: 3,
    singleCellRate: 0.2,
    targetScoreRange: { min: 90, max: 230 },
    description: 'Addition and subtraction.',
  },
  medium: {
    gridSize: 6,
    operations: ['+', '-', '×'],
    minCageSize: 1,
    maxCageSize: 4,
    singleCellRate: 0.1,
    targetScoreRange: { min: 145, max: 360 },
    description: 'Adds multiplication.',
  },
  hard: {
    gridSize: 7,
    operations: ['+', '-', '×', '÷'],
    minCageSize: 2,
    maxCageSize: 5,
    singleCellRate: 0.05,
    targetScoreRange: { min: 230, max: 600 },
    description: 'All four operations.',
  },
  expert: {
    gridSize: 9,
    operations: ['+', '-', '×', '÷'],
    minCageSize: 2,
    maxCageSize: 6,
    singleCellRate: 0,
    targetScoreRange: { min: 360, max: 920 },
    description: 'No single-cell cages.',
  },
};

/**
 * Get the preset for a difficulty level
 */
export function getDifficultyPreset(difficulty: Difficulty): DifficultyPreset {
  return DIFFICULTY_PRESETS[difficulty];
}

/**
 * Get all available difficulties
 */
export function getDifficulties(): Difficulty[] {
  return Object.keys(DIFFICULTY_PRESETS) as Difficulty[];
}

/**
 * Get grid size for a difficulty
 */
export function getGridSize(difficulty: Difficulty): number {
  return DIFFICULTY_PRESETS[difficulty].gridSize;
}

/**
 * Check if an operation is available at a difficulty level
 */
export function isOperationAvailable(difficulty: Difficulty, operation: Operation): boolean {
  return DIFFICULTY_PRESETS[difficulty].operations.includes(operation);
}

/**
 * Get description for a difficulty
 */
export function getDifficultyDescription(difficulty: Difficulty): string {
  return DIFFICULTY_PRESETS[difficulty].description;
}
