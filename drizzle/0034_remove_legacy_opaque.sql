-- D205 / CI-4b: the zero-user window makes pre-assertion catalog content
-- disposable. Capture the closed legacy set once, delete every database row
-- that can keep one of its aggregates alive, then remove the classification
-- from the schema. Share fragments can contain these keys outside the
-- database; D205 accepts that as a non-issue because no real fragments exist.
CREATE TEMP TABLE `ci4b_legacy_identities` AS
SELECT `content_key`, `content_kind`
FROM `catalog_content_identities`
WHERE `key_kind` = 'legacy-opaque';

-- The aggregate-parent graph in the through-0033 schema has one edge:
-- class_definitions -> subclass_definitions. Close the wipe over that edge so
-- a child is debris whenever its parent is debris, regardless of the child's
-- own identity classification. UNION makes the recursive walk cycle-safe and
-- keeps this correct if another class/subclass level is present in the image.
WITH RECURSIVE `ci4b_aggregate_wipe` (`content_key`, `content_kind`) AS (
  SELECT `content_key`, `content_kind` FROM `ci4b_legacy_identities`
  UNION
  SELECT child.`content_key`, 'subclass'
  FROM `subclass_definitions` AS child
  JOIN `class_definitions` AS parent
    ON parent.`id` = child.`class_definition_id`
  JOIN `ci4b_aggregate_wipe` AS wiped_parent
    ON wiped_parent.`content_kind` = 'class'
   AND wiped_parent.`content_key` = parent.`content_key`
)
INSERT INTO `ci4b_legacy_identities` (`content_key`, `content_kind`)
SELECT wiped.`content_key`, wiped.`content_kind`
FROM `ci4b_aggregate_wipe` AS wiped
WHERE NOT EXISTS (
  SELECT 1 FROM `ci4b_legacy_identities` AS already_wiped
  WHERE already_wiped.`content_key` = wiped.`content_key`
    AND already_wiped.`content_kind` = wiped.`content_kind`
);

-- History is character-scoped, while the references inside it are JSON. A
-- conservative scalar scan below marks the whole character timeline when a
-- snapshot/inverse contains any wiped aggregate id or key. Numeric ids are
-- intentionally not field-name-filtered: a coincidental match may discard
-- extra development history, but a real pre-0034 reference cannot escape.
CREATE TEMP TABLE `ci4b_wiped_aggregate_ids` (`id` INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO `ci4b_wiped_aggregate_ids` (`id`)
SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'class' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `subclass_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'subclass' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `feat_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'feat' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `species_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'species' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `species_templates` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'species' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `background_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'background' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `background_templates` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'background' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'spell' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `weapon_templates` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'weapon' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `armor_templates` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'armor' AND wiped.`content_key` = root.`content_key`
UNION SELECT root.`id` FROM `item_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'item' AND wiped.`content_key` = root.`content_key`;

-- The source-definition relation is polymorphic and therefore has no FK.
-- Resolve each supported source kind semantically, then take the recursive
-- parent_source_instance_id closure so non-wiped child classifications cannot
-- leave a dangling descendant behind.
CREATE TEMP TABLE `ci4b_wiped_source_instances` (
  `id` INTEGER PRIMARY KEY,
  `character_id` INTEGER NOT NULL
);
WITH RECURSIVE `ci4b_source_wipe` (`id`, `character_id`) AS (
  SELECT source.`id`, source.`character_id`
  FROM `character_source_instances` AS source
  WHERE (source.`source_type` = 'class' AND source.`source_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'class' AND wiped.`content_key` = root.`content_key`))
     OR (source.`source_type` = 'subclass' AND source.`source_definition_id` IN (SELECT root.`id` FROM `subclass_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'subclass' AND wiped.`content_key` = root.`content_key`))
     OR (source.`source_type` = 'feat' AND source.`source_definition_id` IN (SELECT root.`id` FROM `feat_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'feat' AND wiped.`content_key` = root.`content_key`))
     OR (source.`source_type` = 'species' AND source.`source_definition_id` IN (SELECT root.`id` FROM `species_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'species' AND wiped.`content_key` = root.`content_key`))
     OR (source.`source_type` = 'background' AND source.`source_definition_id` IN (SELECT root.`id` FROM `background_definitions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'background' AND wiped.`content_key` = root.`content_key`))
  UNION
  SELECT child.`id`, child.`character_id`
  FROM `character_source_instances` AS child
  JOIN `ci4b_source_wipe` AS parent
    ON parent.`id` = child.`parent_source_instance_id`
)
INSERT INTO `ci4b_wiped_source_instances` (`id`, `character_id`)
SELECT `id`, `character_id` FROM `ci4b_source_wipe`;

CREATE TEMP TABLE `ci4b_affected_characters` (`id` INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT `character_id` FROM `ci4b_wiped_source_instances`;
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT held.`character_id` FROM `character_class_levels` AS held
LEFT JOIN `class_definitions` AS class_root ON class_root.`id` = held.`class_definition_id`
LEFT JOIN `subclass_definitions` AS subclass_root ON subclass_root.`id` = held.`subclass_definition_id`
WHERE class_root.`content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'class')
   OR subclass_root.`content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'subclass');
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT loadout.`character_id` FROM `spell_loadout_entries` AS entry
JOIN `spell_loadouts` AS loadout ON loadout.`id` = entry.`spell_loadout_id`
JOIN `spell_versions` AS root ON root.`id` = entry.`spell_version_id`
JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'spell' AND wiped.`content_key` = root.`content_key`;
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT slot.`character_id` FROM `spell_selection_slots` AS slot
WHERE slot.`fixed_spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'spell' AND wiped.`content_key` = root.`content_key`)
   OR slot.`current_spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'spell' AND wiped.`content_key` = root.`content_key`);
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT entry.`character_id` FROM `wizard_spellbook_entries` AS entry
JOIN `spell_versions` AS root ON root.`id` = entry.`spell_version_id`
JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'spell' AND wiped.`content_key` = root.`content_key`;
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT preference.`character_id` FROM `character_spell_preferences` AS preference
JOIN `spell_versions` AS root ON root.`id` = preference.`spell_version_id`
JOIN `ci4b_legacy_identities` AS wiped ON wiped.`content_kind` = 'spell' AND wiped.`content_key` = root.`content_key`;
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT point.`character_id` FROM `character_save_points` AS point
WHERE json_valid(point.`snapshot`)
  AND EXISTS (
    SELECT 1 FROM json_tree(point.`snapshot`) AS scalar
    WHERE (scalar.`type` IN ('integer', 'real') AND CAST(scalar.`atom` AS INTEGER) IN (SELECT `id` FROM `ci4b_wiped_aggregate_ids`))
       OR (scalar.`type` = 'text' AND scalar.`atom` IN (SELECT `content_key` FROM `ci4b_legacy_identities`))
  );
INSERT OR IGNORE INTO `ci4b_affected_characters` (`id`)
SELECT operation.`character_id` FROM `character_operations` AS operation
WHERE json_valid(operation.`inverse_command`)
  AND EXISTS (
    SELECT 1 FROM json_tree(operation.`inverse_command`) AS scalar
    WHERE (scalar.`type` IN ('integer', 'real') AND CAST(scalar.`atom` AS INTEGER) IN (SELECT `id` FROM `ci4b_wiped_aggregate_ids`))
       OR (scalar.`type` = 'text' AND scalar.`atom` IN (SELECT `content_key` FROM `ci4b_legacy_identities`))
  );

-- Save points and operation inverses form one character-scoped timeline. Once
-- any live or historical entry touches wiped content, discard that character's
-- entire development timeline so no restore/undo route can replay stale ids.
DELETE FROM `character_save_points`
WHERE `character_id` IN (SELECT `id` FROM `ci4b_affected_characters`);
DELETE FROM `character_operations`
WHERE `character_id` IN (SELECT `id` FROM `ci4b_affected_characters`);

-- Reviewed match decisions are the sole RESTRICT child of registry identities.
DELETE FROM `catalog_content_match_decisions`
WHERE EXISTS (
  SELECT 1 FROM `ci4b_legacy_identities` AS legacy
  WHERE legacy.`content_kind` = `catalog_content_match_decisions`.`content_kind`
    AND legacy.`content_key` = `catalog_content_match_decisions`.`target_content_key`
);

-- Character-facing RESTRICT rows go first. The character aggregates survive;
-- only the development debris that points at wiped catalog aggregates dies.
-- Source-instance descendants precede their semantic parent because foreign
-- keys are disabled around migration execution and cannot provide cascades.
DELETE FROM `character_effects`
WHERE `source_instance_id` IN (SELECT `id` FROM `ci4b_wiped_source_instances`)
   OR `character_item_id` IN (
     SELECT item.`id` FROM `character_items` AS item
     WHERE item.`source_instance_id` IN (
       SELECT `id` FROM `ci4b_wiped_source_instances`
     )
   );
DELETE FROM `character_skill_proficiencies`
WHERE (`character_id`, `skill`) IN (
  SELECT grant_row.`character_id`, grant_row.`skill`
  FROM `character_skill_grants` AS grant_row
  WHERE grant_row.`source_instance_id` IN (
      SELECT `id` FROM `ci4b_wiped_source_instances`
    )
    AND grant_row.`skill` IS NOT NULL
);
DELETE FROM `character_skill_grants`
WHERE `source_instance_id` IN (SELECT `id` FROM `ci4b_wiped_source_instances`);
DELETE FROM `character_skill_expertise_grants`
WHERE `source_instance_id` IN (SELECT `id` FROM `ci4b_wiped_source_instances`);
DELETE FROM `character_level_feat_choices`
WHERE `feat_source_instance_id` IN (
    SELECT `id` FROM `ci4b_wiped_source_instances`
  )
  OR `character_class_level_id` IN (
  SELECT held.`id` FROM `character_class_levels` AS held
  LEFT JOIN `class_definitions` AS class_root
    ON class_root.`id` = held.`class_definition_id`
  LEFT JOIN `subclass_definitions` AS subclass_root
    ON subclass_root.`id` = held.`subclass_definition_id`
  WHERE class_root.`content_key` IN (
      SELECT `content_key` FROM `ci4b_legacy_identities`
      WHERE `content_kind` = 'class'
    )
    OR subclass_root.`content_key` IN (
      SELECT `content_key` FROM `ci4b_legacy_identities`
      WHERE `content_kind` = 'subclass'
    )
);
DELETE FROM `character_class_levels`
WHERE `class_definition_id` IN (
    SELECT root.`id` FROM `class_definitions` AS root
    JOIN `ci4b_legacy_identities` AS legacy
      ON legacy.`content_kind` = 'class'
     AND legacy.`content_key` = root.`content_key`
  )
  OR `subclass_definition_id` IN (
    SELECT root.`id` FROM `subclass_definitions` AS root
    JOIN `ci4b_legacy_identities` AS legacy
      ON legacy.`content_kind` = 'subclass'
     AND legacy.`content_key` = root.`content_key`
  );
DELETE FROM `spell_loadout_entries`
WHERE `spell_version_id` IN (
  SELECT root.`id` FROM `spell_versions` AS root
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'spell'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `spell_selection_slots`
WHERE `source_instance_id` IN (
    SELECT `id` FROM `ci4b_wiped_source_instances`
  )
  OR `fixed_spell_version_id` IN (
    SELECT root.`id` FROM `spell_versions` AS root
    JOIN `ci4b_legacy_identities` AS legacy
      ON legacy.`content_kind` = 'spell'
     AND legacy.`content_key` = root.`content_key`
  )
  OR `current_spell_version_id` IN (
    SELECT root.`id` FROM `spell_versions` AS root
    JOIN `ci4b_legacy_identities` AS legacy
      ON legacy.`content_kind` = 'spell'
     AND legacy.`content_key` = root.`content_key`
  );
DELETE FROM `wizard_spellbook_entries`
WHERE `source_instance_id` IN (
    SELECT `id` FROM `ci4b_wiped_source_instances`
  )
  OR `spell_version_id` IN (
  SELECT root.`id` FROM `spell_versions` AS root
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'spell'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `character_spell_preferences`
WHERE `spell_version_id` IN (
  SELECT root.`id` FROM `spell_versions` AS root
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'spell'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `character_items`
WHERE `source_instance_id` IN (SELECT `id` FROM `ci4b_wiped_source_instances`);
DELETE FROM `character_source_instances`
WHERE `id` IN (SELECT `id` FROM `ci4b_wiped_source_instances`);

-- applyMigrationSuffix deliberately disables foreign keys for the enclosing
-- transaction, so spell out the aggregate-detail cascades instead of relying
-- on ON DELETE actions that cannot fire during a migration.
DELETE FROM `subclass_feature_effects`
WHERE `subclass_feature_id` IN (
  SELECT feature.`id` FROM `subclass_features` AS feature
  JOIN `subclass_definitions` AS root
    ON root.`id` = feature.`subclass_definition_id`
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'subclass'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `subclass_features`
WHERE `subclass_definition_id` IN (
  SELECT root.`id` FROM `subclass_definitions` AS root
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'subclass'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `subclass_progressions`
WHERE `subclass_definition_id` IN (
  SELECT root.`id` FROM `subclass_definitions` AS root
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'subclass'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `named_feature_effects`
WHERE `named_feature_id` IN (
  SELECT feature.`id` FROM `named_features` AS feature
  JOIN `class_definitions` AS root ON root.`id` = feature.`class_definition_id`
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'class'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `named_features`
WHERE `class_definition_id` IN (
  SELECT root.`id` FROM `class_definitions` AS root
  JOIN `ci4b_legacy_identities` AS legacy
    ON legacy.`content_kind` = 'class'
   AND legacy.`content_key` = root.`content_key`
);
DELETE FROM `class_armor_training` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_extra_attack_grants` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_feature_effects` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_martial_arts_dice` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_progressions` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_resource_formulas` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_resources` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_saving_throw_proficiencies` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_sheet_traits` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_skill_options` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_weapon_mastery_counts` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_weapon_mastery_grants` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_weapon_proficiencies` WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `class_equipment_items`
WHERE `class_definition_id` IN (SELECT root.`id` FROM `class_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'class' AND legacy.`content_key` = root.`content_key`)
   OR `weapon_template_id` IN (SELECT root.`id` FROM `weapon_templates` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'weapon' AND legacy.`content_key` = root.`content_key`)
   OR `armor_template_id` IN (SELECT root.`id` FROM `armor_templates` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'armor' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `background_equipment_items`
WHERE `background_template_id` IN (SELECT root.`id` FROM `background_templates` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'background' AND legacy.`content_key` = root.`content_key`)
   OR `weapon_template_id` IN (SELECT root.`id` FROM `weapon_templates` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'weapon' AND legacy.`content_key` = root.`content_key`)
   OR `armor_template_id` IN (SELECT root.`id` FROM `armor_templates` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'armor' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `background_template_effects` WHERE `background_template_id` IN (SELECT root.`id` FROM `background_templates` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'background' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `species_template_trait_effects` WHERE `species_template_trait_id` IN (SELECT trait.`id` FROM `species_template_traits` AS trait JOIN `species_templates` AS root ON root.`id` = trait.`species_template_id` JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'species' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `species_template_traits` WHERE `species_template_id` IN (SELECT root.`id` FROM `species_templates` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'species' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `item_definition_effects` WHERE `item_definition_id` IN (SELECT root.`id` FROM `item_definitions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'item' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_list_memberships` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_attack_modes` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_cantrip_upgrade_levels` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_conditions` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_damage_types` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_publications` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_save_abilities` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_tags` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);
DELETE FROM `spell_version_upcast_levels` WHERE `spell_version_id` IN (SELECT root.`id` FROM `spell_versions` AS root JOIN `ci4b_legacy_identities` AS legacy ON legacy.`content_kind` = 'spell' AND legacy.`content_key` = root.`content_key`);

-- Aggregate roots are now unreferenced. Subclasses precede classes because a
-- subclass also owns a class foreign key; registry metadata follows roots.
DELETE FROM `subclass_definitions` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'subclass');
DELETE FROM `class_definitions` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'class');
DELETE FROM `feat_definitions` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'feat');
DELETE FROM `species_definitions` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'species');
DELETE FROM `species_templates` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'species');
DELETE FROM `background_definitions` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'background');
DELETE FROM `background_templates` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'background');
DELETE FROM `spell_versions` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'spell');
DELETE FROM `weapon_templates` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'weapon');
DELETE FROM `armor_templates` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'armor');
DELETE FROM `item_definitions` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities` WHERE `content_kind` = 'item');
DELETE FROM `catalog_content_aliases` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities`);
DELETE FROM `catalog_content_fingerprints` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities`);
DELETE FROM `catalog_content_identities` WHERE `content_key` IN (SELECT `content_key` FROM `ci4b_legacy_identities`);

DROP TRIGGER `catalog_register_class_identity_before_insert`;
DROP TRIGGER `catalog_register_subclass_identity_before_insert`;
DROP TRIGGER `catalog_register_feat_identity_before_insert`;
DROP TRIGGER `catalog_register_species_definition_identity_before_insert`;
DROP TRIGGER `catalog_register_background_definition_identity_before_insert`;
DROP TRIGGER `catalog_register_spell_identity_before_insert`;
DROP TRIGGER `catalog_register_species_template_identity_before_insert`;
DROP TRIGGER `catalog_register_background_template_identity_before_insert`;
DROP TRIGGER `catalog_register_armor_identity_before_insert`;
DROP TRIGGER `catalog_register_weapon_identity_before_insert`;
DROP TRIGGER `catalog_register_item_identity_before_insert`;

CREATE TABLE `__new_catalog_content_identities` (
	`content_key` VARCHAR PRIMARY KEY NOT NULL,
	`content_kind` VARCHAR NOT NULL,
	`key_kind` VARCHAR NOT NULL,
	`catalog_layer` VARCHAR NOT NULL,
	`normalized_name` VARCHAR NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "catalog_content_identities_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_identities_key_kind_check" CHECK("__new_catalog_content_identities"."key_kind" IN ('derived', 'asserted', 'bundled-stable')),
	CONSTRAINT "catalog_content_identities_catalog_layer_check" CHECK("__new_catalog_content_identities"."catalog_layer" IN ('bundled', 'external')),
	CONSTRAINT "catalog_content_identities_normalized_name_check" CHECK(length("__new_catalog_content_identities"."normalized_name") > 0),
	CONSTRAINT "catalog_content_identities_key_layer_check" CHECK((
        ("__new_catalog_content_identities"."key_kind" = 'derived'
          AND "__new_catalog_content_identities"."catalog_layer" = 'external'
          AND instr("__new_catalog_content_identities"."content_key", ':content.v1:') > 1
          AND substr(
            "__new_catalog_content_identities"."content_key",
            1,
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') - 1
          ) NOT GLOB '*[^a-z0-9-]*'
          AND substr("__new_catalog_content_identities"."content_key", 1, 1) <> '-'
          AND substr(
            "__new_catalog_content_identities"."content_key",
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') - 1,
            1
          ) <> '-'
          AND instr(
            substr(
              "__new_catalog_content_identities"."content_key",
              1,
              instr("__new_catalog_content_identities"."content_key", ':content.v1:') - 1
            ),
            '--'
          ) = 0
          AND length(substr(
            "__new_catalog_content_identities"."content_key",
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') + 12
          )) = 64
          AND substr(
            "__new_catalog_content_identities"."content_key",
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') + 12
          ) NOT GLOB '*[^0-9a-f]*')
        OR ("__new_catalog_content_identities"."key_kind" = 'asserted'
          AND "__new_catalog_content_identities"."catalog_layer" = 'external'
          -- Exact grammar shared with isAssertedExternalContentKey:
          -- edition:name, or edition:dotted.owner:name. Every component is a
          -- lowercase alphanumeric/hyphen slug with no empty hyphen segment.
          AND length("__new_catalog_content_identities"."content_key") > 2
          AND "__new_catalog_content_identities"."content_key" NOT GLOB '*[^a-z0-9:.-]*'
          AND instr("__new_catalog_content_identities"."content_key", ':') > 1
          AND substr("__new_catalog_content_identities"."content_key", 1, 1) NOT IN ('-', '.', ':')
          AND substr("__new_catalog_content_identities"."content_key", -1, 1) NOT IN ('-', '.', ':')
          AND instr("__new_catalog_content_identities"."content_key", '::') = 0
          AND instr("__new_catalog_content_identities"."content_key", '..') = 0
          AND instr("__new_catalog_content_identities"."content_key", '--') = 0
          AND instr("__new_catalog_content_identities"."content_key", ':.') = 0
          AND instr("__new_catalog_content_identities"."content_key", '.:') = 0
          AND instr("__new_catalog_content_identities"."content_key", ':-') = 0
          AND instr("__new_catalog_content_identities"."content_key", '-:') = 0
          AND instr("__new_catalog_content_identities"."content_key", '.-') = 0
          AND instr("__new_catalog_content_identities"."content_key", '-.') = 0
          AND (
            (length("__new_catalog_content_identities"."content_key") - length(replace("__new_catalog_content_identities"."content_key", ':', '')) = 1
              AND instr("__new_catalog_content_identities"."content_key", '.') = 0)
            OR
            (length("__new_catalog_content_identities"."content_key") - length(replace("__new_catalog_content_identities"."content_key", ':', '')) = 2
              AND instr(substr("__new_catalog_content_identities"."content_key", instr("__new_catalog_content_identities"."content_key", ':') + 1), ':') > 1
              AND instr(substr("__new_catalog_content_identities"."content_key", 1, instr("__new_catalog_content_identities"."content_key", ':') - 1), '.') = 0
              AND instr(substr(
                "__new_catalog_content_identities"."content_key",
                instr("__new_catalog_content_identities"."content_key", ':') + 1,
                instr(substr("__new_catalog_content_identities"."content_key", instr("__new_catalog_content_identities"."content_key", ':') + 1), ':') - 1
              ), '.') > 1
              AND instr(substr(
                "__new_catalog_content_identities"."content_key",
                instr("__new_catalog_content_identities"."content_key", ':') +
                  instr(substr("__new_catalog_content_identities"."content_key", instr("__new_catalog_content_identities"."content_key", ':') + 1), ':') + 1
              ), '.') = 0)
          ))
        OR ("__new_catalog_content_identities"."key_kind" = 'bundled-stable'
          AND "__new_catalog_content_identities"."catalog_layer" = 'bundled')
      ))
);
INSERT INTO `__new_catalog_content_identities` (
  `content_key`, `content_kind`, `key_kind`, `catalog_layer`,
  `normalized_name`, `created_at`
) SELECT
  `content_key`, `content_kind`, `key_kind`, `catalog_layer`,
  `normalized_name`, `created_at`
FROM `catalog_content_identities`;
DROP TABLE `catalog_content_identities`;
ALTER TABLE `__new_catalog_content_identities` RENAME TO `catalog_content_identities`;
CREATE UNIQUE INDEX `catalog_content_identities_kind_key_unique` ON `catalog_content_identities` (`content_kind`,`content_key`);
CREATE INDEX `catalog_content_identities_layer_kind_index` ON `catalog_content_identities` (`catalog_layer`,`content_kind`);
CREATE INDEX `catalog_content_identities_name_index` ON `catalog_content_identities` (`content_kind`,`normalized_name`);

CREATE TRIGGER catalog_register_class_identity_before_insert
BEFORE INSERT ON class_definitions
BEGIN
  SELECT RAISE(ABORT, 'class content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'class' );
  SELECT RAISE(ABORT, 'class content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'class' );
END;
CREATE TRIGGER catalog_register_subclass_identity_before_insert
BEFORE INSERT ON subclass_definitions
BEGIN
  SELECT RAISE(ABORT, 'subclass content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'subclass' );
  SELECT RAISE(ABORT, 'subclass content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'subclass' );
END;
CREATE TRIGGER catalog_register_feat_identity_before_insert
BEFORE INSERT ON feat_definitions
BEGIN
  SELECT RAISE(ABORT, 'feat content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'feat' );
  SELECT RAISE(ABORT, 'feat content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'feat' );
END;
CREATE TRIGGER catalog_register_species_definition_identity_before_insert
BEFORE INSERT ON species_definitions
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'species' );
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'species' );
END;
CREATE TRIGGER catalog_register_background_definition_identity_before_insert
BEFORE INSERT ON background_definitions
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'background' );
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'background' );
END;
CREATE TRIGGER catalog_register_spell_identity_before_insert
BEFORE INSERT ON spell_versions
BEGIN
  SELECT RAISE(ABORT, 'spell content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'spell' );
  SELECT RAISE(ABORT, 'spell content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'spell' );
END;
CREATE TRIGGER catalog_register_species_template_identity_before_insert
BEFORE INSERT ON species_templates
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'species' );
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'species' );
END;
CREATE TRIGGER catalog_register_background_template_identity_before_insert
BEFORE INSERT ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'background' );
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'background' );
END;
CREATE TRIGGER catalog_register_armor_identity_before_insert
BEFORE INSERT ON armor_templates
BEGIN
  SELECT RAISE(ABORT, 'armor content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'armor' );
  SELECT RAISE(ABORT, 'armor content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'armor' );
END;
CREATE TRIGGER catalog_register_weapon_identity_before_insert
BEFORE INSERT ON weapon_templates
BEGIN
  SELECT RAISE(ABORT, 'weapon content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'weapon' );
  SELECT RAISE(ABORT, 'weapon content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'weapon' );
END;
CREATE TRIGGER catalog_register_item_identity_before_insert
BEFORE INSERT ON item_definitions
BEGIN
  SELECT RAISE(ABORT, 'item content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'item' );
  SELECT RAISE(ABORT, 'item content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'item' );
END;
DROP TABLE `ci4b_affected_characters`;
DROP TABLE `ci4b_wiped_source_instances`;
DROP TABLE `ci4b_wiped_aggregate_ids`;
DROP TABLE `ci4b_legacy_identities`;
