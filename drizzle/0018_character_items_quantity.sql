PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_character_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`description` TEXT,
	`quantity` integer DEFAULT 1 NOT NULL,
	`requires_attunement` TINYINT(1) DEFAULT false NOT NULL,
	`source_instance_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_items_quantity_check" CHECK(typeof(`quantity`) = 'integer' AND `quantity` >= 1)
);

INSERT INTO `__new_character_items` (
  `id`, `character_id`, `name`, `description`, `quantity`,
  `requires_attunement`, `source_instance_id`, `created_at`, `updated_at`
)
SELECT
  `id`, `character_id`, `name`, `description`, 1,
  `requires_attunement`, `source_instance_id`, `created_at`, `updated_at`
FROM `character_items`;

DROP TABLE `character_items`;
ALTER TABLE `__new_character_items` RENAME TO `character_items`;

CREATE INDEX `character_items_character_id_index`
  ON `character_items` (`character_id`);
CREATE UNIQUE INDEX `character_items_id_character_id_unique`
  ON `character_items` (`id`,`character_id`);

CREATE TRIGGER character_items_clear_attunement_slots_before_delete
    BEFORE DELETE ON character_items
BEGIN
    UPDATE character_attunement_slots
       SET slot_1_item_id = CASE
             WHEN slot_1_item_id = OLD.id THEN NULL ELSE slot_1_item_id END,
           slot_2_item_id = CASE
             WHEN slot_2_item_id = OLD.id THEN NULL ELSE slot_2_item_id END,
           slot_3_item_id = CASE
             WHEN slot_3_item_id = OLD.id THEN NULL ELSE slot_3_item_id END
     WHERE character_id = OLD.character_id
       AND OLD.id IN (slot_1_item_id, slot_2_item_id, slot_3_item_id);
END;

PRAGMA foreign_keys=ON;
