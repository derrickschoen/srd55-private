import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import {
  AuthoringServiceError,
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import type {
  BackgroundAuthoringDraft,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';
import { authoringFingerprintReference } from '../../../src/authoring/species-publisher';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute, type Router } from '../../../src/ui/router';
import type { ScreenContext } from '../../../src/ui/screen';
import {
  isStoredBackgroundDraft,
  renderBackgroundForm,
} from '../../../src/ui/screens/homebrew/background-form';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
let uuidSequence = 0;

afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
  uuidSequence = 0;
});

async function fixture(): Promise<{ readonly db: DatabaseContext; readonly service: CatalogAuthoringService }> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  return {
    db,
    service: new CatalogAuthoringService(db, {
      randomUuid: () => `ha9-service-${String(++uuidSequence)}`,
      now: () => '2042-08-06T12:00:00.000Z',
    }),
  };
}

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function originFeatKey(db: DatabaseContext): ContentKey {
  for (const row of db.allRaw(
    `SELECT content_key FROM feat_definitions WHERE category = 'origin' ORDER BY content_key`,
  )) {
    const key = String(row.content_key) as ContentKey;
    if (authoringFingerprintReference(db, 'feat', key) !== null) return key;
  }
  throw new Error('A uniquely fingerprinted Origin feat is required.');
}

function validDocument(
  db: DatabaseContext,
  created: StoredHomebrewDraft,
  name = 'Service Cartographer',
): BackgroundAuthoringDraft {
  if (created.document.kind !== 'background') throw new Error('Expected background draft.');
  return {
    ...created.document,
    name,
    rules_edition: '2024',
    reference_text: 'Complete reference text.',
    suggested_abilities: ['intelligence', 'wisdom', 'dexterity'],
    default_origin_feat_content_key: originFeatKey(db),
    default_origin_feat_display_name: 'Alert (Night Watch)',
    skill_proficiencies: ['investigation', 'survival'],
    tool_reference_text: 'Void compass',
    equipment_option_a_description: 'Club and map case',
    equipment_option_b_description: 'Leather Armor and map case',
    equipment_option_a: [
      {
        kind: 'weapon', draft_item_uuid: itemUuid('service-club'), quantity: 1,
        printed_name: 'Club', content_key: '2024:weapon:club' as ContentKey,
      },
      {
        kind: 'gear', draft_item_uuid: itemUuid('service-case'), quantity: 2,
        printed_name: 'Map case',
      },
    ],
    equipment_option_b: [{
      kind: 'armor', draft_item_uuid: itemUuid('service-armor'), quantity: 1,
      printed_name: 'Leather Armor', content_key: '2024:armor:leather-armor' as ContentKey,
    }],
    effects: [{
      kind: 'armor_class_bonus', draft_item_uuid: itemUuid('service-effect'),
      label: 'Surveyor ward', notes: 'Flat background effect.', amount: 1,
    }],
  };
}

function rpcCall<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (error) {
    if (error instanceof AuthoringServiceError) {
      return Promise.reject(new RpcError('handler_error', error.message, error.data as never));
    }
    return Promise.reject(error);
  }
}

function client(service: CatalogAuthoringService): AuthoringClient {
  return {
    list: () => rpcCall(() => service.list()),
    backgroundReferences: () => rpcCall(() => service.backgroundReferences()),
    spellGrantReferences: () => rpcCall(() => service.spellGrantReferences()),
    createDraft: (params) => rpcCall(() => service.createDraft(params)),
    readDraft: (params) => rpcCall(() => service.readDraft(params.draft_uuid)),
    saveDraft: (params) => rpcCall(() => service.saveDraft(params)),
    discardDraft: (params) => rpcCall(() => service.discardDraft(params.draft_uuid, params.expected_revision)),
    previewPublish: (params) => rpcCall(() => service.previewPublish(params)),
    commitPublish: (params) => rpcCall(() => service.commitPublish(params)),
    usages: (params) => rpcCall(() => service.usages(params.content_key)),
    previewReplacement: () => Promise.reject(new Error('Unused replacement preview.')),
    commitReplacement: () => Promise.reject(new Error('Unused replacement commit.')),
    previewReplacementSet: () => Promise.reject(new Error('Unused replacement-set preview.')),
    commitReplacementSet: () => Promise.reject(new Error('Unused replacement-set commit.')),
    previewArchiveSet: () => Promise.reject(new Error('Unused archive preview.')),
    commitArchiveSet: () => Promise.reject(new Error('Unused archive commit.')),
    listArchivedSets: () => Promise.reject(new Error('Unused archive list.')),
    previewRestoreSet: () => Promise.reject(new Error('Unused restore preview.')),
    commitRestoreSet: () => Promise.reject(new Error('Unused restore commit.')),
    purgeArchivedSet: () => Promise.reject(new Error('Unused permanent purge.')),
  };
}

function context(): ScreenContext {
  const root = document.createElement('div');
  document.body.append(root);
  return {
    root,
    route: parseRoute(new URL('https://example.test/homebrew/drafts/ha9-service')),
    router: { navigate: () => undefined } as unknown as Router,
    rpc: null as never,
    registerNavigationGuard: () => () => undefined,
  };
}

function render(
  service: CatalogAuthoringService,
  draft: StoredHomebrewDraft,
): { readonly root: InteractiveTestElement; readonly cleanup: () => void } {
  if (!isStoredBackgroundDraft(draft)) throw new Error('Expected stored background.');
  const screenContext = context();
  const mount = document.createElement('div');
  screenContext.root.append(mount);
  return {
    root: interactiveElement(mount),
    cleanup: renderBackgroundForm({
      context: screenContext,
      client: client(service),
      mount,
      draft,
      references: service.backgroundReferences(),
      windowObject: new EventTarget() as unknown as Window,
    }),
  };
}

function button(root: InteractiveTestElement, label: string): InteractiveTestElement {
  const found = root.querySelectorAll('button').find((candidate) => candidate.textContent === label);
  if (found === undefined) throw new Error(`Missing ${label} button.`);
  return found;
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 14; turn += 1) await Promise.resolve();
}

function storedBytes(db: DatabaseContext, draft: StoredHomebrewDraft): string {
  const value = db.scalar<string>(
    'SELECT document_json FROM catalog_content_drafts WHERE draft_uuid = ?',
    [draft.draft_uuid],
  );
  if (typeof value !== 'string') throw new Error('Stored draft bytes are missing.');
  return value;
}

describe('HA-9 production-service form boundaries', () => {
  it('lists installed Origin feat, weapon, and armor references and byte-round-trips a real fresh-form rehydration plus save', async () => {
    const { db, service } = await fixture();
    const refs = service.backgroundReferences();
    expect(refs.origin_feats).toContainEqual(expect.objectContaining({
      content_key: originFeatKey(db), rules_edition: '2024', catalog_layer: 'bundled',
    }));
    expect(refs.weapons).toContainEqual({
      content_key: '2024:weapon:club', name: 'Club', rules_edition: '2024',
      catalog_layer: 'bundled',
    });
    expect(refs.armors).toContainEqual({
      content_key: '2024:armor:leather-armor', name: 'Leather Armor', rules_edition: '2024',
      catalog_layer: 'bundled',
    });
    const created = service.createDraft({ content_kind: 'background' });
    const saved = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(db, created),
    });
    const firstBytes = storedBytes(db, saved);
    const rehydrated = service.readDraft(saved.draft_uuid);
    const restore = installInteractiveDocument();
    try {
      const rendered = render(service, rehydrated);
      button(rendered.root, 'Save draft').click();
      await settle();
      const freshAgain = service.readDraft(saved.draft_uuid);
      const secondBytes = storedBytes(db, freshAgain);
      expect(secondBytes).toBe(firstBytes);
      expect(freshAgain.document).toEqual(saved.document);
      rendered.cleanup();
    } finally {
      restore();
    }
  });

  it('renders every collect-all issue triple returned by the real background publisher and focuses linked fields', async () => {
    const { db, service } = await fixture();
    const created = service.createDraft({ content_kind: 'background' });
    const invalid = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: {
        ...validDocument(db, created, ' '),
        rules_edition: null,
        suggested_abilities: ['strength', 'strength'],
        default_origin_feat_content_key: '2024:missing-feat' as ContentKey,
        skill_proficiencies: ['arcana'],
        equipment_option_a_description: '',
        equipment_option_b_description: '',
        equipment_option_a: [{
          kind: 'weapon', draft_item_uuid: itemUuid('bad-weapon'), quantity: null,
          printed_name: '', content_key: null,
        }],
        equipment_option_b: [{
          kind: 'gear', draft_item_uuid: itemUuid('bad-gear'), quantity: null, printed_name: '',
        }],
        effects: [{
          kind: 'damage_resistance', draft_item_uuid: itemUuid('bad-effect'),
          label: '', notes: null, damage_type: null,
        }],
      },
    });
    const expectedCases = [
      { issue: { path: ['name'], code: 'required', message: 'Must not be empty.' }, targetPath: ['name'] },
      { issue: { path: ['rules_edition'], code: 'required', message: 'Rules edition is required.' }, targetPath: ['rules_edition'] },
      { issue: { path: ['suggested_abilities'], code: 'required', message: 'Exactly three suggested abilities are required.' }, targetPath: ['suggested_abilities'] },
      { issue: { path: ['suggested_abilities'], code: 'duplicate', message: 'Suggested abilities must not repeat.' }, targetPath: ['suggested_abilities'] },
      { issue: { path: ['default_origin_feat_content_key'], code: 'unresolved_reference', message: 'Default Origin feat must resolve to one current Origin-feat fingerprint.' }, targetPath: ['default_origin_feat_content_key'] },
      { issue: { path: ['skill_proficiencies'], code: 'required', message: 'Exactly two skill proficiencies are required.' }, targetPath: ['skill_proficiencies'] },
      { issue: { path: ['equipment_option_a_description'], code: 'required', message: 'Must not be empty.' }, targetPath: ['equipment_option_a_description'] },
      { issue: { path: ['equipment_option_b_description'], code: 'required', message: 'Must not be empty.' }, targetPath: ['equipment_option_b_description'] },
      { issue: { path: ['equipment_option_a', 0, 'quantity'], code: 'required', message: 'Quantity is required.' }, targetPath: ['equipment_option_a', 0, 'quantity'] },
      { issue: { path: ['equipment_option_a', 0, 'printed_name'], code: 'required', message: 'Must not be empty.' }, targetPath: ['equipment_option_a', 0, 'printed_name'] },
      { issue: { path: ['equipment_option_a', 0, 'content_key'], code: 'required', message: 'Weapon is required.' }, targetPath: ['equipment_option_a', 0, 'content_key'] },
      { issue: { path: ['equipment_option_b', 0, 'quantity'], code: 'required', message: 'Quantity is required.' }, targetPath: ['equipment_option_b', 0, 'quantity'] },
      { issue: { path: ['equipment_option_b', 0, 'printed_name'], code: 'required', message: 'Must not be empty.' }, targetPath: ['equipment_option_b', 0, 'printed_name'] },
      { issue: { path: ['effects', 0, 'label'], code: 'required', message: 'Must not be empty.' }, targetPath: ['effects', 0, 'label'] },
      { issue: { path: ['effects', 0, 'damage_type'], code: 'required', message: 'Damage type is required.' }, targetPath: ['effects', 0, 'damage_type'] },
    ] as const;
    let publisherIssues: readonly unknown[] = [];
    try {
      service.previewPublish({
        draft_uuid: invalid.draft_uuid,
        expected_revision: invalid.revision,
      });
    } catch (error) {
      if (!(error instanceof AuthoringServiceError) || error.data.reason !== 'validation_failed') {
        throw error;
      }
      publisherIssues = error.data.issues;
    }
    expect(publisherIssues).toHaveLength(expectedCases.length);
    for (const expected of expectedCases) {
      expect(publisherIssues).toContainEqual(expected.issue);
    }
    const restore = installInteractiveDocument();
    try {
      const rendered = render(service, invalid);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const summary = rendered.root.querySelector('.authoring-validation-summary');
      const entries = summary?.querySelectorAll('li') ?? [];
      expect(entries).toHaveLength(expectedCases.length);
      const firstTarget = rendered.root.querySelectorAll('[data-authoring-path]').find((entry) =>
        entry.getAttribute('data-authoring-path') === JSON.stringify(expectedCases[0].targetPath));
      expect(firstTarget?.getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(firstTarget);
      const unmatchedEntries = new Set(entries);
      for (const expected of expectedCases) {
        const target = rendered.root.querySelectorAll('[data-authoring-path]').find((candidate) =>
          candidate.getAttribute('data-authoring-path') === JSON.stringify(expected.targetPath));
        if (target === undefined) throw new Error(`Missing target for ${JSON.stringify(expected.issue.path)}.`);
        expect(target.getAttribute('aria-invalid')).toBe('true');
        const entry = [...unmatchedEntries].find((candidate) =>
          elementText(candidate as unknown as Node).trim() === expected.issue.message &&
          candidate.querySelector('a')?.getAttribute('href') === `#${target.id}`);
        if (entry === undefined) {
          throw new Error(`Missing linked validation entry for ${JSON.stringify(expected.issue)}.`);
        }
        unmatchedEntries.delete(entry);
        const link = entry.querySelector('a');
        expect(link?.getAttribute('href')).toBe(`#${target.id}`);
        link?.click();
        expect(document.activeElement).toBe(target);
      }
      expect(unmatchedEntries.size).toBe(0);
      rendered.cleanup();
    } finally {
      restore();
    }
  });

  it('surfaces a real last-step commit refusal, retains the draft, and rolls back captured staged IDs with retry enabled', async () => {
    const { db, service } = await fixture();
    const created = service.createDraft({ content_kind: 'background' });
    const saved = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(db, created, 'Refused Form Background'),
    });
    const capturedDefinitionId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence WHERE name = 'background_definitions'), 0) + 1`,
    );
    const capturedTemplateId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence WHERE name = 'background_templates'), 0) + 1`,
    );
    const firstEquipmentId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence WHERE name = 'background_equipment_items'), 0) + 1`,
    );
    const firstEffectId = db.scalar<number>(
      `SELECT coalesce((SELECT seq FROM sqlite_sequence WHERE name = 'background_template_effects'), 0) + 1`,
    );
    if (firstEquipmentId === null || firstEffectId === null) {
      throw new Error('Background child row sequence fixture did not resolve.');
    }
    const restore = installInteractiveDocument();
    try {
      const rendered = render(service, saved);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      db.exec(
        `CREATE TEMP TRIGGER ha9_refuse_form_draft_delete
         BEFORE DELETE ON catalog_content_drafts
         WHEN OLD.draft_uuid = '${saved.draft_uuid}'
         BEGIN SELECT RAISE(ABORT, 'ha9 form rollback'); END`,
      );
      button(rendered.root, 'Publish background').click();
      await settle();
      expect(rendered.root.querySelector('[role="alert"]')?.textContent)
        .toBe('The background publish transaction was refused.');
      expect(button(rendered.root, 'Publish background').disabled).toBe(false);
      expect(service.readDraft(saved.draft_uuid).document).toEqual(saved.document);
      const key = assertedExternalContentKey('background', '2024', 'Refused Form Background');
      expect(db.oneRaw(
        `SELECT
           (SELECT count(*) FROM catalog_content_identities WHERE content_key = ?) AS identities,
           (SELECT count(*) FROM catalog_content_fingerprints WHERE content_key = ?) AS fingerprints,
           (SELECT count(*) FROM background_definitions WHERE id = ?) AS definitions,
           (SELECT count(*) FROM background_templates WHERE id = ? AND content_key = ?) AS templates,
           (SELECT count(*) FROM background_equipment_items
            WHERE id IN (?, ?, ?) AND background_template_id = ?) AS equipment,
           (SELECT count(*) FROM background_template_effects
            WHERE id = ? AND background_template_id = ?) AS effects`,
        [
          key, key, capturedDefinitionId, capturedTemplateId, key,
          firstEquipmentId, firstEquipmentId + 1, firstEquipmentId + 2, capturedTemplateId,
          firstEffectId, capturedTemplateId,
        ],
      )).toEqual({ identities: 0, fingerprints: 0, definitions: 0, templates: 0, equipment: 0, effects: 0 });
      rendered.cleanup();
    } finally {
      restore();
    }
  });

  it('uses the shared revision-conflict dialog to adopt the newer saved draft without overwriting it', async () => {
    const { db, service } = await fixture();
    const created = service.createDraft({ content_kind: 'background' });
    const initial = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(db, created, 'Initial Form Background'),
    });
    const restore = installInteractiveDocument();
    try {
      const rendered = render(service, initial);
      const winner = service.saveDraft({
        draft_uuid: initial.draft_uuid,
        expected_revision: initial.revision,
        document: { ...initial.document, name: 'Newer Saved Background' } as BackgroundAuthoringDraft,
      });
      const name = rendered.root.querySelectorAll('input').find((entry) => entry.getAttribute('id') === 'background-name');
      if (name === undefined) throw new Error('Name input missing.');
      name.value = 'Stale local background';
      name.dispatchEvent(new Event('input'));
      button(rendered.root, 'Save draft').click();
      await settle();
      const modal = interactiveElement(document.body).querySelector('[data-testid="authoring-draft-conflict"]');
      if (modal === null) throw new Error('Conflict dialog missing.');
      expect(modal.open).toBe(true);
      expect(document.activeElement).toBe(modal.querySelector('button'));
      button(modal, 'Load saved revision').click();
      await settle();
      const loadedName = rendered.root.querySelectorAll('input').find((entry) => entry.getAttribute('id') === 'background-name');
      expect(loadedName?.value).toBe('Newer Saved Background');
      expect(service.readDraft(winner.draft_uuid).document).toEqual(winner.document);
      rendered.cleanup();
    } finally {
      restore();
    }
  });
});
