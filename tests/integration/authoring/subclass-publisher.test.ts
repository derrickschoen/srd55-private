import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import type {
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
  SubclassAuthoringDraftProgressionRow,
} from '../../../src/authoring/contracts';
import {
  AuthoringServiceError,
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';
import { authoringFingerprintReference } from '../../../src/authoring/species-publisher';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import {
  commitContentImport,
  planContentImport,
} from '../../../src/catalog/content-adoption';
import {
  registerContentAlias,
  rememberContentMatchDecision,
} from '../../../src/catalog/content-registry';
import { portableSubclassContentImportNode } from '../../../src/backup/portable-content';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { damageType, type CharacterLevel } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import { SourceRuleReader } from '../../../src/grants/source-rule-reader';
import { BuildReportBuilder } from '../../../src/reports/build-report-builder';
import { SavePointQueries } from '../../../src/queries/save-points';
import { SheetContentLookup } from '../../../src/rules/sheet-content-lookup';
import { attacksPerAction } from '../../../src/rules/sheet';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
let uuidSequence = 0;

afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
  uuidSequence = 0;
});

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  return db;
}

function service(db: DatabaseContext): CatalogAuthoringService {
  return new CatalogAuthoringService(db, {
    randomUuid: () => `ha5-subclass-${String(++uuidSequence)}`,
    now: () => '2042-06-10T08:09:10.000Z',
  });
}

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function emptyRows(): SubclassAuthoringDraftProgressionRow[] {
  return Array.from({ length: 20 }, (_, index) => ({
    class_level: (index + 1) as CharacterLevel,
    cantrips_known: 0,
    prepared_or_known_count: 0,
    maximum_spell_level: 0,
    slot_counts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    grants: [],
  }));
}

function validSubclass(
  created: StoredHomebrewDraft,
  name = 'Aegis Cartographer',
): SubclassAuthoringDraft {
  if (created.document.kind !== 'subclass') throw new Error('Fixture draft is not subclass.');
  return {
    ...created.document,
    name,
    rules_edition: 'expanded',
    reference_text: 'Maps defensive possibilities along the fighter timeline.',
    parent_class_content_key: '2024:class:fighter' as ContentKey,
    progression: { mode: 'inherit_parent' },
    features: [
      {
        draft_item_uuid: itemUuid(`${name}-feature-3`),
        class_level: 3,
        name: 'Aegis',
        description: 'The first mapped defense becomes available.',
        effects: [
          {
            kind: 'armor_class_bonus',
            draft_item_uuid: itemUuid(`${name}-armor-3`),
            label: 'First Aegis',
            notes: null,
            amount: 1,
          },
          {
            kind: 'damage_resistance',
            draft_item_uuid: itemUuid(`${name}-ward-3`),
            label: 'Void route',
            notes: null,
            damage_type: damageType('Void'),
          },
        ],
      },
      {
        draft_item_uuid: itemUuid(`${name}-feature-6`),
        class_level: 6,
        name: 'Second Route',
        description: 'A second defense is charted.',
        effects: [{
          kind: 'armor_class_bonus',
          draft_item_uuid: itemUuid(`${name}-armor-6`),
          label: 'Second Aegis',
          notes: null,
          amount: 2,
        }],
      },
      {
        draft_item_uuid: itemUuid(`${name}-feature-14`),
        class_level: 14,
        name: 'Aegis',
        description: 'The original defense reaches its final form.',
        effects: [{
          kind: 'armor_class_bonus',
          draft_item_uuid: itemUuid(`${name}-armor-14`),
          label: 'Final Aegis',
          notes: null,
          amount: 3,
        }],
      },
    ],
  };
}

function savedSubclass(
  authoring: CatalogAuthoringService,
  name?: string,
  transform?: (draft: SubclassAuthoringDraft) => SubclassAuthoringDraft,
): StoredHomebrewDraft {
  const created = authoring.createDraft({ content_kind: 'subclass' });
  let document = validSubclass(created, name);
  if (transform !== undefined) document = transform(document);
  return authoring.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document,
  });
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

function characterWithSubclass(
  db: DatabaseContext,
  subclassKey: ContentKey,
  level: number,
): { readonly characterId: number; readonly classId: number; readonly subclassId: number; readonly sourceId: number } {
  const characterId = db.exec("INSERT INTO characters (name) VALUES ('Aegis Walker')").lastInsertId;
  const subclassId = Number(db.scalar('SELECT id FROM subclass_definitions WHERE content_key = ?', [subclassKey]));
  const classId = Number(db.scalar(
    'SELECT class_definition_id FROM subclass_definitions WHERE id = ?',
    [subclassId],
  ));
  const update = () => new UpdateClassCommand(
    db,
    { type: 'update_class', class_definition_id: classId, subclass_definition_id: subclassId },
    new CharacterCommandIntegrity(`ha5-character-${String(level)}`),
  ).apply(characterId);
  update();
  raiseClassLevelForTest(db, characterId, classId, level);
  update();
  const sourceId = Number(db.scalar(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND source_type = 'subclass' AND state = 'active'`,
    [characterId],
  ));
  return { characterId, classId, subclassId, sourceId };
}

function fingerprintedSpellKey(db: DatabaseContext): ContentKey {
  const keys = db.allRaw('SELECT content_key FROM spell_versions ORDER BY level, content_key');
  for (const row of keys) {
    const key = String(row.content_key) as ContentKey;
    if (authoringFingerprintReference(db, 'spell', key) !== null) return key;
  }
  throw new Error('A uniquely fingerprinted spell is required.');
}

describe('HA-5 subclass publisher', () => {
  it('collects parent, dense progression, feature, duplicate, and effect errors before install', async () => {
    const db = await database();
    const authoring = service(db);
    const draft = savedSubclass(authoring, ' ', (document) => ({
      ...document,
      rules_edition: null,
      parent_class_content_key: 'expanded:missing-class' as ContentKey,
      progression: {
        mode: 'override',
        spellcasting_ability: null,
        caster_contribution: null,
        rows: [{
          class_level: 2,
          cantrips_known: null,
          prepared_or_known_count: null,
          maximum_spell_level: null,
          slot_counts: [],
          grants: [],
        }],
      },
      features: [
        {
          draft_item_uuid: itemUuid('duplicate-feature'),
          class_level: 3,
          name: 'Aegis',
          description: '',
          effects: [{
            kind: 'extra_attack',
            draft_item_uuid: itemUuid('bad-extra-attack'),
            label: '',
            notes: null,
            attack_count: null,
            weapon_scope: null,
          }],
        },
        {
          draft_item_uuid: itemUuid('second-feature'),
          class_level: 3,
          name: 'Aegis',
          description: 'Duplicate at one level.',
          effects: [],
        },
      ],
    }));
    const definitionsBefore = db.scalar<number>('SELECT count(*) FROM subclass_definitions');
    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    }));
    expect(error.data.reason).toBe('validation_failed');
    if (error.data.reason !== 'validation_failed') throw new Error('Expected validation issues.');
    expect(error.data.issues.map(({ path, code }) => ({ path, code }))).toEqual(expect.arrayContaining([
      { path: ['name'], code: 'required' },
      { path: ['rules_edition'], code: 'required' },
      { path: ['parent_class_content_key'], code: 'unresolved_reference' },
      { path: ['progression', 'caster_contribution'], code: 'required' },
      { path: ['progression', 'rows'], code: 'required' },
      { path: ['progression', 'rows', 0, 'class_level'], code: 'invalid_value' },
      { path: ['progression', 'rows', 0, 'slot_counts'], code: 'required' },
      { path: ['features', 0, 'description'], code: 'required' },
      { path: ['features', 0, 'effects', 0, 'label'], code: 'required' },
      { path: ['features', 0, 'effects', 0, 'attack_count'], code: 'required' },
      { path: ['features', 1, 'name'], code: 'duplicate' },
    ]));
    expect(db.scalar<number>('SELECT count(*) FROM subclass_definitions')).toBe(definitionsBefore);
  });

  it('rejects a parent whose registry provenance is external', async () => {
    const db = await database();
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec("UPDATE catalog_content_identities SET catalog_layer = 'external' WHERE content_key = '2024:class:fighter'");
    db.exec('PRAGMA ignore_check_constraints = OFF');
    const authoring = service(db);
    const draft = savedSubclass(authoring, 'External Parent Refusal');
    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    }));
    expect(error.data).toMatchObject({
      reason: 'validation_failed',
      issues: [expect.objectContaining({
        path: ['parent_class_content_key'],
        code: 'unresolved_reference',
      })],
    });
  });

  it('materializes the typed 20-level override and proves report, grant, and spell-access consumers', async () => {
    const db = await database();
    const authoring = service(db);
    const spellKey = fingerprintedSpellKey(db);
    const spell = db.oneRaw(
      'SELECT content_key, display_name FROM spell_versions WHERE content_key = ?',
      [spellKey],
    );
    if (spell === null) throw new Error('A fingerprinted spell is required.');
    const rows = emptyRows();
    rows[5] = {
      ...rows[5]!,
      cantrips_known: 2,
      prepared_or_known_count: 4,
      maximum_spell_level: 3,
      slot_counts: [4, 3, 3, 0, 0, 0, 0, 0, 0],
      grants: [{
        kind: 'fixed_spell',
        draft_item_uuid: itemUuid('dense-fixed-spell'),
        rule_key: 'aegis-map-spell',
        spell_content_key: String(spell.content_key) as ContentKey,
        always_prepared: true,
      }],
    };
    const draft = savedSubclass(authoring, 'Dense Aegis', (document) => ({
      ...document,
      progression: {
        mode: 'override',
        spellcasting_ability: 'intelligence',
        caster_contribution: 'third_down',
        rows,
      },
    }));
    const published = publish(authoring, draft);
    expect(published.preview.aggregate).toMatchObject({
      kind: 'subclass',
      progression: { mode: 'override', caster_contribution: 'third_down' },
    });
    if (published.preview.aggregate.kind !== 'subclass' || published.preview.aggregate.progression.mode !== 'override') {
      throw new Error('Expected subclass override.');
    }
    expect(published.preview.aggregate.progression.rows.map((row) => row.class_level))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(db.scalar<number>(
      `SELECT count(*) FROM subclass_progressions WHERE subclass_definition_id =
       (SELECT id FROM subclass_definitions WHERE content_key = ?)`,
      [published.result.content_key],
    )).toBe(20);

    const character = characterWithSubclass(db, published.result.content_key, 6);
    const reportClass = new BuildReportBuilder(db).build(character.characterId).classes[0];
    expect(reportClass).toMatchObject({
      name: 'Fighter',
      subclass: 'Dense Aegis',
      class_level: 6,
      spellcasting_ability: 'intelligence',
      progression_type: 'third_down',
      prepared_count: 4,
      max_preparable_level: 3,
    });
    expect(new SourceRuleReader(db).activeRulesForSource(character.sourceId).map((rule) => rule.ruleKey))
      .toContain('aegis-map-spell');
    expect(new SpellAccessBuilder(db).buildForCharacter(character.characterId)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        spell_name: String(spell.display_name),
        source_name: 'Dense Aegis',
        source_instance_id: character.sourceId,
        spellcasting_ability: 'intelligence',
        always_prepared: true,
      }),
    ]));
  }, 20_000);

  it('applies multiple feature effects only at levels 3, 6, and 14', async () => {
    const db = await database();
    const authoring = service(db);
    const published = publish(authoring, savedSubclass(authoring, 'Threshold Aegis'));
    const character = characterWithSubclass(db, published.result.content_key, 3);
    const generatedCount = () => Number(db.scalar(
      `SELECT count(*) FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'subclass_feature_effects:%'`,
      [character.characterId],
    ));
    expect(generatedCount()).toBe(2);
    for (const [level, count] of [[6, 3], [13, 3], [14, 4]] as const) {
      raiseClassLevelForTest(db, character.characterId, character.classId, level);
      new UpdateClassCommand(
        db,
        { type: 'update_class', class_definition_id: character.classId, subclass_definition_id: character.subclassId },
        new CharacterCommandIntegrity(`ha5-threshold-${String(level)}`),
      ).apply(character.characterId);
      expect(generatedCount(), `Fighter ${String(level)}`).toBe(count);
    }
    expect(db.allRaw(
      `SELECT feature.class_level, feature.name, feature.description,
              count(effect.id) AS effect_count
       FROM subclass_features AS feature
       LEFT JOIN subclass_feature_effects AS effect ON effect.subclass_feature_id = feature.id
       WHERE feature.subclass_definition_id = ?
       GROUP BY feature.id ORDER BY feature.sort_order`,
      [character.subclassId],
    )).toEqual([
      { class_level: 3, name: 'Aegis', description: 'The first mapped defense becomes available.', effect_count: 2 },
      { class_level: 6, name: 'Second Route', description: 'A second defense is charted.', effect_count: 1 },
      { class_level: 14, name: 'Aegis', description: 'The original defense reaches its final form.', effect_count: 1 },
    ]);
  });

  it('publishes prose plus the feature-only Extra Attack mechanic at its class threshold', async () => {
    const db = await database();
    const authoring = service(db);
    const published = publish(authoring, savedSubclass(authoring, 'Cadence College', (document) => ({
      ...document,
      parent_class_content_key: '2024:class:bard' as ContentKey,
      features: [{
        draft_item_uuid: itemUuid('cadence-feature'),
        class_level: 6,
        name: 'Measured Cadence',
        description: 'A practiced rhythm lets one Attack action carry two strikes.',
        effects: [{
          kind: 'extra_attack',
          draft_item_uuid: itemUuid('cadence-extra-attack'),
          label: 'Measured Cadence',
          notes: 'This is a total, not an additional count.',
          attack_count: 2,
          weapon_scope: 'any_weapon',
        }],
      }],
    })));
    const character = characterWithSubclass(db, published.result.content_key, 6);
    expect(attacksPerAction(new SheetContentLookup(db).forCharacter(character.characterId)))
      .toMatchObject({ count: 2, unresolved: [] });
    expect(db.oneRaw(
      `SELECT feature.description, effect.effect_kind, effect.attack_count,
              effect.weapon_scope, effect.notes
       FROM subclass_features AS feature
       JOIN subclass_feature_effects AS effect ON effect.subclass_feature_id = feature.id
       WHERE feature.subclass_definition_id = ?`,
      [character.subclassId],
    )).toEqual({
      description: 'A practiced rhythm lets one Attack action carry two strikes.',
      effect_kind: 'extra_attack',
      attack_count: 2,
      weapon_scope: 'any_weapon',
      notes: 'This is a total, not an additional count.',
    });
  });

  it('silently self-matches byte-identical external subclasses without receipts or duplicate children', async () => {
    const db = await database();
    const authoring = service(db);
    const first = publish(authoring, savedSubclass(authoring, 'Mirror Aegis'));
    const counts = db.oneRaw(
      `SELECT
         (SELECT count(*) FROM subclass_definitions WHERE content_key = ?) AS definitions,
         (SELECT count(*) FROM subclass_features WHERE subclass_definition_id =
           (SELECT id FROM subclass_definitions WHERE content_key = ?)) AS features,
         (SELECT count(*) FROM subclass_feature_effects WHERE subclass_feature_id IN
           (SELECT id FROM subclass_features WHERE subclass_definition_id =
             (SELECT id FROM subclass_definitions WHERE content_key = ?))) AS effects,
         (SELECT count(*) FROM catalog_content_match_decisions WHERE target_content_key = ?) AS receipts`,
      [first.result.content_key, first.result.content_key, first.result.content_key, first.result.content_key],
    );
    for (const suffix of ['second', 'third']) {
      const draft = savedSubclass(authoring, 'Mirror Aegis', (document) => ({ ...document, reference_text: `${document.reference_text}` }));
      const preview = authoring.previewPublish({ draft_uuid: draft.draft_uuid, expected_revision: draft.revision });
      expect(preview.review, suffix).toEqual([]);
      expect(authoring.commitPublish({ token: preview.token, decisions: [] })).toMatchObject({
        outcome: 'matched_existing',
        content_key: first.result.content_key,
        catalog_layer: 'external',
      });
      expect(db.oneRaw(
        `SELECT
           (SELECT count(*) FROM subclass_definitions WHERE content_key = ?) AS definitions,
           (SELECT count(*) FROM subclass_features WHERE subclass_definition_id =
             (SELECT id FROM subclass_definitions WHERE content_key = ?)) AS features,
           (SELECT count(*) FROM subclass_feature_effects WHERE subclass_feature_id IN
             (SELECT id FROM subclass_features WHERE subclass_definition_id =
               (SELECT id FROM subclass_definitions WHERE content_key = ?))) AS effects,
           (SELECT count(*) FROM catalog_content_match_decisions WHERE target_content_key = ?) AS receipts`,
        [first.result.content_key, first.result.content_key, first.result.content_key, first.result.content_key],
      )).toEqual(counts);
    }
  });

  it('routes raw subclass metadata drift through review despite byte-identical mechanics', async () => {
    const db = await database();
    const authoring = service(db);
    const first = publish(authoring, savedSubclass(authoring, 'Metadata Aegis'));
    const incoming = savedSubclass(authoring, 'METADATA AEGIS');
    const preview = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(preview.review).toEqual([{
      candidate_content_key: first.result.content_key,
      candidate_name: 'Metadata Aegis',
      reason: 'metadata-conflict',
      default_decision: 'match',
    }]);
    expect(authoringError(() => authoring.commitPublish({
      token: preview.token,
      decisions: [],
    })).data).toEqual({
      reason: 'publish_review_required',
      candidates: [first.result.content_key],
    });
  });

  it('pins draft-to-projector bytes and the asserted normalized key', async () => {
    const db = await database();
    const authoring = service(db);
    const draft = savedSubclass(authoring, 'Projector Aegis');
    const preview = authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    });
    const parent = authoringFingerprintReference(db, 'class', '2024:class:fighter' as ContentKey);
    if (parent === null) throw new Error('Bundled Fighter fingerprint is missing.');
    expect(preview.facts.canonical_json).toBe(
      `{"edition":"expanded","kind":"subclass","normalizedName":"projectoraegis","payload":{"features":[{"class_level":3,"description":"The first mapped defense becomes available.","effects":[{"amount":1,"kind":"armor_class_bonus","label":"First Aegis","notes":null},{"damage_type":"Void","kind":"damage_resistance","label":"Void route","notes":null}],"name":"Aegis"},{"class_level":6,"description":"A second defense is charted.","effects":[{"amount":2,"kind":"armor_class_bonus","label":"Second Aegis","notes":null}],"name":"Second Route"},{"class_level":14,"description":"The original defense reaches its final form.","effects":[{"amount":3,"kind":"armor_class_bonus","label":"Final Aegis","notes":null}],"name":"Aegis"}],"grants":[],"parent_class":{"digest":"${parent.digest}","kind":"class","scheme":"content-v1"},"progression":{"mode":"inherit_parent"},"reference_text":"Maps defensive possibilities along the fighter timeline."},"scheme":"content-v1"}`,
    );
    expect(preview.facts.candidate_content_keys).toEqual([
      'expanded:content.subclass:projector-aegis',
    ]);
  });

  it('keeps remembered alias decisions review-gated and commits an explicit Match', async () => {
    const db = await database();
    const authoring = service(db);
    const incoming = savedSubclass(authoring, 'Explicit Match Aegis');
    const initial = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    if (initial.aggregate.kind !== 'subclass') throw new Error('Preview aggregate is not subclass.');
    const targetKey = 'expanded:alternate.owner:explicit-match-aegis' as ContentKey;
    const targetNode = portableSubclassContentImportNode(db, initial.aggregate, targetKey);
    const targetPlan = planContentImport(db, [targetNode]);
    expect(commitContentImport(db, { nodes: [targetNode], token: targetPlan.token }).kind)
      .toBe('committed');
    registerContentAlias(db, {
      kind: 'subclass',
      aliasKey: assertedExternalContentKey('subclass', 'expanded', 'Explicit Match Aegis'),
      contentKey: targetKey,
      aliasKind: 'declared-legacy',
    });
    const preview = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(preview.review).toEqual([{
      candidate_content_key: targetKey,
      candidate_name: 'Explicit Match Aegis',
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
      name: 'Explicit Match Aegis',
      catalog_layer: 'external',
      previous_key_usage_count: 0,
    });
    expect(() => authoring.readDraft(incoming.draft_uuid)).toThrow(AuthoringServiceError);
    expect(db.scalar<number>(
      'SELECT count(*) FROM catalog_content_match_decisions WHERE target_content_key = ?',
      [targetKey],
    )).toBe(1);
  });

  it('rolls back registry, progression, features, effects, and draft deletion on the last step', async () => {
    const db = await database();
    const authoring = service(db);
    const draft = savedSubclass(authoring, 'Rollback Aegis');
    const preview = authoring.previewPublish({ draft_uuid: draft.draft_uuid, expected_revision: draft.revision });
    db.exec(
      `CREATE TEMP TRIGGER ha5_refuse_draft_delete
       BEFORE DELETE ON catalog_content_drafts
       WHEN OLD.draft_uuid = '${draft.draft_uuid}'
       BEGIN SELECT RAISE(ABORT, 'ha5 last-step rollback'); END`,
    );
    const error = authoringError(() => authoring.commitPublish({ token: preview.token, decisions: [] }));
    expect(error.data).toEqual({ reason: 'publish_refused', refusal: 'commit_failed' });
    const key = assertedExternalContentKey('subclass', 'expanded', 'Rollback Aegis');
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities WHERE content_key = ?', [key])).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM subclass_definitions WHERE content_key = ?', [key])).toBe(0);
    expect(authoring.readDraft(draft.draft_uuid).revision).toBe(draft.revision);
  });

  it('rebinds current and save-point subclass effect refs to target-local ids and notices modified payloads', async () => {
    const source = await database();
    const sourceAuthoring = service(source);
    const published = publish(sourceAuthoring, savedSubclass(sourceAuthoring, 'Portable Aegis'));
    const character = characterWithSubclass(source, published.result.content_key, 6);
    new SavePointQueries(source, undefined, () => '2042-06-10T00:00:00.000Z')
      .create(character.characterId, 'Subclass effects before export');
    const sourceRefs = source.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'subclass_feature_effects:%'
       ORDER BY sort_order`,
      [character.characterId],
    ).map((row) => String(row.template_ref));
    const document = exportCharacterBackup(source, character.characterId, '2042-06-10T00:00:00.000Z');

    const target = await database();
    const targetAuthoring = service(target);
    publish(targetAuthoring, savedSubclass(targetAuthoring, 'Target Id Offset'));
    const plan = planCharacterBackupImport(target, document);
    const committed = commitCharacterBackupImport(target, document, plan.token);
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    expect(committed.result.notices).toEqual([]);
    const targetRefs = target.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'subclass_feature_effects:%'
       ORDER BY sort_order`,
      [committed.result.characterId],
    ).map((row) => String(row.template_ref));
    expect(targetRefs).toHaveLength(3);
    expect(targetRefs.every((reference) => !sourceRefs.includes(reference))).toBe(true);
    expect(targetRefs).toEqual(target.allRaw(
      `SELECT 'subclass_feature_effects:' || effect.id AS template_ref
       FROM subclass_feature_effects AS effect
       JOIN subclass_features AS feature ON feature.id = effect.subclass_feature_id
       JOIN subclass_definitions AS subclass ON subclass.id = feature.subclass_definition_id
       WHERE subclass.content_key = ? AND feature.class_level <= 6
       ORDER BY feature.sort_order, effect.sort_order`,
      [published.result.content_key],
    ).map((row) => String(row.template_ref)));
    const snapshot = target.scalar<string>(
      'SELECT snapshot FROM character_save_points WHERE character_id = ?',
      [committed.result.characterId],
    );
    if (snapshot === null) throw new Error('Imported save point is missing.');
    const saved = JSON.parse(snapshot) as { character_effects: Array<{ readonly template_ref: string | null }> };
    expect(saved.character_effects.map((row) => row.template_ref).filter((value): value is string =>
      value?.startsWith('subclass_feature_effects:') === true)).toEqual(targetRefs);

    const altered = characterWithSubclass(source, published.result.content_key, 3);
    source.exec(
      `UPDATE character_effects SET amount = 99
       WHERE id = (
         SELECT min(id) FROM character_effects
         WHERE character_id = ? AND template_ref LIKE 'subclass_feature_effects:%'
       )`,
      [altered.characterId],
    );
    const alteredDocument = exportCharacterBackup(source, altered.characterId, '2042-06-10T00:00:01.000Z');
    const alteredTarget = await database();
    const alteredPlan = planCharacterBackupImport(alteredTarget, alteredDocument);
    const alteredCommit = commitCharacterBackupImport(alteredTarget, alteredDocument, alteredPlan.token);
    expect(alteredCommit.kind).toBe('committed');
    if (alteredCommit.kind !== 'committed') throw new Error('Altered import did not commit.');
    expect(alteredCommit.result.notices).toEqual([
      expect.objectContaining({
        kind: 'subclass_effect_template_ref_unresolved',
        effect: expect.objectContaining({ label: 'First Aegis', effectKind: 'armor_class_bonus' }),
        subclass: { contentKey: published.result.content_key, name: 'Portable Aegis' },
      }),
    ]);
    expect(alteredTarget.oneRaw(
      `SELECT amount, template_ref FROM character_effects
       WHERE character_id = ? AND amount = 99`,
      [alteredCommit.result.characterId],
    )).toEqual({ amount: 99, template_ref: null });
  // Measured alone at 2.46s on 2026-08-06; two full backup imports are intentional.
  }, 20_000);
});
