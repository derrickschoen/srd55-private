import { describe, expect, it } from 'vitest';
import {
  APPLICATION_TABLES,
  AUDIT_ENTITY_TYPES,
  BACKUP_DIRECT_TABLES,
  BACKUP_TABLES,
  CHARACTER_STATE_TABLES,
  DELETE_ORDER,
  REFERENCE_KINDS,
  SOURCE_DEFINITION_TABLE,
  SOURCE_REFERENCE_KIND,
  TABLE_SCOPES,
} from '../../../src/domain/contracts/tables';

/**
 * REGRESSION GUARD FOR THE DERIVATION.
 *
 * Every literal below is transcribed from the hand-maintained list it
 * replaced, as that list stood BEFORE the derivation existed. The point is to
 * prove the derivation REPRODUCES today's behaviour rather than to assume it.
 *
 * This matters most for `REFERENCE_KINDS`: `CharacterBackupReferences` is
 * `Record<ReferenceKind, …>`, so a derivation that picked up two extra tables
 * (the obvious `role === 'catalog_class'` filter would have added
 * `class_progressions` and `subclass_progressions`) would have made every
 * existing backup document structurally invalid, with no type error anywhere.
 */
describe('derived table scopes reproduce the hand-maintained lists', () => {
  it('reproduces applicationTables exactly (database-lifecycle.ts)', () => {
    expect([...APPLICATION_TABLES]).toEqual([
      'background_definitions',
      'cache',
      'cache_locks',
      'change_log',
      'character_class_levels',
      'character_operations',
      'character_rule_overrides',
      'character_save_points',
      'character_source_instances',
      'character_spell_preferences',
      'characters',
      'class_definitions',
      'class_progressions',
      'failed_jobs',
      'feat_definitions',
      'job_batches',
      'jobs',
      'password_reset_tokens',
      'sessions',
      'species_definitions',
      'spell_identities',
      'spell_identity_aliases',
      'spell_list_memberships',
      'spell_loadout_entries',
      'spell_loadouts',
      'spell_selection_slots',
      'spell_version_attack_modes',
      'spell_version_conditions',
      'spell_version_damage_types',
      'spell_version_publications',
      'spell_version_save_abilities',
      'spell_version_tags',
      'spell_versions',
      'subclass_definitions',
      'subclass_progressions',
      'users',
      'warning_acknowledgements',
      'wizard_spellbook_entries',
    ]);
  });

  it('reproduces CHARACTER_STATE_TABLES exactly (character-state.ts)', () => {
    expect([...CHARACTER_STATE_TABLES]).toEqual([
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'warning_acknowledgements',
    ]);
  });

  it('reproduces the snapshot DELETE_ORDER exactly (character-state.ts)', () => {
    expect([...DELETE_ORDER]).toEqual([
      'warning_acknowledgements',
      'wizard_spellbook_entries',
      'spell_selection_slots',
      'character_source_instances',
      'character_class_levels',
    ]);
  });

  it('reproduces directCharacterTables exactly (character-backup.ts)', () => {
    expect([...BACKUP_DIRECT_TABLES]).toEqual([
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'character_spell_preferences',
      'character_rule_overrides',
      'warning_acknowledgements',
      'character_save_points',
      'spell_loadouts',
    ]);
  });

  it('reproduces backupTableNames exactly (character-backup.ts)', () => {
    expect([...BACKUP_TABLES]).toEqual([
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'character_spell_preferences',
      'character_rule_overrides',
      'warning_acknowledgements',
      'character_save_points',
      'spell_loadouts',
      'spell_loadout_entries',
    ]);
  });

  it('reproduces referenceKinds exactly, without the progression tables', () => {
    expect([...REFERENCE_KINDS]).toEqual([
      'class_definitions',
      'subclass_definitions',
      'feat_definitions',
      'species_definitions',
      'background_definitions',
      'spell_versions',
    ]);
    expect(REFERENCE_KINDS).not.toContain('class_progressions');
    expect(REFERENCE_KINDS).not.toContain('subclass_progressions');
  });

  it('reproduces the two polymorphic source maps exactly', () => {
    expect(SOURCE_DEFINITION_TABLE).toEqual({
      feat: 'feat_definitions',
      species: 'species_definitions',
      background: 'background_definitions',
    });
    expect(SOURCE_REFERENCE_KIND).toEqual({
      class: 'class_definitions',
      subclass: 'subclass_definitions',
      feat: 'feat_definitions',
      species: 'species_definitions',
      background: 'background_definitions',
    });
  });

  it('keeps the audit vocabulary independent of the snapshot scope', () => {
    expect([...AUDIT_ENTITY_TYPES]).toEqual([
      'character',
      ...CHARACTER_STATE_TABLES,
    ]);
  });
});

describe('table scope classification', () => {
  it('classifies all 38 tables exactly once', () => {
    const names = Object.keys(TABLE_SCOPES);
    expect(names).toHaveLength(38);
    expect(new Set(names).size).toBe(38);
    expect([...names].sort()).toEqual([...APPLICATION_TABLES].sort());
  });

  it('emits no duplicate members in any derived tuple', () => {
    for (const tuple of [
      APPLICATION_TABLES,
      CHARACTER_STATE_TABLES,
      DELETE_ORDER,
      BACKUP_DIRECT_TABLES,
      BACKUP_TABLES,
      REFERENCE_KINDS,
      AUDIT_ENTITY_TYPES,
    ]) {
      expect(new Set(tuple).size).toBe(tuple.length);
    }
  });

  it('keeps every runtime tuple consistent with its scope flag', () => {
    const withScope = (scope: 'snapshot' | 'backupDirect' | 'backup' | 'backupReference') =>
      Object.entries(TABLE_SCOPES)
        .filter(([, scopes]) => scopes[scope])
        .map(([name]) => name)
        .sort();

    expect([...CHARACTER_STATE_TABLES].sort()).toEqual(withScope('snapshot'));
    expect([...DELETE_ORDER].sort()).toEqual(withScope('snapshot'));
    expect([...BACKUP_DIRECT_TABLES].sort()).toEqual(withScope('backupDirect'));
    expect([...BACKUP_TABLES].sort()).toEqual(withScope('backup'));
    expect([...REFERENCE_KINDS].sort()).toEqual(withScope('backupReference'));
  });

  it('excludes spell_loadout_entries from the direct pass for the real reason', () => {
    // It is backed up and shared, but has no character_id column, so it cannot
    // participate in the character_id-keyed pass. The type system enforces the
    // second clause; this pins the first.
    expect(TABLE_SCOPES.spell_loadout_entries.backup).toBe(true);
    expect(TABLE_SCOPES.spell_loadout_entries.share).toBe(true);
    expect(TABLE_SCOPES.spell_loadout_entries.backupDirect).toBe(false);
  });

  it('keeps save points out of shares and journals out of backups', () => {
    expect(TABLE_SCOPES.character_save_points.backup).toBe(true);
    expect(TABLE_SCOPES.character_save_points.share).toBe(false);
    expect(TABLE_SCOPES.change_log.backup).toBe(false);
    expect(TABLE_SCOPES.character_operations.backup).toBe(false);
  });
});
