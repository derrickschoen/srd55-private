PRAGMA foreign_keys=OFF;

ALTER TABLE character_sheet_adjustments
  RENAME TO __old_character_sheet_adjustments;
DROP INDEX character_sheet_adjustments_character_id_unique;

INSERT INTO character_effects (
  character_id,
  sort_order,
  effect_kind,
  amount,
  source_instance_id,
  character_item_id,
  character_weapon_id,
  template_ref,
  label,
  created_at,
  updated_at
)
SELECT
  adjustment.character_id,
  COALESCE((
    SELECT MAX(effect.sort_order)
    FROM character_effects AS effect
    WHERE effect.character_id = adjustment.character_id
  ), 0) + 1,
  'armor_class_bonus',
  adjustment.armor_class_adjustment,
  NULL,
  NULL,
  NULL,
  NULL,
  COALESCE(
    adjustment.armor_class_adjustment_note,
    'Manual Armor Class adjustment'
  ),
  adjustment.created_at,
  adjustment.updated_at
FROM __old_character_sheet_adjustments AS adjustment
WHERE adjustment.armor_class_adjustment <> 0;

DROP TABLE __old_character_sheet_adjustments;

CREATE TABLE `character_sheet_adjustments` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `character_id` integer NOT NULL,
  `created_at` DATETIME,
  `updated_at` DATETIME,
  FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`)
    ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `character_sheet_adjustments_character_id_unique`
  ON `character_sheet_adjustments` (`character_id`);

PRAGMA foreign_keys=ON;
