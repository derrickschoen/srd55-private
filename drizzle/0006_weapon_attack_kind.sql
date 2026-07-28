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
  "id", "character_id", "name", "proficiency_category", "attack_kind",
  "damage_kind", "damage_dice", "damage_flat", "damage_custom", "damage_type",
  "versatile_damage_kind", "versatile_damage_dice", "versatile_damage_flat",
  "versatile_damage_custom", "finesse", "heavy", "light", "loading", "reach",
  "thrown", "two_handed", "ammunition", "ammunition_kind", "range_kind",
  "range_near_feet", "range_far_feet", "mastery_property", "mastery_selected",
  "other_properties", "notes", "created_at", "updated_at"
)
SELECT
  cw."id", cw."character_id", cw."name", cw."proficiency_category",
  (
    SELECT CASE
      WHEN COUNT(DISTINCT CASE wt."srd_group"
        WHEN 'simple_melee' THEN 'melee'
        WHEN 'martial_melee' THEN 'melee'
        WHEN 'simple_ranged' THEN 'ranged'
        WHEN 'martial_ranged' THEN 'ranged'
      END) = 1
      THEN MIN(CASE wt."srd_group"
        WHEN 'simple_melee' THEN 'melee'
        WHEN 'martial_melee' THEN 'melee'
        WHEN 'simple_ranged' THEN 'ranged'
        WHEN 'martial_ranged' THEN 'ranged'
      END)
      ELSE NULL
    END
    FROM `weapon_templates` AS wt
    WHERE wt."name" = cw."name"
      AND wt."damage_kind" = cw."damage_kind"
      AND wt."damage_dice" IS cw."damage_dice"
      AND wt."damage_flat" IS cw."damage_flat"
      AND wt."damage_custom" IS cw."damage_custom"
      AND wt."damage_type" IS cw."damage_type"
      AND wt."versatile_damage_kind" = cw."versatile_damage_kind"
      AND wt."versatile_damage_dice" IS cw."versatile_damage_dice"
      AND wt."versatile_damage_flat" IS cw."versatile_damage_flat"
      AND wt."versatile_damage_custom" IS cw."versatile_damage_custom"
      AND wt."finesse" = cw."finesse"
      AND wt."heavy" = cw."heavy"
      AND wt."light" = cw."light"
      AND wt."loading" = cw."loading"
      AND wt."reach" = cw."reach"
      AND wt."thrown" = cw."thrown"
      AND wt."two_handed" = cw."two_handed"
      AND wt."ammunition" = cw."ammunition"
      AND wt."ammunition_kind" IS cw."ammunition_kind"
      AND wt."range_kind" = cw."range_kind"
      AND wt."range_near_feet" IS cw."range_near_feet"
      AND wt."range_far_feet" IS cw."range_far_feet"
      AND wt."mastery_property" IS cw."mastery_property"
      AND wt."other_properties" IS cw."other_properties"
      AND cw."proficiency_category" = CASE wt."srd_group"
        WHEN 'simple_melee' THEN 'simple'
        WHEN 'simple_ranged' THEN 'simple'
        WHEN 'martial_melee' THEN 'martial'
        WHEN 'martial_ranged' THEN 'martial'
      END
  ),
  cw."damage_kind", cw."damage_dice", cw."damage_flat", cw."damage_custom",
  cw."damage_type", cw."versatile_damage_kind", cw."versatile_damage_dice",
  cw."versatile_damage_flat", cw."versatile_damage_custom", cw."finesse",
  cw."heavy", cw."light", cw."loading", cw."reach", cw."thrown",
  cw."two_handed", cw."ammunition", cw."ammunition_kind", cw."range_kind",
  cw."range_near_feet", cw."range_far_feet", cw."mastery_property",
  cw."mastery_selected", cw."other_properties", cw."notes", cw."created_at",
  cw."updated_at"
FROM `character_weapons` AS cw;--> statement-breakpoint
DROP TABLE `character_weapons`;--> statement-breakpoint
ALTER TABLE `__new_character_weapons` RENAME TO `character_weapons`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `character_weapons_character_id_index` ON `character_weapons` (`character_id`);
