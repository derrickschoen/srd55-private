import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { createInterface, type Interface } from 'node:readline';
import { mcpRequestMeta } from '../src/vtt/mcp/handler';

const CLIENT = Object.freeze({ name: 'engine-mcp-dry-client', version: '1.0.0' });
const REQUEST_TIMEOUT_MS = 20_000;
const STDERR_MAX_CHARS = 16 * 1024;

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Readonly<Record<string, unknown>>;
}

function structured(response: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const result = record(response['result'], 'JSON-RPC result');
  if (result['isError'] === true) throw new Error(String(record((result['content'] as readonly unknown[])[0], 'tool error')['text']));
  return record(result['structuredContent'], 'structured tool result');
}

export interface DryTranscriptEntry {
  readonly request: string;
  readonly response: string;
}

export class EngineMcpStdioClient {
  readonly #child: ChildProcessWithoutNullStreams;
  readonly #lines: Interface;
  readonly #iterator: AsyncIterator<string>;
  readonly #transcript: DryTranscriptEntry[] = [];
  #id = 0;
  #stderr = '';

  constructor(fixturePath: string, scenario?: '--correction' | '--room-transition') {
    this.#child = spawn(process.execPath, [
      resolve('node_modules/vite-node/vite-node.mjs'),
      resolve('tools/engine-mcp-server.ts'),
      resolve(fixturePath),
      ...(scenario === undefined ? [] : [scenario]),
    ], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
    this.#child.stderr.setEncoding('utf8');
    this.#child.stderr.on('data', (chunk: string) => {
      this.#stderr = `${this.#stderr}${chunk}`.slice(0, STDERR_MAX_CHARS);
    });
    this.#lines = createInterface({ input: this.#child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
    this.#iterator = this.#lines[Symbol.asyncIterator]();
  }

  get transcript(): readonly DryTranscriptEntry[] { return this.#transcript; }
  get stderr(): string { return this.#stderr; }

  async request(method: string, params: Readonly<Record<string, unknown>> = {}): Promise<Readonly<Record<string, unknown>>> {
    this.#id += 1;
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: this.#id,
      method,
      params: { ...params, _meta: mcpRequestMeta(CLIENT) },
    });
    this.#child.stdin.write(`${request}\n`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`Dry MCP request timed out after ${String(REQUEST_TIMEOUT_MS)} ms.`)), REQUEST_TIMEOUT_MS);
    });
    let line: IteratorResult<string>;
    try { line = await Promise.race([this.#iterator.next(), timeout]); }
    finally { if (timer !== undefined) clearTimeout(timer); }
    if (line.done) throw new Error(`Engine MCP server closed before responding.${this.#stderr.length === 0 ? '' : ` ${this.#stderr}`}`);
    const response = record(JSON.parse(line.value) as unknown, 'JSON-RPC response');
    this.#transcript.push({ request, response: line.value });
    return response;
  }

  tool(name: string, argumentsValue: Readonly<Record<string, unknown>>): Promise<Readonly<Record<string, unknown>>> {
    return this.request('tools/call', { name, arguments: argumentsValue });
  }

  async close(): Promise<number | null> {
    this.#child.stdin.end();
    const [exitCode] = await once(this.#child, 'exit') as [number | null, NodeJS.Signals | null];
    this.#lines.close();
    return exitCode;
  }
}

function proposal(actorContext: Readonly<Record<string, unknown>>, revision: number, preferAttack: boolean): Readonly<Record<string, unknown>> {
  const actorId = actorContext['actor_id'];
  const options = actorContext['options'];
  if (typeof actorId !== 'string' || !Array.isArray(options)) throw new TypeError('Actor context cannot form a proposal.');
  const candidates = options.map((option) => record(option, 'actor option'));
  const primary = (preferAttack ? candidates.find((option) =>
    option['kind'] === 'attack' || option['kind'] === 'use_action') : undefined) ??
    candidates.find((option) => option['kind'] === 'dodge');
  const fallback = candidates.find((option) => option['kind'] === 'dodge');
  if (typeof primary?.['option_id'] !== 'string') throw new Error(`Actor ${actorId} has no usable option.`);
  return {
    actor_id: actorId,
    expected_revision: revision,
    primary_option_id: primary['option_id'],
    fallback_option_id: typeof fallback?.['option_id'] === 'string' ? fallback['option_id'] : null,
    override_justification: null,
  };
}

function stateReference(context: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return record(context['state_ref'], 'state reference');
}

function requestedActors(context: Readonly<Record<string, unknown>>): readonly string[] {
  const request = record(context['request'], 'turn request');
  const actors = request['required_actor_ids'];
  if (!Array.isArray(actors) || actors.some((actor) => typeof actor !== 'string')) throw new TypeError('Turn request actor ids are invalid.');
  return actors;
}

export interface EngineMcpDryRunReport {
  readonly status: 'VERIFIED';
  readonly protocolConformance: 'SUBSTITUTED_LOCAL';
  readonly initial: readonly DryTranscriptEntry[];
  readonly correction: readonly DryTranscriptEntry[];
  readonly roomTransition: readonly DryTranscriptEntry[];
  readonly stderrBytes: number;
}

export async function runEngineMcpDryClient(fixturePath: string): Promise<EngineMcpDryRunReport> {
  const initial = new EngineMcpStdioClient(fixturePath);
  await initial.request('server/discover');
  await initial.request('tools/list');
  await initial.request('resources/list');
  await initial.request('prompts/list');
  const initialContext = structured(await initial.tool('engine.get_turn_context', {
    run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round', maximum_options_per_actor: 20,
  }));
  const initialRef = stateReference(initialContext);
  const actors = requestedActors(initialContext);
  const firstActor = actors[0];
  if (firstActor === undefined) throw new Error('Dry fixture did not request an actor.');
  const actorContexts = initialContext['actors'];
  if (!Array.isArray(actorContexts)) throw new TypeError('Turn context actors are invalid.');
  const firstContext = record(actorContexts[0], 'first actor context');
  const offensive = actorContexts.flatMap((actorContext) => {
    const actor = record(actorContext, 'actor context');
    const actorId = actor['actor_id'];
    const options = actor['options'];
    if (typeof actorId !== 'string' || !Array.isArray(options)) throw new TypeError('Turn context actor options are invalid.');
    return options.map((option) => ({ actorId, option: record(option, 'actor option') }));
  }).find(({ option }) => option['kind'] === 'attack' || option['kind'] === 'use_action');
  if (offensive === undefined || typeof offensive.option['action_id'] !== 'string') {
    throw new Error('Dry fixture has no offensive option.');
  }
  await initial.tool('engine.query_path', {
    state_ref: initialRef,
    actor_id: offensive.actorId,
    objective: { kind: 'enable_action', action_id: offensive.option['action_id'], target: { kind: 'nearest_visible_enemy' } },
    movement: { willingness: 'freely', maximum_feet: 30, opportunity_risk: 'accept_if_needed' },
    engagement: { stance: 'close_to_melee' },
  });
  await initial.tool('engine.validate_proposal', {
    state_ref: initialRef,
    request_id: 'request:engine-mcp',
    phase: 'initial',
    proposal: {
      ...proposal(firstContext, 1, false),
      primary_option_id: 'missing-option',
    },
  });
  await initial.tool('engine.submit_round_proposals', {
    state_ref: initialRef,
    request_id: 'request:engine-mcp',
    phase: 'initial',
    idempotency_key: 'dry-round-initial-0001',
    proposals: actorContexts.map((actorContext) => proposal(record(actorContext, 'actor context'), 1, false)),
  });
  await initial.tool('engine.request_dm_adjudication', {
    state_ref: initialRef,
    request_id: 'request:engine-mcp',
    actor_id: firstActor,
    subject: 'SIMULATED ambiguous fixture interaction',
    reason: 'The deterministic dry client requests a DM ruling without proposing a consequence.',
    blocking: true,
    suggested_outcomes: ['Allow', 'Refuse'],
    idempotency_key: 'dry-adjudication-0001',
  });
  await initial.tool('engine.emit_narration', {
    state_ref: initialRef,
    request_id: 'request:engine-mcp',
    idempotency_key: 'dry-narration-initial-0001',
    voice: 'terse_tactical',
    text: 'The monsters advance as one group.',
    audience: 'shared',
    rule_references: [],
  });
  await initial.tool('engine.get_turn_context', {
    run_id: 'encounter:engine-mcp', expected_revision: 1, scope: 'round',
  });
  if (await initial.close() !== 0) throw new Error(`Initial dry server failed: ${initial.stderr}`);

  const correction = new EngineMcpStdioClient(fixturePath, '--correction');
  const correctionContext = structured(await correction.tool('engine.get_turn_context', {
    run_id: 'encounter:engine-mcp', expected_revision: 2, scope: 'round',
  }));
  const correctionContexts = correctionContext['actors'];
  if (!Array.isArray(correctionContexts)) throw new TypeError('Correction actor contexts are invalid.');
  await correction.tool('engine.submit_round_proposals', {
    state_ref: stateReference(correctionContext),
    request_id: 'request:engine-mcp',
    phase: 'correction',
    idempotency_key: 'dry-round-correction-0001',
    proposals: correctionContexts.map((actorContext) => ({
      ...proposal(record(actorContext, 'correction actor context'), 2, false), fallback_option_id: null,
    })),
  });
  if (await correction.close() !== 0) throw new Error(`Correction dry server failed: ${correction.stderr}`);

  const room = new EngineMcpStdioClient(fixturePath, '--room-transition');
  await room.request('server/discover');
  const roomContext = structured(await room.tool('engine.get_turn_context', {
    run_id: 'encounter:engine-mcp', expected_revision: 3, scope: 'round',
  }));
  if (record(roomContext['summary'], 'room summary')['room'] !== 2) throw new Error('Room transition was not projected.');
  await room.request('resources/read', { uri: 'engine://run/encounter%3Aengine-mcp/turn/current' });
  if (await room.close() !== 0) throw new Error(`Room-transition dry server failed: ${room.stderr}`);

  return {
    status: 'VERIFIED',
    protocolConformance: 'SUBSTITUTED_LOCAL',
    initial: initial.transcript,
    correction: correction.transcript,
    roomTransition: room.transcript,
    stderrBytes: Buffer.byteLength(`${initial.stderr}${correction.stderr}${room.stderr}`),
  };
}

async function mainDryClient(): Promise<void> {
  const fixture = process.argv.find((argument, index) => index > 1 && argument.endsWith('.json'));
  if (fixture === undefined) throw new TypeError('Usage: engine-mcp-dry-client.ts <arena-fixture.json>');
  process.stdout.write(`${JSON.stringify(await runEngineMcpDryClient(fixture), null, 2)}\n`);
}

const dryClientScriptPresent = process.argv.some((argument) => argument.endsWith('/engine-mcp-dry-client.ts') || argument.endsWith('\\engine-mcp-dry-client.ts'));
if (process.env['VITEST'] !== 'true' && dryClientScriptPresent) await mainDryClient();
