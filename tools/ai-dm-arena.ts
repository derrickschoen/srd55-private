import { writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { generateRoom } from '../src/vtt/room-generator';
import {
  CONVERSATION_CLIS,
  CONVERSATION_EFFORTS,
  runConversation,
  type ConversationCli,
  type ConversationEffort,
  type ConversationRunOptions,
  type ConversationTokenCounts,
} from './ai-dm-conversation';
import type { UnattendedReactionAskDefault } from '../src/vtt/reaction-offer-host-policy';

export interface ArenaConfig {
  readonly rooms: number;
  readonly reps: number;
  readonly seed: number;
  readonly cli: ConversationCli;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly cliBin: string;
  readonly timeoutMs: number;
  readonly kbPath: string | null;
  readonly reactionAskDefault: UnattendedReactionAskDefault;
}

export interface ArenaRow {
  readonly seed: number;
  readonly room: number;
  readonly round: number;
  readonly cli: ConversationCli;
  readonly kbHash: string | null;
  readonly contextRevision: number;
  readonly projectionRevision: number;
  readonly outcome: 'authorized' | 'auto_resolved' | 'awaiting_dm_adjudication' | 'refused';
  readonly proposalId: string | null;
  readonly wall: number;
  readonly tokens: ConversationTokenCounts;
  readonly refusals: readonly string[];
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

function validateKbPath(cwd: string, candidate: string): void {
  if (pathIsInside(resolve(cwd, 'content/cc-by-sa'), candidate)) {
    throw new TypeError('--kb cannot use content/cc-by-sa as a knowledge-base source.');
  }
  if (pathIsInside(cwd, candidate) && !pathIsInside(resolve(cwd, 'tests/fixtures'), candidate)) {
    throw new TypeError('--kb must be outside the repository working tree or within tests/fixtures.');
  }
}

export function parseArenaArgs(argv: readonly string[], cwd = process.cwd()): ArenaConfig {
  const argumentsValue = argv[0] === '--' ? argv.slice(1) : argv;
  const values = new Map<string, string>();
  let dryRun = false;
  for (let index = 0; index < argumentsValue.length; index += 1) {
    const option = argumentsValue[index];
    if (option === '--dry-run') { dryRun = true; continue; }
    if (![
      '--rooms', '--reps', '--seed', '--cli', '--model', '--effort', '--out',
      '--cli-bin', '--timeout-ms', '--kb',
      '--reaction-ask-default',
    ].includes(option ?? '')) throw new TypeError(`Unknown arena option ${option ?? '<missing>'}.`);
    values.set(option ?? '', requiredValue(argumentsValue, index, option ?? '<missing>'));
    index += 1;
  }
  const seed = Number(values.get('--seed'));
  if (!Number.isSafeInteger(seed)) throw new TypeError('--seed must be a safe integer.');
  const outPath = resolve(values.get('--out') ?? '');
  if ((values.get('--out') ?? '').length === 0) throw new TypeError('--out is required.');
  if (pathIsInside(cwd, outPath)) throw new TypeError('--out must be outside the repository working tree.');
  const cli = values.get('--cli') ?? 'codex';
  if (!CONVERSATION_CLIS.includes(cli as ConversationCli)) throw new TypeError('--cli must be codex or claude-code.');
  const effort = values.get('--effort') ?? 'medium';
  if (!CONVERSATION_EFFORTS.includes(effort as ConversationEffort)) {
    throw new TypeError('--effort must be low, medium, high, or xhigh.');
  }
  const selectedCli = cli as ConversationCli;
  const kbPath = values.has('--kb') ? resolve(values.get('--kb') ?? '') : null;
  if (kbPath !== null) validateKbPath(cwd, kbPath);
  const reactionAskDefault = values.get('--reaction-ask-default') ?? 'decline';
  if (reactionAskDefault !== 'decline' && reactionAskDefault !== 'take') {
    throw new TypeError('--reaction-ask-default must be decline or take.');
  }
  return {
    rooms: positiveInteger(values.get('--rooms') ?? '', '--rooms'),
    reps: positiveInteger(values.get('--reps') ?? '', '--reps'),
    seed,
    cli: selectedCli,
    model: values.get('--model') ?? (selectedCli === 'codex' ? 'gpt-5.6-sol' : 'sonnet'),
    effort: effort as ConversationEffort,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : 'claude'),
    timeoutMs: positiveInteger(values.get('--timeout-ms') ?? '120000', '--timeout-ms'),
    kbPath,
    reactionAskDefault,
  };
}

export async function runArena(
  config: ArenaConfig,
  options: Omit<ConversationRunOptions, 'roomStates'> = {},
): Promise<readonly ArenaRow[]> {
  const generated = Array.from({ length: config.rooms }, (_, index) => {
    const seed = (config.seed + index) >>> 0;
    return { seed, state: generateRoom(seed).encounter.state };
  });
  const result = await runConversation({
    fixturesPath: resolve(config.cwd, 'tests/fixtures/arena-basis'),
    rooms: config.rooms,
    rounds: config.reps,
    cli: config.cli,
    model: config.model,
    effort: config.effort,
    outPath: config.outPath,
    dryRun: config.dryRun,
    cwd: config.cwd,
    cliBin: config.cliBin,
    timeoutMs: config.timeoutMs,
    kbPath: config.kbPath,
    reactionAskDefault: config.reactionAskDefault,
  }, { ...options, roomStates: generated.map((entry) => entry.state) });
  const rows = result.rows.map((row): ArenaRow => ({
    seed: generated[row.room - 1]!.seed,
    room: row.room,
    round: row.round,
    cli: row.cli,
    kbHash: row.kbHash,
    contextRevision: row.contextRevision,
    projectionRevision: row.projectionRevision,
    outcome: row.outcome,
    proposalId: row.proposalId,
    wall: row.wallPerCreature,
    tokens: row.tokens,
    refusals: row.refusals,
    toolCalls: row.toolCalls,
  }));
  await writeFile(config.outPath, rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');
  return rows;
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/ai-dm-arena.ts') || argument.endsWith('\\ai-dm-arena.ts'));
  const argumentsValue = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  await runArena(parseArenaArgs(argumentsValue));
}

if (process.env['VITEST'] !== 'true') await main();
