CREATE UNIQUE INDEX `character_class_levels_id_character_id_unique`
  ON `character_class_levels` (`id`,`character_id`);

CREATE TABLE `character_level_feat_choices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`character_class_level_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`choice_kind` VARCHAR NOT NULL,
	`feat_source_instance_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_class_level_id`,`character_id`) REFERENCES `character_class_levels`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feat_source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "character_level_feat_choices_class_level_check" CHECK(typeof("character_level_feat_choices"."class_level") = 'integer' AND "character_level_feat_choices"."class_level" BETWEEN 1 AND 20),
	CONSTRAINT "character_level_feat_choices_choice_kind_check" CHECK(`choice_kind` IN ('asi_level_feat', 'epic_boon'))
);

CREATE UNIQUE INDEX `character_level_feat_choices_class_level_kind_unique`
  ON `character_level_feat_choices` (`character_class_level_id`,`class_level`,`choice_kind`);
CREATE INDEX `character_level_feat_choices_character_id_index`
  ON `character_level_feat_choices` (`character_id`);

CREATE TRIGGER character_sources_clear_level_feat_choices_before_delete
BEFORE DELETE ON character_source_instances
BEGIN
  UPDATE character_level_feat_choices
     SET feat_source_instance_id = NULL,
         updated_at = CURRENT_TIMESTAMP
   WHERE character_id = OLD.character_id
     AND feat_source_instance_id = OLD.id;
END;
