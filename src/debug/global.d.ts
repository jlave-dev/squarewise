import type { DebugScenarioId } from './scenarios';
import type { Difficulty } from '../types/puzzle';

export interface SquareWiseDebugApi {
  listScenarios: () => readonly DebugScenarioId[];
  runScenario: (
    scenario: DebugScenarioId,
    options?: {
      difficulty?: Difficulty;
      timer?: number;
      hints?: number;
    }
  ) => Promise<void>;
}

declare global {
  interface Window {
    __SW_DEBUG__?: SquareWiseDebugApi;
  }
}

export {};
