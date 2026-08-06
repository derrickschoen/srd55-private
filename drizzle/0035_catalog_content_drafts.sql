CREATE TABLE `catalog_content_drafts` (
	`draft_uuid` VARCHAR PRIMARY KEY NOT NULL,
	`content_kind` VARCHAR NOT NULL,
	`document_version` integer NOT NULL,
	`base_content_key` VARCHAR,
	`revision` integer DEFAULT 0 NOT NULL,
	`document_json` TEXT NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`content_kind`,`base_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "catalog_content_drafts_uuid_check" CHECK(length("catalog_content_drafts"."draft_uuid") > 0),
	CONSTRAINT "catalog_content_drafts_kind_check" CHECK(`content_kind` IN ('species', 'subclass', 'background')),
	CONSTRAINT "catalog_content_drafts_document_version_check" CHECK(typeof("catalog_content_drafts"."document_version") = 'integer' AND "catalog_content_drafts"."document_version" >= 1),
	CONSTRAINT "catalog_content_drafts_revision_check" CHECK(typeof("catalog_content_drafts"."revision") = 'integer' AND "catalog_content_drafts"."revision" >= 0),
	CONSTRAINT "catalog_content_drafts_document_size_check" CHECK(length(CAST("catalog_content_drafts"."document_json" AS BLOB)) BETWEEN 1 AND 524288)
);

CREATE INDEX `catalog_content_drafts_kind_updated_index` ON `catalog_content_drafts` (`content_kind`,`updated_at`,`draft_uuid`);
CREATE INDEX `catalog_content_drafts_base_content_index` ON `catalog_content_drafts` (`content_kind`,`base_content_key`);
