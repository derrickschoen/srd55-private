import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { decodeClassResourceFormula } from '../../../src/domain/class-resources';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  hasBundledClassResourceContent,
  seedClassResources,
} from '../../../src/rules/class-resources-srd';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

describe('class resource catalog seed', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedClassResources(db);
  });

  afterEach(() => connection.close());

  function formulas() {
    return db.allRaw(
      `SELECT definition.content_key, formula.resource_kind,
              formula.formula_kind, formula.minimum_class_level,
              formula.fixed_count, formula.ability, formula.multiplier,
              formula.later_fixed_count_steps
         FROM class_resource_formulas AS formula
         JOIN class_definitions AS definition
           ON definition.id = formula.class_definition_id
        ORDER BY definition.content_key, formula.resource_kind`,
    ).map((row) => ({
      content_key: row.content_key,
      resource_kind: row.resource_kind,
      formula: decodeClassResourceFormula({
        formula_kind: row.formula_kind,
        minimum_class_level: row.minimum_class_level,
        fixed_count: row.fixed_count,
        ability: row.ability,
        multiplier: row.multiplier,
        later_fixed_count_steps: row.later_fixed_count_steps,
      }),
    }));
  }

  it('seeds all 160 exact ladder tuples and all 18 exact formula tuples', () => {
    expect(db.scalar('SELECT count(*) FROM class_resources')).toBe(160);
    expect(db.scalar('SELECT count(*) FROM class_resource_formulas')).toBe(18);
    expect(
      db.allRaw(
        `SELECT definition.content_key, resource.resource_kind,
                group_concat(resource.maximum, '') AS vector
           FROM (
             SELECT class_definition_id, resource_kind, maximum
               FROM class_resources
              ORDER BY class_definition_id, resource_kind, class_level
           ) AS resource
           JOIN class_definitions AS definition
             ON definition.id = resource.class_definition_id
          GROUP BY definition.content_key, resource.resource_kind
          ORDER BY definition.content_key, resource.resource_kind`,
      ),
    ).toEqual([
      { content_key: '2024:class:barbarian', resource_kind: 'rage', vector: '22333444444555556666' },
      { content_key: '2024:class:cleric', resource_kind: 'channel_divinity', vector: '02222333333333333444' },
      { content_key: '2024:class:druid', resource_kind: 'wild_shape', vector: '02222333333333334444' },
      { content_key: '2024:class:fighter', resource_kind: 'second_wind', vector: '22233333344444444444' },
      { content_key: '2024:class:monk', resource_kind: 'focus_points', vector: '0234567891011121314151617181920' },
      { content_key: '2024:class:paladin', resource_kind: 'channel_divinity', vector: '00222222223333333333' },
      { content_key: '2024:class:ranger', resource_kind: 'favored_enemy', vector: '22223333444455556666' },
      { content_key: '2024:class:sorcerer', resource_kind: 'sorcery_points', vector: '0234567891011121314151617181920' },
    ]);
    expect(formulas()).toEqual([
      { content_key: '2024:class:barbarian', resource_kind: 'persistent_rage_recovery', formula: { kind: 'fixed_count', minimum_class_level: 15, count: 1 } },
      { content_key: '2024:class:bard', resource_kind: 'bardic_inspiration', formula: { kind: 'ability_modifier_minimum_one', minimum_class_level: 1, ability: 'charisma' } },
      { content_key: '2024:class:cleric', resource_kind: 'divine_intervention', formula: { kind: 'fixed_count', minimum_class_level: 10, count: 1 } },
      { content_key: '2024:class:druid', resource_kind: 'nature_magician_conversion', formula: { kind: 'fixed_count', minimum_class_level: 20, count: 1 } },
      { content_key: '2024:class:druid', resource_kind: 'wild_resurgence_conversion', formula: { kind: 'fixed_count', minimum_class_level: 5, count: 1 } },
      { content_key: '2024:class:fighter', resource_kind: 'action_surge', formula: { kind: 'fixed_count_by_class_level', steps: [{ minimum_class_level: 2, count: 1 }, { minimum_class_level: 17, count: 2 }] } },
      { content_key: '2024:class:fighter', resource_kind: 'indomitable', formula: { kind: 'fixed_count_by_class_level', steps: [{ minimum_class_level: 9, count: 1 }, { minimum_class_level: 13, count: 2 }, { minimum_class_level: 17, count: 3 }] } },
      { content_key: '2024:class:monk', resource_kind: 'uncanny_metabolism', formula: { kind: 'fixed_count', minimum_class_level: 2, count: 1 } },
      { content_key: '2024:class:paladin', resource_kind: 'faithful_steed', formula: { kind: 'fixed_count', minimum_class_level: 5, count: 1 } },
      { content_key: '2024:class:paladin', resource_kind: 'lay_on_hands', formula: { kind: 'class_level_multiple', minimum_class_level: 1, multiplier: 5 } },
      { content_key: '2024:class:paladin', resource_kind: 'paladins_smite', formula: { kind: 'fixed_count', minimum_class_level: 2, count: 1 } },
      { content_key: '2024:class:ranger', resource_kind: 'natures_veil', formula: { kind: 'ability_modifier_minimum_one', minimum_class_level: 14, ability: 'wisdom' } },
      { content_key: '2024:class:ranger', resource_kind: 'tireless', formula: { kind: 'ability_modifier_minimum_one', minimum_class_level: 10, ability: 'wisdom' } },
      { content_key: '2024:class:rogue', resource_kind: 'stroke_of_luck', formula: { kind: 'fixed_count', minimum_class_level: 20, count: 1 } },
      { content_key: '2024:class:sorcerer', resource_kind: 'innate_sorcery', formula: { kind: 'fixed_count', minimum_class_level: 1, count: 2 } },
      { content_key: '2024:class:sorcerer', resource_kind: 'sorcerous_restoration', formula: { kind: 'fixed_count', minimum_class_level: 5, count: 1 } },
      { content_key: '2024:class:warlock', resource_kind: 'contact_patron', formula: { kind: 'fixed_count', minimum_class_level: 9, count: 1 } },
      { content_key: '2024:class:warlock', resource_kind: 'magical_cunning', formula: { kind: 'fixed_count', minimum_class_level: 2, count: 1 } },
    ]);
  });

  it('is idempotent, preserves stable ids, and repairs wrong values', () => {
    const resourceIds = db.allRaw('SELECT id FROM class_resources ORDER BY id');
    const formulaIds = db.allRaw('SELECT id FROM class_resource_formulas ORDER BY id');
    expect(hasBundledClassResourceContent(db)).toBe(true);
    seedClassResources(db);
    expect(db.allRaw('SELECT id FROM class_resources ORDER BY id')).toEqual(resourceIds);
    expect(db.allRaw('SELECT id FROM class_resource_formulas ORDER BY id')).toEqual(formulaIds);

    db.exec(
      `UPDATE class_resources SET maximum = 99
        WHERE class_level = 12 AND resource_kind = 'rage'`,
    );
    db.exec(
      `UPDATE class_resource_formulas SET ability = 'wisdom'
        WHERE resource_kind = 'bardic_inspiration'`,
    );
    expect(hasBundledClassResourceContent(db)).toBe(false);
    seedClassResources(db);
    expect(
      db.scalar(`SELECT maximum FROM class_resources WHERE class_level = 12 AND resource_kind = 'rage'`),
    ).toBe(5);
    expect(
      db.scalar(`SELECT ability FROM class_resource_formulas WHERE resource_kind = 'bardic_inspiration'`),
    ).toBe('charisma');
  });

  it('leaves resource rows attached to imported classes untouched', () => {
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'expanded:oracle', name: 'Oracle',
      keyKind: 'asserted',
    });
    const importedId = db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('expanded:oracle', 'Oracle', 'expanded')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_resources (
         class_definition_id, class_level, resource_kind, maximum
       ) VALUES (?, 1, 'rage', 9)`,
      [importedId],
    );
    seedClassResources(db);
    expect(
      db.oneRaw(
        `SELECT class_level, resource_kind, maximum FROM class_resources
          WHERE class_definition_id = ?`,
        [importedId],
      ),
    ).toEqual({ class_level: 1, resource_kind: 'rage', maximum: 9 });
  });
});
