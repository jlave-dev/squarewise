import { expect, test, type Page } from '@playwright/test';

type ProbeState = Record<string, string>;

async function getProbe(page: Page): Promise<ProbeState> {
  return page.locator('#sw-state-probe').evaluate((probe) => ({ ...((probe as HTMLElement).dataset) }));
}

async function expectNoConsoleProblems(consoleProblems: string[]): Promise<void> {
  expect(consoleProblems, consoleProblems.join('\n')).toEqual([]);
}

const MOBILE_LAYOUT_CASES = [
  { difficulty: 'beginner', gridSize: 4 },
  { difficulty: 'easy', gridSize: 5 },
  { difficulty: 'medium', gridSize: 6 },
  { difficulty: 'hard', gridSize: 7 },
  { difficulty: 'expert', gridSize: 9 },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.location.search.includes('preserve-storage=1')) return;
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
  await expect(page.getByRole('heading', { name: 'SquareWise', level: 1 })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('.game-meta')).toContainText('Practice - Easy - 5x5');
  await expect(page.getByRole('grid', { name: 'SquareWise board' })).toBeVisible();
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-mode', 'fresh');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');

  await expectNoConsoleProblems(consoleProblems);
});

test('desktop play exposes input controls and a keyboard entry point', async ({ page }) => {
  await page.goto('?scenario=new-game&difficulty=easy');

  await expect(page.locator('.number-pad-shell')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled();
  await expect(page.locator('.accessible-board-cell').first()).toHaveAttribute('tabindex', '0');
});

test('desktop expert board fits with the header and keypad', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=expert');

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')?.getBoundingClientRect();
    const keypad = document.querySelector('.number-pad-shell')?.getBoundingClientRect();
    return canvas && keypad
      ? {
          canvasBottom: canvas.bottom,
          keypadTop: keypad.top,
          keypadBottom: keypad.bottom,
          viewportHeight: window.innerHeight,
          pageHeight: document.documentElement.scrollHeight,
        }
      : null;
  });

  expect(layout).not.toBeNull();
  expect(layout!.keypadTop).toBeGreaterThanOrEqual(layout!.canvasBottom);
  expect(layout!.keypadBottom).toBeLessThanOrEqual(layout!.viewportHeight);
  expect(layout!.pageHeight).toBeLessThanOrEqual(layout!.viewportHeight);
});

test('paused scenario retains elapsed time and disables game input', async ({ page }) => {
  await page.goto('?scenario=paused&difficulty=easy&timer=95');

  await expect(page.locator('[data-testid="game-timer"]')).toHaveText('01:35');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
});

test('stale auto theme settings render as light even with dark system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => {
    localStorage.setItem('squarewise.userSettings.v1', JSON.stringify({
      theme: 'auto',
      showTimer: true,
      showErrors: true,
      soundEnabled: false,
      hapticFeedback: true,
      autoRemoveNotes: false,
    }));
  });

  await page.goto('?scenario=new-game&difficulty=easy&preserve-storage=1');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.game-meta')).toContainText('Practice - Easy - 5x5');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-mode', 'fresh');

  const storedTheme = await page.evaluate(() => {
    const raw = localStorage.getItem('squarewise.userSettings.v1');
    return raw ? JSON.parse(raw).theme : null;
  });
  expect(storedTheme).toBe('light');
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
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip' })).toBeHidden();

  await expectNoConsoleProblems(consoleProblems);
});

test('tutorial hides Next until the required interaction is complete', async ({ page }) => {
  await page.goto('?scenario=tutorial-step&step=intro');

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'select-cage');
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

  await page.keyboard.press('p');
  await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-status', 'playing');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

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
  await expect(page.getByRole('combobox', { name: 'Theme' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Timer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show Errors' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Auto-Remove Notes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sound Effects' })).toBeVisible();

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

test('a closing modal leaves only the next dialog exposed', async ({ page }) => {
  await page.goto('?scenario=in-progress&difficulty=easy');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Statistics' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Statistics' })).toBeVisible();
});

test('empty statistics omit the destructive reset action', async ({ page }) => {
  await page.goto('?scenario=new-game&difficulty=easy');
  await page.getByRole('button', { name: 'Statistics' }).click();

  const dialog = page.getByRole('dialog', { name: 'Statistics' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Reset Statistics' })).toBeHidden();
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
  await expect(page.locator('.win-time')).toHaveText('2:03');
  await expect(page.locator('.win-details')).toHaveText('no hints · 0 mistakes');
  await expect(page.locator('.win-confetti')).toHaveCount(36);
  await expect(page.locator('.win-confetti').first()).toHaveCSS('z-index', '1100');
  await expect(page.locator('#confetti-style')).toHaveCount(1);

  await page
    .getByRole('dialog', { name: 'Puzzle Complete' })
    .getByRole('button', { name: 'New Game' })
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

test('share fallback replaces the redundant Share action', async ({ page }) => {
  await page.goto('?scenario=won-share-fallback&difficulty=easy&timer=123');

  const dialog = page.getByRole('dialog', { name: 'Puzzle Complete' });
  await expect(dialog.getByRole('button', { name: 'Share', exact: true })).toBeHidden();
  await expect(dialog.getByRole('button', { name: 'Copy Result' })).toBeVisible();
  await expect(dialog.locator('.win-share-status')).toBeHidden();
});

test.describe('mobile layout', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('level select keeps primary choices visible and archives collapsed', async ({ page }) => {
    const consoleProblems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleProblems.push(message.text());
      }
    });

    await page.goto('?scenario=level-select');

    const dialog = page.getByRole('dialog', { name: 'Select Puzzle' });
    await expect(dialog).toBeVisible();

    const expertButton = dialog.getByRole('button', { name: /expert/i });
    await expect(expertButton).toBeVisible();
    await expect(dialog.getByText('Past Daily Puzzles')).toBeVisible();
    await expect(dialog.locator('.archive-section')).not.toHaveAttribute('open', '');
    await expect(dialog.locator('.archive-btn').first()).toBeHidden();
    await expect(dialog.locator('.archive-title')).toHaveCSS('min-height', '44px');

    await dialog.locator('.archive-title').click();
    await expect(dialog.locator('.archive-btn').first()).toBeVisible();
    await expect(dialog.locator('.archive-btn').first()).toHaveCSS('min-height', '44px');

    await expertButton.click();
    await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-size', '9');
    await expect(page.locator('.game-meta')).toContainText('Practice - Expert - 9x9');

    await expectNoConsoleProblems(consoleProblems);
  });

  test('hint guidance renders below the toolbar and above the board', async ({ page }) => {
    await page.goto('?scenario=hint-tier&tier=1&difficulty=easy');
    await expect(page.locator('.hint-panel')).toBeVisible();

    const layout = await page.evaluate(() => {
      const controls = document.querySelector('.controls-container')?.getBoundingClientRect();
      const hint = document.querySelector('.hint-panel')?.getBoundingClientRect();
      const canvas = document.querySelector('canvas')?.getBoundingClientRect();
      return controls && hint && canvas
        ? { controlsBottom: controls.bottom, hintTop: hint.top, hintBottom: hint.bottom, canvasTop: canvas.top }
        : null;
    });

    expect(layout).not.toBeNull();
    expect(layout!.hintTop).toBeGreaterThanOrEqual(layout!.controlsBottom);
    expect(layout!.canvasTop).toBeGreaterThanOrEqual(layout!.hintBottom);
    await expect(page.locator('.hint-text')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reveal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reveal' })).toHaveCSS('min-height', '44px');
  });

  test('tutorial keeps its required cell and keypad unobstructed', async ({ page }) => {
    await page.goto('?scenario=tutorial-step&step=select-cage');

    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')?.getBoundingClientRect();
      const tutorial = document.querySelector('.tutorial-panel')?.getBoundingClientRect();
      const keypad = document.querySelector('.number-pad-shell')?.getBoundingClientRect();
      return canvas && tutorial && keypad
        ? {
            targetCellBottom: canvas.top + canvas.height / 4,
            tutorialTop: tutorial.top,
            tutorialBottom: tutorial.bottom,
            keypadTop: keypad.top,
          }
        : null;
    });

    expect(layout).not.toBeNull();
    expect(layout!.tutorialTop).toBeGreaterThanOrEqual(layout!.targetCellBottom);
    expect(layout!.keypadTop).toBeGreaterThanOrEqual(layout!.tutorialBottom);
  });

  for (const { difficulty, gridSize } of MOBILE_LAYOUT_CASES) {
    test(`${difficulty} board stays fully visible above the keypad and touch input still works`, async ({ page }) => {
      const consoleProblems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          consoleProblems.push(message.text());
        }
      });

      await page.goto(`?scenario=in-progress&difficulty=${difficulty}`);

      await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-size', String(gridSize));
      await expect(page.locator('.number-pad')).toBeVisible();
      await expect(page.locator('.number-pad-actions')).toBeVisible();
      await expect(page.locator('.number-btn')).toHaveCount(gridSize);
      await expect(page.getByRole('button', { name: '1' })).toHaveCount(1);

      const layout = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        const header = document.querySelector('.ui-container');
        const keypad = document.querySelector('.number-pad-shell');

        if (!canvas || !header || !keypad) {
          return null;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const keypadRect = keypad.getBoundingClientRect();

        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          canvas: {
            left: canvasRect.left,
            top: canvasRect.top,
            right: canvasRect.right,
            bottom: canvasRect.bottom,
            width: canvasRect.width,
            height: canvasRect.height,
          },
          headerBottom: headerRect.bottom,
          keypadTop: keypadRect.top,
          keypadBottom: keypadRect.bottom,
        };
      });

      expect(layout).not.toBeNull();
      expect(layout!.canvas.left).toBeGreaterThanOrEqual(0);
      expect(layout!.canvas.right).toBeLessThanOrEqual(layout!.viewportWidth);
      if (gridSize <= 6) {
        expect(layout!.canvas.width).toBeGreaterThanOrEqual(layout!.viewportWidth - 1);
      }
      expect(layout!.canvas.top).toBeGreaterThanOrEqual(layout!.headerBottom);
      expect(layout!.canvas.bottom).toBeLessThanOrEqual(layout!.keypadTop);
      expect(layout!.keypadBottom).toBeLessThanOrEqual(layout!.viewportHeight);
      expect(Math.abs(layout!.canvas.width - layout!.canvas.height)).toBeLessThanOrEqual(1);

      await page.getByRole('button', { name: '1' }).click();
      await expect(page.locator('#sw-state-probe')).toHaveAttribute('data-selected-value', '1');
      await expectNoConsoleProblems(consoleProblems);
    });
  }
});

test.describe('tablet layout', () => {
  test.use({
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  });

  test('tutorial, board, and compact keypad do not overlap', async ({ page }) => {
    await page.goto('?scenario=tutorial-step&step=select-cage');
    await expect(page.locator('.tutorial-panel')).toBeVisible();

    const layout = await page.evaluate(() => {
      const controls = document.querySelector('.controls-container')?.getBoundingClientRect();
      const tutorial = document.querySelector('.tutorial-panel')?.getBoundingClientRect();
      const canvas = document.querySelector('canvas')?.getBoundingClientRect();
      const keypad = document.querySelector('.number-pad-shell')?.getBoundingClientRect();
      return controls && tutorial && canvas && keypad
        ? {
            controlsBottom: controls.bottom,
            tutorialTop: tutorial.top,
            tutorialBottom: tutorial.bottom,
            canvasTop: canvas.top,
            canvasBottom: canvas.bottom,
            keypadTop: keypad.top,
            keypadBottom: keypad.bottom,
            keypadHeight: keypad.height,
            viewportHeight: window.innerHeight,
          }
        : null;
    });

    expect(layout).not.toBeNull();
    expect(layout!.tutorialTop).toBeGreaterThanOrEqual(layout!.controlsBottom);
    expect(layout!.canvasTop).toBeGreaterThanOrEqual(layout!.tutorialBottom);
    expect(layout!.keypadTop).toBeGreaterThanOrEqual(layout!.canvasBottom);
    expect(layout!.keypadBottom).toBeLessThanOrEqual(layout!.viewportHeight);
    expect(layout!.keypadHeight).toBeLessThan(100);
  });
});

test.describe('short mobile layout', () => {
  test.use({
    viewport: { width: 320, height: 568 },
    hasTouch: true,
    isMobile: true,
  });

  test('hints and tutorial keep the needed board area usable', async ({ page }) => {
    await page.goto('?scenario=hint-tier&tier=1&difficulty=easy');
    await expect(page.locator('.hint-panel')).toBeVisible();

    const hintLayout = await page.evaluate(() => {
      const hint = document.querySelector('.hint-panel')?.getBoundingClientRect();
      const canvas = document.querySelector('canvas')?.getBoundingClientRect();
      const keypad = document.querySelector('.number-pad-shell')?.getBoundingClientRect();
      return hint && canvas && keypad
        ? { hintBottom: hint.bottom, canvasTop: canvas.top, canvasBottom: canvas.bottom, canvasWidth: canvas.width, keypadTop: keypad.top }
        : null;
    });

    expect(hintLayout).not.toBeNull();
    expect(hintLayout!.canvasWidth).toBeGreaterThanOrEqual(100);
    expect(hintLayout!.canvasTop).toBeGreaterThanOrEqual(hintLayout!.hintBottom);
    expect(hintLayout!.keypadTop).toBeGreaterThanOrEqual(hintLayout!.canvasBottom);

    await page.goto('?scenario=tutorial-step&step=select-cage');
    await expect(page.locator('.tutorial-panel')).toBeVisible();

    const tutorialLayout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')?.getBoundingClientRect();
      const tutorial = document.querySelector('.tutorial-panel')?.getBoundingClientRect();
      const keypad = document.querySelector('.number-pad-shell')?.getBoundingClientRect();
      if (!canvas || !tutorial || !keypad) return null;
      const cellSize = canvas.width / 4;
      const blocksRequiredCell = tutorial.left < canvas.left + cellSize
        && tutorial.right > canvas.left
        && tutorial.top < canvas.top + cellSize
        && tutorial.bottom > canvas.top;
      return { blocksRequiredCell, tutorialBottom: tutorial.bottom, keypadTop: keypad.top };
    });

    expect(tutorialLayout).not.toBeNull();
    expect(tutorialLayout!.blocksRequiredCell).toBe(false);
    expect(tutorialLayout!.keypadTop).toBeGreaterThanOrEqual(tutorialLayout!.tutorialBottom);
  });
});

test('production app works offline after its first visit', async ({ context, page }) => {
  test.skip(!process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.includes('preview'), 'Production preview only');

  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const cachedAssets = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const requests = await Promise.all(
      cacheNames.map(async (name) => (await caches.open(name)).keys()),
    );
    return requests.flat().map((request) => request.url).filter((url) => url.includes('/assets/'));
  });
  expect(cachedAssets.length).toBeGreaterThanOrEqual(2);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'SquareWise', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
});
