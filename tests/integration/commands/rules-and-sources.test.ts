import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterState } from '../../../src/character/character-state';
import { AddSourceCommand } from '../../../src/commands/add-source';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { RemoveSourceCommand } from '../../../src/commands/remove-source';
import { UpdateCharacterRulesCommand } from '../../../src/commands/update-character-rules';
import { UpdateSourceConfigCommand } from '../../../src/commands/update-source-config';
import { DatabaseContext } from '../../../src/db/database';
import type {
  AddSourceCommand as AddSourcePayload,
  UpdateSourceConfigCommand as UpdateSourceConfigPayload,
} from '../../../src/domain/command-contracts';
import { openTestDatabase } from '../../helpers/open-db';

type SourceType = 'class' | 'feat' | 'species' | 'background';
type DefinitionTable =
  | 'feat_definitions'
  | 'species_definitions'
  | 'background_definitions';

describe('character rule and source commands', () => {
  let connection: Database;
  let db: DatabaseContext;
  let state: CharacterState;
  let integrity: CharacterCommandIntegrity;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    state = new CharacterState(db);
    integrity = new CharacterCommandIntegrity('C42-integration-test-key');
  });

  afterEach(() => {
    connection.close();
  });

  function character(name = 'C42 Character'): number {
    return db.exec('INSERT INTO characters (name) VALUES (?)', [name])
      .lastInsertId;
  }

  function definition(
    table: DefinitionTable,
    contentKey: string,
    name: string,
    rules: readonly Record<string, unknown>[],
    repeatable = false,
  ): number {
    return db.exec(
      `INSERT INTO ${table} (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, ?, '2024', ?, ?)`,
      [
        contentKey,
        name,
        repeatable ? 1 : 0,
        JSON.stringify(rules),
      ],
    ).lastInsertId;
  }

  function classDefinition(
    name: string,
    ability: string,
    rules: readonly Record<string, unknown>[],
  ): number {
    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, spellcasting_ability,
         progression_type
       ) VALUES (?, ?, '2024', ?, 'full')`,
      [`2024:class:${name.toLowerCase()}`, name, ability],
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_progressions (
         class_definition_id, class_level, grant_rules
       ) VALUES (?, 1, ?)`,
      [classId, JSON.stringify(rules)],
    );
    return classId;
  }

  function spell(
    key: string,
    name: string,
    edition: '2014' | '2024',
    list?: string,
    level = 0,
  ): number {
    const identityId = db.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name
       ) VALUES (?, ?, ?)`,
      [`identity:${key}`, name, name.toLowerCase()],
    ).lastInsertId;
    const spellId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, is_active
       ) VALUES (?, ?, ?, ?, ?, 'Evocation', 1)`,
      [key, identityId, name, edition, level],
    ).lastInsertId;
    if (list !== undefined) {
      db.exec(
        `INSERT INTO spell_list_memberships (
           spell_version_id, spell_list_key
         ) VALUES (?, ?)`,
        [spellId, list],
      );
    }
    return spellId;
  }

  function rawSource(
    characterId: number,
    sourceType: SourceType,
    definitionId: number,
    config: Record<string, unknown>,
    displayName = sourceType,
    parentId: number | null = null,
  ): number {
    return db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, parent_source_instance_id,
         source_type, source_definition_id, display_name, config,
         acquired_at_character_level, state
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'active')`,
      [
        characterId,
        crypto.randomUUID(),
        parentId,
        sourceType,
        definitionId,
        displayName,
        JSON.stringify(config),
      ],
    ).lastInsertId;
  }

  function add(characterId: number, payload: AddSourcePayload): AddSourceCommand {
    const command = new AddSourceCommand(db, payload, integrity);
    command.apply(characterId);
    return command;
  }

  function updateConfig(
    characterId: number,
    payload: UpdateSourceConfigPayload,
  ): UpdateSourceConfigCommand {
    const command = new UpdateSourceConfigCommand(db, payload, integrity);
    command.apply(characterId);
    return command;
  }

  it('persists the legacy toggle, refreshes every selected slot, and applies its inverse', () => {
    const characterId = character();
    const featId = definition(
      'feat_definitions',
      'test:legacy-holder',
      'Legacy Holder',
      [],
    );
    const sourceId = rawSource(characterId, 'feat', featId, {});
    const legacySpellId = spell(
      '2014:legacy-test',
      'Legacy Test',
      '2014',
    );
    const slotId = db.exec(
      `INSERT INTO spell_selection_slots (
         character_id, source_instance_id, slot_key, rule_key, ordinal,
         bucket, eligibility_kind, current_spell_version_id,
         selection_eligibility, selection_invalid_reason
       ) VALUES (?, ?, 'legacy-slot', 'legacy-slot', 1, 'known',
                 'choice_from_query', ?, 'invalid',
                 'Enable legacy rules before selecting a 2014 spell version.')`,
      [characterId, sourceId, legacySpellId],
    ).lastInsertId;

    const enabled = new UpdateCharacterRulesCommand(db, {
      type: 'update_character_rules',
      allow_legacy: true,
    });
    enabled.apply(characterId);

    expect(
      db.one(
        `SELECT allow_legacy FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({ allow_legacy: 1 });
    expect(
      db.one(
        `SELECT current_spell_version_id, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      current_spell_version_id: legacySpellId,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });

    const disabled = new UpdateCharacterRulesCommand(db, enabled.inverse());
    disabled.apply(characterId);
    expect(
      db.one(
        `SELECT allow_legacy FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({ allow_legacy: 0 });
    expect(
      db.one(
        `SELECT selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Enable legacy rules before selecting a 2014 spell version.',
    });
  });

  it('updates nested Magic Initiate config and constraints, signs a snapshot inverse, and rolls back a broken parent', async () => {
    classDefinition('Cleric', 'wisdom', []);
    classDefinition('Wizard', 'intelligence', []);
    const magicInitiateId = definition(
      'feat_definitions',
      '2024:feat:magic-initiate',
      'Magic Initiate',
      [
        {
          kind: 'choice_from_list',
          rule_key: 'magic-initiate-cantrip',
          count: 1,
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
      '2024:species:configurable',
      'Configurable Species',
      [
        {
          kind: 'grant_source',
          rule_key: 'origin-feat',
          source_type: 'feat',
          source_definition_id: magicInitiateId,
          child_config_config: 'origin_feat_config',
        },
      ],
    );
    const characterId = character();
    add(characterId, {
      type: 'add_source',
      source_type: 'species',
      source_definition_id: speciesId,
      config: {
        origin_feat_config: {
          chosen_list: 'Wizard',
          spellcasting_ability: 'intelligence',
        },
      },
    });
    const root = db.one(
      `SELECT id FROM character_source_instances
       WHERE character_id = ? AND source_type = 'species'`,
      [characterId],
    )!;
    const child = db.one(
      `SELECT id FROM character_source_instances
       WHERE parent_source_instance_id = ?`,
      [Number(root.id)],
    )!;
    const before = state.capture(characterId);

    const changed = updateConfig(characterId, {
      type: 'update_source_config',
      source_instance_id: Number(child.id),
      chosen_list: 'Cleric',
    });

    expect(
      db.one(
        `SELECT display_name, config FROM character_source_instances
         WHERE id = ?`,
        [Number(child.id)],
      ),
    ).toEqual({
      display_name: 'Magic Initiate: Cleric',
      config: '{"chosen_list":"Cleric","spellcasting_ability":"wisdom"}',
    });
    expect(
      JSON.parse(
        String(
          db.scalar(
            'SELECT config FROM character_source_instances WHERE id = ?',
            [Number(root.id)],
          ),
        ),
      ),
    ).toEqual({
      origin_feat_config: {
        chosen_list: 'Cleric',
        spellcasting_ability: 'wisdom',
      },
    });
    expect(
      db.one(
        `SELECT source_instance_id, allowed_spell_lists, state
         FROM spell_selection_slots WHERE source_instance_id = ?`,
        [Number(child.id)],
      ),
    ).toEqual({
      source_instance_id: Number(child.id),
      allowed_spell_lists: '["Cleric"]',
      state: 'active',
    });

    const inverse = await changed.inverse();
    expect(await integrity.isValid(characterId, inverse)).toBe(true);
    state.restore(characterId, inverse.snapshot);
    expect(state.capture(characterId)).toEqual(before);

    db.exec(
      `UPDATE character_source_instances SET config = '{}'
       WHERE id = ?`,
      [Number(root.id)],
    );
    const persistedBeforeFailure = state.capture(characterId);
    expect(() =>
      updateConfig(characterId, {
        type: 'update_source_config',
        source_instance_id: Number(child.id),
        chosen_list: 'Cleric',
      }),
    ).toThrow(
      'Magic Initiate parent configuration is missing origin_feat_config.',
    );
    expect(state.capture(characterId)).toEqual(persistedBeforeFailure);
  });

  it('orphans and reactivates the identical selected Order slot as class config changes', () => {
    const clericId = classDefinition('Cleric', 'wisdom', [
      {
        kind: 'choice_from_list',
        rule_key: 'cleric-divine-order-cantrip',
        count: 1,
        bucket: 'cantrip_known',
        list: '$config.divine_order.chosen_list',
        level_min: 0,
        level_max: 0,
        active_if_config: {
          key: 'divine_order.chosen_option',
          equals: 'Thaumaturge',
        },
      },
    ]);
    const guidanceId = spell(
      '2024:guidance-c42',
      'Guidance C42',
      '2024',
      'Cleric',
    );
    const characterId = character();
    add(characterId, {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: clericId,
      config: { level: 1 },
    });
    const sourceId = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'class'`,
        [characterId],
      ),
    );

    updateConfig(characterId, {
      type: 'update_source_config',
      source_instance_id: sourceId,
      chosen_option: 'Thaumaturge',
    });
    const slot = db.one(
      `SELECT id, slot_key FROM spell_selection_slots
       WHERE source_instance_id = ?`,
      [sourceId],
    )!;
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?, selection_eligibility = 'valid'
       WHERE id = ?`,
      [guidanceId, Number(slot.id)],
    );

    updateConfig(characterId, {
      type: 'update_source_config',
      source_instance_id: sourceId,
      chosen_option: 'Protector',
    });
    expect(
      db.one(
        `SELECT id, slot_key, current_spell_version_id, state,
                orphan_reason_code, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [Number(slot.id)],
      ),
    ).toEqual({
      id: Number(slot.id),
      slot_key: slot.slot_key,
      current_spell_version_id: guidanceId,
      state: 'orphaned',
      orphan_reason_code: 'rule_no_longer_active',
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selection preserved because its grant rule is no longer active.',
    });
    expect(
      JSON.parse(
        String(
          db.scalar(
            'SELECT config FROM character_source_instances WHERE id = ?',
            [sourceId],
          ),
        ),
      ),
    ).toEqual({
      spellcasting_ability: 'wisdom',
      divine_order: { chosen_option: 'Protector' },
    });

    updateConfig(characterId, {
      type: 'update_source_config',
      source_instance_id: sourceId,
      chosen_option: 'Thaumaturge',
    });
    expect(
      db.one(
        `SELECT id, slot_key, current_spell_version_id, state,
                orphan_reason_code, orphaned_at, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [Number(slot.id)],
      ),
    ).toEqual({
      id: Number(slot.id),
      slot_key: slot.slot_key,
      current_spell_version_id: guidanceId,
      state: 'active',
      orphan_reason_code: null,
      orphaned_at: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });
  });

  it('adds a class with generated slots and spellbook entries, and atomically rolls back generator failure', async () => {
    const shieldId = spell(
      '2024:shield-c42',
      'Shield C42',
      '2024',
      'Wizard',
      1,
    );
    const wizardId = classDefinition('Wizard', 'intelligence', [
      {
        kind: 'choice_from_list',
        rule_key: 'wizard-cantrip',
        count: 1,
        bucket: 'cantrip_known',
        list: 'Wizard',
        level_min: 0,
        level_max: 0,
      },
      {
        kind: 'spellbook_acquisition',
        rule_key: 'wizard-spellbook',
        bucket: 'spellbook',
        acquisitions_config: 'wizard_spellbook_acquisitions',
        list: 'Wizard',
      },
    ]);
    const characterId = character();
    const empty = state.capture(characterId);

    expect(() =>
      add(characterId, {
        type: 'add_source',
        source_type: 'class',
        source_definition_id: wizardId,
        config: {
          level: 1,
          wizard_spellbook_acquisitions: [{}],
        },
      }),
    ).toThrow(
      "Spellbook rule 'wizard-spellbook' acquisition 0 could not resolve its spell.",
    );
    expect(state.capture(characterId)).toEqual(empty);
    expect(
      db.one(
        `SELECT
           (SELECT count(*) FROM character_class_levels
             WHERE character_id = ?) AS levels,
           (SELECT count(*) FROM character_source_instances
             WHERE character_id = ?) AS sources,
           (SELECT count(*) FROM spell_selection_slots
             WHERE character_id = ?) AS slots`,
        [characterId, characterId, characterId],
      ),
    ).toEqual({ levels: 0, sources: 0, slots: 0 });

    const added = add(characterId, {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: wizardId,
      config: {
        level: 1,
        wizard_spellbook_acquisitions: [
          { spell_version_id: shieldId },
        ],
      },
    });
    expect(
      db.one(
        `SELECT class_definition_id, level, is_starting_class
         FROM character_class_levels WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      class_definition_id: wizardId,
      level: 1,
      is_starting_class: 1,
    });
    expect(
      db.one(
        `SELECT display_name, config, acquired_at_character_level, state
         FROM character_source_instances WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      display_name: 'Wizard 1',
      config:
        `{"spellcasting_ability":"intelligence",` +
        `"wizard_spellbook_acquisitions":[{"spell_version_id":${shieldId}}]}`,
      acquired_at_character_level: 1,
      state: 'active',
    });
    expect(
      db.one(
        `SELECT
           (SELECT count(*) FROM spell_selection_slots
             WHERE character_id = ?) AS slots,
           (SELECT spell_version_id FROM wizard_spellbook_entries
             WHERE character_id = ?) AS spellbook_spell`,
        [characterId, characterId],
      ),
    ).toEqual({ slots: 1, spellbook_spell: shieldId });

    const inverse = await added.inverse();
    expect(await integrity.isValid(characterId, inverse)).toBe(true);
    state.restore(characterId, inverse.snapshot);
    expect(state.capture(characterId)).toEqual(empty);
  });

  it('adds a nested source tree, rejects non-repeatable duplicates and invalid configurable inputs without residue', () => {
    const magicInitiateId = definition(
      'feat_definitions',
      '2024:feat:magic-initiate',
      'Magic Initiate',
      [
        {
          kind: 'choice_from_list',
          rule_key: 'magic-initiate-cantrips',
          count: 2,
          bucket: 'cantrip_known',
          list: '$config.chosen_list',
          level_min: 0,
          level_max: 0,
        },
      ],
      true,
    );
    const humanId = definition(
      'species_definitions',
      '2024:species:human-c42',
      'Human C42',
      [
        {
          kind: 'grant_source',
          rule_key: 'human-origin-feat',
          source_type: 'feat',
          source_definition_id: magicInitiateId,
          child_config_config: 'origin_feat_config',
        },
      ],
    );
    const characterId = character();
    const empty = state.capture(characterId);

    expect(() =>
      add(characterId, {
        type: 'add_source',
        source_type: 'species',
        source_definition_id: humanId,
        config: {
          origin_feat_key: '2024:feat:magic-initiate',
          origin_feat_config: {
            chosen_list: 'Bard',
            spellcasting_ability: 'charisma',
          },
        },
      }),
    ).toThrow(
      'Magic Initiate must use the Cleric, Druid, or Wizard spell list.',
    );
    expect(state.capture(characterId)).toEqual(empty);

    const config = {
      origin_feat_key: '2024:feat:magic-initiate',
      origin_feat_config: {
        chosen_list: 'Wizard',
        spellcasting_ability: 'charisma',
      },
    } as const;
    add(characterId, {
      type: 'add_source',
      source_type: 'species',
      source_definition_id: humanId,
      config,
    });
    const root = db.one(
      `SELECT id, display_name, config, state
       FROM character_source_instances
       WHERE character_id = ? AND parent_source_instance_id IS NULL`,
      [characterId],
    )!;
    const child = db.one(
      `SELECT id, parent_source_instance_id, display_name, config, state
       FROM character_source_instances
       WHERE parent_source_instance_id = ?`,
      [Number(root.id)],
    )!;
    expect(root).toEqual({
      id: expect.any(Number),
      display_name: 'Human C42',
      config: JSON.stringify(config),
      state: 'active',
    });
    expect(child).toEqual({
      id: expect.any(Number),
      parent_source_instance_id: Number(root.id),
      display_name: 'Magic Initiate: Wizard',
      config:
        '{"chosen_list":"Wizard","spellcasting_ability":"charisma"}',
      state: 'active',
    });
    expect(
      db.all(
        `SELECT ordinal, allowed_spell_lists, state
         FROM spell_selection_slots WHERE source_instance_id = ?
         ORDER BY ordinal`,
        [Number(child.id)],
      ),
    ).toEqual([
      { ordinal: 1, allowed_spell_lists: '["Wizard"]', state: 'active' },
      { ordinal: 2, allowed_spell_lists: '["Wizard"]', state: 'active' },
    ]);

    const persisted = state.capture(characterId);
    expect(() =>
      add(characterId, {
        type: 'add_source',
        source_type: 'species',
        source_definition_id: humanId,
        config,
      }),
    ).toThrow('Human C42 is not repeatable.');
    expect(state.capture(characterId)).toEqual(persisted);
  });

  it('tombstones a removable root and its descendants, preserves selections, and restores exact rows from its inverse', async () => {
    const featId = definition(
      'feat_definitions',
      '2024:feat:removal-child',
      'Removal Child',
      [
        {
          kind: 'choice_from_list',
          rule_key: 'removal-choice',
          count: 1,
          bucket: 'known',
          list: 'Wizard',
          level_min: 0,
          level_max: 1,
        },
      ],
    );
    const speciesId = definition(
      'species_definitions',
      '2024:species:removal-root',
      'Removal Root',
      [
        {
          kind: 'grant_source',
          rule_key: 'removal-child',
          source_type: 'feat',
          source_definition_id: featId,
        },
      ],
    );
    const selectedSpellId = spell(
      '2024:removal-spell',
      'Removal Spell',
      '2024',
      'Wizard',
    );
    const characterId = character();
    add(characterId, {
      type: 'add_source',
      source_type: 'species',
      source_definition_id: speciesId,
      config: {},
    });
    const rootId = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND parent_source_instance_id IS NULL`,
        [characterId],
      ),
    );
    const childId = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE parent_source_instance_id = ?`,
        [rootId],
      ),
    );
    const slot = db.one(
      `SELECT id, slot_key FROM spell_selection_slots
       WHERE source_instance_id = ?`,
      [childId],
    )!;
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?, selection_eligibility = 'valid'
       WHERE id = ?`,
      [selectedSpellId, Number(slot.id)],
    );
    const before = state.capture(characterId);

    const removed = new RemoveSourceCommand(
      db,
      {
        type: 'remove_source',
        source_instance_id: rootId,
      },
      integrity,
    );
    removed.apply(characterId);

    expect(
      db.all(
        `SELECT id, state FROM character_source_instances
         WHERE id IN (?, ?) ORDER BY id`,
        [rootId, childId],
      ),
    ).toEqual([
      { id: rootId, state: 'tombstoned' },
      { id: childId, state: 'tombstoned' },
    ]);
    expect(
      db.one(
        `SELECT id, slot_key, current_spell_version_id, state,
                orphan_reason_code, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [Number(slot.id)],
      ),
    ).toEqual({
      id: Number(slot.id),
      slot_key: slot.slot_key,
      current_spell_version_id: selectedSpellId,
      state: 'orphaned',
      orphan_reason_code: 'parent_rule_removed',
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selection preserved because its source is no longer active.',
    });

    const inverse = await removed.inverse();
    expect(await integrity.isValid(characterId, inverse)).toBe(true);
    state.restore(characterId, inverse.snapshot);
    expect(state.capture(characterId)).toEqual(before);

    const classId = classDefinition('Sorcerer', 'charisma', []);
    add(characterId, {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: classId,
      config: { level: 1 },
    });
    const classSourceId = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'class'`,
        [characterId],
      ),
    );
    expect(() =>
      new RemoveSourceCommand(
        db,
        {
          type: 'remove_source',
          source_instance_id: classSourceId,
        },
        integrity,
      ).apply(characterId),
    ).toThrow('Removable source does not belong to this character.');
    expect(
      db.scalar(
        'SELECT state FROM character_source_instances WHERE id = ?',
        [classSourceId],
      ),
    ).toBe('active');
  });
});
