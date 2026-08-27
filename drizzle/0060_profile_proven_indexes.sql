CREATE INDEX `source_instances_definition_state_character_index`
ON `character_source_instances`
  (`source_type`,`source_definition_id`,`state`,`character_id`);

CREATE INDEX `wizard_spellbook_entries_spell_active_cover`
ON `wizard_spellbook_entries`
  (`spell_version_id`,`state`,`character_id`,`source_instance_id`)
WHERE spell_version_id IS NOT NULL;

CREATE INDEX `spell_loadout_entries_spell_loadout_index`
ON `spell_loadout_entries` (`spell_version_id`,`spell_loadout_id`);

CREATE INDEX `character_spell_preferences_spell_character_index`
ON `character_spell_preferences` (`spell_version_id`,`character_id`);

CREATE INDEX `background_equipment_items_weapon_index`
ON `background_equipment_items` (`weapon_template_id`)
WHERE weapon_template_id IS NOT NULL;

CREATE INDEX `class_equipment_items_weapon_index`
ON `class_equipment_items` (`weapon_template_id`)
WHERE weapon_template_id IS NOT NULL;

CREATE INDEX `character_class_levels_definition_character_index`
ON `character_class_levels` (`class_definition_id`,`character_id`);

CREATE INDEX `class_feature_effects_definition_level_name_index`
ON `class_feature_effects` (`class_definition_id`,`class_level`,`name`);

CREATE INDEX `character_class_levels_subclass_character_index`
ON `character_class_levels` (`subclass_definition_id`,`character_id`)
WHERE subclass_definition_id IS NOT NULL;

CREATE INDEX `background_equipment_items_armor_index`
ON `background_equipment_items` (`armor_template_id`)
WHERE armor_template_id IS NOT NULL;

CREATE INDEX `class_equipment_items_armor_index`
ON `class_equipment_items` (`armor_template_id`)
WHERE armor_template_id IS NOT NULL;

CREATE INDEX `character_class_levels_character_id_id_index`
ON `character_class_levels` (`character_id`,`id`);

CREATE INDEX `party_document_states_character_index`
ON `party_document_states` (`character_id`)
WHERE character_id IS NOT NULL;

CREATE INDEX `wizard_entries_active_order_index`
ON `wizard_spellbook_entries`
  (`character_id`,`source_instance_id`,`rule_key`,`ordinal`,`id`,`spell_version_id`)
WHERE state = 'active';

CREATE INDEX `character_effects_character_sort_index`
ON `character_effects` (`character_id`,`sort_order`,`id`);

CREATE INDEX `catalog_identities_layer_kind_key_index`
ON `catalog_content_identities`
  (`catalog_layer`,`content_kind`,`content_key`);

CREATE INDEX `character_species_traits_character_sort_index`
ON `character_species_traits` (`character_id`,`sort_order`,`id`);

CREATE INDEX `character_items_character_name_index`
ON `character_items` (`character_id`,`name`,`id`);

CREATE INDEX `expertise_grants_active_order_index`
ON `character_skill_expertise_grants`
  (`character_id`,`source_instance_id`,`grant_key`,`ordinal`,`id`)
WHERE state = 'active';

CREATE INDEX `skill_grants_active_order_index`
ON `character_skill_grants`
  (`character_id`,`source_instance_id`,`grant_key`,`ordinal`,`id`)
WHERE state = 'active';

CREATE INDEX `source_instances_active_display_index`
ON `character_source_instances`
  (`character_id`,`source_type`,`display_name`,`id`)
WHERE state = 'active';

CREATE INDEX `catalog_replacement_choices_successor_index`
ON `catalog_content_replacement_choices`
  (`content_kind`,`successor_content_key`,`character_id`);

CREATE INDEX `catalog_match_decisions_reviewed_kind_digest_index`
ON `catalog_content_match_decisions`
  ("reviewed_at" desc,`content_kind`,`incoming_fingerprint_digest`);

CREATE INDEX `catalog_archive_members_character_kind_key_index`
ON `catalog_content_archive_members`
  (`character_id`,`content_kind`,`content_key`);
