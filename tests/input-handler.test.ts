import { test } from 'vitest';
import assert from 'node:assert/strict';
import { getCellFromPoint } from '../src/app/InputHandler';

test('maps mouse and touch canvas coordinates to the same cells', () => {
  const config = { padding: 20, cellSize: 50 };

  assert.deepEqual(getCellFromPoint(20, 20, config, 4), { row: 0, col: 0 });
  assert.deepEqual(getCellFromPoint(69, 69, config, 4), { row: 0, col: 0 });
  assert.deepEqual(getCellFromPoint(70, 20, config, 4), { row: 0, col: 1 });
  assert.deepEqual(getCellFromPoint(171, 121, config, 4), { row: 2, col: 3 });
});

test('returns null for points outside the playable board', () => {
  const config = { padding: 20, cellSize: 50 };

  assert.equal(getCellFromPoint(19, 20, config, 4), null);
  assert.equal(getCellFromPoint(20, 19, config, 4), null);
  assert.equal(getCellFromPoint(220, 20, config, 4), null);
  assert.equal(getCellFromPoint(20, 220, config, 4), null);
});
