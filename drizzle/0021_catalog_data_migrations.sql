CREATE TABLE `catalog_data_migrations` (
	`id` VARCHAR PRIMARY KEY NOT NULL,
	`scheme` VARCHAR NOT NULL,
	`checksum` VARCHAR NOT NULL,
	`applied_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "catalog_data_migrations_id_check" CHECK(length("catalog_data_migrations"."id") > 0),
	CONSTRAINT "catalog_data_migrations_scheme_check" CHECK("catalog_data_migrations"."scheme" IN ('content-v1')),
	CONSTRAINT "catalog_data_migrations_checksum_check" CHECK(length("catalog_data_migrations"."checksum") = 64
        AND "catalog_data_migrations"."checksum" NOT GLOB '*[^0-9a-f]*')
);
