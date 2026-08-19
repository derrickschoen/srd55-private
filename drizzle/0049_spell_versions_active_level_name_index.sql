DROP INDEX `spell_versions_is_active_index`;

CREATE INDEX `spell_versions_active_level_name_index`
ON `spell_versions` (`is_active`,`level`,`display_name`);
