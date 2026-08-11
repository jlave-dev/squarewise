import { test } from 'vitest';
import assert from 'node:assert/strict';
import { prefersReducedMotion } from '../src/utils/animations';

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
