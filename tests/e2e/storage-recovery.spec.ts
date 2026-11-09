import { expect, test } from '@playwright/test';

test('a malformed active cage recovers without deleting settings or unrelated data', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('squarewise.activeGame.v1')!);
    saved.puzzle.cages = [null];
    localStorage.setItem('squarewise.activeGame.v1', JSON.stringify(saved));
    sessionStorage.setItem('squarewise.activeGame.v1', JSON.stringify(saved));
    localStorage.setItem('squarewise.tutorial.v1', JSON.stringify({ completed: true, skipped: false }));
    localStorage.setItem('squarewise.userSettings.v1', JSON.stringify({ theme: 'dark', soundEnabled: false }));
    localStorage.setItem('unrelated', 'keep');
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: 'Select Puzzle' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('squarewise.activeGame.v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('squarewise.userSettings.v1')!).theme)).toBe('dark');
  await page.getByRole('button', { name: /^easy /i }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('valid older active games resume with migrated counters', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('squarewise.activeGame.v1')!);
    delete saved.hintUsage;
    delete saved.mistakeCount;
    saved.timer = 75;
    saved.status = 'paused';
    localStorage.setItem('squarewise.activeGame.v1', JSON.stringify(saved));
    sessionStorage.setItem('squarewise.activeGame.v1', JSON.stringify(saved));
  });
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toContainText('01:15');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('an invalid local settings mirror falls back to saved IndexedDB settings', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('squarewise');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('settings', 'readwrite');
        transaction.objectStore('settings').put({ key: 'userSettings', value: { theme: 'dark' } });
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onabort = () => { database.close(); reject(transaction.error); };
      };
    });
    localStorage.setItem('squarewise.userSettings.v1', 'null');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('squarewise.userSettings.v1')!).theme)).toBe('dark');
});
