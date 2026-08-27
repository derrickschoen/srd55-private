import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import {
  damageFlatModifier,
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  targetSaveBonus,
  type DamageComponent,
  type DamageInstance,
  type SavingThrowDamageEvent,
} from '../../../src/simulation/contracts';
import {
  reviewedSaveSuccessClauses,
  reviewedSaveAvailabilityOracle,
  sourceDerivedSaveDamageCandidates,
} from '../../../src/simulation/coverage';
import { foldSavingThrowEvent } from '../../../src/simulation/probability';
import {
  deriveSaveDamageCoverageFromBodies,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

const target = (type: string, response: 'normal' | 'resistant' = 'normal') => ({
  save_bonus: targetSaveBonus(0),
  damage_responses: [{ damage_type: damageType(type), response }],
});

const damage = (
  source: DamageInstance['source'],
  type: string,
  components: DamageComponent[],
): DamageInstance => ({
  source,
  damage_type: damageType(type),
  components: components as [DamageComponent, ...DamageComponent[]],
});

const dice = (count: number, die: 4 | 6 | 8 | 10 | 12): DamageComponent => ({
  kind: 'dice',
  pool: { count: positiveDiceCount(count), die },
});

const flat = (modifier: number): DamageComponent => ({
  kind: 'flat',
  modifier: damageFlatModifier(modifier),
});

const saveEvent = (
  clause: (typeof reviewedSaveSuccessClauses)[keyof typeof reviewedSaveSuccessClauses],
  damageOnFailure: SavingThrowDamageEvent['damage_on_failed_save'],
): SavingThrowDamageEvent => ({
  kind: 'saving_throw_damage',
  event_id: routineEventId(`round-11:${clause.id}`),
  source: clause.effect_source,
  ability: clause.ability,
  save_dc: saveDifficultyClass(11),
  roll_state: 'normal',
  frequency: clause.frequency,
  duration: clause.duration,
  save_success_clause_id: clause.id,
  damage_on_failed_save: damageOnFailure,
  on_success: { kind: 'half', evidence: clause.evidence },
});

describe('round 11 concrete reproductions', () => {
  it('keeps every component of one source roll in one DamageInstance', () => {
    const clause = reviewedSaveSuccessClauses.finger_of_death;
    const canonical = foldSavingThrowEvent(saveEvent(clause, [
      damage(clause.effect_source, 'Necrotic', [dice(7, 8), flat(30)]),
    ]), target('Necrotic', 'resistant'));
    expect(canonical.status).toBe('available');
    if (canonical.status === 'available') {
      expect(canonical.expected_damage).toBeCloseTo(22.75, 12);
    }

    const crossInstance = foldSavingThrowEvent(saveEvent(clause, [
      damage(clause.effect_source, 'Necrotic', [dice(7, 8)]),
      damage(clause.effect_source, 'Necrotic', [flat(30)]),
    ]), target('Necrotic', 'resistant'));
    expect(crossInstance.status).toBe('unavailable');
    expect(crossInstance).not.toHaveProperty('expected_damage');

    const withinInstance = foldSavingThrowEvent(saveEvent(clause, [
      damage(clause.effect_source, 'Necrotic', [
        dice(3, 8),
        dice(4, 8),
        flat(12),
        flat(18),
      ]),
    ]), target('Necrotic', 'resistant'));
    expect(withinInstance.status).toBe('available');
    if (withinInstance.status === 'available') {
      expect(withinInstance.expected_damage).toBeCloseTo(22.75, 12);
    }
  });

  it('keeps distinct source rolls in distinct DamageInstances', () => {
    const clause = reviewedSaveSuccessClauses.flame_strike;
    const result = foldSavingThrowEvent(saveEvent(clause, [
      damage(clause.effect_source, 'Fire', [dice(5, 6)]),
      damage(clause.effect_source, 'Radiant', [dice(5, 6)]),
    ]), {
      save_bonus: targetSaveBonus(0),
      damage_responses: [
        { damage_type: damageType('Fire'), response: 'normal' },
        { damage_type: damageType('Radiant'), response: 'normal' },
      ],
    });
    expect(result.status).toBe('available');
    if (result.status === 'available') {
      expect(result.expected_damage).toBeCloseTo(26, 12);
    }
  });

  it('does not bind Earthquake damage availability to its escape check DC', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const earthquake = bodies.get('Earthquake');
    if (earthquake === undefined) {
      throw new Error('Missing Earthquake source body.');
    }
    const derived = deriveSaveDamageCoverageFromBodies(bodies)
      .clauses_by_heading.get('Earthquake')?.[0];
    expect(derived?.fixed_save_dc).toEqual({ status: 'available', value: null });

    const clause = reviewedSaveSuccessClauses.earthquake;
    expect(clause.unavailable_reason).toBeNull();
    expect(clause.fixed_save_dc).toBeNull();
    const result = foldSavingThrowEvent(saveEvent(clause, [
      damage(clause.effect_source, 'Bludgeoning', [dice(12, 6)]),
    ]), target('Bludgeoning'));
    expect(result.status).toBe('available');
    if (result.status === 'available') {
      expect(result.expected_damage).toBeCloseTo(31.375, 12);
    }

    const neighboringCheck = new Map(bodies);
    neighboringCheck.set('Earthquake', earthquake.replace(
      'structure equal to half the structure’s height makes a Dexterity saving throw.',
      'structure equal to half the structure’s height makes a Dexterity saving throw, and a creature already buried instead makes a DC 20 Strength (Athletics) check.',
    ));
    expect(deriveSaveDamageCoverageFromBodies(neighboringCheck)
      .clauses_by_heading.get('Earthquake')?.[0]?.fixed_save_dc)
      .toEqual({ status: 'available', value: null });
  });

  it('still binds supported save DCs and refuses unsupported save DC syntax', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const earthquake = bodies.get('Earthquake');
    if (earthquake === undefined) {
      throw new Error('Missing Earthquake fixed-save control body.');
    }

    const supported = new Map(bodies);
    supported.set('Earthquake', earthquake.replace(
      'structure equal to half the structure’s height makes a Dexterity saving throw',
      'structure equal to half the structure’s height makes a DC 14 Dexterity saving throw',
    ));
    expect(deriveSaveDamageCoverageFromBodies(supported)
      .clauses_by_heading.get('Earthquake')?.[0]?.fixed_save_dc)
      .toEqual({ status: 'available', value: 14 });

    const unsupported = new Map(bodies);
    unsupported.set('Earthquake', earthquake.replace(
      'structure equal to half the structure’s height makes a Dexterity saving throw',
      'structure equal to half the structure’s height makes a Dexterity saving throw (DC 14)',
    ));
    expect(deriveSaveDamageCoverageFromBodies(unsupported)
      .clauses_by_heading.get('Earthquake')?.[0]?.fixed_save_dc)
      .toEqual({
        status: 'unavailable',
        reason: 'The source fixed save DC syntax is not representable: DC 14.',
      });
  });

  it('enumerates every source-derived damage clause containing a DC', () => {
    expect(sourceDerivedSaveDamageCandidates
      .filter((candidate) => /\bDC\s*\d+\b/u.test(candidate.span))
      .map((candidate) => [candidate.heading, candidate.fixed_save_dc]))
      .toEqual([
        ['Contact Other Plane', { status: 'available', value: 15 }],
        ['Earthquake', { status: 'available', value: null }],
      ]);
  });

  it('pins complete numeric availability independently from success kind', () => {
    expect(Object.keys(reviewedSaveAvailabilityOracle)).toHaveLength(79);
    const unavailable = Object.entries(reviewedSaveAvailabilityOracle)
      .filter(([, availability]) => availability === 'unavailable')
      .map(([key]) => key);
    expect(unavailable).toEqual([
      'arcane_hand_grasping',
      'bestow_curse_damage',
      'dream',
      'enlarge_reduce_damage',
      'ensnaring_strike',
      'geas',
      'phantasmal_force',
      'prismatic_spray',
      'ray_of_enfeeblement',
      'searing_smite',
      'vitriolic_sphere',
    ]);
    expect(Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.unavailable_reason !== null)
      .map(([key]) => key))
      .toEqual(unavailable);
  });
});
