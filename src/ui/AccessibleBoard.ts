import type { GameSnapshot } from '../app/Game';
import type { Cage, Cell, Clue } from '../types/puzzle';

type SelectCellCallback = (cell: Cell) => void;

export interface AccessibleBoardOptions {
  onSelectCell: SelectCellCallback;
}

export class AccessibleBoard {
  private root: HTMLDivElement;
  private grid: HTMLDivElement;
  private politeRegion: HTMLDivElement;
  private assertiveRegion: HTMLDivElement;
  private options: AccessibleBoardOptions;
  private previousSnapshot: GameSnapshot | null = null;
  private pendingFocus: Cell | null = null;

  constructor(options: AccessibleBoardOptions) {
    this.options = options;
    this.root = document.createElement('div');
    this.root.className = 'accessible-board';

    this.grid = document.createElement('div');
    this.grid.className = 'accessible-board-grid';
    this.grid.setAttribute('role', 'grid');
    this.grid.setAttribute('aria-label', 'SquareWise board');

    this.politeRegion = document.createElement('div');
    this.politeRegion.className = 'sr-live-region';
    this.politeRegion.setAttribute('role', 'status');
    this.politeRegion.setAttribute('aria-live', 'polite');

    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.className = 'sr-live-region';
    this.assertiveRegion.setAttribute('role', 'alert');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');

    this.root.appendChild(this.grid);
    this.root.appendChild(this.politeRegion);
    this.root.appendChild(this.assertiveRegion);
  }

  update(snapshot: GameSnapshot): void {
    const activeElement = document.activeElement;
    const hadBoardFocus = activeElement instanceof HTMLElement && this.root.contains(activeElement);

    this.grid.setAttribute('aria-rowcount', String(snapshot.gridSize));
    this.grid.setAttribute('aria-colcount', String(snapshot.gridSize));
    this.grid.innerHTML = '';

    for (let row = 0; row < snapshot.gridSize; row++) {
      const rowEl = document.createElement('div');
      rowEl.setAttribute('role', 'row');

      for (let col = 0; col < snapshot.gridSize; col++) {
        rowEl.appendChild(this.createCellButton(snapshot, { row, col }));
      }

      this.grid.appendChild(rowEl);
    }

    this.updateLiveRegions(snapshot);
    this.previousSnapshot = snapshot;

    const focusTarget = this.pendingFocus ?? (hadBoardFocus ? snapshot.selectedCell : null);
    this.pendingFocus = null;
    if (focusTarget) {
      this.getCellButton(focusTarget)?.focus();
    }
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.root);
  }

  getElement(): HTMLDivElement {
    return this.root;
  }

  private createCellButton(snapshot: GameSnapshot, cell: Cell): HTMLButtonElement {
    const button = document.createElement('button');
    const selected = isSameCell(snapshot.selectedCell, cell);
    button.type = 'button';
    button.className = 'accessible-board-cell';
    button.dataset.row = String(cell.row);
    button.dataset.col = String(cell.col);
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', createAccessibleCellLabel(snapshot, cell));
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.addEventListener('click', () => this.selectCell(cell));
    button.addEventListener('keydown', (event) => this.handleCellKeyDown(event, snapshot, cell));
    return button;
  }

  private handleCellKeyDown(event: KeyboardEvent, snapshot: GameSnapshot, cell: Cell): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectCell(cell);
      return;
    }

    const nextCell = getArrowNavigationCell(event.key, cell, snapshot.gridSize);
    if (!nextCell) return;

    event.preventDefault();
    this.pendingFocus = nextCell;
    this.selectCell(nextCell);
  }

  private selectCell(cell: Cell): void {
    this.options.onSelectCell(cell);
  }

  private getCellButton(cell: Cell): HTMLButtonElement | null {
    return this.grid.querySelector<HTMLButtonElement>(
      `.accessible-board-cell[data-row="${cell.row}"][data-col="${cell.col}"]`
    );
  }

  private updateLiveRegions(snapshot: GameSnapshot): void {
    const previous = this.previousSnapshot;
    if (!previous) return;

    if (snapshot.status === 'won' && previous.status !== 'won') {
      this.politeRegion.textContent = 'Puzzle complete.';
      return;
    }

    if (snapshot.status === 'paused' && previous.status !== 'paused') {
      this.politeRegion.textContent = 'Game paused.';
      return;
    }

    if (snapshot.status === 'playing' && previous.status === 'paused') {
      this.politeRegion.textContent = 'Game resumed.';
      return;
    }

    if (snapshot.notesMode !== previous.notesMode) {
      this.politeRegion.textContent = snapshot.notesMode ? 'Notes mode on.' : 'Notes mode off.';
      return;
    }

    if (snapshot.lastHint?.explanation && snapshot.lastHint.explanation !== previous.lastHint?.explanation) {
      this.politeRegion.textContent = snapshot.lastHint.explanation;
    }

    if (snapshot.errors.length > previous.errors.length) {
      this.assertiveRegion.textContent = `${snapshot.errors.length} ${snapshot.errors.length === 1 ? 'cell has' : 'cells have'} conflicts.`;
    }
  }
}

export function createAccessibleCellLabel(snapshot: GameSnapshot, cell: Cell): string {
  const value = snapshot.grid[cell.row]?.[cell.col] ?? 0;
  const notes = snapshot.notes[cell.row]?.[cell.col] ?? [];
  const cage = findCageForCell(snapshot.cages, cell);
  const parts = [
    `Row ${cell.row + 1}, column ${cell.col + 1}`,
    value > 0 ? `value ${value}` : 'empty',
    notes.length > 0 ? `notes ${notes.join(', ')}` : 'no notes',
    cage ? `cage ${formatClue(cage.clue)}` : 'no cage clue',
  ];

  if (isSameCell(snapshot.selectedCell, cell)) {
    parts.push('selected');
  }

  if (snapshot.errors.some(error => isSameCell(error, cell))) {
    parts.push('conflict');
  }

  return parts.join(', ');
}

function getArrowNavigationCell(key: string, cell: Cell, gridSize: number): Cell | null {
  switch (key) {
    case 'ArrowUp':
      return { row: Math.max(0, cell.row - 1), col: cell.col };
    case 'ArrowDown':
      return { row: Math.min(gridSize - 1, cell.row + 1), col: cell.col };
    case 'ArrowLeft':
      return { row: cell.row, col: Math.max(0, cell.col - 1) };
    case 'ArrowRight':
      return { row: cell.row, col: Math.min(gridSize - 1, cell.col + 1) };
    default:
      return null;
  }
}

function findCageForCell(cages: GameSnapshot['cages'], cell: Cell): Pick<Cage, 'id' | 'cells' | 'clue'> | null {
  return cages.find(cage => cage.cells.some(cageCell => isSameCell(cageCell, cell))) ?? null;
}

function formatClue(clue: Clue): string {
  return clue.operation === 'none' ? String(clue.target) : `${clue.target}${clue.operation}`;
}

function isSameCell(a: Cell | null, b: Cell): boolean {
  return Boolean(a && a.row === b.row && a.col === b.col);
}
