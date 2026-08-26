CREATE INDEX `character_save_points_character_id_id_index`
ON `character_save_points` (`character_id`,"id" desc);

CREATE INDEX `character_effects_source_character_index`
ON `character_effects` (`source_instance_id`,`character_id`)
WHERE source_instance_id IS NOT NULL;

CREATE INDEX `character_items_source_character_index`
ON `character_items` (`source_instance_id`,`character_id`)
WHERE source_instance_id IS NOT NULL;

CREATE INDEX `character_level_feat_choices_source_character_index`
ON `character_level_feat_choices` (`feat_source_instance_id`,`character_id`)
WHERE feat_source_instance_id IS NOT NULL;

CREATE INDEX `background_templates_default_origin_feat_index`
ON `background_templates` (`default_origin_feat_content_key`)
WHERE default_origin_feat_content_key IS NOT NULL;

CREATE INDEX `spell_identity_aliases_identity_alias_index`
ON `spell_identity_aliases`
  (`spell_identity_id`,`normalized_alias`,`alias`);

CREATE INDEX `catalog_match_decisions_target_index`
ON `catalog_content_match_decisions` (`content_kind`,`target_content_key`);

CREATE INDEX `catalog_content_aliases_target_index`
ON `catalog_content_aliases` (`content_kind`,`content_key`,`alias_key`);
