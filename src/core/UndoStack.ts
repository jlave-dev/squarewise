import type { GameAction, GameState } from '../types/game';

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
    // Serialize notes to array for storage
    const serializedNotes = notes.map(row =>
      row.map(set => new Set(set))
    );

    this.undoStack.push({
      grid: grid.map(row => [...row]),
      notes: serializedNotes,
      action,
    });

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
  undo(): UndoState | null {
    if (this.undoStack.length === 0) return null;

    const state = this.undoStack.pop()!;
    return state;
  }

  /**
   * Redo the last undone action
   */
  redo(): UndoState | null {
    if (this.redoStack.length === 0) return null;

    const state = this.redoStack.pop()!;
    this.undoStack.push(state);
    return state;
  }

  /**
   * Save current state to redo stack (called before undo)
   */
  saveForRedo(grid: number[][], notes: Set<number>[][], action: GameAction): void {
    const serializedNotes = notes.map(row =>
      row.map(set => new Set(set))
    );

    this.redoStack.push({
      grid: grid.map(row => [...row]),
      notes: serializedNotes,
      action,
    });
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
