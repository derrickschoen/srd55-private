-- CI-7: immutable external edits keep both aggregates installed and record
-- only recipient-local catalog lineage. Character references remain untouched;
-- HA-11 owns explicit per-character replacement.
CREATE TABLE `catalog_content_supersessions` (
	`content_kind` VARCHAR NOT NULL,
	`superseded_content_key` VARCHAR NOT NULL,
	`successor_content_key` VARCHAR NOT NULL,
	`recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `superseded_content_key`),
	FOREIGN KEY (`content_kind`,`superseded_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`content_kind`,`successor_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "catalog_content_supersessions_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_supersessions_distinct_keys_check" CHECK("catalog_content_supersessions"."superseded_content_key" <> "catalog_content_supersessions"."successor_content_key")
);

CREATE INDEX `catalog_content_supersessions_successor_index` ON `catalog_content_supersessions` (`content_kind`,`successor_content_key`);
