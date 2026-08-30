import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { canonicalJson } from '../src/commands/canonical-json';

export const R1_10_SEEDS = [
  5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005,
  5_117_006, 5_117_007, 5_117_008, 5_117_009, 5_117_010,
] as const;

export const R1_10_REPS = 3 as const;
export const RERUN_PACKET_VERSION = 'ai-dm-rerun-packet-v1' as const;
const STANDARD_INITIATIVE_POLICY = 'initiative-intel-v1';

const jsonRecordSchema = z.record(z.string(), z.unknown());
type JsonRecord = z.infer<typeof jsonRecordSchema>;

const safeIntegerSchema = z.number().int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

const engineIntelSchema = z.object({
  policy: z.literal('dm-intel-capture-v1'),
  policyVersions: z.object({
    initiative: z.literal(STANDARD_INITIATIVE_POLICY),
  }).passthrough(),
  actors: z.array(z.unknown()),
}).passthrough();

const authorizedPlanEntrySchema = z.object({
  actorId: z.unknown(),
  selectedBranch: z.unknown(),
  resolutionSummary: z.unknown(),
}).passthrough();

const plannerSchema = z.union([
  z.literal('sim_controller'),
  z.object({ model: z.string(), effort: z.string() }).passthrough(),
  z.null(),
]);

const arenaRowSchema = z.object({
  seed: safeIntegerSchema,
  arm: z.string().min(1),
  room: safeIntegerSchema,
  round: safeIntegerSchema,
  startingRoomDigest: z.string().min(1),
  combatModel: z.literal('initiative_segments_v1'),
  initiativeOrder: z.array(z.unknown()),
  outcome: z.enum([
    'authorized', 'auto_resolved', 'awaiting_dm_adjudication',
    'refused', 'service_null', 'local_error',
  ]),
  plannedBy: plannerSchema,
  roundNarrative: z.string().nullable(),
  authorizedPlan: z.array(authorizedPlanEntrySchema).nullable(),
  engineIntel: engineIntelSchema,
}).passthrough();

export interface RerunProtocol {
  readonly seeds: readonly number[];
  readonly reps: number;
}

export const R1_10_PROTOCOL: RerunProtocol = { seeds: R1_10_SEEDS, reps: R1_10_REPS };

export interface RerunPacketConfig {
  readonly inputPaths: readonly string[];
  readonly packetPath: string;
  readonly answerKeyPath: string;
  readonly shuffleSeed: number;
}

interface ValidatedArenaRow {
  readonly seed: number;
  readonly arm: string;
  readonly room: number;
  readonly rep: number;
  readonly startingRoomDigest: string;
  readonly outcome: string;
  readonly plannedBy: z.infer<typeof plannerSchema>;
  readonly roundNarrative: string | null;
  readonly authorizedPlan: readonly z.infer<typeof authorizedPlanEntrySchema>[] | null;
  readonly engineIntel: z.infer<typeof engineIntelSchema>;
}

export interface BlindRubric {
  readonly targetPriority: null;
  readonly actionEconomy: null;
  readonly positioning: null;
  readonly coherence: null;
  readonly total: null;
}

export interface JudgePacketEntry {
  readonly blindId: string;
  readonly caseId: string;
  readonly outcome: string;
  readonly attribution: 'model_authorized' | 'engine_default' | 'not_model_authorized';
  readonly roundNarrative: string | null;
  readonly executedPlan: readonly JsonRecord[] | null;
  readonly engineIntel: JsonRecord;
  readonly rubric: BlindRubric;
}

export interface JudgePacket {
  readonly version: typeof RERUN_PACKET_VERSION;
  readonly judgingOrder: 'interleaved_blinded';
  readonly rubric: {
    readonly targetPriority: { readonly maximum: 3 };
    readonly actionEconomy: { readonly maximum: 3 };
    readonly positioning: { readonly maximum: 2 };
    readonly coherence: { readonly maximum: 2 };
    readonly total: { readonly maximum: 10 };
  };
  readonly entries: readonly JudgePacketEntry[];
}

export interface RerunAnswerKey {
  readonly version: typeof RERUN_PACKET_VERSION;
  readonly entries: readonly {
    readonly blindId: string;
    readonly arm: string;
  }[];
}

const MODEL_IDENTITY_FIELDS = new Set([
  'arm', 'model', 'cli', 'thinkMode', 'sessionId', 'escalationSessionId',
  'escalationModel', 'kbHash', 'repoCommit', 'rawTurnContext', 'rlData', 'plannedBy',
]);

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function parseSafeInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new TypeError(`${option} must be a safe integer.`);
  return parsed;
}

export function parseRerunPacketArgs(argv: readonly string[]): RerunPacketConfig {
  const argumentsValue = argv[0] === '--' ? argv.slice(1) : argv;
  const inputPaths: string[] = [];
  const values = new Map<string, string>();
  for (let index = 0; index < argumentsValue.length; index += 1) {
    const option = argumentsValue[index];
    if (!['--input', '--packet', '--answer-key', '--shuffle-seed'].includes(option ?? '')) {
      throw new TypeError(`Unknown rerun-packet option ${option ?? '<missing>'}.`);
    }
    const value = requiredValue(argumentsValue, index, option ?? '<missing>');
    if (option === '--input') inputPaths.push(resolve(value));
    else values.set(option ?? '', value);
    index += 1;
  }
  if (inputPaths.length === 0) throw new TypeError('At least one --input arena JSONL path is required.');
  const packet = values.get('--packet');
  const answerKey = values.get('--answer-key');
  if (packet === undefined) throw new TypeError('--packet is required.');
  if (answerKey === undefined) throw new TypeError('--answer-key is required.');
  const packetPath = resolve(packet);
  const answerKeyPath = resolve(answerKey);
  if (packetPath === answerKeyPath) throw new TypeError('--packet and --answer-key must be different files.');
  return {
    inputPaths,
    packetPath,
    answerKeyPath,
    shuffleSeed: parseSafeInteger(values.get('--shuffle-seed') ?? '', '--shuffle-seed'),
  };
}

function record(value: unknown, label: string): JsonRecord {
  const parsed = jsonRecordSchema.safeParse(value);
  if (!parsed.success) throw new TypeError(`${label} must be an object.`);
  return parsed.data;
}

function parseJsonl(text: string, source: string): readonly JsonRecord[] {
  return text.split(/\r?\n/u).flatMap((line, index): readonly JsonRecord[] => {
    if (line.trim() === '') return [];
    try {
      const decoded: unknown = JSON.parse(line);
      return [record(decoded, `${source}:${String(index + 1)}`)];
    } catch (error) {
      if (error instanceof SyntaxError) throw new TypeError(`${source}:${String(index + 1)} is not valid JSON.`);
      throw error;
    }
  });
}

function validateRow(source: JsonRecord, sourceLabel: string, protocol: RerunProtocol): ValidatedArenaRow {
  if ('rlData' in source) {
    throw new TypeError(`${sourceLabel} contains rlData; R1-10 is a permanent holdout and cannot contain training data.`);
  }
  const parsed = arenaRowSchema.safeParse(source);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const property = issue === undefined || issue.path.length === 0 ? '' : `.${issue.path.join('.')}`;
    throw new TypeError(`${sourceLabel}${property} is invalid: ${issue?.message ?? 'unknown schema failure'}.`);
  }
  const row = parsed.data;
  const { seed, room, arm } = row;
  const rep = row.round;
  const expectedRoom = protocol.seeds.indexOf(seed) + 1;
  if (expectedRoom === 0) throw new TypeError(`${sourceLabel}.seed=${String(seed)} is not an R1-10 holdout seed.`);
  if (room !== expectedRoom) throw new TypeError(`${sourceLabel}.room must be ${String(expectedRoom)} for seed ${String(seed)}.`);
  if (rep < 1 || rep > protocol.reps) throw new TypeError(`${sourceLabel}.round must be in 1..${String(protocol.reps)}.`);
  return {
    seed, arm, room, rep,
    startingRoomDigest: row.startingRoomDigest,
    outcome: row.outcome,
    plannedBy: row.plannedBy,
    roundNarrative: row.roundNarrative,
    authorizedPlan: row.authorizedPlan,
    engineIntel: row.engineIntel,
  };
}

/** Validates the frozen R1-10 experiment shape before anything can be judged. */
export function validateRerunRows(
  rows: readonly JsonRecord[],
  protocol: RerunProtocol = R1_10_PROTOCOL,
): readonly ValidatedArenaRow[] {
  const validated = rows.map((row, index) => validateRow(row, `row ${String(index + 1)}`, protocol));
  const arms = [...new Set(validated.map((row) => row.arm))].sort((left, right) => left.localeCompare(right));
  if (arms.length !== 2) throw new TypeError(`R1-10 requires exactly two paired arms; found ${String(arms.length)}.`);
  const byCase = new Map<string, ValidatedArenaRow[]>();
  for (const row of validated) {
    const caseKey = `${String(row.seed)}:${String(row.rep)}`;
    const caseRows = byCase.get(caseKey) ?? [];
    caseRows.push(row);
    byCase.set(caseKey, caseRows);
  }
  for (const seed of protocol.seeds) {
    for (let rep = 1; rep <= protocol.reps; rep += 1) {
      const caseKey = `${String(seed)}:${String(rep)}`;
      const caseRows = byCase.get(caseKey) ?? [];
      if (caseRows.length !== arms.length) {
        throw new TypeError(`R1-10 requires one row from each arm for seed ${String(seed)} rep ${String(rep)}.`);
      }
      const seenArms = new Set(caseRows.map((row) => row.arm));
      if (seenArms.size !== arms.length || arms.some((arm) => !seenArms.has(arm))) {
        throw new TypeError(`R1-10 requires paired arms for seed ${String(seed)} rep ${String(rep)}.`);
      }
      const digests = new Set(caseRows.map((row) => row.startingRoomDigest));
      if (digests.size !== 1) {
        throw new TypeError(`Paired arms for seed ${String(seed)} rep ${String(rep)} must use the same frozen room artifact.`);
      }
    }
  }
  if (validated.length !== protocol.seeds.length * protocol.reps * arms.length) {
    throw new TypeError('R1-10 rows contain duplicate or unregistered seed/rep/arm entries.');
  }
  return validated;
}

function engineAttribution(row: ValidatedArenaRow): JudgePacketEntry['attribution'] {
  if (row.outcome === 'auto_resolved' || row.plannedBy === 'sim_controller') return 'engine_default';
  if (row.outcome === 'authorized' && row.plannedBy !== null && typeof row.plannedBy === 'object') {
    return 'model_authorized';
  }
  return 'not_model_authorized';
}

function executedPlan(
  value: ValidatedArenaRow['authorizedPlan'],
): readonly JsonRecord[] | null {
  if (value === null) return null;
  return value.map((plan) => ({
    actorId: plan.actorId,
    selectedBranch: plan.selectedBranch,
    resolutionSummary: plan.resolutionSummary,
  }));
}

function rubric(): BlindRubric {
  return { targetPriority: null, actionEconomy: null, positioning: null, coherence: null, total: null };
}

function shuffled<T>(values: readonly T[], seed: number): readonly T[] {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

/** Rejects a packet that accidentally carries source-arm or model identity fields. */
export function assertBlindedPacket(value: unknown, path = 'packet'): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertBlindedPacket(entry, `${path}[${String(index)}]`));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (MODEL_IDENTITY_FIELDS.has(key)) {
      throw new TypeError(`${path}.${key} leaks a model-identifying field into the blinded packet.`);
    }
    assertBlindedPacket(nested, `${path}.${key}`);
  }
}

export function buildRerunPacket(
  rows: readonly JsonRecord[],
  shuffleSeed: number,
  protocol: RerunProtocol = R1_10_PROTOCOL,
): { readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey } {
  if (!Number.isSafeInteger(shuffleSeed)) throw new TypeError('shuffleSeed must be a safe integer.');
  const validated = [...validateRerunRows(rows, protocol)]
    .sort((left, right) => left.seed - right.seed || left.rep - right.rep || left.arm.localeCompare(right.arm));
  const blinded = shuffled(validated, shuffleSeed).map((row, index) => ({
    blindId: `blind-${String(index + 1).padStart(3, '0')}`,
    row,
  }));
  const packet: JudgePacket = {
    version: RERUN_PACKET_VERSION,
    judgingOrder: 'interleaved_blinded',
    rubric: {
      targetPriority: { maximum: 3 }, actionEconomy: { maximum: 3 },
      positioning: { maximum: 2 }, coherence: { maximum: 2 }, total: { maximum: 10 },
    },
    entries: blinded.map(({ blindId, row }) => ({
      blindId,
      caseId: `case-${String(row.room).padStart(2, '0')}-${String(row.rep)}`,
      outcome: row.outcome,
      attribution: engineAttribution(row),
      roundNarrative: row.roundNarrative,
      executedPlan: executedPlan(row.authorizedPlan),
      engineIntel: row.engineIntel,
      rubric: rubric(),
    })),
  };
  const answerKey: RerunAnswerKey = {
    version: RERUN_PACKET_VERSION,
    entries: blinded.map(({ blindId, row }) => ({ blindId, arm: row.arm })),
  };
  assertBlindedPacket(packet);
  return { packet, answerKey };
}

export async function createRerunPacket(config: RerunPacketConfig): Promise<{ readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey }> {
  const sources = await Promise.all(config.inputPaths.map(async (path) => ({ path, text: await readFile(path, 'utf8') })));
  const rows = sources.flatMap(({ path, text }) => parseJsonl(text, path));
  const result = buildRerunPacket(rows, config.shuffleSeed);
  await Promise.all([
    writeFile(config.packetPath, `${canonicalJson(result.packet)}\n`, 'utf8'),
    writeFile(config.answerKeyPath, `${canonicalJson(result.answerKey)}\n`, 'utf8'),
  ]);
  return result;
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/ai-dm-rerun-packet.ts') || argument.endsWith('\\ai-dm-rerun-packet.ts'));
  await createRerunPacket(parseRerunPacketArgs(scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1)));
}

const invokedPath = process.argv[1];
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-rerun-packet.ts') || invokedPath.endsWith('\\ai-dm-rerun-packet.ts')
)) await main();
