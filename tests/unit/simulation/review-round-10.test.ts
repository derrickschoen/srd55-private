import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import {
  positiveDiceCount,
  positiveResourceMaximum,
  routineEventId,
  saveDifficultyClass,
  simResourceId,
  simResourcePoolKey,
  simResourcePoolSet,
  sourceStableKey,
  targetSaveBonus,
  type DamageComponent,
  type DamageInstance,
  type SavingThrowDamageEvent,
  type SimResourcePool,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  reviewedSaveSuccessClauses,
  reviewedSaveSuccessKindOracle,
} from '../../../src/simulation/coverage';
import {
  composeRoundDamageFolds,
  foldSavingThrowEvent,
} from '../../../src/simulation/probability';
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
  count: number,
  die: 4 | 6 | 8 | 10 | 12,
): DamageInstance => ({
  source,
  damage_type: damageType(type),
  components: [{ kind: 'dice', pool: { count: positiveDiceCount(count), die } }],
});

const damageWithComponents = (
  source: DamageInstance['source'],
  type: string,
  components: DamageComponent[],
): DamageInstance => ({
  source,
  damage_type: damageType(type),
  components: components as [DamageComponent, ...DamageComponent[]],
});

const saveEvent = (
  clause: (typeof reviewedSaveSuccessClauses)[keyof typeof reviewedSaveSuccessClauses],
  input: Pick<SavingThrowDamageEvent, 'damage_on_failed_save' | 'on_success'> &
    Partial<Pick<SavingThrowDamageEvent, 'event_id' | 'frequency' | 'duration'>>,
): SavingThrowDamageEvent => ({
  kind: 'saving_throw_damage',
  event_id: input.event_id ?? routineEventId(`round-10:${clause.id}`),
  source: clause.effect_source,
  ability: clause.ability,
  save_dc: saveDifficultyClass(11),
  roll_state: 'normal',
  frequency: input.frequency ?? clause.frequency,
  duration: input.duration ?? clause.duration,
  save_success_clause_id: clause.id,
  damage_on_failed_save: input.damage_on_failed_save,
  on_success: input.on_success,
});

describe('round 10 concrete reproductions', () => {
  it('derives Befuddlement half damage across intervening repeat-save prose', () => {
    const clause = reviewedSaveSuccessClauses.befuddlement;
    expect(clause.kind).toBe('half');
    const result = foldSavingThrowEvent(saveEvent(clause, {
      damage_on_failed_save: [damage(clause.effect_source, 'Psychic', 10, 12)],
      on_success: { kind: 'half', evidence: clause.evidence },
    }), target('Psychic'));
    expect(result.status).toBe('available');
    if (result.status === 'available') {
      expect(result.expected_damage).toBeCloseTo(48.625, 12);
    }

    const bodies = spellDescriptionsByHeading(spellExtract);
    const body = bodies.get('Befuddlement');
    if (body === undefined) throw new Error('Missing Befuddlement source body.');
    const relocated = new Map(bodies);
    relocated.set('Befuddlement', body.replace(
      'At the end of every 30 days, the target repeats the save, ending the effect on a success. The effect can also be ended by the Greater Restoration, Heal, or Wish spell. On a successful save, the target takes half as much damage only.',
      'On a successful save, the target takes half as much damage only. At the end of every 30 days, the target repeats the save, ending the effect on a success. The effect can also be ended by the Greater Restoration, Heal, or Wish spell.',
    ));
    expect(deriveSaveDamageCoverageFromBodies(relocated)
      .clauses_by_heading.get('Befuddlement')?.[0]?.success)
      .toEqual({ status: 'available', kind: 'half' });
  });

  it('keeps DamageInstance as the resistance-rounding boundary', () => {
    const clause = reviewedSaveSuccessClauses.conjure_animals;
    const event = (instances: SavingThrowDamageEvent['damage_on_failed_save']) =>
      saveEvent(clause, {
        damage_on_failed_save: instances,
        on_success: { kind: 'none', evidence: clause.evidence },
      });
    const canonical = foldSavingThrowEvent(
      event([damage(clause.effect_source, 'Slashing', 3, 10)]),
      target('Slashing', 'resistant'),
    );
    expect(canonical.status).toBe('available');
    if (canonical.status === 'available') {
      expect(canonical.expected_damage).toBeCloseTo(4, 12);
    }

    const crossInstance = foldSavingThrowEvent(event([
      damage(clause.effect_source, 'Slashing', 1, 10),
      damage(clause.effect_source, 'Slashing', 2, 10),
    ]), target('Slashing', 'resistant'));
    expect(crossInstance.status).toBe('unavailable');
    expect(crossInstance).not.toHaveProperty('expected_damage');

    const withinInstance = foldSavingThrowEvent(event([
      damageWithComponents(clause.effect_source, 'Slashing', [
        { kind: 'dice', pool: { count: positiveDiceCount(1), die: 10 } },
        { kind: 'dice', pool: { count: positiveDiceCount(2), die: 10 } },
      ]),
    ]), target('Slashing', 'resistant'));
    expect(withinInstance.status).toBe('available');
    if (withinInstance.status === 'available') {
      expect(withinInstance.expected_damage).toBeCloseTo(4, 12);
    }
  });

  it('preserves source recurrence through round composition', () => {
    const conjure = reviewedSaveSuccessClauses.conjure_animals;
    const fold = foldSavingThrowEvent(saveEvent(conjure, {
      damage_on_failed_save: [damage(conjure.effect_source, 'Slashing', 3, 10)],
      on_success: { kind: 'none', evidence: conjure.evidence },
    }), target('Slashing'));
    expect(fold.status).toBe('available');
    const duplicated = composeRoundDamageFolds([fold, fold]);
    expect(duplicated.status).toBe('unavailable');
    expect(duplicated).not.toHaveProperty('expected_damage');
    if (duplicated.status === 'unavailable' && 'failures' in duplicated) {
      expect(duplicated.failures[0].reason).toContain('once per turn');
    }

    const relabeled = foldSavingThrowEvent(saveEvent(conjure, {
      event_id: routineEventId(`round-10:relabeled:${conjure.id}`),
      damage_on_failed_save: [damage(conjure.effect_source, 'Slashing', 3, 10)],
      on_success: { kind: 'none', evidence: conjure.evidence },
    }), target('Slashing'));
    const relabeledDuplicate = composeRoundDamageFolds([fold, relabeled]);
    expect(relabeledDuplicate.status).toBe('unavailable');
    expect(relabeledDuplicate).not.toHaveProperty('expected_damage');

    const spirit = reviewedSaveSuccessClauses.spirit_guardians;
    const independent = foldSavingThrowEvent(saveEvent(spirit, {
      damage_on_failed_save: [damage(spirit.effect_source, 'Radiant', 3, 8)],
      on_success: { kind: 'half', evidence: spirit.evidence },
    }), target('Radiant'));
    const distinct = composeRoundDamageFolds([fold, independent]);
    expect(distinct.status).toBe('available');
    if (distinct.status === 'available') {
      expect(distinct.expected_damage).toBeCloseTo(18.25, 12);
    }

    const tsunami = reviewedSaveSuccessClauses.tsunami_ongoing;
    const tsunamiFold = foldSavingThrowEvent(saveEvent(tsunami, {
      damage_on_failed_save: [damage(tsunami.effect_source, 'Bludgeoning', 5, 10)],
      on_success: { kind: 'none', evidence: tsunami.evidence },
    }), target('Bludgeoning'));
    const duplicateRound = composeRoundDamageFolds([tsunamiFold, tsunamiFold]);
    expect(duplicateRound.status).toBe('unavailable');
    expect(duplicateRound).not.toHaveProperty('expected_damage');

    expect(reviewedSaveSuccessClauses.symbol.frequency.kind).toBe('once_per_turn');
    expect(reviewedSaveSuccessClauses.wall_of_ice_frigid_air.frequency.kind)
      .toBe('once_per_turn');
  });

  it('refuses delayed damage until a turn scheduler exists', () => {
    const clause = reviewedSaveSuccessClauses.vitriolic_sphere;
    const result = foldSavingThrowEvent(saveEvent(clause, {
      damage_on_failed_save: [
        damage(clause.effect_source, 'Acid', 10, 4),
        damage(clause.effect_source, 'Acid', 5, 4),
      ],
      on_success: {
        kind: 'sourced_damage',
        evidence: clause.evidence,
        damage: [damage(clause.effect_source, 'Acid', 10, 4)],
        roll_transform: 'floor_half',
      },
    }), target('Acid'));
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
    if (result.status === 'unavailable') {
      expect(result.reason).toContain('delayed');
    }

    const fireball = reviewedSaveSuccessClauses.fireball;
    const instantaneous = foldSavingThrowEvent(saveEvent(fireball, {
      damage_on_failed_save: [damage(fireball.effect_source, 'Fire', 8, 6)],
      on_success: { kind: 'half', evidence: fireball.evidence },
    }), target('Fire'));
    expect(instantaneous.status).toBe('available');
  });

  it('does not let alias construction relabel an independent pool ID', () => {
    const source = (key: string): SourceRef & { readonly kind: 'catalog_content' } => {
      const stableKey = sourceStableKey(key);
      return {
        kind: 'catalog_content',
        content_key: String(stableKey) as ContentKey,
        stable_key: stableKey,
      };
    };
    const first: SimResourcePool = {
      id: simResourceId('round-10:first'),
      logical_key: simResourcePoolKey('round-10:first'),
      source: source('round-10:source'),
      maximum: positiveResourceMaximum(5),
      recovery: { short_rest: { kind: 'none' }, long_rest: { kind: 'none' } },
    };
    const independent: SimResourcePool = {
      ...first,
      id: simResourceId('round-10:independent'),
      logical_key: simResourcePoolKey('round-10:independent'),
    };
    expect(() => simResourcePoolSet([first, independent])).not.toThrow();
    expect(() => simResourcePoolSet([
      first,
      { ...first, id: independent.id },
    ])).toThrow('aliasing is unsupported');
  });

  it('refuses Prismatic Spray until its random ray selection is represented', () => {
    const clause = reviewedSaveSuccessClauses.prismatic_spray;
    const result = foldSavingThrowEvent(saveEvent(clause, {
      damage_on_failed_save: [damage(clause.effect_source, 'Fire', 12, 6)],
      on_success: { kind: 'half', evidence: clause.evidence },
    }), target('Fire'));
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
    if (result.status === 'unavailable') {
      expect(result.reason).toContain('random');
    }

    const oneRayExpectation = 31.375;
    const damagingRayMultiplier = 5 / 8 + (1 / 8) * 2 * (5 / 7);
    expect(oneRayExpectation * damagingRayMultiplier)
      .toBeCloseTo(25.2120535714, 10);

    const fireball = reviewedSaveSuccessClauses.fireball;
    expect(foldSavingThrowEvent(saveEvent(fireball, {
      damage_on_failed_save: [damage(fireball.effect_source, 'Fire', 8, 6)],
      on_success: { kind: 'half', evidence: fireball.evidence },
    }), target('Fire')).status).toBe('available');
  });
});

describe('round 10 non-vacuous source mutations', () => {
  it('covers every reviewed clause with an independent success-kind oracle', () => {
    expect(Object.keys(reviewedSaveSuccessKindOracle)).toHaveLength(79);
    expect(new Set(Object.keys(reviewedSaveSuccessKindOracle)))
      .toEqual(new Set(Object.keys(reviewedSaveSuccessClauses)));
    for (const [key, expectedKind] of Object.entries(reviewedSaveSuccessKindOracle)) {
      expect(
        reviewedSaveSuccessClauses[key as keyof typeof reviewedSaveSuccessClauses].kind,
        key,
      ).toBe(expectedKind);
    }
  });

  it('refuses an unrecognized delayed-damage timing', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const vitriolic = bodies.get('Vitriolic Sphere');
    if (vitriolic === undefined) {
      throw new Error('Missing Vitriolic Sphere source mutation fixture.');
    }
    const mutated = new Map(bodies);
    mutated.set('Vitriolic Sphere', vitriolic.replace(
      'at the end of its next turn',
      'at the start of its next turn',
    ));
    expect(deriveSaveDamageCoverageFromBodies(mutated).clauses_by_heading
      .get('Vitriolic Sphere')?.[0]?.timing_unavailable_reason)
      .toContain('start of its next turn');
  });

  it('refuses an unrecognized recurrence cap', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const tsunami = bodies.get('Tsunami');
    if (tsunami === undefined) {
      throw new Error('Missing Tsunami source mutation fixture.');
    }
    const mutated = new Map(bodies);
    mutated.set('Tsunami', tsunami.replace(
      'only once per round',
      'only twice per round',
    ));
    expect(deriveSaveDamageCoverageFromBodies(mutated).clauses_by_heading
      .get('Tsunami')?.[1]?.frequency.kind).toBe('unavailable');
  });

  it('accepts the supported alternate fixed-DC syntax', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const contact = bodies.get('Contact Other Plane');
    if (contact === undefined) {
      throw new Error('Missing Contact Other Plane source mutation fixture.');
    }
    const alternate = new Map(bodies);
    alternate.set('Contact Other Plane', contact.replace(
      'DC 15 Intelligence saving throw',
      'Intelligence saving throw against DC 15',
    ));
    expect(deriveSaveDamageCoverageFromBodies(alternate).clauses_by_heading
      .get('Contact Other Plane')?.[0]?.fixed_save_dc)
      .toEqual({ status: 'available', value: 15 });
  });

  it('refuses an unrecognized fixed-DC syntax', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const contact = bodies.get('Contact Other Plane');
    if (contact === undefined) {
      throw new Error('Missing Contact Other Plane source mutation fixture.');
    }
    const unknown = new Map(bodies);
    unknown.set('Contact Other Plane', contact.replace(
      'DC 15 Intelligence saving throw',
      'Intelligence saving throw (DC 15)',
    ));
    expect(deriveSaveDamageCoverageFromBodies(unknown).clauses_by_heading
      .get('Contact Other Plane')?.[0]?.fixed_save_dc).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: DC 15.',
    });
  });

  it('accepts the source fixed-DC syntax as the valid control', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    expect(deriveSaveDamageCoverageFromBodies(bodies).clauses_by_heading
      .get('Contact Other Plane')?.[0]?.fixed_save_dc)
      .toEqual({ status: 'available', value: 15 });
  });

  it('refuses an unrecognized damage repetition and accepts the singular control', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const acid = bodies.get('Acid Splash');
    if (acid === undefined) {
      throw new Error('Missing Acid Splash source mutation fixture.');
    }
    const mutated = new Map(bodies);
    mutated.set('Acid Splash', `${acid} The target takes this damage twice.`);
    expect(deriveSaveDamageCoverageFromBodies(mutated).clauses_by_heading
      .get('Acid Splash')?.[0]?.repetitions.status).toBe('unavailable');

    expect(deriveSaveDamageCoverageFromBodies(bodies).clauses_by_heading
      .get('Acid Splash')?.[0]?.repetitions)
      .toEqual({ status: 'available', minimum: 1, maximum: 1 });
  });

  it('keeps an explicit no-damage success arm classified as none', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const disintegrate = bodies.get('Disintegrate');
    if (disintegrate === undefined) {
      throw new Error('Missing Disintegrate source mutation fixture.');
    }
    const mutated = new Map(bodies);
    mutated.set(
      'Disintegrate',
      `${disintegrate} On a successful save, the target takes no damage.`,
    );
    expect(deriveSaveDamageCoverageFromBodies(mutated).clauses_by_heading
      .get('Disintegrate')?.[0]?.success)
      .toEqual({ status: 'available', kind: 'none' });
  });
});
