import { Modal } from './Modal';
import type { ShareLink } from '../app/share/ShareService';
import type { DailyBadge, HintUsage } from '../types/game';
import { formatBadge, formatHintResult } from '../app/share/SharePayload';
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
  private shareButton: HTMLButtonElement | null = null;
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
    this.shareButton = null;
    this.modal.clear();
    this.modal.setTitle('Puzzle Complete');

    const content = this.createContent(stats);
    this.modal.setContent(content);

    this.modal.addButton(this.getPrimaryActionLabel(stats), () => {
      this.modal.close();
      this.onNewGame?.();
    }, 'primary');

    this.shareButton = this.modal.addButton('Share', () => {
      if (this.stats) {
        void this.onShare?.(this.stats);
      }
    }, 'secondary');

    this.modal.open();

    this.triggerConfetti();
  }

  private createContent(stats: WinStats): HTMLElement {
    const container = document.createElement('div');
    container.className = 'win-summary';

    const context = document.createElement('p');
    context.className = 'win-context';
    const difficulty = stats.difficulty.charAt(0).toUpperCase() + stats.difficulty.slice(1);
    const date = stats.mode === 'daily' && stats.date
      ? new Date(`${stats.date}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
      : null;
    context.textContent = date
      ? `Daily · ${date}`
      : `${difficulty} · ${stats.gridSize}×${stats.gridSize}`;
    container.appendChild(context);

    const time = document.createElement('p');
    time.className = 'win-time';
    time.textContent = this.formatTime(stats.time);
    time.ariaLabel = `Time ${time.textContent}`;
    container.appendChild(time);

    const details = document.createElement('p');
    details.className = 'win-details';
    const detailParts = [formatHintResult(stats)];
    if (stats.mistakes !== undefined) detailParts.push(this.formatMistakes(stats.mistakes));
    if (stats.dailyStreak) detailParts.push(`${stats.dailyStreak}-day streak`);
    details.textContent = detailParts.join(' · ');
    container.appendChild(details);

    if (stats.isNewBest) {
      const best = document.createElement('p');
      best.className = 'win-best';
      best.textContent = 'New personal best';
      container.appendChild(best);
    }

    if (stats.badges && stats.badges.length > 0) {
      container.appendChild(this.createBadgeList(stats.badges));
    }

    this.shareStatusEl = document.createElement('div');
    this.shareStatusEl.className = 'win-share-status';
    this.shareStatusEl.setAttribute('role', 'status');
    this.shareStatusEl.setAttribute('aria-live', 'polite');
    container.appendChild(this.shareStatusEl);

    this.shareActionsEl = document.createElement('div');
    this.shareActionsEl.className = 'win-share-actions';
    this.shareActionsEl.hidden = true;
    container.appendChild(this.shareActionsEl);

    this.setShareStatus('');

    return container;
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
      item.textContent = formatBadge(badge);
      list.appendChild(item);
    }

    return list;
  }

  private getPrimaryActionLabel(stats: WinStats): string {
    if (stats.mode === 'daily') return 'Play Archive';
    if (stats.mode === 'archive') return 'Play Another';
    return 'New Game';
  }

  private formatMistakes(mistakes: number): string {
    return mistakes === 1 ? '1 mistake' : `${mistakes} mistakes`;
  }

  showShareFallback(links: ShareLink[], copyText: string): void {
    if (!this.shareActionsEl) {
      return;
    }

    this.shareActionsEl.innerHTML = '';
    this.shareActionsEl.hidden = false;
    this.shareButton?.setAttribute('hidden', '');

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
    copyButton.textContent = 'Copy Result';
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
    this.shareActionsEl.hidden = true;
    this.shareButton?.removeAttribute('hidden');
  }

  setShareStatus(message: string): void {
    if (!this.shareStatusEl) {
      return;
    }
    this.shareStatusEl.textContent = message;
    this.shareStatusEl.hidden = message.length === 0;
  }

  private triggerConfetti(): void {
    this.cleanupConfetti();

    if (prefersReducedMotion()) {
      return;
    }

    // Simple confetti effect using CSS animations
    const colors = ['#6366F1', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6'];

    for (let i = 0; i < 36; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'win-confetti';
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[i % colors.length]};
        left: ${5 + Math.random() * 90}vw;
        top: -10px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1100;
        animation: confetti-fall ${2 + Math.random() * 1.2}s linear forwards;
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
          82% { transform: translateY(84vh) rotate(590deg); opacity: 1; }
          100% { transform: translateY(104vh) rotate(720deg); opacity: 0; }
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
