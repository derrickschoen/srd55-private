PRAGMA foreign_keys=OFF;

CREATE TEMP TABLE __ac2a_subclass_effects AS
SELECT id AS feature_id, effect_kind, effect_attack_count, effect_weapon_scope,
       created_at, updated_at
FROM subclass_features
WHERE effect_kind IS NOT NULL;

ALTER TABLE subclass_features RENAME TO __old_subclass_features;
DROP INDEX subclass_features_subclass_sort_unique;
DROP INDEX subclass_features_subclass_name_unique;
CREATE TABLE `subclass_features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`description` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_definition_id`) REFERENCES `subclass_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_features_class_level_check" CHECK(class_level BETWEEN 1 AND 20),
	CONSTRAINT "subclass_features_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
CREATE UNIQUE INDEX `subclass_features_subclass_sort_unique` ON `subclass_features` (`subclass_definition_id`,`sort_order`);
CREATE UNIQUE INDEX `subclass_features_subclass_name_unique` ON `subclass_features` (`subclass_definition_id`,`name`);

INSERT INTO subclass_features (
  id, subclass_definition_id, class_level, sort_order, name, description,
  created_at, updated_at
)
SELECT id, subclass_definition_id, class_level, sort_order, name, description,
       created_at, updated_at
FROM __old_subclass_features;

CREATE TABLE `subclass_feature_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_feature_id` integer NOT NULL,
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
	`attack_count` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_feature_id`) REFERENCES `subclass_features`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_feature_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus', 'extra_attack')),
	CONSTRAINT "subclass_feature_effects_damage_type_check" CHECK((`damage_type` IS NULL OR `damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'))),
	CONSTRAINT "subclass_feature_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "subclass_feature_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "subclass_feature_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "subclass_feature_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')),
	CONSTRAINT "subclass_feature_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "subclass_feature_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "subclass_feature_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "subclass_feature_effects_attack_count_kind_check" CHECK(attack_count IS NULL OR effect_kind IS 'extra_attack'),
	CONSTRAINT "subclass_feature_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "subclass_feature_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "subclass_feature_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "subclass_feature_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_extra_attack_payload_check" CHECK(effect_kind IS NOT 'extra_attack' OR (attack_count IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "subclass_feature_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "subclass_feature_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "subclass_feature_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "subclass_feature_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "subclass_feature_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "subclass_feature_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "subclass_feature_effects_attack_count_check" CHECK((`attack_count` IS NULL OR (typeof(`attack_count`) = 'integer' AND `attack_count` >= 2))),
	CONSTRAINT "subclass_feature_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
CREATE UNIQUE INDEX `subclass_feature_effects_feature_sort_unique` ON `subclass_feature_effects` (`subclass_feature_id`,`sort_order`);

INSERT INTO subclass_feature_effects (
  subclass_feature_id, sort_order, effect_kind, attack_count, weapon_scope,
  created_at, updated_at
)
SELECT feature_id, 1, effect_kind, effect_attack_count, effect_weapon_scope,
       created_at, updated_at
FROM __ac2a_subclass_effects;
DROP TABLE __old_subclass_features;
DROP TABLE __ac2a_subclass_effects;

CREATE TEMP TABLE __ac2a_named_effects AS
SELECT id AS feature_id, effect_kind, effect_attack_count, effect_weapon_scope,
       created_at, updated_at
FROM named_features
WHERE effect_kind IS NOT NULL;

ALTER TABLE named_features RENAME TO __old_named_features;
DROP INDEX named_features_content_key_unique;
DROP INDEX named_features_class_name_rules_edition_unique;
CREATE TABLE `named_features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`class_definition_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`prerequisite` TEXT NOT NULL,
	`description` TEXT NOT NULL,
	`class_level` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "named_features_class_level_check" CHECK(class_level BETWEEN 1 AND 20)
);
CREATE UNIQUE INDEX `named_features_content_key_unique` ON `named_features` (`content_key`);
CREATE UNIQUE INDEX `named_features_class_name_rules_edition_unique` ON `named_features` (`class_definition_id`,`name`,`rules_edition`);

INSERT INTO named_features (
  id, content_key, class_definition_id, name, rules_edition, prerequisite,
  description, class_level, created_at, updated_at
)
SELECT id, content_key, class_definition_id, name, rules_edition, prerequisite,
       description, class_level, created_at, updated_at
FROM __old_named_features;

CREATE TABLE `named_feature_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`named_feature_id` integer NOT NULL,
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
	`attack_count` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`named_feature_id`) REFERENCES `named_features`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "named_feature_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus', 'extra_attack')),
	CONSTRAINT "named_feature_effects_damage_type_check" CHECK((`damage_type` IS NULL OR `damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'))),
	CONSTRAINT "named_feature_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "named_feature_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "named_feature_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "named_feature_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')),
	CONSTRAINT "named_feature_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "named_feature_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "named_feature_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "named_feature_effects_attack_count_kind_check" CHECK(attack_count IS NULL OR effect_kind IS 'extra_attack'),
	CONSTRAINT "named_feature_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "named_feature_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "named_feature_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "named_feature_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "named_feature_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "named_feature_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_extra_attack_payload_check" CHECK(effect_kind IS NOT 'extra_attack' OR (attack_count IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "named_feature_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "named_feature_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "named_feature_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "named_feature_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "named_feature_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "named_feature_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "named_feature_effects_attack_count_check" CHECK((`attack_count` IS NULL OR (typeof(`attack_count`) = 'integer' AND `attack_count` >= 2))),
	CONSTRAINT "named_feature_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
CREATE UNIQUE INDEX `named_feature_effects_feature_sort_unique` ON `named_feature_effects` (`named_feature_id`,`sort_order`);

INSERT INTO named_feature_effects (
  named_feature_id, sort_order, effect_kind, attack_count, weapon_scope,
  created_at, updated_at
)
SELECT feature_id, 1, effect_kind, effect_attack_count, effect_weapon_scope,
       created_at, updated_at
FROM __ac2a_named_effects;
DROP TABLE __old_named_features;
DROP TABLE __ac2a_named_effects;

CREATE TABLE `class_feature_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`name` VARCHAR NOT NULL,
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
	`attack_count` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_feature_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus', 'extra_attack')),
	CONSTRAINT "class_feature_effects_damage_type_check" CHECK((`damage_type` IS NULL OR `damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'))),
	CONSTRAINT "class_feature_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "class_feature_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "class_feature_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "class_feature_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')),
	CONSTRAINT "class_feature_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "class_feature_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "class_feature_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "class_feature_effects_attack_count_kind_check" CHECK(attack_count IS NULL OR effect_kind IS 'extra_attack'),
	CONSTRAINT "class_feature_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "class_feature_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "class_feature_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "class_feature_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "class_feature_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "class_feature_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_extra_attack_payload_check" CHECK(effect_kind IS NOT 'extra_attack' OR (attack_count IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "class_feature_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "class_feature_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "class_feature_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "class_feature_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "class_feature_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "class_feature_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "class_feature_effects_attack_count_check" CHECK((`attack_count` IS NULL OR (typeof(`attack_count`) = 'integer' AND `attack_count` >= 2))),
	CONSTRAINT "class_feature_effects_class_level_check" CHECK(class_level BETWEEN 1 AND 20)
);
CREATE UNIQUE INDEX `class_feature_effects_class_name_level_unique` ON `class_feature_effects` (`class_definition_id`,`name`,`class_level`);

ALTER TABLE species_template_trait_effects
  RENAME TO __old_species_template_trait_effects;
DROP INDEX species_template_trait_effects_trait_sort_unique;
CREATE TABLE `species_template_trait_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_template_trait_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`species_template_trait_id`) REFERENCES `species_template_traits`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "species_template_trait_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_formula')),
	CONSTRAINT "species_template_trait_effects_damage_type_check" CHECK((`damage_type` IS NULL OR `damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'))),
	CONSTRAINT "species_template_trait_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "species_template_trait_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "species_template_trait_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "species_template_trait_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "species_template_trait_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "species_template_trait_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "species_template_trait_effects_no_ability_increase_check" CHECK(effect_kind IS NOT 'ability_increase'),
	CONSTRAINT "species_template_trait_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
CREATE UNIQUE INDEX `species_template_trait_effects_trait_sort_unique` ON `species_template_trait_effects` (`species_template_trait_id`,`sort_order`);

INSERT INTO species_template_trait_effects (
  id, species_template_trait_id, sort_order, effect_kind, damage_type,
  hit_points_flat, hit_points_per_level, speed_bonus_feet,
  base, ability_1, ability_2, allows_shield, weapon_scope,
  created_at, updated_at
)
SELECT id, species_template_trait_id, sort_order, effect_kind, damage_type,
       hit_points_flat, hit_points_per_level, speed_bonus_feet,
       NULL, NULL, NULL, NULL, NULL, created_at, updated_at
FROM __old_species_template_trait_effects;
DROP TABLE __old_species_template_trait_effects;

ALTER TABLE character_effects RENAME TO __old_character_effects;
DROP INDEX character_effects_character_id_index;
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
	`template_ref` TEXT,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "character_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "character_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "character_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "character_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "character_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')),
	CONSTRAINT "character_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "character_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "character_effects_ability_increase_source_check" CHECK(effect_kind IS NOT 'ability_increase' OR source_instance_id IS NOT NULL),
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
CREATE INDEX `character_effects_character_id_index` ON `character_effects` (`character_id`);

INSERT INTO character_effects (
  id, character_id, sort_order, effect_kind, damage_type,
  hit_points_flat, hit_points_per_level, speed_bonus_feet,
  ability, amount, maximum, base, ability_1, ability_2, allows_shield,
  weapon_scope, source_instance_id, template_ref, label, notes,
  created_at, updated_at
)
SELECT id, character_id, sort_order, effect_kind, damage_type,
       hit_points_flat, hit_points_per_level, speed_bonus_feet,
       ability, amount, maximum, base, ability_1, ability_2, allows_shield,
       weapon_scope, source_instance_id, NULL, label, notes,
       created_at, updated_at
FROM __old_character_effects;
DROP TABLE __old_character_effects;

PRAGMA foreign_keys=ON;
