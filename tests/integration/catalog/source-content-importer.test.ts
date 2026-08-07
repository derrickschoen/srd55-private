import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  BackgroundContentAggregate,
  SpeciesContentAggregate,
} from '../../../src/authoring/contracts';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV1,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import {
  ContentIdentityCollision,
  registerBundledStableContentIdentity,
  registerContentFingerprint,
  registerDerivedContentIdentity,
} from '../../../src/catalog/content-registry';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import {
  ExternalClassImportRefused,
} from '../../../src/catalog/source-content-importer';
import { projectClassContentV1 } from '../../../src/catalog/source-content-projector-v1';
import { projectStoredEquipmentContentV1 } from '../../../src/catalog/equipment-content-projector-v1';
import { projectAuthoredContentAggregateV1 } from '../../../src/catalog/stored-authored-content-projector-v1';
import { projectStoredAuthoredContentV1, storedAuthoredRegistryReferencesV1 } from '../../../src/catalog/stored-authored-content-projector-v1';
import { DatabaseContext } from '../../../src/db/database';
import { creatureSize, creatureType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import { CatalogQueries } from '../../../src/queries/catalog-queries';
import {
  listGuidedBackgroundChoiceOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import {
  classProjectorV1Vector,
  featProjectorV1Vector,
} from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import { assertContentImportPlan } from '../../helpers/content-import-plan';
import { openTestDatabase } from '../../helpers/open-db';

let connection: Database;
let db: DatabaseContext;

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
});

afterEach(() => connection.close());

function document(kind: string, aggregate: object): string {
  return JSON.stringify([{ kind, aggregate }]);
}

function fingerprint(contentKey: ContentKey) {
  const row = db.oneRaw(
    `SELECT fingerprint_scheme, fingerprint_digest
     FROM catalog_content_fingerprints
     WHERE content_key = ? AND fingerprint_role = 'current'`,
    [contentKey],
  );
  if (row === null) throw new Error('Fixture fingerprint is missing.');
  return {
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: String(row.fingerprint_digest) as ContentFingerprintDigest,
  };
}

function backgroundReferencingFeat(
  name: string,
  featKey: ContentKey,
  displayName = 'Imported Origin Feat (Cleric)',
): BackgroundContentAggregate {
  return {
    kind: 'background',
    name,
    rules_edition: 'expanded',
    reference_text: 'Studies runes.',
    repeatable: false,
    grants: [],
    suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
    default_origin_feat_content_key: featKey,
    default_origin_feat: { kind: 'feat', ...fingerprint(featKey) },
    default_origin_feat_display_name: displayName,
    skill_proficiencies: ['arcana', 'insight'],
    tool_reference_text: null,
    equipment_option_a_description: 'Runes.',
    equipment_option_b_description: 'More runes.',
    equipment_option_a: [],
    equipment_option_b: [],
    effects: [],
  };
}

describe('class, feat, species and background catalog import', () => {
  it('Q1 preserves authored feat display metadata outside background identity through import', () => {
    const feat = {
      ...featProjectorV1Vector.aggregate,
      name: 'Rune Adept (Frost)',
      category: 'origin',
    };
    new CatalogImporter(db).import({ documents: [document('feat', feat)] });
    const featKey = db.scalar<string>(
      `SELECT content_key FROM feat_definitions
       WHERE name = 'Rune Adept (Frost)'`,
    );
    if (featKey === null) throw new Error('Parenthetical feat fixture is missing.');

    const result = new CatalogImporter(db).import({
      documents: [document(
        'background',
        backgroundReferencingFeat(
          'Frost Rune Keeper',
          featKey as ContentKey,
          'Rune Adept (Cleric)',
        ),
      )],
    });
    const backgroundKey = db.scalar<string>(
      `SELECT content_key FROM background_definitions
       WHERE name = 'Frost Rune Keeper'`,
    );
    if (backgroundKey === null) throw new Error('Background fixture is missing.');
    const projected = projectStoredAuthoredContentV1(db, {
      kind: 'background',
      contentKey: backgroundKey as ContentKey,
      references: storedAuthoredRegistryReferencesV1(db),
    });

    expect(result.backgrounds_created).toBe(1);
    expect(db.scalar<string>(
      `SELECT feat_name FROM background_templates
       WHERE content_key = ?`,
      [backgroundKey],
    )).toBe('Rune Adept (Cleric)');
    expect(projected.aggregate.default_origin_feat).toEqual({
      kind: 'feat',
      ...fingerprint(featKey as ContentKey),
    });
    expect(projected.aggregate.default_origin_feat_display_name)
      .toBe('Rune Adept (Cleric)');
    const renamedDisplay: BackgroundContentAggregate = {
      ...projected.aggregate,
      default_origin_feat_display_name: 'Rune Adept (Wizard)',
    };
    expect(projectAuthoredContentAggregateV1(renamedDisplay).payload)
      .toEqual(projectAuthoredContentAggregateV1(projected.aggregate).payload);
  });

  it('reviews a conflicting background feat display sidecar and silently matches an identical one', () => {
    new CatalogImporter(db).import({
      documents: [document('feat', {
        ...featProjectorV1Vector.aggregate,
        name: 'Sidecar Origin Feat',
        category: 'origin',
      })],
    });
    const featKey = db.scalar<string>(
      `SELECT content_key FROM feat_definitions WHERE name = 'Sidecar Origin Feat'`,
    );
    if (featKey === null) throw new Error('Sidecar feat fixture is missing.');
    const aggregate = backgroundReferencingFeat(
      'Sidecar Background',
      featKey as ContentKey,
      'Sidecar Origin Feat (Cleric)',
    );
    const importer = new CatalogImporter(db);

    const created = importer.import({
      documents: [document('background', aggregate)],
    });
    const identical = importer.import({
      documents: [document('background', aggregate)],
    });
    const conflict = importer.import({
      documents: [document('background', {
        ...aggregate,
        default_origin_feat_display_name: 'Sidecar Origin Feat (Wizard)',
      })],
    });

    expect(created.backgrounds_created).toBe(1);
    expect(identical.backgrounds_matched).toBe(1);
    assertContentImportPlan(
      conflict,
      'Expected the background display sidecar conflict to require review.',
    );
    expect(conflict.reviews).toEqual([
      expect.objectContaining({
        kind: 'background',
        matchClass: 'metadata-conflict',
        conflictDetails: [{
          field: 'Default Origin feat display name',
          incomingValue: 'Sidecar Origin Feat (Wizard)',
          localValue: 'Sidecar Origin Feat (Cleric)',
        }],
      }),
    ]);
    expect(db.scalar<string>(
      `SELECT feat_name FROM background_templates
       WHERE content_key = ?`,
      [assertedExternalContentKey('background', 'expanded', aggregate.name)],
    )).toBe('Sidecar Origin Feat (Cleric)');
  });

  it('does not resolve a parenthetical feat reference to a colliding base name', () => {
    for (const name of ['Rune Adept', 'Rune Adept (Frost)']) {
      new CatalogImporter(db).import({
        documents: [document('feat', {
          ...featProjectorV1Vector.aggregate,
          name,
          category: 'origin',
        })],
      });
    }
    const baseKey = db.scalar<string>(
      `SELECT content_key FROM feat_definitions WHERE name = 'Rune Adept'`,
    );
    const frostKey = db.scalar<string>(
      `SELECT content_key FROM feat_definitions
       WHERE name = 'Rune Adept (Frost)'`,
    );
    if (baseKey === null || frostKey === null) {
      throw new Error('Same-base feat fixtures are missing.');
    }

    const result = new CatalogImporter(db).import({
      documents: [document(
        'background',
        backgroundReferencingFeat('Collision Keeper', frostKey as ContentKey),
      )],
    });
    const backgroundKey = db.scalar<string>(
      `SELECT content_key FROM background_definitions
       WHERE name = 'Collision Keeper'`,
    );
    if (backgroundKey === null) throw new Error('Collision background is missing.');
    const projected = projectStoredAuthoredContentV1(db, {
      kind: 'background',
      contentKey: backgroundKey as ContentKey,
      references: storedAuthoredRegistryReferencesV1(db),
    });

    expect(result.backgrounds_created).toBe(1);
    expect(projected.aggregate.default_origin_feat).toEqual({
      kind: 'feat',
      ...fingerprint(frostKey as ContentKey),
    });
    expect(projected.aggregate.default_origin_feat).not.toEqual({
      kind: 'feat',
      ...fingerprint(baseKey as ContentKey),
    });
  });

  it('Q4 refuses a keyed General feat as a background default Origin feat', () => {
    const generalFeat = {
      ...featProjectorV1Vector.aggregate,
      name: 'Same Named Default',
      category: 'general',
    };
    new CatalogImporter(db).import({
      documents: [document('feat', generalFeat)],
    });
    const generalKey = db.scalar<string>(
      `SELECT content_key FROM feat_definitions WHERE name = 'Same Named Default'`,
    );
    if (generalKey === null) throw new Error('General feat fixture is missing.');

    const refusal = new CatalogImporter(db).import({
      documents: [document(
        'background',
        backgroundReferencingFeat(
          'Invalid General Binding',
          generalKey as ContentKey,
          'Same Named Default',
        ),
      )],
    });
    assertContentImportPlan(
      refusal,
      'Expected the General-feat background import to be refused.',
    );
    expect(refusal.outcomes).toEqual([
      expect.objectContaining({
        kind: 'refused',
        reason: 'install_refused',
      }),
    ]);
    expect(db.scalar<number>(
      `SELECT count(*) FROM background_definitions
       WHERE name = 'Invalid General Binding'`,
    )).toBe(0);
  });

  it('normalizes omitted skill-proficiency defaults before hashing and silently matches re-import', () => {
    const aggregate = {
      ...featProjectorV1Vector.aggregate,
      name: 'Defaulted Skill Grant',
      grants: [{
        kind: 'skill_proficiency',
        rule_key: 'defaulted.skill',
        count: 1,
        skills: ['arcana'],
      }],
    };
    const featDocument = document('feat', aggregate);

    const created = new CatalogImporter(db).import({ documents: [featDocument] });
    const matched = new CatalogImporter(db).import({ documents: [featDocument] });

    expect(created.feats_created).toBe(1);
    expect(matched.feats_matched).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(1);
    expect(db.scalar<string>('SELECT grant_rules FROM feat_definitions')).toContain(
      '"always_prepared":false',
    );
  });

  it('normalizes a case-varied grant skill and re-imports it as a silent exact match', () => {
    const aggregate = {
      ...featProjectorV1Vector.aggregate,
      name: 'Case Varied Skill Grant',
      grants: [{
        kind: 'skill_proficiency',
        rule_key: 'case-varied.skill',
        count: 1,
        skills: ['Arcana'],
      }],
    };
    const featDocument = document('feat', aggregate);

    const created = new CatalogImporter(db).import({ documents: [featDocument] });
    const matched = new CatalogImporter(db).import({ documents: [featDocument] });

    expect(created.feats_created).toBe(1);
    expect(matched.feats_matched).toBe(1);
    expect(db.scalar<string>('SELECT grant_rules FROM feat_definitions')).toContain(
      '"skills":["arcana"]',
    );
  });

  it('refuses an unknown grant skill at the document parse boundary', () => {
    const aggregate = {
      ...featProjectorV1Vector.aggregate,
      name: 'Unknown Skill Grant',
      grants: [{
        kind: 'skill_proficiency',
        rule_key: 'unknown.skill',
        count: 1,
        skills: ['Chronomancy'],
      }],
    };

    expect(() => new CatalogImporter(db).import({
      documents: [document('feat', aggregate)],
    })).toThrow(/aggregate\.grants\[0\]\.skills\[0\].*Chronomancy.*not a skill/u);
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
  });

  it('refuses an unknown grant source_type at the document parse boundary', () => {
    const aggregate = {
      ...featProjectorV1Vector.aggregate,
      name: 'Unknown Source Type Grant',
      grants: [{
        kind: 'grant_source',
        rule_key: 'unknown.source-type',
        count: 1,
        source_type: 'vehicle',
        definition_key_config: 'chosen_source',
      }],
    };

    expect(() => new CatalogImporter(db).import({
      documents: [document('feat', aggregate)],
    })).toThrow(/aggregate\.grants\[0\]\.source_type.*vehicle.*not a domain source type/u);
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
  });

  it('refuses a non-grant_source rule in a background document at parse time', () => {
    const aggregate = {
      kind: 'background',
      name: 'Invalid Grant Background',
      rules_edition: 'expanded',
      reference_text: '',
      repeatable: false,
      grants: [{
        kind: 'skill_proficiency',
        rule_key: 'background.skill',
        count: 1,
        skills: ['arcana'],
      }],
      suggested_abilities: ['strength', 'dexterity', 'constitution'],
      default_origin_feat_content_key: 'expanded:feat:invalid' as ContentKey,
      default_origin_feat: {
        kind: 'feat',
        scheme: CONTENT_FINGERPRINT_SCHEME_V1,
        digest: 'a'.repeat(64),
      },
      default_origin_feat_display_name: 'Invalid Feat Display',
      skill_proficiencies: ['athletics', 'acrobatics'],
      tool_reference_text: null,
      equipment_option_a_description: 'None.',
      equipment_option_b_description: 'None.',
      equipment_option_a: [],
      equipment_option_b: [],
      effects: [],
    };

    expect(() => new CatalogImporter(db).import({
      documents: [document('background', aggregate)],
    })).toThrow(
      /aggregate\.grants\[0\]\.kind.*grant_source.*skill_proficiency/u,
    );
    expect(db.scalar<number>('SELECT count(*) FROM background_definitions')).toBe(0);
  });

  it('refuses a whitespace-padded config path in a spell-list field', () => {
    const aggregate = {
      ...featProjectorV1Vector.aggregate,
      name: 'Padded Config List',
      grants: [{
        kind: 'choice_from_list',
        rule_key: 'padded.config.list',
        bucket: 'prepared',
        count: 1,
        list: ' $config.chosen_list ',
      }],
    };

    expect(() => new CatalogImporter(db).import({
      documents: [document('feat', aggregate)],
    })).toThrow(/aggregate\.grants\[0\]\.list.*surrounding whitespace/u);
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
  });


  it('stores imported feat/species aggregates and exposes complete species only through the HA-3 guided seam', () => {
    const species: SpeciesContentAggregate = {
      kind: 'species',
      name: 'Marsh Kin',
      rules_edition: 'expanded',
      reference_text: 'Born beside deep water.',
      repeatable: false,
      creature_type: creatureType('Humanoid'),
      primary_size: creatureSize('Medium'),
      alternate_size: null,
      walking_speed_feet: 30,
      grants: [],
      traits: [],
    };
    const featDocument = document('feat', featProjectorV1Vector.aggregate);
    const dryRun = new CatalogImporter(db).import({
      documents: [featDocument],
      dryRun: true,
    });
    expect(dryRun.feats_created).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
    const featCreated = new CatalogImporter(db).import({ documents: [featDocument] });
    const featKey = db.scalar<string>('SELECT content_key FROM feat_definitions');
    if (featKey === null) throw new Error('Fixture feat is missing.');
    const speciesWithGrant: SpeciesContentAggregate = {
      ...species,
      grants: [{
        kind: 'grant_source',
        rule_key: 'marsh-kin-source',
        count: 1,
        source_type: 'feat',
        source_definition: { kind: 'feat', ...fingerprint(featKey as ContentKey) },
        active_from_class_level: null,
        active_if_config: null,
        distinct_config_by: null,
        always_prepared: false,
        with_slots: false,
        free_cast: null,
      }],
    };
    const speciesDocument = document('species', speciesWithGrant);
    const speciesCreated = new CatalogImporter(db).import({ documents: [speciesDocument] });
    expect(featCreated.feats_created).toBe(1);
    expect(speciesCreated.species_created).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM species_definitions')).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM species_templates')).toBe(1);
    const storedGrantRules = db.scalar<string>('SELECT grant_rules FROM species_definitions');
    expect(storedGrantRules).toContain(`"source_definition_key":"${featKey}"`);
    expect(storedGrantRules).not.toContain('source_definition_id');

    const featMatched = new CatalogImporter(db).import({ documents: [featDocument] });
    const speciesKey = db.scalar<string>('SELECT content_key FROM species_definitions');
    if (speciesKey === null) throw new Error('Fixture species is missing.');
    const storedSpecies = projectStoredAuthoredContentV1(db, {
      kind: 'species',
      contentKey: speciesKey as ContentKey,
      references: storedAuthoredRegistryReferencesV1(db),
    });
    const storedSpeciesIdentity = deriveContentIdentityV1({
      kind: storedSpecies.kind,
      edition: storedSpecies.aggregate.rules_edition,
      name: storedSpecies.aggregate.name,
      payload: storedSpecies.payload,
    });
    const incomingSpeciesIdentity = deriveContentIdentityV1({
      kind: species.kind,
      edition: species.rules_edition,
      name: species.name,
      payload: projectAuthoredContentAggregateV1(speciesWithGrant).payload,
    });
    expect(storedSpeciesIdentity.canonicalJson).toBe(incomingSpeciesIdentity.canonicalJson);
    const speciesMatched = new CatalogImporter(db).import({ documents: [speciesDocument] });
    expect(featMatched.feats_matched).toBe(1);
    expect(speciesMatched.species_matched).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM species_definitions')).toBe(1);
    const catalog = new CatalogQueries(db).read();
    expect(catalog.sources.feat).toEqual([
      expect.objectContaining({
        content_key: featKey,
        name: 'Keen Memory',
        catalog_layer: 'external',
      }),
    ]);
    expect(catalog.sources.species).toEqual([
      expect.objectContaining({
        content_key: speciesKey,
        name: 'Marsh Kin',
        catalog_layer: 'external',
      }),
    ]);
    expect(listGuidedOriginOptions(db, 'species')).toEqual([{
      content_key: speciesKey,
      name: 'Marsh Kin',
      catalog_layer: 'external',
      grants_lineage_spells: false,
    }]);
    expect(listGuidedBackgroundChoiceOptions(db).origin_feats).toEqual([]);

    db.exec('UPDATE species_templates SET base_speed_feet = 35 WHERE content_key = ?', [speciesKey]);
    const damaged = new CatalogImporter(db).import({
      documents: [speciesDocument],
    });
    assertContentImportPlan(
      damaged,
      'Expected the damaged species import to return a plan.',
    );
    expect(damaged.outcomes).toEqual([
      expect.objectContaining({ kind: 'refused', reason: 'target_integrity_refused' }),
    ]);
  });

  it('imports a null-tool background, resolves catalog edges, and reprojects byte-stably', () => {
    new CatalogImporter(db).import({
      documents: [document('feat', {
        ...featProjectorV1Vector.aggregate,
        category: 'origin',
      })],
    });
    const featKey = db.scalar<string>('SELECT content_key FROM feat_definitions');
    if (featKey === null) throw new Error('Fixture feat is missing.');

    const weaponIdentity = registerDerivedContentIdentity(db, {
      kind: 'weapon', edition: 'expanded', name: 'Marsh Spear', payload: { reach: true },
    });
    db.exec(
      `INSERT INTO weapon_templates (
         content_key, rules_edition, name, srd_group, damage_kind, damage_dice,
         damage_type, versatile_damage_kind, finesse, heavy, light, loading,
         reach, thrown, two_handed, ammunition, range_kind, mastery_property
       ) VALUES (?, 'expanded', 'Marsh Spear', 'martial_melee', 'dice', '1d6',
         'Piercing', 'not_applicable', 0, 0, 0, 0, 1, 0, 0, 0, 'none', 'Sap')`,
      [weaponIdentity.derivedKey],
    );
    const storedWeapon = projectStoredEquipmentContentV1(db, {
      kind: 'weapon', contentKey: weaponIdentity.derivedKey,
    });
    const liveWeaponIdentity = deriveContentIdentityV1({
      kind: storedWeapon.kind,
      edition: storedWeapon.aggregate.rules_edition,
      name: storedWeapon.aggregate.name,
      payload: storedWeapon.payload,
    });
    db.exec(
      `DELETE FROM catalog_content_fingerprints
       WHERE content_kind = 'weapon' AND content_key = ?`,
      [weaponIdentity.derivedKey],
    );
    registerContentFingerprint(db, {
      kind: 'weapon', contentKey: weaponIdentity.derivedKey,
      scheme: liveWeaponIdentity.envelope.scheme,
      digest: liveWeaponIdentity.digest,
      canonicalJson: liveWeaponIdentity.canonicalJson,
      role: 'current',
    });
    const armorIdentity = registerDerivedContentIdentity(db, {
      kind: 'armor', edition: 'expanded', name: 'Reed Mail', payload: { armor_class: 13 },
    });
    db.exec(
      `INSERT INTO armor_templates (
         content_key, rules_edition, name, category, armor_class, dex_bonus,
         stealth_disadvantage
       ) VALUES (?, 'expanded', 'Reed Mail', 'light', 13, 'full', 0)`,
      [armorIdentity.derivedKey],
    );
    const storedArmor = projectStoredEquipmentContentV1(db, {
      kind: 'armor', contentKey: armorIdentity.derivedKey,
    });
    const liveArmorIdentity = deriveContentIdentityV1({
      kind: storedArmor.kind,
      edition: storedArmor.aggregate.rules_edition,
      name: storedArmor.aggregate.name,
      payload: storedArmor.payload,
    });
    db.exec(
      `DELETE FROM catalog_content_fingerprints
       WHERE content_kind = 'armor' AND content_key = ?`,
      [armorIdentity.derivedKey],
    );
    registerContentFingerprint(db, {
      kind: 'armor', contentKey: armorIdentity.derivedKey,
      scheme: liveArmorIdentity.envelope.scheme,
      digest: liveArmorIdentity.digest,
      canonicalJson: liveArmorIdentity.canonicalJson,
      role: 'current',
    });
    const featRef = fingerprint(featKey as ContentKey);
    const background: BackgroundContentAggregate = {
      kind: 'background',
      name: 'Fen Guard',
      rules_edition: 'expanded',
      reference_text: 'Watches the crossing.',
      repeatable: false,
      grants: [],
      suggested_abilities: ['strength', 'wisdom', 'constitution'],
      default_origin_feat_content_key: featKey as ContentKey,
      default_origin_feat: { kind: 'feat', ...featRef },
      default_origin_feat_display_name: 'Graph Origin Feat (Cleric)',
      skill_proficiencies: ['athletics', 'perception'],
      tool_reference_text: null,
      equipment_option_a_description: 'A spear.',
      equipment_option_b_description: 'Mail.',
      equipment_option_a: [{
        kind: 'weapon', sort_order: 1, quantity: 1, printed_name: 'Marsh Spear',
        content: { kind: 'weapon', scheme: liveWeaponIdentity.envelope.scheme, digest: liveWeaponIdentity.digest },
      }],
      equipment_option_b: [{
        kind: 'armor', sort_order: 1, quantity: 1, printed_name: 'Reed Mail',
        content: { kind: 'armor', scheme: liveArmorIdentity.envelope.scheme, digest: liveArmorIdentity.digest },
      }],
      effects: [],
    };
    const summary = new CatalogImporter(db).import({
      documents: [document('background', background)],
    });
    expect(summary.backgrounds_created).toBe(1);
    const edges = db.allRaw(
      `SELECT weapon.content_key AS weapon_key, armor.content_key AS armor_key
       FROM background_equipment_items AS item
       LEFT JOIN weapon_templates AS weapon ON weapon.id = item.weapon_template_id
       LEFT JOIN armor_templates AS armor ON armor.id = item.armor_template_id
       ORDER BY item.option`,
    );
    expect(edges).toEqual([
      { weapon_key: weaponIdentity.derivedKey, armor_key: null },
      { weapon_key: null, armor_key: armorIdentity.derivedKey },
    ]);

    const contentKey = db.scalar<string>('SELECT content_key FROM background_definitions');
    if (contentKey === null) throw new Error('Fixture background is missing.');
    const incoming = deriveContentIdentityV1({
      kind: background.kind,
      edition: background.rules_edition,
      name: background.name,
      payload: projectAuthoredContentAggregateV1(background).payload,
    });
    expect(contentKey).toBe(assertedExternalContentKey(
      'background',
      background.rules_edition,
      background.name,
    ));
    expect(db.scalar<string>('SELECT tool_proficiency FROM background_templates')).toBe('');
    const stored = projectStoredAuthoredContentV1(db, {
      kind: 'background',
      contentKey: contentKey as ContentKey,
      references: storedAuthoredRegistryReferencesV1(db),
    });
    const reprojected = deriveContentIdentityV1({
      kind: stored.kind,
      edition: stored.aggregate.rules_edition,
      name: stored.aggregate.name,
      payload: stored.payload,
    });
    expect(reprojected.canonicalJson).toBe(incoming.canonicalJson);
    expect(new CatalogQueries(db).read().sources.background).toEqual([
      expect.objectContaining({
        content_key: contentKey,
        name: 'Fen Guard',
        catalog_layer: 'external',
      }),
    ]);
    expect(listGuidedOriginOptions(db, 'background')).toEqual([{
      content_key: contentKey,
      name: 'Fen Guard',
      catalog_layer: 'external',
      grants_lineage_spells: false,
    }]);
  });

  it('requires review for an installed bundled class and refuses creation under D133', () => {
    const key = 'expanded:bundled-wayfarer' as ContentKey;
    registerBundledStableContentIdentity(db, {
      kind: 'class', contentKey: key, normalizedName: 'wayfarer',
    });
    db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type, supports_ritual_casting)
       VALUES (?, 'Wayfarer', 'expanded', 'none', 0)`,
      [key],
    );
    const classIdentity = deriveContentIdentityV1({
      kind: 'class',
      edition: classProjectorV1Vector.aggregate.rules_edition,
      name: classProjectorV1Vector.aggregate.name,
      payload: projectClassContentV1(classProjectorV1Vector.aggregate),
    });
    registerContentFingerprint(db, {
      kind: 'class',
      contentKey: key,
      scheme: classIdentity.envelope.scheme,
      digest: classIdentity.digest,
      canonicalJson: classIdentity.canonicalJson,
      role: 'current',
    });
    const classReview = new CatalogImporter(db).import({
      documents: [document('class', classProjectorV1Vector.aggregate)],
    });
    assertContentImportPlan(
      classReview,
      'Expected the class import to require content review.',
    );
    expect(classReview.reviews).toEqual([
      expect.objectContaining({ kind: 'class' }),
    ]);

    const missing = {
      ...classProjectorV1Vector.aggregate,
      name: 'Uninstalled Class',
    };
    const missingPlan = new CatalogImporter(db).import({
      documents: [document('class', missing)],
    });
    assertContentImportPlan(
      missingPlan,
      'Expected the uninstalled class import to return a plan.',
    );
    expect(missingPlan.outcomes).toEqual([
      expect.objectContaining({ kind: 'refused', reason: 'install_refused' }),
    ]);
    expect(db.scalar<number>('SELECT count(*) FROM class_definitions')).toBe(1);
  });

  it('requires review when equal feat identity bytes carry conflicting display metadata', () => {
    new CatalogImporter(db).import({
      documents: [document('feat', featProjectorV1Vector.aggregate)],
    });
    const review = new CatalogImporter(db).import({
      documents: [document('feat', {
        ...featProjectorV1Vector.aggregate,
        name: 'Keen-Memory',
      })],
    });
    assertContentImportPlan(
      review,
      'Expected the feat metadata conflict to require content review.',
    );
    expect(review.reviews).toEqual([
      expect.objectContaining({ kind: 'feat', matchClass: 'metadata-conflict' }),
    ]);
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(1);
  });
});
