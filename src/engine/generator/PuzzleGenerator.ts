import type { Puzzle, Cage, Difficulty, PuzzleConfig } from '../../types/puzzle';
import { SeededRNG, createRNG } from '../../utils/rng';
import { generateLatinSquare } from './LatinSquare';
import { generateCages } from './CageGenerator';
import { assignClues } from './ClueCalculator';
import { hasUniqueSolution } from '../solver/BacktrackSolver';
import { getDifficultyPreset, DifficultyPreset } from '../difficulty/presets';

/**
 * Generate a complete puzzle with the given configuration
 */
export async function generatePuzzle(config: PuzzleConfig): Promise<Puzzle> {
  const { size, difficulty, seed } = config;
  const rng = createRNG(seed ?? Date.now().toString());
  const preset = getDifficultyPreset(difficulty);

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;

    // Generate solution
    const solution = generateLatinSquare(size, rng);

    // Generate cages
    const cages = generateCages(size, rng, {
      minSize: preset.minCageSize,
      maxSize: preset.maxCageSize,
      allowSingleCell: preset.singleCellRate > 0,
    });

    // Assign clues
    assignClues(cages, solution, preset.operations, rng);

    // Create puzzle ID
    const puzzleId = generatePuzzleId(difficulty, size, rng);

    const puzzle: Puzzle = {
      id: puzzleId,
      size,
      difficulty,
      cages,
      solution,
      seed: seed ?? undefined,
    };

    // Validate unique solution (skip for larger puzzles to save time)
    if (size <= 7) {
      const hasUnique = await hasUniqueSolution(puzzle);
      if (!hasUnique) {
        console.log(`Puzzle attempt ${attempts} failed - not unique solution`);
        continue;
      }
    }

    return puzzle;
  }

  throw new Error(`Failed to generate valid puzzle after ${maxAttempts} attempts`);
}

/**
 * Generate a puzzle synchronously (without uniqueness validation)
 */
export function generatePuzzleSync(config: PuzzleConfig): Puzzle {
  const { size, difficulty, seed } = config;
  const rng = createRNG(seed ?? Date.now().toString());
  const preset = getDifficultyPreset(difficulty);

  const solution = generateLatinSquare(size, rng);
  const cages = generateCages(size, rng, {
    minSize: preset.minCageSize,
    maxSize: preset.maxCageSize,
    allowSingleCell: preset.singleCellRate > 0,
  });

  assignClues(cages, solution, preset.operations, rng);

  return {
    id: generatePuzzleId(difficulty, size, rng),
    size,
    difficulty,
    cages,
    solution,
    seed: seed ?? undefined,
  };
}

/**
 * Generate a daily puzzle for a specific date
 */
export function generateDailyPuzzle(date: Date, difficulty: Difficulty): Promise<Puzzle> {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = `daily-${dateStr}-${difficulty}`;

  const preset = getDifficultyPreset(difficulty);

  return generatePuzzle({
    size: preset.gridSize,
    difficulty,
    seed,
  });
}

/**
 * Generate a random puzzle with given size
 */
export function generateRandomPuzzle(size: number, difficulty: Difficulty): Promise<Puzzle> {
  const seed = `${Date.now()}-${Math.random()}`;

  return generatePuzzle({
    size,
    difficulty,
    seed,
  });
}

/**
 * Generate a unique puzzle ID
 */
function generatePuzzleId(difficulty: Difficulty, size: number, rng: SeededRNG): string {
  const timestamp = Date.now();
  const random = rng.nextInt(1000, 9999);
  return `${difficulty}-${size}x${size}-${timestamp}-${random}`;
}

/**
 * Validate a complete puzzle
 */
export function validatePuzzle(puzzle: Puzzle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check solution is valid Latin square
  for (let row = 0; row < puzzle.size; row++) {
    const rowSet = new Set(puzzle.solution[row]);
    if (rowSet.size !== puzzle.size) {
      errors.push(`Row ${row} has duplicate values`);
    }
  }

  for (let col = 0; col < puzzle.size; col++) {
    const colSet = new Set<number>();
    for (let row = 0; row < puzzle.size; row++) {
      colSet.add(puzzle.solution[row][col]);
    }
    if (colSet.size !== puzzle.size) {
      errors.push(`Column ${col} has duplicate values`);
    }
  }

  // Check all cells are covered by cages
  const covered = new Set<string>();
  for (const cage of puzzle.cages) {
    for (const cell of cage.cells) {
      const key = `${cell.row},${cell.col}`;
      if (covered.has(key)) {
        errors.push(`Cell (${cell.row}, ${cell.col}) is in multiple cages`);
      }
      covered.add(key);
    }
  }

  if (covered.size !== puzzle.size * puzzle.size) {
    errors.push(`Not all cells are covered by cages (${covered.size}/${puzzle.size * puzzle.size})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
