import { beforeEach, describe, expect, it } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import preDrizzleSchema from '../../fixtures/schema-pre-drizzle.sql?raw';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import { bootDatabase, degradedRejection } from '../../../src/worker/boot';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

/**
 * THE CUTOVER BREAKAGE, ASSERTED DELIBERATELY.
 *
 * `databaseSchemaSignature` compares normalised `sqlite_schema.sql` text, and
 * the normalisation collapses whitespace only — it does not normalise
 * identifier quoting. The pre-Drizzle artifact was largely unquoted; the
 * generated one is backtick-quoted. The signature therefore changes, and every
 * database image written before the cutover becomes unopenable by this build.
 *
 * This is ACCEPTED (pre-alpha, no users) and is asserted here rather than
 * discovered later. Attempting byte compatibility was explicitly rejected: it
 * would have meant contorting the generator to reproduce hand-written quoting
 * for no product benefit.
 *
 * What matters is that the failure is RECOVERABLE, which is what the degraded
 * boot path (landed before the cutover) provides and what the second test
 * pins.
 */
describe('pre-Drizzle database images', () => {
  async function storageHoldingPreDrizzleImage(): Promise<MemoryDatabaseStorage> {
    const storage = new MemoryDatabaseStorage(sqlite3);
    // Build an image with the OLD artifact by handing the old SQL to a
    // lifecycle, then hand the SAME storage to a lifecycle using the new one.
    //
    // Written WITHOUT `DatabaseLifecycle`, deliberately. The pre-Drizzle
    // artifact predates the native weapon tables, so `applicationTables` — now
    // derived from the current schema — rejects it at open. Building the
    // fixture through the lifecycle would mean asserting that an old image
    // opens cleanly, which is the opposite of what this file claims.
    const legacy = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      legacy.exec(preDrizzleSchema);
      legacy.exec("INSERT INTO characters (name) VALUES ('Legacy')");
      await storage.replaceFile(
        sqlite3.capi.sqlite3_js_db_export(legacy).slice(),
      );
    } finally {
      legacy.close();
    }
    return storage;
  }

  it('is byte-different from the generated artifact, and the counts have parted both ways', () => {
    expect(preDrizzleSchema).not.toBe(schema);
    // The fixture is a HISTORICAL artifact and is deliberately left frozen: its
    // whole purpose is to be the thing the signature check trips on, and
    // pruning it to match would destroy that.
    //
    // It has since diverged from the generated schema in BOTH directions, which
    // is why the counts are asserted rather than left as a surprise: the
    // fixture still declares the eight Laravel-only tables that were dropped,
    // leaving 30 tables shared with the generated artifact. The generated
    // artifact now declares 87 tables, so the old image is also short of 57
    // `applicationTables` and fails EARLIER, not less.
    //
    // These are COUNTS, not an equivalence proof, and do not claim to be one.
    // `tests/unit/schema.test.ts` runs against the generated artifact and is
    // what actually pins columns, nullability, indexes, defaults and foreign
    // key actions; it also holds THIS fixture to its two recorded hashes, so
    // the fixture cannot be quietly edited to make this file pass.
    const tableCount = (sql: string) =>
      [...sql.matchAll(/CREATE TABLE/g)].length;
    expect(tableCount(preDrizzleSchema)).toBe(38);
    expect(tableCount(schema)).toBe(87);
  });

  it('rejects a pre-Drizzle image at open instead of half-working', async () => {
    const storage = await storageHoldingPreDrizzleImage();

    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') {
      throw new Error('unreachable');
    }
    // The missing-tables check runs before the signature comparison, so an
    // image predating the native weapon tables is now named for what it is
    // actually short of. Both paths produce the same recoverable
    // `schema_mismatch` status, which is what the next test depends on.
    expect(boot.detail).toContain(
      // All 56 current application tables absent from the frozen fixture, in
      // the order the missing-table check reports them.
      'Database image is missing application tables: armor_templates, ' +
        'background_equipment_items, ' +
        'background_template_effects, ' +
        'background_templates, ' +
        'catalog_content_aliases, catalog_content_archive_members, ' +
        'catalog_content_replacement_choices, ' +
        'catalog_content_drafts, ' +
        'catalog_content_fingerprints, ' +
        'catalog_content_identities, catalog_content_match_decisions, ' +
        'catalog_content_provenance, ' +
        'catalog_content_supersessions, ' +
        'catalog_data_migrations, ' +
        'class_equipment_items, character_armor, ' +
        'character_attunement_slots, ' +
        'character_background, ' +
        'character_effects, character_hit_point_rolls, character_items, ' +
        'character_level_feat_choices, ' +
        'character_share_receipts, ' +
        'character_sheet_adjustments, ' +
        'character_skill_grants, ' +
        'character_skill_expertise_grants, ' +
        'character_skill_proficiencies, character_species, ' +
        'character_species_traits, character_weapons, class_armor_training, ' +
        'class_extra_attack_grants, class_feature_effects, ' +
        'class_feature_value_contributions, ' +
        'class_martial_arts_dice, ' +
        'class_resource_formulas, class_resources, ' +
        'class_saving_throw_proficiencies, class_sheet_traits, ' +
        'class_skill_options, class_weapon_mastery_counts, ' +
        'class_weapon_mastery_grants, class_weapon_proficiencies, ' +
        'item_definition_effects, item_definitions, ' +
        'named_features, named_feature_effects, ' +
        'party_document_states, ' +
        'species_template_trait_effects, ' +
        'species_template_traits, species_templates, ' +
        'spell_version_cantrip_upgrade_levels, ' +
        'spell_version_upcast_levels, ' +
        'subclass_feature_effects, subclass_feature_value_contributions, ' +
        'subclass_features, weapon_templates.',
    );
  });

  it('leaves the recovery path reachable from a rejected pre-Drizzle image', async () => {
    const storage = await storageHoldingPreDrizzleImage();
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    expect(degradedRejection(boot, 'queries.characterWorkspace')).not.toBeNull();
    expect(degradedRejection(boot, 'system.exportDatabase')).toBeNull();
    expect(degradedRejection(boot, 'system.reset')).toBeNull();

    // The user's bytes are still rescuable...
    const rescued = await boot.lifecycle.exportBytes();
    expect(rescued.byteLength).toBeGreaterThan(0);

    // ...and reset brings the app back on the current schema.
    await boot.lifecycle.reset();
    expect(boot.lifecycle.isOpen).toBe(true);
    expect(boot.lifecycle.database.scalar('SELECT count(*) FROM characters')).toBe(
      0,
    );
    boot.lifecycle.close();
  });
});

/**
 * THE SIGNATURE LIMB, EXERCISED ON ITS OWN.
 *
 * The pre-Drizzle image above no longer reaches the signature comparison: it
 * predates 51 tables, so the missing-tables check refuses it first. That is
 * correct behaviour and the test says so — but it means nothing was left
 * proving what happens to an image that has EVERY table and merely disagrees
 * about the DDL text.
 *
 * That is exactly the image this change produces. Retiring `laravelDefault`
 * rewrote 56 `DEFAULT` clauses — `DEFAULT '0'` became `DEFAULT false`,
 * `DEFAULT '10'` became `DEFAULT 10` — so every database written by the
 * previous build now differs from this one in DDL text and in nothing else.
 * D7 accepts the break (pre-alpha, no users). What it does not accept is the
 * break being a crash rather than a recoverable refusal, so that is asserted
 * here rather than assumed.
 *
 * The fixture is built by transforming the CURRENT artifact, which is exactly
 * the reconstruction the previous build emitted and is not an expectation
 * regenerated from our own output: nothing here asserts a value read back out
 * of the schema. What is asserted is the boot outcome.
 */
describe('an image from a build whose defaults were quoted', () => {
  const previouslyEmittedSchema = schema
    .replace(/DEFAULT false/g, "DEFAULT '0'")
    .replace(/DEFAULT true/g, "DEFAULT '1'")
    .replace(/DEFAULT (\d+)/g, "DEFAULT '$1'");

  async function storageHoldingQuotedDefaultImage(): Promise<MemoryDatabaseStorage> {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const previous = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      previous.exec(previouslyEmittedSchema);
      previous.exec("INSERT INTO characters (name) VALUES ('Quoted')");
      await storage.replaceFile(
        sqlite3.capi.sqlite3_js_db_export(previous).slice(),
      );
    } finally {
      previous.close();
    }
    return storage;
  }

  it('differs from the current artifact in DEFAULT text and nothing else', () => {
    expect(previouslyEmittedSchema).not.toBe(schema);
    // Same tables, same columns, same everything the missing-tables check reads
    // — so this image gets past it and the SIGNATURE is what refuses it.
    const withoutDefaults = (sql: string) =>
      sql.replace(/ DEFAULT (?:'[^']*'|[^ ,\n]+)/g, '');
    expect(withoutDefaults(previouslyEmittedSchema)).toBe(
      withoutDefaults(schema),
    );
  });

  it('is refused by the signature, naming the schema rather than a missing table', async () => {
    const storage = await storageHoldingQuotedDefaultImage();
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') {
      throw new Error('unreachable');
    }
    expect(boot.detail).toBe(
      'Database image schema does not match the application schema.',
    );
  });

  it('leaves export and reset reachable, and loses no bytes on the way', async () => {
    const storage = await storageHoldingQuotedDefaultImage();
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    expect(degradedRejection(boot, 'queries.characterWorkspace')).not.toBeNull();
    expect(degradedRejection(boot, 'system.exportDatabase')).toBeNull();
    expect(degradedRejection(boot, 'system.reset')).toBeNull();

    // THE BYTES ARE THE POINT, not merely that they are non-empty: the user's
    // own row has to still be in them, or "recoverable" means nothing.
    const rescued = await boot.lifecycle.exportBytes();
    const inspect = openDatabaseImage(sqlite3, rescued, { readonly: true });
    try {
      expect(inspect.selectValue('SELECT name FROM characters')).toBe('Quoted');
    } finally {
      inspect.close();
    }

    await boot.lifecycle.reset();
    expect(boot.lifecycle.isOpen).toBe(true);
    expect(
      boot.lifecycle.database.scalar('SELECT count(*) FROM characters'),
    ).toBe(0);
    boot.lifecycle.close();
  });
});
