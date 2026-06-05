import type { Cage, Cell, Puzzle } from '../types/puzzle';
import type { HintTier, HintUsage } from '../types/game';
import { getHint as solverGetHint } from '../engine/solver/BacktrackSolver';

export interface HintFocus {
  cells: Cell[];
  cageId?: number;
  eliminatedValue?: number;
  reasonCells?: Cell[];
}

export interface HintStep {
  tier: HintTier;
  focus: HintFocus;
  value?: number;
  reason: HintReason;
  explanation: string;
  reveal: boolean;
}

interface HintCandidate {
  cell: Cell;
  value: number;
  reason: HintReason;
  cage?: Cage;
}

export type HintReason =
  | 'only-option'
  | 'row-elimination'
  | 'col-elimination'
  | 'cage-constraint'
  | 'solver-fallback';

export function createEmptyHintUsage(): HintUsage {
  return {
    tier1: 0,
    tier2: 0,
    tier3: 0,
    tier4: 0,
  };
}

export function incrementHintUsage(usage: HintUsage, tier: HintTier): HintUsage {
  return {
    tier1: usage.tier1 + (tier === 1 ? 1 : 0),
    tier2: usage.tier2 + (tier === 2 ? 1 : 0),
    tier3: usage.tier3 + (tier === 3 ? 1 : 0),
    tier4: usage.tier4 + (tier === 4 ? 1 : 0),
  };
}

export function getTotalHintUsage(usage: HintUsage): number {
  return usage.tier1 + usage.tier2 + usage.tier3 + usage.tier4;
}

/**
 * Hint system for tiered, puzzle-preserving help.
 */
export class HintSystem {
  private puzzle: Puzzle;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
  }

  /**
   * Get a structured hint tier. Tiers 1-3 never reveal/place a value.
   */
  getHintStep(grid: number[][], tier: HintTier): HintStep | null {
    const candidate = this.findHintCandidate(grid);
    if (!candidate) return null;

    if (tier === 1) {
      return this.buildFocusHint(candidate);
    }

    if (tier === 2) {
      return this.buildExplanationHint(grid, candidate);
    }

    if (tier === 3) {
      return this.buildEliminationHint(grid, candidate);
    }

    return {
      tier: 4,
      focus: this.buildFocus(candidate),
      value: candidate.value,
      reason: candidate.reason,
      explanation: `Reveal ${candidate.value} in row ${candidate.cell.row + 1}, column ${candidate.cell.col + 1}.`,
      reveal: true,
    };
  }

  /**
   * Backward-compatible count helper for stored HintUsage.
   */
  getHintsUsed(usage: HintUsage): number {
    return getTotalHintUsage(usage);
  }

  private buildFocusHint(candidate: HintCandidate): HintStep {
    const focus = this.buildFocus(candidate);
    const noun = candidate.cage ? 'cage' : 'cell';

    return {
      tier: 1,
      focus,
      reason: candidate.reason,
      explanation: `Focus on this ${noun}. It has the clearest next deduction.`,
      reveal: false,
    };
  }

  private buildExplanationHint(grid: number[][], candidate: HintCandidate): HintStep {
    return {
      tier: 2,
      focus: this.buildFocus(candidate),
      reason: candidate.reason,
      explanation: this.getRevealFreeExplanation(grid, candidate),
      reveal: false,
    };
  }

  private buildEliminationHint(grid: number[][], candidate: HintCandidate): HintStep | null {
    const elimination =
      this.findEliminationForCell(grid, candidate.cell, candidate.value) ??
      this.findAnyElimination(grid);

    if (!elimination) {
      return null;
    }

    return {
      tier: 3,
      focus: {
        cells: [elimination.cell],
        eliminatedValue: elimination.value,
        reasonCells: elimination.reasonCells,
      },
      reason: elimination.reason,
      explanation: `${elimination.value} cannot go in row ${elimination.cell.row + 1}, column ${elimination.cell.col + 1} because it already appears in ${elimination.reason === 'row-elimination' ? 'that row' : 'that column'}.`,
      reveal: false,
    };
  }

  private findHintCandidate(grid: number[][]): HintCandidate | null {
    return (
      this.findOnlyOptionCandidate(grid) ??
      this.findCageConstraintCandidate(grid) ??
      this.getSolverCandidate(grid)
    );
  }

  private findOnlyOptionCandidate(grid: number[][]): HintCandidate | null {
    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (grid[row][col] !== 0) continue;

        const possibleValues = this.getPossibleValues(grid, row, col);
        if (possibleValues.length === 1) {
          return {
            cell: { row, col },
            value: possibleValues[0],
            reason: 'only-option',
            cage: this.findCage({ row, col }) ?? undefined,
          };
        }
      }
    }
    return null;
  }

  private findCageConstraintCandidate(grid: number[][]): HintCandidate | null {
    for (const cage of this.puzzle.cages) {
      const candidate = this.analyzeCageForCandidate(grid, cage);
      if (candidate) return candidate;
    }
    return null;
  }

  private analyzeCageForCandidate(grid: number[][], cage: Cage): HintCandidate | null {
    const { target, operation } = cage.clue;
    const emptyCells = cage.cells.filter((cell) => grid[cell.row][cell.col] === 0);
    if (emptyCells.length !== 1) return null;

    const filledValues = cage.cells
      .filter((cell) => grid[cell.row][cell.col] !== 0)
      .map((cell) => grid[cell.row][cell.col]);
    const requiredValue = this.calculateRequiredValue(target, operation, filledValues);
    if (!this.isUsableValue(requiredValue)) return null;

    const cell = emptyCells[0];
    const possibleValues = this.getPossibleValues(grid, cell.row, cell.col);
    if (!possibleValues.includes(requiredValue)) return null;

    return {
      cell,
      value: requiredValue,
      reason: 'cage-constraint',
      cage,
    };
  }

  private getSolverCandidate(grid: number[][]): HintCandidate | null {
    const cell = solverGetHint(this.puzzle, grid);
    if (!cell) return null;

    return {
      cell,
      value: this.puzzle.solution[cell.row][cell.col],
      reason: 'solver-fallback',
      cage: this.findCage(cell) ?? undefined,
    };
  }

  private buildFocus(candidate: HintCandidate): HintFocus {
    if (candidate.cage) {
      const cells = [
        candidate.cell,
        ...candidate.cage.cells.filter((cell) =>
          cell.row !== candidate.cell.row || cell.col !== candidate.cell.col
        ),
      ];

      return {
        cells: cells.map((cell) => ({ ...cell })),
        cageId: candidate.cage.id,
      };
    }

    return {
      cells: [{ ...candidate.cell }],
    };
  }

  private getRevealFreeExplanation(grid: number[][], candidate: HintCandidate): string {
    if (candidate.reason === 'cage-constraint' && candidate.cage) {
      const clue = this.formatClue(candidate.cage);
      const emptyCount = candidate.cage.cells.filter((cell) => grid[cell.row][cell.col] === 0).length;
      return `The ${clue} cage has ${emptyCount === 1 ? 'one empty cell' : `${emptyCount} empty cells`}. Compare the filled values with the cage target before checking the row and column.`;
    }

    if (candidate.reason === 'only-option') {
      return `Row ${candidate.cell.row + 1} and column ${candidate.cell.col + 1} already rule out every value except one.`;
    }

    return `This cell is a good next target. Check its row, column, and cage together.`;
  }

  private findEliminationForCell(
    grid: number[][],
    cell: Cell,
    correctValue: number
  ): { cell: Cell; value: number; reason: 'row-elimination' | 'col-elimination'; reasonCells: Cell[] } | null {
    for (let value = 1; value <= this.puzzle.size; value++) {
      if (value === correctValue) continue;

      const rowReasonCells = this.findValueInRow(grid, cell.row, value);
      if (rowReasonCells.length > 0) {
        return { cell, value, reason: 'row-elimination', reasonCells: rowReasonCells };
      }

      const colReasonCells = this.findValueInColumn(grid, cell.col, value);
      if (colReasonCells.length > 0) {
        return { cell, value, reason: 'col-elimination', reasonCells: colReasonCells };
      }
    }

    return null;
  }

  private findAnyElimination(
    grid: number[][]
  ): { cell: Cell; value: number; reason: 'row-elimination' | 'col-elimination'; reasonCells: Cell[] } | null {
    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (grid[row][col] !== 0) continue;

        for (let value = 1; value <= this.puzzle.size; value++) {
          const rowReasonCells = this.findValueInRow(grid, row, value);
          if (rowReasonCells.length > 0) {
            return { cell: { row, col }, value, reason: 'row-elimination', reasonCells: rowReasonCells };
          }

          const colReasonCells = this.findValueInColumn(grid, col, value);
          if (colReasonCells.length > 0) {
            return { cell: { row, col }, value, reason: 'col-elimination', reasonCells: colReasonCells };
          }
        }
      }
    }

    return null;
  }

  private findValueInRow(grid: number[][], row: number, value: number): Cell[] {
    const cells: Cell[] = [];
    for (let col = 0; col < this.puzzle.size; col++) {
      if (grid[row][col] === value) {
        cells.push({ row, col });
      }
    }
    return cells;
  }

  private findValueInColumn(grid: number[][], col: number, value: number): Cell[] {
    const cells: Cell[] = [];
    for (let row = 0; row < this.puzzle.size; row++) {
      if (grid[row][col] === value) {
        cells.push({ row, col });
      }
    }
    return cells;
  }

  private getPossibleValues(grid: number[][], row: number, col: number): number[] {
    const usedInRow = new Set(grid[row]);
    const usedInCol = new Set(grid.map((candidateRow) => candidateRow[col]));

    const possible: number[] = [];
    for (let value = 1; value <= this.puzzle.size; value++) {
      if (!usedInRow.has(value) && !usedInCol.has(value)) {
        possible.push(value);
      }
    }

    return possible;
  }

  private calculateRequiredValue(
    target: number,
    operation: string,
    filledValues: number[]
  ): number | null {
    switch (operation) {
      case 'none':
        return target;

      case '+':
        return target - filledValues.reduce((sum, value) => sum + value, 0);

      case '×': {
        const product = filledValues.reduce((acc, value) => acc * value, 1);
        if (product === 0 || target % product !== 0) return null;
        return target / product;
      }

      case '-':
        if (filledValues.length !== 1) return null;
        return this.chooseValidValue([filledValues[0] + target, filledValues[0] - target]);

      case '÷':
        if (filledValues.length !== 1) return null;
        return this.chooseValidValue([filledValues[0] * target, filledValues[0] / target]);

      default:
        return null;
    }
  }

  private chooseValidValue(values: number[]): number | null {
    return values.find((value) => this.isUsableValue(value)) ?? null;
  }

  private isUsableValue(value: number | null): value is number {
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= this.puzzle.size
    );
  }

  private findCage(cell: Cell): Cage | null {
    return this.puzzle.cages.find((cage) =>
      cage.cells.some((cageCell) => cageCell.row === cell.row && cageCell.col === cell.col)
    ) ?? null;
  }

  private formatClue(cage: Cage): string {
    if (cage.clue.operation === 'none') return `${cage.clue.target}`;
    return `${cage.clue.target}${cage.clue.operation}`;
  }
}
