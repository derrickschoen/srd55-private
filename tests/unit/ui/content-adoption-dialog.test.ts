import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ContentImportChoices,
} from '../../../src/catalog/content-adoption';
import {
  commitContentImport,
  planContentImport,
  type ContentImportNode,
  type ContentImportProjection,
} from '../../../src/catalog/content-adoption';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV1,
} from '../../../src/catalog/content-identity';
import {
  registerBundledStableContentIdentity,
  registerContentAlias,
  registerDerivedContentIdentity,
  registerContentFingerprint,
} from '../../../src/catalog/content-registry';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import type {
  DraftRevision,
  PublishPreview,
  PublishResult,
} from '../../../src/authoring/contracts';
import type { HomebrewDraftUuid } from '../../../src/authoring/ids';
import { portableImportPlan } from '../../../src/backup/portable-content';
import {
  createContentAdoptionDialog,
  createPublishAdoptionDialog,
} from '../../../src/ui/content-adoption-dialog';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
});

function itemProjection(
  name: string,
  payload: unknown,
  options: {
    readonly declaredAlias?: ContentKey;
    readonly metadataConflict?: boolean;
    readonly conflictDetails?: ContentImportProjection<'item'>['conflictDetails'];
    readonly referenceOnly?: ContentImportProjection<'item'>['referenceOnly'];
  } = {},
): ContentImportProjection<'item'> {
  const assertedKey = assertedExternalContentKey('item', '2024', name);
  return {
    kind: 'item',
    edition: '2024',
    name,
    assertedKey,
    payload,
    ...(options.declaredAlias === undefined
      ? {}
      : { declaredAlias: options.declaredAlias }),
    ...(options.metadataConflict === undefined
      ? {}
      : { metadataConflict: options.metadataConflict }),
    ...(options.conflictDetails === undefined
      ? {}
      : { conflictDetails: options.conflictDetails }),
    ...(options.referenceOnly === undefined
      ? {}
      : { referenceOnly: options.referenceOnly }),
    projectStored: (database, contentKey) => {
      const row = database.oneRaw(
        `SELECT rules_edition, name, description
         FROM item_definitions WHERE content_key = ?`,
        [contentKey],
      );
      if (row === null) throw new TypeError(`Missing stored item '${contentKey}'.`);
      return {
        kind: 'item',
        edition: String(row.rules_edition),
        name: String(row.name),
        payload: JSON.parse(String(row.description)) as unknown,
      };
    },
    install: (database, contentKey, installed) => {
      database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (?, '2024', ?, ?, 0)`,
        [contentKey, installed.name, canonicalJson(installed.payload)],
      );
    },
  };
}

function itemNode(
  id: string,
  name: string,
  payload: unknown,
  options: Parameters<typeof itemProjection>[2] = {},
): ContentImportNode<'item'> {
  return { id: `portable:item:${id}`, projection: itemProjection(name, payload, options) };
}

function insertItem(
  db: DatabaseContext,
  contentKey: ContentKey,
  name: string,
  payload: unknown,
): void {
  db.exec(
    `INSERT INTO item_definitions (
       content_key, rules_edition, name, description, requires_attunement
     ) VALUES (?, '2024', ?, ?, 0)`,
    [contentKey, name, canonicalJson(payload)],
  );
}

function bundledItem(
  db: DatabaseContext,
  contentKey: ContentKey,
  name: string,
  payload: unknown,
): void {
  const identity = deriveContentIdentityV1({
    kind: 'item', edition: '2024', name, payload,
  });
  registerBundledStableContentIdentity(db, {
    kind: 'item', contentKey, normalizedName: identity.envelope.normalizedName,
  });
  insertItem(db, contentKey, name, payload);
  registerContentFingerprint(db, {
    kind: 'item',
    contentKey,
    scheme: identity.envelope.scheme,
    digest: identity.digest,
    canonicalJson: identity.canonicalJson,
    role: 'current',
  });
}

function commitNewItem(db: DatabaseContext, node: ContentImportNode<'item'>): void {
  const initial = planContentImport(db, [node]);
  const committed = commitContentImport(db, { nodes: [node], token: initial.token });
  if (committed.kind !== 'committed') {
    throw new TypeError(`Could not install test item: ${committed.kind}.`);
  }
}

function publishPreview(): PublishPreview {
  return {
    token: 'publish-dialog-token' as never,
    facts: {
      draft_uuid: 'publish-dialog-draft' as HomebrewDraftUuid,
      draft_revision: 1 as DraftRevision,
      content_kind: 'species',
      canonical_json: '{}' as never,
      candidate_content_keys: ['2024:species:human' as ContentKey],
      candidate_identities: [],
    },
    aggregate: {
      kind: 'species',
      name: 'Incoming Human',
      rules_edition: 'expanded',
      reference_text: '',
      repeatable: false,
      creature_type: 'Humanoid',
      primary_size: 'Medium',
      alternate_size: null,
      walking_speed_feet: 30,
      traits: [],
      grants: [],
    },
    review: [{
      candidate_content_key: '2024:species:human' as ContentKey,
      candidate_name: 'Human',
      candidate_catalog_layer: 'bundled',
      reason: 'srd-fallback',
      default_decision: 'match',
    }],
  };
}

const publishResult: PublishResult = {
  outcome: 'matched_existing',
  content_key: '2024:species:human' as ContentKey,
  name: 'Human',
  catalog_layer: 'bundled',
  previous_key_usage_count: 0,
};

function keydown(key: string, shiftKey = false): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true }) as KeyboardEvent;
  Object.defineProperties(event, {
    key: { value: key },
    shiftKey: { value: shiftKey },
  });
  return event;
}

describe('the D82 content-adoption dialog', () => {
  it('CI-8 discloses real planner counts, every match reason, and both collision labels', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);

    const exact = itemNode('exact', 'Exact Relic', { rule: 'exact' });
    const exactIdentity = deriveContentIdentityV1(exact.projection);
    const metadataPayload = {
      rule: 'metadata',
      dependency: {
        kind: exactIdentity.envelope.kind,
        scheme: exactIdentity.envelope.scheme,
        digest: exactIdentity.digest,
      },
    };
    const metadata = itemNode('metadata', 'Metadata Relic', metadataPayload);
    const sameNameStored = itemNode(
      'same-name-stored',
      'Shared Relic',
      { rule: 'stored' },
    );
    commitNewItem(db, exact);
    commitNewItem(db, metadata);
    commitNewItem(db, sameNameStored);
    const unevidencedStored = itemNode(
      'unevidenced-stored',
      'Unevidenced Relic',
      { rule: 'local-only' },
    );
    commitNewItem(db, unevidencedStored);

    const aliasKey = '2014:item:alias-relic' as ContentKey;
    bundledItem(
      db,
      '2024:item:alias-target' as ContentKey,
      'Alias Relic',
      { rule: 'alias' },
    );
    registerContentAlias(db, {
      kind: 'item', aliasKey, contentKey: '2024:item:alias-target' as ContentKey,
      aliasKind: 'declared-legacy',
    });

    bundledItem(
      db,
      '2024:item:srd-target' as ContentKey,
      'Bundled Relic',
      { rule: 'bundled' },
    );

    const compatiblePayload = { rule: 'compatible' };
    const compatibleIdentity = registerDerivedContentIdentity(db, {
      kind: 'item',
      edition: '2024',
      name: 'Compatible Relic',
      payload: compatiblePayload,
    });
    insertItem(
      db,
      compatibleIdentity.derivedKey,
      'Compatible Relic',
      compatiblePayload,
    );

    const collisionAlias = '2014:item:foreign-alias' as ContentKey;
    bundledItem(
      db,
      '2024:item:local-alias-target' as ContentKey,
      'Local Alias Target',
      { rule: 'local-alias-rules' },
    );
    registerContentAlias(db, {
      kind: 'item',
      aliasKey: collisionAlias,
      contentKey: '2024:item:local-alias-target' as ContentKey,
      aliasKind: 'declared-legacy',
    });

    const nodes: readonly ContentImportNode<'item'>[] = [
      itemNode('new', 'New Relic', { rule: 'new' }),
      exact,
      itemNode('alias', 'Alias Relic', { rule: 'alias' }, {
        declaredAlias: aliasKey,
      }),
      itemNode('compatible', 'Compatible Relic', compatiblePayload),
      itemNode('srd', 'Bundled Relic', { rule: 'bundled' }),
      itemNode('metadata-review', 'Metadata Relic', metadataPayload, {
        metadataConflict: true,
        conflictDetails: [{
          field: 'Source book',
          incomingValue: 'Incoming Guide',
          localValue: 'Local Guide',
        }],
      }),
      itemNode('same-name-distinct', 'shared-relic', { rule: 'incoming' }),
      itemNode('unevidenced', 'Unevidenced Relic', { rule: 'not-evidence' }, {
        referenceOnly: {
          contentKey: unevidencedStored.projection.assertedKey,
        },
      }),
      itemNode('alias-distinct', 'Incoming Alias Source', { rule: 'incoming-alias-rules' }, {
        declaredAlias: collisionAlias,
      }),
      itemNode('refused', 'Refused Relic', {
        missing: {
          kind: 'item',
          scheme: CONTENT_FINGERPRINT_SCHEME_V1,
          digest: 'f'.repeat(64),
        },
      }),
    ];
    const previewPlan = portableImportPlan(planContentImport(db, nodes));
    expect(previewPlan.preview.new_by_kind.item).toBe(1);
    expect(previewPlan.preview.matched_by_kind.item).toBe(1);
    expect(previewPlan.preview.review_required_by_kind.item).toBe(7);
    expect(previewPlan.preview.refused_by_kind.item).toBe(1);
    expect(Object.fromEntries(previewPlan.outcomes.map((outcome) => [
      outcome.id,
      outcome.kind,
    ]))).toMatchObject({
      'portable:item:new': 'create',
      'portable:item:exact': 'match',
      'portable:item:alias': 'review',
      'portable:item:compatible': 'review',
      'portable:item:same-name-distinct': 'review',
      'portable:item:unevidenced': 'review',
      'portable:item:refused': 'refused',
    });
    expect(Object.fromEntries(previewPlan.reviews.map((review) => [
      review.id,
      review.matchClass,
    ]))).toEqual({
      'portable:item:alias': 'alias',
      'portable:item:compatible': 'compatible-fingerprint',
      'portable:item:srd': 'srd-fallback',
      'portable:item:metadata-review': 'metadata-conflict',
      'portable:item:same-name-distinct': 'key-collision',
      'portable:item:unevidenced': 'key-collision',
      'portable:item:alias-distinct': 'key-collision',
    });
    expect(previewPlan.reviews.find((review) =>
      review.id === 'portable:item:same-name-distinct',
    )).toEqual(expect.objectContaining({
      incomingName: 'shared-relic',
      localName: 'Shared Relic',
      localCatalogLayer: 'external',
      matchClass: 'key-collision',
    }));
    expect(previewPlan.reviews.find((review) =>
      review.id === 'portable:item:alias-distinct',
    )).toEqual(expect.objectContaining({
      incomingName: 'Incoming Alias Source',
      localName: 'Local Alias Target',
      matchClass: 'key-collision',
    }));

    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = createContentAdoptionDialog({
        mount: document.body,
        plan: previewPlan,
        replan: async () => previewPlan,
        commit: async () => ({ kind: 'committed', outcomes: previewPlan.outcomes }),
        onCommitted: () => undefined,
      });
      const text = elementText(rendered.element);

      expect(text).toContain('item: 1 new, 1 matched, 7 needs review, 1 refused');
      expect(text).toContain('4 conflicts must be reviewed below.');
      const dialog = interactiveElement(rendered.element);
      expect(dialog.isConnected).toBe(true);
      expect(dialog.open).toBe(true);
      expect(() => dialog.showModal()).toThrowError(
        expect.objectContaining({ name: 'InvalidStateError' }),
      );
      const renderedReasons = Object.fromEntries(
        dialog.querySelectorAll('.content-adoption-row').map((row) => [
          row.getAttribute('data-content-id'),
          elementText(row as unknown as Node).match(/Match reason: ([^—]+)—/)?.[1]?.trim(),
        ]),
      );
      expect(renderedReasons).toEqual({
        'portable:item:alias': 'Alias',
        'portable:item:compatible': 'Compatible fingerprint',
        'portable:item:srd': 'SRD fingerprint fallback',
        'portable:item:metadata-review': 'Metadata conflict',
        'portable:item:same-name-distinct': 'Same name, distinct rules content',
        'portable:item:unevidenced': 'Reference supplied no rules evidence',
        'portable:item:alias-distinct': 'Alias points to distinct rules content',
      });
      expect(text).toContain(
        'Source book — incoming: Incoming Guide; local: Local Guide',
      );
      expect(text).toContain(
        'local: Shared Relic — Homebrew · external layer',
      );
      expect(text).toContain('Depends on: portable:item:exact');
      expect(text).toContain(
        'The normalized name is already in use for different rules. Rename the private copy to keep both.',
      );
      expect(text).toContain(
        'The share supplied only a reference, not incoming rules. Confirm that your local content should stand in for it, or keep a renamed private copy.',
      );
      expect(text).toContain(
        'The incoming alias points to differently named local content with different rules.',
      );
      expect(text).toContain(
        'Match — Discards the incoming rules; existing characters keep the local entry.',
      );
      expect(text).toContain(
        'Clone — Installs the incoming rules under a new name; existing characters stay on the local entry.',
      );
      const distinctRow = dialog.querySelectorAll('.content-adoption-row').find(
        (row) => row.getAttribute('data-content-id') ===
          'portable:item:same-name-distinct',
      );
      const compatibleRow = dialog.querySelectorAll('.content-adoption-row').find(
        (row) => row.getAttribute('data-content-id') ===
          'portable:item:compatible',
      );
      if (distinctRow === undefined || compatibleRow === undefined) {
        throw new Error('Expected adoption review rows are missing.');
      }
      expect(distinctRow.querySelectorAll('input').slice(0, 2).map((input) =>
        input.getAttribute('checked')
      )).toEqual([null, null]);
      expect(compatibleRow.querySelectorAll('input')[0]?.getAttribute('checked'))
        .toBe('');
      const commitButton = dialog.querySelectorAll('button')
        .find((button) => button.textContent === 'Import with these choices');
      expect(commitButton?.disabled).toBe(true);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('D108-CI8 traps focus and restores the invoker for Cancel, native cancel, and Escape', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    const plan = planContentImport(db, [itemNode(
      'modal-discipline', 'Modal Discipline', { rule: 'shared trap' },
    )]);
    const restoreDocument = installInteractiveDocument();
    try {
      const actions: readonly ((dialog: InteractiveTestElement) => void)[] = [
        (dialog) => dialog.querySelectorAll('button').find((candidate) =>
          candidate.textContent === 'Cancel',
        )?.click(),
        (dialog) => { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); },
        (dialog) => { dialog.dispatchEvent(keydown('Escape')); },
      ];
      for (const [index, action] of actions.entries()) {
        const invoker = document.createElement('button');
        document.body.append(invoker);
        invoker.focus();
        let cancellations = 0;
        const rendered = createContentAdoptionDialog({
          mount: document.body,
          plan,
          replan: async () => plan,
          commit: async () => ({ kind: 'committed', outcomes: plan.outcomes }),
          onCommitted: () => undefined,
          onCancel: () => { cancellations += 1; },
        });
        const dialog = interactiveElement(rendered.element);
        const buttons = dialog.querySelectorAll('button');
        const cancel = buttons.find((candidate) => candidate.textContent === 'Cancel');
        const commit = buttons.find((candidate) =>
          candidate.textContent === 'Import with these choices');
        if (cancel === undefined || commit === undefined) {
          throw new Error('CI-8 modal controls are missing.');
        }
        expect(document.activeElement).toBe(cancel);
        if (index === 0) {
          dialog.dispatchEvent(keydown('Tab', true));
          expect(document.activeElement).toBe(commit);
          dialog.dispatchEvent(keydown('Tab'));
          expect(document.activeElement).toBe(cancel);
        }
        action(dialog);
        expect(cancellations).toBe(1);
        expect(dialog.isConnected).toBe(false);
        expect(document.activeElement).toBe(invoker);
        rendered.cleanup();
      }
    } finally {
      restoreDocument();
    }
  });

  it('keeps lossless review rows on Match and replans before clone commit', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    const alias = '2014:item:road-mage' as ContentKey;
    bundledItem(
      db,
      '2024:item:road-mage' as ContentKey,
      'Road Mage',
      { rule: 'road' },
    );
    registerContentAlias(db, {
      kind: 'item', aliasKey: alias, contentKey: '2024:item:road-mage' as ContentKey,
      aliasKind: 'declared-legacy',
    });
    const incoming = itemNode('road-mage', 'Road Mage', { rule: 'road' }, {
      declaredAlias: alias,
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const replans: ContentImportChoices[] = [];
      const commits: ContentImportChoices[] = [];
      const initial = planContentImport(db, [incoming]);
      const rendered = createContentAdoptionDialog({
        mount: document.body,
        plan: initial,
        replan: async (choices) => {
          replans.push(choices);
          return planContentImport(db, [incoming], choices);
        },
        commit: async (submitted, choices) => {
          commits.push(choices);
          return commitContentImport(db, {
            nodes: [incoming], token: submitted.token, choices,
          });
        },
        onCommitted: () => undefined,
      });
      const dialog = interactiveElement(rendered.element);

      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(elementText(rendered.element)).toContain('Match reason: Alias');
      const inputs = dialog.querySelectorAll('input');
      expect(inputs[0]?.getAttribute('value')).toBe('match');
      expect(inputs[0]?.getAttribute('checked')).toBe('');

      const cloneName = inputs[2];
      if (cloneName === undefined) throw new Error('Clone-name input missing.');
      cloneName.value = 'Road Mage (Private copy)';
      inputs[1]?.dispatchEvent(new Event('change'));
      await rendered.whenSettled();

      expect(replans).toEqual([{
        'portable:item:road-mage': {
          decision: 'clone',
          cloneName: 'Road Mage (Private copy)',
        },
      }]);
      const commitButton = dialog.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices',
      );
      if (commitButton === undefined) throw new Error('Commit button missing.');
      expect(commitButton.disabled).toBe(false);
      commitButton.click();
      await rendered.whenSettled();
      expect(commits).toEqual(replans);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('requires an explicit choice for same-name distinct rules before commit', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    commitNewItem(db, itemNode(
      'installed-collision',
      'Collision Relic',
      { rule: 'local' },
    ));
    const incoming = itemNode(
      'incoming-collision',
      'Collision Relic',
      { rule: 'incoming' },
    );
    const initial = planContentImport(db, [incoming]);

    expect(initial.reviews).toEqual([
      expect.objectContaining({
        id: 'portable:item:incoming-collision',
        matchClass: 'key-collision',
        defaultChoice: null,
        selectedChoice: null,
      }),
    ]);
    expect(commitContentImport(db, {
      nodes: [incoming],
      token: initial.token,
    })).toEqual(expect.objectContaining({
      kind: 'refused',
      reason: 'entry_refused',
    }));

    const restoreDocument = installInteractiveDocument();
    try {
      const replans: ContentImportChoices[] = [];
      const rendered = createContentAdoptionDialog({
        mount: document.body,
        plan: initial,
        replan: async (choices) => {
          replans.push(choices);
          return planContentImport(db, [incoming], choices);
        },
        commit: async (submitted, choices) => commitContentImport(db, {
          nodes: [incoming],
          token: submitted.token,
          choices,
        }),
        onCommitted: () => undefined,
      });
      const dialog = interactiveElement(rendered.element);
      const inputs = dialog.querySelectorAll('input');
      const commitButton = dialog.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices'
      );
      if (commitButton === undefined) throw new Error('Commit button is missing.');

      expect(inputs.slice(0, 2).map((input) => input.getAttribute('checked')))
        .toEqual([null, null]);
      expect(commitButton.disabled).toBe(true);
      inputs[0]?.dispatchEvent(new Event('change'));
      await rendered.whenSettled();

      expect(replans).toEqual([{
        'portable:item:incoming-collision': {
          decision: 'match',
        },
      }]);
      expect(commitButton.disabled).toBe(false);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('drops an implicit Match when a stale refresh becomes a key collision', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    const alias = '2014:item:stale-review' as ContentKey;
    bundledItem(
      db,
      '2024:item:stale-review' as ContentKey,
      'Stale Review Relic',
      { rule: 'local' },
    );
    registerContentAlias(db, {
      kind: 'item',
      aliasKey: alias,
      contentKey: '2024:item:stale-review' as ContentKey,
      aliasKind: 'declared-legacy',
    });
    const lossless = itemNode(
      'stale-review',
      'Stale Review Relic',
      { rule: 'local' },
      { declaredAlias: alias },
    );
    const distinct = itemNode(
      'stale-review',
      'Stale Review Relic',
      { rule: 'incoming' },
      { declaredAlias: alias },
    );
    const initial = planContentImport(db, [lossless]);
    const freshPlan = planContentImport(db, [distinct]);

    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = createContentAdoptionDialog({
        mount: document.body,
        plan: initial,
        replan: async () => freshPlan,
        commit: async () => ({ kind: 'stale-plan', freshPlan }),
        onCommitted: () => undefined,
      });
      const dialog = interactiveElement(rendered.element);
      const commitButton = dialog.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices'
      );
      if (commitButton === undefined) throw new Error('Commit button is missing.');
      expect(dialog.querySelectorAll('input')[0]?.getAttribute('checked')).toBe('');
      expect(commitButton.disabled).toBe(false);

      commitButton.click();
      await rendered.whenSettled();

      expect(dialog.querySelectorAll('input').slice(0, 2).map((input) =>
        input.getAttribute('checked')
      )).toEqual([null, null]);
      expect(commitButton.disabled).toBe(true);
      expect(elementText(dialog as unknown as Node)).toContain(
        'The catalog changed. Review the refreshed plan before committing.',
      );
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('CI-REVIEW-DEFAULT commits untouched defaults through the real plan token', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    const target = '2024:item:default-target' as ContentKey;
    const alias = '2014:legacy:default-target' as ContentKey;
    const payload = { rule: 'same' };
    registerBundledStableContentIdentity(db, {
      kind: 'item', contentKey: target, normalizedName: 'defaulttarget',
    });
    db.exec(
      `INSERT INTO item_definitions (
         content_key, rules_edition, name, description, requires_attunement
       ) VALUES (?, '2024', 'Default Target', ?, 0)`,
      [target, JSON.stringify(payload)],
    );
    const identity = deriveContentIdentityV1({
      kind: 'item', edition: '2024', name: 'Default Target', payload,
    });
    registerContentFingerprint(db, {
      kind: 'item',
      contentKey: target,
      scheme: identity.envelope.scheme,
      digest: identity.digest,
      canonicalJson: identity.canonicalJson,
      role: 'current',
    });
    registerContentAlias(db, {
      kind: 'item', aliasKey: alias, contentKey: target,
      aliasKind: 'declared-legacy',
    });
    const node: ContentImportNode<'item'> = {
      id: 'item:default-target',
      dependencies: [],
      projection: {
        kind: 'item',
        edition: '2024',
        name: 'Default Target',
        assertedKey: assertedExternalContentKey('item', '2024', 'Default Target'),
        declaredAlias: alias,
        payload,
        projectStored: (database, contentKey) => {
          const row = database.oneRaw(
            `SELECT rules_edition, name, description FROM item_definitions
             WHERE content_key = ?`,
            [contentKey],
          );
          if (row === null) throw new TypeError('Missing dialog target.');
          return {
            kind: 'item',
            edition: String(row.rules_edition),
            name: String(row.name),
            payload: JSON.parse(String(row.description)) as unknown,
          };
        },
        install: () => {
          throw new Error('The default match must not install content.');
        },
      },
    };
    const initial = planContentImport(db, [node]);
    expect(initial.reviews).toHaveLength(1);

    const restoreDocument = installInteractiveDocument();
    try {
      let committed = false;
      const rendered = createContentAdoptionDialog({
        mount: document.body,
        plan: initial,
        replan: async (choices) => planContentImport(db, [node], choices),
        commit: async (submitted, choices) => commitContentImport(db, {
          nodes: [node], token: submitted.token, choices,
        }),
        onCommitted: () => { committed = true; },
      });
      const dialog = interactiveElement(rendered.element);
      const commitButton = dialog.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices',
      );
      if (commitButton === undefined) throw new Error('Commit button missing.');
      commitButton.click();
      await rendered.whenSettled();

      expect(committed).toBe(true);
      expect(db.scalar<number>('SELECT count(*) FROM item_definitions')).toBe(1);
      expect(db.scalar<number>(
        'SELECT count(*) FROM catalog_content_match_decisions',
      )).toBe(1);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });
});

describe('the D108 publish-adoption dialog', () => {
  it('D108-PUBLISH commits the untouched default Match and restores focus after success', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const invoker = document.createElement('button');
      document.body.append(invoker);
      invoker.focus();
      const submitted: unknown[] = [];
      const committed: PublishResult[] = [];
      const rendered = createPublishAdoptionDialog({
        mount: document.body,
        preview: publishPreview(),
        commit: async (decisions) => {
          submitted.push(decisions);
          return publishResult;
        },
        onCommitted: (result) => { committed.push(result); },
        restoreFocus: () => invoker.focus(),
      });
      const dialog = interactiveElement(rendered.element);
      const inputs = dialog.querySelectorAll('input');
      expect(inputs[0]?.getAttribute('checked')).toBe('');
      expect(inputs[1]?.getAttribute('checked')).toBeNull();
      expect(inputs[2]?.disabled).toBe(true);
      dialog.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Publish with these choices',
      )?.click();
      await rendered.whenSettled();

      expect(submitted).toEqual([[{
        candidate_content_key: '2024:species:human',
        decision: 'match',
      }]]);
      expect(committed).toEqual([publishResult]);
      expect(dialog.isConnected).toBe(false);
      expect(document.activeElement).toBe(invoker);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('D108-PUBLISH Cancel, native cancel, and Escape all dismiss and restore the invoker', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const actions: readonly ((dialog: InteractiveTestElement) => void)[] = [
        (dialog) => dialog.querySelectorAll('button').find((candidate) =>
          candidate.textContent === 'Cancel',
        )?.click(),
        (dialog) => { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); },
        (dialog) => { dialog.dispatchEvent(keydown('Escape')); },
      ];
      for (const action of actions) {
        const invoker = document.createElement('button');
        document.body.append(invoker);
        invoker.focus();
        let cancellations = 0;
        const rendered = createPublishAdoptionDialog({
          mount: document.body,
          preview: publishPreview(),
          commit: async () => publishResult,
          onCommitted: () => undefined,
          onCancel: () => { cancellations += 1; },
          restoreFocus: () => invoker.focus(),
        });
        const dialog = interactiveElement(rendered.element);
        action(dialog);
        expect(cancellations).toBe(1);
        expect(dialog.isConnected).toBe(false);
        expect(document.activeElement).toBe(invoker);
        rendered.cleanup();
      }
    } finally {
      restoreDocument();
    }
  });

  it('D108-PUBLISH wraps Tab and Shift+Tab across enabled modal controls', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = createPublishAdoptionDialog({
        mount: document.body,
        preview: publishPreview(),
        commit: async () => publishResult,
        onCommitted: () => undefined,
        restoreFocus: () => undefined,
      });
      const dialog = interactiveElement(rendered.element);
      const inputs = dialog.querySelectorAll('input');
      const commit = dialog.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Publish with these choices',
      );
      if (commit === undefined || inputs[0] === undefined) {
        throw new Error('Publish modal controls are missing.');
      }

      expect(document.activeElement).toBe(inputs[0]);
      dialog.dispatchEvent(keydown('Tab', true));
      expect(document.activeElement).toBe(commit);
      dialog.dispatchEvent(keydown('Tab'));
      expect(document.activeElement).toBe(inputs[0]);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('D108-PUBLISH renders commit errors as alerts and restores an enabled retry control', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = createPublishAdoptionDialog({
        mount: document.body,
        preview: publishPreview(),
        commit: async () => { throw new Error('Publish adoption was refused.'); },
        onCommitted: () => undefined,
        restoreFocus: () => undefined,
      });
      const dialog = interactiveElement(rendered.element);
      const commit = dialog.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Publish with these choices',
      );
      if (commit === undefined) throw new Error('Publish control is missing.');
      commit.click();
      await rendered.whenSettled();

      expect(dialog.isConnected).toBe(true);
      expect(dialog.querySelector('[role="alert"]')?.textContent)
        .toBe('Publish adoption was refused.');
      expect(commit.disabled).toBe(false);
      expect(document.activeElement).toBe(commit);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });
});
