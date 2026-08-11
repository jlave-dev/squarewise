import {
  faFire,
  faTrophy,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Modal } from './Modal';
import { createIconElement } from './icons';
import { statsStore } from '../storage/StatsStore';
import { getDifficulties } from '../engine/difficulty/presets';
import { formatBadge } from '../app/share/SharePayload';
import type { Difficulty } from '../types/puzzle';
import type { PlayerStats } from '../types/game';

/**
 * Statistics screen UI
 */
export class StatsScreen {
  private modal: Modal;

  constructor() {
    this.modal = new Modal();
  }

  async show(): Promise<void> {
    if (!statsStore.isLoaded()) {
      await statsStore.load();
    }

    this.modal.clear();
    this.modal.setTitle('Statistics');

    const content = this.createContent();
    this.modal.setContent(content);

    this.modal.addButton('Done', () => {
      this.modal.close();
    }, 'primary');

    if (statsStore.getTotalCompleted() > 0 || Object.keys(statsStore.getStats().dailyCompletions).length > 0) {
      let resetButton: HTMLButtonElement;
      resetButton = this.modal.addButton('Reset Statistics', async () => {
        if (!window.confirm('Reset all statistics? This cannot be undone.')) return;
        await statsStore.reset();
        this.modal.setContent(this.createContent());
        resetButton.remove();
      }, 'secondary');
    }

    this.modal.open();
  }

  private createContent(): HTMLElement {
    const stats = statsStore.getStats();
    const container = document.createElement('div');
    container.className = 'stats-panel';
    container.style.cssText = `padding: 4px 0;`;

    // Summary row
    container.appendChild(this.createSummaryRow(stats));

    // Divider
    container.appendChild(this.createDivider());

    // Difficulty table
    container.appendChild(this.createDifficultyTable(stats));

    const dailySection = this.createDailySection(stats);
    if (dailySection) {
      container.appendChild(this.createDivider());
      container.appendChild(dailySection);
    }

    return container;
  }

  private createSummaryRow(stats: Readonly<PlayerStats>): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `display: flex; gap: 10px; margin-bottom: 4px;`;

    row.appendChild(this.createHeroCard(
      faFire,
      String(stats.currentStreak),
      'Streak',
      `Best: ${stats.longestStreak}`,
    ));

    row.appendChild(this.createHeroCard(
      faTrophy,
      String(statsStore.getTotalCompleted()),
      'Solved',
    ));

    row.appendChild(this.createHeroCard(
      faClock,
      this.formatTotalTime(stats.totalTime),
      'Playtime',
    ));

    return row;
  }

  private createHeroCard(icon: IconDefinition, value: string, label: string, sublabel?: string): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      flex: 1;
      min-width: 0;
      padding: 14px 8px;
      background: var(--bg-primary);
      border-radius: var(--radius-md);
      text-align: center;
      box-shadow: var(--shadow-sm);
    `;

    const iconEl = createIconElement(icon);
    iconEl.style.cssText = `color: var(--accent); font-size: 1.1rem; margin-bottom: 6px;`;
    card.appendChild(iconEl);

    const valueEl = document.createElement('div');
    valueEl.textContent = value;
    valueEl.style.cssText = `
      font-size: 1.6rem;
      font-weight: bold;
      font-family: var(--font-mono);
      color: var(--text-primary);
      line-height: 1.2;
    `;
    card.appendChild(valueEl);

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-top: 2px;
    `;
    card.appendChild(labelEl);

    if (sublabel) {
      const subEl = document.createElement('div');
      subEl.textContent = sublabel;
      subEl.style.cssText = `
        font-size: 0.65rem;
        color: var(--text-secondary);
        opacity: 0.7;
        margin-top: 2px;
      `;
      card.appendChild(subEl);
    }

    return card;
  }

  private createDifficultyTable(stats: Readonly<PlayerStats>): HTMLElement {
    const table = document.createElement('div');

    // Header row
    const header = document.createElement('div');
    header.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 72px 64px;
      gap: 4px;
      padding: 0 0 8px;
      border-bottom: 1px solid var(--grid-line);
    `;

    const h1 = document.createElement('span');
    h1.textContent = 'Difficulty';
    h1.style.cssText = `font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary);`;
    header.appendChild(h1);

    const h2 = document.createElement('span');
    h2.textContent = 'Best';
    h2.style.cssText = `font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); text-align: right;`;
    header.appendChild(h2);

    const h3 = document.createElement('span');
    h3.textContent = 'Solved';
    h3.style.cssText = `font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); text-align: right;`;
    header.appendChild(h3);

    table.appendChild(header);

    for (const difficulty of getDifficulties()) {
      table.appendChild(this.createDifficultyRow(difficulty, stats));
    }

    return table;
  }

  private createDifficultyRow(difficulty: Difficulty, stats: Readonly<PlayerStats>): HTMLElement {
    const completed = stats.puzzlesCompleted[difficulty];
    const bestTime = stats.bestTimes[difficulty];
    const isEmpty = completed === 0;

    const row = document.createElement('div');
    row.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 72px 64px;
      gap: 4px;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--grid-line);
      ${isEmpty ? '--text-primary: var(--text-muted);' : ''}
    `;

    // Difficulty name
    const nameCell = document.createElement('span');
    nameCell.style.cssText = `font-size: 0.9rem; color: var(--text-primary);`;
    nameCell.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    row.appendChild(nameCell);

    // Best time
    const timeCell = document.createElement('span');
    timeCell.style.cssText = `
      font-size: 0.9rem;
      font-family: var(--font-mono);
      color: var(--text-primary);
      text-align: right;
    `;
    timeCell.textContent = bestTime !== null ? this.formatTime(bestTime) : '--';
    row.appendChild(timeCell);

    // Solved count
    const solvedCell = document.createElement('span');
    solvedCell.style.cssText = `
      font-size: 0.9rem;
      font-family: var(--font-mono);
      color: var(--text-primary);
      text-align: right;
    `;
    solvedCell.textContent = String(completed);
    row.appendChild(solvedCell);

    return row;
  }

  private createDivider(): HTMLElement {
    const d = document.createElement('div');
    d.style.cssText = `height: 1px; background: var(--grid-line); margin: 4px 0 16px;`;
    return d;
  }

  private createDailySection(stats: Readonly<PlayerStats>): HTMLElement | null {
    const completions = Object.values(stats.dailyCompletions)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    if (completions.length === 0) return null;

    const section = document.createElement('div');
    section.className = 'daily-stats-section';

    const title = document.createElement('div');
    title.textContent = 'Recent daily';
    title.style.cssText = `
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 8px;
    `;
    section.appendChild(title);

    for (const completion of completions) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid var(--grid-line);
      `;

      const left = document.createElement('div');
      const date = new Date(`${completion.date}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const difficulty = completion.difficulty.charAt(0).toUpperCase() + completion.difficulty.slice(1);
      left.textContent = `${date} · ${difficulty}`;
      left.style.cssText = `color: var(--text-primary); font-size: 0.88rem;`;
      row.appendChild(left);

      const right = document.createElement('div');
      right.textContent = this.formatTime(completion.time);
      right.style.cssText = `color: var(--text-primary); font-family: var(--font-mono); font-size: 0.88rem;`;
      row.appendChild(right);

      if (completion.badges.length > 0) {
        const badges = document.createElement('div');
        badges.style.cssText = `
          grid-column: 1 / -1;
          color: var(--text-secondary);
          font-size: 0.76rem;
        `;
        badges.textContent = completion.badges.map(formatBadge).join(' · ');
        row.appendChild(badges);
      }

      section.appendChild(row);
    }

    return section;
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private formatTotalTime(seconds: number): string {
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}
