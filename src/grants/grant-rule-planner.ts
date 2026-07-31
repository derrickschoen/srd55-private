import type {
  PlannedGrantLocator,
  PlannedGrantSource,
} from '../builder/level-up-wizard';
import type { SpellSelectionConstraint } from '../eligibility/spell-selection-constraint';
import type {
  SpellSchool,
} from '../domain/enums';
import type {
  ClassLevel,
  GrantOrdinal,
  GrantRuleKey,
  SpellVersionId,
} from '../domain/ids';
import type { JsonObject } from '../domain/models';
import { GrantRule, type GrantRuleObject } from './grant-rule';

export type PlannedSpellGrant =
  | {
      readonly kind: 'slot_selection';
      readonly locator: PlannedGrantLocator;
      readonly constraint: SpellSelectionConstraint;
      readonly bucket: Exclude<
        NonNullable<GrantRule['bucket']>,
        'spellbook'
      >;
      readonly fixed_spell_version_id: SpellVersionId | null;
      readonly fixed_spell_version_key: string | null;
      readonly required: boolean;
      readonly locked: boolean;
    }
  | {
      readonly kind: 'spellbook_acquisition';
      readonly locator: PlannedGrantLocator;
      readonly constraint: SpellSelectionConstraint;
      readonly acquired_at_class_level: ClassLevel | null;
    };

export interface GrantRulePlanInput {
  readonly source: PlannedGrantSource;
  readonly configured_rules: readonly GrantRuleObject[];
  readonly config: JsonObject;
  readonly effective_class_level: ClassLevel | null;
}

function valueAtPath(value: unknown, path: string): unknown {
  let current = value;
  for (const part of path.split('.')) {
    if (
      current === null ||
      Array.isArray(current) ||
      typeof current !== 'object' ||
      !Object.hasOwn(current, part)
    ) {
      return null;
    }
    current = (current as Readonly<Record<string, unknown>>)[part];
  }
  return current ?? null;
}

function stringList(value: unknown): readonly string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new TypeError('Planned spell constraint lists must be strings.');
  }
  return Object.freeze([...value]);
}

function resolvedList(data: Readonly<Record<string, unknown>>, config: JsonObject) {
  const raw = data.list;
  if (typeof raw !== 'string') {
    return [];
  }
  const resolved = raw.startsWith('$config.')
    ? valueAtPath(config, raw.slice('$config.'.length))
    : raw;
  if (typeof resolved !== 'string' || resolved.trim() === '') {
    throw new TypeError('A configured spell list could not be resolved.');
  }
  return Object.freeze([resolved.trim()]);
}

function constraintFor(
  rule: GrantRule,
  config: JsonObject,
): SpellSelectionConstraint {
  const data = rule.toObject();
  return Object.freeze({
    spell_level_min: Number(data.level_min ?? 0),
    spell_level_max: Number(data.level_max ?? 9),
    allowed_spell_lists:
      rule.kind === GrantRule.CHOICE_FROM_LIST ||
      rule.kind === GrantRule.SPELLBOOK_ACQUISITION
        ? resolvedList(data, config)
        : [],
    allowed_schools: stringList(data.schools) as readonly SpellSchool[],
    allowed_tags: stringList(data.tags),
    selection_collection: null,
  });
}

function acquisitionLevel(
  ordinal: number,
  data: Readonly<Record<string, unknown>>,
  fallback: ClassLevel | null,
): ClassLevel | null {
  const initial = data.initial_count;
  const perLevel = data.count_per_level;
  if (
    Number.isSafeInteger(initial) &&
    (initial as number) >= 0 &&
    Number.isSafeInteger(perLevel) &&
    (perLevel as number) >= 1
  ) {
    if (ordinal <= (initial as number)) {
      return 1 as ClassLevel;
    }
    return (
      2 +
      Math.floor((ordinal - (initial as number) - 1) / (perLevel as number))
    ) as ClassLevel;
  }
  return fallback;
}

function locator(
  source: PlannedGrantSource,
  rule: GrantRule,
  ordinal: number,
): PlannedGrantLocator {
  return {
    source,
    rule_key: rule.ruleKey as GrantRuleKey,
    ordinal: ordinal as GrantOrdinal,
  };
}

/**
 * Plans the spell-bearing portion of one normalized effective rule list.
 *
 * `configured_rules` is the same list the generator consumes. LU-0 can pass
 * `FeatApplicationPlan.grant_rules` directly; there is no feat-specific arm.
 */
export class GrantRulePlanner {
  plan(input: GrantRulePlanInput): readonly PlannedSpellGrant[] {
    const planned: PlannedSpellGrant[] = [];
    for (const object of input.configured_rules) {
      const rule = GrantRule.fromObject(object);
      if (
        rule.activeFromClassLevel !== null &&
        (input.effective_class_level === null ||
          input.effective_class_level < rule.activeFromClassLevel)
      ) {
        continue;
      }
      if (
        rule.activeIfConfig !== null &&
        valueAtPath(input.config, rule.activeIfConfig.key) !==
          rule.activeIfConfig.equals
      ) {
        continue;
      }
      const data = rule.toObject();
      switch (rule.kind) {
        case GrantRule.FIXED_SPELL:
          planned.push({
            kind: 'slot_selection',
            locator: locator(input.source, rule, 1),
            constraint: constraintFor(rule, input.config),
            bucket: rule.bucket as Exclude<
              NonNullable<GrantRule['bucket']>,
              'spellbook'
            >,
            fixed_spell_version_id:
              Number.isSafeInteger(data.spell_version_id)
                ? (Number(data.spell_version_id) as SpellVersionId)
                : null,
            fixed_spell_version_key:
              typeof data.spell_version_key === 'string'
                ? data.spell_version_key
                : null,
            required: true,
            locked: true,
          });
          break;
        case GrantRule.CHOICE_FROM_LIST:
        case GrantRule.CHOICE_FROM_QUERY:
          for (
            let ordinal = 1;
            ordinal <= (rule.count ?? 0);
            ordinal += 1
          ) {
            planned.push({
              kind: 'slot_selection',
              locator: locator(input.source, rule, ordinal),
              constraint: constraintFor(rule, input.config),
              bucket: rule.bucket as Exclude<
                NonNullable<GrantRule['bucket']>,
                'spellbook'
              >,
              fixed_spell_version_id: null,
              fixed_spell_version_key: null,
              required: data.required !== false,
              locked: false,
            });
          }
          break;
        case GrantRule.SPELLBOOK_ACQUISITION:
          for (
            let ordinal = 1;
            ordinal <= (rule.count ?? 0);
            ordinal += 1
          ) {
            planned.push({
              kind: 'spellbook_acquisition',
              locator: locator(input.source, rule, ordinal),
              constraint: constraintFor(rule, input.config),
              acquired_at_class_level: acquisitionLevel(
                ordinal,
                data,
                input.effective_class_level,
              ),
            });
          }
          break;
        case GrantRule.GRANT_SOURCE:
        case GrantRule.CAPABILITY:
        case GrantRule.FIGHTING_STYLE:
        case GrantRule.WEAPON_MASTERY:
        case GrantRule.SKILL_PROFICIENCY:
          break;
      }
    }
    return Object.freeze(planned);
  }
}
