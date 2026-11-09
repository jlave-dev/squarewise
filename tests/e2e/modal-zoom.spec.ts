import { expect, test } from '@playwright/test';

test('picker contains forward and reverse focus with collapsed and expanded archives', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  const trigger = page.getByRole('button', { name: 'New Game' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Select Puzzle' });
  for (const expanded of [false, true]) {
    const summary = dialog.locator('summary');
    if (expanded) await summary.click();
    await summary.focus();
    for (const key of ['Tab', 'Shift+Tab']) {
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
    }
  }
  expect(await page.locator('#app').evaluate(el => el.inert)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.locator('#app').evaluate(el => el.inert)).toBe(false);
});

test('expert board permits browser zoom and touch selection', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}?scenario=in-progress&difficulty=expert`);
  expect(await page.locator('meta[name=viewport]').getAttribute('content')).not.toContain('user-scalable=no');
  const canvas = page.locator('canvas');
  expect(await canvas.evaluate(el => getComputedStyle(el).touchAction)).toBe('manipulation');
  await canvas.tap({ position: { x: 28, y: 28 } });
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-row', '0');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-col', '0');
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  expect(await page.evaluate(() => visualViewport!.scale)).toBe(2);
  await canvas.tap({ position: { x: 68, y: 28 } });
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-col', '1');
  await page.screenshot({ path: 'outputs/audit/expert-zoom.png' });
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await page.getByRole('button', { name: '1', exact: true }).tap();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '1');
  await context.close();
});
