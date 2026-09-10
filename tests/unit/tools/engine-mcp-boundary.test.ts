import { describe, expect, it } from 'vitest';
import { mcpRequestMeta } from '../../../src/vtt/mcp/handler';
import type { McpHandler } from '../../../src/vtt/mcp/handler';
import { EngineMcpStdioClient } from '../../../tools/engine-mcp-dry-client';
import { collectEngineMcpRuntimeGraph, engineMcpImportBoundaryFailures, scanEngineMcpArtifacts } from '../../../tools/engine-mcp-proof';
import {
  createEngineMcpRuntime,
  decodeEngineMcpLauncherManifest,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import { createLegacyEngineOptionEnvironmentBinding } from '../../../src/vtt/offers/offer-environment';

const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';
const META = mcpRequestMeta({ name: 'SUBSTITUTED_LOCAL', version: '1.0.0' });

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Readonly<Record<string, unknown>>;
}

function result(response: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return record(response['result'], 'result');
}

function structured(response: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return record(result(response)['structuredContent'], 'structured content');
}

function dodge(context: Readonly<Record<string, unknown>>, actorId: string): Readonly<Record<string, unknown>> {
  const actors = context['actors'];
  if (!Array.isArray(actors)) throw new TypeError('Turn context actors are missing.');
  const actor = actors.map((value) => record(value, 'actor context')).find((value) => value['actor_id'] === actorId);
  const options = actor?.['options'];
  if (!Array.isArray(options)) throw new TypeError(`Turn context options are missing for ${actorId}.`);
  const option = options.map((value) => record(value, 'actor option')).find((value) => value['kind'] === 'dodge');
  const fallback = options.map((value) => record(value, 'actor option'))
    .find((value) => value['option_id'] !== option?.['option_id']);
  const stateRef = record(context['state_ref'], 'state ref');
  if (typeof option?.['option_id'] !== 'string' || typeof fallback?.['option_id'] !== 'string' ||
    typeof stateRef['expected_revision'] !== 'number') {
    throw new TypeError(`Independent Dodge options are missing for ${actorId}.`);
  }
  return {
    actor_id: actorId, expected_revision: stateRef['expected_revision'], primary_option_id: option['option_id'],
    fallback_option_id: fallback['option_id'],
    reason: 'Dodge to preserve this actor for the next exchange.',
    override_justification: {
      kind: 'missing_metric',
      id: 'expected_damage_milli',
    },
  };
}

function directTool(handler: McpHandler, name: string, argumentsValue: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const response = handler.handle({ jsonrpc: '2.0', id: name, method: 'tools/call', params: { _meta: META, name, arguments: argumentsValue } });
  if (response === null) throw new TypeError('Direct tool call returned no response.');
  return record(response.result, 'direct result');
}

class SUBSTITUTED_LOCALAdapter {
  constructor(private readonly handler: McpHandler) {}
  request(method: string, params: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
    const response = this.handler.handle({ jsonrpc: '2.0', id: method, method, params: { ...params, _meta: META } });
    if (response === null) throw new TypeError('Local conformance request returned no response.');
    return record(response, 'local response');
  }
}
describe('engine MCP process mutation boundary', () => {
  it('decodes legacy launchers as round plans and preserves adjustment correlation fields', async () => {
    const state = await loadArenaFixture(FIXTURE);
    const actors = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []);
    const legacy = {
      format: 'engine-mcp-launcher-v1',
      fixturePath: FIXTURE,
      proposalSpoolPath: '/tmp/engine-proposals.jsonl',
      runId: 'encounter:legacy-launcher',
      branchId: 'branch:legacy-launcher',
      revision: 1,
      requestId: 'request:legacy-launcher',
      phase: 'initial',
      correctionNumber: 0,
      offerEnvironment: createLegacyEngineOptionEnvironmentBinding(),
      room: 1,
      historyKind: 'room_ready',
    };
    expect(decodeEngineMcpLauncherManifest(legacy)).toEqual({
      ...legacy,
      requestKind: 'round_plan',
      overridePolicy: 'typed_reason',
    });

    const adjustment = {
      ...legacy,
      requestId: 'request:adjustment-launcher',
      requestKind: 'plan_adjustment',
      requestedActorIds: actors,
      planAdjustment: {
        parentPlanId: 'monster-plan:parent',
        baselinePlanHash: 'd'.repeat(64),
        triggerPcTurnId: 'pc-turn:round-1-fighter',
        beforeRevision: 4,
        afterRevision: 6,
        materialityReasonCodes: ['LIFE_STATE_CHANGED'],
        baselineProposalDigests: actors.map((actorId, index) => ({
          actorId,
          proposalDigest: (index + 20).toString(16).padStart(64, '0'),
        })),
        adjustmentBudget: 2,
      },
    };
    const decoded = decodeEngineMcpLauncherManifest(adjustment);
    if (decoded === null || decoded.requestKind !== 'plan_adjustment' ||
      decoded.requestedActorIds === undefined || decoded.planAdjustment === undefined) {
      throw new Error('Adjustment launcher did not decode.');
    }
    const runtime = createEngineMcpRuntime(state, {
      runId: decoded.runId,
      branchId: decoded.branchId,
      revision: decoded.revision,
      requestId: decoded.requestId,
      requestKind: decoded.requestKind,
      requestedActorIds: decoded.requestedActorIds,
      planAdjustment: decoded.planAdjustment,
    });

    expect(runtime.feed.current().request).toEqual({
      kind: 'plan_adjustment',
      requestId: adjustment.requestId,
      phase: 'initial',
      correctionNumber: 0,
      actors,
      ...adjustment.planAdjustment,
    });
  });

  it('keeps the projection digest immutable and rejects every stale write shape', { timeout: 20_000 }, async () => {
    const client = new EngineMcpStdioClient(FIXTURE);
    const context = structured(await client.tool('engine.get_turn_context', { run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round' }));
    const fresh = record(context['state_ref'], 'state ref');
    const request = record(context['request'], 'request');
    const actorValues = request['required_actor_ids'];
    if (!Array.isArray(actorValues) || actorValues.some((value) => typeof value !== 'string')) throw new TypeError('Required actors are missing.');
    const actors = actorValues.map(String);
    const firstActor = actors[0];
    if (firstActor === undefined) throw new TypeError('At least one actor is required.');

    const proposal = await client.tool('engine.submit_round_proposals', {
      state_ref: fresh,
      request_id: 'request:engine-mcp',
      phase: 'initial',
      idempotency_key: 'proof-fresh-round-0001',
      proposals: actors.map((actorId) => dodge(context, actorId)),
    });
    expect(structured(proposal)).toMatchObject({ status: 'proposed' });
    const afterProposal = structured(await client.tool('engine.get_turn_context', { run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round' }));
    expect(record(afterProposal['state_ref'], 'state ref')['state_handle']).toBe(fresh['state_handle']);

    const stale = { ...fresh, state_handle: `engine-state:${'0'.repeat(64)}` };
    const writeCases = [
      ['engine.submit_round_proposals', { state_ref: stale, request_id: 'request:engine-mcp', phase: 'initial', idempotency_key: 'proof-stale-round-0001', proposals: actors.map((actorId) => dodge(context, actorId)) }],
      ['engine.submit_proposal', { state_ref: stale, request_id: 'request:engine-mcp', phase: 'initial', idempotency_key: 'proof-stale-proposal-0001', proposal: dodge(context, firstActor) }],
      ['engine.emit_narration', { state_ref: stale, request_id: 'request:engine-mcp', idempotency_key: 'proof-stale-narration-0001', voice: 'terse_tactical', text: 'Stale.', audience: 'shared', rule_references: [] }],
      ['engine.request_dm_adjudication', { state_ref: stale, request_id: 'request:engine-mcp', actor_id: firstActor, subject: 'Stale', reason: 'Must be rejected.', blocking: true, suggested_outcomes: [], idempotency_key: 'proof-stale-adjudication-0001' }],
    ] as const;
    for (const [name, argumentsValue] of writeCases) {
      const response = await client.tool(name, argumentsValue);
      expect(result(response)['isError']).toBe(true);
      expect(JSON.stringify(response)).toContain('STALE_STATE');
    }
    expect(await client.close()).toBe(0);
  });
});

describe('SUBSTITUTED_LOCAL MCP conformance and artifacts', () => {
  it('enforces the full entrypoint graph and repository artifact scan', async () => {
    expect(await engineMcpImportBoundaryFailures()).toEqual([]);
    const graph = await collectEngineMcpRuntimeGraph();
    expect(graph.some((path) => path.endsWith('/src/combat/encounter.ts'))).toBe(false);
    expect(graph.some((path) => path.endsWith('/src/combat/random.ts'))).toBe(false);
    expect(await scanEngineMcpArtifacts()).toMatchObject({ status: 'VERIFIED', failures: [] });
  });

  it('proves transport-neutral request parity through the test-only adapter', { timeout: 20_000 }, async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const runtime = createEngineMcpRuntime(state);
    const adapter = new SUBSTITUTED_LOCALAdapter(runtime.handler);
    expect(adapter.request('server/discover', {})).toHaveProperty('result');
    expect(adapter.request('tools/list', {})).toHaveProperty('result');
    expect(adapter.request('resources/list', {})).toHaveProperty('result');
    expect(adapter.request('prompts/list', {})).toHaveProperty('result');
    expect(runtime.handler.handle({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { _meta: META, requestId: 9 } })).toBeNull();

    const argumentsValue = { run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round' };
    const direct = directTool(runtime.handler, 'engine.get_turn_context', argumentsValue);
    const child = new EngineMcpStdioClient(FIXTURE);
    const stdio = result(await child.tool('engine.get_turn_context', argumentsValue));
    expect(stdio).toEqual(direct);
    const content = stdio['content'];
    if (!Array.isArray(content)) throw new TypeError('Tool content is missing.');
    expect(record(content[0], 'text content')['text']).toBe(JSON.stringify(stdio['structuredContent']));
    expect(await child.close()).toBe(0);
  });
});
