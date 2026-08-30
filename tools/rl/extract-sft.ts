import { createReadStream } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { canonicalJson } from '../../src/commands/canonical-json';
import { sha256 } from '../../src/crypto/sha256';
import { buildArenaSessionInstructions } from './arena-session-instructions';

const FORBIDDEN_SOURCE = /(?:^|[\\/])content[\\/]cc-by-sa(?:[\\/]|$)/iu;
const FORBIDDEN_PAYLOAD = /content[\\/]cc-by-sa[\\/]/iu;

interface ArenaRlCaptureV1 {
  readonly format: 'arena-rl-capture-v1';
  readonly sourceLicense: 'project-generated';
  readonly sessionInstructions: string;
  readonly turnContext: Readonly<Record<string, unknown>>;
  readonly submitRoundIntentsArguments: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
}

type SftTask = 'round_plan' | 'plan_adjustment';
type SftTaskSelection = SftTask | 'all';

interface ArenaRlCaptureV2 {
  readonly format: 'arena-rl-capture-v2';
  readonly task: SftTask;
  readonly submissionTool: 'engine.submit_round_intents' | 'engine.submit_plan_adjustment';
  readonly sourceLicense: 'project-generated';
  readonly sessionInstructions: string;
  readonly rawTurnContext: string;
  readonly turnContext: Readonly<Record<string, unknown>>;
  readonly submittedArguments: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
  readonly requestId: string;
  readonly proposalId: string;
  readonly sessionId: string | null;
}

interface NormalizedCapture {
  readonly task: SftTask;
  readonly submissionTool: 'engine.submit_round_intents' | 'engine.submit_plan_adjustment';
  readonly sessionInstructions: string;
  readonly rawTurnContext: string | null;
  readonly turnContext: Readonly<Record<string, unknown>>;
  readonly submittedArguments: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
  readonly proposalId: string | null;
  readonly sessionId: string | null;
}

interface ExtractableArenaRow {
  readonly seed: number;
  readonly basis: string;
  readonly room: number;
  readonly round: number;
  readonly outcome: string;
  readonly proposalId: string | null;
  readonly serviceNull: boolean;
  readonly sessionId: string | null;
  readonly escalationSessionId: string | null;
  readonly rawTurnContext?: string;
  readonly turnContextGranularity?: 'full' | 'turn_delta';
  readonly adjustments?: readonly Readonly<Record<string, unknown>>[];
  readonly rlData?: ArenaRlCaptureV1 | ArenaRlCaptureV2;
}

export interface SftExample {
  readonly task: SftTask;
  readonly messages: readonly [
    { readonly role: 'system'; readonly content: string },
    { readonly role: 'user'; readonly content: string },
    { readonly role: 'assistant'; readonly content: string },
  ];
  readonly sourceRow: {
    readonly path: string;
    readonly line: number;
    readonly seed: number;
    readonly basis: string;
    readonly room: number;
    readonly round: number;
    readonly proposalId: string;
  };
  readonly stateDigest: string;
  readonly planHash: string;
  readonly contextSource: 'raw' | 'reconstructed';
  /** Corpus metadata only; never included in the training messages. */
  readonly sessionId: string | null;
  readonly escalationSessionId: string | null;
}

export interface ExtractSftConfig {
  readonly arenaPaths: readonly string[];
  readonly rolloutPaths: readonly string[];
  readonly outPath: string;
  readonly task?: SftTaskSelection;
}

export interface ExtractSftStats {
  readonly examples: number;
  readonly rooms: number;
  readonly deduplicated: number;
}

export interface ExtractSftDependencies {
  readonly heartbeat?: (line: string) => void;
}

function stdoutHeartbeat(line: string): void {
  process.stdout.write(`[rl-extract] ${line}\n`);
}

interface RolloutCapture {
  readonly sessionInstructions: string;
  readonly turnContext: Readonly<Record<string, unknown>>;
  readonly submitRoundIntentsArguments: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
}

interface RolloutCaptureIndex {
  readonly byProposalId: ReadonlyMap<string, RolloutCapture>;
  readonly byRequestId: ReadonlyMap<string, RolloutCapture>;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function parsedJson(value: string): unknown | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try { return JSON.parse(trimmed) as unknown; } catch { return null; }
}

function recordsWithin(value: unknown, depth = 0): readonly Readonly<Record<string, unknown>>[] {
  if (depth > 12) return [];
  if (typeof value === 'string') {
    const parsed = parsedJson(value);
    return parsed === null ? [] : recordsWithin(parsed, depth + 1);
  }
  if (Array.isArray(value)) return value.flatMap((entry) => recordsWithin(entry, depth + 1));
  const candidate = record(value);
  return candidate === null
    ? []
    : [candidate, ...Object.values(candidate).flatMap((entry) => recordsWithin(entry, depth + 1))];
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value.flatMap((entry) => {
    const candidate = record(entry);
    return typeof candidate?.['text'] === 'string' ? [candidate['text']] : [];
  }).join('');
}

function requestIdWithin(value: Readonly<Record<string, unknown>>): string | null {
  if (typeof value['request_id'] === 'string') return value['request_id'];
  const request = record(value['request']);
  return typeof request?.['request_id'] === 'string' ? request['request_id'] : null;
}

function stateDigestFromArguments(argumentsValue: Readonly<Record<string, unknown>>): string | null {
  const stateRef = record(argumentsValue['state_ref']);
  const handle = stateRef?.['state_handle'];
  return typeof handle === 'string' && handle.startsWith('engine-state:')
    ? handle.slice('engine-state:'.length)
    : null;
}

function rolloutCaptures(source: string): RolloutCaptureIndex {
  let instructions = '';
  const contexts = new Map<string, Readonly<Record<string, unknown>>>();
  const submissions: {
    readonly requestId: string;
    readonly argumentsValue: Readonly<Record<string, unknown>>;
    readonly callId: string | null;
  }[] = [];
  const proposalByCallId = new Map<string, string>();
  for (const [index, line] of source.split('\n').entries()) {
    if (line.trim().length === 0) continue;
    let decoded: unknown;
    try { decoded = JSON.parse(line) as unknown; }
    catch (error) {
      throw new SyntaxError(`Invalid rollout JSON on line ${String(index + 1)}.`, { cause: error });
    }
    const records = recordsWithin(decoded);
    const lineCallId = records.flatMap((candidate) =>
      typeof candidate['call_id'] === 'string' ? [candidate['call_id']] : [])[0] ?? null;
    const lineProposalId = records.flatMap((candidate) =>
      typeof candidate['round_proposal_id'] === 'string' ? [candidate['round_proposal_id']] : [])[0] ?? null;
    if (lineCallId !== null && lineProposalId !== null) {
      proposalByCallId.set(lineCallId, lineProposalId);
    }
    for (const candidate of records) {
      if (candidate['role'] === 'developer' && instructions.length === 0) {
        instructions = contentText(candidate['content']);
      }
      const structured = record(candidate['structuredContent']);
      if (structured !== null && record(structured['state_ref']) !== null) {
        const requestId = requestIdWithin(structured);
        if (requestId !== null) contexts.set(requestId, structuredClone(structured));
      }
      const name = candidate['name'] ?? candidate['tool'];
      if (typeof name !== 'string' || !name.endsWith('engine_submit_round_intents') &&
        !name.endsWith('engine.submit_round_intents')) continue;
      const rawArguments = candidate['arguments'] ?? candidate['input'];
      const argumentsValue = typeof rawArguments === 'string'
        ? record(parsedJson(rawArguments))
        : record(rawArguments);
      if (argumentsValue === null || typeof argumentsValue['request_id'] !== 'string') continue;
      submissions.push({
        requestId: argumentsValue['request_id'],
        argumentsValue: structuredClone(argumentsValue),
        callId: typeof candidate['call_id'] === 'string' ? candidate['call_id'] : lineCallId,
      });
    }
  }
  const byProposalId = new Map<string, RolloutCapture>();
  const byRequestId = new Map<string, RolloutCapture>();
  const ambiguousRequests = new Set<string>();
  for (const submission of submissions) {
    const { requestId, argumentsValue: submitRoundIntentsArguments } = submission;
    const turnContext = contexts.get(requestId);
    const stateDigest = stateDigestFromArguments(submitRoundIntentsArguments);
    if (turnContext === undefined || stateDigest === null) continue;
    const capture: RolloutCapture = {
      sessionInstructions: instructions,
      turnContext,
      submitRoundIntentsArguments,
      stateDigest,
    };
    if (!ambiguousRequests.has(requestId)) {
      if (byRequestId.has(requestId)) {
        byRequestId.delete(requestId);
        ambiguousRequests.add(requestId);
      } else {
        byRequestId.set(requestId, capture);
      }
    }
    const proposalId = submission.callId === null
      ? null
      : proposalByCallId.get(submission.callId) ?? null;
    if (proposalId !== null) byProposalId.set(proposalId, capture);
  }
  return { byProposalId, byRequestId };
}

async function loadRolloutCaptures(paths: readonly string[]): Promise<RolloutCaptureIndex> {
  const byProposalId = new Map<string, RolloutCapture>();
  const byRequestId = new Map<string, RolloutCapture>();
  const ambiguousRequests = new Set<string>();
  for (const path of paths) {
    assertLicensedPath(path);
    const source = await readFile(path, 'utf8');
    const captures = rolloutCaptures(source);
    for (const [proposalId, capture] of captures.byProposalId) byProposalId.set(proposalId, capture);
    for (const [requestId, capture] of captures.byRequestId) {
      if (ambiguousRequests.has(requestId)) continue;
      if (byRequestId.has(requestId)) {
        byRequestId.delete(requestId);
        ambiguousRequests.add(requestId);
      } else {
        byRequestId.set(requestId, capture);
      }
    }
  }
  return { byProposalId, byRequestId };
}

function assertLicensedPath(path: string): void {
  if (FORBIDDEN_SOURCE.test(path.replaceAll('\\', '/'))) {
    throw new TypeError(`RL data cannot read CC-BY-SA source path: ${path}`);
  }
}

function isNullableSessionId(value: unknown): value is string | null {
  return value === null || typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function requiredArenaRow(value: unknown, path: string, line: number): ExtractableArenaRow {
  const candidate = record(value);
  if (candidate === null || typeof candidate['seed'] !== 'number' ||
    typeof candidate['basis'] !== 'string' || typeof candidate['room'] !== 'number' ||
    typeof candidate['round'] !== 'number' || typeof candidate['outcome'] !== 'string' ||
    (candidate['proposalId'] !== null && typeof candidate['proposalId'] !== 'string') ||
    !isNullableSessionId(candidate['sessionId']) ||
    !isNullableSessionId(candidate['escalationSessionId']) ||
    ((candidate['rawTurnContext'] === undefined) !==
      (candidate['turnContextGranularity'] === undefined)) ||
    (candidate['rawTurnContext'] !== undefined &&
      (typeof candidate['rawTurnContext'] !== 'string' ||
        candidate['rawTurnContext'].length === 0 ||
        candidate['turnContextGranularity'] !== 'full' &&
        candidate['turnContextGranularity'] !== 'turn_delta')) ||
    typeof candidate['serviceNull'] !== 'boolean') {
    throw new TypeError(`Arena row ${path}:${String(line)} has an invalid extraction shape.`);
  }
  return candidate as unknown as ExtractableArenaRow;
}

function validRowCapture(value: unknown): NormalizedCapture | null {
  const candidate = record(value);
  if (candidate?.['format'] === 'arena-rl-capture-v1' &&
    candidate['sourceLicense'] === 'project-generated' &&
    typeof candidate['sessionInstructions'] === 'string' &&
    record(candidate['turnContext']) !== null && record(candidate['submitRoundIntentsArguments']) !== null &&
    typeof candidate['stateDigest'] === 'string') {
    return {
      task: 'round_plan',
      submissionTool: 'engine.submit_round_intents',
      sessionInstructions: candidate['sessionInstructions'],
      rawTurnContext: null,
      turnContext: candidate['turnContext'] as Readonly<Record<string, unknown>>,
      submittedArguments: candidate['submitRoundIntentsArguments'] as Readonly<Record<string, unknown>>,
      stateDigest: candidate['stateDigest'],
      proposalId: null,
      sessionId: null,
    };
  }
  const task = candidate?.['task'];
  const submissionTool = candidate?.['submissionTool'];
  if (candidate?.['format'] !== 'arena-rl-capture-v2' ||
    candidate['sourceLicense'] !== 'project-generated' ||
    (task !== 'round_plan' && task !== 'plan_adjustment') ||
    (submissionTool !== 'engine.submit_round_intents' &&
      submissionTool !== 'engine.submit_plan_adjustment') ||
    (task === 'round_plan') !== (submissionTool === 'engine.submit_round_intents') ||
    typeof candidate['sessionInstructions'] !== 'string' ||
    typeof candidate['rawTurnContext'] !== 'string' ||
    record(candidate['turnContext']) === null || record(candidate['submittedArguments']) === null ||
    typeof candidate['stateDigest'] !== 'string' || typeof candidate['requestId'] !== 'string' ||
    typeof candidate['proposalId'] !== 'string' || !isNullableSessionId(candidate['sessionId'])) return null;
  return {
    task,
    submissionTool,
    sessionInstructions: candidate['sessionInstructions'],
    rawTurnContext: candidate['rawTurnContext'],
    turnContext: candidate['turnContext'] as Readonly<Record<string, unknown>>,
    submittedArguments: candidate['submittedArguments'] as Readonly<Record<string, unknown>>,
    stateDigest: candidate['stateDigest'],
    proposalId: candidate['proposalId'],
    sessionId: candidate['sessionId'],
  };
}

function requestId(row: ExtractableArenaRow): string {
  return `request:room-${String(row.room)}-round-${String(row.round)}`;
}

function exampleFrom(
  row: ExtractableArenaRow,
  path: string,
  line: number,
  rollout: RolloutCaptureIndex,
): SftExample {
  const rawInline = record(row.rlData);
  if (rawInline !== null && rawInline['sourceLicense'] !== 'project-generated') {
    throw new TypeError(`Arena row ${path}:${String(line)} is not licensed for RL extraction.`);
  }
  const inline = validRowCapture(row.rlData);
  const rolloutCapture = (row.proposalId === null
    ? undefined
    : rollout.byProposalId.get(row.proposalId)) ?? rollout.byRequestId.get(requestId(row));
  const capture: NormalizedCapture | undefined = inline ?? (rolloutCapture === undefined
    ? undefined
    : {
        task: 'round_plan',
        submissionTool: 'engine.submit_round_intents',
        sessionInstructions: rolloutCapture.sessionInstructions,
        rawTurnContext: null,
        turnContext: rolloutCapture.turnContext,
        submittedArguments: rolloutCapture.submitRoundIntentsArguments,
        stateDigest: rolloutCapture.stateDigest,
        proposalId: row.proposalId,
        sessionId: row.sessionId,
      });
  if (capture === undefined) {
    throw new Error(
      `Authorized arena row ${path}:${String(line)} lacks --capture-rl-data fields and no matching rollout was supplied.`,
    );
  }
  const proposalId = capture.proposalId ?? row.proposalId;
  if (proposalId === null) throw new TypeError(`Authorized arena row ${path}:${String(line)} has no proposalId.`);
  const assistant = canonicalJson(capture.submittedArguments);
  const planHash = sha256(assistant);
  const rawTurnContext = capture.rawTurnContext ?? row.rawTurnContext;
  const contextSource = rawTurnContext === undefined || rawTurnContext === null ? 'reconstructed' : 'raw';
  const example: SftExample = {
    task: capture.task,
    messages: [
      { role: 'system', content: buildArenaSessionInstructions(capture.sessionInstructions) },
      {
        role: 'user',
        content: contextSource === 'raw' ? rawTurnContext ?? '' : canonicalJson(capture.turnContext),
      },
      { role: 'assistant', content: assistant },
    ],
    sourceRow: {
      path: resolve(path), line, seed: row.seed, basis: row.basis,
      room: row.room, round: row.round, proposalId,
    },
    stateDigest: capture.stateDigest,
    planHash,
    contextSource,
    sessionId: capture.sessionId ?? row.sessionId,
    escalationSessionId: row.escalationSessionId,
  };
  if (FORBIDDEN_PAYLOAD.test(canonicalJson(example))) {
    throw new TypeError(`Arena row ${path}:${String(line)} contains prohibited CC-BY-SA provenance.`);
  }
  return example;
}

function adjustmentExamplesFrom(
  row: ExtractableArenaRow,
  path: string,
  line: number,
): readonly SftExample[] {
  return (row.adjustments ?? []).flatMap((adjustment) => {
    const captures = adjustment['rlData'];
    if (captures === undefined) return [];
    if (!Array.isArray(captures)) {
      throw new TypeError(`Arena row ${path}:${String(line)} has invalid adjustment RL captures.`);
    }
    return captures.map((value): SftExample => {
      const raw = record(value);
      if (raw !== null && raw['sourceLicense'] !== 'project-generated') {
        throw new TypeError(`Arena row ${path}:${String(line)} is not licensed for RL extraction.`);
      }
      const capture = validRowCapture(value);
      if (capture === null || capture.task !== 'plan_adjustment' || capture.proposalId === null) {
        throw new TypeError(`Arena row ${path}:${String(line)} has an invalid adjustment RL capture.`);
      }
      const assistant = canonicalJson(capture.submittedArguments);
      const example: SftExample = {
        task: 'plan_adjustment',
        messages: [
          { role: 'system', content: buildArenaSessionInstructions(capture.sessionInstructions) },
          { role: 'user', content: capture.rawTurnContext ?? canonicalJson(capture.turnContext) },
          { role: 'assistant', content: assistant },
        ],
        sourceRow: {
          path: resolve(path), line, seed: row.seed, basis: row.basis,
          room: row.room, round: row.round, proposalId: capture.proposalId,
        },
        stateDigest: capture.stateDigest,
        planHash: sha256(assistant),
        contextSource: capture.rawTurnContext === null ? 'reconstructed' : 'raw',
        sessionId: capture.sessionId,
        escalationSessionId: null,
      };
      if (FORBIDDEN_PAYLOAD.test(canonicalJson(example))) {
        throw new TypeError(`Arena row ${path}:${String(line)} contains prohibited CC-BY-SA provenance.`);
      }
      return example;
    });
  });
}

async function* arenaRows(path: string): AsyncGenerator<{ readonly row: ExtractableArenaRow; readonly line: number }> {
  assertLicensedPath(path);
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  let line = 0;
  for await (const source of lines) {
    line += 1;
    if (source.trim().length === 0) continue;
    let decoded: unknown;
    try { decoded = JSON.parse(source) as unknown; }
    catch (error) { throw new SyntaxError(`Invalid arena JSON on ${path}:${String(line)}.`, { cause: error }); }
    yield { row: requiredArenaRow(decoded, path, line), line };
  }
}

export async function extractSft(
  config: ExtractSftConfig,
  dependencies: ExtractSftDependencies = {},
): Promise<ExtractSftStats> {
  if (config.arenaPaths.length === 0) throw new TypeError('At least one arena JSONL path is required.');
  const selectedTask = config.task ?? 'round_plan';
  const heartbeat = dependencies.heartbeat ?? stdoutHeartbeat;
  heartbeat(
    `start batches=${String(config.arenaPaths.length)} rollouts=${String(config.rolloutPaths.length)} ` +
    `out=${config.outPath}`,
  );
  assertLicensedPath(config.outPath);
  const rollout = await loadRolloutCaptures(config.rolloutPaths);
  const output = await open(config.outPath, 'w');
  const dedupe = new Set<string>();
  const rooms = new Set<string>();
  let examples = 0;
  let deduplicated = 0;
  try {
    for (const path of config.arenaPaths) {
      const examplesBefore = examples;
      heartbeat(`batch path=${resolve(path)} status=start`);
      for await (const { row, line } of arenaRows(path)) {
        if (row.serviceNull) continue;
        const candidates: SftExample[] = [];
        if ((selectedTask === 'round_plan' || selectedTask === 'all') && row.outcome === 'authorized') {
          candidates.push(exampleFrom(row, path, line, rollout));
        }
        if ((selectedTask === 'plan_adjustment' || selectedTask === 'all') &&
          (row.outcome === 'authorized' || row.outcome === 'auto_resolved')) {
          candidates.push(...adjustmentExamplesFrom(row, path, line));
        }
        for (const example of candidates) {
          const key = `${example.task}:${example.stateDigest}:${example.planHash}`;
          if (dedupe.has(key)) { deduplicated += 1; continue; }
          dedupe.add(key);
          rooms.add(`${row.basis}:${String(row.seed)}`);
          await output.write(`${canonicalJson(example)}\n`);
          examples += 1;
        }
      }
      heartbeat(
        `batch path=${resolve(path)} status=complete examples=${String(examples - examplesBefore)}`,
      );
    }
  } finally {
    await output.close();
  }
  return { examples, rooms: rooms.size, deduplicated };
}

export function formatExtractSftStats(stats: ExtractSftStats): string {
  return `examples=${String(stats.examples)} rooms=${String(stats.rooms)} deduplicated=${String(stats.deduplicated)} dedupe=state-digest+plan-hash`;
}

export function parseExtractSftArgs(argv: readonly string[]): ExtractSftConfig {
  const arenaPaths: string[] = [];
  const rolloutPaths: string[] = [];
  let outPath: string | null = null;
  let task: SftTaskSelection = 'round_plan';
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--out' || argument === '--rollout' || argument === '--task') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) throw new TypeError(`${argument} requires a value.`);
      if (argument === '--out') outPath = resolve(value);
      else if (argument === '--rollout') rolloutPaths.push(resolve(value));
      else {
        if (value !== 'round_plan' && value !== 'plan_adjustment' && value !== 'all') {
          throw new TypeError('--task must be round_plan, plan_adjustment, or all.');
        }
        task = value;
      }
      index += 1;
      continue;
    }
    if (argument?.startsWith('--')) throw new TypeError(`Unknown extractor option ${argument}.`);
    if (argument !== undefined) arenaPaths.push(resolve(argument));
  }
  if (outPath === null) throw new TypeError('--out is required.');
  return { arenaPaths, rolloutPaths, outPath, task };
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/extract-sft.ts') || argument.endsWith('\\extract-sft.ts'));
  const args = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  const stats = await extractSft(parseExtractSftArgs(args));
  process.stdout.write(`${formatExtractSftStats(stats)}\n`);
}

const EXTRACT_SFT_USAGE =
  'Usage: rl:extract-sft <arena.jsonl> [arena.jsonl ...] [--rollout codex-rollout.jsonl ...] [--task round_plan|plan_adjustment|all] --out PATH';

async function runCli(): Promise<void> {
  try { await main(); }
  catch (error) {
    process.stderr.write(`${EXTRACT_SFT_USAGE}\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.env['VITEST'] !== 'true') await runCli();
