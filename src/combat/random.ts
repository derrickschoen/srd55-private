import type { DiceExpression, DiceRollTrace } from './resolution';
import {
  exactWeight,
  isTransactionalRollRng,
  type RollComponentRef,
  type RollDrawRole,
  type RollProvenanceRequest,
} from './roll-provenance';
import type { DieSides } from './values';

export interface Rng {
  (): number;
}

export interface SerializableRngState {
  readonly algorithm: 'mulberry32-v1';
  readonly initialSeed: number;
  readonly state: number;
  readonly draws: number;
  readonly streamId: string;
}

export interface SerializableRng extends Rng {
  snapshot(): SerializableRngState;
  restore(snapshot: SerializableRngState): void;
}

export interface TransactionalRng extends Rng {
  checkpoint(): RngCheckpoint;
  restoreCheckpoint(checkpoint: RngCheckpoint): void;
}

export interface RngCheckpoint {
  restore(): void;
}

function assertCompatibleSnapshot(
  snapshot: SerializableRngState,
  identity: Pick<SerializableRngState, 'initialSeed' | 'streamId'>,
): void {
  if (
    snapshot.algorithm !== 'mulberry32-v1' ||
    !Number.isSafeInteger(snapshot.initialSeed) ||
    !Number.isSafeInteger(snapshot.state) ||
    !Number.isSafeInteger(snapshot.draws) ||
    snapshot.draws < 0 ||
    snapshot.initialSeed !== identity.initialSeed ||
    snapshot.streamId !== identity.streamId
  ) throw new TypeError('Malformed or incompatible serializable RNG state.');
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
      restore: (snapshot: SerializableRngState): void => {
        assertCompatibleSnapshot(snapshot, state);
        current = snapshot.state >>> 0;
        draws = snapshot.draws;
      },
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

const transactionalAdapters = new WeakMap<Rng, TransactionalRng>();

function isTransactional(rng: Rng): rng is TransactionalRng {
  const candidate = rng as Partial<TransactionalRng>;
  return typeof candidate.checkpoint === 'function' && typeof candidate.restoreCheckpoint === 'function';
}

function isSerializableRng(rng: Rng): rng is SerializableRng {
  const candidate = rng as Partial<SerializableRng>;
  return typeof candidate.snapshot === 'function' && typeof candidate.restore === 'function';
}

/** Gives every reducer RNG a restorable cursor without changing its call shape. */
export function transactionalRng(rng: Rng): TransactionalRng {
  if (isTransactional(rng)) return rng;
  const existing = transactionalAdapters.get(rng);
  if (existing !== undefined) return existing;
  if (isSerializableRng(rng)) {
    const adapted: TransactionalRng = Object.assign(rng, {
      checkpoint: (): RngCheckpoint => {
        const snapshot = rng.snapshot();
        return { restore: (): void => {
          rng.restore(snapshot);
        } };
      },
      restoreCheckpoint: (checkpoint: RngCheckpoint): void => checkpoint.restore(),
    });
    transactionalAdapters.set(rng, adapted);
    return adapted;
  }
  const history: number[] = [];
  let cursor = 0;
  const adapted: TransactionalRng = Object.assign(
    (): number => {
      const replayed = history[cursor];
      if (replayed !== undefined) {
        cursor += 1;
        return replayed;
      }
      const drawn = rng();
      history.push(drawn);
      cursor += 1;
      return drawn;
    },
    {
      checkpoint: (): RngCheckpoint => {
        const savedCursor = cursor;
        return { restore: (): void => {
          cursor = savedCursor;
        } };
      },
      restoreCheckpoint: (checkpoint: RngCheckpoint): void => checkpoint.restore(),
    },
  );
  transactionalAdapters.set(rng, adapted);
  transactionalAdapters.set(adapted, adapted);
  return adapted;
}

export function rollDie(
  rng: Rng,
  sides: DieSides,
  provenance: RollProvenanceRequest,
): number {
  if (!isTransactionalRollRng(rng)) return Math.floor(rng() * sides) + 1;
  const outcomes = Array.from({ length: sides }, (_, index) => ({
    total: index + 1,
    weight: exactWeight(1n, BigInt(sides)),
  }));
  const component = rng.beginComponent(provenance, { kind: 'discrete_branch', outcomes });
  const face = rng.draw({ sides, provenance: component, role: { kind: 'branch_selection' } });
  rng.finishComponent(component, face);
  return face;
}

function drawComponentFace(
  rng: Rng,
  sides: DieSides,
  component: RollComponentRef | null,
  role: RollDrawRole,
): number {
  return component === null || !isTransactionalRollRng(rng)
    ? Math.floor(rng() * sides) + 1
    : rng.draw({ sides, provenance: component, role });
}

export function rollDice(
  rng: Rng,
  expression: DiceExpression,
  provenance: RollProvenanceRequest,
): DiceRollTrace {
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
  const component = isTransactionalRollRng(rng)
    ? rng.beginComponent(provenance, { kind: 'dice_expression', expression })
    : null;
  for (let index = 0; index < expression.count; index += 1) {
    const first = drawComponentFace(rng, expression.sides, component, { kind: 'ordinary_face', dieIndex: index });
    const face = expression.rerollBelow !== undefined && first < expression.rerollBelow.threshold
      ? (() => {
          const replacement = drawComponentFace(
            rng, expression.sides, component, { kind: 'reroll_replacement', dieIndex: index, attempt: 1 },
          );
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
      const explosion = drawComponentFace(
        rng, expression.sides, component, { kind: 'explosion', dieIndex: index, explosion: 1 },
      );
      faces.push(explosion);
      explosionFaces.push(explosion);
    }
  }
  const total = Math.min(
    expression.maximumTotal ?? Number.POSITIVE_INFINITY,
    Math.max(
      expression.minimumTotal ?? Number.NEGATIVE_INFINITY,
      faces.reduce((sum, face) => sum + face, expression.modifier),
    ),
  );
  if (component !== null && isTransactionalRollRng(rng)) rng.finishComponent(component, total);
  return {
    expression,
    faces,
    ...(rerolls.length === 0 ? {} : { rerolls }),
    ...(explosionFaces.length === 0 ? {} : { explosionFaces }),
    total,
  };
}
