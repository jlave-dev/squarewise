import type { Cell, NotesGrid, Puzzle } from '../types/puzzle';
import { getNoteAnchor } from './noteLayout';
import {
  EMPTY_BOARD_RENDER_STATE,
  type BoardRenderState,
} from './boardRenderState';

interface RendererConfig {
  cellSize: number;
  padding: number;
  fontSize: number;
  clueFontSize: number;
}

const DEFAULT_CONFIG: RendererConfig = {
  cellSize: 100,
  padding: 20,
  fontSize: 60,
  clueFontSize: 22,
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;
  private dpr: number;
  private logicalCanvasSize = 0;
  private puzzle: Puzzle | null = null;
  private grid: number[][] | null = null;
  private notes: NotesGrid | null = null;
  private renderState: BoardRenderState = EMPTY_BOARD_RENDER_STATE;
  private errorCells: Set<string> = new Set();
  private readonly resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, config: Partial<RendererConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dpr = window.devicePixelRatio || 1;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resizeHandler = () => this.handleResize();

    window.addEventListener('resize', this.resizeHandler);
  }

  private syncCanvasSize(): void {
    if (this.logicalCanvasSize === 0) {
      return;
    }

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.style.setProperty('--board-ideal-size', `${this.logicalCanvasSize}px`);
    this.canvas.style.width = `min(${this.logicalCanvasSize}px, var(--board-max-size, ${this.logicalCanvasSize}px))`;
    this.canvas.style.height = `min(${this.logicalCanvasSize}px, var(--board-max-size, ${this.logicalCanvasSize}px))`;
    this.canvas.width = this.logicalCanvasSize * this.dpr;
    this.canvas.height = this.logicalCanvasSize * this.dpr;

    // Reset transformation before scaling to avoid cumulative scaling
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    console.log('[CanvasRenderer] Canvas setup complete:', this.logicalCanvasSize, 'x', this.logicalCanvasSize, 'DPR:', this.dpr);
  }

  private handleResize(): void {
    this.syncCanvasSize();
    if (this.puzzle && this.grid && this.notes) {
      this.render(this.puzzle, this.grid, this.notes, this.renderState);
    }
  }

  /**
   * Set the puzzle to render
   */
  setPuzzle(puzzle: Puzzle): void {
    console.log('[CanvasRenderer] Setting puzzle:', puzzle.id, 'size:', puzzle.size);
    this.puzzle = puzzle;
    this.grid = Array(puzzle.size).fill(null).map(() => Array(puzzle.size).fill(0));
    this.adjustCanvasSize();
    console.log('[CanvasRenderer] Canvas size after adjustCanvasSize:', this.canvas.style.width, 'x', this.canvas.style.height);
  }

  /**
   * Get the current renderer configuration
   */
  getConfig(): RendererConfig {
    return { ...this.config };
  }

  /**
   * Adjust canvas size to fit the puzzle
   */
  private adjustCanvasSize(): void {
    if (!this.puzzle) return;

    const gridSize = this.puzzle.size * this.config.cellSize;
    this.logicalCanvasSize = gridSize + this.config.padding * 2;
    this.syncCanvasSize();
    console.log('[CanvasRenderer] Canvas adjusted to:', this.logicalCanvasSize, 'x', this.logicalCanvasSize, 'internal:', this.canvas.width, 'x', this.canvas.height);
  }

  /**
   * Update the player's grid state
   */
  updateGrid(grid: number[][]): void {
    this.grid = grid;
  }

  /**
   * Set the selected cell for highlighting
   */
  setSelectedCell(cell: { row: number; col: number } | null): void {
    this.renderState = {
      ...this.renderState,
      selectedCell: cell,
    };
  }

  /**
   * Set cells currently marked as validation errors
   */
  setErrorCells(cells: Cell[]): void {
    this.errorCells = new Set(cells.map((cell) => `${cell.row},${cell.col}`));
    this.renderState = {
      ...this.renderState,
      errors: cells.map((cell) => ({ ...cell })),
    };
  }

  /**
   * Provide all contextual state needed to render board affordances.
   */
  setRenderState(state: BoardRenderState): void {
    this.renderState = {
      selectedCell: state.selectedCell ? { ...state.selectedCell } : null,
      selectedNumber: state.selectedNumber,
      selectedCageId: state.selectedCageId,
      relatedCells: state.relatedCells.map((cell) => ({ ...cell })),
      selectedCageCells: state.selectedCageCells.map((cell) => ({ ...cell })),
      matchingValueCells: state.matchingValueCells.map((cell) => ({ ...cell })),
      matchingNoteCells: state.matchingNoteCells.map((cell) => ({ ...cell })),
      notesMode: state.notesMode,
      errors: state.errors.map((cell) => ({ ...cell })),
    };
    this.errorCells = new Set(state.errors.map((cell) => `${cell.row},${cell.col}`));
  }

  /**
   * Test/debug snapshot of the visible render contract.
   */
  getRenderStateSnapshot(): BoardRenderState {
    return {
      selectedCell: this.renderState.selectedCell ? { ...this.renderState.selectedCell } : null,
      selectedNumber: this.renderState.selectedNumber,
      selectedCageId: this.renderState.selectedCageId,
      relatedCells: this.renderState.relatedCells.map((cell) => ({ ...cell })),
      selectedCageCells: this.renderState.selectedCageCells.map((cell) => ({ ...cell })),
      matchingValueCells: this.renderState.matchingValueCells.map((cell) => ({ ...cell })),
      matchingNoteCells: this.renderState.matchingNoteCells.map((cell) => ({ ...cell })),
      notesMode: this.renderState.notesMode,
      errors: this.renderState.errors.map((cell) => ({ ...cell })),
    };
  }

  /**
   * Main render method
   */
  render(
    puzzle: Puzzle,
    grid: number[][],
    notes: NotesGrid,
    renderState: BoardRenderState = this.renderState
  ): void {
    this.puzzle = puzzle;
    this.grid = grid;
    this.notes = notes;
    this.setRenderState(renderState);

    this.clear();
    this.drawBackground();
    this.drawCages();
    this.drawContextHighlights();
    this.drawErrorHighlights();
    this.drawGrid();
    this.drawCageBorders();
    this.drawSelectedCellFill();
    this.drawNumbers();
    this.drawNotes();
    this.drawClues();
    this.drawSelectedCellOutline();
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, width, height);
  }

  /**
   * Draw the background
   */
  private drawBackground(): void {
    this.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-grid').trim() || '#FFFFFF';
    this.ctx.fillRect(0, 0, this.logicalCanvasSize, this.logicalCanvasSize);
  }

  /**
   * Draw cage backgrounds
   */
  private drawCages(): void {
    if (!this.puzzle) return;

    const cageColors = [
      '--cage-color-1', '--cage-color-2', '--cage-color-3', '--cage-color-4',
      '--cage-color-5', '--cage-color-6', '--cage-color-7', '--cage-color-8',
    ];
    const rootStyles = getComputedStyle(document.documentElement);

    for (const cage of this.puzzle.cages) {
      const directColor = rootStyles
        .getPropertyValue(`--cage-color-${cage.id + 1}`)
        .trim();
      const colorVar = cageColors[cage.id % cageColors.length];
      const color = directColor || rootStyles
        .getPropertyValue(colorVar).trim() || 'rgba(200, 200, 200, 0.3)';

      this.ctx.fillStyle = color;

      for (const cell of cage.cells) {
        const { x, y } = this.getCellPosition(cell.row, cell.col);
        this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);
      }
    }
  }

  /**
   * Draw error highlights for invalid cells
   */
  private drawErrorHighlights(): void {
    if (!this.puzzle || this.errorCells.size === 0) return;

    const errorCellColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--cell-error').trim() || 'rgba(239, 68, 68, 0.24)';
    this.ctx.fillStyle = errorCellColor;
    for (const key of this.errorCells) {
      const [rowValue, colValue] = key.split(',');
      const row = Number.parseInt(rowValue, 10);
      const col = Number.parseInt(colValue, 10);
      if (Number.isNaN(row) || Number.isNaN(col)) continue;

      const { x, y } = this.getCellPosition(row, col);
      this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);

      const errorColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--error').trim() || '#EF4444';
      this.ctx.strokeStyle = errorColor;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 4, y + 4, this.config.cellSize - 8, this.config.cellSize - 8);
      this.ctx.beginPath();
      this.ctx.moveTo(x + this.config.cellSize - 18, y + 8);
      this.ctx.lineTo(x + this.config.cellSize - 8, y + 18);
      this.ctx.stroke();
    }
  }

  /**
   * Draw selected cage and selected-number context.
   */
  private drawContextHighlights(): void {
    if (!this.puzzle) return;

    const cageColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--cell-selected-cage').trim() || 'rgba(20, 184, 166, 0.12)';
    const matchColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--cell-same-number').trim() || 'rgba(245, 158, 11, 0.16)';
    const noteMatchColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--cell-note-match').trim() || 'rgba(245, 158, 11, 0.09)';
    const notesModeColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--notes-mode-accent').trim() || 'rgba(20, 184, 166, 0.22)';

    this.fillCells(this.renderState.selectedCageCells, cageColor);
    this.fillCells(this.renderState.matchingNoteCells, noteMatchColor);
    this.fillCells(this.renderState.matchingValueCells, matchColor);

    if (this.renderState.notesMode) {
      const { originX, originY } = this.getOrigin();
      const gridSize = this.puzzle.size * this.config.cellSize;
      this.ctx.strokeStyle = notesModeColor;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(originX - 6, originY - 6, gridSize + 12, gridSize + 12);
    }
  }

  /**
   * Draw selected cell fill under numbers/clues.
   */
  private drawSelectedCellFill(): void {
    if (!this.renderState.selectedCell || !this.puzzle) return;

    const { x, y } = this.getCellPosition(
      this.renderState.selectedCell.row,
      this.renderState.selectedCell.col
    );

    this.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--cell-selected').trim() || 'rgba(59, 130, 246, 0.18)';
    this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);
  }

  /**
   * Draw selected cell border over numbers/clues.
   */
  private drawSelectedCellOutline(): void {
    if (!this.renderState.selectedCell || !this.puzzle) return;

    const { x, y } = this.getCellPosition(
      this.renderState.selectedCell.row,
      this.renderState.selectedCell.col
    );

    this.ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--focus-ring').trim() || '#6366F1';
    this.ctx.lineWidth = 4;
    this.ctx.lineJoin = 'round';
    this.strokeRoundedRect(
      x + 2,
      y + 2,
      this.config.cellSize - 4,
      this.config.cellSize - 4,
      9
    );

    const handleX = x + this.config.cellSize;
    const handleY = y + this.config.cellSize / 2;
    this.ctx.beginPath();
    this.ctx.arc(handleX, handleY, 7.5, 0, Math.PI * 2);
    this.ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--focus-ring').trim() || '#6366F1';
    this.ctx.fill();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-grid').trim() || '#FFFFFF';
    this.ctx.stroke();
  }

  /**
   * Draw the grid lines
   */
  private drawGrid(): void {
    if (!this.puzzle) return;

    const lineColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--grid-line').trim() || '#E2E8F0';

    this.ctx.strokeStyle = lineColor;
    this.ctx.lineWidth = 1.1;

    const { originX, originY } = this.getOrigin();
    const gridSize = this.puzzle.size * this.config.cellSize;

    // Draw vertical lines
    for (let i = 0; i <= this.puzzle.size; i++) {
      const x = originX + i * this.config.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, originY);
      this.ctx.lineTo(x, originY + gridSize);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 0; i <= this.puzzle.size; i++) {
      const y = originY + i * this.config.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(originX, y);
      this.ctx.lineTo(originX + gridSize, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw thick cage borders
   */
  private drawCageBorders(): void {
    if (!this.puzzle) return;

    const borderColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--cage-border').trim() || '#475569';
    const selectedBorderColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--cage-border-selected').trim() || '#14B8A6';

    const { originX, originY } = this.getOrigin();

    for (const cage of this.puzzle.cages) {
      this.ctx.strokeStyle =
        cage.id === this.renderState.selectedCageId ? selectedBorderColor : borderColor;
      this.ctx.lineWidth = cage.id === this.renderState.selectedCageId ? 4 : 1.8;
      this.ctx.lineCap = 'butt';
      this.ctx.lineJoin = 'miter';

      // Find cage boundaries
      const borders = this.getCageBorders(cage.cells);

      for (const border of borders) {
        this.ctx.beginPath();

        if (border.direction === 'horizontal') {
          const x1 = originX + border.col * this.config.cellSize;
          const x2 = x1 + border.length * this.config.cellSize;
          const y = originY + border.row * this.config.cellSize;
          this.ctx.moveTo(x1, y);
          this.ctx.lineTo(x2, y);
        } else {
          const y1 = originY + border.row * this.config.cellSize;
          const y2 = y1 + border.length * this.config.cellSize;
          const x = originX + border.col * this.config.cellSize;
          this.ctx.moveTo(x, y1);
          this.ctx.lineTo(x, y2);
        }

        this.ctx.stroke();
      }
    }

    const gridSize = this.puzzle.size * this.config.cellSize;
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(originX, originY, gridSize, gridSize);
  }

  /**
   * Calculate cage borders for rendering
   */
  private getCageBorders(cells: { row: number; col: number }[]): Array<{
    row: number;
    col: number;
    direction: 'horizontal' | 'vertical';
    length: number;
  }> {
    const borders: Array<{
      row: number;
      col: number;
      direction: 'horizontal' | 'vertical';
      length: number;
    }> = [];

    const cellSet = new Set(cells.map(c => `${c.row},${c.col}`));
    const hasCell = (row: number, col: number): boolean => cellSet.has(`${row},${col}`);

    // Check top borders
    for (const cell of cells) {
      if (!hasCell(cell.row - 1, cell.col)) {
        borders.push({
          row: cell.row,
          col: cell.col,
          direction: 'horizontal',
          length: 1,
        });
      }
    }

    // Check left borders
    for (const cell of cells) {
      if (!hasCell(cell.row, cell.col - 1)) {
        borders.push({
          row: cell.row,
          col: cell.col,
          direction: 'vertical',
          length: 1,
        });
      }
    }

    return borders;
  }

  /**
   * Draw numbers in cells
   */
  private drawNumbers(): void {
    if (!this.puzzle || !this.grid) return;

    const defaultTextColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-primary').trim() || '#1E293B';
    const errorTextColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--error').trim() || '#EF4444';

    this.ctx.font = this.getCanvasFont(this.config.fontSize, 760);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        const value = this.grid[row][col];
        if (value > 0) {
          const key = `${row},${col}`;
          this.ctx.fillStyle = this.errorCells.has(key) ? errorTextColor : defaultTextColor;
          const { x, y } = this.getCellPosition(row, col);
          const centerX = x + this.config.cellSize / 2;
          const centerY = y + this.config.cellSize / 2;
          this.ctx.fillText(value.toString(), centerX, centerY);
        }
      }
    }
  }

  /**
   * Draw candidate notes in empty cells
   */
  private drawNotes(): void {
    if (!this.puzzle || !this.grid || !this.notes) return;

    const noteColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-secondary').trim() || '#64748B';
    const highlightedNoteColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--note-highlight').trim() || '#B45309';
    const noteSize = Math.max(12, Math.floor(this.config.cellSize * 0.18));

    this.ctx.font = this.getCanvasFont(noteSize, 700);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (this.grid[row][col] !== 0) continue;

        const cellNotes = Array.from(this.notes[row][col]).sort((a, b) => a - b);
        if (cellNotes.length === 0) continue;

        const { x, y } = this.getCellPosition(row, col);

        for (const note of cellNotes) {
          const anchor = getNoteAnchor(note);
          if (!anchor) continue;
          const noteX = x + this.config.cellSize * anchor.xFactor;
          const noteY = y + this.config.cellSize * anchor.yFactor;
          this.ctx.fillStyle =
            note === this.renderState.selectedNumber ? highlightedNoteColor : noteColor;
          this.ctx.fillText(String(note), noteX, noteY);
        }
      }
    }
  }

  /**
   * Draw clue labels in cages
   */
  private drawClues(): void {
    if (!this.puzzle) return;

    const clueColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-clue').trim() || '#334155';

    this.ctx.fillStyle = clueColor;
    this.ctx.font = this.getCanvasFont(this.config.clueFontSize, 520);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    for (const cage of this.puzzle.cages) {
      // Find top-left cell of cage
      const topLeft = cage.cells.reduce((min, cell) => {
        if (cell.row < min.row) return cell;
        if (cell.row === min.row && cell.col < min.col) return cell;
        return min;
      });

      const { x, y } = this.getCellPosition(topLeft.row, topLeft.col);
      const clueText = this.formatClue(cage.clue.target, cage.clue.operation);
      this.ctx.fillText(clueText, x + 6, y + 5);
    }
  }

  /**
   * Format clue for display
   */
  private formatClue(target: number, operation: string): string {
    if (operation === 'none') return target.toString();
    return `${target}${operation}`;
  }

  /**
   * Build a valid canvas font string from current theme settings.
   * Canvas font parsing does not reliably support CSS custom-property syntax.
   */
  private getCanvasFont(sizePx: number, weight: number = 700): string {
    const fontFamily = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-sans')
      .trim() || 'sans-serif';

    return `${weight} ${sizePx}px ${fontFamily}`;
  }

  /**
   * Get pixel position for a cell
   */
  private getCellPosition(row: number, col: number): { x: number; y: number } {
    const { originX, originY } = this.getOrigin();
    return {
      x: originX + col * this.config.cellSize,
      y: originY + row * this.config.cellSize,
    };
  }

  /**
   * Get grid origin (top-left)
   */
  private getOrigin(): { originX: number; originY: number } {
    return {
      originX: this.config.padding,
      originY: this.config.padding,
    };
  }

  private fillCells(cells: Cell[], color: string): void {
    this.ctx.fillStyle = color;
    for (const cell of cells) {
      const { x, y } = this.getCellPosition(cell.row, cell.col);
      this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);
    }
  }

  private strokeRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const ctx = this.ctx as CanvasRenderingContext2D & {
      roundRect?: (x: number, y: number, w: number, h: number, radii?: number) => void;
    };

    this.ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      const r = Math.min(radius, width / 2, height / 2);
      this.ctx.moveTo(x + r, y);
      this.ctx.lineTo(x + width - r, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      this.ctx.lineTo(x + width, y + height - r);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      this.ctx.lineTo(x + r, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      this.ctx.lineTo(x, y + r);
      this.ctx.quadraticCurveTo(x, y, x + r, y);
    }
    this.ctx.stroke();
  }

  /**
   * Get cell from pixel coordinates
   */
  getCellFromPoint(x: number, y: number): { row: number; col: number } | null {
    if (!this.puzzle) return null;

    const { originX, originY } = this.getOrigin();
    const col = Math.floor((x - originX) / this.config.cellSize);
    const row = Math.floor((y - originY) / this.config.cellSize);

    if (row >= 0 && row < this.puzzle.size && col >= 0 && col < this.puzzle.size) {
      return { row, col };
    }
    return null;
  }

  /**
   * Highlight a selected cell
   */
  highlightCell(row: number, col: number, color: string): void {
    const { x, y } = this.getCellPosition(row, col);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);
  }

  /**
   * Draw a visible selection border around a cell
   */
  drawSelectionBorder(row: number, col: number): void {
    const { x, y } = this.getCellPosition(row, col);
    const borderColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--focus-ring').trim() || '#6366F1';

    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x + 1, y + 1, this.config.cellSize - 2, this.config.cellSize - 2);
  }

  /**
   * Draw an opaque pause overlay over the grid area
   */
  drawPauseOverlay(): void {
    if (!this.puzzle) return;

    const { originX, originY } = this.getOrigin();
    const gridSize = this.puzzle.size * this.config.cellSize;
    const bleed = 6;
    const surfaceColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-surface').trim() || '#0F172A';
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-primary').trim() || '#F8FAFC';

    this.ctx.save();
    this.ctx.fillStyle = surfaceColor;
    this.ctx.fillRect(originX - bleed, originY - bleed, gridSize + bleed * 2, gridSize + bleed * 2);

    this.ctx.fillStyle = textColor;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = this.getCanvasFont(36);
    this.ctx.fillText('PAUSED', originX + gridSize / 2, originY + gridSize / 2);
    this.ctx.restore();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }
}
