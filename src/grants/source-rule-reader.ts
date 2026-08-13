import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  domainSourceTypes,
  isEnumValue,
  sourceInstanceStates,
  type DomainSourceType,
  type SourceInstanceState,
} from '../domain/enums';
import { GrantRule } from './grant-rule';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from './configured-choice-rule';
import { characterLevel } from '../rules/character-level';

type JsonContainer = Record<string, unknown> | unknown[];

/**
 * `grant_rules` is a nullable JSON TEXT column on five different tables. One
 * codec covers all of them because the column is the only thing being read;
 * `decodeGrantJson` then turns the text into a container, and a NULL column and
 * an absent row both mean "no rules" here.
 */
const grantRulesText: RowCodec<string | null> = (row) =>
  sqlNullableString(row, 'grant_rules');

const identifiedGrantRulesText: RowCodec<{
  readonly id: number;
  readonly grant_rules: string | null;
}> = (row) => ({
  id: sqlInteger(row, 'id'),
  grant_rules: sqlNullableString(row, 'grant_rules'),
});

export interface GrantSourceInstance {
  readonly id: number;
  readonly characterId: number;
  readonly instanceUuid: string;
  readonly parentSourceInstanceId: number | null;
  readonly sourceType: string;
  readonly sourceDefinitionId: number | null;
  readonly displayName: string;
  readonly config: string | null;
  readonly acquiredAtCharacterLevel: number | null;
  readonly state: SourceInstanceState;
  readonly notes: string | null;
}

function decodeSource(row: SqlRow): GrantSourceInstance {
  return {
    id: sqlInteger(row, 'id'),
    characterId: sqlInteger(row, 'character_id'),
    instanceUuid: sqlString(row, 'instance_uuid'),
    parentSourceInstanceId: sqlNullableInteger(
      row,
      'parent_source_instance_id',
    ),
    sourceType: sqlString(row, 'source_type'),
    sourceDefinitionId: sqlNullableInteger(
      row,
      'source_definition_id',
    ),
    displayName: sqlString(row, 'display_name'),
    config: sqlNullableString(row, 'config'),
    acquiredAtCharacterLevel: sqlNullableInteger(
      row,
      'acquired_at_character_level',
    ),
    state: requiredSourceInstanceState(row),
    notes: sqlNullableString(row, 'notes'),
  };
}

/**
 * D235's read side for `character_source_instances.state`.
 *
 * This decode is the ONE place the generator's `state !== 'active'` and
 * `state !== 'tombstoned'` gates get their type from, so a row carrying a third
 * value stops here loudly instead of silently taking the `!== 'active'` branch
 * and deactivating a live source's whole tree.
 */
function requiredSourceInstanceState(row: SqlRow): SourceInstanceState {
  const state = sqlString(row, 'state');
  if (!isEnumValue(sourceInstanceStates, state)) {
    throw new Error(`Unknown source instance state '${state}'.`);
  }
  return state;
}

function isContainer(value: unknown): value is JsonContainer {
  return value !== null && typeof value === 'object';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isContainer(value) && !Array.isArray(value);
}

function containerValues(container: JsonContainer): unknown[] {
  return Array.isArray(container)
    ? [...container]
    : Object.values(container);
}

export function valueAtPath(
  value: unknown,
  path: string,
  fallback: unknown = null,
): unknown {
  let current = value;
  for (const part of path.split('.')) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) {
        return fallback;
      }
      current = current[index];
      continue;
    }
    if (!isRecord(current) || !Object.hasOwn(current, part)) {
      return fallback;
    }
    current = current[part];
  }
  return current === undefined ? fallback : current;
}

export function decodeGrantJson(
  json: string | null,
): JsonContainer {
  if (json === null || json === '') {
    return [];
  }
  const decoded: unknown = JSON.parse(json);
  if (!isContainer(decoded)) {
    throw new TypeError(
      'Grant-rule JSON values must decode to arrays or objects.',
    );
  }
  return decoded;
}

export function sourceDefinitionTable(
  sourceType: string,
): `${DomainSourceType}_definitions` {
  if (!isEnumValue(domainSourceTypes, sourceType)) {
    throw new TypeError(
      `Unsupported grant source type '${sourceType}'.`,
    );
  }
  return `${sourceType}_definitions`;
}

function parseRule(value: unknown, message: string): GrantRule {
  if (!isRecord(value)) {
    throw new TypeError(message);
  }
  return GrantRule.fromObject(value);
}

/**
 * Reads the effective rule set for a persisted source. Progression rows are
 * cumulative and later rows replace earlier rules with the same stable key.
 */
export class SourceRuleReader {
  constructor(private readonly db: DatabaseContext) {}

  findSource(sourceInstanceId: number): GrantSourceInstance | null {
    return this.db.one(
      `SELECT id, character_id, instance_uuid, parent_source_instance_id,
              source_type, source_definition_id, display_name, config,
              acquired_at_character_level, state, notes
       FROM character_source_instances
       WHERE id = ?`,
      [sourceInstanceId],
      decodeSource,
    );
  }

  activeRulesForSource(sourceInstanceId: number): GrantRule[] {
    const source = this.findSource(sourceInstanceId);
    if (source === null || source.state !== 'active') {
      return [];
    }
    return this.rulesForSource(source).filter((rule) =>
      this.ruleIsActiveForSource(source, rule),
    );
  }

  rulesForSource(source: GrantSourceInstance): GrantRule[] {
    if (source.sourceType === 'class') {
      return this.rulesForClassSource(source);
    }
    if (source.sourceType === 'subclass') {
      return this.rulesForSubclassSource(source);
    }

    // A source instance may identify a real character-owned source category
    // without pointing at a rules definition. Guided species uses that shape
    // when a template has generated effects but no sourced grant text: the
    // instance supplies effect provenance, while the typed absence means there
    // are no grant rules to read.
    if (source.sourceDefinitionId === null) {
      return [];
    }

    const table = sourceDefinitionTable(source.sourceType);
    const definition = this.db.one(
      `SELECT id, grant_rules FROM ${table} WHERE id = ?`,
      [source.sourceDefinitionId],
      identifiedGrantRulesText,
    );
    if (definition === null) {
      throw new Error(
        `Definition for source instance ${source.id} does not exist.`,
      );
    }
    const rules = decodeGrantJson(definition.grant_rules);
    if (!Array.isArray(rules)) {
      throw new TypeError(
        `Grant rules for source instance ${source.id} must be a list.`,
      );
    }
    const config = decodeGrantJson(source.config);
    return parseSourceGrantRules(rules).flatMap((rule) => {
      if (!(rule instanceof ConfiguredChoiceRule)) return [rule];
      const selected = valueAtPath(config, rule.configKey);
      const option = rule.options.find((candidate) => candidate.value === selected);
      return option === undefined ? [] : [...option.grants];
    });
  }

  classLevelForSource(source: GrantSourceInstance): number {
    let classDefinitionId = source.sourceDefinitionId;
    if (source.sourceType === 'subclass') {
      classDefinitionId = this.db.scalar<number>(
        'SELECT class_definition_id FROM subclass_definitions WHERE id = ?',
        [source.sourceDefinitionId ?? 0],
      );
    }

    if (source.sourceType !== 'class' && source.sourceType !== 'subclass') {
      const configuredLevel = valueAtPath(
        decodeGrantJson(source.config),
        'class_level',
      );
      if (Number.isSafeInteger(configuredLevel)) {
        return configuredLevel as number;
      }
      throw new TypeError(
        'Rule active_from_class_level requires a class, subclass, or configured class_level source.',
      );
    }

    const level = this.db.scalar<number>(
      `SELECT level
       FROM character_class_levels
       WHERE character_id = ? AND class_definition_id = ?`,
      [source.characterId, classDefinitionId ?? 0],
    );
    if (level === null) {
      throw new Error(
        `Source instance ${source.id} has no matching class level.`,
      );
    }
    return level;
  }

  ruleIsActiveForSource(
    source: GrantSourceInstance,
    rule: GrantRule,
  ): boolean {
    if (
      rule.activeFromClassLevel !== null &&
      this.classLevelForSource(source) < rule.activeFromClassLevel
    ) {
      return false;
    }
    if (rule.activeFromCharacterLevel !== null) {
      const level = characterLevel(this.db, source.characterId);
      if (level === null || level < rule.activeFromCharacterLevel) {
        return false;
      }
    }
    if (rule.activeIfConfig === null) {
      return true;
    }
    const config = decodeGrantJson(source.config);
    return (
      valueAtPath(config, rule.activeIfConfig.key) ===
      rule.activeIfConfig.equals
    );
  }

  private rulesForClassSource(
    source: GrantSourceInstance,
  ): GrantRule[] {
    const classLevel = this.db.scalar<number>(
      `SELECT level
       FROM character_class_levels
       WHERE character_id = ? AND class_definition_id = ?`,
      [source.characterId, source.sourceDefinitionId ?? 0],
    );
    if (classLevel === null) {
      throw new Error(
        `Class source instance ${source.id} has no character class level.`,
      );
    }

    const byRuleKey = new Map<string, GrantRule>();
    const progressions = this.db.all(
      `SELECT grant_rules
       FROM class_progressions
       WHERE class_definition_id = ? AND class_level <= ?
       ORDER BY class_level`,
      [source.sourceDefinitionId ?? 0, classLevel],
      grantRulesText,
    );
    for (const progression of progressions) {
      const rules = decodeGrantJson(progression);
      for (const ruleData of containerValues(rules)) {
        const rule = parseRule(
          ruleData,
          'Class progression grant rules must be objects.',
        );
        byRuleKey.set(rule.ruleKey, rule);
      }
    }
    return [...byRuleKey.values()];
  }

  private rulesForSubclassSource(
    source: GrantSourceInstance,
  ): GrantRule[] {
    const classLevel = this.classLevelForSource(source);
    const definition = this.db.one(
      `SELECT id, grant_rules
       FROM subclass_definitions
       WHERE id = ?`,
      [source.sourceDefinitionId ?? 0],
      identifiedGrantRulesText,
    );
    if (definition === null) {
      throw new Error(
        `Definition for subclass source instance ${source.id} does not exist.`,
      );
    }

    const byRuleKey = new Map<string, GrantRule>();
    const staticRules = decodeGrantJson(definition.grant_rules);
    for (const ruleData of containerValues(staticRules)) {
      const rule = parseRule(
        ruleData,
        'Static subclass grant rules must be objects.',
      );
      byRuleKey.set(rule.ruleKey, rule);
    }

    const progressions = this.db.all(
      `SELECT grant_rules
       FROM subclass_progressions
       WHERE subclass_definition_id = ? AND class_level <= ?
       ORDER BY class_level`,
      [source.sourceDefinitionId ?? 0, classLevel],
      grantRulesText,
    );
    for (const progression of progressions) {
      const rules = decodeGrantJson(progression);
      for (const ruleData of containerValues(rules)) {
        const rule = parseRule(
          ruleData,
          'Subclass progression grant rules must be objects.',
        );
        byRuleKey.set(rule.ruleKey, rule);
      }
    }
    return [...byRuleKey.values()];
  }
}
