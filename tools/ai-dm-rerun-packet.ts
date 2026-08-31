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

// The two era-specific authorized-plan shapes. Baseline-era entries carry
// acceptedIntent (single choice); post-intel entries carry resolutionSummary
// with actionSlots. Both normalize to NeutralPlanEntry below — the packet must
// never expose either raw shape, because the shape itself identifies the era.
const baselineChoiceSchema = z.object({
  kind: z.string(),
  action_id: z.string().optional(),
  spell_id: z.string().optional(),
  target: z.object({ kind: z.string(), combatant_id: z.string().optional() }).passthrough().nullable().optional(),
}).passthrough();

const currentActionSlotSchema = z.object({
  kind: z.string(),
  actionId: z.string().nullable().optional(),
  spellId: z.string().nullable().optional(),
  objectId: z.string().nullable().optional(),
  targetIds: z.array(z.string()).optional(),
}).passthrough();

// Post-intel executed summary: multi-slot.
const currentResolutionSummarySchema = z.object({
  actionSlots: z.array(currentActionSlotSchema),
}).passthrough();

// Baseline-era executed summary: single action. Real baseline rows carry BOTH
// acceptedIntent and this summary (round-2 review finding, verified against
// harvested R1-10 rows).
const baselineResolutionSummarySchema = z.object({
  actionId: z.string().nullable(),
  targetId: z.string().nullable(),
}).passthrough();

const authorizedPlanEntrySchema = z.object({
  actorId: z.unknown(),
  acceptedIntent: z.object({ choice: baselineChoiceSchema }).passthrough().optional(),
  resolutionSummary: z.union([currentResolutionSummarySchema, baselineResolutionSummarySchema]).optional(),
}).passthrough();

const plannerSchema = z.union([
  z.literal('sim_controller'),
  z.object({ model: z.string(), effort: z.string() }).passthrough(),
  z.null(),
]);

export interface NeutralAction {
  readonly kind: string;
  readonly actionId: string | null;
  readonly targetIds: readonly string[];
}

/** Era-neutral executed-plan entry: the only plan shape a judge may see. */
export interface NeutralPlanEntry {
  readonly actorId: unknown;
  readonly actions: readonly NeutralAction[];
}

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
  // Optional/nullable: pre-intel-era arms have no engineIntel, and the current
  // producer writes null on failed rows. It must never reach the blinded
  // packet — its mere presence identifies the arm.
  engineIntel: engineIntelSchema.nullable().optional(),
  // Post-intel rows label the planner ('model' | 'engine_default'); pre-intel
  // rows have no such field. Attribution uses it when present.
  plannerLabel: z.string().optional(),
  // Required in cross-era mode, where it is the arm partition key.
  repoCommit: z.string().min(1).optional(),
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
  /**
   * Cross-era comparison mode: the two arms ran DIFFERENT code eras against
   * byte-identical frozen room inputs. Arms are partitioned by repoCommit
   * (which every row must carry), because the arena's `arm` label and the
   * canonical-state startingRoomDigest are both era-dependent — the digest
   * hashes the loaded EncounterState, whose shape changes across eras, so
   * cross-arm digest equality is impossible by construction. In this mode the
   * digest check becomes per-arm consistency (same seed must produce the same
   * digest across reps within an arm); room-INPUT identity across eras is an
   * external precondition the runner must verify (byte-compare the frozen
   * seed files) and record.
   */
  readonly crossEra: boolean;
}

interface ValidatedArenaRow {
  readonly seed: number;
  readonly arm: string;
  readonly room: number;
  readonly rep: number;
  readonly startingRoomDigest: string;
  readonly outcome: string;
  readonly plannedBy: z.infer<typeof plannerSchema>;
  readonly plannerLabel: string | undefined;
  readonly roundNarrative: string | null;
  readonly authorizedPlan: readonly z.infer<typeof authorizedPlanEntrySchema>[] | null;
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
  readonly executedPlan: readonly NeutralPlanEntry[] | null;
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
  // Era-identifying: only post-intel arms produce engineIntel, so its presence
  // (not just its contents) unblinds the arm.
  'engineIntel',
  // Era-specific plan-shape keys: any of these surviving into the packet means
  // the executed-plan normalization failed and the entry identifies its era.
  'acceptedIntent', 'acceptedProposal', 'resolutionSummary', 'actionSlots',
  'selectedBranch', 'optionId', 'movementFeet', 'plannerLabel',
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
  let crossEra = false;
  for (let index = 0; index < argumentsValue.length; index += 1) {
    const option = argumentsValue[index];
    if (option === '--cross-era') { crossEra = true; continue; }
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
    crossEra,
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

function validateRow(
  source: JsonRecord,
  sourceLabel: string,
  protocol: RerunProtocol,
  crossEra: boolean,
): ValidatedArenaRow {
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
  if (crossEra && row.repoCommit === undefined) {
    throw new TypeError(`${sourceLabel}.repoCommit is required in cross-era mode (it is the arm partition key).`);
  }
  const { seed, room } = row;
  const arm = crossEra ? `era:${row.repoCommit ?? ''}` : row.arm;
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
    plannerLabel: row.plannerLabel,
    roundNarrative: row.roundNarrative,
    authorizedPlan: row.authorizedPlan,
  };
}

/** Validates the frozen R1-10 experiment shape before anything can be judged. */
export function validateRerunRows(
  rows: readonly JsonRecord[],
  protocol: RerunProtocol = R1_10_PROTOCOL,
  crossEra = false,
): readonly ValidatedArenaRow[] {
  const validated = rows.map((row, index) => validateRow(row, `row ${String(index + 1)}`, protocol, crossEra));
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
      if (!crossEra) {
        const digests = new Set(caseRows.map((row) => row.startingRoomDigest));
        if (digests.size !== 1) {
          throw new TypeError(`Paired arms for seed ${String(seed)} rep ${String(rep)} must use the same frozen room artifact.`);
        }
      }
    }
  }
  if (crossEra) {
    // Cross-era arms cannot share canonical-state digests (state shape differs
    // by era), so the digest invariant becomes: within an arm, every rep of a
    // seed must load the identical room. Cross-era room-INPUT identity is an
    // external precondition, verified by byte-comparing the frozen seed files.
    const perArmSeed = new Map<string, Set<string>>();
    for (const row of validated) {
      const key = `${row.arm}|${String(row.seed)}`;
      const digests = perArmSeed.get(key) ?? new Set<string>();
      digests.add(row.startingRoomDigest);
      perArmSeed.set(key, digests);
    }
    for (const [key, digests] of perArmSeed) {
      if (digests.size !== 1) {
        throw new TypeError(`Cross-era arm/seed ${key} loaded ${String(digests.size)} distinct room states across reps; the frozen room must be identical within an arm.`);
      }
    }
  }
  if (validated.length !== protocol.seeds.length * protocol.reps * arms.length) {
    throw new TypeError('R1-10 rows contain duplicate or unregistered seed/rep/arm entries.');
  }
  return validated;
}

function engineAttribution(row: ValidatedArenaRow): JudgePacketEntry['attribution'] {
  if (
    row.outcome === 'auto_resolved' ||
    row.plannedBy === 'sim_controller' ||
    row.plannerLabel === 'engine_default'
  ) return 'engine_default';
  if (row.outcome === 'authorized' && row.plannedBy !== null && typeof row.plannedBy === 'object') {
    return 'model_authorized';
  }
  return 'not_model_authorized';
}

function neutralActions(plan: z.infer<typeof authorizedPlanEntrySchema>): readonly NeutralAction[] {
  // Id preference (actionId over spellId over objectId) is deterministic but
  // only data-verified for the action kinds present in R1-10 rows (attack,
  // dodge, direct combatant targets). A rerun whose rows include spell or
  // world-object actions must re-verify id equivalence across eras first
  // (round-2 review finding 5, accepted as a known limitation).
  const summary = plan.resolutionSummary;
  if (summary !== undefined) {
    const current = currentResolutionSummarySchema.safeParse(summary);
    if (current.success) {
      return current.data.actionSlots.map((slot) => ({
        kind: slot.kind,
        actionId: slot.actionId ?? slot.spellId ?? slot.objectId ?? null,
        targetIds: slot.targetIds ?? [],
      }));
    }
    const baseline = baselineResolutionSummarySchema.safeParse(summary);
    if (baseline.success) {
      // Baseline-era executed summary; the action kind lives on the intent.
      // Never fabricate a kind — a summary without its intent is malformed.
      if (plan.acceptedIntent === undefined) {
        throw new TypeError('baseline resolutionSummary without acceptedIntent; refusing to fabricate an action kind.');
      }
      return [{
        kind: plan.acceptedIntent.choice.kind,
        actionId: baseline.data.actionId,
        targetIds: baseline.data.targetId === null ? [] : [baseline.data.targetId],
      }];
    }
  }
  if (plan.acceptedIntent !== undefined) {
    const choice = plan.acceptedIntent.choice;
    const target = choice.target;
    return [{
      kind: choice.kind,
      actionId: choice.action_id ?? choice.spell_id ?? null,
      targetIds: target?.combatant_id === undefined ? [] : [target.combatant_id],
    }];
  }
  // Fail loud: an unrecognized plan shape must never silently become an empty
  // (and thereby era-identifying) entry.
  throw new TypeError('authorizedPlan entry matches neither known era shape.');
}

function executedPlan(
  value: ValidatedArenaRow['authorizedPlan'],
): readonly NeutralPlanEntry[] | null {
  if (value === null) return null;
  return value.map((plan) => ({
    actorId: plan.actorId,
    actions: neutralActions(plan),
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
  crossEra = false,
): { readonly packet: JudgePacket; readonly answerKey: RerunAnswerKey } {
  if (!Number.isSafeInteger(shuffleSeed)) throw new TypeError('shuffleSeed must be a safe integer.');
  const validated = [...validateRerunRows(rows, protocol, crossEra)]
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
  const result = buildRerunPacket(rows, config.shuffleSeed, R1_10_PROTOCOL, config.crossEra);
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
const PACKET_FLAGS = ['--input', '--packet', '--answer-key', '--shuffle-seed', '--cross-era'];
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-rerun-packet.ts') || invokedPath.endsWith('\\ai-dm-rerun-packet.ts') ||
  ((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')) &&
    // Any recognized flag routes into main(), so an incomplete command fails
    // loudly in the parser instead of silently exiting 0.
    PACKET_FLAGS.some((flag) => process.argv.includes(flag)))
)) await main();
