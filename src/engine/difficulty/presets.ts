import type { Difficulty, Operation } from '../../types/puzzle';

export interface DifficultyPreset {
  gridSize: number;
  operations: Operation[];
  minCageSize: number;
  maxCageSize: number;
  singleCellRate: number;
  description: string;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  beginner: {
    gridSize: 4,
    operations: ['+'],
    minCageSize: 1,
    maxCageSize: 2,
    singleCellRate: 0.3,
    description: '4x4 grid with addition only. Perfect for learning.',
  },
  easy: {
    gridSize: 5,
    operations: ['+', '-'],
    minCageSize: 1,
    maxCageSize: 3,
    singleCellRate: 0.2,
    description: '5x5 grid with addition and subtraction.',
  },
  medium: {
    gridSize: 6,
    operations: ['+', '-', '×'],
    minCageSize: 1,
    maxCageSize: 4,
    singleCellRate: 0.1,
    description: '6x6 grid with addition, subtraction, and multiplication.',
  },
  hard: {
    gridSize: 7,
    operations: ['+', '-', '×', '÷'],
    minCageSize: 2,
    maxCageSize: 5,
    singleCellRate: 0.05,
    description: '7x7 grid with all operations.',
  },
  expert: {
    gridSize: 9,
    operations: ['+', '-', '×', '÷'],
    minCageSize: 2,
    maxCageSize: 6,
    singleCellRate: 0,
    description: '9x9 grid with all operations. No single-cell cages.',
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
