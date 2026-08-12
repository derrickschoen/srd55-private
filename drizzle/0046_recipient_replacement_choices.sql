-- S6-08: a recipient's explicit choice to keep one character on an older
-- version survives navigation and can be shown when the review is reopened.
CREATE TABLE `catalog_content_replacement_choices` (
	`content_kind` VARCHAR NOT NULL,
	`superseded_content_key` VARCHAR NOT NULL,
	`successor_content_key` VARCHAR NOT NULL,
	`character_id` integer NOT NULL,
	`decided_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `superseded_content_key`, `successor_content_key`, `character_id`),
	FOREIGN KEY (`content_kind`,`superseded_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_kind`,`successor_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_replacement_choices_kind_check" CHECK(`content_kind` IN ('species', 'subclass', 'background')),
	CONSTRAINT "catalog_content_replacement_choices_distinct_keys_check" CHECK("catalog_content_replacement_choices"."superseded_content_key" <> "catalog_content_replacement_choices"."successor_content_key"),
	CONSTRAINT "catalog_content_replacement_choices_character_id_check" CHECK(typeof("catalog_content_replacement_choices"."character_id") = 'integer' AND "catalog_content_replacement_choices"."character_id" >= 1),
	CONSTRAINT "catalog_content_replacement_choices_decided_at_check" CHECK(typeof("catalog_content_replacement_choices"."decided_at") = 'text')
);
--> statement-breakpoint
CREATE INDEX `catalog_content_replacement_choices_character_index` ON `catalog_content_replacement_choices` (`character_id`,`content_kind`);
