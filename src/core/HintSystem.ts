import type { Cell, Puzzle } from '../types/puzzle';
import { getHint as solverGetHint } from '../engine/solver/BacktrackSolver';

export interface Hint {
  cell: Cell;
  value?: number;
  reason: HintReason;
  explanation: string;
}

export type HintReason =
  | 'only-option'      // Only one value possible in this cell
  | 'row-elimination'  // Value eliminated from other cells in row
  | 'col-elimination'  // Value eliminated from other cells in column
  | 'cage-constraint'; // Determined by cage constraint

/**
 * Hint system for helping players
 */
export class HintSystem {
  private puzzle: Puzzle;
  private hintsUsed: number = 0;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
  }

  /**
   * Get a hint for the next logical move
   */
  getHint(grid: number[][]): Hint | null {
    // Try to find a cell with only one possible value
    const onlyOptionHint = this.findOnlyOptionHint(grid);
    if (onlyOptionHint) {
      this.hintsUsed++;
      return onlyOptionHint;
    }

    // Try to find a cell determined by cage constraints
    const cageHint = this.findCageConstraintHint(grid);
    if (cageHint) {
      this.hintsUsed++;
      return cageHint;
    }

    // Fallback: use solver to find any valid hint
    const solverHint = this.getSolverHint(grid);
    if (solverHint) {
      this.hintsUsed++;
      return solverHint;
    }

    return null;
  }

  /**
   * Find a cell where only one value is possible
   */
  private findOnlyOptionHint(grid: number[][]): Hint | null {
    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (grid[row][col] !== 0) continue;

        const possibleValues = this.getPossibleValues(grid, row, col);

        if (possibleValues.length === 1) {
          const cell: Cell = { row, col };
          return {
            cell,
            value: possibleValues[0],
            reason: 'only-option',
            explanation: `Only ${possibleValues[0]} can go in this cell. All other numbers are already in the row or column.`,
          };
        }
      }
    }
    return null;
  }

  /**
   * Find a cell determined by cage constraints
   */
  private findCageConstraintHint(grid: number[][]): Hint | null {
    for (const cage of this.puzzle.cages) {
      const hint = this.analyzeCageForHint(grid, cage);
      if (hint) return hint;
    }
    return null;
  }

  /**
   * Analyze a cage for potential hints
   */
  private analyzeCageForHint(grid: number[][], cage: typeof this.puzzle.cages[0]): Hint | null {
    const { target, operation } = cage.clue;

    // Find empty cells in cage
    const emptyCells = cage.cells.filter(c => grid[c.row][c.col] === 0);
    if (emptyCells.length === 0) return null;

    // For single empty cell, calculate the required value
    if (emptyCells.length === 1) {
      const filledValues = cage.cells
        .filter(c => grid[c.row][c.col] !== 0)
        .map(c => grid[c.row][c.col]);

      const requiredValue = this.calculateRequiredValue(target, operation, filledValues);

      if (requiredValue !== null) {
        const cell = emptyCells[0];
        const possibleValues = this.getPossibleValues(grid, cell.row, cell.col);

        if (possibleValues.includes(requiredValue)) {
          return {
            cell,
            value: requiredValue,
            reason: 'cage-constraint',
            explanation: `Based on the cage constraint ${target}${operation}, this cell must be ${requiredValue}.`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Calculate the required value for a single empty cell in a cage
   */
  private calculateRequiredValue(
    target: number,
    operation: string,
    filledValues: number[]
  ): number | null {
    switch (operation) {
      case '+':
        return target - filledValues.reduce((a, b) => a + b, 0);

      case '×':
        return target / filledValues.reduce((a, b) => a * b, 1);

      case '-':
        if (filledValues.length !== 1) return null;
        return Math.abs(target + filledValues[0]) === target * 2 + filledValues[0]
          ? target + filledValues[0]
          : Math.abs(target - filledValues[0]);

      case '÷':
        if (filledValues.length !== 1) return null;
        const other = filledValues[0];
        if (other > target && other % target === 0) return other / target;
        if (target % other === 0) return target / other;
        return null;

      default:
        return null;
    }
  }

  /**
   * Get possible values for a cell
   */
  private getPossibleValues(grid: number[][], row: number, col: number): number[] {
    const usedInRow = new Set(grid[row]);
    const usedInCol = new Set(grid.map(r => r[col]));

    const possible: number[] = [];
    for (let v = 1; v <= this.puzzle.size; v++) {
      if (!usedInRow.has(v) && !usedInCol.has(v)) {
        possible.push(v);
      }
    }

    return possible;
  }

  /**
   * Get hint from solver
   */
  private getSolverHint(grid: number[][]): Hint | null {
    const cell = solverGetHint(this.puzzle, grid);
    if (!cell) return null;

    const value = this.puzzle.solution[cell.row][cell.col];

    return {
      cell,
      value,
      reason: 'only-option',
      explanation: `Try looking at this cell. The value ${value} works here.`,
    };
  }

  /**
   * Get count of hints used
   */
  getHintsUsed(): number {
    return this.hintsUsed;
  }

  /**
   * Reset hint counter
   */
  reset(): void {
    this.hintsUsed = 0;
  }
}
