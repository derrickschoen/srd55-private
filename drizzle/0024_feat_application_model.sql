PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_feat_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`min_level` integer,
	`ability_points` integer DEFAULT 0 NOT NULL,
	`ability_increase_abilities` TEXT,
	`ability_increase_maximum` integer,
	`repeatable` TINYINT(1) DEFAULT false NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "feat_definitions_min_level_check" CHECK(`min_level` IS NULL OR (typeof(`min_level`) = 'integer' AND `min_level` BETWEEN 1 AND 20)),
	CONSTRAINT "feat_definitions_ability_points_check" CHECK(typeof(`ability_points`) = 'integer' AND `ability_points` IN (0, 1, 2)),
	CONSTRAINT "feat_definitions_ability_increase_maximum_check" CHECK(`ability_increase_maximum` IS NULL OR (typeof(`ability_increase_maximum`) = 'integer' AND `ability_increase_maximum` BETWEEN 1 AND 30))
);

INSERT INTO `__new_feat_definitions` (
  `id`, `content_key`, `name`, `rules_edition`, `category`, `min_level`,
  `ability_points`, `ability_increase_abilities`,
  `ability_increase_maximum`, `repeatable`, `prerequisites`, `grant_rules`,
  `notes`, `created_at`, `updated_at`
)
SELECT
  `id`, `content_key`, `name`, `rules_edition`, `category`, `min_level`,
  `ability_points`, NULL, NULL, `repeatable`, `prerequisites`, `grant_rules`,
  `notes`, `created_at`, `updated_at`
FROM `feat_definitions`;

DROP TABLE `feat_definitions`;
ALTER TABLE `__new_feat_definitions` RENAME TO `feat_definitions`;

CREATE UNIQUE INDEX `feat_definitions_content_key_unique`
  ON `feat_definitions` (`content_key`);
CREATE INDEX `feat_definitions_name_rules_edition_index`
  ON `feat_definitions` (`name`,`rules_edition`);

CREATE TRIGGER catalog_register_feat_identity_before_insert
BEFORE INSERT ON feat_definitions
BEGIN
  SELECT RAISE(ABORT, 'feat content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'feat'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'feat', 'legacy-opaque', 'external',
    lower(NEW.name)
  );
END;

PRAGMA foreign_keys=ON;
