import { describe, expect, it } from 'vitest';
import {
  createResourceRecoverySession,
  expectedEventDamage,
  positiveResourceMaximum,
  positiveResourceRecoveryAmount,
  simResourceId,
  simResourcePoolKey,
  simResourcePoolSet,
  type ResourceRecoveryEvidence,
  type SimResourcePool,
  type SimResourcePoolSet,
} from '../../../src/simulation/contracts';
import {
  resourceRecoveryEvidence,
  reviewedResourceRecoveryClauses,
} from '../../../src/simulation/coverage';
import {
  composeRoundDamageFolds,
  type DamageEventFold,
} from '../../../src/simulation/probability';

function ragePool(): SimResourcePool {
  const maximum = positiveResourceMaximum(2);
  const clause = reviewedResourceRecoveryClauses.rage;
  return {
    id: simResourceId('round-21:barbarian:rage'),
    logical_key: simResourcePoolKey('round-21:barbarian:rage'),
    source: clause.resource_source,
    maximum,
    recovery: {
      short_rest: {
        kind: 'fixed',
        amount: positiveResourceRecoveryAmount(1, maximum),
        evidence: resourceRecoveryEvidence(
          clause.resource_source,
          clause.id,
          {
            rest: 'short_rest',
            rule_kind: 'fixed',
            amount: 1,
            maximum,
          },
        ),
      },
      long_rest: {
        kind: 'all',
        evidence: resourceRecoveryEvidence(
          clause.resource_source,
          clause.id,
          {
            rest: 'long_rest',
            rule_kind: 'all',
            amount: null,
            maximum,
          },
        ),
      },
    },
  };
}

describe('round 21 identity-backed public gates', () => {
  it('classifies an unstable fold once and refuses its numeric arm', () => {
    let statusReads = 0;
    let evidenceReads = 0;
    let reasonReads = 0;
    const unstable = {
      get status(): 'available' | 'unavailable' {
        statusReads += 1;
        return statusReads === 1 ? 'unavailable' : 'available';
      },
      get evidence(): null {
        evidenceReads += 1;
        return null;
      },
      get reason(): string {
        reasonReads += 1;
        return 'The unstable fold is unavailable.';
      },
      expected_damage: expectedEventDamage(950),
      contributions: [],
    } as unknown as DamageEventFold;

    const result = composeRoundDamageFolds([unstable]);

    expect(statusReads).toBe(1);
    expect(evidenceReads).toBe(1);
    expect(reasonReads).toBe(1);
    expect(result).toEqual({
      status: 'unavailable',
      failures: [{
        status: 'unavailable',
        evidence: null,
        reason: 'The unstable fold is unavailable.',
      }],
    });
    expect(result).not.toHaveProperty('expected_damage');
  });

  it('refuses a fresh pool array carrying copied symbol descriptors', () => {
    const legitimate = simResourcePoolSet([ragePool()]);
    expect(Object.getOwnPropertySymbols(legitimate)).toHaveLength(1);
    const original = legitimate[0];
    if (original === undefined) {
      throw new Error('The legitimate Rage pool set must be nonempty.');
    }
    const duplicate: SimResourcePool = {
      ...original,
      logical_key: simResourcePoolKey('round-21:forged-duplicate'),
    };
    const forged = [original, duplicate];
    for (const symbol of Object.getOwnPropertySymbols(legitimate)) {
      const descriptor = Object.getOwnPropertyDescriptor(legitimate, symbol);
      if (descriptor === undefined) {
        throw new Error('The copied pool-set symbol must have a descriptor.');
      }
      Object.defineProperty(forged, symbol, descriptor);
    }

    expect(() => createResourceRecoverySession(
      forged as unknown as SimResourcePoolSet,
    )).toThrow('require a validated pool set');
  });

  it('rejects duplicate resource-pool IDs during construction', () => {
    const original = ragePool();
    const duplicate: SimResourcePool = {
      ...original,
      logical_key: simResourcePoolKey('round-21:duplicate-rage-id'),
    };

    expect(() => simResourcePoolSet([original, duplicate])).toThrow(
      `Duplicate simulation resource pool ID: ${original.id}.`,
    );
  });

  it('refuses spread recovery evidence with an inflated authorization', () => {
    const original = ragePool();
    const shortRest = original.recovery.short_rest;
    if (shortRest.kind !== 'fixed') {
      throw new Error('The reviewed Rage Short Rest rule must be fixed.');
    }
    expect(Object.isFrozen(shortRest.evidence)).toBe(true);
    const inflated = {
      ...shortRest.evidence,
      authorized_amount: positiveResourceRecoveryAmount(2, original.maximum),
    } as unknown as ResourceRecoveryEvidence;
    const forged: SimResourcePool = {
      ...original,
      recovery: {
        ...original.recovery,
        short_rest: {
          kind: 'fixed',
          amount: positiveResourceRecoveryAmount(2, original.maximum),
          evidence: inflated,
        },
      },
    };
    const session = createResourceRecoverySession(simResourcePoolSet([forged]));

    expect(() => session.recover(forged.id, 'short_rest', 2)).toThrow(
      'must be minted by the reviewed evidence path',
    );
  });

  it('keeps legitimate Rage Short Rest recovery at its reviewed one unit', () => {
    const rage = ragePool();
    const set = simResourcePoolSet([rage]);
    expect(Object.isFrozen(set)).toBe(true);

    expect(createResourceRecoverySession(set)
      .recover(rage.id, 'short_rest', 2)).toEqual({ recovered_units: 1 });
  });
});
