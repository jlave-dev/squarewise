import {
  faDeleteLeft,
  faPen,
  faPenToSquare,
} from '@fortawesome/free-solid-svg-icons';
import { createIconElement, setLabeledIconContent } from './icons';

type NumberCallback = (value: number) => void;
type ActionCallback = () => void;

interface NumberPadOptions {
  onNumber: NumberCallback;
  onClear?: ActionCallback;
  onToggleNotes?: ActionCallback;
  notesMode?: boolean;
}

export function shouldShowKeyboardHints(collapsible: boolean, visible: boolean): boolean {
  return collapsible && !visible;
}

/**
 * On-screen number pad for touch input
 */
export class NumberPad {
  private root: HTMLDivElement;
  private container: HTMLDivElement;
  private actionsContainer: HTMLDivElement;
  private toggleButton: HTMLButtonElement;
  private keyboardHints: HTMLDivElement;
  private options: NumberPadOptions;
  private gridSize = 6;
  private notesMode = false;
  private visible = true;
  private collapsible = false;
  private buttons: HTMLButtonElement[] = [];
  private notesToggle: HTMLButtonElement | null = null;

  constructor(options: NumberPadOptions) {
    this.options = options;
    this.root = this.createRoot();
    this.container = this.createContainer();
    this.actionsContainer = this.createActionsContainer();
    this.toggleButton = this.createToggleButton();
    this.keyboardHints = this.createKeyboardHints();
    this.root.appendChild(this.toggleButton);
    this.root.appendChild(this.keyboardHints);
    this.root.appendChild(this.container);
    this.root.appendChild(this.actionsContainer);
    this.render();
    this.updateVisibility();
  }

  private createRoot(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'number-pad-shell';
    return root;
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'number-pad';
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

  private createActionsContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'number-pad-actions';
    return container;
  }

  private createToggleButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'number-pad-toggle';
    btn.textContent = 'Show keypad';
    btn.addEventListener('click', () => this.toggleVisibility());
    return btn;
  }

  private createKeyboardHints(): HTMLDivElement {
    const hints = document.createElement('div');
    hints.className = 'keyboard-hints';
    hints.textContent = 'Keyboard: 1-9 input, Backspace clear, N notes, H hint, P pause';
    return hints;
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

  /**
   * Enable/disable collapsible mode for desktop-like environments.
   */
  setCollapsible(enabled: boolean): void {
    this.collapsible = enabled;
    if (!enabled) {
      this.visible = true;
    }
    this.updateVisibility();
  }

  /**
   * Set keypad visibility state.
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.updateVisibility();
  }

  /**
   * Toggle keypad visibility state.
   */
  toggleVisibility(): void {
    this.visible = !this.visible;
    this.updateVisibility();
  }

  private updateVisibility(): void {
    this.container.style.display = this.visible ? 'grid' : 'none';
    this.actionsContainer.style.display = this.visible ? 'grid' : 'none';
    this.toggleButton.style.display = this.collapsible ? 'inline-flex' : 'none';
    this.keyboardHints.style.display = shouldShowKeyboardHints(this.collapsible, this.visible) ? 'block' : 'none';
    this.toggleButton.textContent = this.visible ? 'Hide keypad' : 'Show keypad';
    this.root.classList.toggle('collapsed', !this.visible);
  }

  private updateNotesButton(): void {
    if (this.notesToggle) {
      setLabeledIconContent(
        this.notesToggle,
        this.notesMode ? faPenToSquare : faPen,
        'Notes'
      );
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
    this.actionsContainer.innerHTML = '';
    this.buttons = [];

    for (let i = 1; i <= this.gridSize; i++) {
      const btn = this.createNumberButton(i);
      this.container.appendChild(btn);
      this.buttons.push(btn);
    }

    this.notesToggle = document.createElement('button');
    this.notesToggle.className = 'number-pad-action-btn';
    this.notesToggle.addEventListener('click', () => this.toggleNotes());
    this.actionsContainer.appendChild(this.notesToggle);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'number-pad-action-btn';
    clearBtn.appendChild(createIconElement(faDeleteLeft));
    clearBtn.appendChild(Object.assign(document.createElement('span'), { textContent: 'Clear' }));
    clearBtn.addEventListener('click', () => this.options.onClear?.());
    this.actionsContainer.appendChild(clearBtn);

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
    return this.root;
  }

  /**
   * Mount to a parent element
   */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.root);
  }

  /**
   * Unmount from DOM
   */
  unmount(): void {
    this.root.remove();
  }

  /**
   * Show the number pad
   */
  show(): void {
    this.setVisible(true);
  }

  /**
   * Hide the number pad
   */
  hide(): void {
    this.setVisible(false);
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
