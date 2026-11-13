import { expect, test } from '@playwright/test';

test('reload checkpoints elapsed time before the periodic save', async ({ page }) => {
  await page.clock.install();
  await page.goto('?scenario=in-progress&difficulty=easy');
  const savedTimer = () => page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('squarewise.activeGame.v1')!).timer
  );
  const initial = await savedTimer();
  await page.clock.runFor(2100);
  expect(await savedTimer()).toBe(initial);
  await page.goto('./');
  expect(await savedTimer()).toBe(initial + 2);
});

test('timer preserves cell identity and focus without writing the board snapshot', async ({ page }) => {
  await page.clock.install();
  await page.goto('?scenario=in-progress&difficulty=easy');
  const cell = page.getByRole('gridcell').first();
  await cell.focus();
  await page.evaluate(() => {
    const state = window as unknown as { auditCell: Element | null; auditWrites: number };
    state.auditCell = document.querySelector('.accessible-board-cell');
    state.auditWrites = 0;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'squarewise.activeGame.v1') state.auditWrites++;
      return setItem.call(this, key, value);
    };
  });
  await page.clock.runFor(2100);
  await expect(cell).toBeFocused();
  expect(await page.evaluate(() => {
    const state = window as unknown as { auditCell: Element; auditWrites: number };
    return { same: state.auditCell === document.querySelector('.accessible-board-cell'), writes: state.auditWrites };
  })).toEqual({ same: true, writes: 0 });
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-col', '1');
  await page.keyboard.press('2');
  await page.goto('./');
  await expect(page.getByRole('gridcell').nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('gridcell').nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('gridcell').nth(1)).toHaveAttribute('aria-label', /value 2/);
});

test('cage descriptions identify member coordinates', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-label', /cage 1, clue .+, cells row 1 column 1/);
});

test('keyboard hint moves board focus to the cell that receives input', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  const cells = page.getByRole('gridcell');
  await cells.last().focus();
  await page.keyboard.press('h');
  const target = page.locator('[role="gridcell"][aria-selected="true"]');
  await expect(cells.last()).not.toBeFocused();
  await expect(target).toBeFocused();
  await page.keyboard.press('2');
  await expect(target).toHaveAttribute('aria-label', /value 2/);
});
