import { expect, test, type Page } from '@playwright/test';

test.use({ timezoneId: 'America/Chicago' });

async function readStats(page: Page) {
  return page.evaluate(() => new Promise<any>((resolve, reject) => {
    const open = indexedDB.open('squarewise');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction('stats').objectStore('stats').get('playerStats');
      request.onsuccess = () => { resolve(request.result?.value); db.close(); };
      request.onerror = () => { reject(request.error); db.close(); };
    };
  }));
}

async function finish(page: Page) {
  const value = await page.evaluate(() => {
    const saved = JSON.parse(sessionStorage.getItem('squarewise.activeGame.v1')!);
    return saved.puzzle.solution[saved.selectedCell.row][saved.selectedCell.col];
  });
  await page.keyboard.press(String(value));
  await expect(page.getByRole('dialog', { name: 'Puzzle Complete' })).toBeVisible();
}

test('two tabs retain both completions, including after reload and replay', async ({ page, context }) => {
  const second = await context.newPage();
  await Promise.all([
    page.goto('?scenario=almost-won&difficulty=easy'),
    second.goto('?scenario=almost-won&difficulty=beginner'),
  ]);
  await Promise.all([finish(page), finish(second)]);
  let saved = await readStats(page);
  expect(saved.puzzlesCompleted.easy).toBe(1);
  expect(saved.puzzlesCompleted.beginner).toBe(1);
  await Promise.all([page.reload(), second.reload()]);
  await Promise.all([finish(page), finish(second)]);
  await expect(page.locator('.win-recording-note')).toContainText('already recorded');
  saved = await readStats(second);
  expect(saved.puzzlesCompleted.easy).toBe(1);
  expect(saved.puzzlesCompleted.beginner).toBe(1);
});

test('each tab resumes its own board and background writes do not replace the shared owner', async ({ page, context }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  const second = await context.newPage();
  await second.goto('?scenario=in-progress&difficulty=beginner');
  const secondId = await second.locator('#sw-state-probe').getAttribute('data-puzzle-id');
  await page.keyboard.press('1');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('squarewise.activeGame.v1')!).puzzle.id)).toBe(secondId);
  await page.goto('./');
  await second.goto('./');
  await expect(page.getByRole('grid')).toHaveAttribute('aria-rowcount', '5');
  await expect(second.getByRole('grid')).toHaveAttribute('aria-rowcount', '4');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('squarewise.activeGame.v1')!).grid[0][0])).toBe(1);
});

test('a Reveal win is visible but excluded from statistics and badges', async ({ page }) => {
  await page.goto('?scenario=almost-won&difficulty=easy');
  await page.getByRole('button', { name: 'Hint', exact: true }).first().click();
  await page.getByRole('button', { name: 'Reveal', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Puzzle Complete' })).toBeVisible();
  await expect(page.locator('.win-recording-note')).toContainText('Reveal used');
  await expect(page.locator('.win-best, .win-badge')).toHaveCount(0);
  expect((await readStats(page)).puzzlesCompleted.easy).toBe(0);
});

test('daily replays show current time without borrowing the first completion badges', async ({ page }) => {
  await page.goto('?scenario=daily-in-progress&difficulty=easy&date=2026-06-05');
  const snapshot = await page.evaluate(() => JSON.parse(sessionStorage.getItem('squarewise.activeGame.v1')!));
  snapshot.grid = snapshot.puzzle.solution.map((row: number[]) => [...row]);
  snapshot.grid[0][0] = 0;
  snapshot.selectedCell = { row: 0, col: 0 };
  for (const time of [100, 10]) {
    snapshot.timer = time;
    // Install the fixture after the previous game has flushed on pagehide.
    await page.goto('./manifest.json');
    await page.evaluate(value => {
      sessionStorage.setItem('squarewise.activeGame.v1', JSON.stringify(value));
    }, snapshot);
    await page.goto('./');
    await finish(page);
    if (time === 10) {
      await expect(page.locator('.win-recording-note')).toContainText('already recorded');
      await expect(page.locator('.win-badge, .win-best')).toHaveCount(0);
      await expect(page.locator('.win-time')).toHaveText('0:10');
    }
  }
  const saved = await readStats(page);
  expect(saved.puzzlesCompleted.easy).toBe(1);
  expect(saved.dailyCompletions['2026-06-05:easy'].time).toBe(100);
});

test('local streak boundaries survive UTC midnight, missed days, and spring DST', async ({ page }) => {
  for (const [index, instant] of [
    '2026-11-05T17:30:00-06:00', '2026-11-05T18:30:00-06:00', '2026-11-06T00:01:00-06:00',
    '2026-03-08T23:50:00-05:00', '2026-03-09T00:10:00-05:00',
  ].entries()) {
    await page.clock.setFixedTime(new Date(instant));
    await page.goto('?scenario=almost-won&difficulty=easy');
    await page.goto('./manifest.json');
    await page.evaluate(index => {
      const saved = JSON.parse(sessionStorage.getItem('squarewise.activeGame.v1')!);
      saved.puzzle.id += `-${index}`;
      sessionStorage.setItem('squarewise.activeGame.v1', JSON.stringify(saved));
    }, index);
    await page.goto('./');
    await finish(page);
    expect((await readStats(page)).currentStreak).toBe(index === 2 || index === 4 ? 2 : 1);
  }
  await page.clock.setFixedTime(new Date('2026-03-11T00:00:00-05:00'));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.getByText('Streak', { exact: true }).locator('..').locator('div').first()).toHaveText('0');
});

test('app starts when secure-context UUID generation is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined });
  });
  await page.goto('?scenario=in-progress&difficulty=easy');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
});
