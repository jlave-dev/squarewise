import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SeededRNG, createRNG, dateToSeed } from '../src/utils/rng';

test('SeededRNG produces deterministic sequence for numeric seed', () => {
  const a = new SeededRNG(12345);
  const b = new SeededRNG(12345);

  const seqA = Array.from({ length: 8 }, () => a.next());
  const seqB = Array.from({ length: 8 }, () => b.next());

  assert.deepEqual(seqA, seqB);
});

test('string seed behavior is deterministic and distinct from other strings', () => {
  const one = createRNG('daily-2026-02-20');
  const two = createRNG('daily-2026-02-20');
  const three = createRNG('daily-2026-02-21');

  const seqOne = Array.from({ length: 5 }, () => one.next());
  const seqTwo = Array.from({ length: 5 }, () => two.next());
  const seqThree = Array.from({ length: 5 }, () => three.next());

  assert.deepEqual(seqOne, seqTwo);
  assert.notDeepEqual(seqOne, seqThree);
});

test('nextInt is inclusive and bounded', () => {
  const rng = createRNG(777);

  for (let i = 0; i < 500; i++) {
    const value = rng.nextInt(3, 7);
    assert.ok(value >= 3);
    assert.ok(value <= 7);
    assert.equal(Number.isInteger(value), true);
  }
});

test('nextFloat is bounded in [min, max)', () => {
  const rng = createRNG(888);

  for (let i = 0; i < 500; i++) {
    const value = rng.nextFloat(-2.5, 4.25);
    assert.ok(value >= -2.5);
    assert.ok(value < 4.25);
  }
});

test('nextBool honors probability edge cases', () => {
  const rng = createRNG(999);

  for (let i = 0; i < 100; i++) {
    assert.equal(rng.nextBool(0), false);
    assert.equal(rng.nextBool(1), true);
  }
});

test('pick returns only elements from source array and is deterministic by seed', () => {
  const items = ['A', 'B', 'C', 'D'];
  const one = createRNG(1234);
  const two = createRNG(1234);

  const picksOne = Array.from({ length: 20 }, () => one.pick(items));
  const picksTwo = Array.from({ length: 20 }, () => two.pick(items));

  assert.deepEqual(picksOne, picksTwo);
  for (const pick of picksOne) {
    assert.ok(items.includes(pick));
  }
});

test('shuffle returns permutation, mutates in place, and is deterministic by seed', () => {
  const base = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = [...base];
  const b = [...base];

  const rngA = createRNG(4321);
  const rngB = createRNG(4321);

  const shuffledA = rngA.shuffle(a);
  const shuffledB = rngB.shuffle(b);

  assert.equal(shuffledA, a);
  assert.deepEqual(shuffledA, shuffledB);
  assert.deepEqual([...shuffledA].sort((x, y) => x - y), base);
});

test('dateToSeed is deterministic and matches string-seeded SeededRNG hashing', () => {
  const seedA = dateToSeed('2026-02-20');
  const seedB = dateToSeed('2026-02-20');
  const seedC = dateToSeed('2026-02-21');

  assert.equal(seedA, seedB);
  assert.notEqual(seedA, seedC);

  const expected = new SeededRNG('2026-02-20').getSeed();
  assert.equal(seedA, expected);
});
