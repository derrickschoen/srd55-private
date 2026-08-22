import type { Database, SqlValue } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  ensureBundledSubclassContent,
  ensureBundledSrdSubclassContent,
  hasBundledSubclassContent,
  type BundledSubclassSeed,
} from '../../../src/rules/srd-subclass-content';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { openTestDatabase } from '../../helpers/open-db';

const SYNTHETIC_CONTENT_KEY = '2024:subclass:mutation-sentinel';

const SYNTHETIC_SEED: BundledSubclassSeed = {
  class_name: 'Sorcerer',
  subclass_name: 'Mutation Sentinel',
  content_key: SYNTHETIC_CONTENT_KEY,
  spellcasting_ability: 'charisma',
  features: [
    {
      class_level: 3,
      sort_position: 0,
      name: 'Mutation Sentinel',
      effects: [
        {
          kind: 'hp_modifier',
          label: 'Draconic Resilience',
          hit_points_flat: 0,
          hit_points_per_level: 1,
        },
        {
          kind: 'armor_class_formula',
          label: 'Draconic Resilience',
          base: 10,
          ability_1: 'dexterity',
          ability_2: 'charisma',
          allows_shield: false,
        },
      ],
    },
    {
      class_level: 6,
      sort_position: 1,
      name: 'Mutation Control',
      effects: [],
    },
  ],
  grant_rules: null,
};

const SINGLE_FEATURE_SEED: BundledSubclassSeed = {
  ...SYNTHETIC_SEED,
  features: [SYNTHETIC_SEED.features[0]!],
};

const DEFINITION_PERTURBATIONS = [
  ['class_definition_id', 'another valid class'],
  ['name', 'another subclass name'],
  ['rules_edition', 'another supported rules edition'],
  ['spellcasting_ability', 'another ability'],
  ['caster_fraction', 'a realistic caster fraction'],
  ['caster_rounding', 'a realistic rounding mode'],
  ['notes', 'stored notes'],
  ['grant_rules', 'a valid but unexpected rule array'],
] as const;

const FEATURE_PERTURBATIONS = [
  ['class_level', 4],
  ['sort_order', 2],
  ['name', 'Mutation Sentinel Revised'],
  ['description', 'A stored feature description.'],
] as const satisfies readonly (readonly [string, SqlValue])[];

const COMMON_EFFECT_PERTURBATIONS = [
  ['effect_kind', 'armor_class_formula'],
  ['damage_type', 'Fire'],
  ['speed_bonus_feet', 10],
  ['ability', 'wisdom'],
  ['amount', 1],
  ['maximum', 20],
  ['weapon_scope', 'any_weapon'],
  ['attack_count', 2],
  ['label', 'Draconic Resilience Revised'],
  ['notes', 'A stored effect note.'],
] as const satisfies readonly (readonly [string, SqlValue])[];

const HIT_POINT_EFFECT_PERTURBATIONS = [
  ['hit_points_flat', 1],
  ['hit_points_per_level', 2],
  ['base', 10],
  ['ability_1', 'dexterity'],
  ['ability_2', 'charisma'],
  ['allows_shield', 0],
] as const satisfies readonly (readonly [string, SqlValue])[];

const ARMOR_CLASS_EFFECT_PERTURBATIONS = [
  ['hit_points_flat', 1],
  ['hit_points_per_level', 1],
  ['base', 11],
  ['ability_1', 'wisdom'],
  ['ability_2', 'wisdom'],
  ['allows_shield', 1],
] as const satisfies readonly (readonly [string, SqlValue])[];

const connections: Database[] = [];

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
});

async function databaseWithSyntheticSubclass(): Promise<{
  db: DatabaseContext;
  subclassId: number;
  effectFeatureId: number;
}> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  seedClassProgressions(db);
  expect(ensureBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(true);
  expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(true);
  expect(ensureBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
  const subclassId = Number(db.scalar(
    'SELECT id FROM subclass_definitions WHERE content_key = ?',
    [SYNTHETIC_CONTENT_KEY],
  ));
  const effectFeatureId = Number(db.scalar(
    `SELECT id FROM subclass_features
      WHERE subclass_definition_id = ? AND sort_order = 1`,
    [subclassId],
  ));
  return { db, subclassId, effectFeatureId };
}

function updateIgnoringChecks(
  db: DatabaseContext,
  sql: string,
  bindings: readonly SqlValue[],
): void {
  db.exec('PRAGMA ignore_check_constraints = ON');
  try {
    db.exec(sql, bindings);
  } finally {
    db.exec('PRAGMA ignore_check_constraints = OFF');
  }
}

describe('bundled subclass exact-row mutation guards', () => {
  it.each(DEFINITION_PERTURBATIONS)(
    'rejects a definition differing only in %s (%s)',
    async (field) => {
      const { db, subclassId } = await databaseWithSyntheticSubclass();
      let wrongValue: SqlValue;
      switch (field) {
        case 'class_definition_id':
          wrongValue = db.scalar<number>(
            "SELECT id FROM class_definitions WHERE content_key = '2024:class:fighter'",
          );
          break;
        case 'name':
          wrongValue = 'Mutation Sentinel Revised';
          break;
        case 'rules_edition':
          wrongValue = '2014';
          break;
        case 'spellcasting_ability':
          wrongValue = 'wisdom';
          break;
        case 'caster_fraction':
          wrongValue = '1/2';
          break;
        case 'caster_rounding':
          wrongValue = 'down';
          break;
        case 'notes':
          wrongValue = 'A stored subclass note.';
          break;
        case 'grant_rules':
          wrongValue = '[]';
          break;
      }
      db.exec(`UPDATE subclass_definitions SET ${field} = ? WHERE id = ?`, [
        wrongValue,
        subclassId,
      ]);

      expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
    },
  );

  it.each(FEATURE_PERTURBATIONS)(
    'rejects a feature differing only in %s',
    async (field, wrongValue) => {
      const { db, subclassId, effectFeatureId } =
        await databaseWithSyntheticSubclass();
      const expectedSeed = field === 'sort_order'
        ? SINGLE_FEATURE_SEED
        : SYNTHETIC_SEED;
      if (field === 'sort_order') {
        db.exec(
          `DELETE FROM subclass_features
            WHERE subclass_definition_id = ? AND sort_order = 2`,
          [subclassId],
        );
        expect(hasBundledSubclassContent(db, [expectedSeed])).toBe(true);
      }
      db.exec(`UPDATE subclass_features SET ${field} = ? WHERE id = ?`, [
        wrongValue,
        effectFeatureId,
      ]);

      expect(hasBundledSubclassContent(db, [expectedSeed])).toBe(false);
    },
  );

  it.each(COMMON_EFFECT_PERTURBATIONS)(
    'rejects an effect differing only in common field %s',
    async (field, wrongValue) => {
      const { db, effectFeatureId } = await databaseWithSyntheticSubclass();
      updateIgnoringChecks(
        db,
        `UPDATE subclass_feature_effects SET ${field} = ?
          WHERE subclass_feature_id = ? AND sort_order = 1`,
        [wrongValue, effectFeatureId],
      );

      expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
    },
  );

  it.each(HIT_POINT_EFFECT_PERTURBATIONS)(
    'rejects an hp_modifier differing only in %s',
    async (field, wrongValue) => {
      const { db, effectFeatureId } = await databaseWithSyntheticSubclass();
      updateIgnoringChecks(
        db,
        `UPDATE subclass_feature_effects SET ${field} = ?
          WHERE subclass_feature_id = ? AND sort_order = 1`,
        [wrongValue, effectFeatureId],
      );

      expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
    },
  );

  it.each(ARMOR_CLASS_EFFECT_PERTURBATIONS)(
    'rejects an armor_class_formula differing only in %s',
    async (field, wrongValue) => {
      const { db, effectFeatureId } = await databaseWithSyntheticSubclass();
      updateIgnoringChecks(
        db,
        `UPDATE subclass_feature_effects SET ${field} = ?
          WHERE subclass_feature_id = ? AND sort_order = 2`,
        [wrongValue, effectFeatureId],
      );

      expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
    },
  );

  it('rejects a missing feature even when every stored feature is exact', async () => {
    const { db, subclassId } = await databaseWithSyntheticSubclass();
    db.exec(
      `DELETE FROM subclass_features
        WHERE subclass_definition_id = ? AND sort_order = 2`,
      [subclassId],
    );

    expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
  });

  it('requires every feature to match, not merely one feature', async () => {
    const { db, subclassId } = await databaseWithSyntheticSubclass();
    db.exec(
      `UPDATE subclass_features SET name = 'Mutation Control Revised'
        WHERE subclass_definition_id = ? AND sort_order = 2`,
      [subclassId],
    );

    expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
  });

  it('rejects a missing effect even when every stored effect is exact', async () => {
    const { db, effectFeatureId } = await databaseWithSyntheticSubclass();
    db.exec(
      `DELETE FROM subclass_feature_effects
        WHERE subclass_feature_id = ? AND sort_order = 2`,
      [effectFeatureId],
    );

    expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);
  });

  it('rejects a subclass progression and removes it during exact repair', async () => {
    const { db, subclassId } = await databaseWithSyntheticSubclass();
    db.exec(
      `INSERT INTO subclass_progressions (subclass_definition_id, class_level)
       VALUES (?, 3)`,
      [subclassId],
    );
    expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(false);

    expect(ensureBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(true);
    expect(db.scalar(
      'SELECT count(*) FROM subclass_progressions WHERE subclass_definition_id = ?',
      [subclassId],
    )).toBe(0);
    expect(hasBundledSubclassContent(db, [SYNTHETIC_SEED])).toBe(true);
  });

  it('persists both supported SRD grant-rule outcomes', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    seedClassProgressions(db);

    expect(ensureBundledSrdSubclassContent(db)).toBe(true);
    expect(db.allRaw(
      `SELECT content_key FROM subclass_definitions
        WHERE content_key IN (
          '2024:subclass:life-domain',
          '2024:subclass:champion'
        ) AND grant_rules IS NOT NULL
        ORDER BY content_key`,
    )).toEqual([
      { content_key: '2024:subclass:champion' },
      { content_key: '2024:subclass:life-domain' },
    ]);
  });
});
