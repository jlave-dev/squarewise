import type { Puzzle, Cage, Cell } from '../../types/puzzle';
import { createEmptyGrid, copyGrid } from '../generator/LatinSquare';

/**
 * Check if a value is valid in a cell position
 */
function isValidPlacement(
  grid: number[][],
  row: number,
  col: number,
  value: number,
  size: number
): boolean {
  // Check row
  for (let c = 0; c < size; c++) {
    if (c !== col && grid[row][c] === value) {
      return false;
    }
  }

  // Check column
  for (let r = 0; r < size; r++) {
    if (r !== row && grid[r][col] === value) {
      return false;
    }
  }

  return true;
}

/**
 * Check if cage constraint is satisfied
 */
function isCageSatisfied(
  cage: Cage,
  grid: number[][],
  allowPartial: boolean = false
): boolean {
  const values: number[] = [];
  let hasEmpty = false;

  for (const cell of cage.cells) {
    const value = grid[cell.row][cell.col];
    if (value === 0) {
      hasEmpty = true;
    } else {
      values.push(value);
    }
  }

  // If there are empty cells, only check partial validity
  if (hasEmpty) {
    return allowPartial ? isPartialCageValid(cage, values) : true;
  }

  // All cells filled - check full constraint
  return isFullCageValid(cage, values);
}

/**
 * Check if a partially filled cage could still be valid
 */
function isPartialCageValid(cage: Cage, values: number[]): boolean {
  const { target, operation } = cage.clue;

  // For partial checks, we just ensure the current values don't violate the constraint
  switch (operation) {
    case 'none':
      return values.length === 0 || values[0] === target;

    case '+':
      const sum = values.reduce((a, b) => a + b, 0);
      return sum <= target;

    case '-':
      // Can't validate subtraction with partial data
      return true;

    case '×':
      const product = values.reduce((a, b) => a * b, 1);
      return product <= target;

    case '÷':
      // Can't validate division with partial data
      return true;

    default:
      return true;
  }
}

/**
 * Check if a fully filled cage satisfies its constraint
 */
function isFullCageValid(cage: Cage, values: number[]): boolean {
  const { target, operation } = cage.clue;

  switch (operation) {
    case 'none':
      return values.length === 1 && values[0] === target;

    case '+':
      return values.reduce((a, b) => a + b, 0) === target;

    case '-':
      if (values.length !== 2) return false;
      return Math.abs(values[0] - values[1]) === target;

    case '×':
      return values.reduce((a, b) => a * b, 1) === target;

    case '÷':
      if (values.length !== 2) return false;
      const larger = Math.max(values[0], values[1]);
      const smaller = Math.min(values[0], values[1]);
      return smaller !== 0 && larger / smaller === target;

    default:
      return false;
  }
}

/**
 * Find the cage containing a specific cell
 */
function getCageForCell(cages: Cage[], row: number, col: number): Cage | null {
  for (const cage of cages) {
    for (const cell of cage.cells) {
      if (cell.row === row && cell.col === col) {
        return cage;
      }
    }
  }
  return null;
}

/**
 * Solve a puzzle using backtracking
 * Returns the solution or null if no solution exists
 */
export function solvePuzzle(puzzle: Puzzle): number[][] | null {
  const grid = createEmptyGrid(puzzle.size);

  if (backtrack(puzzle, grid, 0)) {
    return grid;
  }

  return null;
}

/**
 * Recursive backtracking solver
 */
function backtrack(puzzle: Puzzle, grid: number[][], cellIndex: number): boolean {
  const totalCells = puzzle.size * puzzle.size;

  // Base case: all cells filled
  if (cellIndex >= totalCells) {
    return true;
  }

  const row = Math.floor(cellIndex / puzzle.size);
  const col = cellIndex % puzzle.size;

  // Try each possible value
  for (let value = 1; value <= puzzle.size; value++) {
    if (isValidPlacement(grid, row, col, value, puzzle.size)) {
      grid[row][col] = value;

      // Check cage constraint
      const cage = getCageForCell(puzzle.cages, row, col);
      if (cage && isCageSatisfied(cage, grid, true)) {
        if (backtrack(puzzle, grid, cellIndex + 1)) {
          return true;
        }
      }

      grid[row][col] = 0;
    }
  }

  return false;
}

/**
 * Check if a puzzle has exactly one solution
 */
export async function hasUniqueSolution(puzzle: Puzzle): Promise<boolean> {
  let solutionCount = 0;
  const grid = createEmptyGrid(puzzle.size);

  function countSolutions(cellIndex: number): boolean {
    const totalCells = puzzle.size * puzzle.size;

    if (cellIndex >= totalCells) {
      solutionCount++;
      return solutionCount >= 2; // Stop if we find more than one
    }

    const row = Math.floor(cellIndex / puzzle.size);
    const col = cellIndex % puzzle.size;

    for (let value = 1; value <= puzzle.size; value++) {
      if (isValidPlacement(grid, row, col, value, puzzle.size)) {
        grid[row][col] = value;

        const cage = getCageForCell(puzzle.cages, row, col);
        if (!cage || isCageSatisfied(cage, grid, true)) {
          if (countSolutions(cellIndex + 1)) {
            grid[row][col] = 0;
            return true; // Found multiple solutions
          }
        }

        grid[row][col] = 0;
      }
    }

    return false;
  }

  // Use setTimeout to avoid blocking
  return new Promise((resolve) => {
    setTimeout(() => {
      countSolutions(0);
      resolve(solutionCount === 1);
    }, 0);
  });
}

/**
 * Get a hint for the next cell to fill
 */
export function getHint(puzzle: Puzzle, currentGrid: number[][]): Cell | null {
  // Find first empty cell that can only have one valid value
  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      if (currentGrid[row][col] === 0) {
        // Check how many valid values this cell can have
        let validValues: number[] = [];

        for (let value = 1; value <= puzzle.size; value++) {
          if (isValidPlacement(currentGrid, row, col, value, puzzle.size)) {
            validValues.push(value);
          }
        }

        // If only one valid value, this is a good hint
        if (validValues.length === 1) {
          return { row, col };
        }
      }
    }
  }

  // If no obvious hint, return first empty cell
  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      if (currentGrid[row][col] === 0) {
        return { row, col };
      }
    }
  }

  return null;
}
