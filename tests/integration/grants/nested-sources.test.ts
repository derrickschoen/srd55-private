import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sqlInteger, sqlString } from '../../../src/db/codecs';
import { DatabaseContext } from '../../../src/db/database';
import { slotIdentity } from '../../helpers/row-codecs';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

describe('nested granted sources', () => {
  let connection: Database;
  let db: DatabaseContext;
  let generator: GrantRuleSlotGenerator;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    generator = new GrantRuleSlotGenerator(db);
  });

  afterEach(() => {
    connection.close();
  });

  function character(): number {
    return db.exec("INSERT INTO characters (name) VALUES ('Nested Character')")
      .lastInsertId;
  }

  function definition(
    table: 'feat_definitions' | 'species_definitions',
    key: string,
    name: string,
    rules: readonly Record<string, unknown>[],
    repeatable = false,
  ): number {
    registerFixtureContentIdentity(db, {
      kind: table === 'feat_definitions' ? 'feat' : 'species',
      contentKey: key,
      name,
      keyKind: 'bundled-stable',
    });
    return db.exec(
      `INSERT INTO ${table} (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, ?, '2024', ?, ?)`,
      [key, name, repeatable ? 1 : 0, JSON.stringify(rules)],
    ).lastInsertId;
  }

  function source(
    characterId: number,
    sourceType: 'feat' | 'species',
    definitionId: number,
    config: Record<string, unknown>,
  ): number {
    return db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level
       ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        characterId,
        crypto.randomUUID(),
        sourceType,
        definitionId,
        sourceType,
        JSON.stringify(config),
      ],
    ).lastInsertId;
  }

  it('persists a species-to-configured-feat-to-slots chain', () => {
    const featId = definition(
      'feat_definitions',
      '2024:feat:magic-initiate',
      'Magic Initiate',
      [
        {
          kind: 'choice_from_list',
          rule_key: 'initiate-cantrips',
          count: 2,
          bucket: 'cantrip_known',
          list: '$config.chosen_list',
          level_min: 0,
          level_max: 0,
        },
      ],
      true,
    );
    const speciesId = definition(
      'species_definitions',
      '2024:species:human',
      'Human',
      [
        {
          kind: 'grant_source',
          rule_key: 'human-origin-feat',
          source_type: 'feat',
          definition_key_config: 'origin_feat_key',
          child_config_config: 'origin_feat_config',
        },
      ],
    );
    const rootId = source(character(), 'species', speciesId, {
      origin_feat_key: '2024:feat:magic-initiate',
      origin_feat_config: { chosen_list: 'Wizard' },
    });

    generator.generateForSource(rootId);

    const child = db.oneRaw(
      `SELECT id, character_id, parent_source_instance_id, source_type,
              source_definition_id, display_name, config,
              acquired_at_character_level, state, notes
       FROM character_source_instances
       WHERE parent_source_instance_id = ?`,
      [rootId],
    );
    expect(child).toEqual({
      id: expect.any(Number),
      character_id: expect.any(Number),
      parent_source_instance_id: rootId,
      source_type: 'feat',
      source_definition_id: featId,
      display_name: 'Magic Initiate: Wizard',
      config: '{"chosen_list":"Wizard"}',
      acquired_at_character_level: 1,
      state: 'active',
      notes: 'grant_rule:human-origin-feat:1',
    });
    expect(
      db.allRaw(
        `SELECT source_instance_id, ordinal, allowed_spell_lists, state
         FROM spell_selection_slots ORDER BY ordinal`,
      ),
    ).toEqual([
      {
        source_instance_id: child!.id,
        ordinal: 1,
        allowed_spell_lists: '["Wizard"]',
        state: 'active',
      },
      {
        source_instance_id: child!.id,
        ordinal: 2,
        allowed_spell_lists: '["Wizard"]',
        state: 'active',
      },
    ]);
  });

  it('tombstones removed descendants and revives the same source and selected slot with capability rules', () => {
    const characterId = character();
    registerFixtureContentIdentity(db, {
      kind: 'spell', contentKey: '2024:nested-ritual', name: 'Nested Ritual',
      keyKind: 'bundled-stable',
    });
    const identityId = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES ('nested-ritual', 'Nested Ritual', 'nested ritual')`,
    ).lastInsertId;
    const ritualId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, is_active
       ) VALUES ('2024:nested-ritual', ?, 'Nested Ritual', '2024',
                 1, 'Divination', 1)`,
      [identityId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO spell_list_memberships
         (spell_version_id, spell_list_key)
       VALUES (?, 'Wizard')`,
      [ritualId],
    );
    const featId = definition(
      'feat_definitions',
      '2024:feat:restorable',
      'Restorable Feat',
      [
        {
          kind: 'choice_from_list',
          rule_key: 'restorable-choice',
          count: 1,
          bucket: 'known',
          list: 'Wizard',
          level_min: 1,
          level_max: 1,
        },
        {
          kind: 'capability',
          rule_key: 'restorable-capability',
          capability_key: 'wizard-ritual-adept',
          collection: 'wizard_spellbook',
          tags: ['ritual'],
          access_mode: 'ritual_only',
        },
      ],
    );
    const parentRule = [
      {
        kind: 'grant_source',
        rule_key: 'restorable-child',
        source_type: 'feat',
        source_definition_id: featId,
      },
    ];
    const speciesId = definition(
      'species_definitions',
      '2024:species:restorable',
      'Restorable Species',
      parentRule,
    );
    const parentId = source(characterId, 'species', speciesId, {
      history: 'parent-config',
    });
    generator.generateForSource(parentId);
    const child = db.one(
      `SELECT id, instance_uuid FROM character_source_instances
       WHERE parent_source_instance_id = ?`,
      [parentId],
      (row) => ({
        id: sqlInteger(row, 'id'),
        instance_uuid: sqlString(row, 'instance_uuid'),
      }),
    )!;
    const slot = db.one(
      `SELECT id, slot_key FROM spell_selection_slots
       WHERE source_instance_id = ?`,
      [child.id],
      slotIdentity,
    )!;
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?, selection_eligibility = 'valid'
       WHERE id = ?`,
      [ritualId, slot.id],
    );
    expect(
      generator.activeRulesForSource(child.id).map((rule) => rule.kind),
    ).toContain('capability');

    db.exec(
      `UPDATE species_definitions SET grant_rules = '[]' WHERE id = ?`,
      [speciesId],
    );
    generator.generateForSource(parentId);

    expect(
      db.oneRaw(
        `SELECT id, instance_uuid, state
         FROM character_source_instances WHERE id = ?`,
        [child.id],
      ),
    ).toEqual({
      id: child.id,
      instance_uuid: child.instance_uuid,
      state: 'tombstoned',
    });
    expect(
      db.oneRaw(
        `SELECT id, slot_key, current_spell_version_id, state,
                orphan_reason_code, prior_config, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slot.id],
      ),
    ).toEqual({
      id: slot.id,
      slot_key: slot.slot_key,
      current_spell_version_id: ritualId,
      state: 'orphaned',
      orphan_reason_code: 'parent_rule_removed',
      prior_config: '{}',
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selection preserved because its source is no longer active.',
    });
    expect(generator.activeRulesForSource(child.id)).toEqual([]);

    db.exec(
      `UPDATE species_definitions SET grant_rules = ? WHERE id = ?`,
      [JSON.stringify(parentRule), speciesId],
    );
    generator.generateForSource(parentId);
    expect(
      db.oneRaw(
        `SELECT source.id AS source_id, source.instance_uuid, source.state AS source_state,
                slot.id AS slot_id, slot.slot_key, slot.current_spell_version_id,
                slot.state AS slot_state, slot.orphan_reason_code,
                slot.selection_eligibility, slot.selection_invalid_reason
         FROM character_source_instances AS source
         INNER JOIN spell_selection_slots AS slot
           ON slot.source_instance_id = source.id
         WHERE source.id = ?`,
        [child.id],
      ),
    ).toEqual({
      source_id: child.id,
      instance_uuid: child.instance_uuid,
      source_state: 'active',
      slot_id: slot.id,
      slot_key: slot.slot_key,
      current_spell_version_id: ritualId,
      slot_state: 'active',
      orphan_reason_code: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });
    expect(
      generator.activeRulesForSource(child.id).map((rule) => rule.kind),
    ).toContain('capability');
  });

  it('enforces distinct repeatable source config without persisting duplicate slots', () => {
    const definitionId = definition(
      'feat_definitions',
      '2024:feat:distinct',
      'Magic Initiate',
      [
        {
          kind: 'choice_from_list',
          rule_key: 'distinct-cantrips',
          count: 2,
          bucket: 'cantrip_known',
          list: '$config.chosen_list',
          level_min: 0,
          level_max: 0,
          distinct_config_by: 'chosen_list',
        },
      ],
      true,
    );
    const characterId = character();
    const wizardId = source(characterId, 'feat', definitionId, {
      chosen_list: 'Wizard',
    });
    generator.generateForSource(wizardId);
    const duplicateId = source(characterId, 'feat', definitionId, {
      chosen_list: 'Wizard',
    });

    expect(() => generator.generateForSource(duplicateId)).toThrow(
      "Magic Initiate already uses chosen_list 'Wizard' for this character.",
    );
    expect(
      db.allRaw(
        `SELECT source_instance_id, count(*) AS slots
         FROM spell_selection_slots
         GROUP BY source_instance_id`,
      ),
    ).toEqual([{ source_instance_id: wizardId, slots: 2 }]);

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [JSON.stringify({ chosen_list: 'Druid' }), duplicateId],
    );
    generator.generateForSource(duplicateId);
    expect(
      db.allRaw(
        `SELECT source_instance_id, allowed_spell_lists
         FROM spell_selection_slots
         WHERE source_instance_id = ?
         ORDER BY ordinal`,
        [duplicateId],
      ),
    ).toEqual([
      {
        source_instance_id: duplicateId,
        allowed_spell_lists: '["Druid"]',
      },
      {
        source_instance_id: duplicateId,
        allowed_spell_lists: '["Druid"]',
      },
    ]);
  });
});
