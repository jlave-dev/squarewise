import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Chicago' });

test('midnight refreshes the picker without relabeling the active daily', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-05T23:59:59-05:00') });
  await page.goto('?scenario=daily-in-progress&difficulty=easy&date=2026-06-05');
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.locator('.daily-challenge-date')).toContainText('Jun 5');
  await page.clock.runFor(2200);
  await expect(page.locator('.daily-challenge-date')).toContainText('Jun 6');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('squarewise.activeGame.v1')!).puzzle.id))
    .toBe('daily-2026-06-05-easy-5x5');
  await page.keyboard.press('Escape');
  await page.goto('./');
  await expect(page.getByRole('gridcell')).toHaveCount(25);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('squarewise.activeGame.v1')!).puzzle.id))
    .toBe('daily-2026-06-05-easy-5x5');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: /Daily Challenge/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('squarewise.activeGame.v1')!).puzzle.id))
    .toMatch(/^daily-2026-06-06-/);
});
