import type { Puzzle } from '../types/puzzle';

export function createTutorialPuzzle(): Puzzle {
  return {
    id: 'tutorial-4x4-opening',
    size: 4,
    difficulty: 'beginner',
    seed: 'tutorial-opening-v1',
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ],
    cages: [
      { id: 0, cells: [{ row: 0, col: 0 }], clue: { target: 1, operation: 'none' } },
      { id: 1, cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }], clue: { target: 5, operation: '+' } },
      { id: 2, cells: [{ row: 0, col: 3 }, { row: 1, col: 3 }], clue: { target: 2, operation: '÷' } },
      { id: 3, cells: [{ row: 1, col: 0 }, { row: 2, col: 0 }], clue: { target: 1, operation: '-' } },
      { id: 4, cells: [{ row: 1, col: 1 }, { row: 1, col: 2 }], clue: { target: 4, operation: '÷' } },
      { id: 5, cells: [{ row: 2, col: 1 }, { row: 3, col: 1 }], clue: { target: 3, operation: '÷' } },
      { id: 6, cells: [{ row: 2, col: 2 }, { row: 2, col: 3 }], clue: { target: 7, operation: '+' } },
      { id: 7, cells: [{ row: 3, col: 0 }], clue: { target: 4, operation: 'none' } },
      { id: 8, cells: [{ row: 3, col: 2 }, { row: 3, col: 3 }], clue: { target: 3, operation: '+' } },
    ],
  };
}
