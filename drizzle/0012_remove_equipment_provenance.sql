PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_character_weapons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`proficiency_category` VARCHAR,
	`attack_kind` VARCHAR,
	`damage_kind` VARCHAR DEFAULT 'not_recorded' NOT NULL,
	`damage_dice` VARCHAR,
	`damage_flat` integer,
	`damage_custom` VARCHAR,
	`damage_type` VARCHAR,
	`versatile_damage_kind` VARCHAR DEFAULT 'not_applicable' NOT NULL,
	`versatile_damage_dice` VARCHAR,
	`versatile_damage_flat` integer,
	`versatile_damage_custom` VARCHAR,
	`finesse` TINYINT(1) DEFAULT false NOT NULL,
	`heavy` TINYINT(1) DEFAULT false NOT NULL,
	`light` TINYINT(1) DEFAULT false NOT NULL,
	`loading` TINYINT(1) DEFAULT false NOT NULL,
	`reach` TINYINT(1) DEFAULT false NOT NULL,
	`thrown` TINYINT(1) DEFAULT false NOT NULL,
	`two_handed` TINYINT(1) DEFAULT false NOT NULL,
	`ammunition` TINYINT(1) DEFAULT false NOT NULL,
	`ammunition_kind` VARCHAR,
	`range_kind` VARCHAR DEFAULT 'none' NOT NULL,
	`range_near_feet` integer,
	`range_far_feet` integer,
	`mastery_property` VARCHAR,
	`mastery_selected` TINYINT(1) DEFAULT false NOT NULL,
	`other_properties` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_weapons_damage_check" CHECK((
        (damage_kind = 'dice' AND damage_dice IS NOT NULL AND damage_flat IS NULL AND damage_custom IS NULL)
        OR (damage_kind = 'flat' AND damage_dice IS NULL AND damage_flat IS NOT NULL AND damage_flat >= 0 AND damage_custom IS NULL)
        OR (damage_kind = 'custom' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NOT NULL)
        OR (damage_kind = 'not_recorded' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NULL)
      )),
	CONSTRAINT "character_weapons_versatile_damage_check" CHECK((
        (versatile_damage_kind = 'dice' AND versatile_damage_dice IS NOT NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'flat' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NOT NULL AND versatile_damage_flat >= 0 AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'custom' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NOT NULL)
        OR (versatile_damage_kind = 'not_applicable' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
      )),
	CONSTRAINT "character_weapons_range_check" CHECK((
        (range_near_feet IS NULL OR (typeof(range_near_feet) = 'integer' AND range_near_feet BETWEEN 0 AND 100000))
        AND (range_far_feet IS NULL OR (typeof(range_far_feet) = 'integer' AND range_far_feet BETWEEN 0 AND 100000))
        AND (
          (range_kind = 'none' AND range_near_feet IS NULL AND range_far_feet IS NULL)
          OR (range_kind = 'ranged' AND range_near_feet IS NOT NULL AND (range_far_feet IS NULL OR range_far_feet >= range_near_feet))
          OR (range_kind = 'legacy' AND range_far_feet IS NOT NULL AND (range_near_feet IS NULL OR range_far_feet < range_near_feet))
        )
      )),
	CONSTRAINT "character_weapons_mastery_requires_property_check" CHECK(mastery_selected = 0 OR mastery_property IS NOT NULL),
	CONSTRAINT "character_weapons_mastery_property_check" CHECK((`mastery_property` IS NULL OR `mastery_property` IN ('Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'))),
	CONSTRAINT "character_weapons_proficiency_category_check" CHECK((`proficiency_category` IS NULL OR `proficiency_category` IN ('simple', 'martial'))),
	CONSTRAINT "character_weapons_attack_kind_check" CHECK((`attack_kind` IS NULL OR `attack_kind` IN ('melee', 'ranged')))
);
--> statement-breakpoint
INSERT INTO `__new_character_weapons`(
  "id", "character_id", "name", "proficiency_category", "attack_kind", "damage_kind", "damage_dice", "damage_flat", "damage_custom", "damage_type", "versatile_damage_kind", "versatile_damage_dice", "versatile_damage_flat", "versatile_damage_custom", "finesse", "heavy", "light", "loading", "reach", "thrown", "two_handed", "ammunition", "ammunition_kind", "range_kind", "range_near_feet", "range_far_feet", "mastery_property", "mastery_selected", "other_properties", "notes", "created_at", "updated_at"
)
SELECT
  "id", "character_id", "name", "proficiency_category", "attack_kind", "damage_kind", "damage_dice", "damage_flat", "damage_custom", "damage_type", "versatile_damage_kind", "versatile_damage_dice", "versatile_damage_flat", "versatile_damage_custom", "finesse", "heavy", "light", "loading", "reach", "thrown", "two_handed", "ammunition", "ammunition_kind", "range_kind", "range_near_feet", "range_far_feet", "mastery_property", "mastery_selected", "other_properties", "notes", "created_at", "updated_at"
FROM `character_weapons`;--> statement-breakpoint
DROP TABLE `character_weapons`;--> statement-breakpoint
ALTER TABLE `__new_character_weapons` RENAME TO `character_weapons`;--> statement-breakpoint
CREATE INDEX `character_weapons_character_id_index` ON `character_weapons` (`character_id`);--> statement-breakpoint
CREATE TABLE `__new_character_armor` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`slot` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`category` VARCHAR NOT NULL,
	`armor_class` integer NOT NULL,
	`dex_bonus` VARCHAR NOT NULL,
	`dex_bonus_max` integer,
	`strength_requirement` integer,
	`stealth_disadvantage` TINYINT(1) DEFAULT false NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_armor_slot_check" CHECK(`slot` IN ('worn', 'shield')),
	CONSTRAINT "character_armor_category_check" CHECK(`category` IN ('light', 'medium', 'heavy', 'shield')),
	CONSTRAINT "character_armor_dex_bonus_check" CHECK(`dex_bonus` IN ('full', 'capped', 'none')),
	CONSTRAINT "character_armor_dex_bonus_max_check" CHECK((`dex_bonus` = 'capped') = (`dex_bonus_max` IS NOT NULL) AND (`dex_bonus_max` IS NULL OR (typeof(`dex_bonus_max`) = 'integer' AND `dex_bonus_max` >= 0))),
	CONSTRAINT "character_armor_shield_check" CHECK(`category` <> 'shield' OR `dex_bonus` = 'none'),
	CONSTRAINT "character_armor_armor_class_check" CHECK(typeof(`armor_class`) = 'integer' AND `armor_class` >= 1),
	CONSTRAINT "character_armor_strength_requirement_check" CHECK((`strength_requirement` IS NULL OR (typeof(`strength_requirement`) = 'integer' AND `strength_requirement` >= 1)))
);
--> statement-breakpoint
INSERT INTO `__new_character_armor`(
  "id", "character_id", "slot", "name", "category", "armor_class", "dex_bonus", "dex_bonus_max", "strength_requirement", "stealth_disadvantage", "notes", "created_at", "updated_at"
)
SELECT
  "id", "character_id", "slot", "name", "category", "armor_class", "dex_bonus", "dex_bonus_max", "strength_requirement", "stealth_disadvantage", "notes", "created_at", "updated_at"
FROM `character_armor`;--> statement-breakpoint
DROP TABLE `character_armor`;--> statement-breakpoint
ALTER TABLE `__new_character_armor` RENAME TO `character_armor`;--> statement-breakpoint
CREATE UNIQUE INDEX `character_armor_character_id_slot_unique` ON `character_armor` (`character_id`,`slot`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
