import { DatabaseContext } from '../../src/db/database.ts';
import {
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  listGuidedBackgroundChoiceOptions,
  listGuidedOriginOptions,
} from '../../src/builder/guided-creation.ts';
import { SourceRuleReader } from '../../src/grants/source-rule-reader.ts';
import { CharacterCompletenessQueries } from '../../src/queries/character-completeness.ts';
import { CharacterSheetBuilder } from '../../src/queries/character-sheet-builder.ts';
import { CharacterSpellSectionBuilder } from '../../src/queries/character-spell-section-builder.ts';
import { CharacterWorkspaceBuilder } from '../../src/queries/character-workspace-builder.ts';
import { LevelUpStateQuery } from '../../src/queries/level-up-state.ts';
import { createRpcHarness } from '../../tests/helpers/rpc-harness.ts';
import {
  createBuildReportFixture,
  createSource,
} from '../../tests/integration/reports/build-report-fixture.ts';

const ACTIVE_SOURCE_STATE = 'active';

function normalizeSql(sql) {
  return sql.replaceAll(/\s+/g, ' ').trim();
}

function sqlBindings(bind) {
  return bind === undefined ? [] : [...bind];
}

class TrackingDatabaseContext extends DatabaseContext {
  records = [];
  owner = 'unattributed';

  record(sql, bind) {
    if (/^\s*(?:SELECT|WITH|PRAGMA)\b/i.test(sql)) {
      this.records.push({
        owner: this.owner,
        sql: normalizeSql(sql),
        bind: sqlBindings(bind),
      });
    }
  }

  all(sql, bind, codec) {
    this.record(sql, bind);
    return super.all(sql, bind, codec);
  }

  one(sql, bind, codec) {
    this.record(sql, bind);
    return super.one(sql, bind, codec);
  }

  allRaw(sql, bind) {
    this.record(sql, bind);
    return super.allRaw(sql, bind);
  }

  oneRaw(sql, bind) {
    this.record(sql, bind);
    return super.oneRaw(sql, bind);
  }

  scalar(sql, bind) {
    this.record(sql, bind);
    return super.scalar(sql, bind);
  }

  capture(owner, callback) {
    const start = this.records.length;
    this.owner = owner;
    let outcome = 'completed';
    try {
      callback();
    } catch (error) {
      outcome = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    } finally {
      this.owner = 'unattributed';
    }
    return {
      owner,
      outcome,
      records: this.records.slice(start),
    };
  }
}

function requiredOption(options, name, kind) {
  const option = options.find((candidate) => candidate.name === name);
  if (option === undefined) {
    throw new Error(`The seeded ${kind} catalogue has no ${name}.`);
  }
  return option;
}

function realisticallySeedCharacter(db) {
  const fixture = createBuildReportFixture(db);
  db.exec(
    `UPDATE feat_definitions
     SET category = 'origin'
     WHERE id = (
       SELECT source_definition_id
       FROM character_source_instances
       WHERE id = ?
     )`,
    [fixture.featSourceId],
  );
  db.exec(
    `UPDATE spell_versions
     SET provenance = 'placeholder'
     WHERE id = ?`,
    [fixture.spellIds.mageHand],
  );
  db.exec(
    `UPDATE characters
     SET ability_allocation_method = 'standard_array'
     WHERE id = ?`,
    [fixture.characterId],
  );
  const missingClassSources = db.allRaw(
    `SELECT level.class_definition_id, definition.name, level.level
     FROM character_class_levels AS level
     JOIN class_definitions AS definition
       ON definition.id = level.class_definition_id
     WHERE level.character_id = ?
       AND NOT EXISTS (
         SELECT 1
         FROM character_source_instances AS source
         WHERE source.character_id = level.character_id
           AND source.source_type = 'class'
           AND source.source_definition_id = level.class_definition_id
       )
     ORDER BY level.id`,
    [fixture.characterId],
  );
  for (const row of missingClassSources) {
    createSource(
      db,
      fixture.characterId,
      'class',
      Number(row.class_definition_id),
      `${String(row.name)} ${String(row.level)}`,
    );
  }
  db.exec(
    `UPDATE character_class_levels
     SET level = 3
     WHERE character_id = ?
       AND class_definition_id = (
         SELECT id FROM class_definitions WHERE content_key = '2024:class:wizard'
       )`,
    [fixture.characterId],
  );

  const species = requiredOption(
    listGuidedOriginOptions(db, 'species'),
    'Dwarf',
    'species',
  );
  applyGuidedOrigin(db, {
    character_id: fixture.characterId,
    kind: 'species',
    content_key: species.content_key,
  });

  const backgroundOptions = listGuidedBackgroundChoiceOptions(db);
  const background = requiredOption(
    backgroundOptions.backgrounds,
    'Acolyte',
    'background',
  );
  const feat = requiredOption(
    backgroundOptions.origin_feats,
    'Alert',
    'origin feat',
  );
  applyGuidedBackgroundChoices(db, {
    character_id: fixture.characterId,
    content_key: background.content_key,
    increases: [
      { ability: 'wisdom', amount: 2 },
      { ability: 'intelligence', amount: 1 },
    ],
    origin_feat_content_key: feat.content_key,
    origin_feat_config: {},
  });
  return fixture.characterId;
}

function groupedQueries(records) {
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.sql) ?? {
      executions: 0,
      example_bindings: record.bind,
      sql: record.sql,
    };
    group.executions += 1;
    groups.set(record.sql, group);
  }
  return [...groups.values()].sort(
    (left, right) => right.executions - left.executions || left.sql.localeCompare(right.sql),
  );
}

function flaggedPlans(db, runs) {
  const groups = groupedQueries(runs.flatMap((run) => run.records));
  return groups.flatMap((group) => {
    if (!/^(?:SELECT|WITH)\b/i.test(group.sql)) return [];
    try {
      const evidence = explain(db, group.sql, group.example_bindings);
      const orConnectedPredicate = /\bOR\b/i.test(group.sql);
      const flagged =
        evidence.metrics.full_scans > 0 ||
        evidence.metrics.temp_b_trees > 0 ||
        evidence.metrics.correlated_subqueries > 0 ||
        orConnectedPredicate ||
        group.executions > 1;
      return flagged
        ? [{
            executions: group.executions,
            or_connected_predicate: orConnectedPredicate,
            ...evidence,
          }]
        : [];
    } catch (error) {
      return [{
        executions: group.executions,
        sql: group.sql,
        bindings: group.example_bindings,
        explain_error:
          error instanceof Error ? error.message : String(error),
      }];
    }
  }).sort((left, right) => {
    const leftMetrics = left.metrics ?? {
      correlated_subqueries: 0,
      temp_b_trees: 0,
      full_scans: 0,
    };
    const rightMetrics = right.metrics ?? {
      correlated_subqueries: 0,
      temp_b_trees: 0,
      full_scans: 0,
    };
    const score = (entry, metrics) =>
      metrics.correlated_subqueries * 1000 +
      metrics.temp_b_trees * 100 +
      metrics.full_scans * 10 +
      entry.executions;
    return score(right, rightMetrics) - score(left, leftMetrics);
  }).slice(0, 40);
}

function planMetrics(details) {
  return {
    plan_rows: details.length,
    full_scans: details.filter(
      (detail) => /^SCAN\b/.test(detail) && detail !== 'SCAN CONSTANT ROW',
    ).length,
    temp_b_trees: details.filter((detail) => /USE TEMP B-TREE/.test(detail)).length,
    correlated_subqueries: details.filter((detail) => /CORRELATED/.test(detail)).length,
    searches: details.filter((detail) => /^SEARCH\b/.test(detail)).length,
  };
}

function explain(db, sql, bind = []) {
  const rows = db.allRaw(`EXPLAIN QUERY PLAN ${sql}`, bind);
  const details = rows.map((row) => String(row.detail));
  return {
    sql: normalizeSql(sql),
    bindings: bind,
    plan: details,
    metrics: planMetrics(details),
  };
}

function repeatedCount(runs, owner, fragment) {
  const run = runs.find((candidate) => candidate.owner === owner);
  if (run === undefined) return 0;
  return run.records.filter((record) => record.sql.includes(fragment)).length;
}

function placeholders(values) {
  return values.map(() => '?').join(', ');
}

function comparableRows(rows) {
  return rows.map((row) => JSON.stringify(row)).sort();
}

function resultProof(currentRows, proposedRows) {
  return {
    current_rows: currentRows.length,
    proposed_rows: proposedRows.length,
    identical_rows:
      JSON.stringify(comparableRows(currentRows)) ===
      JSON.stringify(comparableRows(proposedRows)),
  };
}

function assertCandidateProofs(candidates) {
  const failures = [];
  const visit = (value, path) => {
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (
        (key === 'identical_rows' || key === 'legacy_value_reused') &&
        child !== true
      ) {
        failures.push(childPath);
      }
      visit(child, childPath);
    }
  };
  for (const [index, candidate] of candidates.entries()) {
    visit(candidate.result_proof, `candidates[${String(index)}].result_proof`);
  }
  if (failures.length > 0) {
    throw new Error(`Rewrite result proof failed: ${failures.join(', ')}`);
  }
}

function assertReaderRuns(runs) {
  const failures = runs.filter((run) => run.outcome !== 'completed');
  if (failures.length > 0) {
    throw new Error(
      `Reader capture failed: ${failures
        .map((run) => `${run.owner}: ${run.outcome}`)
        .join('; ')}`,
    );
  }
}

function candidateEvidence(db, characterId, runs) {
  const classIds = db.allRaw(
    `SELECT class_definition_id
     FROM character_class_levels
     WHERE character_id = ?
     ORDER BY id`,
    [characterId],
  ).map((row) => Number(row.class_definition_id));
  const featCount = Number(db.scalar(
    `SELECT count(*)
     FROM feat_definitions AS definition
     WHERE NOT EXISTS (
       SELECT 1
       FROM catalog_content_identities AS selectable_identity
       WHERE selectable_identity.content_kind = 'feat'
         AND selectable_identity.content_key = definition.content_key
         AND NOT (
           selectable_identity.archived_at IS NULL
           AND selectable_identity.visibility IN ('listed')
         )
     )
       AND NOT EXISTS (
         SELECT 1
         FROM catalog_content_supersessions AS supersession
         WHERE supersession.content_kind = 'feat'
           AND supersession.superseded_content_key = definition.content_key
       )`,
  ) ?? 0);
  const spellVersionIds = [...new Set(
    db.allRaw(
      `SELECT COALESCE(fixed_spell_version_id, current_spell_version_id) AS spell_version_id
       FROM spell_selection_slots
       WHERE character_id = ?
         AND COALESCE(fixed_spell_version_id, current_spell_version_id) IS NOT NULL
       UNION ALL
       SELECT spell_version_id
       FROM wizard_spellbook_entries
       WHERE character_id = ? AND spell_version_id IS NOT NULL`,
      [characterId, characterId],
    ).map((row) => Number(row.spell_version_id)),
  )];

  const disqualifiedCte = `WITH disqualified(content_key) AS MATERIALIZED (
    SELECT content_key
    FROM catalog_content_identities
    WHERE content_kind = ?
      AND NOT (archived_at IS NULL AND visibility IN ('listed'))
    UNION
    SELECT superseded_content_key
    FROM catalog_content_supersessions
    WHERE content_kind = ?
  )`;

  const currentFeatKeys = `SELECT definition.content_key
    FROM feat_definitions AS definition
    WHERE NOT EXISTS (
      SELECT 1
      FROM catalog_content_identities AS selectable_identity
      WHERE selectable_identity.content_kind = 'feat'
        AND selectable_identity.content_key = definition.content_key
        AND NOT (
          selectable_identity.archived_at IS NULL
          AND selectable_identity.visibility IN ('listed')
        )
    )
      AND NOT EXISTS (
        SELECT 1
        FROM catalog_content_supersessions AS supersession
        WHERE supersession.content_kind = 'feat'
          AND supersession.superseded_content_key = definition.content_key
      )
    ORDER BY definition.id`;
  const currentFeatPoint = `SELECT definition.id, definition.content_key,
      definition.name, definition.category, definition.min_level,
      definition.ability_points, definition.ability_increase_abilities,
      definition.ability_increase_maximum, definition.repeatable,
      definition.prerequisites, definition.grant_rules,
      definition.notes, identity.catalog_layer
    FROM feat_definitions AS definition
    LEFT JOIN catalog_content_identities AS identity
      ON identity.content_kind = 'feat'
     AND identity.content_key = definition.content_key
    WHERE definition.content_key = ?`;
  const proposedFeatBatch = `${disqualifiedCte}
    SELECT definition.id, definition.content_key,
      definition.name, definition.category, definition.min_level,
      definition.ability_points, definition.ability_increase_abilities,
      definition.ability_increase_maximum, definition.repeatable,
      definition.prerequisites, definition.grant_rules,
      definition.notes, identity.catalog_layer
    FROM feat_definitions AS definition
    LEFT JOIN catalog_content_identities AS identity
      ON identity.content_kind = 'feat'
     AND identity.content_key = definition.content_key
    LEFT JOIN disqualified
      ON disqualified.content_key = definition.content_key
    WHERE disqualified.content_key IS NULL
    ORDER BY definition.id`;

  const currentSubclass = `SELECT subclass.id, subclass.name,
      identity.catalog_layer
    FROM subclass_definitions AS subclass
    LEFT JOIN catalog_content_identities AS identity
      ON identity.content_kind = 'subclass'
     AND identity.content_key = subclass.content_key
    WHERE subclass.class_definition_id = ?
      AND NOT EXISTS (
        SELECT 1
        FROM catalog_content_identities AS selectable_identity
        WHERE selectable_identity.content_kind = 'subclass'
          AND selectable_identity.content_key = subclass.content_key
          AND NOT (
            selectable_identity.archived_at IS NULL
            AND selectable_identity.visibility IN ('listed')
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM catalog_content_supersessions AS supersession
        WHERE supersession.content_kind = 'subclass'
          AND supersession.superseded_content_key = subclass.content_key
      )
    ORDER BY subclass.name, subclass.id`;
  const proposedSubclass = `${disqualifiedCte}
    SELECT subclass.class_definition_id, subclass.id, subclass.name,
      identity.catalog_layer
    FROM subclass_definitions AS subclass
    LEFT JOIN catalog_content_identities AS identity
      ON identity.content_kind = 'subclass'
     AND identity.content_key = subclass.content_key
    LEFT JOIN disqualified
      ON disqualified.content_key = subclass.content_key
    WHERE subclass.class_definition_id IN (${placeholders(classIds)})
      AND disqualified.content_key IS NULL
    ORDER BY subclass.class_definition_id, subclass.name, subclass.id`;

  const currentSavingThrows = `SELECT ability
    FROM class_saving_throw_proficiencies
    WHERE class_definition_id = ?
    ORDER BY ability`;
  const proposedSavingThrows = `SELECT class_definition_id, ability
    FROM class_saving_throw_proficiencies
    WHERE class_definition_id IN (${placeholders(classIds)})
    ORDER BY class_definition_id, ability`;

  const currentEligibilityVersion = `SELECT id, spell_identity_id,
      rules_edition, level, school, is_active
    FROM spell_versions
    WHERE id = ?`;
  const proposedEligibilityVersions = `SELECT id, spell_identity_id,
      rules_edition, level, school, is_active
    FROM spell_versions
    WHERE id IN (${placeholders(spellVersionIds)})
    ORDER BY id`;
  const currentLegacy = `SELECT allow_legacy FROM characters WHERE id = ?`;
  const currentCollection = `SELECT slot.selection_collection, slot.rule_key,
      definition.content_key AS class_content_key
    FROM spell_selection_slots AS slot
    INNER JOIN character_source_instances AS source
      ON source.id = slot.source_instance_id
     AND source.character_id = slot.character_id
    LEFT JOIN class_definitions AS definition
      ON source.source_type = 'class'
     AND definition.id = source.source_definition_id
    WHERE slot.character_id = ? AND slot.id = ?`;
  const proposedCollections = `SELECT slot.id,
      CASE
        WHEN slot.selection_collection IS NOT NULL
          THEN slot.selection_collection
        WHEN slot.rule_key = 'wizard-prepared'
          AND definition.content_key = '2024:class:wizard'
          THEN 'wizard_spellbook'
        ELSE NULL
      END AS effective_selection_collection
    FROM spell_selection_slots AS slot
    INNER JOIN character_source_instances AS source
      ON source.id = slot.source_instance_id
     AND source.character_id = slot.character_id
    LEFT JOIN class_definitions AS definition
      ON source.source_type = 'class'
     AND definition.id = source.source_definition_id
    WHERE slot.character_id = ?`;

  const currentPlaceholder = `SELECT DISTINCT version.content_key,
      version.display_name
    FROM spell_versions AS version
    WHERE version.provenance = 'placeholder'
      AND version.id IN (
        SELECT current_spell_version_id
        FROM spell_selection_slots
        WHERE character_id = ?
        UNION
        SELECT spell_version_id
        FROM wizard_spellbook_entries
        WHERE character_id = ?
        UNION
        SELECT spell_version_id
        FROM character_spell_preferences
        WHERE character_id = ?
        UNION
        SELECT entry.spell_version_id
        FROM spell_loadout_entries AS entry
        INNER JOIN spell_loadouts AS loadout
          ON loadout.id = entry.spell_loadout_id
        WHERE loadout.character_id = ?
      )
    ORDER BY version.display_name, version.content_key`;
  const proposedPlaceholderIds = `SELECT current_spell_version_id AS spell_version_id
    FROM spell_selection_slots WHERE character_id = ?
    UNION ALL
    SELECT spell_version_id FROM wizard_spellbook_entries WHERE character_id = ?
    UNION ALL
    SELECT spell_version_id FROM character_spell_preferences WHERE character_id = ?
    UNION ALL
    SELECT entry.spell_version_id
    FROM spell_loadout_entries AS entry
    JOIN spell_loadouts AS loadout ON loadout.id = entry.spell_loadout_id
    WHERE loadout.character_id = ?`;
  const placeholderIds = [...new Set(
    db.allRaw(proposedPlaceholderIds, [characterId, characterId, characterId, characterId])
      .map((row) => row.spell_version_id)
      .filter((value) => value !== null)
      .map(Number),
  )];
  const proposedPlaceholderRows = `SELECT content_key, display_name
    FROM spell_versions
    WHERE provenance = 'placeholder'
      AND id IN (${placeholders(placeholderIds)})
    ORDER BY display_name, content_key`;

  const currentFeatRows = db.allRaw(currentFeatKeys).flatMap((keyRow) =>
    db.allRaw(currentFeatPoint, [String(keyRow.content_key)])
  );
  const proposedFeatRows = db.allRaw(
    proposedFeatBatch,
    ['feat', 'feat'],
  );
  const currentSubclassRows = classIds.flatMap((classDefinitionId) =>
    db.allRaw(currentSubclass, [classDefinitionId]).map((row) => ({
      class_definition_id: classDefinitionId,
      ...row,
    }))
  );
  const proposedSubclassRows = db.allRaw(
    proposedSubclass,
    ['subclass', 'subclass', ...classIds],
  );
  const currentSavingThrowRows = classIds.flatMap((classDefinitionId) =>
    db.allRaw(currentSavingThrows, [classDefinitionId]).map((row) => ({
      class_definition_id: classDefinitionId,
      ...row,
    }))
  );
  const proposedSavingThrowRows = db.allRaw(
    proposedSavingThrows,
    classIds,
  );
  const currentEligibilityRows = spellVersionIds.flatMap((spellVersionId) =>
    db.allRaw(currentEligibilityVersion, [spellVersionId])
  );
  const proposedEligibilityRows = db.allRaw(
    proposedEligibilityVersions,
    spellVersionIds,
  );
  const slotIds = db.allRaw(
    'SELECT id FROM spell_selection_slots WHERE character_id = ? ORDER BY id',
    [characterId],
  ).map((row) => Number(row.id));
  const currentCollectionRows = slotIds.map((slotId) => {
    const row = db.oneRaw(currentCollection, [characterId, slotId]);
    if (row === null) {
      throw new Error(`Missing slot ${String(slotId)} during collection proof.`);
    }
    const stored = row.selection_collection;
    return {
      id: slotId,
      effective_selection_collection:
        stored !== null
          ? stored
          : row.rule_key === 'wizard-prepared' &&
              row.class_content_key === '2024:class:wizard'
            ? 'wizard_spellbook'
            : null,
    };
  });
  const proposedCollectionRows = db.allRaw(
    proposedCollections,
    [characterId],
  );
  const currentPlaceholderRows = db.allRaw(
    currentPlaceholder,
    [characterId, characterId, characterId, characterId],
  );
  const proposedPlaceholderResultRows = db.allRaw(
    proposedPlaceholderRows,
    placeholderIds,
  );

  return [
    {
      rank_subject: 'Level-up feat catalogue: key scan plus one point read per feat',
      observed_executions: {
        selectable_key_query: repeatedCount(runs, 'LevelUpStateQuery', 'SELECT definition.content_key FROM feat_definitions'),
        definition_point_query: repeatedCount(runs, 'LevelUpStateQuery', 'WHERE definition.content_key = ?'),
        seeded_selectable_feats: featCount,
      },
      current: [
        { executions: 1, ...explain(db, currentFeatKeys) },
        { executions: repeatedCount(runs, 'LevelUpStateQuery', 'WHERE definition.content_key = ?'), ...explain(db, currentFeatPoint, ['2024:feat:alert']) },
      ],
      proposed: [
        { executions: 1, ...explain(db, proposedFeatBatch, ['feat', 'feat']) },
      ],
      result_proof: resultProof(currentFeatRows, proposedFeatRows),
    },
    {
      rank_subject: 'Spell access eligibility: per-route version, legacy, and collection probes',
      observed_executions: {
        version_point_query: repeatedCount(runs, 'CharacterSpellSectionBuilder', 'SELECT id, spell_identity_id, rules_edition, level, school, is_active FROM spell_versions WHERE id = ?'),
        legacy_point_query: repeatedCount(runs, 'CharacterSpellSectionBuilder', 'SELECT allow_legacy FROM characters WHERE id = ?'),
        collection_point_query: repeatedCount(runs, 'CharacterSpellSectionBuilder', 'SELECT slot.selection_collection, slot.rule_key'),
        distinct_referenced_versions: spellVersionIds.length,
      },
      current: [
        { executions: repeatedCount(runs, 'CharacterSpellSectionBuilder', 'SELECT id, spell_identity_id, rules_edition, level, school, is_active FROM spell_versions WHERE id = ?'), ...explain(db, currentEligibilityVersion, [spellVersionIds[0]]) },
        { executions: repeatedCount(runs, 'CharacterSpellSectionBuilder', 'SELECT allow_legacy FROM characters WHERE id = ?'), ...explain(db, currentLegacy, [characterId]) },
        { executions: repeatedCount(runs, 'CharacterSpellSectionBuilder', 'SELECT slot.selection_collection, slot.rule_key'), ...explain(db, currentCollection, [characterId, 1]) },
      ],
      proposed: [
        { executions: 1, ...explain(db, proposedEligibilityVersions, spellVersionIds) },
        { executions: 1, ...explain(db, currentLegacy, [characterId]) },
        { executions: 1, ...explain(db, proposedCollections, [characterId]) },
      ],
      result_proof: {
        versions: resultProof(currentEligibilityRows, proposedEligibilityRows),
        collections: resultProof(currentCollectionRows, proposedCollectionRows),
        legacy_value_reused: true,
      },
    },
    {
      rank_subject: 'Workspace subclass options: one correlated catalogue query per held class',
      observed_executions: {
        current_subclass_query: repeatedCount(runs, 'CharacterWorkspaceBuilder', 'FROM subclass_definitions AS subclass'),
        held_classes: classIds.length,
      },
      current: [
        { executions: classIds.length, ...explain(db, currentSubclass, [classIds[0]]) },
      ],
      proposed: [
        { executions: 1, ...explain(db, proposedSubclass, ['subclass', 'subclass', ...classIds]) },
      ],
      result_proof: resultProof(currentSubclassRows, proposedSubclassRows),
    },
    {
      rank_subject: 'Sheet saving throws: one indexed statement per held class',
      observed_executions: {
        current_saving_throw_query: repeatedCount(runs, 'CharacterSheetBuilder', 'FROM class_saving_throw_proficiencies'),
        held_classes: classIds.length,
      },
      current: [
        { executions: classIds.length, ...explain(db, currentSavingThrows, [classIds[0]]) },
      ],
      proposed: [
        { executions: 1, ...explain(db, proposedSavingThrows, classIds) },
      ],
      result_proof: resultProof(currentSavingThrowRows, proposedSavingThrowRows),
    },
    {
      rank_subject: 'Workspace placeholder lookup: compound UNION de-duplication',
      observed_executions: {
        current_placeholder_query: repeatedCount(runs, 'CharacterWorkspaceBuilder', 'FROM spell_versions AS version WHERE version.provenance = \'placeholder\''),
        referenced_spell_versions: placeholderIds.length,
      },
      current: [
        { executions: 1, ...explain(db, currentPlaceholder, [characterId, characterId, characterId, characterId]) },
      ],
      proposed: [
        { executions: 1, ...explain(db, proposedPlaceholderIds, [characterId, characterId, characterId, characterId]) },
        { executions: 1, ...explain(db, proposedPlaceholderRows, placeholderIds) },
      ],
      result_proof: resultProof(
        currentPlaceholderRows,
        proposedPlaceholderResultRows,
      ),
    },
  ];
}

async function main() {
  const harness = await createRpcHarness([]);
  try {
    const base = harness.context.db;
    const characterId = realisticallySeedCharacter(base);
    const tracked = new TrackingDatabaseContext(base.connection);
    const sourceIds = base.allRaw(
      `SELECT id FROM character_source_instances
       WHERE character_id = ? AND state = ?
       ORDER BY id`,
      [characterId, ACTIVE_SOURCE_STATE],
    ).map((row) => Number(row.id));

    const runs = [
      tracked.capture('CharacterSheetBuilder', () => {
        new CharacterSheetBuilder(tracked).build(characterId);
      }),
      tracked.capture('CharacterSpellSectionBuilder', () => {
        new CharacterSpellSectionBuilder(tracked).build(characterId);
      }),
      tracked.capture('CharacterCompletenessQueries', () => {
        new CharacterCompletenessQueries(tracked).build(characterId);
      }),
      tracked.capture('CharacterWorkspaceBuilder', () => {
        new CharacterWorkspaceBuilder(tracked).build(characterId);
      }),
      tracked.capture('LevelUpStateQuery', () => {
        new LevelUpStateQuery(tracked).build(characterId);
      }),
      tracked.capture('SourceRuleReader', () => {
        const reader = new SourceRuleReader(tracked);
        for (const sourceId of sourceIds) {
          reader.activeRulesForSource(sourceId);
        }
      }),
    ];

    assertReaderRuns(runs);
    const candidates = candidateEvidence(base, characterId, runs);
    assertCandidateProofs(candidates);
    const output = {
      fixture: {
        character_id: characterId,
        held_classes: Number(base.scalar(
          'SELECT count(*) FROM character_class_levels WHERE character_id = ?',
          [characterId],
        ) ?? 0),
        active_sources: sourceIds.length,
        selected_spell_slots: Number(base.scalar(
          `SELECT count(*) FROM spell_selection_slots
           WHERE character_id = ?
             AND COALESCE(fixed_spell_version_id, current_spell_version_id) IS NOT NULL`,
          [characterId],
        ) ?? 0),
        spellbook_entries: Number(base.scalar(
          'SELECT count(*) FROM wizard_spellbook_entries WHERE character_id = ?',
          [characterId],
        ) ?? 0),
        species_rows: Number(base.scalar(
          'SELECT count(*) FROM character_species WHERE character_id = ?',
          [characterId],
        ) ?? 0),
        background_rows: Number(base.scalar(
          'SELECT count(*) FROM character_background WHERE character_id = ?',
          [characterId],
        ) ?? 0),
      },
      builder_runs: runs.map((run) => ({
        owner: run.owner,
        outcome: run.outcome,
        statements: run.records.length,
        distinct_statements: groupedQueries(run.records).length,
        repeated_queries: groupedQueries(run.records)
          .filter((query) => query.executions > 1)
          .slice(0, 20),
      })),
      candidates,
      flagged_plans: flaggedPlans(base, runs),
    };
    console.log(JSON.stringify(output, null, 2));
  } finally {
    harness.close();
  }
}

await main();
