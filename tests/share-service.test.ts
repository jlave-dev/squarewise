import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ShareService } from '../src/app/share/ShareService';
import type { SharePayload } from '../src/app/share/SharePayload';

const payload: SharePayload = {
  title: 'SquareWise Puzzle Complete',
  text: 'I solved today\'s puzzle!',
  url: 'https://squarewise.app',
};

test('ShareService uses native share when available', async () => {
  let called = false;
  const service = new ShareService({
    navigatorLike: {
      share: async (data) => {
        called = true;
        assert.deepEqual(data, payload);
      },
    },
  });

  const result = await service.share(payload);

  assert.equal(called, true);
  assert.equal(result.kind, 'shared');
});

test('ShareService treats AbortError as cancelled', async () => {
  const service = new ShareService({
    navigatorLike: {
      share: async () => {
        const err = new Error('cancelled');
        err.name = 'AbortError';
        throw err;
      },
    },
  });

  const result = await service.share(payload);

  assert.equal(result.kind, 'cancelled');
});

test('ShareService returns social fallback when native share is unavailable', async () => {
  const service = new ShareService({
    navigatorLike: {},
  });

  const result = await service.share(payload);

  assert.equal(result.kind, 'fallback');
  if (result.kind !== 'fallback') {
    throw new Error('Expected fallback result');
  }

  assert.equal(result.links.length > 0, true);
  assert.equal(result.links[0].id, 'x');
  assert.match(result.links[0].url, /^https:\/\/twitter\.com\/intent\/tweet\?/);
  assert.equal(result.copyText, `${payload.text} ${payload.url}`);
});
