import {
  abilities,
  damageType,
  isEnumValue,
  type Ability,
  type DamageType,
} from '../domain/enums';
import { GrantRule, type GrantRuleObject } from './grant-rule';

export const configuredChoiceUnknownSheetFields = [
  'walking_speed_feet',
  'darkvision_feet',
  'damage_resistances',
] as const;
export type ConfiguredChoiceUnknownSheetField =
  (typeof configuredChoiceUnknownSheetFields)[number];

export type ConfiguredChoiceEffect =
  | Readonly<{
      kind: 'speed';
      label: string;
      speed_bonus_feet: number;
    }>
  | Readonly<{
      kind: 'damage_resistance';
      label: string;
      damage_type: DamageType;
    }>;

export interface ReplaceableSpellChoice {
  readonly configKey: string;
  readonly label: string;
  readonly required: true;
  readonly spellList: string;
  readonly spellLevel: 0;
  readonly initialSpellVersionKey: string;
  readonly displayOnSheet: true;
}

export interface ConfiguredChoiceOption {
  readonly value: string;
  readonly label: string;
  readonly darkvisionFeet: number | null;
  readonly effects: readonly ConfiguredChoiceEffect[];
  readonly grants: readonly GrantRule[];
  readonly replaceableSpellChoice: ReplaceableSpellChoice | null;
}

export interface ConfiguredChoiceRuleObject {
  readonly kind: 'configured_choice';
  readonly rule_key: string;
  readonly label: string;
  readonly config_key: string;
  readonly required: true;
  readonly ability_choice: null | Readonly<{
    config_key: string;
    options: readonly Ability[];
  }>;
  readonly unknown_sheet_fields: readonly ConfiguredChoiceUnknownSheetField[];
  readonly projected_trait_names: readonly string[];
  readonly options: readonly Readonly<{
    value: string;
    label: string;
    sheet: Readonly<{ darkvision_feet?: number }>;
    effects: readonly ConfiguredChoiceEffect[];
    grants: readonly GrantRuleObject[];
    replaceable_spell_choice: null | Readonly<{
      config_key: string;
      label: string;
      required: true;
      spell_list: string;
      spell_level: 0;
      initial_spell_version_key: string;
      display_on_sheet: true;
    }>;
  }>[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new TypeError(`${label} must contain exactly ${expected.join(', ')}.`);
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be non-empty text.`);
  }
  return value.trim();
}

function path(value: unknown, label: string): string {
  const result = text(value, label);
  if (result.split('.').some((part) => part.trim() === '')) {
    throw new TypeError(`${label} must be a non-empty dotted config path.`);
  }
  return result;
}

function list(value: unknown, label: string, allowEmpty = true): unknown[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new TypeError(`${label} must be ${allowEmpty ? 'a' : 'a non-empty'} list.`);
  }
  return value;
}

function uniqueStrings(value: unknown, label: string): readonly string[] {
  const entries = list(value, label).map((entry, index) =>
    text(entry, `${label}[${String(index)}]`));
  if (new Set(entries).size !== entries.length) {
    throw new TypeError(`${label} must not contain duplicates.`);
  }
  return Object.freeze(entries);
}

function parseEffect(value: unknown, label: string): ConfiguredChoiceEffect {
  const input = record(value, label);
  if (input.kind === 'speed') {
    exactKeys(input, ['kind', 'label', 'speed_bonus_feet'], label);
    if (!Number.isSafeInteger(input.speed_bonus_feet) || input.speed_bonus_feet === 0) {
      throw new TypeError(`${label}.speed_bonus_feet must be a non-zero integer.`);
    }
    return Object.freeze({
      kind: 'speed',
      label: text(input.label, `${label}.label`),
      speed_bonus_feet: input.speed_bonus_feet as number,
    });
  }
  if (input.kind === 'damage_resistance') {
    exactKeys(input, ['kind', 'label', 'damage_type'], label);
    return Object.freeze({
      kind: 'damage_resistance',
      label: text(input.label, `${label}.label`),
      damage_type: damageType(text(input.damage_type, `${label}.damage_type`)),
    });
  }
  throw new TypeError(`${label}.kind is unsupported.`);
}

function parseReplaceableSpellChoice(
  value: unknown,
  label: string,
): ReplaceableSpellChoice | null {
  if (value === null) return null;
  const input = record(value, label);
  exactKeys(input, [
    'config_key', 'label', 'required', 'spell_list', 'spell_level',
    'initial_spell_version_key', 'display_on_sheet',
  ], label);
  if (input.required !== true || input.display_on_sheet !== true) {
    throw new TypeError(`${label} must be required and displayed on the sheet.`);
  }
  if (input.spell_level !== 0) {
    throw new TypeError(`${label}.spell_level must be 0.`);
  }
  return Object.freeze({
    configKey: path(input.config_key, `${label}.config_key`),
    label: text(input.label, `${label}.label`),
    required: true,
    spellList: text(input.spell_list, `${label}.spell_list`),
    spellLevel: 0,
    initialSpellVersionKey: text(
      input.initial_spell_version_key,
      `${label}.initial_spell_version_key`,
    ),
    displayOnSheet: true,
  });
}

export class ConfiguredChoiceRule {
  private constructor(
    readonly ruleKey: string,
    readonly label: string,
    readonly configKey: string,
    readonly required: true,
    readonly abilityChoice: null | Readonly<{
      configKey: string;
      options: readonly Ability[];
    }>,
    readonly unknownSheetFields: readonly ConfiguredChoiceUnknownSheetField[],
    readonly projectedTraitNames: readonly string[],
    readonly options: readonly ConfiguredChoiceOption[],
    private readonly data: ConfiguredChoiceRuleObject,
  ) {}

  static fromObject(value: unknown): ConfiguredChoiceRule {
    const input = record(value, 'Configured-choice rule');
    exactKeys(input, [
      'kind', 'rule_key', 'label', 'config_key', 'required',
      'ability_choice', 'unknown_sheet_fields', 'projected_trait_names',
      'options',
    ], 'Configured-choice rule');
    if (input.kind !== 'configured_choice' || input.required !== true) {
      throw new TypeError(
        'Configured-choice rule kind must be configured_choice and required must be true.',
      );
    }
    const ruleKey = text(input.rule_key, 'Configured-choice rule.rule_key');
    const abilityChoice = input.ability_choice === null
      ? null
      : (() => {
          const choice = record(input.ability_choice, 'Configured-choice rule.ability_choice');
          exactKeys(choice, ['config_key', 'options'], 'Configured-choice rule.ability_choice');
          const options = uniqueStrings(
            choice.options,
            'Configured-choice rule.ability_choice.options',
          );
          if (
            options.length === 0 ||
            options.some((option) => !isEnumValue(abilities, option))
          ) {
            throw new TypeError(
              'Configured-choice rule ability options must be supported abilities.',
            );
          }
          return Object.freeze({
            configKey: path(
              choice.config_key,
              'Configured-choice rule.ability_choice.config_key',
            ),
            options: Object.freeze(options as Ability[]),
          });
        })();
    const unknownSheetFields = uniqueStrings(
      input.unknown_sheet_fields,
      'Configured-choice rule.unknown_sheet_fields',
    );
    if (
      unknownSheetFields.some((field) =>
        !(configuredChoiceUnknownSheetFields as readonly string[]).includes(field))
    ) {
      throw new TypeError('Configured-choice rule has an unknown sheet field.');
    }
    const projectedTraitNames = uniqueStrings(
      input.projected_trait_names,
      'Configured-choice rule.projected_trait_names',
    );
    if (projectedTraitNames.length > 0 && unknownSheetFields.length === 0) {
      throw new TypeError(
        'A projected trait requires a structured unknown sheet field.',
      );
    }

    const optionValues = new Set<string>();
    const materialRuleKeys = new Set<string>();
    const options = list(input.options, 'Configured-choice rule.options', false)
      .map((entry, index): ConfiguredChoiceOption => {
        const label = `Configured-choice rule.options[${String(index)}]`;
        const option = record(entry, label);
        exactKeys(option, [
          'value', 'label', 'sheet', 'effects', 'grants',
          'replaceable_spell_choice',
        ], label);
        const optionValue = text(option.value, `${label}.value`);
        if (optionValues.has(optionValue)) {
          throw new TypeError(`Configured-choice rule repeats option '${optionValue}'.`);
        }
        optionValues.add(optionValue);
        const sheet = record(option.sheet, `${label}.sheet`);
        exactKeys(
          sheet,
          Object.hasOwn(sheet, 'darkvision_feet') ? ['darkvision_feet'] : [],
          `${label}.sheet`,
        );
        const darkvisionFeet = sheet.darkvision_feet === undefined
          ? null
          : sheet.darkvision_feet;
        if (
          darkvisionFeet !== null &&
          (!Number.isSafeInteger(darkvisionFeet) || (darkvisionFeet as number) <= 0)
        ) {
          throw new TypeError(`${label}.sheet.darkvision_feet must be positive.`);
        }
        const effects = list(option.effects, `${label}.effects`).map(
          (effect, effectIndex) => parseEffect(
            effect,
            `${label}.effects[${String(effectIndex)}]`,
          ),
        );
        const grants = list(option.grants, `${label}.grants`).map(
          (grant, grantIndex) => {
            const grantRecord = record(
              grant,
              `${label}.grants[${String(grantIndex)}]`,
            );
            if (grantRecord.kind === 'configured_choice') {
              throw new TypeError('Configured-choice rules may not be nested.');
            }
            const parsed = GrantRule.fromObject(grant);
            if (materialRuleKeys.has(parsed.ruleKey)) {
              throw new TypeError(
                `Configured-choice rule repeats material rule_key '${parsed.ruleKey}'.`,
              );
            }
            materialRuleKeys.add(parsed.ruleKey);
            return parsed;
          },
        );
        return Object.freeze({
          value: optionValue,
          label: text(option.label, `${label}.label`),
          darkvisionFeet: darkvisionFeet as number | null,
          effects: Object.freeze(effects),
          grants: Object.freeze(grants),
          replaceableSpellChoice: parseReplaceableSpellChoice(
            option.replaceable_spell_choice,
            `${label}.replaceable_spell_choice`,
          ),
        });
      });

    if (
      unknownSheetFields.includes('darkvision_feet') &&
      options.some((option) => option.darkvisionFeet === null)
    ) {
      throw new TypeError('Every option must provide declared Darkvision.');
    }
    if (
      unknownSheetFields.includes('damage_resistances') &&
      options.some((option) =>
        option.effects.filter((effect) => effect.kind === 'damage_resistance').length !== 1)
    ) {
      throw new TypeError('Every option must provide one declared damage resistance.');
    }

    return new ConfiguredChoiceRule(
      ruleKey,
      text(input.label, 'Configured-choice rule.label'),
      path(input.config_key, 'Configured-choice rule.config_key'),
      true,
      abilityChoice,
      Object.freeze(unknownSheetFields as ConfiguredChoiceUnknownSheetField[]),
      Object.freeze(projectedTraitNames),
      Object.freeze(options),
      structuredClone(input) as unknown as ConfiguredChoiceRuleObject,
    );
  }

  toObject(): ConfiguredChoiceRuleObject {
    return structuredClone(this.data);
  }
}

export type SourceGrantRule = GrantRule | ConfiguredChoiceRule;

/** Closed source-rule parser; GrantRule keeps its material-only discriminants. */
export function parseSourceGrantRules(value: unknown): readonly SourceGrantRule[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Source grant rules must be a list.');
  }
  const ruleKeys = new Set<string>();
  const rules = value.map((entry) => {
    const input = record(entry, 'Source grant rule');
    const rule = input.kind === 'configured_choice'
      ? ConfiguredChoiceRule.fromObject(input)
      : GrantRule.fromObject(input);
    if (ruleKeys.has(rule.ruleKey)) {
      throw new TypeError(`Source grant rules repeat rule_key '${rule.ruleKey}'.`);
    }
    ruleKeys.add(rule.ruleKey);
    if (rule instanceof ConfiguredChoiceRule) {
      for (const option of rule.options) {
        for (const grant of option.grants) {
          if (ruleKeys.has(grant.ruleKey)) {
            throw new TypeError(
              `Source grant rules repeat rule_key '${grant.ruleKey}'.`,
            );
          }
          ruleKeys.add(grant.ruleKey);
        }
      }
    }
    return rule;
  });
  return Object.freeze(rules);
}
