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
    createDraft: (params) => rpcCall(() => service.createDraft(params)),
    readDraft: (params) => rpcCall(() => service.readDraft(params.draft_uuid)),
    saveDraft: (params) => rpcCall(() => service.saveDraft(params)),
    discardDraft: (params) => rpcCall(() => service.discardDraft(params.draft_uuid, params.expected_revision)),
    previewPublish: (params) => rpcCall(() => service.previewPublish(params)),
    commitPublish: (params) => rpcCall(() => service.commitPublish(params)),
    usages: (params) => rpcCall(() => service.usages(params.content_key)),
    previewReplacement: () => Promise.reject(new Error('Unused replacement preview.')),
    commitReplacement: () => Promise.reject(new Error('Unused replacement commit.')),
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
      content_key: originFeatKey(db), rules_edition: '2024',
    }));
    expect(refs.weapons).toContainEqual({
      content_key: '2024:weapon:club', name: 'Club', rules_edition: '2024',
    });
    expect(refs.armors).toContainEqual({
      content_key: '2024:armor:leather-armor', name: 'Leather Armor', rules_edition: '2024',
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
    const restore = installInteractiveDocument();
    try {
      const rendered = render(service, invalid);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const summary = rendered.root.querySelector('.authoring-validation-summary');
      expect(summary?.querySelectorAll('li')).toHaveLength(15);
      const messages = summary?.querySelectorAll('li').map((entry) => elementText(entry as unknown as Node)) ?? [];
      for (const expected of [
        'Exactly three suggested abilities are required.',
        'Suggested abilities must not repeat.',
        'Default Origin feat must resolve to one current Origin-feat fingerprint.',
        'Exactly two skill proficiencies are required.',
        'Weapon is required.',
        'Damage type is required.',
      ]) expect(messages.some((message) => message.includes(expected))).toBe(true);
      const first = rendered.root.querySelectorAll('[data-authoring-path]').find((entry) =>
        entry.getAttribute('data-authoring-path') === '["name"]');
      expect(first?.getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(first);
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
