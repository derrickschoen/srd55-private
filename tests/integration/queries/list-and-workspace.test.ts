import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { CharacterListBuilder } from '../../../src/queries/character-list-builder';
import {
  CharacterWorkspaceBuilder,
} from '../../../src/queries/character-workspace-builder';
import { openTestDatabase } from '../../helpers/open-db';
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

  it('builds the complete editing workspace in oracle order without changing persisted rows', () => {
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
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         'q60:species:origin', 'Origin Species', '2024', 0,
         '[{"kind":"grant_source","source_type":"feat"}]'
       )`,
    );
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
    ).toMatchObject({
      repeatable: false,
      configuration_kind: 'origin_feat_magic_initiate',
    });
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
});
