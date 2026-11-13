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
  private displayedDate = formatLocalDate(new Date());
  private showingChoices = false;
  private onDifficultySelect?: DifficultySelectCallback;
  private onDailyChallenge?: () => void;
  private onTutorial?: () => void;
  private onArchiveChallenge?: ArchiveSelectCallback;

  constructor() {
    this.modal = new Modal();
    document.addEventListener('visibilitychange', () => this.refreshDate());
    this.scheduleDateRefresh();
  }

  /**
   * Show the level select modal
   */
  show(error?: string): void {
    this.showingChoices = true;
    this.displayedDate = formatLocalDate(new Date());
    this.modal.setOnClose(() => {});
    this.modal.clear();
    this.modal.setTitle('Select Puzzle');

    const content = this.createContent();
    if (error) {
      const message = document.createElement('p');
      message.setAttribute('role', 'alert');
      message.textContent = error;
      content.prepend(message);
    }
    this.modal.setContent(content);

    this.modal.open();
  }

  private scheduleDateRefresh(): void {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    window.setTimeout(() => {
      this.refreshDate();
      this.scheduleDateRefresh();
    }, midnight.getTime() - now.getTime() + 50);
  }

  private refreshDate(): void {
    const today = formatLocalDate(new Date());
    if (today === this.displayedDate || !this.modal.isOpen() || !this.showingChoices) return;
    this.displayedDate = today;
    const root = this.modal.getContentElement();
    const controls = Array.from(root.querySelectorAll<HTMLElement>('button, summary'));
    const focusIndex = controls.indexOf(document.activeElement as HTMLElement);
    const archiveOpen = root.querySelector('details')?.open ?? false;
    this.modal.setContent(this.createContent());
    const archive = root.querySelector('details');
    if (archive) archive.open = archiveOpen;
    if (focusIndex >= 0) root.querySelectorAll<HTMLElement>('button, summary')[focusIndex]?.focus();
  }

  showLoading(onCancel: () => void): void {
    this.showingChoices = false;
    this.modal.clear().setTitle('Preparing puzzle');
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = 'Preparing your puzzle…';
    this.modal.setContent(message);
    this.modal.setOnClose(onCancel);
    this.modal.addButton('Cancel', () => this.modal.close(), 'secondary');
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

    const practiceTitle = document.createElement('h3');
    practiceTitle.className = 'puzzle-section-title';
    practiceTitle.textContent = 'Practice';
    container.appendChild(practiceTitle);

    // Difficulty buttons
    const difficulties = getDifficulties();
    for (const difficulty of difficulties) {
      container.appendChild(this.createDifficultyButton(difficulty));
    }

    container.appendChild(this.createTutorialButton());
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
    this.modal.setOnClose(() => {});
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
