import { createReadStream } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { canonicalJson } from '../../src/commands/canonical-json';
import { sha256 } from '../../src/crypto/sha256';
import { buildArenaSessionInstructions } from './arena-session-instructions';

const FORBIDDEN_SOURCE = /(?:^|[\\/])content[\\/]cc-by-sa(?:[\\/]|$)/iu;
const FORBIDDEN_PAYLOAD = /content[\\/]cc-by-sa[\\/]/iu;

interface ArenaRlCapture {
  readonly format: 'arena-rl-capture-v1';
  readonly sourceLicense: 'project-generated';
  readonly sessionInstructions: string;
  readonly turnContext: Readonly<Record<string, unknown>>;
  readonly submitRoundIntentsArguments: Readonly<Record<string, unknown>>;
  readonly stateDigest: string;
}

interface ExtractableArenaRow {
  readonly seed: number;
  readonly basis: string;
  readonly room: number;
  readonly round: number;
  readonly outcome: string;
  readonly proposalId: string | null;
  readonly serviceNull: boolean;
  readonly rlData?: ArenaRlCapture;
}

export interface SftExample {
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
}

export interface ExtractSftConfig {
  readonly arenaPaths: readonly string[];
  readonly rolloutPaths: readonly string[];
  readonly outPath: string;
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

function requiredArenaRow(value: unknown, path: string, line: number): ExtractableArenaRow {
  const candidate = record(value);
  if (candidate === null || typeof candidate['seed'] !== 'number' ||
    typeof candidate['basis'] !== 'string' || typeof candidate['room'] !== 'number' ||
    typeof candidate['round'] !== 'number' || typeof candidate['outcome'] !== 'string' ||
    (candidate['proposalId'] !== null && typeof candidate['proposalId'] !== 'string') ||
    typeof candidate['serviceNull'] !== 'boolean') {
    throw new TypeError(`Arena row ${path}:${String(line)} has an invalid extraction shape.`);
  }
  return candidate as unknown as ExtractableArenaRow;
}

function validRowCapture(value: unknown): ArenaRlCapture | null {
  const candidate = record(value);
  return candidate?.['format'] === 'arena-rl-capture-v1' &&
    candidate['sourceLicense'] === 'project-generated' &&
    typeof candidate['sessionInstructions'] === 'string' &&
    record(candidate['turnContext']) !== null && record(candidate['submitRoundIntentsArguments']) !== null &&
    typeof candidate['stateDigest'] === 'string'
    ? candidate as unknown as ArenaRlCapture
    : null;
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
  const capture = inline ?? (row.proposalId === null
    ? undefined
    : rollout.byProposalId.get(row.proposalId)) ?? rollout.byRequestId.get(requestId(row));
  if (capture === undefined) {
    throw new Error(
      `Authorized arena row ${path}:${String(line)} lacks --capture-rl-data fields and no matching rollout was supplied.`,
    );
  }
  if (row.proposalId === null) throw new TypeError(`Authorized arena row ${path}:${String(line)} has no proposalId.`);
  const assistant = canonicalJson(capture.submitRoundIntentsArguments);
  const planHash = sha256(assistant);
  const example: SftExample = {
    messages: [
      { role: 'system', content: buildArenaSessionInstructions(capture.sessionInstructions) },
      { role: 'user', content: canonicalJson(capture.turnContext) },
      { role: 'assistant', content: assistant },
    ],
    sourceRow: {
      path: resolve(path), line, seed: row.seed, basis: row.basis,
      room: row.room, round: row.round, proposalId: row.proposalId,
    },
    stateDigest: capture.stateDigest,
    planHash,
  };
  if (FORBIDDEN_PAYLOAD.test(canonicalJson(example))) {
    throw new TypeError(`Arena row ${path}:${String(line)} contains prohibited CC-BY-SA provenance.`);
  }
  return example;
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
        if (row.outcome !== 'authorized' || row.serviceNull) continue;
        const example = exampleFrom(row, path, line, rollout);
        const key = `${example.stateDigest}:${example.planHash}`;
        if (dedupe.has(key)) { deduplicated += 1; continue; }
        dedupe.add(key);
        rooms.add(`${row.basis}:${String(row.seed)}`);
        await output.write(`${canonicalJson(example)}\n`);
        examples += 1;
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
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--out' || argument === '--rollout') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('--')) throw new TypeError(`${argument} requires a path.`);
      if (argument === '--out') outPath = resolve(value);
      else rolloutPaths.push(resolve(value));
      index += 1;
      continue;
    }
    if (argument?.startsWith('--')) throw new TypeError(`Unknown extractor option ${argument}.`);
    if (argument !== undefined) arenaPaths.push(resolve(argument));
  }
  if (outPath === null) throw new TypeError('--out is required.');
  return { arenaPaths, rolloutPaths, outPath };
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/extract-sft.ts') || argument.endsWith('\\extract-sft.ts'));
  const args = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  const stats = await extractSft(parseExtractSftArgs(args));
  process.stdout.write(`${formatExtractSftStats(stats)}\n`);
}

const EXTRACT_SFT_USAGE =
  'Usage: rl:extract-sft <arena.jsonl> [arena.jsonl ...] [--rollout codex-rollout.jsonl ...] --out PATH';

async function runCli(): Promise<void> {
  try { await main(); }
  catch (error) {
    process.stderr.write(`${EXTRACT_SFT_USAGE}\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.env['VITEST'] !== 'true') await runCli();
