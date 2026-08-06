-- HA-4 fix round 1 / N1: a background's printed feat name is display text,
-- not content identity. Preserve the exact installed Origin feat by content
-- key. Legacy rows are backfilled only when their old name is unambiguous;
-- no match or an ambiguous match remains NULL instead of guessing. Migration
-- execution is guarded by its result-schema checksum in applyMigrationSuffix;
-- an explicit rerun is therefore a no-op before this rebuild can touch data.
DROP TRIGGER `catalog_register_background_template_identity_before_insert`;

CREATE TABLE `__new_background_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`ability_score_1` VARCHAR NOT NULL,
	`ability_score_2` VARCHAR NOT NULL,
	`ability_score_3` VARCHAR NOT NULL,
	`feat_name` VARCHAR NOT NULL,
	`default_origin_feat_content_key` VARCHAR,
	`skill_proficiency_1` VARCHAR NOT NULL,
	`skill_proficiency_2` VARCHAR NOT NULL,
	`tool_proficiency` VARCHAR NOT NULL,
	`equipment_option_a` TEXT NOT NULL,
	`equipment_option_b` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`default_origin_feat_content_key`) REFERENCES `feat_definitions`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "background_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);

INSERT INTO `__new_background_templates` (
  `id`, `content_key`, `rules_edition`, `name`, `ability_score_1`,
  `ability_score_2`, `ability_score_3`, `feat_name`,
  `default_origin_feat_content_key`, `skill_proficiency_1`,
  `skill_proficiency_2`, `tool_proficiency`, `equipment_option_a`,
  `equipment_option_b`, `created_at`, `updated_at`
)
SELECT
  template.`id`, template.`content_key`, template.`rules_edition`,
  template.`name`, template.`ability_score_1`, template.`ability_score_2`,
  template.`ability_score_3`, template.`feat_name`,
  COALESCE(
    (
      SELECT MIN(feat.`content_key`)
      FROM `feat_definitions` AS feat
      WHERE feat.`name` = template.`feat_name`
        AND feat.`rules_edition` = template.`rules_edition`
        AND feat.`category` = 'origin'
      HAVING COUNT(*) = 1
    ),
    CASE
      WHEN template.`feat_name` GLOB 'Magic Initiate (*)' THEN (
        SELECT MIN(feat.`content_key`)
        FROM `feat_definitions` AS feat
        WHERE feat.`name` = 'Magic Initiate'
          AND feat.`rules_edition` = template.`rules_edition`
          AND feat.`category` = 'origin'
        HAVING COUNT(*) = 1
      )
      ELSE NULL
    END
  ),
  template.`skill_proficiency_1`, template.`skill_proficiency_2`,
  template.`tool_proficiency`, template.`equipment_option_a`,
  template.`equipment_option_b`, template.`created_at`, template.`updated_at`
FROM `background_templates` AS template;

DROP TABLE `background_templates`;
ALTER TABLE `__new_background_templates` RENAME TO `background_templates`;
CREATE UNIQUE INDEX `background_templates_content_key_unique` ON `background_templates` (`content_key`);
CREATE INDEX `background_templates_name_rules_edition_index` ON `background_templates` (`name`,`rules_edition`);

CREATE TRIGGER catalog_register_background_template_identity_before_insert
BEFORE INSERT ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'background'
  );
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'background'
  );
  SELECT RAISE(ABORT, 'background default Origin feat key must name an installed Origin feat')
  WHERE NEW.default_origin_feat_content_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM feat_definitions
      WHERE content_key = NEW.default_origin_feat_content_key
        AND category = 'origin'
    );
END;

CREATE TRIGGER background_default_origin_feat_before_update
BEFORE UPDATE OF default_origin_feat_content_key ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background default Origin feat key must name an installed Origin feat')
  WHERE NEW.default_origin_feat_content_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM feat_definitions
      WHERE content_key = NEW.default_origin_feat_content_key
        AND category = 'origin'
    );
END;
