import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerBundledStableContentIdentity } from '../../../src/catalog/content-registry';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { CharacterListBuilder } from '../../../src/queries/character-list-builder';
import { CharacterCrud } from '../../../src/queries/character-crud';
import { CatalogQueries } from '../../../src/queries/catalog-queries';
import {
  CharacterWorkspaceBuilder,
} from '../../../src/queries/character-workspace-builder';
import { getSqlite3, MemoryDatabaseStorage, openTestDatabase } from '../../helpers/open-db';
import { featProjectorV1Vector } from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import {
  createBuildReportFixture,
  persistedReportTableHashes,
  type BuildReportFixture,
} from '../reports/build-report-fixture';

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
        classes: ['Paladin 1', 'Ranger 1', 'Warlock 5', 'Wizard 1'],
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

  it('builds the workspace while excluding external aggregates from every planner selection catalog before CI-4a/HA-10', () => {
    const wizardId = Number(
      db.scalar(
        "SELECT id FROM class_definitions WHERE name = 'Wizard'",
      ),
    );
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
    registerBundledStableContentIdentity(db, {
      kind: 'species',
      contentKey: 'q60:species:origin' as ContentKey,
      normalizedName: 'originspecies',
    });
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         'q60:species:origin', 'Origin Species', '2024', 0,
         '[{"kind":"grant_source","source_type":"feat"}]'
      )`,
    );
    db.exec(
      `INSERT INTO catalog_content_identities
         (content_key, content_kind, key_kind, catalog_layer, normalized_name)
       VALUES ('external:class:workspace', 'class', 'legacy-opaque', 'external', 'externalclass'),
              ('external:feat:workspace', 'feat', 'legacy-opaque', 'external', 'externalfeat'),
              ('external:species:workspace', 'species', 'legacy-opaque', 'external', 'externalspecies'),
              ('external:background:workspace', 'background', 'legacy-opaque', 'external', 'externalbackground')`,
    );
    db.exec("INSERT INTO class_definitions (content_key, name, rules_edition, progression_type, supports_ritual_casting) VALUES ('external:class:workspace', 'External Class', 'expanded', 'none', 0)");
    db.exec("INSERT INTO feat_definitions (content_key, name, rules_edition, ability_points, repeatable) VALUES ('external:feat:workspace', 'External Feat', 'expanded', 0, 0)");
    db.exec("INSERT INTO species_definitions (content_key, name, rules_edition, repeatable, grant_rules) VALUES ('external:species:workspace', 'External Species', 'expanded', 0, '[]')");
    db.exec("INSERT INTO background_definitions (content_key, name, rules_edition, repeatable, grant_rules) VALUES ('external:background:workspace', 'External Background', 'expanded', 0, '[]')");
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
      subclass_name: 'Abjurer',
      subclasses: [{ id: subclassId, name: 'Abjurer' }],
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
        (source) => source.content_key === 'q60:species:origin',
      ),
    ).toBeUndefined();
    expect(workspace.source_catalog.feat.map((source) => source.name)).not.toContain('External Feat');
    expect(workspace.source_catalog.species.map((source) => source.name)).not.toContain('External Species');
    expect(workspace.source_catalog.background.map((source) => source.name)).not.toContain('External Background');
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

  it('shows boot-seeded manifest members and hides an imported aggregate without identity promotion', async () => {
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

      expect(catalog.classes.map((entry) => entry.name)).toContain('Fighter');
      expect(catalog.sources.species.length).toBeGreaterThan(0);
      expect(catalog.sources.background.length).toBeGreaterThan(0);
      expect(catalog.sources.feat.length).toBeGreaterThan(0);
      expect(catalog.sources.feat.map((entry) => entry.name)).not.toContain(
        'External Selection Probe',
      );
      expect(workspace.available_classes.map((entry) => entry.name)).toContain(
        'Fighter',
      );
      expect(workspace.source_catalog.species.length).toBeGreaterThan(0);
      expect(workspace.source_catalog.background.length).toBeGreaterThan(0);
      expect(workspace.source_catalog.feat.length).toBeGreaterThan(0);
      expect(workspace.source_catalog.feat.map((entry) => entry.name)).not.toContain(
        'External Selection Probe',
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
