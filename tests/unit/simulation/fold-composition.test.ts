import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { CharacterWeaponId } from '../../../src/domain/ids';
import {
  attackRollModifier,
  damageFlatModifier,
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  sourceStableKey,
  targetArmorClass,
  targetSaveBonus,
  type AttackRollEvent,
  type SavingThrowDamageEvent,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  publicProbabilityCoverageManifest,
  registerCharacterWeaponAttackClause,
  reviewedSaveSuccessClauses,
} from '../../../src/simulation/coverage';
import {
  foldAttackEvent,
  foldSavingThrowEvent,
} from '../../../src/simulation/probability';

const weapon: SourceRef = {
  kind: 'character_weapon',
  weapon_id: 9 as CharacterWeaponId,
  stable_key: sourceStableKey('weapon:9'),
};
const weaponAttackRegistration = registerCharacterWeaponAttackClause(weapon);
const slashing = damageType('Slashing');
const fire = damageType('Fire');

describe('multi-instance attack with miss damage', () => {
  it('weights each instance and reports consistent contributions', () => {
    const event: AttackRollEvent = {
      kind: 'attack_roll',
      event_id: routineEventId('attack:multi'),
      source: weapon,
      ...weaponAttackRegistration,
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      attack_bonus: attackRollModifier(100),
      critical: {
        kind: 'natural_20',
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
      damage: [
        {
          source: weapon,
          damage_type: slashing,
          components: [
            {
              kind: 'dice',
              pool: { count: positiveDiceCount(1), die: 6 },
              trigger: 'hit',
            },
            {
              kind: 'flat',
              modifier: damageFlatModifier(2),
              trigger: 'miss',
            },
          ],
        },
        {
          source: weapon,
          damage_type: fire,
          components: [{
            kind: 'dice',
            pool: { count: positiveDiceCount(2), die: 4 },
            trigger: 'hit',
          }],
        },
      ],
    };
    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: [
        { damage_type: slashing, response: 'normal' },
        { damage_type: fire, response: 'resistant' },
      ],
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    // slashing: 18 ordinary (1d6 = 3.5), 1 crit (2d6 = 7), 1 miss (flat 2).
    const slashingExpected = (18 * 3.5 + 7 + 2) / 20;
    // The same attack weapon can source a second damage type (the Flame Tongue
    // shape). Source does not enter either per-instance closed form, so these
    // reviewed numbers remain identical after re-sourcing the fire instance.
    // fire 2d4 resisted -> floor(t/2) over 2d4: totals 2..8 w/ 1,2,3,4,3,2,1 /16
    let fireBranch = 0;
    for (let a = 1; a <= 4; a += 1) {
      for (let b = 1; b <= 4; b += 1) {
        fireBranch += Math.floor((a + b) / 2) / 16;
      }
    }
    let fireCriticalBranch = 0;
    for (let a = 1; a <= 4; a += 1) {
      for (let b = 1; b <= 4; b += 1) {
        for (let c = 1; c <= 4; c += 1) {
          for (let d = 1; d <= 4; d += 1) {
            fireCriticalBranch += Math.floor((a + b + c + d) / 2) / 256;
          }
        }
      }
    }
    const fireExpected = (18 * fireBranch + fireCriticalBranch) / 20;
    expect(result.expected_damage).toBeCloseTo(
      slashingExpected + fireExpected,
      10,
    );
    const summed = result.contributions.reduce(
      (s, c) => s + c.expected_damage,
      0,
    );
    expect(summed).toBeCloseTo(result.expected_damage, 10);
    expect(result.contributions).toHaveLength(2);
  });
});

describe('save fold arms and contributions', () => {
  function base(
    on_success: SavingThrowDamageEvent['on_success'],
  ): SavingThrowDamageEvent {
    const clause = on_success.kind === 'half'
      ? reviewedSaveSuccessClauses.flaming_sphere
      : on_success.kind === 'sourced_damage'
        ? reviewedSaveSuccessClauses.vitriolic_sphere
        : reviewedSaveSuccessClauses.acid_splash;
    const failedDamage = on_success.kind === 'half'
      ? { count: 2, die: 6 as const, type: fire }
      : on_success.kind === 'sourced_damage'
        ? { count: 10, die: 4 as const, type: damageType('Acid') }
        : { count: 1, die: 6 as const, type: damageType('Acid') };
    return {
      kind: 'saving_throw_damage',
      event_id: routineEventId('save:multi'),
      source: clause.effect_source,
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      save_success_clause_id: clause.id,
      ability: 'dexterity',
      save_dc: saveDifficultyClass(13),
      roll_state: 'normal',
      damage_on_failed_save: [
        {
          source: clause.effect_source,
          damage_type: failedDamage.type,
          components: [{
            kind: 'dice',
            pool: {
              count: positiveDiceCount(failedDamage.count),
              die: failedDamage.die,
            },
          }],
        },
      ],
      on_success,
    };
  }
  const responses = [
    { damage_type: fire, response: 'normal' as const },
    { damage_type: slashing, response: 'normal' as const },
    { damage_type: damageType('Acid'), response: 'normal' as const },
  ];

  it('none arm', () => {
    const r = foldSavingThrowEvent(
      base({
        kind: 'none',
        evidence: reviewedSaveSuccessClauses.acid_splash.evidence,
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: responses },
    );
    expect(r.status).toBe('available');
    if (r.status !== 'available') {
      throw new Error(r.reason);
    }
    // save succeeds on 13..20 => 8/20 = 0.4 success, 0.6 fail
    expect(r.failed_save_probability).toBeCloseTo(0.6, 12);
    expect(r.expected_damage).toBeCloseTo(0.6 * 3.5, 10);
    expect(
      r.contributions.reduce((s, c) => s + c.expected_damage, 0),
    ).toBeCloseTo(r.expected_damage, 10);
  });

  it('half arm', () => {
    const r = foldSavingThrowEvent(
      base({
        kind: 'half',
        evidence: reviewedSaveSuccessClauses.flaming_sphere.evidence,
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: responses },
    );
    expect(r.status).toBe('available');
    if (r.status !== 'available') {
      throw new Error(r.reason);
    }
    let halfFire = 0;
    for (let a = 1; a <= 6; a += 1) {
      for (let b = 1; b <= 6; b += 1) {
        halfFire += Math.floor((a + b) / 2) / 36;
      }
    }
    const expected = 0.6 * 7 + 0.4 * halfFire;
    expect(r.expected_damage).toBeCloseTo(expected, 10);
    expect(
      r.contributions.reduce((s, c) => s + c.expected_damage, 0),
    ).toBeCloseTo(r.expected_damage, 10);
  });

  it('refuses a sourced_damage arm whose evidence names no success clause', () => {
    const r = foldSavingThrowEvent(
      base({
        kind: 'sourced_damage',
        evidence: publicProbabilityCoverageManifest.saving_throw,
        roll_transform: 'none',
        damage: [{
          source: weapon,
          damage_type: fire,
          components: [{ kind: 'flat', modifier: damageFlatModifier(1) }],
        }],
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: responses },
    );
    expect(r.status).toBe('unavailable');
    if (r.status === 'unavailable') {
      expect(r).not.toHaveProperty('expected_damage');
    }
  });
});

describe('save damage with mixed components', () => {
  it('sums registered dice and flat components before applying the save', () => {
    const clause = reviewedSaveSuccessClauses.finger_of_death;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('save:mixed'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      save_success_clause_id: clause.id,
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage_on_failed_save: [{
        source: clause.effect_source,
        damage_type: damageType('Necrotic'),
        components: [
          { kind: 'dice', pool: { count: positiveDiceCount(7), die: 8 } },
          { kind: 'flat', modifier: damageFlatModifier(30) },
        ],
      }],
      on_success: { kind: 'half', evidence: clause.evidence },
    };
    const r = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [
        { damage_type: damageType('Necrotic'), response: 'normal' },
      ],
    });
    expect(r.status).toBe('available');
    if (r.status !== 'available') {
      throw new Error('Finger of Death must produce an available damage fold.');
    }
    // DC 11 vs +0 fails half the time. E[7d8 + 30] = 61.5 and
    // E[floor((7d8 + 30) / 2)] = (61.5 - 0.5) / 2 = 30.5.
    expect(r.expected_damage).toBeCloseTo((61.5 + 30.5) / 2, 10);
  });
});
