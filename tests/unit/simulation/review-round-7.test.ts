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
  type SavingThrowDamageEvent,
} from '../../../src/simulation/contracts';
import { foldSavingThrowEvent } from '../../../src/simulation/probability';
import {
  deriveSaveDamageCoverage,
  deriveSaveDamageCoverageFromBodies,
  spellDescriptionsByHeading,
  spellDescriptionsFromFullLayout,
} from '../../../src/simulation/spell-source-reader';

const spellExtractPath = 'docs/srd/source/spell-descriptions.txt';
const fullSrdPath = 'docs/srd/full/srd-5.2.1.txt';
const spellExtract = readFileSync(spellExtractPath, 'utf8');
const fullSrd = readFileSync(fullSrdPath, 'utf8');

function signatureText(heading: string): string[] {
  const candidate = sourceDerivedSaveDamageCandidates.find(
    (value) => value.heading === heading,
  );
  if (candidate === undefined) {
    throw new Error(`No source candidate for ${heading}.`);
  }
  return candidate.failed_damage_signatures.map((signature) => [
    signature.dice_count === null
      ? String(signature.flat_modifier)
      : `${String(signature.dice_count)}d${String(signature.die_size)}`,
    signature.damage_type ?? '*',
  ].join(' '));
}

describe('round 7 column-safe source evidence', () => {
  it('reconstructs the full two-column spell pages and matches the readable extract', () => {
    const fromFullLayout = spellDescriptionsFromFullLayout(fullSrd);
    const fromReadableExtract = spellDescriptionsByHeading(spellExtract);
    expect(fromFullLayout.size).toBe(339);
    expect([...fromFullLayout]).toEqual([...fromReadableExtract]);
    expect(() => spellDescriptionsByHeading(fullSrd)).toThrow(
      'explicit page/column markers',
    );
  });

  it('pins the complete signature diff caused by removing reverse associations', () => {
    expect({
      'Flame Strike': signatureText('Flame Strike'),
      'Ice Storm': signatureText('Ice Storm'),
      'Meteor Swarm': signatureText('Meteor Swarm'),
      'Spirit Guardians': signatureText('Spirit Guardians'),
      'Vitriolic Sphere': signatureText('Vitriolic Sphere'),
    }).toEqual({
      'Flame Strike': ['5d6 Fire', '5d6 Radiant'],
      'Ice Storm': ['2d10 Bludgeoning', '4d6 Cold'],
      'Meteor Swarm': ['20d6 Fire', '20d6 Bludgeoning'],
      'Spirit Guardians': ['3d8 Radiant', '3d8 Necrotic'],
      'Vitriolic Sphere': ['10d4 Acid', '5d4 Acid'],
    });
  });

  it('retains a distinct gate clause instead of deleting it by spell heading', () => {
    const bodies = new Map(spellDescriptionsByHeading(spellExtract));
    const original = bodies.get('Ensnaring Strike');
    if (original === undefined) {
      throw new Error('Missing Ensnaring Strike source body.');
    }
    bodies.set(
      'Ensnaring Strike',
      original.replace('While Restrained', 'While it has the Restrained condition') +
        ' A second creature makes a Strength saving throw. On a successful save, the spell ends. While Restrained, that creature takes 1d6 Piercing damage at the start of its turn.',
    );
    const mutated = deriveSaveDamageCoverageFromBodies(bodies);
    expect(mutated.counts).toEqual({
      before_deduplication: 81,
      after_deduplication: 80,
    });
    expect(mutated.clauses_by_heading.get('Ensnaring Strike')).toHaveLength(2);
  });

  it('finds the independent Ray of Frost paraphrase outside the direct extractor vocabulary', () => {
    const baseline = deriveSaveDamageCoverage(spellExtract);
    const bodies = new Map(baseline.bodies);
    const original = bodies.get('Ray of Frost');
    if (original === undefined) {
      throw new Error('Missing Ray of Frost source body.');
    }
    bodies.set(
      'Ray of Frost',
      `${original} After the hit, the target attempts a Dexterity save. It suffers 1d6 Fire damage on a failure and half that on a success.`,
    );
    const mutated = deriveSaveDamageCoverageFromBodies(bodies);
    expect(mutated.candidates).toHaveLength(baseline.candidates.length);
    expect(mutated.broad_suspects.some((suspect) =>
      suspect.heading === 'Ray of Frost' &&
      suspect.span.includes('attempts a Dexterity save'),
    )).toBe(true);
  });

  it('binds Wall of Ice stable IDs to their checked semantic clauses', () => {
    expect(reviewedSaveSuccessClauses.wall_of_ice_initial.id).toBe(
      'srd-5.2.1:spell:wall-of-ice:save:initial-damage',
    );
    expect(reviewedSaveSuccessClauses.wall_of_ice_initial.source_span)
      .toContain('10d6 Cold damage');
    expect(reviewedSaveSuccessClauses.wall_of_ice_frigid_air.id).toBe(
      'srd-5.2.1:spell:wall-of-ice:save:frigid-air-damage',
    );
    expect(reviewedSaveSuccessClauses.wall_of_ice_frigid_air.source_span)
      .toContain('5d6 Cold damage');
  });
});

function saveEvent(
  clause: typeof reviewedSaveSuccessClauses.flame_strike,
  damage: SavingThrowDamageEvent['damage_on_failed_save'],
): SavingThrowDamageEvent {
  return {
    kind: 'saving_throw_damage',
    event_id: routineEventId(`round-7:${clause.id}`),
    source: clause.effect_source,
    ability: clause.ability,
    save_dc: saveDifficultyClass(15),
    roll_state: 'normal',
    frequency: clause.frequency,
    duration: { kind: 'instantaneous' },
    save_success_clause_id: clause.id,
    damage_on_failed_save: damage,
    on_success: { kind: 'half', evidence: clause.evidence },
  };
}

const diceDamage = (
  clause: typeof reviewedSaveSuccessClauses.flame_strike,
  count: number,
  die: 6 | 10,
  type: 'Fire' | 'Radiant' | 'Bludgeoning' | 'Cold',
): SavingThrowDamageEvent['damage_on_failed_save'][number] => ({
  source: clause.effect_source,
  damage_type: damageType(type),
  components: [{
    kind: 'dice',
    pool: { count: positiveDiceCount(count), die },
  }],
});

describe('round 7 required damage coverage', () => {
  it('refuses Flame Strike Fire/Fire and accepts Fire/Radiant exactly once each', () => {
    const clause = reviewedSaveSuccessClauses.flame_strike;
    const fire = diceDamage(clause, 5, 6, 'Fire');
    const radiant = diceDamage(clause, 5, 6, 'Radiant');
    const target = {
      save_bonus: targetSaveBonus(0),
      damage_responses: [
        { damage_type: damageType('Fire'), response: 'immune' as const },
        { damage_type: damageType('Radiant'), response: 'vulnerable' as const },
      ],
    };
    const genuine = foldSavingThrowEvent(saveEvent(clause, [fire, radiant]), target);
    expect(genuine.status).toBe('available');
    if (genuine.status === 'available') {
      expect(genuine.expected_damage).toBeCloseTo(29.6, 12);
    }
    const mutated = foldSavingThrowEvent(saveEvent(clause, [fire, fire]), target);
    expect(mutated.status).toBe('unavailable');
  });

  it('refuses the exact Ice Storm 2d10-to-4d6 Bludgeoning mutation', () => {
    const clause = reviewedSaveSuccessClauses.ice_storm;
    const bludgeoning = diceDamage(clause, 2, 10, 'Bludgeoning');
    const cold = diceDamage(clause, 4, 6, 'Cold');
    const target = {
      save_bonus: targetSaveBonus(0),
      damage_responses: [
        { damage_type: damageType('Bludgeoning'), response: 'normal' as const },
        { damage_type: damageType('Cold'), response: 'normal' as const },
      ],
    };
    expect(foldSavingThrowEvent(saveEvent(clause, [bludgeoning, cold]), target).status)
      .toBe('available');
    const mutatedBludgeoning = diceDamage(clause, 4, 6, 'Bludgeoning');
    expect(foldSavingThrowEvent(
      saveEvent(clause, [mutatedBludgeoning, cold]),
      target,
    ).status).toBe('unavailable');
  });
});

describe('alternative damage slots accept exactly one alternative', () => {
  // The reviewed oracle models Spirit Guardians as ONE slot with TWO
  // alternatives, because the source reads "3d8 Radiant damage (if you are
  // good or neutral) or 3d8 Necrotic damage (if you are evil)" -- an OR, not
  // an AND. Nothing exercised that until now: the bijective matcher was proven
  // to REFUSE wrong payloads and never proven to ACCEPT a lawful one-alternative
  // payload. A matcher that demanded both would be silently wrong for every
  // either/or spell.
  it('accepts Spirit Guardians with only Radiant, and with only Necrotic', () => {
    const clause = reviewedSaveSuccessClauses.spirit_guardians;
    const target = {
      save_bonus: targetSaveBonus(0),
      damage_responses: [
        { damage_type: damageType('Radiant'), response: 'normal' as const },
        { damage_type: damageType('Necrotic'), response: 'normal' as const },
      ],
    };
    expect(foldSavingThrowEvent(
      saveEvent(clause, [diceDamage(clause, 3, 8, 'Radiant')]), target).status)
      .toBe('available');
    expect(foldSavingThrowEvent(
      saveEvent(clause, [diceDamage(clause, 3, 8, 'Necrotic')]), target).status)
      .toBe('available');
  });

  it('still refuses a damage type that satisfies neither alternative', () => {
    const clause = reviewedSaveSuccessClauses.spirit_guardians;
    const target = {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: damageType('Fire'), response: 'normal' as const }],
    };
    expect(foldSavingThrowEvent(
      saveEvent(clause, [diceDamage(clause, 3, 8, 'Fire')]), target).status)
      .toBe('unavailable');
  });
});
