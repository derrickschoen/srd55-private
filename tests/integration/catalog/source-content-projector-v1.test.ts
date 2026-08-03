import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import {
  projectStoredClassContentV1,
  projectStoredFeatContentV1,
} from '../../../src/catalog/source-content-projector-v1';
import {
  projectStoredAuthoredContentV1,
  type StoredAuthoredReferenceResolverV1,
} from '../../../src/catalog/stored-authored-content-projector-v1';
import { registerBundledStableContentIdentity } from '../../../src/catalog/content-registry';
import { CONTENT_FINGERPRINT_SCHEME_V1, type ContentFingerprintDigest } from '../../../src/catalog/content-identity';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import {
  classProjectorV1Vector,
  featProjectorV1Vector,
} from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import { openTestDatabase } from '../../helpers/open-db';

const CLASS_KEY = 'expanded:ci3b-class' as ContentKey;
const FEAT_KEY = 'expanded:ci3b-feat' as ContentKey;
const SPECIES_KEY = '2024:ci3b-species' as ContentKey;
const BACKGROUND_KEY = '2024:ci3b-background' as ContentKey;

const references: StoredAuthoredReferenceResolverV1 = {
  spell: () => ({ kind: 'spell', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '1'.repeat(64) as ContentFingerprintDigest }),
  featByStoredName: () => ({ kind: 'feat', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '2'.repeat(64) as ContentFingerprintDigest }),
  class: () => ({ kind: 'class', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '3'.repeat(64) as ContentFingerprintDigest }),
  weapon: () => ({ kind: 'weapon', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '4'.repeat(64) as ContentFingerprintDigest }),
  armor: () => ({ kind: 'armor', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '5'.repeat(64) as ContentFingerprintDigest }),
  sourceDefinition: (kind) => ({ kind, scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '6'.repeat(64) as ContentFingerprintDigest }),
};

let connection: Database;
let db: DatabaseContext;

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
  for (const [kind, key, normalizedName] of [
    ['class', CLASS_KEY, 'wayfarer'],
    ['feat', FEAT_KEY, 'keenmemory'],
    ['species', SPECIES_KEY, 'swiftfolk'],
    ['background', BACKGROUND_KEY, 'observer'],
  ] as const) {
    registerBundledStableContentIdentity(db, {
      kind,
      contentKey: key,
      normalizedName,
    });
  }
});

afterEach(() => connection.close());

function identityForStoredClass() {
  const projection = projectStoredClassContentV1(db, CLASS_KEY, references);
  return deriveContentIdentityV1({
    kind: projection.kind,
    edition: projection.aggregate.rules_edition,
    name: projection.aggregate.name,
    payload: projection.payload,
  });
}

function identityForStoredFeat() {
  const projection = projectStoredFeatContentV1(db, FEAT_KEY, references);
  return deriveContentIdentityV1({
    kind: projection.kind,
    edition: projection.aggregate.rules_edition,
    name: projection.aggregate.name,
    payload: projection.payload,
  });
}

describe('stored class and feat content-v1 projection', () => {
  it('reproduces the hand-pinned class vector from a real stored aggregate', () => {
    db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type,
         supports_ritual_casting
       ) VALUES (?, 'Wayfarer', 'expanded', 'none', 0)`,
      [CLASS_KEY],
    );
    const identity = identityForStoredClass();
    expect(identity.canonicalJson).toBe(classProjectorV1Vector.canonicalJson);
    expect(identity.digest).toBe(classProjectorV1Vector.sha256);
    expect(identity.derivedKey).toBe(classProjectorV1Vector.derivedKey);
  });

  it('reproduces the hand-pinned feat vector from a real stored aggregate', () => {
    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, category, ability_points,
         repeatable, notes
       ) VALUES (?, 'Keen Memory', 'expanded', 'general', 0, 0, ?)`,
      [FEAT_KEY, 'Recall details.  \r\nPrecisely.   \r\n'],
    );
    const identity = identityForStoredFeat();
    expect(identity.canonicalJson).toBe(featProjectorV1Vector.canonicalJson);
    expect(identity.digest).toBe(featProjectorV1Vector.sha256);
    expect(identity.derivedKey).toBe(featProjectorV1Vector.derivedKey);
  });

  it('discriminates every mechanics-bearing class child-table family', () => {
    const weaponA = 'expanded:ci3b-weapon-a' as ContentKey;
    const weaponB = 'expanded:ci3b-weapon-b' as ContentKey;
    const namedFeature = 'expanded:ci3b-named-feature' as ContentKey;
    for (const key of [weaponA, weaponB]) {
      registerBundledStableContentIdentity(db, {
        kind: 'weapon', contentKey: key, normalizedName: key.endsWith('-a') ? 'weapona' : 'weaponb',
      });
      db.exec(
        `INSERT INTO weapon_templates (
           content_key, rules_edition, name, srd_group, damage_kind,
           damage_dice, damage_type, versatile_damage_kind, finesse, heavy,
           light, loading, reach, thrown, two_handed, ammunition, range_kind,
           mastery_property
         ) VALUES (?, 'expanded', ?, 'simple_melee', 'dice', '1d6',
           'Piercing', 'not_applicable', 0, 0, 0, 0, 0, 0, 0, 0, 'none', 'Sap')`,
        [key, key === weaponA ? 'Weapon A' : 'Weapon B'],
      );
    }
    registerBundledStableContentIdentity(db, {
      kind: 'feat', contentKey: namedFeature, normalizedName: 'pactstrike',
    });
    db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type,
         supports_ritual_casting
       ) VALUES (?, 'Wayfarer', 'expanded', 'none', 0)`,
      [CLASS_KEY],
    );
    const classId = db.scalar<number>('SELECT id FROM class_definitions WHERE content_key = ?', [CLASS_KEY]);
    const weaponAId = db.scalar<number>('SELECT id FROM weapon_templates WHERE content_key = ?', [weaponA]);
    const weaponBId = db.scalar<number>('SELECT id FROM weapon_templates WHERE content_key = ?', [weaponB]);
    if (classId === null || weaponAId === null || weaponBId === null) throw new Error('Class fixture ids are missing.');
    db.exec("INSERT INTO class_progressions (class_definition_id, class_level, cantrips_known, prepared_count, grant_rules) VALUES (?, 1, 0, 0, '[]')", [classId]);
    db.exec("INSERT INTO class_sheet_traits (class_definition_id, hit_die, skill_choice_count, skill_choice_from_any, multiclass_skill_choice_count, multiclass_skill_choice_pool) VALUES (?, 8, 2, 0, 0, 'none')", [classId]);
    db.exec("INSERT INTO class_saving_throw_proficiencies (class_definition_id, ability) VALUES (?, 'wisdom')", [classId]);
    db.exec("INSERT INTO class_skill_options (class_definition_id, skill) VALUES (?, 'insight')", [classId]);
    db.exec("INSERT INTO class_armor_training (class_definition_id, category, granted_on_multiclass_entry) VALUES (?, 'light', 0)", [classId]);
    db.exec("INSERT INTO class_weapon_proficiencies (class_definition_id, category, property_qualifier, granted_on_multiclass_entry) VALUES (?, 'simple', NULL, 0)", [classId]);
    db.exec('INSERT INTO class_extra_attack_grants (class_definition_id, class_level, attack_count) VALUES (?, 5, 2)', [classId]);
    db.exec('INSERT INTO class_martial_arts_dice (class_definition_id, class_level, martial_arts_die) VALUES (?, 1, 6)', [classId]);
    db.exec("INSERT INTO class_weapon_mastery_grants (class_definition_id, grant) VALUES (?, 'counts_known')", [classId]);
    db.exec('INSERT INTO class_weapon_mastery_counts (class_definition_id, class_level, mastery_count) VALUES (?, 1, 1)', [classId]);
    db.exec("INSERT INTO class_equipment_items (class_definition_id, option, sort_order, quantity, item_name, item_kind, weapon_template_id) VALUES (?, 'a', 1, 1, 'Weapon A', 'weapon', ?)", [classId, weaponAId]);
    db.exec("INSERT INTO class_resources (class_definition_id, class_level, resource_kind, maximum) VALUES (?, 1, 'rage', 2)", [classId]);
    db.exec("INSERT INTO class_resource_formulas (class_definition_id, resource_kind, formula_kind, minimum_class_level, fixed_count) VALUES (?, 'action_surge', 'fixed_count', 2, 1)", [classId]);
    db.exec("INSERT INTO class_feature_effects (class_definition_id, class_level, name, effect_kind, attack_count, weapon_scope) VALUES (?, 5, 'Extra Attack', 'extra_attack', 2, 'any_weapon')", [classId]);
    const namedId = db.exec(
      "INSERT INTO named_features (content_key, class_definition_id, name, rules_edition, prerequisite, description, class_level) VALUES (?, ?, 'Pact Strike', 'expanded', 'Level 5+', 'Strike twice.', 5)",
      [namedFeature, classId],
    ).lastInsertId;
    db.exec("INSERT INTO named_feature_effects (named_feature_id, sort_order, effect_kind, attack_count, weapon_scope) VALUES (?, 1, 'extra_attack', 2, 'one_bonded_weapon')", [namedId]);

    const classReferences: StoredAuthoredReferenceResolverV1 = {
      ...references,
      weapon: (key) => ({
        kind: 'weapon',
        scheme: CONTENT_FINGERPRINT_SCHEME_V1,
        digest: (key === weaponA ? '4' : '9').repeat(64) as ContentFingerprintDigest,
      }),
    };
    const project = () => {
      const projection = projectStoredClassContentV1(db, CLASS_KEY, classReferences);
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      }).derivedKey;
    };
    let previous = project();
    const mutations: readonly [string, readonly (string | number)[]][] = [
      ["UPDATE class_definitions SET notes = 'Changed' WHERE id = ?", [classId]],
      ['UPDATE class_progressions SET prepared_count = 1 WHERE class_definition_id = ?', [classId]],
      ['UPDATE class_sheet_traits SET hit_die = 10 WHERE class_definition_id = ?', [classId]],
      ["UPDATE class_saving_throw_proficiencies SET ability = 'charisma' WHERE class_definition_id = ?", [classId]],
      ["UPDATE class_skill_options SET skill = 'arcana' WHERE class_definition_id = ?", [classId]],
      ['UPDATE class_armor_training SET granted_on_multiclass_entry = 1 WHERE class_definition_id = ?', [classId]],
      ["UPDATE class_weapon_proficiencies SET property_qualifier = 'Light' WHERE class_definition_id = ?", [classId]],
      ['UPDATE class_extra_attack_grants SET attack_count = 3 WHERE class_definition_id = ?', [classId]],
      ['UPDATE class_martial_arts_dice SET martial_arts_die = 8 WHERE class_definition_id = ?', [classId]],
      ["UPDATE class_weapon_mastery_grants SET grant = 'counts_unsourced' WHERE class_definition_id = ?", [classId]],
      ['UPDATE class_weapon_mastery_counts SET mastery_count = 2 WHERE class_definition_id = ?', [classId]],
      ['UPDATE class_equipment_items SET weapon_template_id = ? WHERE class_definition_id = ?', [weaponBId, classId]],
      ['UPDATE class_resources SET maximum = 3 WHERE class_definition_id = ?', [classId]],
      ['UPDATE class_resource_formulas SET fixed_count = 2 WHERE class_definition_id = ?', [classId]],
      ['UPDATE class_feature_effects SET attack_count = 3 WHERE class_definition_id = ?', [classId]],
      ["UPDATE named_features SET description = 'Strike three times.' WHERE id = ?", [namedId]],
      ['UPDATE named_feature_effects SET attack_count = 3 WHERE named_feature_id = ?', [namedId]],
    ];
    for (const [sql, bind] of mutations) {
      db.exec(sql, bind);
      const changed = project();
      expect(changed).not.toBe(previous);
      previous = changed;
    }
  });

  it('refuses a stored class effect with an inert payload instead of hashing it', () => {
    db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type,
         supports_ritual_casting
       ) VALUES (?, 'Wayfarer', 'expanded', 'none', 0)`,
      [CLASS_KEY],
    );
    const classId = db.scalar<number>(
      'SELECT id FROM class_definitions WHERE content_key = ?',
      [CLASS_KEY],
    );
    if (classId === null) throw new Error('Class fixture id is missing.');
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `INSERT INTO class_feature_effects (
         class_definition_id, class_level, name, effect_kind,
         speed_bonus_feet, attack_count
       ) VALUES (?, 1, 'Corrupt Speed', 'speed', 10, 2)`,
      [classId],
    );
    db.exec('PRAGMA ignore_check_constraints = OFF');
    expect(() => identityForStoredClass()).toThrow(/inert attack_count payload/);
  });

  it('changes one species identity key when either half changes', () => {
    db.exec(
      `INSERT INTO species_definitions
         (content_key, name, rules_edition, repeatable, grant_rules)
       VALUES (?, 'Swiftfolk', '2024', 0, '[]')`,
      [SPECIES_KEY],
    );
    db.exec(
      `INSERT INTO species_templates
         (content_key, rules_edition, name, creature_type, size, base_speed_feet)
       VALUES (?, '2024', 'Swiftfolk', 'Humanoid', 'Medium', 30)`,
      [SPECIES_KEY],
    );
    const project = () => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'species', contentKey: SPECIES_KEY, references,
      });
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      }).derivedKey;
    };
    const baseline = project();
    db.exec('UPDATE species_templates SET base_speed_feet = 35 WHERE content_key = ?', [SPECIES_KEY]);
    const templateChanged = project();
    db.exec('UPDATE species_definitions SET repeatable = 1 WHERE content_key = ?', [SPECIES_KEY]);
    expect(templateChanged).not.toBe(baseline);
    expect(project()).not.toBe(templateChanged);
  });

  it('changes one background identity key when either half changes', () => {
    db.exec(
      `INSERT INTO background_definitions
         (content_key, name, rules_edition, repeatable, grant_rules)
       VALUES (?, 'Observer', '2024', 0, '[]')`,
      [BACKGROUND_KEY],
    );
    db.exec(
      `INSERT INTO background_templates (
         content_key, rules_edition, name, ability_score_1, ability_score_2,
         ability_score_3, feat_name, skill_proficiency_1,
         skill_proficiency_2, tool_proficiency, equipment_option_a,
         equipment_option_b
       ) VALUES (
         ?, '2024', 'Observer', 'Wisdom', 'Intelligence', 'Charisma',
         'Alert', 'Insight', 'Perception', 'Calligrapher tools', 'Book', '10 GP'
       )`,
      [BACKGROUND_KEY],
    );
    const project = () => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'background', contentKey: BACKGROUND_KEY, references,
      });
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      }).derivedKey;
    };
    const baseline = project();
    db.exec("UPDATE background_templates SET ability_score_1 = 'Strength' WHERE content_key = ?", [BACKGROUND_KEY]);
    const templateChanged = project();
    db.exec('UPDATE background_definitions SET repeatable = 1 WHERE content_key = ?', [BACKGROUND_KEY]);
    expect(templateChanged).not.toBe(baseline);
    expect(project()).not.toBe(templateChanged);
  });
});
