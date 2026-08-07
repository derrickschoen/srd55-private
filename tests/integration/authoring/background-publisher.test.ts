import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthoringServiceError,
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import type {
  BackgroundAuthoringDraft,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import { exportSelectedLibraryContent } from '../../../src/backup/library-export';
import {
  applyGuidedBackgroundChoices,
  createGuidedCharacter,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import {
  applyGuidedEquipment,
  guidedEquipmentStepState,
} from '../../../src/builder/equipment-step';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { normalizeContentIdentityName } from '../../../src/catalog/content-identity';
import { authoringFingerprintReference } from '../../../src/authoring/species-publisher';
import {
  commitContentImport,
  planContentImport,
} from '../../../src/catalog/content-adoption';
import {
  registerContentAlias,
  registerBundledStableContentIdentity,
  rememberContentMatchDecision,
} from '../../../src/catalog/content-registry';
import { portableSourceContentImportNode } from '../../../src/catalog/source-content-importer';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import type { CharacterId, ContentKey } from '../../../src/domain/ids';
import { EquipmentGrantRefusal } from '../../../src/grants/equipment-grants';
import { SavePointQueries } from '../../../src/queries/save-points';
import { featProjectorV1Vector } from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import { openTestDatabase } from '../../helpers/open-db';

const opened: Database[] = [];
let uuidSequence = 0;

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close();
  uuidSequence = 0;
});

async function database(seed = false): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  const db = new DatabaseContext(connection);
  if (seed) applicationSeed(db);
  return db;
}

function service(db: DatabaseContext): CatalogAuthoringService {
  return new CatalogAuthoringService(db, {
    randomUuid: () => `ha4-background-${String(++uuidSequence)}`,
    now: () => '2042-06-09T08:09:10.000Z',
  });
}

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function validBackground(
  db: DatabaseContext,
  created: StoredHomebrewDraft,
  name = 'Void Cartographer',
): BackgroundAuthoringDraft {
  if (created.document.kind !== 'background') throw new Error('Fixture draft is not background.');
  return {
    ...created.document,
    name,
    rules_edition: '2024',
    reference_text: 'Maps places that conventional geometry cannot reach.',
    suggested_abilities: ['intelligence', 'wisdom', 'dexterity'],
    default_origin_feat_content_key: originFeatKey(db),
    skill_proficiencies: ['investigation', 'survival'],
    tool_reference_text: '<img src=x onerror=alert(1)> Void compass',
    equipment_option_a_description: 'Club, void compass, and map case',
    equipment_option_b_description: 'Leather Armor and map case',
    equipment_option_a: [
      {
        kind: 'weapon',
        draft_item_uuid: itemUuid(`${name}-club`),
        quantity: 1,
        printed_name: 'Club',
        content_key: '2024:weapon:club' as ContentKey,
      },
      {
        kind: 'gear',
        draft_item_uuid: itemUuid(`${name}-compass`),
        quantity: 1,
        printed_name: 'Void compass',
      },
    ],
    equipment_option_b: [{
      kind: 'armor',
      draft_item_uuid: itemUuid(`${name}-leather`),
      quantity: 1,
      printed_name: 'Leather Armor',
      content_key: '2024:armor:leather-armor' as ContentKey,
    }],
    effects: [
      {
        kind: 'ability_increase',
        draft_item_uuid: itemUuid(`${name}-extra-ability`),
        label: 'Void aptitude',
        notes: 'Additional to the player-selected background allocation.',
        ability: 'charisma',
        amount: 1,
        maximum: 30,
      },
      {
        kind: 'armor_class_bonus',
        draft_item_uuid: itemUuid(`${name}-ward`),
        label: 'Cartographer ward',
        notes: null,
        amount: 1,
      },
    ],
  };
}

function savedBackground(
  db: DatabaseContext,
  authoring: CatalogAuthoringService,
  name?: string,
  transform?: (draft: BackgroundAuthoringDraft) => BackgroundAuthoringDraft,
): StoredHomebrewDraft {
  const created = authoring.createDraft({ content_kind: 'background' });
  let document = validBackground(db, created, name);
  if (transform !== undefined) document = transform(document);
  return authoring.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document,
  });
}

function originFeatKey(db: DatabaseContext): ContentKey {
  const keys = db.allRaw(
    `SELECT content_key FROM feat_definitions
     WHERE category = 'origin' ORDER BY content_key`,
  );
  for (const row of keys) {
    const key = String(row.content_key) as ContentKey;
    if (authoringFingerprintReference(db, 'feat', key) !== null) return key;
  }
  throw new Error(`No uniquely fingerprinted Origin feat is installed: ${JSON.stringify(db.allRaw(
    `SELECT feat.content_key, fingerprint.fingerprint_scheme,
            fingerprint.fingerprint_role, fingerprint.fingerprint_digest
     FROM feat_definitions AS feat
     LEFT JOIN catalog_content_fingerprints AS fingerprint
       ON fingerprint.content_kind = 'feat'
      AND fingerprint.content_key = feat.content_key
     WHERE feat.category = 'origin' ORDER BY feat.content_key`,
  ))}`);
}

function publish(authoring: CatalogAuthoringService, draft: StoredHomebrewDraft) {
  const preview = authoring.previewPublish({
    draft_uuid: draft.draft_uuid,
    expected_revision: draft.revision,
  });
  return {
    preview,
    result: authoring.commitPublish({ token: preview.token, decisions: [] }),
  };
}

function authoringError(operation: () => unknown): AuthoringServiceError {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(AuthoringServiceError);
    return error as AuthoringServiceError;
  }
  throw new Error('Expected an authoring service error.');
}

describe('HA-4 background publisher', () => {
  it('collects every unresolved semantic field path without touching the catalog', async () => {
    const db = await database(true);
    const authoring = service(db);
    const draft = savedBackground(db, authoring, ' ', (document) => ({
      ...document,
      rules_edition: null,
      suggested_abilities: ['strength', 'strength'],
      default_origin_feat_content_key: '2024:missing-feat' as ContentKey,
      skill_proficiencies: ['arcana'],
      equipment_option_a_description: '',
      equipment_option_b_description: '',
      equipment_option_a: [{
        kind: 'weapon',
        draft_item_uuid: itemUuid('bad-weapon'),
        quantity: null,
        printed_name: '',
        content_key: null,
      }],
      equipment_option_b: [{
        kind: 'gear',
        draft_item_uuid: itemUuid('bad-gear'),
        quantity: null,
        printed_name: '',
      }],
      effects: [{
        kind: 'damage_resistance',
        draft_item_uuid: itemUuid('bad-effect'),
        label: '',
        notes: null,
        damage_type: null,
      }],
    }));
    const identitiesBefore = db.scalar<number>('SELECT count(*) FROM catalog_content_identities');
    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    }));
    expect(error.data.reason).toBe('validation_failed');
    if (error.data.reason !== 'validation_failed') throw new Error('Expected validation issues.');
    const expectedIssues = [
      { path: ['name'], code: 'required', message: 'Must not be empty.' },
      { path: ['rules_edition'], code: 'required', message: 'Rules edition is required.' },
      { path: ['suggested_abilities'], code: 'required', message: 'Exactly three suggested abilities are required.' },
      { path: ['suggested_abilities'], code: 'duplicate', message: 'Suggested abilities must not repeat.' },
      { path: ['default_origin_feat_content_key'], code: 'unresolved_reference', message: 'Default Origin feat must resolve to one current Origin-feat fingerprint.' },
      { path: ['skill_proficiencies'], code: 'required', message: 'Exactly two skill proficiencies are required.' },
      { path: ['equipment_option_a_description'], code: 'required', message: 'Must not be empty.' },
      { path: ['equipment_option_b_description'], code: 'required', message: 'Must not be empty.' },
      { path: ['equipment_option_a', 0, 'quantity'], code: 'required', message: 'Quantity is required.' },
      { path: ['equipment_option_a', 0, 'printed_name'], code: 'required', message: 'Must not be empty.' },
      { path: ['equipment_option_a', 0, 'content_key'], code: 'required', message: 'Weapon is required.' },
      { path: ['equipment_option_b', 0, 'quantity'], code: 'required', message: 'Quantity is required.' },
      { path: ['equipment_option_b', 0, 'printed_name'], code: 'required', message: 'Must not be empty.' },
      { path: ['effects', 0, 'label'], code: 'required', message: 'Must not be empty.' },
      { path: ['effects', 0, 'damage_type'], code: 'required', message: 'Damage type is required.' },
    ] as const;
    expect(error.data.issues).toHaveLength(expectedIssues.length);
    for (const expectedIssue of expectedIssues) {
      expect(error.data.issues).toContainEqual(expectedIssue);
    }
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(identitiesBefore);
    expect(db.scalar<number>("SELECT count(*) FROM background_definitions WHERE name = ' '")).toBe(0);
    expect(authoring.readDraft(draft.draft_uuid).revision).toBe(draft.revision);
  });

  it('publishes the complete aggregate, generalizes choices/equipment, and keeps D102 text reference-only', async () => {
    const db = await database(true);
    const authoring = service(db);
    const draft = savedBackground(db, authoring);
    const { preview, result } = publish(authoring, draft);
    const expectedKey = assertedExternalContentKey('background', '2024', 'Void Cartographer');
    expect(preview.review).toEqual([]);
    expect(result).toEqual({
      outcome: 'created',
      content_key: expectedKey,
      name: 'Void Cartographer',
      catalog_layer: 'external',
      previous_key_usage_count: 0,
    });
    expect(db.oneRaw(
      `SELECT template.tool_proficiency, definition.notes
       FROM background_templates AS template
       JOIN background_definitions AS definition USING (content_key)
       WHERE template.content_key = ?`,
      [expectedKey],
    )).toEqual({
      tool_proficiency: '<img src=x onerror=alert(1)> Void compass',
      notes: 'Maps places that conventional geometry cannot reach.',
    });
    expect(db.scalar<number>(
      `SELECT count(*) FROM background_template_effects AS effect
       JOIN background_templates AS template ON template.id = effect.background_template_id
       WHERE template.content_key = ?`,
      [expectedKey],
    )).toBe(2);
    expect(listGuidedOriginOptions(db, 'background')).toContainEqual(expect.objectContaining({
      content_key: expectedKey,
      catalog_layer: 'external',
    }));
    const backgroundOption = listGuidedBackgroundChoiceOptions(db).backgrounds.find(
      (option) => option.content_key === expectedKey,
    );
    expect(backgroundOption?.pairing).toEqual(expect.objectContaining({
      suggested_abilities: ['intelligence', 'wisdom', 'dexterity'],
      suggested_feat_content_key: originFeatKey(db),
    }));

    const guidedClass = listGuidedClassOptions(db)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      db,
      { name: 'Void Mapper', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-background-apply'),
    );
    applyGuidedBackgroundChoices(db, {
      character_id: character.id,
      content_key: expectedKey,
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'dexterity', amount: 1 },
      ],
      origin_feat_content_key: originFeatKey(db),
      origin_feat_config: {},
    });
    expect(db.allRaw(
      `SELECT effect.effect_kind, effect.ability, effect.amount,
              effect.maximum, effect.template_ref
       FROM character_effects AS effect
       JOIN character_source_instances AS source
         ON source.id = effect.source_instance_id
       WHERE effect.character_id = ? AND source.source_type = 'background'
       ORDER BY effect.sort_order`,
      [character.id],
    )).toEqual([
      { effect_kind: 'ability_increase', ability: 'strength', amount: 2, maximum: 20, template_ref: null },
      { effect_kind: 'ability_increase', ability: 'dexterity', amount: 1, maximum: 20, template_ref: null },
      { effect_kind: 'ability_increase', ability: 'charisma', amount: 1, maximum: 30, template_ref: expect.stringMatching(/^background_template_effects:\d+$/u) },
      { effect_kind: 'armor_class_bonus', ability: null, amount: 1, maximum: null, template_ref: expect.stringMatching(/^background_template_effects:\d+$/u) },
    ]);
    expect(db.allRaw(
      `SELECT grant.skill FROM character_skill_grants AS grant
       JOIN character_source_instances AS source
         ON source.id = grant.source_instance_id
       WHERE grant.character_id = ? AND source.source_type = 'background'
       ORDER BY grant.ordinal`,
      [character.id],
    )).toEqual([{ skill: 'investigation' }, { skill: 'survival' }]);
    expect(db.scalar<string>(
      'SELECT tool_proficiency FROM character_background WHERE character_id = ?',
      [character.id],
    )).toBe('<img src=x onerror=alert(1)> Void compass');
    expect(db.scalar<number>(
      `SELECT count(*) FROM character_skill_grants
       WHERE character_id = ? AND grant_key LIKE '%tool%'`,
      [character.id],
    )).toBe(0);
    expect(guidedEquipmentStepState(db, character.id).background_package)
      .toEqual(expect.objectContaining({
        content_key: expectedKey,
        offered: expect.arrayContaining([
          expect.objectContaining({ option: 'a' }),
        ]),
      }));
    applyGuidedEquipment(db, {
      character_id: character.id,
      kind: 'background',
      content_key: expectedKey,
      option: 'a',
    });
    expect(db.allRaw(
      'SELECT name FROM character_weapons WHERE character_id = ? ORDER BY id',
      [character.id],
    )).toEqual([{ name: 'Club' }]);

    const exported = exportSelectedLibraryContent(db, [expectedKey], '2042-06-09T00:00:00.000Z');
    expect(exported.content).toEqual([
      expect.objectContaining({
        kind: 'background',
        content_key: expectedKey,
        aggregate: expect.objectContaining({
          default_origin_feat_content_key: originFeatKey(db),
          default_origin_feat: expect.objectContaining({ kind: 'feat' }),
          equipment_option_a: expect.arrayContaining([
            expect.objectContaining({ kind: 'weapon', content: expect.objectContaining({ kind: 'weapon' }) }),
          ]),
          equipment_option_b: expect.arrayContaining([
            expect.objectContaining({ kind: 'armor', content: expect.objectContaining({ kind: 'armor' }) }),
          ]),
        }),
      }),
    ]);

    const copied = authoring.createDraft({
      content_kind: 'background',
      base_content_key: expectedKey,
    });
    if (copied.document.kind !== 'background') throw new Error('Copied draft is not background.');
    const revised = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: { ...copied.document, name: 'Void Cartographer Revised' },
    });
    expect(publish(authoring, revised).result).toMatchObject({
      outcome: 'created',
      previous_key_usage_count: 1,
    });
    expect(db.scalar<string>(
      'SELECT name FROM character_background WHERE character_id = ?',
      [character.id],
    )).toBe('Void Cartographer');
  }, 20_000);

  it('Q1 round-trips authored feat display through export and copy-to-draft', async () => {
    const db = await database(true);
    const selectedKey = '2024:feat:alert' as ContentKey;
    const selectedName = db.scalar<string>(
      'SELECT name FROM feat_definitions WHERE content_key = ?',
      [selectedKey],
    );
    if (selectedName === null) throw new Error('The bundled Alert feat is missing.');
    const duplicateKey = '2024:alternate.owner:same-name-alert' as ContentKey;
    registerBundledStableContentIdentity(db, {
      kind: 'feat',
      contentKey: duplicateKey,
      normalizedName: normalizeContentIdentityName(selectedName),
    });
    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, category, min_level,
         ability_points, ability_increase_abilities,
         ability_increase_maximum, repeatable, prerequisites, grant_rules,
         notes, created_at, updated_at
       )
       SELECT ?, name, rules_edition, category, min_level,
              ability_points, ability_increase_abilities,
              ability_increase_maximum, repeatable, prerequisites, grant_rules,
              'Distinct same-named installed fixture', created_at, updated_at
       FROM feat_definitions WHERE content_key = ?`,
      [duplicateKey, selectedKey],
    );
    expect(db.allRaw(
      `SELECT content_key FROM feat_definitions
       WHERE name = ? AND rules_edition = '2024' ORDER BY content_key`,
      [selectedName],
    )).toEqual([
      { content_key: duplicateKey },
      { content_key: selectedKey },
    ]);

    const authoring = service(db);
    const published = publish(authoring, savedBackground(
      db,
      authoring,
      'Keyed Alert Surveyor',
      (document) => ({
        ...document,
        default_origin_feat_content_key: selectedKey,
        default_origin_feat_display_name: `${selectedName} (Night Watch)`,
      }),
    ));
    const backgroundKey = published.result.content_key;
    expect(db.oneRaw(
      `SELECT feat_name, default_origin_feat_content_key
       FROM background_templates WHERE content_key = ?`,
      [backgroundKey],
    )).toEqual({
      feat_name: `${selectedName} (Night Watch)`,
      default_origin_feat_content_key: selectedKey,
    });
    expect(listGuidedBackgroundChoiceOptions(db).backgrounds.find(
      (option) => option.content_key === backgroundKey,
    )?.pairing.suggested_feat_content_key).toBe(selectedKey);
    expect(exportSelectedLibraryContent(
      db,
      [backgroundKey],
      '2042-06-09T00:00:00.000Z',
    ).content[0]).toEqual(expect.objectContaining({
      aggregate: expect.objectContaining({
        default_origin_feat_content_key: selectedKey,
        default_origin_feat_display_name: `${selectedName} (Night Watch)`,
      }),
    }));
    const copied = authoring.createDraft({
      content_kind: 'background',
      base_content_key: backgroundKey,
    });
    expect(copied.document).toEqual(expect.objectContaining({
      default_origin_feat_content_key: selectedKey,
      default_origin_feat_display_name: `${selectedName} (Night Watch)`,
    }));

    const guidedClass = listGuidedClassOptions(db)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      db,
      { name: 'Keyed Alert Hero', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-keyed-alert-apply'),
    );
    applyGuidedBackgroundChoices(db, {
      character_id: character.id,
      content_key: backgroundKey,
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'dexterity', amount: 1 },
      ],
      origin_feat_content_key: selectedKey,
      origin_feat_config: {},
    });
    expect(db.scalar<string>(
      `SELECT feat.content_key
       FROM character_source_instances AS child
       JOIN feat_definitions AS feat ON feat.id = child.source_definition_id
       WHERE child.character_id = ? AND child.source_type = 'feat'`,
      [character.id],
    )).toBe(selectedKey);
  }, 20_000);

  it('Q3 withholds active_if_config external Origin feats while retaining no-config feats', async () => {
    const db = await database(true);
    const importer = new CatalogImporter(db);
    const passive = {
      ...featProjectorV1Vector.aggregate,
      name: 'Passive Origin Echo',
      rules_edition: 'expanded',
      category: 'origin',
      grants: [],
    };
    const configurable = {
      ...featProjectorV1Vector.aggregate,
      name: 'Configurable Origin Echo',
      rules_edition: 'expanded',
      category: 'origin',
      grants: [{
        kind: 'skill_proficiency',
        rule_key: 'configurable-echo-skill',
        count: 1,
        skills: ['arcana'],
        active_if_config: { key: 'training', equals: 'arcana' },
      }],
    };
    importer.import({
      documents: [JSON.stringify([
        { kind: 'feat', aggregate: passive },
        { kind: 'feat', aggregate: configurable },
      ])],
    });
    const options = listGuidedBackgroundChoiceOptions(db).origin_feats;
    expect(options).toContainEqual(expect.objectContaining({
      name: 'Passive Origin Echo',
    }));
    expect(options).not.toContainEqual(expect.objectContaining({
      name: 'Configurable Origin Echo',
    }));
  });

  it('refuses a drifted live weapon dependency instead of trusting its registered digest', async () => {
    const db = await database(true);
    db.exec(
      `UPDATE weapon_templates SET damage_type = 'Drifted Void'
       WHERE content_key = '2024:weapon:club'`,
    );
    const authoring = service(db);
    const draft = savedBackground(db, authoring, 'Drifted Weapon Surveyor');
    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    }));
    expect(error.data).toEqual(expect.objectContaining({
      reason: 'validation_failed',
      issues: expect.arrayContaining([{
        path: ['equipment_option_a', 0, 'content_key'],
        code: 'unresolved_reference',
        message: 'Weapon content key does not resolve to one current fingerprint.',
      }]),
    }));
    expect(db.scalar<number>(
      `SELECT count(*) FROM background_definitions
       WHERE name = 'Drifted Weapon Surveyor'`,
    )).toBe(0);
  });

  it('Q2 publishes clean, then refuses typed dependency drift at equipment apply', async () => {
    const db = await database(true);
    const authoring = service(db);
    const published = publish(
      authoring,
      savedBackground(db, authoring, 'Post-Publish Drift Surveyor'),
    );
    const guidedClass = listGuidedClassOptions(db)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      db,
      {
        name: 'Post-Publish Drift Hero',
        class_content_key: guidedClass.content_key,
      },
      new CharacterCommandIntegrity('ha4-post-publish-drift'),
    );
    applyGuidedBackgroundChoices(db, {
      character_id: character.id,
      content_key: published.result.content_key,
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'dexterity', amount: 1 },
      ],
      origin_feat_content_key: originFeatKey(db),
      origin_feat_config: {},
    });
    db.exec(
      `UPDATE weapon_templates SET damage_type = 'Drifted Void'
       WHERE content_key = '2024:weapon:club'`,
    );

    let refusal: EquipmentGrantRefusal | undefined;
    try {
      applyGuidedEquipment(db, {
        character_id: character.id,
        kind: 'background',
        content_key: published.result.content_key,
        option: 'a',
      });
    } catch (error) {
      refusal = error as EquipmentGrantRefusal;
    }
    expect(refusal).toBeInstanceOf(EquipmentGrantRefusal);
    expect(refusal?.data).toEqual({
      reason: 'equipment_dependency_drift',
      content_key: '2024:weapon:club',
      dependency_kind: 'weapon',
      item: 'Club',
    });
    expect(db.scalar<number>(
      'SELECT count(*) FROM character_weapons WHERE character_id = ?',
      [character.id],
    )).toBe(0);
    expect(guidedEquipmentStepState(db, character.id).background_package)
      .toEqual(expect.objectContaining({ chosen_option: null }));
  }, 20_000);

  it('surfaces and applies an external background package with external dependencies, and refuses a missing dependency by name', async () => {
    const db = await database(true);
    const externalWeapon = {
      kind: 'weapon',
      name: 'Storm Pike',
      edition: 'expanded',
      srdGroup: 'martial_melee',
      damage: { kind: 'dice', dice: '1d8' },
      damageType: 'Lightning',
      versatileDamage: { kind: 'dice', dice: '1d10' },
      finesse: false,
      heavy: false,
      light: false,
      loading: false,
      reach: true,
      thrown: false,
      twoHanded: false,
      ammunition: false,
      ammunitionKind: null,
      range: { kind: 'none' },
      masteryProperty: 'Push',
      otherProperties: '',
    };
    new CatalogImporter(db).import({ documents: [JSON.stringify([externalWeapon])] });
    const weaponKey = assertedExternalContentKey('weapon', 'expanded', 'Storm Pike');
    const authoring = service(db);
    const published = publish(authoring, savedBackground(
      db,
      authoring,
      'Storm Quartermaster',
      (document) => ({
        ...document,
        equipment_option_a_description: 'Storm Pike and field pack',
        equipment_option_a: [{
          kind: 'weapon',
          draft_item_uuid: itemUuid('storm-pike-package'),
          quantity: 1,
          printed_name: 'Storm Pike',
          content_key: weaponKey,
        }],
      }),
    ));
    const guidedClass = listGuidedClassOptions(db)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      db,
      { name: 'Storm Quartermaster Hero', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-external-equipment'),
    );
    applyGuidedBackgroundChoices(db, {
      character_id: character.id,
      content_key: published.result.content_key,
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'dexterity', amount: 1 },
      ],
      origin_feat_content_key: originFeatKey(db),
      origin_feat_config: {},
    });
    const state = guidedEquipmentStepState(db, character.id);
    expect(state.background_package).toEqual(expect.objectContaining({
      content_key: published.result.content_key,
      offered: expect.arrayContaining([expect.objectContaining({
        option: 'a',
        contents: [expect.objectContaining({ item_name: 'Storm Pike' })],
      })]),
    }));
    applyGuidedEquipment(db, {
      character_id: character.id,
      kind: 'background',
      content_key: published.result.content_key,
      option: 'a',
    });
    expect(db.allRaw(
      'SELECT name FROM character_weapons WHERE character_id = ?',
      [character.id],
    )).toEqual([{ name: 'Storm Pike' }]);

    const missing = savedBackground(
      db,
      authoring,
      'Missing Dependency Quartermaster',
      (document) => ({
        ...document,
        equipment_option_a: [{
          kind: 'weapon',
          draft_item_uuid: itemUuid('missing-package-weapon'),
          quantity: 1,
          printed_name: 'Missing Pike',
          content_key: 'expanded:weapon:missing-pike' as ContentKey,
        }],
      }),
    );
    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: missing.draft_uuid,
      expected_revision: missing.revision,
    }));
    expect(error.data).toEqual(expect.objectContaining({
      reason: 'validation_failed',
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: ['equipment_option_a', 0, 'content_key'],
          code: 'unresolved_reference',
        }),
      ]),
    }));
  }, 20_000);

  it('silently self-matches byte-identical external content and refuses a typed asserted-key collision', async () => {
    const db = await database(true);
    const authoring = service(db);
    const first = publish(authoring, savedBackground(db, authoring, 'Convergent Wayfarer'));
    const identityCount = db.scalar<number>('SELECT count(*) FROM catalog_content_identities');
    const definitionCount = db.scalar<number>('SELECT count(*) FROM background_definitions');
    const receiptCount = db.scalar<number>('SELECT count(*) FROM catalog_content_match_decisions');
    const secondDraft = savedBackground(db, authoring, 'Convergent Wayfarer');
    const second = publish(authoring, secondDraft);
    expect(second.preview.review).toEqual([]);
    expect(second.result).toEqual(expect.objectContaining({
      outcome: 'matched_existing',
      content_key: first.result.content_key,
      catalog_layer: 'external',
    }));
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(identityCount);
    expect(db.scalar<number>('SELECT count(*) FROM background_definitions')).toBe(definitionCount);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_match_decisions')).toBe(receiptCount);
    expect(() => authoring.readDraft(secondDraft.draft_uuid)).toThrow();

    const collisionDraft = savedBackground(db, authoring, 'Convergent Wayfarer', (document) => ({
      ...document,
      equipment_option_a_description: 'Different mechanics under the same asserted key',
    }));
    const collision = authoringError(() => authoring.previewPublish({
      draft_uuid: collisionDraft.draft_uuid,
      expected_revision: collisionDraft.revision,
    }));
    expect(collision.data).toEqual({
      reason: 'content_key_collision',
      content_key: first.result.content_key,
    });
  });

  it('requires review despite a remembered alias decision and commits an explicit Match', async () => {
    const db = await database(true);
    const authoring = service(db);
    const base = publish(authoring, savedBackground(db, authoring, 'Explicit Match Base'));
    const copied = authoring.createDraft({
      content_kind: 'background',
      base_content_key: base.result.content_key,
    });
    if (copied.document.kind !== 'background') throw new Error('Background draft required.');
    const incoming = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: { ...copied.document, name: 'Explicit Match Wayfarer' },
    });
    const initial = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    if (initial.aggregate.kind !== 'background') throw new Error('Preview aggregate is not background.');
    const targetKey = '2024:alternate.owner:explicit-match-wayfarer' as ContentKey;
    const targetNode = portableSourceContentImportNode(db, initial.aggregate, targetKey);
    const targetPlan = planContentImport(db, [targetNode]);
    expect(commitContentImport(db, {
      nodes: [targetNode],
      token: targetPlan.token,
    }).kind).toBe('committed');
    registerContentAlias(db, {
      kind: 'background',
      aliasKey: assertedExternalContentKey('background', '2024', 'Explicit Match Wayfarer'),
      contentKey: targetKey,
      aliasKind: 'declared-legacy',
    });
    const preview = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(preview.review).toEqual([{
      candidate_content_key: targetKey,
      candidate_name: 'Explicit Match Wayfarer',
      candidate_catalog_layer: 'external',
      reason: 'alias',
      default_decision: 'match',
    }]);
    const identity = preview.facts.candidate_identities[0];
    if (identity === undefined) throw new Error('Preview identity is missing.');
    rememberContentMatchDecision(db, {
      kind: identity.kind,
      scheme: identity.scheme,
      digest: identity.digest,
      decision: 'match',
      targetContentKey: targetKey,
    });
    const repeated = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(repeated.review).toEqual(preview.review);
    expect(authoringError(() => authoring.commitPublish({
      token: repeated.token,
      decisions: [],
    })).data).toEqual({
      reason: 'publish_review_required',
      candidates: [targetKey],
    });
    expect(authoring.commitPublish({
      token: repeated.token,
      decisions: [{ candidate_content_key: targetKey, decision: 'match' }],
    })).toEqual({
      outcome: 'matched_existing',
      content_key: targetKey,
      name: 'Explicit Match Wayfarer',
      catalog_layer: 'external',
      previous_key_usage_count: 0,
    });
    expect(db.oneRaw(
      `SELECT superseded_content_key, successor_content_key
       FROM catalog_content_supersessions`,
    )).toEqual({
      superseded_content_key: base.result.content_key,
      successor_content_key: targetKey,
    });
    expect(() => authoring.readDraft(incoming.draft_uuid)).toThrow(AuthoringServiceError);
    expect(db.scalar<number>(
      'SELECT count(*) FROM catalog_content_match_decisions WHERE target_content_key = ?',
      [targetKey],
    )).toBe(1);
  });

  it('rolls back the last publish step and retains the draft when draft deletion fails', async () => {
    const db = await database(true);
    const authoring = service(db);
    const draft = savedBackground(db, authoring, 'Rollback Surveyor');
    const countsBefore = db.oneRaw(
      `SELECT
         (SELECT count(*) FROM catalog_content_identities) AS identities,
         (SELECT count(*) FROM background_definitions) AS definitions,
         (SELECT count(*) FROM background_templates) AS templates,
         (SELECT count(*) FROM background_equipment_items) AS equipment,
         (SELECT count(*) FROM background_template_effects) AS effects,
         (SELECT count(*) FROM catalog_content_match_decisions) AS receipts`,
    );
    const preview = authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    });
    const capturedDefinitionId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence
                        WHERE name = 'background_definitions'), 0) + 1`,
    );
    const capturedTemplateId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence
                        WHERE name = 'background_templates'), 0) + 1`,
    );
    const firstEquipmentId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence
                        WHERE name = 'background_equipment_items'), 0) + 1`,
    );
    const firstEffectId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence
                        WHERE name = 'background_template_effects'), 0) + 1`,
    );
    if (firstEquipmentId === null || firstEffectId === null) {
      throw new Error('Background child row sequence fixture did not resolve.');
    }
    db.exec(
      `CREATE TRIGGER ha4_refuse_draft_delete
       BEFORE DELETE ON catalog_content_drafts
       WHEN OLD.draft_uuid = '${draft.draft_uuid}'
       BEGIN SELECT RAISE(ABORT, 'ha4 last-step rollback'); END`,
    );
    const error = authoringError(() => authoring.commitPublish({ token: preview.token, decisions: [] }));
    expect(error.data).toEqual({ reason: 'publish_refused', refusal: 'commit_failed' });
    const key = assertedExternalContentKey('background', '2024', 'Rollback Surveyor');
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities WHERE content_key = ?', [key])).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM background_definitions WHERE content_key = ?', [key])).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM background_templates WHERE content_key = ?', [key])).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_match_decisions WHERE target_content_key = ?', [key])).toBe(0);
    expect(db.oneRaw(
      `SELECT
         (SELECT count(*) FROM catalog_content_fingerprints WHERE content_key = ?) AS fingerprints,
         (SELECT count(*) FROM background_definitions WHERE id = ?) AS definitions,
         (SELECT count(*) FROM background_templates
          WHERE id = ? AND content_key = ?) AS templates,
         (SELECT count(*) FROM background_equipment_items
          WHERE id IN (?, ?, ?) AND background_template_id = ?) AS equipment,
         (SELECT count(*) FROM background_template_effects
          WHERE id IN (?, ?) AND background_template_id = ?) AS effects`,
      [
        key,
        capturedDefinitionId,
        capturedTemplateId,
        key,
        firstEquipmentId,
        firstEquipmentId + 1,
        firstEquipmentId + 2,
        capturedTemplateId,
        firstEffectId,
        firstEffectId + 1,
        capturedTemplateId,
      ],
    )).toEqual({ fingerprints: 0, definitions: 0, templates: 0, equipment: 0, effects: 0 });
    expect(db.oneRaw(
      `SELECT
         (SELECT count(*) FROM catalog_content_identities) AS identities,
         (SELECT count(*) FROM background_definitions) AS definitions,
         (SELECT count(*) FROM background_templates) AS templates,
         (SELECT count(*) FROM background_equipment_items) AS equipment,
         (SELECT count(*) FROM background_template_effects) AS effects,
         (SELECT count(*) FROM catalog_content_match_decisions) AS receipts`,
    )).toEqual(countsBefore);
    expect(authoring.readDraft(draft.draft_uuid).revision).toBe(draft.revision);
  });

  // Measured alone at 1.72s: two seeded databases plus a save-point round trip dominate.
  it('regenerates imported background effect refs against target-local child ids', async () => {
    const source = await database(true);
    const sourceAuthoring = service(source);
    const published = publish(sourceAuthoring, savedBackground(source, sourceAuthoring, 'Portable Surveyor'));
    const guidedClass = listGuidedClassOptions(source)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      source,
      { name: 'Portable Mapper', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-portable-source'),
    );
    applyGuidedBackgroundChoices(source, {
      character_id: character.id,
      content_key: published.result.content_key,
      increases: [{ ability: 'strength', amount: 2 }, { ability: 'dexterity', amount: 1 }],
      origin_feat_content_key: originFeatKey(source),
      origin_feat_config: {},
    });
    new SavePointQueries(
      source,
      undefined,
      () => '2042-06-09T00:00:00.000Z',
    ).create(character.id, 'Background effects before export');
    const sourceRefs = source.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'background_template_effects:%'
       ORDER BY sort_order`,
      [character.id],
    ).map((row) => String(row.template_ref));
    const document = exportCharacterBackup(source, character.id, '2042-06-09T00:00:00.000Z');
    expect(document.content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'background',
        content_key: published.result.content_key,
      }),
    ]));

    const target = await database(true);
    const targetAuthoring = service(target);
    publish(targetAuthoring, savedBackground(target, targetAuthoring, 'Target Background Offset'));
    const plan = planCharacterBackupImport(target, document);
    const committed = commitCharacterBackupImport(target, document, plan.token);
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    expect(committed.result.notices).toEqual([]);
    const targetRefs = target.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'background_template_effects:%'
       ORDER BY sort_order`,
      [committed.result.characterId],
    ).map((row) => String(row.template_ref));
    expect(targetRefs).toHaveLength(2);
    expect(targetRefs.every((reference) => !sourceRefs.includes(reference))).toBe(true);
    expect(targetRefs).toEqual(target.allRaw(
      `SELECT 'background_template_effects:' || effect.id AS template_ref
       FROM background_template_effects AS effect
       JOIN background_templates AS template ON template.id = effect.background_template_id
       WHERE template.content_key = ? ORDER BY effect.sort_order`,
      [published.result.content_key],
    ).map((row) => String(row.template_ref)));

    const importedSavePoint = target.oneRaw(
      'SELECT snapshot FROM character_save_points WHERE character_id = ?',
      [committed.result.characterId],
    );
    if (importedSavePoint === null) throw new Error('Imported save point is missing.');
    const saved = JSON.parse(String(importedSavePoint.snapshot)) as {
      character_effects: Array<{ readonly template_ref: string | null }>;
    };
    const savedRefs = saved.character_effects
      .map((row) => row.template_ref)
      .filter((reference): reference is string =>
        reference?.startsWith('background_template_effects:') === true);
    expect(savedRefs).toEqual(targetRefs);
    expect(savedRefs.every((reference) => !sourceRefs.includes(reference))).toBe(true);
  }, 20_000);

  it('binds identical effect payloads to the correct background template identity', async () => {
    const source = await database(true);
    const sourceAuthoring = service(source);
    const selected = publish(
      sourceAuthoring,
      savedBackground(source, sourceAuthoring, 'Second Shared Ward Background'),
    );
    const guidedClass = listGuidedClassOptions(source)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      source,
      { name: 'Shared Ward Bearer', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-shared-background-source'),
    );
    applyGuidedBackgroundChoices(source, {
      character_id: character.id,
      content_key: selected.result.content_key,
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'dexterity', amount: 1 },
      ],
      origin_feat_content_key: originFeatKey(source),
      origin_feat_config: {},
    });
    const document = exportCharacterBackup(
      source,
      character.id,
      '2042-06-09T00:00:00.000Z',
    );

    const target = await database(true);
    const targetAuthoring = service(target);
    const competing = publish(
      targetAuthoring,
      savedBackground(target, targetAuthoring, 'First Shared Ward Background'),
    );
    publish(
      targetAuthoring,
      savedBackground(target, targetAuthoring, 'Second Shared Ward Background'),
    );
    const plan = planCharacterBackupImport(target, document);
    const committed = commitCharacterBackupImport(target, document, plan.token);
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    expect(committed.result.notices).toEqual([]);
    const importedRefs = target.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ?
         AND template_ref LIKE 'background_template_effects:%'
       ORDER BY sort_order`,
      [committed.result.characterId],
    ).map((row) => String(row.template_ref));
    const selectedRefs = target.allRaw(
      `SELECT 'background_template_effects:' || effect.id AS template_ref
       FROM background_template_effects AS effect
       JOIN background_templates AS template
         ON template.id = effect.background_template_id
       WHERE template.content_key = ? ORDER BY effect.sort_order`,
      [selected.result.content_key],
    ).map((row) => String(row.template_ref));
    const competingRefs = target.allRaw(
      `SELECT 'background_template_effects:' || effect.id AS template_ref
       FROM background_template_effects AS effect
       JOIN background_templates AS template
         ON template.id = effect.background_template_id
       WHERE template.content_key = ? ORDER BY effect.sort_order`,
      [competing.result.content_key],
    ).map((row) => String(row.template_ref));
    expect(importedRefs).toEqual(selectedRefs);
    expect(importedRefs.some((reference) => competingRefs.includes(reference))).toBe(false);
  }, 20_000);

  it('imports an older raw numeric background effect ref as null with a typed notice', async () => {
    const source = await database(true);
    const sourceAuthoring = service(source);
    const published = publish(
      sourceAuthoring,
      savedBackground(source, sourceAuthoring, 'Numeric Ref Surveyor'),
    );
    const guidedClass = listGuidedClassOptions(source)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      source,
      { name: 'Numeric Ref Bearer', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-numeric-ref-source'),
    );
    applyGuidedBackgroundChoices(source, {
      character_id: character.id,
      content_key: published.result.content_key,
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'dexterity', amount: 1 },
      ],
      origin_feat_content_key: originFeatKey(source),
      origin_feat_config: {},
    });
    const exported = exportCharacterBackup(
      source,
      character.id,
      '2042-06-09T00:00:00.000Z',
    );
    let replaced = false;
    const document = {
      ...exported,
      tables: {
        ...exported.tables,
        character_effects: (exported.tables.character_effects ?? []).map((row) => {
          if (
            !replaced &&
            typeof row.template_ref === 'string' &&
            row.template_ref.startsWith('background_template_effects:portable:')
          ) {
            replaced = true;
            return { ...row, template_ref: 9001 };
          }
          return row;
        }),
      },
    };
    expect(replaced).toBe(true);
    const target = await database(true);
    const plan = planCharacterBackupImport(target, document);
    const committed = commitCharacterBackupImport(target, document, plan.token);
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    expect(committed.result.notices).toContainEqual({
      kind: 'background_effect_template_ref_unresolved',
      effect: {
        templateRef: '9001',
        label: 'Void aptitude',
        effectKind: 'ability_increase',
      },
      background: {
        contentKey: published.result.content_key,
        name: 'Numeric Ref Surveyor',
      },
    });
    expect(target.scalar<string>(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND label = 'Void aptitude'`,
      [committed.result.characterId],
    )).toBeNull();
  }, 20_000);

  it('returns a typed notice when a background effect no longer matches its portable template', async () => {
    const source = await database(true);
    const sourceAuthoring = service(source);
    const published = publish(sourceAuthoring, savedBackground(source, sourceAuthoring, 'Notice Surveyor'));
    const guidedClass = listGuidedClassOptions(source)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      source,
      { name: 'Changed Mapper', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-notice-source'),
    );
    applyGuidedBackgroundChoices(source, {
      character_id: character.id,
      content_key: published.result.content_key,
      increases: [{ ability: 'strength', amount: 2 }, { ability: 'dexterity', amount: 1 }],
      origin_feat_content_key: originFeatKey(source),
      origin_feat_config: {},
    });
    source.exec(
      `UPDATE character_effects SET amount = 9
       WHERE id = (
         SELECT effect.id FROM character_effects AS effect
         JOIN character_source_instances AS instance
           ON instance.id = effect.source_instance_id
         WHERE effect.character_id = ?
           AND instance.source_type = 'background'
           AND effect.template_ref LIKE 'background_template_effects:%'
         ORDER BY effect.sort_order LIMIT 1
       )`,
      [character.id],
    );
    const document = exportCharacterBackup(source, character.id, '2042-06-09T00:00:00.000Z');
    const target = await database(true);
    const plan = planCharacterBackupImport(target, document);
    const committed = commitCharacterBackupImport(target, document, plan.token);
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    expect(committed.result.notices).toEqual([{
      kind: 'background_effect_template_ref_unresolved',
      effect: {
        templateRef: 'background_template_effects:portable:1',
        label: 'Void aptitude',
        effectKind: 'ability_increase',
      },
      background: {
        contentKey: published.result.content_key,
        name: 'Notice Surveyor',
      },
    }]);
    expect(target.scalar<string>(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND label = 'Void aptitude'`,
      [committed.result.characterId],
    )).toBeNull();
  }, 20_000);

  it('versions background lineage without changing an existing character', async () => {
    const db = await database(true);
    const authoring = service(db);
    const original = publish(authoring, savedBackground(db, authoring, 'Versioned Surveyor'));
    const guidedClass = listGuidedClassOptions(db)[0];
    if (guidedClass === undefined) throw new Error('A guided class is required.');
    const character = createGuidedCharacter(
      db,
      { name: 'Versioned Mapper', class_content_key: guidedClass.content_key },
      new CharacterCommandIntegrity('ha4-versioned-background'),
    );
    applyGuidedBackgroundChoices(db, {
      character_id: character.id,
      content_key: original.result.content_key,
      increases: [{ ability: 'strength', amount: 2 }, { ability: 'dexterity', amount: 1 }],
      origin_feat_content_key: originFeatKey(db),
      origin_feat_config: {},
    });
    const copied = authoring.createDraft({
      content_kind: 'background',
      base_content_key: original.result.content_key,
    });
    if (copied.document.kind !== 'background') throw new Error('Background draft required.');
    const revised = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: { ...copied.document, name: 'Versioned Surveyor Revised' },
    });
    const successor = publish(authoring, revised);

    expect(successor.result).toMatchObject({ outcome: 'created', previous_key_usage_count: 1 });
    expect(authoring.usages(original.result.content_key).usages).toHaveLength(1);
    expect(authoring.usages(successor.result.content_key).usages).toHaveLength(0);
    expect(db.scalar<string>(
      'SELECT name FROM character_background WHERE character_id = ?',
      [character.id],
    )).toBe('Versioned Surveyor');
    expect(db.oneRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key
       FROM catalog_content_supersessions`,
    )).toEqual({
      content_kind: 'background',
      superseded_content_key: original.result.content_key,
      successor_content_key: successor.result.content_key,
    });
    expect(authoring.list().published).toEqual(expect.arrayContaining([
      expect.objectContaining({
        content_key: original.result.content_key,
        superseded_by: successor.result.content_key,
      }),
      expect.objectContaining({
        content_key: successor.result.content_key,
        superseded_by: null,
      }),
    ]));
    const replacement = authoring.previewReplacement({
      old_content_key: original.result.content_key,
      new_content_key: successor.result.content_key,
      character_id: character.id as CharacterId,
    });
    expect(replacement.review).toEqual([
      expect.objectContaining({
        candidate_content_key: successor.result.content_key,
        reason: 'key-collision',
      }),
    ]);
    expect(authoring.commitReplacement({
      token: replacement.token,
      decisions: [{
        candidate_content_key: successor.result.content_key,
        decision: 'match',
      }],
      choices: [],
    })).toMatchObject({
      content_kind: 'background',
      character_id: character.id,
      new_content_key: successor.result.content_key,
    });
    expect(db.scalar<string>(
      'SELECT name FROM character_background WHERE character_id = ?',
      [character.id],
    )).toBe('Versioned Surveyor Revised');
  });

  it('rolls background installation and lineage back atomically', async () => {
    const db = await database(true);
    const authoring = service(db);
    const original = publish(authoring, savedBackground(db, authoring, 'Atomic Surveyor'));
    const copied = authoring.createDraft({
      content_kind: 'background',
      base_content_key: original.result.content_key,
    });
    if (copied.document.kind !== 'background') throw new Error('Background draft required.');
    const revised = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: { ...copied.document, name: 'Atomic Surveyor Revised' },
    });
    const preview = authoring.previewPublish({
      draft_uuid: revised.draft_uuid,
      expected_revision: revised.revision,
    });
    db.exec(
      `CREATE TEMP TRIGGER ci7_refuse_background_supersession
       BEFORE INSERT ON catalog_content_supersessions
       BEGIN SELECT RAISE(ABORT, 'CI7 injected background lineage failure'); END`,
    );
    expect(authoringError(() => authoring.commitPublish({
      token: preview.token,
      decisions: [],
    })).data).toEqual({ reason: 'publish_refused', refusal: 'commit_failed' });
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_supersessions')).toBe(0);
    expect(db.scalar<number>(
      `SELECT count(*) FROM background_definitions
       WHERE content_key = 'expanded:content.background:atomic-surveyor-revised'`,
    )).toBe(0);
    expect(authoring.readDraft(revised.draft_uuid).revision).toBe(revised.revision);
    expect(authoring.list().published).toEqual([
      expect.objectContaining({ content_key: original.result.content_key, superseded_by: null }),
    ]);
  });

});
