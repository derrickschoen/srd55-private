PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_character_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`source_instance_id` integer,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase')),
	CONSTRAINT "character_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "character_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "character_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "character_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "character_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "character_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "character_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "character_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "character_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "character_effects_ability_increase_source_check" CHECK(effect_kind IS NOT 'ability_increase' OR source_instance_id IS NOT NULL),
	CONSTRAINT "character_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "character_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "character_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_character_effects`(
  "id", "character_id", "sort_order", "effect_kind", "damage_type",
  "hit_points_flat", "hit_points_per_level", "speed_bonus_feet",
  "ability", "amount", "maximum",
  "source_instance_id", "label", "notes", "created_at", "updated_at"
)
SELECT
  "id", "character_id", "sort_order", "effect_kind", "damage_type",
  "hit_points_flat", "hit_points_per_level", "speed_bonus_feet",
  NULL, NULL, NULL,
  "source_instance_id", "label", "notes", "created_at", "updated_at"
FROM `character_effects`;--> statement-breakpoint
DROP TABLE `character_effects`;--> statement-breakpoint
ALTER TABLE `__new_character_effects` RENAME TO `character_effects`;--> statement-breakpoint
CREATE INDEX `character_effects_character_id_index` ON `character_effects` (`character_id`);--> statement-breakpoint
CREATE TABLE `__new_species_template_trait_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_template_trait_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`species_template_trait_id`) REFERENCES `species_template_traits`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "species_template_trait_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase')),
	CONSTRAINT "species_template_trait_effects_damage_type_check" CHECK((`damage_type` IS NULL OR `damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'))),
	CONSTRAINT "species_template_trait_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "species_template_trait_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "species_template_trait_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "species_template_trait_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_no_ability_increase_check" CHECK(effect_kind IS NOT 'ability_increase'),
	CONSTRAINT "species_template_trait_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_species_template_trait_effects`(
  "id", "species_template_trait_id", "sort_order", "effect_kind",
  "damage_type", "hit_points_flat", "hit_points_per_level",
  "speed_bonus_feet", "created_at", "updated_at"
)
SELECT
  "id", "species_template_trait_id", "sort_order", "effect_kind",
  "damage_type", "hit_points_flat", "hit_points_per_level",
  "speed_bonus_feet", "created_at", "updated_at"
FROM `species_template_trait_effects`;--> statement-breakpoint
DROP TABLE `species_template_trait_effects`;--> statement-breakpoint
ALTER TABLE `__new_species_template_trait_effects` RENAME TO `species_template_trait_effects`;--> statement-breakpoint
CREATE UNIQUE INDEX `species_template_trait_effects_trait_sort_unique` ON `species_template_trait_effects` (`species_template_trait_id`,`sort_order`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
