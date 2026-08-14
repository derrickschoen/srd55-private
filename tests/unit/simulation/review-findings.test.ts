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
  publicProbabilityCoverageManifest,
  reviewedSaveEffectStableKeys,
  reviewedSaveSuccessClauses,
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
const responses = [{ damage_type: fire, response: 'normal' as const }];

function saveEvent(input: {
  readonly source: SourceRef;
  readonly evidence: PublicSourceRef;
  readonly success: 'none' | 'half';
}): SavingThrowDamageEvent {
  return {
    kind: 'saving_throw_damage',
    event_id: routineEventId('review:save'),
    source: input.source,
    ability: 'dexterity',
    save_dc: saveDifficultyClass(11),
    roll_state: 'normal',
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    damage_on_failed_save: [{
      source: input.source,
      damage_type: fire,
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(1), die: 6 },
      }],
    }],
    on_success: { kind: input.success, evidence: input.evidence },
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
    const acidSplash = {
      ...source,
      stable_key: reviewedSaveEffectStableKeys.acid_splash,
    };
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
    const fireball = {
      ...source,
      stable_key: reviewedSaveEffectStableKeys.fireball,
    };
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
    expect(result.expected_damage).toBeCloseTo(2.5, 12);
    const composed = composeRoundDamageFolds([result]);
    expect(composed.status).toBe('available');
    if (composed.status === 'available') {
      expect(composed.expected_damage).toBeCloseTo(2.5, 12);
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

  it('F4 negative control accepts a real checked heading as damage-neutral proof', () => {
    const evidence = bundledSrdSourceRef('Critical Hits');
    const coverage: CatalogMechanicCoverage = {
      status: 'confirmed_damage_neutral',
      evidence,
    };
    expect(coverage).toEqual({
      status: 'confirmed_damage_neutral',
      evidence: publicProbabilityCoverageManifest.critical_hit,
    });
    const result = foldAttackEvent(attackEvent(evidence), {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: responses,
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    expect(result.expected_damage).toBeCloseTo(3.5, 12);
  });
});
