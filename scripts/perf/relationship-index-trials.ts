import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { applicationSeed } from '../../src/db/bootstrap';
import { DatabaseContext } from '../../src/db/database';
import { GrantRuleSlotGenerator } from '../../src/grants/grant-rule-slot-generator';
import { CharacterWorkspaceBuilder } from '../../src/queries/character-workspace-builder';
import {
  addClassLevel,
  createCharacter,
} from '../../tests/integration/reports/build-report-fixture';
import { getSqlite3, openTestDatabase } from '../../tests/helpers/open-db';

const CHARACTER_COUNT = 50;
const TREE_DEPTH = 4;
const TREE_BRANCHING = 3;
const SPELLBOOK_ENTRIES_PER_CHARACTER = 50;
const LOADOUTS_PER_CHARACTER = 3;
const LOADOUT_ENTRIES = 20;
const REPETITIONS = 9;
const WRITE_BATCH_SIZE = 250;

const RANK_2_INDEX_STATEMENTS = [
  'CREATE INDEX spell_selection_slots_fixed_spell_version_index ON spell_selection_slots (fixed_spell_version_id) WHERE fixed_spell_version_id IS NOT NULL',
  'CREATE INDEX spell_selection_slots_current_spell_version_index ON spell_selection_slots (current_spell_version_id) WHERE current_spell_version_id IS NOT NULL',
] as const;
const RANK_4_INDEX_STATEMENTS = [
  'CREATE INDEX spell_selection_slots_source_state_index ON spell_selection_slots (source_instance_id, state)',
] as const;
const RANK_6_INDEX_STATEMENTS = [
  'CREATE INDEX character_source_instances_parent_index ON character_source_instances (parent_source_instance_id) WHERE parent_source_instance_id IS NOT NULL',
] as const;
const RANK_9_INDEX_STATEMENTS = [
  'CREATE INDEX spell_loadouts_character_index ON spell_loadouts (character_id)',
] as const;
const CANDIDATE_INDEX_STATEMENTS = [
  ...RANK_2_INDEX_STATEMENTS,
  ...RANK_4_INDEX_STATEMENTS,
  ...RANK_6_INDEX_STATEMENTS,
  ...RANK_9_INDEX_STATEMENTS,
] as const;

interface FixtureIds {
  readonly characterIds: readonly number[];
  readonly rootSourceIds: readonly number[];
  readonly leafSourceId: number;
  readonly unreferencedSpellVersionId: number;
}

interface ProfileTotals {
  fullScanSteps: number;
  vmSteps: number;
}

interface Sample extends ProfileTotals {
  readonly milliseconds: number;
}

interface Summary extends ProfileTotals {
  readonly milliseconds: number;
}

interface Candidate {
  readonly rank: 2 | 4 | 6 | 9;
  readonly label: string;
  readonly createIndexes: readonly string[];
  readonly operations: readonly Operation[];
}

interface Operation {
  readonly label: string;
  readonly run: () => void;
  readonly explain: {
    readonly sql: string;
    readonly bindings: readonly number[];
  };
}

type SqliteTraceCallback = Parameters<
  Sqlite3Static['capi']['sqlite3_trace_v2']
>[2];

type SqliteTraceV2 = (
  db: number,
  mask: number,
  callback: SqliteTraceCallback,
  context: number,
) => number;

class StatementProfiler {
  #active: ProfileTotals | null = null;

  constructor(
    private readonly database: Database,
    sqlite3: Sqlite3Static,
  ) {
    const pointer = database.pointer;
    if (pointer === undefined) {
      throw new Error('Cannot profile a closed SQLite connection.');
    }
    const traceV2 = sqlite3.capi.sqlite3_trace_v2 as unknown as SqliteTraceV2;
    const result = traceV2(
      pointer,
      sqlite3.capi.SQLITE_TRACE_PROFILE,
      (reason, _context, statementPointer) => {
        if (reason !== sqlite3.capi.SQLITE_TRACE_PROFILE) return 0;
        const active = this.#active;
        if (active === null) return 0;
        active.fullScanSteps += sqlite3.capi.sqlite3_stmt_status(
          statementPointer,
          sqlite3.capi.SQLITE_STMTSTATUS_FULLSCAN_STEP,
          1,
        );
        active.vmSteps += sqlite3.capi.sqlite3_stmt_status(
          statementPointer,
          sqlite3.capi.SQLITE_STMTSTATUS_VM_STEP,
          1,
        );
        return 0;
      },
      0,
    );
    if (result !== sqlite3.capi.SQLITE_OK) {
      throw new Error(`Could not install SQLite profiler (result ${result}).`);
    }
  }

  sample(run: () => void): Sample {
    if (this.#active !== null) {
      throw new Error('Nested benchmark samples are not supported.');
    }
    const totals: ProfileTotals = { fullScanSteps: 0, vmSteps: 0 };
    this.#active = totals;
    const started = performance.now();
    try {
      run();
      return {
        milliseconds: performance.now() - started,
        ...totals,
      };
    } finally {
      this.#active = null;
    }
  }
}

function numberScalar(db: DatabaseContext, sql: string): number {
  return Number(db.scalar(sql) ?? 0);
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const value = ordered[Math.floor(ordered.length / 2)];
  if (value === undefined) throw new Error('Cannot take a median of no values.');
  return value;
}

function summarize(samples: readonly Sample[]): Summary {
  return {
    milliseconds: median(samples.map((sample) => sample.milliseconds)),
    fullScanSteps: median(samples.map((sample) => sample.fullScanSteps)),
    vmSteps: median(samples.map((sample) => sample.vmSteps)),
  };
}

function explainOperation(
  db: DatabaseContext,
  operation: Operation,
): readonly string[] {
  return db
    .allRaw(
      `EXPLAIN QUERY PLAN ${operation.explain.sql}`,
      [...operation.explain.bindings],
    )
    .map((row) => String(row.detail));
}

function sourceTree(
  db: DatabaseContext,
  characterId: number,
  featDefinitionId: number,
  characterOrdinal: number,
): readonly number[] {
  const created: number[] = [];
  let parents: Array<number | null> = [null];
  for (let depth = 1; depth <= TREE_DEPTH; depth += 1) {
    const nextParents: number[] = [];
    for (const parentId of parents) {
      for (let branch = 1; branch <= TREE_BRANCHING; branch += 1) {
        if (depth === 1 && branch > 1) break;
        const sourceId = db.exec(
          `INSERT INTO character_source_instances (
             character_id, instance_uuid, parent_source_instance_id,
             source_type, source_definition_id, display_name, config,
             acquired_at_character_level, state, notes
           ) VALUES (?, ?, ?, 'feat', ?, ?, '{}', 1, 'active', ?)`,
          [
            characterId,
            `relationship-perf:${characterOrdinal}:${depth}:${created.length}:${branch}`,
            parentId,
            featDefinitionId,
            `Relationship source ${depth}.${branch}`,
            parentId === null
              ? 'relationship_perf:root'
              : `grant_rule:relationship-perf:${depth}:${branch}`,
          ],
        ).lastInsertId;
        created.push(sourceId);
        nextParents.push(sourceId);
      }
    }
    parents = nextParents;
  }
  return created;
}

function seedScaledFixture(db: DatabaseContext): FixtureIds {
  applicationSeed(db);
  const featDefinition = db.oneRaw(
    `SELECT id
     FROM feat_definitions
     WHERE grant_rules IS NULL OR grant_rules = '[]'
     ORDER BY id
     LIMIT 1`,
  );
  if (featDefinition === null) {
    throw new Error('Bundled seed has no rule-free feat definition for the fixture.');
  }
  const featDefinitionId = Number(featDefinition.id);
  const spellVersionIds = db
    .allRaw(
      `SELECT id FROM spell_versions
       WHERE is_active = 1
       ORDER BY id
       LIMIT 80`,
    )
    .map((row) => Number(row.id));
  if (spellVersionIds.length < 80) {
    throw new Error('Bundled seed has fewer than 80 active spells.');
  }
  const assignedSpellIds = spellVersionIds.slice(0, 60);
  const unreferencedSpellVersionId = spellVersionIds[79];
  if (unreferencedSpellVersionId === undefined) {
    throw new Error('No unreferenced spell was available.');
  }
  const placeholderSpellId = assignedSpellIds[0];
  if (placeholderSpellId === undefined) {
    throw new Error('No placeholder spell was available.');
  }
  db.exec(
    "UPDATE spell_versions SET provenance = 'placeholder' WHERE id = ?",
    [placeholderSpellId],
  );

  const characterIds: number[] = [];
  const rootSourceIds: number[] = [];
  let leafSourceId = 0;
  db.transaction(() => {
    for (let characterOrdinal = 1;
      characterOrdinal <= CHARACTER_COUNT;
      characterOrdinal += 1) {
      const characterId = createCharacter(
        db,
        `Relationship scale ${String(characterOrdinal).padStart(2, '0')}`,
        { intelligence: 16, wisdom: 14, strength: 13 },
      );
      characterIds.push(characterId);
      addClassLevel(db, characterId, 'Wizard', 8);
      addClassLevel(db, characterId, 'Cleric', 4);
      addClassLevel(db, characterId, 'Fighter', 3);
      db.exec(
        `UPDATE character_class_levels
         SET is_starting_class = 1
         WHERE character_id = ?
           AND class_definition_id = (
             SELECT id FROM class_definitions WHERE name = 'Wizard'
           )`,
        [characterId],
      );

      const sourceIds = sourceTree(
        db,
        characterId,
        featDefinitionId,
        characterOrdinal,
      );
      const rootSourceId = sourceIds[0];
      const lastSourceId = sourceIds.at(-1);
      if (rootSourceId === undefined || lastSourceId === undefined) {
        throw new Error('Source tree was empty.');
      }
      rootSourceIds.push(rootSourceId);
      if (characterOrdinal === CHARACTER_COUNT) leafSourceId = lastSourceId;

      let slotOrdinal = 0;
      for (const sourceId of sourceIds) {
        for (let sourceSlot = 1; sourceSlot <= 3; sourceSlot += 1) {
          const spellVersionId = assignedSpellIds[
            slotOrdinal % assignedSpellIds.length
          ];
          if (spellVersionId === undefined) {
            throw new Error('Slot spell assignment was missing.');
          }
          const fixed = slotOrdinal % 2 === 0;
          slotOrdinal += 1;
          db.exec(
            `INSERT INTO spell_selection_slots (
               character_id, source_instance_id, slot_key, rule_key, ordinal,
               bucket, eligibility_kind, fixed_spell_version_id,
               current_spell_version_id, spell_level_min, spell_level_max,
               state, sort_order, selection_eligibility
             ) VALUES (?, ?, ?, 'relationship-perf', ?, 'prepared',
                       'choice_from_list', ?, ?, 0, 9, 'active', ?, 'valid')`,
            [
              characterId,
              sourceId,
              `relationship-perf:${characterOrdinal}:slot:${slotOrdinal}`,
              sourceSlot,
              fixed ? spellVersionId : null,
              fixed ? null : spellVersionId,
              slotOrdinal,
            ],
          );
        }
      }

      for (let ordinal = 1;
        ordinal <= SPELLBOOK_ENTRIES_PER_CHARACTER;
        ordinal += 1) {
        const spellVersionId = assignedSpellIds[ordinal % assignedSpellIds.length];
        if (spellVersionId === undefined) {
          throw new Error('Spellbook spell assignment was missing.');
        }
        db.exec(
          `INSERT INTO wizard_spellbook_entries (
             character_id, source_instance_id, rule_key, ordinal,
             acquired_at_class_level, spell_version_id, spell_level_min,
             spell_level_max, state, selection_eligibility
           ) VALUES (?, ?, 'relationship-perf-book', ?, 1, ?, 0, 9,
                     'active', 'valid')`,
          [characterId, rootSourceId, ordinal, spellVersionId],
        );
      }

      for (let loadoutOrdinal = 1;
        loadoutOrdinal <= LOADOUTS_PER_CHARACTER;
        loadoutOrdinal += 1) {
        const loadoutId = db.exec(
          'INSERT INTO spell_loadouts (character_id, name) VALUES (?, ?)',
          [characterId, `Loadout ${loadoutOrdinal}`],
        ).lastInsertId;
        for (let entryOrdinal = 0;
          entryOrdinal < LOADOUT_ENTRIES;
          entryOrdinal += 1) {
          const spellVersionId = assignedSpellIds[
            (entryOrdinal + loadoutOrdinal * LOADOUT_ENTRIES) %
              assignedSpellIds.length
          ];
          if (spellVersionId === undefined) {
            throw new Error('Loadout spell assignment was missing.');
          }
          db.exec(
            `INSERT INTO spell_loadout_entries (
               spell_loadout_id, spell_version_id, role
             ) VALUES (?, ?, 'prepared')`,
            [loadoutId, spellVersionId],
          );
        }
      }
    }
  });

  return {
    characterIds,
    rootSourceIds,
    leafSourceId,
    unreferencedSpellVersionId,
  };
}

function rolledBack(db: DatabaseContext, operation: () => void): void {
  const rollback = new Error('relationship-index-trial-rollback');
  try {
    db.transaction(() => {
      operation();
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

function indexName(createIndex: string): string {
  const match = /^CREATE INDEX ([a-z0-9_]+) ON /u.exec(createIndex);
  const name = match?.[1];
  if (name === undefined) {
    throw new Error(`Cannot parse index name from ${createIndex}`);
  }
  return name;
}

function usedDatabaseBytes(db: DatabaseContext): number {
  const pages = numberScalar(db, 'PRAGMA page_count') -
    numberScalar(db, 'PRAGMA freelist_count');
  return pages * numberScalar(db, 'PRAGMA page_size');
}

function createIndexes(db: DatabaseContext, statements: readonly string[]): void {
  for (const statement of statements) db.exec(statement);
}

function dropIndexes(db: DatabaseContext, statements: readonly string[]): void {
  for (const statement of statements) {
    db.exec(`DROP INDEX ${indexName(statement)}`);
  }
}

function writeBatch(db: DatabaseContext, fixture: FixtureIds): void {
  const characterId = fixture.characterIds[0];
  const parentSourceId = fixture.rootSourceIds[0];
  const spellVersionId = fixture.unreferencedSpellVersionId;
  if (characterId === undefined || parentSourceId === undefined) {
    throw new Error('Write fixture ids are missing.');
  }
  rolledBack(db, () => {
    for (let ordinal = 1; ordinal <= WRITE_BATCH_SIZE; ordinal += 1) {
      const sourceId = db.exec(
        `INSERT INTO character_source_instances (
           character_id, instance_uuid, parent_source_instance_id,
           source_type, source_definition_id, display_name, config,
           acquired_at_character_level, state, notes
         ) SELECT ?, ?, ?, 'feat', source_definition_id, ?, '{}', 1,
                  'active', 'grant_rule:write-batch'
           FROM character_source_instances WHERE id = ?`,
        [
          characterId,
          `relationship-write:${ordinal}`,
          parentSourceId,
          `Write source ${ordinal}`,
          parentSourceId,
        ],
      ).lastInsertId;
      db.exec(
        `INSERT INTO spell_selection_slots (
           character_id, source_instance_id, slot_key, rule_key, ordinal,
           bucket, eligibility_kind, fixed_spell_version_id,
           spell_level_min, spell_level_max, state, sort_order,
           selection_eligibility
         ) VALUES (?, ?, ?, 'relationship-write', ?, 'prepared',
                   'choice_from_list', ?, 0, 9, 'active', ?, 'valid')`,
        [
          characterId,
          sourceId,
          `relationship-write:slot:${ordinal}`,
          ordinal,
          spellVersionId,
          ordinal,
        ],
      );
      db.exec(
        `UPDATE spell_selection_slots
         SET fixed_spell_version_id = NULL, state = 'orphaned'
         WHERE character_id = ? AND slot_key = ?`,
        [characterId, `relationship-write:slot:${ordinal}`],
      );
      db.exec(
        `UPDATE character_source_instances
         SET parent_source_instance_id = NULL
         WHERE id = ?`,
        [sourceId],
      );
    }
  });
}

const connection = await openTestDatabase();
try {
  const sqlite3 = await getSqlite3();
  const db = new DatabaseContext(connection);
  const fixture = seedScaledFixture(db);
  for (const statement of CANDIDATE_INDEX_STATEMENTS) {
    db.exec(`DROP INDEX IF EXISTS ${indexName(statement)}`);
  }
  db.exec('VACUUM');
  const profiler = new StatementProfiler(connection, sqlite3);
  const generator = new GrantRuleSlotGenerator(db);
  const workspace = new CharacterWorkspaceBuilder(db);
  const workspaceCharacterId = fixture.characterIds.at(-1);
  const recursiveRootId = fixture.rootSourceIds.at(-1);
  if (workspaceCharacterId === undefined || recursiveRootId === undefined) {
    throw new Error('Scaled fixture did not create benchmark targets.');
  }

  const catalogReferenceCheck: Operation = {
    label: 'catalog import/deactivation reference check',
    run: () => {
      db.scalar(
        `SELECT EXISTS (
           SELECT 1 FROM spell_selection_slots
            WHERE fixed_spell_version_id = ? OR current_spell_version_id = ?
           UNION ALL
           SELECT 1 FROM wizard_spellbook_entries WHERE spell_version_id = ?
           UNION ALL
           SELECT 1 FROM spell_loadout_entries WHERE spell_version_id = ?
           UNION ALL
           SELECT 1 FROM character_spell_preferences WHERE spell_version_id = ?
         )`,
        Array.from({ length: 5 }, () => fixture.unreferencedSpellVersionId),
      );
    },
    explain: {
      sql: `SELECT EXISTS (
              SELECT 1 FROM spell_selection_slots
               WHERE fixed_spell_version_id = ? OR current_spell_version_id = ?
              UNION ALL
              SELECT 1 FROM wizard_spellbook_entries WHERE spell_version_id = ?
              UNION ALL
              SELECT 1 FROM spell_loadout_entries WHERE spell_version_id = ?
              UNION ALL
              SELECT 1 FROM character_spell_preferences WHERE spell_version_id = ?
            )`,
      bindings: Array.from(
        { length: 5 },
        () => fixture.unreferencedSpellVersionId,
      ),
    },
  };
  const refreshAffectedSelections: Operation = {
    label: 'catalog #refreshAffectedSelections reverse lookup',
    run: () => {
      db.allRaw(
        `SELECT id FROM spell_selection_slots
         WHERE fixed_spell_version_id IN (?)
            OR current_spell_version_id IN (?)
         ORDER BY id`,
        [fixture.unreferencedSpellVersionId, fixture.unreferencedSpellVersionId],
      );
    },
    explain: {
      sql: `SELECT id FROM spell_selection_slots
            WHERE fixed_spell_version_id IN (?)
               OR current_spell_version_id IN (?)
            ORDER BY id`,
      bindings: [
        fixture.unreferencedSpellVersionId,
        fixture.unreferencedSpellVersionId,
      ],
    },
  };
  const sourceRegeneration: Operation = {
    label: 'source regeneration slot reconciliation',
    run: () => rolledBack(db, () => generator.generateForSource(fixture.leafSourceId)),
    explain: {
      sql: `SELECT id, slot_key, fixed_spell_version_id,
                   current_spell_version_id
            FROM spell_selection_slots
            WHERE source_instance_id = ?
              AND state IN ('active', 'kept_override')`,
      bindings: [fixture.leafSourceId],
    },
  };
  const recursiveRetirement: Operation = {
    label: 'source regeneration with recursive retirement',
    run: () => rolledBack(db, () => generator.generateForSource(recursiveRootId)),
    explain: {
      sql: `SELECT id, notes
            FROM character_source_instances
            WHERE parent_source_instance_id = ?
              AND notes LIKE 'grant_rule:%'`,
      bindings: [recursiveRootId],
    },
  };
  const placeholderWorkspace: Operation = {
    label: 'placeholder workspace construction',
    run: () => { workspace.build(workspaceCharacterId); },
    explain: {
      sql: `SELECT DISTINCT version.content_key, version.display_name
            FROM spell_versions AS version
            WHERE version.provenance = 'placeholder'
              AND version.id IN (
                SELECT current_spell_version_id
                FROM spell_selection_slots
                WHERE character_id = ?
                UNION
                SELECT spell_version_id FROM wizard_spellbook_entries
                WHERE character_id = ?
                UNION
                SELECT spell_version_id FROM character_spell_preferences
                WHERE character_id = ?
                UNION
                SELECT entry.spell_version_id
                FROM spell_loadout_entries AS entry
                INNER JOIN spell_loadouts AS loadout
                  ON loadout.id = entry.spell_loadout_id
                WHERE loadout.character_id = ?
              )
            ORDER BY version.display_name, version.content_key`,
      bindings: Array.from({ length: 4 }, () => workspaceCharacterId),
    },
  };

  const candidates: readonly Candidate[] = [
    {
      rank: 2,
      label: 'spell-slot reverse-reference partial-index pair',
      createIndexes: RANK_2_INDEX_STATEMENTS,
      operations: [catalogReferenceCheck, refreshAffectedSelections],
    },
    {
      rank: 4,
      label: 'spell-selection slots by source/state',
      createIndexes: RANK_4_INDEX_STATEMENTS,
      operations: [sourceRegeneration],
    },
    {
      rank: 6,
      label: 'character source instances by parent',
      createIndexes: RANK_6_INDEX_STATEMENTS,
      operations: [recursiveRetirement],
    },
    {
      rank: 9,
      label: 'spell loadouts by character',
      createIndexes: RANK_9_INDEX_STATEMENTS,
      operations: [placeholderWorkspace],
    },
  ];

  const counts = Object.fromEntries(
    [
      'characters',
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'spell_loadouts',
      'spell_loadout_entries',
    ].map((table) => [table, numberScalar(db, `SELECT count(*) FROM ${table}`)]),
  );
  const evidence: Array<Record<string, unknown>> = [];
  for (const candidate of candidates) {
    const plansBefore = candidate.operations.map((operation) => ({
      operation: operation.label,
      details: explainOperation(db, operation),
    }));
    for (const operation of candidate.operations) operation.run();
    const bytesBefore = usedDatabaseBytes(db);
    createIndexes(db, candidate.createIndexes);
    const indexBytes = usedDatabaseBytes(db) - bytesBefore;
    const plansAfter = candidate.operations.map((operation) => ({
      operation: operation.label,
      details: explainOperation(db, operation),
    }));
    for (const operation of candidate.operations) operation.run();
    dropIndexes(db, candidate.createIndexes);

    const beforeSamples = candidate.operations.map((): Sample[] => []);
    const afterSamples = candidate.operations.map((): Sample[] => []);
    for (let repetition = 0; repetition < REPETITIONS; repetition += 1) {
      const indexedFirst = repetition % 2 === 1;
      if (indexedFirst) createIndexes(db, candidate.createIndexes);
      for (const [operationIndex, operation] of candidate.operations.entries()) {
        const samples = indexedFirst ? afterSamples : beforeSamples;
        samples[operationIndex]?.push(profiler.sample(operation.run));
      }
      if (indexedFirst) {
        dropIndexes(db, candidate.createIndexes);
      } else {
        createIndexes(db, candidate.createIndexes);
      }
      for (const [operationIndex, operation] of candidate.operations.entries()) {
        const samples = indexedFirst ? beforeSamples : afterSamples;
        samples[operationIndex]?.push(profiler.sample(operation.run));
      }
      if (!indexedFirst) dropIndexes(db, candidate.createIndexes);
    }
    const before = candidate.operations.map((operation, operationIndex) => ({
      operation: operation.label,
      ...summarize(beforeSamples[operationIndex] ?? []),
    }));
    const after = candidate.operations.map((operation, operationIndex) => ({
      operation: operation.label,
      ...summarize(afterSamples[operationIndex] ?? []),
    }));
    evidence.push({
      rank: candidate.rank,
      candidate: candidate.label,
      indexBytes,
      before,
      after,
      plansBefore,
      plansAfter,
    });
    db.exec('VACUUM');
  }

  const allIndexes = candidates.flatMap((candidate) => candidate.createIndexes);
  writeBatch(db, fixture);
  createIndexes(db, allIndexes);
  writeBatch(db, fixture);
  dropIndexes(db, allIndexes);
  const writeWithoutSamples: Sample[] = [];
  const writeWithSamples: Sample[] = [];
  for (let repetition = 0; repetition < REPETITIONS; repetition += 1) {
    const indexedFirst = repetition % 2 === 1;
    if (indexedFirst) createIndexes(db, allIndexes);
    (indexedFirst ? writeWithSamples : writeWithoutSamples).push(
      profiler.sample(() => writeBatch(db, fixture)),
    );
    if (indexedFirst) {
      dropIndexes(db, allIndexes);
    } else {
      createIndexes(db, allIndexes);
    }
    (indexedFirst ? writeWithoutSamples : writeWithSamples).push(
      profiler.sample(() => writeBatch(db, fixture)),
    );
    if (!indexedFirst) dropIndexes(db, allIndexes);
  }
  const writeWithout = summarize(writeWithoutSamples);
  const writeWith = summarize(writeWithSamples);

  process.stdout.write(`${JSON.stringify({
    configuration: {
      characters: CHARACTER_COUNT,
      treeDepth: TREE_DEPTH,
      treeBranching: TREE_BRANCHING,
      repetitions: REPETITIONS,
      writeBatchSize: WRITE_BATCH_SIZE,
    },
    counts,
    candidates: evidence,
    writeAmplification: { withoutIndexes: writeWithout, withIndexes: writeWith },
  }, null, 2)}\n`);
} finally {
  connection.close();
}
