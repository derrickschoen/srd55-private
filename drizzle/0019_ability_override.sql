PRAGMA foreign_keys=OFF;

ALTER TABLE character_effects RENAME TO __old_character_effects;
DROP INDEX character_effects_character_id_index;
DROP INDEX character_effects_character_item_id_index;
DROP INDEX character_effects_character_weapon_id_index;

CREATE TABLE `character_effects` (
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
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`source_instance_id` integer,
	`character_item_id` integer,
	`character_weapon_id` integer,
	`template_ref` TEXT,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_weapon_id`,`character_id`) REFERENCES `character_weapons`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "character_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "character_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "character_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "character_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "character_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "character_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "character_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "character_effects_ability_increase_source_check" CHECK(effect_kind IS NOT 'ability_increase' OR source_instance_id IS NOT NULL),
	CONSTRAINT "character_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "character_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "character_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "character_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "character_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "character_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "character_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "character_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "character_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "character_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "character_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

INSERT INTO character_effects (
  id, character_id, sort_order, effect_kind, damage_type, hit_points_flat,
  hit_points_per_level, speed_bonus_feet, ability, amount, maximum, base,
  ability_1, ability_2, allows_shield, weapon_scope, source_instance_id,
  character_item_id, character_weapon_id, template_ref, label, notes,
  created_at, updated_at
)
SELECT
  id, character_id, sort_order, effect_kind, damage_type, hit_points_flat,
  hit_points_per_level, speed_bonus_feet, ability, amount, maximum, base,
  ability_1, ability_2, allows_shield, weapon_scope, source_instance_id,
  character_item_id, character_weapon_id, template_ref, label, notes,
  created_at, updated_at
FROM __old_character_effects;

DROP TABLE __old_character_effects;

CREATE INDEX `character_effects_character_id_index`
  ON `character_effects` (`character_id`);
CREATE INDEX `character_effects_character_item_id_index`
  ON `character_effects` (`character_item_id`);
CREATE INDEX `character_effects_character_weapon_id_index`
  ON `character_effects` (`character_weapon_id`);

PRAGMA foreign_keys=ON;
