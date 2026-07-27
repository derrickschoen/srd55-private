import { describe, expect, it } from 'vitest';
import {
  parseSrdWeaponTemplates,
  parseWeaponMasteryProgressions,
  WEAPON_MASTERY_GRANTS,
} from '../../../src/rules/weapons-srd';

/**
 * THE ORACLE IS THE EXTRACT, READ BY A HUMAN — NOT THE PARSER'S OUTPUT.
 *
 * Every expectation below was transcribed by reading
 * `docs/srd/source/weapons-table.txt` by eye. None of it was produced by
 * running the parser and pasting the result, and it must never be maintained
 * that way: a test that asserts the seeder produced what the seeder produced
 * cannot fail, and the entire point of parsing the extract instead of
 * hand-typing a table is that the parse can be checked against the source.
 *
 * The rows chosen are the awkward ones. Each is here because it breaks a
 * different naive implementation.
 */

const templates = parseSrdWeaponTemplates();

function template(name: string) {
  const found = templates.find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`No parsed template named ${name}.`);
  }
  return found;
}

describe('SRD weapons table', () => {
  it('yields 38 weapons across the four groups', () => {
    // 10 Simple Melee + 4 Simple Ranged + 18 Martial Melee + 6 Martial Ranged,
    // counted from the extract. The number 37 appears in an earlier note and is
    // wrong; this assertion is what stops someone "correcting" it back.
    expect(templates).toHaveLength(38);
    const byGroup = (group: string) =>
      templates.filter((entry) => entry.srd_group === group).length;
    expect(byGroup('simple_melee')).toBe(10);
    expect(byGroup('simple_ranged')).toBe(4);
    expect(byGroup('martial_melee')).toBe(18);
    expect(byGroup('martial_ranged')).toBe(6);
  });

  it('gives every weapon exactly one mastery property', () => {
    for (const entry of templates) {
      expect(entry.mastery_property, entry.name).toBeTruthy();
    }
    // The eight mastery properties are closed on evidence: all eight appear.
    expect(
      new Set(templates.map((entry) => entry.mastery_property)).size,
    ).toBe(8);
  });

  it('reads a versatile melee weapon', () => {
    // Longsword  1d8 Slashing  Versatile (1d10)  Sap  3 lb.  15 GP
    expect(template('Longsword')).toMatchObject({
      content_key: '2024:weapon:longsword',
      srd_group: 'martial_melee',
      damage: { kind: 'dice', dice: '1d8' },
      damage_type: 'Slashing',
      versatile_damage: { kind: 'dice', dice: '1d10' },
      mastery_property: 'Sap',
      two_handed: false,
      heavy: false,
      other_properties: null,
    });
  });

  it('reads a two-handed heavy weapon with multi-die damage', () => {
    // Greatsword  2d6 Slashing  Heavy, Two-Handed  Graze  6 lb.  50 GP
    expect(template('Greatsword')).toMatchObject({
      damage: { kind: 'dice', dice: '2d6' },
      damage_type: 'Slashing',
      heavy: true,
      two_handed: true,
      versatile_damage: { kind: 'not_applicable' },
      mastery_property: 'Graze',
    });
  });

  it('reads the one weapon whose damage is a flat number, not dice', () => {
    // Blowgun  1 Piercing  Ammunition (Range 25/100; Needle), Loading  Vex
    //
    // This is the canonical flat-damage row: it must not be represented as
    // either dice or an unknown/custom string.
    expect(template('Blowgun')).toMatchObject({
      damage: { kind: 'flat', amount: 1 },
      damage_type: 'Piercing',
      ammunition: true,
      ammunition_kind: 'Needle',
      loading: true,
      range_normal_feet: 25,
      range_long_feet: 100,
      mastery_property: 'Vex',
    });
  });

  it('reads the one qualified property into the free-text column', () => {
    // Lance  1d10 Piercing  Heavy, Reach, Two-Handed (unless mounted)  Topple
    //
    // The boolean alone would be a lie about this weapon, which is the whole
    // argument for `other_properties` existing.
    expect(template('Lance')).toMatchObject({
      damage: { kind: 'dice', dice: '1d10' },
      heavy: true,
      reach: true,
      two_handed: true,
      other_properties: 'Two-Handed (unless mounted)',
      mastery_property: 'Topple',
    });
    // ...and it is the ONLY one, so a parser that started dumping every
    // property it did not understand into the free-text column would fail here.
    expect(
      templates.filter((entry) => entry.other_properties !== null),
    ).toHaveLength(1);
  });

  it('reads the row whose name column collides with the damage column', () => {
    // `Heavy Crossbow 1d10 Piercing` has ONE space where every other row has
    // many, so fixed-width column slicing produces a weapon called
    // "Heavy Crossbow 1d10". Two-word names are the other half of the trap.
    expect(template('Heavy Crossbow')).toMatchObject({
      srd_group: 'martial_ranged',
      damage: { kind: 'dice', dice: '1d10' },
      damage_type: 'Piercing',
      ammunition: true,
      ammunition_kind: 'Bolt',
      heavy: true,
      loading: true,
      // Two-Handed arrives on a CONTINUATION line, so a parser that ignored
      // wrapped rows would report this weapon as one-handed.
      two_handed: true,
      range_normal_feet: 100,
      range_long_feet: 400,
      mastery_property: 'Push',
    });
    expect(template('War Pick').damage).toEqual({
      kind: 'dice',
      dice: '1d8',
    });
    expect(template('Light Hammer').light).toBe(true);
  });

  it('reads a thrown melee weapon that is also versatile', () => {
    // Trident  1d8 Piercing  Thrown (Range 20/60), Versatile (1d10)  Topple
    // Melee and thrown at once is why there are no melee/ranged variant tables.
    expect(template('Trident')).toMatchObject({
      srd_group: 'martial_melee',
      thrown: true,
      range_normal_feet: 20,
      range_long_feet: 60,
      versatile_damage: { kind: 'dice', dice: '1d10' },
    });
  });

  it('leaves a weapon with no properties entirely unflagged', () => {
    // Mace  1d6 Bludgeoning  —  Sap
    expect(template('Mace')).toMatchObject({
      finesse: false,
      heavy: false,
      light: false,
      loading: false,
      reach: false,
      thrown: false,
      two_handed: false,
      ammunition: false,
      versatile_damage: { kind: 'not_applicable' },
      range_normal_feet: null,
      range_long_feet: null,
      other_properties: null,
      mastery_property: 'Sap',
    });
  });

  // --- negative controls: the parser must be able to REJECT -----------------

  const header = [
    '--- Verbatim extract: test ---',
    '     Simple Melee Weapons',
  ].join('\n');

  it('refuses a property it does not recognise instead of dropping it', () => {
    expect(() =>
      parseSrdWeaponTemplates(
        `${header}\n      Club              1d4 Bludgeoning   Sparkly                     Slow         2 lb.     1 SP`,
      ),
    ).toThrow(/unrecognised weapon property "Sparkly" on Club/);
  });

  it('refuses a row with no recognised mastery property', () => {
    expect(() =>
      parseSrdWeaponTemplates(
        `${header}\n      Club              1d4 Bludgeoning   Light                       Zap          2 lb.     1 SP`,
      ),
    ).toThrow(/no recognised mastery property on Club/);
  });

  it('refuses a row with no cost column', () => {
    expect(() =>
      parseSrdWeaponTemplates(
        `${header}\n      Club              1d4 Bludgeoning   Light                       Slow         2 lb.`,
      ),
    ).toThrow(/no cost column on Club/);
  });

  it('refuses a weapon that appears before any group heading', () => {
    expect(() =>
      parseSrdWeaponTemplates(
        '--- Verbatim extract: test ---\n      Club              1d4 Bludgeoning   Light                       Slow         2 lb.     1 SP',
      ),
    ).toThrow(/appears before any group heading/);
  });

  it('refuses an extract with no verbatim marker at all', () => {
    expect(() => parseSrdWeaponTemplates('nothing here')).toThrow(
      /no verbatim-extract marker/,
    );
  });
});

describe('weapon mastery progression tables', () => {
  const progressions = parseWeaponMasteryProgressions();

  function counts(className: string): ReadonlyMap<number, number> {
    const found = progressions.find(
      (entry) => entry.class_name === className,
    );
    if (found === undefined) {
      throw new Error(`No parsed progression for ${className}.`);
    }
    return found.counts;
  }

  it('parses exactly the two class tables, and no prose', () => {
    // Two, not five. Paladin, Ranger and Rogue state their count in feature
    // PROSE rather than in a table column. An extract of that prose now exists
    // at `docs/srd/source/weapon-mastery-flat-classes.txt`, and this parser
    // deliberately does not read it — see WEAPON_MASTERY_GRANTS for why, and
    // for what promoting those three classes would require.
    expect(progressions.map((entry) => entry.class_name)).toEqual([
      'Barbarian',
      'Fighter',
    ]);
  });

  it('reads the Fighter column: 3 → 4 at 4, 5 at 10, 6 at 16', () => {
    const fighter = counts('Fighter');
    for (const [level, expected] of [
      [1, 3], [3, 3], [4, 4], [9, 4], [10, 5], [15, 5], [16, 6], [20, 6],
    ] as const) {
      expect(fighter.get(level), `Fighter level ${level}`).toBe(expected);
    }
  });

  it('reads the Barbarian column: 2 → 3 at 4, 4 at 10', () => {
    const barbarian = counts('Barbarian');
    for (const [level, expected] of [
      [1, 2], [3, 2], [4, 3], [9, 3], [10, 4], [20, 4],
    ] as const) {
      expect(barbarian.get(level), `Barbarian level ${level}`).toBe(expected);
    }
  });

  it('covers all twenty levels for both classes', () => {
    for (const progression of progressions) {
      expect(progression.counts.size).toBe(20);
    }
  });

  it('refuses a class table that is missing a level', () => {
    expect(() =>
      parseWeaponMasteryProgressions(
        [
          '--- Verbatim extract: Fighter Features table ---',
          '         1             +2         Fighting Style                    2              3',
        ].join('\n'),
      ),
    ).toThrow(/missing level 2/);
  });

  it('refuses a class table that repeats a level', () => {
    const row =
      '         1             +2         Fighting Style                    2              3';
    expect(() =>
      parseWeaponMasteryProgressions(
        ['--- Verbatim extract: Fighter Features table ---', row, row].join(
          '\n',
        ),
      ),
    ).toThrow(/repeats level 1/);
  });
});

describe('which classes we claim to have counts for', () => {
  it('claims sourced counts only for the classes whose tables are bundled', () => {
    const parsed = new Set(
      parseWeaponMasteryProgressions().map((entry) => entry.class_name),
    );
    for (const [name, grant] of Object.entries(WEAPON_MASTERY_GRANTS)) {
      if (grant === 'counts_known') {
        expect(parsed.has(name), `${name} declares counts_known`).toBe(true);
      } else {
        // The honest half: these three grant the feature and this MODULE holds
        // no number for them. Their prose extract exists but is not parsed
        // here; the commit that starts parsing it must change this assertion
        // deliberately, which is the point of pinning it.
        expect(grant).toBe('counts_unsourced');
        expect(parsed.has(name), `${name} declares counts_unsourced`).toBe(
          false,
        );
      }
    }
    expect(Object.keys(WEAPON_MASTERY_GRANTS)).toEqual([
      'Barbarian',
      'Fighter',
      'Paladin',
      'Ranger',
      'Rogue',
    ]);
  });
});
