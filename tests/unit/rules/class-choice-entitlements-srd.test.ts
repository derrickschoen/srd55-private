import { describe, expect, it } from 'vitest';
import expertiseSource from '../../../docs/srd/source/class-expertise.txt?raw';
import spellReplacementSource from '../../../docs/srd/source/class-spell-replacement.txt?raw';
import {
  expertiseEntitlementsForClassName,
  parseSrdClassSpellReplacementPolicies,
  parseSrdExpertiseEntitlements,
  spellReplacementPolicyForClassName,
  SrdClassChoiceEntitlementError,
} from '../../../src/rules/class-choice-entitlements-srd';

describe('sourced class choice entitlements', () => {
  it('pins every Expertise level, count and pool by hand', () => {
    expect(parseSrdExpertiseEntitlements()).toEqual([
      {
        class_name: 'Bard',
        class_level: 2,
        feature_name: 'Expertise',
        count: 2,
        pool: { kind: 'any_proficient_skill' },
      },
      {
        class_name: 'Bard',
        class_level: 9,
        feature_name: 'Expertise',
        count: 2,
        pool: { kind: 'any_proficient_skill' },
      },
      {
        class_name: 'Ranger',
        class_level: 2,
        feature_name: 'Deft Explorer',
        count: 1,
        pool: { kind: 'any_proficient_skill' },
      },
      {
        class_name: 'Ranger',
        class_level: 9,
        feature_name: 'Expertise',
        count: 2,
        pool: { kind: 'any_proficient_skill' },
      },
      {
        class_name: 'Rogue',
        class_level: 1,
        feature_name: 'Expertise',
        count: 2,
        pool: { kind: 'any_proficient_skill' },
      },
      {
        class_name: 'Rogue',
        class_level: 6,
        feature_name: 'Expertise',
        count: 2,
        pool: { kind: 'any_proficient_skill' },
      },
      {
        class_name: 'Wizard',
        class_level: 2,
        feature_name: 'Scholar',
        count: 1,
        pool: {
          kind: 'named_proficient_skills',
          skills: [
            'arcana',
            'history',
            'investigation',
            'medicine',
            'nature',
            'religion',
          ],
        },
      },
    ]);
  });

  it('returns explicit empty Expertise sets for all eight non-granting classes', () => {
    for (const className of [
      'Barbarian',
      'Cleric',
      'Druid',
      'Fighter',
      'Monk',
      'Paladin',
      'Sorcerer',
      'Warlock',
    ]) {
      expect(expertiseEntitlementsForClassName(className), className).toEqual(
        [],
      );
    }
    expect(expertiseEntitlementsForClassName('Chronomancer')).toBeNull();
  });

  it('refuses an unsupported prose count instead of guessing it', () => {
    expect(() =>
      parseSrdExpertiseEntitlements(
        expertiseSource.replace(
          'Expertise in two of your skill proficiencies',
          'Expertise in several of your skill proficiencies',
        ),
      ),
    ).toThrow(SrdClassChoiceEntitlementError);
  });

  it('pins every class-level spell replacement allow case', () => {
    const policies = parseSrdClassSpellReplacementPolicies();
    const compact = Object.fromEntries(
      policies.map((policy) => [
        policy.class_name,
        policy.on_class_level.map((entry) => ({
          bucket: entry.bucket,
          source: entry.source,
          constraint: entry.replacement_constraint,
        })),
      ]),
    );
    expect(compact).toEqual({
      Barbarian: [],
      Bard: [
        {
          bucket: 'cantrip_known',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
        {
          bucket: 'prepared',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
      ],
      Cleric: [
        {
          bucket: 'cantrip_known',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
      ],
      Druid: [
        {
          bucket: 'cantrip_known',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
      ],
      Fighter: [],
      Monk: [],
      Paladin: [
        {
          bucket: 'cantrip_known',
          source: {
            kind: 'class_feature',
            feature_name: 'Blessed Warrior',
          },
          constraint: 'same_list',
        },
      ],
      Ranger: [
        {
          bucket: 'cantrip_known',
          source: {
            kind: 'class_feature',
            feature_name: 'Druidic Warrior',
          },
          constraint: 'same_list',
        },
      ],
      Rogue: [],
      Sorcerer: [
        {
          bucket: 'cantrip_known',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
        {
          bucket: 'prepared',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
      ],
      Warlock: [
        {
          bucket: 'cantrip_known',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
        {
          bucket: 'prepared',
          source: { kind: 'class_progression' },
          constraint: 'same_list',
        },
        {
          bucket: 'mystic_arcanum',
          source: { kind: 'class_progression' },
          constraint: 'same_list_and_level',
        },
      ],
      Wizard: [],
    });
  });

  it('pins long-rest text as a level-up deny, including Wizard cantrips', () => {
    expect(spellReplacementPolicyForClassName('Cleric')).toMatchObject({
      long_rest_only_buckets: ['prepared'],
    });
    expect(spellReplacementPolicyForClassName('Ranger')).toMatchObject({
      long_rest_only_buckets: ['prepared'],
    });
    expect(spellReplacementPolicyForClassName('Wizard')).toMatchObject({
      on_class_level: [],
      long_rest_only_buckets: ['cantrip_known', 'prepared'],
    });
    expect(spellReplacementPolicyForClassName('Fighter')).toMatchObject({
      on_class_level: [],
      long_rest_only_buckets: [],
    });
    expect(spellReplacementPolicyForClassName('Chronomancer')).toBeNull();
  });

  it('does not generalize a Bard level trigger to Wizard', () => {
    const mutated = spellReplacementSource.replace(
      'Whenever you finish a Long Rest, you can replace one of your cantrips from this feature with another Wizard cantrip of your choice.',
      'Whenever you gain a Wizard level, you can replace one of your cantrips from this feature with another Wizard cantrip of your choice.',
    );
    const wizard = parseSrdClassSpellReplacementPolicies(mutated).find(
      (entry) => entry.class_name === 'Wizard',
    );
    expect(wizard?.on_class_level.map((entry) => entry.bucket)).toEqual([
      'cantrip_known',
    ]);
  });
});
