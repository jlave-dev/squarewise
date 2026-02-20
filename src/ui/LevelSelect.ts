import { Modal } from './Modal';
import { getDifficulties, getDifficultyDescription, getGridSize } from '../engine/difficulty/presets';
import type { Difficulty } from '../types/puzzle';

type DifficultySelectCallback = (difficulty: Difficulty) => void;

/**
 * Level/difficulty selection UI
 */
export class LevelSelect {
  private modal: Modal;
  private onDifficultySelect?: DifficultySelectCallback;
  private onDailyChallenge?: () => void;

  constructor() {
    this.modal = new Modal();
  }

  /**
   * Show the level select modal
   */
  show(): void {
    this.modal.clear();
    this.modal.setTitle('Select Puzzle');

    const content = this.createContent();
    this.modal.setContent(content);

    this.modal.open();
  }

  private createContent(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Daily challenge button
    const dailyBtn = this.createDailyChallengeButton();
    container.appendChild(dailyBtn);

    // Separator
    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      background: var(--grid-line);
      margin: 8px 0;
    `;
    container.appendChild(separator);

    // Difficulty buttons
    const difficulties = getDifficulties();
    for (const difficulty of difficulties) {
      container.appendChild(this.createDifficultyButton(difficulty));
    }

    return container;
  }

  private createDailyChallengeButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'daily-challenge-btn';
    btn.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: linear-gradient(135deg, var(--accent), #818CF8);
      border: none;
      border-radius: var(--radius-lg);
      color: white;
      cursor: pointer;
      transition: transform 0.15s ease;
      width: 100%;
    `;

    const title = document.createElement('div');
    title.style.cssText = `font-size: 1.2rem; font-weight: bold; margin-bottom: 4px;`;
    title.textContent = '📅 Daily Challenge';

    const subtitle = document.createElement('div');
    subtitle.style.cssText = `font-size: 0.9rem; opacity: 0.9;`;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    subtitle.textContent = today;

    btn.appendChild(title);
    btn.appendChild(subtitle);

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.02)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
      this.modal.close();
      this.onDailyChallenge?.();
    });

    return btn;
  }

  private createDifficultyButton(difficulty: Difficulty): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'difficulty-btn';

    const colors: Record<Difficulty, string> = {
      beginner: '#22C55E',
      easy: '#84CC16',
      medium: '#EAB308',
      hard: '#F97316',
      expert: '#EF4444',
    };

    btn.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: var(--bg-surface);
      border: 2px solid ${colors[difficulty]};
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
      width: 100%;
    `;

    const leftContent = document.createElement('div');
    leftContent.style.cssText = `text-align: left;`;

    const title = document.createElement('div');
    title.className = 'difficulty-title';
    title.style.cssText = `
      font-size: 1.1rem;
      font-weight: bold;
      color: var(--text-primary);
      text-transform: capitalize;
    `;
    title.textContent = difficulty;

    const description = document.createElement('div');
    description.className = 'difficulty-description';
    description.style.cssText = `
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 4px;
    `;
    description.textContent = getDifficultyDescription(difficulty);

    leftContent.appendChild(title);
    leftContent.appendChild(description);

    const gridSize = document.createElement('div');
    gridSize.className = 'difficulty-grid';
    gridSize.style.cssText = `
      font-size: 1.2rem;
      font-weight: bold;
      color: ${colors[difficulty]};
    `;
    gridSize.textContent = `${getGridSize(difficulty)}×${getGridSize(difficulty)}`;

    btn.appendChild(leftContent);
    btn.appendChild(gridSize);

    btn.addEventListener('mouseenter', () => {
      btn.style.background = `${colors[difficulty]}`;
      // Make title white on hover for better contrast
      const title = btn.querySelector('.difficulty-title') as HTMLElement;
      if (title) title.style.color = 'white';
      const description = btn.querySelector('.difficulty-description') as HTMLElement;
      if (description) description.style.color = 'rgba(255, 255, 255, 0.9)';
      const gridSize = btn.querySelector('.difficulty-grid') as HTMLElement;
      if (gridSize) gridSize.style.color = 'white';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'var(--bg-surface)';
      // Restore original colors
      const title = btn.querySelector('.difficulty-title') as HTMLElement;
      if (title) title.style.color = 'var(--text-primary)';
      const description = btn.querySelector('.difficulty-description') as HTMLElement;
      if (description) description.style.color = 'var(--text-secondary)';
      const gridSize = btn.querySelector('.difficulty-grid') as HTMLElement;
      if (gridSize) gridSize.style.color = colors[difficulty];
    });

    btn.addEventListener('click', () => {
      this.modal.close();
      this.onDifficultySelect?.(difficulty);
    });

    return btn;
  }

  /**
   * Set callback for difficulty selection
   */
  setOnDifficultySelect(callback: DifficultySelectCallback): void {
    this.onDifficultySelect = callback;
  }

  /**
   * Set callback for daily challenge
   */
  setOnDailyChallenge(callback: () => void): void {
    this.onDailyChallenge = callback;
  }

  /**
   * Hide the level select
   */
  hide(): void {
    this.modal.close();
  }

  /**
   * Toggle the level select
   */
  toggle(): void {
    if (this.modal.isOpen()) {
      this.hide();
    } else {
      this.show();
    }
  }
}
