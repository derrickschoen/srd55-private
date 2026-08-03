import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  AuthoringGrant,
  BackgroundContentAggregate,
  ContentFingerprintReference,
  PublishableHomebrew,
  SpeciesContentAggregate,
  SubclassContentAggregate,
} from '../../../src/authoring/contracts';
import {
  projectStoredAuthoredContentV1,
  resolveStoredAuthoredContentV1,
  storedAuthoredRegistryReferencesV1,
  type StoredAuthoredReferenceResolverV1,
} from '../../../src/catalog/stored-authored-content-projector-v1';
import {
  ContentIdentityCollision,
  registerBundledStableContentIdentity,
  registerContentFingerprint,
  registerDerivedContentIdentity,
} from '../../../src/catalog/content-registry';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV1,
  type CanonicalContentIdentityJson,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import {
  authoredGrantSetV1Vectors,
  authoredProjectorV1Vectors,
} from '../../unit/catalog/fixtures/authored-projector-v1-vectors';
import { openTestDatabase } from '../../helpers/open-db';

const SPELL_KEY = 'expanded:ci3a-spell' as ContentKey;
const FEAT_KEY = 'expanded:ci3a-feat' as ContentKey;
const CLASS_KEY = 'expanded:ci3a-class' as ContentKey;
const WEAPON_KEY = 'expanded:ci3a-weapon' as ContentKey;
const ARMOR_KEY = 'expanded:ci3a-armor' as ContentKey;

const dependencyReferences = {
  spell: { kind: 'spell', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '1'.repeat(64) as ContentFingerprintDigest },
  feat: { kind: 'feat', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '2'.repeat(64) as ContentFingerprintDigest },
  class: { kind: 'class', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '3'.repeat(64) as ContentFingerprintDigest },
  weapon: { kind: 'weapon', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '4'.repeat(64) as ContentFingerprintDigest },
  armor: { kind: 'armor', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '5'.repeat(64) as ContentFingerprintDigest },
} as const;

const references: StoredAuthoredReferenceResolverV1 = {
  spell: () => dependencyReferences.spell,
  featByStoredName: () => dependencyReferences.feat,
  class: () => dependencyReferences.class,
  weapon: () => dependencyReferences.weapon,
  armor: () => dependencyReferences.armor,
};

let connection: Database;
let db: DatabaseContext;

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
  seedDependencies();
});

afterEach(() => {
  connection.close();
});

function registerBundled(kind: 'class' | 'weapon' | 'armor', contentKey: ContentKey): void {
  registerBundledStableContentIdentity(db, {
    kind,
    contentKey,
    normalizedName: `ci3a${kind}`,
  });
}

function seedDependencies(): void {
  registerBundled('class', CLASS_KEY);
  registerBundled('weapon', WEAPON_KEY);
  registerBundled('armor', ARMOR_KEY);
  db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, progression_type
     ) VALUES (?, 'CI-3a Class', 'expanded', 'none')`,
    [CLASS_KEY],
  );
  db.exec(
    `INSERT INTO weapon_templates (
       content_key, rules_edition, name, srd_group, damage_kind,
       damage_dice, damage_type, mastery_property
     ) VALUES (?, 'expanded', 'Void Blade', 'simple_melee', 'dice',
               '1d6', 'Piercing', 'Vex')`,
    [WEAPON_KEY],
  );
  db.exec(
    `INSERT INTO armor_templates (
       content_key, rules_edition, name, category, armor_class, dex_bonus
     ) VALUES (?, 'expanded', 'Clockwork Mail', 'light', 10, 'full')`,
    [ARMOR_KEY],
  );
}

function storageGrant(grant: AuthoringGrant): Readonly<Record<string, unknown>> {
  switch (grant.kind) {
    case 'fixed_spell':
      return {
        kind: grant.kind,
        rule_key: grant.rule_key,
        spell_version_key: SPELL_KEY,
        bucket: grant.always_prepared ? 'prepared' : 'known',
        always_prepared: grant.always_prepared,
      };
    case 'choice_from_list':
      return {
        kind: grant.kind,
        rule_key: grant.rule_key,
        list: grant.list,
        count: grant.count,
        bucket: 'prepared',
        level_max: grant.maximum_spell_level,
      };
    case 'choice_from_query':
      return {
        kind: grant.kind,
        rule_key: grant.rule_key,
        schools: grant.schools,
        tags: grant.tags,
        count: grant.count,
        bucket: 'prepared',
        level_min: grant.minimum_spell_level,
        level_max: grant.maximum_spell_level,
      };
    case 'skill_proficiency':
      return {
        kind: grant.kind,
        rule_key: grant.rule_key,
        count: grant.count,
        skills: grant.skills,
      };
  }
}

function registerRoot(
  aggregate: PublishableHomebrew,
  payload: unknown,
  layer: 'bundled' | 'external',
  index: number,
): ContentKey {
  if (layer === 'external') {
    return registerDerivedContentIdentity(db, {
      kind: aggregate.kind,
      edition: aggregate.rules_edition,
      name: aggregate.name,
      payload,
    }).derivedKey;
  }
  const contentKey = `expanded:ci3a-vector-${index}` as ContentKey;
  registerBundledStableContentIdentity(db, {
    kind: aggregate.kind,
    contentKey,
    normalizedName: `ci3avector${index}`,
  });
  return contentKey;
}

function insertEffect(
  table: 'species_template_trait_effects' | 'background_template_effects' | 'subclass_feature_effects',
  parentColumn: 'species_template_trait_id' | 'background_template_id' | 'subclass_feature_id',
  parentId: number,
  effect: SpeciesContentAggregate['traits'][number]['effects'][number]
    | BackgroundContentAggregate['effects'][number]
    | SubclassContentAggregate['features'][number]['effects'][number],
): void {
  const payload: Record<string, string | number | null> = {};
  switch (effect.kind) {
    case 'damage_resistance':
      payload.damage_type = effect.damage_type;
      break;
    case 'hp_modifier':
      payload.hit_points_flat = effect.hit_points_flat;
      payload.hit_points_per_level = effect.hit_points_per_level;
      break;
    case 'speed':
      payload.speed_bonus_feet = effect.speed_bonus_feet;
      break;
    case 'ability_increase':
      payload.ability = effect.ability;
      payload.amount = effect.amount;
      payload.maximum = effect.maximum;
      break;
    case 'ability_override':
      payload.ability = effect.ability;
      payload.maximum = effect.maximum;
      break;
    case 'armor_class_bonus':
      payload.amount = effect.amount;
      break;
    case 'armor_class_formula':
      payload.base = effect.base;
      payload.ability_1 = effect.ability_1;
      payload.ability_2 = effect.ability_2;
      payload.allows_shield = effect.allows_shield ? 1 : 0;
      break;
    case 'attack_ability_override':
      payload.ability = effect.ability;
      payload.weapon_scope = effect.weapon_scope;
      break;
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      payload.amount = effect.amount;
      payload.weapon_scope = effect.weapon_scope;
      break;
    case 'extra_attack':
      payload.attack_count = effect.attack_count;
      payload.weapon_scope = effect.weapon_scope;
      break;
  }
  const columns = [parentColumn, 'sort_order', 'effect_kind', 'label', 'notes', ...Object.keys(payload)];
  db.exec(
    `INSERT INTO ${table} (${columns.join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    [parentId, effect.sort_order, effect.kind, effect.label, effect.notes, ...Object.values(payload)],
  );
}

function seedSpecies(contentKey: ContentKey, aggregate: SpeciesContentAggregate): void {
  db.exec(
    `INSERT INTO species_definitions (
       content_key, name, rules_edition, grant_rules, notes
     ) VALUES (?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, JSON.stringify(aggregate.grants.map(storageGrant)), aggregate.reference_text],
  );
  const templateId = db.exec(
    `INSERT INTO species_templates (
       content_key, name, rules_edition, creature_type, size,
       alternate_size, base_speed_feet
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, aggregate.creature_type, aggregate.primary_size, aggregate.alternate_size, aggregate.walking_speed_feet],
  ).lastInsertId;
  for (const trait of aggregate.traits) {
    const traitId = db.exec(
      `INSERT INTO species_template_traits (
         species_template_id, sort_order, name, description
       ) VALUES (?, ?, ?, ?)`,
      [templateId, trait.sort_order, trait.name, trait.description],
    ).lastInsertId;
    for (const effect of trait.effects) {
      insertEffect('species_template_trait_effects', 'species_template_trait_id', traitId, effect);
    }
  }
}

function seedBackground(contentKey: ContentKey, aggregate: BackgroundContentAggregate): void {
  db.exec(
    `INSERT INTO background_definitions (
       content_key, name, rules_edition, grant_rules, notes
     ) VALUES (?, ?, ?, '[]', ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, aggregate.reference_text],
  );
  const templateId = db.exec(
    `INSERT INTO background_templates (
       content_key, name, rules_edition, ability_score_1, ability_score_2,
       ability_score_3, feat_name, skill_proficiency_1,
       skill_proficiency_2, tool_proficiency, equipment_option_a,
       equipment_option_b
     ) VALUES (?, ?, ?, ?, ?, ?, 'CI-3a Feat', ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, ...aggregate.suggested_abilities, ...aggregate.skill_proficiencies, aggregate.tool_reference_text ?? '', aggregate.equipment_option_a_description, aggregate.equipment_option_b_description],
  ).lastInsertId;
  for (const [option, equipment] of [['a', aggregate.equipment_option_a], ['b', aggregate.equipment_option_b]] as const) {
    for (const item of equipment) {
      db.exec(
        `INSERT INTO background_equipment_items (
           background_template_id, option, sort_order, quantity, item_name,
           item_kind, weapon_template_id, armor_template_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [templateId, option, item.sort_order, item.quantity, item.printed_name, item.kind, item.kind === 'weapon' ? 1 : null, item.kind === 'armor' ? 1 : null],
      );
    }
  }
  for (const effect of aggregate.effects) {
    insertEffect('background_template_effects', 'background_template_id', templateId, effect);
  }
}

function slotJson(counts: readonly number[]): string {
  const entries = counts
    .map((count, index) => [String(index + 1), count] as const)
    .filter((entry) => entry[1] !== 0);
  return JSON.stringify(entries.length === 0 ? [] : Object.fromEntries(entries));
}

function seedSubclass(contentKey: ContentKey, aggregate: SubclassContentAggregate): void {
  const classId = db.scalar<number>('SELECT id FROM class_definitions WHERE content_key = ?', [CLASS_KEY]);
  if (classId === null) throw new Error('CI-3a class dependency is missing.');
  const caster = aggregate.progression.mode === 'override'
    ? aggregate.progression.caster_contribution.split('_')
    : [];
  const subclassId = db.exec(
    `INSERT INTO subclass_definitions (
       content_key, class_definition_id, name, rules_edition,
       spellcasting_ability, caster_fraction, caster_rounding, grant_rules,
       notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, classId, aggregate.name, aggregate.rules_edition, aggregate.progression.mode === 'override' ? aggregate.progression.spellcasting_ability : null, caster[0] === 'full' ? '1' : caster[0] === 'half' ? '1/2' : caster[0] === 'third' ? '1/3' : null, caster[1] ?? null, JSON.stringify(aggregate.grants.map(storageGrant)), aggregate.reference_text],
  ).lastInsertId;
  if (aggregate.progression.mode === 'override') {
    for (const row of aggregate.progression.rows) {
      db.exec(
        `INSERT INTO subclass_progressions (
           subclass_definition_id, class_level, cantrips_known,
           prepared_count, max_spell_level, slots, grant_rules
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [subclassId, row.class_level, row.cantrips_known, row.prepared_or_known_count, row.maximum_spell_level, slotJson(row.slot_counts), JSON.stringify(row.grants.map(storageGrant))],
      );
    }
  }
  for (const feature of aggregate.features) {
    const featureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description
       ) VALUES (?, ?, ?, ?, ?)`,
      [subclassId, feature.class_level, feature.sort_order, feature.name, feature.description],
    ).lastInsertId;
    for (const effect of feature.effects) {
      insertEffect('subclass_feature_effects', 'subclass_feature_id', featureId, effect);
    }
  }
}

function seedVector(
  vector: (typeof authoredProjectorV1Vectors)[number],
  layer: 'bundled' | 'external',
  index: number,
): ContentKey {
  const contentKey = registerRoot(vector.aggregate, vector.payload, layer, index);
  switch (vector.kind) {
    case 'species':
      seedSpecies(contentKey, vector.aggregate);
      break;
    case 'background':
      seedBackground(contentKey, vector.aggregate);
      break;
    case 'subclass':
      seedSubclass(contentKey, vector.aggregate);
      break;
  }
  return contentKey;
}

describe('stored authored content-v1 projection', () => {
  it.each(
    authoredProjectorV1Vectors.flatMap((vector, index) =>
      (['bundled', 'external'] as const).map((layer) => ({ vector, index, layer })),
    ),
  )(
    'reproduces frozen $layer stored vector: $vector.label',
    ({ vector, index, layer }) => {
      const contentKey = seedVector(vector, layer, index);
      const projection = projectStoredAuthoredContentV1(db, {
        kind: vector.kind,
        contentKey,
        references,
      });
      const identity = deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      });

      expect(projection.aggregate).toEqual(vector.aggregate);
      expect(projection.payload).toEqual(vector.payload);
      expect(identity).toMatchObject({
        canonicalJson: vector.canonicalJson,
        digest: vector.sha256,
        derivedKey: vector.derivedKey,
      });
    },
  );

  it.each([
    {
      vector: authoredGrantSetV1Vectors[0]!,
      grants: [{
        kind: 'choice_from_query',
        rule_key: 'set.query',
        schools: ['Evocation', 'Abjuration', 'Evocation'],
        tags: ['ritual', 'arcane', 'ritual'],
        count: 1,
        minimum_spell_level: 0,
        maximum_spell_level: 9,
      }] satisfies readonly AuthoringGrant[],
    },
    {
      vector: authoredGrantSetV1Vectors[1]!,
      grants: [{
        kind: 'skill_proficiency',
        rule_key: 'set.skills',
        count: 2,
        skills: ['stealth', 'arcana', 'stealth'],
      }] satisfies readonly AuthoringGrant[],
    },
  ])(
    'reproduces frozen stored grant-set vector: $vector.label',
    ({ vector, grants }) => {
      const aggregate: SpeciesContentAggregate = {
        kind: 'species',
        name: vector.name,
        rules_edition: 'expanded',
        reference_text: '',
        creature_type: 'Humanoid',
        primary_size: 'Medium',
        alternate_size: null,
        walking_speed_feet: 30,
        traits: [],
        grants,
      };
      const contentKey = registerRoot(aggregate, vector.payloads[1], 'external', 50);
      seedSpecies(contentKey, aggregate);
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'species',
        contentKey,
        references,
      });
      const identity = deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      });

      expect(projection.payload).toEqual(vector.payloads[0]);
      expect(identity).toMatchObject({
        canonicalJson: vector.canonicalJson,
        digest: vector.sha256,
        derivedKey: vector.derivedKey,
      });
    },
  );

  it('embeds a same-scheme dependency fingerprint instead of its stored class key', () => {
    const dependencyDigest = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' as ContentFingerprintDigest;
    registerContentFingerprint(db, {
      kind: 'class',
      contentKey: CLASS_KEY,
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: dependencyDigest,
      canonicalJson: 'abc' as CanonicalContentIdentityJson,
      role: 'current',
    });
    const vector = authoredProjectorV1Vectors[2]!;
    const contentKey = seedVector(vector, 'bundled', 60);
    const projection = projectStoredAuthoredContentV1(db, {
      kind: 'subclass',
      contentKey,
      references: storedAuthoredRegistryReferencesV1(db),
    });

    expect(projection.payload.parent_class).toEqual({
      kind: 'class',
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: dependencyDigest,
    });
    expect(JSON.stringify(projection.payload)).not.toContain(CLASS_KEY);
  });

  it('silently adopts an exact projected stored-row self-match', () => {
    const vector = authoredProjectorV1Vectors[4];
    const contentKey = seedVector(vector, 'external', 40);

    expect(resolveStoredAuthoredContentV1(db, {
      kind: 'subclass',
      contentKey,
      references,
    }).resolution).toEqual({
      kind: 'exact',
      contentKey: vector.derivedKey,
      matchClass: 'trivial-self-match',
      reviewRequired: false,
    });
  });

  it('requires review for projected stored rows with a metadata conflict', () => {
    const vector = authoredProjectorV1Vectors[4];
    const contentKey = seedVector(vector, 'external', 41);

    expect(resolveStoredAuthoredContentV1(db, {
      kind: 'subclass',
      contentKey,
      references,
      metadataConflict: true,
    }).resolution).toEqual({
      kind: 'exact',
      contentKey: vector.derivedKey,
      matchClass: 'metadata-conflict',
      reviewRequired: true,
    });
  });

  it('throws when a projected stored row meets an equal digest with different bytes', () => {
    const vector = authoredProjectorV1Vectors[0];
    const contentKey = seedVector(vector, 'bundled', 42);
    const collisionTarget = 'expanded:ci3a-collision' as ContentKey;
    registerBundledStableContentIdentity(db, {
      kind: 'species',
      contentKey: collisionTarget,
      normalizedName: 'ci3acollision',
    });
    registerContentFingerprint(db, {
      kind: 'species',
      contentKey: collisionTarget,
      scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      digest: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' as ContentFingerprintDigest,
      canonicalJson: 'abc' as CanonicalContentIdentityJson,
      role: 'compatible',
    });

    expect(() => resolveStoredAuthoredContentV1(db, {
      kind: 'species',
      contentKey,
      references,
      compatibleFingerprints: [{
        scheme: CONTENT_FINGERPRINT_SCHEME_V1,
        digest: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' as ContentFingerprintDigest,
        canonicalJson: vector.canonicalJson as CanonicalContentIdentityJson,
      }],
    })).toThrow(ContentIdentityCollision);
  });
});
