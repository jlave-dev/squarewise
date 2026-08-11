import {
  faEraser,
  faPen,
  faPenToSquare,
  faTableCellsLarge,
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
  private selectedNumber: number | null = null;
  private completedNumbers: Set<number> = new Set();
  private enabled = true;

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
    btn.textContent = 'Show Keypad';
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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyNumberButtonStates();
    this.actionsContainer.querySelectorAll('button').forEach((button) => {
      button.disabled = !enabled;
    });
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
    this.toggleButton.textContent = this.visible ? 'Hide Keypad' : 'Show Keypad';
    this.root.classList.toggle('collapsed', !this.visible);
  }

  private updateNotesButton(): void {
    if (this.notesToggle) {
      setLabeledIconContent(
        this.notesToggle,
        this.notesMode ? faPenToSquare : faPen,
        'Notes'
      );
      this.notesToggle.classList.toggle('is-active', this.notesMode);
      this.notesToggle.setAttribute('aria-pressed', String(this.notesMode));
    }
  }

  private render(): void {
    this.container.innerHTML = '';
    this.actionsContainer.innerHTML = '';
    this.buttons = [];
    this.root.dataset.gridSize = String(this.gridSize);
    this.container.style.setProperty('--number-pad-columns', String(this.getPreferredColumnCount()));

    for (let i = 1; i <= this.gridSize; i++) {
      const btn = this.createNumberButton(i);
      this.container.appendChild(btn);
      this.buttons.push(btn);
    }

    const notesGroup = document.createElement('div');
    notesGroup.className = 'number-pad-notes-group';

    this.notesToggle = document.createElement('button');
    this.notesToggle.className = 'number-pad-action-btn number-pad-action-btn--notes';
    this.notesToggle.type = 'button';
    this.notesToggle.addEventListener('click', () => this.toggleNotes());
    notesGroup.appendChild(this.notesToggle);

    const noteGridBtn = document.createElement('button');
    noteGridBtn.className = 'number-pad-action-btn number-pad-action-btn--grid';
    noteGridBtn.type = 'button';
    noteGridBtn.setAttribute('aria-label', 'Note Grid');
    noteGridBtn.appendChild(createIconElement(faTableCellsLarge));
    noteGridBtn.addEventListener('click', () => this.toggleNotes());
    notesGroup.appendChild(noteGridBtn);

    this.actionsContainer.appendChild(notesGroup);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'number-pad-action-btn number-pad-action-btn--clear';
    clearBtn.type = 'button';
    clearBtn.appendChild(createIconElement(faEraser));
    clearBtn.appendChild(Object.assign(document.createElement('span'), { textContent: 'Clear' }));
    clearBtn.addEventListener('click', () => this.options.onClear?.());
    this.actionsContainer.appendChild(clearBtn);

    this.updateNotesButton();
    this.setEnabled(this.enabled);
  }

  private getPreferredColumnCount(): number {
    if (this.gridSize <= 6) {
      return this.gridSize;
    }

    return Math.ceil(this.gridSize / 2);
  }

  private createNumberButton(num: number): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'number-btn';
    btn.type = 'button';
    btn.textContent = num.toString();
    btn.addEventListener('click', () => {
      this.options.onNumber(num);
      this.animateButton(btn);
    });
    return btn;
  }

  private animateButton(btn: HTMLButtonElement): void {
    btn.classList.add('is-pressed');
    setTimeout(() => {
      btn.classList.remove('is-pressed');
    }, 100);
  }

  /**
   * Highlight a number button (for showing which number is selected)
   */
  highlightNumber(num: number | null): void {
    this.selectedNumber = num;
    this.applyNumberButtonStates();
  }

  /**
   * Show disabled state for completed numbers (all instances filled)
   */
  setCompletedNumbers(completed: Set<number>): void {
    this.completedNumbers = new Set(completed);
    this.applyNumberButtonStates();
  }

  private applyNumberButtonStates(): void {
    this.buttons.forEach((btn, index) => {
      const num = index + 1;
      const isCompleted = this.completedNumbers.has(num);
      btn.classList.toggle('is-selected', num === this.selectedNumber);
      btn.classList.toggle('is-completed', isCompleted);
      btn.disabled = !this.enabled || isCompleted;
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
