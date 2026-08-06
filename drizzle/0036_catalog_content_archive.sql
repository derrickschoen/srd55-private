-- D138 / CI-5: creation archive state is durable local lifecycle metadata.
-- The HA-11 cascade service will own archive-set membership and commands;
-- this migration only gives the published creation identity a state that a
-- complete database image can preserve byte-for-byte.
DROP TRIGGER `catalog_register_class_identity_before_insert`;
DROP TRIGGER `catalog_register_subclass_identity_before_insert`;
DROP TRIGGER `catalog_register_feat_identity_before_insert`;
DROP TRIGGER `catalog_register_species_definition_identity_before_insert`;
DROP TRIGGER `catalog_register_background_definition_identity_before_insert`;
DROP TRIGGER `catalog_register_spell_identity_before_insert`;
DROP TRIGGER `catalog_register_species_template_identity_before_insert`;
DROP TRIGGER `catalog_register_background_template_identity_before_insert`;
DROP TRIGGER `catalog_register_armor_identity_before_insert`;
DROP TRIGGER `catalog_register_weapon_identity_before_insert`;
DROP TRIGGER `catalog_register_item_identity_before_insert`;

CREATE TABLE `__new_catalog_content_identities` (
	`content_key` VARCHAR PRIMARY KEY NOT NULL,
	`content_kind` VARCHAR NOT NULL,
	`key_kind` VARCHAR NOT NULL,
	`catalog_layer` VARCHAR NOT NULL,
	`normalized_name` VARCHAR NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` DATETIME,
	CONSTRAINT "catalog_content_identities_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_identities_key_kind_check" CHECK("__new_catalog_content_identities"."key_kind" IN ('derived', 'asserted', 'bundled-stable')),
	CONSTRAINT "catalog_content_identities_catalog_layer_check" CHECK("__new_catalog_content_identities"."catalog_layer" IN ('bundled', 'external')),
	CONSTRAINT "catalog_content_identities_normalized_name_check" CHECK(length("__new_catalog_content_identities"."normalized_name") > 0),
	CONSTRAINT "catalog_content_identities_archived_at_check" CHECK("__new_catalog_content_identities"."archived_at" IS NULL OR typeof("__new_catalog_content_identities"."archived_at") = 'text'),
	CONSTRAINT "catalog_content_identities_key_layer_check" CHECK((
        ("__new_catalog_content_identities"."key_kind" = 'derived'
          AND "__new_catalog_content_identities"."catalog_layer" = 'external'
          AND instr("__new_catalog_content_identities"."content_key", ':content.v1:') > 1
          AND substr(
            "__new_catalog_content_identities"."content_key",
            1,
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') - 1
          ) NOT GLOB '*[^a-z0-9-]*'
          AND substr("__new_catalog_content_identities"."content_key", 1, 1) <> '-'
          AND substr(
            "__new_catalog_content_identities"."content_key",
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') - 1,
            1
          ) <> '-'
          AND instr(
            substr(
              "__new_catalog_content_identities"."content_key",
              1,
              instr("__new_catalog_content_identities"."content_key", ':content.v1:') - 1
            ),
            '--'
          ) = 0
          AND length(substr(
            "__new_catalog_content_identities"."content_key",
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') + 12
          )) = 64
          AND substr(
            "__new_catalog_content_identities"."content_key",
            instr("__new_catalog_content_identities"."content_key", ':content.v1:') + 12
          ) NOT GLOB '*[^0-9a-f]*')
        OR ("__new_catalog_content_identities"."key_kind" = 'asserted'
          AND "__new_catalog_content_identities"."catalog_layer" = 'external'
          -- Exact grammar shared with isAssertedExternalContentKey:
          -- edition:name, or edition:dotted.owner:name. Every component is a
          -- lowercase alphanumeric/hyphen slug with no empty hyphen segment.
          AND length("__new_catalog_content_identities"."content_key") > 2
          AND "__new_catalog_content_identities"."content_key" NOT GLOB '*[^a-z0-9:.-]*'
          AND instr("__new_catalog_content_identities"."content_key", ':') > 1
          AND substr("__new_catalog_content_identities"."content_key", 1, 1) NOT IN ('-', '.', ':')
          AND substr("__new_catalog_content_identities"."content_key", -1, 1) NOT IN ('-', '.', ':')
          AND instr("__new_catalog_content_identities"."content_key", '::') = 0
          AND instr("__new_catalog_content_identities"."content_key", '..') = 0
          AND instr("__new_catalog_content_identities"."content_key", '--') = 0
          AND instr("__new_catalog_content_identities"."content_key", ':.') = 0
          AND instr("__new_catalog_content_identities"."content_key", '.:') = 0
          AND instr("__new_catalog_content_identities"."content_key", ':-') = 0
          AND instr("__new_catalog_content_identities"."content_key", '-:') = 0
          AND instr("__new_catalog_content_identities"."content_key", '.-') = 0
          AND instr("__new_catalog_content_identities"."content_key", '-.') = 0
          AND (
            (length("__new_catalog_content_identities"."content_key") - length(replace("__new_catalog_content_identities"."content_key", ':', '')) = 1
              AND instr("__new_catalog_content_identities"."content_key", '.') = 0)
            OR
            (length("__new_catalog_content_identities"."content_key") - length(replace("__new_catalog_content_identities"."content_key", ':', '')) = 2
              AND instr(substr("__new_catalog_content_identities"."content_key", instr("__new_catalog_content_identities"."content_key", ':') + 1), ':') > 1
              AND instr(substr("__new_catalog_content_identities"."content_key", 1, instr("__new_catalog_content_identities"."content_key", ':') - 1), '.') = 0
              AND instr(substr(
                "__new_catalog_content_identities"."content_key",
                instr("__new_catalog_content_identities"."content_key", ':') + 1,
                instr(substr("__new_catalog_content_identities"."content_key", instr("__new_catalog_content_identities"."content_key", ':') + 1), ':') - 1
              ), '.') > 1
              AND instr(substr(
                "__new_catalog_content_identities"."content_key",
                instr("__new_catalog_content_identities"."content_key", ':') +
                  instr(substr("__new_catalog_content_identities"."content_key", instr("__new_catalog_content_identities"."content_key", ':') + 1), ':') + 1
              ), '.') = 0)
          ))
        OR ("__new_catalog_content_identities"."key_kind" = 'bundled-stable'
          AND "__new_catalog_content_identities"."catalog_layer" = 'bundled')
      ))
);

INSERT INTO `__new_catalog_content_identities` (
  `content_key`, `content_kind`, `key_kind`, `catalog_layer`,
  `normalized_name`, `created_at`, `archived_at`
) SELECT
  `content_key`, `content_kind`, `key_kind`, `catalog_layer`,
  `normalized_name`, `created_at`, NULL
FROM `catalog_content_identities`;

DROP TABLE `catalog_content_identities`;
ALTER TABLE `__new_catalog_content_identities` RENAME TO `catalog_content_identities`;
CREATE UNIQUE INDEX `catalog_content_identities_kind_key_unique` ON `catalog_content_identities` (`content_kind`,`content_key`);
CREATE INDEX `catalog_content_identities_layer_kind_index` ON `catalog_content_identities` (`catalog_layer`,`content_kind`);
CREATE INDEX `catalog_content_identities_name_index` ON `catalog_content_identities` (`content_kind`,`normalized_name`);
CREATE INDEX `catalog_content_identities_archive_list_index` ON `catalog_content_identities` ("archived_at" desc,`content_kind`,`normalized_name`,`content_key`);

CREATE TRIGGER catalog_register_class_identity_before_insert
BEFORE INSERT ON class_definitions
BEGIN
  SELECT RAISE(ABORT, 'class content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'class' );
  SELECT RAISE(ABORT, 'class content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'class' );
END;
CREATE TRIGGER catalog_register_subclass_identity_before_insert
BEFORE INSERT ON subclass_definitions
BEGIN
  SELECT RAISE(ABORT, 'subclass content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'subclass' );
  SELECT RAISE(ABORT, 'subclass content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'subclass' );
END;
CREATE TRIGGER catalog_register_feat_identity_before_insert
BEFORE INSERT ON feat_definitions
BEGIN
  SELECT RAISE(ABORT, 'feat content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'feat' );
  SELECT RAISE(ABORT, 'feat content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'feat' );
END;
CREATE TRIGGER catalog_register_species_definition_identity_before_insert
BEFORE INSERT ON species_definitions
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'species' );
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'species' );
END;
CREATE TRIGGER catalog_register_background_definition_identity_before_insert
BEFORE INSERT ON background_definitions
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'background' );
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'background' );
END;
CREATE TRIGGER catalog_register_spell_identity_before_insert
BEFORE INSERT ON spell_versions
BEGIN
  SELECT RAISE(ABORT, 'spell content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'spell' );
  SELECT RAISE(ABORT, 'spell content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'spell' );
END;
CREATE TRIGGER catalog_register_species_template_identity_before_insert
BEFORE INSERT ON species_templates
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'species' );
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'species' );
END;
CREATE TRIGGER catalog_register_background_template_identity_before_insert
BEFORE INSERT ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'background' );
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'background' );
END;
CREATE TRIGGER catalog_register_armor_identity_before_insert
BEFORE INSERT ON armor_templates
BEGIN
  SELECT RAISE(ABORT, 'armor content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'armor' );
  SELECT RAISE(ABORT, 'armor content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'armor' );
END;
CREATE TRIGGER catalog_register_weapon_identity_before_insert
BEFORE INSERT ON weapon_templates
BEGIN
  SELECT RAISE(ABORT, 'weapon content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'weapon' );
  SELECT RAISE(ABORT, 'weapon content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'weapon' );
END;
CREATE TRIGGER catalog_register_item_identity_before_insert
BEFORE INSERT ON item_definitions
BEGIN
  SELECT RAISE(ABORT, 'item content key is registered for another kind')
  WHERE EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind <> 'item' );
  SELECT RAISE(ABORT, 'item content key must be registered before insert')
  WHERE NOT EXISTS ( SELECT 1 FROM catalog_content_identities WHERE content_key = NEW.content_key AND content_kind = 'item' );
END;
