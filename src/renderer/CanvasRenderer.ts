import type { Cell, NotesGrid, Puzzle } from '../types/puzzle';

interface RendererConfig {
  cellSize: number;
  padding: number;
  fontSize: number;
  clueFontSize: number;
}

const DEFAULT_CONFIG: RendererConfig = {
  cellSize: 100,
  padding: 20,
  fontSize: 48,
  clueFontSize: 22,
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;
  private dpr: number;
  private puzzle: Puzzle | null = null;
  private grid: number[][] | null = null;
  private notes: NotesGrid | null = null;
  private selectedCell: { row: number; col: number } | null = null;
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

    this.setupCanvas();
    window.addEventListener('resize', this.resizeHandler);
  }

  private setupCanvas(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // Skip if canvas has no size yet
    if (width === 0 || height === 0) {
      console.log('[CanvasRenderer] Skipping setupCanvas - zero size:', width, 'x', height);
      return;
    }

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;

    // Reset transformation before scaling to avoid cumulative scaling
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    console.log('[CanvasRenderer] Canvas setup complete:', width, 'x', height, 'DPR:', this.dpr);
  }

  private handleResize(): void {
    this.setupCanvas();
    if (this.puzzle && this.grid && this.notes) {
      this.render(this.puzzle, this.grid, this.notes);
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
    const totalSize = gridSize + this.config.padding * 2;

    // Set CSS size
    this.canvas.style.width = `${totalSize}px`;
    this.canvas.style.height = `${totalSize}px`;

    // Set internal canvas size directly (don't rely on clientWidth/clientHeight)
    this.canvas.width = totalSize * this.dpr;
    this.canvas.height = totalSize * this.dpr;

    // Reset and set scale
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    console.log('[CanvasRenderer] Canvas adjusted to:', totalSize, 'x', totalSize, 'internal:', this.canvas.width, 'x', this.canvas.height);
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
    this.selectedCell = cell;
  }

  /**
   * Set cells currently marked as validation errors
   */
  setErrorCells(cells: Cell[]): void {
    this.errorCells = new Set(cells.map((cell) => `${cell.row},${cell.col}`));
  }

  /**
   * Main render method
   */
  render(puzzle: Puzzle, grid: number[][], notes: NotesGrid): void {
    this.puzzle = puzzle;
    this.grid = grid;
    this.notes = notes;

    this.clear();
    this.drawBackground();
    this.drawCages();
    this.drawErrorHighlights();
    this.drawGrid();
    this.drawCageBorders();
    this.drawNumbers();
    this.drawNotes();
    this.drawClues();
    this.drawSelectedCell();
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
    this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
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

    for (const cage of this.puzzle.cages) {
      const colorVar = cageColors[cage.id % cageColors.length];
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue(colorVar).trim() || 'rgba(200, 200, 200, 0.3)';

      this.ctx.fillStyle = color;

      for (const cell of cage.cells) {
        const { x, y } = this.getCellPosition(cell.row, cell.col);
        this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);
      }
    }
  }

  /**
   * Draw light error highlights for invalid cells
   */
  private drawErrorHighlights(): void {
    if (!this.puzzle || this.errorCells.size === 0) return;

    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
    for (const key of this.errorCells) {
      const [rowValue, colValue] = key.split(',');
      const row = Number.parseInt(rowValue, 10);
      const col = Number.parseInt(colValue, 10);
      if (Number.isNaN(row) || Number.isNaN(col)) continue;

      const { x, y } = this.getCellPosition(row, col);
      this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);
    }
  }

  /**
   * Draw the selected cell highlight
   */
  private drawSelectedCell(): void {
    if (!this.selectedCell || !this.puzzle) return;

    const { x, y } = this.getCellPosition(this.selectedCell.row, this.selectedCell.col);

    // Draw highlight background (subtle tint)
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    this.ctx.fillRect(x, y, this.config.cellSize, this.config.cellSize);

    // Draw red border (thinner so it doesn't block numbers)
    this.ctx.strokeStyle = '#EF4444';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x + 1.5, y + 1.5, this.config.cellSize - 3, this.config.cellSize - 3);
  }

  /**
   * Draw the grid lines
   */
  private drawGrid(): void {
    if (!this.puzzle) return;

    const lineColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--grid-line').trim() || '#E2E8F0';

    this.ctx.strokeStyle = lineColor;
    this.ctx.lineWidth = 1;

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

    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 3;

    const { originX, originY } = this.getOrigin();

    for (const cage of this.puzzle.cages) {
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

    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-primary').trim() || '#1E293B';

    this.ctx.fillStyle = textColor;
    this.ctx.font = this.getCanvasFont(this.config.fontSize);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        const value = this.grid[row][col];
        if (value > 0) {
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
    const noteSize = Math.max(12, Math.floor(this.config.cellSize * 0.18));

    this.ctx.fillStyle = noteColor;
    this.ctx.font = this.getCanvasFont(noteSize);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let row = 0; row < this.puzzle.size; row++) {
      for (let col = 0; col < this.puzzle.size; col++) {
        if (this.grid[row][col] !== 0) continue;

        const cellNotes = Array.from(this.notes[row][col]).sort((a, b) => a - b);
        if (cellNotes.length === 0) continue;

        const { x, y } = this.getCellPosition(row, col);
        const step = this.config.cellSize / 3;
        const isClueCell = this.isCageTopLeftCell(row, col);

        for (const note of cellNotes) {
          const index = note - 1;
          if (index < 0 || index > 8) continue;
          const noteCol = index % 3;
          const noteRow = Math.floor(index / 3);
          // In the clue cell, skip the top-left note slot to avoid overlapping the clue.
          if (isClueCell && noteRow === 0 && noteCol === 0) continue;
          const noteX = x + step * (noteCol + 0.5);
          const noteY = y + step * (noteRow + 0.5);
          this.ctx.fillText(String(note), noteX, noteY);
        }
      }
    }
  }

  /**
   * Whether a cell is the top-left cell of its cage (where clue text is drawn)
   */
  private isCageTopLeftCell(row: number, col: number): boolean {
    if (!this.puzzle) return false;

    const cage = this.puzzle.cages.find((candidate) =>
      candidate.cells.some((cell) => cell.row === row && cell.col === col)
    );
    if (!cage) return false;

    const topLeft = cage.cells.reduce((min, cell) => {
      if (cell.row < min.row) return cell;
      if (cell.row === min.row && cell.col < min.col) return cell;
      return min;
    });

    return topLeft.row === row && topLeft.col === col;
  }

  /**
   * Draw clue labels in cages
   */
  private drawClues(): void {
    if (!this.puzzle) return;

    const clueColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-clue').trim() || '#334155';

    this.ctx.fillStyle = clueColor;
    this.ctx.font = this.getCanvasFont(this.config.clueFontSize);
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
  private getCanvasFont(sizePx: number): string {
    const fontFamily = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-sans')
      .trim() || 'sans-serif';

    return `bold ${sizePx}px ${fontFamily}`;
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
      .getPropertyValue('--accent').trim() || '#6366F1';

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
