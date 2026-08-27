import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import type { EncounterState } from '../src/combat/encounter';
import { gridDistance } from '../src/combat/grid';
import type { MonsterAttackAction } from '../src/combat/statblock';
import {
  JSON_ROUND_PLAN_SURFACE,
  renderArenaPrompt,
  type ArenaPromptEnvelope,
} from '../src/vtt/arena-prompt';
import {
  arenaAttackRange as attackRange,
  arenaMonsterActions as monsterActions,
  arenaTokenPosition as tokenPosition,
  resolveArenaTarget as resolveTarget,
  validateArenaPlan,
} from '../src/vtt/arena-legality';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  type RoundPlan,
} from '../src/vtt/dm-bridge/round-plan-contract';
import { generateRoom } from '../src/vtt/room-generator';

export { validateArenaPlan } from '../src/vtt/arena-legality';

export const ARENA_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ArenaEffort = (typeof ARENA_EFFORTS)[number];

export interface ArenaConfig {
  readonly rooms: number;
  /** Repetitions are successive rounds in one persistent fight session. */
  readonly reps: number;
  readonly seed: number;
  readonly kbPath: string;
  readonly model: string;
  readonly effort: ArenaEffort;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly codexBin: string;
}

export interface ArenaTokenCounts {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
}

export interface ArenaRow {
  readonly seed: number;
  readonly room: number;
  readonly round: number;
  readonly kbHash: string;
  readonly wall: number;
  readonly tokens: ArenaTokenCounts;
  readonly refusals: readonly string[];
  readonly plan: RoundPlan | null;
}

interface CodexResult {
  readonly sessionId: string;
  readonly reply: unknown;
  readonly tokens: ArenaTokenCounts;
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

export function parseArenaArgs(argv: readonly string[], cwd = process.cwd()): ArenaConfig {
  const values = new Map<string, string>();
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (!['--rooms', '--reps', '--seed', '--kb', '--model', '--effort', '--out', '--codex-bin'].includes(option ?? '')) {
      throw new TypeError(`Unknown arena option ${option ?? '<missing>'}.`);
    }
    const value = requiredValue(argv, index, option ?? '<missing>');
    values.set(option ?? '', value);
    index += 1;
  }
  const rooms = positiveInteger(values.get('--rooms') ?? '', '--rooms');
  const reps = positiveInteger(values.get('--reps') ?? '', '--reps');
  const seed = Number(values.get('--seed'));
  if (!Number.isSafeInteger(seed)) throw new TypeError('--seed must be a safe integer.');
  const kbPath = resolve(values.get('--kb') ?? '');
  const outPath = resolve(values.get('--out') ?? '');
  if ((values.get('--kb') ?? '').length === 0) throw new TypeError('--kb is required.');
  if ((values.get('--out') ?? '').length === 0) throw new TypeError('--out is required.');
  if (pathIsInside(cwd, outPath)) throw new TypeError('--out must be outside the repository working tree.');
  const model = values.get('--model') ?? '';
  if (model.trim().length === 0) throw new TypeError('--model is required.');
  const effort = values.get('--effort');
  if (!ARENA_EFFORTS.includes(effort as ArenaEffort)) {
    throw new TypeError('--effort must be low, medium, high, or xhigh.');
  }
  return {
    rooms,
    reps,
    seed,
    kbPath,
    model,
    effort: effort as ArenaEffort,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    codexBin: values.get('--codex-bin') ?? 'codex',
  };
}

function dryRunPlan(state: EncounterState, envelope: ArenaPromptEnvelope): RoundPlan {
  return {
    kind: 'round_plan',
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: envelope.encounterId as RoundPlan['encounterId'],
    requestId: envelope.requestId,
    expectedRevision: envelope.expectedRevision,
    round: envelope.round,
    monsters: state.combatants.flatMap((subject) => {
      if (subject.profile.kind !== 'monster' || subject.life === 'dead') return [];
      const attack = monsterActions(state, subject.profile.id)
        .find((action): action is MonsterAttackAction => action.kind === 'attack');
      const target = resolveTarget(state, subject.profile.id, { kind: 'nearest_enemy' });
      const origin = tokenPosition(state, subject.profile.id);
      const destination = target === null ? null : tokenPosition(state, target);
      const inRange = attack !== undefined && origin !== null && destination !== null &&
        gridDistance(origin, destination) <= attackRange(attack);
      return [{
        monsterId: subject.profile.id,
        program: inRange
          ? {
              kind: 'action' as const,
              action: {
                kind: 'attack' as const,
                target: { kind: 'nearest_enemy' as const },
                attackId: attack.id,
              },
            }
          : {
              kind: 'action' as const,
              action: {
                kind: 'move_toward' as const,
                target: { kind: 'nearest_enemy' as const },
                maximumFeet: subject.profile.rules.speed,
              },
            },
      }];
    }),
  };
}

function parseCodexOutput(stdout: string, priorSessionId: string | null): CodexResult {
  let sessionId = priorSessionId;
  let reply: unknown = null;
  let tokens: ArenaTokenCounts = { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
  for (const line of stdout.split('\n').filter((candidate) => candidate.trim().length > 0)) {
    const value: unknown = JSON.parse(line);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const event = value as Readonly<Record<string, unknown>>;
    if (event['type'] === 'thread.started' && typeof event['thread_id'] === 'string') sessionId = event['thread_id'];
    if (event['type'] === 'item.completed' && typeof event['item'] === 'object' && event['item'] !== null) {
      const item = event['item'] as Readonly<Record<string, unknown>>;
      if (item['type'] === 'agent_message' && typeof item['text'] === 'string') reply = JSON.parse(item['text']);
    }
    if (event['type'] === 'turn.completed' && typeof event['usage'] === 'object' && event['usage'] !== null) {
      const usage = event['usage'] as Readonly<Record<string, unknown>>;
      const count = (key: string): number => typeof usage[key] === 'number' && Number.isSafeInteger(usage[key])
        ? usage[key]
        : 0;
      tokens = {
        input: count('input_tokens'),
        cachedInput: count('cached_input_tokens'),
        output: count('output_tokens'),
        reasoning: count('reasoning_tokens'),
      };
    }
  }
  if (sessionId === null) throw new Error('Codex output did not contain a persistent session id.');
  return { sessionId, reply, tokens };
}

async function runCodex(
  config: ArenaConfig,
  prompt: string,
  sessionId: string | null,
): Promise<CodexResult> {
  const args = [
    'exec',
    '-C', config.cwd,
    '--sandbox', 'read-only',
    '--json',
    '-m', config.model,
    '-c', `model_reasoning_effort="${config.effort}"`,
    ...(sessionId === null ? [] : ['resume', sessionId]),
    '-',
  ];
  const stdout = await new Promise<string>((resolvePromise, reject) => {
    const child = spawn(config.codexBin, args, { cwd: config.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { errorOutput += chunk.toString('utf8'); });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise(output);
      else reject(new Error(`codex exec exited ${String(code)}: ${errorOutput}`));
    });
    child.stdin.end(prompt);
  });
  return parseCodexOutput(stdout, sessionId);
}

export async function runArena(config: ArenaConfig): Promise<readonly ArenaRow[]> {
  const knowledgeBase = await readFile(config.kbPath, 'utf8');
  const kbHash = createHash('sha256').update(knowledgeBase).digest('hex');
  const rows: ArenaRow[] = [];
  for (let room = 1; room <= config.rooms; room += 1) {
    const roomSeed = (config.seed + room - 1) >>> 0;
    const generated = generateRoom(roomSeed);
    let sessionId: string | null = null;
    for (let round = 1; round <= config.reps; round += 1) {
      const envelope: ArenaPromptEnvelope = {
        encounterId: `encounter:arena-${String(roomSeed)}`,
        requestId: `arena-${String(roomSeed)}-round-${String(round)}`,
        expectedRevision: generated.encounter.state.revision,
        round,
      };
      const prompt = renderArenaPrompt({
        state: generated.encounter.state,
        envelope,
        knowledgeBase,
        surface: JSON_ROUND_PLAN_SURFACE,
      });
      const started = performance.now();
      let plan: RoundPlan | null = null;
      let tokens: ArenaTokenCounts = { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
      const refusals: string[] = [];
      try {
        if (config.dryRun) {
          plan = JSON_ROUND_PLAN_SURFACE.decode(dryRunPlan(generated.encounter.state, envelope));
        } else {
          const result = await runCodex(config, prompt, sessionId);
          sessionId = result.sessionId;
          tokens = result.tokens;
          plan = JSON_ROUND_PLAN_SURFACE.decode(result.reply);
        }
        refusals.push(...validateArenaPlan(plan, generated.encounter.state, envelope));
      } catch (error) {
        refusals.push(error instanceof Error ? error.message : String(error));
      }
      const row: ArenaRow = {
        seed: roomSeed,
        room,
        round,
        kbHash,
        wall: performance.now() - started,
        tokens,
        refusals,
        plan,
      };
      rows.push(row);
      await appendFile(config.outPath, `${JSON.stringify(row)}\n`, 'utf8');
    }
  }
  return rows;
}

async function main(): Promise<void> {
  await runArena(parseArenaArgs(process.argv.slice(2)));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-arena.ts') ||
  invokedPath.endsWith('\\ai-dm-arena.ts') ||
  ((
    invokedPath.endsWith('/vite-node') ||
    invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') ||
    invokedPath.endsWith('\\vite-node.mjs')
  ) && process.argv.includes('--rooms'))
)) {
  await main();
}
