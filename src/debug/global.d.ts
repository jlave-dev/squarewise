import type { DebugScenarioId } from './scenarios';
import type { Difficulty } from '../types/puzzle';
import type { GameSnapshot } from '../app/Game';
import type { HintTier } from '../types/game';
import type { TutorialStepId } from '../tutorial/TutorialController';

export interface SquareWiseDebugApi {
  listScenarios: () => readonly DebugScenarioId[];
  getSnapshot: () => GameSnapshot | null;
  runScenario: (
    scenario: DebugScenarioId,
    options?: {
      difficulty?: Difficulty;
      timer?: number;
      hints?: number;
      date?: string | null;
      tier?: HintTier;
      step?: TutorialStepId;
    }
  ) => Promise<void>;
}

declare global {
  interface Window {
    __SW_DEBUG__?: SquareWiseDebugApi;
  }
}

export {};
