-- Migration 0066 is frozen as these SQL bytes. Its generated source was
-- db/schema/origins.ts: species_template_senses (PC-EXPORT-TRUTH fix 1, owner
-- D923 Q10: an authored species states its senses). A row is a statement and
-- its absence is "unstated"; no existing row gains one, so replay writes no data.

CREATE TABLE `species_template_senses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_template_id` integer NOT NULL,
	`senses_json` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`species_template_id`) REFERENCES `species_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "species_template_senses_json_check" CHECK(json_valid(senses_json) AND json_type(senses_json) = 'array')
);

CREATE UNIQUE INDEX `species_template_senses_template_unique` ON `species_template_senses` (`species_template_id`);
