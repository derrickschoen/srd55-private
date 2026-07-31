import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import { sqlInteger } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { rowContractError } from '../domain/contracts/rows';
import { effectPayloadKindError } from '../domain/contracts/row-rules';
import type { EquipmentEffectInput } from '../domain/equipment-effects';
import {
  abilities,
  damageType,
  extraAttackWeaponScopes,
  isEnumValue,
  type Ability,
  type ExtraAttackWeaponScope,
} from '../domain/enums';

export type EffectOwnerColumn =
  | 'character_item_id'
  | 'character_weapon_id';

const PAYLOAD_COLUMNS = [
  'damage_type',
  'hit_points_flat',
  'hit_points_per_level',
  'speed_bonus_feet',
  'ability',
  'amount',
  'maximum',
  'base',
  'ability_1',
  'ability_2',
  'allows_shield',
  'weapon_scope',
] as const;

function effectValues(
  effect: EquipmentEffectInput,
): Record<string, SqlValue> {
  const values: Record<string, SqlValue> = Object.fromEntries(
    PAYLOAD_COLUMNS.map((column) => [column, null]),
  );
  switch (effect.effect_kind) {
    case 'damage_resistance':
      values.damage_type = effect.damage_type;
      return values;
    case 'hp_modifier':
      values.hit_points_flat = effect.hit_points_flat;
      values.hit_points_per_level = effect.hit_points_per_level;
      return values;
    case 'speed':
      values.speed_bonus_feet = effect.speed_bonus_feet;
      return values;
    case 'ability_increase':
      values.ability = effect.ability;
      values.amount = effect.amount;
      values.maximum = effect.maximum;
      return values;
    case 'ability_override':
      values.ability = effect.ability;
      values.maximum = effect.maximum;
      return values;
    case 'armor_class_bonus':
      values.amount = effect.amount;
      return values;
    case 'armor_class_formula':
      values.base = effect.base;
      values.ability_1 = effect.ability_1;
      values.ability_2 = effect.ability_2;
      values.allows_shield = effect.allows_shield ? 1 : 0;
      return values;
    case 'attack_ability_override':
      values.ability = effect.ability;
      values.weapon_scope = effect.weapon_scope;
      return values;
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      values.amount = effect.amount;
      values.weapon_scope = effect.weapon_scope;
      return values;
  }
}

function storedAbility(value: unknown, label: string): Ability {
  if (!isEnumValue(abilities, value)) {
    throw new TypeError(`Unknown stored ${label} "${String(value)}".`);
  }
  return value;
}

function storedScope(value: unknown): ExtraAttackWeaponScope {
  if (!isEnumValue(extraAttackWeaponScopes, value)) {
    throw new TypeError(`Unknown stored weapon scope "${String(value)}".`);
  }
  return value;
}

function common(row: Readonly<Record<string, unknown>>) {
  return {
    label: String(row.label),
    notes: row.notes === null ? null : String(row.notes),
    effect_id: Number(row.id),
    sort_order: Number(row.sort_order),
  };
}

function effectFromRow(
  row: Readonly<Record<string, unknown>>,
): EquipmentEffectInput {
  const shared = common(row);
  switch (row.effect_kind) {
    case 'damage_resistance':
      return {
        ...shared,
        effect_kind: 'damage_resistance',
        damage_type:
          row.damage_type === null ? null : damageType(String(row.damage_type)),
      };
    case 'hp_modifier':
      return {
        ...shared,
        effect_kind: 'hp_modifier',
        hit_points_flat:
          row.hit_points_flat === null ? null : Number(row.hit_points_flat),
        hit_points_per_level:
          row.hit_points_per_level === null
            ? null
            : Number(row.hit_points_per_level),
      };
    case 'speed':
      return {
        ...shared,
        effect_kind: 'speed',
        speed_bonus_feet: Number(row.speed_bonus_feet),
      };
    case 'ability_increase':
      return {
        ...shared,
        effect_kind: 'ability_increase',
        ability: storedAbility(row.ability, 'ability'),
        amount: Number(row.amount),
        maximum: Number(row.maximum),
      };
    case 'ability_override':
      return {
        ...shared,
        effect_kind: 'ability_override',
        ability: storedAbility(row.ability, 'ability'),
        maximum: Number(row.maximum),
      };
    case 'armor_class_bonus':
      return {
        ...shared,
        effect_kind: 'armor_class_bonus',
        amount: Number(row.amount),
      };
    case 'armor_class_formula':
      return {
        ...shared,
        effect_kind: 'armor_class_formula',
        base: Number(row.base),
        ability_1: storedAbility(row.ability_1, 'ability_1'),
        ability_2:
          row.ability_2 === null
            ? null
            : storedAbility(row.ability_2, 'ability_2'),
        allows_shield: Number(row.allows_shield) === 1,
      };
    case 'attack_ability_override':
      return {
        ...shared,
        effect_kind: 'attack_ability_override',
        ability: storedAbility(row.ability, 'ability'),
        weapon_scope: storedScope(row.weapon_scope),
      };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      return {
        ...shared,
        effect_kind: row.effect_kind,
        amount: Number(row.amount),
        weapon_scope: storedScope(row.weapon_scope),
      };
    default:
      throw new TypeError(
        `Unknown stored effect kind "${String(row.effect_kind)}".`,
      );
  }
}

export function readOwnedEffects(
  db: DatabaseContext,
  characterId: number,
  ownerColumn: EffectOwnerColumn,
  ownerId: number,
): EquipmentEffectInput[] {
  return db
    .allRaw(
      `SELECT * FROM character_effects
       WHERE character_id = ? AND ${ownerColumn} = ?
       ORDER BY sort_order, id`,
      [characterId, ownerId],
    )
    .map(effectFromRow);
}

export function readOwnedEffectsByOwner(
  db: DatabaseContext,
  characterId: number,
  ownerColumn: EffectOwnerColumn,
): ReadonlyMap<number, readonly EquipmentEffectInput[]> {
  const grouped = new Map<number, EquipmentEffectInput[]>();
  for (const row of db.allRaw(
    `SELECT * FROM character_effects
     WHERE character_id = ? AND ${ownerColumn} IS NOT NULL
     ORDER BY ${ownerColumn}, sort_order, id`,
    [characterId],
  )) {
    const ownerId = sqlInteger(row, ownerColumn);
    const existing = grouped.get(ownerId);
    if (existing === undefined) {
      grouped.set(ownerId, [effectFromRow(row)]);
    } else {
      existing.push(effectFromRow(row));
    }
  }
  return grouped;
}

export function replaceOwnedEffects(
  db: DatabaseContext,
  characterId: number,
  ownerColumn: EffectOwnerColumn,
  ownerId: number,
  sourceInstanceId: number | null,
  effects: readonly EquipmentEffectInput[],
): void {
  db.exec(
    `DELETE FROM character_effects
     WHERE character_id = ? AND ${ownerColumn} = ?`,
    [characterId, ownerId],
  );
  let nextOrder =
    Number(
      db.scalar<number>(
        `SELECT coalesce(max(sort_order), 0) FROM character_effects
         WHERE character_id = ?`,
        [characterId],
      ),
    ) + 1;
  const timestamp = new Date().toISOString();
  for (const effect of effects) {
    const values = effectValues(effect);
    const sortOrder = effect.sort_order ?? nextOrder++;
    const ownerValues = {
      character_item_id:
        ownerColumn === 'character_item_id' ? ownerId : null,
      character_weapon_id:
        ownerColumn === 'character_weapon_id' ? ownerId : null,
    };
    const row = {
      id: effect.effect_id ?? 1,
      character_id: characterId,
      sort_order: sortOrder,
      effect_kind: effect.effect_kind,
      ...values,
      source_instance_id: sourceInstanceId,
      ...ownerValues,
      template_ref: null,
      label: effect.label.trim(),
      notes: effect.notes?.trim() || null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const shape = rowContractError('character_effects', row, 'Effect');
    if (shape !== null) {
      throw new TypeError(shape);
    }
    const payload = effectPayloadKindError(row, 'Effect');
    if (payload !== null) {
      throw new TypeError(payload);
    }
    const columns = [
      ...(effect.effect_id === undefined ? [] : ['id']),
      'character_id',
      'sort_order',
      'effect_kind',
      ...PAYLOAD_COLUMNS,
      'source_instance_id',
      'character_item_id',
      'character_weapon_id',
      'template_ref',
      'label',
      'notes',
      'created_at',
      'updated_at',
    ];
    const bindings: SqlValue[] = [
      ...(effect.effect_id === undefined ? [] : [effect.effect_id]),
      characterId,
      sortOrder,
      effect.effect_kind,
      ...PAYLOAD_COLUMNS.map((column) => values[column] as SqlValue),
      sourceInstanceId,
      ownerValues.character_item_id,
      ownerValues.character_weapon_id,
      null,
      effect.label.trim(),
      effect.notes?.trim() || null,
      timestamp,
      timestamp,
    ];
    db.exec(
      `INSERT INTO character_effects (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      bindings,
    );
  }
}

/** Append effects owned directly by one character source (LU-1 feat path). */
export function appendSourceEffects(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
  effects: readonly EquipmentEffectInput[],
): void {
  let nextOrder =
    Number(
      db.scalar<number>(
        `SELECT coalesce(max(sort_order), 0) FROM character_effects
         WHERE character_id = ?`,
        [characterId],
      ),
    ) + 1;
  const timestamp = new Date().toISOString();
  for (const effect of effects) {
    const values = effectValues(effect);
    const row = {
      id: effect.effect_id ?? 1,
      character_id: characterId,
      sort_order: effect.sort_order ?? nextOrder++,
      effect_kind: effect.effect_kind,
      ...values,
      source_instance_id: sourceInstanceId,
      character_item_id: null,
      character_weapon_id: null,
      template_ref: null,
      label: effect.label.trim(),
      notes: effect.notes?.trim() || null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const shape = rowContractError('character_effects', row, 'Feat effect');
    if (shape !== null) {
      throw new TypeError(shape);
    }
    const payload = effectPayloadKindError(row, 'Feat effect');
    if (payload !== null) {
      throw new TypeError(payload);
    }
    const columns = [
      ...(effect.effect_id === undefined ? [] : ['id']),
      'character_id',
      'sort_order',
      'effect_kind',
      ...PAYLOAD_COLUMNS,
      'source_instance_id',
      'character_item_id',
      'character_weapon_id',
      'template_ref',
      'label',
      'notes',
      'created_at',
      'updated_at',
    ];
    const bindings: SqlValue[] = [
      ...(effect.effect_id === undefined ? [] : [effect.effect_id]),
      characterId,
      row.sort_order,
      effect.effect_kind,
      ...PAYLOAD_COLUMNS.map((column) => values[column] as SqlValue),
      sourceInstanceId,
      null,
      null,
      null,
      row.label,
      row.notes,
      timestamp,
      timestamp,
    ];
    db.exec(
      `INSERT INTO character_effects (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      bindings,
    );
  }
}
