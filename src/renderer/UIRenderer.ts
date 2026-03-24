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

/**
 * UI Renderer for HUD, buttons, and overlays
 */
export class UIRenderer {
  private container: HTMLDivElement;
  private timerDisplay: HTMLDivElement;
  private controlsContainer: HTMLDivElement;

  constructor() {
    this.container = this.createContainer();
    this.timerDisplay = this.createTimerDisplay();
    this.controlsContainer = this.createControls();

    this.container.appendChild(this.timerDisplay);
    this.container.appendChild(this.controlsContainer);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'ui-container';
    // Don't override position: fixed from CSS class
    container.style.cssText = `
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 28px;
      padding: 16px 20px;
      width: min(92vw, 560px);
    `;
    return container;
  }

  private createTimerDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.className = 'timer-display';
    display.style.cssText = `
      font-family: var(--font-mono);
      font-size: 1.75rem;
      font-weight: bold;
      color: var(--text-primary);
    `;
    display.textContent = '00:00';
    return display;
  }

  private createControls(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'controls-container';
    container.style.cssText = `
      display: flex;
      gap: 8px;
      margin-left: auto;
    `;

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

  private createButton(iconDef: IconDefinition, title: string, onClick?: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ui-btn';
    btn.appendChild(createIconElement(iconDef));
    btn.title = title;
    btn.style.cssText = `
      width: 48px;
      height: 48px;
      border: none;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

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
}
