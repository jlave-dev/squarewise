import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

async function pendingWrite() {
  vi.resetModules();
  const transaction: any = { error: null, abort: vi.fn() };
  const put = vi.fn();
  transaction.objectStore = () => ({
    get: () => {
      const request: any = { result: { value: 4 } };
      queueMicrotask(() => request.onsuccess());
      return request;
    },
    put,
  });
  vi.stubGlobal('indexedDB', {
    open: () => {
      const request: any = { result: { transaction: () => transaction } };
      queueMicrotask(() => request.onsuccess());
      return request;
    },
  });
  const { db } = await import('../src/storage/IndexedDB');
  const result = db.update('stats', 'count', current => Number(current) + 1);
  await vi.waitFor(() => expect(put).toHaveBeenCalledWith({ key: 'count', value: 5 }));
  return { result, transaction };
}

test('a write does not report success before transaction completion', async () => {
  const { result, transaction } = await pendingWrite();
  let settled = false;
  result.then(() => { settled = true; });
  await Promise.resolve();
  expect(settled).toBe(false);
  transaction.oncomplete();
  await expect(result).resolves.toBe(5);
});

test('transaction abort rejects the write', async () => {
  const { result, transaction } = await pendingWrite();
  const rejection = expect(result).rejects.toThrow('quota');
  transaction.error = new Error('quota');
  transaction.onabort();
  await rejection;
});
