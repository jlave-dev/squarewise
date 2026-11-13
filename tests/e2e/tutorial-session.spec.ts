import { expect, test } from '@playwright/test';
import { createTutorialPuzzle } from '../../src/tutorial/TutorialPuzzle';

test('skip ends the timer and save, and a new tutorial starts at its first step', async ({ page }) => {
  await page.clock.install();
  await page.goto('?scenario=tutorial-step&step=place-value');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.clock.runFor(1500);
  expect(await page.evaluate(() => localStorage.getItem('squarewise.activeGame.v1'))).toBeNull();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'idle');
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: 'Select Puzzle' })).toBeVisible();
  await page.getByRole('button', { name: 'How to Play' }).click();
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'intro');
  await expect(page.locator('.tutorial-panel')).toBeVisible();
});

test('replacing tutorial play hides its guidance and clears hints', async ({ page }) => {
  await page.goto('?scenario=tutorial-step&step=place-value');
  await page.getByRole('button', { name: 'Hint', exact: true }).first().click();
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: /^easy /i }).click();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-difficulty', 'easy');
  await expect(page.locator('.tutorial-panel')).toBeHidden();
  await expect(page.locator('.hint-panel')).toBeHidden();
});

test('an old tutorial save restarts guidance instead of resuming an orphaned board', async ({ page }) => {
  await page.addInitScript(puzzle => {
    localStorage.setItem('squarewise.activeGame.v1', JSON.stringify({
      puzzle, grid: puzzle.solution.map(row => row.map(() => 0)), notes: puzzle.solution.map(row => row.map(() => [])),
      timer: 12, hintsUsed: 0, status: 'playing', selectedCell: null, notesMode: false,
    }));
  }, createTutorialPuzzle());
  await page.goto('./');
  await expect(page.locator('.tutorial-panel')).toBeVisible();
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'intro');
  expect(await page.evaluate(() => localStorage.getItem('squarewise.activeGame.v1'))).toBeNull();
});
