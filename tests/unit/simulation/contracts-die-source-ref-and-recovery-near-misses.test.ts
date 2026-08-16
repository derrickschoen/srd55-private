import { describe, expect, it } from 'vitest';
/*
 * Top-level side-effect import of the module under test. Stryker selects tests
 * per mutant from the STATIC import graph, so a file that reaches
 * `src/simulation/contracts.ts` only through a dynamic `import()` inside a test
 * body is invisible to that selection and its kills never count. The named
 * imports below already pull the module in; this line states the requirement
 * so a later refactor of the named imports cannot silently drop it.
 */
import '../../../src/simulation/contracts';
import { damageType, type DieSize } from '../../../src/domain/enums';
import type {
  ContentKey,
  SourceInstanceId,
} from '../../../src/domain/ids';
import {
  createResourceRecoverySession,
  positiveDiceCount,
  positiveResourceMaximum,
  positiveResourceRecoveryAmount,
  resourceRecoveryEvidence,
  reviewedResourceRecoveryClauses,
  simResourceId,
  simResourcePoolKey,
  simResourcePoolSet,
  snapshotDamageInstance,
  snapshotDicePool,
  sourceStableKey,
  type DamageComponent,
  type DamageInstance,
  type NonEmptyReadonlyArray,
  type SimResourcePool,
  type SourceRef,
} from '../../../src/simulation/contracts';

/**
 * Three families of near-miss probes against `src/simulation/contracts.ts`:
 *
 * 1. `snapshotDicePool` / `snapshotDamageType` — the two runtime guards that
 *    stand behind a compile-time-only type. Every probe here is a value that
 *    TYPE-CHECKS at the boundary the callers actually cross (a `DieSize` read
 *    off disk, a `DamageType` read out of a stored routine) but is wrong at
 *    runtime. Each operand of each guard is made decisive on its own, because
 *    a guard whose operands are only ever true together is indistinguishable
 *    from a guard with one operand deleted.
 *
 * 2. `sameSourceRef` — a field-by-field equality. Every probe is a PAIR whose
 *    two sides differ in EXACTLY ONE field; everything else is held equal. A
 *    probe that varied two fields at once (as the existing cleric-borrows-rage
 *    case does — different content key AND different stable key) is red for the
 *    wrong reason and pins nothing. `sameSourceRef` is private, so the pairs
 *    are driven through its two callers in this module:
 *    `resourceRecoveryEvidence` (reviewed clause source vs. caller source) and
 *    `ResourceRecoverySession.recover` (pool source vs. evidence source, via
 *    `assertRecoveryEvidenceIsBound`).
 *
 * 3. `ResourceRecoverySession.recover` — the interplay between the D267
 *    bounded counter and the once-per-long-rest latch. The latch must be
 *    burned by a recovery that actually returned units, and only by one; a
 *    short rest taken at full availability recovers nothing and must therefore
 *    leave the latch alone.
 *
 * Four node variants in these three regions are EQUIVALENT — no test can
 * distinguish them over inputs this module can actually be handed — and are
 * deliberately not chased:
 *
 * - `typeof die !== 'number'` deleted from the dice guard. `isDieSize` is
 *   `dieSizes.includes(candidate)`, a SameValueZero scan over number literals,
 *   so it is false for EVERY non-number; the second operand already subsumes
 *   the first, and dropping the first only stops a short circuit.
 * - `left.kind !== right.kind` deleted from the `sameSourceRef` guard. With
 *   the kinds unequal, control reaches a switch arm on `left.kind` whose first
 *   conjunct is `right.kind === left.kind` — false — so every arm returns the
 *   same `false` the early return produced.
 * - `A && !used` weakened to `A || !used`, and `A` alone forced true, in the
 *   latch condition. Both differ from the original only when `A` is false,
 *   i.e. when the short-rest rule is not `fixed_once_per_long_rest`; the latch
 *   is read only by that rule kind. A long-rest rule of that kind is not
 *   constructible (`resourceRecoveryEvidence` authorizes long rests only as
 *   `all`), and `simResourcePoolSet` forces logical keys — the latch keys — to
 *   be unique, so no other pool can observe the stray write either.
 */

const RAGE_CLAUSE = reviewedResourceRecoveryClauses.rage;
const SORCEROUS_RESTORATION_CLAUSE =
  reviewedResourceRecoveryClauses.sorcerous_restoration;
const FONT_OF_MAGIC_CLAUSE = reviewedResourceRecoveryClauses.font_of_magic;

const DAMAGE_TYPE_REASON =
  'Damage type must be nonempty and contain no NUL bytes.';
const UNESTABLISHED_REASON =
  'does not establish recovery for this resource source';

function dicePoolWith(die: unknown): { count: ReturnType<typeof positiveDiceCount>; die: DieSize } {
  return { count: positiveDiceCount(1), die: die as DieSize };
}

const DICE_COMPONENTS: NonEmptyReadonlyArray<DamageComponent> = [
  { kind: 'dice', pool: { count: positiveDiceCount(2), die: 6 } },
];

function damageInstanceWith(value: unknown): DamageInstance {
  return {
    source: RAGE_CLAUSE.resource_source,
    damage_type: value as DamageInstance['damage_type'],
    components: DICE_COMPONENTS,
  };
}

/** The reviewed Rage source, rebuilt field by field so probes can vary one. */
function rageSourceWith(
  overrides: { readonly contentKey?: string; readonly stableKey?: string },
): SourceRef {
  const reviewed = RAGE_CLAUSE.resource_source;
  return {
    kind: 'catalog_content',
    content_key: (overrides.contentKey ?? String(reviewed.content_key)) as ContentKey,
    stable_key: sourceStableKey(
      overrides.stableKey ?? String(reviewed.stable_key),
    ),
  };
}

const RAGE_SHORT_REST_AUTHORIZATION = {
  rest: 'short_rest',
  rule_kind: 'fixed',
  amount: 1,
  maximum: 2,
} as const;

describe('die-size and damage-type runtime guards', () => {
  it('accepts a well-formed dice pool and freezes the snapshot', () => {
    const snapshot = snapshotDicePool({ count: positiveDiceCount(3), die: 8 });
    expect(snapshot).toEqual({ count: 3, die: 8 });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('refuses an in-type integer that is not one of the die sizes', () => {
    // `typeof die !== 'number'` is FALSE here, so `!isDieSize(die)` is the only
    // operand that can refuse: it is decisive on its own, and the disjunction
    // must remain a disjunction.
    expect(() => snapshotDicePool(dicePoolWith(7))).toThrow(
      'Die size is invalid: 7.',
    );
    expect(() => snapshotDicePool(dicePoolWith(7))).toThrow(RangeError);
    expect(() => snapshotDicePool(dicePoolWith(0))).toThrow(
      'Die size is invalid: 0.',
    );
    expect(() => snapshotDicePool(dicePoolWith(6.5))).toThrow(
      'Die size is invalid: 6.5.',
    );
    expect(() => snapshotDicePool(dicePoolWith(Number.NaN))).toThrow(
      'Die size is invalid: NaN.',
    );
  });

  it('refuses a non-number die that stringifies like a die size', () => {
    expect(() => snapshotDicePool(dicePoolWith('6'))).toThrow(
      'Die size is invalid: 6.',
    );
    expect(() => snapshotDicePool(dicePoolWith(null))).toThrow(
      'Die size is invalid: null.',
    );
    expect(() => snapshotDicePool(dicePoolWith(undefined))).toThrow(
      'Die size is invalid: undefined.',
    );
  });

  it('accepts a well-formed damage instance', () => {
    const snapshot = snapshotDamageInstance(
      damageInstanceWith(damageType('Fire')),
    );
    expect(snapshot.damage_type).toBe('Fire');
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('refuses an empty damage type without falling through to the NUL scan', () => {
    // `typeof value !== 'string'` is FALSE and the NUL scan is FALSE, so the
    // length operand is the only one that can refuse.
    expect(() => snapshotDamageInstance(damageInstanceWith(''))).toThrow(
      DAMAGE_TYPE_REASON,
    );
    expect(() => snapshotDamageInstance(damageInstanceWith(''))).toThrow(
      TypeError,
    );
  });

  it('refuses a nonempty damage type carrying a NUL byte', () => {
    expect(() =>
      snapshotDamageInstance(damageInstanceWith('Fi\u0000re')),
    ).toThrow(DAMAGE_TYPE_REASON);
  });

  it('refuses a non-string damage type with the guard reason, not a member-access crash', () => {
    // The message is load-bearing: with the `typeof` operand removed, `42` and
    // `{}` reach `value.includes(...)` and still throw a TypeError — but the
    // wrong one, from a missing method rather than from the contract.
    expect(() => snapshotDamageInstance(damageInstanceWith(42))).toThrow(
      DAMAGE_TYPE_REASON,
    );
    expect(() =>
      snapshotDamageInstance(damageInstanceWith({ length: 4 })),
    ).toThrow(DAMAGE_TYPE_REASON);
    expect(() => snapshotDamageInstance(damageInstanceWith(null))).toThrow(
      DAMAGE_TYPE_REASON,
    );
  });
});

describe('sameSourceRef near-miss pairs through resourceRecoveryEvidence', () => {
  it('mints evidence for a rebuilt source equal in every field', () => {
    const evidence = resourceRecoveryEvidence(
      rageSourceWith({}),
      RAGE_CLAUSE.id,
      RAGE_SHORT_REST_AUTHORIZATION,
    );
    expect(evidence.authorized_rest).toBe('short_rest');
    expect(evidence.authorized_amount).toBe(1);
  });

  it('refuses a source differing from the reviewed clause only in content_key', () => {
    expect(() =>
      resourceRecoveryEvidence(
        rageSourceWith({ contentKey: 'srd-5.2.1:class:barbarian:rage:copy' }),
        RAGE_CLAUSE.id,
        RAGE_SHORT_REST_AUTHORIZATION,
      ),
    ).toThrow(UNESTABLISHED_REASON);
  });

  it('refuses a source differing from the reviewed clause only in stable_key', () => {
    expect(() =>
      resourceRecoveryEvidence(
        rageSourceWith({ stableKey: 'srd-5.2.1:class:barbarian:rage:copy' }),
        RAGE_CLAUSE.id,
        RAGE_SHORT_REST_AUTHORIZATION,
      ),
    ).toThrow(UNESTABLISHED_REASON);
  });

  it('refuses a source differing from the reviewed clause only in kind', () => {
    const asCharacterSource: SourceRef = {
      kind: 'character_source',
      source_instance_id: 1 as SourceInstanceId,
      stable_key: RAGE_CLAUSE.resource_source.stable_key,
    };
    expect(() =>
      resourceRecoveryEvidence(
        asCharacterSource,
        RAGE_CLAUSE.id,
        RAGE_SHORT_REST_AUTHORIZATION,
      ),
    ).toThrow(UNESTABLISHED_REASON);
  });
});

describe('sameSourceRef near-miss pairs through recovery evidence binding', () => {
  const maximum = positiveResourceMaximum(2);

  function ragePoolWithSource(source: SourceRef): SimResourcePool {
    return {
      id: simResourceId('barbarian:rage'),
      logical_key: simResourcePoolKey('barbarian:rage'),
      source,
      maximum,
      recovery: {
        short_rest: {
          kind: 'fixed',
          amount: positiveResourceRecoveryAmount(1, maximum),
          evidence: resourceRecoveryEvidence(
            RAGE_CLAUSE.resource_source,
            RAGE_CLAUSE.id,
            RAGE_SHORT_REST_AUTHORIZATION,
          ),
        },
        long_rest: { kind: 'none' },
      },
    };
  }

  function recoverShortRest(source: SourceRef): () => unknown {
    const pool = ragePoolWithSource(source);
    const session = createResourceRecoverySession(simResourcePoolSet([pool]));
    session.spend(pool.id, 1);
    return () => session.recover(pool.id, 'short_rest');
  }

  it('recovers when the pool source equals the evidence source in every field', () => {
    expect(recoverShortRest(rageSourceWith({}))()).toEqual({
      recovered_units: 1,
    });
  });

  it('refuses a pool source differing from its evidence only in content_key', () => {
    expect(
      recoverShortRest(
        rageSourceWith({ contentKey: 'srd-5.2.1:class:barbarian:rage:copy' }),
      ),
    ).toThrow('not bound to this pool, rest, and recovery rule');
  });

  it('refuses a pool source differing from its evidence only in stable_key', () => {
    expect(
      recoverShortRest(
        rageSourceWith({ stableKey: 'srd-5.2.1:class:barbarian:rage:copy' }),
      ),
    ).toThrow('not bound to this pool, rest, and recovery rule');
  });

  it('refuses a pool source differing from its evidence only in kind', () => {
    expect(
      recoverShortRest({
        kind: 'character_source',
        source_instance_id: 1 as SourceInstanceId,
        stable_key: RAGE_CLAUSE.resource_source.stable_key,
      }),
    ).toThrow('not bound to this pool, rest, and recovery rule');
  });
});

describe('once-per-long-rest latch versus the D267 bounded counter', () => {
  const maximum = positiveResourceMaximum(10);
  const sorcerySource = SORCEROUS_RESTORATION_CLAUSE.resource_source;

  function sorceryPointsPool(): SimResourcePool {
    return {
      id: simResourceId('sorcerer:sorcery-points'),
      logical_key: simResourcePoolKey('sorcerer:sorcery-points'),
      source: sorcerySource,
      maximum,
      recovery: {
        short_rest: {
          kind: 'fixed_once_per_long_rest',
          amount: positiveResourceRecoveryAmount(5, maximum),
          evidence: resourceRecoveryEvidence(
            sorcerySource,
            SORCEROUS_RESTORATION_CLAUSE.id,
            {
              rest: 'short_rest',
              rule_kind: 'fixed_once_per_long_rest',
              amount: 5,
              maximum,
            },
          ),
        },
        long_rest: {
          kind: 'all',
          evidence: resourceRecoveryEvidence(
            sorcerySource,
            FONT_OF_MAGIC_CLAUSE.id,
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

  it('leaves the latch unburned when a short rest at full availability recovers nothing', () => {
    const pool = sorceryPointsPool();
    const session = createResourceRecoverySession(simResourcePoolSet([pool]));
    expect(session.availableUnits(pool.id)).toBe(10);
    // Zero expended, so the rule returns zero units. A latch burned by a
    // no-op recovery would silently cost the character the real one later.
    expect(session.recover(pool.id, 'short_rest')).toEqual({
      recovered_units: 0,
    });
    expect(session.availableUnits(pool.id)).toBe(10);
    session.spend(pool.id, 10);
    expect(session.recover(pool.id, 'short_rest')).toEqual({
      recovered_units: 5,
    });
    expect(session.availableUnits(pool.id)).toBe(5);
    // And now it IS burned: the second paying short rest recovers nothing.
    expect(session.recover(pool.id, 'short_rest')).toEqual({
      recovered_units: 0,
    });
    expect(session.availableUnits(pool.id)).toBe(5);
  });

  it('burns the latch only once per long rest, counting from the paying rest', () => {
    const pool = sorceryPointsPool();
    const session = createResourceRecoverySession(simResourcePoolSet([pool]));
    session.spend(pool.id, 4);
    // Expended 4 < amount 5, so the rule is clamped by the counter, not by
    // the rule amount — and it still burns the latch, because it paid out.
    expect(session.recover(pool.id, 'short_rest')).toEqual({
      recovered_units: 4,
    });
    expect(session.availableUnits(pool.id)).toBe(10);
    session.spend(pool.id, 6);
    expect(session.recover(pool.id, 'short_rest')).toEqual({
      recovered_units: 0,
    });
    expect(session.availableUnits(pool.id)).toBe(4);
    expect(session.recover(pool.id, 'long_rest')).toEqual({
      recovered_units: 6,
    });
    expect(session.availableUnits(pool.id)).toBe(10);
    session.spend(pool.id, 10);
    expect(session.recover(pool.id, 'short_rest')).toEqual({
      recovered_units: 5,
    });
  });

  it('never consults the latch for a pool whose short rest rule is not once-per-long-rest', () => {
    const maximumRage = positiveResourceMaximum(2);
    const rageSource = RAGE_CLAUSE.resource_source;
    const rage: SimResourcePool = {
      id: simResourceId('barbarian:rage'),
      logical_key: simResourcePoolKey('barbarian:rage'),
      source: rageSource,
      maximum: maximumRage,
      recovery: {
        short_rest: {
          kind: 'fixed',
          amount: positiveResourceRecoveryAmount(1, maximumRage),
          evidence: resourceRecoveryEvidence(
            rageSource,
            RAGE_CLAUSE.id,
            RAGE_SHORT_REST_AUTHORIZATION,
          ),
        },
        long_rest: {
          kind: 'all',
          evidence: resourceRecoveryEvidence(rageSource, RAGE_CLAUSE.id, {
            rest: 'long_rest',
            rule_kind: 'all',
            amount: null,
            maximum: 2,
          }),
        },
      },
    };
    const session = createResourceRecoverySession(simResourcePoolSet([rage]));
    // A no-op short rest first, then two paying ones: a `fixed` rule recovers
    // on every short rest, so no sequence of rests may ever latch it off.
    expect(session.recover(rage.id, 'short_rest').recovered_units).toBe(0);
    session.spend(rage.id, 2);
    expect(session.recover(rage.id, 'short_rest').recovered_units).toBe(1);
    expect(session.recover(rage.id, 'short_rest').recovered_units).toBe(1);
    expect(session.availableUnits(rage.id)).toBe(2);
  });
});
