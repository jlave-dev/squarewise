type NumberCallback = (value: number) => void;
type ActionCallback = () => void;

interface NumberPadOptions {
  onNumber: NumberCallback;
  onClear?: ActionCallback;
  onToggleNotes?: ActionCallback;
  notesMode?: boolean;
}

/**
 * On-screen number pad for touch input
 */
export class NumberPad {
  private container: HTMLDivElement;
  private options: NumberPadOptions;
  private gridSize: number = 6;
  private notesMode: boolean = false;
  private buttons: HTMLButtonElement[] = [];
  private notesToggle: HTMLButtonElement | null = null;

  constructor(options: NumberPadOptions) {
    this.options = options;
    this.container = this.createContainer();
    this.render();
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'number-pad';
    // Don't override position: fixed from CSS class
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(56px, 1fr));
      gap: 10px;
      padding: 16px;
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      max-width: 350px;
    `;
    return container;
  }

  /**
   * Set the grid size (determines number of buttons)
   */
  setGridSize(size: number): void {
    this.gridSize = size;
    this.render();
  }

  /**
   * Set notes mode
   */
  setNotesMode(enabled: boolean): void {
    this.notesMode = enabled;
    this.updateNotesButton();
  }

  /**
   * Toggle notes mode
   */
  toggleNotes(): void {
    this.notesMode = !this.notesMode;
    this.updateNotesButton();
    this.options.onToggleNotes?.();
  }

  private updateNotesButton(): void {
    if (this.notesToggle) {
      this.notesToggle.textContent = this.notesMode ? '📝 Notes' : '✏️ Notes';
      this.notesToggle.style.background = this.notesMode
        ? 'var(--accent)'
        : 'var(--bg-primary)';
      this.notesToggle.style.color = this.notesMode
        ? 'white'
        : 'var(--text-primary)';
    }
  }

  private render(): void {
    this.container.innerHTML = '';
    this.buttons = [];

    // Number buttons
    for (let i = 1; i <= this.gridSize; i++) {
      const btn = this.createNumberButton(i);
      this.container.appendChild(btn);
      this.buttons.push(btn);
    }

    // Notes toggle button
    this.notesToggle = document.createElement('button');
    this.notesToggle.className = 'number-btn';
    this.notesToggle.textContent = '✏️ Notes';
    this.notesToggle.style.cssText = `
      grid-column: span 2;
      font-size: 0.9rem;
    `;
    this.notesToggle.addEventListener('click', () => this.toggleNotes());
    this.container.appendChild(this.notesToggle);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'number-btn';
    clearBtn.textContent = '⌫';
    clearBtn.style.cssText = `
      grid-column: span 2;
      font-size: 1.2rem;
    `;
    clearBtn.addEventListener('click', () => this.options.onClear?.());
    this.container.appendChild(clearBtn);

    this.updateNotesButton();
  }

  private createNumberButton(num: number): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'number-btn';
    btn.textContent = num.toString();
    btn.addEventListener('click', () => {
      this.options.onNumber(num);
      this.animateButton(btn);
    });
    return btn;
  }

  private animateButton(btn: HTMLButtonElement): void {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 100);
  }

  /**
   * Highlight a number button (for showing which number is selected)
   */
  highlightNumber(num: number | null): void {
    this.buttons.forEach((btn, index) => {
      if (index + 1 === num) {
        btn.style.background = 'var(--accent)';
        btn.style.color = 'white';
      } else {
        btn.style.background = 'var(--bg-primary)';
        btn.style.color = 'var(--text-primary)';
      }
    });
  }

  /**
   * Show disabled state for completed numbers (all instances filled)
   */
  setCompletedNumbers(completed: Set<number>): void {
    this.buttons.forEach((btn, index) => {
      const num = index + 1;
      if (completed.has(num)) {
        btn.style.opacity = '0.5';
        btn.disabled = true;
      } else {
        btn.style.opacity = '1';
        btn.disabled = false;
      }
    });
  }

  /**
   * Get the container element
   */
  getElement(): HTMLDivElement {
    return this.container;
  }

  /**
   * Mount to a parent element
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

  /**
   * Show the number pad
   */
  show(): void {
    this.container.style.display = 'grid';
  }

  /**
   * Hide the number pad
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Destroy the number pad
   */
  destroy(): void {
    this.unmount();
    this.buttons = [];
    this.notesToggle = null;
  }
}
