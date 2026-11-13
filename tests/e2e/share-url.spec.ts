import { expect, test } from '@playwright/test';

test('native share points to the configured production app base', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: async (payload: { url: string }) => {
      (window as unknown as { sharedUrl: string }).sharedUrl = payload.url;
    } });
  });
  await page.goto('?scenario=won&difficulty=easy#diagnostic');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const sharedUrl = await page.evaluate(() => (window as unknown as { sharedUrl: string }).sharedUrl);
  expect(sharedUrl).toBe(baseURL);
  await page.goto(sharedUrl);
  await expect(page.locator('canvas')).toBeVisible();
});

test('fallback share links point to the configured app base', async ({ page, baseURL }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }));
  await page.goto('?scenario=won&difficulty=easy#diagnostic');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const href = await page.getByRole('link', { name: 'Share on X' }).getAttribute('href');
  expect(new URL(href!).searchParams.get('url')).toBe(baseURL);
});
