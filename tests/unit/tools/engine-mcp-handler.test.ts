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
import { createEngineStateCapsule, engineStateHandle } from '../../../src/vtt/engine-state-capsule';
import {
  engineStateSummaryProofToken,
  SEMANTIC_BOARD_MAX_BYTES,
} from '../../../src/vtt/mcp/engine-server';
import {
  ENGINE_DM_TOOL_NAMES,
  ENGINE_SPECULATIVE_DM_TOOL_NAMES,
} from '../../../src/vtt/mcp/engine-server';
import { createEngineMcpRuntime, loadArenaFixture, type EngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../../../src/vtt/dm-bridge/projection-transport';
import { feet } from '../../../src/combat/values';
import { buildHostScenarioMenu } from '../../../src/vtt/speculative-planning';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import {
  ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA,
  ENGINE_TOOL_SPECS,
  ENGINE_TURN_PROPOSAL_INPUT_SCHEMA,
  engineSchemaInternals,
  generatedMinimalRoundSubmissionExample,
} from '../../../src/vtt/mcp/schemas';

const CLIENT_INFO = Object.freeze({ name: 'vitest', version: '1.0.0' });
const TOOL_NAMES = [
  'engine.get_turn_context',
  'engine.query_tactical_intel',
  'engine.propose_from_play',
  'engine.load_skill',
  'engine.get_state_summary',
  'engine.get_combatant_options',
  'engine.query_path',
  'engine.query_reach',
  'engine.query_cover',
  'engine.query_visibility',
  'engine.query_dice_expectation',
  'engine.validate_proposal',
  'engine.submit_round_proposals',
  'engine.submit_plan_adjustment',
  'engine.submit_speculative_round_plan',
  'engine.submit_proposal',
  'engine.emit_narration',
  'engine.request_dm_adjudication',
] as const;
const REVISION_BOUND_TOOL_NAMES = TOOL_NAMES.filter((name) =>
  name !== 'engine.propose_from_play' && name !== 'engine.load_skill');

it('rejects human-only option ids at the proposal schema boundary', () => {
  expect(engineSchemaInternals.turnProposal.safeParse({
    actor_id: 'combatant:monster',
    expected_revision: 1,
    primary_option_id: 'human-option:1:hidden',
    fallback_option_id: null,
    reason: 'Choose this hidden option to exercise rejection.',
    override_justification: null,
  }).success).toBe(false);
});

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Expected an object.');
  return value as Readonly<Record<string, unknown>>;
}
function withoutSemanticBoard(
  context: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const base = structuredClone(context) as Record<string, unknown>;
  delete base['semantic_board'];
  delete base['semantic_board_truncated'];
  return base;
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

function localPointerValue(root: unknown, reference: string): unknown {
  if (reference === '#') return root;
  if (!reference.startsWith('#/')) return undefined;
  let current = root;
  for (const encoded of reference.slice(2).split('/')) {
    const segment = decodeURIComponent(encoded).replaceAll('~1', '/').replaceAll('~0', '~');
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined;
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current;
}

function codexFallbackType(root: unknown, value: unknown): string {
  const schema = typeof value === 'object' && value !== null && !Array.isArray(value) ? record(value) : null;
  if (schema === null || ['allOf', 'if', 'then'].some((keyword) => schema[keyword] !== undefined)) return 'unknown';
  if (typeof schema['$ref'] === 'string') return codexFallbackType(root, localPointerValue(root, schema['$ref']));
  const variants = Array.isArray(schema['anyOf'])
    ? schema['anyOf']
    : Array.isArray(schema['oneOf']) ? schema['oneOf'] : null;
  if (variants !== null) return variants.map((variant) => codexFallbackType(root, variant)).join(' | ');
  if (schema['const'] !== undefined) return JSON.stringify(schema['const']);
  if (Array.isArray(schema['enum'])) return schema['enum'].map((entry) => JSON.stringify(entry)).join(' | ');
  const declaredType = schema['type'];
  if (Array.isArray(declaredType)) return declaredType.map(String).join(' | ');
  if (declaredType === 'array') return `Array<${codexFallbackType(root, schema['items'])}>`;
  if (declaredType === 'object') {
    const properties = record(schema['properties'] ?? {});
    const required = new Set(Array.isArray(schema['required']) ? schema['required'].map(String) : []);
    return `{ ${Object.entries(properties).map(([key, property]) =>
      `${key}${required.has(key) ? '' : '?'}: ${codexFallbackType(root, property)}`).join('; ')} }`;
  }
  return declaredType === 'string' || declaredType === 'number' || declaredType === 'integer' ||
    declaredType === 'boolean' || declaredType === 'null'
    ? String(declaredType).replace('integer', 'number')
    : 'unknown';
}

function referencedDefinitionKeys(value: unknown): ReadonlySet<string> {
  const root = record(value);
  const definitions = root['$defs'] === undefined ? {} : record(root['$defs']);
  const keys = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (typeof candidate !== 'object' || candidate === null) return;
    const recordValue = candidate as Readonly<Record<string, unknown>>;
    const reference = recordValue['$ref'];
    if (typeof reference === 'string' && reference.startsWith('#/$defs/')) {
      const key = decodeURIComponent(reference.slice('#/$defs/'.length)).replaceAll('~1', '/').replaceAll('~0', '~');
      if (!keys.has(key)) {
        keys.add(key);
        visit(definitions[key]);
      }
    }
    for (const [key, nested] of Object.entries(recordValue)) if (key !== '$defs') visit(nested);
  };
  visit(root);
  return keys;
}

async function fixtureRuntime(options: Parameters<typeof createEngineMcpRuntime>[1] = { requestedActorCount: 1 }): Promise<{ readonly state: EncounterState; readonly runtime: EngineMcpRuntime }> {
  const loaded = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
  const state: EncounterState = {
    ...loaded,
    combatants: loaded.combatants.map((combatant) => combatant.profile.kind !== 'monster' ? combatant : ({
      ...combatant,
      turn: {
        ...combatant.turn,
        action: { kind: 'available' }, bonusActionAvailable: true, reactionAvailable: true,
        movement: {
          speed: combatant.profile.rules.speed,
          remaining: combatant.profile.rules.speed,
          spent: feet(0),
        },
      },
    })),
  };
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
function currentPlayToken(runtime: EngineMcpRuntime): string {
  const capsule = runtime.feed.current();
  const context = structured(toolCall(runtime.handler, 'engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
  }));
  const plays = context['applicable_plays'];
  const play = Array.isArray(plays) ? plays[0] : undefined;
  if (typeof play !== 'object' || play === null || Array.isArray(play) ||
    !('play_token' in play) || typeof play.play_token !== 'string') {
    throw new Error('Fixture current turn context has no engine play token.');
  }
  return play.play_token;
}
function fixtureFacts(state: EncounterState, runtime: EngineMcpRuntime) {
  const capsule = runtime.feed.current();
  const actor = capsule.request?.actors[0];
  const target = state.combatants.find((candidate) => candidate.profile.kind === 'player_character')?.profile.id;
  const action = actor === undefined ? undefined : capsule.projection.combatants.find((candidate) => candidate.id === actor)?.actions[0]?.actionId;
  if (actor === undefined || target === undefined || action === undefined || capsule.request === null) throw new Error('Fixture facts are absent.');
  const option = capsule.projection.combatants.find((candidate) => candidate.id === actor)?.options
    .find((candidate) => candidate.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
  const fallback = capsule.projection.combatants.find((candidate) => candidate.id === actor)?.options
    .find((candidate) => candidate.optionId !== option?.optionId);
  if (option === undefined || fallback === undefined) throw new Error('Fixture independent options are absent.');
  const proposal = {
    actor_id: actor,
    expected_revision: capsule.revision,
    primary_option_id: option.optionId,
    fallback_option_id: fallback.optionId,
    reason: 'Dodge to preserve this actor for the next exchange.',
    override_justification: {
      kind: 'missing_metric' as const,
      id: 'expected_damage_milli' as const,
    },
  } as const;
  return { actor, target, action, request: capsule.request, proposal, ref: stateRef(runtime) };
}
function adjustmentMetadata(
  actorIds: readonly import('../../../src/combat/values').CombatantId[],
  materialityReasonCodes: readonly import('../../../src/vtt/plan-materiality').PlanMaterialityReasonCode[] =
    ['PROPOSAL_RESOLUTION_CHANGED'],
) {
  return {
    parentPlanId: 'plan:mcp-adjustment',
    baselinePlanHash: 'a'.repeat(64),
    triggerPcTurnId: 'pc-turn:mcp-adjustment',
    beforeRevision: 1,
    afterRevision: 2,
    materialityReasonCodes,
    baselineProposalDigests: actorIds.map((actorId) => ({ actorId, proposalDigest: 'b'.repeat(64) })),
    adjustmentBudget: Math.min(actorIds.length, 2) as 1 | 2,
  };
}
function dodgeUpdate(runtime: EngineMcpRuntime, actorId: string, fallbackOptionId: string | null = null) {
  const capsule = runtime.feed.current();
  const option = capsule.projection.combatants.find((candidate) => candidate.id === actorId)?.options
    .find((candidate) => candidate.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
  if (option === undefined) throw new Error(`Fixture Dodge option is absent for ${actorId}.`);
  return {
    actor_id: actorId, expected_revision: capsule.revision, primary_option_id: option.optionId,
    fallback_option_id: fallbackOptionId,
    reason: 'Dodge to preserve this actor for the next exchange.',
    override_justification: {
      kind: 'missing_metric' as const,
      id: 'expected_damage_milli' as const,
    },
  };
}
function happyArguments(name: typeof TOOL_NAMES[number], state: EncounterState, runtime: EngineMcpRuntime): Readonly<Record<string, unknown>> {
  if (name === 'engine.submit_speculative_round_plan') {
    const capsule = runtime.feed.current();
    const actor = capsule.request?.actors[0];
    if (actor === undefined) throw new Error('Speculative fixture actor is absent.');
    const atom = {
      kind: 'resource_available_is' as const,
      subject: { actorId: actor, selector: { kind: 'combatant' as const, combatantId: actor } },
      resource: { kind: 'reaction' as const },
      available: true,
    };
    const candidate = {
      candidateId: 'candidate:mcp-speculative',
      rank: 1 as const,
      factKey: `reaction:${actor}`,
      baseline: atom,
      flipped: { ...atom, available: false },
      referencedProposalCount: 1,
      influencingPlayerIds: [],
      summedMovementRadiusFeet: 30,
      volatilityScore: 30,
    };
    const scenarios = [
      {
        scenarioId: 'scenario:mcp-speculative-default',
        ordinal: 1 as const,
        kind: 'no_material_change' as const,
        flippedCandidateId: null,
        facts: [atom],
      },
      {
        scenarioId: 'scenario:mcp-speculative-flip',
        ordinal: 2 as const,
        kind: 'single_candidate_flip' as const,
        flippedCandidateId: candidate.candidateId,
        facts: [candidate.flipped],
      },
    ];
    const defaultScenario = scenarios[0];
    if (defaultScenario === undefined) throw new Error('Speculative default scenario is absent.');
    const speculative = createEngineStateCapsule({
      runId: capsule.runId,
      branchId: capsule.branchId,
      revision: capsule.revision + 1,
      generatedAt: '2026-08-29T12:00:00.000Z',
      request: {
        requestId: 'request:mcp-speculative',
        phase: 'speculative',
        correctionNumber: 0,
        actors: [actor],
        targetRoom: 1,
        targetMonsterRound: 2,
        refreshGeneration: 0,
        scenarioMenu: [candidate],
        scenarios,
      },
      projection: capsule.projection,
      historyDelta: capsule.historyDelta,
      rulesIndex: capsule.rulesIndex,
    });
    runtime.feed.replace(speculative);
    return {
      state_ref: {
        run_id: speculative.runId,
        state_handle: engineStateHandle(speculative),
        expected_revision: speculative.revision,
      },
      request_id: 'request:mcp-speculative',
      target_room: 1,
      target_monster_round: 2,
      refresh_generation: 0,
      branches: scenarios.map((scenario) => ({
        scenario_id: scenario.scenarioId,
        proposals: [{ ...dodgeUpdate(runtime, actor), expected_revision: speculative.revision }],
      })),
      reaction_guidance: { side_wide: { opportunity_attack: 'decline' } },
      idempotency_key: 'mcp-speculative-idempotency-0001',
    };
  }
  if (name === 'engine.submit_plan_adjustment') {
    const capsule = runtime.feed.current();
    if (capsule.request === null || capsule.request.phase === 'speculative') throw new Error('Adjustment fixture request is absent.');
    const adjusted = createEngineStateCapsule({
      runId: capsule.runId,
      branchId: capsule.branchId,
      revision: capsule.revision + 1,
      generatedAt: capsule.generatedAt,
      request: {
        kind: 'plan_adjustment',
        requestId: capsule.request.requestId,
        phase: 'initial',
        correctionNumber: 0,
        actors: capsule.request.actors,
        parentPlanId: 'plan:mcp-happy',
        baselinePlanHash: 'a'.repeat(64),
        triggerPcTurnId: 'pc-turn:mcp-happy',
        beforeRevision: 1,
        afterRevision: 2,
        materialityReasonCodes: ['OPEN_MONSTER_SET_CHANGED'],
        baselineProposalDigests: capsule.request.actors.map((actorId) => ({ actorId, proposalDigest: 'b'.repeat(64) })),
        adjustmentBudget: Math.min(capsule.request.actors.length, 2) as 1 | 2,
      },
      projection: capsule.projection,
      historyDelta: capsule.historyDelta,
      rulesIndex: capsule.rulesIndex,
    });
    runtime.feed.replace(adjusted);
    return {
      state_ref: { run_id: adjusted.runId, state_handle: engineStateHandle(adjusted), expected_revision: adjusted.revision },
      request_id: adjusted.request?.requestId,
      phase: 'initial',
      idempotency_key: 'adjustment-idempotency-0001',
      baseline_plan_hash: 'a'.repeat(64),
      updates: [],
    };
  }
  const facts = fixtureFacts(state, runtime);
  switch (name) {
    case 'engine.get_turn_context': return contextArguments();
    case 'engine.query_tactical_intel': return {
      state_ref: facts.ref,
      page: { maximum_items: 2 },
      initiative: { mode: 'none' },
    };
    case 'engine.propose_from_play': return { play_name: 'basic_advance' };
    case 'engine.load_skill': return { skill_name: 'core_tactics' };
    case 'engine.get_state_summary': return { state_ref: facts.ref, granularity: 'room_tactical', page: { maximum_items: 1 } };
    case 'engine.get_combatant_options': return { state_ref: facts.ref, actor_id: facts.actor, page: { maximum_items: 2 } };
    case 'engine.query_path': return { state_ref: facts.ref, actor_id: facts.actor, objective: { kind: 'approach', target: { kind: 'combatant', combatant_id: facts.target } }, movement: { willingness: 'freely', maximum_feet: 30, opportunity_risk: 'accept_if_needed' }, engagement: { stance: 'close_to_melee' } };
    case 'engine.query_reach':
    case 'engine.query_cover':
    case 'engine.query_visibility': return { state_ref: facts.ref, queries: [{ query_id: 'q1', actor_id: facts.actor, target: { kind: 'combatant', combatant_id: facts.target }, action_id: facts.action }] };
    case 'engine.query_dice_expectation': return { state_ref: facts.ref, candidates: [{ candidate_id: 'c1', actor_id: facts.actor, choice: { kind: 'attack', action_id: facts.action, target: { kind: 'combatant', combatant_id: facts.target } } }], include_distribution: true };
    case 'engine.validate_proposal': return { state_ref: facts.ref, request_id: facts.request.requestId, phase: 'initial', proposal: facts.proposal };
    case 'engine.submit_round_proposals': return { state_ref: facts.ref, request_id: facts.request.requestId, phase: 'initial', idempotency_key: 'round-idempotency-0001', proposals: [facts.proposal] };
    case 'engine.submit_proposal': return { state_ref: facts.ref, request_id: facts.request.requestId, phase: 'initial', idempotency_key: 'proposal-idempotency-0001', proposal: facts.proposal };
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
      counts: { tools: TOOL_NAMES.length, resources: 5, resourceTemplates: 2, prompts: 2 },
      ttlMs: MCP_STATIC_LIST_TTL_MS, cacheScope: 'public',
    });
    expect(record(request(runtime.handler, 3, 'server/discover').result)['tools']).toBeUndefined();
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
        const schema = record(tool['inputSchema']);
        expect(schema).toMatchObject({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' });
        expect(tool['outputSchema']).toBeUndefined();
        expect(closedObjects(schema)).toEqual([]);
      }
      cursor = typeof result['nextCursor'] === 'string' ? result['nextCursor'] : undefined;
    } while (cursor !== undefined);
    expect(names).toEqual(TOOL_NAMES);
    expect(request(runtime.handler, 99, 'tools/list', { cursor: 'forged' })).toMatchObject({ error: { code: -32602 } });
  });

  it('D466 G1 presents the minimal submission first and preserves the explicit envelope path', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1, toolProfile: 'dm' });
    const listing = record(request(runtime.handler, 98, 'tools/list').result);
    const tools = listing['tools'];
    if (!Array.isArray(tools)) throw new TypeError('DM tools/list omitted tools.');
    const submission = tools.map(record).find((tool) => tool['name'] === 'engine.submit_round_proposals');
    if (submission === undefined) throw new TypeError('DM tools/list omitted engine.submit_round_proposals.');
    expect(submission['description']).toContain('one short sentence per actor saying why this option');
    expect(submission['description']).toContain('Minimal input: { proposals, rationale?, reaction_guidance? }');
    expect(submission['description']).toContain('launcher fills state_ref, request_id, phase, and a deterministic idempotency_key');
    expect(submission['description']).toContain('full explicit envelope { state_ref, request_id, phase, idempotency_key, proposals, rationale?, reaction_guidance? }');
    expect(submission['description']).toContain('One ACCEPTED submission per round; a call rejected for invalid arguments is not queued — fix it and call again.');
  });

  it('D466 G1 advertises plain object schemas and a complete explicit submit envelope (mutation: reintroduce a top-level conditional)', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1, toolProfile: 'dm' });
    const listing = record(request(runtime.handler, 97, 'tools/list').result);
    const tools = listing['tools'];
    if (!Array.isArray(tools)) throw new TypeError('DM tools/list omitted tools.');
    const submission = tools.map(record).find((tool) => tool['name'] === 'engine.submit_round_proposals');
    const specification = ENGINE_TOOL_SPECS.find((candidate) => candidate.descriptor.name === 'engine.submit_round_proposals');
    if (submission === undefined || specification === undefined) throw new TypeError('Submit-round tool is missing.');
    expect(submission['inputSchema']).toEqual(specification.descriptor.inputSchema);
    expect(record(submission['inputSchema'])['required']).toEqual([
      'state_ref', 'request_id', 'phase', 'idempotency_key', 'proposals',
    ]);
    for (const specification of ENGINE_TOOL_SPECS) {
      const schema = record(specification.descriptor.inputSchema);
      expect(schema['type'], specification.descriptor.name).toBe('object');
      expect(schema['allOf'], specification.descriptor.name).toBeUndefined();
      expect(schema['if'], specification.descriptor.name).toBeUndefined();
      expect(schema['then'], specification.descriptor.name).toBeUndefined();
      expect(schema['oneOf'], specification.descriptor.name).toBeUndefined();
    }
  });

  it('D466 G1 renders the explicit schema without unknown when the Codex package renderer is unavailable', () => {
    const rendered = codexFallbackType(
      ENGINE_TOOL_SPECS.find((candidate) => candidate.descriptor.name === 'engine.submit_round_proposals')?.descriptor.inputSchema,
      ENGINE_TOOL_SPECS.find((candidate) => candidate.descriptor.name === 'engine.submit_round_proposals')?.descriptor.inputSchema,
    );
    expect(rendered).toContain('state_ref:');
    expect(rendered).toContain('request_id: string');
    expect(rendered).toContain('phase:');
    expect(rendered).toContain('idempotency_key: string');
    expect(rendered).toContain('proposals: Array<');
    expect(rendered).not.toMatch(/(?:^|[<|: ])unknown(?:$|[>|; ])/u);
  });

  it('D466 G1 generates complete phase-valid minimal examples from the minimal schema', () => {
    const initial = generatedMinimalRoundSubmissionExample('initial');
    const correction = generatedMinimalRoundSubmissionExample('correction');
    expect(engineSchemaInternals.minimalSubmitRoundInput.safeParse(initial).success).toBe(true);
    expect(engineSchemaInternals.minimalSubmitRoundInput.safeParse(correction).success).toBe(true);
    expect(initial).toHaveProperty('proposals.0.primary_option_id');
    expect(initial).toHaveProperty('proposals.0.fallback_option_id');
    expect(initial).toHaveProperty('proposals.0.reason');
    expect(record((initial['proposals'] as readonly unknown[])[0])['reason']).toBe(
      'Close with the most vulnerable visible enemy before it can recover.',
    );
    expect(record((initial['proposals'] as readonly unknown[])[0])['fallback_option_id'])
      .not.toBe(record((initial['proposals'] as readonly unknown[])[0])['primary_option_id']);
    expect(record((correction['proposals'] as readonly unknown[])[0])['fallback_option_id']).toBeNull();
    expect(ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA).toMatchObject({
      type: 'object', required: ['proposals'],
    });
    const schemas = JSON.stringify(ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA);
    expect(schemas).toMatch(/"required":\[[^\]]*"reason"/u);
  });

  it('advertises only locally resolved and reachable definitions in every tool input schema', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1 });
    const discovery = record(request(runtime.handler, 100, 'server/discover').result);
    const listing = record(request(runtime.handler, 101, 'tools/list').result);
    expect(discovery['tools']).toBeUndefined();
    const tools = listing['tools'];
    if (!Array.isArray(tools)) throw new TypeError('tools/list did not advertise tools.');
    expect(tools).toHaveLength(TOOL_NAMES.length);
    for (const value of tools) {
      const tool = record(value);
      const schema = record(tool['inputSchema']);
      expect(unresolvedSchemaReferences(schema), `${String(tool['name'])}.inputSchema`).toEqual([]);
      const definitions = schema['$defs'] === undefined ? {} : record(schema['$defs']);
      const referenced = referencedDefinitionKeys(schema);
      expect(Object.keys(definitions).sort(), `${String(tool['name'])}.inputSchema unreachable $defs`).toEqual([...referenced].sort());
    }
  });

  it('serves the bounded DM profile while retaining the full profile as the default', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1, toolProfile: 'dm' });
    const result = record(request(runtime.handler, 102, 'tools/list').result);
    const tools = result['tools'];
    if (!Array.isArray(tools)) throw new TypeError('DM tools/list omitted tools.');
    expect(tools.map((tool) => record(tool)['name'])).toEqual(ENGINE_DM_TOOL_NAMES);
    expect(new TextEncoder().encode(JSON.stringify(tools)).byteLength).toBeLessThanOrEqual(17 * 1024);
    expect(request(runtime.handler, 103, 'tools/call', {
      name: 'engine.get_state_summary', arguments: {},
    })).toMatchObject({ error: { code: -32602, data: { kind: 'unknown_tool' } } });

    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const actors = state.combatants
      .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
      .map((candidate) => candidate.profile.id)
      .slice(0, 2);
    const adjustment = createEngineMcpRuntime(state, {
      toolProfile: 'dm',
      requestKind: 'plan_adjustment',
      requestedActorIds: actors,
      planAdjustment: adjustmentMetadata(actors),
    });
    const adjustmentList = record(request(adjustment.handler, 104, 'tools/list').result)['tools'];
    if (!Array.isArray(adjustmentList)) throw new TypeError('Adjustment DM tools/list omitted tools.');
    expect(adjustmentList.map((tool) => record(tool)['name'])).toEqual([
      'engine.get_turn_context',
      'engine.query_tactical_intel',
      'engine.load_skill',
      'engine.validate_proposal',
      'engine.submit_plan_adjustment',
      'engine.request_dm_adjudication',
    ]);
    expect(JSON.stringify(adjustmentList)).not.toContain('engine.submit_round_proposals');
    expect(JSON.stringify(adjustmentList)).not.toContain('engine.propose_from_play');
  });

  it('keeps skill loading available to the bounded speculative planner', async () => {
    const { state } = await fixtureRuntime({ toolProfile: 'dm' });
    const actors = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' ? [combatant.profile.id] : []).slice(0, 1);
    const players = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'player_character' ? [combatant.profile.id] : []);
    const menu = buildHostScenarioMenu(state, actors, players);
    const runtime = createEngineMcpRuntime(state, {
      toolProfile: 'dm',
      phase: 'speculative',
      requestedActorIds: actors,
      speculativeRequest: {
        targetRoom: 1,
        targetMonsterRound: 1,
        refreshGeneration: 0,
        scenarioMenu: menu.scenarioMenu,
        scenarios: menu.scenarios,
      },
    });
    const result = record(request(runtime.handler, 105, 'tools/list').result);
    const tools = result['tools'];
    if (!Array.isArray(tools)) throw new TypeError('Speculative DM tools/list omitted tools.');
    expect(tools.map((tool) => record(tool)['name'])).toEqual(ENGINE_SPECULATIVE_DM_TOOL_NAMES);
  });

  it.each(TOOL_NAMES)('%s has a direct happy path with output-schema-conforming structured content', async (name) => {
    const { state, runtime } = await fixtureRuntime();
    const result = toolCall(runtime.handler, name, happyArguments(name, state, runtime));
    const value = structured(result);
    expect(record((result['content'] as readonly unknown[])[0])['text']).toBe(JSON.stringify(value));
    expect(forbiddenAgentKeys(value)).toEqual([]);
  });

  it.each(['caveman_prose', 'regular_prose'] as const)('makes %s the model-visible tool text while retaining schema-valid structured metadata', async (format) => {
    const { state } = await fixtureRuntime();
    const runtime = createEngineMcpRuntime(state, {
      requestedActorCount: 1,
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
    });
    const result = toolCall(runtime.handler, 'engine.get_turn_context', contextArguments());
    const value = structured(result);
    const content = result['content'];
    if (!Array.isArray(content)) throw new TypeError('Prose tool result omitted content.');
    expect(value).toMatchObject({ format, granularity: 'full' });
    expect(record(content[0])['text']).toBe(value['document']);
    expect(String(record(content[0])['text'])).not.toBe(JSON.stringify(value));
  });

  it('delivers a revision-matched semantic DM board with exact row telemetry', async () => {
    const { state } = await fixtureRuntime();
    let evidence: {
      readonly baseContextBytes: number;
      readonly semanticBoardBytes: number;
      readonly semanticBoardTruncated: readonly string[];
    } | undefined;
    const runtime = createEngineMcpRuntime(state, {
      requestedActorCount: 1,
      toolProfile: 'dm',
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, semanticBoard: true },
      turnContextMaximumBytes: 100_000,
      onTurnContextRendered: (value) => { evidence = value; },
    });
    const capsule = runtime.feed.current();
    const context = structured(toolCall(runtime.handler, 'engine.get_turn_context', contextArguments()));
    const board = record(context['semantic_board']);

    expect(board).toMatchObject({
      provenance: 'engine_fact',
      audience: 'dm',
      revision: capsule.revision,
    });
    expect(String(board['encoding_note'])).not.toContain('\n');
    expect(context).not.toHaveProperty('semantic_board_truncated');
    expect(evidence).toMatchObject({
      baseContextBytes: new TextEncoder().encode(JSON.stringify(withoutSemanticBoard(context))).byteLength,
      semanticBoardBytes: new TextEncoder().encode(JSON.stringify(board)).byteLength,
      semanticBoardTruncated: [],
    });
  });

  it('delivers the whole semantic board on top of an already-capped byte-identical base context', async () => {
    const { state } = await fixtureRuntime();
    const maximumBytes = 12_000;
    const offRuntime = createEngineMcpRuntime(state, {
      requestedActorCount: 1,
      toolProfile: 'dm',
      turnContextMaximumBytes: maximumBytes,
    });
    const onRuntime = createEngineMcpRuntime(state, {
      requestedActorCount: 1,
      toolProfile: 'dm',
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, semanticBoard: true },
      turnContextMaximumBytes: maximumBytes,
    });
    const off = structured(toolCall(offRuntime.handler, 'engine.get_turn_context', contextArguments()));
    const on = structured(toolCall(onRuntime.handler, 'engine.get_turn_context', contextArguments()));
    const baseOn = withoutSemanticBoard(on);
    const baseBytes = new TextEncoder().encode(JSON.stringify(baseOn)).byteLength;
    const totalBytes = new TextEncoder().encode(JSON.stringify(on)).byteLength;

    expect(off['context_trimmed']).toBe(true);
    expect(JSON.stringify(baseOn)).toBe(JSON.stringify(off));
    expect(baseBytes).toBeLessThanOrEqual(maximumBytes);
    expect(on).not.toHaveProperty('semantic_board_truncated');
    expect(totalBytes).toBeLessThanOrEqual(maximumBytes + SEMANTIC_BOARD_MAX_BYTES);
  });

  it('truncates an oversized semantic board in fixed order without touching actors', async () => {
    const { state } = await fixtureRuntime();
    const maximumBytes = 100_000;
    const offRuntime = createEngineMcpRuntime(state, {
      requestedActorCount: 1,
      toolProfile: 'dm',
      turnContextMaximumBytes: maximumBytes,
    });
    const fullRuntime = createEngineMcpRuntime(state, {
      requestedActorCount: 1,
      toolProfile: 'dm',
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, semanticBoard: true },
      turnContextMaximumBytes: maximumBytes,
    });
    const off = structured(toolCall(offRuntime.handler, 'engine.get_turn_context', contextArguments()));
    const full = structured(toolCall(fullRuntime.handler, 'engine.get_turn_context', contextArguments()));
    const expectedBoard = structuredClone(record(full['semantic_board'])) as Record<string, unknown>;
    const cells = structuredClone(record(expectedBoard['cells'])) as Record<string, unknown>;
    delete cells['light'];
    expectedBoard['cells'] = cells;
    delete expectedBoard['light_sources'];
    const expected = {
      ...off,
      semantic_board: expectedBoard,
      semantic_board_truncated: ['light'],
    };
    const baseBytes = new TextEncoder().encode(JSON.stringify(off)).byteLength;
    const semanticBoardMaximumBytes = new TextEncoder().encode(JSON.stringify(expected)).byteLength - baseBytes;
    const fullAttachmentBytes = new TextEncoder().encode(JSON.stringify(full)).byteLength - baseBytes;
    const truncatedRuntime = createEngineMcpRuntime(state, {
      requestedActorCount: 1,
      toolProfile: 'dm',
      rendererProfile: { ...DEFAULT_RENDERER_PROFILE, semanticBoard: true },
      turnContextMaximumBytes: maximumBytes,
      semanticBoardMaximumBytes,
    });
    const truncated = structured(toolCall(
      truncatedRuntime.handler,
      'engine.get_turn_context',
      contextArguments(),
    ));

    expect(fullAttachmentBytes).toBeGreaterThan(semanticBoardMaximumBytes);
    expect(truncated).toEqual(expected);
    expect(withoutSemanticBoard(truncated)['actors']).toEqual(off['actors']);
    expect(new TextEncoder().encode(JSON.stringify(truncated)).byteLength - baseBytes)
      .toBeLessThanOrEqual(semanticBoardMaximumBytes);
  });

  it('returns a revision delta that reconstructs the independently recomputed full turn context', async () => {
    const { state, runtime: baseRuntime } = await fixtureRuntime({ requestedActorCount: 1, revision: 1 });
    const base = structured(toolCall(baseRuntime.handler, 'engine.get_turn_context', {
      ...contextArguments(), granularity: 'full', maximum_options_per_actor: 8,
    }));
    const currentOptions = {
      requestedActorCount: 1,
      revision: 2,
      phase: 'correction' as const,
      correctionNumber: 1 as const,
      historyKind: 'proposal_correction_requested',
    };
    const recomputedRuntime = createEngineMcpRuntime(state, currentOptions);
    const recomputed = structured(toolCall(recomputedRuntime.handler, 'engine.get_turn_context', {
      run_id: 'encounter:engine-mcp', expected_revision: 2, scope: 'round',
      granularity: 'full', maximum_options_per_actor: 8,
    }));
    const deltaRuntime = createEngineMcpRuntime(state, {
      ...currentOptions,
      turnContextDeltaBase: { revision: 1, context: base },
    });
    const delta = structured(toolCall(deltaRuntime.handler, 'engine.get_turn_context', {
      run_id: 'encounter:engine-mcp', expected_revision: 2, scope: 'round',
      granularity: 'turn_delta', since_revision: 1, maximum_options_per_actor: 8,
    }));
    const changes = delta['changes'];
    if (!Array.isArray(changes)) throw new TypeError('Turn delta omitted changes.');
    const reconstructed = applyRevisionDelta(base, changes as readonly RevisionDeltaOperation[]);

    expect(delta).toMatchObject({
      granularity: 'turn_delta',
      anchor: { base_revision: 1, revision: 2 },
    });
    expect(canonicalJson(reconstructed)).toBe(canonicalJson(recomputed));
    expect(new TextEncoder().encode(JSON.stringify(delta)).byteLength)
      .toBeLessThan(new TextEncoder().encode(JSON.stringify(recomputed)).byteLength);
  });

  it('fails closed to full turn context when the requested delta base is unavailable', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1, revision: 2 });
    const context = structured(toolCall(runtime.handler, 'engine.get_turn_context', {
      run_id: 'encounter:engine-mcp', expected_revision: 2, scope: 'round',
      granularity: 'turn_delta', since_revision: 1,
    }));

    expect(context).toMatchObject({ granularity: 'full', context_trimmed: false });
    expect(context['actors']).toBeInstanceOf(Array);
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
    const valid = happyArguments('engine.submit_round_proposals', state, runtime);
    const first = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', valid));
    const repeated = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', valid));
    expect(first).toEqual(repeated);
    expect(runtime.proposals).toHaveLength(1);
    const facts = fixtureFacts(state, runtime);
    const rejected = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', {
      ...valid, idempotency_key: 'round-idempotency-0002', proposals: [{ ...facts.proposal, actor_id: 'extra-actor' }],
    }));
    expect(rejected['status']).toBe('rejected');
    expect(runtime.proposals).toHaveLength(1);
  });

  it('D466 G1 fills a minimal submission from its launch binding and replays it exactly once', async () => {
    const { state, runtime } = await fixtureRuntime();
    const facts = fixtureFacts(state, runtime);
    const minimal = { proposals: [facts.proposal] };
    const first = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', minimal));
    const replay = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', minimal));

    expect(first).toEqual(replay);
    expect(first['status']).toBe('proposed');
    expect(runtime.proposals).toHaveLength(1);
    expect(runtime.proposals[0]).toMatchObject({
      requestId: facts.request.requestId,
      phase: facts.request.phase,
      submittedArguments: minimal,
      idempotencyKey: expect.stringMatching(/^round-submit:[0-9a-f]{48}$/u),
    });
  });

  it('G2.1 rejects missing proposal reasons without consuming minimal or explicit submissions (mutation: reason optional)', async () => {
    expect(JSON.stringify(ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA))
      .toMatch(/"required":\[[^\]]*"reason"/u);
    const minimalFixture = await fixtureRuntime();
    const minimalFacts = fixtureFacts(minimalFixture.state, minimalFixture.runtime);
    const { reason: _minimalReason, ...minimalWithoutReason } = minimalFacts.proposal;
    const minimalRejected = structured(toolCall(
      minimalFixture.runtime.handler,
      'engine.submit_round_proposals',
      { proposals: [minimalWithoutReason] },
    ));
    expect(minimalRejected).toMatchObject({
      status: 'rejected', actor_refusals: [{ codes: ['REASON_REQUIRED'] }],
    });
    expect(minimalFixture.runtime.proposals).toEqual([]);
    expect(structured(toolCall(minimalFixture.runtime.handler, 'engine.submit_round_proposals', {
      proposals: [minimalFacts.proposal],
    }))['status']).toBe('proposed');

    const explicitFixture = await fixtureRuntime();
    const explicitFacts = fixtureFacts(explicitFixture.state, explicitFixture.runtime);
    const explicit = happyArguments(
      'engine.submit_round_proposals', explicitFixture.state, explicitFixture.runtime,
    );
    const explicitProposals = explicit['proposals'];
    if (!Array.isArray(explicitProposals)) throw new TypeError('Explicit fixture proposals are absent.');
    const explicitProposal = record(explicitProposals[0]);
    const { reason: _explicitReason, ...explicitWithoutReason } = explicitProposal;
    const explicitWithRationale = {
      ...explicit,
      rationale: 'The round focuses on preserving the front line while ranged actors reposition.',
    };
    const explicitRejected = structured(toolCall(
      explicitFixture.runtime.handler,
      'engine.submit_round_proposals',
      { ...explicitWithRationale, proposals: [explicitWithoutReason] },
    ));
    expect(explicitRejected).toMatchObject({
      status: 'rejected', actor_refusals: [{ codes: ['REASON_REQUIRED'] }],
    });
    expect(explicitFixture.runtime.proposals).toEqual([]);
    expect(structured(toolCall(
      explicitFixture.runtime.handler, 'engine.submit_round_proposals', explicitWithRationale,
    ))['status']).toBe('proposed');
    expect(explicitFixture.runtime.proposals[0]).toMatchObject({
      rationale: explicitWithRationale.rationale,
      resolutions: [{ proposal: { reason: explicitFacts.proposal.reason } }],
    });
  });

  it('G2.1 rejects an empty reason on the tool-driven wire without consuming the submission', async () => {
    const fixture = await fixtureRuntime();
    const facts = fixtureFacts(fixture.state, fixture.runtime);
    const rejected = structured(toolCall(fixture.runtime.handler, 'engine.submit_round_proposals', {
      proposals: [{ ...facts.proposal, reason: '', override_justification: null }],
    }));

    expect(rejected).toMatchObject({
      status: 'rejected',
      actor_refusals: [{ codes: ['REASON_REQUIRED'] }],
    });
    expect(fixture.runtime.proposals).toEqual([]);
    expect(structured(toolCall(fixture.runtime.handler, 'engine.submit_round_proposals', {
      proposals: [facts.proposal],
    }))['status']).toBe('proposed');
    expect(fixture.runtime.proposals).toHaveLength(1);
  });

  it('D466 G1 rejects a stale minimal launcher binding with a typed code', async () => {
    const { state, runtime } = await fixtureRuntime();
    const facts = fixtureFacts(state, runtime);
    const capsule = runtime.feed.current();
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: capsule.revision + 1,
      generatedAt: '2026-08-27T12:01:00.000Z', request: capsule.request,
      projection: capsule.projection, historyDelta: capsule.historyDelta, rulesIndex: capsule.rulesIndex,
    }));

    const rejected = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', {
      proposals: [facts.proposal],
    }));
    expect(rejected).toMatchObject({
      status: 'rejected', actor_refusals: [{ codes: ['STALE_SUBMISSION_BINDING'] }],
    });
    expect(runtime.proposals).toEqual([]);
  });

  it('D466 G1 rejects concurrent pending requests as ambiguous instead of filling from the newest request', async () => {
    const { state, runtime } = await fixtureRuntime();
    const facts = fixtureFacts(state, runtime);
    const capsule = runtime.feed.current();
    if (capsule.request === null || capsule.request.phase === 'speculative') throw new Error('Round request is absent.');
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: capsule.revision + 1,
      generatedAt: '2026-08-27T12:01:00.000Z',
      request: { ...capsule.request, requestId: 'request:concurrent-round' },
      projection: capsule.projection, historyDelta: capsule.historyDelta, rulesIndex: capsule.rulesIndex,
    }));

    const rejected = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', {
      proposals: [facts.proposal],
    }));
    expect(rejected).toMatchObject({
      status: 'rejected', actor_refusals: [{ codes: ['AMBIGUOUS_SUBMISSION_BINDING'] }],
    });
    expect(runtime.proposals).toEqual([]);
  });

  it('D466 G1 requires an independent initial fallback and names identical ids', async () => {
    const { state, runtime } = await fixtureRuntime();
    const facts = fixtureFacts(state, runtime);
    const identical = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', {
      proposals: [{ ...facts.proposal, fallback_option_id: facts.proposal.primary_option_id }],
    }));
    expect(identical).toMatchObject({
      status: 'rejected', actor_refusals: [{ codes: ['PRIMARY_FALLBACK_IDENTICAL'] }],
    });
    const missing = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', {
      proposals: [{ ...facts.proposal, fallback_option_id: null }],
    }));
    expect(missing).toMatchObject({
      status: 'rejected', actor_refusals: [{ codes: ['INITIAL_FALLBACK_REQUIRED'] }],
    });
    expect(runtime.proposals).toEqual([]);
  });

  it('D466 G1 permits a null fallback for a bound correction submission', async () => {
    const { state, runtime } = await fixtureRuntime({
      requestedActorCount: 1, phase: 'correction', correctionNumber: 1,
    });
    const facts = fixtureFacts(state, runtime);
    const accepted = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', {
      proposals: [{ ...facts.proposal, fallback_option_id: null }],
    }));
    expect(accepted['status']).toBe('proposed');
    expect(runtime.proposals).toHaveLength(1);
  });

  it('rejects a dominated Dodge without a typed override and accepts the typed fixture override', async () => {
    const { state, runtime } = await fixtureRuntime();
    const valid = happyArguments('engine.submit_round_proposals', state, runtime);
    const facts = fixtureFacts(state, runtime);
    const rejected = structured(toolCall(runtime.handler, 'engine.submit_round_proposals', {
      ...valid,
      idempotency_key: 'round-dominated-dodge-0001',
      proposals: [{ ...facts.proposal, override_justification: null }],
    }));
    expect(rejected).toMatchObject({
      status: 'rejected',
      actor_refusals: [{ codes: ['DOMINATED_OPTION_REQUIRES_OVERRIDE'] }],
    });

    const acceptedFixture = await fixtureRuntime();
    const accepted = structured(toolCall(
      acceptedFixture.runtime.handler,
      'engine.submit_round_proposals',
      happyArguments('engine.submit_round_proposals', acceptedFixture.state, acceptedFixture.runtime),
    ));
    expect(accepted['status']).toBe('proposed');
  });

  it('D490 accepts a typed DM-only override kind with a substantive reason', async () => {
    const resourceFixture = await fixtureRuntime({ requestedActorCount: 1 });
    const resourceFacts = fixtureFacts(resourceFixture.state, resourceFixture.runtime);
    const endTurn = resourceFixture.runtime.feed.current().projection.combatants
      .find((combatant) => combatant.id === resourceFacts.actor)?.options
      .find((option) => option.actionSlots.some((slot) => slot.use.kind === 'end_turn'));
    if (endTurn === undefined) throw new Error('Fixture End Turn option is absent.');
    const resourceResult = structured(toolCall(
      resourceFixture.runtime.handler,
      'engine.submit_round_proposals',
      {
        ...happyArguments('engine.submit_round_proposals', resourceFixture.state, resourceFixture.runtime),
        idempotency_key: 'round-end-turn-resource-override-0001',
        proposals: [{
          ...resourceFacts.proposal,
          primary_option_id: endTurn.optionId,
          reason: 'Conserve the last attack resource for the more dangerous next room.',
          override_justification: { kind: 'resource_conservation' },
        }],
      },
    ));
    expect(resourceResult['status']).toBe('proposed');
    expect(resourceFixture.runtime.proposals).toHaveLength(1);
  });

  it('threads the D490 policy so strict rejects morale and typed_reason accepts it', async () => {
    const submitMoraleOverride = async (overridePolicy: 'strict' | 'typed_reason') => {
      const fixture = await fixtureRuntime({ requestedActorCount: 1, overridePolicy });
      const facts = fixtureFacts(fixture.state, fixture.runtime);
      const endTurn = fixture.runtime.feed.current().projection.combatants
        .find((combatant) => combatant.id === facts.actor)?.options
        .find((option) => option.actionSlots.some((slot) => slot.use.kind === 'end_turn'));
      if (endTurn === undefined) throw new Error('Fixture End Turn option is absent.');
      const result = structured(toolCall(fixture.runtime.handler, 'engine.submit_round_proposals', {
        ...happyArguments('engine.submit_round_proposals', fixture.state, fixture.runtime),
        idempotency_key: `round-morale-${overridePolicy}-0001`,
        proposals: [{
          ...facts.proposal,
          primary_option_id: endTurn.optionId,
          reason: 'Retreat from the front line because this creature has lost its nerve.',
          override_justification: { kind: 'morale' },
        }],
      }));
      return { result, proposals: fixture.runtime.proposals };
    };

    const strict = await submitMoraleOverride('strict');
    expect(strict.result).toMatchObject({
      status: 'rejected',
      actor_refusals: [{ codes: ['OVERRIDE_UNJUSTIFIED'] }],
    });
    expect(strict.proposals).toEqual([]);

    const typedReason = await submitMoraleOverride('typed_reason');
    expect(typedReason.result['status']).toBe('proposed');
    expect(typedReason.proposals).toHaveLength(1);
  });

  it('D490 rejects a rubber-stamp override as OVERRIDE_UNJUSTIFIED without consuming the submission', async () => {
    const gapFixture = await fixtureRuntime({ requestedActorCount: 1 });
    const gapFacts = fixtureFacts(gapFixture.state, gapFixture.runtime);
    const gapResult = structured(toolCall(gapFixture.runtime.handler, 'engine.submit_round_proposals', {
      ...happyArguments('engine.submit_round_proposals', gapFixture.state, gapFixture.runtime),
      idempotency_key: 'round-vacuous-engine-gap-override-0001',
      proposals: [{
        ...gapFacts.proposal,
        reason: 'Use the offered revision-bound option.',
        override_justification: { kind: 'unknown_engine_gap' },
      }],
    }));
    expect(gapResult).toMatchObject({
      status: 'rejected',
      actor_refusals: [{ codes: ['OVERRIDE_UNJUSTIFIED'] }],
    });
    expect(gapFixture.runtime.proposals).toEqual([]);
    const emptyResult = structured(toolCall(gapFixture.runtime.handler, 'engine.submit_round_proposals', {
      proposals: [{ ...gapFacts.proposal, reason: '   ', override_justification: { kind: 'morale' } }],
    }));
    expect(emptyResult).toMatchObject({
      status: 'rejected', actor_refusals: [{ codes: ['OVERRIDE_UNJUSTIFIED'] }],
    });
    expect(gapFixture.runtime.proposals).toEqual([]);
  });

  it('D490 keeps engine_play as a typed kind, rejecting a missing token and accepting a current token', async () => {
    const fixture = await fixtureRuntime({ requestedActorCount: 1 });
    const facts = fixtureFacts(fixture.state, fixture.runtime);
    const endTurn = fixture.runtime.feed.current().projection.combatants
      .find((combatant) => combatant.id === facts.actor)?.options
      .find((option) => option.actionSlots.some((slot) => slot.use.kind === 'end_turn'));
    if (endTurn === undefined) throw new Error('Fixture End Turn option is absent.');
    const baseArguments = happyArguments('engine.submit_round_proposals', fixture.state, fixture.runtime);
    const rejected = structured(toolCall(fixture.runtime.handler, 'engine.submit_round_proposals', {
      ...baseArguments,
      idempotency_key: 'round-bare-objective-override-0001',
      proposals: [{
        ...facts.proposal,
        primary_option_id: endTurn.optionId,
        reason: 'Coordinate this delay with the advertised engine play.',
        override_justification: { kind: 'engine_play' },
      }],
    }));
    expect(rejected).toMatchObject({
      status: 'rejected',
      actor_refusals: [{ codes: ['OVERRIDE_UNJUSTIFIED'] }],
    });
    expect(fixture.runtime.proposals).toEqual([]);

    const accepted = structured(toolCall(fixture.runtime.handler, 'engine.submit_round_proposals', {
      ...baseArguments,
      idempotency_key: 'round-bound-objective-override-0001',
      proposals: [{
        ...facts.proposal,
        primary_option_id: endTurn.optionId,
        override_justification: {
          kind: 'engine_play',
          token: currentPlayToken(fixture.runtime),
        },
      }],
    }));
    expect(accepted['status']).toBe('proposed');
    expect(fixture.runtime.proposals).toHaveLength(1);
  });

  it('renders versioned materiality detail for a newly dying target in adjustment context', async () => {
    const loaded = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const fighter = loaded.combatants.find((combatant) => combatant.profile.id === 'combatant:fighter');
    const actor = loaded.combatants.find((combatant) => combatant.profile.kind === 'monster')?.profile.id;
    if (fighter === undefined || actor === undefined) throw new Error('Materiality fixture actors are absent.');
    const state: EncounterState = {
      ...loaded,
      combatants: loaded.combatants.map((combatant) => combatant.profile.id === fighter.profile.id
        ? { ...combatant, life: 'dying' as const, hitPoints: 0 }
        : combatant),
    };
    const runtime = createEngineMcpRuntime(state, {
      requestKind: 'plan_adjustment',
      requestedActorIds: [actor],
      planAdjustment: adjustmentMetadata([actor], ['LIFE_STATE_CHANGED']),
    });
    const capsule = runtime.feed.current();
    const context = structured(toolCall(runtime.handler, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    }));
    expect(context).toMatchObject({
      materiality: {
        policy: 'materiality-context-v1',
        reasons: [{
          code: 'LIFE_STATE_CHANGED',
          affected_actor_ids: ['combatant:fighter'],
          summary: expect.stringContaining('combatant:fighter now dying'),
        }],
      },
    });
  });

  it('keeps active-turn adjustment context on the requested brutal monster frontier at a PC boundary', async () => {
    const loaded = await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json');
    const activePc = loaded.combatants.find((combatant) =>
      combatant.profile.id === 'combatant:cleric');
    const actors = loaded.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead'
        ? [combatant.profile.id]
        : []);
    if (activePc === undefined || actors.length === 0) {
      throw new Error('Brutal adjustment fixture actors are absent.');
    }
    const state: EncounterState = {
      ...loaded,
      activeCombatant: activePc.profile.id,
      activeInitiativeIndex: 0,
    };
    let renderCount = 0;
    const runtime = createEngineMcpRuntime(state, {
      toolProfile: 'dm',
      requestKind: 'plan_adjustment',
      requestedActorIds: actors,
      planAdjustment: adjustmentMetadata(actors),
      onTurnContextRendered: () => { renderCount += 1; },
    });
    const capsule = runtime.feed.current();
    const context = structured(toolCall(runtime.handler, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'active_turn',
      granularity: 'full',
      intel_mode: 'full',
      actor_ids: [activePc.profile.id],
    }));
    const renderedActors = context['actors'];
    if (!Array.isArray(renderedActors)) throw new TypeError('Turn context actors are absent.');

    expect(renderedActors.map((actor) => record(actor)['actor_id'])).toEqual([...actors].sort());
    expect(renderedActors.every((actor) => {
      const options = record(actor)['options'];
      return Array.isArray(options) && options.length > 0;
    })).toBe(true);
    expect(renderCount).toBe(1);
    expect(JSON.stringify(context)).not.toContain('No legal engine option exists for combatant:cleric');
    expect(context).toMatchObject({
      request: {
        kind: 'plan_adjustment',
        required_actor_ids: actors,
      },
    });
  });

  it('binds, budgets, stages, corrects, and explicitly keeps plan adjustments per actor', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const actors = state.combatants
      .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
      .map((candidate) => candidate.profile.id)
      .sort();
    const first = actors[0];
    const second = actors[1];
    const closed = actors[2];
    if (first === undefined || second === undefined || closed === undefined) throw new Error('Adjustment fixture requires three monsters.');
    const runtime = createEngineMcpRuntime(state, {
      requestKind: 'plan_adjustment',
      requestedActorIds: [first, second],
      planAdjustment: adjustmentMetadata([first, second]),
    });
    const capsule = runtime.feed.current();
    const context = structured(toolCall(runtime.handler, 'engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
    }));
    const ref = record(context['state_ref']);
    const base = {
      state_ref: ref,
      request_id: capsule.request?.requestId,
      phase: 'initial',
      baseline_plan_hash: 'a'.repeat(64),
    };
    expect(context).toMatchObject({
      request: { kind: 'plan_adjustment', adjustment_budget: 2 },
      applicable_plays: [],
      current_plan: { parent_plan_id: 'plan:mcp-adjustment' },
    });
    expect(context).not.toHaveProperty('suggested_plan');

    const emptyKeep = structured(toolCall(runtime.handler, 'engine.submit_plan_adjustment', {
      ...base,
      idempotency_key: 'adjustment-empty-keep-0001',
      updates: [],
    }));
    expect(emptyKeep).toMatchObject({ status: 'proposed', actor_resolutions: [] });
    expect(runtime.proposals[0]).toMatchObject({ kind: 'plan_adjustment_turn_proposal', updates: [] });
    expect(structured(toolCall(runtime.handler, 'engine.submit_plan_adjustment', {
      ...base,
      idempotency_key: 'adjustment-empty-keep-0001',
      updates: [],
    }))).toEqual(emptyKeep);

    const fallbackOptionId = capsule.projection.combatants.find((candidate) => candidate.id === first)?.options
      .find((option) => option.actionSlots.some((slot) => slot.use.kind === 'end_turn'))?.optionId;
    if (fallbackOptionId === undefined) throw new Error('Fixture End Turn fallback is absent.');
    const partial = structured(toolCall(runtime.handler, 'engine.submit_plan_adjustment', {
      ...base,
      idempotency_key: 'adjustment-partial-stage-0001',
      updates: [
        dodgeUpdate(runtime, first, fallbackOptionId),
        { ...dodgeUpdate(runtime, second), primary_option_id: 'missing-option' },
      ],
    }));
    expect(partial).toMatchObject({
      status: 'rejected',
      staged_proposal_id: expect.any(String),
      staged_actor_resolutions: [{ actor_id: first }],
      actor_refusals: [{ actor_id: second }],
      correction_guidance: { required_actor_ids: [second], replace_whole_round: false },
    });
    expect(runtime.proposals[1]).toMatchObject({
      kind: 'plan_adjustment_turn_proposal',
      updates: [{ proposal: { actorId: first, fallbackOptionId } }],
    });

    const closedResult = structured(toolCall(runtime.handler, 'engine.submit_plan_adjustment', {
      ...base,
      idempotency_key: 'adjustment-closed-actor-0001',
      updates: [{
        actor_id: closed,
        expected_revision: capsule.revision,
        primary_option_id: fallbackOptionId,
        fallback_option_id: null,
        reason: 'Exercise rejection for an actor whose plan is closed.',
        override_justification: null,
      }],
    }));
    expect(closedResult).toMatchObject({ status: 'rejected', actor_refusals: [{ actor_id: closed, codes: ['ACTOR_NOT_OPEN'] }] });

    const staleBaseline = toolCall(runtime.handler, 'engine.submit_plan_adjustment', {
      ...base,
      idempotency_key: 'adjustment-stale-baseline-0001',
      baseline_plan_hash: 'c'.repeat(64),
      updates: [],
    });
    expect(staleBaseline['isError']).toBe(true);
    expect(JSON.stringify(staleBaseline)).toContain('BASELINE_PLAN_MISMATCH');

    const oneActorRuntime = createEngineMcpRuntime(state, {
      requestKind: 'plan_adjustment',
      requestedActorIds: [first],
      planAdjustment: adjustmentMetadata([first]),
    });
    const oneContext = structured(toolCall(oneActorRuntime.handler, 'engine.get_turn_context', {
      run_id: oneActorRuntime.feed.current().runId,
      expected_revision: 1,
      scope: 'round',
    }));
    const overBudget = structured(toolCall(oneActorRuntime.handler, 'engine.submit_plan_adjustment', {
      state_ref: oneContext['state_ref'],
      request_id: oneActorRuntime.feed.current().request?.requestId,
      phase: 'initial',
      baseline_plan_hash: 'a'.repeat(64),
      idempotency_key: 'adjustment-over-budget-0001',
      updates: [dodgeUpdate(oneActorRuntime, first), dodgeUpdate(runtime, second)],
    }));
    expect(overBudget).toMatchObject({
      status: 'rejected',
      staged_proposal_id: null,
      actor_refusals: [
        { codes: ['ADJUSTMENT_BUDGET_EXCEEDED'] },
        { codes: ['ADJUSTMENT_BUDGET_EXCEEDED'] },
      ],
    });

    const deadState: EncounterState = {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.profile.id === closed ? { ...combatant, life: 'dead' as const } : combatant),
    };
    const deadRuntime = createEngineMcpRuntime(deadState, {
      requestKind: 'plan_adjustment',
      requestedActorIds: [first],
      planAdjustment: adjustmentMetadata([first]),
    });
    const deadContext = structured(toolCall(deadRuntime.handler, 'engine.get_turn_context', {
      run_id: deadRuntime.feed.current().runId,
      expected_revision: 1,
      scope: 'round',
    }));
    const deadResult = structured(toolCall(deadRuntime.handler, 'engine.submit_plan_adjustment', {
      state_ref: deadContext['state_ref'],
      request_id: deadRuntime.feed.current().request?.requestId,
      phase: 'initial',
      baseline_plan_hash: 'a'.repeat(64),
      idempotency_key: 'adjustment-dead-actor-0001',
      updates: [{
        actor_id: closed,
        expected_revision: capsule.revision,
        primary_option_id: fallbackOptionId,
        fallback_option_id: null,
        reason: 'Exercise rejection for an actor who is dead.',
        override_justification: null,
      }],
    }));
    expect(deadResult).toMatchObject({ status: 'rejected', actor_refusals: [{ actor_id: closed, codes: ['ACTOR_DEAD'] }] });

    const correctionRuntime = createEngineMcpRuntime(state, {
      requestKind: 'plan_adjustment',
      requestedActorIds: [second],
      planAdjustment: adjustmentMetadata([second]),
      phase: 'correction',
      correctionNumber: 1,
    });
    const correctionContext = structured(toolCall(correctionRuntime.handler, 'engine.get_turn_context', {
      run_id: correctionRuntime.feed.current().runId,
      expected_revision: 1,
      scope: 'round',
    }));
    expect(structured(toolCall(correctionRuntime.handler, 'engine.submit_plan_adjustment', {
      state_ref: correctionContext['state_ref'],
      request_id: correctionRuntime.feed.current().request?.requestId,
      phase: 'correction',
      baseline_plan_hash: 'a'.repeat(64),
      idempotency_key: 'adjustment-correction-0001',
      updates: [dodgeUpdate(correctionRuntime, second)],
    }))).toMatchObject({ status: 'proposed', actor_resolutions: [{ actor_id: second }] });
    const fallbackCorrection = structured(toolCall(correctionRuntime.handler, 'engine.submit_plan_adjustment', {
      state_ref: correctionContext['state_ref'],
      request_id: correctionRuntime.feed.current().request?.requestId,
      phase: 'correction',
      baseline_plan_hash: 'a'.repeat(64),
      idempotency_key: 'adjustment-correction-fallback-0001',
      updates: [dodgeUpdate(correctionRuntime, second, fallbackOptionId)],
    }));
    expect(fallbackCorrection).toMatchObject({
      status: 'rejected',
      actor_refusals: [{ codes: ['CORRECTION_FALLBACK_MUST_BE_NULL'] }],
    });
  });

  it('queues speculative prediction envelopes separately and byte-locks idempotency', async () => {
    const { state, runtime } = await fixtureRuntime();
    const input = happyArguments('engine.submit_speculative_round_plan', state, runtime);
    const first = structured(toolCall(runtime.handler, 'engine.submit_speculative_round_plan', input));
    const repeated = structured(toolCall(runtime.handler, 'engine.submit_speculative_round_plan', input));
    expect(repeated).toEqual(first);
    expect(first).toMatchObject({ status: 'QUEUED-SPECULATIVE' });
    expect(runtime.speculativePlans).toHaveLength(1);
    expect(runtime.speculativePlans[0]).toMatchObject({
      status: 'QUEUED-SPECULATIVE',
      reactionGuidance: { sideWide: { opportunity_attack: 'decline' } },
    });
    expect(runtime.proposals).toEqual([]);

    const changed = toolCall(runtime.handler, 'engine.submit_speculative_round_plan', {
      ...input,
      target_monster_round: 3,
    });
    expect(changed['isError']).toBe(true);
    expect(JSON.stringify(changed)).toContain('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT');
    expect(runtime.speculativePlans).toHaveLength(1);
  });

  it('queues closed reaction guidance on both submission tools and rejects free text', async () => {
    const roundFixture = await fixtureRuntime();
    const roundArguments = happyArguments('engine.submit_round_proposals', roundFixture.state, roundFixture.runtime);
    expect(structured(toolCall(roundFixture.runtime.handler, 'engine.submit_round_proposals', {
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
    expect(structured(toolCall(singleFixture.runtime.handler, 'engine.submit_proposal', {
      ...happyArguments('engine.submit_proposal', singleFixture.state, singleFixture.runtime),
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

    expect(toolCall(singleFixture.runtime.handler, 'engine.submit_proposal', {
      ...happyArguments('engine.submit_proposal', singleFixture.state, singleFixture.runtime),
      idempotency_key: 'proposal-idempotency-invalid-guidance',
      reaction_guidance: { side_wide: { opportunity_attack: 'ask the agent synchronously' } },
    })['isError']).toBe(true);
  });

  it('paginates application collections and rejects a cursor after filters change', async () => {
    const { state, runtime } = await fixtureRuntime();
    const facts = fixtureFacts(state, runtime);
    const first = structured(toolCall(runtime.handler, 'engine.get_combatant_options', { state_ref: facts.ref, actor_id: facts.actor, page: { maximum_items: 1 } }));
    expect(first['truncated']).toBe(true);
    expect(first['next_cursor']).toEqual(expect.any(String));
    const second = structured(toolCall(runtime.handler, 'engine.get_combatant_options', { state_ref: facts.ref, actor_id: facts.actor, page: { maximum_items: 1, cursor: first['next_cursor'] } }));
    expect(second['options']).not.toEqual(first['options']);
    const otherActor = runtime.feed.current().projection.combatants.find((actor) => actor.id !== facts.actor);
    if (otherActor === undefined) throw new Error('Pagination fixture has no second actor.');
    const invalid = toolCall(runtime.handler, 'engine.get_combatant_options', { state_ref: facts.ref, actor_id: otherActor.id, page: { maximum_items: 1, cursor: first['next_cursor'] } });
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
      'Current turn', 'Current room', 'Turn revision 1', 'Journal revision 1', 'Rule rule:allowed', 'Turn proposal v1',
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

  it('D466 F serves the exact submit envelope schema from the proposal resource (mutation: drift one envelope field)', async () => {
    const { runtime } = await fixtureRuntime({ requestedActorCount: 1, toolProfile: 'dm' });
    const resources = record(request(runtime.handler, 398, 'resources/list').result)['resources'];
    if (!Array.isArray(resources)) throw new TypeError('resources/list omitted resources.');
    const proposalResource = resources.map(record).find((resource) => resource['name'] === 'Turn proposal v1');
    if (proposalResource === undefined) throw new TypeError('resources/list omitted Turn proposal v1.');
    const read = record(request(runtime.handler, 397, 'resources/read', { uri: proposalResource['uri'] }).result);
    const contents = read['contents'];
    if (!Array.isArray(contents)) throw new TypeError('Proposal resource omitted contents.');
    const body = record(JSON.parse(String(record(contents[0])['text'])) as unknown);
    const specification = ENGINE_TOOL_SPECS.find((candidate) => candidate.descriptor.name === 'engine.submit_round_proposals');
    if (specification === undefined) throw new TypeError('Submit-round tool is missing.');
    expect(body['minimal_submission']).toEqual(ENGINE_MINIMAL_SUBMIT_ROUND_PROPOSALS_INPUT_SCHEMA);
    expect(body['minimal_example']).toEqual(generatedMinimalRoundSubmissionExample('initial'));
    expect(body['envelope']).toEqual(specification.descriptor.inputSchema);
    expect(body['proposal']).toEqual(ENGINE_TURN_PROPOSAL_INPUT_SCHEMA);
  });

  it('renders both prompts from the same bounded renderer and validates prompt arguments', async () => {
    const { runtime } = await fixtureRuntime();
    const plan = record(request(runtime.handler, 400, 'prompts/get', {
      name: 'engine.plan_round', arguments: { run_id: 'encounter:engine-mcp', expected_revision: 1, voice: 'terse_tactical' },
    }).result);
    expect(JSON.stringify(plan)).toContain('engine.get_turn_context');
    expect(JSON.stringify(plan)).toContain('engine.submit_round_proposals');
    expect(JSON.stringify(plan)).toContain('reaction_guidance');
    expect(JSON.stringify(plan)).toContain('persists until replaced');
    expect(JSON.stringify(plan)).toContain('Generated minimal example:');
    expect(JSON.stringify(plan)).toContain('One ACCEPTED submission per round; a call rejected for invalid arguments is not queued — fix it and call again.');
    expect(JSON.stringify(plan)).toContain('request_id');
    expect(JSON.stringify(plan)).not.toContain('requestId');
    expect(JSON.stringify(plan)).not.toContain('correctionNumber');
    const capsule = runtime.feed.current();
    expect(JSON.stringify(plan)).not.toContain('proof_token');
    expect(JSON.stringify(plan)).not.toContain(engineStateSummaryProofToken(capsule.digest, 'turn_minimal'));
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: 2, generatedAt: '2026-08-27T12:02:00.000Z',
      request: capsule.request === null ? null : { ...capsule.request, phase: 'correction', correctionNumber: 1 },
      projection: capsule.projection, historyDelta: capsule.historyDelta, rulesIndex: capsule.rulesIndex,
    }));
    const correction = record(request(runtime.handler, 401, 'prompts/get', {
      name: 'engine.correct_proposal', arguments: { run_id: 'encounter:engine-mcp', expected_revision: 2, request_id: 'request:engine-mcp' },
    }).result);
    expect(JSON.stringify(correction)).toContain('fallback_option_id must be null');
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

  it.each(['engine.validate_proposal', 'engine.submit_proposal', 'engine.submit_round_proposals'] as const)('%s rejects a second fallback during correction with a typed code', async (name) => {
    const { state, runtime } = await fixtureRuntime();
    const capsule = runtime.feed.current();
    runtime.feed.replace(createEngineStateCapsule({
      runId: capsule.runId, branchId: capsule.branchId, revision: 2, generatedAt: '2026-08-27T12:04:00.000Z',
      request: capsule.request === null ? null : { ...capsule.request, phase: 'correction', correctionNumber: 1 },
      projection: capsule.projection, historyDelta: capsule.historyDelta, rulesIndex: capsule.rulesIndex,
    }));
    const freshFacts = fixtureFacts(state, runtime);
    const proposal = { ...freshFacts.proposal, fallback_option_id: freshFacts.proposal.primary_option_id };
    const args = name === 'engine.submit_round_proposals'
      ? { state_ref: freshFacts.ref, request_id: freshFacts.request.requestId, phase: 'correction', idempotency_key: 'correction-round-0001', proposals: [proposal] }
      : name === 'engine.submit_proposal'
        ? { state_ref: freshFacts.ref, request_id: freshFacts.request.requestId, phase: 'correction', idempotency_key: 'correction-proposal-0001', proposal }
        : { state_ref: freshFacts.ref, request_id: freshFacts.request.requestId, phase: 'correction', proposal };
    const result = structured(toolCall(runtime.handler, name, args));
    const refusals = name === 'engine.submit_round_proposals' ? result['actor_refusals'] : result['refusals'];
    expect(refusals).toEqual(expect.arrayContaining([
      expect.objectContaining(name === 'engine.submit_round_proposals'
        ? { codes: ['CORRECTION_FALLBACK_MUST_BE_NULL'] }
        : { code: 'CORRECTION_FALLBACK_MUST_BE_NULL' }),
    ]));
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
