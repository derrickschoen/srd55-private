import { describe, expect, it } from 'vitest';
import {
  bridgeFeatProse,
  constructSkillProficiencyGrant,
  matchSkillProficiencySentence,
  matchSpeedIncreaseFeet,
} from '../../../tools/scrape/feat-grants-bridge';
import {
  ASI_ONE_POINT_NAMED,
  ASI_ONE_POINT_WITH_TRAILING_CLAUSE,
  ASI_TWO_POINT_ANY,
  ASI_TWO_POINT_WITH_TRAILING_CLAUSE,
  ASI_UNREADABLE,
  GREAT_WEAPON_FIGHTING_MASTER_BONUS,
  MIXED_FEAT_PROSE,
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
    expect(result.unrepresented).toEqual([]);
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
    expect(result.unrepresented).toEqual([]);
    expect(result.unmodeledProse).toEqual([]);
  });

  // F1 (codex round-1, HIGH): a paragraph whose text OPENS with a closed ASI
  // shape and then keeps going must NOT parse — the trailing clause would
  // otherwise be silently lost (never in the grant, never in unmodeledProse).
  it.each([
    ['two-point/"any"', ASI_TWO_POINT_WITH_TRAILING_CLAUSE],
    ['one-point/named-pair', ASI_ONE_POINT_WITH_TRAILING_CLAUSE],
  ])(
    'does NOT parse an ASI paragraph with a trailing clause after the closed shape — %s',
    (_label, paragraph) => {
      const result = expectBridged(bridgeFeatProse([paragraph]));
      expect(result.grants).toEqual([]);
      expect(result.unrepresented).toEqual([]);
      // The WHOLE paragraph, including the trailing sentence, survives intact.
      expect(result.unmodeledProse).toEqual([paragraph]);
    },
  );

  // F2 (codex round-1, HIGH): a matching skill-proficiency sentence is
  // recognised but produces NO grant — see feat-grants-bridge.ts's "THE
  // SKILL GAP". It lands in unmodeledProse AND is named in `unrepresented`.
  it('recognises "You gain proficiency in <skill>." but emits no grant for it — names the gap instead', () => {
    const result = expectBridged(bridgeFeatProse([SKILL_PROFICIENCY_SURVIVAL]));
    expect(result.grants).toEqual([]);
    expect(result.unrepresented).toEqual([
      {
        shape: 'skill_proficiency',
        sentence: 'You gain proficiency in Survival.',
        reason: expect.stringContaining('forSelectedFeat'),
      },
    ]);
    expect(result.unmodeledProse).toEqual([SKILL_PROFICIENCY_SURVIVAL]);
  });

  it.each([
    ['wrong preposition ("with" instead of "in")', SKILL_PROFICIENCY_WRONG_PREPOSITION],
    ['an extra clause (two skills, not one)', SKILL_PROFICIENCY_EXTRA_CLAUSE],
  ])('does NOT recognise a near-miss skill-proficiency sentence — %s', (_label, paragraph) => {
    const result = expectBridged(bridgeFeatProse([paragraph]));
    expect(result.grants).toEqual([]);
    expect(result.unrepresented).toEqual([]);
    expect(result.unmodeledProse).toEqual([paragraph]);
  });

  it('leaves an "Ability Score Increase." paragraph matching neither closed shape unmodeled, not refused', () => {
    const result = expectBridged(bridgeFeatProse([ASI_UNREADABLE]));
    expect(result.grants).toEqual([]);
    expect(result.unrepresented).toEqual([]);
    expect(result.unmodeledProse).toEqual([ASI_UNREADABLE]);
  });

  it('bridges a mixed feat: the ASI grant, a named skill-proficiency gap, and unrecognised prose verbatim, in document order', () => {
    const result = expectBridged(bridgeFeatProse(MIXED_FEAT_PROSE));
    expect(result.grants).toEqual([
      {
        shape: 'ability_score_increase',
        sentence: ASI_ONE_POINT_NAMED.text,
        value: { points: 1, abilities: ['wisdom', 'charisma'], maximum: 20 },
      },
    ]);
    expect(result.unrepresented).toEqual([
      {
        shape: 'skill_proficiency',
        sentence: SKILL_PROFICIENCY_SURVIVAL.text,
        reason: expect.any(String),
      },
    ]);
    // The unrecognised paragraphs made it through UNCHANGED, in their
    // original order — never dropped, never rewritten. The skill-proficiency
    // paragraph is ALSO here: `unrepresented` names the reason, it does not
    // exempt the paragraph from `unmodeledProse`.
    expect(result.unmodeledProse).toEqual([
      MIXED_FEAT_PROSE[0],
      SKILL_PROFICIENCY_SURVIVAL,
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
  // IS recognisable, but `bridgeFeatProse` still emits no grant for it —
  // just like the skill shape, it lands in unmodeledProse with a named
  // `unrepresented` entry.
  it('recognises the speed-increase sentence shape in isolation but still emits no grant, naming the gap', () => {
    expect(matchSpeedIncreaseFeet(SPEED_INCREASE_10_FEET.text)).toBe(10);

    const result = expectBridged(bridgeFeatProse([SPEED_INCREASE_10_FEET]));
    expect(result.grants).toEqual([]);
    expect(result.unrepresented).toEqual([
      {
        shape: 'speed_increase',
        sentence: SPEED_INCREASE_10_FEET.text,
        reason: expect.stringContaining('GrantRuleKind'),
      },
    ]);
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

describe('constructSkillProficiencyGrant (kept for future wiring, not called by bridgeFeatProse)', () => {
  it('builds a real, importer-valid skill_proficiency GrantRule object', () => {
    expect(constructSkillProficiencyGrant('survival', 1)).toEqual({
      kind: 'skill_proficiency',
      rule_key: 'bridged-skill-proficiency-survival-1',
      count: 1,
      skills: ['survival'],
      always_prepared: false,
      with_slots: true,
      free_cast: null,
    });
  });

  // F3 (codex round-1, MEDIUM): two grants built for the SAME skill at
  // different occurrences must not collide — parseSourceGrantRules
  // (src/grants/configured-choice-rule.ts) rejects a repeated rule_key.
  it('mints a distinct rule_key per occurrence, even for the same skill', () => {
    const first = constructSkillProficiencyGrant('survival', 1);
    const second = constructSkillProficiencyGrant('survival', 2);
    expect(first.rule_key).toBe('bridged-skill-proficiency-survival-1');
    expect(second.rule_key).toBe('bridged-skill-proficiency-survival-2');
    expect(first.rule_key).not.toBe(second.rule_key);
  });

  it('mints a distinct rule_key per named skill', () => {
    const survival = constructSkillProficiencyGrant('survival', 1);
    const arcana = constructSkillProficiencyGrant('arcana', 1);
    expect(survival.rule_key).not.toBe(arcana.rule_key);
  });

  it.each([0, -1, 1.5])('rejects a non-positive-integer occurrence (%s)', (occurrence) => {
    expect(() => constructSkillProficiencyGrant('survival', occurrence)).toThrow(RangeError);
  });
});
