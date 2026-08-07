import { afterEach, describe, expect, it } from 'vitest';
import type {
  HomebrewDraftItemUuid,
  SpeciesAuthoringDraft,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import { AUTHORING_RPC, createAuthoringClient } from '../../../src/authoring/client';
import {
  BUNDLED_HOMEBREW_CATALOG,
  type BundledHomebrewCatalogEntry,
} from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import { CatalogAuthoringService } from '../../../src/authoring/draft-service';
import { speciesDraftToAggregate } from '../../../src/authoring/species-publisher';
import {
  applyGuidedOrigin,
  createGuidedCharacter,
  listGuidedClassOptions,
} from '../../../src/builder/guided-creation';
import { planContentImport, commitContentImport } from '../../../src/catalog/content-adoption';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import { registerContentAlias } from '../../../src/catalog/content-registry';
import { portableSourceContentImportNode } from '../../../src/catalog/source-content-importer';
import { projectAuthoredContentAggregateV1 } from '../../../src/catalog/stored-authored-content-projector-v1';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import type { CharacterId, ContentKey } from '../../../src/domain/ids';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { assignSpellSelection } from '../../../src/eligibility/spell-selection-assignment';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import type { HandlerContext, RpcHandler } from '../../../src/worker/handler';
import { handlers } from '../../../src/worker/handlers/authoring';
import { createRpcRegistry, type RpcRegistry } from '../../../src/worker/registry';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';
import { createImportBackupControls } from '../../../src/ui/screens/character-list/import-backup-controls';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import type { SubclassAuthoringDraft } from '../../../src/authoring/contracts';

let harness: RpcHarness | undefined;
let client: RpcClient | undefined;
const registry = createRpcRegistry({ authoring: { handlers } });

afterEach(() => {
  harness?.close();
  harness = undefined;
  client?.close();
  client = undefined;
});

class WorkerTransport implements RpcTransport {
  readonly #messages = new Set<(event: MessageEvent<RpcResponse>) => void>();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(
    private readonly context: HandlerContext,
    private readonly dispatcher: RpcRegistry = registry,
  ) {}

  postMessage(message: RpcRequest): void {
    void this.dispatcher.dispatch(message, this.context).then((response) => {
      for (const listener of this.#messages) {
        listener(new MessageEvent<RpcResponse>('message', { data: response }));
      }
    });
  }

  addEventListener(type: 'message', listener: (event: MessageEvent<RpcResponse>) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  addEventListener(type: 'message' | 'error', listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === 'message') this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    else this.#errors.add(listener as (event: ErrorEvent) => void);
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<RpcResponse>) => void): void;
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  removeEventListener(type: 'message' | 'error', listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === 'message') this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    else this.#errors.delete(listener as (event: ErrorEvent) => void);
  }
}

function keydown(key: string, shiftKey = false): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true }) as KeyboardEvent;
  Object.defineProperties(event, {
    key: { value: key },
    shiftKey: { value: shiftKey },
  });
  return event;
}

function completeSpecies(
  created: StoredHomebrewDraft,
  name: string,
  speed: number,
): SpeciesAuthoringDraft {
  if (created.document.kind !== 'species') throw new Error('Species draft required.');
  return {
    ...created.document,
    name,
    rules_edition: 'expanded',
    creature_type: 'Humanoid',
    primary_size: 'Medium',
    walking_speed_feet: speed,
  };
}

function publishSpecies(
  service: CatalogAuthoringService,
  name: string,
  speed: number,
  maximumSpellLevel?: number,
) {
  const created = service.createDraft({ content_kind: 'species' });
  const document = completeSpecies(created, name, speed);
  const saved = service.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document: maximumSpellLevel === undefined
      ? document
      : {
          ...document,
          grants: [{
            kind: 'choice_from_list',
            draft_item_uuid: `${name}-spell-choice` as HomebrewDraftItemUuid,
            rule_key: 'retarget-spell-choice',
            list: 'Wizard',
            count: 1,
            maximum_spell_level: maximumSpellLevel,
          }],
        },
  });
  const preview = service.previewPublish({
    draft_uuid: saved.draft_uuid,
    expected_revision: saved.revision,
  });
  return service.commitPublish({ token: preview.token, decisions: [] });
}

async function open(): Promise<RpcHarness> {
  harness = await createRpcHarness(handlers);
  return harness;
}

describe('catalog authoring RPC handlers', () => {
  it('exposes the HA-2 create/read/save/discard/list surface through migrated storage', async () => {
    const rpc = await open();
    const createdResponse = await rpc.call<Record<string, unknown>, StoredHomebrewDraft>(
      AUTHORING_RPC.createDraft,
      { content_kind: 'species' },
    );
    expect(createdResponse.ok).toBe(true);
    if (!createdResponse.ok) throw new Error(createdResponse.error.message);
    const created = createdResponse.result;

    expect(await rpc.call(AUTHORING_RPC.readDraft, {
      draft_uuid: created.draft_uuid,
    })).toMatchObject({ ok: true, result: { revision: 0 } });
    expect(await rpc.call(AUTHORING_RPC.saveDraft, {
      draft_uuid: created.draft_uuid,
      expected_revision: 0,
      document: { ...created.document, name: 'Saved through RPC' },
    })).toMatchObject({
      ok: true,
      result: { revision: 1, document: { name: 'Saved through RPC' } },
    });
    expect(await rpc.call(AUTHORING_RPC.list, {})).toMatchObject({
      ok: true,
      result: { drafts: [{ revision: 1, name: 'Saved through RPC' }] },
    });
    expect(await rpc.call(AUTHORING_RPC.discardDraft, {
      draft_uuid: created.draft_uuid,
      expected_revision: 1,
    })).toMatchObject({ ok: true, result: null });
    expect(await rpc.call(AUTHORING_RPC.readDraft, {
      draft_uuid: created.draft_uuid,
    })).toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        data: { reason: 'draft_not_found' },
      },
    });
  });

  it('rejects class, extra params, and unknown document fields at their proper boundaries', async () => {
    const rpc = await open();
    expect(await rpc.call(AUTHORING_RPC.createDraft, {
      content_kind: 'class',
    })).toMatchObject({ ok: false, error: { code: 'invalid_params' } });
    expect(await rpc.call(AUTHORING_RPC.createDraft, {
      content_kind: 'species',
      extra: true,
    })).toMatchObject({ ok: false, error: { code: 'invalid_params' } });

    const createdResponse = await rpc.call<Record<string, unknown>, StoredHomebrewDraft>(
      AUTHORING_RPC.createDraft,
      { content_kind: 'background' },
    );
    if (!createdResponse.ok) throw new Error(createdResponse.error.message);
    const created = createdResponse.result;
    expect(await rpc.call(AUTHORING_RPC.saveDraft, {
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: { ...created.document, future_field: true },
    })).toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        data: {
          reason: 'validation_failed',
          issues: [{ path: ['future_field'], code: 'unknown_field' }],
        },
      },
    });
  });

  it('returns structured revision conflict data instead of overwriting a stale tab', async () => {
    const rpc = await open();
    const createdResponse = await rpc.call<Record<string, unknown>, StoredHomebrewDraft>(
      AUTHORING_RPC.createDraft,
      { content_kind: 'subclass' },
    );
    if (!createdResponse.ok) throw new Error(createdResponse.error.message);
    const created = createdResponse.result;
    await rpc.call(AUTHORING_RPC.saveDraft, {
      draft_uuid: created.draft_uuid,
      expected_revision: 0,
      document: { ...created.document, name: 'Winner' },
    });

    expect(await rpc.call(AUTHORING_RPC.saveDraft, {
      draft_uuid: created.draft_uuid,
      expected_revision: 0,
      document: { ...created.document, name: 'Stale loser' },
    })).toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        data: {
          reason: 'stale_draft_revision',
          draft_uuid: created.draft_uuid,
          expected_revision: 0,
          actual_revision: 1,
        },
      },
    });
  });

  it('publishes a complete species through the public preview and commit handlers', async () => {
    const rpc = await open();
    const createdResponse = await rpc.call<Record<string, unknown>, StoredHomebrewDraft>(
      AUTHORING_RPC.createDraft,
      { content_kind: 'species' },
    );
    if (!createdResponse.ok) throw new Error(createdResponse.error.message);
    const created = createdResponse.result;
    const savedResponse = await rpc.call<Record<string, unknown>, StoredHomebrewDraft>(
      AUTHORING_RPC.saveDraft,
      {
        draft_uuid: created.draft_uuid,
        expected_revision: created.revision,
        document: {
          ...created.document,
          name: 'RPC Clockwork',
          rules_edition: 'expanded',
          creature_type: 'Clockwork',
          primary_size: 'Colossal',
          walking_speed_feet: 30,
        },
      },
    );
    if (!savedResponse.ok) throw new Error(savedResponse.error.message);
    const saved = savedResponse.result;
    const preview = await rpc.call(AUTHORING_RPC.previewPublish, {
      draft_uuid: saved.draft_uuid,
      expected_revision: saved.revision,
    });
    expect(preview).toMatchObject({
      ok: true,
      result: {
        aggregate: { kind: 'species', name: 'RPC Clockwork' },
        review: [],
      },
    });
    if (!preview.ok || typeof preview.result !== 'object' || preview.result === null) {
      throw new Error('Species preview failed.');
    }
    const token = Reflect.get(preview.result, 'token');
    if (typeof token !== 'string') throw new Error('Species preview token is missing.');
    expect(await rpc.call(AUTHORING_RPC.commitPublish, {
      token,
      decisions: [],
    })).toMatchObject({
      ok: true,
      result: {
        outcome: 'created',
        content_key: 'expanded:content.species:rpc-clockwork',
        catalog_layer: 'external',
      },
    });
    expect(await rpc.call(AUTHORING_RPC.readDraft, {
      draft_uuid: saved.draft_uuid,
    })).toMatchObject({
      ok: false,
      error: { data: { reason: 'draft_not_found' } },
    });
  });

  it('previews and atomically installs bundled homebrew through the public RPC surface', async () => {
    // Measured alone at 1.94s; 20s retains contention headroom.
    const rpc = await open();
    client = new RpcClient(new WorkerTransport(rpc.context));
    const authoring = createAuthoringClient(client);

    const preview = await authoring.previewBundledHomebrew();
    expect(preview.entries).toEqual([
      expect.objectContaining({ name: 'Veteran', outcome: 'create' }),
      expect.objectContaining({ name: 'Warrior of the Barbed Court', outcome: 'create' }),
      expect.objectContaining({ name: 'Spell Student', outcome: 'create' }),
    ]);
    expect(await authoring.installBundledHomebrew({ token: preview.token })).toMatchObject({
      kind: 'committed',
      outcomes: [
        { kind: 'create' },
        { kind: 'create' },
        { kind: 'create' },
      ],
    });
    expect((await authoring.list()).published
      .filter((entry) => ['Veteran', 'Warrior of the Barbed Court', 'Spell Student']
        .includes(entry.name))
      .map((entry) => ({ name: entry.name, catalog_layer: entry.catalog_layer })))
      .toEqual([
        { name: 'Spell Student', catalog_layer: 'external' },
        { name: 'Veteran', catalog_layer: 'external' },
        { name: 'Warrior of the Barbed Court', catalog_layer: 'external' },
      ]);

    expect(await rpc.call(AUTHORING_RPC.previewBundledHomebrew, { extra: true }))
      .toMatchObject({ ok: false, error: { code: 'invalid_params' } });
    expect(await rpc.call(AUTHORING_RPC.installBundledHomebrew, { token: '', extra: true }))
      .toMatchObject({ ok: false, error: { code: 'invalid_params' } });
  }, 20_000);

  it('invokes the real bundled installer through client and RPC with inert hostile text and modal focus discipline', async () => {
    const rpc = await open();
    const base = BUNDLED_HOMEBREW_CATALOG[2].revisions[0];
    const hostileName = '<img src=x onerror=alert(1)> Hostile Student';
    const hostileDocument: SubclassAuthoringDraft = { ...base, name: hostileName };
    const hostileCatalog = Object.freeze([Object.freeze({
      catalog_key: 'hostile-spell-student',
      revisions: Object.freeze([hostileDocument] as const),
    })] as const satisfies readonly BundledHomebrewCatalogEntry[]);
    const routedHandlers = handlers.map((handler): RpcHandler => {
      if (handler.method === AUTHORING_RPC.previewBundledHomebrew) {
        return { ...handler, handle: ({ db }) => planBundledHomebrewInstall(db, hostileCatalog) };
      }
      if (handler.method === AUTHORING_RPC.installBundledHomebrew) {
        return {
          ...handler,
          handle: ({ db }, params) => commitBundledHomebrewInstall(
            db,
            String(Reflect.get(params as object, 'token')) as never,
            hostileCatalog,
          ),
        };
      }
      return handler;
    });
    const routedRegistry = createRpcRegistry({ authoring: { handlers: routedHandlers } });
    client = new RpcClient(new WorkerTransport(rpc.context, routedRegistry));
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: client,
        characters: [],
        onPersistedChange: () => undefined,
      });
      document.body.append(controls.element);
      const root = interactiveElement(controls.element);
      const trigger = root.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Import bundled homebrew');
      if (trigger === undefined) throw new Error('Bundled homebrew trigger is missing.');
      trigger.focus();
      trigger.click();
      for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();

      const dialogNode = root.querySelector('[data-testid="content-adoption-modal"]');
      if (dialogNode === null) throw new Error('Bundled adoption dialog is missing.');
      const dialog = interactiveElement(dialogNode as unknown as HTMLElement);
      const cancel = dialog.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Cancel');
      const commit = dialog.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Import with these choices');
      if (cancel === undefined || commit === undefined) throw new Error('Modal controls are missing.');

      expect(elementText(dialogNode as unknown as Node)).toContain(hostileName);
      expect(dialogNode.querySelector('img')).toBeNull();
      expect(document.activeElement).toBe(cancel);
      dialog.dispatchEvent(keydown('Tab', true));
      expect(document.activeElement).toBe(commit);
      dialog.dispatchEvent(keydown('Tab'));
      expect(document.activeElement).toBe(cancel);

      commit.click();
      for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
      expect(dialog.isConnected).toBe(false);
      expect(document.activeElement).toBe(trigger);
      expect(rpc.context.db.oneRaw(
        'SELECT name FROM subclass_definitions WHERE name = ?',
        [hostileName],
      )).toEqual({ name: hostileName });
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  }, 20_000);

  it('retargets exact and reviewed references through client, worker, and service without silent divergence', async () => {
    const rpc = await open();
    client = new RpcClient(new WorkerTransport(rpc.context));
    const authoringClient = createAuthoringClient(client);
    const service = new CatalogAuthoringService(rpc.context.db, {
      randomUuid: (() => {
        let sequence = 0;
        return () => `rpc-retarget-${String(++sequence)}`;
      })(),
      now: () => '2042-08-09T10:11:12.000Z',
    });
    const old = publishSpecies(service, 'RPC Retarget Old', 30);
    const targetDraft = service.createDraft({ content_kind: 'species' });
    const targetDocument = completeSpecies(targetDraft, 'RPC Retarget Exact', 40);
    const targetAggregate = speciesDraftToAggregate(rpc.context.db, targetDocument);
    const projected = projectAuthoredContentAggregateV1(targetAggregate);
    const derived = deriveContentIdentityV1({
      kind: 'species',
      edition: targetAggregate.rules_edition,
      name: targetAggregate.name,
      payload: projected.payload,
    });
    const exactNode = portableSourceContentImportNode(
      rpc.context.db,
      targetAggregate,
      assertedExternalContentKey('species', 'expanded', targetAggregate.name),
    );
    const exactInstall = planContentImport(rpc.context.db, [exactNode]);
    expect(commitContentImport(rpc.context.db, {
      nodes: [exactNode],
      token: exactInstall.token,
    }).kind).toBe('committed');
    const assertedTargetKey = exactNode.projection.assertedKey;
    rpc.context.db.exec('PRAGMA defer_foreign_keys = ON');
    rpc.context.db.transaction(() => {
      rpc.context.db.exec(
        'UPDATE species_definitions SET content_key = ? WHERE content_key = ?',
        [derived.derivedKey, assertedTargetKey],
      );
      rpc.context.db.exec(
        'UPDATE species_templates SET content_key = ? WHERE content_key = ?',
        [derived.derivedKey, assertedTargetKey],
      );
      rpc.context.db.exec(
        `UPDATE catalog_content_fingerprints SET content_key = ?
         WHERE content_kind = 'species' AND content_key = ?`,
        [derived.derivedKey, assertedTargetKey],
      );
      rpc.context.db.exec(
        `UPDATE catalog_content_identities SET content_key = ?, key_kind = 'derived'
         WHERE content_kind = 'species' AND content_key = ?`,
        [derived.derivedKey, assertedTargetKey],
      );
    });
    const classOption = listGuidedClassOptions(rpc.context.db)[0];
    if (classOption === undefined) throw new Error('Seeded class option missing.');
    const first = createGuidedCharacter(
      rpc.context.db,
      { name: 'Exact Retarget Hero', class_content_key: classOption.content_key },
      new CharacterCommandIntegrity('rpc-retarget-exact'),
    );
    applyGuidedOrigin(rpc.context.db, {
      character_id: first.id as CharacterId,
      kind: 'species',
      content_key: old.content_key,
    });

    const exactPreview = await authoringClient.previewReplacement({
      old_content_key: old.content_key,
      new_content_key: derived.derivedKey,
      character_id: first.id as CharacterId,
    });
    expect(exactPreview.review).toEqual([]);
    expect(await authoringClient.commitReplacement({
      token: exactPreview.token,
      decisions: [],
      choices: [],
    })).toMatchObject({
      character_id: first.id,
      old_content_key: old.content_key,
      new_content_key: derived.derivedKey,
    });
    expect(rpc.context.db.scalar<string>(
      `SELECT definition.content_key
       FROM character_source_instances AS source
       JOIN species_definitions AS definition ON definition.id = source.source_definition_id
       WHERE source.character_id = ? AND source.source_type = 'species'
         AND source.state = 'active'`,
      [first.id],
    )).toBe(derived.derivedKey);

    const reviewedTarget = publishSpecies(service, 'RPC Retarget Reviewed', 45);
    const alias = 'expanded:incoming.owner:rpc-retarget-reviewed' as ContentKey;
    registerContentAlias(rpc.context.db, {
      kind: 'species',
      aliasKey: alias,
      contentKey: reviewedTarget.content_key,
      aliasKind: 'declared-legacy',
    });
    const second = createGuidedCharacter(
      rpc.context.db,
      { name: 'Reviewed Retarget Hero', class_content_key: classOption.content_key },
      new CharacterCommandIntegrity('rpc-retarget-reviewed'),
    );
    applyGuidedOrigin(rpc.context.db, {
      character_id: second.id as CharacterId,
      kind: 'species',
      content_key: old.content_key,
    });
    const divergentPreview = await authoringClient.previewReplacement({
      old_content_key: old.content_key,
      new_content_key: reviewedTarget.content_key,
      character_id: second.id as CharacterId,
    });
    expect(divergentPreview.review).toEqual([
      expect.objectContaining({
        candidate_content_key: reviewedTarget.content_key,
        reason: 'key-collision',
      }),
    ]);
    const reviewedPreview = await authoringClient.previewReplacement({
      old_content_key: old.content_key,
      new_content_key: alias,
      character_id: second.id as CharacterId,
    });
    expect(reviewedPreview.review).toEqual([{
      candidate_content_key: reviewedTarget.content_key,
      candidate_name: 'RPC Retarget Reviewed',
      reason: 'alias',
      default_decision: 'match',
    }]);
    await expect(authoringClient.commitReplacement({
      token: reviewedPreview.token,
      decisions: [],
      choices: [],
    })).rejects.toMatchObject({
      data: { reason: 'replacement_review_required' },
    });
    expect(service.usages(old.content_key).usages.map((usage) => usage.character_id)).toContain(second.id);
    expect(await authoringClient.commitReplacement({
      token: reviewedPreview.token,
      decisions: [{
        candidate_content_key: reviewedTarget.content_key,
        decision: 'match',
      }],
      choices: [],
    })).toMatchObject({
      character_id: second.id,
      new_content_key: reviewedTarget.content_key,
    });
    expect(rpc.context.db.scalar<number>(
      `SELECT count(*) FROM catalog_content_match_decisions
       WHERE content_kind = 'species' AND target_content_key = ?`,
      [reviewedTarget.content_key],
    )).toBe(1);

    const refused = createGuidedCharacter(
      rpc.context.db,
      { name: 'Refused Retarget Hero', class_content_key: classOption.content_key },
      new CharacterCommandIntegrity('rpc-retarget-refused'),
    );
    applyGuidedOrigin(rpc.context.db, {
      character_id: refused.id,
      kind: 'species',
      content_key: old.content_key,
    });
    const refusedPreview = await authoringClient.previewReplacement({
      old_content_key: old.content_key,
      new_content_key: derived.derivedKey,
      character_id: refused.id as CharacterId,
    });
    rpc.context.db.exec(
      `CREATE TEMP TRIGGER ci7_refuse_character_revision
       BEFORE UPDATE OF revision ON characters
       BEGIN SELECT RAISE(ABORT, 'CI7 injected retarget failure'); END`,
    );
    await expect(authoringClient.commitReplacement({
      token: refusedPreview.token,
      decisions: [],
      choices: [],
    })).rejects.toMatchObject({
      data: { reason: 'replacement_refused', refusal: 'commit_failed' },
    });
    expect(service.usages(old.content_key).usages.map((usage) => usage.character_id))
      .toContain(refused.id);
    expect(rpc.context.db.scalar<number>(
      `SELECT count(*) FROM character_source_instances AS source
       JOIN species_definitions AS definition ON definition.id = source.source_definition_id
       WHERE source.character_id = ? AND source.source_type = 'species'
         AND source.state = 'active' AND definition.content_key = ?`,
      [refused.id, derived.derivedKey],
    )).toBe(0);
  });

  it('preserves selected species spells and returns a typed notice for a newly incompatible selection', async () => {
    const rpc = await open();
    client = new RpcClient(new WorkerTransport(rpc.context));
    const authoringClient = createAuthoringClient(client);
    const service = new CatalogAuthoringService(rpc.context.db, {
      randomUuid: (() => {
        let sequence = 0;
        return () => `rpc-retarget-spells-${String(++sequence)}`;
      })(),
      now: () => '2042-08-09T10:11:12.000Z',
    });
    const old = publishSpecies(service, 'Spell Retarget Old', 30, 1);
    const compatible = publishSpecies(service, 'Spell Retarget Compatible', 35, 1);
    const incompatible = publishSpecies(service, 'Spell Retarget Incompatible', 40, 0);
    const classOption = listGuidedClassOptions(rpc.context.db)[0];
    if (classOption === undefined) throw new Error('Seeded class option missing.');
    const spellVersionId = rpc.context.db.scalar<number>(
      `SELECT version.id
       FROM spell_versions AS version
       JOIN spell_list_memberships AS membership
         ON membership.spell_version_id = version.id
       WHERE membership.spell_list_key = 'Wizard'
         AND version.level = 1 AND version.is_active = 1
       ORDER BY version.id LIMIT 1`,
    );
    if (spellVersionId === null) throw new Error('Seeded Wizard spell missing.');

    const retarget = async (
      name: string,
      targetContentKey: ContentKey,
    ) => {
      const character = createGuidedCharacter(
        rpc.context.db,
        { name, class_content_key: classOption.content_key },
        new CharacterCommandIntegrity(`rpc-${name}`),
      );
      applyGuidedOrigin(rpc.context.db, {
        character_id: character.id,
        kind: 'species',
        content_key: old.content_key,
      });
      const slotId = rpc.context.db.scalar<number>(
        `SELECT id FROM spell_selection_slots
         WHERE character_id = ? AND rule_key = 'retarget-spell-choice'
           AND state = 'active'`,
        [character.id],
      );
      if (slotId === null) throw new Error('Species spell slot missing.');
      assignSpellSelection(rpc.context.db, {
        address: { kind: 'slot_selection', id: slotId },
        character_id: character.id,
        spell_version_id: spellVersionId,
      });
      const preview = await authoringClient.previewReplacement({
        old_content_key: old.content_key,
        new_content_key: targetContentKey,
        character_id: character.id as CharacterId,
      });
      const result = await authoringClient.commitReplacement({
        token: preview.token,
        decisions: preview.review.map((review) => ({
          candidate_content_key: review.candidate_content_key,
          decision: 'match' as const,
        })),
        choices: [],
      });
      return { character, result };
    };

    const preserved = await retarget(
      'Compatible Spell Hero',
      compatible.content_key,
    );
    expect(preserved.result.notices).toEqual([]);
    expect(rpc.context.db.oneRaw(
      `SELECT slot.current_spell_version_id, slot.selection_eligibility
       FROM spell_selection_slots AS slot
       JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE slot.character_id = ? AND slot.rule_key = 'retarget-spell-choice'
         AND slot.state = 'active' AND source.state = 'active'`,
      [preserved.character.id],
    )).toEqual({
      current_spell_version_id: spellVersionId,
      selection_eligibility: 'valid',
    });

    const degraded = await retarget(
      'Incompatible Spell Hero',
      incompatible.content_key,
    );
    expect(degraded.result.notices).toEqual([{
      kind: 'retargeted_selection_invalid',
      table: 'spell_selection_slots',
      source_path: [],
      rule_key: 'retarget-spell-choice',
      ordinal: 1,
      selected_value: spellVersionId,
      reason: 'selection_ineligible',
      detail: 'Selected spell is outside the slot level range.',
    }]);
    expect(rpc.context.db.oneRaw(
      `SELECT slot.current_spell_version_id, slot.selection_eligibility,
              slot.selection_invalid_reason
       FROM spell_selection_slots AS slot
       JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE slot.character_id = ? AND slot.rule_key = 'retarget-spell-choice'
         AND slot.state = 'active' AND source.state = 'active'`,
      [degraded.character.id],
    )).toEqual({
      current_spell_version_id: spellVersionId,
      selection_eligibility: 'invalid',
      selection_invalid_reason: 'Selected spell is outside the slot level range.',
    });
    expect(rpc.context.db.oneRaw(
      `SELECT slot.current_spell_version_id, slot.state, source.state AS source_state
       FROM spell_selection_slots AS slot
       JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE slot.character_id = ? AND slot.rule_key = 'retarget-spell-choice'
         AND source.state = 'tombstoned'`,
      [degraded.character.id],
    )).toEqual({
      current_spell_version_id: spellVersionId,
      state: 'orphaned',
      source_state: 'tombstoned',
    });
  }, 20_000);
});
