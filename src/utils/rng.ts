/**
 * Seeded random number generator using mulberry32 algorithm.
 * Provides deterministic random sequences for reproducible puzzle generation.
 */
export class SeededRNG {
  private seed: number;

  constructor(seed: number | string) {
    // Convert string seeds to numbers using hash function
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed);
    } else {
      this.seed = seed >>> 0; // Ensure unsigned 32-bit integer
    }
  }

  /**
   * Hash a string to a number (djb2 algorithm)
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash >>> 0; // Keep as unsigned 32-bit
    }
    return hash;
  }

  /**
   * Get next random number between 0 and 1 (mulberry32)
   */
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Get random integer in range [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Get random boolean with optional probability
   */
  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Get current seed (for saving/reproducing)
   */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * Create a seeded RNG instance
 */
export function createRNG(seed: number | string): SeededRNG {
  return new SeededRNG(seed);
}

/**
 * Generate a deterministic seed from date string (for daily puzzles)
 */
export function dateToSeed(dateStr: string): number {
  // Format: YYYY-MM-DD
  const rng = new SeededRNG(dateStr);
  return rng.getSeed();
}
