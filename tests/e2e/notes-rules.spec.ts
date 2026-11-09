import { expect, test } from '@playwright/test';

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
