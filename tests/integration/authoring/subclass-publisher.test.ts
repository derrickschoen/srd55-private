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
import { HomebrewArchiveSetService } from '../../../src/authoring/archive-set-lifecycle';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';
import { authoringFingerprintReference } from '../../../src/authoring/species-publisher';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import {
  CatalogSupersessionRefusal,
  recordSupersession,
  SUPERSESSION_SUCCESSOR_LAYER_REFUSAL,
} from '../../../src/catalog/authoring-lifecycle';
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
import type { CharacterId, ContentKey } from '../../../src/domain/ids';
import { SourceRuleReader } from '../../../src/grants/source-rule-reader';
import { BuildReportBuilder } from '../../../src/reports/build-report-builder';
import { SavePointQueries } from '../../../src/queries/save-points';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { SpellSelectionService } from '../../../src/eligibility/spell-selection-service';
import { eligibilityInvalidReasons } from '../../../src/eligibility/spell-selection-eligibility';
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

function thirdCasterRows(): SubclassAuthoringDraftProgressionRow[] {
  return emptyRows().map((row, index) => {
    const level = index + 1;
    if (level < 3) return row;
    if (level < 4) return {
      ...row,
      cantrips_known: 2,
      prepared_or_known_count: 3,
      maximum_spell_level: 1,
      slot_counts: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    if (level < 5) return {
      ...row,
      cantrips_known: 2,
      prepared_or_known_count: 4,
      maximum_spell_level: 1,
      slot_counts: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    if (level < 7) return {
      ...row,
      cantrips_known: 2,
      prepared_or_known_count: 4,
      maximum_spell_level: 1,
      slot_counts: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    return {
      ...row,
      cantrips_known: 2,
      prepared_or_known_count: 5,
      maximum_spell_level: 2,
      slot_counts: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    };
  });
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

function expectScheduleRefusal(
  authoring: CatalogAuthoringService,
  draft: StoredHomebrewDraft,
  path: readonly (string | number)[],
  message: string,
): void {
  const previewError = authoringError(() => authoring.previewPublish({
    draft_uuid: draft.draft_uuid,
    expected_revision: draft.revision,
  }));
  expect(previewError.data).toMatchObject({ reason: 'validation_failed' });
  if (previewError.data.reason !== 'validation_failed') {
    throw new Error('Expected collected schedule validation issues.');
  }
  expect(previewError.data.issues).toContainEqual({ path, code: 'invalid_value', message });
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

function installPublishedRootOnlySubclass(
  db: DatabaseContext,
  authoring: CatalogAuthoringService,
  name: string,
): ContentKey {
  const draft = savedSubclass(authoring, name);
  const preview = authoring.previewPublish({
    draft_uuid: draft.draft_uuid,
    expected_revision: draft.revision,
  });
  if (preview.aggregate.kind !== 'subclass') throw new Error('Subclass aggregate is required.');
  const contentKey = assertedExternalContentKey('subclass', 'expanded', name);
  const node = portableSubclassContentImportNode(db, {
    ...preview.aggregate,
    progression: {
      mode: 'root_only',
      spellcasting_ability: 'intelligence',
      caster_fraction: '1/3',
      caster_rounding: 'down',
    },
  }, contentKey);
  const plan = planContentImport(db, [node]);
  const committed = commitContentImport(db, { nodes: [node], token: plan.token });
  if (committed.kind !== 'committed') throw new Error('Root-only subclass fixture did not install.');
  return contentKey;
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

  it('refuses fresh root_only third-caster spellcasting without a dense progression', async () => {
    const db = await database();
    const authoring = service(db);
    const draft = savedSubclass(authoring, 'Sparse Third Caster', (document) => ({
      ...document,
      progression: {
        mode: 'root_only',
        spellcasting_ability: 'intelligence',
        caster_fraction: '1/3',
        caster_rounding: 'down',
      },
    }));
    expect(authoringError(() => authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    })).data).toMatchObject({
      reason: 'validation_failed',
      issues: [{ path: ['progression'], code: 'invalid_value' }],
    });
  });

  it('refuses a spellcasting-ability override on a copied root_only progression', async () => {
    const db = await database();
    const authoring = service(db);
    const baseKey = installPublishedRootOnlySubclass(db, authoring, 'Copied Root Ward');
    const copied = authoring.createDraft({ content_kind: 'subclass', base_content_key: baseKey });
    if (copied.document.kind !== 'subclass' || copied.document.progression.mode !== 'root_only') {
      throw new Error('A copied root-only subclass is required.');
    }
    const changed = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: {
        ...copied.document,
        progression: {
          ...copied.document.progression,
          spellcasting_ability: copied.document.progression.spellcasting_ability === 'charisma'
            ? 'wisdom'
            : 'charisma',
        },
      },
    });
    expect(authoringError(() => authoring.previewPublish({
      draft_uuid: changed.draft_uuid,
      expected_revision: changed.revision,
    })).data).toMatchObject({
      reason: 'validation_failed',
      issues: [{ path: ['progression'], code: 'invalid_value' }],
    });
  });

  it('round-trips an unchanged copy-from-published root_only progression', async () => {
    const db = await database();
    const authoring = service(db);
    const baseKey = installPublishedRootOnlySubclass(db, authoring, 'Round Trip Root Ward');
    const copied = authoring.createDraft({ content_kind: 'subclass', base_content_key: baseKey });
    const preview = authoring.previewPublish({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
    });
    expect(preview.aggregate).toMatchObject({
      kind: 'subclass',
      progression: { mode: 'root_only' },
    });
    expect(preview.review).toEqual([]);
    expect(authoring.commitPublish({
      token: preview.token,
      decisions: [],
    })).toMatchObject({
      outcome: 'matched_existing',
      content_key: baseKey,
    });
  });

  it('collects a decreasing-slot issue in preview and refuses commit through the real publisher', async () => {
    const db = await database();
    const authoring = service(db);
    const valid = savedSubclass(authoring, 'Decreasing Slot Refusal', (document) => ({
      ...document,
      progression: {
        mode: 'override',
        spellcasting_ability: 'intelligence',
        caster_contribution: 'third_down',
        rows: thirdCasterRows(),
      },
    }));
    const token = authoring.previewPublish({
      draft_uuid: valid.draft_uuid,
      expected_revision: valid.revision,
    }).token;
    if (valid.document.kind !== 'subclass' || valid.document.progression.mode !== 'override') {
      throw new Error('Dense subclass fixture is required.');
    }
    const rows = [...valid.document.progression.rows];
    rows[3] = { ...rows[3]!, slot_counts: [1, 0, 0, 0, 0, 0, 0, 0, 0] };
    const invalid = authoring.saveDraft({
      draft_uuid: valid.draft_uuid,
      expected_revision: valid.revision,
      document: { ...valid.document, progression: { ...valid.document.progression, rows } },
    });
    const issue = {
      path: ['progression', 'rows', 3, 'slot_counts'] as const,
      message: '1-level spell slots cannot decrease at class level 4.',
    };
    expectScheduleRefusal(authoring, invalid, issue.path, issue.message);
    expect(authoringError(() => authoring.commitPublish({ token, decisions: [] })).data)
      .toMatchObject({ reason: 'validation_failed', issues: [expect.objectContaining(issue)] });
  });

  it('collects a slot-level gap issue in preview and refuses commit through the real publisher', async () => {
    const db = await database();
    const authoring = service(db);
    const valid = savedSubclass(authoring, 'Slot Gap Refusal', (document) => ({
      ...document,
      progression: {
        mode: 'override',
        spellcasting_ability: 'intelligence',
        caster_contribution: 'third_down',
        rows: thirdCasterRows(),
      },
    }));
    const token = authoring.previewPublish({
      draft_uuid: valid.draft_uuid,
      expected_revision: valid.revision,
    }).token;
    if (valid.document.kind !== 'subclass' || valid.document.progression.mode !== 'override') {
      throw new Error('Dense subclass fixture is required.');
    }
    const rows = valid.document.progression.rows.map((row, index) => index < 6 ? row : {
      ...row,
      maximum_spell_level: 3,
      slot_counts: [4, 0, 2, 0, 0, 0, 0, 0, 0],
    });
    const invalid = authoring.saveDraft({
      draft_uuid: valid.draft_uuid,
      expected_revision: valid.revision,
      document: { ...valid.document, progression: { ...valid.document.progression, rows } },
    });
    const issue = {
      path: ['progression', 'rows', 6, 'slot_counts'] as const,
      message: 'Class level 7 slot levels must be contiguous through level 3.',
    };
    expectScheduleRefusal(authoring, invalid, issue.path, issue.message);
    expect(authoringError(() => authoring.commitPublish({ token, decisions: [] })).data)
      .toMatchObject({ reason: 'validation_failed', issues: expect.arrayContaining([expect.objectContaining(issue)]) });
  });

  it('collects a maximum-slot mismatch in preview and refuses commit through the real publisher', async () => {
    const db = await database();
    const authoring = service(db);
    const valid = savedSubclass(authoring, 'Maximum Slot Refusal', (document) => ({
      ...document,
      progression: {
        mode: 'override',
        spellcasting_ability: 'intelligence',
        caster_contribution: 'third_down',
        rows: thirdCasterRows(),
      },
    }));
    const token = authoring.previewPublish({
      draft_uuid: valid.draft_uuid,
      expected_revision: valid.revision,
    }).token;
    if (valid.document.kind !== 'subclass' || valid.document.progression.mode !== 'override') {
      throw new Error('Dense subclass fixture is required.');
    }
    const rows = [...valid.document.progression.rows];
    rows[19] = { ...rows[19]!, maximum_spell_level: 3 };
    const invalid = authoring.saveDraft({
      draft_uuid: valid.draft_uuid,
      expected_revision: valid.revision,
      document: { ...valid.document, progression: { ...valid.document.progression, rows } },
    });
    const issue = {
      path: ['progression', 'rows', 19, 'slot_counts'] as const,
      message: 'Class level 20 maximum spell level must match its highest non-zero slot level.',
    };
    expectScheduleRefusal(authoring, invalid, issue.path, issue.message);
    expect(authoringError(() => authoring.commitPublish({ token, decisions: [] })).data)
      .toMatchObject({ reason: 'validation_failed', issues: [expect.objectContaining(issue)] });
  });

  it('publishes a plateaued third-caster schedule whose slots begin at class level 3', async () => {
    const db = await database();
    const authoring = service(db);
    const published = publish(authoring, savedSubclass(authoring, 'Plateau Third Caster', (document) => ({
      ...document,
      progression: {
        mode: 'override',
        spellcasting_ability: 'intelligence',
        caster_contribution: 'third_down',
        rows: thirdCasterRows(),
      },
    })));
    expect(published.result).toMatchObject({ outcome: 'created', name: 'Plateau Third Caster' });
    if (published.preview.aggregate.kind !== 'subclass' || published.preview.aggregate.progression.mode !== 'override') {
      throw new Error('Published dense subclass fixture is required.');
    }
    expect(published.preview.aggregate.progression.rows.slice(0, 7).map((row) => row.slot_counts))
      .toEqual([
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [2, 0, 0, 0, 0, 0, 0, 0, 0],
        [3, 0, 0, 0, 0, 0, 0, 0, 0],
        [3, 0, 0, 0, 0, 0, 0, 0, 0],
        [3, 0, 0, 0, 0, 0, 0, 0, 0],
        [4, 2, 0, 0, 0, 0, 0, 0, 0],
      ]);
  });

  it('publishes list-choice minimums while omitted historical fields retain level zero', async () => {
    const db = await database();
    const authoring = service(db);
    const rows = thirdCasterRows();
    rows[2] = {
      ...rows[2]!,
      grants: [{
        kind: 'choice_from_list',
        draft_item_uuid: itemUuid('legacy-list-choice'),
        rule_key: 'legacy-list-choice',
        list: 'Wizard',
        count: 1,
        maximum_spell_level: 1,
      }, {
        kind: 'choice_from_list',
        draft_item_uuid: itemUuid('leveled-list-choice'),
        rule_key: 'leveled-list-choice',
        list: 'Wizard',
        count: 1,
        minimum_spell_level: 1,
        maximum_spell_level: 1,
      }],
    };
    const published = publish(authoring, savedSubclass(
      authoring,
      'List Choice Minimums',
      (document) => ({
        ...document,
        progression: {
          mode: 'override',
          spellcasting_ability: 'intelligence',
          caster_contribution: 'third_down',
          rows,
        },
      }),
    ));
    if (published.result.outcome === 'matched_existing') {
      throw new Error('Expected a newly published subclass.');
    }
    const character = characterWithSubclass(db, published.result.content_key, 3);
    const slots = db.allRaw(
      `SELECT id, rule_key, spell_level_min, spell_level_max
       FROM spell_selection_slots
       WHERE character_id = ? AND rule_key IN (?, ?)
       ORDER BY rule_key`,
      [character.characterId, 'legacy-list-choice', 'leveled-list-choice'],
    );
    expect(slots).toEqual([{
      id: expect.any(Number),
      rule_key: 'legacy-list-choice',
      spell_level_min: 0,
      spell_level_max: 1,
    }, {
      id: expect.any(Number),
      rule_key: 'leveled-list-choice',
      spell_level_min: 1,
      spell_level_max: 1,
    }]);

    const mageHand = db.scalar<number>(
      "SELECT id FROM spell_versions WHERE display_name = 'Mage Hand' AND rules_edition = '2024'",
    );
    const shield = db.scalar<number>(
      "SELECT id FROM spell_versions WHERE display_name = 'Shield' AND rules_edition = '2024'",
    );
    if (mageHand === null || shield === null) throw new Error('Seeded spell fixtures are missing.');
    const selection = new SpellSelectionService(db);
    selection.select(Number(slots[0]!.id), mageHand);
    expect(() => selection.select(Number(slots[1]!.id), mageHand))
      .toThrow(eligibilityInvalidReasons.level);
    selection.select(Number(slots[1]!.id), shield);
  });

  it('refuses an inverted list-choice level window at the shared publication boundary', async () => {
    const db = await database();
    const authoring = service(db);
    const rows = thirdCasterRows();
    rows[2] = {
      ...rows[2]!,
      grants: [{
        kind: 'choice_from_list',
        draft_item_uuid: itemUuid('inverted-list-choice'),
        rule_key: 'inverted-list-choice',
        list: 'Wizard',
        count: 1,
        minimum_spell_level: 2,
        maximum_spell_level: 1,
      }],
    };
    const draft = savedSubclass(authoring, 'Inverted List Choice', (document) => ({
      ...document,
      progression: {
        mode: 'override',
        spellcasting_ability: 'intelligence',
        caster_contribution: 'third_down',
        rows,
      },
    }));

    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    }));
    expect(error.data).toMatchObject({
      reason: 'validation_failed',
      issues: [expect.objectContaining({
        path: ['progression', 'rows', 2, 'grants', 0, 'maximum_spell_level'],
        code: 'out_of_range',
        message: 'Maximum spell level must not be below the minimum.',
      })],
    });
  });

  it('materializes the typed 20-level override and reports level 7 slots as 4/2', async () => {
    const db = await database();
    const authoring = service(db);
    const spellKey = fingerprintedSpellKey(db);
    const spell = db.oneRaw(
      'SELECT content_key, display_name FROM spell_versions WHERE content_key = ?',
      [spellKey],
    );
    if (spell === null) throw new Error('A fingerprinted spell is required.');
    const rows = thirdCasterRows();
    rows[6] = {
      ...rows[6]!,
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

    const character = characterWithSubclass(db, published.result.content_key, 7);
    const report = new BuildReportBuilder(db).build(character.characterId);
    const reportClass = report.classes[0];
    expect(reportClass).toMatchObject({
      name: 'Fighter',
      subclass: 'Dense Aegis',
      class_level: 7,
      spellcasting_ability: 'intelligence',
      progression_type: 'third_down',
      prepared_count: 5,
      max_preparable_level: 2,
    });
    expect(report.caster.slots, 'level 7 authored third-caster slots are 4 first-level and 2 second-level')
      .toEqual([{ level: 1, count: 4 }, { level: 2, count: 2 }]);
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

  it('applies authored resistance and attack mechanics only at levels 3, 6, and 14', async () => {
    const db = await database();
    const authoring = service(db);
    const published = publish(authoring, savedSubclass(authoring, 'Threshold Aegis', (document) => ({
      ...document,
      parent_class_content_key: '2024:class:bard' as ContentKey,
      features: document.features.map((feature) => {
        if (feature.class_level !== 6 && feature.class_level !== 14) return feature;
        return {
          ...feature,
          effects: [{
            kind: 'extra_attack' as const,
            draft_item_uuid: itemUuid(`threshold-attack-${String(feature.class_level)}`),
            label: feature.name,
            notes: null,
            attack_count: feature.class_level === 6 ? 2 : 3,
            weapon_scope: 'any_weapon' as const,
          }],
        };
      }),
    })));
    const character = characterWithSubclass(db, published.result.content_key, 3);
    const sheet = () => new CharacterSheetBuilder(db).build(character.characterId);
    expect(sheet()).toMatchObject({
      attacks_per_action: { count: 1, unresolved: [] },
      damage_resistances: ['Void'],
    });
    for (const [level, attackCount] of [[6, 2], [13, 2], [14, 3]] as const) {
      raiseClassLevelForTest(db, character.characterId, character.classId, level);
      new UpdateClassCommand(
        db,
        { type: 'update_class', class_definition_id: character.classId, subclass_definition_id: character.subclassId },
        new CharacterCommandIntegrity(`ha5-threshold-${String(level)}`),
      ).apply(character.characterId);
      expect(sheet(), `Bard ${String(level)}`).toMatchObject({
        attacks_per_action: { count: attackCount, unresolved: [] },
        damage_resistances: ['Void'],
      });
    }
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
      candidate_catalog_layer: 'external',
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

  it('binds divergent-Match identical effect payloads to their correct subclass features', async () => {
    const identicalFeatureEffects = (document: SubclassAuthoringDraft): SubclassAuthoringDraft => ({
      ...document,
      features: [
        {
          draft_item_uuid: itemUuid('shared-first-feature'),
          class_level: 3,
          name: 'First Shared Ward',
          description: 'The first feature carries the shared effect.',
          effects: [{
            kind: 'armor_class_bonus',
            draft_item_uuid: itemUuid('shared-first-effect'),
            label: 'Shared ward',
            notes: null,
            amount: 1,
          }],
        },
        {
          draft_item_uuid: itemUuid('shared-second-feature'),
          class_level: 6,
          name: 'Second Shared Ward',
          description: 'The second feature carries the same effect.',
          effects: [{
            kind: 'armor_class_bonus',
            draft_item_uuid: itemUuid('shared-second-effect'),
            label: 'Shared ward',
            notes: null,
            amount: 1,
          }],
        },
      ],
    });
    const source = await database();
    const sourceAuthoring = service(source);
    const published = publish(sourceAuthoring, savedSubclass(
      sourceAuthoring,
      'Divergent Feature Aegis',
      identicalFeatureEffects,
    ));
    const character = characterWithSubclass(source, published.result.content_key, 6);
    const document = exportCharacterBackup(source, character.characterId, '2042-06-10T00:00:00.000Z');

    const target = await database();
    const targetAuthoring = service(target);
    publish(targetAuthoring, savedSubclass(
      targetAuthoring,
      'Divergent Feature Aegis',
      (draft) => ({
        ...identicalFeatureEffects(draft),
        reference_text: 'A deliberately divergent local revision.',
      }),
    ));
    const plan = planCharacterBackupImport(target, document);
    expect(plan.reviews).toEqual([
      expect.objectContaining({
        kind: 'subclass',
        targetContentKey: published.result.content_key,
        matchClass: 'key-collision',
      }),
    ]);
    const committed = commitCharacterBackupImport(
      target,
      document,
      plan.token,
      Object.fromEntries(plan.reviews.map((review) => [
        review.id,
        { decision: 'match' as const },
      ])),
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    expect(committed.result.notices).toEqual([]);
    const targetFeatureRefs = target.allRaw(
      `SELECT feature.name,
              'subclass_feature_effects:' || effect.id AS template_ref
       FROM subclass_feature_effects AS effect
       JOIN subclass_features AS feature ON feature.id = effect.subclass_feature_id
       JOIN subclass_definitions AS subclass ON subclass.id = feature.subclass_definition_id
       WHERE subclass.content_key = ?
       ORDER BY feature.sort_order, effect.sort_order`,
      [published.result.content_key],
    );
    expect(targetFeatureRefs.map((row) => row.name)).toEqual([
      'First Shared Ward',
      'Second Shared Ward',
    ]);
    expect(target.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND label = 'Shared ward'
       ORDER BY sort_order`,
      [committed.result.characterId],
    ).map((row) => row.template_ref)).toEqual(
      targetFeatureRefs.map((row) => row.template_ref),
    );
  }, 20_000);

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

  it('imports numeric legacy subclass refs as null with typed notices in current and save-point paths', async () => {
    const source = await database();
    const sourceAuthoring = service(source);
    const published = publish(sourceAuthoring, savedSubclass(sourceAuthoring, 'Numeric Ref Aegis'));
    const character = characterWithSubclass(source, published.result.content_key, 3);
    new SavePointQueries(source, undefined, () => '2042-06-10T00:00:00.000Z')
      .create(character.characterId, 'Numeric subclass refs before export');
    const exported = exportCharacterBackup(source, character.characterId, '2042-06-10T00:00:00.000Z');
    let currentReplaced = false;
    let savePointReplaced = false;
    const document = {
      ...exported,
      tables: {
        ...exported.tables,
        character_effects: exported.tables.character_effects.map((row) => {
          if (!currentReplaced && row.label === 'First Aegis') {
            currentReplaced = true;
            return { ...row, template_ref: 9001 };
          }
          return row;
        }),
        character_save_points: exported.tables.character_save_points.map((row) => {
          const snapshot = JSON.parse(String(row.snapshot)) as {
            character_effects: Array<Record<string, unknown>>;
            readonly [table: string]: unknown;
          };
          return {
            ...row,
            snapshot: JSON.stringify({
              ...snapshot,
              character_effects: snapshot.character_effects.map((effect) => {
                if (!savePointReplaced && effect.label === 'First Aegis') {
                  savePointReplaced = true;
                  return { ...effect, template_ref: 9002 };
                }
                return effect;
              }),
            }),
          };
        }),
      },
    };
    expect({ currentReplaced, savePointReplaced }).toEqual({
      currentReplaced: true,
      savePointReplaced: true,
    });

    const target = await database();
    const plan = planCharacterBackupImport(target, document);
    const committed = commitCharacterBackupImport(target, document, plan.token);
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    expect(committed.result.notices).toHaveLength(2);
    expect(committed.result.notices).toEqual(expect.arrayContaining([
      {
        kind: 'subclass_effect_template_ref_unresolved',
        effect: {
          templateRef: '9001',
          label: 'First Aegis',
          effectKind: 'armor_class_bonus',
        },
        subclass: {
          contentKey: published.result.content_key,
          name: 'Numeric Ref Aegis',
        },
      },
      {
        kind: 'subclass_effect_template_ref_unresolved',
        effect: {
          templateRef: '9002',
          label: 'First Aegis',
          effectKind: 'armor_class_bonus',
        },
        subclass: {
          contentKey: published.result.content_key,
          name: 'Numeric Ref Aegis',
        },
      },
    ]));
    expect(target.scalar<string>(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND label = 'First Aegis'`,
      [committed.result.characterId],
    )).toBeNull();
    const savedSnapshot = target.scalar<string>(
      'SELECT snapshot FROM character_save_points WHERE character_id = ?',
      [committed.result.characterId],
    );
    if (savedSnapshot === null) throw new Error('Imported save point is missing.');
    const saved = JSON.parse(savedSnapshot) as {
      character_effects: Array<{ readonly label: string; readonly template_ref: string | null }>;
    };
    expect(saved.character_effects.find((effect) => effect.label === 'First Aegis')?.template_ref)
      .toBeNull();
  }, 20_000);

  it('versions subclass lineage without changing an existing character', async () => {
    const db = await database();
    const authoring = service(db);
    const original = publish(authoring, savedSubclass(authoring, 'Versioned Aegis'));
    const character = characterWithSubclass(db, original.result.content_key, 3);
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount, source_instance_id,
         template_ref, label
       ) VALUES (?, 99, 'armor_class_bonus', 9, ?, NULL, 'Manual Aegis note')`,
      [character.characterId, character.sourceId],
    );
    const copied = authoring.createDraft({
      content_kind: 'subclass',
      base_content_key: original.result.content_key,
    });
    if (copied.document.kind !== 'subclass') throw new Error('Subclass draft required.');
    const revised = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: {
        ...copied.document,
        name: 'Versioned Aegis Revised',
        features: copied.document.features.map((feature, index) =>
          index === 0 ? { ...feature, description: 'Revised mapped defense.' } : feature),
      },
    });
    const successor = publish(authoring, revised);

    expect(successor.result).toMatchObject({ outcome: 'created', previous_key_usage_count: 1 });
    expect(authoring.usages(original.result.content_key).usages).toHaveLength(1);
    expect(authoring.usages(successor.result.content_key).usages).toHaveLength(0);
    expect(db.scalar<string>(
      `SELECT subclass.content_key
       FROM character_class_levels AS level
       JOIN subclass_definitions AS subclass ON subclass.id = level.subclass_definition_id
       WHERE level.character_id = ?`,
      [character.characterId],
    )).toBe(original.result.content_key);
    expect(db.oneRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key
       FROM catalog_content_supersessions`,
    )).toEqual({
      content_kind: 'subclass',
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
      character_id: character.characterId as CharacterId,
    });
    expect(replacement.review).toEqual([
      {
        candidate_content_key: 'expanded:content.subclass:versioned-aegis-revised',
        candidate_name: 'Versioned Aegis Revised',
        candidate_catalog_layer: 'external',
        reason: 'installed-target',
        default_decision: 'match',
        clone_name: 'Versioned Aegis Revised (Private copy)',
      },
    ]);
    db.exec(
      'UPDATE catalog_content_identities SET archived_at = ? WHERE content_key = ?',
      ['2042-08-12T13:14:15.000Z', successor.result.content_key],
    );
    expect(authoringError(() => authoring.commitReplacement({
      token: replacement.token,
      decisions: [{
        candidate_content_key: successor.result.content_key,
        decision: 'match',
      }],
      choices: [],
    })).data).toEqual({
      reason: 'replacement_refused',
      refusal: 'archived_reference',
    });
    expect(authoringError(() => authoring.previewReplacement({
      old_content_key: original.result.content_key,
      new_content_key: successor.result.content_key,
      character_id: character.characterId as CharacterId,
    })).data).toEqual({
      reason: 'replacement_refused',
      refusal: 'archived_reference',
    });
    db.exec(
      'UPDATE catalog_content_identities SET archived_at = NULL WHERE content_key = ?',
      [successor.result.content_key],
    );
    expect(authoring.commitReplacement({
      token: replacement.token,
      decisions: [{
        candidate_content_key: successor.result.content_key,
        decision: 'match',
      }],
      choices: [],
    })).toMatchObject({
      content_kind: 'subclass',
      character_id: character.characterId,
      new_content_key: successor.result.content_key,
    });
    expect(db.oneRaw(
      `SELECT subclass.content_key, effect.template_ref, source.state
       FROM character_class_levels AS level
       JOIN subclass_definitions AS subclass ON subclass.id = level.subclass_definition_id
       JOIN character_effects AS effect
         ON effect.character_id = level.character_id AND effect.label = 'Manual Aegis note'
       JOIN character_source_instances AS source ON source.id = effect.source_instance_id
       WHERE level.character_id = ?`,
      [character.characterId],
    )).toEqual({
      content_key: successor.result.content_key,
      template_ref: null,
      state: 'active',
    });
  });

  it('LAYERFIX blocks external-to-bundled lineage and purges only the external creation', async () => {
    const db = await database();
    const authoring = service(db);
    const bundledKey = '2024:subclass:layer-boundary-bundle' as ContentKey;
    const installedFixtureKey =
      'expanded:seed.bundle:layer-boundary-bundle' as ContentKey;
    const bundledDraft = savedSubclass(authoring, 'Layer Boundary Bundle');
    const bundledPreview = authoring.previewPublish({
      draft_uuid: bundledDraft.draft_uuid,
      expected_revision: bundledDraft.revision,
    });
    if (bundledPreview.aggregate.kind !== 'subclass') {
      throw new Error('Subclass aggregate required.');
    }
    const bundledNode = portableSubclassContentImportNode(
      db,
      bundledPreview.aggregate,
      installedFixtureKey,
    );
    const bundledPlan = planContentImport(db, [bundledNode]);
    expect(commitContentImport(db, {
      nodes: [bundledNode],
      token: bundledPlan.token,
    }).kind).toBe('committed');
    // This fixture uses the production aggregate installer, then models the
    // seed registry's bundled-stable key/classification at the identity
    // boundary. The real seed subclasses cannot round-trip through HA-5 because
    // their licensed mechanical extracts intentionally have empty prose.
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `UPDATE catalog_content_identities
          SET content_key = ?, catalog_layer = 'bundled',
              key_kind = 'bundled-stable'
        WHERE content_kind = 'subclass' AND content_key = ?`,
      [bundledKey, installedFixtureKey],
    );
    for (const table of ['catalog_content_fingerprints', 'subclass_definitions']) {
      db.exec(
        `UPDATE ${table} SET content_key = ? WHERE content_key = ?`,
        [bundledKey, installedFixtureKey],
      );
    }
    db.exec('PRAGMA ignore_check_constraints = OFF');
    db.exec('PRAGMA foreign_keys = ON');
    expect(db.connection.selectObject('PRAGMA foreign_key_check')).toBeUndefined();
    const external = publish(
      authoring,
      savedSubclass(authoring, 'Layer Boundary Aegis'),
    );
    const versionDraft = authoring.createDraft({
      content_kind: 'subclass',
      base_content_key: external.result.content_key,
    });
    if (versionDraft.document.kind !== 'subclass') {
      throw new Error('Subclass drafts required.');
    }
    const matchingDraft = authoring.saveDraft({
      draft_uuid: versionDraft.draft_uuid,
      expected_revision: versionDraft.revision,
      document: bundledDraft.document,
    });
    const matchPreview = authoring.previewPublish({
      draft_uuid: matchingDraft.draft_uuid,
      expected_revision: matchingDraft.revision,
    });
    expect(matchPreview.review).toEqual([expect.objectContaining({
      candidate_content_key: bundledKey,
      candidate_catalog_layer: 'bundled',
      reason: 'srd-fallback',
      default_decision: 'match',
    })]);
    expect(authoring.commitPublish({
      token: matchPreview.token,
      decisions: [{
        candidate_content_key: bundledKey,
        decision: 'match',
      }],
    })).toMatchObject({
      outcome: 'matched_existing',
      content_key: bundledKey,
      catalog_layer: 'bundled',
    });
    expect(db.scalar<number>(
      `SELECT count(*) FROM catalog_content_supersessions
       WHERE content_kind = 'subclass'
         AND superseded_content_key = ?`,
      [external.result.content_key],
    )).toBe(0);

    expect(() => recordSupersession(
      db,
      'subclass',
      external.result.content_key,
      bundledKey,
    )).toThrow(CatalogSupersessionRefusal);
    try {
      recordSupersession(db, 'subclass', external.result.content_key, bundledKey);
    } catch (error) {
      expect(error).toMatchObject({
        name: 'CatalogSupersessionRefusal',
        message: SUPERSESSION_SUCCESSOR_LAYER_REFUSAL,
        reason: 'successor_not_external',
      });
    }

    registerContentAlias(db, {
      kind: 'subclass',
      aliasKey: 'expanded:legacy.owner:layer-boundary-champion' as ContentKey,
      contentKey: bundledKey,
      aliasKind: 'declared-legacy',
    });
    const bundledCharacter = characterWithSubclass(db, bundledKey, 3);
    const bundledRowsBefore = Object.freeze({
      identity: db.allRaw(
        'SELECT * FROM catalog_content_identities WHERE content_key = ?',
        [bundledKey],
      ),
      definition: db.allRaw(
        'SELECT * FROM subclass_definitions WHERE content_key = ?',
        [bundledKey],
      ),
      fingerprints: db.allRaw(
        `SELECT * FROM catalog_content_fingerprints
         WHERE content_kind = 'subclass' AND content_key = ?
         ORDER BY fingerprint_scheme, fingerprint_role`,
        [bundledKey],
      ),
      aliases: db.allRaw(
        `SELECT * FROM catalog_content_aliases
         WHERE content_kind = 'subclass' AND content_key = ?
         ORDER BY alias_key`,
        [bundledKey],
      ),
      character: db.allRaw(
        'SELECT * FROM characters WHERE id = ?',
        [bundledCharacter.characterId],
      ),
      attachment: db.allRaw(
        `SELECT * FROM character_class_levels
         WHERE character_id = ? AND subclass_definition_id = ?`,
        [bundledCharacter.characterId, bundledCharacter.subclassId],
      ),
    });
    expect(bundledRowsBefore.identity).toHaveLength(1);
    expect(bundledRowsBefore.definition).toHaveLength(1);
    expect(bundledRowsBefore.fingerprints.length).toBeGreaterThan(0);
    expect(bundledRowsBefore.aliases).toHaveLength(1);
    expect(bundledRowsBefore.character).toHaveLength(1);
    expect(bundledRowsBefore.attachment).toHaveLength(1);

    // Simulate a database created before the writer invariant existed. The
    // purge boundary must remain safe independently of the production writer.
    db.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key
       ) VALUES ('subclass', ?, ?)`,
      [external.result.content_key, bundledKey],
    );
    const lifecycle = new HomebrewArchiveSetService(
      db,
      () => '2042-08-15T16:17:18.000Z',
      () => 'layerfix-archive-event',
    );
    const archive = lifecycle.previewArchive(external.result.content_key);
    expect(archive.characters).toEqual([]);
    lifecycle.commitArchive(archive.token);
    expect(lifecycle.listArchived()).toEqual([
      expect.objectContaining({
        content_key: external.result.content_key,
        lineage_revision_count: 1,
        purge_characters: [],
      }),
    ]);

    expect(lifecycle.purgeArchived(
      'subclass',
      external.result.content_key,
    )).toEqual({
      requested_content_key: external.result.content_key,
      content_kind: 'subclass',
      purged_content_keys: [external.result.content_key],
      purged_character_ids: [],
    });
    expect(db.scalar<number>(
      'SELECT count(*) FROM catalog_content_identities WHERE content_key = ?',
      [external.result.content_key],
    )).toBe(0);
    expect(db.scalar<number>(
      'SELECT count(*) FROM subclass_definitions WHERE content_key = ?',
      [external.result.content_key],
    )).toBe(0);
    expect(db.scalar<number>(
      `SELECT count(*) FROM catalog_content_fingerprints
       WHERE content_kind = 'subclass' AND content_key = ?`,
      [external.result.content_key],
    )).toBe(0);
    expect(db.scalar<number>(
      `SELECT count(*) FROM catalog_content_supersessions
       WHERE content_kind = 'subclass' AND (
         superseded_content_key = ? OR successor_content_key = ?
       )`,
      [external.result.content_key, external.result.content_key],
    )).toBe(0);
    expect({
      identity: db.allRaw(
        'SELECT * FROM catalog_content_identities WHERE content_key = ?',
        [bundledKey],
      ),
      definition: db.allRaw(
        'SELECT * FROM subclass_definitions WHERE content_key = ?',
        [bundledKey],
      ),
      fingerprints: db.allRaw(
        `SELECT * FROM catalog_content_fingerprints
         WHERE content_kind = 'subclass' AND content_key = ?
         ORDER BY fingerprint_scheme, fingerprint_role`,
        [bundledKey],
      ),
      aliases: db.allRaw(
        `SELECT * FROM catalog_content_aliases
         WHERE content_kind = 'subclass' AND content_key = ?
         ORDER BY alias_key`,
        [bundledKey],
      ),
      character: db.allRaw(
        'SELECT * FROM characters WHERE id = ?',
        [bundledCharacter.characterId],
      ),
      attachment: db.allRaw(
        `SELECT * FROM character_class_levels
         WHERE character_id = ? AND subclass_definition_id = ?`,
        [bundledCharacter.characterId, bundledCharacter.subclassId],
      ),
    }).toEqual(bundledRowsBefore);
  });

  it('rolls subclass installation and lineage back atomically', async () => {
    const db = await database();
    const authoring = service(db);
    const original = publish(authoring, savedSubclass(authoring, 'Atomic Aegis'));
    const copied = authoring.createDraft({
      content_kind: 'subclass',
      base_content_key: original.result.content_key,
    });
    if (copied.document.kind !== 'subclass') throw new Error('Subclass draft required.');
    const revised = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: { ...copied.document, name: 'Atomic Aegis Revised' },
    });
    const preview = authoring.previewPublish({
      draft_uuid: revised.draft_uuid,
      expected_revision: revised.revision,
    });
    db.exec(
      `CREATE TEMP TRIGGER ci7_refuse_subclass_supersession
       BEFORE INSERT ON catalog_content_supersessions
       BEGIN SELECT RAISE(ABORT, 'CI7 injected subclass lineage failure'); END`,
    );
    expect(authoringError(() => authoring.commitPublish({
      token: preview.token,
      decisions: [],
    })).data).toEqual({ reason: 'publish_refused', refusal: 'commit_failed' });
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_supersessions')).toBe(0);
    expect(db.scalar<number>(
      `SELECT count(*) FROM subclass_definitions
       WHERE content_key = 'expanded:content.subclass:atomic-aegis-revised'`,
    )).toBe(0);
    expect(authoring.readDraft(revised.draft_uuid).revision).toBe(revised.revision);
    expect(authoring.list().published).toEqual([
      expect.objectContaining({ content_key: original.result.content_key, superseded_by: null }),
    ]);
  });
});
