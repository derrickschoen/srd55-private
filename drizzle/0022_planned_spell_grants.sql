ALTER TABLE spell_selection_slots
  ADD COLUMN `selection_acquired_at_class_level` integer;

CREATE TEMP TABLE __gf1_wizard_acquisitions (
  character_id integer NOT NULL,
  source_instance_id integer NOT NULL,
  ordinal integer NOT NULL,
  acquired_at_class_level integer NOT NULL,
  spell_version_id integer
);

INSERT INTO __gf1_wizard_acquisitions (
  character_id,
  source_instance_id,
  ordinal,
  acquired_at_class_level,
  spell_version_id
)
SELECT
  source.character_id,
  source.id,
  CAST(acquisition.key AS integer) + 1,
  CASE
    WHEN CAST(acquisition.key AS integer) + 1 <= 6 THEN 1
    ELSE 2 + CAST((CAST(acquisition.key AS integer) - 6) / 2 AS integer)
  END,
  COALESCE(
    json_extract(acquisition.value, '$.spell_version_id'),
    (
      SELECT version.id
      FROM spell_versions AS version
      WHERE version.content_key =
        json_extract(acquisition.value, '$.spell_version_key')
    )
  )
FROM character_source_instances AS source
INNER JOIN class_definitions AS definition
  ON source.source_type = 'class'
 AND definition.id = source.source_definition_id
 AND definition.name = 'Wizard'
INNER JOIN json_each(
  CASE
    WHEN json_valid(source.config) AND json_type(source.config) = 'object'
      THEN source.config
    ELSE '{}'
  END,
  '$.wizard_spellbook_acquisitions'
) AS acquisition
WHERE source.state = 'active'
  AND json_type(acquisition.value) = 'object';

ALTER TABLE wizard_spellbook_entries
  RENAME TO __old_wizard_spellbook_entries;
DROP INDEX wizard_spellbook_entries_character_id_spell_version_id_unique;

CREATE TABLE `wizard_spellbook_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`source_instance_id` integer,
	`rule_key` VARCHAR,
	`ordinal` integer,
	`acquired_at_class_level` integer,
	`spell_version_id` integer,
	`spell_level_min` integer DEFAULT 1 NOT NULL,
	`spell_level_max` integer DEFAULT 9 NOT NULL,
	`allowed_spell_lists` TEXT,
	`allowed_schools` TEXT,
	`allowed_tags` TEXT,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`orphan_reason_code` VARCHAR,
	`orphaned_at` DATETIME,
	`selection_eligibility` VARCHAR DEFAULT 'unselected' NOT NULL,
	`selection_invalid_reason` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "wizard_spellbook_entries_logical_address_check" CHECK((
        source_instance_id IS NULL
        AND rule_key IS NULL
        AND ordinal IS NULL
      ) OR (
        source_instance_id IS NOT NULL
        AND rule_key IS NOT NULL
        AND ordinal IS NOT NULL
      )),
	CONSTRAINT "wizard_spellbook_entries_ordinal_check" CHECK(ordinal IS NULL OR (typeof(ordinal) = 'integer' AND ordinal >= 1)),
	CONSTRAINT "wizard_spellbook_entries_acquisition_level_check" CHECK(acquired_at_class_level IS NULL OR (
        typeof(acquired_at_class_level) = 'integer'
        AND acquired_at_class_level BETWEEN 1 AND 20
      )),
	CONSTRAINT "wizard_spellbook_entries_level_window_check" CHECK(spell_level_min BETWEEN 0 AND 9
        AND spell_level_max BETWEEN 0 AND 9
        AND spell_level_min <= spell_level_max),
	CONSTRAINT "wizard_spellbook_entries_state_check" CHECK(`state` IN ('active', 'orphaned')),
	CONSTRAINT "wizard_spellbook_entries_selection_eligibility_check" CHECK(`selection_eligibility` IN ('valid', 'invalid', 'unselected'))
);

INSERT INTO wizard_spellbook_entries (
  id,
  character_id,
  source_instance_id,
  rule_key,
  ordinal,
  acquired_at_class_level,
  spell_version_id,
  spell_level_min,
  spell_level_max,
  allowed_spell_lists,
  state,
  selection_eligibility,
  selection_invalid_reason,
  created_at,
  updated_at
)
SELECT
  old.id,
  old.character_id,
  (
    SELECT acquisition.source_instance_id
    FROM __gf1_wizard_acquisitions AS acquisition
    WHERE acquisition.character_id = old.character_id
      AND acquisition.spell_version_id = old.spell_version_id
    ORDER BY acquisition.source_instance_id, acquisition.ordinal
    LIMIT 1
  ),
  CASE WHEN EXISTS (
    SELECT 1
    FROM __gf1_wizard_acquisitions AS acquisition
    WHERE acquisition.character_id = old.character_id
      AND acquisition.spell_version_id = old.spell_version_id
  ) THEN 'wizard-spellbook' ELSE NULL END,
  (
    SELECT acquisition.ordinal
    FROM __gf1_wizard_acquisitions AS acquisition
    WHERE acquisition.character_id = old.character_id
      AND acquisition.spell_version_id = old.spell_version_id
    ORDER BY acquisition.source_instance_id, acquisition.ordinal
    LIMIT 1
  ),
  (
    SELECT acquisition.acquired_at_class_level
    FROM __gf1_wizard_acquisitions AS acquisition
    WHERE acquisition.character_id = old.character_id
      AND acquisition.spell_version_id = old.spell_version_id
    ORDER BY acquisition.source_instance_id, acquisition.ordinal
    LIMIT 1
  ),
  old.spell_version_id,
  1,
  COALESCE(
    (
      SELECT CAST((level.level + 1) / 2 AS integer)
      FROM __gf1_wizard_acquisitions AS acquisition
      INNER JOIN character_source_instances AS source
        ON source.id = acquisition.source_instance_id
      INNER JOIN character_class_levels AS level
        ON level.character_id = source.character_id
       AND level.class_definition_id = source.source_definition_id
      WHERE acquisition.character_id = old.character_id
        AND acquisition.spell_version_id = old.spell_version_id
      ORDER BY acquisition.source_instance_id, acquisition.ordinal
      LIMIT 1
    ),
    9
  ),
  CASE WHEN EXISTS (
    SELECT 1
    FROM __gf1_wizard_acquisitions AS acquisition
    WHERE acquisition.character_id = old.character_id
      AND acquisition.spell_version_id = old.spell_version_id
  ) THEN '["Wizard"]' ELSE NULL END,
  'active',
  CASE
    WHEN version.is_active = 1
      AND version.level BETWEEN 1 AND COALESCE(
        (
          SELECT CAST((level.level + 1) / 2 AS integer)
          FROM __gf1_wizard_acquisitions AS acquisition
          INNER JOIN character_source_instances AS source
            ON source.id = acquisition.source_instance_id
          INNER JOIN character_class_levels AS level
            ON level.character_id = source.character_id
           AND level.class_definition_id = source.source_definition_id
          WHERE acquisition.character_id = old.character_id
            AND acquisition.spell_version_id = old.spell_version_id
          ORDER BY acquisition.source_instance_id, acquisition.ordinal
          LIMIT 1
        ),
        9
      )
      AND (
        NOT EXISTS (
          SELECT 1
          FROM __gf1_wizard_acquisitions AS acquisition
          WHERE acquisition.character_id = old.character_id
            AND acquisition.spell_version_id = old.spell_version_id
        )
        OR EXISTS (
          SELECT 1
          FROM spell_list_memberships AS membership
          WHERE membership.spell_version_id = old.spell_version_id
            AND membership.spell_list_key = 'Wizard'
        )
      )
      THEN 'valid'
    ELSE 'invalid'
  END,
  CASE
    WHEN version.is_active = 1
      AND version.level BETWEEN 1 AND COALESCE(
        (
          SELECT CAST((level.level + 1) / 2 AS integer)
          FROM __gf1_wizard_acquisitions AS acquisition
          INNER JOIN character_source_instances AS source
            ON source.id = acquisition.source_instance_id
          INNER JOIN character_class_levels AS level
            ON level.character_id = source.character_id
           AND level.class_definition_id = source.source_definition_id
          WHERE acquisition.character_id = old.character_id
            AND acquisition.spell_version_id = old.spell_version_id
          ORDER BY acquisition.source_instance_id, acquisition.ordinal
          LIMIT 1
        ),
        9
      )
      AND (
        NOT EXISTS (
          SELECT 1
          FROM __gf1_wizard_acquisitions AS acquisition
          WHERE acquisition.character_id = old.character_id
            AND acquisition.spell_version_id = old.spell_version_id
        )
        OR EXISTS (
          SELECT 1
          FROM spell_list_memberships AS membership
          WHERE membership.spell_version_id = old.spell_version_id
            AND membership.spell_list_key = 'Wizard'
        )
      )
      THEN NULL
    ELSE 'Historical spellbook selection requires review.'
  END,
  old.created_at,
  old.updated_at
FROM __old_wizard_spellbook_entries AS old
INNER JOIN spell_versions AS version ON version.id = old.spell_version_id;

INSERT INTO wizard_spellbook_entries (
  character_id,
  source_instance_id,
  rule_key,
  ordinal,
  acquired_at_class_level,
  spell_version_id,
  spell_level_min,
  spell_level_max,
  allowed_spell_lists,
  state,
  selection_eligibility,
  created_at,
  updated_at
)
SELECT
  acquisition.character_id,
  acquisition.source_instance_id,
  'wizard-spellbook',
  acquisition.ordinal,
  acquisition.acquired_at_class_level,
  NULL,
  1,
  CAST((level.level + 1) / 2 AS integer),
  '["Wizard"]',
  'active',
  'unselected',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM __gf1_wizard_acquisitions AS acquisition
INNER JOIN character_source_instances AS source
  ON source.id = acquisition.source_instance_id
INNER JOIN character_class_levels AS level
  ON level.character_id = source.character_id
 AND level.class_definition_id = source.source_definition_id
WHERE NOT EXISTS (
  SELECT 1
  FROM wizard_spellbook_entries AS migrated
  WHERE migrated.source_instance_id = acquisition.source_instance_id
    AND migrated.rule_key = 'wizard-spellbook'
    AND migrated.ordinal = acquisition.ordinal
);

DROP TABLE __old_wizard_spellbook_entries;

CREATE UNIQUE INDEX `wizard_spellbook_entries_source_rule_ordinal_unique` ON `wizard_spellbook_entries` (`source_instance_id`,`rule_key`,`ordinal`);
CREATE UNIQUE INDEX `wizard_spellbook_entries_character_id_spell_version_id_unique` ON `wizard_spellbook_entries` (`character_id`,`spell_version_id`) WHERE spell_version_id IS NOT NULL AND state = 'active';
CREATE INDEX `wizard_spellbook_entries_character_id_state_index` ON `wizard_spellbook_entries` (`character_id`,`state`);

UPDATE character_source_instances
SET config = json_remove(config, '$.wizard_spellbook_acquisitions')
WHERE source_type = 'class'
  AND json_valid(config)
  AND json_type(config) = 'object'
  AND json_type(config, '$.wizard_spellbook_acquisitions') = 'array';

DROP TABLE __gf1_wizard_acquisitions;
