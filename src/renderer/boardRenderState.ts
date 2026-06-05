import type { Cell, NotesGrid, Puzzle } from '../types/puzzle';

export interface BoardRenderState {
  selectedCell: Cell | null;
  selectedNumber: number | null;
  selectedCageId: number | null;
  relatedCells: Cell[];
  selectedCageCells: Cell[];
  matchingValueCells: Cell[];
  matchingNoteCells: Cell[];
  notesMode: boolean;
  errors: Cell[];
}

export const EMPTY_BOARD_RENDER_STATE: BoardRenderState = {
  selectedCell: null,
  selectedNumber: null,
  selectedCageId: null,
  relatedCells: [],
  selectedCageCells: [],
  matchingValueCells: [],
  matchingNoteCells: [],
  notesMode: false,
  errors: [],
};

function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

function uniqueCells(cells: Cell[]): Cell[] {
  const seen = new Set<string>();
  const result: Cell[] = [];

  for (const cell of cells) {
    const key = `${cell.row},${cell.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cell);
  }

  return result;
}

export function buildBoardRenderState(options: {
  puzzle: Puzzle;
  grid: number[][];
  notes: NotesGrid;
  selectedCell: Cell | null;
  errors: Cell[];
  notesMode: boolean;
  selectedNumberOverride?: number | null;
}): BoardRenderState {
  const {
    puzzle,
    grid,
    notes,
    selectedCell,
    errors,
    notesMode,
    selectedNumberOverride = null,
  } = options;

  if (!selectedCell) {
    return {
      ...EMPTY_BOARD_RENDER_STATE,
      notesMode,
      errors: errors.map((cell) => ({ ...cell })),
    };
  }

  const selectedCellValue = grid[selectedCell.row]?.[selectedCell.col] ?? 0;
  const selectedNumber =
    selectedCellValue > 0 ? selectedCellValue : selectedNumberOverride;
  const selectedCage =
    puzzle.cages.find((cage) => cage.cells.some((cell) => sameCell(cell, selectedCell))) ??
    null;

  const rowCells: Cell[] = Array.from({ length: puzzle.size }, (_, col) => ({
    row: selectedCell.row,
    col,
  }));
  const columnCells: Cell[] = Array.from({ length: puzzle.size }, (_, row) => ({
    row,
    col: selectedCell.col,
  }));
  const selectedCageCells = selectedCage
    ? selectedCage.cells.map((cell) => ({ ...cell }))
    : [];

  const matchingValueCells: Cell[] = [];
  const matchingNoteCells: Cell[] = [];
  if (selectedNumber !== null) {
    for (let row = 0; row < puzzle.size; row++) {
      for (let col = 0; col < puzzle.size; col++) {
        if (grid[row][col] === selectedNumber) {
          matchingValueCells.push({ row, col });
        }

        if (grid[row][col] === 0 && notes[row][col].has(selectedNumber)) {
          matchingNoteCells.push({ row, col });
        }
      }
    }
  }

  return {
    selectedCell: { ...selectedCell },
    selectedNumber,
    selectedCageId: selectedCage?.id ?? null,
    relatedCells: uniqueCells([...rowCells, ...columnCells]).filter(
      (cell) => !sameCell(cell, selectedCell)
    ),
    selectedCageCells,
    matchingValueCells,
    matchingNoteCells,
    notesMode,
    errors: errors.map((cell) => ({ ...cell })),
  };
}
