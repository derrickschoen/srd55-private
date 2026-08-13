import { rowId } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { GrantRuleSlotGenerator } from './grant-rule-slot-generator';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from './configured-choice-rule';
import { ConfiguredChoiceMaterialReader } from './configured-choice-material-reader';
import {
  decodeGrantJson,
  SourceRuleReader,
  sourceDefinitionTable,
  type GrantSourceInstance,
} from './source-rule-reader';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

function dependsOnCharacterLevel(
  db: DatabaseContext,
  reader: SourceRuleReader,
  source: GrantSourceInstance,
): boolean {
  if (source.sourceType === 'class' || source.sourceType === 'subclass') {
    if (source.sourceDefinitionId === null) return false;
    const relationColumn = source.sourceType === 'class'
      ? 'class_definition_id'
      : 'subclass_definition_id';
    const ownsLevel = db.scalar<number>(
      `SELECT 1 FROM character_class_levels
       WHERE character_id = ? AND ${relationColumn} = ? LIMIT 1`,
      [source.characterId, source.sourceDefinitionId],
    ) === 1;
    // Import still accepts historical snapshots whose class source predates
    // the level relation. Reconciliation is not the boundary that may turn
    // those already-readable backups into refusals.
    if (!ownsLevel) return false;
  }
  if (
    source.sourceType === 'class' ||
    source.sourceType === 'subclass' ||
    source.sourceDefinitionId === null
  ) {
    return reader.rulesForSource(source).some(
      (rule) => rule.activeFromCharacterLevel !== null,
    );
  }
  const table = sourceDefinitionTable(source.sourceType);
  const stored = db.scalar<string>(
    `SELECT grant_rules FROM ${table} WHERE id = ?`,
    [source.sourceDefinitionId],
  );
  return parseSourceGrantRules(decodeGrantJson(stored)).some((rule) =>
    rule instanceof ConfiguredChoiceRule
      ? rule.options.some((option) => option.grants.some(
          (grant) => grant.activeFromCharacterLevel !== null,
        ))
      : rule.activeFromCharacterLevel !== null,
  );
}

function hasConfiguredChoice(
  db: DatabaseContext,
  source: GrantSourceInstance,
): boolean {
  if (
    source.sourceType === 'class' ||
    source.sourceType === 'subclass' ||
    source.sourceDefinitionId === null
  ) return false;
  const stored = db.scalar<string>(
    `SELECT grant_rules FROM ${sourceDefinitionTable(source.sourceType)} WHERE id = ?`,
    [source.sourceDefinitionId],
  );
  return parseSourceGrantRules(decodeGrantJson(stored)).some(
    (rule) => rule instanceof ConfiguredChoiceRule,
  );
}

/** Production slot-generator wiring for sources that can expand a configured choice. */
export function configuredChoiceSlotGenerator(
  db: DatabaseContext,
): GrantRuleSlotGenerator {
  return new GrantRuleSlotGenerator(
    db,
    undefined,
    new ConfiguredChoiceMaterialReader(db),
  );
}

/** Reconcile one active source when its own rules depend on character level. */
export function reconcileCharacterLevelDependentSource(
  db: DatabaseContext,
  sourceId: number,
  generator: GrantRuleSlotGenerator,
): void {
  const reader = new SourceRuleReader(db);
  const source = reader.findSource(sourceId);
  if (source !== null && dependsOnCharacterLevel(db, reader, source)) {
    generator.generateForSource(sourceId);
  }
}

/** Reconcile every active source whose own data depends on total character level. */
export function reconcileCharacterLevelDependentSources(
  db: DatabaseContext,
  characterId: number,
  generator: GrantRuleSlotGenerator = new GrantRuleSlotGenerator(db),
): void {
  const reader = new SourceRuleReader(db);
  const configuredGenerator = configuredChoiceSlotGenerator(db);
  const sourceIds = db.all(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND state = ?
     ORDER BY id`,
    [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
    rowId,
  );
  for (const sourceId of sourceIds) {
    const source = reader.findSource(sourceId);
    if (source !== null && dependsOnCharacterLevel(db, reader, source)) {
      (hasConfiguredChoice(db, source) ? configuredGenerator : generator)
        .generateForSource(sourceId);
    }
  }
}

/** Reconcile every character after a whole-image adoption. */
export function reconcileAllCharacterLevelDependentSources(
  db: DatabaseContext,
): void {
  const characterIds = db.all(
    'SELECT id FROM characters ORDER BY id',
    [],
    rowId,
  );
  for (const characterId of characterIds) {
    reconcileCharacterLevelDependentSources(db, characterId);
  }
}
