import type { Difficulty, Puzzle } from '../../types/puzzle';
import { getDifficultyPreset } from '../difficulty/presets';
import { generatePuzzleSync } from './PuzzleGenerator';

export type PuzzleRequest = {
  mode: 'fresh' | 'daily' | 'archive';
  difficulty: Difficulty;
  seed?: string;
  date?: string;
};

/** One worker per request: termination makes cancellation and stale replies harmless. */
export function generatePuzzleInWorker(request: PuzzleRequest, signal?: AbortSignal): Promise<Puzzle> {
  const seeded = { ...request, seed: request.seed ?? String(Date.now()) };
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Puzzle generation cancelled', 'AbortError'));
      return;
    }
    const worker = new Worker(new URL('./puzzle.worker.ts', import.meta.url), { type: 'module' });
    let finished = false;
    const finish = (puzzle?: Puzzle, error?: Error): void => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
      if (error) reject(error);
      else resolve(puzzle!);
    };
    const cancel = (): void => finish(undefined, new DOMException('Puzzle generation cancelled', 'AbortError'));
    const timeout = setTimeout(() => {
      // A timeout must never change an already-published dated board.
      if (seeded.mode !== 'fresh') {
        finish(undefined, new Error('This dated puzzle took too long. Please try again.'));
        return;
      }
      try {
        finish(generatePuzzleSync({ size: getDifficultyPreset(seeded.difficulty).gridSize, difficulty: seeded.difficulty, seed: seeded.seed }));
      } catch (error) {
        finish(undefined, error instanceof Error ? error : new Error('Could not prepare puzzle'));
      }
    }, 15_000);
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onmessage = (event: MessageEvent<{ puzzle?: Puzzle; error?: string }>) => {
      finish(event.data.puzzle, event.data.error ? new Error(event.data.error) : undefined);
    };
    worker.onerror = () => finish(undefined, new Error('Could not prepare puzzle. Please try again.'));
    try {
      worker.postMessage(seeded);
    } catch {
      finish(undefined, new Error('Could not prepare puzzle. Please try again.'));
    }
  });
}
