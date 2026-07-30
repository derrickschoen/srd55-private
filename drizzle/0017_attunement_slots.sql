PRAGMA foreign_keys=OFF;

CREATE TABLE `character_attunement_slots` (
	`character_id` integer PRIMARY KEY NOT NULL,
	`slot_1_item_id` integer,
	`slot_2_item_id` integer,
	`slot_3_item_id` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slot_1_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_2_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_3_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "character_attunement_slots_distinct_check" CHECK(
        (slot_1_item_id IS NULL OR slot_2_item_id IS NULL OR slot_1_item_id <> slot_2_item_id)
        AND (slot_1_item_id IS NULL OR slot_3_item_id IS NULL OR slot_1_item_id <> slot_3_item_id)
        AND (slot_2_item_id IS NULL OR slot_3_item_id IS NULL OR slot_2_item_id <> slot_3_item_id)
      )
);

INSERT INTO character_attunement_slots (
  character_id, slot_1_item_id, slot_2_item_id, slot_3_item_id
)
SELECT
  character_id,
  MAX(CASE WHEN ordinal = 1 THEN id END),
  MAX(CASE WHEN ordinal = 2 THEN id END),
  MAX(CASE WHEN ordinal = 3 THEN id END)
FROM (
  SELECT
    id,
    character_id,
    ROW_NUMBER() OVER (PARTITION BY character_id ORDER BY id) AS ordinal
  FROM character_items
  WHERE attuned = 1
)
WHERE ordinal <= 3
GROUP BY character_id;

ALTER TABLE character_items DROP COLUMN attuned;

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
