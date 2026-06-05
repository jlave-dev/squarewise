/**
 * Modal dialog component with backdrop and animations
 */
let modalTitleIdCounter = 0;

export class Modal {
  private overlay: HTMLDivElement;
  private content: HTMLDivElement;
  private visible: boolean = false;
  private onClose: (() => void) | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;
  private readonly handleDocumentKeyDown = (e: KeyboardEvent): void => {
    if (!this.visible) return;

    if (e.key === 'Escape') {
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      this.trapFocus(e);
    }
  };

  constructor() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Create content container
    this.content = document.createElement('div');
    this.content.className = 'modal-content';
    this.content.setAttribute('role', 'dialog');
    this.content.setAttribute('aria-modal', 'true');
    this.content.tabIndex = -1;
    this.overlay.appendChild(this.content);

    // Handle escape key
    document.addEventListener('keydown', this.handleDocumentKeyDown);

    // Initially hidden
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);
  }

  /**
   * Set modal title
   */
  setTitle(title: string): this {
    const titleEl = this.content.querySelector('.modal-title') ?? document.createElement('h2');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;
    titleEl.id = titleEl.id || `modal-title-${++modalTitleIdCounter}`;
    this.content.setAttribute('aria-labelledby', titleEl.id);

    if (!this.content.contains(titleEl)) {
      this.content.insertBefore(titleEl, this.content.firstChild);
    }
    return this;
  }

  /**
   * Set modal content (HTML string or element)
   */
  setContent(content: string | HTMLElement): this {
    const body = this.content.querySelector('.modal-body') ?? document.createElement('div');
    body.className = 'modal-body';

    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.innerHTML = '';
      body.appendChild(content);
    }

    if (!this.content.contains(body)) {
      this.content.appendChild(body);
    }
    return this;
  }

  /**
   * Add a button to the modal
   */
  addButton(text: string, onClick: () => void, variant: 'primary' | 'secondary' = 'primary'): this {
    let footer = this.content.querySelector('.modal-footer') as HTMLDivElement;
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'modal-footer';
      this.content.appendChild(footer);
    }

    const btn = document.createElement('button');
    btn.className = variant === 'primary' ? 'btn' : 'btn btn-secondary';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    footer.appendChild(btn);
    return this;
  }

  /**
   * Set close callback
   */
  setOnClose(callback: () => void): this {
    this.onClose = callback;
    return this;
  }

  /**
   * Show the modal
   */
  open(): void {
    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.visible = true;
    this.overlay.style.display = 'flex';
    this.overlay.style.pointerEvents = 'auto';
    // Trigger reflow for animation
    this.overlay.offsetHeight;
    this.overlay.classList.add('visible');
    requestAnimationFrame(() => this.focusInitialElement());
  }

  /**
   * Hide the modal
   */
  close(): void {
    if (!this.visible) {
      return;
    }

    this.overlay.classList.remove('visible');
    this.overlay.style.pointerEvents = 'none';
    this.visible = false;

    setTimeout(() => {
      if (!this.visible) {
        this.overlay.style.display = 'none';
      }
    }, 200);

    this.onClose?.();
    this.restoreFocus();
  }

  /**
   * Toggle modal visibility
   */
  toggle(): void {
    if (this.visible) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if modal is visible
   */
  isOpen(): boolean {
    return this.visible;
  }

  /**
   * Clear all content
   */
  clear(): this {
    this.content.innerHTML = '';
    return this;
  }

  /**
   * Remove modal from DOM
   */
  destroy(): void {
    this.close();
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    this.overlay.remove();
  }

  /**
   * Get content element for custom manipulation
   */
  getContentElement(): HTMLDivElement {
    return this.content;
  }

  private focusInitialElement(): void {
    if (!this.visible) return;

    const focusable = this.getFocusableElements();
    (focusable[0] ?? this.content).focus();
  }

  private restoreFocus(): void {
    if (this.previouslyFocusedElement && document.contains(this.previouslyFocusedElement)) {
      this.previouslyFocusedElement.focus();
    }
    this.previouslyFocusedElement = null;
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = this.getFocusableElements();

    if (focusable.length === 0) {
      event.preventDefault();
      this.content.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(this.content.querySelectorAll<HTMLElement>(selector))
      .filter((element) => !element.hasAttribute('hidden') && element.tabIndex !== -1);
  }
}
