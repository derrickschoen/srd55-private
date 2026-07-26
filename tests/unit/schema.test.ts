import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemaSources } from '../helpers/schema-sources';

type SqlRow = Record<string, string | number | bigint | null>;

const expectedColumns: Record<string, string[]> = {
  background_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'category', 'repeatable',
    'prerequisites', 'grant_rules', 'notes', 'created_at', 'updated_at',
  ],
  cache: ['key', 'value', 'expiration'],
  cache_locks: ['key', 'owner', 'expiration'],
  change_log: [
    'id', 'character_id', 'sequence', 'group_id', 'operation_uuid',
    'entity_type', 'entity_id', 'previous_value', 'new_value', 'reason',
    'action_type', 'reversible', 'created_at', 'updated_at',
  ],
  character_class_levels: [
    'id', 'character_id', 'class_definition_id', 'subclass_definition_id',
    'level', 'is_starting_class', 'spellcasting_ability_override', 'notes',
    'created_at', 'updated_at',
  ],
  character_operations: [
    'id', 'character_id', 'operation_uuid', 'expected_revision',
    'resulting_revision', 'inverse_command', 'created_at', 'updated_at',
  ],
  character_rule_overrides: [
    'id', 'character_id', 'rule_key', 'value', 'note', 'created_at',
    'updated_at',
  ],
  character_save_points: [
    'id', 'character_id', 'label', 'snapshot', 'schema_version', 'created_at',
    'updated_at',
  ],
  character_source_instances: [
    'id', 'character_id', 'instance_uuid', 'parent_source_instance_id',
    'source_type', 'source_definition_id', 'display_name', 'config',
    'acquired_at_character_level', 'state', 'notes', 'created_at', 'updated_at',
  ],
  character_spell_preferences: [
    'id', 'character_id', 'spell_version_id', 'favourite', 'notes',
    'created_at', 'updated_at',
  ],
  characters: [
    'id', 'name', 'strength', 'dexterity', 'constitution', 'intelligence',
    'wisdom', 'charisma', 'proficiency_bonus_override',
    'rules_edition_preference', 'allow_legacy', 'revision', 'notes',
    'created_at', 'updated_at',
  ],
  class_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'spellcasting_ability',
    'progression_type', 'caster_fraction', 'caster_rounding',
    'prepares_or_knows', 'supports_ritual_casting', 'ritual_casting_mode',
    'primary_ability_expression', 'notes', 'created_at', 'updated_at',
  ],
  class_progressions: [
    'id', 'class_definition_id', 'class_level', 'cantrips_known',
    'prepared_count', 'slots', 'pact_slots', 'grant_rules', 'created_at',
    'updated_at',
  ],
  failed_jobs: [
    'id', 'uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at',
  ],
  feat_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'category', 'repeatable',
    'prerequisites', 'grant_rules', 'notes', 'created_at', 'updated_at',
  ],
  job_batches: [
    'id', 'name', 'total_jobs', 'pending_jobs', 'failed_jobs',
    'failed_job_ids', 'options', 'cancelled_at', 'created_at', 'finished_at',
  ],
  jobs: [
    'id', 'queue', 'payload', 'attempts', 'reserved_at', 'available_at',
    'created_at',
  ],
  password_reset_tokens: ['email', 'token', 'created_at'],
  sessions: [
    'id', 'user_id', 'ip_address', 'user_agent', 'payload', 'last_activity',
  ],
  species_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'category', 'repeatable',
    'prerequisites', 'grant_rules', 'notes', 'created_at', 'updated_at',
  ],
  spell_identities: [
    'id', 'content_key', 'canonical_name', 'normalized_name', 'notes',
    'created_at', 'updated_at',
  ],
  spell_identity_aliases: [
    'id', 'spell_identity_id', 'alias', 'normalized_alias', 'created_at',
    'updated_at',
  ],
  spell_list_memberships: [
    'id', 'spell_version_id', 'spell_list_key', 'created_at', 'updated_at',
  ],
  spell_loadout_entries: [
    'id', 'spell_loadout_id', 'spell_version_id', 'role', 'created_at',
    'updated_at',
  ],
  spell_loadouts: [
    'id', 'character_id', 'name', 'notes', 'created_at', 'updated_at',
  ],
  spell_selection_slots: [
    'id', 'character_id', 'source_instance_id', 'slot_key', 'rule_key',
    'ordinal', 'bucket', 'eligibility_kind', 'fixed_spell_version_id',
    'current_spell_version_id', 'label', 'spell_level_min', 'spell_level_max',
    'allowed_spell_lists', 'allowed_schools', 'allowed_tags',
    'always_prepared', 'with_slots', 'free_cast', 'counts_against_limit',
    'required', 'is_locked', 'state',
    'orphan_reason_code', 'orphaned_by_change_group_id', 'orphaned_at',
    'prior_config', 'override_note', 'sort_order', 'notes', 'created_at',
    'updated_at', 'selection_collection', 'selection_eligibility',
    'selection_invalid_reason',
  ],
  spell_version_attack_modes: ['id', 'spell_version_id', 'attack_mode'],
  spell_version_conditions: ['id', 'spell_version_id', 'condition_type'],
  spell_version_damage_types: ['id', 'spell_version_id', 'damage_type'],
  spell_version_publications: [
    'id', 'spell_version_id', 'source_book', 'source_page',
    'source_reference', 'created_at', 'updated_at',
  ],
  spell_version_save_abilities: ['id', 'spell_version_id', 'save_ability'],
  spell_version_tags: ['id', 'spell_version_id', 'tag'],
  spell_versions: [
    'id', 'content_key', 'spell_identity_id', 'display_name', 'rules_edition',
    'level', 'school', 'ritual', 'concentration', 'casting_time', 'action_type',
    'range', 'duration', 'components', 'material_component_summary', 'healing',
    'short_summary', 'upcast_type', 'upcast_summary',
    'requires_mod_for_effect', 'effect_reliability_category', 'provenance',
    'seed_version', 'is_active', 'created_at', 'updated_at',
  ],
  subclass_definitions: [
    'id', 'content_key', 'class_definition_id', 'name', 'rules_edition',
    'spellcasting_ability', 'caster_fraction', 'caster_rounding', 'grant_rules',
    'created_at', 'updated_at',
  ],
  subclass_progressions: [
    'id', 'subclass_definition_id', 'class_level', 'cantrips_known',
    'prepared_count', 'max_spell_level', 'slots', 'grant_rules', 'created_at',
    'updated_at',
  ],
  users: [
    'id', 'name', 'email', 'email_verified_at', 'password', 'remember_token',
    'created_at', 'updated_at',
  ],
  warning_acknowledgements: [
    'id', 'character_id', 'warning_fingerprint', 'note', 'invalidated_at',
    'created_at', 'updated_at',
  ],
  wizard_spellbook_entries: [
    'id', 'character_id', 'spell_version_id', 'created_at', 'updated_at',
  ],
};

// SHA-256 of the ordered PRAGMA table_info metadata produced by running the
// Laravel migrations against an in-memory SQLite database. It covers declared
// types, nullability, defaults, primary keys, column order, and all 38 tables.
const laravelColumnMetadataHash =
  'fa0e4e9f2af9531e8b66b296660b5db7e28a5c6c2ceda00859c904fe6a4d1b11';

const expectedNotNull: Record<string, string[]> = {
  background_definitions: ['id', 'content_key', 'name', 'rules_edition', 'repeatable'],
  cache: ['key', 'value', 'expiration'],
  cache_locks: ['key', 'owner', 'expiration'],
  change_log: ['id', 'character_id', 'sequence', 'entity_type', 'action_type', 'reversible'],
  character_class_levels: ['id', 'character_id', 'class_definition_id', 'level', 'is_starting_class'],
  character_operations: ['id', 'character_id', 'operation_uuid', 'expected_revision', 'resulting_revision', 'inverse_command'],
  character_rule_overrides: ['id', 'character_id', 'rule_key', 'value'],
  character_save_points: ['id', 'character_id', 'label', 'snapshot', 'schema_version'],
  character_source_instances: ['id', 'character_id', 'instance_uuid', 'source_type', 'display_name', 'state'],
  character_spell_preferences: ['id', 'character_id', 'spell_version_id', 'favourite'],
  characters: [
    'id', 'name', 'strength', 'dexterity', 'constitution', 'intelligence',
    'wisdom', 'charisma', 'rules_edition_preference', 'allow_legacy', 'revision',
  ],
  class_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'progression_type',
    'supports_ritual_casting',
  ],
  class_progressions: ['id', 'class_definition_id', 'class_level', 'cantrips_known', 'prepared_count'],
  failed_jobs: ['id', 'uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at'],
  feat_definitions: ['id', 'content_key', 'name', 'rules_edition', 'repeatable'],
  job_batches: ['id', 'name', 'total_jobs', 'pending_jobs', 'failed_jobs', 'failed_job_ids', 'created_at'],
  jobs: ['id', 'queue', 'payload', 'attempts', 'available_at', 'created_at'],
  password_reset_tokens: ['email', 'token'],
  sessions: ['id', 'payload', 'last_activity'],
  species_definitions: ['id', 'content_key', 'name', 'rules_edition', 'repeatable'],
  spell_identities: ['id', 'content_key', 'canonical_name', 'normalized_name'],
  spell_identity_aliases: ['id', 'spell_identity_id', 'alias', 'normalized_alias'],
  spell_list_memberships: ['id', 'spell_version_id', 'spell_list_key'],
  spell_loadout_entries: ['id', 'spell_loadout_id', 'spell_version_id', 'role'],
  spell_loadouts: ['id', 'character_id', 'name'],
  spell_selection_slots: [
    'id', 'character_id', 'source_instance_id', 'slot_key', 'rule_key',
    'ordinal', 'bucket', 'eligibility_kind', 'spell_level_min',
    'spell_level_max', 'always_prepared', 'with_slots',
    'counts_against_limit', 'required', 'is_locked', 'state', 'sort_order',
    'selection_eligibility',
  ],
  spell_version_attack_modes: ['id', 'spell_version_id', 'attack_mode'],
  spell_version_conditions: ['id', 'spell_version_id', 'condition_type'],
  spell_version_damage_types: ['id', 'spell_version_id', 'damage_type'],
  spell_version_publications: ['id', 'spell_version_id', 'source_book'],
  spell_version_save_abilities: ['id', 'spell_version_id', 'save_ability'],
  spell_version_tags: ['id', 'spell_version_id', 'tag'],
  spell_versions: [
    'id', 'content_key', 'spell_identity_id', 'display_name', 'rules_edition',
    'level', 'school', 'ritual', 'concentration', 'healing',
    'requires_mod_for_effect', 'effect_reliability_category', 'provenance',
    'is_active',
  ],
  subclass_definitions: ['id', 'content_key', 'class_definition_id', 'name', 'rules_edition'],
  subclass_progressions: [
    'id', 'subclass_definition_id', 'class_level', 'cantrips_known',
    'prepared_count', 'max_spell_level',
  ],
  users: ['id', 'name', 'email', 'password'],
  warning_acknowledgements: ['id', 'character_id', 'warning_fingerprint'],
  wizard_spellbook_entries: ['id', 'character_id', 'spell_version_id'],
};

const expectedNamedIndexes: Record<string, string> = {
  background_definitions_content_key_unique:
    'background_definitions:content_key:unique',
  background_definitions_name_rules_edition_unique:
    'background_definitions:name,rules_edition:unique',
  cache_expiration_index: 'cache:expiration',
  cache_locks_expiration_index: 'cache_locks:expiration',
  change_log_character_id_group_id_index: 'change_log:character_id,group_id',
  change_log_character_id_sequence_unique:
    'change_log:character_id,sequence:unique',
  change_log_operation_uuid_index: 'change_log:operation_uuid',
  character_operations_character_id_resulting_revision_index:
    'character_operations:character_id,resulting_revision',
  character_operations_operation_uuid_unique:
    'character_operations:operation_uuid:unique',
  character_rule_overrides_character_id_rule_key_unique:
    'character_rule_overrides:character_id,rule_key:unique',
  character_class_levels_character_id_class_definition_id_unique:
    'character_class_levels:character_id,class_definition_id:unique',
  character_source_instances_character_id_state_index:
    'character_source_instances:character_id,state',
  character_source_instances_id_character_id_unique:
    'character_source_instances:id,character_id:unique',
  character_source_instances_instance_uuid_unique:
    'character_source_instances:instance_uuid:unique',
  character_spell_preferences_character_id_spell_version_id_unique:
    'character_spell_preferences:character_id,spell_version_id:unique',
  class_definitions_content_key_unique:
    'class_definitions:content_key:unique',
  class_definitions_name_rules_edition_unique:
    'class_definitions:name,rules_edition:unique',
  class_progressions_class_definition_id_class_level_unique:
    'class_progressions:class_definition_id,class_level:unique',
  failed_jobs_connection_queue_failed_at_index:
    'failed_jobs:connection,queue,failed_at',
  failed_jobs_uuid_unique: 'failed_jobs:uuid:unique',
  feat_definitions_content_key_unique: 'feat_definitions:content_key:unique',
  feat_definitions_name_rules_edition_unique:
    'feat_definitions:name,rules_edition:unique',
  jobs_queue_index: 'jobs:queue',
  sessions_last_activity_index: 'sessions:last_activity',
  sessions_user_id_index: 'sessions:user_id',
  slots_character_collection_index:
    'spell_selection_slots:character_id,selection_collection',
  species_definitions_content_key_unique:
    'species_definitions:content_key:unique',
  species_definitions_name_rules_edition_unique:
    'species_definitions:name,rules_edition:unique',
  spell_identities_content_key_unique: 'spell_identities:content_key:unique',
  spell_identities_normalized_name_index:
    'spell_identities:normalized_name',
  spell_list_memberships_spell_list_key_index:
    'spell_list_memberships:spell_list_key',
  spell_identity_aliases_normalized_alias_unique:
    'spell_identity_aliases:normalized_alias:unique',
  spell_list_memberships_spell_version_id_spell_list_key_unique:
    'spell_list_memberships:spell_version_id,spell_list_key:unique',
  spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique:
    'spell_loadout_entries:spell_loadout_id,spell_version_id,role:unique',
  spell_selection_slots_character_id_slot_key_unique:
    'spell_selection_slots:character_id,slot_key:unique',
  spell_selection_slots_character_id_bucket_index:
    'spell_selection_slots:character_id,bucket',
  spell_selection_slots_character_id_state_index:
    'spell_selection_slots:character_id,state',
  spell_version_attack_modes_attack_mode_index:
    'spell_version_attack_modes:attack_mode',
  spell_version_attack_modes_spell_version_id_attack_mode_unique:
    'spell_version_attack_modes:spell_version_id,attack_mode:unique',
  spell_version_conditions_condition_type_index:
    'spell_version_conditions:condition_type',
  spell_version_conditions_spell_version_id_condition_type_unique:
    'spell_version_conditions:spell_version_id,condition_type:unique',
  spell_version_damage_types_damage_type_index:
    'spell_version_damage_types:damage_type',
  spell_version_damage_types_spell_version_id_damage_type_unique:
    'spell_version_damage_types:spell_version_id,damage_type:unique',
  spell_version_publications_spell_version_id_source_book_unique:
    'spell_version_publications:spell_version_id,source_book:unique',
  spell_version_save_abilities_save_ability_index:
    'spell_version_save_abilities:save_ability',
  spell_version_save_abilities_spell_version_id_save_ability_unique:
    'spell_version_save_abilities:spell_version_id,save_ability:unique',
  spell_version_tags_spell_version_id_tag_unique:
    'spell_version_tags:spell_version_id,tag:unique',
  spell_version_tags_tag_index: 'spell_version_tags:tag',
  spell_versions_is_active_index: 'spell_versions:is_active',
  spell_versions_content_key_unique: 'spell_versions:content_key:unique',
  spell_versions_rules_edition_level_index:
    'spell_versions:rules_edition,level',
  spell_versions_spell_identity_id_rules_edition_unique:
    'spell_versions:spell_identity_id,rules_edition:unique',
  subclass_definitions_class_definition_id_name_rules_edition_unique:
    'subclass_definitions:class_definition_id,name,rules_edition:unique',
  subclass_definitions_content_key_unique:
    'subclass_definitions:content_key:unique',
  subclass_definitions_id_class_definition_id_unique:
    'subclass_definitions:id,class_definition_id:unique',
  subclass_progressions_subclass_definition_id_class_level_unique:
    'subclass_progressions:subclass_definition_id,class_level:unique',
  users_email_unique: 'users:email:unique',
  warning_acknowledgements_character_id_warning_fingerprint_unique:
    'warning_acknowledgements:character_id,warning_fingerprint:unique',
  wizard_spellbook_entries_character_id_spell_version_id_unique:
    'wizard_spellbook_entries:character_id,spell_version_id:unique',
};

const expectedUniqueGroups: Record<string, string[]> = {
  background_definitions: ['content_key', 'name,rules_edition'],
  change_log: ['character_id,sequence'],
  character_class_levels: ['character_id,class_definition_id'],
  character_operations: ['operation_uuid'],
  character_rule_overrides: ['character_id,rule_key'],
  character_source_instances: ['id,character_id', 'instance_uuid'],
  character_spell_preferences: ['character_id,spell_version_id'],
  class_definitions: ['content_key', 'name,rules_edition'],
  class_progressions: ['class_definition_id,class_level'],
  failed_jobs: ['uuid'],
  feat_definitions: ['content_key', 'name,rules_edition'],
  species_definitions: ['content_key', 'name,rules_edition'],
  spell_identities: ['content_key'],
  spell_identity_aliases: ['normalized_alias'],
  spell_list_memberships: ['spell_version_id,spell_list_key'],
  spell_loadout_entries: ['spell_loadout_id,spell_version_id,role'],
  spell_selection_slots: ['character_id,slot_key'],
  spell_version_attack_modes: ['spell_version_id,attack_mode'],
  spell_version_conditions: ['spell_version_id,condition_type'],
  spell_version_damage_types: ['spell_version_id,damage_type'],
  spell_version_publications: ['spell_version_id,source_book'],
  spell_version_save_abilities: ['spell_version_id,save_ability'],
  spell_version_tags: ['spell_version_id,tag'],
  spell_versions: ['content_key', 'spell_identity_id,rules_edition'],
  subclass_definitions: [
    'class_definition_id,name,rules_edition', 'content_key',
    'id,class_definition_id',
  ],
  subclass_progressions: ['subclass_definition_id,class_level'],
  users: ['email'],
  warning_acknowledgements: ['character_id,warning_fingerprint'],
  wizard_spellbook_entries: ['character_id,spell_version_id'],
};

const expectedDefaults: Record<string, Record<string, string>> = {
  change_log: { reversible: "'1'" },
  character_class_levels: { is_starting_class: "'0'", level: "'1'" },
  character_source_instances: { state: "'active'" },
  character_spell_preferences: { favourite: "'0'" },
  characters: {
    allow_legacy: "'0'", charisma: "'10'", constitution: "'10'",
    dexterity: "'10'", intelligence: "'10'", revision: "'0'",
    rules_edition_preference: "'2024'", strength: "'10'", wisdom: "'10'",
  },
  class_definitions: {
    progression_type: "'none'", supports_ritual_casting: "'0'",
  },
  class_progressions: { cantrips_known: "'0'", prepared_count: "'0'" },
  failed_jobs: { failed_at: 'CURRENT_TIMESTAMP' },
  feat_definitions: { repeatable: "'0'" },
  species_definitions: { repeatable: "'0'" },
  background_definitions: { repeatable: "'0'" },
  spell_selection_slots: {
    always_prepared: "'0'", counts_against_limit: "'1'",
    is_locked: "'0'", ordinal: "'0'", required: "'0'",
    selection_eligibility: "'unselected'", sort_order: "'0'",
    spell_level_max: "'9'", spell_level_min: "'0'", state: "'active'",
    with_slots: "'1'",
  },
  spell_versions: {
    concentration: "'0'", effect_reliability_category: "'fixed_effect'",
    healing: "'0'", is_active: "'1'", provenance: "'import'",
    requires_mod_for_effect: "'0'", ritual: "'0'",
  },
  subclass_progressions: {
    cantrips_known: "'0'", max_spell_level: "'0'", prepared_count: "'0'",
  },
};

const expectedForeignKeys: Record<string, string[]> = {
  change_log: ['character_id->characters.id|CASCADE'],
  character_class_levels: [
    'character_id->characters.id|CASCADE',
    'class_definition_id->class_definitions.id|NO ACTION',
    'subclass_definition_id,class_definition_id->subclass_definitions.id,class_definition_id|NO ACTION',
  ],
  character_operations: ['character_id->characters.id|CASCADE'],
  character_rule_overrides: ['character_id->characters.id|CASCADE'],
  character_save_points: ['character_id->characters.id|CASCADE'],
  character_source_instances: [
    'character_id->characters.id|CASCADE',
    'parent_source_instance_id->character_source_instances.id|SET NULL',
  ],
  character_spell_preferences: [
    'character_id->characters.id|CASCADE',
    'spell_version_id->spell_versions.id|NO ACTION',
  ],
  class_progressions: ['class_definition_id->class_definitions.id|CASCADE'],
  spell_identity_aliases: [
    'spell_identity_id->spell_identities.id|CASCADE',
  ],
  spell_list_memberships: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_loadout_entries: [
    'spell_loadout_id->spell_loadouts.id|CASCADE',
    'spell_version_id->spell_versions.id|NO ACTION',
  ],
  spell_loadouts: ['character_id->characters.id|CASCADE'],
  spell_selection_slots: [
    'character_id->characters.id|CASCADE',
    'current_spell_version_id->spell_versions.id|NO ACTION',
    'fixed_spell_version_id->spell_versions.id|NO ACTION',
    'source_instance_id,character_id->character_source_instances.id,character_id|CASCADE',
  ],
  spell_version_attack_modes: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_conditions: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_damage_types: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_publications: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_save_abilities: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_tags: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_versions: ['spell_identity_id->spell_identities.id|CASCADE'],
  subclass_definitions: ['class_definition_id->class_definitions.id|CASCADE'],
  subclass_progressions: [
    'subclass_definition_id->subclass_definitions.id|CASCADE',
  ],
  warning_acknowledgements: ['character_id->characters.id|CASCADE'],
  wizard_spellbook_entries: [
    'character_id->characters.id|CASCADE',
    'spell_version_id->spell_versions.id|NO ACTION',
  ],
};

let sqlite3: Sqlite3Static;
const openDatabases: Database[] = [];

function openDb(schemaSql: string): Database {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  openDatabases.push(db);
  db.exec(schemaSql);
  return db;
}

function rows(db: Database, sql: string): SqlRow[] {
  return db.selectObjects(sql) as SqlRow[];
}

function indexColumns(db: Database, indexName: string): string {
  return rows(db, `PRAGMA index_info("${indexName}")`)
    .sort((left, right) => Number(left.seqno) - Number(right.seqno))
    .map((row) => String(row.name))
    .join(',');
}

function uniqueGroups(db: Database, table: string): string[] {
  return rows(db, `PRAGMA index_list("${table}")`)
    .filter((row) => Number(row.unique) === 1 && row.origin !== 'pk')
    .map((row) => indexColumns(db, String(row.name)))
    .sort();
}

function foreignKeys(db: Database, table: string): string[] {
  const grouped = new Map<number, SqlRow[]>();
  for (const row of rows(db, `PRAGMA foreign_key_list("${table}")`)) {
    const id = Number(row.id);
    grouped.set(id, [...(grouped.get(id) ?? []), row]);
  }

  return [...grouped.values()]
    .map((group) => {
      const ordered = group.sort(
        (left, right) => Number(left.seq) - Number(right.seq),
      );
      const from = ordered.map((row) => String(row.from)).join(',');
      const to = ordered.map((row) => String(row.to)).join(',');
      return `${from}->${String(ordered[0]!.table)}.${to}|${String(ordered[0]!.on_delete)}`;
    })
    .sort();
}

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

afterAll(() => {
  for (const db of openDatabases) {
    db.close();
  }
});

// Every expectation above is transcribed from the Laravel migrations and is
// independent of how the artifact is produced. Running the SAME expectations
// against each artifact is what makes the generated schema's parity provable
// rather than assumed.
for (const [sourceLabel, schemaSql] of schemaSources) {
describe(`complete final migration schema (${sourceLabel})`, () => {
  it('creates the exact 38-table final inventory and every final column', () => {
    const db = openDb(schemaSql);
    const tables = db.selectValues(
      `SELECT name
       FROM sqlite_schema
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    );

    expect(tables).toEqual(Object.keys(expectedColumns).sort());
    for (const [table, columns] of Object.entries(expectedColumns)) {
      const metadata = rows(db, `PRAGMA table_info("${table}")`);
      expect(
        metadata.map((row) => row.name),
        `columns for ${table}`,
      ).toEqual(columns);
      expect(
        metadata
          .filter((row) => Number(row.notnull) === 1)
          .map((row) => String(row.name)),
        `NOT NULL columns for ${table}`,
      ).toEqual(expectedNotNull[table]);
    }
    const metadataSignature = tables.map((table) => [
      table,
      rows(db, `PRAGMA table_info("${String(table)}")`).map((column) => [
        column.name,
        String(column.type).toLowerCase(),
        Number(column.notnull),
        column.dflt_value,
        Number(column.pk),
      ]),
    ]);
    expect(
      createHash('sha256')
        .update(JSON.stringify(metadataSignature))
        .digest('hex'),
    ).toBe(laravelColumnMetadataHash);

    expect(tables).not.toContain('wizard_prepared_entries');
    expect(expectedColumns.wizard_spellbook_entries).not.toContain('acquisition');
    expect(expectedColumns.spell_selection_slots).toContain(
      'selection_eligibility',
    );
  });

  it('materializes every named index, unique key, and migrated default', () => {
    const db = openDb(schemaSql);
    const actualNamedIndexes: Record<string, string> = {};
    for (const index of rows(
      db,
      `SELECT name, tbl_name
       FROM sqlite_schema
       WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )) {
      const name = String(index.name);
      const unique = rows(
        db,
        `PRAGMA index_list("${String(index.tbl_name)}")`,
      ).find((candidate) => candidate.name === name)?.unique;
      actualNamedIndexes[name] =
        `${String(index.tbl_name)}:${indexColumns(db, name)}` +
        (Number(unique) === 1 ? ':unique' : '');
    }
    expect(actualNamedIndexes).toEqual(expectedNamedIndexes);

    for (const table of Object.keys(expectedColumns)) {
      expect(uniqueGroups(db, table), `unique keys for ${table}`).toEqual(
        [...(expectedUniqueGroups[table] ?? [])].sort(),
      );
    }

    for (const [table, expected] of Object.entries(expectedDefaults)) {
      const actual = Object.fromEntries(
        rows(db, `PRAGMA table_info("${table}")`)
          .filter((row) => row.dflt_value !== null)
          .map((row) => [String(row.name), String(row.dflt_value)]),
      );
      expect(actual, `defaults for ${table}`).toEqual(expected);
    }
  });

  it('declares every migrated foreign key with its composite shape and action', () => {
    const db = openDb(schemaSql);
    for (const table of Object.keys(expectedColumns)) {
      expect(foreignKeys(db, table), `foreign keys for ${table}`).toEqual(
        [...(expectedForeignKeys[table] ?? [])].sort(),
      );
    }
  });

  it('persists SET NULL and CASCADE effects and rejects duplicate operations', () => {
    const db = openDb(schemaSql);
    db.exec(`
      INSERT INTO characters (name) VALUES ('Schema Character');
      INSERT INTO character_source_instances
        (character_id, instance_uuid, source_type, display_name)
      VALUES (1, 'parent', 'species', 'Human');
      INSERT INTO character_source_instances
        (character_id, instance_uuid, parent_source_instance_id, source_type, display_name)
      VALUES (1, 'child', 1, 'feat', 'Magic Initiate');
      INSERT INTO character_operations
        (character_id, operation_uuid, expected_revision, resulting_revision, inverse_command)
      VALUES (1, 'operation-1', 0, 1, '{"type":"restore_snapshot"}');
      DELETE FROM character_source_instances WHERE id = 1;
    `);

    expect(
      rows(
        db,
        `SELECT id, parent_source_instance_id
         FROM character_source_instances`,
      ),
    ).toEqual([{ id: 2, parent_source_instance_id: null }]);

    expect(() =>
      db.exec(`
        INSERT INTO character_operations
          (character_id, operation_uuid, expected_revision, resulting_revision, inverse_command)
        VALUES (1, 'operation-1', 1, 2, '{}');
      `),
    ).toThrow(/UNIQUE constraint failed: character_operations\.operation_uuid/);

    db.exec('DELETE FROM characters WHERE id = 1');
    expect(
      db.selectValue('SELECT count(*) FROM character_source_instances'),
    ).toBe(0);
    expect(db.selectValue('SELECT count(*) FROM character_operations')).toBe(0);
  });
});
}
