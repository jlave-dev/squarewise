import { expect, test } from '@playwright/test';

test('development cleanup preserves another worker scope and unrelated caches', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.includes('preview'), 'Development cleanup only');
  await page.goto('./manifest.json');
  const scopes = await page.evaluate(async () => {
    const app = new URL('./', location.href).href;
    const other = new URL('other-app/', app).href;
    await navigator.serviceWorker.register(new URL('sw.js', app), { scope: app });
    await navigator.serviceWorker.register(new URL('sw.js', app), { scope: other });
    return { app, other };
  });
  await expect.poll(() => page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).filter(registration => registration.active?.state === 'activated').length
  )).toBe(2);
  await page.evaluate(async () => {
    await caches.open('another-app-cache');
    await caches.open('squarewise-obsolete');
  });
  await page.goto('./?scenario=in-progress&difficulty=easy');
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect.poll(() => page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistrations()).map(registration => registration.scope)
  )).toEqual([scopes.other]);
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain('squarewise-obsolete');
  expect(await page.evaluate(() => caches.keys())).toContain('another-app-cache');
});

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
