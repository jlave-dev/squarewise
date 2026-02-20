import type { Cell, Puzzle } from '../types/puzzle';
import type { GameStatus } from '../types/game';

const ACTIVE_GAME_KEY = 'squarewise.activeGame.v1';

type PersistableStatus = Extract<GameStatus, 'playing' | 'paused'>;

export interface ActiveGameSnapshot {
  puzzle: Puzzle;
  grid: number[][];
  notes: number[][][];
  timer: number;
  hintsUsed: number;
  status: PersistableStatus;
  selectedCell: Cell | null;
  notesMode: boolean;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isCell = (value: unknown): value is Cell => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { row?: unknown; col?: unknown };
  return Number.isInteger(candidate.row) && Number.isInteger(candidate.col);
};

const isGrid = (value: unknown, size: number): value is number[][] => {
  if (!Array.isArray(value) || value.length !== size) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === size &&
      row.every((cell) => Number.isInteger(cell))
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
          cell.every((note) => Number.isInteger(note))
      )
  );
};

function isActiveGameSnapshot(value: unknown): value is ActiveGameSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<ActiveGameSnapshot>;
  const size = candidate.puzzle?.size;
  if (!size || !Number.isInteger(size) || size <= 0) return false;

  const status = candidate.status;
  const hasValidStatus = status === 'playing' || status === 'paused';
  const hasValidSelectedCell =
    candidate.selectedCell === null || isCell(candidate.selectedCell);

  return Boolean(
    candidate.puzzle &&
      Array.isArray(candidate.puzzle.cages) &&
      isGrid(candidate.grid, size) &&
      isNotes(candidate.notes, size) &&
      isFiniteNumber(candidate.timer) &&
      isFiniteNumber(candidate.hintsUsed) &&
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
    return parsed;
  } catch (error) {
    console.error('Failed to load active game:', error);
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
