import { beforeAll, describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import {
  MCP_CLIENT_CAPABILITIES_META_KEY,
  MCP_CLIENT_INFO_META_KEY,
  MCP_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSION_META_KEY,
  MCP_SERVER_INFO_META_KEY,
  MCP_STATIC_LIST_TTL_MS,
  mcpRequestMeta,
  type JsonRpcResponse,
  type McpHandler,
} from '../../../src/vtt/mcp/handler';
import {
  createEngineMcpHandler,
  loadArenaFixture,
} from '../../../tools/engine-mcp-server';

const CLIENT_INFO = Object.freeze({ name: 'vitest', version: '1.0.0' });

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected an object.');
  }
  return value as Readonly<Record<string, unknown>>;
}

function requestParams(
  params: Readonly<Record<string, unknown>> = {},
  meta: Readonly<Record<string, unknown>> = mcpRequestMeta(CLIENT_INFO),
): Readonly<Record<string, unknown>> {
  return { ...params, _meta: meta };
}

function request(
  handler: McpHandler,
  id: string | number | null,
  method: string,
  params: Readonly<Record<string, unknown>> = {},
): JsonRpcResponse {
  const response = handler.handle({
    jsonrpc: '2.0',
    id,
    method,
    params: requestParams(params),
  });
  if (response === null) throw new TypeError('Expected a JSON-RPC response.');
  return response;
}

function expectError(response: JsonRpcResponse, code: number): Readonly<Record<string, unknown>> {
  expect(response.result).toBeUndefined();
  expect(response.error).toMatchObject({ code });
  return record(response.error?.data);
}

describe('engine MCP transport-neutral protocol conformance', () => {
  let state: EncounterState;
  let handler: McpHandler;

  beforeAll(async () => {
    state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    handler = createEngineMcpHandler(state);
  });

  it('discovers exactly protocol 2026-07-28 and the designed capability envelope', () => {
    expect(request(handler, 'discover:1', 'server/discover')).toEqual({
      jsonrpc: '2.0',
      id: 'discover:1',
      result: {
        resultType: 'complete',
        supportedVersions: [MCP_PROTOCOL_VERSION],
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true },
        },
        _meta: {
          [MCP_SERVER_INFO_META_KEY]: { name: 'dnd-wt-vtt-engine', version: '1.0.0' },
        },
        ttlMs: MCP_STATIC_LIST_TTL_MS,
        cacheScope: 'public',
      },
    });
  });

  it('rejects unsupported per-request protocol versions with -32022', () => {
    const meta = {
      ...mcpRequestMeta(CLIENT_INFO),
      [MCP_PROTOCOL_VERSION_META_KEY]: '2025-03-26',
    };
    const response = handler.handle({
      jsonrpc: '2.0',
      id: 2,
      method: 'server/discover',
      params: requestParams({}, meta),
    });
    if (response === null) throw new TypeError('Expected an unsupported-version response.');
    expect(response.id).toBe(2);
    expect(response.error).toEqual({
      code: -32022,
      message: 'Unsupported protocol version',
      data: { supported: [MCP_PROTOCOL_VERSION], requested: '2025-03-26' },
    });
  });

  it.each([
    MCP_PROTOCOL_VERSION_META_KEY,
    MCP_CLIENT_INFO_META_KEY,
    MCP_CLIENT_CAPABILITIES_META_KEY,
  ])('rejects requests missing required metadata key %s', (missingKey) => {
    const completeMeta = mcpRequestMeta(CLIENT_INFO);
    const incompleteMeta = Object.fromEntries(
      Object.entries(completeMeta).filter(([key]) => key !== missingKey),
    );
    const response = handler.handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
      params: requestParams({}, incompleteMeta),
    });
    if (response === null) throw new TypeError('Expected a missing-metadata response.');
    expect(response.id).toBe(3);
    expect(expectError(response, -32602)).toMatchObject({ kind: 'schema_violation' });
  });

  it('rejects legacy initialize clearly instead of negotiating it', () => {
    const legacyResponse = handler.handle({
      jsonrpc: '2.0',
      id: 4,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: CLIENT_INFO,
      },
    });
    if (legacyResponse === null) throw new TypeError('Expected legacy initialize rejection.');
    expect(legacyResponse.id).toBe(4);
    expect(expectError(legacyResponse, -32602)).toMatchObject({
      kind: 'schema_violation',
      violations: [{ path: '$._meta' }],
    });

    const metadataAwareResponse = request(handler, 'legacy:initialize', 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: CLIENT_INFO,
    });
    expect(metadataAwareResponse).toEqual({
      jsonrpc: '2.0',
      id: 'legacy:initialize',
      error: { code: -32601, message: 'Method not found: initialize' },
    });
  });

  it('lists the stable five-tool surface with cache hints and valid object schemas', () => {
    const first = request(handler, 5, 'tools/list');
    const second = request(handler, 6, 'tools/list');
    const firstResult = record(first.result);
    const secondResult = record(second.result);
    const firstTools = firstResult['tools'];
    expect(secondResult['tools']).toEqual(firstTools);
    expect(firstResult).toMatchObject({
      resultType: 'complete',
      ttlMs: MCP_STATIC_LIST_TTL_MS,
      cacheScope: 'public',
    });
    expect(Array.isArray(firstTools) ? firstTools.map((tool) => record(tool)['name']) : []).toEqual([
      'state_summary',
      'combatant_options',
      'path_cost',
      'reach_check',
      'declare_intent',
    ]);
    if (!Array.isArray(firstTools)) throw new TypeError('Expected tools array.');
    for (const toolValue of firstTools) {
      const tool = record(toolValue);
      expect(tool['name']).toEqual(expect.any(String));
      expect(tool['description']).toEqual(expect.any(String));
      for (const schemaValue of [tool['inputSchema'], tool['outputSchema']]) {
        const schema = record(schemaValue);
        expect(schema['$schema']).toBe('https://json-schema.org/draft/2020-12/schema');
        expect(schema['type']).toBe('object');
      }
    }
  });

  it('returns outputSchema-conforming structured content and its compact text mirror', () => {
    const response = request(handler, 7, 'tools/call', {
      name: 'state_summary',
      arguments: {},
    });
    const result = record(response.result);
    expect(result['resultType']).toBe('complete');
    expect(result['isError']).toBe(false);
    const structured = record(result['structuredContent']);
    const content = result['content'];
    if (!Array.isArray(content)) throw new TypeError('Expected content array.');
    expect(record(content[0])).toEqual({
      type: 'text',
      text: JSON.stringify(structured),
    });
    expect(structured['round']).toBe(0);
  });

  it('uses invalid-request errors for a missing id and a wrong JSON-RPC version', () => {
    const params = requestParams();
    const missingId = handler.handle({ jsonrpc: '2.0', method: 'tools/list', params });
    const wrongVersion = handler.handle({ jsonrpc: '1.0', id: 8, method: 'tools/list', params });
    expect(missingId).not.toBeNull();
    expect(wrongVersion).not.toBeNull();
    if (missingId === null || wrongVersion === null) throw new TypeError('Expected error responses.');
    expect(missingId.id).toBeNull();
    expect(wrongVersion.id).toBeNull();
    expectError(missingId, -32600);
    expectError(wrongVersion, -32600);
  });

  it('returns method-not-found and echoes the request id', () => {
    const response = request(handler, 9, 'engine/unknown');
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 9,
      error: { code: -32601, message: 'Method not found: engine/unknown' },
    });
  });

  it('reports unknown tools as protocol-level invalid params', () => {
    const response = request(handler, 10, 'tools/call', { name: 'not_a_tool', arguments: {} });
    expect(response.id).toBe(10);
    expect(expectError(response, -32602)).toEqual({
      kind: 'unknown_tool',
      tool: 'not_a_tool',
    });
  });

  it('returns invalid tool arguments as an actionable tool execution error', () => {
    const response = request(handler, 11, 'tools/call', {
      name: 'combatant_options',
      arguments: { id: '' },
    });
    expect(response.error).toBeUndefined();
    const result = record(response.result);
    expect(result).toMatchObject({ resultType: 'complete', isError: true });
    const content = result['content'];
    if (!Array.isArray(content)) throw new TypeError('Expected content array.');
    expect(record(content[0])['text']).toContain('Invalid tool arguments');
    expect(record(content[0])['text']).toContain('/id');
  });

  it('ignores ordinary notifications gracefully without an initialized lifecycle', () => {
    expect(handler.handle({
      jsonrpc: '2.0',
      method: 'notifications/cancelled',
      params: { requestId: 'complete-request' },
    })).toBeNull();
  });

  it('rejects non-issued list cursors as invalid params', () => {
    const response = request(handler, 12, 'tools/list', { cursor: 'forged' });
    expect(expectError(response, -32602)).toMatchObject({
      kind: 'schema_violation',
      violations: [{ path: '$.cursor' }],
    });
  });

  it('turns an oversized UTF-8 tool result into a bounded tool execution error', () => {
    const boundedHandler = createEngineMcpHandler(state, 64);
    const response = request(boundedHandler, 13, 'tools/call', {
      name: 'state_summary',
      arguments: {},
    });
    const result = record(response.result);
    expect(result).toMatchObject({ resultType: 'complete', isError: true });
    expect(result['structuredContent']).toBeUndefined();
    const content = result['content'];
    if (!Array.isArray(content)) throw new TypeError('Expected content array.');
    expect(record(content[0])['text']).toMatch(/^TOOL_RESULT_TOO_LARGE:/);
    expect(JSON.stringify(result).length).toBeLessThan(640);
  });
});
