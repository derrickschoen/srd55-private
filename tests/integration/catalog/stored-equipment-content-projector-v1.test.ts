import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  projectStoredEquipmentContentV1,
  StoredEquipmentContentProjectionError,
  type EquipmentContentAggregate,
} from '../../../src/catalog/equipment-content-projector-v1';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { equipmentProjectorV1Vectors } from '../../unit/catalog/fixtures/equipment-projector-v1-vectors';
import { openTestDatabase } from '../../helpers/open-db';

describe('stored equipment content-v1 projection', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => connection.close());

  function seed(aggregate: EquipmentContentAggregate, ordinal: number): ContentKey {
    const contentKey = `expanded:ci3c:${String(ordinal)}` as ContentKey;
    if (aggregate.kind === 'weapon') {
      db.exec(
        `INSERT INTO weapon_templates (
           content_key, rules_edition, name, srd_group,
           damage_kind, damage_dice, damage_flat, damage_custom, damage_type,
           versatile_damage_kind, versatile_damage_dice,
           versatile_damage_flat, versatile_damage_custom,
           finesse, heavy, light, loading, reach, thrown, two_handed,
           ammunition, ammunition_kind, range_kind, range_near_feet,
           range_far_feet, mastery_property, other_properties
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                   ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contentKey, aggregate.rules_edition, aggregate.name,
          aggregate.srd_group, aggregate.damage.kind,
          aggregate.damage.kind === 'dice' ? aggregate.damage.dice : null,
          aggregate.damage.kind === 'flat' ? aggregate.damage.amount : null,
          aggregate.damage.kind === 'custom' ? aggregate.damage.text : null,
          aggregate.damage_type, aggregate.versatile_damage.kind,
          aggregate.versatile_damage.kind === 'dice'
            ? aggregate.versatile_damage.dice
            : null,
          aggregate.versatile_damage.kind === 'flat'
            ? aggregate.versatile_damage.amount
            : null,
          aggregate.versatile_damage.kind === 'custom'
            ? aggregate.versatile_damage.text
            : null,
          aggregate.finesse, aggregate.heavy, aggregate.light,
          aggregate.loading, aggregate.reach, aggregate.thrown,
          aggregate.two_handed, aggregate.ammunition,
          aggregate.ammunition_kind, aggregate.range.kind,
          aggregate.range.kind === 'none' ? null : aggregate.range.near_feet,
          aggregate.range.kind === 'none' ? null : aggregate.range.far_feet,
          aggregate.mastery_property, aggregate.other_properties,
        ],
      );
    } else if (aggregate.kind === 'armor') {
      db.exec(
        `INSERT INTO armor_templates (
           content_key, rules_edition, name, category, armor_class,
           dex_bonus, dex_bonus_max, strength_requirement,
           stealth_disadvantage
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contentKey, aggregate.rules_edition, aggregate.name,
          aggregate.category, aggregate.armor_class, aggregate.dex_bonus,
          aggregate.dex_bonus_max, aggregate.strength_requirement,
          aggregate.stealth_disadvantage,
        ],
      );
    } else {
      const definitionId = db.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          contentKey, aggregate.rules_edition, aggregate.name,
          aggregate.description, aggregate.requires_attunement,
        ],
      ).lastInsertId;
      for (const effect of aggregate.effects) {
        if (effect.kind !== 'ability_override') {
          throw new Error('The hand-pinned item fixture changed effect kind.');
        }
        db.exec(
          `INSERT INTO item_definition_effects (
             item_definition_id, sort_order, effect_kind, ability, maximum,
             label, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            definitionId, effect.sort_order, effect.kind, effect.ability,
            effect.maximum, effect.label, effect.notes,
          ],
        );
      }
    }
    return contentKey;
  }

  it.each(equipmentProjectorV1Vectors)(
    'reproduces the hand-pinned $kind vector byte-for-byte',
    (vector) => {
      const ordinal = vector.kind === 'weapon' ? 1 : vector.kind === 'armor' ? 2 : 3;
      const contentKey = seed(vector.aggregate, ordinal);
      const projection = vector.kind === 'weapon'
        ? projectStoredEquipmentContentV1(db, { kind: 'weapon', contentKey })
        : vector.kind === 'armor'
          ? projectStoredEquipmentContentV1(db, { kind: 'armor', contentKey })
          : projectStoredEquipmentContentV1(db, { kind: 'item', contentKey });
      const identity = deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      });

      expect(projection.payload).toEqual(vector.payload);
      expect(identity.canonicalJson).toBe(vector.canonicalJson);
      expect(identity.digest).toBe(vector.sha256);
      expect(identity.derivedKey).toBe(vector.derivedKey);
    },
  );

  it('stored item attunement and D83 effect changes each discriminate identity', () => {
    const vector = equipmentProjectorV1Vectors[2];
    const contentKey = seed(vector.aggregate, 10);
    const baseline = projectStoredEquipmentContentV1(db, {
      kind: 'item', contentKey,
    });
    const baselineIdentity = deriveContentIdentityV1({
      kind: baseline.kind,
      edition: baseline.aggregate.rules_edition,
      name: baseline.aggregate.name,
      payload: baseline.payload,
    });

    db.exec(
      'UPDATE item_definitions SET requires_attunement = 0 WHERE content_key = ?',
      [contentKey],
    );
    db.exec(
      'UPDATE item_definition_effects SET maximum = 25 WHERE item_definition_id = (SELECT id FROM item_definitions WHERE content_key = ?)',
      [contentKey],
    );
    const changed = projectStoredEquipmentContentV1(db, {
      kind: 'item', contentKey,
    });
    const changedIdentity = deriveContentIdentityV1({
      kind: changed.kind,
      edition: changed.aggregate.rules_edition,
      name: changed.aggregate.name,
      payload: changed.payload,
    });

    expect(changedIdentity.derivedKey).not.toBe(baselineIdentity.derivedKey);
  });

  it('malformed stored effect refuses typed projection instead of partial identity', () => {
    const vector = equipmentProjectorV1Vectors[2];
    const contentKey = seed(vector.aggregate, 11);
    connection.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `UPDATE item_definition_effects
       SET effect_kind = 'ability_override', maximum = NULL
       WHERE item_definition_id = (
         SELECT id FROM item_definitions WHERE content_key = ?
       )`,
      [contentKey],
    );

    const project = () => projectStoredEquipmentContentV1(db, {
      kind: 'item', contentKey,
    });
    expect(project).toThrow(StoredEquipmentContentProjectionError);
    expect(project).toThrow(/item maximum is required/u);
  });
});
