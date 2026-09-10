import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  CONVERSATION_CLIS,
  CONVERSATION_EFFORTS,
  CONVERSATION_TRANSPORTS,
  BOARD_IMAGE_MODES,
  COMBAT_MODELS,
  boardImageOutputDirectory,
  runConversation,
  type ConversationCli,
  type ConversationEffort,
  type ConversationRowPersisted,
  type ConversationRunOptions,
  type ConversationTransport,
  type CombatModel,
  type BoardImageMode,
  type ConversationBoardSnapshotService,
  type TurnContextRenderEvidence,
} from './ai-dm-conversation';
import { BoardSnapshotService } from './ai-dm-board-snapshot';
import {
  DEFAULT_OVERRIDE_POLICY,
  OVERRIDE_POLICIES,
  TURN_CONTEXT_MAX_BYTES,
  type IntelMode,
  type OverridePolicy,
} from '../src/vtt/mcp/engine-server';
import type { UnattendedReactionAskDefault } from '../src/vtt/reaction-offer-host-policy';
import {
  AGENT_SKILL_NAMES,
  type AgentInstructionSource,
  type AgentSessionAdapter,
  type AgentSkillName,
} from '../src/vtt/agent-session';
import type { LocalOpenAiConfig } from '../src/vtt/agent-adapters/local-openai';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { decodeArenaBasisEnvelopeV1 } from '../src/vtt/arena-fixture';
import { decodeChallengeRoomProvenanceV1 } from '../src/vtt/challenge-room-fixture';
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
import {
  DEFAULT_RENDERER_PROFILE,
  circumstanceFeatureVectorSchema,
  rendererProfileSchema,
  type RendererProfile,
} from '../src/vtt/renderer-profile';
import { DEFAULT_AI_DM_KB_ROOT } from '../src/vtt/knowledge-base-contract';

export const ARENA_BASES = ['standard', 'hard', 'brutal', 'brutal-b', 'scenario', 'challenge'] as const;
export type ArenaBasis = (typeof ARENA_BASES)[number];

export interface ArenaProbeVerdict {
  readonly scenario: 'hypnotic-pattern-cc';
  readonly chose_control: boolean;
  readonly selected_instead: null | {
    readonly kind: 'cast_spell' | 'action';
    readonly id: string;
  };
}

interface ArenaArmBase {
  readonly label: string;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly escalationModel: string | null;
  readonly escalationEffort: ConversationEffort | null;
  readonly combatModel: CombatModel;
  readonly overridePolicy: OverridePolicy;
}

export type ArenaArm = ArenaArmBase & AgentInstructionSource;

export interface ArenaExperimentPolicy {
  readonly roundWallMs: 180000;
  readonly basisDirectory: string | null;
}

export interface ArenaArmInstruction {
  readonly label: string;
  readonly source: AgentInstructionSource;
}

interface ArenaConfigBase {
  readonly intelMode: IntelMode;
  readonly overridePolicy: OverridePolicy;
  readonly rendererProfile: RendererProfile;
  readonly turnContextMaximumBytes: number;
  readonly combatModel: CombatModel;
  readonly initiativeProfile: RoomInitiativeProfile;
  readonly partyPolicy: ScriptedPartyDecisionPolicy;
  readonly rooms: number;
  readonly reps: number;
  readonly seed: number;
  readonly cli: ConversationCli;
  readonly decisionTransport: ConversationTransport;
  readonly model: string;
  readonly effort: ConversationEffort;
  readonly escalationModel: string | null;
  readonly escalationEffort: ConversationEffort | null;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly cliBin: string;
  readonly timeoutMs: number;
  readonly reactionAskDefault: UnattendedReactionAskDefault;
  readonly basis: ArenaBasis;
  readonly interleave: boolean;
  readonly arms: readonly ArenaArm[];
  readonly captureRlData: boolean;
  readonly generateMissingRooms: boolean;
  readonly localOpenAi: LocalOpenAiConfig | null;
  readonly boardImageMode: BoardImageMode;
  readonly experimentPolicy: ArenaExperimentPolicy;
  readonly armInstructions: readonly ArenaArmInstruction[];
}

export type ArenaConfig = ArenaConfigBase & AgentInstructionSource;

interface ArenaExtras {
  readonly seed: number;
  readonly basis: ArenaBasis;
  readonly probeVerdict: ArenaProbeVerdict | null;
  readonly arm: string;
  readonly wall: number;
}

function conversationPart(row: ConversationRowPersisted) {
  return {
    ...row,
    hiddenOptions: structuredClone(row.hiddenOptions),
    rendererAttribution: {
      policyVersion: row.rendererAttribution.policyVersion,
      profile: rendererProfileSchema.parse(row.rendererAttribution.profile),
    },
    circumstanceFeatures: circumstanceFeatureVectorSchema.parse(row.circumstanceFeatures),
    kbReads: mapConversationKbReads(row),
    callUsage: structuredClone(row.callUsage),
  } satisfies ConversationRowPersisted;
}

export type ArenaConversationPart = ReturnType<typeof conversationPart>;
export type ArenaRow = ArenaConversationPart & ArenaExtras;

export type DecodedArenaRowEvidence =
  | {
      readonly era: 'increment_2';
      readonly effort: ConversationEffort;
      readonly escalationEffort: ConversationEffort | null;
      readonly boardImage: ConversationRowPersisted['boardImage'];
    }
  | {
      readonly era: 'd510_legacy';
      readonly effort: null;
      readonly escalationEffort: null;
      readonly boardImage: null;
    };

function rowRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena row must be an object.');
  }
  return value as Readonly<Record<string, unknown>>;
}

function decodedBoardImage(value: unknown): ConversationRowPersisted['boardImage'] {
  const image = rowRecord(value);
  if (image['mode'] === 'off' && Object.keys(image).length === 1) return { mode: 'off' };
  const mode = image['mode'];
  if ((mode !== 'png' && mode !== 'capture_only') || Object.keys(image).some((key) => ![
    'mode', 'sha256', 'bytes', 'width', 'height', 'captureMs', 'relativePath',
  ].includes(key)) || typeof image['sha256'] !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(image['sha256']) ||
    image['relativePath'] !== `board-images/${image['sha256']}.png` ||
    !Number.isSafeInteger(image['bytes']) || typeof image['bytes'] !== 'number' ||
    image['bytes'] < 24 || image['bytes'] > 1_000_000 ||
    !Number.isSafeInteger(image['width']) || typeof image['width'] !== 'number' || image['width'] < 1 ||
    !Number.isSafeInteger(image['height']) || typeof image['height'] !== 'number' || image['height'] < 1 ||
    typeof image['captureMs'] !== 'number' || !Number.isFinite(image['captureMs']) || image['captureMs'] < 0) {
    throw new TypeError('Arena row boardImage violates the closed off|png|capture_only contract.');
  }
  return {
    mode,
    sha256: image['sha256'],
    bytes: image['bytes'],
    width: image['width'],
    height: image['height'],
    captureMs: image['captureMs'],
    relativePath: image['relativePath'] as `board-images/${string}.png`,
  };
}

export function decodeArenaRowEvidence(
  value: unknown,
  era: 'increment_2' | 'd510_legacy',
): DecodedArenaRowEvidence {
  const row = rowRecord(value);
  if (era === 'd510_legacy') {
    if (row['effort'] !== undefined || row['escalationEffort'] !== undefined ||
      row['boardImage'] !== undefined) {
      throw new TypeError('D510 legacy row must not claim Increment 2 evidence fields.');
    }
    return { era, effort: null, escalationEffort: null, boardImage: null };
  }
  const effort = row['effort'];
  const escalationEffort = row['escalationEffort'];
  if (!CONVERSATION_EFFORTS.includes(effort as ConversationEffort)) {
    throw new TypeError('Increment 2 arena row requires a valid effort field.');
  }
  if (escalationEffort !== null &&
    !CONVERSATION_EFFORTS.includes(escalationEffort as ConversationEffort)) {
    throw new TypeError('Increment 2 arena row requires escalationEffort to be null or valid.');
  }
  if (!Object.hasOwn(row, 'boardImage')) {
    throw new TypeError('Increment 2 arena row requires boardImage evidence.');
  }
  return {
    era,
    effort: effort as ConversationEffort,
    escalationEffort: escalationEffort as ConversationEffort | null,
    boardImage: decodedBoardImage(row['boardImage']),
  };
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
  if (!pathIsInside(resolve(cwd, 'tests/fixtures/ai-dm-kb'), candidate)) {
    throw new TypeError('--kb must name a root under tests/fixtures/ai-dm-kb.');
  }
}

function parsedInstructionSource(
  values: ReadonlyMap<string, string>,
  cwd: string,
  cli: ConversationCli,
): AgentInstructionSource {
  const source = values.get('--instruction-source') ?? (values.has('--kb') ? 'kb' : 'none');
  const skill = values.get('--skill');
  if (source !== 'none' && source !== 'kb' && source !== 'skill') {
    throw new TypeError('--instruction-source must be none, kb, or skill.');
  }
  if (source !== 'skill' && skill !== undefined) {
    throw new TypeError('--skill requires --instruction-source skill.');
  }
  if (source === 'skill') {
    if (cli !== 'codex') throw new TypeError('--instruction-source skill requires --cli codex.');
    if (values.has('--kb')) throw new TypeError('--kb cannot be combined with --instruction-source skill.');
    if (!AGENT_SKILL_NAMES.includes(skill as AgentSkillName)) {
      throw new TypeError('--skill must be engine-submission or dm-round.');
    }
    return { instructionSource: 'skill', skill: skill as AgentSkillName, kbPath: null };
  }
  if (source === 'kb') {
    const kbPath = resolve(cwd, values.get('--kb') ?? DEFAULT_AI_DM_KB_ROOT);
    validateKbPath(cwd, kbPath);
    return { instructionSource: 'kb', skill: null, kbPath };
  }
  if (values.has('--kb')) throw new TypeError('--kb requires --instruction-source kb.');
  return { instructionSource: 'none', skill: null };
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
  const rawArmOverridePolicies: string[] = [];
  const rawArmInstructionSources: string[] = [];
  const rawArmKbs: string[] = [];
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
      '--instruction-source', '--skill',
      '--reaction-ask-default',
      '--transport',
      '--combat-model', '--initiative-profile', '--arm-combat-model', '--arm-override-policy',
      '--party-policy',
      '--intel-mode',
      '--override-policy',
      '--renderer-profile',
      '--turn-context-max-bytes',
      '--board-image',
      '--round-wall-ms', '--basis-dir', '--arm-instruction-source', '--arm-kb',
      '--basis', '--arm', '--local-base-url', '--local-model', '--local-api-key', '--local-think',
    ].includes(option ?? '')) throw new TypeError(`Unknown arena option ${option ?? '<missing>'}.`);
    const value = requiredValue(argumentsValue, index, option ?? '<missing>');
    if (option === '--arm') rawArms.push(value);
    else if (option === '--arm-combat-model') rawArmCombatModels.push(value);
    else if (option === '--arm-override-policy') rawArmOverridePolicies.push(value);
    else if (option === '--arm-instruction-source') rawArmInstructionSources.push(value);
    else if (option === '--arm-kb') rawArmKbs.push(value);
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
  const transport = values.get('--transport') ?? 'mcp_minimal';
  if (!CONVERSATION_TRANSPORTS.includes(transport as ConversationTransport)) {
    throw new TypeError('--transport must be mcp_minimal or final_indices.');
  }
  if (transport === 'final_indices' && selectedCli !== 'codex') {
    throw new TypeError('--transport final_indices currently requires --cli codex.');
  }
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
  const instructionSource = parsedInstructionSource(values, cwd, selectedCli);
  const roundWallMs = positiveInteger(
    values.get('--round-wall-ms') ?? '180000',
    '--round-wall-ms',
  );
  if (roundWallMs !== 180_000) {
    throw new TypeError('--round-wall-ms must be exactly 180000.');
  }
  const basisDirectory = values.has('--basis-dir')
    ? resolve(cwd, values.get('--basis-dir') ?? '')
    : null;
  const reactionAskDefault = values.get('--reaction-ask-default') ?? 'decline';
  if (reactionAskDefault !== 'decline' && reactionAskDefault !== 'take') {
    throw new TypeError('--reaction-ask-default must be decline or take.');
  }
  const basis = values.get('--basis') ?? 'standard';
  if (!ARENA_BASES.includes(basis as ArenaBasis)) {
    throw new TypeError('--basis must be standard, hard, brutal, brutal-b, scenario, or challenge.');
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
  const intelMode = values.get('--intel-mode') ?? 'full';
  if (intelMode !== 'full' && intelMode !== 'off') {
    throw new TypeError('--intel-mode must be full or off.');
  }
  const overridePolicy = values.get('--override-policy') ?? DEFAULT_OVERRIDE_POLICY;
  if (!OVERRIDE_POLICIES.includes(overridePolicy as OverridePolicy)) {
    throw new TypeError('--override-policy must be strict or typed_reason.');
  }
  const rendererProfile = values.has('--renderer-profile')
    ? rendererProfileSchema.parse(JSON.parse(values.get('--renderer-profile') ?? ''))
    : DEFAULT_RENDERER_PROFILE;
  const turnContextMaximumBytes = positiveInteger(
    values.get('--turn-context-max-bytes') ?? String(TURN_CONTEXT_MAX_BYTES),
    '--turn-context-max-bytes',
  );
  const boardImageMode = values.get('--board-image') ?? 'off';
  if (!BOARD_IMAGE_MODES.includes(boardImageMode as BoardImageMode)) {
    throw new TypeError('--board-image must be off, png, or capture_only.');
  }
  if (boardImageMode === 'png' && selectedCli === 'local-openai') {
    throw new TypeError('--board-image png requires an MCP-backed CLI.');
  }
  if (boardImageMode === 'png' && transport !== 'mcp_minimal') {
    throw new TypeError('--board-image png requires --transport mcp_minimal.');
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
  const armOverridePolicies = new Map<string, OverridePolicy>();
  for (const raw of rawArmOverridePolicies) {
    const [label, policy, extra] = raw.split(':');
    if (label === undefined || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(label) ||
      policy === undefined || extra !== undefined || !OVERRIDE_POLICIES.includes(policy as OverridePolicy)) {
      throw new TypeError('--arm-override-policy must use label:strict|typed_reason syntax.');
    }
    if (armOverridePolicies.has(label)) {
      throw new TypeError(`Duplicate --arm-override-policy for ${label}.`);
    }
    armOverridePolicies.set(label, policy as OverridePolicy);
  }
  const armInstructionKinds = new Map<string, 'none' | 'kb'>();
  for (const raw of rawArmInstructionSources) {
    const [label, source, extra] = raw.split(':');
    if (label === undefined || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(label) ||
      (source !== 'none' && source !== 'kb') || extra !== undefined) {
      throw new TypeError('--arm-instruction-source must use LABEL:none|kb syntax.');
    }
    if (armInstructionKinds.has(label)) {
      throw new TypeError(`Duplicate --arm-instruction-source for ${label}.`);
    }
    armInstructionKinds.set(label, source);
  }
  const armKbPaths = new Map<string, string>();
  for (const raw of rawArmKbs) {
    const separator = raw.indexOf(':');
    const label = separator < 0 ? '' : raw.slice(0, separator);
    const path = separator < 0 ? '' : raw.slice(separator + 1);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(label) || path.length === 0) {
      throw new TypeError('--arm-kb must use LABEL:PATH syntax.');
    }
    if (armKbPaths.has(label)) throw new TypeError(`Duplicate --arm-kb for ${label}.`);
    armKbPaths.set(label, resolve(cwd, path));
  }
  const armInstructions = [...armInstructionKinds].map(([label, source]): ArenaArmInstruction => {
    const kbPath = armKbPaths.get(label);
    if (source === 'kb' && kbPath === undefined) {
      throw new TypeError(`--arm-instruction-source ${label}:kb requires --arm-kb ${label}:PATH.`);
    }
    if (source === 'none' && kbPath !== undefined) {
      throw new TypeError(`--arm-kb ${label}:PATH requires --arm-instruction-source ${label}:kb.`);
    }
    return {
      label,
      source: source === 'kb'
        ? { instructionSource: 'kb', skill: null, kbPath: kbPath ?? '' }
        : { instructionSource: 'none', skill: null },
    };
  });
  const orphanArmKb = [...armKbPaths.keys()].find((label) => !armInstructionKinds.has(label));
  if (orphanArmKb !== undefined) {
    throw new TypeError(`--arm-kb ${orphanArmKb}:PATH requires --arm-instruction-source ${orphanArmKb}:kb.`);
  }
  const knowledgeBundlePaths = armInstructions.flatMap((entry) =>
    entry.source.instructionSource === 'kb' ? [entry.source.kbPath] : []);
  if (new Set(knowledgeBundlePaths).size > 1) {
    throw new TypeError('All KB-steered arms must use the same frozen knowledge bundle.');
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
    const armInstruction = armInstructions.find((entry) => entry.label === label)?.source ?? instructionSource;
    return {
      ...armInstruction,
      label,
      model: armModel,
      effort: armEffort as ConversationEffort,
      escalationModel: armEscalationModel ?? null,
      escalationEffort: armEscalationEffort === undefined
        ? null
        : armEscalationEffort as ConversationEffort,
      combatModel: armCombatModels.get(label) ?? combatModel as CombatModel,
      overridePolicy: armOverridePolicies.get(label) ?? overridePolicy as OverridePolicy,
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
  const unknownInstructionArm = armInstructions.find((entry) => !armLabels.has(entry.label));
  if (unknownInstructionArm !== undefined) {
    throw new TypeError(`--arm-instruction-source names unknown arm ${unknownInstructionArm.label}.`);
  }
  for (const arm of arms) {
    if ((arm.label.includes('baseline') || arm.label === 'sol-high') &&
      arm.instructionSource !== 'none') {
      throw new TypeError(`Arena arm ${arm.label} must use instruction source none.`);
    }
  }
  if (!interleave && armInstructions.length > 0) {
    throw new TypeError('--arm-instruction-source is only valid with --interleave.');
  }
  const unknownArmModel = [...armCombatModels.keys()].find((label) => !armLabels.has(label));
  if (unknownArmModel !== undefined) {
    throw new TypeError(`--arm-combat-model names unknown arm ${unknownArmModel}.`);
  }
  if (!interleave && armCombatModels.size > 0) {
    throw new TypeError('--arm-combat-model is only valid with --interleave.');
  }
  const unknownArmPolicy = [...armOverridePolicies.keys()].find((label) => !armLabels.has(label));
  if (unknownArmPolicy !== undefined) {
    throw new TypeError(`--arm-override-policy names unknown arm ${unknownArmPolicy}.`);
  }
  if (!interleave && armOverridePolicies.size > 0) {
    throw new TypeError('--arm-override-policy is only valid with --interleave.');
  }
  const rooms = positiveInteger(values.get('--rooms') ?? '', '--rooms');
  if (basis === 'challenge') {
    if (seed !== 5_831_001) throw new TypeError('The challenge basis requires --seed 5831001.');
    if (rooms > 4) throw new RangeError('The challenge basis contains exactly four consecutive rooms.');
    if (generateMissingRooms) throw new TypeError('--generate-missing-rooms is unavailable for the closed challenge basis.');
  }
  return {
    intelMode,
    overridePolicy: overridePolicy as OverridePolicy,
    rendererProfile,
    turnContextMaximumBytes,
    combatModel: combatModel as CombatModel,
    initiativeProfile: initiativeProfile as RoomInitiativeProfile,
    partyPolicy: partyPolicy as ScriptedPartyDecisionPolicy,
    rooms,
    reps: positiveInteger(values.get('--reps') ?? '', '--reps'),
    seed,
    cli: selectedCli,
    decisionTransport: transport as ConversationTransport,
    model: localOpenAi?.model ?? values.get('--model') ?? (selectedCli === 'codex' ? 'gpt-5.6-sol' : 'sonnet'),
    effort: effort as ConversationEffort,
    escalationModel,
    escalationEffort: escalationEffort as ConversationEffort | null,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : selectedCli === 'claude-code' ? 'claude' : ''),
    timeoutMs: positiveInteger(values.get('--timeout-ms') ?? '120000', '--timeout-ms'),
    ...instructionSource,
    reactionAskDefault,
    basis: basis as ArenaBasis,
    interleave,
    arms,
    captureRlData,
    generateMissingRooms,
    localOpenAi,
    boardImageMode: boardImageMode as BoardImageMode,
    experimentPolicy: { roundWallMs: 180_000, basisDirectory },
    armInstructions,
  };
}

export interface ArenaRunOptions extends Omit<
  ConversationRunOptions,
  'roomStates' | 'onPrimaryDispatchStart' | 'partyPolicyOverride' | 'boardSnapshotService'
> {
  readonly adapterByArm?: Readonly<Record<string, AgentSessionAdapter>>;
  readonly heartbeat?: (line: string) => void;
  readonly fixtureStates?: readonly import('../src/combat/encounter').EncounterState[];
}

function stdoutHeartbeat(line: string): void {
  process.stdout.write(`[arena] ${line}\n`);
}

export function basisFixturesPath(config: Pick<ArenaConfig, 'cwd' | 'basis' | 'experimentPolicy'>): string {
  if (config.experimentPolicy.basisDirectory !== null) {
    return config.experimentPolicy.basisDirectory;
  }
  const basis = config.basis;
  switch (basis) {
    case 'standard': return resolve(config.cwd, 'tests/fixtures/arena-basis');
    case 'hard': return resolve(config.cwd, 'tests/fixtures/arena-basis-hard');
    case 'brutal': return resolve(config.cwd, 'tests/fixtures/arena-basis-brutal');
    case 'brutal-b': return resolve(config.cwd, 'tests/fixtures/arena-basis-brutal-b');
    case 'scenario': return resolve(config.cwd, 'tests/fixtures/arena-scenarios');
    case 'challenge': return resolve(config.cwd, 'tests/fixtures/arena-basis-challenge');
  }
  basis satisfies never;
  throw new TypeError(`Unknown arena basis ${String(basis)}.`);
}

async function frozenRoomStates(config: ArenaConfig): Promise<readonly import('../src/combat/encounter').EncounterState[]> {
  if (config.basis === 'scenario' && config.rooms !== 1) {
    throw new RangeError('The scenario basis contains exactly one hypnotic-pattern-cc room.');
  }
  if (config.basis === 'scenario' && config.generateMissingRooms) {
    throw new TypeError('--generate-missing-rooms is unavailable for the frozen scenario basis.');
  }
  if (config.basis === 'challenge' && config.generateMissingRooms) {
    throw new TypeError('--generate-missing-rooms is unavailable for the closed challenge basis.');
  }
  const fixturesPath = basisFixturesPath(config);
  return Promise.all(Array.from({ length: config.rooms }, async (_unused, index) => {
    const seed = config.seed + index;
    const fixturePath = resolve(fixturesPath, config.basis === 'scenario'
      ? 'hypnotic-pattern-cc.json'
      : `seed-${String(seed)}.json`);
    try {
      await access(fixturePath);
      if (config.basis === 'challenge') {
        const sidecarPath = resolve(fixturesPath, `seed-${String(seed)}.provenance.json`);
        const sidecar = decodeChallengeRoomProvenanceV1(JSON.parse(await readFile(sidecarPath, 'utf8')) as unknown);
        const room = decodeArenaBasisEnvelopeV1(JSON.parse(await readFile(fixturePath, 'utf8')) as unknown, { mode: 'challenge' });
        if (sidecar.seed !== seed || room.spec.seed !== seed) {
          throw new TypeError(`Challenge sidecar seed ${String(sidecar.seed)} does not match envelope seed ${String(room.spec.seed)}.`);
        }
        if (sidecar.certification !== 'ready_for_witness') {
          throw new TypeError(`Challenge room ${sidecar.roomId} is not ready_for_witness.`);
        }
        return room.encounter.state;
      }
      return applyRoomInitiativeProfile(await loadArenaFixture(fixturePath), config.initiativeProfile);
    } catch (error) {
      if (!config.generateMissingRooms || !(error instanceof Error) ||
        !('code' in error) || error.code !== 'ENOENT') throw error;
      return generateRoom(seed, {
        difficulty: config.basis === 'scenario' || config.basis === 'challenge'
          ? 'standard'
          : config.basis === 'brutal-b'
            ? 'brutal'
            : config.basis,
        initiativeProfile: config.initiativeProfile,
      }).encounter.state;
    }
  }));
}

export function extractArenaProbeVerdict(
  basis: ArenaBasis,
  authorizedPlan: readonly import('./ai-dm-conversation').ConversationAuthorizedActorPlan[] | null,
): ArenaProbeVerdict | null {
  if (basis !== 'scenario') return null;
  const caster = authorizedPlan?.find((entry) => entry.actorId === 'combatant:d432-incubus') ?? null;
  const main = caster?.resolutionSummary.actionSlots.find((slot) => slot.slot === 'main') ?? null;
  const choseControl = main?.kind === 'cast_spell' && main.spellId === 'hypnotic-pattern';
  return {
    scenario: 'hypnotic-pattern-cc',
    chose_control: choseControl,
    selected_instead: choseControl || main === null
      ? null
      : {
          kind: main.kind === 'cast_spell' ? 'cast_spell' : 'action',
          id: main.spellId ?? String(main.actionId),
        },
  };
}

export function mapConversationKbReads(
  row: Pick<import('./ai-dm-conversation').ConversationRow, 'kbReads'>,
): readonly import('../src/vtt/mcp/knowledge-base').KbReadRecord[] {
  return structuredClone(row.kbReads);
}

export function arenaRows(
  config: ArenaConfig,
  rows: readonly ConversationRowPersisted[],
  arm: string,
  seeds: readonly number[],
): readonly ArenaRow[] {
  return rows.map((row): ArenaRow => {
    const restrictedWall = row.roundWallTimedOut
      ? config.experimentPolicy.roundWallMs
      : row.policyElapsedMs;
    if (!Number.isFinite(restrictedWall) || restrictedWall < 0 ||
      restrictedWall > config.experimentPolicy.roundWallMs) {
      throw new RangeError('Arena restricted wall must be within the registered round wall.');
    }
    const arenaRow: ArenaRow = {
    ...conversationPart(row),
    seed: seeds[row.room - 1]!,
    basis: config.basis,
    probeVerdict: extractArenaProbeVerdict(config.basis, row.authorizedPlan),
    arm,
    wall: restrictedWall,
    };
    decodeArenaRowEvidence(arenaRow, 'increment_2');
    return arenaRow;
  });
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
    readonly overridePolicy?: OverridePolicy;
    readonly instruction?: AgentInstructionSource;
  },
): import('./ai-dm-conversation').ConversationConfig {
  const instructionSource: AgentInstructionSource = overrides.instruction ?? config;
  return {
    ...instructionSource,
    intelMode: config.intelMode,
    overridePolicy: overrides.overridePolicy ?? config.overridePolicy,
    rendererProfile: config.rendererProfile,
    turnContextMaximumBytes: config.turnContextMaximumBytes,
    combatModel: overrides.combatModel ?? config.combatModel,
    initiativeProfile: config.initiativeProfile,
    partyPolicy: config.partyPolicy,
    fixturesPath: basisFixturesPath(config),
    rooms: overrides.rooms,
    rounds: overrides.rounds,
    cli: config.cli,
    decisionTransport: config.decisionTransport,
    model: overrides.model,
    effort: overrides.effort,
    escalationModel: overrides.escalationModel,
    escalationEffort: overrides.escalationEffort,
    outPath: overrides.outPath,
    dryRun: config.dryRun,
    cwd: config.cwd,
    cliBin: config.cliBin,
    timeoutMs: config.timeoutMs,
    roundWallMs: config.experimentPolicy.roundWallMs,
    reactionAskDefault: config.reactionAskDefault,
    captureRlData: config.captureRlData,
    localOpenAi: config.localOpenAi === null ? null : {
      ...config.localOpenAi,
      model: overrides.model,
    },
    boardImageMode: config.boardImageMode,
  };
}

export async function runArena(
  config: ArenaConfig,
  options: ArenaRunOptions = {},
): Promise<readonly ArenaRow[]> {
  const seeds = Array.from({ length: config.rooms }, (_unused, index) => config.seed + index);
  const {
    adapterByArm,
    heartbeat = stdoutHeartbeat,
    rendererEvidenceCache = new Map<string, TurnContextRenderEvidence>(),
    fixtureStates,
    boardSnapshotServiceFactory,
    ...conversationOptions
  } = options;
  const states = fixtureStates ?? await frozenRoomStates(config);
  if (states.length !== config.rooms) {
    throw new RangeError(`Arena requires exactly ${String(config.rooms)} fixture states; received ${String(states.length)}.`);
  }
  let snapshotService: ConversationBoardSnapshotService | null = null;
  try {
    if (config.boardImageMode !== 'off') {
      const outputDirectory = boardImageOutputDirectory(config);
      snapshotService = boardSnapshotServiceFactory === undefined
        ? await BoardSnapshotService.start({ outputDirectory })
        : await boardSnapshotServiceFactory(outputDirectory);
    }
    let rows: readonly ArenaRow[];
    if (!config.interleave) {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'dnd-ai-dm-arena-independent-'));
    const independent: ArenaRow[] = [];
    for (let room = 1; room <= config.rooms; room += 1) {
      for (let rep = 1; rep <= config.reps; rep += 1) {
        const result = await runConversation(conversationConfig(config, {
          rooms: 1,
          rounds: 1,
          model: config.model,
          effort: config.effort,
          escalationModel: config.escalationModel,
          escalationEffort: config.escalationEffort,
          outPath: resolve(temporaryDirectory, `${String(room)}-${String(rep)}-single.jsonl`),
        }), {
          ...conversationOptions,
          ...(snapshotService === null ? {} : { boardSnapshotService: snapshotService }),
          rendererEvidenceCache,
          roomStates: [states[room - 1]!],
        });
        const [row] = arenaRows(config, result.rows, 'single', [seeds[room - 1]!]);
        if (row === undefined) throw new Error('Independent arena unit produced no row.');
        independent.push({ ...row, room, round: rep });
      }
    }
    rows = independent;
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
            overridePolicy: arm.overridePolicy,
            instruction: arm,
          }), {
            ...conversationOptions,
            ...(snapshotService === null ? {} : { boardSnapshotService: snapshotService }),
            rendererEvidenceCache,
            ...(adapterByArm?.[arm.label] === undefined ? {} : { adapter: adapterByArm[arm.label] }),
            roomStates: [states[room - 1]!],
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
  } finally {
    await snapshotService?.close();
  }
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
