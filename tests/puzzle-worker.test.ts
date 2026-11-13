import { afterEach, expect, test, vi } from 'vitest';
import { generatePuzzleInWorker } from '../src/engine/generator/PuzzleWorker';
import { validatePuzzle } from '../src/engine/generator/PuzzleGenerator';

class FakeWorker {
  static last: FakeWorker;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.last = this; }
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test('cancellation terminates the worker and ignores a stale completion', async () => {
  vi.stubGlobal('Worker', FakeWorker);
  const controller = new AbortController();
  const result = generatePuzzleInWorker({ mode: 'fresh', difficulty: 'hard', seed: 'audit-hard-1' }, controller.signal);
  const worker = FakeWorker.last;
  const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  worker.onmessage?.({ data: { puzzle: { id: 'stale' } } });
  await rejection;
  expect(worker.terminate).toHaveBeenCalledOnce();
});

test('practice timeout falls back deterministically, dated timeout rejects without changing identity', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
  const request = { mode: 'fresh', difficulty: 'hard', seed: 'audit-hard-1' } as const;
  const first = generatePuzzleInWorker(request);
  await vi.advanceTimersByTimeAsync(15_000);
  const one = await first;
  expect(validatePuzzle(one).valid).toBe(true);
  const second = generatePuzzleInWorker(request);
  await vi.advanceTimersByTimeAsync(15_000);
  expect(await second).toEqual(one);
  const dated = generatePuzzleInWorker({ mode: 'daily', date: '2026-11-06', difficulty: 'medium' });
  const rejection = expect(dated).rejects.toThrow('took too long');
  await vi.advanceTimersByTimeAsync(15_000);
  await rejection;
  expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
});
