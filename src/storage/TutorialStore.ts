const TUTORIAL_KEY = 'squarewise.tutorial.v1';

export interface TutorialProgress {
  completed: boolean;
  skipped: boolean;
}

const DEFAULT_PROGRESS: TutorialProgress = {
  completed: false,
  skipped: false,
};

export function loadTutorialProgress(): TutorialProgress {
  try {
    const raw = localStorage.getItem(TUTORIAL_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<TutorialProgress>;
    return {
      completed: parsed.completed === true,
      skipped: parsed.skipped === true,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveTutorialProgress(progress: TutorialProgress): void {
  localStorage.setItem(TUTORIAL_KEY, JSON.stringify(progress));
}

export function shouldAutoStartTutorial(): boolean {
  const progress = loadTutorialProgress();
  return !progress.completed && !progress.skipped;
}

export function markTutorialCompleted(): void {
  saveTutorialProgress({ completed: true, skipped: false });
}

export function markTutorialSkipped(): void {
  saveTutorialProgress({ completed: false, skipped: true });
}

export function resetTutorialProgress(): void {
  saveTutorialProgress({ ...DEFAULT_PROGRESS });
}
