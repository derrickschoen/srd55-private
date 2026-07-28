PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TEMP TABLE `__background_coin_preflight` (`message` TEXT NOT NULL);--> statement-breakpoint
CREATE TEMP TRIGGER `__background_coin_preflight_abort`
BEFORE INSERT ON `__background_coin_preflight`
BEGIN
  SELECT RAISE(ABORT, NEW.message);
END;--> statement-breakpoint
INSERT INTO `__background_coin_preflight` (`message`)
SELECT 'background_equipment_items id ' || id || ' coin_copper=' ||
       quote(coin_copper) || ' cannot be rendered as whole GP'
FROM `background_equipment_items`
WHERE item_kind = 'coin'
  AND (
    coin_copper IS NULL
    OR typeof(coin_copper) <> 'integer'
    OR coin_copper < 1
    OR coin_copper % 100 <> 0
  )
ORDER BY id
LIMIT 1;--> statement-breakpoint
CREATE TABLE `__new_background_equipment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`background_template_id` integer NOT NULL,
	`option` VARCHAR NOT NULL,
	`sort_order` integer NOT NULL,
	`quantity` integer NOT NULL,
	`item_name` VARCHAR NOT NULL,
	`item_kind` VARCHAR NOT NULL,
	`weapon_template_id` integer,
	`armor_template_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`background_template_id`) REFERENCES `background_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_template_id`) REFERENCES `weapon_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`armor_template_id`) REFERENCES `armor_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "background_equipment_items_option_check" CHECK(`option` IN ('a', 'b')),
	CONSTRAINT "background_equipment_items_item_kind_check" CHECK(`item_kind` IN ('gear', 'weapon', 'armor')),
	CONSTRAINT "background_equipment_items_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1),
	CONSTRAINT "background_equipment_items_quantity_check" CHECK(typeof(`quantity`) = 'integer' AND `quantity` >= 1),
	CONSTRAINT "background_equipment_items_payload_check" CHECK(CASE `item_kind`
        WHEN 'weapon' THEN `weapon_template_id` IS NOT NULL
          AND `armor_template_id` IS NULL
        WHEN 'armor' THEN `armor_template_id` IS NOT NULL
          AND `weapon_template_id` IS NULL
        ELSE `weapon_template_id` IS NULL AND `armor_template_id` IS NULL
      END)
);
--> statement-breakpoint
INSERT INTO `__new_background_equipment_items`("id", "background_template_id", "option", "sort_order", "quantity", "item_name", "item_kind", "weapon_template_id", "armor_template_id", "created_at", "updated_at")
SELECT "id", "background_template_id", "option", "sort_order", "quantity",
       CASE "item_kind"
         WHEN 'coin' THEN CAST("coin_copper" / 100 AS TEXT) || ' GP'
         ELSE "item_name"
       END,
       CASE "item_kind" WHEN 'coin' THEN 'gear' ELSE "item_kind" END,
       "weapon_template_id", "armor_template_id", "created_at", "updated_at"
FROM `background_equipment_items`;--> statement-breakpoint
DROP TRIGGER `__background_coin_preflight_abort`;--> statement-breakpoint
DROP TABLE `__background_coin_preflight`;--> statement-breakpoint
DROP TABLE `background_equipment_items`;--> statement-breakpoint
ALTER TABLE `__new_background_equipment_items` RENAME TO `background_equipment_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `background_equipment_items_template_option_sort_order_unique` ON `background_equipment_items` (`background_template_id`,`option`,`sort_order`);--> statement-breakpoint
CREATE INDEX `background_equipment_items_background_template_id_index` ON `background_equipment_items` (`background_template_id`);
