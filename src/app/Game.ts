import type { Puzzle, Cell, Cage, Difficulty, PuzzleConfig } from '../types/puzzle';
import type {
  DailyBadge,
  UserSettings,
  GameStatus,
  HintTier,
  HintUsage,
} from '../types/game';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { InputHandler } from './InputHandler';
import { StateManager } from './StateManager';
import { Timer } from '../core/Timer';
import { UndoStack } from '../core/UndoStack';
import { Validator } from '../engine/validation/Validator';
import { generatePuzzle } from '../engine/generator/PuzzleGenerator';
import { getDifficultyPreset } from '../engine/difficulty/presets';
import { statsStore } from '../storage/StatsStore';
import { HintSystem, type HintStep } from '../core/HintSystem';
import {
  buildBoardRenderState,
  type BoardRenderState,
} from '../renderer/boardRenderState';
import {
  clearActiveGame,
  loadActiveGame,
  saveActiveGame,
} from '../storage/ActiveGameStore';

export interface GameCallbacks {
  onWin?: (stats: {
    time: number;
    hintsUsed: number;
    hintUsage: HintUsage;
    mistakes: number;
    difficulty: Difficulty;
    gridSize: number;
    isNewBest: boolean;
    mode: GameSnapshot['mode'];
    date: string | null;
    puzzleId: string;
    badges: DailyBadge[];
    dailyStreak: number | null;
  }) => void;
  onTimerUpdate?: (elapsed: number) => void;
  onStateChange?: (snapshot: GameSnapshot) => void;
}

export interface DebugSessionState {
  grid: number[][];
  notes?: number[][][];
  selectedCell: Cell | null;
  status: GameStatus;
  timer: number;
  hintsUsed: number;
  hintUsage?: HintUsage;
  mistakeCount?: number;
  notesMode?: boolean;
}

export interface GameSnapshot {
  grid: number[][];
  notes: number[][][];
  selectedCell: Cell | null;
  status: GameStatus;
  timer: number;
  hintsUsed: number;
  hintUsage: HintUsage;
  mistakeCount: number;
  lastHint: HintStep | null;
  notesMode: boolean;
  errors: Cell[];
  cages: Array<Pick<Cage, 'id' | 'cells' | 'clue'>>;
  puzzleId: string;
  difficulty: Difficulty;
  gridSize: number;
  mode: 'daily' | 'fresh' | 'tutorial' | 'archive';
  date: string | null;
  renderState: BoardRenderState;
}

export class Game {
  private renderer: CanvasRenderer;
  private inputHandler: InputHandler;
  private stateManager: StateManager;
  private timer: Timer;
  private undoStack: UndoStack;
  private hintSystem: HintSystem | null = null;
  private validator: Validator | null = null;
  private notesMode: boolean = false;
  private callbacks: GameCallbacks = {};
  private stateUnsubscribe: (() => void) | null = null;
  private showErrors = true;
  private soundEnabled = false;
  private hapticEnabled = true;
  private autoRemoveNotes = false;
  private audioContext: AudioContext | null = null;
  private selectedNumber: number | null = null;
  private lastHint: HintStep | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks = {}) {
    this.callbacks = callbacks;
    this.renderer = new CanvasRenderer(canvas);
    this.timer = new Timer((elapsed) => this.onTimerTick(elapsed));
    this.undoStack = new UndoStack();

    // Create placeholder puzzle for initial state
    const placeholderPuzzle = this.createPlaceholderPuzzle();
    this.stateManager = new StateManager(placeholderPuzzle);
    this.stateUnsubscribe = this.stateManager.subscribe(() => {
      this.persistActiveState();
      this.emitStateChange();
    });

    this.inputHandler = new InputHandler(canvas, {
      onCellSelect: (cell) => this.selectCell(cell),
      onNumberInput: (value) => this.handleNumberInput(value),
      onClear: () => this.clearCell(),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onToggleNotes: () => this.toggleNotesMode(),
      onHint: () => this.showHint(),
      onPause: () => this.togglePause(),
    });

    this.setupResizeHandler();
  }

  private createPlaceholderPuzzle(): Puzzle {
    return {
      id: 'placeholder',
      size: 4,
      difficulty: 'beginner',
      cages: [],
      solution: [[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]],
    };
  }

  /**
   * Start a new game with given difficulty
   */
  async startNewGame(difficulty: Difficulty): Promise<void> {
    console.log('[Game] Starting new game:', difficulty);
    const preset = getDifficultyPreset(difficulty);

    const config: PuzzleConfig = {
      size: preset.gridSize,
      difficulty,
    };

    console.log('[Game] Generating puzzle...');

    let puzzle: Puzzle;
    try {
      puzzle = await generatePuzzle(config);
    } catch (error) {
      console.error('[Game] Failed to generate puzzle:', error);
      alert('Failed to generate puzzle. Please try again.');
      return;
    }

    console.log('[Game] Puzzle generated:', puzzle.id, 'size:', puzzle.size, 'cages:', puzzle.cages.length);
    this.loadPuzzle(puzzle);
  }

  /**
   * Load a puzzle into the game
   */
  loadPuzzle(puzzle: Puzzle): void {
    console.log('[Game] Loading puzzle:', puzzle.id);
    this.preparePuzzle(puzzle);
    this.stateManager.startGame();
    this.timer.start();
    this.callbacks.onTimerUpdate?.(0);

    console.log('[Game] Rendering puzzle...');
    this.render();
    console.log('[Game] Puzzle loaded and rendered');
  }

  /**
   * Resume the latest in-progress puzzle from local persistence
   */
  async resumeActiveGame(): Promise<boolean> {
    const snapshot = loadActiveGame();
    if (!snapshot) return false;

    console.log('[Game] Resuming active puzzle:', snapshot.puzzle.id);
    this.preparePuzzle(snapshot.puzzle);

    const notes = snapshot.notes.map((row) =>
      row.map((cellNotes) => new Set(cellNotes))
    );

    this.stateManager.restoreSession({
      grid: snapshot.grid,
      notes,
      selectedCell: snapshot.selectedCell,
      status: snapshot.status,
      timer: snapshot.timer,
      hintsUsed: snapshot.hintsUsed,
      hintUsage: snapshot.hintUsage,
      mistakeCount: snapshot.mistakeCount,
    });

    this.timer.setElapsed(snapshot.timer);
    this.notesMode = snapshot.notesMode;

    if (snapshot.status === 'playing') {
      this.timer.start();
    } else {
      this.timer.pause();
    }

    this.updateValidationErrors();
    this.callbacks.onTimerUpdate?.(snapshot.timer);
    this.render();
    return true;
  }

  /**
   * Handle timer tick
   */
  private onTimerTick(elapsed: number): void {
    this.stateManager.updateTimer(elapsed);
    this.callbacks.onTimerUpdate?.(elapsed);
  }

  /**
   * Whether gameplay interactions should be processed
   */
  private canInteract(): boolean {
    return this.stateManager.getStatus() === 'playing';
  }

  /**
   * Select a cell
   */
  selectCell(cell: Cell): void {
    if (!this.canInteract()) return;
    this.inputHandler.setSelectedCell(cell);
    this.stateManager.selectCell(cell);
    const value = this.stateManager.getState().grid[cell.row][cell.col];
    if (value > 0) {
      this.selectedNumber = value;
    }
    this.render();
  }

  /**
   * Handle number input
   */
  private handleNumberInput(value: number): void {
    if (!this.canInteract()) return;
    const cell = this.stateManager.getState().selectedCell;
    if (!cell) return;

    const currentGrid = this.stateManager.getState().grid;
    this.selectedNumber = value;

    if (this.notesMode) {
      // Toggle note
      this.undoStack.push(
        currentGrid,
        this.stateManager.getState().notes,
        { type: 'TOGGLE_NOTE', cell, value }
      );
      this.stateManager.toggleNote(cell, value);
      this.provideFeedback('note');
    } else {
      // Save for undo
      const previousValue = currentGrid[cell.row][cell.col];
      this.undoStack.push(
        currentGrid,
        this.stateManager.getState().notes,
        { type: 'SET_CELL', cell, value, previousValue }
      );

      // Set value
      this.stateManager.setCell(cell, value, {
        autoRemoveNotes: this.autoRemoveNotes,
      });
      if (this.isIncorrectPlacement(cell, value)) {
        this.stateManager.recordMistake();
      }
      this.updateValidationErrors();
      this.provideFeedback('input');

      // Check for win
      if (this.validator?.isComplete(this.stateManager.getState().grid)) {
        void this.handleWin();
      }
    }

    this.render();
  }

  /**
   * Clear the selected cell
   */
  private clearCell(): void {
    if (!this.canInteract()) return;
    const cell = this.stateManager.getState().selectedCell;
    if (!cell) return;

    const currentGrid = this.stateManager.getState().grid;
    const previousValue = currentGrid[cell.row][cell.col];

    if (previousValue !== 0) {
      this.undoStack.push(
        currentGrid,
        this.stateManager.getState().notes,
        { type: 'CLEAR_CELL', cell, previousValue }
      );
    }

    this.stateManager.clearCell(cell);
    this.updateValidationErrors();
    this.provideFeedback('clear');
    this.render();
  }

  /**
   * Undo last action
   */
  private undo(): void {
    if (!this.canInteract()) return;
    const previousState = this.undoStack.undo();
    if (previousState) {
      // Save current state to redo stack before undoing
      const currentState = this.stateManager.getState();
      this.undoStack.saveForRedo(currentState.grid, currentState.notes, previousState.action);

      // Restore the previous state
      this.stateManager.restoreState(previousState.grid, previousState.notes);
      this.updateValidationErrors();
      this.provideFeedback('undo');
      this.render();
    }
  }

  /**
   * Redo last undone action
   */
  private redo(): void {
    if (!this.canInteract()) return;
    const nextState = this.undoStack.redo();
    if (nextState) {
      // Restore the next state
      this.stateManager.restoreState(nextState.grid, nextState.notes);
      this.updateValidationErrors();
      this.provideFeedback('undo');
      this.render();
    }
  }

  /**
   * Toggle notes mode
   */
  private toggleNotesMode(): void {
    this.notesMode = !this.notesMode;
    this.persistActiveState();
    this.emitStateChange();
    this.render();
  }

  /**
   * Show a hint
   */
  private showHint(tier: HintTier = 1): void {
    if (!this.canInteract()) return;
    if (!this.hintSystem) return;

    const state = this.stateManager.getState();
    const hint = this.hintSystem.getHintStep(state.grid, tier);
    if (hint) {
      const targetCell = hint.focus.cells[0] ?? null;
      if (targetCell) {
        this.stateManager.selectCell(targetCell);
      }
      this.lastHint = hint;
      this.stateManager.useHint(tier);

      if (hint.reveal && hint.value !== undefined && targetCell) {
        this.undoStack.push(
          state.grid,
          state.notes,
          {
            type: 'SET_CELL',
            cell: targetCell,
            value: hint.value,
            previousValue: state.grid[targetCell.row][targetCell.col],
          }
        );
        this.stateManager.setCell(targetCell, hint.value, {
          autoRemoveNotes: this.autoRemoveNotes,
        });
        this.updateValidationErrors();

        if (this.validator?.isComplete(this.stateManager.getState().grid)) {
          void this.handleWin();
          return;
        }
      }

      this.provideFeedback('hint');
      this.render();
    }
  }

  /**
   * Toggle pause
   */
  private togglePause(): void {
    const status = this.stateManager.getStatus();
    if (status === 'playing') {
      this.stateManager.pauseGame();
      this.timer.pause();
    } else if (status === 'paused') {
      this.stateManager.resumeGame();
      this.timer.start();
    }
    this.provideFeedback('pause');
    this.render();
  }

  /**
   * Handle winning the game
   */
  private async handleWin(): Promise<void> {
    this.timer.pause();
    this.stateManager.winGame();
    this.stateManager.clearErrors();
    clearActiveGame();
    this.provideFeedback('win');

    const state = this.stateManager.getState();
    const time = state.timer;
    const difficulty = state.puzzle.difficulty;
    const hintsUsed = state.hintsUsed;
    const gridSize = state.puzzle.size;
    const identity = this.getPuzzleIdentity(state.puzzle);

    // Check if this is a new best time
    const isNewBest = statsStore.isBestTime(difficulty, time);
    let badges: DailyBadge[] = [];
    let dailyStreak: number | null = null;

    if (identity.mode === 'daily' && identity.date) {
      const dailyResult = await statsStore.recordDailyCompletion({
        date: identity.date,
        difficulty,
        puzzleId: state.puzzle.id,
        time,
        hintUsage: state.hintUsage,
        mistakes: state.mistakeCount,
      });
      badges = dailyResult.completion.badges;
      dailyStreak = dailyResult.currentDailyStreak;
    }

    await statsStore.recordCompletion(difficulty, time, hintsUsed > 0);

    // Notify app to show win screen
    this.callbacks.onWin?.({
      time,
      hintsUsed,
      hintUsage: { ...state.hintUsage },
      mistakes: state.mistakeCount,
      difficulty,
      gridSize,
      isNewBest,
      mode: identity.mode,
      date: identity.date,
      puzzleId: state.puzzle.id,
      badges,
      dailyStreak,
    });
  }

  /**
   * Render the game
   */
  private render(): void {
    const state = this.stateManager.getState();
    const renderState = this.buildCurrentRenderState();
    this.renderer.setRenderState(renderState);
    this.renderer.render(state.puzzle, state.grid, state.notes, renderState);
    if (state.status === 'paused') {
      this.renderer.drawPauseOverlay();
    }
  }

  /**
   * Handle window resize
   */
  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.render();
    });
  }

  /**
   * Current puzzle size for external UI controls
   */
  getGridSize(): number {
    const state = this.stateManager.getState();
    return state.puzzle.size;
  }

  /**
   * Current puzzle object for debug scenario construction
   */
  getPuzzle(): Puzzle {
    return this.stateManager.getState().puzzle;
  }

  /**
   * Test/dev-only non-solution game snapshot.
   */
  getSnapshot(): GameSnapshot {
    const state = this.stateManager.getState();
    const renderState = this.buildCurrentRenderState();
    return {
      grid: state.grid.map((row) => [...row]),
      notes: this.serializeNotes(state.notes),
      selectedCell: state.selectedCell ? { ...state.selectedCell } : null,
      status: state.status,
      timer: state.timer,
      hintsUsed: state.hintsUsed,
      hintUsage: { ...state.hintUsage },
      mistakeCount: state.mistakeCount,
      lastHint: this.lastHint ? this.cloneHintStep(this.lastHint) : null,
      notesMode: this.notesMode,
      errors: state.errors.map((cell) => ({ ...cell })),
      cages: state.puzzle.cages.map((cage) => ({
        id: cage.id,
        clue: { ...cage.clue },
        cells: cage.cells.map((cell) => ({ ...cell })),
      })),
      puzzleId: state.puzzle.id,
      difficulty: state.puzzle.difficulty,
      gridSize: state.puzzle.size,
      ...this.getPuzzleIdentity(state.puzzle),
      renderState,
    };
  }

  /**
   * Test/dev-only hook: force a full in-memory session state
   */
  applyDebugSession(session: DebugSessionState): void {
    const current = this.stateManager.getState();
    const status = session.status === 'idle' ? 'playing' : session.status;
    const notes = session.notes
      ? session.notes.map((row) => row.map((cellNotes) => new Set(cellNotes)))
      : current.notes;

    this.stateManager.restoreSession({
      grid: session.grid,
      notes,
      selectedCell: session.selectedCell,
      status,
      timer: session.timer,
      hintsUsed: session.hintsUsed,
      hintUsage: session.hintUsage,
      mistakeCount: session.mistakeCount,
    });

    this.timer.setElapsed(session.timer);
    this.notesMode = session.notesMode ?? this.notesMode;
    this.lastHint = null;
    this.selectedNumber = session.selectedCell
      ? session.grid[session.selectedCell.row]?.[session.selectedCell.col] || this.selectedNumber
      : this.selectedNumber;
    if (status === 'playing') {
      this.timer.start();
    } else {
      this.timer.pause();
    }

    if (status === 'won') {
      this.stateManager.clearErrors();
    } else {
      this.updateValidationErrors();
    }

    this.render();
  }

  /**
   * Force redraw, used when visual theme variables change
   */
  refreshVisuals(): void {
    this.render();
  }

  /**
   * Apply runtime user preferences
   */
  applySettings(settings: UserSettings): void {
    this.showErrors = settings.showErrors;
    this.soundEnabled = settings.soundEnabled;
    this.hapticEnabled = settings.hapticFeedback;
    this.autoRemoveNotes = settings.autoRemoveNotes;

    if (this.showErrors) {
      this.updateValidationErrors();
    } else {
      this.stateManager.clearErrors();
    }
    this.render();
  }

  /**
   * Shared setup used for both fresh and resumed puzzles
   */
  private preparePuzzle(puzzle: Puzzle): void {
    this.stateManager.loadPuzzle(puzzle);
    this.renderer.setPuzzle(puzzle);
    this.inputHandler.setGridSize(puzzle.size);

    const rendererConfig = this.renderer.getConfig();
    this.inputHandler.setConfig({
      cellSize: rendererConfig.cellSize,
      padding: rendererConfig.padding,
    });

    this.validator = new Validator(puzzle);
    this.hintSystem = new HintSystem(puzzle);
    this.undoStack.clear();
    this.timer.reset();
    this.notesMode = false;
    this.selectedNumber = null;
    this.lastHint = null;
    this.stateManager.clearErrors();
    console.log('[Game] Input handler config synced:', rendererConfig);
  }

  /**
   * Persist active puzzle snapshot so refresh restores progress
   */
  private persistActiveState(): void {
    const state = this.stateManager.getState();

    if (state.puzzle.id === 'placeholder') return;
    if (state.status !== 'playing' && state.status !== 'paused') return;

    saveActiveGame({
      puzzle: state.puzzle,
      grid: state.grid,
      notes: state.notes.map((row) =>
        row.map((cellNotes) => Array.from(cellNotes))
      ),
      timer: state.timer,
      hintsUsed: state.hintsUsed,
      hintUsage: state.hintUsage,
      mistakeCount: state.mistakeCount,
      status: state.status,
      selectedCell: state.selectedCell,
      notesMode: this.notesMode,
    });
  }

  private buildCurrentRenderState(): BoardRenderState {
    const state = this.stateManager.getState();
    return buildBoardRenderState({
      puzzle: state.puzzle,
      grid: state.grid,
      notes: state.notes,
      selectedCell: state.selectedCell,
      errors: this.showErrors ? state.errors : [],
      notesMode: this.notesMode,
      selectedNumberOverride: this.selectedNumber,
    });
  }

  private emitStateChange(): void {
    this.callbacks.onStateChange?.(this.getSnapshot());
  }

  private serializeNotes(notes: ReadonlyArray<ReadonlyArray<Set<number>>>): number[][][] {
    return notes.map((row) => row.map((cellNotes) => Array.from(cellNotes).sort((a, b) => a - b)));
  }

  private cloneHintStep(hint: HintStep): HintStep {
    return {
      tier: hint.tier,
      focus: {
        cells: hint.focus.cells.map((cell) => ({ ...cell })),
        cageId: hint.focus.cageId,
        eliminatedValue: hint.focus.eliminatedValue,
        reasonCells: hint.focus.reasonCells?.map((cell) => ({ ...cell })),
      },
      value: hint.value,
      reason: hint.reason,
      explanation: hint.explanation,
      reveal: hint.reveal,
    };
  }

  private getPuzzleIdentity(puzzle: Puzzle): {
    mode: GameSnapshot['mode'];
    date: string | null;
  } {
    const seed = puzzle.seed ?? puzzle.id;
    const dailyMatch = seed.match(/^daily-(\d{4}-\d{2}-\d{2})-/);
    if (dailyMatch) {
      return { mode: 'daily', date: dailyMatch[1] };
    }

    if (seed.startsWith('tutorial-')) {
      return { mode: 'tutorial', date: null };
    }

    if (seed.startsWith('archive-')) {
      const archiveMatch = seed.match(/^archive-(\d{4}-\d{2}-\d{2})-/);
      return { mode: 'archive', date: archiveMatch?.[1] ?? null };
    }

    return { mode: 'fresh', date: null };
  }

  /**
   * Recompute current validation errors based on grid state
   */
  private updateValidationErrors(): void {
    if (!this.showErrors || !this.validator) {
      this.stateManager.clearErrors();
      return;
    }

    const errors = this.validator.findAllErrors(this.stateManager.getState().grid);
    this.stateManager.setErrors(errors);
  }

  private isIncorrectPlacement(cell: Cell, value: number): boolean {
    const puzzle = this.stateManager.getState().puzzle;
    return puzzle.solution[cell.row]?.[cell.col] !== value;
  }

  /**
   * Play optional input feedback based on user settings
   */
  private provideFeedback(kind: 'input' | 'note' | 'clear' | 'undo' | 'hint' | 'pause' | 'win'): void {
    this.playTone(kind);
    this.vibrate(kind === 'win' ? 30 : 10);
  }

  private vibrate(durationMs: number): void {
    if (!this.hapticEnabled) return;
    if (!('vibrate' in navigator)) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate(durationMs);
  }

  private playTone(kind: 'input' | 'note' | 'clear' | 'undo' | 'hint' | 'pause' | 'win'): void {
    if (!this.soundEnabled) return;

    const frequencyByKind = {
      input: 620,
      note: 760,
      clear: 420,
      undo: 360,
      hint: 520,
      pause: 300,
      win: 840,
    } as const;

    const frequency = frequencyByKind[kind];

    try {
      this.audioContext ??= new AudioContext();
      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.035;
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);

      const now = this.audioContext.currentTime;
      oscillator.start(now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      oscillator.stop(now + 0.06);
    } catch (error) {
      console.error('Failed to play sound effect:', error);
    }
  }

  /**
   * Set game callbacks
   */
  setCallbacks(callbacks: GameCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stateUnsubscribe?.();
    this.persistActiveState();
    this.timer.destroy();
    this.audioContext?.close().catch(() => {
      // Ignore close failures; tab may already be shutting down.
    });
    this.renderer.destroy();
    this.inputHandler.destroy();
  }
}
