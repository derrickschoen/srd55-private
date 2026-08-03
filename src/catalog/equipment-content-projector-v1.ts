import type { DatabaseContext } from '../db/database';
import {
  sqlBoolean,
  sqlDamageType,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  sqlVersatileWeaponDamage,
  sqlWeaponDamage,
  type SqlRow,
} from '../db/codecs';
import type {
  ArmorCategory,
  ArmorDexBonus,
  DamageType,
  RulesEdition,
  SrdWeaponGroup,
  WeaponMasteryProperty,
} from '../domain/enums';
import {
  abilities,
  armorCategories,
  armorDexBonuses,
  characterEffectKinds,
  extraAttackWeaponScopes,
  isEnumValue,
  rulesEditions,
  srdWeaponGroups,
  weaponMasteryProperties,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { VersatileWeaponDamage, WeaponDamage } from '../domain/weapon-damage';
import type { WeaponRange } from '../domain/weapon-range';
import {
  isWeaponRangeKind,
  weaponRangeFromStorage,
} from '../domain/weapon-range';
import type { AuthoringCharacterEffect } from '../authoring/effect-forms';
import type { EquipmentEffectInput } from '../domain/equipment-effects';
import type { CanonicalCharacterEffectV1 } from './authored-content-projector-contract-v1';
import {
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  contentIdentitySequence,
  type CanonicalOpenPassthroughValue,
  type CanonicalRuleText,
  type ContentIdentitySequence,
} from './content-identity';

interface EquipmentContentAggregateBase<K extends 'weapon' | 'armor' | 'item'> {
  readonly kind: K;
  readonly name: string;
  readonly rules_edition: RulesEdition;
}

export interface WeaponContentAggregate
  extends EquipmentContentAggregateBase<'weapon'> {
  readonly srd_group: SrdWeaponGroup;
  readonly damage: WeaponDamage;
  readonly damage_type: DamageType;
  readonly versatile_damage: VersatileWeaponDamage;
  readonly finesse: boolean;
  readonly heavy: boolean;
  readonly light: boolean;
  readonly loading: boolean;
  readonly reach: boolean;
  readonly thrown: boolean;
  readonly two_handed: boolean;
  readonly ammunition: boolean;
  readonly ammunition_kind: string | null;
  readonly range: WeaponRange;
  readonly mastery_property: WeaponMasteryProperty;
  readonly other_properties: string | null;
}

export interface ArmorContentAggregate
  extends EquipmentContentAggregateBase<'armor'> {
  readonly category: ArmorCategory;
  readonly armor_class: number;
  readonly dex_bonus: ArmorDexBonus;
  readonly dex_bonus_max: number | null;
  readonly strength_requirement: number | null;
  readonly stealth_disadvantage: boolean;
}

export interface ItemContentAggregate
  extends EquipmentContentAggregateBase<'item'> {
  readonly description: string;
  readonly requires_attunement: boolean;
  readonly effects: readonly AuthoringCharacterEffect[];
}

export type EquipmentContentAggregate =
  | WeaponContentAggregate
  | ArmorContentAggregate
  | ItemContentAggregate;

export interface WeaponProjectorPayloadV1 {
  readonly srd_group: SrdWeaponGroup;
  readonly damage: WeaponDamage;
  readonly damage_type: CanonicalOpenPassthroughValue;
  readonly versatile_damage: VersatileWeaponDamage;
  readonly finesse: boolean;
  readonly heavy: boolean;
  readonly light: boolean;
  readonly loading: boolean;
  readonly reach: boolean;
  readonly thrown: boolean;
  readonly two_handed: boolean;
  readonly ammunition: boolean;
  readonly ammunition_kind: CanonicalOpenPassthroughValue | null;
  readonly range: WeaponRange;
  readonly mastery_property: WeaponMasteryProperty;
  readonly other_properties: CanonicalRuleText | null;
}

export interface ArmorProjectorPayloadV1 {
  readonly category: ArmorCategory;
  readonly armor_class: number;
  readonly dex_bonus: ArmorDexBonus;
  readonly dex_bonus_max: number | null;
  readonly strength_requirement: number | null;
  readonly stealth_disadvantage: boolean;
}

export interface ItemProjectorPayloadV1 {
  readonly description: CanonicalRuleText;
  readonly requires_attunement: boolean;
  readonly effects: ContentIdentitySequence<CanonicalCharacterEffectV1>;
}

export type EquipmentProjectorPayloadV1<K extends EquipmentContentAggregate['kind']> =
  K extends 'weapon'
    ? WeaponProjectorPayloadV1
    : K extends 'armor'
      ? ArmorProjectorPayloadV1
      : ItemProjectorPayloadV1;

/**
 * `sort_order` is the sole excluded effect field: runtime reads definition
 * effects in that order, and the enclosing ContentIdentitySequence already
 * carries the same fact. Every other parsed field is included by default so a
 * future semantic field over-splits identity instead of silently colliding.
 */
export function canonicalEquipmentEffectV1(
  effect: AuthoringCharacterEffect,
): CanonicalCharacterEffectV1 {
  const { sort_order: _sequencePosition, notes, ...semantic } = effect;
  const canonical = {
    ...semantic,
    notes: notes === null ? null : canonicalRuleText(notes),
  };
  if (effect.kind === 'damage_resistance') {
    return {
      ...canonical,
      damage_type: canonicalOpenPassthroughValue(effect.damage_type),
    } as CanonicalCharacterEffectV1;
  }
  return canonical as CanonicalCharacterEffectV1;
}

/** The picker copies a definition effect into the character-owned vocabulary. */
export function equipmentEffectInput(
  effect: AuthoringCharacterEffect,
): EquipmentEffectInput {
  const { kind, sort_order: _definitionOrder, ...fields } = effect;
  return { ...fields, effect_kind: kind } as EquipmentEffectInput;
}

export function projectWeaponContentV1(
  aggregate: WeaponContentAggregate,
): WeaponProjectorPayloadV1 {
  return {
    srd_group: aggregate.srd_group,
    damage: aggregate.damage,
    damage_type: canonicalOpenPassthroughValue(aggregate.damage_type),
    versatile_damage: aggregate.versatile_damage,
    finesse: aggregate.finesse,
    heavy: aggregate.heavy,
    light: aggregate.light,
    loading: aggregate.loading,
    reach: aggregate.reach,
    thrown: aggregate.thrown,
    two_handed: aggregate.two_handed,
    ammunition: aggregate.ammunition,
    ammunition_kind: aggregate.ammunition_kind === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.ammunition_kind),
    range: aggregate.range,
    mastery_property: aggregate.mastery_property,
    other_properties: aggregate.other_properties === null
      ? null
      : canonicalRuleText(aggregate.other_properties),
  };
}

export function projectArmorContentV1(
  aggregate: ArmorContentAggregate,
): ArmorProjectorPayloadV1 {
  return {
    category: aggregate.category,
    armor_class: aggregate.armor_class,
    dex_bonus: aggregate.dex_bonus,
    dex_bonus_max: aggregate.dex_bonus_max,
    strength_requirement: aggregate.strength_requirement,
    stealth_disadvantage: aggregate.stealth_disadvantage,
  };
}

export function projectItemContentV1(
  aggregate: ItemContentAggregate,
): ItemProjectorPayloadV1 {
  return {
    description: canonicalRuleText(aggregate.description),
    requires_attunement: aggregate.requires_attunement,
    effects: contentIdentitySequence(
      aggregate.effects.map(canonicalEquipmentEffectV1),
    ),
  };
}

export class StoredEquipmentContentProjectionError extends TypeError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Stored equipment content-v1 projection failed: ${message}`, options);
    this.name = 'StoredEquipmentContentProjectionError';
  }
}

export interface StoredEquipmentProjectionV1<
  K extends EquipmentContentAggregate['kind'],
> {
  readonly kind: K;
  readonly aggregate: Extract<EquipmentContentAggregate, { readonly kind: K }>;
  readonly payload: EquipmentProjectorPayloadV1<K>;
  readonly references: readonly [];
}

export type AnyStoredEquipmentProjectionV1 =
  | StoredEquipmentProjectionV1<'weapon'>
  | StoredEquipmentProjectionV1<'armor'>
  | StoredEquipmentProjectionV1<'item'>;

function projectionError(message: string, options?: ErrorOptions): never {
  throw new StoredEquipmentContentProjectionError(message, options);
}

function nonEmpty(value: string, label: string): string {
  if (value.trim() === '') return projectionError(`${label} must not be empty.`);
  return value;
}

function enumValue<const T extends readonly string[]>(
  values: T,
  value: string,
  label: string,
): T[number] {
  if (!isEnumValue(values, value)) {
    return projectionError(`${label} '${value}' is invalid.`);
  }
  return value;
}

function nullableAbility(value: string | null, label: string) {
  if (value === null) return null;
  return enumValue(abilities, value, label);
}

function requiredInteger(value: number | null, label: string): number {
  if (value === null) return projectionError(`${label} is required.`);
  return value;
}

function requiredString(value: string | null, label: string): string {
  if (value === null) return projectionError(`${label} is required.`);
  return value;
}

function optionalBoolean(row: SqlRow, column: string): boolean | null {
  return row[column] === null ? null : sqlBoolean(row, column);
}

function storedItemEffect(row: SqlRow): AuthoringCharacterEffect {
  const kind = enumValue(
    characterEffectKinds,
    sqlString(row, 'effect_kind'),
    'item definition effect kind',
  );
  const common = {
    sort_order: sqlInteger(row, 'sort_order'),
    label: nonEmpty(sqlString(row, 'label'), 'item definition effect label'),
    notes: sqlNullableString(row, 'notes'),
  };
  switch (kind) {
    case 'damage_resistance':
      return {
        ...common,
        kind,
        damage_type: sqlDamageType(row, 'damage_type'),
      };
    case 'hp_modifier': {
      const hit_points_flat = sqlNullableInteger(row, 'hit_points_flat');
      const hit_points_per_level = sqlNullableInteger(
        row,
        'hit_points_per_level',
      );
      if (hit_points_flat === null && hit_points_per_level === null) {
        return projectionError('item hit point modifier has no payload.');
      }
      return { ...common, kind, hit_points_flat, hit_points_per_level };
    }
    case 'speed':
      return {
        ...common,
        kind,
        speed_bonus_feet: requiredInteger(
          sqlNullableInteger(row, 'speed_bonus_feet'),
          'item speed bonus',
        ),
      };
    case 'ability_increase':
      return {
        ...common,
        kind,
        ability: enumValue(
          abilities,
          requiredString(sqlNullableString(row, 'ability'), 'item ability'),
          'item ability',
        ),
        amount: requiredInteger(sqlNullableInteger(row, 'amount'), 'item amount'),
        maximum: requiredInteger(
          sqlNullableInteger(row, 'maximum'),
          'item maximum',
        ),
      };
    case 'ability_override':
      return {
        ...common,
        kind,
        ability: enumValue(
          abilities,
          requiredString(sqlNullableString(row, 'ability'), 'item ability'),
          'item ability',
        ),
        maximum: requiredInteger(
          sqlNullableInteger(row, 'maximum'),
          'item maximum',
        ),
      };
    case 'armor_class_bonus':
      return {
        ...common,
        kind,
        amount: requiredInteger(sqlNullableInteger(row, 'amount'), 'item amount'),
      };
    case 'armor_class_formula': {
      const allowsShield = optionalBoolean(row, 'allows_shield');
      if (allowsShield === null) {
        return projectionError('item Armor Class formula requires allows_shield.');
      }
      return {
        ...common,
        kind,
        base: requiredInteger(sqlNullableInteger(row, 'base'), 'item Armor Class base'),
        ability_1: enumValue(
          abilities,
          requiredString(sqlNullableString(row, 'ability_1'), 'item first ability'),
          'item first ability',
        ),
        ability_2: nullableAbility(
          sqlNullableString(row, 'ability_2'),
          'item second ability',
        ),
        allows_shield: allowsShield,
      };
    }
    case 'attack_ability_override':
      return {
        ...common,
        kind,
        ability: enumValue(
          abilities,
          requiredString(sqlNullableString(row, 'ability'), 'item attack ability'),
          'item attack ability',
        ),
        weapon_scope: enumValue(
          extraAttackWeaponScopes,
          requiredString(sqlNullableString(row, 'weapon_scope'), 'item weapon scope'),
          'item weapon scope',
        ),
      };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      return {
        ...common,
        kind,
        amount: requiredInteger(sqlNullableInteger(row, 'amount'), 'item amount'),
        weapon_scope: enumValue(
          extraAttackWeaponScopes,
          requiredString(sqlNullableString(row, 'weapon_scope'), 'item weapon scope'),
          'item weapon scope',
        ),
      };
  }
}

function readWeapon(db: DatabaseContext, contentKey: ContentKey): WeaponContentAggregate {
  const row = db.oneRaw(
    'SELECT * FROM weapon_templates WHERE content_key = ?',
    [contentKey],
  );
  if (row === null) return projectionError(`weapon '${contentKey}' is missing.`);
  const rangeKind = sqlString(row, 'range_kind');
  if (!isWeaponRangeKind(rangeKind) || rangeKind === 'legacy') {
    return projectionError(`weapon range kind '${rangeKind}' is not projectable.`);
  }
  return {
    kind: 'weapon',
    name: nonEmpty(sqlString(row, 'name'), 'weapon name'),
    rules_edition: enumValue(
      rulesEditions,
      sqlString(row, 'rules_edition'),
      'weapon rules edition',
    ),
    srd_group: enumValue(
      srdWeaponGroups,
      sqlString(row, 'srd_group'),
      'weapon group',
    ),
    damage: sqlWeaponDamage(row),
    damage_type: sqlDamageType(row, 'damage_type'),
    versatile_damage: sqlVersatileWeaponDamage(row),
    finesse: sqlBoolean(row, 'finesse'),
    heavy: sqlBoolean(row, 'heavy'),
    light: sqlBoolean(row, 'light'),
    loading: sqlBoolean(row, 'loading'),
    reach: sqlBoolean(row, 'reach'),
    thrown: sqlBoolean(row, 'thrown'),
    two_handed: sqlBoolean(row, 'two_handed'),
    ammunition: sqlBoolean(row, 'ammunition'),
    ammunition_kind: sqlNullableString(row, 'ammunition_kind'),
    range: weaponRangeFromStorage(
      rangeKind,
      sqlNullableInteger(row, 'range_near_feet'),
      sqlNullableInteger(row, 'range_far_feet'),
    ),
    mastery_property: enumValue(
      weaponMasteryProperties,
      sqlString(row, 'mastery_property'),
      'weapon mastery property',
    ),
    other_properties: sqlNullableString(row, 'other_properties'),
  };
}

function readArmor(db: DatabaseContext, contentKey: ContentKey): ArmorContentAggregate {
  const row = db.oneRaw(
    'SELECT * FROM armor_templates WHERE content_key = ?',
    [contentKey],
  );
  if (row === null) return projectionError(`armor '${contentKey}' is missing.`);
  const dexBonus = enumValue(
    armorDexBonuses,
    sqlString(row, 'dex_bonus'),
    'armor Dexterity mode',
  );
  const dexBonusMax = sqlNullableInteger(row, 'dex_bonus_max');
  if ((dexBonus === 'capped') !== (dexBonusMax !== null)) {
    return projectionError('armor Dexterity mode and cap disagree.');
  }
  return {
    kind: 'armor',
    name: nonEmpty(sqlString(row, 'name'), 'armor name'),
    rules_edition: enumValue(
      rulesEditions,
      sqlString(row, 'rules_edition'),
      'armor rules edition',
    ),
    category: enumValue(
      armorCategories,
      sqlString(row, 'category'),
      'armor category',
    ),
    armor_class: sqlInteger(row, 'armor_class'),
    dex_bonus: dexBonus,
    dex_bonus_max: dexBonusMax,
    strength_requirement: sqlNullableInteger(row, 'strength_requirement'),
    stealth_disadvantage: sqlBoolean(row, 'stealth_disadvantage'),
  };
}

function readItem(db: DatabaseContext, contentKey: ContentKey): ItemContentAggregate {
  const root = db.oneRaw(
    'SELECT * FROM item_definitions WHERE content_key = ?',
    [contentKey],
  );
  if (root === null) return projectionError(`item '${contentKey}' is missing.`);
  const itemDefinitionId = sqlInteger(root, 'id');
  const effects = db.all(
    `SELECT * FROM item_definition_effects
     WHERE item_definition_id = ?
     ORDER BY sort_order, id`,
    [itemDefinitionId],
    storedItemEffect,
  );
  return {
    kind: 'item',
    name: nonEmpty(sqlString(root, 'name'), 'item name'),
    rules_edition: enumValue(
      rulesEditions,
      sqlString(root, 'rules_edition'),
      'item rules edition',
    ),
    description: sqlString(root, 'description'),
    requires_attunement: sqlBoolean(root, 'requires_attunement'),
    effects,
  };
}

export function projectStoredEquipmentContentV1(
  db: DatabaseContext,
  input: { readonly kind: 'weapon'; readonly contentKey: ContentKey },
): StoredEquipmentProjectionV1<'weapon'>;
export function projectStoredEquipmentContentV1(
  db: DatabaseContext,
  input: { readonly kind: 'armor'; readonly contentKey: ContentKey },
): StoredEquipmentProjectionV1<'armor'>;
export function projectStoredEquipmentContentV1(
  db: DatabaseContext,
  input: { readonly kind: 'item'; readonly contentKey: ContentKey },
): StoredEquipmentProjectionV1<'item'>;
export function projectStoredEquipmentContentV1(
  db: DatabaseContext,
  input: {
    readonly kind: EquipmentContentAggregate['kind'];
    readonly contentKey: ContentKey;
  },
): AnyStoredEquipmentProjectionV1 {
  try {
    switch (input.kind) {
      case 'weapon': {
        const aggregate = readWeapon(db, input.contentKey);
        return {
          kind: aggregate.kind,
          aggregate,
          payload: projectWeaponContentV1(aggregate),
          references: [],
        };
      }
      case 'armor': {
        const aggregate = readArmor(db, input.contentKey);
        return {
          kind: aggregate.kind,
          aggregate,
          payload: projectArmorContentV1(aggregate),
          references: [],
        };
      }
      case 'item': {
        const aggregate = readItem(db, input.contentKey);
        return {
          kind: aggregate.kind,
          aggregate,
          payload: projectItemContentV1(aggregate),
          references: [],
        };
      }
    }
  } catch (error) {
    if (error instanceof StoredEquipmentContentProjectionError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new StoredEquipmentContentProjectionError(detail, { cause: error });
  }
}
