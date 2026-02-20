import type { Cell, Cage } from '../../types/puzzle';
import { SeededRNG } from '../../utils/rng';

interface CageConfig {
  minSize: number;
  maxSize: number;
  allowSingleCell: boolean;
}

const DEFAULT_CONFIG: CageConfig = {
  minSize: 1,
  maxSize: 4,
  allowSingleCell: true,
};

/**
 * Generate cages for a puzzle grid using flood-fill
 */
export function generateCages(
  size: number,
  rng: SeededRNG,
  config: Partial<CageConfig> = {}
): Cage[] {
  const { minSize, maxSize, allowSingleCell } = { ...DEFAULT_CONFIG, ...config };
  const cages: Cage[] = [];
  const visited = new Set<string>();
  let cageId = 0;

  // Process all cells
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = `${row},${col}`;
      if (visited.has(key)) continue;

      // Grow a new cage from this cell
      const cells = growCage(row, col, size, visited, rng, minSize, maxSize);

      // Create the cage (clue will be added later)
      const cage: Cage = {
        id: cageId++,
        cells,
        clue: { target: 0, operation: '+' }, // Placeholder
      };

      cages.push(cage);

      // Mark cells as visited
      for (const cell of cells) {
        visited.add(`${cell.row},${cell.col}`);
      }
    }
  }

  return cages;
}

/**
 * Grow a cage from a starting cell using flood-fill
 */
function growCage(
  startRow: number,
  startCol: number,
  size: number,
  visited: Set<string>,
  rng: SeededRNG,
  minSize: number,
  maxSize: number
): Cell[] {
  const cells: Cell[] = [{ row: startRow, col: startCol }];
  const targetSize = rng.nextInt(minSize, maxSize);

  // Use a set to track cells being added to this cage
  const cageCells = new Set<string>();
  cageCells.add(`${startRow},${startCol}`);

  // Keep growing until we reach target size or can't grow more
  while (cells.length < targetSize) {
    // Get all unvisited neighbors of current cage cells
    const neighbors = getUnvisitedNeighbors(cells, size, visited, cageCells);

    if (neighbors.length === 0) break;

    // Pick a random neighbor
    const next = rng.pick(neighbors);
    cells.push(next);
    cageCells.add(`${next.row},${next.col}`);
  }

  return cells;
}

/**
 * Get all unvisited neighboring cells of a cage
 */
function getUnvisitedNeighbors(
  cageCells: Cell[],
  size: number,
  visited: Set<string>,
  cageCellsSet: Set<string>
): Cell[] {
  const neighbors: Cell[] = [];
  const seen = new Set<string>();

  const directions = [
    [-1, 0], // up
    [1, 0],  // down
    [0, -1], // left
    [0, 1],  // right
  ];

  for (const cell of cageCells) {
    for (const [dr, dc] of directions) {
      const newRow = cell.row + dr;
      const newCol = cell.col + dc;
      const key = `${newRow},${newCol}`;

      // Check bounds and if not visited or in current cage
      if (
        newRow >= 0 && newRow < size &&
        newCol >= 0 && newCol < size &&
        !visited.has(key) &&
        !cageCellsSet.has(key) &&
        !seen.has(key)
      ) {
        seen.add(key);
        neighbors.push({ row: newRow, col: newCol });
      }
    }
  }

  return neighbors;
}

/**
 * Ensure all cells are covered by exactly one cage
 */
export function validateCageCoverage(cages: Cage[], size: number): boolean {
  const covered = new Set<string>();

  for (const cage of cages) {
    for (const cell of cage.cells) {
      const key = `${cell.row},${cell.col}`;
      if (covered.has(key)) {
        return false; // Cell covered twice
      }
      covered.add(key);
    }
  }

  // Check all cells are covered
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!covered.has(`${row},${col}`)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get cells adjacent to a given cell (within bounds)
 */
export function getAdjacentCells(row: number, col: number, size: number): Cell[] {
  const adjacent: Cell[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
      adjacent.push({ row: newRow, col: newCol });
    }
  }

  return adjacent;
}
