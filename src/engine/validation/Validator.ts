import type { Puzzle, Cell, Cage } from '../../types/puzzle';

export interface ValidationResult {
  valid: boolean;
  conflicts: Cell[];
  cageErrors: Cell[];
}

/**
 * Validate a player's move
 */
export class Validator {
  private puzzle: Puzzle;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
  }

  /**
   * Check if a value is valid in a cell
   */
  isValidMove(grid: number[][], cell: Cell, value: number): ValidationResult {
    const conflicts = this.findConflicts(grid, cell, value);
    const cageErrors = this.findCageErrors(grid, cell, value);

    return {
      valid: conflicts.length === 0 && cageErrors.length === 0,
      conflicts,
      cageErrors,
    };
  }

  /**
   * Find row/column conflicts for a value at a cell
   */
  findConflicts(grid: number[][], cell: Cell, value: number): Cell[] {
    const conflicts: Cell[] = [];

    // Check row
    for (let col = 0; col < this.puzzle.size; col++) {
      if (col !== cell.col && grid[cell.row][col] === value) {
        conflicts.push({ row: cell.row, col });
      }
    }

    // Check column
    for (let row = 0; row < this.puzzle.size; row++) {
      if (row !== cell.row && grid[row][cell.col] === value) {
        conflicts.push({ row, col: cell.col });
      }
    }

    return conflicts;
  }

  /**
   * Check if placing a value would violate cage constraints
   */
  findCageErrors(grid: number[][], cell: Cell, value: number): Cell[] {
    const cage = this.findCage(cell);
    if (!cage) return [];

    // Create a temporary grid with the new value
    const tempGrid = grid.map(row => [...row]);
    tempGrid[cell.row][cell.col] = value;

    // Check if all cells in cage are filled
    const allFilled = cage.cells.every(c => tempGrid[c.row][c.col] !== 0);

    if (!allFilled) {
      return []; // Can't validate partial cage
    }

    // Validate the complete cage
    if (!this.validateCage(cage, tempGrid)) {
      return [...cage.cells];
    }

    return [];
  }

  /**
   * Find the cage containing a cell
   */
  findCage(cell: Cell): Cage | null {
    for (const cage of this.puzzle.cages) {
      if (cage.cells.some(c => c.row === cell.row && c.col === cell.col)) {
        return cage;
      }
    }
    return null;
  }

  /**
   * Validate a complete cage
   */
  validateCage(cage: Cage, grid: number[][]): boolean {
    const values = cage.cells.map(c => grid[c.row][c.col]);
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
   * Find all errors in the current grid
   */
  findAllErrors(grid: number[][]): Cell[] {
    const errors: Cell[] = [];

    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        const value = grid[row][col];
        if (value === 0) continue;

        // Check against solution
        if (value !== this.puzzle.solution[row][col]) {
          errors.push({ row, col });
        }
      }
    }

    return errors;
  }

  /**
   * Check if the grid is complete and correct
   */
  isComplete(grid: number[][]): boolean {
    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (grid[row][col] !== this.puzzle.solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if grid has no empty cells (may have errors)
   */
  isFull(grid: number[][]): boolean {
    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (grid[row][col] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get count of completed cells
   */
  getProgress(grid: number[][]): { filled: number; total: number; percentage: number } {
    let filled = 0;
    const total = this.puzzle.size * this.puzzle.size;

    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (grid[row][col] !== 0) {
          filled++;
        }
      }
    }

    return {
      filled,
      total,
      percentage: (filled / total) * 100,
    };
  }
}
