CREATE TABLE `class_equipment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`option` VARCHAR NOT NULL,
	`sort_order` integer NOT NULL,
	`quantity` integer NOT NULL,
	`item_name` VARCHAR NOT NULL,
	`item_kind` VARCHAR NOT NULL,
	`weapon_template_id` integer,
	`armor_template_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_template_id`) REFERENCES `weapon_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`armor_template_id`) REFERENCES `armor_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "class_equipment_items_option_check" CHECK(`option` IN ('a', 'b', 'c')),
	CONSTRAINT "class_equipment_items_item_kind_check" CHECK(`item_kind` IN ('gear', 'weapon', 'armor')),
	CONSTRAINT "class_equipment_items_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1),
	CONSTRAINT "class_equipment_items_quantity_check" CHECK(typeof(`quantity`) = 'integer' AND `quantity` >= 1),
	CONSTRAINT "class_equipment_items_payload_check" CHECK(CASE `item_kind`
        WHEN 'weapon' THEN `weapon_template_id` IS NOT NULL
          AND `armor_template_id` IS NULL
        WHEN 'armor' THEN `armor_template_id` IS NOT NULL
          AND `weapon_template_id` IS NULL
        ELSE `weapon_template_id` IS NULL AND `armor_template_id` IS NULL
      END)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `class_equipment_items_class_option_sort_order_unique` ON `class_equipment_items` (`class_definition_id`,`option`,`sort_order`);--> statement-breakpoint
CREATE INDEX `class_equipment_items_class_definition_id_index` ON `class_equipment_items` (`class_definition_id`);