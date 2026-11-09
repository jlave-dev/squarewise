import { expect, test } from '@playwright/test';

test('worker updates preserve unrelated caches and support offline navigation', async ({ page, context }) => {
  test.skip(!process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.includes('preview'), 'Production worker only');
  await page.goto('./manifest.json');
  await page.evaluate(async () => {
    await caches.open('another-app-cache');
    await caches.open('squarewise-obsolete');
  });
  await page.goto('./?scenario=in-progress&difficulty=easy');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain('squarewise-obsolete');
  expect(await page.evaluate(() => caches.keys())).toContain('another-app-cache');
  await page.reload();
  await context.setOffline(true);
  await page.goto('./');
  await expect(page.locator('canvas').first()).toBeVisible();
});
