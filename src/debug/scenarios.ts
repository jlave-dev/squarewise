import type { GameStatus } from '../types/game';
import type { Cell, Difficulty, Puzzle } from '../types/puzzle';

export type DebugScenarioId =
  | 'level-select'
  | 'new-game'
  | 'in-progress'
  | 'paused'
  | 'almost-won'
  | 'won-modal'
  | 'won-share-fallback';

export interface ParsedDebugScenario {
  scenario: DebugScenarioId;
  difficulty: Difficulty;
  timer: number;
  hints: number;
}

export interface DebugSession {
  grid: number[][];
  selectedCell: Cell | null;
  status: GameStatus;
  timer: number;
  hintsUsed: number;
}

const SCENARIOS: DebugScenarioId[] = [
  'level-select',
  'new-game',
  'in-progress',
  'paused',
  'almost-won',
  'won-modal',
  'won-share-fallback',
];

const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];

function isScenario(value: string | null): value is DebugScenarioId {
  if (!value) return false;
  return (SCENARIOS as string[]).includes(value);
}

function normalizeScenario(value: string | null): DebugScenarioId | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/\/+$/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const alias: Record<string, DebugScenarioId> = {
    'new': 'new-game',
    'inprogress': 'in-progress',
    'almostwon': 'almost-won',
    'won': 'won-modal',
    'share-fallback': 'won-share-fallback',
  };
  const candidate = alias[normalized] ?? normalized;
  return isScenario(candidate) ? candidate : null;
}

function isDifficulty(value: string | null): value is Difficulty {
  if (!value) return false;
  return (DIFFICULTIES as string[]).includes(value.toLowerCase());
}

function parseNonNegativeInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

function createProgressGrid(solution: number[][]): number[][] {
  const grid = cloneGrid(solution);
  if (grid[0]?.[0] !== undefined) grid[0][0] = 0;
  if (grid[0]?.[1] !== undefined) grid[0][1] = 0;
  if (grid[1]?.[0] !== undefined) grid[1][0] = 0;
  return grid;
}

export function getDebugScenarioIds(): readonly DebugScenarioId[] {
  return SCENARIOS;
}

export function parseDebugScenarioFromSearch(search: string): ParsedDebugScenario | null {
  const params = new URLSearchParams(search);
  const rawScenario =
    params.get('scenario') ??
    params.get('state') ??
    params.get('debugScenario');
  const scenarioValue = normalizeScenario(rawScenario);

  if (!scenarioValue) {
    return null;
  }

  return {
    scenario: scenarioValue,
    difficulty: isDifficulty(params.get('difficulty')) ? (params.get('difficulty')!.toLowerCase() as Difficulty) : 'medium',
    timer: parseNonNegativeInt(params.get('timer'), 95),
    hints: parseNonNegativeInt(params.get('hints'), 0),
  };
}

export function buildDebugScenarioQuery(
  scenario: DebugScenarioId,
  options: { difficulty?: Difficulty; timer?: number; hints?: number } = {}
): string {
  const params = new URLSearchParams();
  params.set('scenario', scenario);
  if (options.difficulty) params.set('difficulty', options.difficulty);
  if (options.timer !== undefined) params.set('timer', String(options.timer));
  if (options.hints !== undefined) params.set('hints', String(options.hints));
  return `?${params.toString()}`;
}

export function buildDebugSession(
  puzzle: Puzzle,
  kind: 'in-progress' | 'paused' | 'almost-won' | 'won',
  options: { timer: number; hints: number }
): DebugSession {
  if (kind === 'in-progress') {
    return {
      grid: createProgressGrid(puzzle.solution),
      selectedCell: { row: 0, col: 0 },
      status: 'playing',
      timer: options.timer,
      hintsUsed: options.hints,
    };
  }

  if (kind === 'paused') {
    return {
      grid: createProgressGrid(puzzle.solution),
      selectedCell: { row: 0, col: 0 },
      status: 'paused',
      timer: options.timer,
      hintsUsed: options.hints,
    };
  }

  if (kind === 'almost-won') {
    const grid = cloneGrid(puzzle.solution);
    const row = puzzle.size - 1;
    const col = puzzle.size - 1;
    grid[row][col] = 0;
    return {
      grid,
      selectedCell: { row, col },
      status: 'playing',
      timer: options.timer,
      hintsUsed: options.hints,
    };
  }

  return {
    grid: cloneGrid(puzzle.solution),
    selectedCell: null,
    status: 'won',
    timer: options.timer,
    hintsUsed: options.hints,
  };
}
