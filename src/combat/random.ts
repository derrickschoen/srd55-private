import type { DiceExpression, DiceRollTrace } from './resolution';
import type { DieSides } from './values';

export type Rng = () => number;

export interface SerializableRngState {
  readonly algorithm: 'mulberry32-v1';
  readonly initialSeed: number;
  readonly state: number;
  readonly draws: number;
  readonly streamId: string;
}

export interface SerializableRng extends Rng {
  snapshot(): SerializableRngState;
}

function createMulberry32(state: SerializableRngState): SerializableRng {
  let current = state.state >>> 0;
  let draws = state.draws;
  return Object.assign(
    function rng(): number {
      current = (current + 0x6d2b79f5) >>> 0;
      draws += 1;
      let mixed = Math.imul(current ^ (current >>> 15), 1 | current);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    },
    {
      snapshot: (): SerializableRngState => ({
        algorithm: 'mulberry32-v1',
        initialSeed: state.initialSeed >>> 0,
        state: current,
        draws,
        streamId: state.streamId,
      }),
    },
  );
}

/** Small seeded PRNG (mulberry32) for reproducible runs and tests. */
export function mulberry32(seed: number): SerializableRng {
  const normalized = seed >>> 0;
  return createMulberry32({
    algorithm: 'mulberry32-v1',
    initialSeed: normalized,
    state: normalized,
    draws: 0,
    streamId: `seed:${normalized}`,
  });
}

export function restoreMulberry32(state: SerializableRngState): SerializableRng {
  if (
    state.algorithm !== 'mulberry32-v1' ||
    !Number.isSafeInteger(state.initialSeed) ||
    !Number.isSafeInteger(state.state) ||
    !Number.isSafeInteger(state.draws) ||
    state.draws < 0 ||
    state.streamId.length === 0
  ) {
    throw new TypeError('Malformed serializable RNG state.');
  }
  return createMulberry32(state);
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
  if (
    expression.minimumTotal !== undefined &&
    (!Number.isSafeInteger(expression.minimumTotal) || expression.minimumTotal < 0)
  ) {
    throw new RangeError('Minimum dice total must be a non-negative safe integer.');
  }
  if (
    expression.maximumTotal !== undefined &&
    (!Number.isSafeInteger(expression.maximumTotal) || expression.maximumTotal < 0)
  ) {
    throw new RangeError('Maximum dice total must be a non-negative safe integer.');
  }
  if (
    expression.minimumTotal !== undefined &&
    expression.maximumTotal !== undefined &&
    expression.minimumTotal > expression.maximumTotal
  ) {
    throw new RangeError('Minimum dice total cannot exceed maximum dice total.');
  }
  if (
    expression.rerollBelow !== undefined &&
    (!Number.isSafeInteger(expression.rerollBelow.threshold) ||
      expression.rerollBelow.threshold < 2 ||
      expression.rerollBelow.threshold > expression.sides ||
      expression.rerollBelow.maximumRerollsPerDie !== 1)
  ) {
    throw new RangeError('Reroll threshold must be from 2 through the die size and apply once per die.');
  }

  const faces: number[] = [];
  const rerolls: Array<{ readonly dieIndex: number; readonly discarded: number; readonly replacement: number }> = [];
  const explosionFaces: number[] = [];
  for (let index = 0; index < expression.count; index += 1) {
    const first = rollDie(rng, expression.sides);
    const face = expression.rerollBelow !== undefined && first < expression.rerollBelow.threshold
      ? (() => {
          const replacement = rollDie(rng, expression.sides);
          rerolls.push({ dieIndex: index, discarded: first, replacement });
          return replacement;
        })()
      : first;
    faces.push(face);
    if (
      expression.explosion?.triggerFace === 'maximum' &&
      expression.explosion.maximumExplosionsPerDie === 1 &&
      face === expression.sides
    ) {
      const explosion = rollDie(rng, expression.sides);
      faces.push(explosion);
      explosionFaces.push(explosion);
    }
  }
  return {
    expression,
    faces,
    ...(rerolls.length === 0 ? {} : { rerolls }),
    ...(explosionFaces.length === 0 ? {} : { explosionFaces }),
    total: Math.min(
      expression.maximumTotal ?? Number.POSITIVE_INFINITY,
      Math.max(
        expression.minimumTotal ?? Number.NEGATIVE_INFINITY,
        faces.reduce((sum, face) => sum + face, expression.modifier),
      ),
    ),
  };
}
