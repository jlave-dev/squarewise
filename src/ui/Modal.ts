/**
 * Modal dialog component with backdrop and animations
 */
export class Modal {
  private overlay: HTMLDivElement;
  private content: HTMLDivElement;
  private visible: boolean = false;
  private onClose: (() => void) | null = null;

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
    this.overlay.appendChild(this.content);

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) {
        this.close();
      }
    });

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
      footer.style.cssText = 'display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end;';
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
    this.visible = true;
    this.overlay.style.display = 'flex';
    this.overlay.style.pointerEvents = 'auto';
    // Trigger reflow for animation
    this.overlay.offsetHeight;
    this.overlay.classList.add('visible');
  }

  /**
   * Hide the modal
   */
  close(): void {
    this.overlay.classList.remove('visible');
    this.overlay.style.pointerEvents = 'none';
    this.visible = false;

    setTimeout(() => {
      if (!this.visible) {
        this.overlay.style.display = 'none';
      }
    }, 200);

    this.onClose?.();
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
    this.overlay.remove();
  }

  /**
   * Get content element for custom manipulation
   */
  getContentElement(): HTMLDivElement {
    return this.content;
  }
}
