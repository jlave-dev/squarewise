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
    return allowPartial ? isPartialCageValid(cage, values, grid.length) : true;
  }

  // All cells filled - check full constraint
  return validateClue(cage.clue, values);
}

/**
 * Check if a partially filled cage could still be valid
 */
function isPartialCageValid(cage: Cage, values: number[], size: number): boolean {
  const { target, operation } = cage.clue;

  // For partial checks, we just ensure the current values don't violate the constraint
  switch (operation) {
    case 'none':
      return values.length === 0 || values[0] === target;

    case '+':
      const sum = values.reduce((a, b) => a + b, 0);
      const remaining = cage.cells.length - values.length;
      return sum + remaining <= target && sum + remaining * size >= target;

    case '-':
      // Can't validate subtraction with partial data
      return true;

    case '×':
      const product = values.reduce((a, b) => a * b, 1);
      return product <= target && target % product === 0;

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
 * Returns a solution, or null if none was found within the search budget.
 */
export function solvePuzzle(
  puzzle: Puzzle,
  initialGrid: number[][] = createEmptyGrid(puzzle.size),
  maxNodes = 20_000,
  onBudgetExceeded?: () => void
): number[][] | null {
  const result = searchSolutions(puzzle, initialGrid, maxNodes, 50, 1);
  if (result.exhausted) onBudgetExceeded?.();
  return result.solution;
}

function searchSolutions(
  puzzle: Puzzle,
  initialGrid: number[][] = createEmptyGrid(puzzle.size),
  maxNodes: number,
  maxDurationMs: number,
  limit: number
): { solution: number[][] | null; count: number; exhausted: boolean } {
  const result = { solution: null as number[][] | null, count: 0, exhausted: false };
  if (initialGrid.length !== puzzle.size || initialGrid.some(row => row.length !== puzzle.size)) return result;
  const grid = initialGrid.map(row => [...row]);
  const cages = Array.from({ length: puzzle.size }, (_, row) =>
    Array.from({ length: puzzle.size }, (_, col) => getCageForCell(puzzle.cages, row, col)));

  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      const value = grid[row][col];
      if (!Number.isInteger(value) || value < 0 || value > puzzle.size) return result;
      if (value && !isValidPlacement(grid, row, col, value, puzzle.size)) return result;
    }
  }
  if (!puzzle.cages.every(cage => isCageSatisfied(cage, grid, true))) return result;

  let nodes = 0;
  const deadline = performance.now() + maxDurationMs;
  function visit(): boolean {
    if (++nodes > maxNodes || performance.now() >= deadline) {
      result.exhausted = true;
      return true;
    }
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
    if (!next) {
      result.count++;
      result.solution ??= grid.map(row => [...row]);
      return result.count >= limit;
    }
    for (const value of candidates) {
      grid[next.row][next.col] = value;
      if (visit()) return true;
      grid[next.row][next.col] = 0;

    }
    return false;
  }
  visit();
  return result;
}

/** Count up to two completions; exact mode preserves the published v1 generator. */
export async function hasUniqueSolution(puzzle: Puzzle): Promise<boolean> {
  const result = searchSolutions(puzzle, createEmptyGrid(puzzle.size), Infinity, Infinity, 2);
  return !result.exhausted && result.count === 1;
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
