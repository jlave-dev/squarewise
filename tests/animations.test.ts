import { test } from 'vitest';
import assert from 'node:assert/strict';
import { clamp, prefersReducedMotion } from '../src/utils/animations';

test('prefersReducedMotion reads reduce media query state', () => {
  assert.equal(
    prefersReducedMotion({
      matchMedia: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      } as MediaQueryList),
    }),
    true
  );

  assert.equal(
    prefersReducedMotion({
      matchMedia: () => ({ matches: false } as MediaQueryList),
    }),
    false
  );
});

test('clamp bounds values', () => {
  assert.equal(clamp(4, 1, 3), 3);
  assert.equal(clamp(-1, 1, 3), 1);
  assert.equal(clamp(2, 1, 3), 2);
});
