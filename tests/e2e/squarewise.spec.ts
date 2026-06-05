import { expect, test, type Page } from '@playwright/test';

type ProbeState = Record<string, string>;

async function getProbe(page: Page): Promise<ProbeState> {
  return page.locator('#sw-state-probe').evaluate((probe) => ({ ...((probe as HTMLElement).dataset) }));
}

async function expectNoConsoleProblems(consoleProblems: string[]): Promise<void> {
  expect(consoleProblems, consoleProblems.join('\n')).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('debug new-game scenario renders playable app state', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });

  await page.goto('?scenario=new-game&difficulty=easy');

  await expect(page).toHaveTitle(/SquareWise/);
  await expect(page.getByText('SquareWise')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.game-meta')).toContainText('Fresh - Easy - 5x5');
  await expect(page.getByRole('grid', { name: 'SquareWise board' })).toBeVisible();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-mode', 'fresh');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');

  await expectNoConsoleProblems(consoleProblems);
});

test('tutorial place-value step does not complete while notes mode is on', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });

  await page.goto('?scenario=tutorial-step&step=place-value');
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'place-value');

  await page.locator('canvas').click({ position: { x: 55, y: 55 } });
  await page.keyboard.press('n');
  await page.keyboard.press('1');

  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'place-value');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-notes-mode', 'true');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-row', '0');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-col', '0');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '0');
  await expect(page.locator('.accessible-board-cell[data-row="0"][data-col="0"]')).toHaveAttribute(
    'aria-label',
    /notes 1/
  );

  await page.keyboard.press('n');
  await page.keyboard.press('1');

  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'complete');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-notes-mode', 'false');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '1');

  await expectNoConsoleProblems(consoleProblems);
});

test('hint tier four reveals one value and records tier usage', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });

  await page.goto('?scenario=hint-tier&tier=4&difficulty=easy');

  await expect(page.locator('.hint-panel')).toBeVisible();
  await expect(page.locator('.hint-text')).toContainText('Tier 4:');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-hint-tier', '4');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-hint-reveal', 'true');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-hint-tier4', '1');

  const probe = await getProbe(page);
  expect(probe.selectedRow).not.toEqual('');
  expect(probe.selectedCol).not.toEqual('');
  expect(Number(probe.selectedValue)).toBeGreaterThan(0);

  await expectNoConsoleProblems(consoleProblems);
});

test('keyboard gameplay supports notes, values, undo, redo, clear, hint, and pause', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });

  await page.goto('?scenario=in-progress&difficulty=easy');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-row', '0');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-col', '0');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '0');

  await page.keyboard.press('n');
  await page.keyboard.press('1');

  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-notes-mode', 'true');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '0');
  await expect(page.locator('.accessible-board-cell[data-row="0"][data-col="0"]')).toHaveAttribute(
    'aria-label',
    /notes 1/
  );

  await page.keyboard.press('n');
  await page.keyboard.press('1');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-notes-mode', 'false');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '1');

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '0');
  await expect(page.locator('.accessible-board-cell[data-row="0"][data-col="0"]')).toHaveAttribute(
    'aria-label',
    /notes 1/
  );

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Y' : 'Control+Y');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '1');

  await page.keyboard.press('Backspace');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '0');

  await page.keyboard.press('h');
  await expect(page.locator('.hint-panel')).toBeVisible();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-hint-tier', '1');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-hint-tier1', '1');

  await page.keyboard.press('p');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'paused');
  await expect(page.locator('.game-meta')).toContainText('Paused');

  await page.keyboard.press('p');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');

  await expectNoConsoleProblems(consoleProblems);
});

test('focused modal controls block gameplay keyboard shortcuts', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });

  await page.goto('?scenario=in-progress&difficulty=easy');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '0');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-notes-mode', 'false');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

  await page.keyboard.press('1');
  await page.keyboard.press('n');
  await page.keyboard.press('p');

  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '0');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-notes-mode', 'false');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');

  await expectNoConsoleProblems(consoleProblems);
});

test('win modal confetti is cleaned up when the modal closes', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('?scenario=won-modal&difficulty=easy&timer=123');

  await expect(page.getByRole('dialog', { name: 'Puzzle Complete' })).toBeVisible();
  await expect(page.locator('.win-confetti')).toHaveCount(50);
  await expect(page.locator('#confetti-style')).toHaveCount(1);

  await page
    .getByRole('dialog', { name: 'Puzzle Complete' })
    .getByRole('button', { name: 'New game' })
    .click();

  await expect(page.getByRole('dialog', { name: 'Puzzle Complete' })).toBeHidden();
  await expect(page.locator('.win-confetti')).toHaveCount(0);
  await expect(page.locator('#confetti-style')).toHaveCount(0);

  await expectNoConsoleProblems(consoleProblems);
});

test('reduced motion suppresses win confetti', async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text());
    }
  });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('?scenario=won-modal&difficulty=easy&timer=123');

  await expect(page.getByRole('dialog', { name: 'Puzzle Complete' })).toBeVisible();
  await expect(page.locator('.win-confetti')).toHaveCount(0);
  await expect(page.locator('#confetti-style')).toHaveCount(0);

  await expectNoConsoleProblems(consoleProblems);
});
