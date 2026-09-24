import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { expect } from 'vitest';
import {
  agentSessionIdFromCli,
  contextTokenCount,
  turnInputTotal,
  measuredContextRolloverThreshold,
  engineDispatchId,
  engineDispatchPhaseForCallPhase,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
  type EngineCatalogEvidence,
  type EngineDispatchId,
} from '../../../src/vtt/agent-session';
import {
  AgentSessionLifecycle,
  createConversationRoundDeadline,
  type AgentDispatchDeadline,
} from '../../../src/vtt/agent-session-lifecycle';
import {
  BOARD_IMAGE_SCALE_STARTUP_INSTRUCTION,
  UI_FEEDBACK_STARTUP_INSTRUCTION,
  parseConversationArgs,
  conversationStartupInstructions,
  proposalResolutionDivergence,
  isPlanAdjustmentProposal,
  isRoundProposal,
  runConversation,
  structuredFinalDecisionPhase,
  createMcpClient,
  McpChildExited,
  mcpRequest,
  stopMcpClient,
  profiledTurnContextArguments,
  persistD569IntegrityStop,
  type ConversationBoardSnapshotService,
  type ConversationRunOptions,
} from '../../../tools/ai-dm-conversation';
import { buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { armorClass, combatantId, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { generateRoom } from '../../../src/vtt/room-generator';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  engineActorOptionsForEnvironment,
} from '../../../src/vtt/intent-resolver';
import {
  freshMonsterPlanningState,
  loadArenaFixture,
  parseEngineMcpJsonLine,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
import { mcpRequestMeta, type McpHandler } from '../../../src/vtt/mcp/handler';
import { MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION } from '../../../src/vtt/mcp/engine-server';
import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
import {
  importSavedSession,
  exportSavedSession,
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { codexArgv } from '../../../src/vtt/agent-adapters/codex';
import { D569IntegrityStop } from '../../../src/vtt/d569-integrity';
import { decodeSessionSnapshotV1 } from '../../../src/vtt/arena-fixture';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../../../src/vtt/dm-bridge/projection-transport';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
import {
  createDisabledEngineOfferFamilyPolicy,
} from '../../../src/vtt/offers/offer-environment';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
import { engineStateHandle } from '../../../src/vtt/engine-state-capsule';
import { engineActionId } from '../../../src/vtt/turn-proposal';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';
import {
  createScriptedPartyPlan,
  type ScriptedPartyDecisionPolicy,
} from '../../../src/vtt/scripted-party-round';
import {
  AI_DM_KB_FIXTURE_DIRECTORY,
  DEFAULT_AI_DM_KB_ROOT,
  KB_SUBJECTS,
} from '../../../src/vtt/knowledge-base-contract';
import { declareTestInputs } from '../../helpers/test-inputs';
import { sha256 } from '../../../src/crypto/sha256';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { traceCombatantLine } from '../../../src/combat/cover';
import {
  classifyEngineCatalogEvidence,
  type EngineReadinessRecord,
} from '../../../src/vtt/engine-dispatch-evidence';


export const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
export const BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});
export const DIVERGENCE_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});
export function createEngineMcpRuntime(
  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
  options: Omit<NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]>,
    'offerEnvironment'> & { readonly offerEnvironment?: typeof BOUND_OFFER_ENVIRONMENT } = {},
): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
  const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
  return runtime;
}

export function launcherOfferEnvironment(manifest: EngineMcpLauncherManifest) {
  if (manifest.offerEnvironment === undefined) throw new TypeError('Launcher offer environment is absent.');
  return buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
}

export async function runConversationWithPartyPolicy(
  decisionPolicy: ScriptedPartyDecisionPolicy,
  config: Parameters<typeof runConversation>[0],
  options?: Parameters<typeof runConversation>[1],
): Promise<Awaited<ReturnType<typeof runConversation>>> {
  return runConversation(config, { ...options, partyPolicyOverride: decisionPolicy });
}

export async function minimalAlternatingInitiativeRoom(): Promise<EncounterState> {
  const state = await alternatingInitiativeRoom();
  const actorIds = new Set<CombatantId>([
    combatantId('combatant:fighter'),
    combatantId('combatant:generated-3943001-monster-1'),
    combatantId('combatant:generated-3943001-monster-2'),
  ]);
  return {
    ...state,
    combatants: state.combatants.filter((combatant) => actorIds.has(combatant.profile.id)),
    tokens: state.tokens.filter((token) => actorIds.has(token.combatantId)),
  };
}

export async function validRecalculationRoom(): Promise<EncounterState> {
  const state = await alternatingInitiativeRoom();
  return {
    ...state,
    combatants: state.combatants.map((combatant) => ({
      ...combatant,
      profile: {
        ...combatant.profile,
        rules: {
          ...combatant.profile.rules,
          initiativeBonus: combatant.profile.kind === 'monster' ? -20 : 20,
        },
      },
    })),
  };
}

export class RecordingConversationAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: AgentInvocation[] = [];

  async probe() { return { present: true, version: 'SIMULATED' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    return this.completed(agentSessionIdFromCli('codex:SIMULATED-kb-session'));
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.resumeInvocations.push(invocation);
    return this.completed(binding.sessionId);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  private completed(sessionId: NonNullable<AgentTurnResult['resumeSessionId']>): AgentTurnResult {
    return {
      resumeSessionId: sessionId, sessionId: null, finalText: 'SIMULATED', usage: null, exit: 'completed',
      processEvidence: null, engineCatalogEvidence: null,
      partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
    };
  }
}

export function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

export function d569BoardSnapshotService(directory: string): ConversationBoardSnapshotService {
  return {
    outputDirectory: directory,
    capture: async (input) => {
      const png = Buffer.alloc(24);
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
      png.writeUInt32BE(1, 16);
      png.writeUInt32BE(1, 20);
      const digest = createHash('sha256').update(png).digest('hex');
      const relativePath = `board-images/${digest}.png` as const;
      mkdirSync(join(directory, 'board-images'), { recursive: true });
      writeFileSync(join(directory, relativePath), png);
      const html = Buffer.from('<!doctype html><main>D569 evidence</main>\n');
      const htmlDigest = createHash('sha256').update(html).digest('hex');
      const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
      mkdirSync(join(directory, 'board-html', htmlDigest), { recursive: true });
      writeFileSync(join(directory, htmlRelativePath), html);
      return {
        version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
        relativePath, sha256: digest, bytes: png.byteLength, width: 1, height: 1,
        capturedAtUnixMs: 1, captureMs: 0, source: { ...input.source },
        chromiumVersion: 'SIMULATED Chromium',
        html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
      };
    },
    close: async () => undefined,
  };
}

export type IncompleteCatalogExit = 'timed_out' | 'cancelled' | 'infrastructure_failed';
export type IncompleteCatalogEvidenceFactory = (
  dispatchId: EngineDispatchId,
) => Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;

export function incompleteCatalogAdapter(
  exit: IncompleteCatalogExit,
  evidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>['reason'] |
    IncompleteCatalogEvidenceFactory,
  observeLauncher?: (path: string) => void,
): AgentSessionAdapter {
  const dispatch = async (invocation: AgentInvocation): Promise<AgentTurnResult> => {
    if (invocation.engineDispatchId === undefined) throw new Error('Incomplete fixture lacks dispatch identity.');
    observeLauncher?.(invocation.launcherToken);
    const common = {
      resumeSessionId: null, sessionId: `partial-${exit}-session`,
      finalText: `partial ${exit} output`, usage: null,
      processEvidence: {
        startedAtUnixMs: 10, endedAtUnixMs: 20, exitCode: exit === 'infrastructure_failed' ? 1 : null,
        signal: exit === 'infrastructure_failed' ? null : 'SIGTERM',
        stdout: `partial ${exit} output`, stderr: exit === 'infrastructure_failed' ? 'startup failed' : '',
        decodedEvents: [],
      },
      partialResultEvidence: {
        status: 'partial' as const, decodedEventCount: 0, finalTextFragment: `partial ${exit} output`,
        observedUsage: null, stagedInvocationIds: [],
      },
      engineCatalogEvidence: typeof evidence === 'function'
        ? evidence(invocation.engineDispatchId)
        : { status: 'inconclusive' as const, dispatchId: invocation.engineDispatchId, reason: evidence },
    };
    switch (exit) {
      case 'timed_out': return { ...common, exit, timeoutMs: 180_000 };
      case 'cancelled': return { ...common, exit, cancellationReason: 'operator_cancelled' };
      case 'infrastructure_failed': return {
        ...common, exit, component: 'engine_mcp_startup', failureReason: 'required engine startup failed',
      };
    }
  };
  return {
    kind: 'codex',
    probe: async () => ({ present: true, version: 'SIMULATED' }),
    start: dispatch,
    resume: async () => { throw new Error('Incomplete fixture unexpectedly resumed.'); },
    classifyFailure: () => 'unknown',
  };
}

export function classifiedInvalidCatalog(
  dispatchId: EngineDispatchId,
  source: 'malformed' | 'wrong_profile',
): Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }> {
  const readiness: readonly EngineReadinessRecord[] = source === 'wrong_profile' ? [{
    version: 1, dispatchId, phase: 'primary', profile: 'blind', requestId: 'request:wrong-profile',
    event: 'tools_list_stream_write_completed', generatedAtUnixMs: 1, writeCompletedAtUnixMs: 2,
    responseId: 'wrong-profile-response', responseSha256: 'a'.repeat(64),
    expectedToolNames: ['engine.get_turn_context'], returnedToolNames: ['engine.get_turn_context'],
    descriptorSha256: 'b'.repeat(64), validation: { status: 'valid' },
  }] : [];
  const classified = classifyEngineCatalogEvidence({
    dispatchId, expectedProfile: 'dm', expectedPhase: 'primary', expectedRequestId: 'request:wrong-profile',
    expectedToolNames: ['engine.get_turn_context'], events: [], readiness,
    completed: false, requiredStartupFailed: false,
    ...(source === 'malformed' ? { malformedReadiness: true } : {}),
  });
  if (classified.status !== 'inconclusive' || classified.reason !== 'invalid_catalog_response') {
    throw new Error(`${source} readiness did not classify as invalid_catalog_response.`);
  }
  return classified;
}

export async function runIncompleteCatalogIntegrityStop(
  exit: IncompleteCatalogExit,
  evidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>['reason'] |
    IncompleteCatalogEvidenceFactory,
  expireRoundDeadline = false,
): Promise<{
  readonly row: Readonly<Record<string, unknown>>;
  readonly artifact: Readonly<Record<string, unknown>>;
  readonly launcher: EngineMcpLauncherManifest;
}> {
  const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-integrity-`));
  const outPath = join(directory, 'rows.jsonl');
  let launcherPath: string | null = null;
  let policyMs = 0;
  let stopped: unknown;
  try {
    await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--dm-mode', 'advice', '--board-image', 'off', '--dry-run',
    ]), {
      adapter: incompleteCatalogAdapter(exit, evidence, (path) => { launcherPath = path; }),
      policyNow: () => policyMs,
      onPrimaryResultObservedForTest: () => {
        if (expireRoundDeadline) policyMs = 180_000;
      },
    });
  } catch (error) {
    stopped = error;
  }
  if (!(stopped instanceof D569IntegrityStop)) {
    throw new Error(`Expected ${exit} catalog evidence to raise D569IntegrityStop.`, { cause: stopped });
  }
  if (launcherPath === null) throw new Error('Integrity fixture did not observe its launcher.');
  const launcher = JSON.parse(readFileSync(launcherPath, 'utf8')) as EngineMcpLauncherManifest;
  const row = JSON.parse(readFileSync(outPath, 'utf8')) as Readonly<Record<string, unknown>>;
  const artifactPath = join(dirname(launcherPath), 'room-1-round-1-dispatch-integrity.json');
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as Readonly<Record<string, unknown>>;
  return { row, artifact, launcher };
}

export class BoilerplateThenValidStructuredFinalAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  decisionAttempts = 0;
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: AgentInvocation[] = [];
  #startCount = 0;

  constructor(
    private readonly correctionResponse: 'valid' | 'empty' | 'refusal' = 'valid',
  ) {}

  async probe() { return { present: true, version: 'STRUCTURED-REASON-TEST' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    this.#startCount += 1;
    return this.dispatch(
      agentSessionIdFromCli(`codex:structured-reason:${invocation.runId}:${String(this.#startCount)}`),
      invocation,
    );
  }

  async resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
  ): Promise<AgentTurnResult> {
    this.resumeInvocations.push(invocation);
    return this.dispatch(binding.sessionId, invocation);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  private dispatch(
    sessionId: NonNullable<AgentTurnResult['resumeSessionId']>,
    invocation: AgentInvocation,
  ): AgentTurnResult {
    if (invocation.output.kind !== 'structured_final') {
      throw new TypeError('Structured reason adapter received a tool-driven invocation.');
    }
    this.decisionAttempts += 1;
    if (this.decisionAttempts > 1 && this.correctionResponse !== 'valid' &&
      invocation.bootstrap?.kind !== 'escalation') {
      return {
        resumeSessionId: sessionId,
        sessionId,
        finalText: this.correctionResponse === 'empty'
          ? ''
          : 'I cannot submit this round proposal.',
        usage: null,
        exit: 'completed',
        processEvidence: null,
        engineCatalogEvidence: null,
        partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
      };
    }
    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    const marker = '[DECISION_CATALOG]\n';
    const markerIndex = invocation.prompt.lastIndexOf(marker);
    if (markerIndex < 0) throw new TypeError('Structured reason adapter received no decision catalog.');
    const catalog = objectValue(
      JSON.parse(invocation.prompt.slice(markerIndex + marker.length)) as unknown,
      'structured reason decision catalog',
    );
    const actors = catalog['actors'];
    if (typeof catalog['catalogDigest'] !== 'string' || !Array.isArray(actors)) {
      throw new TypeError('Structured reason adapter received a malformed decision catalog.');
    }
    const reason = this.decisionAttempts === 1
      ? 'Use the offered legal option for this actor.'
      : 'Hold the doorway so the injured scout can disengage safely.';
    const proposals = Object.fromEntries(actors.map((value) => {
      const actor = objectValue(value, 'structured reason decision actor');
      if (typeof actor['actorId'] !== 'string') {
        throw new TypeError('Structured reason decision actor omitted its id.');
      }
      return [actor['actorId'], {
        primaryOptionIndex: 0,
        fallbackOptionIndex: manifest.phase === 'correction' ? null : 1,
        override: null,
        reason,
      }];
    }));
    return {
      resumeSessionId: sessionId,
      sessionId: null,
      finalText: JSON.stringify({
        catalogDigest: catalog['catalogDigest'],
        reaction_guidance: { inherit: true },
        proposals,
        rationale: null,
      }),
      usage: null,
      exit: 'completed',
      processEvidence: null,
      engineCatalogEvidence: null,
      partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
    };
  }
}

export function serializedToolCall(
  handler: McpHandler,
  name: string,
  argumentsValue: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const message = parseEngineMcpJsonLine(JSON.stringify({
    jsonrpc: '2.0', id: `serialized:${name}`, method: 'tools/call',
    params: {
      name,
      arguments: argumentsValue,
      _meta: mcpRequestMeta({ name: 'serialized-round-trip-test', version: '1.0.0' }),
    },
  }));
  const response = handler.handle(message);
  if (response === null || response.error !== undefined) {
    throw new Error(`Serialized ${name} call failed: ${JSON.stringify(response)}`);
  }
  const result = objectValue(response.result, `${name} result`);
  if (result['isError'] !== false) throw new Error(`Serialized ${name} tool failed: ${JSON.stringify(result)}`);
  return objectValue(result['structuredContent'], `${name} structured content`);
}

export class SerializedRoundTripAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly submittedOptions: Readonly<Record<string, unknown>>[] = [];
  readonly decodedOptions: Readonly<Record<string, unknown>>[] = [];
  readonly turnContexts: Readonly<Record<string, unknown>>[] = [];
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: AgentInvocation[] = [];
  sessionSnapshotValidations = 0;
  #startCount = 0;

  constructor(
    private readonly choice: 'first_shown' | 'use_action_dodge' | 'targeted_web' | 'attack' |
      'invalid_then_dodge' | 'invalid_initial_and_correction' | 'option_shaped_end_turn' |
      'explicit_refusal_then_escalation',
    private readonly usageInputs: number[] = [],
    private readonly validateSessionBytes = false,
  ) {}

  async probe() { return { present: true, version: 'SERIALIZED-TEST' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    this.#startCount += 1;
    const sessionId = agentSessionIdFromCli(
      `codex:serialized:${invocation.runId}:session-${String(this.#startCount)}`,
    );
    return this.dispatch(sessionId, invocation);
  }

  async resume(binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.resumeInvocations.push(invocation);
    return this.dispatch(binding.sessionId, invocation);
  }

  private async dispatch(
    sessionId: NonNullable<AgentTurnResult['resumeSessionId']>,
    invocation: AgentInvocation,
  ): Promise<AgentTurnResult> {
    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    expect(manifest.toolProfile).toBe('dm');
    if (this.choice === 'explicit_refusal_then_escalation' && manifest.phase === 'initial') {
      return this.completed(sessionId, 'I cannot submit this round proposal.');
    }
    const state = await loadArenaFixture(manifest.fixturePath);
    if (this.validateSessionBytes) {
      const launcherBytes = readFileSync(manifest.fixturePath, 'utf8');
      expect(canonicalJson(decodeSessionSnapshotV1(JSON.parse(launcherBytes) as unknown)))
        .toBe(canonicalJson(state));
      this.sessionSnapshotValidations += 1;
    }
    const runtime = createEngineMcpRuntime(state, {
      offerEnvironment: launcherOfferEnvironment(manifest),
      runId: manifest.runId,
      branchId: manifest.branchId,
      revision: manifest.revision,
      requestId: manifest.requestId,
      phase: manifest.phase,
      correctionNumber: manifest.correctionNumber,
      room: manifest.room,
      historyKind: manifest.historyKind,
      ...(manifest.toolProfile === undefined ? {} : { toolProfile: manifest.toolProfile }),
      ...(manifest.turnContextDeltaBase === undefined ? {} : {
        turnContextDeltaBase: manifest.turnContextDeltaBase,
      }),
      ...(manifest.initiativeProjection === undefined ? {} : {
        initiativeProjection: manifest.initiativeProjection,
      }),
      ...(manifest.phase === 'speculative' ? {
        requestedActorIds: manifest.requestedActorIds,
        speculativeRequest: manifest.speculativeRequest,
      } : {}),
    });
    if (manifest.phase === 'speculative') {
      if (manifest.speculativeRequest === undefined) {
        throw new Error('Serialized speculative request has no scenarios.');
      }
      const capsule = runtime.feed.current();
      const actors = capsule.request?.actors;
      if (actors === undefined) throw new Error('Serialized speculative request has no actors.');
      const proposals = actors.map((actorId) => {
        const option = capsule.projection.combatants.find((actor) => actor.id === actorId)?.options[0];
        if (option === undefined) {
          throw new Error(`Serialized speculative capsule has no offered option for ${actorId}.`);
        }
        return {
          actor_id: actorId,
          expected_revision: capsule.revision,
          primary_option_id: option.optionId,
          fallback_option_id: null,
          reason: 'Exercise the bounded speculative decision path.',
          override_justification: null,
        };
      });
      const submitted = serializedToolCall(runtime.handler, 'engine.submit_speculative_round_plan', {
        state_ref: {
          run_id: capsule.runId,
          state_handle: engineStateHandle(capsule),
          expected_revision: capsule.revision,
        },
        request_id: manifest.requestId,
        target_room: manifest.speculativeRequest.targetRoom,
        target_monster_round: manifest.speculativeRequest.targetMonsterRound,
        refresh_generation: manifest.speculativeRequest.refreshGeneration,
        branches: manifest.speculativeRequest.scenarios.map((scenario) => ({
          scenario_id: scenario.scenarioId,
          proposals,
        })),
        idempotency_key: `SERIALIZED-${manifest.requestId}`.slice(0, 200),
      });
      if (submitted['status'] !== 'QUEUED-SPECULATIVE' || runtime.speculativePlans.length !== 1) {
        throw new Error(`Serialized speculative round was not queued: ${JSON.stringify(submitted)}`);
      }
      writeFileSync(manifest.proposalSpoolPath, `${JSON.stringify(runtime.speculativePlans[0])}\n`, 'utf8');
      return this.completed(sessionId);
    }
    const wireContext = serializedToolCall(runtime.handler, 'engine.get_turn_context', {
      run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round',
      ...(manifest.turnContextDeltaBase === undefined ? { granularity: 'full' } : {
        granularity: 'turn_delta', since_revision: manifest.turnContextDeltaBase.revision,
      }),
    });
    const changes = wireContext['changes'];
    const context = wireContext['granularity'] !== 'turn_delta'
      ? wireContext
      : manifest.turnContextDeltaBase === undefined || !Array.isArray(changes)
        ? null
        : applyRevisionDelta(
            manifest.turnContextDeltaBase.context,
            changes as readonly RevisionDeltaOperation[],
          );
    if (context === null) throw new Error('Serialized turn delta could not be reconstructed.');
    this.turnContexts.push(context);
    const actors = runtime.feed.current().request?.actors;
    if (actors === undefined) throw new Error('Serialized round request has no actors.');
    const renderedActors = context['actors'];
    if (!Array.isArray(renderedActors)) throw new Error('Serialized turn context has no actors.');
    let specialSubmitted = false;
    const proposals = actors.map((actorId) => {
      const renderedActor = renderedActors.map((value) => objectValue(value, 'rendered actor'))
        .find((actor) => actor['actor_id'] === actorId);
      const optionValues = renderedActor?.['options'];
      if (!Array.isArray(optionValues)) throw new Error(`Serialized context has no options for ${actorId}.`);
      const options = optionValues.map((value) => objectValue(value, 'rendered option'));
      const slots = (option: Readonly<Record<string, unknown>>) => {
        const values = option['action_slots'];
        return Array.isArray(values) ? values.map((value) => objectValue(value, 'rendered option slot')) : [];
      };
      const engineDefaultId = objectValue(
        objectValue(renderedActor?.['intel'], 'rendered actor intel')['opportunity_cost'],
        'rendered actor opportunity cost',
      )['engine_default_option_id'];
      const matchingSpecials = (this.choice === 'attack' || !specialSubmitted) ? options.filter((option) => slots(option).some((slot) =>
        this.choice === 'attack'
          ? slot['kind'] === 'attack' || slot['kind'] === 'multiattack'
          : this.choice === 'targeted_web'
            ? slot['kind'] === 'saving_throw' && slot['action_id'] === 'web'
            : false)) : [];
      const special = matchingSpecials.find((option) => option['option_id'] === engineDefaultId) ??
        matchingSpecials[0];
      if (special !== undefined) specialSubmitted = true;
      const requestedKind = this.choice === 'option_shaped_end_turn' ? 'end_turn' : 'dodge';
      const selected = this.choice === 'first_shown'
        ? options[0]
        : special ?? options.find((option) => slots(option).some((slot) =>
            slot['slot'] === 'main' && slot['kind'] === requestedKind));
      if (selected === undefined) throw new Error(`Serialized round has no ${requestedKind} option for ${actorId}.`);
      const selectedId = String(selected['option_id']);
      const selectedLabel = String(selected['label']);
      const selectedMainKind = slots(selected).find((slot) => slot['slot'] === 'main')?.['kind'];
      const fallback = options.find((option) => option['option_id'] !== selectedId);
      if (manifest.phase === 'initial' && fallback === undefined) {
        throw new Error(`Serialized round has no independent fallback option for ${actorId}.`);
      }
      this.submittedOptions.push({ option_id: selectedId, label: selectedLabel });
      return {
        actor_id: actorId,
        expected_revision: manifest.revision,
        primary_option_id: selectedId,
        fallback_option_id: manifest.phase === 'correction' ? null : String(fallback?.['option_id']),
        reason: `Choose ${selectedLabel} to exercise the serialized decision path.`,
        override_justification: selectedMainKind === 'dodge' || selectedMainKind === 'end_turn'
          ? {
              kind: 'missing_metric',
              id: 'expected_damage_milli',
            }
          : null,
      };
    });
    if ((this.choice === 'attack' || this.choice === 'targeted_web') && !specialSubmitted) {
      throw new Error(`Serialized round has no requested actor with a resolvable ${this.choice}.`);
    }
    const submitted = serializedToolCall(runtime.handler, 'engine.submit_round_proposals', {
      proposals,
    });
    if (submitted['status'] !== 'proposed' || runtime.proposals.length !== 1) {
      throw new Error(`Serialized round was not proposed: ${JSON.stringify(submitted)}`);
    }
    const proposal = runtime.proposals[0];
    if (proposal?.kind !== 'round_turn_proposal') throw new Error('Serialized handler omitted the round proposal.');
    this.decodedOptions.push(...proposal.resolutions.map((resolution) => ({
      option_id: resolution.option.optionId,
      label: resolution.option.label,
      action_slots: resolution.option.actionSlots,
    })));
    const dispatchInvalid = (this.choice === 'invalid_then_dodge' && manifest.phase === 'initial') ||
      (this.choice === 'invalid_initial_and_correction' &&
        (manifest.phase === 'initial' || invocation.bootstrap?.kind !== 'escalation'));
    const dispatchedProposal = dispatchInvalid
      ? {
          ...proposal,
          resolutions: proposal.resolutions.map((resolution) => ({
            ...resolution,
            resolutionDigest: '0'.repeat(64),
          })),
        }
      : proposal;
    writeFileSync(manifest.proposalSpoolPath, `${JSON.stringify(dispatchedProposal)}\n`, 'utf8');
    return this.completed(sessionId);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }

  private completed(
    sessionId: NonNullable<AgentTurnResult['resumeSessionId']>,
    finalText = 'SERIALIZED-TEST',
  ): AgentTurnResult {
    return {
      resumeSessionId: sessionId,
      sessionId,
      finalText,
      usage: this.usageInputs.length === 0 ? null : {
        turnInputTotal: turnInputTotal(this.usageInputs[0]!),
        contextInputTokens: contextTokenCount(this.usageInputs.shift()!),
        modelContextWindow: null,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
      },
      exit: 'completed',
      processEvidence: null,
      engineCatalogEvidence: null,
      partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
    };
  }
}

export function pendingArenaReactionState(): EncounterState {
  const mover = playerProfile('arena-reaction-mover', { hitPoints: 100, initiativeBonus: 20 });
  const reactor = monsterProfile('arena-reaction-reactor', { hitPoints: 100, initiativeBonus: -20 });
  const started = reduceEncounter(createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [mover, reactor],
    tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
    reactionPolicies: [{
      combatant: reactor.id,
      reactionKind: 'opportunity_attack',
      policy: 'ask',
    }],
  }), { type: 'roll_initiative' }, () => 0.5).state;
  return reduceEncounter(started, {
    type: 'move',
    actor: mover.id,
    path: [{ column: 2, row: 0 }],
    cause: 'voluntary',
  }, () => 0.5).state;
}

export function oversizedTurnContextState(): EncounterState {
  const player = playerProfile('context-trim-player', { initiativeBonus: 20 });
  const monsters = Array.from({ length: 45 }, (_value, index) =>
    monsterProfile(`context-trim-monster-${String(index + 1)}`, { initiativeBonus: -20 }));
  return reduceEncounter(createEncounter({
    bounds: { columns: 50, rows: 2 },
    combatants: [player, ...monsters],
    tokens: [
      placedToken(player, 49),
      ...monsters.map((monster, index) => placedToken(monster, index)),
    ],
  }), { type: 'roll_initiative' }, () => 0.5).state;
}

export function preparedMonsterRoundRevision(initialState: EncounterState): {
  readonly revision: number;
  readonly resolvedDeathSaves: number;
} {
  const rng = mulberry32(8_274_113);
  let resolvedDeathSaves = 0;
  const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
    let current = reduceSessionEncounter(state, command, rng).state;
    for (;;) {
      const decision = current.pendingDecisions.find((candidate) => candidate.kind === 'death_save');
      if (decision === undefined) return current;
      resolvedDeathSaves += 1;
      current = reduceSessionEncounter(current, {
        type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'roll',
      }, rng).state;
    }
  };
  let state = initialState;
  if (state.initiative.length === 0) state = reduce(state, { type: 'roll_initiative' });
  const firstMonster = state.combatants
    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life !== 'dead')
    .map((combatant) => combatant.profile.id)
    .sort((left, right) => left.localeCompare(right))[0];
  if (firstMonster === undefined) throw new Error('Generated room has no living monster.');
  for (let index = 0; state.activeCombatant !== firstMonster && index < state.combatants.length * 3; index += 1) {
    const active = state.activeCombatant;
    if (active === null) throw new Error('Generated room initiative has no active combatant.');
    state = reduce(state, { type: 'end_turn', actor: active });
  }
  if (state.activeCombatant !== firstMonster) throw new Error('Could not prepare generated monster round.');
  return { revision: state.revision, resolvedDeathSaves };
}





export function producerHash(value: unknown): string {
  return sha256(typeof value === 'function'
    ? Function.prototype.toString.call(value)
    : JSON.stringify(value));
}

export async function producerMutationReceipt<Dependency, Result>(
  name: string,
  baseline: Dependency,
  mutant: Dependency,
  produce: (dependency: Dependency) => Promise<Result>,
  prove: (value: Result) => Promise<void> | void,
): Promise<void> {
  let dependency = baseline;
  const originalHash = producerHash(dependency);
  try {
    dependency = mutant;
    console.info(`[MUTATION_RECEIPT] ${name} APPLIED`);
    expect(producerHash(dependency)).not.toBe(originalHash);
    console.info(`[MUTATION_RECEIPT] ${name} PROVED_APPLIED`);
    let failed = false;
    try {
      await prove(await produce(dependency));
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    console.info(`[MUTATION_RECEIPT] ${name} FAILED_AS_EXPECTED`);
  } finally {
    dependency = baseline;
  }
  expect(producerHash(dependency)).toBe(originalHash);
  console.info(`[MUTATION_RECEIPT] ${name} REVERTED hash=${originalHash}`);
  await prove(await produce(dependency));
  console.info(`[MUTATION_RECEIPT] ${name} BASELINE_PASSED hash=${originalHash}`);
}