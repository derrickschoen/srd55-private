PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_feat_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`min_level` integer,
	`ability_points` integer DEFAULT 0 NOT NULL,
	`repeatable` TINYINT(1) DEFAULT false NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	CONSTRAINT "feat_definitions_min_level_check" CHECK(`min_level` IS NULL OR (typeof(`min_level`) = 'integer' AND `min_level` BETWEEN 1 AND 20)),
	CONSTRAINT "feat_definitions_ability_points_check" CHECK(typeof(`ability_points`) = 'integer' AND `ability_points` IN (0, 1, 2))
);
--> statement-breakpoint
INSERT INTO `__new_feat_definitions`("id", "content_key", "name", "rules_edition", "category", "min_level", "ability_points", "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at") SELECT "id", "content_key", "name", "rules_edition", "category", NULL, 0, "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at" FROM `feat_definitions`;--> statement-breakpoint
DROP TABLE `feat_definitions`;--> statement-breakpoint
ALTER TABLE `__new_feat_definitions` RENAME TO `feat_definitions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `feat_definitions_content_key_unique` ON `feat_definitions` (`content_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `feat_definitions_name_rules_edition_unique` ON `feat_definitions` (`name`,`rules_edition`);
