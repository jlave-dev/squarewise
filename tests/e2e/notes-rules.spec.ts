import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Chicago' });

test('midnight and visibility refresh preserve Rules until returning to the picker', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-05T23:59:59-05:00') });
  await page.goto('?scenario=in-progress&difficulty=easy');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Rules', exact: true }).click();
  const rules = page.getByRole('dialog', { name: 'Rules', exact: true });
  await expect(rules).toContainText('5 − 2 = 3');
  await page.clock.runFor(2200);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(rules).toContainText('5 − 2 = 3');
  await expect(rules.getByRole('button', { name: /Daily Challenge/ })).toHaveCount(0);
  await rules.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Select Puzzle' })).toBeVisible();
  await expect(page.locator('.daily-challenge-date')).toContainText('Jun 6');
});

test('one notes toggle controls candidates and rules explain cage operations', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');
  const notes = page.getByRole('button', { name: 'Notes', exact: true });
  await expect(notes).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Note Grid' })).toHaveCount(0);
  await notes.click();
  await expect(notes).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-label', /notes 1/);
  await notes.click();
  await expect(notes).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Rules', exact: true }).click();
  const rules = page.getByRole('dialog', { name: 'Rules', exact: true });
  await expect(rules).toContainText('5 − 2 = 3');
  await expect(rules).toContainText('6 ÷ 2 = 3');
  await expect(rules).toContainText('different rows and columns');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Select Puzzle' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
});
