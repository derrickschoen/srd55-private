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

  it('stores an upcast progression as a LIST of levels plus its scale and text', () => {
    return importOne({
      upcastScale: 'slot_level',
      // Deliberately out of order in the document: "a list of levels" has one
      // meaningful order and an author's file should not decide it.
      upcastLevels: [4, 2, 3],
      upcastSummary: 'The damage increases by 1d6 for each slot level above 1.',
    }).then(({ db, row }) => {
      expect(row.upcast_scale).toBe('slot_level');
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

  it('keeps a cantrip’s CHARACTER levels apart from a spell’s SLOT levels', () => {
    // `5, 11, 17` is the ladder both bundled cantrips print
    // (`docs/srd/source/weapon-attack-cantrips.txt:26-29` and `:53-54`). The
    // integers alone cannot say which question they answer, which is why the
    // scale is stored and not inferred from the spell's level.
    return importOne({
      level: 0,
      upcastScale: 'character_level',
      upcastLevels: [5, 11, 17],
      upcastSummary: 'The damage increases when you reach certain levels.',
    }).then(({ db, row }) => {
      expect(row.upcast_scale).toBe('character_level');
      const spells = new CatalogQueries(db).read().spells;
      expect(spells).toHaveLength(1);
      expect(spells[0]?.upcastLevels).toEqual([5, 11, 17]);
      expect(spells[0]?.upcast_scale).toBe('character_level');
    });
  });

  it('replaces the level list on re-import rather than accumulating it', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const importer = new CatalogImporter(db);
    importer.import({
      documents: [
        JSON.stringify([
          record({ upcastScale: 'slot_level', upcastLevels: [2, 3, 4] }),
        ]),
      ],
    });
    importer.import({
      documents: [
        JSON.stringify([
          record({ upcastScale: 'slot_level', upcastLevels: [2] }),
        ]),
      ],
    });
    // A package that got SHORTER must not keep its old tail. A document is the
    // whole truth about the record it describes.
    expect(
      db
        .allRaw('SELECT level FROM spell_version_upcast_levels ORDER BY level')
        .map((row) => row.level),
    ).toEqual([2]);
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
   * THE READ MODEL VALIDATES THE FOUR CLOSED VOCABULARIES RATHER THAN CASTING
   * THEM.
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
      upcastScale: 'slot_level',
      upcastLevels: [2],
      upcastSummary: 'More dice.',
    }).then(({ db }) => {
      db.exec('PRAGMA ignore_check_constraints = ON');
      const written = db.exec(
        `UPDATE spell_versions
            SET range_kind = 'planar', area_shape = 'tesseract',
                material_cost_kind = 'haggled', upcast_scale = 'planar_level'
          WHERE content_key = ?`,
        ['2024:sv-spell'],
      );
      db.exec('PRAGMA ignore_check_constraints = OFF');
      // The corrupt values really are stored — otherwise this measures nothing.
      expect(written.changes).toBe(1);
      expect(
        db.oneRaw(
          `SELECT range_kind, area_shape, material_cost_kind, upcast_scale
             FROM spell_versions WHERE content_key = ?`,
          ['2024:sv-spell'],
        ),
      ).toEqual({
        range_kind: 'planar',
        area_shape: 'tesseract',
        material_cost_kind: 'haggled',
        upcast_scale: 'planar_level',
      });

      const spell = new CatalogQueries(db).read().spells[0];
      expect(spell?.range_kind).toBeNull();
      expect(spell?.area_shape).toBeNull();
      expect(spell?.material_cost_kind).toBeNull();
      expect(spell?.upcast_scale).toBeNull();
      // THE NUMBERS AND THE PRINTED TEXT BESIDE THEM ARE UNAFFECTED. Only the
      // word we cannot read is withheld; nothing else is thrown away with it.
      expect(spell?.area_feet).toBe(30);
      expect(spell?.material_cost_copper).toBe(1);
      expect(spell?.range).toBe('Self (30-foot Cone)');
      expect(spell?.upcastLevels).toEqual([2]);
    });
  });
});

describe('the Tier 1 document format refuses an upcast it cannot mean', () => {
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

  it('refuses levels with no scale — the integers cannot say which they are', async () => {
    expect(await refuse({ upcastLevels: [2, 3] })).toContain(
      "Catalog field 'upcastScale' is required",
    );
  });

  it('refuses a scale with no levels, which asserts a shape for an absent list', async () => {
    expect(await refuse({ upcastScale: 'slot_level' })).toContain(
      "Catalog field 'upcastLevels' must not be empty",
    );
  });

  it('bounds slot levels at 9 and character levels at 20, per the scale', async () => {
    // THE CHECK A COLUMN CONSTRAINT CANNOT MAKE: a CHECK on
    // `spell_version_upcast_levels.level` cannot see the parent's scale, so it
    // enforces the looser 1..20 and this enforces the exact one.
    expect(
      await refuse({ upcastScale: 'slot_level', upcastLevels: [10] }),
    ).toContain('integers from 1 through 9');
    expect(
      await refuse({ upcastScale: 'character_level', upcastLevels: [21] }),
    ).toContain('integers from 1 through 20');
    expect(
      await refuse({ upcastScale: 'character_level', upcastLevels: [17] }),
    ).toBe('ACCEPTED');
  });

  it('refuses a repeated level and a non-integer one', async () => {
    expect(
      await refuse({ upcastScale: 'slot_level', upcastLevels: [3, 3] }),
    ).toContain('repeats level 3');
    expect(
      await refuse({ upcastScale: 'slot_level', upcastLevels: [2.5] }),
    ).toContain('integers from 1 through 9');
  });

  it('refuses a scale outside the two, rather than storing an uncountable list', async () => {
    expect(
      await refuse({ upcastScale: 'spell_level', upcastLevels: [2] }),
    ).toContain("Catalog field 'upcastScale' must be one of");
  });

  it('accepts every document that omits all three, which is every one in the wild', async () => {
    expect(await refuse({})).toBe('ACCEPTED');
  });
});
