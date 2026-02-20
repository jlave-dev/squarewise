/**
 * Easing functions for smooth animations
 */
export const easings = {
  linear: (t: number): number => t,

  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => --t * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  easeOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },

  easeOutBounce: (t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },

  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export type EasingFunction = (t: number) => number;

/**
 * Animation state interface
 */
export interface Animation {
  startTime: number;
  duration: number;
  easing: EasingFunction;
  from: number;
  to: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

/**
 * Animation manager for running multiple animations
 */
export class AnimationManager {
  private animations: Animation[] = [];
  private animationId: number | null = null;

  /**
   * Start a new animation
   */
  animate(
    from: number,
    to: number,
    duration: number,
    easing: EasingFunction,
    onUpdate: (value: number) => void,
    onComplete?: () => void
  ): () => void {
    const animation: Animation = {
      startTime: performance.now(),
      duration,
      easing,
      from,
      to,
      onUpdate,
      onComplete,
    };

    this.animations.push(animation);

    if (!this.animationId) {
      this.tick();
    }

    // Return cancel function
    return () => {
      const index = this.animations.indexOf(animation);
      if (index > -1) {
        this.animations.splice(index, 1);
      }
    };
  }

  private tick = (): void => {
    const now = performance.now();
    const completed: Animation[] = [];

    for (const anim of this.animations) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const easedProgress = anim.easing(progress);
      const value = anim.from + (anim.to - anim.from) * easedProgress;

      anim.onUpdate(value);

      if (progress >= 1) {
        completed.push(anim);
        anim.onComplete?.();
      }
    }

    // Remove completed animations
    for (const anim of completed) {
      const index = this.animations.indexOf(anim);
      if (index > -1) {
        this.animations.splice(index, 1);
      }
    }

    if (this.animations.length > 0) {
      this.animationId = requestAnimationFrame(this.tick);
    } else {
      this.animationId = null;
    }
  };

  /**
   * Stop all animations
   */
  stopAll(): void {
    this.animations = [];
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

/**
 * Utility for smooth value transitions
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
