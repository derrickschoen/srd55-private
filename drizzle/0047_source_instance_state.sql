-- R4 / D13: `character_source_instances.state` now has a declared vocabulary
-- (`sourceInstanceStates` in `src/domain/enums.ts`) and therefore, at last, a
-- CHECK. The constraint is generated from that one array by `oneOf`, not
-- transcribed from a grep of the writers.
--
-- THE COPY BELOW IS THE DATA AUDIT, AND ITS FAILURE IS THE CORRECT OUTCOME.
-- A row holding a third value cannot be copied into the constrained table: the
-- INSERT ... SELECT aborts with `CHECK constraint failed:
-- character_source_instances_state_check` inside the migration's own
-- BEGIN EXCLUSIVE, BEFORE the old table is dropped, so ROLLBACK restores the
-- exact source image and nothing is lost. Deliberately no second copy of the
-- vocabulary is written here to pre-screen for that value — one transcription,
-- in the CHECK, is the whole point of the lane.
--
-- No such row is expected to exist. Every writer in the tree sets `'active'` or
-- `'tombstoned'` (remove-source, update-class ×2, grant-rule-slot-generator,
-- authoring/reference-retarget), and a full-history audit of every blob this
-- repository has ever held found no third literal ever written to the column.

PRAGMA foreign_keys=OFF;

-- The AUTOINCREMENT high-water mark, carried across the rebuild exactly as
-- 0032 carries `characters`'. Copying rows with explicit ids leaves the new
-- table's `sqlite_sequence` at the live maximum, which would hand a future
-- insert an id a deleted source already used.
CREATE TEMP TABLE `__source_instances_sequence_before_state_check` (
	`seq` integer NOT NULL
);

INSERT INTO `__source_instances_sequence_before_state_check` (`seq`)
SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'character_source_instances';

CREATE TABLE `r4_character_source_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`instance_uuid` VARCHAR NOT NULL,
	`parent_source_instance_id` integer,
	`source_type` VARCHAR NOT NULL,
	`source_definition_id` integer,
	`display_name` VARCHAR NOT NULL,
	`config` TEXT,
	`acquired_at_character_level` integer,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_source_instance_id`) REFERENCES `character_source_instances`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "character_source_instances_state_check" CHECK(`state` IN ('active', 'tombstoned'))
);

INSERT INTO `r4_character_source_instances` (
  `id`, `character_id`, `instance_uuid`, `parent_source_instance_id`,
  `source_type`, `source_definition_id`, `display_name`, `config`,
  `acquired_at_character_level`, `state`, `notes`, `created_at`, `updated_at`
)
SELECT
  `id`, `character_id`, `instance_uuid`, `parent_source_instance_id`,
  `source_type`, `source_definition_id`, `display_name`, `config`,
  `acquired_at_character_level`, `state`, `notes`, `created_at`, `updated_at`
FROM `character_source_instances`;

DROP TABLE `character_source_instances`;
ALTER TABLE `r4_character_source_instances` RENAME TO `character_source_instances`;

UPDATE `sqlite_sequence`
SET `seq` = max(
	`seq`,
	coalesce(
		(SELECT `seq` FROM `__source_instances_sequence_before_state_check`),
		`seq`
	)
)
WHERE `name` = 'character_source_instances';

INSERT INTO `sqlite_sequence` (`name`, `seq`)
SELECT 'character_source_instances', `seq`
FROM `__source_instances_sequence_before_state_check`
WHERE NOT EXISTS (
	SELECT 1 FROM `sqlite_sequence` WHERE `name` = 'character_source_instances'
);

DROP TABLE `__source_instances_sequence_before_state_check`;

CREATE UNIQUE INDEX `character_source_instances_instance_uuid_unique`
  ON `character_source_instances` (`instance_uuid`);
CREATE INDEX `character_source_instances_character_id_state_index`
  ON `character_source_instances` (`character_id`,`state`);
CREATE UNIQUE INDEX `character_source_instances_id_character_id_unique`
  ON `character_source_instances` (`id`,`character_id`);

-- DROP TABLE took this trigger with it. It is the only schema object attached
-- to this table besides the three indexes, and losing it would silently break
-- the one thing it does: a deleted feat source would leave its level-feat
-- choice pointing at a row that no longer exists.
CREATE TRIGGER character_sources_clear_level_feat_choices_before_delete
    BEFORE DELETE ON character_source_instances
BEGIN
    UPDATE character_level_feat_choices
       SET feat_source_instance_id = NULL,
           updated_at = CURRENT_TIMESTAMP
     WHERE character_id = OLD.character_id
       AND feat_source_instance_id = OLD.id;
END;

PRAGMA foreign_keys=ON;
