CREATE TABLE `__new_weapon_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`srd_group` VARCHAR NOT NULL,
	`damage_kind` VARCHAR NOT NULL,
	`damage_dice` VARCHAR,
	`damage_flat` integer,
	`damage_custom` VARCHAR,
	`damage_type` VARCHAR NOT NULL,
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
	`mastery_property` VARCHAR NOT NULL,
	`other_properties` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "weapon_templates_damage_check" CHECK((
        (damage_kind = 'dice' AND damage_dice IS NOT NULL AND damage_flat IS NULL AND damage_custom IS NULL)
        OR (damage_kind = 'flat' AND damage_dice IS NULL AND damage_flat IS NOT NULL AND damage_flat >= 0 AND damage_custom IS NULL)
        OR (damage_kind = 'custom' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NOT NULL)
        OR (damage_kind = 'not_recorded' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NULL)
      )),
	CONSTRAINT "weapon_templates_versatile_damage_check" CHECK((
        (versatile_damage_kind = 'dice' AND versatile_damage_dice IS NOT NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'flat' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NOT NULL AND versatile_damage_flat >= 0 AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'custom' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NOT NULL)
        OR (versatile_damage_kind = 'not_applicable' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
      )),
	CONSTRAINT "weapon_templates_range_check" CHECK((
        (range_near_feet IS NULL OR (typeof(range_near_feet) = 'integer' AND range_near_feet BETWEEN 0 AND 100000))
        AND (range_far_feet IS NULL OR (typeof(range_far_feet) = 'integer' AND range_far_feet BETWEEN 0 AND 100000))
        AND (
          (range_kind = 'none' AND range_near_feet IS NULL AND range_far_feet IS NULL)
          OR (range_kind = 'ranged' AND range_near_feet IS NOT NULL AND (range_far_feet IS NULL OR range_far_feet >= range_near_feet))
        )
      )),
	CONSTRAINT "weapon_templates_mastery_property_check" CHECK(`mastery_property` IN ('Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex')),
	CONSTRAINT "weapon_templates_srd_group_check" CHECK(`srd_group` IN ('simple_melee', 'simple_ranged', 'martial_melee', 'martial_ranged')),
	CONSTRAINT "weapon_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);
--> statement-breakpoint
INSERT INTO `__new_weapon_templates` (
  `id`, `content_key`, `rules_edition`, `name`, `srd_group`, `damage_kind`,
  `damage_dice`, `damage_flat`, `damage_custom`, `damage_type`,
  `versatile_damage_kind`, `versatile_damage_dice`, `versatile_damage_flat`,
  `versatile_damage_custom`, `finesse`, `heavy`, `light`, `loading`, `reach`,
  `thrown`, `two_handed`, `ammunition`, `ammunition_kind`, `range_kind`,
  `range_near_feet`, `range_far_feet`, `mastery_property`, `other_properties`,
  `created_at`, `updated_at`
)
SELECT
  `id`, `content_key`, `rules_edition`, `name`, `srd_group`, `damage_kind`,
  `damage_dice`, `damage_flat`, `damage_custom`, `damage_type`,
  `versatile_damage_kind`, `versatile_damage_dice`, `versatile_damage_flat`,
  `versatile_damage_custom`, `finesse`, `heavy`, `light`, `loading`, `reach`,
  `thrown`, `two_handed`, `ammunition`, `ammunition_kind`, `range_kind`,
  `range_near_feet`, `range_far_feet`, `mastery_property`, `other_properties`,
  `created_at`, `updated_at`
FROM `weapon_templates`;
--> statement-breakpoint
DROP TABLE `weapon_templates`;
--> statement-breakpoint
ALTER TABLE `__new_weapon_templates` RENAME TO `weapon_templates`;
--> statement-breakpoint
CREATE UNIQUE INDEX `weapon_templates_content_key_unique` ON `weapon_templates` (`content_key`);
--> statement-breakpoint
CREATE TRIGGER catalog_register_weapon_identity_before_insert
BEFORE INSERT ON weapon_templates
BEGIN
  SELECT RAISE(ABORT, 'weapon content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'weapon'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'weapon', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;
--> statement-breakpoint
CREATE TABLE `item_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`description` TEXT NOT NULL,
	`requires_attunement` TINYINT(1) DEFAULT false NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_definitions_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_definitions_content_key_unique` ON `item_definitions` (`content_key`);
--> statement-breakpoint
CREATE INDEX `item_definitions_name_index` ON `item_definitions` (`name`);
--> statement-breakpoint
CREATE TABLE `item_definition_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_definition_id` integer NOT NULL,
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
	FOREIGN KEY (`item_definition_id`) REFERENCES `item_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "item_definition_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "item_definition_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "item_definition_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "item_definition_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "item_definition_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "item_definition_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "item_definition_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "item_definition_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "item_definition_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "item_definition_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "item_definition_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "item_definition_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "item_definition_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "item_definition_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "item_definition_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "item_definition_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "item_definition_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "item_definition_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "item_definition_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "item_definition_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "item_definition_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "item_definition_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "item_definition_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "item_definition_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "item_definition_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_definition_effects_definition_sort_unique` ON `item_definition_effects` (`item_definition_id`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `item_definition_effects_definition_index` ON `item_definition_effects` (`item_definition_id`);
--> statement-breakpoint
CREATE TRIGGER catalog_register_item_identity_before_insert
BEFORE INSERT ON item_definitions
BEGIN
  SELECT RAISE(ABORT, 'item content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'item'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'item', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;
