import type { GameState, GameStatus, HintTier, HintUsage } from '../types/game';
import type { Puzzle, Cell, Grid, NotesGrid } from '../types/puzzle';

type StateChangeListener = (state: GameState) => void;

interface StateHistoryEntry {
  state: GameState;
  timestamp: number;
  action: string;
}

const createEmptyNotes = (size: number): NotesGrid => {
  return Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => new Set<number>())
  );
};

const createEmptyGrid = (size: number): Grid => {
  return Array(size).fill(null).map(() => Array(size).fill(0));
};

const createEmptyHintUsage = (): HintUsage => ({
  tier1: 0,
  tier2: 0,
  tier3: 0,
  tier4: 0,
});

export class StateManager {
  private state: GameState;
  private listeners: Set<StateChangeListener> = new Set();
  private history: StateHistoryEntry[] = [];
  private maxHistorySize = 50;

  constructor(puzzle: Puzzle) {
    this.state = this.createInitialState(puzzle);
  }

  private createInitialState(puzzle: Puzzle): GameState {
    return {
      puzzle,
      grid: createEmptyGrid(puzzle.size),
      notes: createEmptyNotes(puzzle.size),
      selectedCell: null,
      status: 'idle',
      timer: 0,
      hintsUsed: 0,
      hintUsage: createEmptyHintUsage(),
      mistakeCount: 0,
      errors: [],
    };
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Update state with partial changes
   */
  private updateState(partial: Partial<GameState>, action: string = 'state:update'): void {
    const previousState = this.state;
    this.state = { ...this.state, ...partial };

    // Add to history for debugging
    this.history.push({
      state: { ...previousState },
      timestamp: Date.now(),
      action,
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.notify();
  }

  // === State Mutations ===

  /**
   * Start a new game
   */
  startGame(): void {
    this.updateState({ status: 'playing' }, 'game:start');
  }

  /**
   * Pause the game
   */
  pauseGame(): void {
    if (this.state.status === 'playing') {
      this.updateState({ status: 'paused' }, 'game:pause');
    }
  }

  /**
   * Resume the game
   */
  resumeGame(): void {
    if (this.state.status === 'paused') {
      this.updateState({ status: 'playing' }, 'game:resume');
    }
  }

  /**
   * Mark game as won
   */
  winGame(): void {
    this.updateState({ status: 'won' }, 'game:win');
  }

  /**
   * Select a cell
   */
  selectCell(cell: Cell | null): void {
    this.updateState({ selectedCell: cell }, 'cell:select');
  }

  /**
   * Set a cell value
   */
  setCell(cell: Cell, value: number, options: { autoRemoveNotes?: boolean } = {}): void {
    const newGrid = this.state.grid.map((row, r) =>
      row.map((v, c) => (r === cell.row && c === cell.col ? value : v))
    );
    const cellsToRemoveFrom = options.autoRemoveNotes
      ? this.getCellsAffectedByPlacement(cell)
      : new Set<string>();

    // Clear notes for this cell when setting value
    const newNotes = this.state.notes.map((row, r) =>
      row.map((notes, c) => {
        if (r === cell.row && c === cell.col) {
          return new Set<number>();
        }
        const nextNotes = new Set(notes);
        if (
          cellsToRemoveFrom.has(`${r},${c}`) &&
          this.state.grid[r][c] === 0
        ) {
          nextNotes.delete(value);
        }
        return nextNotes;
      })
    );

    this.updateState({ grid: newGrid, notes: newNotes }, 'cell:set');
  }

  /**
   * Clear a cell value
   */
  clearCell(cell: Cell): void {
    const newGrid = this.state.grid.map((row, r) =>
      row.map((v, c) => (r === cell.row && c === cell.col ? 0 : v))
    );
    this.updateState({ grid: newGrid }, 'cell:clear');
  }

  /**
   * Toggle a note value in a cell
   */
  toggleNote(cell: Cell, value: number): void {
    const newNotes = this.state.notes.map((row, r) =>
      row.map((notes, c) => {
        if (r === cell.row && c === cell.col) {
          const newSet = new Set(notes);
          if (newSet.has(value)) {
            newSet.delete(value);
          } else {
            newSet.add(value);
          }
          return newSet;
        }
        return new Set(notes);
      })
    );
    this.updateState({ notes: newNotes }, 'note:toggle');
  }

  /**
   * Set notes for a cell
   */
  setNotes(cell: Cell, values: Set<number>): void {
    const newNotes = this.state.notes.map((row, r) =>
      row.map((notes, c) => {
        if (r === cell.row && c === cell.col) {
          return new Set(values);
        }
        return new Set(notes);
      })
    );
    this.updateState({ notes: newNotes }, 'note:set');
  }

  /**
   * Cells whose candidates are constrained by placing a value in the given cell.
   */
  getCellsAffectedByPlacement(cell: Cell): Set<string> {
    const affected = new Set<string>();

    for (let col = 0; col < this.state.puzzle.size; col++) {
      if (col !== cell.col) affected.add(`${cell.row},${col}`);
    }

    for (let row = 0; row < this.state.puzzle.size; row++) {
      if (row !== cell.row) affected.add(`${row},${cell.col}`);
    }

    const cage = this.state.puzzle.cages.find((candidate) =>
      candidate.cells.some((cageCell) => cageCell.row === cell.row && cageCell.col === cell.col)
    );
    if (cage) {
      for (const cageCell of cage.cells) {
        if (cageCell.row === cell.row && cageCell.col === cell.col) continue;
        affected.add(`${cageCell.row},${cageCell.col}`);
      }
    }

    return affected;
  }

  /**
   * Update timer
   */
  updateTimer(seconds: number): void {
    if (this.state.timer === seconds) return;
    this.updateState({ timer: seconds }, 'timer:update');
  }

  /**
   * Increment hints used
   */
  useHint(tier: HintTier): void {
    this.updateState({
      hintsUsed: this.state.hintsUsed + 1,
      hintUsage: {
        tier1: this.state.hintUsage.tier1 + (tier === 1 ? 1 : 0),
        tier2: this.state.hintUsage.tier2 + (tier === 2 ? 1 : 0),
        tier3: this.state.hintUsage.tier3 + (tier === 3 ? 1 : 0),
        tier4: this.state.hintUsage.tier4 + (tier === 4 ? 1 : 0),
      },
    }, 'hint:use');
  }

  /**
   * Record a committed incorrect value placement for badge and stats tracking.
   */
  recordMistake(): void {
    this.updateState({ mistakeCount: this.state.mistakeCount + 1 }, 'mistake:record');
  }

  /**
   * Set error cells
   */
  setErrors(cells: Cell[]): void {
    this.updateState({ errors: cells }, 'errors:set');
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.updateState({ errors: [] }, 'errors:clear');
  }

  /**
   * Reset the game state
   */
  reset(): void {
    this.state = this.createInitialState(this.state.puzzle);
    this.notify();
  }

  /**
   * Load a new puzzle
   */
  loadPuzzle(puzzle: Puzzle): void {
    this.state = this.createInitialState(puzzle);
    this.notify();
  }

  /**
   * Restore full grid and notes state (for undo/redo)
   */
  restoreState(grid: number[][], notes: Set<number>[][]): void {
    this.state = {
      ...this.state,
      grid: grid.map(row => [...row]),
      notes: notes.map(row =>
        row.map(set => new Set(set))
      ),
    };
    this.notify();
  }

  /**
   * Restore a full in-progress session snapshot
   */
  restoreSession(session: {
    grid: number[][];
    notes: Set<number>[][];
    selectedCell: Cell | null;
    status: 'playing' | 'paused' | 'won';
    timer: number;
    hintsUsed: number;
    hintUsage?: HintUsage;
    mistakeCount?: number;
  }): void {
    this.state = {
      ...this.state,
      grid: session.grid.map((row) => [...row]),
      notes: session.notes.map((row) => row.map((set) => new Set(set))),
      selectedCell: session.selectedCell,
      status: session.status,
      timer: session.timer,
      hintsUsed: session.hintsUsed,
      hintUsage: session.hintUsage ?? createEmptyHintUsage(),
      mistakeCount: session.mistakeCount ?? 0,
    };
    this.notify();
  }

  /**
   * Get current game status
   */
  getStatus(): GameStatus {
    return this.state.status;
  }

  /**
   * Check if the puzzle is complete
   */
  checkWin(): boolean {
    const { puzzle, grid } = this.state;

    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        if (grid[row][col] !== puzzle.solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get state history for debugging
   */
  getHistory(): readonly StateHistoryEntry[] {
    return this.history;
  }

  /**
   * Clear state history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Serialize state for saving
   */
  serialize(): string {
    return JSON.stringify({
      puzzleId: this.state.puzzle.id,
      grid: this.state.grid,
      notes: this.state.notes.map(row =>
        row.map(set => Array.from(set))
      ),
      timer: this.state.timer,
      hintsUsed: this.state.hintsUsed,
      hintUsage: this.state.hintUsage,
      mistakeCount: this.state.mistakeCount,
      status: this.state.status,
    });
  }
}
