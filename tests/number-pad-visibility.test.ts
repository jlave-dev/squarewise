import { test } from 'vitest';
import assert from 'node:assert/strict';
import { shouldShowKeyboardHints } from '../src/ui/NumberPad';

test('shows keyboard hints only when collapsible and keypad is hidden', () => {
  assert.equal(shouldShowKeyboardHints(true, false), true);
  assert.equal(shouldShowKeyboardHints(true, true), false);
  assert.equal(shouldShowKeyboardHints(false, false), false);
  assert.equal(shouldShowKeyboardHints(false, true), false);
});
