import type { DiceExpression, DiceRollTrace } from './resolution';
import type { DieSides } from './values';

export type Rng = () => number;

/** Small seeded PRNG (mulberry32) for reproducible runs and tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDie(rng: Rng, sides: DieSides): number {
  return Math.floor(rng() * sides) + 1;
}

export function rollDice(rng: Rng, expression: DiceExpression): DiceRollTrace {
  if (!Number.isInteger(expression.count) || expression.count < 0) {
    throw new RangeError('Dice count must be a non-negative integer.');
  }
  if (!Number.isFinite(expression.modifier)) {
    throw new RangeError('Dice modifier must be finite.');
  }

  const faces: number[] = [];
  for (let index = 0; index < expression.count; index += 1) {
    faces.push(rollDie(rng, expression.sides));
  }
  return {
    expression,
    faces,
    total: faces.reduce((sum, face) => sum + face, expression.modifier),
  };
}
