import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('service worker isolation', () => {
  it('ignores requests outside its application path', () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    runInNewContext(readFileSync('public/sw.js', 'utf8'), {
      URL,
      self: {
        location: new URL('https://example.com/squarewise/sw.js'),
        addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
      },
    });
    for (const url of ['https://example.com/other/', 'https://example.com/squarewise-other/', 'https://other.com/squarewise/']) {
      const respondWith = vi.fn();
      handlers.fetch({ request: { method: 'GET', mode: 'navigate', url }, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });
});
