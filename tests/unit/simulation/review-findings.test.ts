import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { CharacterWeaponId } from '../../../src/domain/ids';
import {
  attackRollModifier,
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  sourceStableKey,
  targetArmorClass,
  targetSaveBonus,
  type AttackRollEvent,
  type AutomaticDamageEvent,
  type CatalogMechanicCoverage,
  type PublicSourceRef,
  type SavingThrowDamageEvent,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  bundledSrdSourceRef,
  damageNeutralityEvidence,
  publicProbabilityCoverageManifest,
  reviewedSaveSuccessClauses,
  reviewedDamageNeutralMechanicIds,
} from '../../../src/simulation/coverage';
import {
  composeRoundDamageFolds,
  foldAttackEvent,
  foldAutomaticDamageEvent,
  foldSavingThrowEvent,
} from '../../../src/simulation/probability';

const source: SourceRef = {
  kind: 'character_weapon',
  weapon_id: 41 as CharacterWeaponId,
  stable_key: sourceStableKey('spell:unrelated-fire'),
};
const fire = damageType('Fire');
const responses = [
  { damage_type: fire, response: 'normal' as const },
  { damage_type: damageType('Acid'), response: 'normal' as const },
];

function saveEvent(input: {
  readonly source: SourceRef;
  readonly evidence: PublicSourceRef;
  readonly success: 'none' | 'half';
}): SavingThrowDamageEvent {
  const isHalf = input.success === 'half';
  const damage = isHalf
    ? { count: 8, type: fire }
    : { count: 1, type: damageType('Acid') };
  return {
    kind: 'saving_throw_damage',
    event_id: routineEventId('review:save'),
    source: input.source,
    ability: 'dexterity',
    save_dc: saveDifficultyClass(11),
    roll_state: 'normal',
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    save_success_clause_id: input.success === 'half'
      ? reviewedSaveSuccessClauses.fireball.id
      : reviewedSaveSuccessClauses.acid_splash.id,
    damage_on_failed_save: [{
      source: input.source,
      damage_type: damage.type,
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(damage.count), die: 6 },
      }],
    }],
    on_success: {
      kind: input.success,
      evidence: input.evidence,
    },
  };
}

function attackEvent(evidence: PublicSourceRef): AttackRollEvent {
  return {
    kind: 'attack_roll',
    event_id: routineEventId('review:attack'),
    source,
    attack_bonus: attackRollModifier(100),
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    critical: { kind: 'natural_20', evidence },
    damage: [{
      source,
      damage_type: fire,
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(1), die: 6 },
        trigger: 'hit',
      }],
    }],
  };
}

function automaticEvent(): AutomaticDamageEvent {
  return {
    kind: 'automatic_damage',
    event_id: routineEventId('review:auto'),
    source,
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    damage: [{
      source,
      damage_type: fire,
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(1), die: 4 },
      }],
    }],
  };
}

describe('confirmed review findings after repair', () => {
  it('F1 refuses Acid Splash evidence for unrelated Fire and survives composition', () => {
    const result = foldSavingThrowEvent(
      saveEvent({
        source,
        evidence: reviewedSaveSuccessClauses.acid_splash.evidence,
        success: 'none',
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: responses },
    );
    const composed = composeRoundDamageFolds([
      foldAutomaticDamageEvent(automaticEvent(), responses),
      result,
    ]);
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
    expect(composed.status).toBe('unavailable');
    expect(composed).not.toHaveProperty('expected_damage');
  });

  it('F1 negative control accepts Acid Splash itself at 1.75 and composes numerically', () => {
    const acidSplash = reviewedSaveSuccessClauses.acid_splash.effect_source;
    const result = foldSavingThrowEvent(
      saveEvent({
        source: acidSplash,
        evidence: reviewedSaveSuccessClauses.acid_splash.evidence,
        success: 'none',
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: responses },
    );
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    expect(result.expected_damage).toBeCloseTo(1.75, 12);
    const composed = composeRoundDamageFolds([result]);
    expect(composed.status).toBe('available');
    if (composed.status === 'available') {
      expect(composed.expected_damage).toBeCloseTo(1.75, 12);
    }
  });

  it('R5 F1 refuses a weapon that forges Acid Splash stable identity', () => {
    const forgedWeapon: SourceRef = {
      ...source,
      stable_key: reviewedSaveSuccessClauses.acid_splash.effect_stable_key,
    };
    const result = foldSavingThrowEvent(saveEvent({
      source: forgedWeapon,
      evidence: reviewedSaveSuccessClauses.acid_splash.evidence,
      success: 'none',
    }), {
      save_bonus: targetSaveBonus(0),
      damage_responses: responses,
    });
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
  });

  it('R5 F2 refuses canonical Acid Splash identity with invented ability and damage', () => {
    const genuine = saveEvent({
      source: reviewedSaveSuccessClauses.acid_splash.effect_source,
      evidence: reviewedSaveSuccessClauses.acid_splash.evidence,
      success: 'none',
    });
    const invented: SavingThrowDamageEvent = {
      ...genuine,
      ability: 'constitution',
      damage_on_failed_save: [{
        source: genuine.source,
        damage_type: fire,
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(1), die: 4 },
        }],
      }],
    };
    const result = foldSavingThrowEvent(invented, {
      save_bonus: targetSaveBonus(0),
      damage_responses: responses,
    });
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
  });

  it('F1 refuses Fireball half evidence for an unregistered effect and survives composition', () => {
    const result = foldSavingThrowEvent(
      saveEvent({
        source,
        evidence: reviewedSaveSuccessClauses.fireball.evidence,
        success: 'half',
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: responses },
    );
    const composed = composeRoundDamageFolds([
      foldAutomaticDamageEvent(automaticEvent(), responses),
      result,
    ]);
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
    expect(composed.status).toBe('unavailable');
    expect(composed).not.toHaveProperty('expected_damage');
  });

  it('F1 negative control accepts Fireball itself at 2.5 and composes numerically', () => {
    const fireball = reviewedSaveSuccessClauses.fireball.effect_source;
    const result = foldSavingThrowEvent(
      saveEvent({
        source: fireball,
        evidence: reviewedSaveSuccessClauses.fireball.evidence,
        success: 'half',
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: responses },
    );
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    expect(result.expected_damage).toBeCloseTo(20.875, 12);
    const composed = composeRoundDamageFolds([result]);
    expect(composed.status).toBe('available');
    if (composed.status === 'available') {
      expect(composed.expected_damage).toBeCloseTo(20.875, 12);
    }
  });

  it('R4 F1 binds Storm of Vengeance initial thunder to its exact save clause', () => {
    const stormSource =
      reviewedSaveSuccessClauses.storm_of_vengeance_initial.effect_source;
    const thunder = damageType('Thunder');
    const base: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('review:storm-initial'),
      source: stormSource,
      ability: 'constitution',
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      save_success_clause_id:
        reviewedSaveSuccessClauses.storm_of_vengeance_initial.id,
      damage_on_failed_save: [{
        source: stormSource,
        damage_type: thunder,
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(2), die: 6 },
        }],
      }],
      on_success: {
        kind: 'half',
        evidence:
          reviewedSaveSuccessClauses.storm_of_vengeance_lightning.evidence,
      },
    };
    const target = {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: thunder, response: 'normal' as const }],
    };
    const borrowed = foldSavingThrowEvent(base, target);
    expect(borrowed.status).toBe('unavailable');
    expect(borrowed).not.toHaveProperty('expected_damage');

    const genuine = foldSavingThrowEvent({
      ...base,
      on_success: {
        kind: 'none',
        evidence:
          reviewedSaveSuccessClauses.storm_of_vengeance_initial.evidence,
      },
    }, target);
    expect(genuine.status).toBe('available');
    if (genuine.status !== 'available') {
      throw new Error(genuine.reason);
    }
    expect(genuine.expected_damage).toBeCloseTo(3.5, 12);
  });

  it('R4 F3 evaluates both Conjure Elemental saves and Contact Other Plane', () => {
    const cases = [
      {
        clause: reviewedSaveSuccessClauses.conjure_elemental_initial,
        dice: 8,
        die: 8 as const,
        ability: 'dexterity' as const,
        dc: 11,
        damageType: damageType('Fire'),
        expected: 18,
      },
      {
        clause: reviewedSaveSuccessClauses.conjure_elemental_repeat,
        dice: 4,
        die: 8 as const,
        ability: 'dexterity' as const,
        dc: 11,
        damageType: damageType('Fire'),
        expected: 9,
      },
      {
        clause: reviewedSaveSuccessClauses.contact_other_plane,
        dice: 6,
        die: 6 as const,
        ability: 'intelligence' as const,
        dc: 15,
        damageType: damageType('Psychic'),
        expected: 14.7,
      },
    ];
    for (const testCase of cases) {
      const spellSource = testCase.clause.effect_source;
      const event: SavingThrowDamageEvent = {
        kind: 'saving_throw_damage',
        event_id: routineEventId(`review:${testCase.clause.id}`),
        source: spellSource,
        ability: testCase.ability,
        save_dc: saveDifficultyClass(testCase.dc),
        roll_state: 'normal',
        frequency: { kind: 'each_declared_event' },
        duration: { kind: 'instantaneous' },
        save_success_clause_id: testCase.clause.id,
        damage_on_failed_save: [{
          source: spellSource,
          damage_type: testCase.damageType,
          components: [{
            kind: 'dice',
            pool: {
              count: positiveDiceCount(testCase.dice),
              die: testCase.die,
            },
          }],
        }],
        on_success: {
          kind: 'none',
          evidence: testCase.clause.evidence,
        },
      };
      const result = foldSavingThrowEvent(event, {
        save_bonus: targetSaveBonus(0),
        damage_responses: [{
          damage_type: testCase.damageType,
          response: 'normal',
        }],
      });
      expect(result.status, testCase.clause.id).toBe('available');
      if (result.status !== 'available') {
        throw new Error(result.reason);
      }
      expect(result.expected_damage, testCase.clause.id).toBeCloseTo(
        testCase.expected,
        12,
      );
    }
  });

  it('R5 F5 evaluates source-discovered saves that gate recurring damage', () => {
    const cases = [
      {
        clause: reviewedSaveSuccessClauses.ensnaring_strike,
        ability: 'strength' as const,
        count: 1,
        die: 6 as const,
        type: damageType('Piercing'),
        expected: 1.75,
      },
      {
        clause: reviewedSaveSuccessClauses.phantasmal_force,
        ability: 'intelligence' as const,
        count: 2,
        die: 8 as const,
        type: damageType('Psychic'),
        expected: 4.5,
      },
      {
        clause: reviewedSaveSuccessClauses.searing_smite,
        ability: 'constitution' as const,
        count: 1,
        die: 6 as const,
        type: fire,
        expected: 1.75,
      },
    ];
    for (const testCase of cases) {
      const event: SavingThrowDamageEvent = {
        kind: 'saving_throw_damage',
        event_id: routineEventId(`review:${testCase.clause.id}`),
        source: testCase.clause.effect_source,
        ability: testCase.ability,
        save_dc: saveDifficultyClass(11),
        roll_state: 'normal',
        frequency: { kind: 'each_declared_event' },
        duration: { kind: 'instantaneous' },
        save_success_clause_id: testCase.clause.id,
        damage_on_failed_save: [{
          source: testCase.clause.effect_source,
          damage_type: testCase.type,
          components: [{
            kind: 'dice',
            pool: {
              count: positiveDiceCount(testCase.count),
              die: testCase.die,
            },
          }],
        }],
        on_success: {
          kind: 'none',
          evidence: testCase.clause.evidence,
        },
      };
      const result = foldSavingThrowEvent(event, {
        save_bonus: targetSaveBonus(0),
        damage_responses: [{
          damage_type: testCase.type,
          response: 'normal',
        }],
      });
      expect(result.status, testCase.clause.id).toBe('available');
      if (result.status !== 'available') {
        throw new Error(result.reason);
      }
      expect(result.expected_damage, testCase.clause.id).toBeCloseTo(
        testCase.expected,
        12,
      );
    }
  });

  it('F2 doubles an ordinary on-hit rider and composes the corrected 3.5', () => {
    const result = foldAttackEvent(
      attackEvent(publicProbabilityCoverageManifest.critical_hit),
      {
        armor_class: targetArmorClass(0),
        roll_state: 'normal',
        damage_responses: responses,
      },
    );
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    expect(result.expected_damage).toBeCloseTo(3.5, 12);
    const composed = composeRoundDamageFolds([result]);
    expect(composed.status).toBe('available');
    if (composed.status === 'available') {
      expect(composed.expected_damage).toBeCloseTo(3.5, 12);
    }
  });

  it('F2 negative control rolls critical-only dice once while doubling hit dice', () => {
    const base = attackEvent(publicProbabilityCoverageManifest.critical_hit);
    const event: AttackRollEvent = {
      ...base,
      damage: [{
        ...base.damage[0],
        components: [
          ...base.damage[0].components,
          {
            kind: 'dice',
            pool: { count: positiveDiceCount(1), die: 4 },
            trigger: 'critical_hit',
          },
        ],
      }],
    };
    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: responses,
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    // 18 ordinary hits at 3.5; the critical is 2d6 + one (not doubled) d4.
    expect(result.expected_damage).toBeCloseTo((18 * 3.5 + 7 + 2.5) / 20, 12);
  });

  it('F3 refuses Saving Throws as critical evidence and survives composition', () => {
    const result = foldAttackEvent(
      attackEvent(publicProbabilityCoverageManifest.saving_throw),
      {
        armor_class: targetArmorClass(0),
        roll_state: 'normal',
        damage_responses: responses,
      },
    );
    const composed = composeRoundDamageFolds([
      foldAutomaticDamageEvent(automaticEvent(), responses),
      result,
    ]);
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
    expect(composed.status).toBe('unavailable');
    expect(composed).not.toHaveProperty('expected_damage');
  });

  it('F3 negative control accepts Critical Hits evidence at 3.5 and composes numerically', () => {
    const result = foldAttackEvent(
      attackEvent(publicProbabilityCoverageManifest.critical_hit),
      {
        armor_class: targetArmorClass(0),
        roll_state: 'normal',
        damage_responses: responses,
      },
    );
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    expect(result.expected_damage).toBeCloseTo(3.5, 12);
  });

  it('F4 refuses a nonexistent heading before it can become proof', () => {
    let refusal = '';
    try {
      bundledSrdSourceRef('This Heading Does Not Exist');
    } catch (error: unknown) {
      refusal = error instanceof Error ? error.message : String(error);
    }
    expect(refusal).toContain('not a reviewed literal heading');
  });

  it('R4 F2 refuses a weapon forged with a reviewed neutrality stable key', () => {
    const forgedWeapon = {
      ...source,
      stable_key:
        sourceStableKey('srd-5.2.1:spell:fireball:flammable-objects'),
    };
    const evidence = bundledSrdSourceRef('Fireball');
    expect(() => damageNeutralityEvidence(forgedWeapon, evidence)).toThrow(
      'does not establish neutrality for this mechanic',
    );
  });

  it('R4 F2 accepts the code-owned Fireball flammable-objects mechanic ID', () => {
    const mechanic =
      reviewedDamageNeutralMechanicIds.fireball_flammable_objects;
    const evidence = bundledSrdSourceRef('Fireball');
    const proof = damageNeutralityEvidence(mechanic, evidence);
    const coverage: CatalogMechanicCoverage = {
      status: 'confirmed_damage_neutral',
      proof,
    };
    expect(coverage).toEqual({
      status: 'confirmed_damage_neutral',
      proof: { mechanic, evidence },
    });
  });

  it('R4 F2 refuses Fireball proof for a different mechanic', () => {
    // Round 2's accepted negative control used Critical Hits as if citation
    // existence proved neutrality. That was the wrong behavior: relevance is
    // now checked against the mechanic stable key before a proof can be minted.
    expect(() => damageNeutralityEvidence(
      source,
      bundledSrdSourceRef('Fireball'),
    )).toThrow('does not establish neutrality for this mechanic');
  });
});
