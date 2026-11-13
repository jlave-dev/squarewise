import { test, vi } from 'vitest';
import * as generators from '../src/engine/generator/PuzzleGenerator';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DailyChallenge } from '../src/core/DailyChallenge';
import { generatePuzzle, validatePuzzle } from '../src/engine/generator/PuzzleGenerator';

// Captured from upstream's successful dated generator before its search/runtime changes.
for (const [date, difficulty, hash] of [
  ['2026-11-06', 'medium', 'a6129b84b398d2decd124710d4f243d013b0ac1de35256634be4fe464b48f4b7'],
  ['2026-06-05', 'easy', 'b45c7e435e5c640868345179ee574ff709bcd423fe1eb52874386e3d9a7f8983'],
  ['2026-11-06', 'expert', '7275dde9ea802cd1fd10890175f4e1f259f7f032e1e5a1f07dd6b67fee8bba67'],
] as const) {
  test(`preserves published v1 board ${date} ${difficulty}`, async () => {
    const puzzle = await new DailyChallenge().getPuzzleForDate(new Date(date + 'T00:00:00'), difficulty);
    assert.equal(createHash('sha256').update(JSON.stringify(puzzle)).digest('hex'), hash);
  });
}

for (const date of ['2026-10-04', '2026-09-14', '2026-09-12']) {
  test(`previously failing date ${date} has a deterministic playable board`, async () => {
    const daily = new DailyChallenge();
    const one = await daily.getPuzzleForDate(new Date(date + 'T00:00:00'), 'medium');
    const two = await daily.getPuzzleForDate(new Date(date + 'T00:00:00'), 'medium');
    assert.equal(validatePuzzle(one).valid, true);
    assert.deepEqual(two, one);
    assert.equal(one.id, `daily-${date}-medium-6x6`);
  });
}

test('audit-hard-1 produces a valid board with the constrained-cell solver', async () => {
  const puzzle = await generatePuzzle({ size: 7, difficulty: 'hard', seed: 'audit-hard-1' });
  assert.equal(validatePuzzle(puzzle).valid, true);
}, 15_000);


test('dated boards remain on v1 when the current practice generator changes', async () => {
  const daily = new DailyChallenge();
  const date = new Date('2026-11-06T00:00:00');
  const original = await daily.getPuzzleForDate(date, 'medium');
  const changed = vi.spyOn(generators, 'generatePuzzle').mockResolvedValue({ ...original, id: 'future-generator' });
  try {
    assert.deepEqual(await daily.getPuzzleForDate(date, 'medium'), original);
    assert.equal(changed.mock.calls.length, 0);
  } finally {
    changed.mockRestore();
  }
});
