import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import { applicationSeed } from '../../src/db/bootstrap';
import { DatabaseContext } from '../../src/db/database';
import { selectableCatalogContentSql } from '../../src/queries/selectable-catalog-content';
import { openTestDatabase } from '../../tests/helpers/open-db';

interface Probe {
  readonly label: string;
  readonly sql: string;
  readonly bindings: readonly SqlValue[];
}

interface Candidate {
  readonly label: string;
  readonly createIndexes: readonly string[];
  readonly probes: readonly Probe[];
}

interface SeedIds {
  readonly characterId: number;
  readonly rootSourceId: number;
  readonly spellVersionIds: readonly number[];
  readonly spellContentKey: string;
  readonly fingerprintScheme: string;
  readonly fingerprintDigest: string;
}

function scalarNumber(db: DatabaseContext, sql: string): number {
  return Number(db.scalar(sql) ?? 0);
}

function seedCharacterWorkload(db: DatabaseContext): SeedIds {
  const characterId = db.exec(
    "INSERT INTO characters (name, allow_legacy) VALUES ('EXPLAIN fixture', 0)",
  ).lastInsertId;
  const classDefinitionId = Number(
    db.scalar(
      "SELECT id FROM class_definitions WHERE content_key = '2024:class:wizard'",
    ),
  );
  if (!Number.isInteger(classDefinitionId) || classDefinitionId < 1) {
    throw new Error('The bundled seed did not install its class fixture.');
  }
  const rootSourceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state
     ) VALUES (?, 'explain:source:root', 'class', ?, 'EXPLAIN root', '{}', 1, 'active')`,
    [characterId, classDefinitionId],
  ).lastInsertId;

  for (let ordinal = 1; ordinal <= 24; ordinal += 1) {
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, parent_source_instance_id, source_type,
         source_definition_id, display_name, config,
         acquired_at_character_level, state, notes
       ) VALUES (?, ?, ?, 'feat', NULL, ?, '{}', 1, 'active', ?)`,
      [
        characterId,
        `explain:source:child:${String(ordinal)}`,
        rootSourceId,
        `EXPLAIN child ${String(ordinal).padStart(2, '0')}`,
        `grant_rule:explain:${String(ordinal)}`,
      ],
    );
    db.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state
       ) VALUES (?, ?, ?, ?, NULL, 'active')`,
      [characterId, rootSourceId, `explain-skill-${String(ordinal)}`, ordinal],
    );
    db.exec(
      `INSERT INTO character_skill_expertise_grants (
         character_id, source_instance_id, grant_key, ordinal,
         granted_at_class_level, skill, state
       ) VALUES (?, ?, ?, ?, ?, NULL, 'active')`,
      [
        characterId,
        rootSourceId,
        `explain-expertise-${String(ordinal)}`,
        ordinal,
        (ordinal % 20) + 1,
      ],
    );
  }

  const spellRows = db.allRaw(
    `SELECT id, content_key
     FROM spell_versions
     WHERE is_active = 1
     ORDER BY id
     LIMIT 24`,
  );
  const spellVersionIds = spellRows.map((row) => Number(row.id));
  const firstSpell = spellRows[0];
  if (firstSpell === undefined || spellVersionIds.some((id) => !Number.isInteger(id))) {
    throw new Error('The bundled seed did not install its spell fixture.');
  }

  for (const [index, spellVersionId] of spellVersionIds.entries()) {
    const ordinal = index + 1;
    const fixed = index % 2 === 0;
    db.exec(
      `INSERT INTO spell_selection_slots (
         character_id, source_instance_id, slot_key, rule_key, ordinal,
         bucket, eligibility_kind, fixed_spell_version_id,
         current_spell_version_id, spell_level_min, spell_level_max,
         state, sort_order, selection_eligibility
       ) VALUES (?, ?, ?, 'explain-slot', ?, 'prepared', 'choice_from_list',
                 ?, ?, 0, 9, 'active', ?, 'valid')`,
      [
        characterId,
        rootSourceId,
        `explain:slot:${String(ordinal)}`,
        ordinal,
        fixed ? spellVersionId : null,
        fixed ? null : spellVersionId,
        ordinal,
      ],
    );
    db.exec(
      `INSERT INTO wizard_spellbook_entries (
         character_id, source_instance_id, rule_key, ordinal,
         acquired_at_class_level, spell_version_id, spell_level_min,
         spell_level_max, state, selection_eligibility
       ) VALUES (?, ?, 'explain-book', ?, 1, ?, 0, 9, 'active', 'valid')`,
      [characterId, rootSourceId, ordinal, spellVersionId],
    );
  }

  const loadoutId = db.exec(
    "INSERT INTO spell_loadouts (character_id, name) VALUES (?, 'EXPLAIN loadout')",
    [characterId],
  ).lastInsertId;
  for (const spellVersionId of spellVersionIds.slice(0, 12)) {
    db.exec(
      `INSERT INTO spell_loadout_entries (
         spell_loadout_id, spell_version_id, role
       ) VALUES (?, ?, 'prepared')`,
      [loadoutId, spellVersionId],
    );
    db.exec(
      `INSERT INTO character_spell_preferences (
         character_id, spell_version_id, favourite
       ) VALUES (?, ?, 1)`,
      [characterId, spellVersionId],
    );
  }

  const fingerprint = db.oneRaw(
    `SELECT fingerprint_scheme, fingerprint_digest
     FROM catalog_content_fingerprints
     WHERE content_kind = 'spell' AND content_key = ?
       AND fingerprint_role = 'current'`,
    [String(firstSpell.content_key)],
  );
  if (fingerprint === null) {
    throw new Error('The bundled seed did not install its fingerprint fixture.');
  }
  return {
    characterId,
    rootSourceId,
    spellVersionIds,
    spellContentKey: String(firstSpell.content_key),
    fingerprintScheme: String(fingerprint.fingerprint_scheme),
    fingerprintDigest: String(fingerprint.fingerprint_digest),
  };
}

function plan(db: DatabaseContext, probe: Probe): readonly string[] {
  return db
    .allRaw(`EXPLAIN QUERY PLAN ${probe.sql}`, [...probe.bindings])
    .map((row) => String(row.detail));
}

function indexName(createIndex: string): string {
  const match = /^CREATE INDEX ([a-z0-9_]+) ON /u.exec(createIndex);
  if (match?.[1] === undefined) {
    throw new Error(`Cannot parse candidate index name from: ${createIndex}`);
  }
  return match[1];
}

function indexExists(db: DatabaseContext, name: string): boolean {
  return Number(
    db.scalar(
      `SELECT count(*) FROM sqlite_schema
       WHERE type = 'index' AND name = ?`,
      [name],
    ) ?? 0,
  ) === 1;
}

function printPlan(label: string, details: readonly string[]): void {
  process.stdout.write(`${label}:\n`);
  for (const detail of details) process.stdout.write(`  ${detail}\n`);
}

function explainCandidate(db: DatabaseContext, candidate: Candidate): void {
  const names = candidate.createIndexes.map(indexName);
  for (const name of names) {
    if (indexExists(db, name)) {
      throw new Error(`Candidate index ${name} unexpectedly exists before its probe.`);
    }
  }
  const before = candidate.probes.map((probe) => plan(db, probe));

  db.exec('BEGIN');
  try {
    for (const createIndex of candidate.createIndexes) db.exec(createIndex);
    const after = candidate.probes.map((probe) => plan(db, probe));
    process.stdout.write(`\n## ${candidate.label}\n`);
    for (const createIndex of candidate.createIndexes) {
      process.stdout.write(`${createIndex};\n`);
    }
    for (const [index, probe] of candidate.probes.entries()) {
      process.stdout.write(`Probe: ${probe.label}\n`);
      printPlan('BEFORE', before[index] ?? []);
      printPlan('AFTER', after[index] ?? []);
    }
  } finally {
    db.exec('ROLLBACK');
  }
  for (const name of names) {
    if (indexExists(db, name)) {
      throw new Error(`ROLLBACK did not remove candidate index ${name}.`);
    }
  }
}

const connection = await openTestDatabase();
try {
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  const ids = seedCharacterWorkload(db);
  const firstSpellVersionId = ids.spellVersionIds[0];
  if (firstSpellVersionId === undefined) {
    throw new Error('No spell version was available for EXPLAIN bindings.');
  }

  const selectableSpellSearch = `
    SELECT version.id, version.display_name, version.level,
           version.school, version.ritual, version.concentration,
           version.rules_edition, identity.catalog_layer
    FROM spell_versions AS version
    LEFT JOIN catalog_content_identities AS identity
      ON identity.content_kind = 'spell'
     AND identity.content_key = version.content_key
    WHERE version.is_active = 1
      AND version.level BETWEEN ? AND ?
      AND ${selectableCatalogContentSql('spell', 'version.content_key')}
    ORDER BY version.level, version.display_name, version.id
    LIMIT 50`;

  const candidates: readonly Candidate[] = [
    {
      label: 'REJECTED: catalog identity selectable covering lookup',
      createIndexes: [
        'CREATE INDEX catalog_content_identities_selectable_index ON catalog_content_identities (content_kind, content_key, archived_at, visibility)',
      ],
      probes: [{
        label: 'eligible spell selectable/visibility anti-lookup',
        sql: selectableSpellSearch,
        bindings: [0, 9],
      }],
    },
    {
      label: 'Fingerprint content-key lookup',
      createIndexes: [
        'CREATE INDEX catalog_content_fingerprints_content_key_index ON catalog_content_fingerprints (content_key)',
      ],
      probes: [{
        label: 'integrity read of every fingerprint role for one content key',
        sql: `SELECT fingerprint.fingerprint_digest,
                     fingerprint.canonical_json
              FROM catalog_content_fingerprints AS fingerprint
              JOIN catalog_content_identities AS identity
                ON identity.content_key = fingerprint.content_key
               AND identity.content_kind = fingerprint.content_kind
             WHERE fingerprint.content_kind = ?
               AND fingerprint.content_key = ?`,
        bindings: ['spell', ids.spellContentKey],
      }],
    },
    {
      label: 'REJECTED: resolvable fingerprint partial covering lookup',
      createIndexes: [
        "CREATE INDEX catalog_content_fingerprints_resolvable_index ON catalog_content_fingerprints (content_kind, fingerprint_scheme, fingerprint_digest, content_key) WHERE fingerprint_role IN ('current', 'compatible')",
      ],
      probes: [{
        label: 'portable-reference fingerprint resolution',
        sql: `SELECT content_key
              FROM catalog_content_fingerprints
              WHERE content_kind = ? AND fingerprint_scheme = ?
                AND fingerprint_digest = ?
                AND fingerprint_role IN ('current', 'compatible')
              ORDER BY content_key`,
        bindings: [
          'spell',
          ids.fingerprintScheme,
          ids.fingerprintDigest,
        ],
      }],
    },
    {
      label: 'Source hierarchy lookup',
      createIndexes: [
        'CREATE INDEX character_source_instances_parent_index ON character_source_instances (parent_source_instance_id) WHERE parent_source_instance_id IS NOT NULL',
      ],
      probes: [{
        label: 'generated child-source reconciliation',
        sql: `SELECT id, notes
              FROM character_source_instances
              WHERE parent_source_instance_id = ?
                AND notes LIKE 'grant_rule:%'`,
        bindings: [ids.rootSourceId],
      }],
    },
    {
      label: 'Character source state/type display order',
      createIndexes: [
        'CREATE INDEX character_source_instances_character_state_type_name_index ON character_source_instances (character_id, state, source_type, display_name)',
      ],
      probes: [{
        label: 'removable source list',
        sql: `SELECT id, parent_source_instance_id, source_type,
                     source_definition_id, display_name
              FROM character_source_instances
              WHERE character_id = ?
                AND source_type IN ('feat', 'species', 'background')
                AND state = 'active'
              ORDER BY source_type, display_name, id`,
        bindings: [ids.characterId],
      }],
    },
    {
      label: 'Skill grant character order',
      createIndexes: [
        'CREATE INDEX character_skill_grants_character_order_index ON character_skill_grants (character_id, source_instance_id, grant_key, ordinal)',
      ],
      probes: [{
        label: 'skill grant resolver',
        sql: `SELECT id, character_id, source_instance_id, grant_key, ordinal,
                     skill, state, orphan_reason_code, orphaned_at
              FROM character_skill_grants
              WHERE character_id = ?
              ORDER BY source_instance_id, grant_key, ordinal, id`,
        bindings: [ids.characterId],
      }],
    },
    {
      label: 'Expertise grant character order',
      createIndexes: [
        'CREATE INDEX character_skill_expertise_grants_character_order_index ON character_skill_expertise_grants (character_id, source_instance_id, granted_at_class_level, ordinal)',
      ],
      probes: [{
        label: 'expertise grant resolver',
        sql: `SELECT id, character_id, source_instance_id, grant_key, ordinal,
                     granted_at_class_level, skill, state, orphan_reason_code,
                     orphaned_at
              FROM character_skill_expertise_grants
              WHERE character_id = ?
              ORDER BY source_instance_id, granted_at_class_level, ordinal, id`,
        bindings: [ids.characterId],
      }],
    },
    {
      label: 'Spell slot source/state lookup',
      createIndexes: [
        'CREATE INDEX spell_selection_slots_source_state_index ON spell_selection_slots (source_instance_id, state)',
      ],
      probes: [{
        label: 'grant-slot reconciliation by source',
        sql: `SELECT id, slot_key, fixed_spell_version_id,
                     current_spell_version_id
              FROM spell_selection_slots
              WHERE source_instance_id = ?
                AND state IN ('active', 'kept_override')`,
        bindings: [ids.rootSourceId],
      }],
    },
    {
      label: 'Spell slot reverse-reference pair',
      createIndexes: [
        'CREATE INDEX spell_selection_slots_fixed_spell_version_index ON spell_selection_slots (fixed_spell_version_id) WHERE fixed_spell_version_id IS NOT NULL',
        'CREATE INDEX spell_selection_slots_current_spell_version_index ON spell_selection_slots (current_spell_version_id) WHERE current_spell_version_id IS NOT NULL',
      ],
      probes: [{
        label: 'catalog importer slot reference check',
        sql: `SELECT 1 FROM spell_selection_slots
              WHERE fixed_spell_version_id = ?
                 OR current_spell_version_id = ?`,
        bindings: [firstSpellVersionId, firstSpellVersionId],
      }],
    },
    {
      label: 'Spellbook reverse-reference and active membership lookup',
      createIndexes: [
        'CREATE INDEX wizard_spellbook_entries_spell_state_character_index ON wizard_spellbook_entries (spell_version_id, state, character_id, source_instance_id) WHERE spell_version_id IS NOT NULL',
      ],
      probes: [
        {
          label: 'catalog importer spellbook reference check',
          sql: `SELECT 1 FROM wizard_spellbook_entries
                WHERE spell_version_id = ?`,
          bindings: [firstSpellVersionId],
        },
        {
          label: 'active spellbook collection membership',
          sql: `SELECT 1
                FROM wizard_spellbook_entries AS collection_entry
                LEFT JOIN character_source_instances AS collection_source
                  ON collection_source.id = collection_entry.source_instance_id
                 AND collection_source.character_id = collection_entry.character_id
                WHERE collection_entry.character_id = ?
                  AND collection_entry.spell_version_id = ?
                  AND collection_entry.state = 'active'
                  AND (
                    collection_entry.source_instance_id IS NULL
                    OR collection_source.state = 'active'
                  )`,
          bindings: [ids.characterId, firstSpellVersionId],
        },
      ],
    },
    {
      label: 'Spell loadout-entry reverse lookup',
      createIndexes: [
        'CREATE INDEX spell_loadout_entries_spell_loadout_index ON spell_loadout_entries (spell_version_id, spell_loadout_id)',
      ],
      probes: [{
        label: 'catalog importer loadout reference check',
        sql: `SELECT 1 FROM spell_loadout_entries
              WHERE spell_version_id = ?`,
        bindings: [firstSpellVersionId],
      }],
    },
    {
      label: 'Spell preference reverse lookup',
      createIndexes: [
        'CREATE INDEX character_spell_preferences_spell_character_index ON character_spell_preferences (spell_version_id, character_id)',
      ],
      probes: [{
        label: 'catalog importer preference reference check',
        sql: `SELECT 1 FROM character_spell_preferences
              WHERE spell_version_id = ?`,
        bindings: [firstSpellVersionId],
      }],
    },
    {
      label: 'Spell loadout character lookup',
      createIndexes: [
        'CREATE INDEX spell_loadouts_character_index ON spell_loadouts (character_id)',
      ],
      probes: [{
        label: 'character placeholder/disclosure loadout branch',
        sql: `SELECT entry.spell_version_id
              FROM spell_loadout_entries AS entry
              INNER JOIN spell_loadouts AS loadout
                ON loadout.id = entry.spell_loadout_id
              WHERE loadout.character_id = ?`,
        bindings: [ids.characterId],
      }],
    },
    {
      label: 'Active spell candidate order',
      createIndexes: [
        'CREATE INDEX spell_versions_active_level_name_index ON spell_versions (is_active, level, display_name)',
      ],
      probes: [{
        label: 'eligible spell search with LIMIT 50',
        sql: selectableSpellSearch,
        bindings: [0, 9],
      }],
    },
    {
      label: 'Full spell catalog order',
      createIndexes: [
        'CREATE INDEX spell_versions_catalog_order_index ON spell_versions (level, display_name, rules_edition)',
      ],
      probes: [{
        label: 'catalog spell browse order',
        sql: `SELECT version.id, version.content_key, version.display_name,
                     version.rules_edition, version.level
              FROM spell_versions AS version
              WHERE ${selectableCatalogContentSql('spell', 'version.content_key')}
              ORDER BY version.level, version.display_name,
                       version.rules_edition, version.id`,
        bindings: [],
      }],
    },
  ];

  process.stdout.write('# SQLite index-candidate EXPLAIN evidence\n');
  process.stdout.write(`SQLite ${String(db.scalar('SELECT sqlite_version()'))}\n`);
  process.stdout.write(
    `Seeded rows: identities=${String(scalarNumber(db, 'SELECT count(*) FROM catalog_content_identities'))}, ` +
      `fingerprints=${String(scalarNumber(db, 'SELECT count(*) FROM catalog_content_fingerprints'))}, ` +
      `spells=${String(scalarNumber(db, 'SELECT count(*) FROM spell_versions'))}, ` +
      `sources=${String(scalarNumber(db, 'SELECT count(*) FROM character_source_instances'))}, ` +
      `slots=${String(scalarNumber(db, 'SELECT count(*) FROM spell_selection_slots'))}.\n`,
  );

  const supersessionControl: Probe = {
    label: 'selectable supersession anti-lookup',
    sql: `SELECT 1
          FROM catalog_content_supersessions AS supersession
          WHERE supersession.content_kind = 'spell'
            AND supersession.superseded_content_key = ?`,
    bindings: [ids.spellContentKey],
  };
  process.stdout.write('\n## Existing-index control (no candidate)\n');
  process.stdout.write('catalog_content_supersessions primary key\n');
  printPlan('CURRENT', plan(db, supersessionControl));

  for (const candidate of candidates) explainCandidate(db, candidate);
} finally {
  connection.close();
}
