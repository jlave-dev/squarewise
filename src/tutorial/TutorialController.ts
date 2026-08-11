import type { GameSnapshot } from '../app/Game';

export type TutorialStepId =
  | 'intro'
  | 'select-cage'
  | 'add-note'
  | 'place-value'
  | 'complete';

interface TutorialControllerOptions {
  onComplete: () => void;
  onSkip: () => void;
}

interface TutorialStep {
  id: TutorialStepId;
  title: string;
  body: string;
  primaryLabel?: string;
  action?: 'next' | 'complete';
}

const STEPS: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Rows and columns',
    body: 'Each row and column uses every number once. This 4x4 puzzle uses 1 through 4.',
    primaryLabel: 'Next',
    action: 'next',
  },
  {
    id: 'select-cage',
    title: 'Cages',
    body: 'Cages are outlined groups. Select the single-cell 1 cage in the upper-left corner.',
  },
  {
    id: 'add-note',
    title: 'Notes',
    body: 'Turn on Notes and add 1 as a candidate in that selected cell.',
  },
  {
    id: 'place-value',
    title: 'Make the deduction',
    body: 'A one-cell cage is already decided. Turn Notes off, then enter 1.',
  },
  {
    id: 'complete',
    title: 'Nice',
    body: 'You used a cage clue, notes, and a final placement. Keep solving or choose a new puzzle.',
    primaryLabel: 'Finish',
    action: 'complete',
  },
];

export function getTutorialSteps(): readonly TutorialStep[] {
  return STEPS;
}

export function getTutorialStepIndex(stepId: TutorialStepId): number {
  return Math.max(0, STEPS.findIndex((step) => step.id === stepId));
}

export function isTutorialStepId(value: string | null): value is TutorialStepId {
  return Boolean(value && STEPS.some((step) => step.id === value));
}

export function getNextTutorialStepId(currentStep: TutorialStepId, snapshot: GameSnapshot): TutorialStepId {
  if (currentStep === 'select-cage' && snapshot.selectedCell?.row === 0 && snapshot.selectedCell.col === 0) {
    return 'add-note';
  }

  const hasTutorialNote = snapshot.notes[0]?.[0]?.includes(1) ?? false;
  if (currentStep === 'add-note' && snapshot.notesMode && hasTutorialNote) {
    return 'place-value';
  }

  if (currentStep === 'place-value' && !snapshot.notesMode && snapshot.grid[0]?.[0] === 1) {
    return 'complete';
  }

  return currentStep;
}

export class TutorialController {
  private root: HTMLDivElement;
  private title: HTMLDivElement;
  private body: HTMLDivElement;
  private progress: HTMLDivElement;
  private primaryButton: HTMLButtonElement;
  private skipButton: HTMLButtonElement;
  private stepIndex = 0;
  private visible = false;
  private options: TutorialControllerOptions;

  constructor(options: TutorialControllerOptions) {
    this.options = options;
    this.root = this.createRoot();
    this.title = this.createTitle();
    this.body = this.createBody();
    this.progress = this.createProgress();
    this.primaryButton = this.createPrimaryButton();
    this.skipButton = this.createSkipButton();

    const actions = document.createElement('div');
    actions.className = 'tutorial-actions';
    actions.appendChild(this.skipButton);
    actions.appendChild(this.primaryButton);

    this.root.appendChild(this.progress);
    this.root.appendChild(this.title);
    this.root.appendChild(this.body);
    this.root.appendChild(actions);
    this.render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.root);
  }

  start(stepId: TutorialStepId = 'intro'): void {
    this.stepIndex = getTutorialStepIndex(stepId);
    this.visible = true;
    this.root.hidden = false;
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.root.hidden = true;
  }

  observe(snapshot: GameSnapshot): void {
    if (!this.visible) return;

    const currentStep = this.getCurrentStep();
    const nextStep = getNextTutorialStepId(currentStep, snapshot);
    if (nextStep !== currentStep) {
      this.stepIndex = getTutorialStepIndex(nextStep);
      this.render();
    }
  }

  getCurrentStep(): TutorialStepId {
    return STEPS[this.stepIndex]?.id ?? 'intro';
  }

  private advance(): void {
    this.stepIndex = Math.min(this.stepIndex + 1, STEPS.length - 1);
    this.render();
  }

  private render(): void {
    const step = STEPS[this.stepIndex];
    this.progress.textContent = `Step ${this.stepIndex + 1} of ${STEPS.length}`;
    this.title.textContent = step.title;
    this.body.textContent = step.body;

    if (step.primaryLabel) {
      this.primaryButton.hidden = false;
      this.primaryButton.textContent = step.primaryLabel;
    } else {
      this.primaryButton.hidden = true;
    }
    this.skipButton.hidden = step.action === 'complete';

    this.root.dataset.step = step.id;
  }

  private createRoot(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'tutorial-panel';
    root.hidden = true;
    return root;
  }

  private createTitle(): HTMLDivElement {
    const title = document.createElement('div');
    title.className = 'tutorial-title';
    return title;
  }

  private createBody(): HTMLDivElement {
    const body = document.createElement('div');
    body.className = 'tutorial-body';
    return body;
  }

  private createProgress(): HTMLDivElement {
    const progress = document.createElement('div');
    progress.className = 'tutorial-progress';
    return progress;
  }

  private createPrimaryButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'btn tutorial-primary';
    button.type = 'button';
    button.addEventListener('click', () => {
      const step = STEPS[this.stepIndex];
      if (step.action === 'complete') {
        this.hide();
        this.options.onComplete();
        return;
      }

      this.advance();
    });
    return button;
  }

  private createSkipButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'btn btn-secondary';
    button.type = 'button';
    button.textContent = 'Skip';
    button.addEventListener('click', () => {
      this.hide();
      this.options.onSkip();
    });
    return button;
  }
}
