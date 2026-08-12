import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  BackgroundAuthoringDraft,
  DraftRevision,
  HomebrewDraft,
  HomebrewDraftUuid,
  SpeciesAuthoringDraft,
  SubclassAuthoringDraft,
} from '../../../src/authoring/contracts';
import {
  AuthoringServiceError,
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import { registerContentFingerprint } from '../../../src/catalog/content-registry';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import {
  registerAssertedFixtureContentIdentity,
  registerFixtureContentIdentity,
} from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';

let connection: Database;
let db: DatabaseContext;
let service: CatalogAuthoringService;
let uuidSequence: number;

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
  uuidSequence = 0;
  service = new CatalogAuthoringService(db, {
    randomUuid: () => `draft-test-uuid-${String(++uuidSequence)}`,
    now: () => '2026-08-06T12:00:00.000Z',
  });
});

afterEach(() => connection.close());

function serviceError(operation: () => unknown): AuthoringServiceError {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(AuthoringServiceError);
    return error as AuthoringServiceError;
  }
  throw new Error('Expected AuthoringServiceError.');
}

function registerDependency(
  kind: 'class' | 'feat',
  contentKey: ContentKey,
  name: string,
): void {
  registerFixtureContentIdentity(db, {
    kind,
    contentKey,
    name,
    keyKind: 'bundled-stable',
  });
  const identity = deriveContentIdentityV1({
    kind,
    edition: 'expanded',
    name,
    payload: { fixture: `${kind}:${name}` },
  });
  registerContentFingerprint(db, {
    kind,
    contentKey,
    scheme: identity.envelope.scheme,
    digest: identity.digest,
    canonicalJson: identity.canonicalJson,
    role: 'current',
  });
}

describe('catalog authoring draft service', () => {
  it('creates and lists only the three durable draft kinds', () => {
    const species = service.createDraft({ content_kind: 'species' });
    const background = service.createDraft({ content_kind: 'background' });
    const subclass = service.createDraft({ content_kind: 'subclass' });

    expect([species, background, subclass].map((draft) => ({
      kind: draft.content_kind,
      revision: draft.revision,
      version: draft.document_version,
      base: draft.base_content_key,
    }))).toEqual([
      { kind: 'species', revision: 0, version: 1, base: null },
      { kind: 'background', revision: 0, version: 1, base: null },
      { kind: 'subclass', revision: 0, version: 1, base: null },
    ]);
    expect(service.list().drafts.map((draft) => draft.content_kind).sort()).toEqual([
      'background',
      'species',
      'subclass',
    ]);

    expect(() => db.exec(
      `INSERT INTO catalog_content_drafts (
         draft_uuid, content_kind, document_version, revision, document_json
       ) VALUES ('class-draft', 'class', 1, 0, '{}')`,
    )).toThrow();
  });

  it('lists three drafts by literal descending updated time without test-side sorting', () => {
    const oldest = service.createDraft({ content_kind: 'species' });
    service.saveDraft({
      draft_uuid: oldest.draft_uuid,
      expected_revision: oldest.revision,
      document: { ...oldest.document, name: 'Oldest species draft' },
    });
    const middle = service.createDraft({ content_kind: 'background' });
    service.saveDraft({
      draft_uuid: middle.draft_uuid,
      expected_revision: middle.revision,
      document: { ...middle.document, name: 'Middle background draft' },
    });
    const newest = service.createDraft({ content_kind: 'subclass' });
    service.saveDraft({
      draft_uuid: newest.draft_uuid,
      expected_revision: newest.revision,
      document: { ...newest.document, name: 'Newest subclass draft' },
    });
    db.exec(
      `UPDATE catalog_content_drafts SET updated_at = ? WHERE draft_uuid = ?`,
      ['2026-08-01T01:00:00.000Z', 'draft-test-uuid-1'],
    );
    db.exec(
      `UPDATE catalog_content_drafts SET updated_at = ? WHERE draft_uuid = ?`,
      ['2026-08-03T03:00:00.000Z', 'draft-test-uuid-2'],
    );
    db.exec(
      `UPDATE catalog_content_drafts SET updated_at = ? WHERE draft_uuid = ?`,
      ['2026-08-05T05:00:00.000Z', 'draft-test-uuid-3'],
    );

    expect(service.list().drafts).toEqual([
      {
        draft_uuid: 'draft-test-uuid-3',
        content_kind: 'subclass',
        base_content_key: null,
        revision: 1,
        name: 'Newest subclass draft',
        updated_at: '2026-08-05T05:00:00.000Z',
      },
      {
        draft_uuid: 'draft-test-uuid-2',
        content_kind: 'background',
        base_content_key: null,
        revision: 1,
        name: 'Middle background draft',
        updated_at: '2026-08-03T03:00:00.000Z',
      },
      {
        draft_uuid: 'draft-test-uuid-1',
        content_kind: 'species',
        base_content_key: null,
        revision: 1,
        name: 'Oldest species draft',
        updated_at: '2026-08-01T01:00:00.000Z',
      },
    ]);
  });

  it('lists three published entries in literal kind/name/key order without test-side sorting', () => {
    const zuluSpeciesKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'species',
      edition: 'expanded',
      name: 'Zulu Species',
      ownerNamespace: 'draft.service',
    });
    const alphaBackgroundKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'background',
      edition: 'expanded',
      name: 'Alpha Background',
      ownerNamespace: 'draft.service',
    });
    const alphaSpeciesKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'species',
      edition: 'expanded',
      name: 'Alpha Species',
      ownerNamespace: 'draft.service',
    });
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'Zulu Species', 'expanded', 0, '[]')`,
      [zuluSpeciesKey],
    );
    db.exec(
      `INSERT INTO background_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'Alpha Background', 'expanded', 0, '[]')`,
      [alphaBackgroundKey],
    );
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'Alpha Species', 'expanded', 0, '[]')`,
      [alphaSpeciesKey],
    );

    expect(service.list().published).toEqual([
      {
        content_key: 'expanded:draft.service:alpha-background',
        content_kind: 'background',
        name: 'Alpha Background',
        rules_edition: 'expanded',
        catalog_layer: 'external',
        superseded_by: null,
        provenance: {
          origin_kind: 'unknown', received: false, local_derivation: false,
        },
      },
      {
        content_key: 'expanded:draft.service:alpha-species',
        content_kind: 'species',
        name: 'Alpha Species',
        rules_edition: 'expanded',
        catalog_layer: 'external',
        superseded_by: null,
        provenance: {
          origin_kind: 'unknown', received: false, local_derivation: false,
        },
      },
      {
        content_key: 'expanded:draft.service:zulu-species',
        content_kind: 'species',
        name: 'Zulu Species',
        rules_edition: 'expanded',
        catalog_layer: 'external',
        superseded_by: null,
        provenance: {
          origin_kind: 'unknown', received: false, local_derivation: false,
        },
      },
    ]);
  });

  it('uses revision compare-and-swap and leaves bytes unchanged after conflicts or validation errors', () => {
    const original = service.createDraft({ content_kind: 'species' });
    const firstDocument: SpeciesAuthoringDraft = {
      ...(original.document as SpeciesAuthoringDraft),
      name: 'First saved name',
    };
    const saved = service.saveDraft({
      draft_uuid: original.draft_uuid,
      expected_revision: original.revision,
      document: firstDocument,
    });
    expect(saved.revision).toBe(1);
    expect(saved.document.name).toBe('First saved name');

    const stale = serviceError(() => service.saveDraft({
      draft_uuid: original.draft_uuid,
      expected_revision: original.revision,
      document: { ...firstDocument, name: 'Stale tab' },
    }));
    expect(stale.data).toEqual({
      reason: 'stale_draft_revision',
      draft_uuid: original.draft_uuid,
      expected_revision: 0,
      actual_revision: 1,
    });

    const bytesBeforeInvalidSave = db.oneRaw(
      `SELECT revision, document_json FROM catalog_content_drafts
       WHERE draft_uuid = ?`,
      [original.draft_uuid],
    );
    const invalidDocument = {
      ...firstDocument,
      silently_dropped_if_not_strict: true,
    } as unknown as HomebrewDraft;
    const invalid = serviceError(() => service.saveDraft({
      draft_uuid: original.draft_uuid,
      expected_revision: saved.revision,
      document: invalidDocument,
    }));
    expect(invalid.data).toMatchObject({
      reason: 'validation_failed',
      issues: [{
        path: ['silently_dropped_if_not_strict'],
        code: 'unknown_field',
      }],
    });
    expect(db.oneRaw(
      `SELECT revision, document_json FROM catalog_content_drafts
       WHERE draft_uuid = ?`,
      [original.draft_uuid],
    )).toEqual(bytesBeforeInvalidSave);
  });

  it('offers exact recovery for unknown-future rows, forbids overwrite, and still permits explicit discard', () => {
    const draft = service.createDraft({ content_kind: 'species' });
    const futureBytes = '{"kind":"species","document_version":2,"future":{"x":1}}\n';
    db.exec(
      `UPDATE catalog_content_drafts
       SET document_version = 2, document_json = ?
       WHERE draft_uuid = ?`,
      [futureBytes, draft.draft_uuid],
    );

    expect(serviceError(() => service.readDraft(draft.draft_uuid)).data).toEqual({
      reason: 'draft_upgrade_required',
      draft_uuid: draft.draft_uuid,
      content_kind: 'species',
      stored_version: 2,
      latest_supported_version: 1,
      recovery_available: true,
      recovery_document_json: futureBytes,
    });
    expect(service.list().drafts[0]?.name).toBe('Upgrade required');
    expect(serviceError(() => service.saveDraft({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
      document: draft.document,
    })).data).toMatchObject({ reason: 'draft_upgrade_required' });
    expect(db.oneRaw(
      `SELECT document_version, revision, document_json
       FROM catalog_content_drafts WHERE draft_uuid = ?`,
      [draft.draft_uuid],
    )).toEqual({ document_version: 2, revision: 0, document_json: futureBytes });

    service.discardDraft(draft.draft_uuid, draft.revision);
    expect(db.scalar(
      'SELECT count(*) FROM catalog_content_drafts WHERE draft_uuid = ?',
      [draft.draft_uuid],
    )).toBe(0);
  });

  it('copies species trait and effect cards in their literal published order', () => {
    const contentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'species',
      edition: 'expanded',
      name: 'Glasskin Folk',
      ownerNamespace: 'draft.service',
    }) as ContentKey;
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules, notes
       ) VALUES (?, 'Glasskin Folk', 'expanded', 0, '[]', 'Exact reference prose')`,
      [contentKey],
    );
    const templateId = db.exec(
      `INSERT INTO species_templates (
         content_key, rules_edition, name, creature_type, size,
         alternate_size, base_speed_feet
      ) VALUES (?, 'expanded', 'Glasskin Folk', 'Crystal', 'Medium', 'Small', 35)`,
      [contentKey],
    ).lastInsertId;
    const secondTraitId = db.exec(
      `INSERT INTO species_template_traits (
         species_template_id, sort_order, name, description
       ) VALUES (?, 2, 'Echo Step', 'You move through echoes.')`,
      [templateId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO species_template_trait_effects (
         species_template_trait_id, sort_order, effect_kind, amount, label, notes
       ) VALUES (?, 1, 'armor_class_bonus', 1, 'Echo guard', 'Second trait effect')`,
      [secondTraitId],
    );
    const firstTraitId = db.exec(
      `INSERT INTO species_template_traits (
         species_template_id, sort_order, name, description
       ) VALUES (?, 1, 'Prismatic Hide', 'You bend the light.')`,
      [templateId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO species_template_trait_effects (
         species_template_trait_id, sort_order, effect_kind,
         speed_bonus_feet, label, notes
       ) VALUES (?, 2, 'speed', 5, 'Light step', 'Second effect card')`,
      [firstTraitId],
    );
    db.exec(
      `INSERT INTO species_template_trait_effects (
         species_template_trait_id, sort_order, effect_kind,
         damage_type, label, notes
       ) VALUES (?, 1, 'damage_resistance', 'Radiant', 'Prismatic ward', 'First effect card')`,
      [firstTraitId],
    );

    const copied = service.createDraft({
      content_kind: 'species',
      base_content_key: contentKey,
    });
    expect(copied.base_content_key).toBe(contentKey);
    expect(copied.document).toMatchObject({
      kind: 'species',
      name: 'Glasskin Folk',
      rules_edition: 'expanded',
      reference_text: 'Exact reference prose',
      creature_type: 'Crystal',
      primary_size: 'Medium',
      alternate_size: 'Small',
      walking_speed_feet: 35,
    });
    const species = copied.document as SpeciesAuthoringDraft;
    expect(species.traits.map((trait) => ({
      name: trait.name,
      description: trait.description,
      effect_cards: trait.effects.map((effect) => ({
        kind: effect.kind,
        label: effect.label,
        notes: effect.notes,
      })),
    }))).toEqual([
      {
        name: 'Prismatic Hide',
        description: 'You bend the light.',
        effect_cards: [
          {
            kind: 'damage_resistance',
            label: 'Prismatic ward',
            notes: 'First effect card',
          },
          {
            kind: 'speed',
            label: 'Light step',
            notes: 'Second effect card',
          },
        ],
      },
      {
        name: 'Echo Step',
        description: 'You move through echoes.',
        effect_cards: [{
          kind: 'armor_class_bonus',
          label: 'Echo guard',
          notes: 'Second trait effect',
        }],
      },
    ]);
  });

  it('copies background equipment and effect cards in their literal published order', () => {
    const featKey = 'expanded:feat:authoring-origin' as ContentKey;
    registerDependency('feat', featKey, 'Authoring Origin Feat');
    db.exec(
      `INSERT INTO feat_definitions (content_key, name, rules_edition, category)
       VALUES (?, 'Authoring Origin Feat', 'expanded', 'origin')`,
      [featKey],
    );
    const contentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'background',
      edition: 'expanded',
      name: 'Ordered Artisan',
      ownerNamespace: 'draft.service',
    }) as ContentKey;
    db.exec(
      `INSERT INTO background_definitions (
         content_key, name, rules_edition, repeatable, grant_rules, notes
       ) VALUES (?, 'Ordered Artisan', 'expanded', 0, '[]', 'Background reference')`,
      [contentKey],
    );
    const templateId = db.exec(
      `INSERT INTO background_templates (
         content_key, rules_edition, name, ability_score_1, ability_score_2,
         ability_score_3, feat_name, default_origin_feat_content_key,
         skill_proficiency_1,
         skill_proficiency_2, tool_proficiency, equipment_option_a,
         equipment_option_b
       ) VALUES (
         ?, 'expanded', 'Ordered Artisan', 'Wisdom', 'Intelligence',
         'Charisma', 'Authoring Origin Feat (Cleric)', ?, 'Insight', 'Arcana',
         'Glassblower tools', 'Choose the satchel.', 'Choose the ledger.'
       )`,
      [contentKey, featKey],
    ).lastInsertId;
    db.exec(
      `INSERT INTO background_equipment_items (
         background_template_id, option, sort_order, quantity, item_name, item_kind
       ) VALUES (?, 'a', 2, 3, 'chalks', 'gear')`,
      [templateId],
    );
    db.exec(
      `INSERT INTO background_equipment_items (
         background_template_id, option, sort_order, quantity, item_name, item_kind
       ) VALUES (?, 'a', 1, 1, 'glass satchel', 'gear')`,
      [templateId],
    );
    db.exec(
      `INSERT INTO background_equipment_items (
         background_template_id, option, sort_order, quantity, item_name, item_kind
       ) VALUES (?, 'b', 1, 2, 'ledgers', 'gear')`,
      [templateId],
    );
    db.exec(
      `INSERT INTO background_template_effects (
         background_template_id, sort_order, effect_kind,
         speed_bonus_feet, label, notes
       ) VALUES (?, 2, 'speed', 5, 'Workshop stride', 'Second background effect')`,
      [templateId],
    );
    db.exec(
      `INSERT INTO background_template_effects (
         background_template_id, sort_order, effect_kind,
         hit_points_flat, label, notes
       ) VALUES (?, 1, 'hp_modifier', 2, 'Hardened hands', 'First background effect')`,
      [templateId],
    );

    const copied = service.createDraft({
      content_kind: 'background',
      base_content_key: contentKey,
    });
    const background = copied.document as BackgroundAuthoringDraft;
    expect(background).toMatchObject({
      name: 'Ordered Artisan',
      reference_text: 'Background reference',
      suggested_abilities: ['wisdom', 'intelligence', 'charisma'],
      default_origin_feat_content_key: featKey,
      default_origin_feat_display_name: 'Authoring Origin Feat (Cleric)',
      skill_proficiencies: ['insight', 'arcana'],
      tool_reference_text: 'Glassblower tools',
      equipment_option_a_description: 'Choose the satchel.',
      equipment_option_b_description: 'Choose the ledger.',
    });
    expect({
      option_a: background.equipment_option_a.map((item) => ({
        kind: item.kind,
        quantity: item.quantity,
        printed_name: item.printed_name,
      })),
      option_b: background.equipment_option_b.map((item) => ({
        kind: item.kind,
        quantity: item.quantity,
        printed_name: item.printed_name,
      })),
      effect_cards: background.effects.map((effect) => ({
        kind: effect.kind,
        label: effect.label,
        notes: effect.notes,
      })),
    }).toEqual({
      option_a: [
        { kind: 'gear', quantity: 1, printed_name: 'glass satchel' },
        { kind: 'gear', quantity: 3, printed_name: 'chalks' },
      ],
      option_b: [
        { kind: 'gear', quantity: 2, printed_name: 'ledgers' },
      ],
      effect_cards: [
        {
          kind: 'hp_modifier',
          label: 'Hardened hands',
          notes: 'First background effect',
        },
        {
          kind: 'speed',
          label: 'Workshop stride',
          notes: 'Second background effect',
        },
      ],
    });
  });

  it('copies subclass feature and effect cards in their literal published order', () => {
    const classKey = 'expanded:class:authoring-parent' as ContentKey;
    registerDependency('class', classKey, 'Authoring Parent Class');
    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type
       ) VALUES (?, 'Authoring Parent Class', 'expanded', 'none')`,
      [classKey],
    ).lastInsertId;
    const contentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'subclass',
      edition: 'expanded',
      name: 'Ordered Tradition',
      ownerNamespace: 'draft.service',
    }) as ContentKey;
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition, grant_rules, notes
       ) VALUES (?, ?, 'Ordered Tradition', 'expanded', '[]', 'Subclass reference')`,
      [contentKey, classId],
    ).lastInsertId;
    const secondFeatureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description
       ) VALUES (?, 9, 2, 'Second Lesson', 'Second feature prose.')`,
      [subclassId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO subclass_feature_effects (
         subclass_feature_id, sort_order, effect_kind,
         attack_count, weapon_scope, label, notes
       ) VALUES (?, 1, 'extra_attack', 2, 'any_weapon', 'Second lesson attack', 'Second feature effect')`,
      [secondFeatureId],
    );
    const firstFeatureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description
       ) VALUES (?, 3, 1, 'First Lesson', 'First feature prose.')`,
      [subclassId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO subclass_feature_effects (
         subclass_feature_id, sort_order, effect_kind,
         amount, weapon_scope, label, notes
       ) VALUES (?, 2, 'weapon_damage_bonus', 2, 'one_bonded_weapon', 'Second first-lesson effect', 'Effect card two')`,
      [firstFeatureId],
    );
    db.exec(
      `INSERT INTO subclass_feature_effects (
         subclass_feature_id, sort_order, effect_kind,
         amount, label, notes
       ) VALUES (?, 1, 'armor_class_bonus', 1, 'First first-lesson effect', 'Effect card one')`,
      [firstFeatureId],
    );

    const copied = service.createDraft({
      content_kind: 'subclass',
      base_content_key: contentKey,
    });
    const subclass = copied.document as SubclassAuthoringDraft;
    expect(subclass).toMatchObject({
      name: 'Ordered Tradition',
      reference_text: 'Subclass reference',
      parent_class_content_key: classKey,
      progression: { mode: 'inherit_parent' },
    });
    expect(subclass.features.map((feature) => ({
      class_level: feature.class_level,
      name: feature.name,
      description: feature.description,
      effect_cards: feature.effects.map((effect) => ({
        kind: effect.kind,
        label: effect.label,
        notes: effect.notes,
      })),
    }))).toEqual([
      {
        class_level: 3,
        name: 'First Lesson',
        description: 'First feature prose.',
        effect_cards: [
          {
            kind: 'armor_class_bonus',
            label: 'First first-lesson effect',
            notes: 'Effect card one',
          },
          {
            kind: 'weapon_damage_bonus',
            label: 'Second first-lesson effect',
            notes: 'Effect card two',
          },
        ],
      },
      {
        class_level: 9,
        name: 'Second Lesson',
        description: 'Second feature prose.',
        effect_cards: [{
          kind: 'extra_attack',
          label: 'Second lesson attack',
          notes: 'Second feature effect',
        }],
      },
    ]);
  });

  it('returns literal distinct usage counts and character-id order for two published bases', () => {
    const firstKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'species',
      edition: 'expanded',
      name: 'First Usage Species',
      ownerNamespace: 'draft.service',
    }) as ContentKey;
    const secondKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'species',
      edition: 'expanded',
      name: 'Second Usage Species',
      ownerNamespace: 'draft.service',
    }) as ContentKey;
    const firstDefinitionId = db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'First Usage Species', 'expanded', 0, '[]')`,
      [firstKey],
    ).lastInsertId;
    const secondDefinitionId = db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'Second Usage Species', 'expanded', 0, '[]')`,
      [secondKey],
    ).lastInsertId;
    db.exec(
      `INSERT INTO characters (name, revision) VALUES
       ('Aster', 7), ('Beryl', 3), ('Cinder', 11)`,
    );
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, state
       ) VALUES
         (1, 'aster-first-a', 'species', ?, 'First Usage Species', 'active'),
         (1, 'aster-first-b', 'species', ?, 'First Usage Species', 'active'),
         (2, 'beryl-first', 'species', ?, 'First Usage Species', 'active'),
         (3, 'cinder-second', 'species', ?, 'Second Usage Species', 'active')`,
      [firstDefinitionId, firstDefinitionId, firstDefinitionId, secondDefinitionId],
    );

    const firstUsage = service.usages(firstKey);
    const secondUsage = service.usages(secondKey);
    expect({
      first_distinct_characters: firstUsage.usages.length,
      second_distinct_characters: secondUsage.usages.length,
    }).toEqual({
      first_distinct_characters: 2,
      second_distinct_characters: 1,
    });
    expect(firstUsage).toEqual({
      content_kind: 'species',
      content_key: 'expanded:draft.service:first-usage-species',
      usages: [
        { character_id: 1, character_revision: 7, character_name: 'Aster' },
        { character_id: 2, character_revision: 3, character_name: 'Beryl' },
      ],
    });
    expect(secondUsage).toEqual({
      content_kind: 'species',
      content_key: 'expanded:draft.service:second-usage-species',
      usages: [
        { character_id: 3, character_revision: 11, character_name: 'Cinder' },
      ],
    });
  });

  it('enforces the composite base identity and restricts deletion while a draft refers to it', () => {
    const contentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'species',
      edition: 'expanded',
      name: 'Referenced Species',
      ownerNamespace: 'draft.service',
    }) as ContentKey;
    const document = JSON.stringify({
      kind: 'species',
      document_version: 1,
      name: '',
      rules_edition: null,
      reference_text: '',
      creature_type: '',
      primary_size: '',
      alternate_size: null,
      walking_speed_feet: null,
      traits: [],
      grants: [],
    });
    db.exec(
      `INSERT INTO catalog_content_drafts (
         draft_uuid, content_kind, document_version, base_content_key,
         revision, document_json
       ) VALUES ('base-reference', 'species', 1, ?, 0, ?)`,
      [contentKey, document],
    );
    expect(service.list()).toMatchObject({ published: [], drafts: [{
      draft_uuid: 'base-reference',
    }] });
    expect(() => db.exec(
      'DELETE FROM catalog_content_identities WHERE content_key = ?',
      [contentKey],
    )).toThrow();
    expect(() => db.exec(
      `INSERT INTO catalog_content_drafts (
         draft_uuid, content_kind, document_version, base_content_key,
         revision, document_json
       ) VALUES ('wrong-kind', 'background', 1, ?, 0, '{}')`,
      [contentKey],
    )).toThrow();

    service.discardDraft('base-reference' as HomebrewDraftUuid, 0 as DraftRevision);
    expect(() => db.exec(
      'DELETE FROM catalog_content_identities WHERE content_key = ?',
      [contentKey],
    )).not.toThrow();
  });
});
