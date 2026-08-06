import { afterEach, describe, expect, it } from 'vitest';
import type { SpeciesAuthoringDraft, StoredHomebrewDraft } from '../../../src/authoring/contracts';
import { AUTHORING_RPC, createAuthoringClient } from '../../../src/authoring/client';
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
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import type { HandlerContext } from '../../../src/worker/handler';
import { handlers } from '../../../src/worker/handlers/authoring';
import { createRpcRegistry } from '../../../src/worker/registry';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';

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

  constructor(private readonly context: HandlerContext) {}

  postMessage(message: RpcRequest): void {
    void registry.dispatch(message, this.context).then((response) => {
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

function publishSpecies(service: CatalogAuthoringService, name: string, speed: number) {
  const created = service.createDraft({ content_kind: 'species' });
  const saved = service.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document: completeSpecies(created, name, speed),
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
});
