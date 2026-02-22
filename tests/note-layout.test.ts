import { test } from 'vitest';
import assert from 'node:assert/strict';
import { getNoteAnchor } from '../src/renderer/noteLayout';

test('returns null for out-of-range notes', () => {
  assert.equal(getNoteAnchor(0), null);
  assert.equal(getNoteAnchor(10), null);
});

test('provides 9 unique anchors that avoid top-left corner', () => {
  const anchors = Array.from({ length: 9 }, (_, i) => getNoteAnchor(i + 1));
  assert.equal(anchors.every((anchor) => anchor !== null), true);

  const keySet = new Set(anchors.map((anchor) => `${anchor!.xFactor},${anchor!.yFactor}`));
  assert.equal(keySet.size, 9);

  for (const anchor of anchors) {
    assert.ok(anchor!.xFactor >= 0.15);
    assert.ok(anchor!.yFactor >= 0.2);
  }
});
