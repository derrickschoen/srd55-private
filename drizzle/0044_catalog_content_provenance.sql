-- S6-12 separates immutable rules identity from transfer provenance. Existing
-- external rows cannot be classified retrospectively, so they stay honestly
-- unknown; bundled rows are the only history whose origin this image proves.

CREATE TABLE `catalog_content_provenance` (
	`content_kind` VARCHAR NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`origin_kind` VARCHAR NOT NULL,
	`received` TINYINT(1) NOT NULL,
	`local_derivation` TINYINT(1) NOT NULL,
	`author_label` VARCHAR,
	`source_label` VARCHAR,
	`license_label` VARCHAR,
	`attribution_text` TEXT,
	`recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `content_key`),
	FOREIGN KEY (`content_kind`,`content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_provenance_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_provenance_origin_kind_check" CHECK(`origin_kind` IN ('authored_here', 'built_in', 'unknown')),
	CONSTRAINT "catalog_content_provenance_received_check" CHECK("catalog_content_provenance"."received" IN (0, 1)),
	CONSTRAINT "catalog_content_provenance_local_derivation_check" CHECK("catalog_content_provenance"."local_derivation" IN (0, 1)),
	CONSTRAINT "catalog_content_provenance_labels_check" CHECK(("catalog_content_provenance"."author_label" IS NULL OR length("catalog_content_provenance"."author_label") BETWEEN 1 AND 200)
        AND ("catalog_content_provenance"."source_label" IS NULL OR length("catalog_content_provenance"."source_label") BETWEEN 1 AND 200)
        AND ("catalog_content_provenance"."license_label" IS NULL OR length("catalog_content_provenance"."license_label") BETWEEN 1 AND 200)
        AND ("catalog_content_provenance"."attribution_text" IS NULL OR length(CAST("catalog_content_provenance"."attribution_text" AS BLOB)) BETWEEN 1 AND 4096))
);

CREATE INDEX `catalog_content_provenance_received_index` ON `catalog_content_provenance` (`received`,`origin_kind`,`content_kind`);

INSERT INTO `catalog_content_provenance` (
  `content_kind`, `content_key`, `origin_kind`, `received`, `local_derivation`
)
SELECT
  `content_kind`, `content_key`,
  CASE `catalog_layer` WHEN 'bundled' THEN 'built_in' ELSE 'unknown' END,
  0, 0
FROM `catalog_content_identities`;
