/**
 * SquareWise - Main Entry Point
 * A KenKen-style puzzle game with daily challenges
 */

import './styles/main.css';
import { Game, type GameSnapshot } from './app/Game';
import { LevelSelect } from './ui/LevelSelect';
import { SettingsPanel } from './ui/SettingsPanel';
import { StatsScreen } from './ui/StatsScreen';
import { WinScreen } from './ui/WinScreen';
import { UIRenderer } from './renderer/UIRenderer';
import { NumberPad } from './ui/NumberPad';
import { AccessibleBoard } from './ui/AccessibleBoard';
import { settingsStore } from './storage/SettingsStore';
import { statsStore } from './storage/StatsStore';
import { clearActiveGame } from './storage/ActiveGameStore';
import { dailyChallenge } from './core/DailyChallenge';
import { buildWinSharePayload } from './app/share/SharePayload';
import { ShareService } from './app/share/ShareService';
import { generatePuzzle } from './engine/generator/PuzzleGenerator';
import { getDifficultyPreset } from './engine/difficulty/presets';
import {
  TutorialController,
  type TutorialStepId,
} from './tutorial/TutorialController';
import { createTutorialPuzzle } from './tutorial/TutorialPuzzle';
import {
  markTutorialCompleted,
  markTutorialSkipped,
  shouldAutoStartTutorial,
} from './storage/TutorialStore';
import type { Difficulty } from './types/puzzle';
import type { HintTier, UserSettings } from './types/game';
import type { WinStats } from './ui/WinScreen';
import {
  buildDebugScenarioQuery,
  buildDebugSession,
  getDebugScenarioIds,
  parseDebugScenarioFromSearch,
  type DebugScenarioId,
} from './debug/scenarios';
import type { SquareWiseDebugApi } from './debug/global';

class SquareWiseApp {
  private canvas: HTMLCanvasElement;
  private game: Game | null = null;
  private levelSelect: LevelSelect;
  private settingsPanel: SettingsPanel;
  private statsScreen: StatsScreen;
  private winScreen: WinScreen;
  private uiRenderer: UIRenderer;
  private numberPad: NumberPad;
  private accessibleBoard: AccessibleBoard;
  private numberPadDesktopLikeMode: boolean | null = null;
  private themeRefreshFrameId: number | null = null;
  private layoutObserver: ResizeObserver | null = null;
  private shareService: ShareService;
  private debugPanelEl: HTMLDivElement | null = null;
  private tutorialController: TutorialController;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize UI components
    this.levelSelect = new LevelSelect();
    this.settingsPanel = new SettingsPanel();
    this.statsScreen = new StatsScreen();
    this.settingsPanel.onThemeChange = () => {
      this.game?.refreshVisuals();
    };
    this.winScreen = new WinScreen();
    this.uiRenderer = new UIRenderer();
    this.shareService = new ShareService();
    this.tutorialController = new TutorialController({
      onComplete: () => {
        markTutorialCompleted();
        clearActiveGame();
        this.levelSelect.show();
      },
      onSkip: () => {
        markTutorialSkipped();
        clearActiveGame();
        this.levelSelect.show();
      },
    });
    this.numberPad = new NumberPad({
      onNumber: (value) => this.handleNumberInput(value),
      onClear: () => this.handleClear(),
      onToggleNotes: () => this.toggleNotesMode(),
    });
    this.accessibleBoard = new AccessibleBoard({
      onSelectCell: (cell) => this.game?.selectCell(cell),
    });

    this.setupApp();
  }

  private async setupApp(): Promise<void> {
    console.log('[SquareWise] Setting up app...');

    // Load settings and stats
    await Promise.all([
      settingsStore.load(),
      statsStore.load(),
    ]);
    console.log('[SquareWise] Settings and stats loaded');

    // Apply saved theme
    this.applySettings(settingsStore.getSettings());

    // Set up canvas resizing - defer until after game initialization
    // to avoid overriding CanvasRenderer's size adjustments
    window.addEventListener('resize', () => this.handleResize());

    // Set up UI callbacks
    this.setupUICallbacks();

    // Mount UI elements
    const appContainer = document.getElementById('app') || document.body;
    appContainer.appendChild(this.uiRenderer.getElement());
    this.accessibleBoard.mount(appContainer);
    this.numberPad.mount(appContainer);
    this.tutorialController.mount(appContainer);
    this.setupResponsiveLayoutObservers();
    this.applyNumberPadVisibilityMode();
    console.log('[SquareWise] UI elements mounted');

    // Initialize game
    this.game = new Game(this.canvas, {
      onWin: (stats) => this.handleWin(stats),
      onTimerUpdate: (elapsed) => this.uiRenderer.updateTimer(this.formatElapsedTime(elapsed)),
      onStateChange: (snapshot) => this.handleGameStateChange(snapshot),
    });
    console.log('[SquareWise] Game initialized');
    this.game.applySettings(settingsStore.getSettings());

    settingsStore.subscribe((settings) => {
      this.applySettings(settings);
      this.game?.applySettings(settings);
    });

    this.setupDebugHarness();

    // Center the canvas in viewport
    this.centerCanvas();

    const debugScenario = this.getStartupDebugScenario();
    if (debugScenario) {
      await this.runDebugScenario(debugScenario.scenario, {
        difficulty: debugScenario.difficulty,
        timer: debugScenario.timer,
        hints: debugScenario.hints,
        date: debugScenario.date,
        tier: debugScenario.tier,
        step: debugScenario.step,
      });
      return;
    }

    const resumed = await this.game.resumeActiveGame();
    if (resumed) {
      const gridSize = this.game.getGridSize();
      this.numberPad.setGridSize(gridSize);
      console.log('[SquareWise] Resumed active game with grid size:', gridSize);
      return;
    }

    if (shouldAutoStartTutorial()) {
      this.startTutorial('intro');
      return;
    }

    // Show level select when no active game exists
    console.log('[SquareWise] Showing level select...');
    this.levelSelect.show();
    console.log('[SquareWise] Level select shown');
  }

  private setupUICallbacks(): void {
    // UI Renderer callbacks
    this.uiRenderer.onUndo = () => this.game?.['undo']();
    this.uiRenderer.onRedo = () => this.game?.['redo']();
    this.uiRenderer.onHint = () => this.game?.['showHint']();
    this.uiRenderer.onHintTier = (tier) => this.game?.['showHint'](tier);
    this.uiRenderer.onPause = () => this.game?.['togglePause']();
    this.uiRenderer.onSettings = () => this.settingsPanel.toggle();
    this.uiRenderer.onStats = () => this.statsScreen.show();
    this.uiRenderer.onNewGame = () => this.levelSelect.show();

    // Level select callbacks
    this.levelSelect.setOnDifficultySelect((difficulty: Difficulty) => {
      this.startNewGame(difficulty);
    });

    this.levelSelect.setOnDailyChallenge(() => {
      this.startDailyChallenge();
    });

    this.levelSelect.setOnTutorial(() => {
      this.startTutorial('intro');
    });

    this.levelSelect.setOnArchiveChallenge((date, difficulty) => {
      void this.startArchiveChallenge(date, difficulty);
    });

    // Win screen callbacks
    this.winScreen.setOnNewGame(() => {
      this.levelSelect.show();
    });

    this.winScreen.setOnShare(async (stats) => {
      await this.handleShare(stats);
    });
  }

  private async startNewGame(difficulty: Difficulty): Promise<void> {
    console.log('[SquareWise] Starting new game with difficulty:', difficulty);
    if (!this.game) return;

    this.numberPad.setGridSize(4); // Will be updated based on difficulty
    await this.game.startNewGame(difficulty);
    console.log('[SquareWise] Game started');

    // Update number pad based on puzzle size
    const gridSize = this.game.getGridSize();
    this.numberPad.setGridSize(gridSize);
    console.log('[SquareWise] Number pad updated for grid size:', gridSize);
  }

  private async startDailyChallenge(): Promise<void> {
    console.log('[SquareWise] Starting daily challenge');
    if (!this.game) return;

    // Use 'medium' difficulty for daily challenge (balanced challenge)
    const difficulty: Difficulty = 'medium';

    // Generate today's daily puzzle
    const puzzle = await dailyChallenge.getTodayPuzzle(difficulty);
    console.log('[SquareWise] Daily puzzle generated:', puzzle.id);

    // Load the puzzle directly
    this.game['loadPuzzle'](puzzle);

    // Update number pad based on puzzle size
    this.numberPad.setGridSize(puzzle.size);
    console.log('[SquareWise] Daily challenge started with grid size:', puzzle.size);
  }

  private async startArchiveChallenge(date: string, difficulty: Difficulty): Promise<void> {
    console.log('[SquareWise] Starting archive challenge:', date, difficulty);
    if (!this.game) return;

    const puzzle = await dailyChallenge.getArchivePuzzleForDate(new Date(`${date}T00:00:00`), difficulty);
    this.game.loadPuzzle(puzzle);
    this.numberPad.setGridSize(puzzle.size);
  }

  private startTutorial(step: TutorialStepId): void {
    if (!this.game) return;

    this.winScreen.hide();
    this.levelSelect.hide();
    const puzzle = createTutorialPuzzle();
    this.game.loadPuzzle(puzzle);
    this.numberPad.setGridSize(puzzle.size);
    this.tutorialController.start(step);
  }

  private handleNumberInput(value: number): void {
    if (!this.game) return;
    this.game['handleNumberInput'](value);
  }

  private handleClear(): void {
    if (!this.game) return;
    this.game['clearCell']();
  }

  private toggleNotesMode(): void {
    if (!this.game) return;
    this.game['toggleNotesMode']();
  }

  private handleWin(stats: WinStats): void {
    this.winScreen.show(stats);
  }

  private async handleShare(stats: WinStats): Promise<void> {
    const payload = buildWinSharePayload(stats, window.location.origin);
    const result = await this.shareService.share(payload);

    if (result.kind === 'shared') {
      this.winScreen.hideShareFallback();
      this.winScreen.setShareStatus('Shared.');
      return;
    }

    if (result.kind === 'cancelled') {
      this.winScreen.hideShareFallback();
      this.winScreen.setShareStatus('');
      return;
    }

    if (result.kind === 'fallback') {
      this.winScreen.setShareStatus('Choose a social app or copy your result.');
      this.winScreen.showShareFallback(result.links, result.copyText);
      return;
    }

    this.winScreen.hideShareFallback();
    this.winScreen.setShareStatus('Sharing is unavailable right now.');
  }

  private formatElapsedTime(elapsed: number): string {
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Handle window resize - re-center the canvas
   * The canvas size is controlled by CanvasRenderer based on grid size
   */
  private handleResize(): void {
    this.syncViewportChromeOffsets();
    this.centerCanvas();
    this.applyNumberPadVisibilityMode();
  }

  private setupResponsiveLayoutObservers(): void {
    this.syncViewportChromeOffsets();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.layoutObserver?.disconnect();
    this.layoutObserver = new ResizeObserver(() => this.syncViewportChromeOffsets());
    this.layoutObserver.observe(this.uiRenderer.getElement());
    this.layoutObserver.observe(this.numberPad.getElement());
  }

  private syncViewportChromeOffsets(): void {
    const rootStyle = document.documentElement.style;

    if (window.matchMedia('(min-width: 900px) and (hover: hover)').matches) {
      rootStyle.setProperty('--ui-top-offset', '0px');
      rootStyle.setProperty('--ui-bottom-offset', '0px');
      return;
    }

    const headerRect = this.uiRenderer.getElement().getBoundingClientRect();
    const keypadRect = this.numberPad.getElement().getBoundingClientRect();
    const headerReserve = Math.max(24, Math.ceil(headerRect.bottom + 20));
    const keypadReserve = Math.max(24, Math.ceil(window.innerHeight - keypadRect.top + 20));

    rootStyle.setProperty('--ui-top-offset', `${headerReserve}px`);
    rootStyle.setProperty('--ui-bottom-offset', `${keypadReserve}px`);
  }

  private applyNumberPadVisibilityMode(): void {
    const desktopLike = false;

    if (this.numberPadDesktopLikeMode === desktopLike) {
      return;
    }

    this.numberPadDesktopLikeMode = desktopLike;
    this.numberPad.setCollapsible(desktopLike);
    this.numberPad.setVisible(true);
  }

  /**
   * Center the canvas in the viewport using flexbox
   */
  private centerCanvas(): void {
    // The canvas is already inside #app which has flex centering
    // Just ensure the canvas wrapper allows proper centering
  }

  private applyTheme(theme: UserSettings['theme']): void {
    document.documentElement.setAttribute('data-theme', theme);

    // Canvas uses computed CSS variables during draw calls; repaint after style recalc.
    if (this.themeRefreshFrameId !== null) {
      cancelAnimationFrame(this.themeRefreshFrameId);
      this.themeRefreshFrameId = null;
    }

    this.themeRefreshFrameId = requestAnimationFrame(() => {
      this.themeRefreshFrameId = requestAnimationFrame(() => {
        this.themeRefreshFrameId = null;
        this.game?.refreshVisuals();
      });
    });
  }

  private applySettings(settings: Readonly<UserSettings>): void {
    this.applyTheme(settings.theme);
    this.uiRenderer.setShowTimer(settings.showTimer);
  }

  private setupDebugHarness(): void {
    if (!import.meta.env.DEV) {
      return;
    }

    const api: SquareWiseDebugApi = {
      listScenarios: () => getDebugScenarioIds(),
      getSnapshot: () => this.game?.getSnapshot() ?? null,
      runScenario: async (scenario, options) => {
        this.updateDebugScenarioUrl(scenario, options);
        await this.runDebugScenario(scenario, options);
      },
    };
    window.__SW_DEBUG__ = api;
    this.mountDebugPanel();
  }

  private getStartupDebugScenario():
    | {
        scenario: DebugScenarioId;
        difficulty: Difficulty;
        timer: number;
        hints: number;
        date: string | null;
        tier: HintTier;
        step: TutorialStepId;
      }
    | null {
    const fromSearch = parseDebugScenarioFromSearch(window.location.search);
    if (fromSearch) {
      return fromSearch;
    }

    const hash = window.location.hash;
    if (!hash) {
      return null;
    }

    const hashQueryIndex = hash.indexOf('?');
    if (hashQueryIndex >= 0) {
      const fromHashQuery = parseDebugScenarioFromSearch(hash.slice(hashQueryIndex + 1));
      if (fromHashQuery) {
        return fromHashQuery;
      }
    }

    const hashBody = hash.replace(/^#/, '');
    if (hashBody.includes('=')) {
      return parseDebugScenarioFromSearch(hashBody);
    }

    return null;
  }

  private async runDebugScenario(
    scenario: DebugScenarioId,
    options: {
      difficulty?: Difficulty;
      timer?: number;
      hints?: number;
      date?: string | null;
      tier?: HintTier;
      step?: TutorialStepId;
    } = {}
  ): Promise<void> {
    const difficulty = options.difficulty ?? 'medium';
    const timer = options.timer ?? 95;
    const hints = options.hints ?? 0;
    const date = options.date ?? null;
    const tier = options.tier ?? 1;
    const step = options.step ?? 'intro';

    if (scenario === 'level-select') {
      this.winScreen.hide();
      this.levelSelect.show();
      return;
    }

    if (scenario === 'tutorial-step') {
      this.startTutorial(step);
      return;
    }

    await this.loadDebugPuzzle(difficulty, scenario, date);
    const puzzle = this.game?.getPuzzle();
    if (!this.game || !puzzle) {
      return;
    }

    if (scenario === 'new-game') {
      this.winScreen.hide();
      return;
    }

    const sessionKind =
      scenario === 'paused' ? 'paused' :
      scenario === 'almost-won' ? 'almost-won' :
      scenario === 'notes-mode' ? 'notes-mode' :
      scenario === 'error-state' ? 'error-state' :
      scenario === 'in-progress' || scenario === 'daily-in-progress' || scenario === 'archive' || scenario === 'hint-tier' ? 'in-progress' :
      'won';

    const session = buildDebugSession(puzzle, sessionKind, { timer, hints });
    this.game.applyDebugSession(session);

    if (scenario === 'hint-tier') {
      this.game['showHint'](tier);
      this.winScreen.hide();
      return;
    }

    if (scenario === 'won-modal' || scenario === 'won-share-fallback' || scenario === 'daily-won') {
      const identity = this.game.getSnapshot();
      const stats: WinStats = {
        time: timer,
        hintsUsed: hints,
        hintUsage: {
          tier1: hints,
          tier2: 0,
          tier3: 0,
          tier4: 0,
        },
        mistakes: identity.mistakeCount,
        difficulty,
        gridSize: puzzle.size,
        isNewBest: false,
        mode: identity.mode,
        date: identity.date,
        puzzleId: puzzle.id,
        badges: identity.mode === 'daily' ? ['no-reveal', 'mistake-free'] : [],
        dailyStreak: identity.mode === 'daily' ? 1 : null,
      };
      this.winScreen.show(stats);

      if (scenario === 'won-share-fallback') {
        const payload = buildWinSharePayload(stats, window.location.origin);
        const fallback = this.shareService.getFallback(payload);
        this.winScreen.setShareStatus('Fallback preview: social link + copy action.');
        this.winScreen.showShareFallback(fallback.links, fallback.copyText);
      }
      return;
    }

    this.winScreen.hide();
  }

  private async loadDebugPuzzle(
    difficulty: Difficulty,
    scenario: DebugScenarioId,
    date: string | null = null
  ): Promise<void> {
    if (!this.game) return;

    const puzzle = scenario === 'archive'
      ? await dailyChallenge.getArchivePuzzleForDate(date ? new Date(`${date}T00:00:00`) : new Date(), difficulty)
      : scenario === 'daily-in-progress' || scenario === 'daily-won'
      ? await dailyChallenge.getPuzzleForDate(date ? new Date(`${date}T00:00:00`) : new Date(), difficulty)
      : await generatePuzzle({
          size: getDifficultyPreset(difficulty).gridSize,
          difficulty,
          seed: `debug-${scenario}-${difficulty}`,
        });

    this.game.loadPuzzle(puzzle);
    this.numberPad.setGridSize(puzzle.size);
  }

  private mountDebugPanel(): void {
    if (new URLSearchParams(window.location.search).get('debugPanel') !== '1') {
      return;
    }

    if (this.debugPanelEl) {
      return;
    }

    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      right: 12px;
      bottom: 12px;
      z-index: 20000;
      display: flex;
      gap: 8px;
      padding: 10px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--bg-surface) 92%, black 8%);
      box-shadow: var(--shadow-md);
      align-items: center;
    `;

    const select = document.createElement('select');
    for (const id of getDebugScenarioIds()) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      select.appendChild(opt);
    }

    const run = document.createElement('button');
    run.className = 'btn btn-secondary';
    run.textContent = 'Scenario';
    run.addEventListener('click', () => {
      const selected = select.value as DebugScenarioId;
      this.updateDebugScenarioUrl(selected);
      void this.runDebugScenario(selected);
    });

    panel.appendChild(select);
    panel.appendChild(run);
    document.body.appendChild(panel);
    this.debugPanelEl = panel;
  }

  private updateDebugScenarioUrl(
    scenario: DebugScenarioId,
    options: { difficulty?: Difficulty; timer?: number; hints?: number; date?: string | null; tier?: HintTier } = {}
  ): void {
    const url = new URL(window.location.href);
    url.search = buildDebugScenarioQuery(scenario, options);
    window.history.replaceState({}, '', url.toString());
  }

  private handleGameStateChange(snapshot: GameSnapshot): void {
    this.uiRenderer.updateGameHeader({
      mode: snapshot.mode,
      date: snapshot.date,
      difficulty: snapshot.difficulty,
      gridSize: snapshot.gridSize,
      puzzleId: snapshot.puzzleId,
      status: snapshot.status,
    });
    this.uiRenderer.updateHintStep(snapshot.lastHint);
    this.numberPad.setNotesMode(snapshot.notesMode);
    this.numberPad.highlightNumber(snapshot.renderState.selectedNumber);
    this.accessibleBoard.update(snapshot);
    this.tutorialController.observe(snapshot);
    this.updateStateProbe(snapshot);
  }

  private updateStateProbe(snapshot: GameSnapshot): void {
    const shouldExpose =
      import.meta.env.DEV ||
      new URLSearchParams(window.location.search).has('scenario');
    if (!shouldExpose) return;

    let probe = document.getElementById('sw-state-probe');
    if (!probe) {
      probe = document.createElement('div');
      probe.id = 'sw-state-probe';
      probe.hidden = true;
      probe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(probe);
    }

    const selectedValue = snapshot.selectedCell
      ? snapshot.grid[snapshot.selectedCell.row][snapshot.selectedCell.col]
      : null;
    probe.dataset.status = snapshot.status;
    probe.dataset.puzzleId = snapshot.puzzleId;
    probe.dataset.hintsUsed = String(snapshot.hintsUsed);
    probe.dataset.mistakes = String(snapshot.mistakeCount);
    probe.dataset.notesMode = String(snapshot.notesMode);
    probe.dataset.hintTier = snapshot.lastHint ? String(snapshot.lastHint.tier) : '';
    probe.dataset.hintReveal = snapshot.lastHint ? String(snapshot.lastHint.reveal) : '';
    probe.dataset.hintTier1 = String(snapshot.hintUsage.tier1);
    probe.dataset.hintTier2 = String(snapshot.hintUsage.tier2);
    probe.dataset.hintTier3 = String(snapshot.hintUsage.tier3);
    probe.dataset.hintTier4 = String(snapshot.hintUsage.tier4);
    probe.dataset.filled = String(snapshot.grid.flat().filter((value) => value !== 0).length);
    probe.dataset.difficulty = snapshot.difficulty;
    probe.dataset.size = String(snapshot.gridSize);
    probe.dataset.selectedRow = snapshot.selectedCell ? String(snapshot.selectedCell.row) : '';
    probe.dataset.selectedCol = snapshot.selectedCell ? String(snapshot.selectedCell.col) : '';
    probe.dataset.selectedValue = selectedValue === null ? '' : String(selectedValue);
    probe.dataset.mode = snapshot.mode;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SquareWiseApp();
});

// Handle service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/squarewise/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
      return;
    }

    // In development, remove any existing worker/cache to avoid stale source modules.
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => {
        if (!('caches' in window)) return Promise.resolve([]);
        return caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))));
      })
      .then(() => {
        console.log('Service worker and caches cleared for development mode');
      })
      .catch((error) => {
        console.log('Development SW cleanup failed:', error);
      });
  });
}
