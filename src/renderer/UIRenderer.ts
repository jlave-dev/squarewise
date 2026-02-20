/**
 * UI Renderer for HUD, buttons, and overlays
 */
export class UIRenderer {
  private container: HTMLDivElement;
  private timerDisplay: HTMLDivElement;
  private controlsContainer: HTMLDivElement;
  private hintCount: number = 0;
  private maxHints: number = 3;

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
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      max-width: 500px;
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
    `;

    // Undo button
    container.appendChild(this.createButton('↶', 'Undo (Ctrl+Z)', () => this.onUndo?.()));

    // Redo button
    container.appendChild(this.createButton('↷', 'Redo (Ctrl+Y)', () => this.onRedo?.()));

    // Hint button
    container.appendChild(this.createButton('💡', 'Hint (H)', () => this.onHint?.()));

    // Pause button
    container.appendChild(this.createButton('⏸', 'Pause (P)', () => this.onPause?.()));

    // Settings button
    container.appendChild(this.createButton('⚙️', 'Settings', () => this.onSettings?.()));

    return container;
  }

  private createButton(icon: string, title: string, onClick?: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ui-btn';
    btn.textContent = icon;
    btn.title = title;
    btn.style.cssText = `
      width: 48px;
      height: 48px;
      border: none;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: 1.4rem;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: var(--shadow-sm);
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

  /**
   * Update timer display
   */
  updateTimer(formattedTime: string): void {
    this.timerDisplay.textContent = formattedTime;
  }

  /**
   * Update hint count display
   */
  updateHintCount(used: number, max: number): void {
    this.hintCount = used;
    this.maxHints = max;
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
