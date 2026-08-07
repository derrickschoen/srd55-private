import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import {
  AuthoringServiceError,
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import type {
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
} from '../../../src/authoring/contracts';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';
import { portableSubclassContentImportNode } from '../../../src/backup/portable-content';
import { listGuidedClassOptions } from '../../../src/builder/guided-creation';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import {
  commitContentImport,
  planContentImport,
} from '../../../src/catalog/content-adoption';
import { registerContentAlias } from '../../../src/catalog/content-registry';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute, type Router } from '../../../src/ui/router';
import type { ScreenContext } from '../../../src/ui/screen';
import {
  isStoredSubclassDraft,
  renderSubclassForm,
} from '../../../src/ui/screens/homebrew/subclass-form';
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

async function fixture(): Promise<{
  readonly service: CatalogAuthoringService;
  readonly db: DatabaseContext;
}> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  return {
    db,
    service: new CatalogAuthoringService(db, {
      randomUuid: () => `ha8-service-${String(++uuidSequence)}`,
      now: () => '2042-08-06T12:00:00.000Z',
    }),
  };
}

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function denseRows(fixedSpellKey?: ContentKey): Extract<
  SubclassAuthoringDraft['progression'],
  { readonly mode: 'override' }
>['rows'] {
  return Array.from({ length: 20 }, (_unused, index) => ({
    class_level: index + 1 as never,
    cantrips_known: 0,
    prepared_or_known_count: 0,
    maximum_spell_level: 0,
    slot_counts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    grants: index === 0 && fixedSpellKey !== undefined ? [{
      kind: 'fixed_spell' as const,
      draft_item_uuid: itemUuid('codec-grant'),
      rule_key: 'codec-fixed-spell',
      spell_content_key: fixedSpellKey,
      always_prepared: true,
    }] : [],
  }));
}

function validDocument(
  created: StoredHomebrewDraft,
  parentKey: ContentKey,
  name: string,
  fixedSpellKey?: ContentKey,
): SubclassAuthoringDraft {
  if (created.document.kind !== 'subclass') throw new Error('Draft is not subclass.');
  return {
    ...created.document,
    name,
    rules_edition: 'expanded',
    reference_text: 'Codec-bound timeline reference.',
    parent_class_content_key: parentKey,
    progression: {
      mode: 'override',
      spellcasting_ability: 'intelligence',
      caster_contribution: 'third_down',
      rows: denseRows(fixedSpellKey),
    },
    features: [
      {
        draft_item_uuid: itemUuid('codec-feature-three'),
        class_level: 3,
        name: 'Mapped ward',
        description: 'A threshold defense.',
        effects: [
          {
            kind: 'armor_class_bonus',
            draft_item_uuid: itemUuid('codec-effect-armor'),
            label: 'Mapped armor',
            notes: 'Persisted through the production codec.',
            amount: 2,
          },
          {
            kind: 'damage_resistance',
            draft_item_uuid: itemUuid('codec-effect-void'),
            label: 'Void route',
            notes: null,
            damage_type: 'Void' as never,
          },
        ],
      },
      {
        draft_item_uuid: itemUuid('codec-feature-six'),
        class_level: 6,
        name: 'Mapped ward',
        description: 'The same name is valid at another threshold.',
        effects: [{
          kind: 'extra_attack',
          draft_item_uuid: itemUuid('codec-effect-attack'),
          label: 'Second tempo',
          notes: null,
          attack_count: 2,
          weapon_scope: 'any_weapon',
        }],
      },
    ],
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

function serviceClient(
  service: CatalogAuthoringService,
  overrides: Partial<AuthoringClient> = {},
): AuthoringClient {
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
    previewReplacementSet: () => Promise.reject(new Error('Unused replacement-set preview.')),
    commitReplacementSet: () => Promise.reject(new Error('Unused replacement-set commit.')),
    previewArchiveSet: () => Promise.reject(new Error('Unused archive preview.')),
    commitArchiveSet: () => Promise.reject(new Error('Unused archive commit.')),
    listArchivedSets: () => Promise.reject(new Error('Unused archive list.')),
    previewRestoreSet: () => Promise.reject(new Error('Unused restore preview.')),
    commitRestoreSet: () => Promise.reject(new Error('Unused restore commit.')),
    purgeArchivedSet: () => Promise.reject(new Error('Unused permanent purge.')),
    ...overrides,
  };
}

function context(): ScreenContext {
  const root = document.createElement('div');
  document.body.append(root);
  return {
    root,
    route: parseRoute(new URL('https://example.test/homebrew/drafts/ha8-service')),
    router: { navigate: () => undefined } as unknown as Router,
    rpc: null as never,
    registerNavigationGuard: () => () => undefined,
  };
}

function render(
  service: CatalogAuthoringService,
  db: DatabaseContext,
  draft: StoredHomebrewDraft,
  overrides: Partial<AuthoringClient> = {},
): {
  readonly root: InteractiveTestElement;
  readonly cleanup: () => void;
} {
  if (!isStoredSubclassDraft(draft)) throw new Error('Stored draft is not subclass.');
  const screenContext = context();
  const mount = document.createElement('div');
  screenContext.root.append(mount);
  const cleanup = renderSubclassForm({
    context: screenContext,
    client: serviceClient(service, overrides),
    mount,
    draft,
    parentClasses: listGuidedClassOptions(db),
    windowObject: new EventTarget() as unknown as Window,
  });
  return { root: interactiveElement(mount), cleanup };
}

function button(root: InteractiveTestElement, label: string): InteractiveTestElement {
  const found = root.querySelectorAll('button').find((candidate) => candidate.textContent === label);
  if (found === undefined) throw new Error(`Missing ${label} button.`);
  return found;
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 12; turn += 1) await Promise.resolve();
}

function errorData(operation: () => unknown): unknown {
  try {
    operation();
  } catch (error) {
    if (error instanceof AuthoringServiceError) return error.data;
    throw error;
  }
  throw new Error('Expected authoring service refusal.');
}

function storedDraftBytes(db: DatabaseContext, draftUuid: StoredHomebrewDraft['draft_uuid']): string {
  const bytes = db.scalar<string>(
    'SELECT document_json FROM catalog_content_drafts WHERE draft_uuid = ?',
    [draftUuid],
  );
  if (typeof bytes !== 'string') throw new Error('Stored draft JSON is missing.');
  return bytes;
}

function installRootOnlySubclass(
  service: CatalogAuthoringService,
  db: DatabaseContext,
  parentKey: ContentKey,
  name: string,
): ContentKey {
  const created = service.createDraft({ content_kind: 'subclass' });
  const saved = service.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document: validDocument(created, parentKey, name),
  });
  const preview = service.previewPublish({
    draft_uuid: saved.draft_uuid,
    expected_revision: saved.revision,
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

describe('HA-8 production-service form boundaries', () => {
  // Measured alone at 2.123s; the explicit timeout preserves headroom for seeded DB boots.
  it('round-trips the full draft and aggregate through the production codec with byte-equivalent save, reload, and rehydration', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    const spell = db.oneRaw("SELECT content_key FROM spell_versions WHERE display_name = 'Light' LIMIT 1");
    if (parent === undefined || typeof spell?.content_key !== 'string') {
      throw new Error('Bundled Fighter and Light are required.');
    }
    const created = service.createDraft({ content_kind: 'subclass' });
    const expected = validDocument(
      created,
      parent.content_key as ContentKey,
      'Codec Timeline',
      spell.content_key as ContentKey,
    );
    const saved = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: expected,
    });
    const firstPassBytes = storedDraftBytes(db, saved.draft_uuid);
    const aggregateBefore = service.previewPublish({
      draft_uuid: saved.draft_uuid,
      expected_revision: saved.revision,
    }).aggregate;

    const restoreDocument = installInteractiveDocument();
    try {
      const rehydrated = service.readDraft(saved.draft_uuid);
      const freshForm = render(service, db, rehydrated);
      expect(freshForm.root.querySelectorAll('.subclass-progression-row')).toHaveLength(20);
      expect(freshForm.root.querySelectorAll('.subclass-feature-card')).toHaveLength(2);
      expect(freshForm.root.querySelectorAll('.authoring-effect-card')).toHaveLength(3);
      button(freshForm.root, 'Save draft').click();
      await settle();
      const secondPassBytes = storedDraftBytes(db, saved.draft_uuid);
      expect(secondPassBytes).toBe(firstPassBytes);
      const resaved = service.readDraft(saved.draft_uuid);
      const aggregateAfter = service.previewPublish({
        draft_uuid: resaved.draft_uuid,
        expected_revision: resaved.revision,
      }).aggregate;
      expect(aggregateAfter).toEqual(aggregateBefore);
      freshForm.cleanup();
    } finally {
      restoreDocument();
    }
  }, 20_000);

  it('renders every collect-all semantic refusal path returned by the real subclass publisher', async () => {
    const { service, db } = await fixture();
    const created = service.createDraft({ content_kind: 'subclass' });
    if (created.document.kind !== 'subclass') throw new Error('Draft is not subclass.');
    const invalid = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: {
        ...created.document,
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
        features: [{
          draft_item_uuid: itemUuid('invalid-feature'),
          class_level: 3,
          name: '',
          description: '',
          effects: [{
            kind: 'extra_attack',
            draft_item_uuid: itemUuid('invalid-effect'),
            label: '',
            notes: null,
            attack_count: null,
            weapon_scope: null,
          }],
        }],
      },
    });
    expect(errorData(() => service.previewPublish({
      draft_uuid: invalid.draft_uuid,
      expected_revision: invalid.revision,
    }))).toEqual({
      reason: 'validation_failed',
      issues: [
        { path: ['name'], code: 'required', message: 'Must not be empty.' },
        { path: ['rules_edition'], code: 'required', message: 'Rules edition is required.' },
        { path: ['parent_class_content_key'], code: 'required', message: 'Parent class is required.' },
        { path: ['progression', 'caster_contribution'], code: 'required', message: 'Caster contribution is required.' },
        { path: ['progression', 'rows'], code: 'required', message: 'Override progression requires exactly 20 rows.' },
        { path: ['progression', 'rows', 0, 'class_level'], code: 'invalid_value', message: 'Expected class level 1.' },
        { path: ['progression', 'rows', 0, 'cantrips_known'], code: 'required', message: 'Cantrips known is required.' },
        { path: ['progression', 'rows', 0, 'prepared_or_known_count'], code: 'required', message: 'Prepared or known count is required.' },
        { path: ['progression', 'rows', 0, 'maximum_spell_level'], code: 'required', message: 'Maximum spell level is required.' },
        { path: ['progression', 'rows', 0, 'slot_counts'], code: 'required', message: 'Exactly nine slot counts are required.' },
        { path: ['features', 0, 'name'], code: 'required', message: 'Must not be empty.' },
        { path: ['features', 0, 'description'], code: 'required', message: 'Must not be empty.' },
        { path: ['features', 0, 'effects', 0, 'label'], code: 'required', message: 'Must not be empty.' },
        { path: ['features', 0, 'effects', 0, 'attack_count'], code: 'required', message: 'Attack count is required.' },
        { path: ['features', 0, 'effects', 0, 'weapon_scope'], code: 'required', message: 'Weapon scope is required.' },
      ],
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, db, invalid);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const summary = rendered.root.querySelector('.authoring-validation-summary');
      if (summary === null) throw new Error('Publisher validation summary is missing.');
      expect(summary.querySelectorAll('li')).toHaveLength(15);
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  // Measured alone at 1.711s; the explicit timeout preserves headroom for two real publish previews.
  it('pins real stale-plan and no-review commit refusals with enabled retry controls', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    if (parent === undefined) throw new Error('Bundled Fighter is required.');
    const created = service.createDraft({ content_kind: 'subclass' });
    const saved = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(created, parent.content_key as ContentKey, 'Stale Timeline'),
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const stale = render(service, db, saved);
      stale.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      service.saveDraft({
        draft_uuid: saved.draft_uuid,
        expected_revision: saved.revision,
        document: saved.document,
      });
      button(stale.root, 'Publish subclass').click();
      await settle();
      expect(stale.root.querySelector('[role="alert"]')?.textContent)
        .toBe('The publish plan is stale.');
      expect(button(stale.root, 'Publish subclass').disabled).toBe(false);
      stale.cleanup();

      const current = service.readDraft(saved.draft_uuid);
      const invalidDecision = render(service, db, current, {
        commitPublish: (params) => rpcCall(() => service.commitPublish({
          token: params.token,
          decisions: [{
            candidate_content_key: 'expanded:subclass:not-a-review' as ContentKey,
            decision: 'match',
          }],
        })),
      });
      invalidDecision.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(invalidDecision.root, 'Publish subclass').click();
      await settle();
      expect(invalidDecision.root.querySelector('[role="alert"]')?.textContent)
        .toBe('This publish has no review decision to apply.');
      expect(button(invalidDecision.root, 'Publish subclass').disabled).toBe(false);
      invalidDecision.cleanup();
    } finally {
      restoreDocument();
    }
  }, 20_000);

  // Measured alone at 1.566s; the explicit timeout preserves headroom for seed plus first publish.
  it('pins the real asserted-key collision preview refusal without catalog mutation', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    if (parent === undefined) throw new Error('Bundled Fighter is required.');
    const first = service.createDraft({ content_kind: 'subclass' });
    const firstSaved = service.saveDraft({
      draft_uuid: first.draft_uuid,
      expected_revision: first.revision,
      document: validDocument(first, parent.content_key as ContentKey, 'Occupied Timeline'),
    });
    const firstPreview = service.previewPublish({
      draft_uuid: firstSaved.draft_uuid,
      expected_revision: firstSaved.revision,
    });
    service.commitPublish({ token: firstPreview.token, decisions: [] });

    const second = service.createDraft({ content_kind: 'subclass' });
    const changed = validDocument(second, parent.content_key as ContentKey, 'Occupied Timeline');
    const secondSaved = service.saveDraft({
      draft_uuid: second.draft_uuid,
      expected_revision: second.revision,
      document: {
        ...changed,
        features: changed.features.map((feature, index) => index === 0
          ? { ...feature, description: 'Different bytes under the occupied asserted key.' }
          : feature),
      },
    });
    expect(errorData(() => service.previewPublish({
      draft_uuid: secondSaved.draft_uuid,
      expected_revision: secondSaved.revision,
    }))).toMatchObject({
      reason: 'content_key_collision',
      content_key: expect.stringContaining('occupied-timeline'),
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, db, secondSaved);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      expect(rendered.root.querySelector('[role="alert"]')?.textContent)
        .toBe('The asserted subclass key already names different content.');
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);
      expect(db.scalar<number>(
        'SELECT count(*) FROM subclass_definitions WHERE name = ?',
        ['Occupied Timeline'],
      )).toBe(1);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  }, 20_000);

  it('pins a real publish-transaction refusal with rollback and an enabled retry', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    if (parent === undefined) throw new Error('Bundled Fighter is required.');
    const created = service.createDraft({ content_kind: 'subclass' });
    const saved = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(created, parent.content_key as ContentKey, 'Refused Timeline'),
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, db, saved);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const installedSubclassId = db.scalar<number>(
        `SELECT seq + 1 FROM sqlite_sequence WHERE name = 'subclass_definitions'`,
      ) ?? 1;
      const firstInstalledFeatureId = db.scalar<number>(
        `SELECT seq + 1 FROM sqlite_sequence WHERE name = 'subclass_features'`,
      ) ?? 1;
      const secondInstalledFeatureId = firstInstalledFeatureId + 1;
      db.exec(
        `CREATE TEMP TRIGGER ha8_refuse_draft_delete
         BEFORE DELETE ON catalog_content_drafts
         WHEN OLD.draft_uuid = '${saved.draft_uuid}'
         BEGIN SELECT RAISE(ABORT, 'ha8 publish rollback'); END`,
      );
      button(rendered.root, 'Publish subclass').click();
      await settle();

      expect(rendered.root.querySelector('[role="alert"]')?.textContent)
        .toBe('The subclass publish transaction was refused.');
      expect(button(rendered.root, 'Publish subclass').disabled).toBe(false);
      expect(service.readDraft(saved.draft_uuid).document).toEqual(saved.document);
      const contentKey = assertedExternalContentKey('subclass', 'expanded', 'Refused Timeline');
      expect(db.oneRaw(
        `SELECT
           (SELECT count(*) FROM catalog_content_identities WHERE content_key = ?) AS identities,
           (SELECT count(*) FROM catalog_content_fingerprints WHERE content_key = ?) AS fingerprints,
           (SELECT count(*) FROM subclass_definitions WHERE content_key = ?) AS definitions,
           (SELECT count(*) FROM subclass_progressions WHERE subclass_definition_id = ?) AS progressions,
           (SELECT count(*) FROM subclass_features WHERE subclass_definition_id = ?) AS features,
           (SELECT count(*) FROM subclass_feature_effects WHERE subclass_feature_id IN (?, ?)) AS effects`,
        [
          contentKey, contentKey, contentKey, installedSubclassId,
          installedSubclassId, firstInstalledFeatureId, secondInstalledFeatureId,
        ],
      )).toEqual({
        identities: 0,
        fingerprints: 0,
        definitions: 0,
        progressions: 0,
        features: 0,
        effects: 0,
      });
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('rolls back an alias-backed reviewed Match decision at the last publish step', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    if (parent === undefined) throw new Error('Bundled Fighter is required.');
    const created = service.createDraft({ content_kind: 'subclass' });
    const incoming = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(
        created,
        parent.content_key as ContentKey,
        'Refused Reviewed Timeline',
      ),
    });
    const initialPreview = service.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    if (initialPreview.aggregate.kind !== 'subclass') {
      throw new Error('Incoming preview is not subclass.');
    }
    const targetKey = 'expanded:alternate.owner:refused-reviewed-timeline' as ContentKey;
    const targetNode = portableSubclassContentImportNode(db, initialPreview.aggregate, targetKey);
    const targetPlan = planContentImport(db, [targetNode]);
    expect(commitContentImport(db, {
      nodes: [targetNode],
      token: targetPlan.token,
    }).kind).toBe('committed');
    const aliasKey = assertedExternalContentKey(
      'subclass',
      'expanded',
      'Refused Reviewed Timeline',
    );
    registerContentAlias(db, {
      kind: 'subclass',
      aliasKey,
      contentKey: targetKey,
      aliasKind: 'declared-legacy',
    });
    const reviewedPreview = service.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(reviewedPreview.review).toEqual([{
      candidate_content_key: targetKey,
      candidate_name: 'Refused Reviewed Timeline',
      candidate_catalog_layer: 'external',
      reason: 'alias',
      default_decision: 'match',
    }]);
    const incomingIdentity = reviewedPreview.facts.candidate_identities[0];
    if (incomingIdentity === undefined) throw new Error('Incoming identity is missing.');

    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, db, incoming);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      db.exec(
        `CREATE TEMP TRIGGER ha8_refuse_reviewed_draft_delete
         BEFORE DELETE ON catalog_content_drafts
         WHEN OLD.draft_uuid = '${incoming.draft_uuid}'
         BEGIN SELECT RAISE(ABORT, 'ha8 reviewed publish rollback'); END`,
      );
      button(rendered.root, 'Publish subclass').click();
      const modal = interactiveElement(document.body)
        .querySelector('[data-testid="content-adoption-modal"]');
      if (modal === null) throw new Error('Adoption modal did not open.');
      button(modal, 'Publish with these choices').click();
      await settle();

      expect(modal.querySelector('[role="alert"]')?.textContent)
        .toBe('The subclass publish transaction was refused.');
      expect(button(modal, 'Publish with these choices').disabled).toBe(false);
      expect(service.readDraft(incoming.draft_uuid).document).toEqual(incoming.document);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_match_decisions
         WHERE content_kind = ?
           AND incoming_fingerprint_scheme = ?
           AND incoming_fingerprint_digest = ?`,
        [incomingIdentity.kind, incomingIdentity.scheme, incomingIdentity.digest],
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_aliases
         WHERE content_kind = 'subclass' AND alias_key = ? AND content_key = ?`,
        [aliasKey, targetKey],
      )).toBe(1);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  }, 20_000);

  it('keeps an unchanged real published root-only copy publishable and offers dense mode before editing', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    if (parent === undefined) throw new Error('Bundled Fighter is required.');
    const baseKey = installRootOnlySubclass(
      service,
      db,
      parent.content_key as ContentKey,
      'Root Copy Timeline',
    );
    const copied = service.createDraft({ content_kind: 'subclass', base_content_key: baseKey });
    const unchanged = service.previewPublish({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
    });
    expect(unchanged.aggregate).toMatchObject({
      kind: 'subclass',
      progression: { mode: 'root_only' },
    });

    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, db, copied);
      const mode = rendered.root.querySelectorAll('select').find((candidate) =>
        candidate.getAttribute('id') === 'subclass-progression-mode');
      const name = rendered.root.querySelectorAll('input').find((candidate) =>
        candidate.getAttribute('id') === 'subclass-name');
      if (mode === undefined || name === undefined) throw new Error('Root-only form controls are missing.');
      expect(mode.disabled).toBe(false);
      expect(name.disabled).toBe(true);
      mode.value = 'override';
      mode.dispatchEvent(new Event('change'));
      const unlockedName = rendered.root.querySelectorAll('input').find((candidate) =>
        candidate.getAttribute('id') === 'subclass-name');
      expect(unlockedName?.disabled).toBe(false);
      if (unlockedName === undefined) throw new Error('Unlocked name control is missing.');
      unlockedName.value = 'Editable Dense Timeline';
      unlockedName.dispatchEvent(new Event('input'));
      button(rendered.root, 'Save draft').click();
      await settle();
      const dense = service.readDraft(copied.draft_uuid);
      expect(dense.document.kind).toBe('subclass');
      if (dense.document.kind !== 'subclass' || dense.document.progression.mode !== 'override') {
        throw new Error('Edited root copy did not save as a dense subclass.');
      }
      expect(dense.document.name).toBe('Editable Dense Timeline');
      expect(dense.document.progression.rows).toHaveLength(20);
      expect(service.previewPublish({
        draft_uuid: dense.draft_uuid,
        expected_revision: dense.revision,
      }).aggregate).toMatchObject({
        name: 'Editable Dense Timeline',
        progression: { mode: 'override' },
      });
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  }, 20_000);

  // Measured alone at 1.644s; the explicit timeout preserves headroom for alias installation and preview.
  it('keeps a real review-required refusal inside the shared focusable adoption modal', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    if (parent === undefined) throw new Error('Bundled Fighter is required.');
    const created = service.createDraft({ content_kind: 'subclass' });
    const incoming = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(created, parent.content_key as ContentKey, 'Adoption Timeline'),
    });
    const originalPreview = service.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    if (originalPreview.aggregate.kind !== 'subclass') {
      throw new Error('Incoming preview is not subclass.');
    }
    const targetKey = 'expanded:alternate.owner:adoption-timeline' as ContentKey;
    const targetNode = portableSubclassContentImportNode(db, originalPreview.aggregate, targetKey);
    const targetPlan = planContentImport(db, [targetNode]);
    expect(commitContentImport(db, {
      nodes: [targetNode],
      token: targetPlan.token,
    }).kind).toBe('committed');
    registerContentAlias(db, {
      kind: 'subclass',
      aliasKey: assertedExternalContentKey('subclass', 'expanded', 'Adoption Timeline'),
      contentKey: targetKey,
      aliasKind: 'declared-legacy',
    });

    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, db, incoming, {
        commitPublish: (params) => rpcCall(() => service.commitPublish({
          token: params.token,
          decisions: [],
        })),
      });
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(rendered.root, 'Publish subclass').click();
      const modal = interactiveElement(document.body)
        .querySelector('[data-testid="content-adoption-modal"]');
      if (modal === null) throw new Error('Adoption modal did not open.');
      expect(modal.isConnected).toBe(true);
      expect(modal.open).toBe(true);
      button(modal, 'Publish with these choices').click();
      await settle();
      expect(modal.querySelector('[role="alert"]')?.textContent)
        .toBe('Publish adoption review is required.');
      expect(button(modal, 'Publish with these choices').disabled).toBe(false);
      expect(button(modal, 'Cancel').disabled).toBe(false);
      expect(document.activeElement).toBe(button(modal, 'Publish with these choices'));
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  }, 20_000);

  it('rehydrates the real revision-conflict modal without overwriting the newer saved aggregate', async () => {
    const { service, db } = await fixture();
    const parent = listGuidedClassOptions(db).find((candidate) => candidate.name === 'Fighter');
    if (parent === undefined) throw new Error('Bundled Fighter is required.');
    const created = service.createDraft({ content_kind: 'subclass' });
    const saved = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: validDocument(created, parent.content_key as ContentKey, 'Conflict Timeline'),
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, db, saved);
      const localName = rendered.root.querySelectorAll('input').find((entry) =>
        entry.getAttribute('id') === 'subclass-name');
      if (localName === undefined) throw new Error('Subclass name input is missing.');
      localName.value = 'Local unsaved timeline';
      localName.dispatchEvent(new Event('input'));
      service.saveDraft({
        draft_uuid: saved.draft_uuid,
        expected_revision: saved.revision,
        document: { ...saved.document, name: 'Remote saved timeline' },
      });
      button(rendered.root, 'Save draft').click();
      await settle();
      const modal = interactiveElement(document.body)
        .querySelector('[data-testid="authoring-draft-conflict"]');
      if (modal === null) throw new Error('Draft conflict modal did not open.');
      expect(modal.isConnected).toBe(true);
      expect(modal.open).toBe(true);
      expect(interactiveElement(document.body)
        .querySelectorAll('[data-testid="authoring-draft-conflict"]')).toHaveLength(1);
      button(modal, 'Load saved revision').click();
      await settle();
      const rehydrated = rendered.root.querySelectorAll('input').find((entry) =>
        entry.getAttribute('id') === 'subclass-name');
      expect(rehydrated?.value).toBe('Remote saved timeline');
      expect(button(rendered.root, 'Save draft').disabled).toBe(false);
      expect(service.readDraft(saved.draft_uuid).document).toEqual({
        ...saved.document,
        name: 'Remote saved timeline',
      });
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });
});
