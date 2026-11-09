import { expect, test } from '@playwright/test';
import fixture from '../fixtures/expert-alternative.json' with { type: 'json' };

for (const [name, solution] of [['stored', fixture.puzzle.solution], ['alternative', fixture.alternative]] as const) {
  test(`accepts the ${name} Expert completion`, async ({ page }) => {
    await page.addInitScript(({ puzzle, solution }) => {
      const grid = solution.map(row => [...row]);
      grid[4][0] = 0;
      localStorage.setItem('squarewise.tutorial.v1', JSON.stringify({ completed: true, skipped: false }));
      localStorage.setItem('squarewise.activeGame.v1', JSON.stringify({
        puzzle, grid, notes: grid.map(row => row.map(() => [])), timer: 10,
        hintsUsed: 0, hintUsage: { tier1: 0, tier2: 0, tier3: 0, tier4: 0 }, mistakeCount: 0,
        status: 'playing', selectedCell: { row: 4, col: 0 }, notesMode: false,
      }));
    }, { puzzle: fixture.puzzle, solution });
    await page.goto('./');
    await expect(page.getByRole('grid', { name: 'SquareWise board' })).toBeAttached();
    await page.keyboard.press(String(solution[4][0]));
    await expect(page.getByRole('dialog', { name: 'Puzzle Complete' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Puzzle Complete' })).toContainText('0 mistakes');
    await expect(page.locator('.accessible-board-cell[aria-label*="conflict"]')).toHaveCount(0);
  });
}
