import { readFileSync } from '../../helpers/test-filesystem';
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
  reviewedSaveSuccessClauses,
  sourceDerivedSaveDamageCandidates,
} from '../../../src/simulation/coverage';
import { foldSavingThrowEvent } from '../../../src/simulation/probability';
import {
  deriveSaveDamageCoverageFromBodies,
  sourceFixedSaveDc,
  sourceSentences,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

const diceDamage = (
  source: DamageInstance['source'],
  type: string,
  count: number,
  die: 4 | 6,
): DamageInstance => ({
  source,
  damage_type: damageType(type),
  components: [{
    kind: 'dice',
    pool: { count: positiveDiceCount(count), die },
  }],
});

const target = (type: string) => ({
  save_bonus: targetSaveBonus(0),
  damage_responses: [{ damage_type: damageType(type), response: 'normal' as const }],
});

describe('round 12 fixed save DC parsing', () => {
  it('binds lawful post-save DC wording, including the vs. abbreviation', () => {
    const base = spellDescriptionsByHeading(spellExtract);
    const contact = base.get('Contact Other Plane');
    if (contact === undefined) {
      throw new Error('Missing Contact Other Plane source body.');
    }

    const parsedDcs: number[] = [];
    for (const wording of [
      'Intelligence saving throw with a DC of 15',
      'Intelligence saving throw vs. DC 15',
    ]) {
      const bodies = new Map(base);
      const mutatedContact = contact.replace('DC 15 Intelligence saving throw', wording);
      expect(mutatedContact).not.toBe(contact);
      expect(mutatedContact).toContain(wording);
      bodies.set(
        'Contact Other Plane',
        mutatedContact,
      );
      const fixedDc = deriveSaveDamageCoverageFromBodies(bodies)
        .clauses_by_heading.get('Contact Other Plane')?.[0]?.fixed_save_dc;
      expect(fixedDc).toEqual({ status: 'available', value: 15 });
      if (fixedDc?.status !== 'available' || fixedDc.value === null) {
        throw new Error(`${wording} did not produce a numeric fixed save DC.`);
      }
      parsedDcs.push(fixedDc.value);
    }

    const clause = reviewedSaveSuccessClauses.contact_other_plane;
    const event = (dc: number): SavingThrowDamageEvent => ({
      kind: 'saving_throw_damage',
      event_id: routineEventId(`round-12:contact-other-plane:${String(dc)}`),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(dc),
      roll_state: 'normal',
      frequency: clause.frequency,
      duration: clause.duration,
      save_success_clause_id: clause.id,
      damage_on_failed_save: [diceDamage(clause.effect_source, 'Psychic', 6, 6)],
      on_success: { kind: 'none', evidence: clause.evidence },
    });
    expect(foldSavingThrowEvent(event(11), target('Psychic')).status).toBe('unavailable');
    for (const parsedDc of parsedDcs) {
      const fixedDcResult = foldSavingThrowEvent(event(parsedDc), target('Psychic'));
      expect(fixedDcResult.status).toBe('available');
      if (fixedDcResult.status === 'available') {
        expect(fixedDcResult.expected_damage).toBeCloseTo(14.7, 12);
      }
    }
  });

  it('distinguishes no numeric fixed DC from unsupported save-DC syntax', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const earthquake = bodies.get('Earthquake');
    if (earthquake === undefined) {
      throw new Error('Missing Earthquake source body.');
    }
    expect(deriveSaveDamageCoverageFromBodies(bodies)
      .clauses_by_heading.get('Earthquake')?.[0]?.fixed_save_dc)
      .toEqual({ status: 'available', value: null });

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
    expect(sourceFixedSaveDc(
      'A creature makes an ability check, then a Dexterity saving throw (Difficulty Class 14).',
    )).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: Difficulty Class 14.',
    });
    expect(sourceFixedSaveDc(
      'A creature makes an ability check, and on a failed save (DC 15), it takes damage.',
    )).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: DC 15.',
    });
    expect(sourceFixedSaveDc(
      'A creature makes a DC 15 Wisdom saving throw. Another makes a Dexterity saving throw (Difficulty Class 14).',
    )).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: Difficulty Class 14.',
    });
    expect(sourceFixedSaveDc(
      'A creature makes a DC 15 Wisdom saving throw. Another makes a DC 14 Dexterity saving throw.',
    )).toEqual({
      status: 'unavailable',
      reason: 'The source declares conflicting fixed save DCs: 15, 14.',
    });
    expect(sourceFixedSaveDc('The save DC is 14.')).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: DC is 14.',
    });
    expect(sourceFixedSaveDc('A creature makes a D.C. 14 Dexterity saving throw.'))
      .toEqual({
        status: 'unavailable',
        reason: 'The source fixed save DC syntax is not representable: D.C. 14.',
      });
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw vs. Difficulty Class 14.',
    )).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: Difficulty Class 14.',
    });
    expect(sourceFixedSaveDc('The save D.C. is 14.')).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: D.C. is 14.',
    });
  });
});

describe('round 12 ability-check DC exclusions', () => {
  it('keeps a same-sentence Dispel-style check out of Earthquake save DCs', () => {
    const base = spellDescriptionsByHeading(spellExtract);
    const earthquake = base.get('Earthquake');
    if (earthquake === undefined) {
      throw new Error('Missing Earthquake source body.');
    }
    const bodies = new Map(base);
    const sameSentence = earthquake.replace(
      'structure equal to half the structure’s height makes a Dexterity saving throw.',
      'structure equal to half the structure’s height makes a Dexterity saving throw;',
    );
    expect(sameSentence).not.toBe(earthquake);
    const dispelStyleCheck = sameSentence.replace(
      'requiring a DC 20 Strength (Athletics) check',
      'requiring an ability check using Strength (DC 20)',
    );
    expect(dispelStyleCheck).not.toBe(sameSentence);
    expect(dispelStyleCheck).toContain('ability check using Strength (DC 20)');
    bodies.set('Earthquake', dispelStyleCheck);
    expect(deriveSaveDamageCoverageFromBodies(bodies)
      .clauses_by_heading.get('Earthquake')?.[0]?.fixed_save_dc)
      .toEqual({ status: 'available', value: null });

    const clause = reviewedSaveSuccessClauses.earthquake;
    const result = foldSavingThrowEvent({
      kind: 'saving_throw_damage',
      event_id: routineEventId('round-12:earthquake-check-control'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: clause.frequency,
      duration: clause.duration,
      save_success_clause_id: clause.id,
      damage_on_failed_save: [diceDamage(clause.effect_source, 'Bludgeoning', 12, 6)],
      on_success: { kind: 'half', evidence: clause.evidence },
    }, target('Bludgeoning'));
    expect(result.status).toBe('available');
    if (result.status === 'available') {
      expect(result.expected_damage).toBeCloseTo(31.375, 12);
    }
  });

  it('enumerates and excludes all 42 corpus check sentences', () => {
    const corpusSentences = [...spellDescriptionsByHeading(spellExtract)]
      .flatMap(([heading, body]) => sourceSentences(body)
        .map((sentence) => [heading, sentence.text.trim()] as const));
    const checkSentences = corpusSentences
      .filter(([, sentence]) => /\bcheck(?:s|ing)?\b/iu.test(sentence));
    const headingsMatching = (pattern: RegExp) => checkSentences
      .filter(([, sentence]) => pattern.test(sentence))
      .map(([heading]) => heading);

    expect(checkSentences).toHaveLength(42);
    expect(corpusSentences
      .filter(([, sentence]) =>
        /\b(?:DC|D\.C\.|Difficulty Class)\s*(?:(?:is|equals|of)\s+|[:=]\s*)?\d+\b/iu.test(sentence)
      )
      .map(([heading, sentence]) => [heading, sourceFixedSaveDc(sentence)]))
      .toEqual([
        ['Contact Other Plane', { status: 'available', value: 15 }],
        ['Dispel Magic', { status: 'available', value: null }],
        ['Earthquake', { status: 'available', value: null }],
        ['Maze', { status: 'available', value: null }],
      ]);
    expect(headingsMatching(
      /\bDC\s*\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+\([^)]*\))?\s+check\b/iu,
    )).toEqual(['Earthquake', 'Maze']);
    expect(headingsMatching(/\bability check\b[^.!?]*\(DC\s*\d+\b/iu))
      .toEqual(['Dispel Magic']);
    expect(headingsMatching(/\bcheck\b[^.!?]*\bagainst your spell save DC\b/iu))
      .toEqual([
        'Black Tentacles',
        'Control Water',
        'Detect Thoughts',
        'Disguise Self',
        'Ensnaring Strike',
        'Entangle',
        'Freezing Sphere',
        'Glyph of Warding',
        'Hallucinatory Terrain',
        'Major Image',
        'Minor Illusion',
        'Phantasmal Force',
        'Programmed Illusion',
        'Project Image',
        'Seeming',
        'Silent Image',
        'Spike Growth',
        'Symbol',
        'Tsunami',
        'Web',
      ]);
    expect(checkSentences.filter(([, sentence]) =>
      !/\bDC\s*\d+\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s+\([^)]*\))?\s+check\b/iu.test(sentence) &&
      !/\bability check\b[^.!?]*\(DC\s*\d+\b/iu.test(sentence) &&
      !/\bcheck\b[^.!?]*\bagainst your spell save DC\b/iu.test(sentence)
    ).map(([heading]) => heading)).toEqual([
      'Bestow Curse',
      'Dispel Magic',
      'Enhance Ability',
      'Enlarge/Reduce',
      'Enlarge/Reduce',
      'Enthrall',
      'Giant Insect',
      'Glibness',
      'Guidance',
      'Heat Metal',
      'Hex',
      'Hunter’s Mark',
      'Meld into Stone',
      'Pass without Trace',
      'Phantasmal Force',
      'Phantasmal Killer',
      'Symbol',
      'Thaumaturgy',
      'Tsunami',
    ]);
    for (const [, sentence] of checkSentences) {
      expect(sourceFixedSaveDc(
        `A creature makes a Dexterity saving throw; ${sentence}`,
      )).toEqual({ status: 'available', value: null });
      expect(sourceFixedSaveDc(
        `${sentence.replace(/[.!?]$/u, ';')} A creature makes a Dexterity saving throw (Difficulty Class 14).`,
      )).toEqual({
        status: 'unavailable',
        reason: 'The source fixed save DC syntax is not representable: Difficulty Class 14.',
      });
    }
  });
});

describe('round 12 source roll-slot groups', () => {
  it('pins every multi-slot clause to its independently parsed source rolls', () => {
    expect(Object.entries(reviewedSaveSuccessClauses)
      .filter(([, clause]) => clause.failed_damage_signature_slots.length > 1)
      .map(([key, clause]) => [key, clause.failed_damage_roll_slot_groups]))
      .toEqual([
        ['disintegrate', [[0, 1]]],
        ['finger_of_death', [[0, 1]]],
        ['flame_strike', [[0], [1]]],
        ['ice_storm', [[0], [1]]],
        ['meteor_swarm', [[0], [1]]],
        ['vitriolic_sphere', [[0], [1]]],
      ]);

    expect(sourceDerivedSaveDamageCandidates
      .filter((candidate) => [
        'Disintegrate',
        'Finger of Death',
        'Flame Strike',
        'Ice Storm',
        'Meteor Swarm',
        'Vitriolic Sphere',
      ].includes(candidate.heading))
      .map((candidate) => [
        candidate.heading,
        candidate.damage_occurrences
          .filter((occurrence) => occurrence.arm === 'failure')
          .map((occurrence) => [
            occurrence.slot_index,
            occurrence.roll_index,
            occurrence.timing,
          ]),
      ]))
      .toEqual([
        ['Disintegrate', [
          [0, 0, 'on_save_resolution'],
          [1, 0, 'on_save_resolution'],
        ]],
        ['Finger of Death', [
          [0, 0, 'on_save_resolution'],
          [1, 0, 'on_save_resolution'],
        ]],
        ['Flame Strike', [
          [0, 0, 'on_save_resolution'],
          [1, 1, 'on_save_resolution'],
        ]],
        ['Ice Storm', [
          [0, 0, 'on_save_resolution'],
          [1, 1, 'on_save_resolution'],
        ]],
        ['Meteor Swarm', [
          [0, 0, 'on_save_resolution'],
          [1, 1, 'on_save_resolution'],
        ]],
        ['Vitriolic Sphere', [
          [0, 0, 'on_save_resolution'],
          [1, 1, 'end_of_target_next_turn'],
        ]],
      ]);
    expect(reviewedSaveSuccessClauses.vitriolic_sphere.failed_damage_roll_slot_groups)
      .toEqual([[0], [1]]);
  });
});
