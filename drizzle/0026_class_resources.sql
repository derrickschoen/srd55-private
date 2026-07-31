CREATE TABLE `class_resource_formulas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`resource_kind` VARCHAR NOT NULL,
	`formula_kind` VARCHAR NOT NULL,
	`minimum_class_level` integer NOT NULL,
	`fixed_count` integer,
	`ability` VARCHAR,
	`multiplier` integer,
	`later_fixed_count_steps` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_resource_formulas_resource_kind_check" CHECK(`resource_kind` IN ('persistent_rage_recovery', 'bardic_inspiration', 'divine_intervention', 'wild_resurgence_conversion', 'nature_magician_conversion', 'action_surge', 'indomitable', 'uncanny_metabolism', 'lay_on_hands', 'paladins_smite', 'faithful_steed', 'tireless', 'natures_veil', 'stroke_of_luck', 'innate_sorcery', 'sorcerous_restoration', 'magical_cunning', 'contact_patron')),
	CONSTRAINT "class_resource_formulas_formula_kind_check" CHECK(`formula_kind` IN ('fixed_count', 'fixed_count_by_class_level', 'ability_modifier_minimum_one', 'class_level_multiple')),
	CONSTRAINT "class_resource_formulas_level_check" CHECK(minimum_class_level BETWEEN 1 AND 20),
	CONSTRAINT "class_resource_formulas_fixed_count_check" CHECK((`fixed_count` IS NULL OR (typeof(`fixed_count`) = 'integer' AND `fixed_count` >= 1))),
	CONSTRAINT "class_resource_formulas_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('charisma', 'wisdom'))),
	CONSTRAINT "class_resource_formulas_multiplier_check" CHECK((`multiplier` IS NULL OR (typeof(`multiplier`) = 'integer' AND `multiplier` >= 1))),
	CONSTRAINT "class_resource_formulas_payload_check" CHECK((
        formula_kind IS 'fixed_count'
        AND fixed_count IS NOT NULL
        AND ability IS NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NULL
      ) OR (
        formula_kind IS 'fixed_count_by_class_level'
        AND fixed_count IS NOT NULL
        AND ability IS NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NOT NULL
      ) OR (
        formula_kind IS 'ability_modifier_minimum_one'
        AND fixed_count IS NULL
        AND ability IS NOT NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NULL
      ) OR (
        formula_kind IS 'class_level_multiple'
        AND fixed_count IS NULL
        AND ability IS NULL
        AND multiplier IS NOT NULL
        AND later_fixed_count_steps IS NULL
      )),
	CONSTRAINT "class_resource_formulas_steps_json_check" CHECK(later_fixed_count_steps IS NULL OR (
        json_valid(later_fixed_count_steps)
        AND json_type(later_fixed_count_steps) IS 'array'
        AND json_array_length(later_fixed_count_steps) > 0
      ))
);

CREATE UNIQUE INDEX `class_resource_formulas_class_definition_id_resource_kind_unique` ON `class_resource_formulas` (`class_definition_id`,`resource_kind`);
CREATE TABLE `class_resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`resource_kind` VARCHAR NOT NULL,
	`maximum` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_resources_kind_check" CHECK(`resource_kind` IN ('rage', 'channel_divinity', 'wild_shape', 'second_wind', 'focus_points', 'favored_enemy', 'sorcery_points')),
	CONSTRAINT "class_resources_level_maximum_check" CHECK(class_level BETWEEN 1 AND 20 AND typeof(`maximum`) = 'integer' AND `maximum` >= 0)
);

CREATE UNIQUE INDEX `class_resources_class_definition_id_class_level_resource_kind_unique` ON `class_resources` (`class_definition_id`,`class_level`,`resource_kind`);
