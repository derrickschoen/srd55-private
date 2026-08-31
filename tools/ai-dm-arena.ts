import { access, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  CONVERSATION_CLIS,
  CONVERSATION_EFFORTS,
  COMBAT_MODELS,
  runConversation,
  type ConversationCli,
  type ConversationEffort,
  type ConversationRunOptions,
  type ConversationTokenCounts,
  type CombatModel,
} from './ai-dm-conversation';
import type { UnattendedReactionAskDefault } from '../src/vtt/reaction-offer-host-policy';
import type { AgentSessionAdapter } from '../src/vtt/agent-session';
import type { DmIntelCapture } from '../src/vtt/dm-tactical-intel';
import type { LocalOpenAiConfig, LocalThinkMode } from '../src/vtt/agent-adapters/local-openai';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import {
  applyRoomInitiativeProfile,
  generateRoom,
  ROOM_INITIATIVE_PROFILES,
  type RoomInitiativeProfile,
} from '../src/vtt/room-generator';
import {
  DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
  SCRIPTED_PARTY_DECISION_POLICIES,
  type ScriptedPartyDecisionPolicy,
} from '../src/vtt/scripted-party-round';

export const ARENA_BASES = ['standard', 'hard', 'brutal'] as const;
export type ArenaBasis = (typeof ARENA_BASES)[number];

export interface ArenaArm {
  readonly label: string;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly escalationModel: string | null;
  readonly escalationEffort: ConversationEffort | null;
  readonly combatModel: CombatModel;
}

export interface ArenaConfig {
  readonly combatModel: CombatModel;
  readonly initiativeProfile: RoomInitiativeProfile;
  readonly partyPolicy: ScriptedPartyDecisionPolicy;
  readonly rooms: number;
  readonly reps: number;
  readonly seed: number;
  readonly cli: ConversationCli;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly escalationModel: string | null;
  readonly escalationEffort: ConversationEffort | null;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly cliBin: string;
  readonly timeoutMs: number;
  readonly kbPath: string | null;
  readonly reactionAskDefault: UnattendedReactionAskDefault;
  readonly basis: ArenaBasis;
  readonly interleave: boolean;
  readonly arms: readonly ArenaArm[];
  readonly captureRlData: boolean;
  readonly generateMissingRooms: boolean;
  readonly localOpenAi: LocalOpenAiConfig | null;
}

export interface ArenaRow {
  readonly combatModel: CombatModel;
  readonly roundProtocolVersion: import('./ai-dm-conversation').ConversationRow['roundProtocolVersion'];
  readonly startingRoomDigest: string;
  readonly seed: number;
  readonly basis: ArenaBasis;
  readonly arm: string;
  readonly room: number;
  readonly round: number;
  readonly cli: ConversationCli;
  readonly model: string;
  readonly thinkMode: LocalThinkMode | null;
  readonly kbHash: string | null;
  readonly repoCommit: string;
  readonly rawTurnContext: string;
  readonly turnContextGranularity: 'full' | 'turn_delta';
  readonly snippetHash: string;
  readonly snippetSetHash: string;
  readonly suggestedPlay: import('./ai-dm-conversation').ConversationSuggestedPlay | null;
  readonly suggestionAdopted: import('./ai-dm-conversation').ConversationSuggestionAdoption | null;
  readonly contextRevision: number;
  readonly projectionRevision: number;
  /** Codex rollout ID; locate its full log with a rollout-*-<id>.jsonl glob. */
  readonly sessionId: string | null;
  readonly escalationSessionId: string | null;
  readonly outcome: 'authorized' | 'auto_resolved' | 'awaiting_dm_adjudication' | 'refused' | 'service_null' | 'local_error';
  readonly proposalId: string | null;
  readonly wall: number;
  readonly tokens: ConversationTokenCounts;
  readonly refusals: readonly string[];
  readonly toolCalls: number;
  readonly callsPerRound: number;
  readonly agentDispatched: boolean;
  readonly flapRetries: 0 | 1 | 2;
  readonly serviceNull: boolean;
  readonly contextTruncated: boolean;
  readonly plannedBy: import('./ai-dm-conversation').ConversationPlannerAttribution | null;
  readonly plannerLabel: import('./ai-dm-conversation').ConversationRow['plannerLabel'];
  readonly autoSubmitBlocks: import('./ai-dm-conversation').ConversationRow['autoSubmitBlocks'];
  readonly escalated: boolean;
  readonly escalationModel: string | null;
  readonly authorizedPlan: readonly import('./ai-dm-conversation').ConversationAuthorizedActorPlan[] | null;
  readonly roundNarrative: string | null;
  readonly chainEvidence: import('./ai-dm-conversation').ConversationChainEvidence;
  readonly initiativeOrder: import('./ai-dm-conversation').ConversationRow['initiativeOrder'];
  readonly partyPolicyHash: string | null;
  readonly materialityPolicyHash: string | null;
  readonly engineIntel: DmIntelCapture | null;
  readonly adjustmentBudget: number;
  readonly teamPlans: import('./ai-dm-conversation').ConversationTeamPlans;
  readonly pcTurns: readonly import('./ai-dm-conversation').ConversationPcTurn[];
  readonly adjustments: readonly import('./ai-dm-conversation').ConversationAdjustment[];
  readonly monsterSegments: readonly import('./ai-dm-conversation').ConversationMonsterSegment[];
  readonly roundTotals: import('./ai-dm-conversation').ConversationRow['roundTotals'];
  readonly rlData?: import('./ai-dm-conversation').ConversationRlData;
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
  let interleave = false;
  let captureRlData = false;
  let generateMissingRooms = false;
  const rawArms: string[] = [];
  const rawArmCombatModels: string[] = [];
  for (let index = 0; index < argumentsValue.length; index += 1) {
    const option = argumentsValue[index];
    if (option === '--dry-run') { dryRun = true; continue; }
    if (option === '--interleave') { interleave = true; continue; }
    if (option === '--capture-rl-data') { captureRlData = true; continue; }
    if (option === '--generate-missing-rooms') { generateMissingRooms = true; continue; }
    if (![
      '--rooms', '--reps', '--seed', '--cli', '--model', '--effort', '--out',
      '--escalation-model', '--escalation-effort',
      '--cli-bin', '--timeout-ms', '--kb',
      '--reaction-ask-default',
      '--combat-model', '--initiative-profile', '--arm-combat-model',
      '--party-policy',
      '--basis', '--arm', '--local-base-url', '--local-model', '--local-api-key', '--local-think',
    ].includes(option ?? '')) throw new TypeError(`Unknown arena option ${option ?? '<missing>'}.`);
    const value = requiredValue(argumentsValue, index, option ?? '<missing>');
    if (option === '--arm') rawArms.push(value);
    else if (option === '--arm-combat-model') rawArmCombatModels.push(value);
    else values.set(option ?? '', value);
    index += 1;
  }
  const seed = Number(values.get('--seed'));
  if (!Number.isSafeInteger(seed)) throw new TypeError('--seed must be a safe integer.');
  const outPath = resolve(values.get('--out') ?? '');
  if ((values.get('--out') ?? '').length === 0) throw new TypeError('--out is required.');
  if (pathIsInside(cwd, outPath)) throw new TypeError('--out must be outside the repository working tree.');
  const cli = values.get('--cli') ?? 'codex';
  if (!CONVERSATION_CLIS.includes(cli as ConversationCli)) {
    throw new TypeError('--cli must be codex, claude-code, or local-openai.');
  }
  const effort = values.get('--effort') ?? 'medium';
  if (!CONVERSATION_EFFORTS.includes(effort as ConversationEffort)) {
    throw new TypeError('--effort must be low, medium, high, or xhigh.');
  }
  const escalationModel = values.get('--escalation-model') ?? null;
  const escalationEffort = values.get('--escalation-effort') ?? null;
  if ((escalationModel === null) !== (escalationEffort === null)) {
    throw new TypeError('--escalation-model and --escalation-effort must be supplied together.');
  }
  if (escalationEffort !== null &&
    !CONVERSATION_EFFORTS.includes(escalationEffort as ConversationEffort)) {
    throw new TypeError('--escalation-effort must be low, medium, high, or xhigh.');
  }
  const selectedCli = cli as ConversationCli;
  const hasLocalOption = values.has('--local-base-url') || values.has('--local-model') ||
    values.has('--local-api-key') || values.has('--local-think');
  if (selectedCli !== 'local-openai' && hasLocalOption) {
    throw new TypeError('--local-base-url, --local-model, --local-api-key, and --local-think require --cli local-openai.');
  }
  const localBaseUrl = values.get('--local-base-url');
  const localModel = values.get('--local-model');
  if (selectedCli === 'local-openai' && (localBaseUrl === undefined || localModel === undefined)) {
    throw new TypeError('--cli local-openai requires --local-base-url and --local-model.');
  }
  const localThink = values.get('--local-think') ?? 'off';
  if (localThink !== 'on' && localThink !== 'off') {
    throw new TypeError('--local-think must be on or off.');
  }
  const localOpenAi: LocalOpenAiConfig | null = selectedCli === 'local-openai'
    ? {
        baseUrl: localBaseUrl ?? '',
        model: localModel ?? '',
        thinkMode: localThink,
        ...(values.has('--local-api-key') ? { apiKey: values.get('--local-api-key') ?? '' } : {}),
      }
    : null;
  const kbPath = values.has('--kb') ? resolve(values.get('--kb') ?? '') : null;
  if (kbPath !== null) validateKbPath(cwd, kbPath);
  if (captureRlData && kbPath !== null && !pathIsInside(resolve(cwd, 'tests/fixtures'), kbPath)) {
    throw new TypeError('--capture-rl-data requires a project fixture KB or no KB.');
  }
  const reactionAskDefault = values.get('--reaction-ask-default') ?? 'decline';
  if (reactionAskDefault !== 'decline' && reactionAskDefault !== 'take') {
    throw new TypeError('--reaction-ask-default must be decline or take.');
  }
  const basis = values.get('--basis') ?? 'standard';
  if (!ARENA_BASES.includes(basis as ArenaBasis)) {
    throw new TypeError('--basis must be standard, hard, or brutal.');
  }
  const combatModel = values.get('--combat-model') ?? 'initiative_segments_v1';
  if (!COMBAT_MODELS.includes(combatModel as CombatModel)) {
    throw new TypeError('--combat-model must be monster_block_v1 or initiative_segments_v1.');
  }
  const initiativeProfile = values.get('--initiative-profile') ?? 'derived_v1';
  if (!ROOM_INITIATIVE_PROFILES.includes(initiativeProfile as RoomInitiativeProfile)) {
    throw new TypeError('--initiative-profile must be legacy or derived_v1.');
  }
  const partyPolicy = values.get('--party-policy') ?? DEFAULT_SCRIPTED_PARTY_DECISION_POLICY;
  if (!SCRIPTED_PARTY_DECISION_POLICIES.includes(partyPolicy as ScriptedPartyDecisionPolicy)) {
    throw new TypeError('--party-policy must be heuristic_v0 or symmetric_evaluator_v1.');
  }
  const armCombatModels = new Map<string, CombatModel>();
  for (const raw of rawArmCombatModels) {
    const [label, model, extra] = raw.split(':');
    if (label === undefined || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(label) ||
      model === undefined || extra !== undefined || !COMBAT_MODELS.includes(model as CombatModel)) {
      throw new TypeError('--arm-combat-model must use label:monster_block_v1|initiative_segments_v1 syntax.');
    }
    if (armCombatModels.has(label)) throw new TypeError(`Duplicate --arm-combat-model for ${label}.`);
    armCombatModels.set(label, model as CombatModel);
  }
  const arms = rawArms.map((raw): ArenaArm => {
    const [label, armModel, armEffort, armEscalationModel, armEscalationEffort, extra] = raw.split(':');
    if (label === undefined || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(label) ||
      armModel === undefined || armModel.length === 0 || armEffort === undefined ||
      (armEscalationModel === undefined) !== (armEscalationEffort === undefined) ||
      armEscalationModel === '' || extra !== undefined) {
      throw new TypeError('--arm must use label:model:effort[:escalationModel:escalationEffort] syntax.');
    }
    if (!CONVERSATION_EFFORTS.includes(armEffort as ConversationEffort)) {
      throw new TypeError('--arm effort must be low, medium, high, or xhigh.');
    }
    if (armEscalationEffort !== undefined &&
      !CONVERSATION_EFFORTS.includes(armEscalationEffort as ConversationEffort)) {
      throw new TypeError('--arm escalation effort must be low, medium, high, or xhigh.');
    }
    return {
      label,
      model: armModel,
      effort: armEffort as ConversationEffort,
      escalationModel: armEscalationModel ?? null,
      escalationEffort: armEscalationEffort === undefined
        ? null
        : armEscalationEffort as ConversationEffort,
      combatModel: armCombatModels.get(label) ?? combatModel as CombatModel,
    };
  });
  if (new Set(arms.map((arm) => arm.label)).size !== arms.length) {
    throw new TypeError('--arm labels must be unique.');
  }
  if (interleave && arms.length < 2) {
    throw new TypeError('--interleave requires at least two --arm label:model:effort values.');
  }
  if (!interleave && arms.length > 0) {
    throw new TypeError('--arm is only valid with --interleave.');
  }
  const armLabels = new Set(arms.map((arm) => arm.label));
  const unknownArmModel = [...armCombatModels.keys()].find((label) => !armLabels.has(label));
  if (unknownArmModel !== undefined) {
    throw new TypeError(`--arm-combat-model names unknown arm ${unknownArmModel}.`);
  }
  if (!interleave && armCombatModels.size > 0) {
    throw new TypeError('--arm-combat-model is only valid with --interleave.');
  }
  return {
    combatModel: combatModel as CombatModel,
    initiativeProfile: initiativeProfile as RoomInitiativeProfile,
    partyPolicy: partyPolicy as ScriptedPartyDecisionPolicy,
    rooms: positiveInteger(values.get('--rooms') ?? '', '--rooms'),
    reps: positiveInteger(values.get('--reps') ?? '', '--reps'),
    seed,
    cli: selectedCli,
    model: localOpenAi?.model ?? values.get('--model') ?? (selectedCli === 'codex' ? 'gpt-5.6-sol' : 'sonnet'),
    effort: effort as ConversationEffort,
    escalationModel,
    escalationEffort: escalationEffort as ConversationEffort | null,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : selectedCli === 'claude-code' ? 'claude' : ''),
    timeoutMs: positiveInteger(values.get('--timeout-ms') ?? '120000', '--timeout-ms'),
    kbPath,
    reactionAskDefault,
    basis: basis as ArenaBasis,
    interleave,
    arms,
    captureRlData,
    generateMissingRooms,
    localOpenAi,
  };
}

export interface ArenaRunOptions extends Omit<
  ConversationRunOptions,
  'roomStates' | 'onPrimaryDispatchStart' | 'partyPolicyOverride'
> {
  readonly adapterByArm?: Readonly<Record<string, AgentSessionAdapter>>;
  readonly heartbeat?: (line: string) => void;
}

function stdoutHeartbeat(line: string): void {
  process.stdout.write(`[arena] ${line}\n`);
}

function basisFixturesPath(config: ArenaConfig): string {
  return resolve(config.cwd, config.basis === 'hard'
    ? 'tests/fixtures/arena-basis-hard'
    : 'tests/fixtures/arena-basis');
}

async function frozenRoomStates(config: ArenaConfig): Promise<readonly import('../src/combat/encounter').EncounterState[]> {
  const fixturesPath = basisFixturesPath(config);
  return Promise.all(Array.from({ length: config.rooms }, async (_unused, index) => {
    const seed = config.seed + index;
    const fixturePath = resolve(fixturesPath, `seed-${String(seed)}.json`);
    try {
      await access(fixturePath);
      return applyRoomInitiativeProfile(await loadArenaFixture(fixturePath), config.initiativeProfile);
    } catch (error) {
      if (!config.generateMissingRooms || !(error instanceof Error) ||
        !('code' in error) || error.code !== 'ENOENT') throw error;
      return generateRoom(seed, {
        difficulty: config.basis,
        initiativeProfile: config.initiativeProfile,
      }).encounter.state;
    }
  }));
}

function arenaRows(
  config: ArenaConfig,
  rows: readonly import('./ai-dm-conversation').ConversationRow[],
  arm: string,
  seeds: readonly number[],
): readonly ArenaRow[] {
  return rows.map((row): ArenaRow => ({
    combatModel: row.combatModel,
    roundProtocolVersion: row.roundProtocolVersion,
    startingRoomDigest: row.startingRoomDigest,
    seed: seeds[row.room - 1]!,
    basis: config.basis,
    arm,
    room: row.room,
    round: row.round,
    cli: row.cli,
    model: row.model,
    thinkMode: row.thinkMode,
    kbHash: row.kbHash,
    repoCommit: row.repoCommit,
    rawTurnContext: row.rawTurnContext,
    turnContextGranularity: row.turnContextGranularity,
    snippetHash: row.snippetHash,
    snippetSetHash: row.snippetSetHash,
    suggestedPlay: row.suggestedPlay,
    suggestionAdopted: row.suggestionAdopted,
    contextRevision: row.contextRevision,
    projectionRevision: row.projectionRevision,
    sessionId: row.sessionId,
    escalationSessionId: row.escalationSessionId,
    outcome: row.outcome,
    proposalId: row.proposalId,
    wall: row.wallPerCreature,
    tokens: row.tokens,
    refusals: row.refusals,
    toolCalls: row.toolCalls,
    callsPerRound: row.callsPerRound,
    agentDispatched: row.agentDispatched,
    flapRetries: row.flapRetries,
    serviceNull: row.serviceNull,
    contextTruncated: row.contextTruncated,
    plannedBy: row.plannedBy,
    plannerLabel: row.plannerLabel,
    autoSubmitBlocks: row.autoSubmitBlocks,
    escalated: row.escalated,
    escalationModel: row.escalationModel,
    authorizedPlan: row.authorizedPlan,
    roundNarrative: row.roundNarrative,
    chainEvidence: row.chainEvidence,
    initiativeOrder: row.initiativeOrder,
    partyPolicyHash: row.partyPolicyHash,
    materialityPolicyHash: row.materialityPolicyHash,
    engineIntel: row.engineIntel,
    adjustmentBudget: row.adjustmentBudget,
    teamPlans: row.teamPlans,
    pcTurns: row.pcTurns,
    adjustments: row.adjustments,
    monsterSegments: row.monsterSegments,
    roundTotals: row.roundTotals,
    ...(row.rlData === undefined ? {} : { rlData: row.rlData }),
  }));
}

function conversationConfig(
  config: ArenaConfig,
  overrides: {
    readonly rooms: number;
    readonly rounds: number;
    readonly model: string;
    readonly effort: ConversationEffort;
    readonly escalationModel: string | null;
    readonly escalationEffort: ConversationEffort | null;
    readonly outPath: string;
    readonly combatModel?: CombatModel;
  },
): import('./ai-dm-conversation').ConversationConfig {
  return {
    combatModel: overrides.combatModel ?? config.combatModel,
    initiativeProfile: config.initiativeProfile,
    partyPolicy: config.partyPolicy,
    fixturesPath: basisFixturesPath(config),
    rooms: overrides.rooms,
    rounds: overrides.rounds,
    cli: config.cli,
    model: overrides.model,
    effort: overrides.effort,
    escalationModel: overrides.escalationModel,
    escalationEffort: overrides.escalationEffort,
    outPath: overrides.outPath,
    dryRun: config.dryRun,
    cwd: config.cwd,
    cliBin: config.cliBin,
    timeoutMs: config.timeoutMs,
    kbPath: config.kbPath,
    reactionAskDefault: config.reactionAskDefault,
    captureRlData: config.captureRlData,
    localOpenAi: config.localOpenAi === null ? null : {
      ...config.localOpenAi,
      model: overrides.model,
    },
  };
}

export async function runArena(
  config: ArenaConfig,
  options: ArenaRunOptions = {},
): Promise<readonly ArenaRow[]> {
  const states = await frozenRoomStates(config);
  const seeds = Array.from({ length: config.rooms }, (_unused, index) => config.seed + index);
  const { adapterByArm, heartbeat = stdoutHeartbeat, ...conversationOptions } = options;
  let rows: readonly ArenaRow[];
  if (!config.interleave) {
    const result = await runConversation(conversationConfig(config, {
      rooms: config.rooms,
      rounds: config.reps,
      model: config.model,
      effort: config.effort,
      escalationModel: config.escalationModel,
      escalationEffort: config.escalationEffort,
      outPath: config.outPath,
    }), { ...conversationOptions, roomStates: states });
    rows = arenaRows(config, result.rows, 'single', seeds);
  } else {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'dnd-ai-dm-arena-interleaved-'));
    const interleaved: ArenaRow[] = [];
    heartbeat(
      `interleave scheduling started arms=${String(config.arms.length)} ` +
      `rooms=${String(config.rooms)} reps=${String(config.reps)}`,
    );
    for (let room = 1; room <= config.rooms; room += 1) {
      for (let rep = 1; rep <= config.reps; rep += 1) {
        const pendingResults: Promise<import('./ai-dm-conversation').ConversationRunResult>[] = [];
        for (const arm of config.arms) {
          let markDispatchStarted = (): void => {
            throw new Error('Interleave dispatch gate was not initialized.');
          };
          const dispatchStarted = new Promise<void>((resolvePromise) => {
            markDispatchStarted = resolvePromise;
          });
          let announced = false;
          const pendingResult = runConversation(conversationConfig(config, {
            rooms: 1,
            rounds: 1,
            model: arm.model,
            effort: arm.effort,
            escalationModel: arm.escalationModel ?? config.escalationModel,
            escalationEffort: arm.escalationEffort ?? config.escalationEffort,
            outPath: resolve(temporaryDirectory, `${String(room)}-${String(rep)}-${arm.label}.jsonl`),
            combatModel: arm.combatModel,
          }), {
            ...conversationOptions,
            ...(adapterByArm?.[arm.label] === undefined ? {} : { adapter: adapterByArm[arm.label] }),
            roomStates: [structuredClone(states[room - 1]!)],
            onPrimaryDispatchStart: () => {
              if (announced) return;
              announced = true;
              heartbeat(
                `dispatch room=${String(room)} rep=${String(rep)} arm=${arm.label} ` +
                `model=${arm.model} effort=${arm.effort}`,
              );
              markDispatchStarted();
            },
          });
          pendingResults.push(pendingResult);
          await Promise.race([
            dispatchStarted,
            pendingResult.then(() => {
              throw new Error(`Interleaved arena arm ${arm.label} completed without a primary dispatch.`);
            }),
          ]);
        }
        const results = await Promise.all(pendingResults);
        for (let armIndex = 0; armIndex < config.arms.length; armIndex += 1) {
          const arm = config.arms[armIndex]!;
          const result = results[armIndex]!;
          const [row] = arenaRows(config, result.rows, arm.label, [seeds[room - 1]!]);
          if (row === undefined) throw new Error('Interleaved arena unit produced no row.');
          interleaved.push({ ...row, room, round: rep });
        }
      }
    }
    rows = interleaved;
  }
  await writeFile(config.outPath, rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');
  return rows;
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/ai-dm-arena.ts') || argument.endsWith('\\ai-dm-arena.ts'));
  const argumentsValue = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  await runArena(parseArenaArgs(argumentsValue));
}

const invokedPath = process.argv[1];
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-arena.ts') || invokedPath.endsWith('\\ai-dm-arena.ts') ||
  ((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')) &&
    process.argv.includes('--rooms') && process.argv.includes('--seed'))
)) await main();
