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

function richCharacterBackup(): CharacterBackupDocument {
  const document = minimalCharacterBackup();
  return {
    ...document,
    tables: {
      ...document.tables,
      character_source_instances: [
        {
          id: 11,
          character_id: 7,
          instance_uuid: 'source-original',
          parent_source_instance_id: null,
          source_type: 'class',
          source_definition_id: 31,
        },
      ],
      spell_selection_slots: [
        {
          id: 12,
          character_id: 7,
          source_instance_id: 11,
          fixed_spell_version_id: null,
          current_spell_version_id: 41,
        },
      ],
      wizard_spellbook_entries: [
        {
          id: 13,
          character_id: 7,
          spell_version_id: 41,
        },
      ],
      character_save_points: [
        {
          id: 14,
          character_id: 7,
          label: 'Before experiment',
          schema_version: 'a7-v1',
          snapshot: JSON.stringify({
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
            character_source_instances: [
              {
                id: 11,
                character_id: 7,
                instance_uuid: 'source-original',
                parent_source_instance_id: null,
                source_type: 'class',
                source_definition_id: 31,
              },
            ],
            spell_selection_slots: [
              {
                id: 12,
                character_id: 7,
                source_instance_id: 11,
                fixed_spell_version_id: null,
                current_spell_version_id: 41,
              },
            ],
            wizard_spellbook_entries: [
              {
                id: 13,
                character_id: 7,
                spell_version_id: 41,
              },
            ],
            warning_acknowledgements: [],
          }),
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
    expect(() => validateCharacterBackup(corrupt)).toThrow(
      'snapshot is not valid JSON.',
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
  });

  it('uses a distinct validation error type for product-facing failures', () => {
    expect(() => validateCharacterBackup(null)).toThrow(
      BackupValidationError,
    );
  });
});
