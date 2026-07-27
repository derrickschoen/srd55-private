import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { CatalogQueries } from '../../../src/queries/catalog-queries';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE FOUR STRUCTURED VALUES, END TO END THROUGH THE IMPORTER.
 *
 * The unit tests beside this one prove the two PARSERS. This proves the three
 * things a parser cannot: that the values reach the columns, that the columns
 * survive the CHECK constraints on a real schema, and that a reader gets them
 * back out.
 *
 * THE CENTRAL SAFETY CLAIM IS TESTED HERE AND NOT IN A UNIT: `spell_versions.
 * range` and `.components` still hold the author's text VERBATIM after import,
 * whatever the parse made of it. That is what makes closing the range and cost
 * vocabularies not a data-loss bug (D12/Q4), and it is a fact about the WRITER
 * rather than about the parser.
 */

function record(overrides: Record<string, unknown> = {}) {
  return {
    identityKey: 'sv-spell',
    versionKey: '2024:sv-spell',
    name: 'Structured Spell',
    edition: '2024',
    level: 1,
    school: 'Evocation',
    castingTime: 'Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    attackModes: [],
    saveAbilities: [],
    effectReliabilityCategory: 'attack_roll',
    spellLists: ['Wizard'],
    sourceBooks: ['Test Book'],
    sourcePage: 1,
    sourceSlug: 'sv-spell',
    ...overrides,
  };
}

let connection: Database | null = null;

async function importOne(
  overrides: Record<string, unknown> = {},
): Promise<{ db: DatabaseContext; row: Record<string, unknown> }> {
  connection = await openTestDatabase();
  const db = new DatabaseContext(connection);
  new CatalogImporter(db).import({
    documents: [JSON.stringify([record(overrides)])],
  });
  const row = db.oneRaw(
    'SELECT * FROM spell_versions WHERE content_key = ?',
    ['2024:sv-spell'],
  );
  expect(row).not.toBeNull();
  return { db, row: row as Record<string, unknown> };
}

afterEach(() => {
  connection?.close();
  connection = null;
});

describe('the catalog importer stores the structured spell values', () => {
  it('lands the parsed range in four columns AND keeps the printed line', () => {
    return importOne({ range: 'Self (30-foot Cone)' }).then(({ row }) => {
      // The 30 belongs to the CONE. `range_feet` stays null because the
      // printed line gives no distance to a target point.
      expect(row.range_kind).toBe('self');
      expect(row.range_feet).toBeNull();
      expect(row.area_shape).toBe('cone');
      expect(row.area_feet).toBe(30);
      // THE PASSTHROUGH LIMB, UNTOUCHED.
      expect(row.range).toBe('Self (30-foot Cone)');
    });
  });

  it('stores a range it cannot read as four nulls, losing nothing', () => {
    // The column's writers accept any string — the scraper assigns whatever
    // text follows `Range:` on a page — so the honest answer for an unreadable
    // line is no structure and the author's words intact.
    return importOne({ range: 'Anywhere on this plane' }).then(({ row }) => {
      expect(row.range_kind).toBeNull();
      expect(row.range_feet).toBeNull();
      expect(row.area_shape).toBeNull();
      expect(row.area_feet).toBeNull();
      expect(row.range).toBe('Anywhere on this plane');
    });
  });

  it('lands the material cost and its floor/exact flag, and keeps the line', () => {
    return importOne({
      components: 'V, S, M (a diamond worth 300+ GP, which the spell consumes)',
    }).then(({ row }) => {
      expect(row.material_cost_copper).toBe(30_000);
      expect(row.material_cost_kind).toBe('minimum');
      expect(row.material_component_summary).toBe(
        'a diamond worth 300+ GP, which the spell consumes',
      );
      // V/S/M is not modelled and is not lost: the line still prints.
      expect(row.components).toBe(
        'V, S, M (a diamond worth 300+ GP, which the spell consumes)',
      );
    });
  });

  it('stores no cost at all for the common V/S line, rather than zero', () => {
    return importOne({ components: 'V, S' }).then(({ row }) => {
      expect(row.material_cost_copper).toBeNull();
      expect(row.material_cost_kind).toBeNull();
      expect(row.material_component_summary).toBeNull();
      expect(row.components).toBe('V, S');
    });
  });

  it('stores an upcast progression as a LIST of SLOT levels plus its text', () => {
    return importOne({
      // Deliberately out of order in the document: "a list of levels" has one
      // meaningful order and an author's file should not decide it.
      upcastLevels: [4, 2, 3],
      upcastSummary: 'The damage increases by 1d6 for each slot level above 1.',
    }).then(({ db, row }) => {
      expect(row.upcast_summary).toBe(
        'The damage increases by 1d6 for each slot level above 1.',
      );
      const levels = db
        .allRaw(
          `SELECT level FROM spell_version_upcast_levels
           WHERE spell_version_id = ? ORDER BY level`,
          [row.id as number],
        )
        .map((stored) => stored.level);
      expect(levels).toEqual([2, 3, 4]);
    });
  });

  /**
   * THE OWNER'S OWN EXAMPLE, AS AN ACCEPTANCE TEST.
   *
   * > *"Some spells can be upcast every spell slot level, others only upcast
   * > every other spell slot level (ex. Spiritual weapon)"*
   *
   * Both round-trip through the importer and come back exactly. This is the
   * test that decides the SHAPE of the storage: narrow the list to a threshold
   * (`upcasts_from: 2`) and the first spell still round-trips while the second
   * comes back as `2, 3, 4, 5, 6, 7, 8, 9` — six slot levels at which it gains
   * nothing. Only a list can hold both.
   *
   * NEITHER SPELL IS NAMED IN THE STORED DATA AND NO SRD PROSE IS COPIED. The
   * two records are this file's own generic fixture with two different level
   * lists; naming Spiritual Weapon in a comment is citation.
   */
  it('round-trips a spell that upcasts at EVERY slot level and one that upcasts at every OTHER slot level', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const everyLevel = [2, 3, 4, 5, 6, 7, 8, 9];
    const everyOtherLevel = [3, 5, 7, 9];
    new CatalogImporter(db).import({
      documents: [
        JSON.stringify([
          record({
            identityKey: 'sv-every',
            versionKey: '2024:sv-every',
            name: 'Every Slot Level',
            // Shuffled on the way in, so a passing test cannot be the document's
            // order surviving by accident.
            upcastLevels: [...everyLevel].reverse(),
            upcastSummary: 'One more die per slot level above 1.',
          }),
          record({
            identityKey: 'sv-every-other',
            versionKey: '2024:sv-every-other',
            name: 'Every Other Slot Level',
            upcastLevels: [7, 3, 9, 5],
            upcastSummary: 'One more attack per two slot levels above 2.',
          }),
        ]),
      ],
    });

    const spells = new CatalogQueries(db).read().spells;
    const every = spells.find((spell) => spell.content_key === '2024:sv-every');
    const everyOther = spells.find(
      (spell) => spell.content_key === '2024:sv-every-other',
    );
    expect(every?.upcastLevels).toEqual(everyLevel);
    expect(everyOther?.upcastLevels).toEqual(everyOtherLevel);
    // THE DIFFERENCE IS THE ASSERTION. Two spells, same bounds, same summary
    // shape, and the only thing separating them is which slot levels are in the
    // list. Any storage that cannot hold both fails here.
    expect(every?.upcastLevels).not.toEqual(everyOther?.upcastLevels);
    expect(every?.upcast_summary).toBe('One more die per slot level above 1.');
    expect(everyOther?.upcast_summary).toBe(
      'One more attack per two slot levels above 2.',
    );
  });

  it('stores a cantrip’s CHARACTER levels in the SIBLING table, never in the slot one', () => {
    // `5, 11, 17` is the ladder both bundled cantrips print
    // (`docs/srd/source/weapon-attack-cantrips.txt:26-29` and `:53-54`). It is
    // a Cantrip Upgrade and not an upcast: no slot is spent, and 11 and 17 are
    // values `spell_version_upcast_levels` now refuses outright.
    return importOne({
      level: 0,
      cantripUpgradeLevels: [17, 5, 11],
      cantripUpgradeSummary: 'The damage increases when you reach certain levels.',
    }).then(({ db, row }) => {
      expect(row.cantrip_upgrade_summary).toBe(
        'The damage increases when you reach certain levels.',
      );
      expect(row.upcast_summary).toBeNull();
      expect(
        db.scalar(
          'SELECT COUNT(*) FROM spell_version_upcast_levels WHERE spell_version_id = ?',
          [row.id as number],
        ),
      ).toBe(0);
      const spells = new CatalogQueries(db).read().spells;
      expect(spells).toHaveLength(1);
      expect(spells[0]?.cantripUpgradeLevels).toEqual([5, 11, 17]);
      expect(spells[0]?.upcastLevels).toEqual([]);
    });
  });

  it('carries BOTH ladders on one spell without either reading the other', () => {
    // Nothing in the schema makes the two exclusive, and a reader that took
    // one table for both would show it here: the lists are disjoint and only
    // one of them is storable in each table.
    return importOne({
      upcastLevels: [2, 4],
      upcastSummary: 'Slot text.',
      cantripUpgradeLevels: [5, 11],
      cantripUpgradeSummary: 'Character text.',
    }).then(({ db }) => {
      const spell = new CatalogQueries(db).read().spells[0];
      expect(spell?.upcastLevels).toEqual([2, 4]);
      expect(spell?.cantripUpgradeLevels).toEqual([5, 11]);
      expect(spell?.upcast_summary).toBe('Slot text.');
      expect(spell?.cantrip_upgrade_summary).toBe('Character text.');
    });
  });

  it('replaces each level list on re-import rather than accumulating it', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const importer = new CatalogImporter(db);
    importer.import({
      documents: [
        JSON.stringify([
          record({ upcastLevels: [2, 3, 4], cantripUpgradeLevels: [5, 11, 17] }),
        ]),
      ],
    });
    importer.import({
      documents: [
        JSON.stringify([
          record({ upcastLevels: [2], cantripUpgradeLevels: [5] }),
        ]),
      ],
    });
    // A ladder that got SHORTER must not keep its old tail. A document is the
    // whole truth about the record it describes, and both tables obey it.
    expect(
      db
        .allRaw('SELECT level FROM spell_version_upcast_levels ORDER BY level')
        .map((row) => row.level),
    ).toEqual([2]);
    expect(
      db
        .allRaw(
          'SELECT level FROM spell_version_cantrip_upgrade_levels ORDER BY level',
        )
        .map((row) => row.level),
    ).toEqual([5]);
  });

  it('carries the whole structured set out through the catalog read model', () => {
    return importOne({
      range: '120 feet',
      components: 'V, S, M (a weapon worth 1+ CP)',
    }).then(({ db }) => {
      const spell = new CatalogQueries(db).read().spells[0];
      expect(spell?.range_kind).toBe('ranged');
      expect(spell?.range_feet).toBe(120);
      expect(spell?.area_shape).toBeNull();
      expect(spell?.material_cost_copper).toBe(1);
      expect(spell?.material_cost_kind).toBe('minimum');
      // `components` is `string | null` here and always was in the DDL and the
      // writer; the model type said `JsonValue | null` until this change and
      // `CatalogSpell` carried an `Omit` to undo it.
      expect(spell?.components).toBe('V, S, M (a weapon worth 1+ CP)');
      expect(spell?.upcastLevels).toEqual([]);
    });
  });

  /**
   * THE READ MODEL VALIDATES THE THREE CLOSED VOCABULARIES RATHER THAN CASTING
   * THEM.
   *
   * THERE WERE FOUR. `upcast_scale` was the fourth and its column is gone: the
   * two kinds of level are two tables now, and a table name is not a stored
   * value that can hold an unreadable fourth member.
   *
   * `CatalogSpell` hands a consumer `range_kind: SpellRangeKind | null`, which
   * entitles that consumer to switch on it exhaustively with no `default` arm —
   * and the printable card already has one such switch, which returned the
   * literal string `undefined` while the column was cast rather than checked.
   * A cast cannot fail; only a check can.
   *
   * REACHABLE FOR F11'S REASON: every one of these columns carries a CHECK, and
   * a CHECK constrains no image created before it existed and no hand-edited
   * one. The pragma is how a test reaches that image.
   */
  it('reads a stored member outside a closed vocabulary as ABSENT, not as itself', () => {
    return importOne({
      range: 'Self (30-foot Cone)',
      components: 'V, S, M (a weapon worth 1+ CP)',
      upcastLevels: [2],
      upcastSummary: 'More dice.',
    }).then(({ db }) => {
      db.exec('PRAGMA ignore_check_constraints = ON');
      const written = db.exec(
        `UPDATE spell_versions
            SET range_kind = 'planar', area_shape = 'tesseract',
                material_cost_kind = 'haggled'
          WHERE content_key = ?`,
        ['2024:sv-spell'],
      );
      db.exec('PRAGMA ignore_check_constraints = OFF');
      // The corrupt values really are stored — otherwise this measures nothing.
      expect(written.changes).toBe(1);
      expect(
        db.oneRaw(
          `SELECT range_kind, area_shape, material_cost_kind
             FROM spell_versions WHERE content_key = ?`,
          ['2024:sv-spell'],
        ),
      ).toEqual({
        range_kind: 'planar',
        area_shape: 'tesseract',
        material_cost_kind: 'haggled',
      });

      const spell = new CatalogQueries(db).read().spells[0];
      expect(spell?.range_kind).toBeNull();
      expect(spell?.area_shape).toBeNull();
      expect(spell?.material_cost_kind).toBeNull();
      // THE NUMBERS AND THE PRINTED TEXT BESIDE THEM ARE UNAFFECTED. Only the
      // word we cannot read is withheld; nothing else is thrown away with it.
      expect(spell?.area_feet).toBe(30);
      expect(spell?.material_cost_copper).toBe(1);
      expect(spell?.range).toBe('Self (30-foot Cone)');
      expect(spell?.upcastLevels).toEqual([2]);
    });
  });
});

describe('the Tier 1 document format refuses a progression it cannot mean', () => {
  async function refuse(overrides: Record<string, unknown>): Promise<string> {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    try {
      new CatalogImporter(db).import({
        documents: [JSON.stringify([record(overrides)])],
      });
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    return 'ACCEPTED';
  }

  it('bounds upcast levels at 9, because a tenth spell slot does not exist', async () => {
    expect(await refuse({ upcastLevels: [10] })).toContain(
      'integers from 1 through 9',
    );
    // 17 and 20 USED TO BE ACCEPTED HERE, under the scale that admitted
    // character levels into this same field. They are Cantrip Upgrade steps and
    // this field is slot levels, so they are now refused by name.
    expect(await refuse({ upcastLevels: [17] })).toContain(
      'integers from 1 through 9',
    );
    expect(await refuse({ upcastLevels: [20] })).toContain(
      'integers from 1 through 9',
    );
    expect(await refuse({ upcastLevels: [1, 9] })).toBe('ACCEPTED');
  });

  it('bounds cantrip upgrade levels at 20, because that is the highest character level', async () => {
    expect(await refuse({ cantripUpgradeLevels: [21] })).toContain(
      'integers from 1 through 20',
    );
    // The bundled ladder, and the exact three the slot field refuses.
    expect(await refuse({ cantripUpgradeLevels: [5, 11, 17] })).toBe(
      'ACCEPTED',
    );
    expect(await refuse({ cantripUpgradeLevels: [20] })).toBe('ACCEPTED');
  });

  it('refuses a repeated level and a non-integer one, in either list', async () => {
    expect(await refuse({ upcastLevels: [3, 3] })).toContain('repeats level 3');
    expect(await refuse({ upcastLevels: [2.5] })).toContain(
      'integers from 1 through 9',
    );
    expect(await refuse({ cantripUpgradeLevels: [5, 5] })).toContain(
      'repeats level 5',
    );
    expect(await refuse({ cantripUpgradeLevels: [5.5] })).toContain(
      'integers from 1 through 20',
    );
  });

  /**
   * `upcastScale` IS REFUSED BY NAME, AND SILENCE WOULD HAVE BEEN A WRONG
   * NUMBER.
   *
   * Unknown fields are dropped silently everywhere else in this format. Dropped
   * here, `{"upcastScale": "character_level", "upcastLevels": [5]}` — a cantrip
   * ladder written against the old format — would import as SLOT level 5 and
   * print "Upcast: slot levels 5", which the document never said. The refusal
   * names both replacements, so nothing a user can express is lost.
   */
  it('refuses the retired upcastScale by name rather than reinterpreting its levels', async () => {
    const message = await refuse({
      upcastScale: 'character_level',
      upcastLevels: [5],
    });
    expect(message).toContain("Catalog field 'upcastScale' no longer exists");
    expect(message).toContain('upcastLevels');
    expect(message).toContain('cantripUpgradeLevels');
    // Refused whatever it says, including the value that used to be the
    // slot-level one: the field cannot be trusted to mean anything now.
    expect(await refuse({ upcastScale: 'slot_level', upcastLevels: [2] }))
      .toContain("Catalog field 'upcastScale' no longer exists");
  });

  it('accepts an explicit upcastScale of null, which every scraped document writes', async () => {
    // `tools/scrape/parse-spell.ts` emitted `"upcastScale": null` on every
    // record it ever wrote. A null asserts nothing, so it is ignored rather
    // than treated as the field being present.
    expect(await refuse({ upcastScale: null, upcastLevels: [2] })).toBe(
      'ACCEPTED',
    );
  });

  it('accepts a summary with no list, and a list with no summary', async () => {
    // The old format required a scale and a list TOGETHER because a list with
    // no scale could not be read. Nothing here has that problem.
    expect(await refuse({ upcastSummary: 'Prose only.' })).toBe('ACCEPTED');
    expect(await refuse({ upcastLevels: [2] })).toBe('ACCEPTED');
    expect(await refuse({ cantripUpgradeSummary: 'Prose only.' })).toBe(
      'ACCEPTED',
    );
  });

  it('accepts every document that omits all four, which is every one in the wild', async () => {
    expect(await refuse({})).toBe('ACCEPTED');
  });
});
