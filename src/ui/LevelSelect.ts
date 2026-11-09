import { Modal } from './Modal';
import { getDifficulties, getDifficultyDescription, getGridSize } from '../engine/difficulty/presets';
import type { Difficulty } from '../types/puzzle';
import { formatLocalDate } from '../core/DailyChallenge';

type DifficultySelectCallback = (difficulty: Difficulty) => void;
type ArchiveSelectCallback = (date: string, difficulty: Difficulty) => void;

/**
 * Level/difficulty selection UI
 */
export class LevelSelect {
  private modal: Modal;
  private onDifficultySelect?: DifficultySelectCallback;
  private onDailyChallenge?: () => void;
  private onTutorial?: () => void;
  private onArchiveChallenge?: ArchiveSelectCallback;

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

    if (!this.modal.isOpen()) this.modal.open();
    else this.modal.getContentElement().querySelector<HTMLElement>('button')?.focus();
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

    const practiceTitle = document.createElement('h3');
    practiceTitle.className = 'puzzle-section-title';
    practiceTitle.textContent = 'Practice';
    container.appendChild(practiceTitle);

    // Difficulty buttons
    const difficulties = getDifficulties();
    for (const difficulty of difficulties) {
      container.appendChild(this.createDifficultyButton(difficulty));
    }

    const help = document.createElement('div');
    help.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px';
    help.appendChild(this.createTutorialButton());
    const rules = document.createElement('button');
    rules.className = 'btn btn-secondary';
    rules.type = 'button';
    rules.textContent = 'Rules';
    rules.addEventListener('click', () => this.showRules());
    help.appendChild(rules);
    container.appendChild(help);
    container.appendChild(this.createArchiveSection());

    return container;
  }

  private createDailyChallengeButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'daily-challenge-btn';

    const title = document.createElement('div');
    title.className = 'daily-challenge-title';
    title.textContent = 'Daily Challenge';

    const subtitle = document.createElement('div');
    subtitle.className = 'daily-challenge-date';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    subtitle.textContent = today;

    btn.appendChild(title);
    btn.appendChild(subtitle);

    btn.addEventListener('click', () => {
      this.modal.close();
      this.onDailyChallenge?.();
    });

    return btn;
  }

  private createTutorialButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'tutorial-launch-btn btn btn-secondary';
    btn.type = 'button';
    btn.textContent = 'How to Play';
    btn.addEventListener('click', () => {
      this.modal.close();
      this.onTutorial?.();
    });
    return btn;
  }

  private showRules(): void {
    this.modal.clear();
    this.modal.setTitle('Rules');
    const content = document.createElement('div');
    content.style.cssText = 'display: grid; gap: 12px; line-height: 1.5';
    for (const text of [
      'Fill each row and column with 1 through the board size, using every number once.',
      'Each outlined cage must match its clue. Add for + and multiply for ×. A one-cell cage gives its value.',
      'For −, subtract the smaller number from the larger: 5 − 2 = 3. For ÷, divide the larger by the smaller: 6 ÷ 2 = 3. Cell order does not matter.',
      'Numbers may repeat within a cage when they are in different rows and columns.',
      'Turn Notes on to add or remove candidate numbers. Turn it off to enter a final value.',
    ]) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      content.appendChild(paragraph);
    }
    this.modal.setContent(content);
    this.modal.addButton('Back', () => this.show(), 'secondary').focus();
  }

  private createArchiveSection(): HTMLElement {
    const section = document.createElement('details');
    section.className = 'archive-section';

    const title = document.createElement('summary');
    title.className = 'archive-title';
    title.textContent = 'Past Daily Puzzles';
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'archive-list';
    const today = new Date();
    for (let offset = 1; offset <= 7; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const dateString = formatLocalDate(date);
      list.appendChild(this.createArchiveButton(dateString, 'medium'));
    }
    section.appendChild(list);

    return section;
  }

  private createArchiveButton(date: string, difficulty: Difficulty): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'archive-btn';
    btn.type = 'button';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    btn.textContent = date === formatLocalDate(yesterday)
      ? 'Yesterday'
      : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
    btn.addEventListener('click', () => {
      this.modal.close();
      this.onArchiveChallenge?.(date, difficulty);
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
    btn.style.setProperty('--difficulty-color', colors[difficulty]);

    const leftContent = document.createElement('div');
    leftContent.className = 'difficulty-copy';

    const title = document.createElement('div');
    title.className = 'difficulty-title';
    title.textContent = difficulty;

    const description = document.createElement('div');
    description.className = 'difficulty-description';
    description.textContent = getDifficultyDescription(difficulty);

    leftContent.appendChild(title);
    leftContent.appendChild(description);

    const gridSize = document.createElement('div');
    gridSize.className = 'difficulty-grid';
    gridSize.textContent = `${getGridSize(difficulty)}×${getGridSize(difficulty)}`;

    btn.appendChild(leftContent);
    btn.appendChild(gridSize);

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

  setOnTutorial(callback: () => void): void {
    this.onTutorial = callback;
  }

  setOnArchiveChallenge(callback: ArchiveSelectCallback): void {
    this.onArchiveChallenge = callback;
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
