import type { GameAction } from '../types/game';

interface UndoState {
  grid: number[][];
  notes: Set<number>[][];
  action: GameAction;
}

/**
 * Undo/Redo stack for game state
 */
export class UndoStack {
  private undoStack: UndoState[] = [];
  private redoStack: UndoState[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Push a new state onto the undo stack
   */
  push(grid: number[][], notes: Set<number>[][], action: GameAction): void {
    this.undoStack.push(this.snapshot(grid, notes, action));

    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Limit stack size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last action
   * Returns the previous state or null if no undo available
   */
  undo(grid: number[][], notes: Set<number>[][]): UndoState | null {
    const state = this.undoStack.pop();
    if (!state) return null;
    this.redoStack.push(this.snapshot(grid, notes, state.action));
    return state;
  }

  /** Restore a redo target while preserving the current state for the next undo. */
  redo(grid: number[][], notes: Set<number>[][]): UndoState | null {
    const state = this.redoStack.pop();
    if (!state) return null;
    this.undoStack.push(this.snapshot(grid, notes, state.action));
    return state;
  }

  private snapshot(grid: number[][], notes: Set<number>[][], action: GameAction): UndoState {
    return { grid: grid.map(row => [...row]), notes: notes.map(row => row.map(values => new Set(values))), action };
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get number of undo steps available
   */
  undoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get number of redo steps available
   */
  redoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get the last action (without undoing)
   */
  peekLastAction(): GameAction | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].action;
  }
}
