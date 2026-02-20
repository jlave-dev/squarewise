import { AnimationManager, easings, lerp } from '../utils/animations';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/**
 * Effects renderer for animations and particles
 */
export class EffectsRenderer {
  private ctx: CanvasRenderingContext2D;
  private animationManager: AnimationManager;
  private particles: Particle[] = [];
  private shakeOffset = { x: 0, y: 0 };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.animationManager = new AnimationManager();
  }

  /**
   * Animate cell selection
   */
  animateCellSelect(x: number, y: number, size: number, onComplete?: () => void): void {
    this.animationManager.animate(
      0,
      1,
      200,
      easings.easeOutCubic,
      (progress) => {
        // This would be integrated with the main renderer
      },
      onComplete
    );
  }

  /**
   * Animate number entry
   */
  animateNumberEntry(x: number, y: number, size: number, value: number): void {
    // Scale animation for number appearance
    this.animationManager.animate(
      0.5,
      1,
      150,
      easings.easeOutBack,
      (scale) => {
        // Scale would be applied during render
      }
    );
  }

  /**
   * Shake animation for errors
   */
  shake(intensity: number = 5, duration: number = 300): void {
    const startTime = performance.now();

    const doShake = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        const decay = 1 - progress;
        this.shakeOffset.x = (Math.random() - 0.5) * intensity * decay;
        this.shakeOffset.y = (Math.random() - 0.5) * intensity * decay;
        requestAnimationFrame(doShake);
      } else {
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
      }
    };

    doShake();
  }

  /**
   * Get current shake offset
   */
  getShakeOffset(): { x: number; y: number } {
    return { ...this.shakeOffset };
  }

  /**
   * Trigger confetti celebration
   */
  confetti(originX: number, originY: number): void {
    const colors = ['#6366F1', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4'];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const velocity = 3 + Math.random() * 5;

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 5,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /**
   * Trigger sparkle effect at position
   */
  sparkle(x: number, y: number): void {
    const colors = ['#FFD700', '#FFA500', '#FF6347'];

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 1 + Math.random() * 2;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
        maxLife: 30 + Math.random() * 20,
        size: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /**
   * Update and render particles
   */
  updateAndRender(): void {
    this.ctx.save();

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.life = 1 - (this.particles.filter((_, idx) => idx <= i).length - (this.particles.length - i)) / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Render particle
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * Check if any effects are active
   */
  hasActiveEffects(): boolean {
    return this.particles.length > 0;
  }

  /**
   * Clear all effects
   */
  clear(): void {
    this.particles = [];
    this.animationManager.stopAll();
    this.shakeOffset = { x: 0, y: 0 };
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.clear();
  }
}
