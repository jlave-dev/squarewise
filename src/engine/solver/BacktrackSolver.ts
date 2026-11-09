import type { Puzzle, Cage, Cell } from '../../types/puzzle';
import { createEmptyGrid } from '../generator/LatinSquare';
import { validateClue } from '../generator/ClueCalculator';

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
  return validateClue(cage.clue, values);
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
export function solvePuzzle(
  puzzle: Puzzle,
  initialGrid: number[][] = createEmptyGrid(puzzle.size),
  maxNodes = 20_000
): number[][] | null {
  if (initialGrid.length !== puzzle.size || initialGrid.some(row => row.length !== puzzle.size)) return null;
  const grid = initialGrid.map(row => [...row]);
  const cages = Array.from({ length: puzzle.size }, (_, row) =>
    Array.from({ length: puzzle.size }, (_, col) => getCageForCell(puzzle.cages, row, col)));

  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      const value = grid[row][col];
      if (!Number.isInteger(value) || value < 0 || value > puzzle.size) return null;
      if (value && !isValidPlacement(grid, row, col, value, puzzle.size)) return null;
    }
  }
  if (!puzzle.cages.every(cage => isCageSatisfied(cage, grid, true))) return null;

  let nodes = 0;
  const deadline = performance.now() + 50;
  function visit(): boolean {
    if (++nodes > maxNodes || performance.now() >= deadline) return false;
    let next: Cell | null = null;
    let candidates: number[] = [];
    // Most-constrained-first keeps compatible-completion hints bounded.
    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        if (grid[row][col]) continue;
        const values: number[] = [];
        for (let value = 1; value <= puzzle.size; value++) {
          if (!isValidPlacement(grid, row, col, value, puzzle.size)) continue;
          grid[row][col] = value;
          const cage = cages[row][col];
          if (cage && isCageSatisfied(cage, grid, true)) values.push(value);
          grid[row][col] = 0;
        }
        if (values.length === 0) return false;
        if (!next || values.length < candidates.length) {
          next = { row, col };
          candidates = values;
        }
      }
    }
    if (!next) return true;
    for (const value of candidates) {
      grid[next.row][next.col] = value;
      if (visit()) return true;
      grid[next.row][next.col] = 0;
      if (nodes >= maxNodes) break;
    }
    return false;
  }
  return visit() ? grid : null;
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
