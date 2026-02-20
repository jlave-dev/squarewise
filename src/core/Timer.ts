/**
 * Game timer with start/stop/pause functionality
 */
export class Timer {
  private startTime: number = 0;
  private elapsed: number = 0;
  private running: boolean = false;
  private wasRunningBeforeHidden: boolean = false;
  private intervalId: number | null = null;
  private onTick: ((elapsed: number) => void) | null = null;
  private hiddenAt: number | null = null;
  private totalHiddenTime: number = 0;

  constructor(onTick?: (elapsed: number) => void) {
    this.onTick = onTick ?? null;
    this.setupVisibilityHandler();
  }

  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden - pause and record when hidden started
        if (this.running) {
          this.wasRunningBeforeHidden = true;
          this.hiddenAt = performance.now();
          this.pause();
        }
      } else {
        // Page is visible again - adjust for time spent hidden
        if (this.hiddenAt !== null) {
          this.hiddenAt = null;
          if (this.wasRunningBeforeHidden) {
            this.wasRunningBeforeHidden = false;
            this.start();
          }
        }
      }
    });
  }

  /**
   * Start or resume the timer
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.startTime = performance.now() - this.elapsed * 1000;

    this.intervalId = window.setInterval(() => {
      this.elapsed = this.getElapsedSeconds();
      this.onTick?.(this.elapsed);
    }, 100);
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (!this.running) return;

    this.running = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.elapsed = this.getElapsedSeconds();
  }

  /**
   * Stop and reset the timer
   */
  reset(): void {
    this.pause();
    this.elapsed = 0;
    this.startTime = 0;
    this.hiddenAt = null;
    this.totalHiddenTime = 0;
    this.wasRunningBeforeHidden = false;
  }

  /**
   * Get current elapsed time in seconds
   */
  getElapsedSeconds(): number {
    if (!this.running) return this.elapsed;
    const currentHiddenTime = this.hiddenAt !== null
      ? this.totalHiddenTime + (performance.now() - this.hiddenAt)
      : this.totalHiddenTime;
    return Math.floor((performance.now() - this.startTime - currentHiddenTime) / 1000);
  }

  /**
   * Get formatted time string (MM:SS)
   */
  getFormattedTime(): string {
    const totalSeconds = this.getElapsedSeconds();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get formatted time string with hours (HH:MM:SS)
   */
  getFormattedTimeWithHours(): string {
    const totalSeconds = this.getElapsedSeconds();
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return this.getFormattedTime();
  }

  /**
   * Set elapsed time (for loading saved games)
   */
  setElapsed(seconds: number): void {
    this.elapsed = seconds;
    this.startTime = performance.now() - seconds * 1000;
    this.hiddenAt = null;
    this.totalHiddenTime = 0;
    this.wasRunningBeforeHidden = false;
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Set callback for tick events
   */
  setOnTick(callback: (elapsed: number) => void): void {
    this.onTick = callback;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.pause();
    this.onTick = null;
  }
}

/**
 * Format seconds to MM:SS string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
