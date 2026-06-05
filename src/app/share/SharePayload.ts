import type { DailyBadge, HintUsage } from '../../types/game';

export interface WinShareStats {
  time: number;
  hintsUsed: number;
  hintUsage?: HintUsage;
  mistakes?: number;
  difficulty: string;
  gridSize: number;
  isNewBest: boolean;
  mode?: 'daily' | 'fresh' | 'tutorial' | 'archive';
  date?: string | null;
  badges?: DailyBadge[];
}

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

function formatBadge(badge: DailyBadge): string {
  const labels: Record<DailyBadge, string> = {
    'no-hint': 'No hint',
    'no-reveal': 'No reveal',
    'mistake-free': 'Mistake-free',
    'personal-best': 'Personal best',
  };
  return labels[badge];
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatHints(hintsUsed: number): string {
  const suffix = hintsUsed === 1 ? 'hint' : 'hints';
  return `${hintsUsed} ${suffix}`;
}

function formatHintResult(stats: WinShareStats): string {
  if (!stats.hintUsage) {
    return formatHints(stats.hintsUsed);
  }

  if (stats.hintsUsed === 0) {
    return 'no hints';
  }

  if (stats.hintUsage.tier4 > 0) {
    const suffix = stats.hintUsage.tier4 === 1 ? 'reveal' : 'reveals';
    return `${formatHints(stats.hintsUsed)}, ${stats.hintUsage.tier4} ${suffix}`;
  }

  return `${formatHints(stats.hintsUsed)}, no reveals`;
}

export function buildWinSharePayload(stats: WinShareStats, pageUrl: string): SharePayload {
  const puzzleLabel = stats.mode === 'daily' && stats.date
    ? `the daily ${stats.date}`
    : `a ${stats.gridSize}×${stats.gridSize} ${stats.difficulty}`;
  const badgeText = stats.badges?.length
    ? ` Badges: ${stats.badges.map(formatBadge).join(', ')}.`
    : '';
  const mistakeText = stats.mistakes !== undefined
    ? `, ${stats.mistakes === 1 ? '1 mistake' : `${stats.mistakes} mistakes`}`
    : '';

  return {
    title: 'SquareWise Puzzle Complete',
    text: `I solved ${puzzleLabel} SquareWise puzzle in ${formatTime(stats.time)} (${formatHintResult(stats)}${mistakeText}).${badgeText} Can you beat me?`,
    url: pageUrl,
  };
}
