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
  await cdp.send('Input.synthesizeScrollGesture', {
    x: 150, y: 350, xDistance: 0, yDistance: -550, gestureSourceType: 'touch', speed: 1000,
  });
  await expect.poll(() => page.evaluate(() => visualViewport!.offsetTop)).toBeGreaterThan(0);
  // Locator hit testing uses layout coordinates after visual-viewport panning.
  // Dispatch an actual touch at the button's visible CSS coordinates instead.
  const point = await page.getByRole('button', { name: '1', exact: true }).evaluate(button => {
    const rect = button.getBoundingClientRect();
    const viewport = visualViewport!;
    return {
      x: rect.left + rect.width / 2 - viewport.offsetLeft,
      y: rect.top + rect.height / 2 - viewport.offsetTop,
      width: viewport.width,
      height: viewport.height,
    };
  });
  expect(point.x).toBeGreaterThan(0);
  expect(point.x).toBeLessThan(point.width);
  expect(point.y).toBeGreaterThan(0);
  expect(point.y).toBeLessThan(point.height);
  await page.touchscreen.tap(point.x, point.y);
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '1');
  expect(await page.evaluate(() => visualViewport!.scale)).toBe(2);
  await page.screenshot({ path: 'outputs/audit/expert-zoom-keypad.png' });
  await context.close();
});
