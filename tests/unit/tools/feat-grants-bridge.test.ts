import { describe, expect, it } from 'vitest';
import {
  bridgeFeatProse,
  matchSkillProficiencySentence,
  matchSpeedIncreaseFeet,
} from '../../../tools/scrape/feat-grants-bridge';
import {
  ASI_ONE_POINT_NAMED,
  ASI_TWO_POINT_ANY,
  ASI_UNREADABLE,
  GREAT_WEAPON_FIGHTING_MASTER_BONUS,
  MIXED_FEAT_PROSE,
  SKILL_PROFICIENCY_ARCANA,
  SKILL_PROFICIENCY_EXTRA_CLAUSE,
  SKILL_PROFICIENCY_SURVIVAL,
  SKILL_PROFICIENCY_WRONG_PREPOSITION,
  SPEED_INCREASE_10_FEET,
  SUDDEN_CHARGE_DAMAGE,
} from '../../fixtures/scrape/synthetic-feat-prose';

function expectBridged(result: ReturnType<typeof bridgeFeatProse>) {
  if (result.kind !== 'bridged') {
    throw new Error(`expected a bridged result, got a refusal: ${result.reason}`);
  }
  return result;
}

describe('feat prose -> grants bridge', () => {
  it('parses the two-point/"any" Ability Score Increase sentence to the exact structured value', () => {
    const result = expectBridged(bridgeFeatProse([ASI_TWO_POINT_ANY]));
    expect(result.grants).toEqual([
      {
        shape: 'ability_score_increase',
        sentence: ASI_TWO_POINT_ANY.text,
        value: { points: 2, abilities: 'any', maximum: 20 },
      },
    ]);
    expect(result.unmodeledProse).toEqual([]);
  });

  it('parses the one-point named-pair Ability Score Increase sentence to the exact structured value', () => {
    const result = expectBridged(bridgeFeatProse([ASI_ONE_POINT_NAMED]));
    expect(result.grants).toEqual([
      {
        shape: 'ability_score_increase',
        sentence: ASI_ONE_POINT_NAMED.text,
        value: { points: 1, abilities: ['wisdom', 'charisma'], maximum: 20 },
      },
    ]);
    expect(result.unmodeledProse).toEqual([]);
  });

  it('parses "You gain proficiency in <skill>." to the exact skill_proficiency GrantRule object', () => {
    const result = expectBridged(bridgeFeatProse([SKILL_PROFICIENCY_SURVIVAL]));
    expect(result.grants).toEqual([
      {
        shape: 'skill_proficiency',
        sentence: 'You gain proficiency in Survival.',
        value: {
          kind: 'skill_proficiency',
          rule_key: 'bridged-skill-proficiency-survival',
          count: 1,
          skills: ['survival'],
          always_prepared: false,
          with_slots: true,
          free_cast: null,
        },
      },
    ]);
    expect(result.unmodeledProse).toEqual([]);
  });

  it('mints a distinct, deterministic rule_key per named skill', () => {
    const survival = expectBridged(bridgeFeatProse([SKILL_PROFICIENCY_SURVIVAL]));
    const arcana = expectBridged(bridgeFeatProse([SKILL_PROFICIENCY_ARCANA]));
    const survivalGrant = survival.grants[0];
    const arcanaGrant = arcana.grants[0];
    if (survivalGrant?.shape !== 'skill_proficiency' || arcanaGrant?.shape !== 'skill_proficiency') {
      throw new Error('expected both fixtures to bridge to skill_proficiency grants');
    }
    expect(survivalGrant.value.rule_key).toBe('bridged-skill-proficiency-survival');
    expect(arcanaGrant.value.rule_key).toBe('bridged-skill-proficiency-arcana');
    expect(survivalGrant.value.rule_key).not.toBe(arcanaGrant.value.rule_key);
  });

  it.each([
    ['wrong preposition ("with" instead of "in")', SKILL_PROFICIENCY_WRONG_PREPOSITION],
    ['an extra clause (two skills, not one)', SKILL_PROFICIENCY_EXTRA_CLAUSE],
  ])('does NOT parse a near-miss skill-proficiency sentence — %s', (_label, paragraph) => {
    const result = expectBridged(bridgeFeatProse([paragraph]));
    expect(result.grants).toEqual([]);
    expect(result.unmodeledProse).toEqual([paragraph]);
  });

  it('leaves an "Ability Score Increase." paragraph matching neither closed shape unmodeled, not refused', () => {
    const result = expectBridged(bridgeFeatProse([ASI_UNREADABLE]));
    expect(result.grants).toEqual([]);
    expect(result.unmodeledProse).toEqual([ASI_UNREADABLE]);
  });

  it('bridges a mixed feat: recognised grants AND unrecognised prose verbatim, in document order', () => {
    const result = expectBridged(bridgeFeatProse(MIXED_FEAT_PROSE));
    expect(result.grants).toHaveLength(2);
    expect(result.grants.map((grant) => grant.shape)).toEqual([
      'ability_score_increase',
      'skill_proficiency',
    ]);
    // The unrecognised paragraphs made it through UNCHANGED, in their
    // original order — never dropped, never rewritten.
    expect(result.unmodeledProse).toEqual([
      MIXED_FEAT_PROSE[0],
      GREAT_WEAPON_FIGHTING_MASTER_BONUS,
      SUDDEN_CHARGE_DAMAGE,
    ]);
  });

  it('refuses an empty prose list rather than bridging nothing', () => {
    const result = bridgeFeatProse([]);
    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') {
      throw new Error('unreachable');
    }
    expect(result.reason).toContain('no prose blocks');
    expect(result.sentence).toBe('');
  });

  // THE SPEED GAP: `matchSpeedIncreaseFeet` below proves the sentence shape
  // IS recognisable, but `bridgeFeatProse` still reports it as unmodeled —
  // see `feat-grants-bridge.ts`'s file comment for why no grant exists for
  // this shape yet (no GrantRuleKind, no FeatContentAggregateV1 field).
  it('recognises the speed-increase sentence shape in isolation but still reports it as unmodeled prose', () => {
    expect(matchSpeedIncreaseFeet(SPEED_INCREASE_10_FEET.text)).toBe(10);

    const result = expectBridged(bridgeFeatProse([SPEED_INCREASE_10_FEET]));
    expect(result.grants).toEqual([]);
    expect(result.unmodeledProse).toEqual([SPEED_INCREASE_10_FEET]);
  });
});

describe('matchSkillProficiencySentence', () => {
  it('resolves a recognised skill name to the enum value', () => {
    expect(matchSkillProficiencySentence('You gain proficiency in Survival.')).toBe('survival');
    expect(matchSkillProficiencySentence('You gain proficiency in Sleight of Hand.')).toBe(
      'sleight_of_hand',
    );
  });

  it('returns null for a syntactically matching sentence naming an unknown skill', () => {
    expect(matchSkillProficiencySentence('You gain proficiency in Larceny.')).toBe(null);
  });

  it.each([
    ['wrong preposition', 'You gain proficiency with Survival.'],
    ['extra clause', 'You gain proficiency in Survival and Perception.'],
    ['no trailing period', 'You gain proficiency in Survival'],
    ['different verb', 'You have proficiency in Survival.'],
  ])('returns null for a near-miss sentence — %s', (_label, sentence) => {
    expect(matchSkillProficiencySentence(sentence)).toBe(null);
  });
});

describe('matchSpeedIncreaseFeet', () => {
  it('extracts the printed feet value', () => {
    expect(matchSpeedIncreaseFeet('Your speed increases by 10 feet.')).toBe(10);
    expect(matchSpeedIncreaseFeet('Your speed increases by 5 feet.')).toBe(5);
  });

  it.each([
    ['wrong unit', 'Your speed increases by 10 squares.'],
    ['extra clause', 'Your speed increases by 10 feet while you are not wearing armor.'],
    ['different verb', 'Your speed is increased by 10 feet.'],
  ])('returns null for a near-miss sentence — %s', (_label, sentence) => {
    expect(matchSpeedIncreaseFeet(sentence)).toBe(null);
  });
});
