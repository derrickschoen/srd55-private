CREATE TABLE `character_skill_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`source_instance_id` integer NOT NULL,
	`grant_key` VARCHAR NOT NULL,
	`ordinal` integer NOT NULL,
	`skill` VARCHAR,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`orphan_reason_code` VARCHAR,
	`orphaned_at` DATETIME,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_skill_grants_skill_check" CHECK((`skill` IS NULL OR `skill` IN ('acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'))),
	CONSTRAINT "character_skill_grants_state_check" CHECK(`state` IN ('active', 'orphaned')),
	CONSTRAINT "character_skill_grants_ordinal_check" CHECK(typeof(`ordinal`) = 'integer' AND `ordinal` >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_skill_grants_source_grant_ordinal_unique` ON `character_skill_grants` (`source_instance_id`,`grant_key`,`ordinal`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_skill_grants_character_id_skill_unique` ON `character_skill_grants` (`character_id`,`skill`) WHERE skill IS NOT NULL AND state = 'active';--> statement-breakpoint
CREATE INDEX `character_skill_grants_character_id_state_index` ON `character_skill_grants` (`character_id`,`state`);
