import { describe, expect, it } from 'vitest';
import {
  characterProficiencies,
  parseWeaponQualifier,
  weaponProficiency,
  type ProficiencyWeapon,
} from '../../../src/rules/multiclass-proficiency';
import {
  classProficiencyGrants,
  type ClassProficiencySources,
  type SheetClass,
} from '../../../src/rules/sheet';

/**
 * THE MULTICLASS PROFICIENCY UNION, AS A PURE FUNCTION.
 *
 * NOTHING HERE READS A DATABASE OR AN EXTRACT. The class grants are written as
 * literals, transcribed from `docs/srd/source/multiclass-entry-grants.txt` and
 * `class-core-traits.txt` with the source line beside each, so that a mistake in
 * the SEED cannot make a mistake in the RULE pass. The integration test proves
 * the seeded rows agree with these literals; this one proves the arithmetic over
 * them.
 *
 * THE FIXTURES ARE MULTICLASS, and every one of them is chosen because a
 * single-class fixture cannot tell the rule apart from a plausible wrong version
 * of itself:
 *
 *  - a union computed over each class's FULL row would over-grant, and only a
 *    class whose entry subset is SMALLER than its full row shows it;
 *  - a rule that read only the first class would under-grant, and only a
 *    character whose SECOND class grants more shows it;
 *  - saving throws must NOT follow the union, and only a character whose
 *    second class has different saves shows it.
 */

/**
 * THE FIXTURES ARE ROW LISTS WITH A FLAG, EXACTLY AS THE TABLES STORE THEM.
 *
 * They used to be two independent `ClassProficiencies` — a Core Traits set and
 * an entry set, written out separately — and a review pointed out what that
 * allowed: nothing stopped a fixture granting on ENTRY something the class's own
 * row never granted, which is a character no seeded database can produce. One
 * row list per class with `on_entry` per row makes that unwritable here for the
 * same reason it is unwritable in `class_armor_training`: a category with no row
 * has nothing to flag.
 *
 * Every flag below is transcribed from `multiclass-entry-grants.txt` and every
 * row from `class-core-traits.txt`, with the source beside each class.
 */

/**
 * Fighter — Core Traits: Light/Medium/Heavy/Shields, Simple and Martial.
 * Entry (`multiclass-entry-grants.txt:77-80`): Light/Medium/Shields, Martial.
 * HEAVY IS THE ROW THAT IS NOT FLAGGED, and Simple is the weapon that is not.
 */
const FIGHTER_ROWS: ClassProficiencySources = {
  armor_training: [
    { grant: 'light', on_entry: true },
    { grant: 'medium', on_entry: true },
    { grant: 'heavy', on_entry: false },
    { grant: 'shield', on_entry: true },
  ],
  weapon_proficiencies: [
    { grant: { category: 'simple', property_qualifier: null }, on_entry: false },
    { grant: { category: 'martial', property_qualifier: null }, on_entry: true },
  ],
};

/**
 * Barbarian — Core Traits: Light/Medium/Shields, Simple and Martial.
 * Entry (`:24-25`): Shields ALONE and Martial alone. The subset is not "drop the
 * top tier": Light and Medium are trained and are NOT flagged.
 */
const BARBARIAN_ROWS: ClassProficiencySources = {
  armor_training: [
    { grant: 'light', on_entry: false },
    { grant: 'medium', on_entry: false },
    { grant: 'shield', on_entry: true },
  ],
  weapon_proficiencies: [
    { grant: { category: 'simple', property_qualifier: null }, on_entry: false },
    { grant: { category: 'martial', property_qualifier: null }, on_entry: true },
  ],
};

/**
 * Wizard — Core Traits: Simple weapons, Armor Training None.
 * Entry (`:166-167`): the hit die and nothing else, so nothing is flagged.
 */
const WIZARD_ROWS: ClassProficiencySources = {
  armor_training: [],
  weapon_proficiencies: [
    { grant: { category: 'simple', property_qualifier: null }, on_entry: false },
  ],
};

/** A class that grants nothing in either role — a homebrew import, say. */
const NO_ROWS: ClassProficiencySources = {
  armor_training: [],
  weapon_proficiencies: [],
};

/**
 * Rogue — Core Traits: Light armour, Simple, and Martial qualified by
 * "Finesse or Light" verbatim.
 * Entry (`:127-131`): Light armour, and NO weapons at all.
 */
const ROGUE_ROWS: ClassProficiencySources = {
  armor_training: [{ grant: 'light', on_entry: true }],
  weapon_proficiencies: [
    { grant: { category: 'simple', property_qualifier: null }, on_entry: false },
    {
      grant: { category: 'martial', property_qualifier: 'Finesse or Light' },
      on_entry: false,
    },
  ],
};

/**
 * Monk — Core Traits: no armour, Simple, and Martial qualified by "Light".
 * Entry (`:88-89`): the hit die alone.
 */
const MONK_ROWS: ClassProficiencySources = {
  armor_training: [],
  weapon_proficiencies: [
    { grant: { category: 'simple', property_qualifier: null }, on_entry: false },
    {
      grant: { category: 'martial', property_qualifier: 'Light' },
      on_entry: false,
    },
  ],
};

function sheetClass(
  className: string,
  options: {
    readonly starting?: boolean;
    readonly level?: number;
    readonly saves?: readonly ('strength' | 'constitution' | 'intelligence' | 'wisdom' | 'dexterity' | 'charisma')[];
    readonly rows: ClassProficiencySources;
  },
): SheetClass {
  return {
    class_name: className,
    level: options.level ?? 1,
    hit_die: 8,
    is_starting_class: options.starting === true,
    saving_throws: options.saves ?? [],
    proficiencies: options.rows,
  };
}

const FIGHTER = (starting: boolean): SheetClass =>
  sheetClass('Fighter', {
    starting,
    level: 5,
    saves: ['strength', 'constitution'],
    rows: FIGHTER_ROWS,
  });

const BARBARIAN = (starting: boolean): SheetClass =>
  sheetClass('Barbarian', {
    starting,
    saves: ['strength', 'constitution'],
    rows: BARBARIAN_ROWS,
  });

const WIZARD = (starting: boolean): SheetClass =>
  sheetClass('Wizard', {
    starting,
    level: 3,
    saves: ['intelligence', 'wisdom'],
    rows: WIZARD_ROWS,
  });

const MONK = (starting: boolean): SheetClass =>
  sheetClass('Monk', {
    starting,
    saves: ['strength', 'dexterity'],
    rows: MONK_ROWS,
  });

const ROGUE = (starting: boolean): SheetClass =>
  sheetClass('Rogue', {
    starting,
    saves: ['dexterity', 'intelligence'],
    rows: ROGUE_ROWS,
  });

function weapon(
  name: string,
  overrides: Partial<ProficiencyWeapon> = {},
): ProficiencyWeapon {
  return {
    name,
    proficiency_category: 'martial',
    finesse: false,
    light: false,
    ...overrides,
  };
}

function union(classes: readonly SheetClass[]) {
  return characterProficiencies({ classes, weapons: [], wornArmor: [] });
}

describe('which class contributes which grant', () => {
  it('gives the STARTING class its full row and every other class its entry subset', () => {
    const { grants } = classProficiencyGrants([WIZARD(true), FIGHTER(false)]);
    const wizard = grants.find((grant) => grant.class_name === 'Wizard');
    const fighter = grants.find((grant) => grant.class_name === 'Fighter');

    expect(wizard?.via).toBe('initial');
    // The Wizard's own full row, which is Simple weapons and no armour at all.
    expect(wizard?.weapon_proficiencies.map((entry) => entry.category)).toEqual([
      'simple',
    ]);
    expect(fighter?.via).toBe('multiclass_entry');
    // NOT the Fighter's full row: Heavy armour and Simple weapons are both in
    // it and neither is in the entry clause.
    expect([...(fighter?.armor_training ?? [])]).toEqual([
      'light',
      'medium',
      'shield',
    ]);
    expect(fighter?.weapon_proficiencies.map((entry) => entry.category)).toEqual([
      'martial',
    ]);
  });

  it('swaps which grant applies when the starting class swaps', () => {
    // THE SAME TWO CLASSES, THE OTHER WAY ROUND. A rule that read the flag per
    // class rather than resolving one starting class would produce the same
    // answer both times, and the assertion above alone would not notice.
    const { grants } = classProficiencyGrants([WIZARD(false), FIGHTER(true)]);
    const fighter = grants.find((grant) => grant.class_name === 'Fighter');
    expect(fighter?.via).toBe('initial');
    expect([...(fighter?.armor_training ?? [])]).toContain('heavy');
    expect(fighter?.weapon_proficiencies.map((entry) => entry.category)).toEqual([
      'simple',
      'martial',
    ]);
  });
});

describe('the six claims the multiclass grants are for', () => {
  it('does NOT give a multiclass character the second class’s saving throws', () => {
    // The rule that must NOT be copied from the proficiency union. A Wizard who
    // dips Fighter is proficient in Martial weapons AND still saves only on
    // Intelligence and Wisdom — the two rules point opposite ways on the same
    // pair of classes, which is why they are asserted together.
    const classes = [WIZARD(true), FIGHTER(false)];
    const { weapon_proficiencies } = union(classes);
    expect(weapon_proficiencies.map((entry) => entry.category)).toContain(
      'martial',
    );
    // `savingThrowProficiencies` is the FIRST class alone. Asserted through the
    // grants rather than re-deriving it: the Fighter's saves are not on the
    // sheet, and the grant that let the martial weapons through is.
    const fighterGrant = union(classes).grants.find(
      (grant) => grant.class_name === 'Fighter',
    );
    expect(fighterGrant?.via).toBe('multiclass_entry');
    expect(WIZARD(true).saving_throws).toEqual(['intelligence', 'wisdom']);
    expect(FIGHTER(false).saving_throws).toEqual(['strength', 'constitution']);
  });

  it('gives a Barbarian-SECOND character Shields but NOT Light armour', () => {
    const { armor_training } = union([WIZARD(true), BARBARIAN(false)]);
    expect(armor_training.has('shield')).toBe(true);
    expect(armor_training.has('light')).toBe(false);
    expect(armor_training.has('medium')).toBe(false);
  });

  it('gives a Barbarian-FIRST character all three, so the subset is the ENTRY’s', () => {
    // The control for the assertion above: the same class, the same fixture,
    // the only difference being which one the character started in. Without
    // this pair, an armour union that was simply empty would pass.
    const { armor_training } = union([BARBARIAN(true), WIZARD(false)]);
    expect([...armor_training].sort()).toEqual(['light', 'medium', 'shield']);
  });

  it('gives a Fighter-SECOND character Martial weapons but NOT Simple', () => {
    const { weapon_proficiencies } = union([MONK(true), FIGHTER(false)]);
    const fromFighter = weapon_proficiencies.filter(
      (entry) => entry.class_name === 'Fighter',
    );
    expect(fromFighter.map((entry) => entry.category)).toEqual(['martial']);
    // And the Monk's own Simple is still there, so "no simple from the Fighter"
    // is not being satisfied by an empty union.
    expect(
      weapon_proficiencies
        .filter((entry) => entry.class_name === 'Monk')
        .map((entry) => entry.category),
    ).toEqual(['simple', 'martial']);
  });

  it('gives a Monk-SECOND character the hit die and nothing else', () => {
    const { grants, armor_training, weapon_proficiencies } = union([
      FIGHTER(true),
      MONK(false),
    ]);
    const monk = grants.find((grant) => grant.class_name === 'Monk');
    expect(monk?.via).toBe('multiclass_entry');
    expect([...(monk?.armor_training ?? [])]).toEqual([]);
    expect([...(monk?.weapon_proficiencies ?? [])]).toEqual([]);
    // Nothing of the Monk's reaches the union — the qualifier included, which
    // is the one a naive "copy the whole row" would have brought with it.
    expect(
      weapon_proficiencies.some((entry) => entry.class_name === 'Monk'),
    ).toBe(false);
    // The character still has the Fighter's, so the union is not simply empty.
    expect(armor_training.has('heavy')).toBe(true);
  });

  it('unions across THREE classes, taking each from the right role', () => {
    const { armor_training, weapon_proficiencies } = union([
      ROGUE(true),
      BARBARIAN(false),
      WIZARD(false),
    ]);
    // Rogue full: Light armour. Barbarian entry: Shields. Wizard entry: none.
    expect([...armor_training].sort()).toEqual(['light', 'shield']);
    // NOT medium: the Barbarian trains in it and does not grant it on entry.
    expect(armor_training.has('medium')).toBe(false);
    // Rogue full: simple + qualified martial. Barbarian entry: martial.
    // Wizard entry: none — so its Simple weapons do NOT appear.
    expect(
      weapon_proficiencies.map(
        (entry) => `${entry.class_name}:${entry.category}`,
      ),
    ).toEqual([
      'Rogue:simple',
      'Rogue:martial',
      'Barbarian:martial',
    ]);
  });

  it('stays a union when the starting class cannot be resolved, and says so', () => {
    // NO CLASS FLAGGED. `startingClass` still picks one and warns; the union
    // must not collapse, because a character who cannot see the flag would
    // otherwise lose every proficiency they have to punish it.
    const { armor_training, warnings } = union([
      FIGHTER(false),
      BARBARIAN(false),
    ]);
    expect(warnings.map((entry) => entry.code)).toContain('no_starting_class');
    // The pick fell on the Fighter (first in the list), so its FULL row applies
    // and the Barbarian contributes only Shields.
    expect([...armor_training].sort()).toEqual([
      'heavy',
      'light',
      'medium',
      'shield',
    ]);
  });

  it('picks exactly ONE class when several are flagged', () => {
    const { grants, warnings } = union([FIGHTER(true), BARBARIAN(true)]);
    expect(warnings.map((entry) => entry.code)).toContain(
      'several_starting_classes',
    );
    // Comparing the FLAG rather than the resolved identity would have given
    // BOTH classes their full row, which is the over-grant this asserts against.
    expect(grants.filter((grant) => grant.via === 'initial')).toHaveLength(1);
  });
});

describe('the warning fires and does not block (D28 §1)', () => {
  const wizard = [WIZARD(true)];

  it('warns about a weapon no class grants, and still returns the weapon', () => {
    const result = characterProficiencies({
      classes: wizard,
      weapons: [weapon('Heavy Crossbow')],
      wornArmor: [],
    });
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      'weapon_not_proficient',
    ]);
    // NOT REFUSED. The weapon is still in the result, with a verdict rather
    // than an absence — "block the wizard from using a heavy crossbow" means
    // stop printing a bonus they do not have, not refuse the row.
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0]?.verdict.kind).toBe('not_proficient');
    // And the rest of the picture is intact, so nothing short-circuited.
    expect(result.weapon_proficiencies.map((entry) => entry.category)).toEqual([
      'simple',
    ]);
  });

  it('does not warn where a class does grant it', () => {
    const result = characterProficiencies({
      classes: [WIZARD(true), FIGHTER(false)],
      weapons: [weapon('Heavy Crossbow')],
      wornArmor: [],
    });
    expect(result.warnings).toEqual([]);
    expect(result.weapons[0]?.verdict).toEqual({
      kind: 'proficient',
      via: ['Fighter'],
    });
  });

  it('says NOT STATED rather than assuming simple', () => {
    const result = characterProficiencies({
      classes: wizard,
      weapons: [weapon('Grandfather’s sword', { proficiency_category: null })],
      wornArmor: [],
    });
    expect(result.weapons[0]?.verdict.kind).toBe('category_not_stated');
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      'weapon_category_not_stated',
    ]);
    // A Wizard IS proficient with simple weapons, so a reader that defaulted
    // the null to `simple` would have produced `proficient` here — silently,
    // and with a proficiency bonus attached.
    expect(result.weapons[0]?.verdict.kind).not.toBe('proficient');
  });

  it('warns about armour no class trains, without refusing it', () => {
    const result = characterProficiencies({
      classes: wizard,
      weapons: [],
      wornArmor: [{ name: 'Chain Mail', category: 'heavy' }],
    });
    expect(result.warnings.map((entry) => entry.code)).toEqual([
      'armor_not_trained',
    ]);
    // The message states the FACT and stops. The SRD's consequences for wearing
    // untrained armour are not in `docs/srd/source/`, and reciting them from
    // memory is what this application is built not to do.
    expect(result.warnings[0]?.message).not.toMatch(/disadvantage/i);
    expect(result.warnings[0]?.message).toMatch(/no class this character has/i);
  });
});

describe('the Rogue and Monk qualifier, evaluated as a set union (D28 §2)', () => {
  it('reads "Finesse or Light" as either flag, not both', () => {
    expect(parseWeaponQualifier('Finesse or Light')).toEqual({
      kind: 'any_property',
      properties: ['finesse', 'light'],
      text: 'Finesse or Light',
    });
    expect(parseWeaponQualifier('Light')).toEqual({
      kind: 'any_property',
      properties: ['light'],
      text: 'Light',
    });
    expect(parseWeaponQualifier(null)).toEqual({ kind: 'unqualified' });
  });

  it('will not read a conjunction, or a word with no column', () => {
    // "Finesse AND Light" is a far smaller set than "Finesse or Light", so
    // treating one as the other would be a wrong answer rather than a missing
    // one. Both land in the arm that prints the words instead of guessing.
    expect(parseWeaponQualifier('Finesse and Light').kind).toBe('unevaluated');
    expect(parseWeaponQualifier('held in two hands').kind).toBe('unevaluated');
    expect(parseWeaponQualifier('Heavy').kind).toBe('unevaluated');
  });

  const rogueGrants = classProficiencyGrants([ROGUE(true)]).grants;

  it('lets a Rogue through on a Rapier (Finesse) and a Shortsword (Light)', () => {
    expect(
      weaponProficiency(weapon('Rapier', { finesse: true }), rogueGrants).kind,
    ).toBe('proficient');
    expect(
      weaponProficiency(weapon('Shortsword', { light: true }), rogueGrants).kind,
    ).toBe('proficient');
  });

  it('stops a Rogue on a Greatsword, which is neither', () => {
    // The exact case D27 names: the Rogue holding a Greatsword read too high
    // because every printed attack added the proficiency bonus.
    const verdict = weaponProficiency(weapon('Greatsword'), rogueGrants);
    expect(verdict.kind).toBe('not_proficient');
  });

  it('still lets a Rogue through on a SIMPLE weapon, which is unqualified', () => {
    // The qualifier sits on the martial grant only. A reader that applied it to
    // every grant of the class would take a Rogue's Dagger away from them.
    expect(
      weaponProficiency(
        weapon('Club', { proficiency_category: 'simple' }),
        rogueGrants,
      ).kind,
    ).toBe('proficient');
  });

  it('does not evaluate an unrecognised qualifier in either direction', () => {
    const imported = classProficiencyGrants([
      sheetClass('Runeblade', {
        starting: true,
        rows: {
          armor_training: [],
          weapon_proficiencies: [
            {
              grant: {
                category: 'martial',
                property_qualifier: 'inscribed with a rune',
              },
              on_entry: false,
            },
          ],
        },
      }),
    ]).grants;
    const verdict = weaponProficiency(weapon('Greatsword'), imported);
    expect(verdict.kind).toBe('qualifier_not_evaluated');
    // The qualifier travels so the sheet can print it rather than swallow it.
    expect(
      verdict.kind === 'qualifier_not_evaluated' ? verdict.qualifiers : [],
    ).toEqual(['inscribed with a rune']);
  });

  it('does not let a word that names an Object member through the lookup', () => {
    // A review found this. While the recognised words lived in an OBJECT
    // literal, `QUALIFIER_WORDS['constructor']` was a FUNCTION rather than
    // `undefined`, so a qualifier of "constructor" walked past the `unevaluated`
    // arm entirely: the weapon came back a plain `not_proficient` and the words
    // this application could not read were never printed. That is the one
    // outcome this module's contract forbids.
    //
    // Only `constructor` and `__proto__` are reachable — the parts are
    // lowercased before the lookup, so `toString` and `valueOf` never match a
    // real member — but all four are asserted, because the fix is "no inherited
    // keys at all" rather than a guard against the two that happen to collide.
    for (const word of ['constructor', '__proto__', 'toString', 'valueOf']) {
      const parsed = parseWeaponQualifier(word);
      expect(parsed.kind, `${word} must not resolve to a column`).toBe(
        'unevaluated',
      );
      expect(parsed.kind === 'unevaluated' ? parsed.text : '').toBe(word);
    }
    // And beside a word that IS recognised, which is how it would arrive: the
    // whole qualifier is unevaluated rather than half-applied.
    expect(parseWeaponQualifier('Finesse or constructor')).toEqual({
      kind: 'unevaluated',
      text: 'Finesse or constructor',
    });
  });

  it('prints an Object-member qualifier in the verdict rather than dropping it', () => {
    // The end of the same defect, at the surface a reader sees: before the fix
    // this Greatsword was `not_proficient` with nothing naming the qualifier,
    // and the player had no way to know a condition had been skipped.
    const imported = classProficiencyGrants([
      sheetClass('Runeblade', {
        starting: true,
        rows: {
          armor_training: [],
          weapon_proficiencies: [
            {
              grant: { category: 'martial', property_qualifier: 'constructor' },
              on_entry: false,
            },
          ],
        },
      }),
    ]).grants;
    const verdict = weaponProficiency(weapon('Greatsword'), imported);
    expect(verdict.kind).toBe('qualifier_not_evaluated');
    expect(
      verdict.kind === 'qualifier_not_evaluated' ? verdict.qualifiers : [],
    ).toEqual(['constructor']);
  });

  it('unions the qualified grant with an unqualified one from another class', () => {
    // A Rogue who dips Fighter IS proficient with a Greatsword, because the
    // Fighter's entry grant is unqualified Martial. An implementation that
    // stopped at the first class, or that intersected, would say no.
    const grants = classProficiencyGrants([ROGUE(true), FIGHTER(false)]).grants;
    expect(weaponProficiency(weapon('Greatsword'), grants)).toEqual({
      kind: 'proficient',
      via: ['Fighter'],
    });
  });
});
