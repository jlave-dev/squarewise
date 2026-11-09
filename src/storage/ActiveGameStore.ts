import type { Cell, Puzzle } from '../types/puzzle';
import type { GameStatus, HintUsage } from '../types/game';
import { validatePuzzle } from '../engine/generator/PuzzleGenerator';
import { getDifficulties } from '../engine/difficulty/presets';

const ACTIVE_GAME_KEY = 'squarewise.activeGame.v1';

type PersistableStatus = Extract<GameStatus, 'playing' | 'paused'>;

export interface ActiveGameSnapshot {
  puzzle: Puzzle;
  grid: number[][];
  notes: number[][][];
  timer: number;
  hintsUsed: number;
  hintUsage: HintUsage;
  mistakeCount: number;
  status: PersistableStatus;
  selectedCell: Cell | null;
  notesMode: boolean;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isCell = (value: unknown, size: number): value is Cell => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { row?: unknown; col?: unknown };
  return typeof candidate.row === 'number' && typeof candidate.col === 'number' &&
    Number.isInteger(candidate.row) && Number.isInteger(candidate.col) &&
    candidate.row >= 0 && candidate.row < size && candidate.col >= 0 && candidate.col < size;
};

const isCount = (value: unknown): value is number => isFiniteNumber(value) && Number.isSafeInteger(value);

const createEmptyHintUsage = (): HintUsage => ({
  tier1: 0,
  tier2: 0,
  tier3: 0,
  tier4: 0,
});

const isHintUsage = (value: unknown): value is HintUsage => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HintUsage>;
  return (
    isCount(candidate.tier1) &&
    isCount(candidate.tier2) &&
    isCount(candidate.tier3) &&
    isCount(candidate.tier4)
  );
};

const isGrid = (value: unknown, size: number, minimum = 0): value is number[][] => {
  if (!Array.isArray(value) || value.length !== size) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === size &&
      row.every((cell) => Number.isInteger(cell) && cell >= minimum && cell <= size)
  );
};

const isNotes = (value: unknown, size: number): value is number[][][] => {
  if (!Array.isArray(value) || value.length !== size) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === size &&
      row.every(
        (cell) =>
          Array.isArray(cell) &&
          cell.every((note) => Number.isInteger(note) && note >= 1 && note <= size)
      )
  );
};

function isPuzzle(value: unknown): value is Puzzle {
  if (!value || typeof value !== 'object') return false;
  const puzzle = value as Partial<Puzzle>;
  const size = puzzle.size;
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 1 || size > 9) return false;
  if (typeof puzzle.id !== 'string' || !puzzle.id.trim() || !getDifficulties().includes(puzzle.difficulty!)) return false;
  if (puzzle.seed !== undefined && typeof puzzle.seed !== 'string') return false;
  if (!isGrid(puzzle.solution, size, 1) || !Array.isArray(puzzle.cages) || puzzle.cages.length > size * size) return false;
  const ids = new Set<number>();
  for (const cage of puzzle.cages) {
    if (!cage || typeof cage !== 'object' || !isCount(cage.id) || ids.has(cage.id)) return false;
    ids.add(cage.id);
    if (!Array.isArray(cage.cells) || cage.cells.length === 0 || cage.cells.length > size * size ||
        !cage.cells.every(cell => isCell(cell, size))) return false;
    if (!cage.clue || !isCount(cage.clue.target) || !['none', '+', '-', '×', '÷'].includes(cage.clue.operation)) return false;
    if (cage.color !== undefined && typeof cage.color !== 'string') return false;
  }
  return validatePuzzle(puzzle as Puzzle).valid;
}

function isActiveGameSnapshot(value: unknown): value is ActiveGameSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<ActiveGameSnapshot>;
  if (!isPuzzle(candidate.puzzle)) return false;
  const size = candidate.puzzle.size;

  const status = candidate.status;
  const hasValidStatus = status === 'playing' || status === 'paused';
  const hasValidSelectedCell =
    candidate.selectedCell === null || isCell(candidate.selectedCell, size);

  return Boolean(
    candidate.puzzle &&
      Array.isArray(candidate.puzzle.cages) &&
      isGrid(candidate.grid, size) &&
      isNotes(candidate.notes, size) &&
      isFiniteNumber(candidate.timer) &&
      isCount(candidate.hintsUsed) &&
      (candidate.hintUsage === undefined || isHintUsage(candidate.hintUsage)) &&
      (candidate.mistakeCount === undefined || isCount(candidate.mistakeCount)) &&
      hasValidStatus &&
      hasValidSelectedCell &&
      typeof candidate.notesMode === 'boolean'
  );
}

export function saveActiveGame(snapshot: ActiveGameSnapshot): void {
  try {
    localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save active game:', error);
  }
}

export function loadActiveGame(): ActiveGameSnapshot | null {
  try {
    const raw = localStorage.getItem(ACTIVE_GAME_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isActiveGameSnapshot(parsed)) {
      clearActiveGame();
      return null;
    }
    parsed.hintUsage ??= createEmptyHintUsage();
    parsed.mistakeCount ??= 0;
    return parsed;
  } catch {
    clearActiveGame();
    return null;
  }
}

export function clearActiveGame(): void {
  try {
    localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch (error) {
    console.error('Failed to clear active game:', error);
  }
}
