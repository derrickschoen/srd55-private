/**
 * THE ONE MECHANICAL-EFFECT READER, INCLUDING THE ATTUNEMENT GATE (D72, D73).
 *
 * An item-owned effect is inactive only in the one state the rule names:
 * its item requires attunement and is not attuned. Effects with no owning item
 * are untouched, including effects owned by a source or a weapon.
 *
 * The predicate is deliberately written as an OR whose first arm accepts a
 * NULL `character_item_id`. A compact
 * `NOT (item.requires_attunement AND NOT item.attuned)` is wrong in SQLite:
 * both joined item columns are NULL for an effect with no item, NOT(NULL)
 * remains NULL, and a WHERE clause drops it under three-valued logic.
 *
 * Every mechanical reader goes through `readEligibleCharacterEffects`:
 * abilities, Armor Class, Hit Points, Speed, and damage resistance. Transport
 * readers do not; backup/share/snapshot must preserve an inactive row rather
 * than erase it from the character.
 */
import {
  sqlBoolean,
  sqlInteger,
  sqlNullableDamageType,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  abilities,
  characterEffectKinds,
  domainSourceTypes,
  isEnumValue,
  type Ability,
  type CharacterEffectKind,
  type DamageType,
  type DomainSourceType,
} from '../domain/enums';

export type EligibleCharacterEffectOrder = 'acquisition' | 'display';

export interface EligibleCharacterEffect {
  readonly id: number;
  readonly sort_order: number;
  readonly effect_kind: CharacterEffectKind;
  readonly damage_type: DamageType | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
  readonly ability: Ability | null;
  readonly amount: number | null;
  readonly maximum: number | null;
  readonly base: number | null;
  readonly ability_1: Ability | null;
  readonly ability_2: Ability | null;
  readonly allows_shield: boolean | null;
  readonly source_instance_id: number | null;
  readonly source_type: DomainSourceType | null;
  readonly character_item_id: number | null;
  readonly character_weapon_id: number | null;
  readonly label: string;
}

const ELIGIBLE_EFFECT_SQL = `
  FROM character_effects AS effect
  LEFT JOIN character_items AS item
    ON item.id = effect.character_item_id
   AND item.character_id = effect.character_id
  LEFT JOIN character_source_instances AS source
    ON source.id = effect.source_instance_id
   AND source.character_id = effect.character_id
  WHERE effect.character_id = ?
    AND (
      effect.character_item_id IS NULL
      OR item.requires_attunement = 0
      OR item.attuned = 1
    )`;

/**
 * Reads every mechanically active effect.
 *
 * Acquisition order is load-bearing for capped ability increases; display
 * order is load-bearing for the character-facing resistance list. Callers must
 * choose rather than inheriting whichever order this module happened to use.
 */
export function readEligibleCharacterEffects(
  db: DatabaseContext,
  characterId: number,
  order: EligibleCharacterEffectOrder,
): EligibleCharacterEffect[] {
  const orderBy =
    order === 'acquisition'
      ? 'effect.id'
      : 'effect.sort_order, effect.id';
  return db.all(
    `SELECT effect.id, effect.sort_order, effect.effect_kind,
            effect.damage_type, effect.hit_points_flat,
            effect.hit_points_per_level, effect.speed_bonus_feet,
            effect.ability, effect.amount, effect.maximum, effect.base,
            effect.ability_1, effect.ability_2, effect.allows_shield,
            effect.source_instance_id, source.source_type,
            effect.character_item_id, effect.character_weapon_id, effect.label
     ${ELIGIBLE_EFFECT_SQL}
     ORDER BY ${orderBy}`,
    [characterId],
    (row): EligibleCharacterEffect => ({
      id: sqlInteger(row, 'id'),
      sort_order: sqlInteger(row, 'sort_order'),
      effect_kind: requiredCharacterEffectKind(row),
      damage_type: sqlNullableDamageType(row, 'damage_type'),
      hit_points_flat: sqlNullableInteger(row, 'hit_points_flat'),
      hit_points_per_level: sqlNullableInteger(row, 'hit_points_per_level'),
      speed_bonus_feet: sqlNullableInteger(row, 'speed_bonus_feet'),
      ability: nullableAbility(row, 'ability'),
      amount: sqlNullableInteger(row, 'amount'),
      maximum: sqlNullableInteger(row, 'maximum'),
      base: sqlNullableInteger(row, 'base'),
      ability_1: nullableAbility(row, 'ability_1'),
      ability_2: nullableAbility(row, 'ability_2'),
      allows_shield:
        row['allows_shield'] === null
          ? null
          : sqlBoolean(row, 'allows_shield'),
      source_instance_id: sqlNullableInteger(row, 'source_instance_id'),
      source_type: nullableSourceType(row),
      character_item_id: sqlNullableInteger(row, 'character_item_id'),
      character_weapon_id: sqlNullableInteger(row, 'character_weapon_id'),
      label: sqlString(row, 'label'),
    }),
  );
}

function requiredCharacterEffectKind(
  row: SqlRow,
): CharacterEffectKind {
  const kind = sqlString(row, 'effect_kind');
  if (!isEnumValue(characterEffectKinds, kind)) {
    throw new Error(`Unknown character effect kind '${kind}'.`);
  }
  return kind;
}

function nullableAbility(
  row: SqlRow,
  column: string,
): Ability | null {
  const ability = sqlNullableString(row, column);
  if (ability === null) {
    return null;
  }
  if (!isEnumValue(abilities, ability)) {
    throw new Error(`Unknown ability '${ability}' in ${column}.`);
  }
  return ability;
}

function nullableSourceType(
  row: SqlRow,
): DomainSourceType | null {
  const sourceType = sqlNullableString(row, 'source_type');
  if (sourceType === null) {
    return null;
  }
  if (!isEnumValue(domainSourceTypes, sourceType)) {
    throw new Error(`Unknown effect source type '${sourceType}'.`);
  }
  return sourceType;
}
