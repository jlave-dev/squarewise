import { generatePuzzle } from './PuzzleGenerator';
import { getDifficultyPreset } from '../difficulty/presets';
import { DailyChallenge } from '../../core/DailyChallenge';
import type { PuzzleRequest } from './PuzzleWorker';

self.onmessage = async (event: MessageEvent<PuzzleRequest>) => {
  const request = event.data;
  try {
    const daily = new DailyChallenge();
    const date = new Date(`${request.date}T00:00:00`);
    const puzzle = request.mode === 'daily'
      ? await daily.getPuzzleForDate(date, request.difficulty)
      : request.mode === 'archive'
      ? await daily.getArchivePuzzleForDate(date, request.difficulty)
      : await generatePuzzle({ size: getDifficultyPreset(request.difficulty).gridSize, difficulty: request.difficulty, seed: request.seed });
    self.postMessage({ puzzle });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Could not prepare puzzle' });
  }
};
