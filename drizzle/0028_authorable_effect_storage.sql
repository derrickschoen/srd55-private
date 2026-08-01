CREATE TABLE `__new_species_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`creature_type` VARCHAR NOT NULL,
	`size` VARCHAR NOT NULL,
	`alternate_size` VARCHAR,
	`base_speed_feet` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "species_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded')),
	CONSTRAINT "species_templates_base_speed_check" CHECK(typeof(`base_speed_feet`) = 'integer' AND `base_speed_feet` >= 1)
);
INSERT INTO `__new_species_templates` SELECT * FROM `species_templates`;
DROP TABLE `species_templates`;
ALTER TABLE `__new_species_templates` RENAME TO `species_templates`;
CREATE UNIQUE INDEX `species_templates_content_key_unique` ON `species_templates` (`content_key`);
CREATE INDEX `species_templates_name_rules_edition_index` ON `species_templates` (`name`,`rules_edition`);

CREATE TABLE `__new_species_template_trait_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_template_trait_id` integer NOT NULL,
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
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`species_template_trait_id`) REFERENCES `species_template_traits`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "species_template_trait_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "species_template_trait_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "species_template_trait_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "species_template_trait_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "species_template_trait_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "species_template_trait_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "species_template_trait_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "species_template_trait_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "species_template_trait_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "species_template_trait_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "species_template_trait_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "species_template_trait_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "species_template_trait_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
INSERT INTO `__new_species_template_trait_effects` (
	`id`, `species_template_trait_id`, `sort_order`, `effect_kind`,
	`damage_type`, `hit_points_flat`, `hit_points_per_level`,
	`speed_bonus_feet`, `base`, `ability_1`, `ability_2`, `allows_shield`,
	`weapon_scope`, `label`, `created_at`, `updated_at`
) SELECT
	`id`, `species_template_trait_id`, `sort_order`, `effect_kind`,
	`damage_type`, `hit_points_flat`, `hit_points_per_level`,
	`speed_bonus_feet`, `base`, `ability_1`, `ability_2`, `allows_shield`,
	`weapon_scope`, (
		SELECT trait.name FROM species_template_traits AS trait
		WHERE trait.id = species_template_trait_effects.species_template_trait_id
	), `created_at`, `updated_at`
FROM `species_template_trait_effects`;
DROP TABLE `species_template_trait_effects`;
ALTER TABLE `__new_species_template_trait_effects` RENAME TO `species_template_trait_effects`;
CREATE UNIQUE INDEX `species_template_trait_effects_trait_sort_unique` ON `species_template_trait_effects` (`species_template_trait_id`,`sort_order`);

CREATE TABLE `__new_subclass_feature_effects` (
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
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_feature_id`) REFERENCES `subclass_features`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_feature_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus', 'extra_attack')),
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
INSERT INTO `__new_subclass_feature_effects` (
	`id`, `subclass_feature_id`, `sort_order`, `effect_kind`, `damage_type`,
	`hit_points_flat`, `hit_points_per_level`, `speed_bonus_feet`, `ability`,
	`amount`, `maximum`, `base`, `ability_1`, `ability_2`, `allows_shield`,
	`weapon_scope`, `attack_count`, `label`, `created_at`, `updated_at`
) SELECT
	`id`, `subclass_feature_id`, `sort_order`, `effect_kind`, `damage_type`,
	`hit_points_flat`, `hit_points_per_level`, `speed_bonus_feet`, `ability`,
	`amount`, `maximum`, `base`, `ability_1`, `ability_2`, `allows_shield`,
	`weapon_scope`, `attack_count`, (
		SELECT feature.name FROM subclass_features AS feature
		WHERE feature.id = subclass_feature_effects.subclass_feature_id
	), `created_at`, `updated_at`
FROM `subclass_feature_effects`;
DROP TABLE `subclass_feature_effects`;
ALTER TABLE `__new_subclass_feature_effects` RENAME TO `subclass_feature_effects`;
CREATE UNIQUE INDEX `subclass_feature_effects_feature_sort_unique` ON `subclass_feature_effects` (`subclass_feature_id`,`sort_order`);

DROP INDEX `subclass_features_subclass_name_unique`;
CREATE UNIQUE INDEX `subclass_features_subclass_level_name_unique` ON `subclass_features` (`subclass_definition_id`,`class_level`,`name`);

CREATE TABLE `background_template_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`background_template_id` integer NOT NULL,
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
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`background_template_id`) REFERENCES `background_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "background_template_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "background_template_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "background_template_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "background_template_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "background_template_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "background_template_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "background_template_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "background_template_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "background_template_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "background_template_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "background_template_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "background_template_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "background_template_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "background_template_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "background_template_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "background_template_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "background_template_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "background_template_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "background_template_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "background_template_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "background_template_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "background_template_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "background_template_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "background_template_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "background_template_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
CREATE UNIQUE INDEX `background_template_effects_template_sort_unique` ON `background_template_effects` (`background_template_id`,`sort_order`);
CREATE INDEX `background_template_effects_background_template_id_index` ON `background_template_effects` (`background_template_id`);

CREATE TRIGGER catalog_register_species_template_identity_before_insert
BEFORE INSERT ON species_templates
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'species'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'species', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;
