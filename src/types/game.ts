import type { Puzzle, Grid, NotesGrid, Difficulty, Cell } from './puzzle';

// Game states
export type GameStatus = 'idle' | 'playing' | 'paused' | 'won';

export type HintTier = 1 | 2 | 3 | 4;

export interface HintUsage {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
}

// Player's game state
export interface GameState {
  puzzle: Puzzle;
  grid: Grid;
  notes: NotesGrid;
  selectedCell: Cell | null;
  status: GameStatus;
  timer: number; // seconds elapsed
  hintsUsed: number;
  hintUsage: HintUsage;
  mistakeCount: number;
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
export type DailyBadge = 'no-hint' | 'no-reveal' | 'mistake-free' | 'personal-best';

export interface DailyCompletion {
  date: string;
  difficulty: Difficulty;
  puzzleId: string;
  completedAt: string;
  time: number;
  hintUsage: HintUsage;
  mistakes: number;
  badges: DailyBadge[];
}

export interface PlayerStats {
  puzzlesCompleted: Record<Difficulty, number>;
  bestTimes: Record<Difficulty, number | null>;
  totalTime: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  dailyCompletions: Record<string, DailyCompletion>;
}

// User settings
export interface UserSettings {
  theme: 'light' | 'dark';
  showTimer: boolean;
  showErrors: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
  autoRemoveNotes: boolean;
}
