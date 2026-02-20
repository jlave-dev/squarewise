// Cell position in the grid
export interface Cell {
  row: number;
  col: number;
}

// Operation types for cage constraints
export type Operation = '+' | '-' | '×' | '÷' | 'none';

// Clue shown in a cage (e.g., "7+", "12×", "3-")
export interface Clue {
  target: number;
  operation: Operation;
}

// A cage (region of cells with a constraint)
export interface Cage {
  id: number;
  cells: Cell[];
  clue: Clue;
  color?: string; // Optional cage color
}

// Difficulty levels
export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

// Complete puzzle definition
export interface Puzzle {
  id: string;
  size: number;
  difficulty: Difficulty;
  cages: Cage[];
  solution: number[][]; // The solved grid
  seed?: string; // For reproducible puzzles
}

// Player's current grid state (0 = empty)
export type Grid = number[][];

// Note/pencil marks in a cell
export type Notes = Set<number>;

// Grid with notes
export type NotesGrid = Notes[][];

// Puzzle generation config
export interface PuzzleConfig {
  size: number;
  difficulty: Difficulty;
  seed?: string;
}
