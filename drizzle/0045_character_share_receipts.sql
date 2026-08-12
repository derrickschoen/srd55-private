CREATE TABLE `character_share_receipts` (
	`character_id` integer PRIMARY KEY NOT NULL,
	`local_document_id` VARCHAR NOT NULL,
	`received_document_id` VARCHAR,
	`received_revision` integer,
	`baseline_character_revision` integer,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_share_receipts_local_document_id_check" CHECK(length("character_share_receipts"."local_document_id") > 0),
	CONSTRAINT "character_share_receipts_received_document_id_check" CHECK("character_share_receipts"."received_document_id" IS NULL OR length("character_share_receipts"."received_document_id") > 0),
	CONSTRAINT "character_share_receipts_received_pair_check" CHECK(("character_share_receipts"."received_document_id" IS NULL
            AND "character_share_receipts"."received_revision" IS NULL
            AND "character_share_receipts"."baseline_character_revision" IS NULL)
          OR ("character_share_receipts"."received_document_id" IS NOT NULL
            AND typeof("character_share_receipts"."received_revision") = 'integer'
            AND "character_share_receipts"."received_revision" >= 0
            AND typeof("character_share_receipts"."baseline_character_revision") = 'integer'
            AND "character_share_receipts"."baseline_character_revision" >= 0))
);

CREATE UNIQUE INDEX `character_share_receipts_local_document_id_unique` ON `character_share_receipts` (`local_document_id`);
CREATE UNIQUE INDEX `character_share_receipts_received_document_id_unique` ON `character_share_receipts` (`received_document_id`);
