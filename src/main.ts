/**
 * SquareWise - Main Entry Point
 * A KenKen-style puzzle game with daily challenges
 */

import './styles/main.css';
import { Game } from './app/Game';
import { LevelSelect } from './ui/LevelSelect';
import { SettingsPanel } from './ui/SettingsPanel';
import { WinScreen } from './ui/WinScreen';
import { UIRenderer } from './renderer/UIRenderer';
import { NumberPad } from './ui/NumberPad';
import { settingsStore } from './storage/SettingsStore';
import { statsStore } from './storage/StatsStore';
import { dailyChallenge } from './core/DailyChallenge';
import { buildWinSharePayload } from './app/share/SharePayload';
import { ShareService } from './app/share/ShareService';
import { generatePuzzle } from './engine/generator/PuzzleGenerator';
import { getDifficultyPreset } from './engine/difficulty/presets';
import {
  getInputCapabilities,
  shouldShowOnScreenKeypadByDefault,
} from './utils/inputCapabilities';
import type { Difficulty } from './types/puzzle';
import type { UserSettings } from './types/game';
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
  private winScreen: WinScreen;
  private uiRenderer: UIRenderer;
  private numberPad: NumberPad;
  private numberPadDesktopLikeMode: boolean | null = null;
  private themeRefreshFrameId: number | null = null;
  private shareService: ShareService;
  private debugPanelEl: HTMLDivElement | null = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize UI components
    this.levelSelect = new LevelSelect();
    this.settingsPanel = new SettingsPanel();
    this.settingsPanel.onThemeChange = () => {
      this.game?.refreshVisuals();
    };
    this.winScreen = new WinScreen();
    this.uiRenderer = new UIRenderer();
    this.shareService = new ShareService();
    this.numberPad = new NumberPad({
      onNumber: (value) => this.handleNumberInput(value),
      onClear: () => this.handleClear(),
      onToggleNotes: () => this.toggleNotesMode(),
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
    this.numberPad.mount(appContainer);
    this.applyNumberPadVisibilityMode();
    console.log('[SquareWise] UI elements mounted');

    // Initialize game
    this.game = new Game(this.canvas, {
      onWin: (stats) => this.handleWin(stats),
      onTimerUpdate: (elapsed) => this.uiRenderer.updateTimer(this.formatElapsedTime(elapsed)),
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
    this.uiRenderer.onPause = () => this.game?.['togglePause']();
    this.uiRenderer.onSettings = () => this.settingsPanel.toggle();

    // Level select callbacks
    this.levelSelect.setOnDifficultySelect((difficulty: Difficulty) => {
      this.startNewGame(difficulty);
    });

    this.levelSelect.setOnDailyChallenge(() => {
      this.startDailyChallenge();
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
    this.centerCanvas();
    this.applyNumberPadVisibilityMode();
  }

  private applyNumberPadVisibilityMode(): void {
    const capabilities = getInputCapabilities();
    const showByDefault = shouldShowOnScreenKeypadByDefault(capabilities);
    const desktopLike = !showByDefault;

    if (this.numberPadDesktopLikeMode === desktopLike) {
      return;
    }

    this.numberPadDesktopLikeMode = desktopLike;
    this.numberPad.setCollapsible(desktopLike);
    this.numberPad.setVisible(showByDefault);
  }

  /**
   * Center the canvas in the viewport using flexbox
   */
  private centerCanvas(): void {
    // The canvas is already inside #app which has flex centering
    // Just ensure the canvas wrapper allows proper centering
  }

  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

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
      runScenario: async (scenario, options) => {
        this.updateDebugScenarioUrl(scenario, options);
        await this.runDebugScenario(scenario, options);
      },
    };
    window.__SW_DEBUG__ = api;
    this.mountDebugPanel();
  }

  private getStartupDebugScenario():
    | { scenario: DebugScenarioId; difficulty: Difficulty; timer: number; hints: number }
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
    options: { difficulty?: Difficulty; timer?: number; hints?: number } = {}
  ): Promise<void> {
    const difficulty = options.difficulty ?? 'medium';
    const timer = options.timer ?? 95;
    const hints = options.hints ?? 0;

    if (scenario === 'level-select') {
      this.winScreen.hide();
      this.levelSelect.show();
      return;
    }

    await this.loadDebugPuzzle(difficulty, scenario);
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
      scenario === 'in-progress' ? 'in-progress' :
      'won';

    const session = buildDebugSession(puzzle, sessionKind, { timer, hints });
    this.game.applyDebugSession(session);

    if (scenario === 'won-modal' || scenario === 'won-share-fallback') {
      const stats: WinStats = {
        time: timer,
        hintsUsed: hints,
        difficulty,
        gridSize: puzzle.size,
        isNewBest: false,
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

  private async loadDebugPuzzle(difficulty: Difficulty, scenario: DebugScenarioId): Promise<void> {
    if (!this.game) return;

    const preset = getDifficultyPreset(difficulty);
    const puzzle = await generatePuzzle({
      size: preset.gridSize,
      difficulty,
      seed: `debug-${scenario}-${difficulty}`,
    });

    this.game.loadPuzzle(puzzle);
    this.numberPad.setGridSize(puzzle.size);
  }

  private mountDebugPanel(): void {
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
    options: { difficulty?: Difficulty; timer?: number; hints?: number } = {}
  ): void {
    const url = new URL(window.location.href);
    url.search = buildDebugScenarioQuery(scenario, options);
    window.history.replaceState({}, '', url.toString());
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
      navigator.serviceWorker.register('/sw.js')
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
