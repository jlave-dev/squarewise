import type { Puzzle, Difficulty, PuzzleConfig } from '../../types/puzzle';
import { SeededRNG, createRNG } from '../../utils/rng';
import { generateLatinSquare } from './LatinSquare';
import { generateCages, isCageConnected } from './CageGenerator';
import { assignClues, validateClue } from './ClueCalculator';
import { hasUniqueSolution } from '../solver/BacktrackSolver';
import { getDifficultyPreset } from '../difficulty/presets';
import { DifficultyEngine, type DifficultyReport, type UniquenessStatus } from '../difficulty/DifficultyEngine';

export interface PuzzleGenerationOptions extends PuzzleConfig {
  maxAttempts?: number;
  validateUniqueness?: boolean | 'auto';
  logAttempts?: boolean;
  requireApproachableOpening?: boolean;
}

export interface PuzzleGenerationAttempt {
  attempt: number;
  puzzleId: string;
  uniquenessStatus: UniquenessStatus;
  difficultyScore: number;
  inTargetBand: boolean;
  approachableOpeningCount: number;
  accepted: boolean;
  rejectionReason?: 'invalid' | 'not-unique' | 'no-approachable-opening';
  validationErrors?: string[];
}

export interface PuzzleGenerationResult {
  puzzle: Puzzle;
  difficultyReport: DifficultyReport;
  attempts: number;
  attemptLog: PuzzleGenerationAttempt[];
}

/**
 * Generate a complete puzzle with the given configuration
 */
export async function generatePuzzle(config: PuzzleGenerationOptions): Promise<Puzzle> {
  return (await generatePuzzleWithReport(config)).puzzle;
}

/**
 * Generate a complete puzzle and return tuning/validation metadata.
 */
export async function generatePuzzleWithReport(config: PuzzleGenerationOptions): Promise<PuzzleGenerationResult> {
  const { size, difficulty, seed } = config;
  const rng = createRNG(seed ?? Date.now().toString());
  const preset = getDifficultyPreset(difficulty);
  const difficultyEngine = new DifficultyEngine(difficulty);

  let attempts = 0;
  const maxAttempts = config.maxAttempts ?? 10;
  const attemptLog: PuzzleGenerationAttempt[] = [];
  const requireApproachableOpening =
    config.requireApproachableOpening ?? (difficulty === 'beginner' || difficulty === 'easy');

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
    const puzzleId = generatePuzzleId(difficulty, size, rng, seed);

    const puzzle: Puzzle = {
      id: puzzleId,
      size,
      difficulty,
      cages,
      solution,
      seed: seed ?? undefined,
    };

    let uniquenessStatus: UniquenessStatus = 'skipped';
    const validation = validatePuzzle(puzzle);
    if (!validation.valid) {
      const report = difficultyEngine.getReport(puzzle, { uniquenessStatus });
      recordAttempt({
        attemptLog,
        attempt: attempts,
        puzzle,
        report,
        uniquenessStatus,
        accepted: false,
        rejectionReason: 'invalid',
        validationErrors: validation.errors,
        logAttempts: config.logAttempts,
      });
      continue;
    }

    const shouldValidateUniqueness =
      config.validateUniqueness === true || (config.validateUniqueness !== false && size <= 7);

    if (shouldValidateUniqueness) {
      const hasUnique = await hasUniqueSolution(puzzle);
      uniquenessStatus = hasUnique ? 'unique' : 'multiple';
      if (!hasUnique) {
        const report = difficultyEngine.getReport(puzzle, { uniquenessStatus });
        recordAttempt({
          attemptLog,
          attempt: attempts,
          puzzle,
          report,
          uniquenessStatus,
          accepted: false,
          rejectionReason: 'not-unique',
          logAttempts: config.logAttempts,
        });
        continue;
      }
    }

    const difficultyReport = difficultyEngine.getReport(puzzle, { uniquenessStatus });
    const hasApproachableOpening = difficultyReport.signals.approachableOpeningCount > 0;

    if (requireApproachableOpening && !hasApproachableOpening) {
      recordAttempt({
        attemptLog,
        attempt: attempts,
        puzzle,
        report: difficultyReport,
        uniquenessStatus,
        accepted: false,
        rejectionReason: 'no-approachable-opening',
        logAttempts: config.logAttempts,
      });
      continue;
    }

    recordAttempt({
      attemptLog,
      attempt: attempts,
      puzzle,
      report: difficultyReport,
      uniquenessStatus,
      accepted: true,
      logAttempts: config.logAttempts,
    });

    return {
      puzzle,
      difficultyReport,
      attempts,
      attemptLog,
    };
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

  const puzzle: Puzzle = {
    id: generatePuzzleId(difficulty, size, rng, seed),
    size,
    difficulty,
    cages,
    solution,
    seed: seed ?? undefined,
  };

  const validation = validatePuzzle(puzzle);
  if (!validation.valid) {
    throw new Error(`Generated invalid puzzle: ${validation.errors.join('; ')}`);
  }

  return puzzle;
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
function generatePuzzleId(difficulty: Difficulty, size: number, rng: SeededRNG, seed?: string): string {
  if (seed) {
    const safeSeed = seed
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${safeSeed}-${size}x${size}`;
  }

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
    if (cage.cells.length === 0) {
      errors.push(`Cage ${cage.id} has no cells`);
    } else if (!isCageConnected(cage.cells)) {
      errors.push(`Cage ${cage.id} is disconnected`);
    }

    const values: number[] = [];
    let allCellsInBounds = true;

    for (const cell of cage.cells) {
      if (cell.row < 0 || cell.row >= puzzle.size || cell.col < 0 || cell.col >= puzzle.size) {
        errors.push(`Cell (${cell.row}, ${cell.col}) is outside the ${puzzle.size}x${puzzle.size} grid`);
        allCellsInBounds = false;
        continue;
      }

      const key = `${cell.row},${cell.col}`;
      if (covered.has(key)) {
        errors.push(`Cell (${cell.row}, ${cell.col}) is covered multiple times`);
      }
      covered.add(key);
      values.push(puzzle.solution[cell.row][cell.col]);
    }

    if (allCellsInBounds && !validateClue(cage.clue, values)) {
      errors.push(`Cage ${cage.id} clue does not match the solution`);
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

function recordAttempt({
  attemptLog,
  attempt,
  puzzle,
  report,
  uniquenessStatus,
  accepted,
  rejectionReason,
  validationErrors,
  logAttempts,
}: {
  attemptLog: PuzzleGenerationAttempt[];
  attempt: number;
  puzzle: Puzzle;
  report: DifficultyReport;
  uniquenessStatus: UniquenessStatus;
  accepted: boolean;
  rejectionReason?: PuzzleGenerationAttempt['rejectionReason'];
  validationErrors?: string[];
  logAttempts?: boolean;
}): void {
  const entry: PuzzleGenerationAttempt = {
    attempt,
    puzzleId: puzzle.id,
    uniquenessStatus,
    difficultyScore: report.score,
    inTargetBand: report.inTargetBand,
    approachableOpeningCount: report.signals.approachableOpeningCount,
    accepted,
    rejectionReason,
    validationErrors,
  };

  attemptLog.push(entry);

  if (logAttempts) {
    console.info('[SquareWise] Puzzle generation attempt', entry);
  }
}
