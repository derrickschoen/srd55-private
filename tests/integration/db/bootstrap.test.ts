import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import { sqlString } from '../../../src/db/codecs';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import { auditCandidateDatabase } from '../../../src/db/candidate-audit';
import { AddSourceCommand } from '../../../src/commands/add-source';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { CharacterCompletenessQueries } from '../../../src/queries/character-completeness';
import {
  bundledClassContentKeys,
  hasBundledClassContent,
  seedClassProgressions,
} from '../../../src/rules/class-progression-lookup';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';
import { hasBundledClassResourceContent } from '../../../src/rules/class-resources-srd';
import {
  ensureBundledStableContentIdentity,
  registerAssertedContentIdentity,
} from '../../../src/catalog/content-registry';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';

const SRD_CLASSES = [
  'Barbarian',
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
] as const;

const SRD_SUBCLASSES = ['AT', 'EK'] as const;

const lifecycles: DatabaseLifecycle[] = [];

afterEach(() => {
  while (lifecycles.length > 0) {
    lifecycles.pop()?.close();
  }
});

function track(lifecycle: DatabaseLifecycle): DatabaseLifecycle {
  lifecycles.push(lifecycle);
  return lifecycle;
}

async function freshApplicationLifecycle(): Promise<{
  sqlite3: Sqlite3Static;
  lifecycle: DatabaseLifecycle;
}> {
  const sqlite3 = await getSqlite3();
  const lifecycle = track(
    createApplicationLifecycle(sqlite3, new MemoryDatabaseStorage(sqlite3)),
  );
  lifecycle.open();
  return { sqlite3, lifecycle };
}

/**
 * A lifecycle over the raw schema with no bundled content, used to build the
 * images a real install might be handed.
 */
function bareLifecycle(sqlite3: Sqlite3Static): DatabaseLifecycle {
  const lifecycle = track(
    new DatabaseLifecycle(sqlite3, new MemoryDatabaseStorage(sqlite3), schema),
  );
  lifecycle.open();
  return lifecycle;
}

function classNames(lifecycle: DatabaseLifecycle): string[] {
  return lifecycle.database
    .all(
      'SELECT name FROM class_definitions ORDER BY name',
      undefined,
      (row) => sqlString(row, 'name'),
    );
}

describe('application database bootstrap', () => {
  it('gives a brand new database the twelve SRD classes with full progressions', async () => {
    const { lifecycle } = await freshApplicationLifecycle();

    expect(classNames(lifecycle)).toEqual([...SRD_CLASSES]);
    expect(
      lifecycle.database
        .all(
          'SELECT name FROM subclass_definitions ORDER BY name',
          undefined,
          (row) => sqlString(row, 'name'),
        ),
    ).toEqual([...SRD_SUBCLASSES]);
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM class_progressions'),
    ).toBe(SRD_CLASSES.length * 20);
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM subclass_progressions'),
    ).toBe(SRD_SUBCLASSES.length * 20);
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM class_progressions
         WHERE class_level < 1 OR class_level > 20`,
      ),
    ).toBe(0);
  });

  it('ships the read-only SRD spell catalogue on a fresh install', async () => {
    const { lifecycle } = await freshApplicationLifecycle();
    const db = lifecycle.database;

    expect(db.scalar('SELECT count(*) FROM spell_versions')).toBe(339);
    expect(db.scalar('SELECT count(*) FROM spell_identities')).toBe(339);
    expect(db.scalar('SELECT count(*) FROM characters')).toBe(0);

    const clericId = Number(
      db.scalar("SELECT id FROM class_definitions WHERE name = 'Cleric'"),
    );
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Fresh Install')",
    ).lastInsertId;
    new AddSourceCommand(
      db,
      {
        type: 'add_source',
        source_type: 'class',
        source_definition_id: clericId,
        config: { level: 1 },
      },
      new CharacterCommandIntegrity('bootstrap-fixture'),
    ).apply(characterId);

    const result = new CharacterCompletenessQueries(db).build(characterId);

    // The bundled classes and spells generate real choices immediately. The
    // spell choices are actionable rather than catalog-blocked, while Divine
    // Order and the Cleric's two skill proficiencies remain independent player
    // choices.
    //
    // The Cleric's two skill proficiencies arrive as PER-GRANT items
    // (skills-with-provenance §3.3): `add_source` runs the generator, the
    // class arm mints two addressable unfilled grants, and each stays
    // outstanding until ITS OWN skill is chosen. NOT here, deliberately: a
    // level whose hit die was never rolled. Not rolling is a legitimate
    // steady state — the printed fixed value is a complete answer — so
    // reporting it would nag every character forever.
    expect(result.items).toEqual([
      {
        kind: 'unchosen_option',
        title: 'Cleric 1 — Divine Order not chosen',
        detail:
          'Divine Order is unchosen, so this source has granted no spells yet.',
        remedy:
          'Open Cleric 1 in the planner and choose Protector or Thaumaturge.',
        source_instance_id: expect.any(Number) as number,
        source_name: 'Cleric 1',
        order_name: 'Divine Order',
        options: ['Protector', 'Thaumaturge'],
      },
      {
        kind: 'unfilled_choices',
        title: 'Cleric 1 — 0 of 3 cantrips chosen',
        detail: 'This source grants 3 cantrip choices; 3 are still empty.',
        remedy: 'Open Cleric 1 in the planner and choose 3 cantrips.',
        source_instance_id: expect.any(Number) as number,
        source_name: 'Cleric 1',
        rule_key: 'cleric-cantrips',
        bucket: 'cantrip_known',
        required: 3,
        chosen: 0,
        missing: 3,
      },
      {
        kind: 'unfilled_choices',
        title: 'Cleric 1 — 0 of 4 prepared spells chosen',
        detail:
          'This source grants 4 prepared spell choices; 4 are still empty.',
        remedy:
          'Open Cleric 1 in the planner and choose 4 spells for the prepared list.',
        source_instance_id: expect.any(Number) as number,
        source_name: 'Cleric 1',
        rule_key: 'cleric-prepared',
        bucket: 'prepared',
        required: 4,
        chosen: 0,
        missing: 4,
      },
      {
        kind: 'unfilled_skill_grants',
        title: 'Cleric 1 — 0 of 2 class skill choices chosen',
        detail:
          'This source grants 2 class skill choices; 2 are still unchosen. ' +
          'A skill held from another source never fills this choice — it ' +
          'only leaves the list of skills still available to pick.',
        remedy: 'Pick 2 skills with the choice controls below.',
        source_instance_id: expect.any(Number) as number,
        source_name: 'Cleric 1',
        grant_key: 'class_skill',
        chosen: 0,
        required: 2,
        missing: 2,
        grants: [
          {
            grant_id: expect.any(Number) as number,
            ordinal: 1,
            // Hand-transcribed from the Core Cleric Traits table, never read
            // back from the query.
            available_skills: [
              'history',
              'insight',
              'medicine',
              'persuasion',
              'religion',
            ],
          },
          {
            grant_id: expect.any(Number) as number,
            ordinal: 2,
            available_skills: [
              'history',
              'insight',
              'medicine',
              'persuasion',
              'religion',
            ],
          },
        ],
      },
    ]);
    expect(result.outstanding_count).toBe(4);
    expect(result.catalog_gap_count).toBe(0);
    expect(result.catalog_gaps).toEqual([]);
  });

  it('leaves the bundled content untouched when it is already present', async () => {
    const { lifecycle } = await freshApplicationLifecycle();
    lifecycle.database.exec(
      `UPDATE class_definitions SET updated_at = '1999-01-01T00:00:00.000Z'`,
    );
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Returning User')",
    );

    lifecycle.reopen();

    // A rewritten row would carry a fresh timestamp; the sentinel proves the
    // seeder was skipped rather than merely being idempotent.
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM class_definitions
         WHERE updated_at <> '1999-01-01T00:00:00.000Z'`,
      ),
    ).toBe(0);
    expect(classNames(lifecycle)).toEqual([...SRD_CLASSES]);
    expect(
      lifecycle.database.allRaw('SELECT name FROM characters'),
    ).toEqual([{ name: 'Returning User' }]);
  });

  it('keeps the classes across a reset', async () => {
    const { lifecycle } = await freshApplicationLifecycle();
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Doomed Hero')",
    );

    await lifecycle.reset();

    expect(lifecycle.database.scalar('SELECT count(*) FROM characters')).toBe(
      0,
    );
    expect(classNames(lifecycle)).toEqual([...SRD_CLASSES]);
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM class_progressions'),
    ).toBe(SRD_CLASSES.length * 20);
  });

  it('seeds a restored image that has no classes and does not duplicate one that has', async () => {
    const { sqlite3, lifecycle } = await freshApplicationLifecycle();

    const classless = bareLifecycle(sqlite3);
    classless.database.exec(
      "INSERT INTO characters (name) VALUES ('Imported Hero')",
    );
    expect(hasBundledClassContent(classless.database)).toBe(false);
    const classlessBytes = await classless.exportBytes();
    classless.close();

    await lifecycle.replace(classlessBytes);

    expect(classNames(lifecycle)).toEqual([...SRD_CLASSES]);
    expect(
      lifecycle.database.allRaw('SELECT name FROM characters'),
    ).toEqual([{ name: 'Imported Hero' }]);

    const seededBytes = await lifecycle.exportBytes();
    await lifecycle.replace(seededBytes);

    expect(classNames(lifecycle)).toEqual([...SRD_CLASSES]);
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM class_definitions'),
    ).toBe(SRD_CLASSES.length);
  });

  it('repairs a database whose definitions survived but whose progressions did not', async () => {
    const { lifecycle } = await freshApplicationLifecycle();
    lifecycle.database.exec(
      "INSERT INTO characters (name) VALUES ('Survivor')",
    );
    lifecycle.database.exec('DELETE FROM class_progressions');

    // All fourteen content keys are still present, so a guard that only looked
    // at definitions would call this database healthy and leave every level
    // lookup on it broken forever.
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM class_definitions'),
    ).toBe(SRD_CLASSES.length);
    expect(hasBundledClassContent(lifecycle.database)).toBe(false);

    lifecycle.reopen();

    expect(
      lifecycle.database.scalar('SELECT count(*) FROM class_progressions'),
    ).toBe(SRD_CLASSES.length * 20);
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM subclass_progressions'),
    ).toBe(SRD_SUBCLASSES.length * 20);
    expect(classNames(lifecycle)).toEqual([...SRD_CLASSES]);
    expect(
      lifecycle.database.allRaw('SELECT name FROM characters'),
    ).toEqual([{ name: 'Survivor' }]);
  });

  it('boot repair compares exact class-resource tuples and formulas, not counts alone', async () => {
    const { lifecycle } = await freshApplicationLifecycle();
    const db = lifecycle.database;
    const barbarianId = Number(
      db.scalar("SELECT id FROM class_definitions WHERE content_key = '2024:class:barbarian'"),
    );
    const bardId = Number(
      db.scalar("SELECT id FROM class_definitions WHERE content_key = '2024:class:bard'"),
    );
    const wizardId = Number(
      db.scalar("SELECT id FROM class_definitions WHERE content_key = '2024:class:wizard'"),
    );

    db.exec('DELETE FROM class_resources WHERE class_definition_id = ?', [barbarianId]);
    for (let level = 1; level <= 20; level += 1) {
      db.exec(
        `INSERT INTO class_resources (
           class_definition_id, class_level, resource_kind, maximum
         ) VALUES (?, ?, 'rage', 1)`,
        [bardId, level],
      );
    }
    db.exec(
      `UPDATE class_resource_formulas
          SET class_definition_id = ?
        WHERE class_definition_id = ? AND resource_kind = 'bardic_inspiration'`,
      [wizardId, bardId],
    );
    expect(db.scalar('SELECT count(*) FROM class_resources')).toBe(160);
    expect(db.scalar('SELECT count(*) FROM class_resource_formulas')).toBe(18);
    expect(hasBundledClassResourceContent(db)).toBe(false);

    lifecycle.reopen();

    expect(hasBundledClassResourceContent(lifecycle.database)).toBe(true);
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM class_resources AS resource
          JOIN class_definitions AS definition
            ON definition.id = resource.class_definition_id
         WHERE definition.content_key = '2024:class:barbarian'
           AND resource.resource_kind = 'rage'`,
      ),
    ).toBe(20);
    expect(
      lifecycle.database.scalar(
        `SELECT definition.content_key
           FROM class_resource_formulas AS formula
           JOIN class_definitions AS definition
             ON definition.id = formula.class_definition_id
          WHERE formula.resource_kind = 'bardic_inspiration'`,
      ),
    ).toBe('2024:class:bard');
  });

  it('yields a class name already claimed by user content instead of failing the boot', async () => {
    const { sqlite3, lifecycle } = await freshApplicationLifecycle();

    const homebrew = bareLifecycle(sqlite3);
    const homebrewWizardKey = assertedExternalContentKey(
      'class',
      '2024',
      'Wizard',
    );
    registerAssertedContentIdentity(homebrew.database, {
      kind: 'class',
      edition: '2024',
      name: 'Wizard',
      payload: {},
      assertedKey: homebrewWizardKey,
    });
    homebrew.database.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES (?, 'Wizard', '2024')`,
      [homebrewWizardKey],
    );
    const homebrewBytes = await homebrew.exportBytes();
    homebrew.close();

    // `class_definitions` is unique on (name, rules_edition) as well as on
    // content_key, so the bundled Wizard cannot be inserted here. Boot must
    // still succeed, and the user's row must survive untouched.
    await lifecycle.replace(homebrewBytes);

    expect(
      lifecycle.database.allRaw(
        'SELECT content_key, name FROM class_definitions ORDER BY name',
      ),
    ).toContainEqual({ content_key: homebrewWizardKey, name: 'Wizard' });
    expect(classNames(lifecycle)).toEqual([...SRD_CLASSES]);
    expect(
      lifecycle.database.scalar(
        "SELECT count(*) FROM class_definitions WHERE content_key = '2024:class:wizard'",
      ),
    ).toBe(0);
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM class_progressions'),
    ).toBe((SRD_CLASSES.length - 1) * 20);

    // The third casters hang off Fighter and Rogue, which seeded normally, and
    // they are resolved by content key rather than by name.
    expect(
      lifecycle.database
        .all(
          'SELECT name FROM subclass_definitions ORDER BY name',
          undefined,
          (row) => sqlString(row, 'name'),
        ),
    ).toEqual([...SRD_SUBCLASSES]);

    // The bundle stays incomplete, so the guard keeps re-running the seed. It
    // must remain non-destructive on every one of those reruns.
    lifecycle.reopen();
    expect(
      lifecycle.database.scalar(
        "SELECT count(*) FROM class_definitions WHERE name = 'Wizard'",
      ),
    ).toBe(1);
    expect(
      lifecycle.database.scalar('SELECT count(*) FROM class_definitions'),
    ).toBe(SRD_CLASSES.length);
  });

  it('boots and stays resettable when the seed throws outright', async () => {
    const sqlite3 = await getSqlite3();
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const failure = new Error('bundled content is unusable');
    try {
      const lifecycle = track(
        new DatabaseLifecycle(
          sqlite3,
          new MemoryDatabaseStorage(sqlite3),
          schema,
          () => {
            throw failure;
          },
        ),
      );

      // A throwing seed must not reject open(): the worker resolves its
      // initialize() promise once, so a rejection there would fail every later
      // RPC including system.reset, leaving no in-app way out.
      expect(() => lifecycle.open()).not.toThrow();
      expect(reported).toHaveBeenCalledWith(
        'Bundled content could not be seeded.',
        failure,
      );
      lifecycle.database.exec("INSERT INTO characters (name) VALUES ('Alive')");
      await lifecycle.reset();
      expect(lifecycle.database.scalar('SELECT count(*) FROM characters')).toBe(
        0,
      );
    } finally {
      reported.mockRestore();
    }
  });

  it('does not disturb the schema signature that image validation compares', async () => {
    const { lifecycle } = await freshApplicationLifecycle();

    // validateBytes compares against the signature of a bare `schema.sql`
    // database. Seeded rows must therefore leave the signature identical, or
    // every export of a real database would be rejected as foreign.
    const seededBytes = await lifecycle.exportBytes();
    expect(() => {
      lifecycle.validateBytes(seededBytes);
    }).not.toThrow();
  });

  it('validates, audits, and reopens a Monk formula image after equipping a shield', async () => {
    const sqlite3 = await getSqlite3();
    const fixture = bareLifecycle(sqlite3);
    ensureBundledStableContentIdentity(fixture.database, {
      kind: 'class',
      contentKey: '2024:class:monk',
      normalizedName: 'monk',
    });
    const monkId = fixture.database.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition
       ) VALUES ('2024:class:monk', 'Monk', '2024')`,
    ).lastInsertId;
    const characterId = fixture.database.exec(
      `INSERT INTO characters (name, dexterity, wisdom)
       VALUES ('Monk shield lifecycle', 16, 16)`,
    ).lastInsertId;
    new AddSourceCommand(
      fixture.database,
      {
        type: 'add_source',
        source_type: 'class',
        source_definition_id: monkId,
        config: { level: 1 },
      },
      new CharacterCommandIntegrity('monk-shield-source'),
    ).apply(characterId);
    const sourceId = Number(
      fixture.database.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'class'`,
        [characterId],
      ),
    );
    fixture.database.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, base, ability_1, ability_2,
         allows_shield, source_instance_id, label
       ) VALUES (
         ?, 1, 'armor_class_formula', 10, 'dexterity', 'wisdom', 0, ?,
         'Monk Unarmored Defense'
       )`,
      [characterId, sourceId],
    );
    const fixtureBytes = await fixture.exportBytes();

    const lifecycle = track(
      createApplicationLifecycle(
        sqlite3,
        new MemoryDatabaseStorage(sqlite3),
      ),
    );
    lifecycle.open();
    await lifecycle.replace(fixtureBytes);
    const result = await new CharacterCommandExecutor(
      lifecycle.database,
      new CharacterCommandIntegrity('monk-shield-lifecycle'),
    ).execute({
      character_id: characterId,
      operation_uuid: '71717171-7171-4171-8171-717171717171',
      expected_revision: 0,
      command: {
        type: 'set_armor',
        slot: 'shield',
        armor: {
          name: 'Shell Shield',
          category: 'shield',
          armor_class: 2,
          dex_bonus: 'none',
          dex_bonus_max: null,
          strength_requirement: null,
          stealth_disadvantage: false,
          notes: null,
        },
      },
    });
    expect(result.preview_warnings).toEqual([
      {
        code: 'armor_class_reduced',
        message: 'Equipping Shell Shield reduces Armor Class from 16 to 15.',
        item_name: 'Shell Shield',
        previous_armor_class: 16,
        new_armor_class: 15,
      },
    ]);

    const bytes = await lifecycle.exportBytes();
    expect(() => lifecycle.validateBytes(bytes)).not.toThrow();
    const candidate = openDatabaseImage(sqlite3, bytes);
    try {
      expect(() => auditCandidateDatabase(candidate)).not.toThrow();
    } finally {
      candidate.close();
    }
    expect(() => lifecycle.reopen()).not.toThrow();
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM character_armor
         WHERE character_id = ? AND slot = 'shield'`,
        [characterId],
      ),
    ).toBe(1);
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM character_effects
         WHERE character_id = ? AND source_instance_id = ?
           AND effect_kind = 'armor_class_formula'`,
        [characterId, sourceId],
      ),
    ).toBe(1);
  });
});

describe('bundled class content detection', () => {
  it('reports missing content when only part of the catalog is present', async () => {
    const { lifecycle } = await freshApplicationLifecycle();
    const db = lifecycle.database;
    const keys = bundledClassContentKeys();

    expect(keys.classes).toHaveLength(SRD_CLASSES.length);
    expect(keys.subclasses).toHaveLength(SRD_SUBCLASSES.length);
    expect(hasBundledClassContent(db)).toBe(true);

    // One missing progression row is enough. The guard is what decides whether
    // the seed runs, so anything it cannot see is something the app can never
    // repair.
    db.exec(
      `DELETE FROM class_progressions
       WHERE id = (SELECT min(id) FROM class_progressions)`,
    );
    expect(hasBundledClassContent(db)).toBe(false);
    seedClassProgressions(db);
    expect(hasBundledClassContent(db)).toBe(true);

    db.exec(
      `DELETE FROM subclass_progressions
       WHERE id = (SELECT min(id) FROM subclass_progressions)`,
    );
    expect(hasBundledClassContent(db)).toBe(false);
    seedClassProgressions(db);
    expect(hasBundledClassContent(db)).toBe(true);

    db.exec('DELETE FROM subclass_definitions WHERE content_key = ?', [
      keys.subclasses[0]!,
    ]);
    expect(hasBundledClassContent(db)).toBe(false);

    db.exec('DELETE FROM class_definitions');
    expect(hasBundledClassContent(db)).toBe(false);
  });

  it('ignores rows that belong to content outside the bundle', async () => {
    const { lifecycle } = await freshApplicationLifecycle();
    const db = lifecycle.database;

    // A homebrew class with its own progressions must not be able to make up
    // the numbers for a bundled class that lost rows.
    const homebrewArtificerKey = assertedExternalContentKey(
      'class',
      '2024',
      'Artificer',
    );
    registerAssertedContentIdentity(db, {
      kind: 'class',
      edition: '2024',
      name: 'Artificer',
      payload: {},
      assertedKey: homebrewArtificerKey,
    });
    const homebrewId = db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES (?, 'Artificer', '2024')`,
      [homebrewArtificerKey],
    ).lastInsertId;
    for (let level = 1; level <= 20; level++) {
      db.exec(
        `INSERT INTO class_progressions (class_definition_id, class_level)
         VALUES (?, ?)`,
        [homebrewId, level],
      );
    }
    expect(hasBundledClassContent(db)).toBe(true);

    db.exec(
      `DELETE FROM class_progressions
       WHERE class_definition_id = (
         SELECT id FROM class_definitions WHERE content_key = ?
       )`,
      [bundledClassContentKeys().classes[0]!],
    );
    expect(hasBundledClassContent(db)).toBe(false);
  });
});
