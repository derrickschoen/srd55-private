import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { characterEffectKinds } from '../domain/enums';

interface GeneratedEffect {
  readonly id: number;
  readonly label: string;
  readonly effect_kind: string;
  readonly damage_type: string | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
  readonly ability: string | null;
  readonly amount: number | null;
  readonly maximum: number | null;
  readonly base: number | null;
  readonly ability_1: string | null;
  readonly ability_2: string | null;
  readonly allows_shield: number | null;
  readonly weapon_scope: string | null;
}

function generatedEffect(row: SqlRow): GeneratedEffect {
  return {
    id: sqlInteger(row, 'id'),
    label: sqlString(row, 'label'),
    effect_kind: sqlString(row, 'effect_kind'),
    damage_type: sqlNullableString(row, 'damage_type'),
    hit_points_flat: sqlNullableInteger(row, 'hit_points_flat'),
    hit_points_per_level: sqlNullableInteger(row, 'hit_points_per_level'),
    speed_bonus_feet: sqlNullableInteger(row, 'speed_bonus_feet'),
    ability: sqlNullableString(row, 'ability'),
    amount: sqlNullableInteger(row, 'amount'),
    maximum: sqlNullableInteger(row, 'maximum'),
    base: sqlNullableInteger(row, 'base'),
    ability_1: sqlNullableString(row, 'ability_1'),
    ability_2: sqlNullableString(row, 'ability_2'),
    allows_shield: sqlNullableInteger(row, 'allows_shield'),
    weapon_scope: sqlNullableString(row, 'weapon_scope'),
  };
}

const PAYLOAD_SELECT = `
  effect.id AS id, effect.effect_kind AS effect_kind,
  effect.damage_type AS damage_type,
  effect.hit_points_flat AS hit_points_flat,
  effect.hit_points_per_level AS hit_points_per_level,
  effect.speed_bonus_feet AS speed_bonus_feet,
  effect.ability AS ability, effect.amount AS amount,
  effect.maximum AS maximum, effect.base AS base,
  effect.ability_1 AS ability_1, effect.ability_2 AS ability_2,
  effect.allows_shield AS allows_shield,
  effect.weapon_scope AS weapon_scope`;

const kindPlaceholders = characterEffectKinds.map(() => '?').join(', ');

function nextEffectOrder(db: DatabaseContext, characterId: number): number {
  return Number(
    db.scalar(
      `SELECT COALESCE(MAX(sort_order), 0)
       FROM character_effects
       WHERE character_id = ?`,
      [characterId],
    ) ?? 0,
  );
}

function insertGeneratedEffects(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
  templateTable: 'class_feature_effects' | 'subclass_feature_effects',
  effects: readonly GeneratedEffect[],
): void {
  let sortOrder = nextEffectOrder(db, characterId);
  for (const effect of effects) {
    sortOrder += 1;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, damage_type,
         hit_points_flat, hit_points_per_level, speed_bonus_feet,
         ability, amount, maximum, base, ability_1, ability_2,
         allows_shield, weapon_scope, source_instance_id, template_ref, label
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        sortOrder,
        effect.effect_kind,
        effect.damage_type,
        effect.hit_points_flat,
        effect.hit_points_per_level,
        effect.speed_bonus_feet,
        effect.ability,
        effect.amount,
        effect.maximum,
        effect.base,
        effect.ability_1,
        effect.ability_2,
        effect.allows_shield,
        effect.weapon_scope,
        sourceInstanceId,
        `${templateTable}:${String(effect.id)}`,
        effect.label,
      ],
    );
  }
}

/**
 * Replaces only command-generated rows for one active class source. Hand-made
 * rows, including level-up ASIs, have `template_ref IS NULL` and survive.
 */
export function syncAutomaticClassEffects(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
  classDefinitionId: number,
  classLevel: number,
): void {
  db.exec(
    `DELETE FROM character_effects
     WHERE character_id = ? AND source_instance_id = ?
       AND template_ref IS NOT NULL`,
    [characterId, sourceInstanceId],
  );
  const effects = db.all(
    `SELECT ${PAYLOAD_SELECT}, effect.name AS label
     FROM class_feature_effects AS effect
     WHERE effect.class_definition_id = ?
       AND effect.class_level <= ?
       AND effect.effect_kind IN (${kindPlaceholders})
     ORDER BY effect.class_level, effect.name, effect.id`,
    [classDefinitionId, classLevel, ...characterEffectKinds],
    generatedEffect,
  );
  insertGeneratedEffects(
    db,
    characterId,
    sourceInstanceId,
    'class_feature_effects',
    effects,
  );
}

/** Removes generated effects when a subclass source is tombstoned. */
export function clearGeneratedFeatureEffects(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
): void {
  db.exec(
    `DELETE FROM character_effects
     WHERE character_id = ? AND source_instance_id = ?
       AND template_ref IS NOT NULL`,
    [characterId, sourceInstanceId],
  );
}

/** Replaces command-generated rows for the chosen, active subclass only. */
export function syncAutomaticSubclassEffects(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
  subclassDefinitionId: number,
  classLevel: number,
): void {
  clearGeneratedFeatureEffects(db, characterId, sourceInstanceId);
  const effects = db.all(
    `SELECT ${PAYLOAD_SELECT}, feature.name AS label
     FROM subclass_feature_effects AS effect
     JOIN subclass_features AS feature
       ON feature.id = effect.subclass_feature_id
     WHERE feature.subclass_definition_id = ?
       AND feature.class_level <= ?
       AND effect.effect_kind IN (${kindPlaceholders})
     ORDER BY feature.sort_order, effect.sort_order, effect.id`,
    [subclassDefinitionId, classLevel, ...characterEffectKinds],
    generatedEffect,
  );
  insertGeneratedEffects(
    db,
    characterId,
    sourceInstanceId,
    'subclass_feature_effects',
    effects,
  );
}
