import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { appendFile, readdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { createInterface, type Interface } from 'node:readline';
import { canonicalJson } from '../src/commands/canonical-json';
import type { EncounterState } from '../src/combat/encounter';
import type { MonsterAction } from '../src/combat/statblock';
import { combatantId, type CombatantId } from '../src/combat/values';
import {
  arenaMonsterActions,
  arenaTokenPosition,
  declareArenaIntent,
  resolveArenaTarget,
  type ArenaIntent,
} from '../src/vtt/arena-legality';
import { mcpRequestMeta } from '../src/vtt/mcp/handler';
import { decodeArenaIntent, loadArenaFixture } from './engine-mcp-server';

export const CONVERSATION_ARMS = ['M', 'C'] as const;
export type ConversationArm = (typeof CONVERSATION_ARMS)[number];
export const CONVERSATION_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ConversationEffort = (typeof CONVERSATION_EFFORTS)[number];

export interface ConversationConfig {
  readonly fixturesPath: string;
  readonly rooms: number;
  readonly rounds: number;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly codexBin: string;
}

export interface ConversationTokenCounts {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
}

export interface ConversationRow {
  readonly room: number;
  readonly round: number;
  readonly arm: ConversationArm;
  readonly timeToFirstAction: number;
  readonly wallPerCreature: number;
  readonly tokens: ConversationTokenCounts;
  readonly refusals: readonly string[];
  readonly toolCalls: number;
}

interface DeclaredIntent {
  readonly id: CombatantId;
  readonly intent: ArenaIntent;
}

interface CodexTurnResult {
  readonly sessionId: string;
  readonly reply: unknown;
  readonly tokens: ConversationTokenCounts;
  readonly timeToFirstAction: number;
  readonly wall: number;
  readonly toolCalls: number;
}

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(`${option} must be a positive integer.`);
  return parsed;
}

function pathIsInside(parent: string, candidate: string): boolean {
  const path = relative(resolve(parent), resolve(candidate));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

export function parseConversationArgs(
  argv: readonly string[],
  cwd = process.cwd(),
): ConversationConfig {
  const values = new Map<string, string>();
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (![
      '--fixtures', '--rooms', '--rounds', '--reps', '--model', '--effort', '--out', '--codex-bin',
    ].includes(option ?? '')) throw new TypeError(`Unknown conversation option ${option ?? '<missing>'}.`);
    const value = requiredValue(argv, index, option ?? '<missing>');
    values.set(option ?? '', value);
    index += 1;
  }
  const out = values.get('--out') ?? '';
  if (out.length === 0) throw new TypeError('--out is required.');
  const outPath = resolve(out);
  if (pathIsInside(cwd, outPath)) throw new TypeError('--out must be outside the repository working tree.');
  const effort = values.get('--effort') ?? 'medium';
  if (!CONVERSATION_EFFORTS.includes(effort as ConversationEffort)) {
    throw new TypeError('--effort must be low, medium, high, or xhigh.');
  }
  return {
    fixturesPath: resolve(values.get('--fixtures') ?? 'tests/fixtures/arena-basis'),
    rooms: positiveInteger(values.get('--rooms') ?? '12', '--rooms'),
    rounds: positiveInteger(values.get('--rounds') ?? values.get('--reps') ?? '1', '--rounds'),
    model: values.get('--model') ?? 'gpt-5.6-sol',
    effort: effort as ConversationEffort,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    codexBin: values.get('--codex-bin') ?? 'codex',
  };
}

function livingMonsterIds(state: EncounterState): readonly CombatantId[] {
  return state.combatants.flatMap((subject) =>
    subject.profile.kind === 'monster' && subject.life !== 'dead'
      ? [subject.profile.id]
      : []);
}

const INTENT_CONTRACT = {
  intents: [{
    id: 'combatant id',
    intent: {
      action: 'statblock action id',
      targetId: 'hostile combatant id',
      maxMovementFeet: 'non-negative 5-foot increment no greater than speed',
      acceptMelee: 'boolean engagement stance',
      fallback: 'null or another {action,targetId,maxMovementFeet,acceptMelee}',
    },
  }],
} as const;

function monolithicPrompt(state: EncounterState, round: number, bootstrap: boolean): string {
  return [
    bootstrap
      ? 'You are the persistent Dungeon Master decision process for this fight.'
      : 'Resume the same persistent fight decision process.',
    `This is experimental round ${String(round)}.`,
    'Return exactly one JSON object and no prose, with one intent per living monster.',
    'Choose actions and movement willingness; never emit coordinates. The engine resolves geometry.',
    'Every intent requires a declarative fallback or explicit null fallback.',
    `Living monsters: ${canonicalJson(livingMonsterIds(state))}`,
    `Reply shape: ${canonicalJson(INTENT_CONTRACT)}`,
    '<encounter-data>',
    canonicalJson(state),
    '</encounter-data>',
  ].join('\n');
}

function mcpPrompt(state: EncounterState, round: number, bootstrap: boolean): string {
  return [
    bootstrap
      ? 'You are the persistent Dungeon Master decision process for this fight. Ground every choice through the engine MCP tools.'
      : 'Resume the same persistent fight decision process and use the engine MCP tools again for the new round.',
    `This is experimental round ${String(round)}.`,
    'Call state_summary, then combatant_options for each living monster. Use reach_check/path_cost as needed.',
    'Call declare_intent exactly once for each living monster. Choose actions and movement willingness; never emit coordinates.',
    'After the tool calls, return exactly one JSON object and no prose with the same intents you declared.',
    `Living monsters: ${canonicalJson(livingMonsterIds(state))}`,
    `Reply shape: ${canonicalJson(INTENT_CONTRACT)}`,
  ].join('\n');
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function recordsWithin(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(recordsWithin);
  const candidate = asRecord(value);
  if (candidate === null) return [];
  return [candidate, ...Object.values(candidate).flatMap(recordsWithin)];
}

function eventAgentText(value: unknown): string | null {
  return recordsWithin(value).find((candidate) =>
    candidate['type'] === 'agent_message' && typeof candidate['text'] === 'string')?.['text'] as string | undefined ?? null;
}

function eventToolNames(value: unknown): readonly string[] {
  return recordsWithin(value).flatMap((candidate) => {
    if (candidate['type'] !== 'mcp_tool_call') return [];
    const name = candidate['tool'] ?? candidate['name'];
    return typeof name === 'string' ? [name] : ['<unknown-mcp-tool>'];
  });
}

function eventUsage(value: unknown): ConversationTokenCounts | null {
  for (const candidate of recordsWithin(value)) {
    const input = candidate['input_tokens'] ?? candidate['inputTokens'];
    const output = candidate['output_tokens'] ?? candidate['outputTokens'];
    if (!Number.isSafeInteger(input) || !Number.isSafeInteger(output)) continue;
    const cached = candidate['cached_input_tokens'] ?? candidate['cachedInputTokens'];
    const reasoning = candidate['reasoning_tokens'] ?? candidate['reasoningTokens'];
    return {
      input: input as number,
      cachedInput: Number.isSafeInteger(cached) ? cached as number : 0,
      output: output as number,
      reasoning: Number.isSafeInteger(reasoning) ? reasoning as number : 0,
    };
  }
  return null;
}

export function codexConversationArgs(
  config: ConversationConfig,
  arm: ConversationArm,
  fixturePath: string,
  sessionId: string | null,
): readonly string[] {
  const viteNode = resolve(config.cwd, 'node_modules/vite-node/vite-node.mjs');
  const server = resolve(config.cwd, 'tools/engine-mcp-server.ts');
  const mcpConfig = arm === 'C'
    ? [
        '-c', `mcp_servers.engine.command=${JSON.stringify(process.execPath)}`,
        '-c', `mcp_servers.engine.args=${JSON.stringify([viteNode, server, fixturePath])}`,
      ]
    : [];
  return [
    'exec',
    '-C', config.cwd,
    '--sandbox', 'read-only',
    '--json',
    '-m', config.model,
    '-c', `model_reasoning_effort=${JSON.stringify(config.effort)}`,
    ...mcpConfig,
    ...(sessionId === null ? [] : ['resume', sessionId]),
    '-',
  ];
}

async function runCodexTurn(
  config: ConversationConfig,
  arm: ConversationArm,
  fixturePath: string,
  prompt: string,
  sessionId: string | null,
): Promise<CodexTurnResult> {
  const started = performance.now();
  const child = spawn(
    config.codexBin,
    codexConversationArgs(config, arm, fixturePath, sessionId),
    { cwd: config.cwd, stdio: ['pipe', 'pipe', 'pipe'] },
  );
  const exit = new Promise<number | null>((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('exit', resolvePromise);
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
  let errorOutput = '';
  child.stderr.on('data', (chunk: Buffer) => { errorOutput += chunk.toString('utf8'); });
  child.stdin.end(prompt);
  let persistentSessionId = sessionId;
  let reply: unknown = null;
  let tokens: ConversationTokenCounts = { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
  let timeToFirstAction: number | null = null;
  let toolCalls = 0;
  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    const event: unknown = JSON.parse(line);
    const root = asRecord(event);
    if (root?.['type'] === 'thread.started' && typeof root['thread_id'] === 'string') {
      persistentSessionId = root['thread_id'];
    }
    const toolNames = root?.['type'] === 'item.completed' ? eventToolNames(event) : [];
    toolCalls += toolNames.length;
    if (timeToFirstAction === null && toolNames.some((name) => name.endsWith('declare_intent'))) {
      timeToFirstAction = performance.now() - started;
    }
    const text = eventAgentText(event);
    if (text !== null) {
      if (timeToFirstAction === null) timeToFirstAction = performance.now() - started;
      reply = JSON.parse(text) as unknown;
    }
    tokens = eventUsage(event) ?? tokens;
  }
  const exitCode = await exit;
  if (exitCode !== 0) throw new Error(`codex exec exited ${String(exitCode)}: ${errorOutput}`);
  if (persistentSessionId === null) throw new Error('Codex output did not contain a persistent session id.');
  const wall = performance.now() - started;
  return {
    sessionId: persistentSessionId,
    reply,
    tokens,
    timeToFirstAction: timeToFirstAction ?? wall,
    wall,
    toolCalls,
  };
}

function decodeDeclaredIntents(value: unknown, expected: readonly CombatantId[]): readonly DeclaredIntent[] {
  const root = asRecord(value);
  if (root === null || !Array.isArray(root['intents'])) throw new TypeError('Reply must contain an intents array.');
  const intents = root['intents'].map((entry): DeclaredIntent => {
    const candidate = asRecord(entry);
    if (candidate === null || typeof candidate['id'] !== 'string') {
      throw new TypeError('Each intent entry requires a combatant id.');
    }
    return { id: combatantId(candidate['id']), intent: decodeArenaIntent(candidate['intent']) };
  });
  const actual = intents.map((entry) => entry.id);
  if (new Set(actual).size !== actual.length) throw new TypeError('Intent entries contain duplicate actors.');
  for (const id of expected) if (!actual.includes(id)) throw new TypeError(`${id}: intent is missing.`);
  for (const id of actual) if (!expected.includes(id)) throw new TypeError(`${id}: actor is not a living monster.`);
  return intents;
}

function resolvableAction(actions: readonly MonsterAction[]): MonsterAction | null {
  return actions.find((action) => action.kind === 'attack') ??
    actions.find((action) => action.kind === 'saving_throw') ??
    actions.find((action) => action.kind === 'multiattack') ??
    null;
}

function scriptedIntents(state: EncounterState): readonly DeclaredIntent[] {
  return livingMonsterIds(state).flatMap((id) => {
    const target = resolveArenaTarget(state, id, { kind: 'nearest_enemy' });
    const acting = state.combatants.find((subject) => subject.profile.id === id);
    const action = resolvableAction(arenaMonsterActions(state, id));
    if (target === null || acting === undefined || action === null) return [];
    return [{
      id,
      intent: {
        action: action.id,
        targetId: target,
        maxMovementFeet: acting.profile.rules.speed,
        acceptMelee: true,
        fallback: null,
      },
    }];
  });
}

function validateIntents(
  state: EncounterState,
  intents: readonly DeclaredIntent[],
): readonly string[] {
  const refusals: string[] = [];
  for (const declaration of intents) {
    const result = declareArenaIntent(state, declaration.id, declaration.intent);
    if (!result.legal) refusals.push(...result.refusals);
  }
  for (const id of livingMonsterIds(state)) {
    if (!intents.some((declaration) => declaration.id === id)) refusals.push(`${id}: intent is missing.`);
  }
  return refusals;
}

interface McpClient {
  readonly child: ChildProcessWithoutNullStreams;
  readonly lines: Interface;
  readonly iterator: AsyncIterator<string>;
  nextId: number;
  stderr: string;
  readonly exit: Promise<number | null>;
}

function startMcpClient(config: ConversationConfig, fixturePath: string): McpClient {
  const child = spawn(process.execPath, [
    resolve(config.cwd, 'node_modules/vite-node/vite-node.mjs'),
    resolve(config.cwd, 'tools/engine-mcp-server.ts'),
    fixturePath,
  ], { cwd: config.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
  const client: McpClient = {
    child,
    lines,
    iterator: lines[Symbol.asyncIterator](),
    nextId: 1,
    stderr: '',
    exit: new Promise<number | null>((resolvePromise, reject) => {
      child.once('error', reject);
      child.once('exit', resolvePromise);
    }),
  };
  child.stderr.on('data', (chunk: Buffer) => { client.stderr += chunk.toString('utf8'); });
  return client;
}

async function mcpRequest(client: McpClient, method: string, params: unknown): Promise<unknown> {
  const id = client.nextId;
  client.nextId += 1;
  const requestParams = asRecord(params);
  if (requestParams === null) throw new TypeError('MCP request params must be an object.');
  client.child.stdin.write(`${JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params: {
      ...requestParams,
      _meta: mcpRequestMeta({ name: 'ai-dm-conversation-dry-run', version: '1.0.0' }),
    },
  })}\n`);
  const line = await client.iterator.next();
  if (line.done) throw new Error(`Engine MCP server closed early: ${client.stderr}`);
  const response = asRecord(JSON.parse(line.value) as unknown);
  if (response === null || response['id'] !== id) throw new Error('Engine MCP response id mismatch.');
  if (response['error'] !== undefined) throw new Error(JSON.stringify(response['error']));
  return response['result'];
}

async function stopMcpClient(client: McpClient): Promise<void> {
  client.child.stdin.end();
  const code = await client.exit;
  client.lines.close();
  if (code !== 0) throw new Error(`Engine MCP server exited ${String(code)}: ${client.stderr}`);
}

async function scriptedMcpRound(
  config: ConversationConfig,
  fixturePath: string,
  state: EncounterState,
  intents: readonly DeclaredIntent[],
): Promise<{ readonly toolCalls: number; readonly timeToFirstAction: number; readonly wall: number }> {
  const started = performance.now();
  const client = startMcpClient(config, fixturePath);
  let toolCalls = 0;
  let firstAction: number | null = null;
  try {
    await mcpRequest(client, 'server/discover', {});
    await mcpRequest(client, 'tools/list', {});
    await mcpRequest(client, 'tools/call', { name: 'state_summary', arguments: {} });
    toolCalls += 1;
    for (const declaration of intents) {
      await mcpRequest(client, 'tools/call', {
        name: 'combatant_options', arguments: { id: declaration.id },
      });
      toolCalls += 1;
      const targetPosition = arenaTokenPosition(state, combatantId(declaration.intent.targetId));
      if (targetPosition !== null) {
        await mcpRequest(client, 'tools/call', {
          name: 'path_cost', arguments: { id: declaration.id, to: targetPosition },
        });
        toolCalls += 1;
      }
      await mcpRequest(client, 'tools/call', {
        name: 'reach_check',
        arguments: {
          id: declaration.id,
          targetId: declaration.intent.targetId,
          action: declaration.intent.action,
        },
      });
      toolCalls += 1;
      await mcpRequest(client, 'tools/call', {
        name: 'declare_intent', arguments: declaration,
      });
      toolCalls += 1;
      if (firstAction === null) firstAction = performance.now() - started;
    }
  } finally {
    await stopMcpClient(client);
  }
  const wall = performance.now() - started;
  return { toolCalls, timeToFirstAction: firstAction ?? wall, wall };
}

async function fixturePaths(config: ConversationConfig): Promise<readonly string[]> {
  const names = (await readdir(config.fixturesPath))
    .filter((name) => /^seed-\d+\.json$/.test(name))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  if (names.length < config.rooms) {
    throw new RangeError(`Requested ${String(config.rooms)} rooms, but only ${String(names.length)} fixtures exist.`);
  }
  return names.slice(0, config.rooms).map((name) => resolve(config.fixturesPath, name));
}

export async function runConversation(
  config: ConversationConfig,
): Promise<readonly ConversationRow[]> {
  const rows: ConversationRow[] = [];
  const paths = await fixturePaths(config);
  for (let roomIndex = 0; roomIndex < paths.length; roomIndex += 1) {
    const fixturePath = paths[roomIndex];
    if (fixturePath === undefined) continue;
    const state = await loadArenaFixture(fixturePath);
    const creatureCount = livingMonsterIds(state).length;
    if (creatureCount === 0) throw new RangeError(`${fixturePath} contains no living monsters.`);
    for (const arm of CONVERSATION_ARMS) {
      let sessionId: string | null = null;
      for (let round = 1; round <= config.rounds; round += 1) {
        let intents: readonly DeclaredIntent[] = [];
        let tokens: ConversationTokenCounts = { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
        let timeToFirstAction = 0;
        let wall = 0;
        let toolCalls = 0;
        const refusals: string[] = [];
        try {
          if (config.dryRun) {
            const started = performance.now();
            intents = scriptedIntents(state);
            if (arm === 'C') {
              const result = await scriptedMcpRound(config, fixturePath, state, intents);
              timeToFirstAction = result.timeToFirstAction;
              wall = result.wall;
              toolCalls = result.toolCalls;
            } else {
              timeToFirstAction = performance.now() - started;
              wall = performance.now() - started;
            }
          } else {
            const prompt = arm === 'M'
              ? monolithicPrompt(state, round, sessionId === null)
              : mcpPrompt(state, round, sessionId === null);
            const result = await runCodexTurn(config, arm, fixturePath, prompt, sessionId);
            sessionId = result.sessionId;
            intents = decodeDeclaredIntents(result.reply, livingMonsterIds(state));
            tokens = result.tokens;
            timeToFirstAction = result.timeToFirstAction;
            wall = result.wall;
            toolCalls = result.toolCalls;
          }
          refusals.push(...validateIntents(state, intents));
        } catch (error) {
          refusals.push(error instanceof Error ? error.message : String(error));
        }
        const row: ConversationRow = {
          room: roomIndex + 1,
          round,
          arm,
          timeToFirstAction,
          wallPerCreature: wall / creatureCount,
          tokens,
          refusals,
          toolCalls,
        };
        rows.push(row);
        await appendFile(config.outPath, `${JSON.stringify(row)}\n`, 'utf8');
      }
    }
  }
  return rows;
}

async function main(): Promise<void> {
  await runConversation(parseConversationArgs(process.argv.slice(2)));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-conversation.ts') ||
  invokedPath.endsWith('\\ai-dm-conversation.ts') ||
  ((
    invokedPath.endsWith('/vite-node') ||
    invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') ||
    invokedPath.endsWith('\\vite-node.mjs')
  ) && process.argv.includes('--out'))
)) await main();
