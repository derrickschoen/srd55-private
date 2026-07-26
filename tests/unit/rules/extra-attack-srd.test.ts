import { describe, expect, it } from 'vitest';
import {
  parseSrdNamedExtraAttackFeatures,
  SrdNamedFeatureError,
} from '../../../src/rules/extra-attack-srd';

/**
 * THE PARSE, AGAINST THE EXTRACT AS COMMITTED.
 *
 * Every expectation was read off `docs/srd/source/extra-attack-other-sources.txt`
 * by eye and typed here; none is a value this parser produced. The one number
 * that is not a direct transcription — Devouring Blade's total of 3 — has its
 * derivation spelled out in the test that asserts it, and both of its terms are
 * printed words.
 *
 * THE SYNTHETIC BLOCKS BELOW ARE NOT PARANOIA. The two real ones are laid out
 * DIFFERENTLY: Thirsting Blade's has blank lines and no column bleed, Devouring
 * Blade's has bleed on every line and no blank line before the NEXT invocation's
 * title. A parser can pass on both by accident and still swallow the neighbour
 * on a re-extract, so the failure modes are exercised on inputs built to have
 * them.
 */

function feature(name: string) {
  const found = parseSrdNamedExtraAttackFeatures().find(
    (entry) => entry.name === name,
  );
  if (found === undefined) {
    throw new Error(`${name} was not parsed.`);
  }
  return found;
}

describe('the two named Extra Attack features the SRD prints', () => {
  it('parses exactly two, ordered by prerequisite level', () => {
    const features = parseSrdNamedExtraAttackFeatures();
    expect(features.map((entry) => entry.name)).toEqual([
      'Thirsting Blade',
      'Devouring Blade',
    ]);
  });

  it('reads Thirsting Blade whole', () => {
    const thirsting = feature('Thirsting Blade');
    expect(thirsting.class_name).toBe('Warlock');
    expect(thirsting.class_level).toBe(5);
    expect(thirsting.prerequisite).toBe('Level 5+ Warlock, Pact of the Blade');
    // "you can attack TWICE with the weapon instead of ONCE" — a printed total.
    expect(thirsting.attack_count).toBe(2);
    // "for your pact weapon ONLY".
    expect(thirsting.weapon_scope).toBe('one_bonded_weapon');
    expect(thirsting.content_key).toBe('2024:feature:thirsting-blade');
    expect(thirsting.description).toBe(
      'You gain the Extra Attack feature for your pact weapon only. With ' +
        'that feature, you can attack twice with the weapon instead of once ' +
        'when you take the Attack action on your turn.',
    );
  });

  it('reads Devouring Blade out of a block with column bleed on every line', () => {
    const devouring = feature('Devouring Blade');
    expect(devouring.class_name).toBe('Warlock');
    expect(devouring.class_level).toBe(12);
    expect(devouring.prerequisite).toBe('Level 12+ Warlock, Thirsting Blade');
    expect(devouring.content_key).toBe('2024:feature:devouring-blade');
    // The facing column's `an’t` and `st.` must not survive anywhere.
    expect(devouring.description).toBe(
      'The Extra Attack of your Thirsting Blade invocation confers two extra ' +
        'attacks rather than one.',
    );
    expect(devouring.description).not.toContain('an’t');
    expect(devouring.description).not.toContain('st.');
  });

  it('stops Devouring Blade before the invocation printed under it', () => {
    // The extract puts `Eldritch Mind` and its Constitution sentence on the two
    // lines immediately below, with NO blank line between. A blank-line
    // paragraph rule swallows both.
    const devouring = feature('Devouring Blade');
    expect(devouring.description).not.toContain('Eldritch Mind');
    expect(devouring.description).not.toContain('Constitution');
  });

  it("gives Devouring Blade a TOTAL of three, from the source's own terms", () => {
    // The extract prints no total for this one. It prints a replacement:
    // "confers TWO extra attacks rather than ONE". The quantity replaced — one
    // extra attack — is what Thirsting Blade's own sentence prints as the
    // difference between "twice" and "once", so the baseline of one attack is
    // in the extract too. One plus two is three. Every term is a printed word.
    expect(feature('Devouring Blade').attack_count).toBe(3);
    // NOT the sum of the two invocations' totals, and not 2.
    expect(feature('Devouring Blade').attack_count).not.toBe(5);
    expect(feature('Devouring Blade').attack_count).not.toBe(2);
  });

  it('gives Devouring Blade the scope of the grant it modifies', () => {
    // Its own sentence states no scope. It states a RELATION — "the Extra
    // Attack of your Thirsting Blade invocation" — and Thirsting Blade's scope
    // is one weapon, so this one's is too. Defaulting to `any_weapon` would
    // silently widen a one-weapon grant to every weapon a character holds.
    expect(feature('Devouring Blade').weapon_scope).toBe('one_bonded_weapon');
  });

  it('carries no wordmark the licence asks to be left off', () => {
    const text = parseSrdNamedExtraAttackFeatures()
      .flatMap((entry) => [entry.name, entry.prerequisite, entry.description])
      .join(' ');
    expect(text).not.toMatch(/D&D|Dungeons|Wizards/);
  });
});

const THIRSTING = [
  '=== Thirsting Blade (Eldritch Invocation) ===',
  '',
  '       Thirsting Blade',
  '',
  '       Prerequisite: Level 5+ Warlock, Pact of the Blade',
  '',
  '       Invocation',
  '',
  '       You gain the Extra Attack feature for your pact',
  '       weapon only. With that feature, you can attack',
  '       twice with the weapon instead of once when you',
  '       take the Attack action on your turn.',
  '',
].join('\n');

/**
 * A second block, so a case can reach the scope resolution that runs AFTER the
 * "exactly two blocks" count check. Written without the extract's column bleed:
 * what is under test here is the relation, not the slicing.
 */
const DEVOURING = [
  '=== Devouring Blade (Eldritch Invocation) ===',
  '',
  '        Devouring Blade',
  '        Prerequisite: Level 12+ Warlock, Thirsting Blade',
  '        Invocation',
  '',
  '        The Extra Attack of your Thirsting Blade invocation',
  '        confers two extra attacks rather than one.',
  '',
].join('\n');

describe('the parse fails loudly rather than short', () => {
  it('refuses an extract with only one of the two blocks', () => {
    expect(() => parseSrdNamedExtraAttackFeatures(THIRSTING)).toThrow(
      SrdNamedFeatureError,
    );
    expect(() => parseSrdNamedExtraAttackFeatures(THIRSTING)).toThrow(
      /expected 2 invocation blocks, found 1/,
    );
  });

  it('refuses a block with no Prerequisite line', () => {
    const source = THIRSTING.replace(
      '       Prerequisite: Level 5+ Warlock, Pact of the Blade',
      '       Warlock only',
    );
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /no Prerequisite line/,
    );
  });

  it('refuses a prerequisite that names no class level', () => {
    const source = THIRSTING.replace(
      'Prerequisite: Level 5+ Warlock, Pact of the Blade',
      'Prerequisite: Pact of the Blade',
    );
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /names no class level/,
    );
  });

  it('refuses a paragraph whose granting sentence it does not recognise', () => {
    const source = THIRSTING.replace(
      '       twice with the weapon instead of once when you',
      '       thrice with the weapon instead of once when you',
    );
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /states no attack total this parser recognises/,
    );
  });

  it('refuses a paragraph that states TWO totals it recognises', () => {
    // ARRAY ORDER IS NOT A SOURCE, and until this test it quietly was. A
    // re-extract that runs two granting sentences into one paragraph used to
    // take whichever sat earlier in `GRANT_SENTENCES` and say nothing about the
    // other — the parser's one silent failure, in a file where every other
    // failure throws. Here the paragraph carries Thirsting Blade's printed
    // total AND Devouring Blade's replacement, and 2 and 3 cannot both be right.
    const source = THIRSTING.replace(
      '       take the Attack action on your turn.',
      [
        '       take the Attack action on your turn, and it',
        '       confers two extra attacks rather than one.',
      ].join('\n'),
    );
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      SrdNamedFeatureError,
    );
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /states 2 attack total sentences this parser recognises/,
    );
  });

  it('refuses a grant whose weapon scope it cannot resolve', () => {
    // Thirsting Blade's scope sentence removed, so NEITHER block states one and
    // Devouring Blade's relation now points at a feature with no scope of its
    // own. Silently defaulting to `any_weapon` here is the specific failure
    // this refuses: a one-weapon grant applied to every weapon a character owns.
    const source = `${THIRSTING.replace(
      '       You gain the Extra Attack feature for your pact',
      '       You gain the Extra Attack feature, and with your',
    ).replace(
      '       weapon only. With that feature, you can attack',
      '       weapon. With that feature, you can attack',
    )}${DEVOURING}`;
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /states no weapon scope/,
    );
  });

  it('parses a pair of synthetic blocks the same way it parses the extract', () => {
    // The control for the case above: the SAME two blocks, unmodified, produce
    // the same answers as the committed file. Without it, a "throws" assertion
    // could be passing because the fixture is malformed in some other way.
    const features = parseSrdNamedExtraAttackFeatures(
      `${THIRSTING}${DEVOURING}`,
    );
    expect(
      features.map((entry) => [
        entry.name,
        entry.class_level,
        entry.attack_count,
        entry.weapon_scope,
      ]),
    ).toEqual([
      ['Thirsting Blade', 5, 2, 'one_bonded_weapon'],
      ['Devouring Blade', 12, 3, 'one_bonded_weapon'],
    ]);
  });

  it('refuses a paragraph that never ends in a full stop', () => {
    const source = THIRSTING.replace(
      '       take the Attack action on your turn.',
      '       take the Attack action on your turn',
    );
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /without a full stop/,
    );
  });

  it('refuses a block whose item type line has been reflowed away', () => {
    const source = THIRSTING.replace(
      '       Invocation',
      '       Invocation of the Blade',
    );
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /no single-word item type line/,
    );
  });

  it('refuses a block whose title never reappears under its heading', () => {
    const source = THIRSTING.replace('       Thirsting Blade\n', '');
    expect(() => parseSrdNamedExtraAttackFeatures(source)).toThrow(
      /no title line inside its own block/,
    );
  });
});
