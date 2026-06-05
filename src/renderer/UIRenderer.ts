import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faChartSimple,
  faGear,
  faLightbulb,
  faPause,
  faPlus,
  faRotateLeft,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { createIconElement } from '../ui/icons';
import type { Difficulty } from '../types/puzzle';
import type { GameStatus, HintTier } from '../types/game';
import type { HintStep } from '../core/HintSystem';

export interface GameHeaderState {
  mode: 'daily' | 'fresh' | 'tutorial' | 'archive';
  date: string | null;
  difficulty: Difficulty;
  gridSize: number;
  puzzleId: string;
  status: GameStatus;
}

/**
 * UI Renderer for HUD, buttons, and overlays
 */
export class UIRenderer {
  private container: HTMLDivElement;
  private identityContainer: HTMLDivElement;
  private titleDisplay: HTMLDivElement;
  private metaDisplay: HTMLDivElement;
  private timerDisplay: HTMLDivElement;
  private controlsContainer: HTMLDivElement;
  private hintPanel: HTMLDivElement;
  private hintText: HTMLDivElement;

  constructor() {
    this.container = this.createContainer();
    this.identityContainer = this.createIdentityContainer();
    this.titleDisplay = this.createTitleDisplay();
    this.metaDisplay = this.createMetaDisplay();
    this.timerDisplay = this.createTimerDisplay();
    this.controlsContainer = this.createControls();
    this.hintPanel = this.createHintPanel();
    this.hintText = this.createHintText();

    this.identityContainer.appendChild(this.titleDisplay);
    this.identityContainer.appendChild(this.metaDisplay);
    this.container.appendChild(this.identityContainer);
    this.container.appendChild(this.timerDisplay);
    this.container.appendChild(this.controlsContainer);
    this.hintPanel.appendChild(this.hintText);
    this.hintPanel.appendChild(this.createHintTierButtons());
    this.container.appendChild(this.hintPanel);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'ui-container';
    return container;
  }

  private createIdentityContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'game-identity';
    return container;
  }

  private createTitleDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.className = 'game-title';
    display.textContent = 'SquareWise';
    return display;
  }

  private createMetaDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.className = 'game-meta';
    display.dataset.testid = 'game-meta';
    display.textContent = 'Choose a puzzle';
    return display;
  }

  private createTimerDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.className = 'timer-display';
    display.dataset.testid = 'game-timer';
    display.textContent = '00:00';
    return display;
  }

  private createControls(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'controls-container';

    // Undo button
    container.appendChild(this.createButton(faRotateLeft, 'Undo (Ctrl+Z)', () => this.onUndo?.()));

    // Redo button
    container.appendChild(this.createButton(faRotateRight, 'Redo (Ctrl+Y)', () => this.onRedo?.()));

    // Hint button
    container.appendChild(this.createButton(faLightbulb, 'Hint (H)', () => this.onHint?.()));

    // Pause button
    container.appendChild(this.createButton(faPause, 'Pause (P)', () => this.onPause?.()));

    // Stats button
    container.appendChild(this.createButton(faChartSimple, 'Statistics', () => this.onStats?.()));

    // Settings button
    container.appendChild(this.createButton(faGear, 'Settings', () => this.onSettings?.()));

    // New Game button
    container.appendChild(this.createButton(faPlus, 'New Game', () => this.onNewGame?.()));

    return container;
  }

  private createHintPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'hint-panel';
    panel.hidden = true;
    return panel;
  }

  private createHintText(): HTMLDivElement {
    const text = document.createElement('div');
    text.className = 'hint-text';
    text.setAttribute('role', 'status');
    text.setAttribute('aria-live', 'polite');
    text.textContent = '';
    return text;
  }

  private createHintTierButtons(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'hint-tier-actions';

    const tiers: Array<{ tier: HintTier; label: string }> = [
      { tier: 1, label: 'Hint' },
      { tier: 2, label: 'Explain' },
      { tier: 3, label: 'Eliminate' },
      { tier: 4, label: 'Reveal' },
    ];

    for (const tier of tiers) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hint-tier-btn';
      button.textContent = tier.label;
      button.addEventListener('click', () => this.onHintTier?.(tier.tier));
      container.appendChild(button);
    }

    return container;
  }

  private createButton(iconDef: IconDefinition, title: string, onClick?: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ui-btn';
    btn.appendChild(createIconElement(iconDef));
    btn.title = title;
    btn.setAttribute('aria-label', title.replace(/\s*\([^)]*\)/g, ''));

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--accent)';
      btn.style.color = 'white';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'var(--bg-surface)';
      btn.style.color = 'var(--text-primary)';
    });

    if (onClick) {
      btn.addEventListener('click', onClick);
    }

    return btn;
  }

  // Event handlers
  onUndo?: () => void;
  onRedo?: () => void;
  onHint?: () => void;
  onHintTier?: (tier: HintTier) => void;
  onPause?: () => void;
  onSettings?: () => void;
  onNewGame?: () => void;
  onStats?: () => void;

  /**
   * Update timer display
   */
  updateTimer(formattedTime: string): void {
    this.timerDisplay.textContent = formattedTime;
  }

  /**
   * Update the game identity and puzzle metadata shown in the header.
   */
  updateGameHeader(state: GameHeaderState): void {
    const modeLabel = this.formatModeLabel(state.mode, state.date);
    const difficulty = this.formatDifficulty(state.difficulty);
    const statusLabel =
      state.status === 'paused' ? 'Paused' :
      state.status === 'won' ? 'Complete' :
      null;
    const parts = [
      modeLabel,
      difficulty,
      `${state.gridSize}x${state.gridSize}`,
      statusLabel,
    ].filter(Boolean);

    this.metaDisplay.textContent = parts.join(' - ');
    this.metaDisplay.title = `${parts.join(' - ')} - ${state.puzzleId}`;
  }

  updateHintStep(hint: HintStep | null): void {
    if (!hint) {
      this.hintPanel.hidden = true;
      this.hintText.textContent = '';
      return;
    }

    this.hintPanel.hidden = false;
    this.hintText.textContent = `Tier ${hint.tier}: ${hint.explanation}`;
  }

  /**
   * Update hint count display
   */
  updateHintCount(_used: number, _max: number): void {
    // Reserved for future hint UI.
  }

  /**
   * Show/hide timer
   */
  setShowTimer(show: boolean): void {
    this.timerDisplay.style.display = show ? 'block' : 'none';
  }

  /**
   * Get container element
   */
  getElement(): HTMLDivElement {
    return this.container;
  }

  /**
   * Mount to parent
   */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  /**
   * Unmount from DOM
   */
  unmount(): void {
    this.container.remove();
  }

  private formatModeLabel(mode: GameHeaderState['mode'], date: string | null): string {
    if (mode === 'daily') return date ? `Daily ${date}` : 'Daily';
    if (mode === 'archive') return date ? `Archive ${date}` : 'Archive';
    if (mode === 'tutorial') return 'Tutorial';
    return 'Fresh';
  }

  private formatDifficulty(difficulty: Difficulty): string {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }
}
