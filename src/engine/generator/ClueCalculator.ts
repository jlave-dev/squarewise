import type { Cell, Cage, Clue, Operation, Puzzle } from '../../types/puzzle';
import { SeededRNG } from '../../utils/rng';

/**
 * Calculate the clue for a cage based on its cells and values
 */
export function calculateClue(
  cells: Cell[],
  solution: number[][],
  operations: Operation[]
): Clue {
  const values = cells.map(c => solution[c.row][c.col]);

  // Single cell: just the number
  if (cells.length === 1) {
    return { target: values[0], operation: 'none' };
  }

  // Two cells: can use any operation
  if (cells.length === 2) {
    return calculateTwoCellClue(values, operations);
  }

  // Three or more cells: only + or ×
  return calculateMultiCellClue(values, operations);
}

/**
 * Calculate clue for two-cell cages
 */
function calculateTwoCellClue(values: number[], operations: Operation[]): Clue {
  const [a, b] = values;
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);

  // Try operations in order of preference for puzzle quality
  const possibleClues: Array<{ clue: Clue; priority: number }> = [];

  // Addition (always possible)
  if (operations.includes('+')) {
    possibleClues.push({
      clue: { target: a + b, operation: '+' },
      priority: 1,
    });
  }

  // Subtraction (if not equal)
  if (operations.includes('-') && larger !== smaller) {
    possibleClues.push({
      clue: { target: larger - smaller, operation: '-' },
      priority: 2,
    });
  }

  // Multiplication (always possible)
  if (operations.includes('×')) {
    possibleClues.push({
      clue: { target: a * b, operation: '×' },
      priority: 3,
    });
  }

  // Division (if evenly divisible)
  if (operations.includes('÷') && larger % smaller === 0) {
    possibleClues.push({
      clue: { target: larger / smaller, operation: '÷' },
      priority: 4,
    });
  }

  // Return highest priority available clue
  possibleClues.sort((a, b) => b.priority - a.priority);
  return possibleClues[0]?.clue ?? { target: a + b, operation: '+' };
}

/**
 * Calculate clue for multi-cell cages (3+ cells)
 */
function calculateMultiCellClue(values: number[], operations: Operation[]): Clue {
  // Only + and × are well-defined for 3+ numbers

  if (operations.includes('+')) {
    const sum = values.reduce((a, b) => a + b, 0);
    return { target: sum, operation: '+' };
  }

  if (operations.includes('×')) {
    const product = values.reduce((a, b) => a * b, 1);
    return { target: product, operation: '×' };
  }

  // Fallback to addition
  const sum = values.reduce((a, b) => a + b, 0);
  return { target: sum, operation: '+' };
}

/**
 * Assign clues to all cages in a puzzle
 */
export function assignClues(
  cages: Cage[],
  solution: number[][],
  operations: Operation[],
  rng: SeededRNG
): void {
  for (const cage of cages) {
    cage.clue = calculateClue(cage.cells, solution, operations);
  }
}

/**
 * Format a clue for display
 */
export function formatClue(clue: Clue): string {
  if (clue.operation === 'none') {
    return clue.target.toString();
  }
  return `${clue.target}${clue.operation}`;
}

/**
 * Validate that a cage's clue is correct for given values
 */
export function validateClue(clue: Clue, values: number[]): boolean {
  if (values.length === 0) return false;

  switch (clue.operation) {
    case 'none':
      return values.length === 1 && values[0] === clue.target;

    case '+':
      return values.reduce((a, b) => a + b, 0) === clue.target;

    case '-':
      if (values.length !== 2) return false;
      return Math.abs(values[0] - values[1]) === clue.target;

    case '×':
      return values.reduce((a, b) => a * b, 1) === clue.target;

    case '÷':
      if (values.length !== 2) return false;
      const larger = Math.max(values[0], values[1]);
      const smaller = Math.min(values[0], values[1]);
      return smaller !== 0 && larger / smaller === clue.target;

    default:
      return false;
  }
}

/**
 * Check if a clue can be satisfied by any arrangement of numbers
 */
export function isCluePossible(clue: Clue, gridSize: number): boolean {
  // For a valid puzzle, the clue must be achievable with numbers 1-N
  const max = gridSize;
  const min = 1;

  switch (clue.operation) {
    case 'none':
      return clue.target >= min && clue.target <= max;

    case '+':
      return clue.target >= min * 2 && clue.target <= max * 9; // rough bounds

    case '-':
      return clue.target >= 0 && clue.target < max;

    case '×':
      return clue.target >= 1 && clue.target <= max * max * max; // rough bounds

    case '÷':
      return clue.target >= 1 && clue.target <= max;

    default:
      return false;
  }
}
