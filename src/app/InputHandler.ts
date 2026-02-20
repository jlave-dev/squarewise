import type { Cell } from '../types/puzzle';

type CellSelectCallback = (cell: Cell) => void;
type NumberInputCallback = (value: number) => void;
type ActionCallback = () => void;

interface InputCallbacks {
  onCellSelect?: CellSelectCallback;
  onNumberInput?: NumberInputCallback;
  onClear?: ActionCallback;
  onUndo?: ActionCallback;
  onRedo?: ActionCallback;
  onToggleNotes?: ActionCallback;
  onHint?: ActionCallback;
  onPause?: ActionCallback;
  onEscape?: ActionCallback;
}

interface InputConfig {
  cellSize: number;
  padding: number;
}

const DEFAULT_CONFIG: InputConfig = {
  cellSize: 50,
  padding: 20,
};

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private callbacks: InputCallbacks;
  private config: InputConfig;
  private selectedCell: Cell | null = null;
  private gridSize: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: InputCallbacks = {}, config: Partial<InputConfig> = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupEventListeners();
  }

  /**
   * Update the input configuration to match renderer
   */
  setConfig(config: Partial<InputConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set the grid size for validation
   */
  setGridSize(size: number): void {
    this.gridSize = size;
  }

  /**
   * Update the selected cell
   */
  setSelectedCell(cell: Cell | null): void {
    this.selectedCell = cell;
  }

  /**
   * Get current selected cell
   */
  getSelectedCell(): Cell | null {
    return this.selectedCell;
  }

  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('click', this.handleMouseClick);
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleMouseClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.handlePointInput(x, y);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.handlePointInput(x, y);
  };

  private handlePointInput(x: number, y: number): void {
    // Calculate cell from point using configured padding and cell size
    const padding = this.config.padding;
    const cellSize = this.config.cellSize;

    const col = Math.floor((x - padding) / cellSize);
    const row = Math.floor((y - padding) / cellSize);

    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      this.selectedCell = { row, col };
      this.callbacks.onCellSelect?.(this.selectedCell);
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Number keys 1-9
    if (e.key >= '1' && e.key <= '9') {
      const value = parseInt(e.key, 10);
      if (value <= this.gridSize) {
        this.callbacks.onNumberInput?.(value);
      }
      return;
    }

    // Arrow keys for navigation
    if (this.selectedCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      this.navigateCell(e.key);
      return;
    }

    // Other keys
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        this.callbacks.onClear?.();
        break;
      case 'z':
      case 'Z':
        if (e.ctrlKey || e.metaKey) {
          if (e.shiftKey) {
            this.callbacks.onRedo?.();
          } else {
            this.callbacks.onUndo?.();
          }
        }
        break;
      case 'y':
      case 'Y':
        if (e.ctrlKey || e.metaKey) {
          this.callbacks.onRedo?.();
        }
        break;
      case 'n':
      case 'N':
        this.callbacks.onToggleNotes?.();
        break;
      case 'h':
      case 'H':
        this.callbacks.onHint?.();
        break;
      case 'p':
      case 'P':
      case 'Escape':
        this.callbacks.onPause?.();
        this.callbacks.onEscape?.();
        break;
    }
  };

  private navigateCell(direction: string): void {
    if (!this.selectedCell) return;

    let { row, col } = this.selectedCell;

    switch (direction) {
      case 'ArrowUp':
        row = Math.max(0, row - 1);
        break;
      case 'ArrowDown':
        row = Math.min(this.gridSize - 1, row + 1);
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        col = Math.min(this.gridSize - 1, col + 1);
        break;
    }

    this.selectedCell = { row, col };
    this.callbacks.onCellSelect?.(this.selectedCell);
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('click', this.handleMouseClick);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}
