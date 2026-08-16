import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { CharacterWeaponId } from '../../../src/domain/ids';
import {
  attackRollModifier,
  createResourceRecoverySession,
  damageFlatModifier,
  positiveDiceCount,
  positiveResourceMaximum,
  positiveResourceRecoveryAmount,
  routineEventId,
  saveDifficultyClass,
  simResourceId,
  simResourcePoolKey,
  simResourcePoolSet,
  sourceStableKey,
  targetArmorClass,
  targetSaveBonus,
  type AttackDamageInstance,
  type AttackRollEvent,
  type DicePool,
  type PublicSourceRef,
  type SavingThrowDamageEvent,
  type SimResourcePool,
} from '../../../src/simulation/contracts';
import {
  criticalHitHasEvidence,
  publicProbabilityCoverageManifest,
  registerCharacterWeaponAttackClause,
  registeredAttackRollClauses,
  resourceRecoveryEvidence,
  reviewedResourceRecoveryClauses,
  reviewedSaveSuccessClauses,
} from '../../../src/simulation/coverage';
import {
  enumerateDicePool,
  foldAttackEvent,
  foldSavingThrowEvent,
  ordinaryDamageDistribution,
} from '../../../src/simulation/probability';

function ragePoolWithRecoveryGetter(
  firstRecovery: SimResourcePool['recovery'],
  readCount: () => number,
  onRead: () => void,
): SimResourcePool {
  return {
    id: simResourceId('round-22:barbarian:rage'),
    logical_key: simResourcePoolKey('round-22:barbarian:rage'),
    source: reviewedResourceRecoveryClauses.rage.resource_source,
    maximum: positiveResourceMaximum(2),
    get recovery(): SimResourcePool['recovery'] {
      onRead();
      return readCount() === 1
        ? firstRecovery
        : {
            short_rest: { kind: 'none' },
            long_rest: { kind: 'none' },
          };
    },
  };
}

function expectedMean(distribution: ReturnType<typeof enumerateDicePool>): number {
  return distribution.reduce(
    (mean, outcome) => mean + outcome.total * outcome.probability,
    0,
  );
}

describe('round 22 caller-object snapshots', () => {
  it('deeply snapshots resource pools when the set is constructed', () => {
    const maximum = positiveResourceMaximum(2);
    const clause = reviewedResourceRecoveryClauses.rage;
    const recovery: SimResourcePool['recovery'] = {
      short_rest: {
        kind: 'fixed',
        amount: positiveResourceRecoveryAmount(1, maximum),
        evidence: resourceRecoveryEvidence(clause.resource_source, clause.id, {
          rest: 'short_rest',
          rule_kind: 'fixed',
          amount: 1,
          maximum,
        }),
      },
      long_rest: {
        kind: 'all',
        evidence: resourceRecoveryEvidence(clause.resource_source, clause.id, {
          rest: 'long_rest',
          rule_kind: 'all',
          amount: null,
          maximum,
        }),
      },
    };
    let recoveryReads = 0;
    const callerPool = ragePoolWithRecoveryGetter(
      recovery,
      () => recoveryReads,
      () => { recoveryReads += 1; },
    );

    const set = simResourcePoolSet([callerPool]);
    expect(recoveryReads).toBe(1);

    const session = createResourceRecoverySession(set);
    session.spend(callerPool.id, 2);
    const result = session.recover(callerPool.id, 'short_rest');

    expect(result).toEqual({ recovered_units: 1 });
    expect(recoveryReads).toBe(1);
  });

  it('folds a saving-throw event and its damage from their first reads', () => {
    const fireball = reviewedSaveSuccessClauses.fireball;
    const fire = damageType('Fire');
    let saveDcReads = 0;
    let diceCountReads = 0;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-22:unstable-fireball'),
      source: fireball.effect_source,
      ability: fireball.ability,
      get save_dc(): SavingThrowDamageEvent['save_dc'] {
        saveDcReads += 1;
        return saveDifficultyClass(saveDcReads === 1 ? 11 : 15);
      },
      roll_state: 'normal',
      frequency: fireball.frequency,
      duration: fireball.duration,
      save_success_clause_id: fireball.id,
      damage_on_failed_save: [{
        source: fireball.effect_source,
        damage_type: fire,
        components: [{
          kind: 'dice',
          pool: {
            get count(): DicePool['count'] {
              diceCountReads += 1;
              return positiveDiceCount(diceCountReads === 1 ? 8 : 100);
            },
            die: 6,
          },
        }],
      }],
      on_success: { kind: 'half', evidence: fireball.evidence },
    };

    const result = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: fire, response: 'normal' }],
    });

    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error('The first-read Fireball event must be available.');
    }
    expect(result.expected_damage).toBeCloseTo(20.875, 12);
    expect(saveDcReads).toBe(1);
    expect(diceCountReads).toBe(1);
  });

  it('checks and folds attack damage from one shared event snapshot', () => {
    const weapon = {
      kind: 'character_weapon' as const,
      weapon_id: 2290 as CharacterWeaponId,
      stable_key: sourceStableKey('round-22:attack-snapshot'),
    };
    const registration = registerCharacterWeaponAttackClause(weapon);
    const slashing = damageType('Slashing');
    const firstDamage: readonly [AttackDamageInstance] = [{
      source: weapon,
      damage_type: slashing,
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(1), die: 6 },
        trigger: 'hit',
      }],
    }];
    const secondDamage: readonly [AttackDamageInstance] = [{
      source: weapon,
      damage_type: slashing,
      components: [{
        kind: 'flat',
        modifier: damageFlatModifier(100),
        trigger: 'hit',
      }],
    }];
    let damageReads = 0;
    const event: AttackRollEvent = {
      kind: 'attack_roll',
      event_id: routineEventId('round-22:attack-damage-snapshot'),
      source: weapon,
      ...registration,
      attack_bonus: attackRollModifier(100),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      critical: {
        kind: 'natural_20',
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
      get damage(): AttackRollEvent['damage'] {
        damageReads += 1;
        return damageReads === 1 ? firstDamage : secondDamage;
      },
    };

    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: [{ damage_type: slashing, response: 'normal' }],
    });

    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error('The first-read weapon damage must be available.');
    }
    expect(result.expected_damage).toBeCloseTo(3.5, 12);
    expect(damageReads).toBe(1);
  });

  it('compares public citations from a single snapshot of each source', () => {
    const expected = publicProbabilityCoverageManifest.critical_hit;
    if (expected.kind !== 'bundled_srd') {
      throw new Error('Critical-hit evidence must be bundled SRD content.');
    }
    let kindReads = 0;
    const unstable = {
      get kind(): PublicSourceRef['kind'] {
        kindReads += 1;
        return kindReads === 1 ? 'bundled_srd' : 'project_owned';
      },
      path: expected.path,
      heading: 'Not Critical Hits',
    } as unknown as PublicSourceRef;

    expect(criticalHitHasEvidence(unstable)).toBe(false);
    expect(kindReads).toBe(1);
  });

  it('derives a weapon clause ID and stored source from the same read', () => {
    let kindReads = 0;
    let weaponIdReads = 0;
    let stableKeyReads = 0;
    const source = {
      get kind(): 'character_weapon' {
        kindReads += 1;
        return 'character_weapon';
      },
      get weapon_id(): CharacterWeaponId {
        weaponIdReads += 1;
        return (weaponIdReads === 1 ? 2291 : 2292) as CharacterWeaponId;
      },
      get stable_key(): ReturnType<typeof sourceStableKey> {
        stableKeyReads += 1;
        return sourceStableKey(stableKeyReads === 1 ? 'reg-a' : 'reg-b');
      },
    };

    const registration = registerCharacterWeaponAttackClause(source);
    const stored = registeredAttackRollClauses.get(
      registration.attack_roll_clause_id,
    );

    expect(registration.attack_roll_clause_id).toBe(
      'character-weapon:2291:reg-a:attack-roll',
    );
    expect(stored?.source).toEqual({
      kind: 'character_weapon',
      weapon_id: 2291,
      stable_key: 'reg-a',
    });
    expect(kindReads).toBe(1);
    expect(weaponIdReads).toBe(1);
    expect(stableKeyReads).toBe(1);
  });

  it('enumerates a lying one-die pool as the first-read d6', () => {
    let directDieReads = 0;
    const directPool: DicePool = {
      count: positiveDiceCount(1),
      get die(): DicePool['die'] {
        directDieReads += 1;
        return directDieReads === 1 ? 6 : 100;
      },
    };
    expect(expectedMean(enumerateDicePool(directPool))).toBeCloseTo(3.5, 12);
    expect(directDieReads).toBe(1);

    let ordinaryDieReads = 0;
    const ordinaryPool: DicePool = {
      count: positiveDiceCount(1),
      get die(): DicePool['die'] {
        ordinaryDieReads += 1;
        return ordinaryDieReads === 1 ? 6 : 100;
      },
    };
    const ordinary = ordinaryDamageDistribution([{
      kind: 'dice',
      pool: ordinaryPool,
    }]);
    expect(expectedMean(ordinary)).toBeCloseTo(3.5, 12);
    expect(ordinaryDieReads).toBe(1);
  });
});
