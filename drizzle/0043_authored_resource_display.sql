-- E4 adds the authored display configuration required by resource-maximum
-- contributions. Existing resource rows predate authoring and retain their
-- own label with the documented boxes default; feature-dice rows keep both
-- fields NULL. Migration 0042 remains byte-frozen.

CREATE TABLE `__new_class_feature_value_contributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`contribution_key` VARCHAR NOT NULL,
	`label` VARCHAR NOT NULL,
	`target_kind` VARCHAR NOT NULL,
	`target_key` VARCHAR NOT NULL,
	`op` VARCHAR NOT NULL,
	`active_from_level` integer NOT NULL,
	`active_to_level` integer NOT NULL,
	`value_json` TEXT NOT NULL,
	`supersedes_ref` TEXT,
	`resource_display_label` VARCHAR,
	`resource_marking_shape` VARCHAR,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_feature_value_contributions_contribution_key_check" CHECK(typeof(contribution_key) = 'text' AND length(contribution_key) BETWEEN 1 AND 200),
	CONSTRAINT "class_feature_value_contributions_label_check" CHECK(typeof(label) = 'text' AND length(label) BETWEEN 1 AND 200),
	CONSTRAINT "class_feature_value_contributions_target_kind_check" CHECK(`target_kind` IN ('feature_dice_count', 'resource_maximum')),
	CONSTRAINT "class_feature_value_contributions_op_check" CHECK(`op` IN ('add')),
	CONSTRAINT "class_feature_value_contributions_target_payload_check" CHECK((
        target_kind IS 'feature_dice_count'
        AND target_key IS 'sneak_attack'
        AND op IS 'add'
        AND resource_display_label IS NULL
        AND resource_marking_shape IS NULL
      ) OR (
        target_kind IS 'resource_maximum'
        AND typeof(target_key) = 'text'
        AND length(target_key) BETWEEN 1 AND 200
        AND op IS 'add'
        AND typeof(resource_display_label) = 'text'
        AND length(resource_display_label) BETWEEN 1 AND 200
        AND resource_marking_shape IN ('boxes', 'remaining')
      )),
	CONSTRAINT "class_feature_value_contributions_active_level_band_check" CHECK(typeof(active_from_level) = 'integer'
        AND typeof(active_to_level) = 'integer'
        AND active_from_level BETWEEN 1 AND 20
        AND active_to_level BETWEEN active_from_level AND 20),
	CONSTRAINT "class_feature_value_contributions_value_json_check" CHECK(json_valid(value_json)
        AND json_type(value_json) IS 'object'
        AND length(CAST(value_json AS BLOB)) BETWEEN 1 AND 4096),
	CONSTRAINT "class_feature_value_contributions_supersedes_ref_check" CHECK(supersedes_ref IS NULL OR (
        json_valid(supersedes_ref)
        AND json_type(supersedes_ref) IS 'object'
        AND length(CAST(supersedes_ref AS BLOB)) BETWEEN 1 AND 512
      ))
);

INSERT INTO `__new_class_feature_value_contributions` (
  `id`, `class_definition_id`, `contribution_key`, `label`, `target_kind`,
  `target_key`, `op`, `active_from_level`, `active_to_level`, `value_json`,
  `supersedes_ref`, `resource_display_label`, `resource_marking_shape`,
  `created_at`, `updated_at`
)
SELECT
  `id`, `class_definition_id`, `contribution_key`, `label`, `target_kind`,
  `target_key`, `op`, `active_from_level`, `active_to_level`, `value_json`,
  `supersedes_ref`,
  CASE WHEN `target_kind` = 'resource_maximum' THEN `label` ELSE NULL END,
  CASE WHEN `target_kind` = 'resource_maximum' THEN 'boxes' ELSE NULL END,
  `created_at`, `updated_at`
FROM `class_feature_value_contributions`;

DROP TABLE `class_feature_value_contributions`;
ALTER TABLE `__new_class_feature_value_contributions` RENAME TO `class_feature_value_contributions`;
CREATE UNIQUE INDEX `class_feature_value_contributions_owner_key_unique` ON `class_feature_value_contributions` (`class_definition_id`,`contribution_key`);

CREATE TABLE `__new_subclass_feature_value_contributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_feature_id` integer NOT NULL,
	`contribution_key` VARCHAR NOT NULL,
	`label` VARCHAR NOT NULL,
	`target_kind` VARCHAR NOT NULL,
	`target_key` VARCHAR NOT NULL,
	`op` VARCHAR NOT NULL,
	`active_from_level` integer NOT NULL,
	`active_to_level` integer NOT NULL,
	`value_json` TEXT NOT NULL,
	`supersedes_ref` TEXT,
	`resource_display_label` VARCHAR,
	`resource_marking_shape` VARCHAR,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_feature_id`) REFERENCES `subclass_features`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_feature_value_contributions_contribution_key_check" CHECK(typeof(contribution_key) = 'text' AND length(contribution_key) BETWEEN 1 AND 200),
	CONSTRAINT "subclass_feature_value_contributions_label_check" CHECK(typeof(label) = 'text' AND length(label) BETWEEN 1 AND 200),
	CONSTRAINT "subclass_feature_value_contributions_target_kind_check" CHECK(`target_kind` IN ('feature_dice_count', 'resource_maximum')),
	CONSTRAINT "subclass_feature_value_contributions_op_check" CHECK(`op` IN ('add')),
	CONSTRAINT "subclass_feature_value_contributions_target_payload_check" CHECK((
        target_kind IS 'feature_dice_count'
        AND target_key IS 'sneak_attack'
        AND op IS 'add'
        AND resource_display_label IS NULL
        AND resource_marking_shape IS NULL
      ) OR (
        target_kind IS 'resource_maximum'
        AND typeof(target_key) = 'text'
        AND length(target_key) BETWEEN 1 AND 200
        AND op IS 'add'
        AND typeof(resource_display_label) = 'text'
        AND length(resource_display_label) BETWEEN 1 AND 200
        AND resource_marking_shape IN ('boxes', 'remaining')
      )),
	CONSTRAINT "subclass_feature_value_contributions_active_level_band_check" CHECK(typeof(active_from_level) = 'integer'
        AND typeof(active_to_level) = 'integer'
        AND active_from_level BETWEEN 1 AND 20
        AND active_to_level BETWEEN active_from_level AND 20),
	CONSTRAINT "subclass_feature_value_contributions_value_json_check" CHECK(json_valid(value_json)
        AND json_type(value_json) IS 'object'
        AND length(CAST(value_json AS BLOB)) BETWEEN 1 AND 4096),
	CONSTRAINT "subclass_feature_value_contributions_supersedes_ref_check" CHECK(supersedes_ref IS NULL OR (
        json_valid(supersedes_ref)
        AND json_type(supersedes_ref) IS 'object'
        AND length(CAST(supersedes_ref AS BLOB)) BETWEEN 1 AND 512
      ))
);

INSERT INTO `__new_subclass_feature_value_contributions` (
  `id`, `subclass_feature_id`, `contribution_key`, `label`, `target_kind`,
  `target_key`, `op`, `active_from_level`, `active_to_level`, `value_json`,
  `supersedes_ref`, `resource_display_label`, `resource_marking_shape`,
  `created_at`, `updated_at`
)
SELECT
  `id`, `subclass_feature_id`, `contribution_key`, `label`, `target_kind`,
  `target_key`, `op`, `active_from_level`, `active_to_level`, `value_json`,
  `supersedes_ref`,
  CASE WHEN `target_kind` = 'resource_maximum' THEN `label` ELSE NULL END,
  CASE WHEN `target_kind` = 'resource_maximum' THEN 'boxes' ELSE NULL END,
  `created_at`, `updated_at`
FROM `subclass_feature_value_contributions`;

DROP TABLE `subclass_feature_value_contributions`;
ALTER TABLE `__new_subclass_feature_value_contributions` RENAME TO `subclass_feature_value_contributions`;
CREATE UNIQUE INDEX `subclass_feature_value_contributions_owner_key_unique` ON `subclass_feature_value_contributions` (`subclass_feature_id`,`contribution_key`);
