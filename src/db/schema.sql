PRAGMA foreign_keys = ON;

-- Final browser schema corresponding to the final state of every Laravel
-- migration. Laravel-only infrastructure tables remain represented so database
-- import/export can round-trip a complete project database without data loss.

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    email_verified_at DATETIME,
    password VARCHAR NOT NULL,
    remember_token VARCHAR,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE password_reset_tokens (
    email VARCHAR PRIMARY KEY NOT NULL,
    token VARCHAR NOT NULL,
    created_at DATETIME
);

CREATE TABLE sessions (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id INTEGER,
    ip_address VARCHAR,
    user_agent TEXT,
    payload TEXT NOT NULL,
    last_activity INTEGER NOT NULL
);
CREATE INDEX sessions_user_id_index ON sessions (user_id);
CREATE INDEX sessions_last_activity_index ON sessions (last_activity);

CREATE TABLE cache (
    key VARCHAR PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    expiration INTEGER NOT NULL
);
CREATE INDEX cache_expiration_index ON cache (expiration);

CREATE TABLE cache_locks (
    key VARCHAR PRIMARY KEY NOT NULL,
    owner VARCHAR NOT NULL,
    expiration INTEGER NOT NULL
);
CREATE INDEX cache_locks_expiration_index ON cache_locks (expiration);

CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    queue VARCHAR NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    reserved_at INTEGER,
    available_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX jobs_queue_index ON jobs (queue);

CREATE TABLE job_batches (
    id VARCHAR PRIMARY KEY NOT NULL,
    name VARCHAR NOT NULL,
    total_jobs INTEGER NOT NULL,
    pending_jobs INTEGER NOT NULL,
    failed_jobs INTEGER NOT NULL,
    failed_job_ids TEXT NOT NULL,
    options TEXT,
    cancelled_at INTEGER,
    created_at INTEGER NOT NULL,
    finished_at INTEGER
);

CREATE TABLE failed_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    uuid VARCHAR NOT NULL,
    connection VARCHAR NOT NULL,
    queue VARCHAR NOT NULL,
    payload TEXT NOT NULL,
    exception TEXT NOT NULL,
    failed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX failed_jobs_uuid_unique ON failed_jobs (uuid);
CREATE INDEX failed_jobs_connection_queue_failed_at_index
    ON failed_jobs (connection, queue, failed_at);

CREATE TABLE spell_identities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    content_key VARCHAR NOT NULL,
    canonical_name VARCHAR NOT NULL,
    normalized_name VARCHAR NOT NULL,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE UNIQUE INDEX spell_identities_content_key_unique
    ON spell_identities (content_key);
CREATE INDEX spell_identities_normalized_name_index
    ON spell_identities (normalized_name);

CREATE TABLE spell_identity_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_identity_id INTEGER NOT NULL,
    alias VARCHAR NOT NULL,
    normalized_alias VARCHAR NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (spell_identity_id) REFERENCES spell_identities (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_identity_aliases_normalized_alias_unique
    ON spell_identity_aliases (normalized_alias);

CREATE TABLE spell_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    content_key VARCHAR NOT NULL,
    spell_identity_id INTEGER NOT NULL,
    display_name VARCHAR NOT NULL,
    rules_edition VARCHAR NOT NULL,
    level INTEGER NOT NULL,
    school VARCHAR NOT NULL,
    ritual TINYINT(1) NOT NULL DEFAULT '0',
    concentration TINYINT(1) NOT NULL DEFAULT '0',
    casting_time VARCHAR,
    action_type VARCHAR,
    range VARCHAR,
    duration VARCHAR,
    components VARCHAR,
    material_component_summary TEXT,
    healing TINYINT(1) NOT NULL DEFAULT '0',
    short_summary TEXT,
    upcast_type VARCHAR,
    upcast_summary TEXT,
    requires_mod_for_effect TINYINT(1) NOT NULL DEFAULT '0',
    effect_reliability_category VARCHAR NOT NULL DEFAULT 'fixed_effect',
    provenance VARCHAR NOT NULL DEFAULT 'import',
    seed_version VARCHAR,
    is_active TINYINT(1) NOT NULL DEFAULT '1',
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (spell_identity_id) REFERENCES spell_identities (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_versions_content_key_unique
    ON spell_versions (content_key);
CREATE UNIQUE INDEX spell_versions_spell_identity_id_rules_edition_unique
    ON spell_versions (spell_identity_id, rules_edition);
CREATE INDEX spell_versions_rules_edition_level_index
    ON spell_versions (rules_edition, level);
CREATE INDEX spell_versions_is_active_index ON spell_versions (is_active);

CREATE TABLE spell_version_publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_version_id INTEGER NOT NULL,
    source_book VARCHAR NOT NULL,
    source_page INTEGER,
    source_reference VARCHAR,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_version_publications_spell_version_id_source_book_unique
    ON spell_version_publications (spell_version_id, source_book);

CREATE TABLE spell_list_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_version_id INTEGER NOT NULL,
    spell_list_key VARCHAR NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_list_memberships_spell_version_id_spell_list_key_unique
    ON spell_list_memberships (spell_version_id, spell_list_key);
CREATE INDEX spell_list_memberships_spell_list_key_index
    ON spell_list_memberships (spell_list_key);

CREATE TABLE spell_version_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_version_id INTEGER NOT NULL,
    tag VARCHAR NOT NULL,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_version_tags_spell_version_id_tag_unique
    ON spell_version_tags (spell_version_id, tag);
CREATE INDEX spell_version_tags_tag_index ON spell_version_tags (tag);

CREATE TABLE spell_version_damage_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_version_id INTEGER NOT NULL,
    damage_type VARCHAR NOT NULL,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_version_damage_types_spell_version_id_damage_type_unique
    ON spell_version_damage_types (spell_version_id, damage_type);
CREATE INDEX spell_version_damage_types_damage_type_index
    ON spell_version_damage_types (damage_type);

CREATE TABLE spell_version_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_version_id INTEGER NOT NULL,
    condition_type VARCHAR NOT NULL,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_version_conditions_spell_version_id_condition_type_unique
    ON spell_version_conditions (spell_version_id, condition_type);
CREATE INDEX spell_version_conditions_condition_type_index
    ON spell_version_conditions (condition_type);

CREATE TABLE spell_version_attack_modes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_version_id INTEGER NOT NULL,
    attack_mode VARCHAR NOT NULL,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_version_attack_modes_spell_version_id_attack_mode_unique
    ON spell_version_attack_modes (spell_version_id, attack_mode);
CREATE INDEX spell_version_attack_modes_attack_mode_index
    ON spell_version_attack_modes (attack_mode);

CREATE TABLE spell_version_save_abilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_version_id INTEGER NOT NULL,
    save_ability VARCHAR NOT NULL,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX spell_version_save_abilities_spell_version_id_save_ability_unique
    ON spell_version_save_abilities (spell_version_id, save_ability);
CREATE INDEX spell_version_save_abilities_save_ability_index
    ON spell_version_save_abilities (save_ability);

CREATE TABLE class_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    content_key VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    rules_edition VARCHAR NOT NULL,
    spellcasting_ability VARCHAR,
    progression_type VARCHAR NOT NULL DEFAULT 'none',
    caster_fraction VARCHAR,
    caster_rounding VARCHAR,
    prepares_or_knows VARCHAR,
    supports_ritual_casting TINYINT(1) NOT NULL DEFAULT '0',
    ritual_casting_mode VARCHAR,
    primary_ability_expression TEXT,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE UNIQUE INDEX class_definitions_content_key_unique
    ON class_definitions (content_key);
CREATE UNIQUE INDEX class_definitions_name_rules_edition_unique
    ON class_definitions (name, rules_edition);

CREATE TABLE class_progressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    class_definition_id INTEGER NOT NULL,
    class_level INTEGER NOT NULL,
    cantrips_known INTEGER NOT NULL DEFAULT '0',
    prepared_count INTEGER NOT NULL DEFAULT '0',
    slots TEXT,
    pact_slots TEXT,
    grant_rules TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (class_definition_id) REFERENCES class_definitions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX class_progressions_class_definition_id_class_level_unique
    ON class_progressions (class_definition_id, class_level);

CREATE TABLE subclass_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    content_key VARCHAR NOT NULL,
    class_definition_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    rules_edition VARCHAR NOT NULL,
    spellcasting_ability VARCHAR,
    caster_fraction VARCHAR,
    caster_rounding VARCHAR,
    grant_rules TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (class_definition_id) REFERENCES class_definitions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX subclass_definitions_content_key_unique
    ON subclass_definitions (content_key);
CREATE UNIQUE INDEX subclass_definitions_class_definition_id_name_rules_edition_unique
    ON subclass_definitions (class_definition_id, name, rules_edition);
CREATE UNIQUE INDEX subclass_definitions_id_class_definition_id_unique
    ON subclass_definitions (id, class_definition_id);

CREATE TABLE feat_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    content_key VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    rules_edition VARCHAR NOT NULL,
    category VARCHAR,
    repeatable TINYINT(1) NOT NULL DEFAULT '0',
    prerequisites TEXT,
    grant_rules TEXT,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE UNIQUE INDEX feat_definitions_content_key_unique
    ON feat_definitions (content_key);
CREATE UNIQUE INDEX feat_definitions_name_rules_edition_unique
    ON feat_definitions (name, rules_edition);

CREATE TABLE species_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    content_key VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    rules_edition VARCHAR NOT NULL,
    category VARCHAR,
    repeatable TINYINT(1) NOT NULL DEFAULT '0',
    prerequisites TEXT,
    grant_rules TEXT,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE UNIQUE INDEX species_definitions_content_key_unique
    ON species_definitions (content_key);
CREATE UNIQUE INDEX species_definitions_name_rules_edition_unique
    ON species_definitions (name, rules_edition);

CREATE TABLE background_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    content_key VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    rules_edition VARCHAR NOT NULL,
    category VARCHAR,
    repeatable TINYINT(1) NOT NULL DEFAULT '0',
    prerequisites TEXT,
    grant_rules TEXT,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE UNIQUE INDEX background_definitions_content_key_unique
    ON background_definitions (content_key);
CREATE UNIQUE INDEX background_definitions_name_rules_edition_unique
    ON background_definitions (name, rules_edition);

CREATE TABLE characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name VARCHAR NOT NULL,
    strength INTEGER NOT NULL DEFAULT '10',
    dexterity INTEGER NOT NULL DEFAULT '10',
    constitution INTEGER NOT NULL DEFAULT '10',
    intelligence INTEGER NOT NULL DEFAULT '10',
    wisdom INTEGER NOT NULL DEFAULT '10',
    charisma INTEGER NOT NULL DEFAULT '10',
    proficiency_bonus_override INTEGER,
    rules_edition_preference VARCHAR NOT NULL DEFAULT '2024',
    allow_legacy TINYINT(1) NOT NULL DEFAULT '0',
    revision INTEGER NOT NULL DEFAULT '0',
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE character_source_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    instance_uuid VARCHAR NOT NULL,
    parent_source_instance_id INTEGER,
    source_type VARCHAR NOT NULL,
    source_definition_id INTEGER,
    display_name VARCHAR NOT NULL,
    config TEXT,
    acquired_at_character_level INTEGER,
    state VARCHAR NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_source_instance_id)
        REFERENCES character_source_instances (id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX character_source_instances_instance_uuid_unique
    ON character_source_instances (instance_uuid);
CREATE INDEX character_source_instances_character_id_state_index
    ON character_source_instances (character_id, state);
CREATE UNIQUE INDEX character_source_instances_id_character_id_unique
    ON character_source_instances (id, character_id);

CREATE TABLE character_class_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    class_definition_id INTEGER NOT NULL,
    subclass_definition_id INTEGER,
    level INTEGER NOT NULL DEFAULT '1',
    is_starting_class TINYINT(1) NOT NULL DEFAULT '0',
    spellcasting_ability_override VARCHAR,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
    FOREIGN KEY (class_definition_id) REFERENCES class_definitions (id),
    FOREIGN KEY (subclass_definition_id, class_definition_id)
        REFERENCES subclass_definitions (id, class_definition_id)
);
CREATE UNIQUE INDEX character_class_levels_character_id_class_definition_id_unique
    ON character_class_levels (character_id, class_definition_id);

CREATE TABLE spell_selection_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    source_instance_id INTEGER NOT NULL,
    slot_key VARCHAR NOT NULL,
    rule_key VARCHAR NOT NULL,
    ordinal INTEGER NOT NULL DEFAULT '0',
    bucket VARCHAR NOT NULL,
    eligibility_kind VARCHAR NOT NULL,
    fixed_spell_version_id INTEGER,
    current_spell_version_id INTEGER,
    label VARCHAR,
    spell_level_min INTEGER NOT NULL DEFAULT '0',
    spell_level_max INTEGER NOT NULL DEFAULT '9',
    allowed_spell_lists TEXT,
    allowed_schools TEXT,
    allowed_tags TEXT,
    always_prepared TINYINT(1) NOT NULL DEFAULT '0',
    with_slots TINYINT(1) NOT NULL DEFAULT '1',
    free_cast TEXT,
    counts_against_limit TINYINT(1) NOT NULL DEFAULT '1',
    required TINYINT(1) NOT NULL DEFAULT '0',
    is_locked TINYINT(1) NOT NULL DEFAULT '0',
    state VARCHAR NOT NULL DEFAULT 'active',
    orphan_reason_code VARCHAR,
    orphaned_by_change_group_id INTEGER,
    orphaned_at DATETIME,
    prior_config TEXT,
    override_note TEXT,
    sort_order INTEGER NOT NULL DEFAULT '0',
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    selection_collection VARCHAR,
    selection_eligibility VARCHAR NOT NULL DEFAULT 'unselected',
    selection_invalid_reason TEXT,
    CONSTRAINT spell_slots_exclusive_assignment_check
        CHECK (fixed_spell_version_id IS NULL OR current_spell_version_id IS NULL),
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
    FOREIGN KEY (source_instance_id, character_id)
        REFERENCES character_source_instances (id, character_id) ON DELETE CASCADE,
    FOREIGN KEY (fixed_spell_version_id) REFERENCES spell_versions (id),
    FOREIGN KEY (current_spell_version_id) REFERENCES spell_versions (id)
);
CREATE UNIQUE INDEX spell_selection_slots_character_id_slot_key_unique
    ON spell_selection_slots (character_id, slot_key);
CREATE INDEX spell_selection_slots_character_id_state_index
    ON spell_selection_slots (character_id, state);
CREATE INDEX spell_selection_slots_character_id_bucket_index
    ON spell_selection_slots (character_id, bucket);
CREATE INDEX slots_character_collection_index
    ON spell_selection_slots (character_id, selection_collection);

-- The final migration removes provenance/cost/source columns: the spellbook is
-- now only a per-character set of acquired spell versions.
CREATE TABLE wizard_spellbook_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    spell_version_id INTEGER NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id)
);
CREATE UNIQUE INDEX wizard_spellbook_entries_character_id_spell_version_id_unique
    ON wizard_spellbook_entries (character_id, spell_version_id);

CREATE TABLE change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    group_id VARCHAR,
    operation_uuid VARCHAR,
    entity_type VARCHAR NOT NULL,
    entity_id INTEGER,
    previous_value TEXT,
    new_value TEXT,
    reason VARCHAR,
    action_type VARCHAR NOT NULL,
    reversible TINYINT(1) NOT NULL DEFAULT '1',
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX change_log_character_id_sequence_unique
    ON change_log (character_id, sequence);
CREATE INDEX change_log_character_id_group_id_index
    ON change_log (character_id, group_id);
CREATE INDEX change_log_operation_uuid_index ON change_log (operation_uuid);

CREATE TABLE character_save_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    label VARCHAR NOT NULL,
    snapshot TEXT NOT NULL,
    schema_version VARCHAR NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
);

CREATE TABLE warning_acknowledgements (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    warning_fingerprint VARCHAR NOT NULL,
    note TEXT,
    invalidated_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX warning_acknowledgements_character_id_warning_fingerprint_unique
    ON warning_acknowledgements (character_id, warning_fingerprint);

CREATE TABLE spell_loadouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
);

CREATE TABLE spell_loadout_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    spell_loadout_id INTEGER NOT NULL,
    spell_version_id INTEGER NOT NULL,
    role VARCHAR NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (spell_loadout_id) REFERENCES spell_loadouts (id) ON DELETE CASCADE,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id)
);
CREATE UNIQUE INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique
    ON spell_loadout_entries (spell_loadout_id, spell_version_id, role);

CREATE TABLE character_spell_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    spell_version_id INTEGER NOT NULL,
    favourite TINYINT(1) NOT NULL DEFAULT '0',
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE,
    FOREIGN KEY (spell_version_id) REFERENCES spell_versions (id)
);
CREATE UNIQUE INDEX character_spell_preferences_character_id_spell_version_id_unique
    ON character_spell_preferences (character_id, spell_version_id);

CREATE TABLE character_rule_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    rule_key VARCHAR NOT NULL,
    value TEXT NOT NULL,
    note TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX character_rule_overrides_character_id_rule_key_unique
    ON character_rule_overrides (character_id, rule_key);

CREATE TABLE subclass_progressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    subclass_definition_id INTEGER NOT NULL,
    class_level INTEGER NOT NULL,
    cantrips_known INTEGER NOT NULL DEFAULT '0',
    prepared_count INTEGER NOT NULL DEFAULT '0',
    max_spell_level INTEGER NOT NULL DEFAULT '0',
    slots TEXT,
    grant_rules TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (subclass_definition_id)
        REFERENCES subclass_definitions (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX subclass_progressions_subclass_definition_id_class_level_unique
    ON subclass_progressions (subclass_definition_id, class_level);

CREATE TABLE character_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    character_id INTEGER NOT NULL,
    operation_uuid VARCHAR NOT NULL,
    expected_revision INTEGER NOT NULL,
    resulting_revision INTEGER NOT NULL,
    inverse_command TEXT NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX character_operations_operation_uuid_unique
    ON character_operations (operation_uuid);
CREATE INDEX character_operations_character_id_resulting_revision_index
    ON character_operations (character_id, resulting_revision);

CREATE TRIGGER spell_slots_exclusive_assignment_insert
    BEFORE INSERT ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;

CREATE TRIGGER spell_slots_exclusive_assignment_update
    BEFORE UPDATE ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;
