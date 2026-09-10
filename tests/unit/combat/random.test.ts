import { describe, expect, it } from 'vitest';
import {
  rollDie,
  transactionalRng,
  type Rng,
  type SerializableRng,
  type SerializableRngState,
} from '../../../src/combat/random';
import {
  isTransactionalRollRng,
  RollProvenance,
  rollOccurrenceId,
  rollOperationPath,
  type RollProvenanceRequest,
} from '../../../src/combat/roll-provenance';
import { dieSides } from '../../../src/combat/values';

const PROVENANCE: RollProvenanceRequest = {
  occurrenceId: rollOccurrenceId('random:test'),
  operationPath: rollOperationPath('healing/target'),
  source: null,
  targets: [],
};

describe('transactional random ingress', () => {
  it('history-backed adapters restore their scalar cursor for roll provenance', () => {
    let calls = 0;
    const source: Rng = () => {
      calls += 1;
      return 0.75;
    };
    const owner = RollProvenance.recording(transactionalRng(source));
    const rng = owner.asRng();
    const checkpoint = rng.checkpoint();
    expect(rollDie(rng, dieSides(8), PROVENANCE)).toBe(7);
    expect(owner.trace().attempts).toHaveLength(1);
    rng.restoreCheckpoint(checkpoint);
    expect(owner.trace().committedDraws).toHaveLength(0);
    expect(rollDie(rng, dieSides(8), PROVENANCE)).toBe(7);
    expect(calls).toBe(1);
  });

  it('serializable adapters forward and restore their base checkpoint', () => {
    let cursor = 0;
    const snapshots = (): SerializableRngState => ({
      algorithm: 'mulberry32-v1', initialSeed: 7, state: cursor, draws: cursor, streamId: 'random-test',
    });
    const source: SerializableRng = Object.assign(
      () => {
        cursor += 1;
        return 0.5;
      },
      {
        snapshot: snapshots,
        restore: (snapshot: SerializableRngState): void => { cursor = snapshot.state; },
      },
    );
    const rng = RollProvenance.recording(transactionalRng(source)).asRng();
    const checkpoint = rng.checkpoint();
    expect(rollDie(rng, dieSides(6), PROVENANCE)).toBe(4);
    expect(cursor).toBe(1);
    rng.restoreCheckpoint(checkpoint);
    expect(cursor).toBe(0);
    expect(rng.trace().committedDraws).toHaveLength(0);
  });

  it('recognized provenance ingress is not replaced by transactionalRng on either base adapter path', () => {
    const historical = RollProvenance.recording(transactionalRng(() => 0)).asRng();
    const serializableSource: SerializableRng = Object.assign(() => 0, {
      snapshot: (): SerializableRngState => ({
        algorithm: 'mulberry32-v1', initialSeed: 1, state: 1, draws: 0, streamId: 'serializable',
      }),
      restore: (): void => undefined,
    });
    const serializable = RollProvenance.recording(transactionalRng(serializableSource)).asRng();
    expect(transactionalRng(historical)).toBe(historical);
    expect(transactionalRng(serializable)).toBe(serializable);
    expect(isTransactionalRollRng(historical)).toBe(true);
    expect(isTransactionalRollRng(serializable)).toBe(true);
  });
});
