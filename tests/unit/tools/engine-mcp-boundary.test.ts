import { describe, expect, it } from 'vitest';
import { mcpRequestMeta } from '../../../src/vtt/mcp/handler';
import type { McpHandler } from '../../../src/vtt/mcp/handler';
import { EngineMcpStdioClient } from '../../../tools/engine-mcp-dry-client';
import { collectEngineMcpRuntimeGraph, engineMcpImportBoundaryFailures, scanEngineMcpArtifacts } from '../../../tools/engine-mcp-proof';
import { createEngineMcpRuntime, loadArenaFixture } from '../../../tools/engine-mcp-server';

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

function dodge(actorId: string): Readonly<Record<string, unknown>> {
  return { actor_id: actorId, choice: { kind: 'dodge' }, movement: { willingness: 'none', maximum_feet: 0, opportunity_risk: 'avoid' }, engagement: { stance: 'hold_position' }, fallback: null };
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

    const proposal = await client.tool('engine.submit_round_intents', {
      state_ref: fresh,
      request_id: 'request:engine-mcp',
      phase: 'initial',
      idempotency_key: 'proof-fresh-round-0001',
      intents: actors.map(dodge),
    });
    expect(structured(proposal)).toMatchObject({ status: 'proposed' });
    const afterProposal = structured(await client.tool('engine.get_turn_context', { run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round' }));
    expect(record(afterProposal['state_ref'], 'state ref')['state_handle']).toBe(fresh['state_handle']);

    const stale = { ...fresh, state_handle: `engine-state:${'0'.repeat(64)}` };
    const writeCases = [
      ['engine.submit_round_intents', { state_ref: stale, request_id: 'request:engine-mcp', phase: 'initial', idempotency_key: 'proof-stale-round-0001', intents: actors.map(dodge) }],
      ['engine.submit_intent', { state_ref: stale, request_id: 'request:engine-mcp', phase: 'initial', idempotency_key: 'proof-stale-intent-0001', intent: dodge(firstActor) }],
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
    const state = await loadArenaFixture(FIXTURE);
    const runtime = createEngineMcpRuntime(state);
    const adapter = new SUBSTITUTED_LOCALAdapter(runtime.handler);
    expect(adapter.request('server/discover', {})).toHaveProperty('result');
    expect(adapter.request('tools/list', {})).toHaveProperty('result');
    expect(adapter.request('resources/list', {})).toHaveProperty('result');
    expect(adapter.request('prompts/list', {})).toHaveProperty('result');
    expect(adapter.request('initialize', {})).toMatchObject({ error: { code: -32601 } });
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
