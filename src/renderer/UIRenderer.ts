import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faChartSimple,
  faCirclePlus,
  faGear,
  faLightbulb,
  faPause,
  faPlay,
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
  private titleDisplay: HTMLHeadingElement;
  private metaDisplay: HTMLDivElement;
  private timerDisplay: HTMLDivElement;
  private controlsContainer: HTMLDivElement;
  private hintPanel: HTMLDivElement;
  private hintText: HTMLDivElement;
  private undoButton!: HTMLButtonElement;
  private redoButton!: HTMLButtonElement;
  private hintButton!: HTMLButtonElement;
  private pauseButton!: HTMLButtonElement;

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

  private createTitleDisplay(): HTMLHeadingElement {
    const display = document.createElement('h1');
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
    display.setAttribute('role', 'timer');
    display.setAttribute('aria-label', 'Elapsed time 00:00');
    display.textContent = '00:00';
    return display;
  }

  private createControls(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'controls-container';

    this.undoButton = this.createButton(faRotateLeft, 'Undo', 'Undo (Ctrl+Z)', () => this.onUndo?.());
    this.redoButton = this.createButton(faRotateRight, 'Redo', 'Redo (Ctrl+Y)', () => this.onRedo?.());
    this.hintButton = this.createButton(faLightbulb, 'Hint', 'Hint (H)', () => this.onHint?.());
    this.pauseButton = this.createButton(faPause, 'Pause', 'Pause (P)', () => this.onPause?.());
    container.appendChild(this.undoButton);
    container.appendChild(this.redoButton);
    container.appendChild(this.hintButton);
    container.appendChild(this.pauseButton);
    container.appendChild(this.createButton(faChartSimple, 'Stats', 'Statistics', () => this.onStats?.()));
    container.appendChild(this.createButton(faGear, 'Settings', 'Settings', () => this.onSettings?.()));
    container.appendChild(this.createButton(faCirclePlus, 'New', 'New Game', () => this.onNewGame?.()));

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

  private createButton(
    iconDef: IconDefinition,
    label: string,
    title: string,
    onClick?: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ui-btn';
    btn.appendChild(createIconElement(iconDef));
    btn.appendChild(Object.assign(document.createElement('span'), {
      className: 'ui-btn-label',
      textContent: label,
    }));
    btn.dataset.action = label.toLowerCase();
    btn.title = title;
    btn.setAttribute('aria-label', title.replace(/\s*\([^)]*\)/g, ''));

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
    this.timerDisplay.setAttribute('aria-label', `Elapsed time ${formattedTime}`);
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
    ].filter((part): part is string => Boolean(part));

    this.renderMetaChips(parts);
    this.metaDisplay.title = `${parts.join(' - ')} - ${state.puzzleId}`;
  }

  updateGameControls(status: GameStatus, canUndo: boolean, canRedo: boolean): void {
    const playing = status === 'playing';
    const paused = status === 'paused';
    this.undoButton.disabled = !playing || !canUndo;
    this.redoButton.disabled = !playing || !canRedo;
    this.hintButton.disabled = !playing;
    this.pauseButton.disabled = !playing && !paused;

    const label = paused ? 'Resume' : 'Pause';
    const title = `${label} (P)`;
    if (this.pauseButton.dataset.action !== label.toLowerCase()) {
      this.pauseButton.querySelector('.sw-icon')?.replaceWith(createIconElement(paused ? faPlay : faPause));
      const labelElement = this.pauseButton.querySelector('.ui-btn-label');
      if (labelElement) labelElement.textContent = label;
      this.pauseButton.dataset.action = label.toLowerCase();
      this.pauseButton.title = title;
      this.pauseButton.setAttribute('aria-label', label);
    }
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
    if (mode === 'daily') return 'Daily';
    if (mode === 'archive') {
      const formattedDate = date
        ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null;
      return formattedDate ? `Archive ${formattedDate}` : 'Archive';
    }
    if (mode === 'tutorial') return 'Tutorial';
    return 'Practice';
  }

  private formatDifficulty(difficulty: Difficulty): string {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }

  private renderMetaChips(parts: string[]): void {
    this.metaDisplay.replaceChildren();

    parts.forEach((part, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.className = 'game-meta-separator';
        separator.textContent = ' - ';
        this.metaDisplay.appendChild(separator);
      }

      const chip = document.createElement('span');
      chip.className = part === this.formatDifficulty('easy') ||
        part === this.formatDifficulty('beginner') ||
        part === this.formatDifficulty('medium') ||
        part === this.formatDifficulty('hard') ||
        part === this.formatDifficulty('expert')
        ? 'game-meta-difficulty'
        : 'game-meta-item';
      chip.textContent = part;
      this.metaDisplay.appendChild(chip);
    });
  }
}
