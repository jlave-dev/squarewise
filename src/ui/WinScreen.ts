import { Modal } from './Modal';

interface WinStats {
  time: number;
  hintsUsed: number;
  difficulty: string;
  gridSize: number;
  isNewBest: boolean;
}

/**
 * Win screen celebration
 */
export class WinScreen {
  private modal: Modal;
  private stats: WinStats | null = null;
  private onNewGame?: () => void;
  private onShare?: () => void;

  constructor() {
    this.modal = new Modal();
    this.modal.setOnClose(() => this.onNewGame?.());
  }

  /**
   * Show the win screen
   */
  show(stats: WinStats): void {
    this.stats = stats;
    this.modal.clear();
    this.modal.setTitle('🎉 Puzzle Complete!');

    const content = this.createContent(stats);
    this.modal.setContent(content);

    this.modal.addButton('Play Again', () => {
      this.modal.close();
      this.onNewGame?.();
    }, 'primary');

    this.modal.addButton('Share', () => {
      this.onShare?.();
    }, 'secondary');

    this.modal.open();

    // Trigger confetti effect
    this.triggerConfetti();
  }

  private createContent(stats: WinStats): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 16px;
    `;

    // Stats grid
    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    `;

    statsGrid.appendChild(this.createStatItem('⏱️ Time', this.formatTime(stats.time)));
    statsGrid.appendChild(this.createStatItem('💡 Hints', stats.hintsUsed.toString()));
    statsGrid.appendChild(this.createStatItem('📊 Difficulty', stats.difficulty));
    statsGrid.appendChild(this.createStatItem('📐 Grid', `${stats.gridSize}×${stats.gridSize}`));

    if (stats.isNewBest) {
      const bestBadge = document.createElement('div');
      bestBadge.style.cssText = `
        grid-column: span 2;
        background: var(--success);
        color: white;
        padding: 8px 16px;
        border-radius: var(--radius-md);
        text-align: center;
        font-weight: bold;
      `;
      bestBadge.textContent = '🏆 New Best Time!';
      statsGrid.appendChild(bestBadge);
    }

    container.appendChild(statsGrid);

    // Share text preview
    const sharePreview = document.createElement('div');
    sharePreview.style.cssText = `
      margin-top: 8px;
      padding: 12px;
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      color: var(--text-secondary);
    `;
    sharePreview.textContent = this.generateShareText(stats);
    container.appendChild(sharePreview);

    return container;
  }

  private createStatItem(label: string, value: string): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 12px;
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      text-align: center;
    `;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `font-size: 0.8rem; color: var(--text-muted);`;
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.style.cssText = `font-size: 1.2rem; font-weight: bold; color: var(--text-primary); margin-top: 4px;`;
    valueEl.textContent = value;

    item.appendChild(labelEl);
    item.appendChild(valueEl);

    return item;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private generateShareText(stats: WinStats): string {
    return `I solved a ${stats.gridSize}×${stats.gridSize} ${stats.difficulty} puzzle in ${this.formatTime(stats.time)} on SquareWise! 🧩`;
  }

  private triggerConfetti(): void {
    // Simple confetti effect using CSS animations
    const colors = ['#6366F1', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[i % colors.length]};
        left: ${Math.random() * 100}vw;
        top: -10px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        animation: confetti-fall ${2 + Math.random() * 2}s linear forwards;
      `;

      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 4000);
    }

    // Add confetti animation if not already in page
    if (!document.getElementById('confetti-style')) {
      const style = document.createElement('style');
      style.id = 'confetti-style';
      style.textContent = `
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Set callback for new game
   */
  setOnNewGame(callback: () => void): void {
    this.onNewGame = callback;
  }

  /**
   * Set callback for share
   */
  setOnShare(callback: () => void): void {
    this.onShare = callback;
  }

  /**
   * Hide the win screen
   */
  hide(): void {
    this.modal.close();
  }
}
