import { describe, expect, it } from 'vitest';
import {
  validateCharacterBackup,
  type CharacterBackupDocument,
} from '../../../src/backup/character-backup';
import {
  BackupValidationError,
  CHARACTER_BACKUP_FORMAT,
  CHARACTER_BACKUP_VERSION,
  DATABASE_BACKUP_FORMAT,
  DATABASE_BACKUP_VERSION,
} from '../../../src/backup/backup-version';
import {
  validateDatabaseBackup,
  type DatabaseBackup,
} from '../../../src/backup/database-backup';

function minimalCharacterBackup(): CharacterBackupDocument {
  return {
    format: CHARACTER_BACKUP_FORMAT,
    version: CHARACTER_BACKUP_VERSION,
    exported_at: '2026-07-23T12:00:00.000Z',
    source_character_id: 7,
    character: {
      id: 7,
      name: 'Portable Hero',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      proficiency_bonus_override: null,
      rules_edition_preference: '2024',
      allow_legacy: 0,
      revision: 0,
      notes: null,
      created_at: null,
      updated_at: null,
    },
    tables: {
      character_class_levels: [],
      character_source_instances: [],
      spell_selection_slots: [],
      wizard_spellbook_entries: [],
      character_spell_preferences: [],
      character_rule_overrides: [],
      warning_acknowledgements: [],
      character_save_points: [],
      spell_loadouts: [],
      spell_loadout_entries: [],
    },
    references: {
      class_definitions: [],
      subclass_definitions: [],
      feat_definitions: [],
      species_definitions: [],
      background_definitions: [],
      spell_versions: [],
    },
  };
}

/**
 * WHY THESE FIXTURES CARRY EVERY COLUMN.
 *
 * A backup row is produced by `SELECT *` against a schema-signature-validated
 * database, so a real document's rows are always complete. The per-table row
 * contracts (`src/domain/contracts/rows.ts`) hold documents to that, which is
 * what stops a partial row from silently taking column defaults in place of the
 * user's data. These fixtures therefore describe whole rows.
 */
function sourceInstanceRow(): Record<string, unknown> {
  return {
    id: 11,
    character_id: 7,
    instance_uuid: 'source-original',
    parent_source_instance_id: null,
    source_type: 'class',
    source_definition_id: 31,
    display_name: 'Wizard 1',
    config: '{}',
    acquired_at_character_level: 1,
    state: 'active',
    notes: null,
    created_at: null,
    updated_at: null,
  };
}

function slotRow(): Record<string, unknown> {
  return {
    id: 12,
    character_id: 7,
    source_instance_id: 11,
    slot_key: 'source-original:prepared:1',
    rule_key: 'prepared',
    ordinal: 1,
    bucket: 'prepared',
    eligibility_kind: 'choice_from_query',
    fixed_spell_version_id: null,
    current_spell_version_id: 41,
    label: null,
    spell_level_min: 0,
    spell_level_max: 9,
    allowed_spell_lists: null,
    allowed_schools: null,
    allowed_tags: null,
    always_prepared: 0,
    with_slots: 1,
    free_cast: null,
    counts_against_limit: 1,
    required: 0,
    is_locked: 0,
    state: 'active',
    orphan_reason_code: null,
    orphaned_by_change_group_id: null,
    orphaned_at: null,
    prior_config: null,
    override_note: null,
    sort_order: 1,
    notes: null,
    created_at: null,
    updated_at: null,
    selection_collection: null,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  };
}

function spellbookRow(): Record<string, unknown> {
  return {
    id: 13,
    character_id: 7,
    spell_version_id: 41,
    created_at: null,
    updated_at: null,
  };
}

function snapshotJson(): string {
  return JSON.stringify({
    schema_version: 'a7-v1',
    character: {
      name: 'Portable Hero',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      proficiency_bonus_override: null,
      rules_edition_preference: '2024',
      allow_legacy: 0,
      notes: null,
    },
    character_class_levels: [],
    character_source_instances: [sourceInstanceRow()],
    spell_selection_slots: [slotRow()],
    wizard_spellbook_entries: [spellbookRow()],
    warning_acknowledgements: [],
  });
}

function richCharacterBackup(): CharacterBackupDocument {
  const document = minimalCharacterBackup();
  return {
    ...document,
    tables: {
      ...document.tables,
      character_source_instances: [sourceInstanceRow()],
      spell_selection_slots: [slotRow()],
      wizard_spellbook_entries: [spellbookRow()],
      character_save_points: [
        {
          id: 14,
          character_id: 7,
          label: 'Before experiment',
          schema_version: 'a7-v1',
          snapshot: snapshotJson(),
          created_at: null,
          updated_at: null,
        },
      ],
    },
    references: {
      ...document.references,
      class_definitions: [{ id: 31, content_key: 'class:wizard' }],
      spell_versions: [{ id: 41, content_key: '2024:shield' }],
    },
  };
}

describe('database backup validation', () => {
  it('accepts the current typed envelope and rejects version or byte corruption', () => {
    const backup: DatabaseBackup = {
      format: DATABASE_BACKUP_FORMAT,
      version: DATABASE_BACKUP_VERSION,
      exported_at: '2026-07-23T12:00:00.000Z',
      sqlite: new Uint8Array([83, 81, 76]),
    };
    expect(() => validateDatabaseBackup(backup)).not.toThrow();

    expect(() =>
      validateDatabaseBackup({ ...backup, version: 2 }),
    ).toThrow('Unsupported database backup version 2.');
    expect(() =>
      validateDatabaseBackup({ ...backup, sqlite: [] }),
    ).toThrow('Database backup sqlite must be a Uint8Array.');
  });
});

describe('portable character validation', () => {
  it('accepts the current format and rejects incompatible headers', () => {
    const document = minimalCharacterBackup();
    expect(() => validateCharacterBackup(document)).not.toThrow();

    expect(() =>
      validateCharacterBackup({ ...document, format: 'other/character' }),
    ).toThrow('Unsupported character backup format "other/character".');
    expect(() =>
      validateCharacterBackup({ ...document, version: 0 }),
    ).toThrow('Unsupported character backup version 0.');
  });

  it('rejects direct cross-character rows before import', () => {
    const document = richCharacterBackup();
    const changed = structuredClone(document);
    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).character_id = 99;

    expect(() => validateCharacterBackup(changed)).toThrow(
      'Character backup tables.spell_selection_slots[0] belongs to another character.',
    );
  });

  it('rejects cross-character references and unknown catalog ids', () => {
    const document = richCharacterBackup();
    const changed = structuredClone(document);
    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).source_instance_id = 999;
    expect(() => validateCharacterBackup(changed)).toThrow(
      'references a source from another character.',
    );

    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).source_instance_id = 11;
    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).current_spell_version_id = 999;
    expect(() => validateCharacterBackup(changed)).toThrow(
      'has no spell_versions content-key reference for id 999.',
    );
  });

  it('rejects corrupt or cross-character save-point JSON', () => {
    const corrupt = richCharacterBackup();
    (
      corrupt.tables.character_save_points[0] as Record<string, unknown>
    ).snapshot = '{bad json';
    // The row contract reaches this before `parseSnapshot` does, and names the
    // table, the row index and the field rather than just the field.
    expect(() => validateCharacterBackup(corrupt)).toThrow(
      'Character backup tables.character_save_points[0].snapshot: must be a JSON object.',
    );

    // Well-formed JSON of the WRONG SHAPE, which a syntax-only check accepted.
    // The column's contract knows its readers require an object — both
    // `parseSnapshot` and `SavePointReader.restoreCommand` refuse anything else
    // — so the shape is stated in the same message as the table and the row.
    const notAnObject = richCharacterBackup();
    (
      notAnObject.tables.character_save_points[0] as Record<string, unknown>
    ).snapshot = '"a bare string"';
    expect(() => validateCharacterBackup(notAnObject)).toThrow(
      'Character backup tables.character_save_points[0].snapshot: must be a JSON object.',
    );

    const crossed = richCharacterBackup();
    const savePoint = crossed.tables.character_save_points[0] as Record<
      string,
      unknown
    >;
    const snapshot = JSON.parse(String(savePoint.snapshot)) as {
      wizard_spellbook_entries: Array<Record<string, unknown>>;
    };
    snapshot.wizard_spellbook_entries[0]!.character_id = 8;
    savePoint.snapshot = JSON.stringify(snapshot);
    expect(() => validateCharacterBackup(crossed)).toThrow(
      'snapshot.wizard_spellbook_entries[0] belongs to another character.',
    );

    const cyclic = richCharacterBackup();
    const cyclicSavePoint =
      cyclic.tables.character_save_points[0] as Record<string, unknown>;
    const cyclicSnapshot = JSON.parse(String(cyclicSavePoint.snapshot)) as {
      character_source_instances: Array<Record<string, unknown>>;
    };
    cyclicSnapshot.character_source_instances[0]!.parent_source_instance_id = 11;
    cyclicSavePoint.snapshot = JSON.stringify(cyclicSnapshot);
    expect(() => validateCharacterBackup(cyclic)).toThrow(
      'Character backup source parent graph contains a cycle.',
    );
  });

  it('uses a distinct validation error type for product-facing failures', () => {
    expect(() => validateCharacterBackup(null)).toThrow(
      BackupValidationError,
    );
  });
});
