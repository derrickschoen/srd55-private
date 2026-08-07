-- D214 / HA-11: an archived set promises the exact character roots present
-- when it was archived. There is intentionally no character foreign key:
-- deletion must preserve the evidence that makes a later restore refuse.
CREATE TABLE `catalog_content_archive_members` (
	`content_kind` VARCHAR NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`character_id` integer NOT NULL,
	`character_revision` integer NOT NULL,
	`character_name` VARCHAR NOT NULL,
	`archived_at` DATETIME NOT NULL,
	PRIMARY KEY(`content_kind`, `content_key`, `character_id`),
	FOREIGN KEY (`content_kind`,`content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_archive_members_kind_check" CHECK(`content_kind` IN ('species', 'subclass', 'background')),
	CONSTRAINT "catalog_content_archive_members_character_id_check" CHECK(typeof("catalog_content_archive_members"."character_id") = 'integer' AND "catalog_content_archive_members"."character_id" >= 1),
	CONSTRAINT "catalog_content_archive_members_character_revision_check" CHECK(typeof("catalog_content_archive_members"."character_revision") = 'integer' AND "catalog_content_archive_members"."character_revision" >= 0),
	CONSTRAINT "catalog_content_archive_members_archived_at_check" CHECK(typeof("catalog_content_archive_members"."archived_at") = 'text')
);

-- Existing archived sets can be manifested once from the still-live roots
-- whose archive timestamp matches the creation. Future restores never repeat
-- this inference; all subsequent membership comes from archive-time writes.
INSERT INTO catalog_content_archive_members (
  content_kind, content_key, character_id, character_revision,
  character_name, archived_at
)
SELECT DISTINCT identity.content_kind, identity.content_key,
       character.id, character.revision, character.name, identity.archived_at
FROM catalog_content_identities AS identity
JOIN species_definitions AS definition
  ON identity.content_kind = 'species'
 AND definition.content_key = identity.content_key
JOIN character_source_instances AS source
  ON source.source_type = 'species'
 AND source.source_definition_id = definition.id
 AND source.state = 'active'
JOIN characters AS character
  ON character.id = source.character_id
 AND character.archived_at = identity.archived_at
WHERE identity.archived_at IS NOT NULL
UNION
SELECT DISTINCT identity.content_kind, identity.content_key,
       character.id, character.revision, character.name, identity.archived_at
FROM catalog_content_identities AS identity
JOIN background_definitions AS definition
  ON identity.content_kind = 'background'
 AND definition.content_key = identity.content_key
JOIN character_source_instances AS source
  ON source.source_type = 'background'
 AND source.source_definition_id = definition.id
 AND source.state = 'active'
JOIN characters AS character
  ON character.id = source.character_id
 AND character.archived_at = identity.archived_at
WHERE identity.archived_at IS NOT NULL
UNION
SELECT DISTINCT identity.content_kind, identity.content_key,
       character.id, character.revision, character.name, identity.archived_at
FROM catalog_content_identities AS identity
JOIN subclass_definitions AS definition
  ON identity.content_kind = 'subclass'
 AND definition.content_key = identity.content_key
JOIN character_class_levels AS level
  ON level.subclass_definition_id = definition.id
JOIN characters AS character
  ON character.id = level.character_id
 AND character.archived_at = identity.archived_at
WHERE identity.archived_at IS NOT NULL;
