import type { Puzzle, Cell, Cage } from '../../types/puzzle';
import { validateClue } from '../generator/ClueCalculator';

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
      valid: Number.isInteger(value) && value >= 1 && value <= this.puzzle.size && conflicts.length === 0 && cageErrors.length === 0,
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
    return validateClue(cage.clue, cage.cells.map(c => grid[c.row][c.col]));
  }

  /**
   * Find all errors in the current grid
   */
  findAllErrors(grid: number[][]): Cell[] {
    const cageErrors = new Set<string>();
    for (const cage of this.puzzle.cages) {
      if (cage.cells.every(cell => grid[cell.row][cell.col] !== 0) && !this.validateCage(cage, grid)) {
        for (const cell of cage.cells) cageErrors.add(`${cell.row},${cell.col}`);
      }
    }
    const errors: Cell[] = [];
    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        const value = grid[row][col];
        if (value === 0) continue;
        const cell = { row, col };
        if (!Number.isInteger(value) || value < 1 || value > this.puzzle.size ||
            cageErrors.has(`${row},${col}`) || this.findConflicts(grid, cell, value).length > 0) {
          errors.push(cell);
        }
      }
    }
    return errors;
  }

  /**
   * Check if the grid is complete and correct
   */
  isComplete(grid: number[][]): boolean {
    return grid.length === this.puzzle.size &&
      grid.every(row => row.length === this.puzzle.size && row.every(value => Number.isInteger(value) && value >= 1 && value <= this.puzzle.size)) &&
      this.findAllErrors(grid).length === 0;
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
