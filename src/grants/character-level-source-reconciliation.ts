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

function dependsOnCharacterLevel(
  db: DatabaseContext,
  reader: SourceRuleReader,
  source: GrantSourceInstance,
): boolean {
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

/** Reconcile every active source whose own data depends on total character level. */
export function reconcileCharacterLevelDependentSources(
  db: DatabaseContext,
  characterId: number,
  generator: GrantRuleSlotGenerator = new GrantRuleSlotGenerator(db),
): void {
  const reader = new SourceRuleReader(db);
  const configuredGenerator = new GrantRuleSlotGenerator(
    db,
    undefined,
    new ConfiguredChoiceMaterialReader(db),
  );
  const sourceIds = db.all(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND state = 'active'
     ORDER BY id`,
    [characterId],
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
