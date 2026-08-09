import { sqlNullableString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { GrantRule } from './grant-rule';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from './configured-choice-rule';
import {
  decodeGrantJson,
  SourceRuleReader,
  sourceDefinitionTable,
  valueAtPath,
  type GrantSourceInstance,
} from './source-rule-reader';

export function replaceableSpellRuleKey(configuredRuleKey: string): string {
  return `${configuredRuleKey}:replaceable_spell`;
}

/** B-owned runtime expansion layered over Unit A's checksum-frozen reader. */
export class ConfiguredChoiceMaterialReader extends SourceRuleReader {
  constructor(private readonly choiceDb: DatabaseContext) {
    super(choiceDb);
  }

  override rulesForSource(source: GrantSourceInstance): GrantRule[] {
    const material = super.rulesForSource(source);
    if (
      source.sourceType === 'class' ||
      source.sourceType === 'subclass' ||
      source.sourceDefinitionId === null
    ) {
      return material;
    }
    const table = sourceDefinitionTable(source.sourceType);
    const stored = this.choiceDb.one(
      `SELECT grant_rules FROM ${table} WHERE id = ?`,
      [source.sourceDefinitionId],
      (row) => sqlNullableString(row, 'grant_rules'),
    );
    const config = decodeGrantJson(source.config);
    const replaceableRules = parseSourceGrantRules(decodeGrantJson(stored))
      .flatMap((rule): GrantRule[] => {
        if (!(rule instanceof ConfiguredChoiceRule)) return [];
        const selected = valueAtPath(config, rule.configKey);
        const option = rule.options.find(
          (candidate) => candidate.value === selected,
        );
        const replaceable = option?.replaceableSpellChoice ?? null;
        return replaceable === null
          ? []
          : [GrantRule.fromObject({
              kind: 'choice_from_list',
              rule_key: replaceableSpellRuleKey(rule.ruleKey),
              count: 1,
              bucket: 'cantrip_known',
              list: replaceable.spellList,
              level_min: replaceable.spellLevel,
              level_max: replaceable.spellLevel,
            })];
      });
    for (const rule of replaceableRules) {
      if (material.some((candidate) => candidate.ruleKey === rule.ruleKey)) {
        throw new TypeError(
          `Replaceable-spell rule key '${rule.ruleKey}' collides with a stored rule.`,
        );
      }
    }
    return [...material, ...replaceableRules];
  }
}
