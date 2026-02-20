import type { Puzzle, Grid, NotesGrid, Difficulty, Cell } from './puzzle';

// Game states
export type GameStatus = 'idle' | 'playing' | 'paused' | 'won';

// Player's game state
export interface GameState {
  puzzle: Puzzle;
  grid: Grid;
  notes: NotesGrid;
  selectedCell: Cell | null;
  status: GameStatus;
  timer: number; // seconds elapsed
  hintsUsed: number;
  errors: Cell[]; // Cells with mistakes
}

// Actions for undo/redo
export type GameAction =
  | { type: 'SET_CELL'; cell: Cell; value: number; previousValue: number }
  | { type: 'CLEAR_CELL'; cell: Cell; previousValue: number }
  | { type: 'TOGGLE_NOTE'; cell: Cell; value: number }
  | { type: 'SET_NOTES'; cell: Cell; notes: Set<number> };

// Timer state
export interface TimerState {
  elapsed: number;
  running: boolean;
}

// Player statistics
export interface PlayerStats {
  puzzlesCompleted: Record<Difficulty, number>;
  bestTimes: Record<Difficulty, number | null>;
  totalTime: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
}

// User settings
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  showTimer: boolean;
  showErrors: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
}
