import {
  faFire,
  faTrophy,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Modal } from './Modal';
import { createIconElement } from './icons';
import { statsStore } from '../storage/StatsStore';
import { getDifficulties, getDifficultyDescription } from '../engine/difficulty/presets';
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

    this.modal.addButton('Reset Stats', async () => {
      await statsStore.reset();
      const refreshed = this.createContent();
      this.modal.setContent(refreshed);
    }, 'secondary');

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
      ${isEmpty ? 'opacity: 0.4;' : ''}
    `;

    // Difficulty name + grid size
    const nameCell = document.createElement('span');
    nameCell.style.cssText = `font-size: 0.9rem; color: var(--text-primary);`;
    nameCell.textContent = getDifficultyDescription(difficulty);
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

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private formatTotalTime(seconds: number): string {
    return `${Math.round(seconds / 3600)}h`;
  }
}
