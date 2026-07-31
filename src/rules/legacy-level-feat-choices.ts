import type { DatabaseContext } from '../db/database';
import { abilities } from '../domain/enums';
import { asiLevelsForClassName } from './class-level-features-srd';

const ASI_CONTENT_KEY = '2024:feat:ability-score-improvement';

function timestamp(): string {
  return new Date().toISOString();
}

function isExactLegacyAsiGroup(
  rows: readonly Record<string, unknown>[],
): boolean {
  if (rows.length < 1 || rows.length > 2) return false;
  const selected = new Set<string>();
  let total = 0;
  for (const row of rows) {
    const ability = String(row.ability);
    const amount = Number(row.amount);
    if (
      row.effect_kind !== 'ability_increase' ||
      !abilities.includes(ability as (typeof abilities)[number]) ||
      selected.has(ability) ||
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 2 ||
      Number(row.maximum) !== 20 ||
      row.template_ref !== null ||
      row.damage_type !== null ||
      row.hit_points_flat !== null ||
      row.hit_points_per_level !== null ||
      row.speed_bonus_feet !== null ||
      row.base !== null ||
      row.ability_1 !== null ||
      row.ability_2 !== null ||
      row.allows_shield !== null ||
      row.weapon_scope !== null ||
      row.character_item_id !== null ||
      row.character_weapon_id !== null ||
      row.notes !== null
    ) {
      return false;
    }
    selected.add(ability);
    total += amount;
  }
  return total === 2 && (rows.length === 1 || [...rows].every(
    (row) => Number(row.amount) === 1,
  ));
}

/**
 * Gives pre-v25 level-command ASIs durable provenance without treating a
 * lookalike as proof. Every earned ASI occurrence gets a row. Only the old
 * writer's exact label, class owner and complete legal effect group are moved
 * beneath a newly seeded ASI feat source; anything else remains untouched and
 * the null pointer records the outstanding choice.
 */
export function reconcileLegacyLevelFeatChoices(db: DatabaseContext): void {
  const asiDefinition = db.oneRaw(
    `SELECT id, name FROM feat_definitions WHERE content_key = ?`,
    [ASI_CONTENT_KEY],
  );
  if (asiDefinition === null) {
    throw new Error('The bundled Ability Score Improvement feat is missing.');
  }

  db.transaction(() => {
    const heldClasses = db.allRaw(
      `SELECT level.id, level.character_id, level.level, definition.name,
              source.id AS class_source_id
       FROM character_class_levels AS level
       INNER JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       LEFT JOIN character_source_instances AS source
         ON source.character_id = level.character_id
        AND source.source_type = 'class'
        AND source.source_definition_id = level.class_definition_id
        AND source.state = 'active'
       ORDER BY level.character_id, level.id`,
    );

    for (const held of heldClasses) {
      const asiLevels = asiLevelsForClassName(String(held.name));
      if (asiLevels === null) continue;
      for (const classLevel of [...asiLevels].sort((a, b) => a - b)) {
        if (classLevel > Number(held.level)) continue;
        const exists = db.scalar<number>(
          `SELECT 1 FROM character_level_feat_choices
           WHERE character_class_level_id = ?
             AND class_level = ? AND choice_kind = 'asi_level_feat'`,
          [Number(held.id), classLevel],
        );
        if (exists !== null) continue;

        const now = timestamp();
        let featSourceId: number | null = null;
        if (held.class_source_id !== null) {
          const label = `${String(held.name)} ${String(classLevel)} ` +
            '(Ability Score Improvement)';
          const effects = db.allRaw(
            `SELECT * FROM character_effects
             WHERE character_id = ? AND source_instance_id = ? AND label = ?
             ORDER BY sort_order, id`,
            [Number(held.character_id), Number(held.class_source_id), label],
          );
          if (isExactLegacyAsiGroup(effects)) {
            const totalLevel = Number(
              db.scalar(
                `SELECT SUM(level) FROM character_class_levels
                 WHERE character_id = ?`,
                [Number(held.character_id)],
              ) ?? classLevel,
            );
            featSourceId = db.exec(
              `INSERT INTO character_source_instances (
                 character_id, instance_uuid, source_type,
                 source_definition_id, display_name, config,
                 acquired_at_character_level, state, notes,
                 created_at, updated_at
               ) VALUES (?, ?, 'feat', ?, ?, '{}', ?, 'active', NULL, ?, ?)`,
              [
                Number(held.character_id),
                crypto.randomUUID(),
                Number(asiDefinition.id),
                String(asiDefinition.name),
                Math.min(20, Math.max(classLevel, totalLevel)),
                now,
                now,
              ],
            ).lastInsertId;
            db.exec(
              `UPDATE character_effects
               SET source_instance_id = ?
               WHERE character_id = ? AND source_instance_id = ? AND label = ?`,
              [
                featSourceId,
                Number(held.character_id),
                Number(held.class_source_id),
                label,
              ],
            );
          }
        }

        db.exec(
          `INSERT INTO character_level_feat_choices (
             character_id, character_class_level_id, class_level, choice_kind,
             feat_source_instance_id, created_at, updated_at
           ) VALUES (?, ?, ?, 'asi_level_feat', ?, ?, ?)`,
          [
            Number(held.character_id),
            Number(held.id),
            classLevel,
            featSourceId,
            now,
            now,
          ],
        );
      }
    }
  });
}
