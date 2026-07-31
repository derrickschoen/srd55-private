import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedFeatContent } from '../../../src/rules/feats-srd';
import { reconcileLegacyLevelFeatChoices } from '../../../src/rules/legacy-level-feat-choices';
import { openTestDatabase } from '../../helpers/open-db';

describe('legacy level feat choice reconciliation', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;
  let classLevelId: number;
  let classSourceId: number;
  let effectIds: readonly [number, number];

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedFeatContent(db);
    characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Legacy ASI Hero')",
    ).lastInsertId;
    const fighterId = Number(
      db.scalar("SELECT id FROM class_definitions WHERE name = 'Fighter'"),
    );
    classLevelId = db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 4, 1)`,
      [characterId, fighterId],
    ).lastInsertId;
    classSourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (?, 'legacy-fighter', 'class', ?, 'Fighter 4', '{}', 1, 'active')`,
      [characterId, fighterId],
    ).lastInsertId;
    const insertEffect = (order: number, ability: string): number =>
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, ability, amount, maximum,
           source_instance_id, label
         ) VALUES (?, ?, 'ability_increase', ?, 1, 20, ?,
                   'Fighter 4 (Ability Score Improvement)')`,
        [characterId, order, ability, classSourceId],
      ).lastInsertId;
    effectIds = [insertEffect(1, 'strength'), insertEffect(2, 'constitution')];
  });

  afterEach(() => connection.close());

  it('moves only the exact old writer group beneath a seeded ASI feat source', () => {
    reconcileLegacyLevelFeatChoices(db);
    reconcileLegacyLevelFeatChoices(db);

    const choice = db.oneRaw(
      `SELECT character_class_level_id, class_level, choice_kind,
              feat_source_instance_id
       FROM character_level_feat_choices WHERE character_id = ?`,
      [characterId],
    );
    expect(choice).toMatchObject({
      character_class_level_id: classLevelId,
      class_level: 4,
      choice_kind: 'asi_level_feat',
    });
    const featSourceId = Number(choice?.feat_source_instance_id);
    expect(
      db.allRaw(
        `SELECT id, source_instance_id FROM character_effects
         WHERE character_id = ? ORDER BY id`,
        [characterId],
      ),
    ).toEqual(effectIds.map((id) => ({ id, source_instance_id: featSourceId })));
    expect(
      db.oneRaw(
        `SELECT definition.content_key, source.source_type
         FROM character_source_instances AS source
         JOIN feat_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.id = ?`,
        [featSourceId],
      ),
    ).toEqual({
      content_key: '2024:feat:ability-score-improvement',
      source_type: 'feat',
    });
    expect(
      db.scalar(
        'SELECT count(*) FROM character_level_feat_choices WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(1);
  });

  const mutations = [
    ['label', "UPDATE character_effects SET label = 'Similar ASI' WHERE id = ?"],
    ['amount', 'UPDATE character_effects SET amount = 2 WHERE id = ?'],
    ['maximum', 'UPDATE character_effects SET maximum = 30 WHERE id = ?'],
    ['ability', "UPDATE character_effects SET ability = 'constitution' WHERE id = ?"],
    ['template reference', "UPDATE character_effects SET template_ref = 'legacy:1' WHERE id = ?"],
    ['notes', "UPDATE character_effects SET notes = 'legacy note' WHERE id = ?"],
  ] as const;

  it.each(mutations)(
    'preserves the effects and creates an unresolved choice when %s differs',
    (_field, sql) => {
      db.exec(sql, [effectIds[0]]);
      const before = db.allRaw(
        'SELECT * FROM character_effects WHERE character_id = ? ORDER BY id',
        [characterId],
      );
      reconcileLegacyLevelFeatChoices(db);
      expect(
        db.scalar(
          'SELECT feat_source_instance_id FROM character_level_feat_choices WHERE character_id = ?',
          [characterId],
        ),
      ).toBeNull();
      expect(
        db.allRaw(
          'SELECT * FROM character_effects WHERE character_id = ? ORDER BY id',
          [characterId],
        ),
      ).toEqual(before);
      expect(
        db.scalar(
          `SELECT count(*) FROM character_source_instances
           WHERE character_id = ? AND source_type = 'feat'`,
          [characterId],
        ),
      ).toBe(0);
    },
  );

  it('preserves a partial group and records the occurrence as unresolved', () => {
    db.exec('DELETE FROM character_effects WHERE id = ?', [effectIds[1]]);
    reconcileLegacyLevelFeatChoices(db);
    expect(
      db.oneRaw(
        `SELECT feat_source_instance_id FROM character_level_feat_choices
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({ feat_source_instance_id: null });
    expect(
      db.oneRaw('SELECT id, source_instance_id FROM character_effects'),
    ).toEqual({ id: effectIds[0], source_instance_id: classSourceId });
  });

  it('does not treat an identical effect owned by a non-class source as proof', () => {
    const featDefinitionId = Number(
      db.scalar(
        `SELECT id FROM feat_definitions
         WHERE content_key = '2024:feat:alert'`,
      ),
    );
    const otherSourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (?, 'lookalike-owner', 'feat', ?, 'Alert', '{}', 4, 'active')`,
      [characterId, featDefinitionId],
    ).lastInsertId;
    db.exec(
      'UPDATE character_effects SET source_instance_id = ? WHERE id = ?',
      [otherSourceId, effectIds[0]],
    );
    const before = db.allRaw(
      'SELECT * FROM character_effects WHERE character_id = ? ORDER BY id',
      [characterId],
    );
    reconcileLegacyLevelFeatChoices(db);
    expect(
      db.scalar(
        'SELECT feat_source_instance_id FROM character_level_feat_choices WHERE character_id = ?',
        [characterId],
      ),
    ).toBeNull();
    expect(
      db.allRaw(
        'SELECT * FROM character_effects WHERE character_id = ? ORDER BY id',
        [characterId],
      ),
    ).toEqual(before);
  });

  it('clears the durable pointer before a chosen feat source is deleted', () => {
    reconcileLegacyLevelFeatChoices(db);
    const featSourceId = Number(
      db.scalar(
        'SELECT feat_source_instance_id FROM character_level_feat_choices WHERE character_id = ?',
        [characterId],
      ),
    );
    db.exec('DELETE FROM character_source_instances WHERE id = ?', [featSourceId]);
    expect(
      db.scalar(
        'SELECT feat_source_instance_id FROM character_level_feat_choices WHERE character_id = ?',
        [characterId],
      ),
    ).toBeNull();
  });
});
