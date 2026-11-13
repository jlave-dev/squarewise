import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block', timezoneId: 'America/Chicago' });

for (const date of ['2026-10-04', '2026-09-14', '2026-09-12']) {
  test(`daily startup recovers the previously failing date ${date}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${date}T12:00:00-05:00`));
    await page.goto('?scenario=level-select');
    await page.getByRole('button', { name: 'Daily Challenge' }).click();
    await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-puzzle-id', `daily-${date}-medium-6x6`, { timeout: 20_000 });
    await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}

test('Hard generation stays responsive, can be cancelled, and cannot replace a later board', async ({ page }) => {
  await page.goto('?scenario=level-select&seed=audit-hard-1');
  await page.evaluate(() => {
    const sample = { ticks: 0, maxGap: 0, last: performance.now() };
    (window as unknown as { generationSample: typeof sample }).generationSample = sample;
    setInterval(() => {
      const now = performance.now();
      sample.maxGap = Math.max(sample.maxGap, now - sample.last);
      sample.last = now;
      sample.ticks++;
    }, 20);
  });
  await page.getByRole('button', { name: /^hard /i }).click();
  await expect(page.getByRole('dialog', { name: 'Preparing puzzle' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { generationSample: { ticks: number } }).generationSample.ticks)).toBeGreaterThan(5);
  expect(await page.evaluate(() => (window as unknown as { generationSample: { maxGap: number } }).generationSample.maxGap)).toBeLessThan(500);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Select Puzzle' })).toBeVisible();
  await page.getByRole('button', { name: /^easy /i }).click();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-size', '5', { timeout: 20_000 });
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
});

test('audit-hard-1 loads through normal selection', async ({ page }) => {
  await page.goto('?scenario=level-select&seed=audit-hard-1');
  await page.getByRole('button', { name: /^hard /i }).click();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-puzzle-id', 'audit-hard-1-7x7', { timeout: 20_000 });
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
});

test('worker startup failure leaves a visible selector and preserves the current board', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  const originalId = await page.locator('#sw-state-probe').getAttribute('data-puzzle-id');
  await page.route('**/puzzle.worker-*.js', route => route.abort());
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: /^expert /i }).click();
  await expect(page.getByRole('dialog', { name: 'Select Puzzle' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Select Puzzle' }).getByRole('alert')).toContainText('try again');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-puzzle-id', originalId!);
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-size', '5');
});
