import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBorderAll,
  faClock,
  faLightbulb,
  faSignal,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons';
import { Modal } from './Modal';
import { createIconElement } from './icons';
import type { ShareLink } from '../app/share/ShareService';
import type { DailyBadge, HintUsage } from '../types/game';
import { prefersReducedMotion } from '../utils/animations';

export interface WinStats {
  time: number;
  hintsUsed: number;
  hintUsage?: HintUsage;
  mistakes?: number;
  difficulty: string;
  gridSize: number;
  isNewBest: boolean;
  mode?: 'daily' | 'fresh' | 'tutorial' | 'archive';
  date?: string | null;
  puzzleId?: string;
  badges?: DailyBadge[];
  dailyStreak?: number | null;
}

/**
 * Win screen celebration
 */
export class WinScreen {
  private modal: Modal;
  private stats: WinStats | null = null;
  private onNewGame?: () => void;
  private onShare?: (stats: WinStats) => void | Promise<void>;
  private shareActionsEl: HTMLDivElement | null = null;
  private shareStatusEl: HTMLDivElement | null = null;
  private confettiTimeoutIds: number[] = [];

  constructor() {
    this.modal = new Modal();
    this.modal.setOnClose(() => this.cleanupConfetti());
  }

  /**
   * Show the win screen
   */
  show(stats: WinStats): void {
    this.stats = stats;
    this.modal.clear();
    this.modal.setTitle('Puzzle Complete');

    const content = this.createContent(stats);
    this.modal.setContent(content);

    this.modal.addButton(this.getPrimaryActionLabel(stats), () => {
      this.modal.close();
      this.onNewGame?.();
    }, 'primary');

    this.modal.addButton('Share', () => {
      if (this.stats) {
        void this.onShare?.(this.stats);
      }
    }, 'secondary');

    this.modal.open();

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

    statsGrid.appendChild(this.createStatItem('Time', this.formatTime(stats.time), faClock));
    statsGrid.appendChild(this.createStatItem('Hints', this.formatHintSummary(stats), faLightbulb));
    statsGrid.appendChild(this.createStatItem('Difficulty', stats.difficulty, faSignal));
    statsGrid.appendChild(this.createStatItem('Grid', `${stats.gridSize}×${stats.gridSize}`, faBorderAll));
    if (stats.mistakes !== undefined) {
      statsGrid.appendChild(this.createStatItem('Mistakes', this.formatMistakes(stats.mistakes), faSignal));
    }

    if (stats.mode === 'daily' && stats.date) {
      statsGrid.appendChild(this.createStatItem('Daily', stats.date, faTrophy));
      if (stats.dailyStreak !== null && stats.dailyStreak !== undefined) {
        statsGrid.appendChild(this.createStatItem('Streak', String(stats.dailyStreak), faSignal));
      }
    }

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
      bestBadge.appendChild(createIconElement(faTrophy));
      bestBadge.appendChild(Object.assign(document.createElement('span'), { textContent: 'New Best Time!' }));
      bestBadge.style.display = 'inline-flex';
      bestBadge.style.alignItems = 'center';
      bestBadge.style.justifyContent = 'center';
      bestBadge.style.gap = '8px';
      statsGrid.appendChild(bestBadge);
    }

    container.appendChild(statsGrid);

    if (stats.badges && stats.badges.length > 0) {
      container.appendChild(this.createBadgeList(stats.badges));
    }

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

    this.shareStatusEl = document.createElement('div');
    this.shareStatusEl.style.cssText = `
      font-size: 0.9rem;
      color: var(--text-secondary);
      min-height: 1.3em;
    `;
    container.appendChild(this.shareStatusEl);

    this.shareActionsEl = document.createElement('div');
    this.shareActionsEl.style.cssText = `
      display: none;
      flex-wrap: wrap;
      gap: 8px;
    `;
    container.appendChild(this.shareActionsEl);

    this.setShareStatus('');

    return container;
  }

  private createStatItem(label: string, value: string, iconDef: IconDefinition): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 12px;
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      text-align: center;
    `;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      font-size: 0.8rem;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    `;
    labelEl.appendChild(createIconElement(iconDef));
    labelEl.appendChild(document.createTextNode(label));

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

  private createBadgeList(badges: DailyBadge[]): HTMLElement {
    const list = document.createElement('div');
    list.className = 'win-badges';

    for (const badge of badges) {
      const item = document.createElement('span');
      item.className = 'win-badge';
      item.textContent = this.formatBadge(badge);
      list.appendChild(item);
    }

    return list;
  }

  private formatBadge(badge: DailyBadge): string {
    const labels: Record<DailyBadge, string> = {
      'no-hint': 'No hint',
      'no-reveal': 'No reveal',
      'mistake-free': 'Mistake-free',
      'personal-best': 'Personal best',
    };
    return labels[badge];
  }

  private generateShareText(stats: WinStats): string {
    const puzzleLabel = stats.mode === 'daily' && stats.date
      ? `the daily ${stats.date}`
      : `a ${stats.gridSize}×${stats.gridSize} ${stats.difficulty}`;
    const badges = stats.badges?.length ? ` ${stats.badges.map((badge) => this.formatBadge(badge)).join(', ')}.` : '';
    const mistakes = stats.mistakes !== undefined ? `, ${this.formatMistakes(stats.mistakes)}` : '';
    return `I solved ${puzzleLabel} puzzle in ${this.formatTime(stats.time)} on SquareWise (${this.formatHintSummary(stats)}${mistakes}).${badges}`;
  }

  private getPrimaryActionLabel(stats: WinStats): string {
    if (stats.mode === 'daily') return 'Play archive';
    if (stats.mode === 'archive') return 'Play another';
    return 'New game';
  }

  private formatHintSummary(stats: WinStats): string {
    if (!stats.hintUsage) {
      return stats.hintsUsed.toString();
    }

    if (stats.hintsUsed === 0) {
      return 'No hints';
    }

    if (stats.hintUsage.tier4 > 0) {
      const suffix = stats.hintUsage.tier4 === 1 ? 'reveal' : 'reveals';
      return `${stats.hintsUsed} hints, ${stats.hintUsage.tier4} ${suffix}`;
    }

    return `${stats.hintsUsed} hints, no reveals`;
  }

  private formatMistakes(mistakes: number): string {
    return mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`;
  }

  showShareFallback(links: ShareLink[], copyText: string): void {
    if (!this.shareActionsEl) {
      return;
    }

    this.shareActionsEl.innerHTML = '';
    this.shareActionsEl.style.display = 'flex';
    this.shareActionsEl.style.padding = '10px';
    this.shareActionsEl.style.borderRadius = 'var(--radius-md)';
    this.shareActionsEl.style.background = 'var(--bg-primary)';

    for (const link of links) {
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'btn btn-secondary';
      anchor.textContent = link.label;
      anchor.ariaLabel = link.label;
      this.shareActionsEl.appendChild(anchor);
    }

    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-secondary';
    copyButton.textContent = 'Copy Link';
    copyButton.addEventListener('click', () => {
      if (!navigator.clipboard?.writeText) {
        this.setShareStatus('Clipboard is unavailable. Use social links above.');
        return;
      }

      void navigator.clipboard.writeText(copyText)
        .then(() => this.setShareStatus('Copied to clipboard.'))
        .catch(() => this.setShareStatus('Could not copy. You can still use social links above.'));
    });
    this.shareActionsEl.appendChild(copyButton);
  }

  hideShareFallback(): void {
    if (!this.shareActionsEl) {
      return;
    }
    this.shareActionsEl.innerHTML = '';
    this.shareActionsEl.style.display = 'none';
  }

  setShareStatus(message: string): void {
    if (!this.shareStatusEl) {
      return;
    }
    this.shareStatusEl.textContent = message;
  }

  private triggerConfetti(): void {
    this.cleanupConfetti();

    if (prefersReducedMotion()) {
      return;
    }

    // Simple confetti effect using CSS animations
    const colors = ['#6366F1', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'win-confetti';
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

      const timeoutId = window.setTimeout(() => {
        confetti.remove();
        this.confettiTimeoutIds = this.confettiTimeoutIds.filter((id) => id !== timeoutId);
        this.removeConfettiStyleIfIdle();
      }, 4000);
      this.confettiTimeoutIds.push(timeoutId);
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

  private cleanupConfetti(): void {
    for (const timeoutId of this.confettiTimeoutIds) {
      window.clearTimeout(timeoutId);
    }
    this.confettiTimeoutIds = [];
    document.querySelectorAll('.win-confetti').forEach((element) => element.remove());
    this.removeConfettiStyleIfIdle();
  }

  private removeConfettiStyleIfIdle(): void {
    if (document.querySelector('.win-confetti')) {
      return;
    }
    document.getElementById('confetti-style')?.remove();
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
  setOnShare(callback: (stats: WinStats) => void | Promise<void>): void {
    this.onShare = callback;
  }

  /**
   * Hide the win screen
   */
  hide(): void {
    if (this.modal.isOpen()) {
      this.modal.close();
    }
  }
}
