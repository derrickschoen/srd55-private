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
  StoredAuthoredContentProjectionError,
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
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

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
  subclass: { kind: 'subclass', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '6'.repeat(64) as ContentFingerprintDigest },
  species: { kind: 'species', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '7'.repeat(64) as ContentFingerprintDigest },
  background: { kind: 'background', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest: '8'.repeat(64) as ContentFingerprintDigest },
} as const;

const references: StoredAuthoredReferenceResolverV1 = {
  spell: () => dependencyReferences.spell,
  feat: () => dependencyReferences.feat,
  class: () => dependencyReferences.class,
  weapon: () => dependencyReferences.weapon,
  armor: () => dependencyReferences.armor,
  sourceDefinition: (kind) => {
    switch (kind) {
      case 'class': return dependencyReferences.class;
      case 'subclass': return dependencyReferences.subclass;
      case 'feat': return dependencyReferences.feat;
      case 'species': return dependencyReferences.species;
      case 'background': return dependencyReferences.background;
    }
  },
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

function registerBundled(
  kind: 'class' | 'feat' | 'weapon' | 'armor',
  contentKey: ContentKey,
): void {
  registerBundledStableContentIdentity(db, {
    kind,
    contentKey,
    normalizedName: `ci3a${kind}`,
  });
}

function seedDependencies(): void {
  registerBundled('class', CLASS_KEY);
  registerBundled('feat', FEAT_KEY);
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
  const stored = Object.fromEntries(
    Object.entries(grant).filter(
      ([field]) => field !== 'spell' && field !== 'source_definition',
    ),
  );
  return grant.kind === 'fixed_spell'
    ? { ...stored, spell_version_key: SPELL_KEY }
    : stored;
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
       content_key, name, rules_edition, repeatable, grant_rules, notes
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, aggregate.repeatable ? 1 : 0, JSON.stringify(aggregate.grants.map(storageGrant)), aggregate.reference_text],
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
  if (db.scalar<string>(
    'SELECT content_key FROM catalog_content_identities WHERE content_key = ?',
    [aggregate.default_origin_feat_content_key],
  ) === null) {
    registerBundledStableContentIdentity(db, {
      kind: 'feat',
      contentKey: aggregate.default_origin_feat_content_key,
      normalizedName: 'ci3a-background-feat',
    });
  }
  db.exec(
    `INSERT OR IGNORE INTO feat_definitions (
       content_key, name, rules_edition, category, ability_points, repeatable
     ) VALUES (?, 'CI-3a Feat', 'expanded', 'origin', 0, 0)`,
    [aggregate.default_origin_feat_content_key],
  );
  db.exec(
    `INSERT INTO background_definitions (
       content_key, name, rules_edition, repeatable, grant_rules, notes
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, aggregate.repeatable ? 1 : 0, JSON.stringify(aggregate.grants.map(storageGrant)), aggregate.reference_text],
  );
  const templateId = db.exec(
    `INSERT INTO background_templates (
       content_key, name, rules_edition, ability_score_1, ability_score_2,
       ability_score_3, feat_name, default_origin_feat_content_key,
       skill_proficiency_1,
       skill_proficiency_2, tool_proficiency, equipment_option_a,
       equipment_option_b
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, aggregate.name, aggregate.rules_edition, ...aggregate.suggested_abilities, aggregate.default_origin_feat_display_name, aggregate.default_origin_feat_content_key, ...aggregate.skill_proficiencies, aggregate.tool_reference_text ?? '', aggregate.equipment_option_a_description, aggregate.equipment_option_b_description],
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
  let spellcastingAbility: string | null = null;
  let casterFraction: string | null = null;
  let casterRounding: string | null = null;
  if (aggregate.progression.mode === 'root_only') {
    spellcastingAbility = aggregate.progression.spellcasting_ability;
    casterFraction = aggregate.progression.caster_fraction;
    casterRounding = aggregate.progression.caster_rounding;
  } else if (aggregate.progression.mode === 'override') {
    spellcastingAbility = aggregate.progression.spellcasting_ability;
    const caster = aggregate.progression.caster_contribution.split('_');
    casterFraction = caster[0] === 'full'
      ? '1'
      : caster[0] === 'half'
        ? '1/2'
        : '1/3';
    casterRounding = caster[1] ?? null;
  }
  const subclassId = db.exec(
    `INSERT INTO subclass_definitions (
       content_key, class_definition_id, name, rules_edition,
       spellcasting_ability, caster_fraction, caster_rounding, grant_rules,
       notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [contentKey, classId, aggregate.name, aggregate.rules_edition, spellcastingAbility, casterFraction, casterRounding, JSON.stringify(aggregate.grants.map(storageGrant)), aggregate.reference_text],
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

  it('default-includes future species root and trait columns in identity', () => {
    const vector = authoredProjectorV1Vectors.find(
      (candidate) => candidate.kind === 'species' && candidate.aggregate.traits.length > 0,
    );
    if (vector?.kind !== 'species') throw new Error('Species probe vector is missing.');
    const contentKey = seedVector(vector, 'bundled', 70);
    db.exec('ALTER TABLE species_definitions ADD COLUMN future_root_semantic INTEGER');
    db.exec('ALTER TABLE species_templates ADD COLUMN future_template_semantic INTEGER');
    db.exec('ALTER TABLE species_template_traits ADD COLUMN future_child_semantic INTEGER');
    db.exec('UPDATE species_definitions SET future_root_semantic = 1 WHERE content_key = ?', [contentKey]);
    db.exec('UPDATE species_templates SET future_template_semantic = 1 WHERE content_key = ?', [contentKey]);
    db.exec(
      `UPDATE species_template_traits SET future_child_semantic = 1
       WHERE species_template_id = (
         SELECT id FROM species_templates WHERE content_key = ?
       )`,
      [contentKey],
    );
    const identity = () => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'species', contentKey, references,
      });
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      }).derivedKey;
    };
    const baseline = identity();
    db.exec('UPDATE species_definitions SET future_root_semantic = 2 WHERE content_key = ?', [contentKey]);
    const rootChanged = identity();
    db.exec('UPDATE species_templates SET future_template_semantic = 2 WHERE content_key = ?', [contentKey]);
    const templateChanged = identity();
    db.exec(
      `UPDATE species_template_traits SET future_child_semantic = 2
       WHERE species_template_id = (
         SELECT id FROM species_templates WHERE content_key = ?
       )`,
      [contentKey],
    );

    expect(rootChanged).not.toBe(baseline);
    expect(templateChanged).not.toBe(rootChanged);
    expect(identity()).not.toBe(templateChanged);
  });

  it('default-includes future background root and equipment columns in identity', () => {
    const vector = authoredProjectorV1Vectors.find(
      (candidate) =>
        candidate.kind === 'background' &&
        candidate.aggregate.equipment_option_a.length > 0,
    );
    if (vector?.kind !== 'background') throw new Error('Background probe vector is missing.');
    const contentKey = seedVector(vector, 'bundled', 71);
    db.exec('ALTER TABLE background_definitions ADD COLUMN future_root_semantic INTEGER');
    db.exec('ALTER TABLE background_templates ADD COLUMN future_template_semantic INTEGER');
    db.exec('ALTER TABLE background_equipment_items ADD COLUMN future_child_semantic INTEGER');
    db.exec('UPDATE background_definitions SET future_root_semantic = 1 WHERE content_key = ?', [contentKey]);
    db.exec('UPDATE background_templates SET future_template_semantic = 1 WHERE content_key = ?', [contentKey]);
    db.exec(
      `UPDATE background_equipment_items SET future_child_semantic = 1
       WHERE background_template_id = (
         SELECT id FROM background_templates WHERE content_key = ?
       )`,
      [contentKey],
    );
    const identity = () => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'background', contentKey, references,
      });
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      }).derivedKey;
    };
    const baseline = identity();
    db.exec('UPDATE background_definitions SET future_root_semantic = 2 WHERE content_key = ?', [contentKey]);
    const rootChanged = identity();
    db.exec('UPDATE background_templates SET future_template_semantic = 2 WHERE content_key = ?', [contentKey]);
    const templateChanged = identity();
    db.exec(
      `UPDATE background_equipment_items SET future_child_semantic = 2
       WHERE background_template_id = (
         SELECT id FROM background_templates WHERE content_key = ?
       )`,
      [contentKey],
    );

    expect(rootChanged).not.toBe(baseline);
    expect(templateChanged).not.toBe(rootChanged);
    expect(identity()).not.toBe(templateChanged);
  });

  it.each([
    {
      vector: authoredGrantSetV1Vectors[0]!,
      grants: [{
        kind: 'choice_from_query',
        rule_key: 'set.query',
        bucket: 'prepared',
        schools: ['Evocation', 'Abjuration', 'Evocation'],
        tags: ['ritual', 'arcane', 'ritual'],
        count: 1,
        level_min: 0,
        level_max: 9,
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
        repeatable: false,
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

  it.each([
    { field: 'bucket', replacement: { bucket: 'known' } },
    { field: 'always_prepared', replacement: { always_prepared: false } },
    { field: 'with_slots', replacement: { with_slots: false } },
    {
      field: 'free_cast',
      replacement: {
        free_cast: {
          uses: 1,
          recovery: 'long_rest',
          pool_scope: 'per_spell',
        },
      },
    },
    { field: 'active_from_class_level', replacement: { active_from_class_level: 3 } },
    {
      field: 'active_if_config',
      replacement: { active_if_config: { key: 'lineage', equals: 'Void' } },
    },
    { field: 'distinct_config_by', replacement: { distinct_config_by: 'chosen_list' } },
    { field: 'counts_against_limit', replacement: { counts_against_limit: false } },
    { field: 'label', replacement: { label: 'Void Spark' } },
  ])('fixed-spell stored $field semantics discriminate identity', ({ replacement }) => {
    const vector = authoredProjectorV1Vectors[0]!;
    const contentKey = seedVector(vector, 'bundled', 61);
    const baseRule = {
      kind: 'fixed_spell',
      rule_key: 'void.spark',
      spell_version_key: SPELL_KEY,
      bucket: 'prepared',
      always_prepared: true,
      with_slots: true,
      free_cast: null,
      active_from_class_level: null,
      active_if_config: null,
      distinct_config_by: null,
      counts_against_limit: true,
      label: null,
    } as const;
    const projectIdentity = () => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'species',
        contentKey,
        references,
      });
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      });
    };
    db.exec(
      `UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?`,
      [JSON.stringify([baseRule]), contentKey],
    );
    const baseline = projectIdentity();
    db.exec(
      `UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?`,
      [JSON.stringify([{ ...baseRule, ...replacement }]), contentKey],
    );

    expect(projectIdentity().derivedKey).not.toBe(baseline.derivedKey);
  });

  it.each([
    {
      kind: 'choice_from_list',
      field: 'required',
      baseline: {
        kind: 'choice_from_list', rule_key: 'generic.list', count: 1,
        bucket: 'prepared', list: 'Wizard', required: true,
      },
      replacement: { required: false },
    },
    {
      kind: 'choice_from_query',
      field: 'active_if_config',
      baseline: {
        kind: 'choice_from_query', rule_key: 'generic.query', count: 1,
        bucket: 'prepared', schools: ['Evocation'],
        active_if_config: { key: 'path', equals: 'first' },
      },
      replacement: { active_if_config: { key: 'path', equals: 'second' } },
    },
    {
      kind: 'skill_proficiency',
      field: 'allows_tool_instead',
      baseline: {
        kind: 'skill_proficiency', rule_key: 'generic.skill', count: 1,
        skills: ['arcana'], allows_tool_instead: false,
      },
      replacement: { allows_tool_instead: true },
    },
    {
      kind: 'fixed_spell',
      field: 'level_min',
      baseline: {
        kind: 'fixed_spell', rule_key: 'generic.fixed', count: 1,
        bucket: 'prepared', spell_version_key: SPELL_KEY, level_min: 0,
      },
      replacement: { level_min: 1 },
    },
    {
      kind: 'fixed_spell',
      field: 'schools',
      baseline: {
        kind: 'fixed_spell', rule_key: 'generic.fixed', count: 1,
        bucket: 'prepared', spell_version_key: SPELL_KEY,
        schools: ['Evocation'],
      },
      replacement: { schools: ['Abjuration'] },
    },
    {
      kind: 'fixed_spell',
      field: 'future semantic extension',
      baseline: {
        kind: 'fixed_spell', rule_key: 'generic.fixed', count: 1,
        bucket: 'prepared', spell_version_key: SPELL_KEY,
        future_semantic_extension: 'first',
      },
      replacement: { future_semantic_extension: 'second' },
    },
  ])(
    '$kind stored semantic field $field discriminates identity through generic grant canonicalization',
    ({ baseline, replacement }) => {
      const vector = authoredProjectorV1Vectors[0]!;
      const contentKey = seedVector(vector, 'bundled', 64);
      const projectIdentity = () => {
        const projection = projectStoredAuthoredContentV1(db, {
          kind: 'species', contentKey, references,
        });
        return deriveContentIdentityV1({
          kind: projection.kind,
          edition: projection.aggregate.rules_edition,
          name: projection.aggregate.name,
          payload: projection.payload,
        });
      };
      db.exec(
        'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
        [JSON.stringify([baseline]), contentKey],
      );
      const first = projectIdentity();
      db.exec(
        'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
        [JSON.stringify([{ ...baseline, ...replacement }]), contentKey],
      );

      expect(projectIdentity().derivedKey).not.toBe(first.derivedKey);
    },
  );

  it('source_definition_id becomes a portable fingerprint and discriminates identity', () => {
    const vector = authoredProjectorV1Vectors[0]!;
    const contentKey = seedVector(vector, 'bundled', 65);
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey: 'expanded:ci3a-source-feat',
      name: 'Source Feat', keyKind: 'bundled-stable',
    });
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey: 'expanded:ci3a-other-source-feat',
      name: 'Other Source Feat', keyKind: 'bundled-stable',
    });
    const featId = db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, grant_rules
       ) VALUES ('expanded:ci3a-source-feat', 'Source Feat', 'expanded', '[]')`,
    ).lastInsertId;
    const otherFeatId = db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, grant_rules
       ) VALUES ('expanded:ci3a-other-source-feat', 'Other Source Feat', 'expanded', '[]')`,
    ).lastInsertId;
    const sourceReferences: StoredAuthoredReferenceResolverV1 = {
      ...references,
      sourceDefinition: (kind, key) => {
        if (kind !== 'feat') {
          throw new Error('This fixture resolves only feat source definitions.');
        }
        return {
          kind,
          scheme: CONTENT_FINGERPRINT_SCHEME_V1,
          digest: (key === 'expanded:ci3a-source-feat' ? '2' : '9')
            .repeat(64) as ContentFingerprintDigest,
        };
      },
    };
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([{
        kind: 'grant_source', rule_key: 'source.by-id', source_type: 'feat',
        source_definition_id: featId,
      }]), contentKey],
    );

    const projection = projectStoredAuthoredContentV1(db, {
      kind: 'species', contentKey, references: sourceReferences,
    });
    expect(projection.payload).toHaveProperty('grants');
    if (!('grants' in projection.payload)) {
      throw new Error('The paired species fixture projected as template-only.');
    }
    expect(projection.payload.grants.values[0]).toMatchObject({
      source_definition: dependencyReferences.feat,
    });
    expect(JSON.stringify(projection.payload.grants.values[0]))
      .not.toContain(`\"source_definition_id\":${featId}`);
    const first = deriveContentIdentityV1({
      kind: projection.kind,
      edition: projection.aggregate.rules_edition,
      name: projection.aggregate.name,
      payload: projection.payload,
    });
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([{
        kind: 'grant_source', rule_key: 'source.by-id', source_type: 'feat',
        source_definition_id: otherFeatId,
      }]), contentKey],
    );
    const secondProjection = projectStoredAuthoredContentV1(db, {
      kind: 'species', contentKey, references: sourceReferences,
    });
    const second = deriveContentIdentityV1({
      kind: secondProjection.kind,
      edition: secondProjection.aggregate.rules_edition,
      name: secondProjection.aggregate.name,
      payload: secondProjection.payload,
    });

    expect(second.derivedKey).not.toBe(first.derivedKey);
  });

  it('unresolvable source_definition_id refuses stored projection', () => {
    const vector = authoredProjectorV1Vectors[0]!;
    const contentKey = seedVector(vector, 'bundled', 66);
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([{
        kind: 'grant_source', rule_key: 'source.missing', source_type: 'feat',
        source_definition_id: 999_999,
      }]), contentKey],
    );

    const project = () => projectStoredAuthoredContentV1(db, {
      kind: 'species', contentKey, references,
    });
    expect(project).toThrow(StoredAuthoredContentProjectionError);
    expect(project).toThrow(/source_definition_id 999999 does not resolve/u);
  });

  it('a supplied unresolved fixed-spell ID refuses instead of falling back to its key', () => {
    const vector = authoredProjectorV1Vectors[0]!;
    const contentKey = seedVector(vector, 'bundled', 67);
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([{
        kind: 'fixed_spell', rule_key: 'spell.missing-id', bucket: 'prepared',
        spell_version_id: 999_999, spell_version_key: SPELL_KEY,
      }]), contentKey],
    );

    const project = () => projectStoredAuthoredContentV1(db, {
      kind: 'species', contentKey, references,
    });
    expect(project).toThrow(StoredAuthoredContentProjectionError);
    expect(project).toThrow(/spell_version_id 999999 does not resolve/u);
  });

  it('selection_collection null is excluded because runtime always emits null', () => {
    const vector = authoredProjectorV1Vectors[0]!;
    const contentKey = seedVector(vector, 'bundled', 69);
    const rule = {
      kind: 'fixed_spell', rule_key: 'selection.inert', bucket: 'prepared',
      spell_version_key: SPELL_KEY,
    } as const;
    const identity = () => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'species', contentKey, references,
      });
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      });
    };
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([rule]), contentKey],
    );
    const absent = identity();
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([{ ...rule, selection_collection: null }]), contentKey],
    );

    expect(identity().derivedKey).toBe(absent.derivedKey);
  });

  it.each(['species', 'background'] as const)(
    '$kind repeatable discriminates stored identity',
    (kind) => {
      const vector = kind === 'species'
        ? authoredProjectorV1Vectors[0]!
        : authoredProjectorV1Vectors[1]!;
      const contentKey = seedVector(vector, 'bundled', 68);
      const table = kind === 'species'
        ? 'species_definitions'
        : 'background_definitions';
      const projectIdentity = () => {
        const projection = projectStoredAuthoredContentV1(db, {
          kind, contentKey, references,
        });
        return deriveContentIdentityV1({
          kind: projection.kind,
          edition: projection.aggregate.rules_edition,
          name: projection.aggregate.name,
          payload: projection.payload,
        });
      };
      db.exec(`UPDATE ${table} SET repeatable = 0 WHERE content_key = ?`, [contentKey]);
      const notRepeatable = projectIdentity();
      db.exec(`UPDATE ${table} SET repeatable = 1 WHERE content_key = ?`, [contentKey]);

      expect(projectIdentity().derivedKey).not.toBe(notRepeatable.derivedKey);
    },
  );

  it('background Origin-feat grant rules participate in identity and malformed rules refuse projection', () => {
    const vector = authoredProjectorV1Vectors[1]!;
    const contentKey = seedVector(vector, 'bundled', 62);
    const projectIdentity = () => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'background',
        contentKey,
        references,
      });
      return deriveContentIdentityV1({
        kind: projection.kind,
        edition: projection.aggregate.rules_edition,
        name: projection.aggregate.name,
        payload: projection.payload,
      });
    };
    db.exec(
      `UPDATE background_definitions SET grant_rules = '[]' WHERE content_key = ?`,
      [contentKey],
    );
    const withoutRule = projectIdentity();
    db.exec(
      `UPDATE background_definitions SET grant_rules = ? WHERE content_key = ?`,
      [JSON.stringify([{
        kind: 'grant_source',
        rule_key: 'void-scholar-origin-feat',
        source_type: 'feat',
        definition_key_config: 'origin_feat_key',
        child_config_config: 'origin_feat_config',
      }]), contentKey],
    );

    expect(projectIdentity().derivedKey).not.toBe(withoutRule.derivedKey);

    db.exec(
      `UPDATE background_definitions SET grant_rules = ? WHERE content_key = ?`,
      [JSON.stringify([{
        kind: 'grant_source',
        rule_key: 'broken-origin-feat',
        source_type: 'feat',
      }]), contentKey],
    );
    expect(projectIdentity).toThrow(StoredAuthoredContentProjectionError);
    expect(projectIdentity).toThrow(/requires a source definition reference/u);
  });

  it('root notes null and empty canonicalize identically for stored rows', () => {
    const vector = authoredProjectorV1Vectors[3]!;
    const contentKey = seedVector(vector, 'bundled', 63);
    db.exec(
      `UPDATE subclass_definitions SET notes = NULL WHERE content_key = ?`,
      [contentKey],
    );
    const nullProjection = projectStoredAuthoredContentV1(db, {
      kind: 'subclass',
      contentKey,
      references,
    });
    db.exec(
      `UPDATE subclass_definitions SET notes = '' WHERE content_key = ?`,
      [contentKey],
    );
    const emptyProjection = projectStoredAuthoredContentV1(db, {
      kind: 'subclass',
      contentKey,
      references,
    });

    expect(emptyProjection.payload.reference_text).toBe('');
    expect(emptyProjection.payload).toEqual(nullProjection.payload);
  });

  it('zero-row subclass root spellcasting columns project as a distinct runtime state', () => {
    const vector = authoredProjectorV1Vectors[2]!;
    const contentKey = seedVector(vector, 'bundled', 70);
    const baselineProjection = projectStoredAuthoredContentV1(db, {
      kind: 'subclass', contentKey, references,
    });
    const baseline = deriveContentIdentityV1({
      kind: baselineProjection.kind,
      edition: baselineProjection.aggregate.rules_edition,
      name: baselineProjection.aggregate.name,
      payload: baselineProjection.payload,
    });
    db.exec(
      `UPDATE subclass_definitions
       SET spellcasting_ability = 'intelligence',
           caster_fraction = '1/3', caster_rounding = 'down'
       WHERE content_key = ?`,
      [contentKey],
    );

    const projection = projectStoredAuthoredContentV1(db, {
      kind: 'subclass', contentKey, references,
    });
    const changed = deriveContentIdentityV1({
      kind: projection.kind,
      edition: projection.aggregate.rules_edition,
      name: projection.aggregate.name,
      payload: projection.payload,
    });
    expect(projection.payload.progression).toEqual({
      mode: 'root_only',
      spellcasting_ability: 'intelligence',
      caster_fraction: '1/3',
      caster_rounding: 'down',
    });
    expect(changed.derivedKey).not.toBe(baseline.derivedKey);
  });

  it('definition_key_config false refuses before source targeting can diverge', () => {
    const vector = authoredProjectorV1Vectors[0]!;
    const contentKey = seedVector(vector, 'bundled', 71);
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey: 'expanded:ci3a-config-type-feat',
      name: 'Config Type Feat', keyKind: 'bundled-stable',
    });
    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, grant_rules
       ) VALUES ('expanded:ci3a-config-type-feat', 'Config Type Feat', 'expanded', '[]')`,
    );
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([{
        kind: 'grant_source', rule_key: 'source.bad-config-selector',
        source_type: 'feat',
        source_definition_key: 'expanded:ci3a-config-type-feat',
        definition_key_config: false,
      }]), contentKey],
    );

    const project = () => projectStoredAuthoredContentV1(db, {
      kind: 'species', contentKey, references,
    });
    expect(project).toThrow(StoredAuthoredContentProjectionError);
    expect(project).toThrow(/definition_key_config.*string or null/u);
  });

  it.each([
    {
      field: 'spell_version_key',
      dependency: null,
      rule: {
        kind: 'fixed_spell', rule_key: 'locator.padded-spell',
        bucket: 'prepared', spell_version_key: ` ${SPELL_KEY}`,
      },
    },
    {
      field: 'source_definition_key',
      dependency: {
        key: 'expanded:ci3a-padded-source-feat',
        name: 'Padded Source Feat',
      },
      rule: {
        kind: 'grant_source', rule_key: 'locator.padded-source',
        source_type: 'feat',
        source_definition_key: ' expanded:ci3a-padded-source-feat',
      },
    },
  ])('$field locator differing from its trim refuses stored projection', ({ dependency, rule }) => {
    const vector = authoredProjectorV1Vectors[0]!;
    const contentKey = seedVector(vector, 'bundled', 72);
    if (dependency !== null) {
      registerFixtureContentIdentity(db, {
        kind: 'feat', contentKey: dependency.key, name: dependency.name,
        keyKind: 'bundled-stable',
      });
      db.exec(
        `INSERT INTO feat_definitions (
           content_key, name, rules_edition, grant_rules
         ) VALUES (?, ?, 'expanded', '[]')`,
        [dependency.key, dependency.name],
      );
    }
    db.exec(
      'UPDATE species_definitions SET grant_rules = ? WHERE content_key = ?',
      [JSON.stringify([rule]), contentKey],
    );

    const project = () => projectStoredAuthoredContentV1(db, {
      kind: 'species', contentKey, references,
    });
    expect(project).toThrow(StoredAuthoredContentProjectionError);
    expect(project).toThrow(/must not contain leading or trailing whitespace/u);
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
