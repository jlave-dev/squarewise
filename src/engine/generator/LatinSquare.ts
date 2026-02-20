import { SeededRNG } from '../../utils/rng';

/**
 * Generate a valid Latin square of size N×N
 * Uses base pattern + random shuffling for variation
 */
export function generateLatinSquare(size: number, rng: SeededRNG): number[][] {
  // Start with a base Latin square pattern
  const square: number[][] = [];

  for (let row = 0; row < size; row++) {
    square[row] = [];
    for (let col = 0; col < size; col++) {
      // Base pattern: each row is shifted by one
      square[row][col] = ((row + col) % size) + 1;
    }
  }

  // Apply random transformations to create variation

  // 1. Shuffle rows
  for (let i = size - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [square[i], square[j]] = [square[j], square[i]];
  }

  // 2. Shuffle columns
  for (let i = size - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    for (let row = 0; row < size; row++) {
      [square[row][i], square[row][j]] = [square[row][j], square[row][i]];
    }
  }

  // 3. Remap numbers (swap all instances of two numbers)
  const numSwaps = rng.nextInt(5, 15);
  for (let swap = 0; swap < numSwaps; swap++) {
    const a = rng.nextInt(1, size);
    const b = rng.nextInt(1, size);
    if (a !== b) {
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (square[row][col] === a) {
            square[row][col] = b;
          } else if (square[row][col] === b) {
            square[row][col] = a;
          }
        }
      }
    }
  }

  return square;
}

/**
 * Validate that a grid is a valid Latin square
 */
export function isValidLatinSquare(grid: number[][]): boolean {
  const size = grid.length;
  const validSet = new Set<number>();

  for (let i = 1; i <= size; i++) {
    validSet.add(i);
  }

  // Check each row
  for (let row = 0; row < size; row++) {
    const rowSet = new Set(grid[row]);
    if (rowSet.size !== size || ![...rowSet].every(n => validSet.has(n))) {
      return false;
    }
  }

  // Check each column
  for (let col = 0; col < size; col++) {
    const colSet = new Set<number>();
    for (let row = 0; row < size; row++) {
      colSet.add(grid[row][col]);
    }
    if (colSet.size !== size || ![...colSet].every(n => validSet.has(n))) {
      return false;
    }
  }

  return true;
}

/**
 * Create an empty grid of given size
 */
export function createEmptyGrid(size: number): number[][] {
  return Array(size).fill(null).map(() => Array(size).fill(0));
}

/**
 * Deep copy a grid
 */
export function copyGrid(grid: number[][]): number[][] {
  return grid.map(row => [...row]);
}
