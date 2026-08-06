import { afterEach, describe, expect, it } from 'vitest';
import type { StoredHomebrewDraft } from '../../../src/authoring/contracts';
import { AUTHORING_RPC } from '../../../src/authoring/client';
import { handlers } from '../../../src/worker/handlers/authoring';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';

let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

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
});
