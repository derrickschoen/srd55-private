import { describe, expect, it } from 'vitest';
import { readFileSync } from '../../helpers/test-filesystem';
import type { EncounterState } from '../../../src/combat/encounter';
import {
  MCP_CLASSIC_PROTOCOL_VERSIONS,
  MCP_CLIENT_CAPABILITIES_META_KEY,
  MCP_CLIENT_INFO_META_KEY,
  MCP_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSION_META_KEY,
  MCP_STATIC_LIST_TTL_MS,
  mcpRequestMeta,
  type JsonRpcResponse,
  type McpHandler,
} from '../../../src/vtt/mcp/handler';
import { createEngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
import { engineStateSummaryProofToken } from '../../../src/vtt/mcp/engine-server';
import { createEngineMcpRuntime, loadArenaFixture, type EngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';

const CLIENT_INFO = Object.freeze({ name: 'vitest', version: '1.0.0' });
const TOOL_NAMES = [
  'engine.get_turn_context',
  'engine.propose_from_play',
  'engine.get_state_summary',
  'engine.get_combatant_options',
  'engine.query_path',
  'engine.query_reach',
  'engine.query_cover',
  'engine.query_visibility',
  'engine.query_dice_expectation',
  'engine.validate_intent',
  'engine.submit_round_intents',
  'engine.submit_intent',
  'engine.emit_narration',
  'engine.request_dm_adjudication',
] as const;
const REVISION_BOUND_TOOL_NAMES = TOOL_NAMES.filter((name) => name !== 'engine.propose_from_play');

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Expected an object.');
  return value as Readonly<Record<string, unknown>>;
}
function request(handler: McpHandler, id: string | number, method: string, params: Readonly<Record<string, unknown>> = {}): JsonRpcResponse {
  const response = handler.handle({ jsonrpc: '2.0', id, method, params: { ...params, _meta: mcpRequestMeta(CLIENT_INFO) } });
  if (response === null) throw new TypeError('Expected a JSON-RPC response.');
  return response;
}
function toolCall(handler: McpHandler, name: string, argumentsValue: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const response = request(handler, `call:${name}`, 'tools/call', { name, arguments: argumentsValue });
  expect(response.error).toBeUndefined();
  return record(response.result);
}
function structured(result: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  expect(result['isError']).toBe(false);
  return record(result['structuredContent']);
}
function closedObjects(value: unknown, path = '$'): readonly string[] {
  const candidate = typeof value === 'object' && value !== null && !Array.isArray(value) ? record(value) : null;
  if (candidate === null) return [];
  const failures = candidate['type'] === 'object' && candidate['additionalProperties'] !== false ? [path] : [];
  return [...failures, ...Object.entries(candidate).flatMap(([key, nested]) => closedObjects(nested, `${path}.${key}`))];
}
function forbiddenAgentKeys(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.flatMap(forbiddenAgentKeys);
  const candidate = typeof value === 'object' && value !== null ? record(value) : null;
  if (candidate === null) return [];
  const forbidden = new Set(['to', 'path', 'destination', 'row', 'column', 'x', 'y', 'attack_bonus', 'dc', 'damage_dice', 'command']);
  return [
    ...Object.keys(candidate).filter((key) => forbidden.has(key)),
    ...Object.values(candidate).flatMap(forbiddenAgentKeys),
  ];
}

function localPointerExists(root: unknown, reference: string): boolean {
  if (reference === '#') return true;
  if (!reference.startsWith('#/')) return false;
  let segments: readonly string[];
  try {
    segments = decodeURIComponent(reference.slice(2)).split('/').map((segment) =>
      segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  } catch {
    return false;
  }
  let current = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isSafeInteger(index) || index < 0 || index >= current.length) return false;
      current = current[index];
      continue;
    }
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, segment)) return false;
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current !== undefined;
}

function unresolvedSchemaReferences(root: unknown, value: unknown = root, path = '$'): readonly string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => unresolvedSchemaReferences(root, entry, `${path}[${String(index)}]`));
  }
  if (typeof value !== 'object' || value === null) return [];
  const candidate = value as Readonly<Record<string, unknown>>;
  const reference = candidate['$ref'];
  const failure = reference === undefined
    ? []
    : typeof reference !== 'string' || !localPointerExists(root, reference)
      ? [`${path}.$ref=${String(reference)}`]
      : [];
  return [
    ...failure,
    ...Object.entries(candidate).flatMap(([key, nested]) =>
      unresolvedSchemaReferences(root, nested, `${path}.${key}`)),
  ];
}

async function fixtureRuntime(options: Parameters<typeof createEngineMcpRuntime>[1] = { requestedActorCount: 1 }): Promise<{ readonly state: EncounterState; readonly runtime: EngineMcpRuntime }> {
  const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
  return { state, runtime: createEngineMcpRuntime(state, options) };
}
function contextArguments(): Readonly<Record<string, unknown>> {
  return { run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round' };
}
function stateRef(runtime: EngineMcpRuntime): Readonly<Record<string, unknown>> {
  const capsule = runtime.feed.current();
  return structured(toolCall(runtime.handler, 'engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
  }))['state_ref'] as Readonly<Record<string, unknown>>;
}
function fixtureFacts(state: EncounterState, runtime: EngineMcpRuntime) {
  const capsule = runtime.feed.current();
  const actor = capsule.request?.actors[0];
  const target = state.combatants.find((candidate) => candidate.profile.kind === 'player_character')?.profile.id;
  const action = actor === undefined ? undefined : capsule.projection.combatants.find((candidate) => candidate.id === actor)?.actions[0]?.actionId;
  if (actor === undefined || target === undefined || action === undefined || capsule.request === null) throw new Error('Fixture facts are absent.');
  const intent = {
    actor_id: actor,
    choice: { kind: 'dodge' },
    movement: { willingness: 'none', maximum_feet: 0, opportunity_risk: 'avoid' },
    engagement: { stance: 'hold_position' },
    fallback: null,
  } as const;
  return { actor, target, action, request: capsule.request, intent, ref: stateRef(runtime) };
}
function happyArguments(name: typeof TOOL_NAMES[number], state: EncounterState, runtime: EngineMcpRuntime): Readonly<Record<string, unknown>> {
  const facts = fixtureFacts(state, runtime);
  switch (name) {
    case 'engine.get_turn_context': return contextArguments();
    case 'engine.propose_from_play': return { play_name: 'basic_advance' };
    case 'engine.get_state_summary': return { state_ref: facts.ref, granularity: 'room_tactical', page: { maximum_items: 1 } };
    case 'engine.get_combatant_options': return { state_ref: facts.ref, actor_id: facts.actor, include_unavailable: true, page: { maximum_items: 2 } };
    case 'engine.query_path': return { state_ref: facts.ref, actor_id: facts.actor, objective: { kind: 'approach', target: { kind: 'combatant', combatant_id: facts.target } }, movement: { willingness: 'freely', maximum_feet: 30, opportunity_risk: 'accept_if_needed' }, engagement: { stance: 'close_to_melee' } };
    case 'engine.query_reach':
    case 'engine.query_cover':
    case 'engine.query_visibility': return { state_ref: facts.ref, queries: [{ query_id: 'q1', actor_id: facts.actor, target: { kind: 'combatant', combatant_id: facts.target }, action_id: facts.action }] };
    case 'engine.query_dice_expectation': return { state_ref: facts.ref, candidates: [{ candidate_id: 'c1', actor_id: facts.actor, choice: { kind: 'attack', action_id: facts.action, target: { kind: 'combatant', combatant_id: facts.target } } }], include_distribution: true };
    case 'engine.validate_intent': return { state_ref: facts.ref, request_id: facts.request.requestId, phase: 'initial', intent: facts.intent };
    case 'engine.submit_round_intents': return { state_ref: facts.ref, request_id: facts.request.requestId, phase: 'initial', idempotency_key: 'round-idempotency-0001', intents: [facts.intent] };
    case 'engine.submit_intent': return { state_ref: facts.ref, request_id: facts.request.requestId, phase: 'initial', idempotency_key: 'intent-idempotency-0001', intent: facts.intent };
    case 'engine.emit_narration': return { state_ref: facts.ref, request_id: facts.request.requestId, idempotency_key: 'narration-key-0001', voice: 'terse_tactical', text: 'The monster holds its ground.', audience: 'shared', rule_references: [] };
    case 'engine.request_dm_adjudication': return { state_ref: facts.ref, request_id: facts.request.requestId, actor_id: facts.actor, subject: 'Ambiguous terrain interaction', reason: 'The engine has no modeled consequence for this interaction.', blocking: true, suggested_outcomes: ['Allow the interaction', 'Refuse the interaction'], idempotency_key: 'adjudication-key-0001' };
  }
}

describe('engine MCP dual-handshake full surface conformance', () => {
  it('derives the state-summary proof token from digest, granularity, and the v1 domain separator', () => {
    expect(engineStateSummaryProofToken('a'.repeat(64), 'turn_minimal')).toBe(
      '59f83cdc47b641fd55ca7dcda5b0a55839f61f718819fda843fe1e8bf767e114',
    );
  });

  it('discovers the designed capability envelope and rejects unsupported versions', async () => {
    const { runtime } = await fixtureRuntime();
    expect(request(runtime.handler, 1, 'server/discover').result).toMatchObject({
      resultType: 'complete', supportedVersions: [MCP_PROTOCOL_VERSION],
      capabilities: { tools: { listChanged: false }, resources: { subscribe: true, listChanged: true }, prompts: { listChanged: true } },
      ttlMs: MCP_STATIC_LIST_TTL_MS, cacheScope: 'public',
    });
    const response = runtime.handler.handle({
      jsonrpc: '2.0', id: 2, method: 'server/discover', params: { _meta: { ...mcpRequestMeta(CLIENT_INFO), [MCP_PROTOCOL_VERSION_META_KEY]: '2025-03-26' } },
    });
    expect(response).toMatchObject({ id: 2, error: { code: -32022, data: { supported: [MCP_PROTOCOL_VERSION] } } });
  });

  it('negotiates the literal Claude Code classic initialize and keeps the same proposer-only tools under both handshakes', async () => {
    const initialize = JSON.parse(readFileSync(
      'tests/fixtures/mcp-migration/claude-code-2.1.246-initialize.json',
      'utf8',
    )) as unknown;
    const { state, runtime } = await fixtureRuntime();
    const initialized = runtime.handler.handle(initialize);
    expect(initialized).toMatchObject({
      id: 0,
      result: {
        protocolVersion: '2025-11-25',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'dnd-wt-vtt-engine', version: '1.0.0' },
      },
    });
    expect(runtime.handler.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }))
      .toMatchObject({ error: { code: -32002, message: 'Server not initialized' } });
    expect(runtime.handler.handle({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })).toBeNull();
    const classicListResponse = runtime.handler.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    if (classicListResponse === null) throw new TypeError('Classic tools/list returned no response.');
    const classicList = record(classicListResponse.result);
    expect(classicList['resultType']).toBeUndefined();
    const classicTools = classicList['tools'];
    if (!Array.isArray(classicTools)) throw new TypeError('Classic tools/list omitted tools.');
    const classicNames = classicTools.map((tool) => String(record(tool)['name']));
    expect(classicNames).toEqual(TOOL_NAMES);

    const classicCall = runtime.handler.handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'engine.get_state_summary', arguments: happyArguments('engine.get_state_summary', state, runtime) },
    });
    if (classicCall === null) throw new TypeError('Classic tools/call returned no response.');
    expect(structured(record(classicCall.result))).toHaveProperty('state_ref');

    const modern = await fixtureRuntime();
    const modernList = record(request(modern.runtime.handler, 4, 'tools/list').result);
    const modernTools = modernList['tools'];
    if (!Array.isArray(modernTools)) throw new TypeError('Modern tools/list omitted tools.');
    expect(modernTools.map((tool) => String(record(tool)['name']))).toEqual(classicNames);
  });

  it('rejects a genuinely unsupported classic initialize revision', async () => {
    const { runtime } = await fixtureRuntime();
    const response = runtime.handler.handle({
      jsonrpc: '2.0',
      id: 5,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: CLIENT_INFO },
    });
    expect(response).toMatchObject({
      error: {
        code: -32022,
        data: { requested: '2024-11-05', supported: MCP_CLASSIC_PROTOCOL_VERSIONS },
      },
    });
  });

  it.each(MCP_CLASSIC_PROTOCOL_VERSIONS)('negotiates supported classic revision %s exactly', async (protocolVersion) => {
    const { runtime } = await fixtureRuntime();
    expect(runtime.handler.handle({
      jsonrpc: '2.0',
      id: protocolVersion,
      method: 'initialize',
      params: { protocolVersion, capabilities: {}, clientInfo: CLIENT_INFO },
    })).toMatchObject({ id: protocolVersion, result: { protocolVersion } });
  });

  it.each([MCP_PROTOCOL_VERSION_META_KEY, MCP_CLIENT_INFO_META_KEY, MCP_CLIENT_CAPABILITIES_META_KEY])('rejects requests missing metadata key %s', async (missing) => {
    const { runtime } = await fixtureRuntime();
    const meta = Object.fromEntries(Object.entries(mcpRequestMeta(CLIENT_INFO)).filter(([key]) => key !== missing));
    const response = runtime.handler.handle({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: { _meta: meta } });
    expect(response).toMatchObject({ error: { code: -32602, data: { kind: 'schema_violation' } } });
  });

  it('lists the exact inventory with closed described schemas and standard pagination', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1, listPageSize: 5 });
    const names: string[] = [];
    let cursor: string | undefined;
    do {
      const result = record(request(runtime.handler, names.length + 10, 'tools/list', cursor === undefined ? {} : { cursor }).result);
      const tools = result['tools'];
      if (!Array.isArray(tools)) throw new TypeError('Expected tools.');
      for (const value of tools) {
        const tool = record(value);
        names.push(String(tool['name']));
        expect(String(tool['description']).length).toBeGreaterThan(10);
        for (const key of ['inputSchema', 'outputSchema']) {
          const schema = record(tool[key]);
          expect(schema).toMatchObject({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' });
          expect(record(schema['$defs'])).toHaveProperty('stateRef');
          expect(record(schema['$defs'])).toHaveProperty('targetSelector');
          expect(closedObjects(schema)).toEqual([]);
        }
      }
      cursor = typeof result['nextCursor'] === 'string' ? result['nextCursor'] : undefined;
    } while (cursor !== undefined);
    expect(names).toEqual(TOOL_NAMES);
    expect(request(runtime.handler, 99, 'tools/list', { cursor: 'forged' })).toMatchObject({ error: { code: -32602 } });
  });

  it('advertises only per-document-resolvable refs in every tool input and output schema', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1 });
    const discovery = record(request(runtime.handler, 100, 'server/discover').result);
    const listing = record(request(runtime.handler, 101, 'tools/list').result);
    for (const [surface, tools] of [['server/discover', discovery['tools']], ['tools/list', listing['tools']]] as const) {
      if (!Array.isArray(tools)) throw new TypeError(`${surface} did not advertise tools.`);
      expect(tools).toHaveLength(TOOL_NAMES.length);
      for (const value of tools) {
        const tool = record(value);
        for (const key of ['inputSchema', 'outputSchema'] as const) {
          const schema = record(tool[key]);
          expect(unresolvedSchemaReferences(schema), `${surface}:${String(tool['name'])}.${key}`).toEqual([]);
        }
      }
    }
  });

  it.each(TOOL_NAMES)('%s has a direct happy path with output-schema-conforming structured content', async (name) => {
    const { state, runtime } = await fixtureRuntime();
    const result = toolCall(runtime.handler, name, happyArguments(name, state, runtime));
    const value = structured(result);
    expect(record((result['content'] as readonly unknown[])[0])['text']).toBe(JSON.stringify(value));
    expect(forbiddenAgentKeys(value)).toEqual([]);
  });

  it('returns proof_token only from the direct state-summary tool result', async () => {
    const { state, runtime } = await fixtureRuntime();
    const capsule = runtime.feed.current();
    const summary = structured(toolCall(
      runtime.handler,
      'engine.get_state_summary',
      happyArguments('engine.get_state_summary', state, runtime),
    ));
    expect(summary['proof_token']).toBe(engineStateSummaryProofToken(capsule.digest, 'room_tactical'));
    expect(summary['proof_token']).toMatch(/^[0-9a-f]{64}$/u);
    expect(record(summary['state_ref'])['proof_token']).toBeUndefined();
  });

  it.each(TOOL_NAMES)('%s rejects a schema violation as a self-correctable tool error', async (name) => {
    const { runtime } = await fixtureRuntime();
    const result = toolCall(runtime.handler, name, { coordinate: { row: 1, column: 1 } });
    expect(result['isError']).toBe(true);
    expect(JSON.stringify(result)).toContain('Invalid tool arguments');
  });

  it.each(REVISION_BOUND_TOOL_NAMES)('%s fails closed with STALE_STATE when its revision binding is stale', async (name) => {
    const { state, runtime } = await fixtureRuntime();
    const args = { ...happyArguments(name, state, runtime) };
    if (name === 'engine.get_turn_context') args['expected_revision'] = 2;
    else args['state_ref'] = { run_id: 'encounter:engine-mcp', state_handle: `engine-state:${'0'.repeat(64)}`, expected_revision: 1 };
    const result = toolCall(runtime.handler, name, args);
    expect(result['isError']).toBe(true);
    expect(JSON.stringify(result)).toContain('STALE_STATE');
  });

  it('queues a whole round once, canonicalizes idempotency, and never partially queues an invalid round', async () => {
    const { state, runtime } = await fixtureRuntime();
    const valid = happyArguments('engine.submit_round_intents', state, runtime);
    const first = structured(toolCall(runtime.handler, 'engine.submit_round_intents', valid));
    const repeated = structured(toolCall(runtime.handler, 'engine.submit_round_intents', valid));
    expect(first).toEqual(repeated);
    expect(runtime.proposals).toHaveLength(1);
    const facts = fixtureFacts(state, runtime);
    const rejected = structured(toolCall(runtime.handler, 'engine.submit_round_intents', {
      ...valid, idempotency_key: 'round-idempotency-0002', intents: [{ ...facts.intent, actor_id: 'extra-actor' }],
    }));
    expect(rejected['status']).toBe('rejected');
    expect(runtime.proposals).toHaveLength(1);
  });

  it('queues closed reaction guidance on both submission tools and rejects free text', async () => {
    const roundFixture = await fixtureRuntime();
    const roundArguments = happyArguments('engine.submit_round_intents', roundFixture.state, roundFixture.runtime);
    expect(structured(toolCall(roundFixture.runtime.handler, 'engine.submit_round_intents', {
      ...roundArguments,
      reaction_guidance: { side_wide: { opportunity_attack: 'only_when_target_visible' } },
    }))['status']).toBe('proposed');
    expect(roundFixture.runtime.proposals[0]).toEqual(expect.objectContaining({
      reactionGuidance: {
        sideWide: { opportunity_attack: 'only_when_target_visible' }, actors: [],
      },
    }));

    const singleFixture = await fixtureRuntime({ requestedActorCount: 1 });
    const facts = fixtureFacts(singleFixture.state, singleFixture.runtime);
    expect(structured(toolCall(singleFixture.runtime.handler, 'engine.submit_intent', {
      ...happyArguments('engine.submit_intent', singleFixture.state, singleFixture.runtime),
      reaction_guidance: {
        actors: [{ actor_id: facts.actor, triggers: { hit_by_attack: 'decline' } }],
      },
    }))['status']).toBe('proposed');
    expect(singleFixture.runtime.proposals[0]).toEqual(expect.objectContaining({
      reactionGuidance: expect.objectContaining({
        actors: [expect.objectContaining({
          actorId: facts.actor, triggers: { hit_by_attack: 'decline' },
        })],
      }),
    }));

    expect(toolCall(singleFixture.runtime.handler, 'engine.submit_intent', {
      ...happyArguments('engine.submit_intent', singleFixture.state, singleFixture.runtime),
      idempotency_key: 'intent-idempotency-invalid-guidance',
      reaction_guidance: { side_wide: { opportunity_attack: 'ask the agent synchronously' } },
    })['isError']).toBe(true);
  });

  it('paginates application collections and rejects a cursor after filters change', async () => {
    const { state, runtime } = await fixtureRuntime();
    const facts = fixtureFacts(state, runtime);
    const first = structured(toolCall(runtime.handler, 'engine.get_combatant_options', { state_ref: facts.ref, actor_id: facts.actor, include_unavailable: true, page: { maximum_items: 1 } }));
    expect(first['truncated']).toBe(true);
    expect(first['next_cursor']).toEqual(expect.any(String));
    const second = structured(toolCall(runtime.handler, 'engine.get_combatant_options', { state_ref: facts.ref, actor_id: facts.actor, include_unavailable: true, page: { maximum_items: 1, cursor: first['next_cursor'] } }));
    expect(second['options']).not.toEqual(first['options']);
    const invalid = toolCall(runtime.handler, 'engine.get_combatant_options', { state_ref: facts.ref, actor_id: facts.actor, include_unavailable: false, page: { maximum_items: 1, cursor: first['next_cursor'] } });
    expect(JSON.stringify(invalid)).toContain('INVALID_CURSOR');
  });

  it('SIMULATED capsule bump emits current-resource updates and room listChanged without weakening stale checks', async () => {
    const { runtime } = await fixtureRuntime();
    const capsule = runtime.feed.current();
    const base = `engine://run/${encodeURIComponent(capsule.runId)}`;
    expect(request(runtime.handler, 200, 'subscriptions/listen', { uri: `${base}/turn/current` }).error).toBeUndefined();
    expect(request(runtime.handler, 201, 'subscriptions/listen', { uri: `${base}/room/current` }).error).toBeUndefined();
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: 2, generatedAt: '2026-08-27T12:01:00.000Z',
      request: capsule.request, projection: { ...capsule.projection, room: 2 }, historyDelta: [{ revision: 2, kind: 'room_transition', branchStatus: 'active', encounterRound: capsule.projection.round }], rulesIndex: capsule.rulesIndex,
    }), true);
    expect(runtime.handler.drainNotifications()).toEqual([
      { jsonrpc: '2.0', method: 'notifications/resources/updated', params: { uri: `${base}/turn/current` } },
      { jsonrpc: '2.0', method: 'notifications/resources/list_changed', params: {} },
      { jsonrpc: '2.0', method: 'notifications/resources/updated', params: { uri: `${base}/room/current` } },
      { jsonrpc: '2.0', method: 'notifications/resources/list_changed', params: {} },
    ]);
  });

  it('lists and reads deterministic current, immutable, journal, rule, and schema resources', async () => {
    const rule = { ruleId: 'rule:allowed', sourceLocator: 'content/srd/allowed.json', text: 'Allowed rule text.', attribution: 'SRD attribution.' };
    const { runtime } = await fixtureRuntime({
      requestedActorCount: 1,
      listPageSize: 2,
      rulesIndex: [{ ruleId: rule.ruleId, sourceLocator: rule.sourceLocator }],
      rules: { get: (ruleId) => ruleId === rule.ruleId ? rule : null },
    });
    const resources: Readonly<Record<string, unknown>>[] = [];
    let cursor: string | undefined;
    do {
      const result = record(request(runtime.handler, 300 + resources.length, 'resources/list', cursor === undefined ? {} : { cursor }).result);
      const page = result['resources'];
      if (!Array.isArray(page)) throw new TypeError('Expected resources.');
      resources.push(...page.map(record));
      cursor = typeof result['nextCursor'] === 'string' ? result['nextCursor'] : undefined;
    } while (cursor !== undefined);
    expect(resources.map((resource) => resource['name'])).toEqual([
      'Current turn', 'Current room', 'Turn revision 1', 'Journal revision 1', 'Rule rule:allowed', 'Intent v1',
    ]);
    for (const resource of resources) {
      const read = record(request(runtime.handler, `read:${String(resource['name'])}`, 'resources/read', { uri: resource['uri'] }).result);
      const contents = read['contents'];
      if (!Array.isArray(contents)) throw new TypeError('Expected resource contents.');
      expect(record(contents[0])['mimeType']).toBe('application/json');
      expect(() => JSON.parse(String(record(contents[0])['text'])) as unknown).not.toThrow();
      expect(String(record(contents[0])['text'])).not.toContain('proof_token');
    }
    const templates = record(request(runtime.handler, 399, 'resources/templates/list').result)['resourceTemplates'];
    expect(Array.isArray(templates) ? templates.map((value) => record(value)['name']) : []).toEqual(['Journal chunk', 'Rule entry']);
  });

  it('renders both prompts from the same bounded renderer and validates prompt arguments', async () => {
    const { runtime } = await fixtureRuntime();
    const plan = record(request(runtime.handler, 400, 'prompts/get', {
      name: 'engine.plan_round', arguments: { run_id: 'encounter:engine-mcp', expected_revision: 1, voice: 'terse_tactical' },
    }).result);
    expect(JSON.stringify(plan)).toContain('engine.get_turn_context');
    expect(JSON.stringify(plan)).toContain('engine.submit_round_intents');
    expect(JSON.stringify(plan)).toContain('reaction_guidance');
    expect(JSON.stringify(plan)).toContain('persists until replaced');
    const capsule = runtime.feed.current();
    expect(JSON.stringify(plan)).not.toContain('proof_token');
    expect(JSON.stringify(plan)).not.toContain(engineStateSummaryProofToken(capsule.digest, 'turn_minimal'));
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: 2, generatedAt: '2026-08-27T12:02:00.000Z',
      request: capsule.request === null ? null : { ...capsule.request, phase: 'correction', correctionNumber: 1 },
      projection: capsule.projection, historyDelta: capsule.historyDelta, rulesIndex: capsule.rulesIndex,
    }));
    const correction = record(request(runtime.handler, 401, 'prompts/get', {
      name: 'engine.correct_intent', arguments: { run_id: 'encounter:engine-mcp', expected_revision: 2, request_id: 'request:engine-mcp' },
    }).result);
    expect(JSON.stringify(correction)).toContain('fallback must be null');
    expect(request(runtime.handler, 402, 'prompts/get', {
      name: 'engine.plan_round', arguments: { run_id: 'encounter:engine-mcp', expected_revision: 2, voice: 'terse_tactical', coordinate: 1 },
    })).toMatchObject({ error: { code: -32602 } });
  });

  it('pages immutable journal resource chunks with revision-bound cursors', async () => {
    const { runtime } = await fixtureRuntime();
    const capsule = runtime.feed.current();
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: 2, generatedAt: '2026-08-27T12:03:00.000Z',
      request: capsule.request, projection: capsule.projection,
      historyDelta: Array.from({ length: 205 }, (_value, index) => ({ revision: index + 1, kind: `event_${String(index + 1)}`, branchStatus: 'active' as const, encounterRound: 1 })),
      rulesIndex: capsule.rulesIndex,
    }));
    const resources = record(request(runtime.handler, 450, 'resources/list').result)['resources'];
    if (!Array.isArray(resources)) throw new TypeError('Expected resources.');
    const firstUri = String(record(resources.find((value) => String(record(value)['name']).startsWith('Journal')) ?? {})['uri']);
    const firstRead = record(request(runtime.handler, 451, 'resources/read', { uri: firstUri }).result);
    const firstContent = record((firstRead['contents'] as readonly unknown[])[0]);
    const firstBody = record(JSON.parse(String(firstContent['text'])) as unknown);
    expect(firstBody).toMatchObject({ truncated: true, next_cursor: expect.any(String) });
    expect(firstBody['entries']).toHaveLength(100);
    const secondUri = firstUri.replace(/[^/]+$/u, String(firstBody['next_cursor']));
    const secondRead = record(request(runtime.handler, 452, 'resources/read', { uri: secondUri }).result);
    const secondBody = record(JSON.parse(String(record((secondRead['contents'] as readonly unknown[])[0])['text'])) as unknown);
    expect(secondBody['entries']).toHaveLength(100);
    expect(secondBody['truncated']).toBe(true);
  });

  it.each(['engine.validate_intent', 'engine.submit_intent', 'engine.submit_round_intents'] as const)('%s rejects a second fallback during correction', async (name) => {
    const { state, runtime } = await fixtureRuntime();
    const capsule = runtime.feed.current();
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: 2, generatedAt: '2026-08-27T12:04:00.000Z',
      request: capsule.request === null ? null : { ...capsule.request, phase: 'correction', correctionNumber: 1 },
      projection: capsule.projection, historyDelta: capsule.historyDelta, rulesIndex: capsule.rulesIndex,
    }));
    const freshFacts = fixtureFacts(state, runtime);
    const branch = { choice: { kind: 'end_turn' }, movement: { willingness: 'none', maximum_feet: 0, opportunity_risk: 'avoid' }, engagement: { stance: 'hold_position' } };
    const intent = { ...freshFacts.intent, fallback: branch };
    const args = name === 'engine.submit_round_intents'
      ? { state_ref: freshFacts.ref, request_id: freshFacts.request.requestId, phase: 'correction', idempotency_key: 'correction-round-0001', intents: [intent] }
      : name === 'engine.submit_intent'
        ? { state_ref: freshFacts.ref, request_id: freshFacts.request.requestId, phase: 'correction', idempotency_key: 'correction-intent-0001', intent }
        : { state_ref: freshFacts.ref, request_id: freshFacts.request.requestId, phase: 'correction', intent };
    const result = toolCall(runtime.handler, name, args);
    expect(result['isError']).toBe(true);
    expect(JSON.stringify(result)).toContain('fallback');
  });

  it('hard-denies content/cc-by-sa rule text from resources, prompts, and narration references', async () => {
    const sentinel = 'CC_BY_SA_SENTINEL_MUST_NEVER_CROSS';
    const forbidden = { ruleId: 'rule:forbidden', sourceLocator: 'content/cc-by-sa/attractive.json', text: sentinel, attribution: 'Attractive attribution.' };
    const { state, runtime } = await fixtureRuntime({
      requestedActorCount: 1,
      rulesIndex: [{ ruleId: forbidden.ruleId, sourceLocator: forbidden.sourceLocator }],
      rules: { get: (ruleId) => ruleId === forbidden.ruleId ? forbidden : null },
    });
    const listed = request(runtime.handler, 500, 'resources/list');
    const prompt = request(runtime.handler, 501, 'prompts/get', {
      name: 'engine.plan_round', arguments: { run_id: 'encounter:engine-mcp', expected_revision: 1, voice: 'rules_explicit' },
    });
    expect(JSON.stringify(listed)).not.toContain(sentinel);
    expect(JSON.stringify(listed)).not.toContain('rule:forbidden');
    expect(JSON.stringify(prompt)).not.toContain(sentinel);
    expect(request(runtime.handler, 502, 'resources/read', {
      uri: 'engine://run/encounter%3Aengine-mcp/rules/rule%3Aforbidden',
    })).toMatchObject({ error: { code: -32602 } });
    const narration = structured(toolCall(runtime.handler, 'engine.emit_narration', {
      ...happyArguments('engine.emit_narration', state, runtime),
      idempotency_key: 'narration-key-0002',
      rule_references: [{ rule_id: forbidden.ruleId, source_locator: forbidden.sourceLocator }],
    }));
    expect(narration['warnings']).toEqual(['One or more unknown or disallowed rule references were omitted.']);
    expect(JSON.stringify(runtime.narrations)).not.toContain(sentinel);
    expect(JSON.stringify(runtime.narrations)).not.toContain('content/cc-by-sa');
  });

  it('guards oversized resources and tool results before framing', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1, maximumToolResultBytes: 64, maximumResourceBytes: 64 });
    expect(toolCall(runtime.handler, 'engine.get_turn_context', contextArguments())).toMatchObject({ isError: true });
    expect(request(runtime.handler, 600, 'resources/read', {
      uri: 'engine://run/encounter%3Aengine-mcp/turn/current',
    })).toMatchObject({ error: { code: -32602, message: expect.stringContaining('RESOURCE_TOO_LARGE') } });
  });
});
