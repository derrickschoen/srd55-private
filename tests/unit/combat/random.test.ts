import { describe, expect, it } from 'vitest';
import {
  rollDie,
  transactionalRng,
  type DieRollProvenance,
  type Rng,
  type SerializableRng,
  type SerializableRngState,
} from '../../../src/combat/random';
import { dieSides } from '../../../src/combat/values';

const PROVENANCE: DieRollProvenance = {
  kind: 'healing', source: 'random-test', actor: 'combatant:healer', target: 'combatant:target',
};

describe('transactional die provenance', () => {
  it('forwards drawDie through a history-backed adapter and restores cursor plus observations', () => {
    let calls = 0;
    const source: Rng = Object.assign(
      () => {
        throw new Error('drawDie forwarding was bypassed');
      },
      {
        drawDie: (sides: ReturnType<typeof dieSides>, provenance: DieRollProvenance): number => {
          expect(sides).toBe(8);
          expect(provenance).toEqual(PROVENANCE);
          calls += 1;
          return 6;
        },
      },
    );
    const rng = transactionalRng(source);
    const checkpoint = rng.checkpoint();
    expect(rollDie(rng, dieSides(8), PROVENANCE)).toBe(6);
    expect(rng.dieRollHistory()).toEqual([{ face: 6, sides: 8, provenance: PROVENANCE }]);
    rng.restoreCheckpoint(checkpoint);
    expect(rng.dieRollHistory()).toEqual([]);
    expect(rollDie(rng, dieSides(8), PROVENANCE)).toBe(6);
    expect(calls).toBe(1);
    expect(rng.dieRollHistory()).toEqual([{ face: 6, sides: 8, provenance: PROVENANCE }]);
  });

  it('forwards drawDie and restores provenance observations for a serializable adapter', () => {
    let cursor = 0;
    const snapshots = (): SerializableRngState => ({
      algorithm: 'mulberry32-v1', initialSeed: 7, state: cursor, draws: cursor, streamId: 'random-test',
    });
    const source: SerializableRng = Object.assign(
      () => {
        cursor += 1;
        return 0;
      },
      {
        drawDie: (_sides: ReturnType<typeof dieSides>, _provenance: DieRollProvenance): number => {
          cursor += 1;
          return 4;
        },
        snapshot: snapshots,
        restore: (snapshot: SerializableRngState): void => { cursor = snapshot.state; },
      },
    );
    const rng = transactionalRng(source);
    const checkpoint = rng.checkpoint();
    expect(rollDie(rng, dieSides(6), PROVENANCE)).toBe(4);
    expect(cursor).toBe(1);
    rng.restoreCheckpoint(checkpoint);
    expect(cursor).toBe(0);
    expect(rng.dieRollHistory()).toEqual([]);
  });

  it('rejects replay when sides or provenance differs', () => {
    const rng = transactionalRng(Object.assign(() => 0, {
      drawDie: (): number => 2,
    }));
    const checkpoint = rng.checkpoint();
    rollDie(rng, dieSides(6), PROVENANCE);
    rng.restoreCheckpoint(checkpoint);
    expect(() => rollDie(rng, dieSides(8), PROVENANCE)).toThrow('provenance mismatch');
  });
});
