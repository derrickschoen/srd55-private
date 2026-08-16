import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import {
  reviewedSaveSuccessClauses,
  sourceDerivedSaveDamageCandidates,
} from '../../../src/simulation/coverage';
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
  type DamageInstance,
  type SavingThrowDamageEvent,
  type SimResourcePool,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  composeRoundDamageFolds,
  foldSavingThrowEvent,
} from '../../../src/simulation/probability';
import { spellDescriptionsFromFullLayout } from '../../../src/simulation/spell-source-reader';
import {
  deriveSaveDamageCoverageFromBodies,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

const source = (key: string): SourceRef & { readonly kind: 'catalog_content' } => {
  const stableKey = sourceStableKey(key);
  return {
    kind: 'catalog_content',
    content_key: String(stableKey) as ContentKey,
    stable_key: stableKey,
  };
};

const damage = (
  effect: DamageInstance['source'],
  type: string,
  count: number,
  die: 4 | 6 | 8 | 10,
): DamageInstance => ({
  source: effect,
  damage_type: damageType(type),
  components: [{
    kind: 'dice',
    pool: { count: positiveDiceCount(count), die },
  }],
});

const target = (...types: readonly string[]) => ({
  save_bonus: targetSaveBonus(0),
  damage_responses: types.map((type) => ({
    damage_type: damageType(type),
    response: 'normal' as const,
  })),
});

const saveEvent = (
  clause: (typeof reviewedSaveSuccessClauses)[keyof typeof reviewedSaveSuccessClauses],
  input: Pick<SavingThrowDamageEvent, 'save_dc' | 'frequency' | 'duration' |
    'damage_on_failed_save' | 'on_success'>,
): SavingThrowDamageEvent => ({
  kind: 'saving_throw_damage',
  event_id: routineEventId(`round-9:${clause.id}`),
  source: clause.effect_source,
  ability: clause.ability,
  save_success_clause_id: clause.id,
  roll_state: 'normal',
  ...input,
});

describe('round 9 refusal discipline reproductions', () => {
  it('refuses gate clauses that do not deal failed-save damage', () => {
    const searing = reviewedSaveSuccessClauses.searing_smite;
    const searingResult = foldSavingThrowEvent(saveEvent(searing, {
      save_dc: saveDifficultyClass(11),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage_on_failed_save: [damage(searing.effect_source, 'Fire', 1, 6)],
      on_success: { kind: 'none', evidence: searing.evidence },
    }), target('Fire'));
    expect(searingResult.status).toBe('unavailable');
    expect(searingResult).not.toHaveProperty('expected_damage');
    const composed = composeRoundDamageFolds([searingResult]);
    expect(composed.status).toBe('unavailable');
    expect(composed).not.toHaveProperty('expected_damage');

    const enfeeblement = reviewedSaveSuccessClauses.ray_of_enfeeblement;
    const rayResult = foldSavingThrowEvent(saveEvent(enfeeblement, {
      save_dc: saveDifficultyClass(11),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage_on_failed_save: [damage(enfeeblement.effect_source, 'Fire', 1, 8)],
      on_success: { kind: 'none', evidence: enfeeblement.evidence },
    }), target('Fire'));
    expect(rayResult.status).toBe('unavailable');
    expect(rayResult).not.toHaveProperty('expected_damage');

    const acid = reviewedSaveSuccessClauses.acid_splash;
    expect(foldSavingThrowEvent(saveEvent(acid, {
      save_dc: saveDifficultyClass(11),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage_on_failed_save: [damage(acid.effect_source, 'Acid', 1, 6)],
      on_success: { kind: 'none', evidence: acid.evidence },
    }), target('Acid')).status).toBe('available');
  });

  it('binds a recurring save to its source-derived cadence', () => {
    const clause = reviewedSaveSuccessClauses.tsunami_ongoing;
    const input = {
      save_dc: saveDifficultyClass(11),
      duration: { kind: 'instantaneous' } as const,
      damage_on_failed_save: [
        damage(clause.effect_source, 'Bludgeoning', 5, 10),
      ] as const,
      on_success: { kind: 'none' as const, evidence: clause.evidence },
    };
    expect(foldSavingThrowEvent(saveEvent(clause, {
      ...input,
      frequency: { kind: 'each_declared_event' },
    }), target('Bludgeoning')).status).toBe('unavailable');
    expect(foldSavingThrowEvent(saveEvent(clause, {
      ...input,
      frequency: { kind: 'once_per_round', evidence: clause.evidence },
    }), target('Bludgeoning')).status).toBe('available');
  });

  it('binds Contact Other Plane to source-fixed DC 15', () => {
    const clause = reviewedSaveSuccessClauses.contact_other_plane;
    const event = (dc: number): SavingThrowDamageEvent => saveEvent(clause, {
      save_dc: saveDifficultyClass(dc),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage_on_failed_save: [damage(clause.effect_source, 'Psychic', 6, 6)],
      on_success: { kind: 'none', evidence: clause.evidence },
    });
    expect(foldSavingThrowEvent(event(11), target('Psychic')).status)
      .toBe('unavailable');
    const genuine = foldSavingThrowEvent(event(15), target('Psychic'));
    expect(genuine.status).toBe('available');
    if (genuine.status === 'available') {
      expect(genuine.expected_damage).toBeCloseTo(14.7, 12);
    }
  });

  it('refuses resource-pool aliasing and accepts independent pools', () => {
    const first: SimResourcePool = {
      id: simResourceId('round-9:first'),
      logical_key: simResourcePoolKey('round-9:claimed-alias'),
      source: source('round-9:first'),
      maximum: positiveResourceMaximum(1),
      recovery: { short_rest: { kind: 'none' }, long_rest: { kind: 'none' } },
    };
    const second: SimResourcePool = {
      ...first,
      id: simResourceId('round-9:second'),
      source: source('round-9:second'),
    };
    expect(() => simResourcePoolSet([first, second])).toThrow('aliasing is unsupported');
    expect(() => simResourcePoolSet([
      first,
      { ...first, id: simResourceId('round-9:same-source-claim') },
    ])).toThrow('aliasing is unsupported');
    expect(() => simResourcePoolSet([
      first,
      { ...second, logical_key: simResourcePoolKey('round-9:independent') },
    ])).not.toThrow();
  });

  it('keeps roll-boundary, type, arm, and clause partitions distinct', () => {
    const clause = reviewedSaveSuccessClauses.vitriolic_sphere;
    const event = saveEvent(clause, {
      save_dc: saveDifficultyClass(11),
      frequency: { kind: 'each_declared_event' },
      duration: clause.duration,
      damage_on_failed_save: [
        damage(clause.effect_source, 'Acid', 4, 4),
        damage(clause.effect_source, 'Acid', 6, 4),
        damage(clause.effect_source, 'Acid', 5, 4),
      ],
      on_success: {
        kind: 'sourced_damage',
        evidence: clause.evidence,
        damage: [damage(clause.effect_source, 'Acid', 10, 4)],
        roll_transform: 'floor_half',
      },
    });
    const result = foldSavingThrowEvent(event, target('Acid'));
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
    expect(foldSavingThrowEvent({
      ...event,
      damage_on_failed_save: [
        damage(clause.effect_source, 'Acid', 4, 4),
        damage(clause.effect_source, 'Fire', 6, 4),
        damage(clause.effect_source, 'Acid', 5, 4),
      ],
    }, target('Acid', 'Fire')).status).toBe('unavailable');

    const conjureAnimals = reviewedSaveSuccessClauses.conjure_animals;
    const splitAcrossInstances = foldSavingThrowEvent(saveEvent(conjureAnimals, {
      save_dc: saveDifficultyClass(11),
      frequency: conjureAnimals.frequency,
      duration: conjureAnimals.duration,
      damage_on_failed_save: [
        damage(conjureAnimals.effect_source, 'Slashing', 1, 10),
        damage(conjureAnimals.effect_source, 'Slashing', 2, 10),
      ],
      on_success: { kind: 'none', evidence: conjureAnimals.evidence },
    }), target('Slashing'));
    expect(splitAcrossInstances.status).toBe('unavailable');
    expect(splitAcrossInstances).not.toHaveProperty('expected_damage');
  });

  it('gives the explicit D239 workflow when page pins fail', () => {
    const fullSrd = readFileSync('docs/srd/full/srd-5.2.1.txt', 'utf8');
    expect(spellDescriptionsFromFullLayout(fullSrd).size).toBe(339);
    expect(() => spellDescriptionsFromFullLayout(fullSrd.replace(
      '175   System Reference Document 5.2.1',
      '176   System Reference Document 5.2.1',
    ))).toThrow(/re-pin.*justification.*what changed and why/iu);
  });
});

describe('round 9 exhaustive source classifications', () => {
  it('derives all 26 former none arms or refuses the eight gate clauses', () => {
    const derivedNone = [
      'acid_splash',
      'black_tentacles',
      'conjure_animals',
      'conjure_elemental_initial',
      'conjure_elemental_repeat',
      'contagion',
      'contact_other_plane',
      'disintegrate',
      'dream',
      'faithful_hound',
      'ice_knife',
      'phantasmal_killer_repeat',
      'sacred_flame',
      'storm_of_vengeance_initial',
      'tsunami_ongoing',
      'vicious_mockery',
      'weird_repeat',
    ] as const;
    const refused = [
      'arcane_hand_grasping',
      'bestow_curse_damage',
      'enlarge_reduce_damage',
      'ensnaring_strike',
      'geas',
      'phantasmal_force',
      'ray_of_enfeeblement',
      'searing_smite',
    ] as const;
    const productionNone = Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.kind === 'none')
      .map(([key]) => key);
    const productionUnavailable = Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.kind === 'unavailable')
      .map(([key]) => key);
    expect(new Set(productionNone)).toEqual(new Set(derivedNone));
    expect(new Set(productionUnavailable)).toEqual(new Set(refused));
    expect(refused.filter((key) => {
      const reason = reviewedSaveSuccessClauses[key].unavailable_reason;
      return reason === null || reason.trim().length === 0;
    })).toEqual([]);
  });

  it('enumerates every non-default cadence and delayed clause', () => {
    const nonDefaultCadences = Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.frequency.kind !== 'each_declared_event')
      .map(([key, clause]) => [
        key,
        clause.frequency.kind,
        clause.frequency.kind === 'once_per_turn' ? clause.frequency.turn : null,
      ]);
    expect(nonDefaultCadences).toEqual([
      ['black_tentacles', 'once_per_turn', 'target'],
      ['blade_barrier', 'once_per_turn', 'target'],
      ['cloudkill', 'once_per_turn', 'target'],
      ['conjure_animals', 'once_per_turn', 'target'],
      ['conjure_celestial', 'once_per_turn', 'target'],
      ['conjure_elemental_repeat', 'once_per_turn', 'target'],
      ['conjure_woodland_beings', 'once_per_turn', 'target'],
      ['control_water', 'once_per_turn', 'target'],
      ['guardian_of_faith', 'once_per_turn', 'target'],
      ['incendiary_cloud', 'once_per_turn', 'target'],
      ['insect_plague', 'once_per_turn', 'target'],
      ['moonbeam', 'once_per_turn', 'target'],
      ['phantasmal_killer_repeat', 'once_per_turn', 'target'],
      ['searing_smite', 'once_per_turn', 'target'],
      ['spirit_guardians', 'once_per_turn', 'target'],
      ['symbol', 'once_per_turn', 'target'],
      ['tsunami_ongoing', 'once_per_round', null],
      ['wall_of_ice_frigid_air', 'once_per_turn', 'target'],
      ['wall_of_thorns_slashing', 'once_per_turn', 'target'],
      ['weird_repeat', 'once_per_turn', 'target'],
    ]);
    expect(Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.duration.kind !== 'instantaneous')
      .map(([key, clause]) => [key, clause.duration]))
      .toEqual([[
        'vitriolic_sphere',
        {
          kind: 'includes_delayed_damage',
          delayed_until: 'end_of_target_next_turn',
        },
      ]]);
    expect(Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.fixed_save_dc !== null)
      .map(([key, clause]) => [key, clause.fixed_save_dc]))
      .toEqual([['contact_other_plane', 15]]);
    expect(Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.unavailable_reason?.includes('wakes'))
      .map(([key]) => key))
      .toEqual(['dream']);

    const dream = reviewedSaveSuccessClauses.dream;
    const dreamFold = foldSavingThrowEvent(saveEvent(dream, {
      save_dc: saveDifficultyClass(11),
      frequency: dream.frequency,
      duration: dream.duration,
      damage_on_failed_save: [damage(dream.effect_source, 'Psychic', 3, 6)],
      on_success: { kind: 'none', evidence: dream.evidence },
    }), target('Psychic'));
    expect(dreamFold.status).toBe('unavailable');
    expect(dreamFold).not.toHaveProperty('expected_damage');
  });

  it('makes success, cadence, fixed DC, and repetition source mutations load-bearing', () => {
    const baselineBodies = spellDescriptionsByHeading(spellExtract);
    const acid = baselineBodies.get('Acid Splash');
    const tsunami = baselineBodies.get('Tsunami');
    const contact = baselineBodies.get('Contact Other Plane');
    const prismatic = baselineBodies.get('Prismatic Spray');
    if (acid === undefined || tsunami === undefined || contact === undefined ||
      prismatic === undefined) {
      throw new Error('Missing round-9 source mutation fixture.');
    }

    const mutatedBodies = new Map(baselineBodies);
    mutatedBodies.set(
      'Acid Splash',
      `${acid} On a successful save, it takes 1d6 Acid damage.`,
    );
    mutatedBodies.set('Tsunami', tsunami.replace(
      'only once per round',
      'only once per turn',
    ));
    mutatedBodies.set(
      'Contact Other Plane',
      contact.replace('DC 15', 'DC 16'),
    );
    mutatedBodies.set('Prismatic Spray', prismatic.replace(
      'struck by two rays',
      'struck by three rays',
    ));
    const mutated = deriveSaveDamageCoverageFromBodies(mutatedBodies);
    expect(mutated.clauses_by_heading.get('Acid Splash')?.[0]?.success.status)
      .toBe('unavailable');
    expect(sourceDerivedSaveDamageCandidates.find((candidate) =>
      candidate.heading === 'Acid Splash'
    )?.success).toEqual({ status: 'available', kind: 'none' });
    expect(mutated.clauses_by_heading.get('Tsunami')?.[1]?.frequency)
      .toEqual({ kind: 'once_per_turn', turn: 'target' });
    expect(mutated.clauses_by_heading.get('Contact Other Plane')?.[0]?.fixed_save_dc)
      .toEqual({ status: 'available', value: 16 });
    expect(mutated.clauses_by_heading.get('Prismatic Spray')?.[0]?.repetitions.status)
      .toBe('unavailable');
    expect(sourceDerivedSaveDamageCandidates.find((candidate) =>
      candidate.heading === 'Prismatic Spray'
    )?.repetitions).toEqual({
      status: 'unavailable',
      reason: 'The random ray selection and conditional two-ray branch are not representable.',
    });
    expect(sourceDerivedSaveDamageCandidates.find((candidate) =>
      candidate.heading === 'Acid Splash'
    )?.repetitions).toEqual({ status: 'available', minimum: 1, maximum: 1 });
    expect(sourceDerivedSaveDamageCandidates.find((candidate) =>
      candidate.heading === 'Dream'
    )?.timing_unavailable_reason).toContain('wakes');
  });
});
