CREATE INDEX `spell_selection_slots_fixed_spell_version_index`
ON `spell_selection_slots` (`fixed_spell_version_id`)
WHERE fixed_spell_version_id IS NOT NULL;

CREATE INDEX `spell_selection_slots_current_spell_version_index`
ON `spell_selection_slots` (`current_spell_version_id`)
WHERE current_spell_version_id IS NOT NULL;

CREATE INDEX `spell_selection_slots_source_state_index`
ON `spell_selection_slots` (`source_instance_id`,`state`);

CREATE INDEX `character_source_instances_parent_index`
ON `character_source_instances` (`parent_source_instance_id`)
WHERE parent_source_instance_id IS NOT NULL;
