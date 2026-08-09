CREATE TABLE `u2a_catalog_data_migrations` (
	`id` VARCHAR PRIMARY KEY NOT NULL,
	`scheme` VARCHAR NOT NULL,
	`checksum` VARCHAR NOT NULL,
	`applied_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "catalog_data_migrations_id_check" CHECK(length("u2a_catalog_data_migrations"."id") > 0),
	CONSTRAINT "catalog_data_migrations_scheme_check" CHECK("u2a_catalog_data_migrations"."scheme" IN ('content-v1', 'content-v2')),
	CONSTRAINT "catalog_data_migrations_checksum_check" CHECK(length("u2a_catalog_data_migrations"."checksum") = 64
        AND "u2a_catalog_data_migrations"."checksum" NOT GLOB '*[^0-9a-f]*')
);
INSERT INTO `u2a_catalog_data_migrations`
SELECT `id`, `scheme`, `checksum`, `applied_at` FROM `catalog_data_migrations`;
DROP TABLE `catalog_data_migrations`;
ALTER TABLE `u2a_catalog_data_migrations` RENAME TO `catalog_data_migrations`;

CREATE TABLE `u2a_catalog_content_fingerprints` (
	`content_kind` VARCHAR NOT NULL,
	`fingerprint_scheme` VARCHAR NOT NULL,
	`fingerprint_digest` VARCHAR NOT NULL,
	`canonical_json` VARCHAR NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`fingerprint_role` VARCHAR NOT NULL,
	PRIMARY KEY(`content_kind`, `fingerprint_scheme`, `fingerprint_digest`, `content_key`),
	FOREIGN KEY (`content_kind`,`content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_fingerprints_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_fingerprints_scheme_check" CHECK("u2a_catalog_content_fingerprints"."fingerprint_scheme" IN ('content-v1', 'content-v2')),
	CONSTRAINT "catalog_content_fingerprints_digest_check" CHECK(length("u2a_catalog_content_fingerprints"."fingerprint_digest") = 64
        AND "u2a_catalog_content_fingerprints"."fingerprint_digest" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "catalog_content_fingerprints_role_check" CHECK("u2a_catalog_content_fingerprints"."fingerprint_role"
        IN ('current', 'compatible', 'bundled-historical'))
);
INSERT INTO `u2a_catalog_content_fingerprints`
SELECT `content_kind`, `fingerprint_scheme`, `fingerprint_digest`,
       `canonical_json`, `content_key`, `fingerprint_role`
FROM `catalog_content_fingerprints`;
DROP TABLE `catalog_content_fingerprints`;
ALTER TABLE `u2a_catalog_content_fingerprints` RENAME TO `catalog_content_fingerprints`;
CREATE UNIQUE INDEX `catalog_content_fingerprints_current_unique`
ON `catalog_content_fingerprints` (`content_key`)
WHERE "catalog_content_fingerprints"."fingerprint_role" = 'current';
CREATE INDEX `catalog_content_fingerprints_resolution_index`
ON `catalog_content_fingerprints` (`content_kind`,`fingerprint_scheme`,`fingerprint_digest`);

CREATE TABLE `u2a_catalog_content_match_decisions` (
	`content_kind` VARCHAR NOT NULL,
	`incoming_fingerprint_scheme` VARCHAR NOT NULL,
	`incoming_fingerprint_digest` VARCHAR NOT NULL,
	`decision` VARCHAR NOT NULL,
	`target_content_key` VARCHAR NOT NULL,
	`reviewed_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `incoming_fingerprint_scheme`, `incoming_fingerprint_digest`),
	FOREIGN KEY (`content_kind`,`target_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "catalog_content_match_decisions_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_match_decisions_scheme_check" CHECK("u2a_catalog_content_match_decisions"."incoming_fingerprint_scheme" IN ('content-v1', 'content-v2')),
	CONSTRAINT "catalog_content_match_decisions_digest_check" CHECK(length("u2a_catalog_content_match_decisions"."incoming_fingerprint_digest") = 64
        AND "u2a_catalog_content_match_decisions"."incoming_fingerprint_digest" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "catalog_content_match_decisions_decision_check" CHECK("u2a_catalog_content_match_decisions"."decision" IN ('match', 'clone'))
);
INSERT INTO `u2a_catalog_content_match_decisions`
SELECT `content_kind`, `incoming_fingerprint_scheme`,
       `incoming_fingerprint_digest`, `decision`, `target_content_key`,
       `reviewed_at`
FROM `catalog_content_match_decisions`;
DROP TABLE `catalog_content_match_decisions`;
ALTER TABLE `u2a_catalog_content_match_decisions` RENAME TO `catalog_content_match_decisions`;
