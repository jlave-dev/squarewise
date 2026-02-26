export interface WinShareStats {
  time: number;
  hintsUsed: number;
  difficulty: string;
  gridSize: number;
  isNewBest: boolean;
}

export interface SharePayload {
  title: string;
  text: string;
  url: string;
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

export function buildWinSharePayload(stats: WinShareStats, pageUrl: string): SharePayload {
  return {
    title: 'SquareWise Puzzle Complete',
    text: `I solved a ${stats.gridSize}×${stats.gridSize} ${stats.difficulty} SquareWise puzzle in ${formatTime(stats.time)} (${formatHints(stats.hintsUsed)}). Can you beat me?`,
    url: pageUrl,
  };
}
