import { z } from 'zod';
import {
  abilities,
  characterLevels,
  extraAttackWeaponScopes,
  progressionTypes,
  rulesEditions,
  skills,
  spellSchools,
} from '../domain/enums';
import { featureValueKeys } from '../domain/feature-values';
import { classResourceKinds } from '../domain/class-resources';
import { FEATURE_VALUE_CONTRIBUTION_LIMITS } from '../domain/contracts/feature-value-storage-limits';
import { decodeStoredValueExpression } from '../domain/contracts/row-rules';
import type {
  AuthoredContentKind,
  AuthoringValidationIssue,
  AuthoringValidationIssueCode,
  BackgroundAuthoringDraft,
  HomebrewDraft,
  SpeciesAuthoringDraft,
  SubclassAuthoringDraft,
} from './contracts';
import {
  AUTHORING_DOCUMENT_LIMITS,
  AUTHORING_LIST_LIMITS,
  AUTHORING_NUMERIC_LIMITS,
  AUTHORING_TEXT_LIMITS,
} from './limits';

type DraftByKind = {
  readonly species: SpeciesAuthoringDraft;
  readonly subclass: SubclassAuthoringDraft;
  readonly background: BackgroundAuthoringDraft;
};

export interface EncodedDraft<K extends AuthoredContentKind = AuthoredContentKind> {
  readonly kind: K;
  readonly version: number;
  readonly document: DraftByKind[K];
  readonly json: string;
}

export type DraftDecodeResult<K extends AuthoredContentKind = AuthoredContentKind> =
  | {
      readonly status: 'ready';
      readonly stored_version: number;
      readonly current_version: number;
      readonly migrated: boolean;
      readonly document: DraftByKind[K];
    }
  | {
      readonly status: 'upgrade_required';
      readonly stored_version: number;
      readonly latest_supported_version: number;
      readonly recovery_json: string;
    };

export class DraftCodecError extends Error {
  constructor(readonly issues: readonly AuthoringValidationIssue[]) {
    super('Draft document validation failed.');
    this.name = 'DraftCodecError';
  }
}

type DraftMigration = (document: unknown) => unknown;

export interface DraftDocumentVersionRegistry<K extends AuthoredContentKind> {
  readonly kind: K;
  readonly currentVersion: number;
  readonly codecs: ReadonlyMap<number, z.ZodType>;
  /** Key N migrates the already-decoded document from N to N + 1. */
  readonly migrations: ReadonlyMap<number, DraftMigration>;
}

const codePointText = (maximum: number) =>
  z.string().refine((value) => [...value].length <= maximum, {
    message: 'text_limit_exceeded',
  });

const nonEmptyText = (maximum: number) =>
  codePointText(maximum).refine((value) => value.length > 0, {
    message: 'must not be empty',
  });

const nullable = <T extends z.ZodType>(schema: T) => z.union([schema, z.null()]);
const draftItemUuid = nonEmptyText(AUTHORING_TEXT_LIMITS.shortLabel);
const shortText = codePointText(AUTHORING_TEXT_LIMITS.shortLabel);
const description = codePointText(AUTHORING_TEXT_LIMITS.description);
const openVocabulary = codePointText(AUTHORING_TEXT_LIMITS.openVocabulary);
const contentKey = codePointText(AUTHORING_TEXT_LIMITS.contentKey);
const ruleKey = codePointText(AUTHORING_TEXT_LIMITS.ruleKey);
const ability = z.enum(abilities);
const rulesEdition = z.enum(rulesEditions);
const skill = z.enum(skills);
const spellSchool = z.union([z.enum(spellSchools), openVocabulary]);
const weaponScope = z.enum(extraAttackWeaponScopes);
const classLevel = z.union(characterLevels.map((level) => z.literal(level)));
const casterContribution = z.enum(
  progressionTypes.filter((value) => value !== 'none'),
);
const nullableInteger = (minimum: number, maximum: number) =>
  nullable(z.int().min(minimum).max(maximum));
const signedEffectInteger = nullableInteger(
  -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
  AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
);

const fixedSpellGrant = z.strictObject({
  kind: z.literal('fixed_spell'),
  draft_item_uuid: draftItemUuid,
  rule_key: ruleKey,
  spell_content_key: nullable(contentKey),
  always_prepared: z.boolean(),
});
const listGrant = z.strictObject({
  kind: z.literal('choice_from_list'),
  draft_item_uuid: draftItemUuid,
  rule_key: ruleKey,
  list: shortText,
  count: nullableInteger(1, AUTHORING_LIST_LIMITS.grants),
  bucket: z.enum(['known', 'prepared']).optional(),
  minimum_spell_level: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumSpellLevel,
    AUTHORING_NUMERIC_LIMITS.maximumSpellLevel,
  ).optional(),
  maximum_spell_level: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumSpellLevel,
    AUTHORING_NUMERIC_LIMITS.maximumSpellLevel,
  ),
});
const queryGrant = z.strictObject({
  kind: z.literal('choice_from_query'),
  draft_item_uuid: draftItemUuid,
  rule_key: ruleKey,
  schools: z.array(spellSchool).max(AUTHORING_LIST_LIMITS.queryValues),
  tags: z
    .array(codePointText(AUTHORING_TEXT_LIMITS.queryTag))
    .max(AUTHORING_LIST_LIMITS.queryValues),
  count: nullableInteger(1, AUTHORING_LIST_LIMITS.grants),
  bucket: z.enum(['known', 'prepared']).optional(),
  minimum_spell_level: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumSpellLevel,
    AUTHORING_NUMERIC_LIMITS.maximumSpellLevel,
  ),
  maximum_spell_level: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumSpellLevel,
    AUTHORING_NUMERIC_LIMITS.maximumSpellLevel,
  ),
});
const skillGrant = z.strictObject({
  kind: z.literal('skill_proficiency'),
  draft_item_uuid: draftItemUuid,
  rule_key: ruleKey,
  count: nullableInteger(1, skills.length),
  skills: z.array(skill).max(skills.length),
});
const grant = z.discriminatedUnion('kind', [
  fixedSpellGrant,
  listGrant,
  queryGrant,
  skillGrant,
]);

const effectBase = {
  draft_item_uuid: draftItemUuid,
  label: shortText,
  notes: nullable(description),
};
const damageResistance = z.strictObject({
  kind: z.literal('damage_resistance'),
  ...effectBase,
  damage_type: nullable(openVocabulary),
});
const hpModifier = z.strictObject({
  kind: z.literal('hp_modifier'),
  ...effectBase,
  hit_points_flat: signedEffectInteger,
  hit_points_per_level: signedEffectInteger,
});
const speed = z.strictObject({
  kind: z.literal('speed'),
  ...effectBase,
  speed_bonus_feet: nullableInteger(
    -AUTHORING_NUMERIC_LIMITS.maximumSpeedFeet,
    AUTHORING_NUMERIC_LIMITS.maximumSpeedFeet,
  ),
});
const abilityIncrease = z.strictObject({
  kind: z.literal('ability_increase'),
  ...effectBase,
  ability: nullable(ability),
  amount: signedEffectInteger,
  maximum: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumAbilityScore,
    AUTHORING_NUMERIC_LIMITS.maximumAbilityScore,
  ),
});
const abilityOverride = z.strictObject({
  kind: z.literal('ability_override'),
  ...effectBase,
  ability: nullable(ability),
  maximum: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumAbilityScore,
    AUTHORING_NUMERIC_LIMITS.maximumAbilityScore,
  ),
});
const armorClassBonus = z.strictObject({
  kind: z.literal('armor_class_bonus'),
  ...effectBase,
  amount: signedEffectInteger,
});
const armorClassFormula = z.strictObject({
  kind: z.literal('armor_class_formula'),
  ...effectBase,
  base: nullableInteger(1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude),
  ability_1: nullable(ability),
  ability_2: nullable(ability),
  allows_shield: nullable(z.boolean()),
});
const attackAbilityOverride = z.strictObject({
  kind: z.literal('attack_ability_override'),
  ...effectBase,
  ability: nullable(ability),
  weapon_scope: nullable(weaponScope),
});
const weaponAttackBonus = z.strictObject({
  kind: z.literal('weapon_attack_bonus'),
  ...effectBase,
  amount: signedEffectInteger,
  weapon_scope: nullable(weaponScope),
});
const weaponDamageBonus = z.strictObject({
  kind: z.literal('weapon_damage_bonus'),
  ...effectBase,
  amount: signedEffectInteger,
  weapon_scope: nullable(weaponScope),
});
const extraAttack = z.strictObject({
  kind: z.literal('extra_attack'),
  ...effectBase,
  attack_count: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumAttackCount,
    AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
  ),
  weapon_scope: nullable(weaponScope),
});
const characterEffect = z.discriminatedUnion('kind', [
  damageResistance,
  hpModifier,
  speed,
  abilityIncrease,
  abilityOverride,
  armorClassBonus,
  armorClassFormula,
  attackAbilityOverride,
  weaponAttackBonus,
  weaponDamageBonus,
]);
const featureEffect = z.discriminatedUnion('kind', [
  damageResistance,
  hpModifier,
  speed,
  abilityIncrease,
  abilityOverride,
  armorClassBonus,
  armorClassFormula,
  attackAbilityOverride,
  weaponAttackBonus,
  weaponDamageBonus,
  extraAttack,
]);

const baseDraft = {
  document_version: z.literal(1),
  name: codePointText(AUTHORING_TEXT_LIMITS.name),
  rules_edition: nullable(rulesEdition),
  reference_text: codePointText(AUTHORING_TEXT_LIMITS.referenceText),
};
const speciesV1 = z.strictObject({
  kind: z.literal('species'),
  ...baseDraft,
  creature_type: openVocabulary,
  primary_size: openVocabulary,
  alternate_size: nullable(openVocabulary),
  walking_speed_feet: nullableInteger(1, AUTHORING_NUMERIC_LIMITS.maximumSpeedFeet),
  traits: z.array(z.strictObject({
    draft_item_uuid: draftItemUuid,
    name: shortText,
    description,
    effects: z.array(characterEffect).max(AUTHORING_LIST_LIMITS.effectsPerOwner),
  })).max(AUTHORING_LIST_LIMITS.traits),
  grants: z.array(grant).max(AUTHORING_LIST_LIMITS.grants),
});

const backgroundEquipment = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('gear'),
    draft_item_uuid: draftItemUuid,
    quantity: nullableInteger(1, AUTHORING_NUMERIC_LIMITS.maximumQuantity),
    printed_name: shortText,
  }),
  z.strictObject({
    kind: z.literal('weapon'),
    draft_item_uuid: draftItemUuid,
    quantity: nullableInteger(1, AUTHORING_NUMERIC_LIMITS.maximumQuantity),
    printed_name: shortText,
    content_key: nullable(contentKey),
  }),
  z.strictObject({
    kind: z.literal('armor'),
    draft_item_uuid: draftItemUuid,
    quantity: nullableInteger(1, AUTHORING_NUMERIC_LIMITS.maximumQuantity),
    printed_name: shortText,
    content_key: nullable(contentKey),
  }),
]);
const backgroundV1 = z.strictObject({
  kind: z.literal('background'),
  ...baseDraft,
  suggested_abilities: z.array(ability).max(3),
  default_origin_feat_content_key: nullable(contentKey),
  default_origin_feat_display_name: nullable(shortText),
  skill_proficiencies: z.array(skill).max(2),
  tool_reference_text: nullable(
    codePointText(AUTHORING_TEXT_LIMITS.toolReference),
  ),
  equipment_option_a_description: codePointText(
    AUTHORING_TEXT_LIMITS.equipmentDescription,
  ),
  equipment_option_b_description: codePointText(
    AUTHORING_TEXT_LIMITS.equipmentDescription,
  ),
  equipment_option_a: z
    .array(backgroundEquipment)
    .max(AUTHORING_LIST_LIMITS.equipmentItemsPerOption),
  equipment_option_b: z
    .array(backgroundEquipment)
    .max(AUTHORING_LIST_LIMITS.equipmentItemsPerOption),
  effects: z.array(characterEffect).max(AUTHORING_LIST_LIMITS.effectsPerAggregate),
});

const progressionRow = z.strictObject({
  class_level: classLevel,
  cantrips_known: nullableInteger(0, AUTHORING_LIST_LIMITS.grants),
  prepared_or_known_count: nullableInteger(0, AUTHORING_LIST_LIMITS.grants),
  maximum_spell_level: nullableInteger(
    AUTHORING_NUMERIC_LIMITS.minimumSpellLevel,
    AUTHORING_NUMERIC_LIMITS.maximumSpellLevel,
  ),
  slot_counts: z.array(z.int().min(0).max(AUTHORING_LIST_LIMITS.grants)).max(9),
  grants: z.array(grant).max(AUTHORING_LIST_LIMITS.grants),
});
const subclassProgression = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('inherit_parent') }),
  z.strictObject({
    mode: z.literal('root_only'),
    spellcasting_ability: nullable(ability),
    caster_fraction: nullable(z.enum(['1', '1/2', '1/3'])),
    caster_rounding: nullable(z.enum(['up', 'down'])),
  }),
  z.strictObject({
    mode: z.literal('override'),
    spellcasting_ability: nullable(ability),
    caster_contribution: nullable(casterContribution),
    rows: z.array(progressionRow).max(AUTHORING_LIST_LIMITS.classChildRows),
  }),
]);
const contributionMagnitude = nullableInteger(
  -FEATURE_VALUE_CONTRIBUTION_LIMITS.magnitude,
  FEATURE_VALUE_CONTRIBUTION_LIMITS.magnitude,
);
const contributionValue = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('constant'),
    amount: contributionMagnitude,
  }),
  z.strictObject({
    kind: z.literal('class_level_scale'),
    multiply: nullableInteger(1, FEATURE_VALUE_CONTRIBUTION_LIMITS.magnitude),
    divide: nullableInteger(1, FEATURE_VALUE_CONTRIBUTION_LIMITS.magnitude),
    round: nullable(z.enum(['floor', 'ceiling'])),
  }),
  z.strictObject({
    kind: z.literal('breakpoint_table'),
    rows: z.array(z.strictObject({
      draft_item_uuid: draftItemUuid,
      from: nullable(classLevel),
      to: nullable(classLevel),
      amount: contributionMagnitude,
    })).max(FEATURE_VALUE_CONTRIBUTION_LIMITS.expressionListEntries),
  }),
  z.strictObject({
    kind: z.literal('preserved'),
    expression: z.unknown().superRefine((value, context) => {
      try {
        decodeStoredValueExpression(
          JSON.stringify(value),
          'Preserved feature-value expression',
        );
      } catch {
        context.addIssue({
          code: 'custom',
          message: 'invalid_value',
        });
      }
    }),
  }),
]);
const contributionTarget = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('feature_dice_count'),
    key: nullable(z.enum(featureValueKeys)),
  }),
  z.strictObject({
    kind: z.literal('resource_maximum'),
    display_label: shortText,
    marking_shape: nullable(z.enum(['boxes', 'remaining'])),
  }),
  z.strictObject({
    kind: z.literal('preserved'),
    target: z.discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('feature_dice_count'),
        key: z.enum(featureValueKeys),
      }),
      z.strictObject({
        kind: z.literal('resource_maximum'),
        resource: z.union([
          z.enum(classResourceKinds),
          z.strictObject({
            fact_key: contentKey,
            display_label: shortText,
            marking_shape: z.enum(['boxes', 'remaining']),
          }),
        ]),
      }),
    ]),
  }),
]);
const featureValueContribution = z.strictObject({
  kind: z.literal('feature_value_contribution'),
  draft_item_uuid: draftItemUuid,
  contribution_key: codePointText(FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints),
  label: codePointText(FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints),
  target: contributionTarget,
  op: nullable(z.literal('add')),
  active_from_level: nullable(classLevel),
  active_to_level: nullable(classLevel),
  value: contributionValue,
  supersedes_contribution_key: nullable(
    codePointText(FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints),
  ),
});
const subclassV1 = z.strictObject({
  kind: z.literal('subclass'),
  ...baseDraft,
  parent_class_content_key: nullable(contentKey),
  progression: subclassProgression,
  features: z.array(z.strictObject({
    draft_item_uuid: draftItemUuid,
    class_level: nullable(classLevel),
    name: shortText,
    description,
    effects: z.array(featureEffect).max(AUTHORING_LIST_LIMITS.effectsPerOwner),
    contributions: z.array(featureValueContribution)
      .max(AUTHORING_LIST_LIMITS.effectsPerOwner)
      .optional(),
  })).max(AUTHORING_LIST_LIMITS.features),
});

function registry<K extends AuthoredContentKind>(
  kind: K,
  codec: z.ZodType,
): DraftDocumentVersionRegistry<K> {
  return Object.freeze({
    kind,
    currentVersion: 1,
    codecs: new Map([[1, codec]]),
    migrations: new Map(),
  });
}

/** Per-kind append-only registries. Version numbers do not share a counter. */
export const DRAFT_DOCUMENT_VERSION_REGISTRIES = Object.freeze({
  species: registry('species', speciesV1),
  subclass: registry('subclass', subclassV1),
  background: registry('background', backgroundV1),
});

function valueAtPath(value: unknown, path: readonly (string | number)[]): unknown {
  let current = value;
  for (const part of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = Reflect.get(current, part);
  }
  return current;
}

function zodPath(path: readonly PropertyKey[]): (string | number)[] {
  return path.map((part) =>
    typeof part === 'symbol' ? part.description ?? String(part) : part,
  );
}

const FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  kind: 'Content kind',
  document_version: 'Document version',
  name: 'Name',
  rules_edition: 'Rules edition',
  reference_text: 'Reference text',
  creature_type: 'Creature type',
  primary_size: 'Primary size',
  alternate_size: 'Alternate size',
  walking_speed_feet: 'Walking speed',
  traits: 'Traits',
  features: 'Features',
  grants: 'Grants',
  draft_item_uuid: 'Draft item identifier',
  description: 'Description',
  effects: 'Effects',
  rule_key: 'Stable grant label',
  spell_content_key: 'Spell',
  always_prepared: 'Always prepared',
  list: 'Spell list',
  count: 'Count',
  minimum_spell_level: 'Minimum spell level',
  maximum_spell_level: 'Maximum spell level',
  schools: 'Spell schools',
  tags: 'Tags',
  skills: 'Skills',
  label: 'Label',
  notes: 'Notes',
  damage_type: 'Damage type',
  hit_points_flat: 'Hit point adjustment',
  hit_points_per_level: 'Hit points per level',
  speed_bonus_feet: 'Speed adjustment',
  ability: 'Ability',
  amount: 'Amount',
  maximum: 'Maximum',
  base: 'Base Armor Class',
  ability_1: 'First ability',
  ability_2: 'Second ability',
  allows_shield: 'Shield allowance',
  weapon_scope: 'Weapon scope',
  attack_count: 'Attack count',
  suggested_abilities: 'Suggested abilities',
  default_origin_feat_content_key: 'Installed Origin feat',
  default_origin_feat_display_name: 'Origin feat name',
  skill_proficiencies: 'Skill proficiencies',
  tool_reference_text: 'Tool reference text',
  equipment_option_a_description: 'Equipment option A description',
  equipment_option_b_description: 'Equipment option B description',
  equipment_option_a: 'Equipment option A',
  equipment_option_b: 'Equipment option B',
  quantity: 'Quantity',
  printed_name: 'Printed name',
  content_key: 'Installed content',
  parent_class_content_key: 'Parent class',
  progression: 'Progression',
  mode: 'Progression mode',
  spellcasting_ability: 'Spellcasting ability',
  caster_fraction: 'Caster fraction',
  caster_rounding: 'Caster rounding',
  caster_contribution: 'Caster contribution',
  rows: 'Progression rows',
  class_level: 'Class level',
  cantrips_known: 'Cantrips known',
  prepared_or_known_count: 'Prepared or known spell count',
  slot_counts: 'Spell slots',
});

const TEXT_MAXIMUMS: Readonly<Record<string, number>> = Object.freeze({
  name: AUTHORING_TEXT_LIMITS.name,
  reference_text: AUTHORING_TEXT_LIMITS.referenceText,
  creature_type: AUTHORING_TEXT_LIMITS.openVocabulary,
  primary_size: AUTHORING_TEXT_LIMITS.openVocabulary,
  alternate_size: AUTHORING_TEXT_LIMITS.openVocabulary,
  draft_item_uuid: AUTHORING_TEXT_LIMITS.shortLabel,
  description: AUTHORING_TEXT_LIMITS.description,
  rule_key: AUTHORING_TEXT_LIMITS.ruleKey,
  spell_content_key: AUTHORING_TEXT_LIMITS.contentKey,
  list: AUTHORING_TEXT_LIMITS.shortLabel,
  label: AUTHORING_TEXT_LIMITS.shortLabel,
  notes: AUTHORING_TEXT_LIMITS.description,
  damage_type: AUTHORING_TEXT_LIMITS.openVocabulary,
  default_origin_feat_content_key: AUTHORING_TEXT_LIMITS.contentKey,
  default_origin_feat_display_name: AUTHORING_TEXT_LIMITS.shortLabel,
  tool_reference_text: AUTHORING_TEXT_LIMITS.toolReference,
  equipment_option_a_description: AUTHORING_TEXT_LIMITS.equipmentDescription,
  equipment_option_b_description: AUTHORING_TEXT_LIMITS.equipmentDescription,
  printed_name: AUTHORING_TEXT_LIMITS.shortLabel,
  content_key: AUTHORING_TEXT_LIMITS.contentKey,
  parent_class_content_key: AUTHORING_TEXT_LIMITS.contentKey,
  tags: AUTHORING_TEXT_LIMITS.queryTag,
  schools: AUTHORING_TEXT_LIMITS.openVocabulary,
});

function fieldKey(path: readonly (string | number)[]): string | null {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const part = path[index];
    if (typeof part === 'string') return part;
  }
  return null;
}

function fieldLabel(path: readonly (string | number)[]): string {
  const key = fieldKey(path);
  return key === null ? 'Draft' : FIELD_LABELS[key] ?? 'Field';
}

function textMaximum(path: readonly (string | number)[]): number | null {
  const key = fieldKey(path);
  return key === null ? null : TEXT_MAXIMUMS[key] ?? null;
}

function numericBound(
  value: number | bigint,
  path: readonly (string | number)[],
): string {
  const printed = String(value);
  const key = fieldKey(path);
  if (key !== 'walking_speed_feet' && key !== 'speed_bonus_feet') return printed;
  return `${printed} ${value === 1 ? 'foot' : 'feet'}`;
}

function humanIssueMessage(
  issue: z.core.$ZodIssue,
  input: unknown,
): string {
  const path = zodPath(issue.path);
  const label = fieldLabel(path);
  const value = valueAtPath(input, path);
  switch (issue.code) {
    case 'too_big':
      if (Array.isArray(value)) {
        return `${label} must contain ${String(issue.maximum)} items or fewer.`;
      }
      if (typeof value === 'string') {
        return `${label} must be ${String(issue.maximum)} characters or fewer.`;
      }
      return `${label} must be at most ${numericBound(issue.maximum, path)}.`;
    case 'too_small':
      if (typeof value === 'string') return `${label} is required.`;
      return `${label} must be at least ${numericBound(issue.minimum, path)}.`;
    case 'custom': {
      if (typeof value === 'string') {
        const maximum = textMaximum(path);
        if (maximum !== null && [...value].length > maximum) {
          return `${label} must be ${String(maximum)} characters or fewer.`;
        }
        if (value.length === 0) return `${label} is required.`;
      }
      return `${label} has an invalid value.`;
    }
    case 'invalid_type':
    case 'invalid_union':
    case 'invalid_value':
    case 'invalid_format':
    case 'not_multiple_of':
    case 'invalid_key':
    case 'invalid_element':
      return `${label} has an invalid value.`;
    case 'unrecognized_keys':
      return `${label} contains an unknown field.`;
  }
}

function issueCode(issue: z.core.$ZodIssue, input: unknown): AuthoringValidationIssueCode {
  switch (issue.code) {
    case 'unrecognized_keys':
      return 'unknown_field';
    case 'too_big': {
      const value = valueAtPath(input, zodPath(issue.path));
      return Array.isArray(value) ? 'too_many_items' : typeof value === 'string' ? 'too_long' : 'out_of_range';
    }
    case 'too_small': {
      const value = valueAtPath(input, zodPath(issue.path));
      return typeof value === 'string' ? 'required' : 'out_of_range';
    }
    case 'invalid_type':
    case 'invalid_union':
      return 'invalid_type';
    case 'invalid_value':
    case 'invalid_format':
    case 'not_multiple_of':
    case 'invalid_key':
    case 'invalid_element':
      return 'invalid_value';
    case 'custom': {
      const value = valueAtPath(input, zodPath(issue.path));
      if (typeof value === 'string') {
        if (value.length === 0) return 'required';
        const maximum = textMaximum(zodPath(issue.path));
        if (maximum !== null && [...value].length > maximum) return 'too_long';
      }
      return 'invalid_value';
    }
  }
  return 'invalid_value';
}

function issuesFromZod(error: z.ZodError, input: unknown): AuthoringValidationIssue[] {
  const issues: AuthoringValidationIssue[] = [];
  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        issues.push({
          path: [...zodPath(issue.path), key],
          code: 'unknown_field',
          message: `Unknown field "${key}".`,
        });
        if (issues.length >= AUTHORING_LIST_LIMITS.validationIssues) return issues;
      }
      continue;
    }
    issues.push({
      path: zodPath(issue.path),
      code: issueCode(issue, input),
      message: humanIssueMessage(issue, input),
    });
    if (issues.length >= AUTHORING_LIST_LIMITS.validationIssues) return issues;
  }
  return issues;
}

function structuralIssues(value: unknown): AuthoringValidationIssue[] {
  const issues: AuthoringValidationIssue[] = [];
  const active = new WeakSet<object>();
  const visit = (
    current: unknown,
    path: (string | number)[],
    depth: number,
  ): void => {
    if (depth > AUTHORING_DOCUMENT_LIMITS.maximumNesting) {
      issues.push({
        path,
        code: 'invalid_value',
        message: `Draft nesting exceeds ${String(AUTHORING_DOCUMENT_LIMITS.maximumNesting)} levels.`,
      });
      return;
    }
    if (current === null || typeof current !== 'object') return;
    if (active.has(current)) {
      issues.push({ path, code: 'invalid_value', message: 'Draft documents cannot contain cycles.' });
      return;
    }
    active.add(current);
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, [...path, index], depth + 1));
    } else {
      const record = current as Readonly<Record<string, unknown>>;
      Object.entries(record).forEach(([key, child]) => {
        // Preserved expressions carry their own stricter storage depth/node/byte
        // contract in the Zod refinement; their draft wrapper depth is irrelevant.
        if (record.kind === 'preserved' && key === 'expression') return;
        visit(child, [...path, key], depth + 1);
      });
    }
    active.delete(current);
  };
  visit(value, [], 0);
  return issues.slice(0, AUTHORING_LIST_LIMITS.validationIssues);
}

function semanticIssues(value: unknown): AuthoringValidationIssue[] {
  const issues: AuthoringValidationIssue[] = [];
  const draftItemPaths = new Map<string, readonly (string | number)[]>();
  let effectCount = 0;
  const visit = (current: unknown, path: readonly (string | number)[]): void => {
    if (current === null || typeof current !== 'object') return;
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, [...path, index]));
      return;
    }
    const record = current as Readonly<Record<string, unknown>>;
    if (typeof record.draft_item_uuid === 'string') {
      const itemPath = [...path, 'draft_item_uuid'];
      const firstPath = draftItemPaths.get(record.draft_item_uuid);
      if (firstPath === undefined) {
        draftItemPaths.set(record.draft_item_uuid, itemPath);
      } else {
        issues.push({
          path: itemPath,
          code: 'duplicate',
          message: `Draft item UUID is already used at ${firstPath.join('.')}.`,
        });
      }
    }
    for (const [key, child] of Object.entries(record)) {
      if ((key === 'effects' || key === 'contributions') && Array.isArray(child)) {
        effectCount += child.length;
      }
      visit(child, [...path, key]);
    }
  };
  visit(value, []);
  if (effectCount > AUTHORING_LIST_LIMITS.effectsPerAggregate) {
    issues.unshift({
      path: [],
      code: 'too_many_items',
      message: `Draft contains ${String(effectCount)} effects; maximum is ${String(AUTHORING_LIST_LIMITS.effectsPerAggregate)}.`,
    });
  }
  return issues.slice(0, AUTHORING_LIST_LIMITS.validationIssues);
}

function parseWithCodec(codec: z.ZodType, input: unknown): unknown {
  const structure = structuralIssues(input);
  if (structure.length > 0) throw new DraftCodecError(structure);
  const result = codec.safeParse(input);
  if (!result.success) throw new DraftCodecError(issuesFromZod(result.error, input));
  const semantics = semanticIssues(result.data);
  if (semantics.length > 0) throw new DraftCodecError(semantics);
  return result.data;
}

function assertEncodedSize(json: string): void {
  const bytes = new TextEncoder().encode(json).byteLength;
  if (bytes < 1 || bytes > AUTHORING_DOCUMENT_LIMITS.encodedBytes) {
    throw new DraftCodecError([{
      path: [],
      code: 'too_long',
      message: `Draft document is ${String(bytes)} bytes; maximum is ${String(AUTHORING_DOCUMENT_LIMITS.encodedBytes)}.`,
    }]);
  }
}

function registryFor<K extends AuthoredContentKind>(kind: K): DraftDocumentVersionRegistry<K> {
  return DRAFT_DOCUMENT_VERSION_REGISTRIES[kind] as DraftDocumentVersionRegistry<K>;
}

export function encodeCurrentDraft<K extends AuthoredContentKind>(
  kind: K,
  input: unknown,
): EncodedDraft<K> {
  const versions = registryFor(kind);
  const codec = versions.codecs.get(versions.currentVersion);
  if (codec === undefined) throw new Error(`Missing current ${kind} draft codec.`);
  const document = parseWithCodec(codec, input) as DraftByKind[K];
  const json = JSON.stringify(document);
  assertEncodedSize(json);
  return Object.freeze({ kind, version: versions.currentVersion, document, json });
}

export function decodeStoredDraft<K extends AuthoredContentKind>(
  kind: K,
  storedVersion: number,
  json: string,
): DraftDecodeResult<K> {
  const versions = registryFor(kind);
  assertEncodedSize(json);
  if (storedVersion > versions.currentVersion) {
    return Object.freeze({
      status: 'upgrade_required',
      stored_version: storedVersion,
      latest_supported_version: versions.currentVersion,
      recovery_json: json,
    });
  }
  let document: unknown;
  try {
    document = JSON.parse(json) as unknown;
  } catch {
    throw new DraftCodecError([{
      path: [],
      code: 'invalid_value',
      message: 'Draft document is not valid JSON.',
    }]);
  }
  const storedCodec = versions.codecs.get(storedVersion);
  if (storedCodec === undefined) {
    throw new DraftCodecError([{
      path: ['document_version'],
      code: 'invalid_value',
      message: `Unsupported stored ${kind} draft version ${String(storedVersion)}.`,
    }]);
  }
  document = parseWithCodec(storedCodec, document);
  let version = storedVersion;
  while (version < versions.currentVersion) {
    const migrate = versions.migrations.get(version);
    const nextCodec = versions.codecs.get(version + 1);
    if (migrate === undefined || nextCodec === undefined) {
      throw new DraftCodecError([{
        path: ['document_version'],
        code: 'invalid_value',
        message: `No ${kind} draft migration exists from version ${String(version)}.`,
      }]);
    }
    document = parseWithCodec(nextCodec, migrate(document));
    version += 1;
  }
  return Object.freeze({
    status: 'ready',
    stored_version: storedVersion,
    current_version: versions.currentVersion,
    migrated: storedVersion !== versions.currentVersion,
    document: document as DraftByKind[K],
  });
}

export function currentDraftVersion(kind: AuthoredContentKind): number {
  return registryFor(kind).currentVersion;
}

export function isHomebrewDraft(value: unknown): value is HomebrewDraft {
  if (value === null || typeof value !== 'object' || !('kind' in value)) return false;
  const kind = Reflect.get(value, 'kind');
  if (kind !== 'species' && kind !== 'subclass' && kind !== 'background') return false;
  try {
    encodeCurrentDraft(kind, value);
    return true;
  } catch (error) {
    if (error instanceof DraftCodecError) return false;
    throw error;
  }
}
