import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerBundledStableContentIdentity } from '../../../src/catalog/content-registry';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { bundledSourceContentKeys } from '../../../src/catalog/bundled-source-membership';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { CharacterListBuilder } from '../../../src/queries/character-list-builder';
import { CharacterCrud } from '../../../src/queries/character-crud';
import { CatalogQueries } from '../../../src/queries/catalog-queries';
import {
  CharacterWorkspaceBuilder,
} from '../../../src/queries/character-workspace-builder';
import { getSqlite3, MemoryDatabaseStorage, openTestDatabase } from '../../helpers/open-db';
import { workspaceFixtureImage } from '../../browser/fixtures/php-parity';
import { featProjectorV1Vector } from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import {
  createBuildReportFixture,
  persistedReportTableHashes,
  type BuildReportFixture,
} from '../reports/build-report-fixture';

async function openBrowserFixtureLifecycle() {
  const fixtureImage = await workspaceFixtureImage();
  const sqlite3 = await getSqlite3();
  const storage = new MemoryDatabaseStorage(sqlite3);
  await storage.replaceFile(Uint8Array.from(fixtureImage.bytes));
  const lifecycle = createApplicationLifecycle(sqlite3, storage);
  lifecycle.open();
  return { lifecycle, characterId: fixtureImage.ids.character };
}

describe('character list and workspace query builders', () => {
  let connection: Database;
  let db: DatabaseContext;
  let fixture: BuildReportFixture;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    fixture = createBuildReportFixture(db);
  });

  afterEach(() => connection.close());

  it('builds deterministic list cards from persisted classes and warning state without writes', () => {
    const before = persistedReportTableHashes(db, fixture.characterId);
    const cards = new CharacterListBuilder(db).build();

    expect(cards).toEqual([
      {
        id: fixture.characterId,
        name: 'R40 Golden',
        level: 8,
        classes: [
          { name: 'Paladin', level: 1, catalog_layer: 'bundled' },
          { name: 'Ranger', level: 1, catalog_layer: 'bundled' },
          { name: 'Warlock', level: 5, catalog_layer: 'bundled' },
          { name: 'Wizard', level: 1, catalog_layer: 'bundled' },
        ],
        warning_count: 5,
      },
    ]);
    expect(
      db.allRaw(
        `SELECT character_id, state, selection_eligibility,
                selection_invalid_reason, orphan_reason_code, override_note
         FROM spell_selection_slots
         WHERE id IN (?, ?, ?)
         ORDER BY sort_order`,
        fixture.invalidSlotIds,
      ),
    ).toEqual([
      {
        character_id: fixture.characterId,
        state: 'orphaned',
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
        orphan_reason_code: 'grant_rule_removed',
        override_note: null,
      },
      {
        character_id: fixture.characterId,
        state: 'active',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selected spell is outside the slot level range.',
        orphan_reason_code: null,
        override_note: null,
      },
      {
        character_id: fixture.characterId,
        state: 'kept_override',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selected spell is outside the slot level range.',
        orphan_reason_code: null,
        override_note: 'Explicit table ruling.',
      },
    ]);
    expect(persistedReportTableHashes(db, fixture.characterId)).toEqual(
      before,
    );
  });

  it('projects the four persisted flavor fields as one workspace value', () => {
    db.exec(
      `UPDATE characters
       SET alignment = ?, appearance = ?, backstory = ?, notes = ?
       WHERE id = ?`,
      [
        'Neutral Good',
        '  Silver hair\nGreen cloak  ',
        'Raised beside the old observatory.',
        'Ask about the brass key.',
        fixture.characterId,
      ],
    );

    expect(
      new CharacterWorkspaceBuilder(db).build(fixture.characterId).flavor,
    ).toEqual({
      alignment: 'Neutral Good',
      appearance: '  Silver hair\nGreen cloak  ',
      backstory: 'Raised beside the old observatory.',
      notes: 'Ask about the brass key.',
    });
  });

  it('cuts planner catalogs over to external content while keeping the class picker bundled-only', () => {
    const wizardId = Number(
      db.scalar(
        "SELECT id FROM class_definitions WHERE name = 'Wizard'",
      ),
    );
    registerFixtureContentIdentity(db, {
      kind: 'subclass', contentKey: 'q60:subclass:abjurer', name: 'Abjurer',
      keyKind: 'bundled-stable',
    });
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition
       ) VALUES ('q60:subclass:abjurer', ?, 'Abjurer', '2024')`,
      [wizardId],
    ).lastInsertId;
    db.exec(
      `UPDATE character_class_levels
       SET subclass_definition_id = ?
       WHERE character_id = ? AND class_definition_id = ?`,
      [subclassId, fixture.characterId, wizardId],
    );
    registerBundledStableContentIdentity(db, {
      kind: 'feat',
      contentKey: '2024:feat:magic-initiate' as ContentKey,
      normalizedName: 'magicinitiate',
    });
    db.exec(
      `UPDATE feat_definitions
       SET content_key = '2024:feat:magic-initiate',
           grant_rules = '[]'
       WHERE id = (
         SELECT source_definition_id
         FROM character_source_instances
         WHERE id = ?
       )`,
      [fixture.featSourceId],
    );
    db.exec(
      `UPDATE character_source_instances
       SET config = '{"chosen_list":"Wizard","spellcasting_ability":"wisdom"}'
       WHERE id = ?`,
      [fixture.featSourceId],
    );
    registerFixtureContentIdentity(db, {
      kind: 'species', contentKey: 'q60:origin-species',
      name: 'Origin Species', keyKind: 'asserted',
    });
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         'q60:origin-species', 'Origin Species', '2024', 0,
         '[{"kind":"grant_source","source_type":"feat"}]'
      )`,
    );
    for (const identity of [
      { kind: 'class' as const, contentKey: 'expanded:external-class', name: 'External Class' },
      { kind: 'feat' as const, contentKey: 'expanded:external-feat', name: 'External Feat' },
      { kind: 'species' as const, contentKey: 'expanded:external-species', name: 'External Species' },
      { kind: 'background' as const, contentKey: 'expanded:external-background', name: 'External Background' },
    ]) {
      registerFixtureContentIdentity(db, { ...identity, keyKind: 'asserted' });
    }
    db.exec("INSERT INTO class_definitions (content_key, name, rules_edition, progression_type, supports_ritual_casting) VALUES ('expanded:external-class', 'External Class', 'expanded', 'none', 0)");
    db.exec("INSERT INTO feat_definitions (content_key, name, rules_edition, ability_points, repeatable) VALUES ('expanded:external-feat', 'External Feat', 'expanded', 0, 0)");
    db.exec("INSERT INTO species_definitions (content_key, name, rules_edition, repeatable, grant_rules) VALUES ('expanded:external-species', 'External Species', 'expanded', 0, '[]')");
    db.exec("INSERT INTO background_definitions (content_key, name, rules_edition, repeatable, grant_rules) VALUES ('expanded:external-background', 'External Background', 'expanded', 0, '[]')");
    registerFixtureContentIdentity(db, {
      kind: 'subclass', contentKey: 'expanded:external-tradition',
      name: 'External Tradition', keyKind: 'asserted',
    });
    const externalSubclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition
       ) VALUES ('expanded:external-tradition', ?, 'External Tradition', 'expanded')`,
      [wizardId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_save_points (
         character_id, label, snapshot, schema_version, created_at
       ) VALUES (?, 'Latest', '{}', 'a7-v1', '2026-07-23T12:00:00.000Z')`,
      [fixture.characterId],
    );
    const before = persistedReportTableHashes(db, fixture.characterId);

    const workspace = new CharacterWorkspaceBuilder(db).build(
      fixture.characterId,
    );

    expect(workspace.revision).toBe(0);
    expect(workspace.classes).toContainEqual({
      id: expect.any(Number),
      class_definition_id: wizardId,
      subclass_definition_id: subclassId,
      level: 1,
      name: 'Wizard',
      catalog_layer: 'bundled',
      subclass_name: 'Abjurer',
      subclass_catalog_layer: 'bundled',
      subclasses: [
        { id: subclassId, name: 'Abjurer', catalog_layer: 'bundled' },
        { id: externalSubclassId, name: 'External Tradition', catalog_layer: 'external' },
      ],
    });
    expect(workspace.available_classes.map((item) => item.name)).toEqual(
      [
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
      ],
    );
    expect(workspace.available_classes.map((item) => item.name)).not.toContain('External Class');
    expect(workspace.configurable_sources).toEqual([
      {
        id: fixture.featSourceId,
        display_name: 'Magic Initiate: Wizard',
        chosen_list: 'Wizard',
        spellcasting_ability: 'wisdom',
      },
    ]);
    expect(
      workspace.source_catalog.species.find(
        (source) => source.content_key === 'q60:origin-species',
      ),
    ).toMatchObject({ name: 'Origin Species', catalog_layer: 'external' });
    expect(workspace.source_catalog.feat).toContainEqual(
      expect.objectContaining({ name: 'External Feat', catalog_layer: 'external' }),
    );
    expect(workspace.source_catalog.species).toContainEqual(
      expect.objectContaining({ name: 'External Species', catalog_layer: 'external' }),
    );
    expect(workspace.source_catalog.background).toContainEqual(
      expect.objectContaining({ name: 'External Background', catalog_layer: 'external' }),
    );
    expect(workspace.report.invalid_selections.map((slot) => slot.id)).toEqual(
      fixture.invalidSlotIds,
    );
    expect(workspace.report.summary).toEqual({
      unique_spells: 6,
      access_routes: 8,
      warning_count: 5,
    });
    expect(workspace.save_points).toEqual([
      {
        id: expect.any(Number),
        label: 'Latest',
        created_at: '2026-07-23T12:00:00.000Z',
      },
    ]);
    expect(
      db.oneRaw(
        `SELECT subclass_definition_id
         FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [fixture.characterId, wizardId],
      ),
    ).toEqual({ subclass_definition_id: subclassId });
    expect(persistedReportTableHashes(db, fixture.characterId)).toEqual(
      before,
    );
  });

  it('shows boot-seeded manifest members and discloses an imported aggregate from the external layer', async () => {
    const sqlite3 = await getSqlite3();
    const lifecycle = createApplicationLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
    );
    lifecycle.open();
    try {
      const bootDb = lifecycle.database;
      const externalFeat = {
        ...featProjectorV1Vector.aggregate,
        name: 'External Selection Probe',
      };
      const imported = new CatalogImporter(bootDb).import({
        documents: [JSON.stringify([{ kind: 'feat', aggregate: externalFeat }])],
      });
      expect(imported.feats_created).toBe(1);
      expect(
        bootDb.scalar<string>(
          `SELECT catalog_layer
           FROM catalog_content_identities
           WHERE content_kind = 'feat' AND normalized_name = 'externalselectionprobe'`,
        ),
      ).toBe('external');

      const character = new CharacterCrud(bootDb).create({
        name: 'Boot Selection Probe',
      });
      const catalog = new CatalogQueries(bootDb).read();
      const workspace = new CharacterWorkspaceBuilder(bootDb).build(character.id);

      expect({
        classes: catalog.classes.length,
        feats: catalog.sources.feat.length,
        species: catalog.sources.species.length,
        backgrounds: catalog.sources.background.length,
      }).toEqual({ classes: 12, feats: 18, species: 4, backgrounds: 4 });
      expect({
        classes: workspace.available_classes.length,
        feats: workspace.source_catalog.feat.length,
        species: workspace.source_catalog.species.length,
        backgrounds: workspace.source_catalog.background.length,
      }).toEqual({ classes: 12, feats: 18, species: 4, backgrounds: 4 });
      expect(catalog.classes.map((entry) => entry.name)).toContain('Fighter');
      expect(catalog.sources.species.map((entry) => entry.name)).toEqual([
        'Elf',
        'Gnome',
        'Human',
        'Tiefling',
      ]);
      expect(catalog.sources.background.map((entry) => entry.name)).toEqual([
        'Acolyte',
        'Criminal',
        'Sage',
        'Soldier',
      ]);
      expect(catalog.sources.feat).toContainEqual(expect.objectContaining({
        name: 'External Selection Probe',
        catalog_layer: 'external',
      }));
      expect(workspace.available_classes.map((entry) => entry.name)).toContain(
        'Fighter',
      );
      expect(workspace.source_catalog.feat).toContainEqual(expect.objectContaining({
        name: 'External Selection Probe',
        catalog_layer: 'external',
      }));
    } finally {
      lifecycle.close();
    }
  });

  it('constructs fresh-boot manifests from every seeded aggregate definition root', async () => {
    const sqlite3 = await getSqlite3();
    const lifecycle = createApplicationLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
    );
    lifecycle.open();
    try {
      const bootDb = lifecycle.database;
      const storedKeys = (table: string) => bootDb.allRaw(
        `SELECT content_key FROM ${table} ORDER BY content_key`,
      ).map((row) => String(row.content_key));
      const storedUnionKeys = (...tables: readonly string[]) => [
        ...new Set(tables.flatMap(storedKeys)),
      ].sort();

      expect(bundledSourceContentKeys('class', bootDb)).toEqual(
        storedKeys('class_definitions'),
      );
      expect(bundledSourceContentKeys('feat', bootDb)).toEqual(
        storedKeys('feat_definitions'),
      );
      expect(bundledSourceContentKeys('species', bootDb)).toEqual(
        storedUnionKeys('species_definitions', 'species_templates'),
      );
      expect(bundledSourceContentKeys('background', bootDb)).toEqual(
        storedUnionKeys('background_definitions', 'background_templates'),
      );
    } finally {
      lifecycle.close();
    }
  });

  it('shows every bundled aggregate after the browser replacement-image boot', async () => {
    const { lifecycle, characterId } = await openBrowserFixtureLifecycle();
    try {
      const catalog = new CatalogQueries(lifecycle.database).read();
      const workspace = new CharacterWorkspaceBuilder(lifecycle.database).build(
        characterId,
      );

      expect({
        classes: catalog.classes.length,
        feats: catalog.sources.feat.length,
        species: catalog.sources.species.length,
        backgrounds: catalog.sources.background.length,
      }).toEqual({ classes: 12, feats: 17, species: 5, backgrounds: 5 });
      expect({
        classes: workspace.available_classes.length,
        feats: workspace.source_catalog.feat.length,
        species: workspace.source_catalog.species.length,
        backgrounds: workspace.source_catalog.background.length,
      }).toEqual({ classes: 12, feats: 17, species: 5, backgrounds: 5 });
      expect(lifecycle.database.allRaw(
        `SELECT identities.content_kind, identities.content_key
         FROM catalog_content_identities AS identities
         LEFT JOIN catalog_content_fingerprints AS fingerprints
           ON fingerprints.content_kind = identities.content_kind
          AND fingerprints.content_key = identities.content_key
          AND fingerprints.fingerprint_scheme = 'content-v1'
          AND fingerprints.fingerprint_role = 'current'
         WHERE identities.key_kind = 'bundled-stable'
           AND identities.catalog_layer = 'bundled'
           AND fingerprints.content_key IS NULL
         ORDER BY identities.content_kind, identities.content_key`,
      )).toEqual([]);
    } finally {
      lifecycle.close();
    }
  });

  it('keeps the configured species seeded by the browser image selectable', async () => {
    const { lifecycle, characterId } = await openBrowserFixtureLifecycle();
    try {
      const workspace = new CharacterWorkspaceBuilder(lifecycle.database).build(
        characterId,
      );

      expect(workspace.source_catalog.species).toContainEqual(
        expect.objectContaining({
          content_key: '2024:species:parity-human',
          name: 'Parity Human',
          configuration_kind: 'origin_feat_magic_initiate',
        }),
      );
    } finally {
      lifecycle.close();
    }
  });

  it('keeps the configured background seeded by the browser image selectable', async () => {
    const { lifecycle, characterId } = await openBrowserFixtureLifecycle();
    try {
      const workspace = new CharacterWorkspaceBuilder(lifecycle.database).build(
        characterId,
      );

      expect(workspace.source_catalog.background).toContainEqual(
        expect.objectContaining({
          content_key: '2024:background:custom',
          name: 'Custom Background',
          configuration_kind: 'origin_feat_magic_initiate',
        }),
      );
    } finally {
      lifecycle.close();
    }
  });

  it('B2-DC resolves contributions again at the independent workspace slot-math site', () => {
    db.exec(
      'UPDATE characters SET wisdom = 15 WHERE id = ?',
      [fixture.characterId],
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (
         ?, 1, 'ability_increase', 'wisdom', 2, 20, ?, 'Wise training'
       )`,
      [fixture.characterId, fixture.featSourceId],
    );
    db.exec(
      `INSERT INTO spell_version_save_abilities (
         spell_version_id, save_ability
       ) VALUES (?, 'dexterity')`,
      [fixture.spellIds.invalidSpell],
    );

    const workspace = new CharacterWorkspaceBuilder(db).build(
      fixture.characterId,
    );
    const slot = workspace.slots.find(
      (candidate) => candidate.id === fixture.invalidSlotIds[1],
    );

    // Wisdom 15 (+2) becomes 17 (+3), and total level 8 supplies proficiency
    // +3. The workspace's own mechanic lookup must therefore yield +6/DC 14.
    expect(slot?.ability).toBe('wisdom');
    expect(slot?.attack_bonus).toBe(6);
    expect(slot?.save_dc).toBe(14);
  });
});
