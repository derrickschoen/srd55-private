import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  reviewedDamageRollSlotGroupOracle,
  reviewedSaveSuccessClauses,
  sourceDerivedSaveDamageCandidates,
} from '../../../src/simulation/coverage';
import {
  deriveSaveDamageCoverageFromBodies,
  sourceFixedSaveDc,
  sourceSentences,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

describe('round 13 burden-inverted fixed save DC parsing', () => {
  it('binds a fixed DC after a vs. abbreviation and article', () => {
    const wording = 'A creature makes a Dexterity saving throw vs. a DC of 15.';
    expect(sourceSentences(wording)).toHaveLength(1);
    expect(sourceFixedSaveDc(wording)).toEqual({ status: 'available', value: 15 });
  });

  it('binds a DC whose ownership is stated before the saving throw', () => {
    expect(sourceFixedSaveDc('The DC for this saving throw is 15.'))
      .toEqual({ status: 'available', value: 15 });
  });

  it('binds a DC in the sentence immediately following its saving throw', () => {
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw. The DC equals 15.',
    )).toEqual({ status: 'available', value: 15 });
  });

  it('refuses an unconsumed DC-vocabulary numeric candidate', () => {
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw against a DC calculated here as 15.',
    )).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: DC calculated here as 15.',
    });

    const distantCandidate = sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw against a DC determined by ' +
      'the fixed source instructions after applying every clause printed ' +
      'between this marker and its final stated value of 15.',
    );
    expect(distantCandidate.status).toBe('unavailable');
    if (distantCandidate.status === 'unavailable') {
      expect(distantCandidate.reason).toContain('final stated value of 15');
    }
  });
});

describe('round 13 explicit damage-roll semantics', () => {
  it('groups non-overlapping damage components explicitly stated as one roll', () => {
    for (const phrase of ['as one damage roll', 'as one roll']) {
      const sentence =
        'A creature makes a Dexterity saving throw, taking 1d6 Fire damage plus ' +
        `2d6 Fire damage ${phrase} on a failed save or half as much ` +
        'damage on a successful one.';
      const clause = deriveSaveDamageCoverageFromBodies(new Map([
        ['Composed one-roll clause', sentence],
      ])).clauses_by_heading.get('Composed one-roll clause')?.[0];

      expect(clause?.damage_occurrences
        .filter((occurrence) => occurrence.arm === 'failure')
        .map((occurrence) => [occurrence.slot_index, occurrence.roll_index]))
        .toEqual([[0, 0], [1, 0]]);
    }
  });
});

describe('round 13 ability-check DC ownership', () => {
  it('keeps a parenthetical spell-save-DC annotation owned by its check', () => {
    expect(sourceFixedSaveDc(
      'Strength (Athletics) check against your spell save DC (DC 15)',
    )).toEqual({ status: 'available', value: null });
  });
});

describe('round 13 valid-case controls', () => {
  it('preserves all corpus DC, check, and roll-grouping controls', () => {
    const bodies = spellDescriptionsByHeading(spellExtract);
    const corpusSentences = [...bodies].flatMap(([heading, body]) =>
      sourceSentences(body).map((sentence) => [heading, sentence.text.trim()] as const)
    );
    const numericDcSentences = corpusSentences.filter(([, sentence]) =>
      /\b(?:DC|D\.C\.|Difficulty Class)\s*(?:(?:is|equals|of)\s+|[:=]\s*)?\d+\b/iu
        .test(sentence)
    );

    expect(sourceDerivedSaveDamageCandidates).toHaveLength(79);
    expect(sourceDerivedSaveDamageCandidates.every((candidate) =>
      candidate.fixed_save_dc.status === 'available'
    )).toBe(true);
    expect(numericDcSentences.map(([heading, sentence]) => [
      heading,
      sourceFixedSaveDc(sentence),
    ])).toEqual([
      ['Contact Other Plane', { status: 'available', value: 15 }],
      ['Dispel Magic', { status: 'available', value: null }],
      ['Earthquake', { status: 'available', value: null }],
      ['Maze', { status: 'available', value: null }],
    ]);
    expect(corpusSentences.filter(([, sentence]) =>
      /\bcheck(?:s|ing)?\b/iu.test(sentence)
    )).toHaveLength(42);
    expect(reviewedSaveSuccessClauses.contact_other_plane.fixed_save_dc).toBe(15);
    expect(reviewedSaveSuccessClauses.earthquake.fixed_save_dc).toBeNull();
    // Round 14 (D259) made the grouping oracle TOTAL. The six multi-slot
    // rows keep their exact hand-transcribed values, and the oracle must now
    // cover every reviewed clause — strictly stricter than the old six-row
    // partial equality this control asserted before.
    expect(reviewedDamageRollSlotGroupOracle).toMatchObject({
      disintegrate: [[0, 1]],
      finger_of_death: [[0, 1]],
      flame_strike: [[0], [1]],
      ice_storm: [[0], [1]],
      meteor_swarm: [[0], [1]],
      vitriolic_sphere: [[0], [1]],
    });
    expect(Object.keys(reviewedDamageRollSlotGroupOracle))
      .toHaveLength(Object.keys(reviewedSaveSuccessClauses).length);
  });
});
