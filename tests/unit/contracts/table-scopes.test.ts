import { describe, expect, it } from 'vitest';
import {
  APPLICATION_TABLES,
  AUDIT_ENTITY_TYPES,
  BACKUP_DIRECT_TABLES,
  BACKUP_OPTIONAL_TABLES,
  BACKUP_TABLES,
  CHARACTER_STATE_TABLES,
  DELETE_ORDER,
  REFERENCE_KINDS,
  SHARE_TABLES,
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
 *
 * WHY THE WEAPON CHANGE IS WRITTEN AS A DELTA AND NOT EDITED IN.
 * `character_weapons` joined the snapshot, direct-backup and backup scopes. The
 * obvious way to keep these tests green — adding the name to each literal — is
 * the one thing that must not happen: the literals are an ORACLE precisely
 * because they were transcribed from lists that predate the derivation, and
 * quietly editing them turns this file into a mirror of the code it checks.
 *
 * So the historical transcriptions below are untouched, and each affected
 * assertion states the delta explicitly. Both links still fail independently: a
 * derivation that lost a historical table fails, and one that added a table
 * nobody declared here fails too.
 */

/**
 * The tables added to a scope since its literal above was transcribed, with the
 * position they were added at. Hand-written, one entry per deliberate decision.
 */
const SNAPSHOT_ADDITIONS = [
  'character_weapons',
  // The character's own origin. Three tables and not one, because a species,
  // its trait list and a background are separately added and separately
  // removed; see `db/schema/origins.ts`.
  'character_species',
  'character_species_traits',
  'character_background',
] as const;
const BACKUP_DIRECT_ADDITIONS = [
  'character_weapons',
  'character_species',
  'character_species_traits',
  'character_background',
] as const;
describe('derived table scopes reproduce the hand-maintained lists', () => {
  it('reproduces applicationTables exactly (database-lifecycle.ts)', () => {
    expect([...APPLICATION_TABLES]).toEqual([
      'background_definitions',
      'background_templates',
      'change_log',
      'character_background',
      'character_class_levels',
      'character_operations',
      'character_rule_overrides',
      'character_save_points',
      'character_source_instances',
      'character_species',
      'character_species_traits',
      'character_spell_preferences',
      'character_weapons',
      'characters',
      'class_definitions',
      'class_progressions',
      'class_weapon_mastery_counts',
      'class_weapon_mastery_grants',
      'feat_definitions',
      'species_definitions',
      'species_template_traits',
      'species_templates',
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
      'warning_acknowledgements',
      'weapon_templates',
      'wizard_spellbook_entries',
    ]);
  });

  it('reproduces CHARACTER_STATE_TABLES exactly, plus the declared additions', () => {
    expect([...CHARACTER_STATE_TABLES]).toEqual([
      // — transcribed, unedited —
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'warning_acknowledgements',
      // — declared since —
      ...SNAPSHOT_ADDITIONS,
    ]);
  });

  it('reproduces the snapshot DELETE_ORDER exactly, plus the declared additions', () => {
    // Order is topological rather than capture order, so the additions go where
    // their foreign keys allow: none of the four has children, so they delete
    // first, alongside the other leaves. Within the group the traits precede
    // the species row purely for readability — `character_species_traits` is
    // keyed on `character_id`, not on `character_species.id`, so there is no
    // edge between them to respect.
    expect([...DELETE_ORDER]).toEqual([
      'character_weapons',
      'character_species_traits',
      'character_species',
      'character_background',
      // — transcribed, unedited —
      'warning_acknowledgements',
      'wizard_spellbook_entries',
      'spell_selection_slots',
      'character_source_instances',
      'character_class_levels',
    ]);
    // The two lists are the same SET, whatever the order: a table deleted but
    // never re-inserted (or the reverse) would corrupt a restore.
    expect([...DELETE_ORDER].sort()).toEqual([...CHARACTER_STATE_TABLES].sort());
  });

  it('reproduces directCharacterTables exactly, plus the declared additions', () => {
    expect([...BACKUP_DIRECT_TABLES]).toEqual([
      // — transcribed, unedited —
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'character_spell_preferences',
      'character_rule_overrides',
      'warning_acknowledgements',
      'character_save_points',
      'spell_loadouts',
      // — declared since —
      ...BACKUP_DIRECT_ADDITIONS,
    ]);
  });

  it('reproduces backupTableNames exactly, plus the declared additions', () => {
    expect([...BACKUP_TABLES]).toEqual([
      // — transcribed, unedited —
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'character_spell_preferences',
      'character_rule_overrides',
      'warning_acknowledgements',
      'character_save_points',
      'spell_loadouts',
      // — declared since; the direct tables come first, then the one table
      //   that has no character_id and so cannot join the direct pass —
      ...BACKUP_DIRECT_ADDITIONS,
      'spell_loadout_entries',
    ]);
  });

  it('names every optional backup table as one a v1 document could not contain', () => {
    // The optional set is what keeps a backup file exported before the table
    // existed readable. It may only ever name a table that IS backed up, and it
    // must stay a strict subset — an optional table set equal to the whole
    // document would accept a file with no tables at all as valid.
    expect([...BACKUP_OPTIONAL_TABLES]).toEqual([
      'character_weapons',
      'character_species',
      'character_species_traits',
      'character_background',
    ]);
    for (const table of BACKUP_OPTIONAL_TABLES) {
      expect([...BACKUP_TABLES]).toContain(table);
    }
    expect(BACKUP_OPTIONAL_TABLES.length).toBeLessThan(BACKUP_TABLES.length);
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
  it('classifies all 40 tables exactly once', () => {
    const names = Object.keys(TABLE_SCOPES);
    // 30 Laravel-derived tables — 38 until the eight Laravel-only
    // infrastructure ones were dropped — plus the four native weapon tables and
    // the six native origins tables.
    expect(names).toHaveLength(40);
    expect(new Set(names).size).toBe(40);
    expect([...names].sort()).toEqual([...APPLICATION_TABLES].sort());
  });

  it('carries no Laravel infrastructure table', () => {
    // The eight are named here, not derived, so this fails if one comes back —
    // which the count assertion above would not catch on its own if a domain
    // table were dropped in the same change.
    for (const removed of [
      'cache',
      'cache_locks',
      'failed_jobs',
      'job_batches',
      'jobs',
      'password_reset_tokens',
      'sessions',
      'users',
    ]) {
      expect(Object.keys(TABLE_SCOPES)).not.toContain(removed);
      expect([...APPLICATION_TABLES]).not.toContain(removed);
    }
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

  it("carries a character's weapons through every portable scope", () => {
    // Replaces `tests/unit/contracts/weapon-scopes.test.ts`, which pinned the
    // opposite while weapons were excluded and was deleted with the exclusion.
    // Pinned in the same shape, so turning a scope back off is as visible as
    // turning it on was.
    expect(TABLE_SCOPES.character_weapons).toEqual({
      role: 'character_owned',
      snapshot: true,
      backupDirect: true,
      backup: true,
      share: true,
      backupReference: false,
    });
    expect([...BACKUP_TABLES]).toContain('character_weapons');
    expect(Object.keys(SHARE_TABLES)).toContain('character_weapons');
    expect([...CHARACTER_STATE_TABLES]).toContain('character_weapons');
  });

  it('keeps the weapon catalog out of the backup reference kinds', () => {
    // Relocated from `weapon-scopes.test.ts`. This one was never about the gap
    // and is still true: by D1b a character's weapon holds no template id, so a
    // backup document has nothing to resolve against `weapon_templates` and a
    // reference kind for it could never be populated.
    expect([...REFERENCE_KINDS]).not.toContain('weapon_templates');
    expect(TABLE_SCOPES.weapon_templates.backupReference).toBe(false);
    expect(TABLE_SCOPES.weapon_templates.role).toBe('catalog_weapon');
  });

  it('still requires every weapon table in a valid database image', () => {
    // Also relocated. Portability was never what put these in the image: an
    // image missing any of them is rejected at open, whatever their scopes say.
    for (const table of [
      'character_weapons',
      'weapon_templates',
      'class_weapon_mastery_grants',
      'class_weapon_mastery_counts',
    ] as const) {
      expect([...APPLICATION_TABLES]).toContain(table);
    }
  });
});
