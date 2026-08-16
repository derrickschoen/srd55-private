import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import {
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  targetSaveBonus,
  type DamageInstance,
  type SavingThrowDamageEvent,
} from '../../../src/simulation/contracts';
import {
  reviewedDamageRollSlotGroupOracle,
  reviewedFixedSaveDcOracle,
  reviewedSaveAvailabilityOracle,
  reviewedSaveSuccessClauses,
  reviewedSaveSuccessKindOracle,
  sourceDerivedSaveDamageCandidates,
} from '../../../src/simulation/coverage';
import {
  foldSavingThrowEvent,
} from '../../../src/simulation/probability';
import {
  deriveSaveDamageCoverageFromBodies,
  sourceFixedSaveDc,
  sourceSentences,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

const failedOccurrences = (body: string) =>
  deriveSaveDamageCoverageFromBodies(new Map([['Round 14 reproduction', body]]))
    .clauses_by_heading.get('Round 14 reproduction')?.[0]?.damage_occurrences
    .filter((occurrence) => occurrence.arm === 'failure') ?? [];

describe('round 14 fixed-save-DC drift alarms', () => {
  it('refuses a save-bearing roll threshold without DC vocabulary', () => {
    const body =
      'The target makes a Constitution saving throw. Roll 1d20. ' +
      'If the roll is 15 or higher, treat it as a successful save. ' +
      'On a successful save, the target takes no damage. ' +
      'On a failed save, the target takes 6d6 Poison damage.';

    expect(deriveSaveDamageCoverageFromBodies(new Map([['Threshold', body]]))
      .clauses_by_heading.get('Threshold')?.[0]?.fixed_save_dc).toEqual({
        status: 'unavailable',
        reason: 'The source fixed save DC syntax is not representable: roll is 15 or higher.',
      });
  });

  it('keeps known abbreviations inside their sentence and flags novel DC syntax', () => {
    const body =
      'The target makes a Wisdom saving throw against the DC of St. ' +
      'Cuthbert’s ward, which is 15. ' +
      'On a successful save, the target takes no damage. ' +
      'On a failed save, the target takes 6d6 Radiant damage.';

    expect(sourceSentences(body).map((sentence) => sentence.text.trim())).toEqual([
      'The target makes a Wisdom saving throw against the DC of St. Cuthbert’s ward, which is 15.',
      'On a successful save, the target takes no damage.',
      'On a failed save, the target takes 6d6 Radiant damage.',
    ]);
    expect(sourceFixedSaveDc(body)).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: DC of St. Cuthbert’s ward, which is 15.',
    });

    for (const continuation of [
      'St. Cuthbert',
      'Mt. Celestia',
      'Dr. Morden',
      'e.g., the ward',
      'i.e., the ward',
      'vs. DC 15',
    ]) {
      expect(sourceSentences(`The source names ${continuation} before the save.`)).toHaveLength(1);
    }
  });

  it('attributes a following fixed DC to its escape check before recognizing save DCs', () => {
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw against your spell save DC. ' +
      'On a failed save, it takes 6d6 Fire damage and is restrained. ' +
      'The DC is 15 for the Strength check to escape. ' +
      'On a successful save, it takes no damage.',
    )).toEqual({ status: 'available', value: null });
  });

  it('accepts check-owned scaling and em-dash fixed-DC controls', () => {
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw against your spell save DC. ' +
      'To escape, it can make a Strength check; the check DC increases by 1 ' +
      'for each slot level above 5.',
    )).toEqual({ status: 'available', value: null });
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw. To escape, it makes a Strength check—DC 15.',
    )).toEqual({ status: 'available', value: null });
  });
});

describe('round 14 damage-roll grouping drift alarms', () => {
  it('scopes each explicit one-roll phrase to its own occurrence group', () => {
    const body =
      'A creature makes a Dexterity saving throw, taking 1d6 Fire damage plus ' +
      '2d6 Fire damage as one damage roll and 3d6 Fire damage plus ' +
      '4d6 Fire damage as one damage roll on a failed save. ' +
      'On a successful save, the creature takes no damage.';
    expect(failedOccurrences(body).map((occurrence) => [
      occurrence.slot_index,
      occurrence.roll_index,
    ])).toEqual([[0, 0], [1, 0], [2, 1], [3, 1]]);

    const damage = (
      source: DamageInstance['source'],
      count: number,
      type: 'Cold' | 'Fire' | 'Radiant',
    ): DamageInstance => ({
      source,
      damage_type: damageType(type),
      components: [{
        kind: 'dice',
        pool: { count: positiveDiceCount(count), die: 6 },
      }],
    });
    const event = (
      clause: (typeof reviewedSaveSuccessClauses)[keyof typeof reviewedSaveSuccessClauses],
      instances: [DamageInstance, ...DamageInstance[]],
    ): SavingThrowDamageEvent => ({
      kind: 'saving_throw_damage',
      event_id: routineEventId(`round-14:one-roll:${String(instances.length)}`),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(21),
      roll_state: 'normal',
      save_success_clause_id: clause.id,
      frequency: clause.frequency,
      duration: clause.duration,
      damage_on_failed_save: instances,
      on_success: { kind: 'half', evidence: clause.evidence },
    });
    const flameStrike = reviewedSaveSuccessClauses.flame_strike;
    const freezingSphere = reviewedSaveSuccessClauses.freezing_sphere;
    const responses = ['Cold', 'Fire', 'Radiant'].map((type) => ({
      damage_type: damageType(type),
      response: 'resistant' as const,
    }));
    const target = {
      save_bonus: targetSaveBonus(0),
      damage_responses: responses,
    };
    const separateRolls = foldSavingThrowEvent(event(flameStrike, [
      damage(flameStrike.effect_source, 5, 'Fire'),
      damage(flameStrike.effect_source, 5, 'Radiant'),
    ]), target);
    const oneRoll = foldSavingThrowEvent(event(freezingSphere, [
      damage(freezingSphere.effect_source, 10, 'Cold'),
    ]), target);
    expect(separateRolls.status).toBe('available');
    expect(oneRoll.status).toBe('available');
    if (separateRolls.status !== 'available' || oneRoll.status !== 'available') {
      throw new Error('Both reviewed damage-roll groupings must remain available.');
    }
    // DC 21 vs +0 fails on every face. For S made of d6s,
    // E[floor(S/2)] = (E[S] - P(S odd)) / 2 and P(S odd) = 1/2:
    // two separate 5d6 rolls give 2 * (17.5 - 0.5) / 2 = 17;
    // one 10d6 roll gives (35 - 0.5) / 2 = 17.25.
    expect(separateRolls.expected_damage).toBeCloseTo(17, 12);
    expect(oneRoll.expected_damage).toBeCloseTo(17.25, 12);
  });

  it('keeps additive damage separate when an intervening clause contains broad or', () => {
    const body =
      'A creature makes a Dexterity saving throw, taking 1d6 Fire damage and, ' +
      'whether it is a creature or object, also taking 2d6 Cold damage on a failed save. ' +
      'On a successful save, it takes no damage.';
    expect(failedOccurrences(body).map((occurrence) => [
      occurrence.damage_type,
      occurrence.slot_index,
      occurrence.roll_index,
    ])).toEqual([
      ['Fire', 0, 0],
      ['Cold', 1, 1],
    ]);
  });
});

describe('D259 registration-required folding', () => {
  it('makes the grouping oracle total without changing the six multi-slot values', () => {
    expect(Object.keys(reviewedDamageRollSlotGroupOracle)).toHaveLength(79);
    expect(new Set(Object.keys(reviewedDamageRollSlotGroupOracle)))
      .toEqual(new Set(Object.keys(reviewedSaveSuccessClauses)));
    expect(Object.fromEntries(Object.entries(reviewedDamageRollSlotGroupOracle)
      .filter(([, groups]) => groups.length > 1 || (groups[0]?.length ?? 0) > 1)))
      .toEqual({
        disintegrate: [[0, 1]],
        finger_of_death: [[0, 1]],
        flame_strike: [[0], [1]],
        ice_storm: [[0], [1]],
        meteor_swarm: [[0], [1]],
        vitriolic_sphere: [[0], [1]],
      });
  });

  it('refuses an otherwise valid event when its clause is unregistered', () => {
    const clause = reviewedSaveSuccessClauses.acid_splash;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-14:unregistered-clause'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: clause.frequency,
      duration: clause.duration,
      save_success_clause_id: 'srd-5.2.1:spell:unregistered-composition:save:damage',
      damage_on_failed_save: [{
        source: clause.effect_source,
        damage_type: damageType('Acid'),
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(1), die: 6 },
        }],
      }],
      on_success: { kind: 'none', evidence: clause.evidence },
    };
    const target = {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: damageType('Acid'), response: 'normal' as const }],
    };

    expect(foldSavingThrowEvent(event, target).status).toBe('unavailable');
    expect(foldSavingThrowEvent({ ...event, save_success_clause_id: clause.id }, target).status)
      .toBe('available');
  });

  it('preserves the complete valid-case controls', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const corpusSentences = [...bodies].flatMap(([, body]) => sourceSentences(body));
    const numericDcSentences = corpusSentences.filter(({ text }) =>
      /\b(?:DC|D\.C\.|Difficulty Class)\s*(?:(?:is|equals|of)\s+|[:=]\s*)?\d+\b/iu
        .test(text)
    );

    expect(sourceDerivedSaveDamageCandidates).toHaveLength(79);
    expect(sourceDerivedSaveDamageCandidates.every((candidate) =>
      candidate.fixed_save_dc.status === 'available'
    )).toBe(true);
    expect(numericDcSentences).toHaveLength(4);
    expect(numericDcSentences.filter(({ text }) => {
      const parsed = sourceFixedSaveDc(text);
      return parsed.status === 'available' && parsed.value !== null;
    })).toHaveLength(1);
    expect(reviewedFixedSaveDcOracle.contact_other_plane).toBe(15);
    expect(reviewedFixedSaveDcOracle.earthquake).toBeNull();
    expect(corpusSentences.filter(({ text }) => /\bcheck(?:s|ing)?\b/iu.test(text)))
      .toHaveLength(42);
    expect(Object.keys(reviewedSaveSuccessKindOracle)).toHaveLength(79);
    expect(Object.keys(reviewedSaveAvailabilityOracle)).toHaveLength(79);
    expect(Object.values(reviewedSaveAvailabilityOracle)
      .filter((availability) => availability === 'unavailable')).toHaveLength(11);
  });
});
