import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  getInputCapabilities,
  shouldShowOnScreenKeypadByDefault,
} from '../src/utils/inputCapabilities';

test('defaults to showing keypad only for coarse + no-hover environments', () => {
  assert.equal(
    shouldShowOnScreenKeypadByDefault({ anyPointerCoarse: true, hoverNone: true }),
    true
  );
  assert.equal(
    shouldShowOnScreenKeypadByDefault({ anyPointerCoarse: true, hoverNone: false }),
    false
  );
  assert.equal(
    shouldShowOnScreenKeypadByDefault({ anyPointerCoarse: false, hoverNone: true }),
    false
  );
});

test('reads capabilities from media query matches', () => {
  const media = new Map<string, boolean>([
    ['(any-pointer: coarse)', true],
    ['(hover: none)', true],
  ]);

  const capabilities = getInputCapabilities((query) => ({
    media: query,
    matches: media.get(query) ?? false,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));

  assert.deepEqual(capabilities, {
    anyPointerCoarse: true,
    hoverNone: true,
  });
});
