import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import {
  reviewedSaveSuccessClauses,
  sourceDerivedSaveDamageCandidates,
} from '../../../src/simulation/coverage';
import {
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  targetSaveBonus,
  type DamageInstance,
  type SavingThrowDamageEvent,
} from '../../../src/simulation/contracts';
import { foldSavingThrowEvent } from '../../../src/simulation/probability';
import {
  spellDescriptionsByHeading,
  spellDescriptionsFromFullLayout,
} from '../../../src/simulation/spell-source-reader';

const fullSrd = readFileSync('docs/srd/full/srd-5.2.1.txt', 'utf8');
const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

const diceDamage = (
  source: DamageInstance['source'],
  type: string,
  pools: readonly { readonly count: number; readonly die: 4 | 6 }[],
): DamageInstance => ({
  source,
  damage_type: damageType(type),
  components: pools.map((pool) => ({
    kind: 'dice' as const,
    pool: { count: positiveDiceCount(pool.count), die: pool.die },
  })),
});

const target = (...types: readonly string[]) => ({
  save_bonus: targetSaveBonus(0),
  damage_responses: types.map((type) => ({
    damage_type: damageType(type),
    response: 'normal' as const,
  })),
});

describe('round 8 clause-local source evidence', () => {
  it('records Vitriolic Sphere amount/type offsets, arms, transform, and timing', () => {
    const body = spellDescriptionsByHeading(spellExtract).get('Vitriolic Sphere');
    const clause = sourceDerivedSaveDamageCandidates.find((candidate) =>
      candidate.heading === 'Vitriolic Sphere'
    );
    if (body === undefined || clause === undefined) {
      throw new Error('Missing Vitriolic Sphere source evidence.');
    }
    expect(clause.damage_occurrences.map((occurrence) => ({
      amount: occurrence.dice_count,
      type: occurrence.damage_type,
      arm: occurrence.arm,
      timing: occurrence.timing,
      transform: occurrence.roll_transform,
      source: body.slice(occurrence.start, occurrence.end),
    }))).toEqual([
      {
        amount: 10,
        type: 'Acid',
        arm: 'failure',
        timing: 'on_save_resolution',
        transform: 'none',
        source: '10d4 Acid damage',
      },
      {
        amount: 5,
        type: 'Acid',
        arm: 'failure',
        timing: 'end_of_target_next_turn',
        transform: 'none',
        source: '5d4 Acid damage',
      },
      {
        amount: 10,
        type: 'Acid',
        arm: 'success',
        timing: 'on_save_resolution',
        transform: 'floor_half',
        source: 'half the initial damage only',
      },
    ]);
  });

  it('refuses a spell-shaped page outside the reviewed page/count boundary', () => {
    const extraPage = [
      'Invented Review Spell',
      'Level 1 Evocation (Wizard)',
      'Casting Time: Action',
      'Range: 60 feet',
      'Components: V, S',
      'Duration: Instantaneous',
      'A target makes a Dexterity saving throw, taking 1d6 Fire damage on a failed save.',
      '176   System Reference Document 5.2.1',
    ].join('\n');
    expect(() => spellDescriptionsFromFullLayout(`${fullSrd}\f${extraPage}`))
      .toThrow('spell metadata outside the reviewed SRD spell pages 107-175 on page 176');
  });
});

describe('round 8 damage-slot matching', () => {
  it('refuses Vitriolic Sphere until its explicit delayed damage can be scheduled', () => {
    const clause = reviewedSaveSuccessClauses.vitriolic_sphere;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-8:vitriolic-sphere'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: { kind: 'each_declared_event' },
      duration: {
        kind: 'includes_delayed_damage',
        delayed_until: 'end_of_target_next_turn',
      },
      save_success_clause_id: clause.id,
      damage_on_failed_save: [
        diceDamage(clause.effect_source, 'Acid', [{ count: 10, die: 4 }]),
        diceDamage(clause.effect_source, 'Acid', [{ count: 5, die: 4 }]),
      ],
      on_success: {
        kind: 'sourced_damage',
        evidence: clause.evidence,
        damage: [diceDamage(clause.effect_source, 'Acid', [{ count: 10, die: 4 }])],
        roll_transform: 'floor_half',
      },
    };
    const result = foldSavingThrowEvent(event, target('Acid'));
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
    if (result.status === 'unavailable') {
      expect(result.reason).toContain('delayed');
    }
    expect(foldSavingThrowEvent({
      ...event,
      duration: { kind: 'instantaneous' },
    }, target('Acid')).status).toBe('unavailable');
  });

  it('refuses Vitriolic Sphere 10d4 in the required 5d4 slot', () => {
    const clause = reviewedSaveSuccessClauses.vitriolic_sphere;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-8:vitriolic-overstatement'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: { kind: 'each_declared_event' },
      duration: clause.duration,
      save_success_clause_id: clause.id,
      damage_on_failed_save: [diceDamage(clause.effect_source, 'Acid', [
        { count: 10, die: 4 },
        { count: 10, die: 4 },
      ])],
      on_success: {
        kind: 'sourced_damage',
        evidence: clause.evidence,
        damage: [diceDamage(clause.effect_source, 'Acid', [{ count: 10, die: 4 }])],
        roll_transform: 'floor_half',
      },
    };
    expect(foldSavingThrowEvent(event, target('Acid')).status).toBe('unavailable');
  });

  it('accepts Flame Strike when one lawful 5d6 pool is split into 2d6 plus 3d6', () => {
    const clause = reviewedSaveSuccessClauses.flame_strike;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-8:flame-strike-split'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      save_success_clause_id: clause.id,
      damage_on_failed_save: [
        diceDamage(clause.effect_source, 'Fire', [
          { count: 2, die: 6 },
          { count: 3, die: 6 },
        ]),
        diceDamage(clause.effect_source, 'Radiant', [{ count: 5, die: 6 }]),
      ],
      on_success: { kind: 'half', evidence: clause.evidence },
    };
    expect(foldSavingThrowEvent(event, target('Fire', 'Radiant')).status)
      .toBe('available');
  });

  it('refuses caller-selected Prismatic Spray rays without random weighting', () => {
    const clause = reviewedSaveSuccessClauses.prismatic_spray;
    const event = (damage: SavingThrowDamageEvent['damage_on_failed_save']): SavingThrowDamageEvent => ({
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-8:prismatic-spray'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      save_success_clause_id: clause.id,
      damage_on_failed_save: damage,
      on_success: { kind: 'half', evidence: clause.evidence },
    });
    const fire = diceDamage(clause.effect_source, 'Fire', [{ count: 12, die: 6 }]);
    const acid = diceDamage(clause.effect_source, 'Acid', [{ count: 12, die: 6 }]);
    const cold = diceDamage(clause.effect_source, 'Cold', [{ count: 12, die: 6 }]);
    const prismaticTarget = target('Fire', 'Acid', 'Cold');
    const one = foldSavingThrowEvent(event([fire]), prismaticTarget);
    expect(one.status).toBe('unavailable');
    if (one.status === 'unavailable') {
      expect(one.reason).toContain('random');
    }
    expect(foldSavingThrowEvent(event([fire, acid]), prismaticTarget).status)
      .toBe('unavailable');
    expect(foldSavingThrowEvent(event([fire, fire]), prismaticTarget).status)
      .toBe('unavailable');
    expect(foldSavingThrowEvent(event([
      diceDamage(clause.effect_source, 'Fire', [{ count: 24, die: 6 }]),
    ]), prismaticTarget).status).toBe('unavailable');
    expect(foldSavingThrowEvent(event([fire, acid, cold]), prismaticTarget).status)
      .toBe('unavailable');
  });
});
