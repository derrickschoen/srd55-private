import { describe, expect, it } from 'vitest';
import {
  multiclassSkillColumns,
  parseSrdMulticlassEntryGrants,
  SrdMulticlassEntryError,
  type SrdMulticlassEntryGrant,
} from '../../../src/rules/multiclass-entry-srd';
import {
  parseSrdClassTraits,
  type SrdClassTraits,
} from '../../../src/rules/class-traits-srd';

/**
 * THE TWELVE "AS A MULTICLASS CHARACTER" CLAUSES, PARSED, AGAINST A TABLE READ
 * OUT OF THE EXTRACT BY EYE.
 *
 * THE ORACLE IS `docs/srd/source/multiclass-entry-grants.txt`, NEVER THE
 * PARSER'S OUTPUT. Every cell below was read off that file line by line and
 * written here as a literal, with the source line numbers beside it, exactly as
 * `class-traits-srd.test.ts` does for the Core Traits tables. Regenerating this
 * table from `parseSrdMulticlassEntryGrants()` would produce a test that agrees
 * with any parse whatsoever, including a wrong one.
 *
 * WHY THE WHOLE TABLE AND NOT A SAMPLE. Four of its cells contradict a plausible
 * guess, and each of the four is a different guess:
 *
 *  - the Barbarian gets Shields and NOT Light armour (L24-25), though its Core
 *    Traits row trains it in Light, Medium and Shields. The subset is not "drop
 *    the top tier";
 *  - no class grants SIMPLE weapons on entry. Four grant Martial and nothing
 *    else, and a reader who assumed Martial implies Simple would over-grant all
 *    four;
 *  - Monk, Sorcerer and Wizard grant the hit die and NOTHING else;
 *  - Bard and Ranger both grant exactly ONE skill, and the difference between
 *    them is not a number.
 */
interface ExpectedRow {
  readonly weapons: readonly string[];
  readonly armor: readonly string[];
  readonly skill: string;
  readonly tools: readonly string[];
}

const EXPECTED: Readonly<Record<string, ExpectedRow>> = {
  // L24-25: "Hit Point Die, proficiency with Mar-/tial weapons, and training
  // with Shields." NO Light and NO Medium, though the Core Traits row has both.
  Barbarian: { weapons: ['martial'], armor: ['shield'], skill: 'any:0', tools: [] },
  // L37-40: "proficiency in one skill of your choice" — no class-list
  // qualifier at all — plus a Musical Instrument and Light armour.
  Bard: {
    weapons: [],
    armor: ['light'],
    skill: 'any:1',
    tools: ['one Musical Instrument of your choice'],
  },
  // L49-51. One of the two blocks whose bullet glyphs were clipped away.
  Cleric: {
    weapons: [],
    armor: ['light', 'medium', 'shield'],
    skill: 'any:0',
    tools: [],
  },
  // L62-66, a sentence spanning five lines with two blank lines inside it.
  Druid: { weapons: [], armor: ['light', 'shield'], skill: 'any:0', tools: [] },
  // L75-80.
  Fighter: {
    weapons: ['martial'],
    armor: ['light', 'medium', 'shield'],
    skill: 'any:0',
    tools: [],
  },
  // L88-89: "Gain the Hit Point Die trait from the Core Monk Traits table." The
  // Monk's Core Traits row grants Simple weapons and Martial-with-a-qualifier;
  // NONE of it survives into the entry grant.
  Monk: { weapons: [], armor: [], skill: 'any:0', tools: [] },
  // L101-104.
  Paladin: {
    weapons: ['martial'],
    armor: ['light', 'medium', 'shield'],
    skill: 'any:0',
    tools: [],
  },
  // L114-118: the only class granting BOTH a weapon category and a skill.
  Ranger: {
    weapons: ['martial'],
    armor: ['light', 'medium', 'shield'],
    skill: 'class_list:1',
    tools: [],
  },
  // L127-131: a skill from the Rogue's OWN list, Thieves' Tools, Light armour —
  // and NO weapons at all, though the Rogue's Core Traits row grants Simple.
  Rogue: {
    weapons: [],
    armor: ['light'],
    skill: 'class_list:1',
    tools: ["Thieves' Tools"],
  },
  // L140-141.
  Sorcerer: { weapons: [], armor: [], skill: 'any:0', tools: [] },
  // L153-155.
  Warlock: { weapons: [], armor: ['light'], skill: 'any:0', tools: [] },
  // L166-167, the other bullet-clipped block, and the one whose next line reads
  // `izard Class Features` with the W sliced off.
  Wizard: { weapons: [], armor: [], skill: 'any:0', tools: [] },
};

/** `class_list:1` / `any:1` / `any:0` for none — one string per printed shape. */
function skillKey(grant: SrdMulticlassEntryGrant): string {
  const columns = multiclassSkillColumns(grant.skill_choice);
  return `${columns.pool === 'none' ? 'any' : columns.pool}:${String(columns.count)}`;
}

function traitsFor(overrides: Partial<SrdClassTraits> = {}): SrdClassTraits[] {
  return parseSrdClassTraits().map((entry) =>
    entry.class_name === (overrides.class_name ?? '')
      ? { ...entry, ...overrides }
      : entry,
  );
}

describe('the multiclass entry grants, parsed from the extract', () => {
  const parsed = parseSrdMulticlassEntryGrants();
  const byName = new Map(parsed.map((grant) => [grant.class_name, grant]));

  it('produces exactly the twelve printed classes', () => {
    expect(parsed).toHaveLength(12);
    expect([...byName.keys()].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [className, expected] of Object.entries(EXPECTED)) {
    it(`reads ${className}'s clause as the extract prints it`, () => {
      const grant = byName.get(className);
      expect(grant, `${className} was not parsed`).toBeDefined();
      expect([...(grant as SrdMulticlassEntryGrant).weapon_categories]).toEqual([
        ...expected.weapons,
      ]);
      expect([...(grant as SrdMulticlassEntryGrant).armor_categories]).toEqual([
        ...expected.armor,
      ]);
      expect(skillKey(grant as SrdMulticlassEntryGrant)).toBe(expected.skill);
      expect([...(grant as SrdMulticlassEntryGrant).tool_grants]).toEqual([
        ...expected.tools,
      ]);
      // Every clause grants it, and three grant nothing else.
      expect((grant as SrdMulticlassEntryGrant).hit_die).toBe(true);
    });
  }

  it('grants SIMPLE weapons to nobody, in any class', () => {
    // Stated as its own assertion rather than left implicit in twelve empty
    // lists: the whole-table check above would still pass if `simple` were
    // added to a class that has no weapon clause AND the expectation were
    // "fixed" beside it. This one cannot be satisfied that way.
    expect(
      parsed.filter((grant) => grant.weapon_categories.includes('simple')),
    ).toEqual([]);
    expect(
      parsed
        .filter((grant) => grant.weapon_categories.length > 0)
        .map((grant) => grant.class_name),
    ).toEqual(['Barbarian', 'Fighter', 'Paladin', 'Ranger']);
  });

  it('never lets the Barbarian in through the Light armour its own table has', () => {
    // The single cell most likely to be got wrong by a parser that read the
    // Core Traits row and then filtered, rather than reading the entry clause.
    const initial = parseSrdClassTraits().find(
      (entry) => entry.class_name === 'Barbarian',
    );
    expect([...(initial as SrdClassTraits).armor_training]).toEqual([
      'light',
      'medium',
      'shield',
    ]);
    expect([...(byName.get('Barbarian') as SrdMulticlassEntryGrant).armor_categories]).toEqual([
      'shield',
    ]);
  });

  it('distinguishes the Bard from the Ranger by POOL and not by count', () => {
    const bard = multiclassSkillColumns(
      (byName.get('Bard') as SrdMulticlassEntryGrant).skill_choice,
    );
    const ranger = multiclassSkillColumns(
      (byName.get('Ranger') as SrdMulticlassEntryGrant).skill_choice,
    );
    expect(bard.count).toBe(ranger.count);
    expect(bard.pool).toBe('any');
    expect(ranger.pool).toBe('class_list');
  });

  it('rejoins a word hyphenated across a line break', () => {
    // `Mar-` / `tial` spans L24-25 and three other places. A line-oriented
    // reader extracts the category `Mar`, which is not a member of the enum and
    // would have been dropped silently by a filter rather than throwing.
    const source = parsed.flatMap((grant) => [...grant.weapon_categories]);
    expect(source).not.toContain('Mar');
    expect(new Set(source)).toEqual(new Set(['martial']));
  });
});

describe('the parse refuses content the storage shape cannot hold', () => {
  it('throws when an entry grant names armour the class is not trained in', () => {
    // THE INVARIANT THE PER-ROW FLAG DEPENDS ON. `class_armor_training` holds
    // one row per (class, category) and the flag says whether the row is also
    // an entry grant — so a category the class does not train in has NO ROW to
    // flag and would be dropped in silence. Simulated by narrowing the
    // Barbarian's Core Traits row rather than by editing the extract, because
    // the extract is the oracle and must not be touched to make a test pass.
    expect(() =>
      parseSrdMulticlassEntryGrants(
        undefined,
        traitsFor({ class_name: 'Barbarian', armor_training: ['light'] }),
      ),
    ).toThrow(SrdMulticlassEntryError);
    expect(() =>
      parseSrdMulticlassEntryGrants(
        undefined,
        traitsFor({ class_name: 'Barbarian', armor_training: ['light'] }),
      ),
    ).toThrow(/shield armour training on multiclass entry/);
  });

  it('throws when an entry grant names a weapon category the class lacks', () => {
    expect(() =>
      parseSrdMulticlassEntryGrants(
        undefined,
        traitsFor({
          class_name: 'Fighter',
          weapon_proficiencies: [{ category: 'simple', property_qualifier: null }],
        }),
      ),
    ).toThrow(/martial weapon proficiency on multiclass entry/);
  });

  it('throws when a class_list pool has no list to draw from', () => {
    // SQLite has no cross-table CHECK, so this is the only place the pairing
    // can be enforced. A Ranger with no `class_skill_options` rows would owe a
    // skill from a list that does not exist, and the completeness item would
    // send the player to an empty page.
    expect(() =>
      parseSrdMulticlassEntryGrants(
        undefined,
        traitsFor({ class_name: 'Ranger', skill_options: [] }),
      ),
    ).toThrow(/prints no skill list to draw from/);
  });

  it('throws on a class count other than twelve', () => {
    expect(() => parseSrdMulticlassEntryGrants('=== Bard (page line 1, column 1) ===\n')).toThrow(
      /expected the twelve classes/,
    );
  });

  it('throws on a block whose grant sentence it does not recognise', () => {
    const mangled =
      '=== Barbarian (page line 1, column 1) ===\n' +
      'As a Multiclass Character\n' +
      '* Gain whatever seems reasonable.\n' +
      [
        'Bard',
        'Cleric',
        'Druid',
        'Fighter',
        'Monk',
        'Paladin',
        'Ranger',
        'Rogue',
        'Sorcerer',
        'Warlock',
        'Wizard',
      ]
        .map(
          (name) =>
            `=== ${name} (page line 1, column 1) ===\n` +
            `* Gain the Hit Point Die from the Core ${name} Traits table.\n`,
        )
        .join('') +
      '';
    expect(() => parseSrdMulticlassEntryGrants(mangled)).toThrow(
      /no recognisable "As a Multiclass Character" grant sentence/,
    );
  });
});
