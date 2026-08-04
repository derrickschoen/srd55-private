CREATE TEMP TABLE `__characters_sequence_before_archive` (
	`seq` integer NOT NULL
);

INSERT INTO `__characters_sequence_before_archive` (`seq`)
SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'characters';

CREATE TABLE `__new_characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` VARCHAR NOT NULL,
	`strength` integer DEFAULT 10 NOT NULL,
	`dexterity` integer DEFAULT 10 NOT NULL,
	`constitution` integer DEFAULT 10 NOT NULL,
	`intelligence` integer DEFAULT 10 NOT NULL,
	`wisdom` integer DEFAULT 10 NOT NULL,
	`charisma` integer DEFAULT 10 NOT NULL,
	`ability_allocation_method` VARCHAR,
	`proficiency_bonus_override` integer,
	`rules_edition_preference` VARCHAR DEFAULT '2024' NOT NULL,
	`allow_legacy` TINYINT(1) DEFAULT false NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`alignment` TEXT,
	`appearance` TEXT,
	`backstory` TEXT,
	`notes` TEXT,
	`archived_at` DATETIME,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	CONSTRAINT "characters_ability_scores_check" CHECK(strength BETWEEN 1 AND 30
      AND dexterity BETWEEN 1 AND 30
      AND constitution BETWEEN 1 AND 30
      AND intelligence BETWEEN 1 AND 30
      AND wisdom BETWEEN 1 AND 30
      AND charisma BETWEEN 1 AND 30),
	CONSTRAINT "characters_ability_allocation_method_check" CHECK((`ability_allocation_method` IS NULL OR `ability_allocation_method` IN ('standard_array', 'point_buy', 'manual'))),
	CONSTRAINT "characters_rules_edition_preference_check" CHECK(`rules_edition_preference` IN ('2014', '2024', 'expanded')),
	CONSTRAINT "characters_proficiency_bonus_override_check" CHECK((`proficiency_bonus_override` IS NULL OR (typeof(`proficiency_bonus_override`) = 'integer' AND `proficiency_bonus_override` >= 1))),
	CONSTRAINT "characters_revision_check" CHECK(typeof(`revision`) = 'integer' AND `revision` >= 0),
	CONSTRAINT "characters_alignment_check" CHECK((`alignment` IS NULL OR (typeof(`alignment`) = 'text' AND length(`alignment`) BETWEEN 1 AND 120))),
	CONSTRAINT "characters_appearance_check" CHECK((`appearance` IS NULL OR (typeof(`appearance`) = 'text' AND length(`appearance`) BETWEEN 1 AND 4000))),
	CONSTRAINT "characters_backstory_check" CHECK((`backstory` IS NULL OR (typeof(`backstory`) = 'text' AND length(`backstory`) BETWEEN 1 AND 20000))),
	CONSTRAINT "characters_archived_at_check" CHECK(archived_at IS NULL OR typeof(archived_at) = 'text')
);

INSERT INTO `__new_characters` (
  `id`, `name`, `strength`, `dexterity`, `constitution`, `intelligence`,
  `wisdom`, `charisma`, `ability_allocation_method`,
  `proficiency_bonus_override`, `rules_edition_preference`, `allow_legacy`,
  `revision`, `alignment`, `appearance`, `backstory`, `notes`, `archived_at`,
  `created_at`, `updated_at`
)
SELECT
  `id`, `name`, `strength`, `dexterity`, `constitution`, `intelligence`,
  `wisdom`, `charisma`, `ability_allocation_method`,
  `proficiency_bonus_override`, `rules_edition_preference`, `allow_legacy`,
  `revision`, `alignment`, `appearance`, `backstory`, `notes`, NULL,
  `created_at`, `updated_at`
FROM `characters`;

DROP TABLE `characters`;
ALTER TABLE `__new_characters` RENAME TO `characters`;

UPDATE `sqlite_sequence`
SET `seq` = max(
	`seq`,
	coalesce(
		(SELECT `seq` FROM `__characters_sequence_before_archive`),
		`seq`
	)
)
WHERE `name` = 'characters';

INSERT INTO `sqlite_sequence` (`name`, `seq`)
SELECT 'characters', `seq`
FROM `__characters_sequence_before_archive`
WHERE NOT EXISTS (
	SELECT 1 FROM `sqlite_sequence` WHERE `name` = 'characters'
);

DROP TABLE `__characters_sequence_before_archive`;

CREATE INDEX `characters_archive_list_index` ON `characters` ("archived_at" desc,`name`,`id`);
