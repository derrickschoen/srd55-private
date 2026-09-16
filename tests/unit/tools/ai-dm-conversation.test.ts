import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
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
  parseConversationArgs,
  proposalResolutionDivergence,
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

const kbInputs = declareTestInputs({ fixtures: [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
  'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md',
] });
const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
const BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});
const DIVERGENCE_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});
function createEngineMcpRuntime(
  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
  options: Omit<NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]>,
    'offerEnvironment'> & { readonly offerEnvironment?: typeof BOUND_OFFER_ENVIRONMENT } = {},
): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
  const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
  return runtime;
}

function launcherOfferEnvironment(manifest: EngineMcpLauncherManifest) {
  if (manifest.offerEnvironment === undefined) throw new TypeError('Launcher offer environment is absent.');
  return buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
}

async function runConversationWithPartyPolicy(
  decisionPolicy: ScriptedPartyDecisionPolicy,
  config: Parameters<typeof runConversation>[0],
  options?: Parameters<typeof runConversation>[1],
): Promise<Awaited<ReturnType<typeof runConversation>>> {
  return runConversation(config, { ...options, partyPolicyOverride: decisionPolicy });
}

async function minimalAlternatingInitiativeRoom(): Promise<EncounterState> {
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

async function validRecalculationRoom(): Promise<EncounterState> {
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

class RecordingConversationAdapter implements AgentSessionAdapter {
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

function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function d569BoardSnapshotService(directory: string): ConversationBoardSnapshotService {
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

type IncompleteCatalogExit = 'timed_out' | 'cancelled' | 'infrastructure_failed';
type IncompleteCatalogEvidenceFactory = (
  dispatchId: EngineDispatchId,
) => Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;

function incompleteCatalogAdapter(
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

function classifiedInvalidCatalog(
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

async function runIncompleteCatalogIntegrityStop(
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

class BoilerplateThenValidStructuredFinalAdapter implements AgentSessionAdapter {
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

function serializedToolCall(
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

class SerializedRoundTripAdapter implements AgentSessionAdapter {
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

function pendingArenaReactionState(): EncounterState {
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

function oversizedTurnContextState(): EncounterState {
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

function preparedMonsterRoundRevision(initialState: EncounterState): {
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

const LEGACY_BLOCK_ARGS = [
  '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
] as const;

const ALL_OPTIONS_TEST_RENDERER_ARGS = [
  '--renderer-profile', JSON.stringify({
    ...DEFAULT_RENDERER_PROFILE,
    rows: 'off',
    movement: 'material_only',
    threats: 'counts_exception_ids',
    rare: 'triggered',
    knowledge: 'relevance_gated',
    frontier: 'off',
    failures: 'headline_codes',
    adverts: 'full',
    misc: 'merged',
    optionDetail: 'top2_stubs',
  }),
] as const;

function producerHash(value: unknown): string {
  return sha256(typeof value === 'function'
    ? Function.prototype.toString.call(value)
    : JSON.stringify(value));
}

async function producerMutationReceipt<Dependency, Result>(
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

describe('AI-DM engine MCP conversation runner', () => {
  it('omits DM-only intel_mode from blind planned context arguments', () => {
    const common = { runId: 'encounter:profiled-context', expectedRevision: 7, intelMode: 'full' as const };
    expect(profiledTurnContextArguments({ ...common, blind: true })).toEqual({
      run_id: common.runId, expected_revision: 7, scope: 'round', granularity: 'full',
    });
    expect(profiledTurnContextArguments({ ...common, blind: false })).toEqual({
      run_id: common.runId, expected_revision: 7, scope: 'round', intel_mode: 'full', granularity: 'full',
    });
  });

  it('persists indeterminate artifact and forensic row before raising the typed integrity STOP', () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-integrity-stop-'));
    const launcherPath = join(directory, 'launcher.json');
    const proposalSpoolPath = join(directory, 'proposal.jsonl');
    const contextSpoolPath = join(directory, 'context.jsonl');
    const artifactPath = join(directory, 'integrity.json');
    const rowPath = join(directory, 'rows.jsonl');
    writeFileSync(launcherPath, '{"immutable":true}', 'utf8');
    writeFileSync(proposalSpoolPath, '{"staged":"unconsumed"}\n', 'utf8');
    writeFileSync(contextSpoolPath, '', 'utf8');
    writeFileSync(rowPath, '', 'utf8');
    const dispatchId = engineDispatchId('engine-dispatch:indeterminate-test-0001');
    let stopped: unknown;
    try {
      persistD569IntegrityStop({
        artifactPath,
        rowPath,
        scheduledCellKey: '9:3',
        launcherPath,
        proposalSpoolPath,
        contextSpoolPath,
        catalogEvidence: { status: 'inconclusive', dispatchId, reason: 'no_correlated_catalog' },
        delivery: {
          status: 'indeterminate', dispatchId, reason: 'catalog_inconclusive_empty_context_spool',
          measurement: null, integrityAction: 'stop_after_persist',
        },
        turn: {
          exit: 'completed', resumeSessionId: agentSessionIdFromCli('agent-session:indeterminate'),
          sessionId: null, finalText: 'model reported no engine interface', usage: null,
          processEvidence: {
            startedAtUnixMs: 1, endedAtUnixMs: 2, exitCode: 0, signal: null,
            stdout: 'partial evidence', stderr: '', decodedEvents: [],
          },
          partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
          engineCatalogEvidence: { status: 'inconclusive', dispatchId, reason: 'no_correlated_catalog' },
        },
      });
    } catch (error) { stopped = error; }

    expect(stopped).toMatchObject({ name: 'D569IntegrityStop' });
    expect(JSON.parse(readFileSync(artifactPath, 'utf8'))).toEqual(expect.objectContaining({
      kind: 'dispatch_integrity_indeterminate', scheduledCellKey: '9:3', dispatchId,
      processEvidence: expect.objectContaining({ stdout: 'partial evidence', exitCode: 0 }),
      partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
      proposalSpool: expect.objectContaining({ recordCount: 1, stagedUnconsumed: true }),
      contextSpool: expect.objectContaining({ recordCount: 0 }),
    }));
    expect(JSON.parse(readFileSync(rowPath, 'utf8'))).toEqual(expect.objectContaining({
      rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
      authorizedPlan: null, execution: null,
      engineCatalogEvidence: { status: 'inconclusive', dispatchId, reason: 'no_correlated_catalog' },
      turnContextDelivery: expect.objectContaining({ status: 'indeterminate', dispatchId }),
    }));
    expect(readFileSync(proposalSpoolPath, 'utf8')).toBe('{"staged":"unconsumed"}\n');
  });

  it('classifies a timeout after catalog observation but before a tool call without an integrity STOP', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-runner-catalog-timeout-'));
    const outPath = join(directory, 'rows.jsonl');
    const boardSnapshotService: ConversationBoardSnapshotService = {
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
        const html = Buffer.from('<!doctype html><main>timeout evidence</main>\n');
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
    const adapter: AgentSessionAdapter = {
      kind: 'codex',
      probe: async () => ({ present: true, version: 'SIMULATED' }),
      start: async (invocation) => {
        if (invocation.engineDispatchId === undefined) throw new Error('Timeout fixture lacks dispatch identity.');
        return {
          exit: 'timed_out', resumeSessionId: null, sessionId: 'partial-timeout-session',
          finalText: 'catalog observed before timeout', usage: null, timeoutMs: 180_000,
          processEvidence: {
            startedAtUnixMs: 10, endedAtUnixMs: 20, exitCode: null, signal: 'SIGTERM',
            stdout: 'catalog observed before timeout', stderr: '', decodedEvents: [],
          },
          partialResultEvidence: {
            status: 'partial', decodedEventCount: 1, finalTextFragment: 'catalog observed before timeout',
            observedUsage: null, stagedInvocationIds: [],
          },
          engineCatalogEvidence: {
            status: 'inconclusive', dispatchId: invocation.engineDispatchId,
            reason: 'no_correlated_catalog',
          },
        };
      },
      resume: async () => { throw new Error('Timeout fixture unexpectedly resumed.'); },
      classifyFailure: () => 'unknown',
    };
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--dm-mode', 'advice', '--dry-run',
    ]), { adapter, boardSnapshotService });
    expect(result.rows[0]).toMatchObject({
      outcome: 'refused', fallbackReason: 'timeout',
      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
    });
  });

  it('persists primary D569 timeout evidence before applying the expired round deadline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-primary-expired-evidence-'));
    const outPath = join(directory, 'rows.jsonl');
    let policyMs = 0;
    let observedExit: AgentTurnResult['exit'] | null = null;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--dm-mode', 'advice', '--dry-run',
    ]), {
      adapter: incompleteCatalogAdapter('timed_out', 'no_correlated_catalog'),
      boardSnapshotService: d569BoardSnapshotService(directory),
      policyNow: () => policyMs,
      onPrimaryResultObservedForTest: (turn) => {
        observedExit = turn.exit;
        policyMs = 180_000;
      },
    });

    expect(observedExit).toBe('timed_out');
    expect(result.rows[0]).toMatchObject({
      rowContractVersion: 'arena-row-v3',
      outcome: 'refused', fallbackReason: 'timeout', roundWallTimedOut: true,
      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
      authorizedPlan: null,
    });
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).toMatchObject({
      rowContractVersion: 'arena-row-v3',
      outcome: 'refused', fallbackReason: 'timeout',
      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
    });
  });

  it.each(['timed_out', 'cancelled'] as const)(
    'persists forensic evidence and STOPs on a %s dispatch with a contradictory catalog',
    async (exit) => {
      const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
        exit,
        'conflicting_success_and_failure',
        true,
      );
      expect(row).toMatchObject({
        rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
        engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
        turnContextDelivery: {
          status: 'indeterminate', measurement: null, integrityAction: 'stop_after_persist',
        },
        authorizedPlan: null, execution: null,
      });
      expect(row).not.toHaveProperty('failingDispatch');
      expect(row).not.toHaveProperty('planner');
      expect(artifact).toMatchObject({
        kind: 'dispatch_integrity_indeterminate',
        catalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
        delivery: { status: 'indeterminate' }, contextSpool: { recordCount: 0 },
        processEvidence: { stdout: `partial ${exit} output` },
        partialResultEvidence: { status: 'partial', finalTextFragment: `partial ${exit} output` },
      });
      if (launcher.proposalSpoolPath === undefined) throw new Error('Integrity launcher omitted proposal spool.');
      expect(readFileSync(launcher.proposalSpoolPath, 'utf8')).toBe('');
    },
  );

  it.each([
    ['timed_out', 'malformed'],
    ['timed_out', 'wrong_profile'],
    ['cancelled', 'malformed'],
    ['cancelled', 'wrong_profile'],
  ] as const)(
    'persists forensic evidence and STOPs on a %s dispatch with an invalid %s catalog',
    async (exit, source) => {
      const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
        exit,
        (dispatchId) => classifiedInvalidCatalog(dispatchId, source),
        true,
      );
      expect(row).toMatchObject({
        rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
        engineCatalogEvidence: { status: 'inconclusive', reason: 'invalid_catalog_response' },
        turnContextDelivery: {
          status: 'indeterminate', measurement: null, integrityAction: 'stop_after_persist',
        },
        authorizedPlan: null, execution: null,
      });
      expect(row).not.toHaveProperty('failingDispatch');
      expect(row).not.toHaveProperty('planner');
      expect(artifact).toMatchObject({
        kind: 'dispatch_integrity_indeterminate',
        catalogEvidence: { status: 'inconclusive', reason: 'invalid_catalog_response' },
        delivery: { status: 'indeterminate' }, contextSpool: { recordCount: 0 },
        processEvidence: { stdout: `partial ${exit} output` },
        partialResultEvidence: { status: 'partial', finalTextFragment: `partial ${exit} output` },
      });
      if (launcher.proposalSpoolPath === undefined) throw new Error('Integrity launcher omitted proposal spool.');
      expect(readFileSync(launcher.proposalSpoolPath, 'utf8')).toBe('');
    },
  );

  it('persists a runner forensic row before propagating conflicting startup evidence', async () => {
    const { row, artifact, launcher } = await runIncompleteCatalogIntegrityStop(
      'infrastructure_failed',
      'no_correlated_catalog',
    );
    expect(row).toMatchObject({
      rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate', passed: false,
      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
      turnContextDelivery: {
        status: 'indeterminate', measurement: null, integrityAction: 'stop_after_persist',
      },
      authorizedPlan: null, execution: null,
    });
    expect(row).not.toHaveProperty('failingDispatch');
    expect(artifact).toMatchObject({
      kind: 'dispatch_integrity_indeterminate',
      delivery: { status: 'indeterminate' }, contextSpool: { recordCount: 0 },
      processEvidence: { stdout: 'partial infrastructure_failed output', stderr: 'startup failed' },
      partialResultEvidence: { status: 'partial', finalTextFragment: 'partial infrastructure_failed output' },
    });
    if (launcher.turnContextSpoolPath === undefined) throw new Error('Integrity launcher omitted context spool.');
    expect(readFileSync(launcher.turnContextSpoolPath, 'utf8')).toBe('');
  });

  it('persists delivered context and process evidence before propagating conflicting startup evidence', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-runner-startup-integrity-'));
    const outPath = join(directory, 'rows.jsonl');
    let launcherToken: string | null = null;
    const adapter: AgentSessionAdapter = {
      kind: 'codex',
      probe: async () => ({ present: true, version: 'SIMULATED' }),
      start: async (invocation) => {
        launcherToken = invocation.launcherToken;
        const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
        if (manifest.dispatchId === undefined) throw new Error('Integrity fixture launcher lacks dispatch identity.');
        if (manifest.turnContextSpoolPath === undefined || manifest.dispatchPhase === undefined) {
          throw new Error('Integrity fixture launcher lacks a context spool.');
        }
        writeFileSync(manifest.turnContextSpoolPath, `${JSON.stringify({
          granularity: 'full', semantic_board: { provenance: { format: 'test-semantic-board-v1' } },
          dispatchId: manifest.dispatchId, dispatchProfile: 'dm', dispatchPhase: manifest.dispatchPhase,
        })}\n`, 'utf8');
        return {
          exit: 'infrastructure_failed', resumeSessionId: null, sessionId: 'partial-session',
          finalText: 'partial startup output', usage: null,
          processEvidence: {
            startedAtUnixMs: 10, endedAtUnixMs: 20, exitCode: 1, signal: null,
            stdout: 'partial startup output', stderr: 'required engine startup failed', decodedEvents: [],
          },
          partialResultEvidence: {
            status: 'partial', decodedEventCount: 0, finalTextFragment: 'partial startup output',
            observedUsage: null, stagedInvocationIds: [],
          },
          engineCatalogEvidence: {
            status: 'inconclusive', dispatchId: manifest.dispatchId,
            reason: 'conflicting_success_and_failure',
          },
          component: 'engine_mcp_startup', failureReason: 'required engine startup failed',
        };
      },
      resume: async () => { throw new Error('Integrity fixture unexpectedly resumed.'); },
      classifyFailure: () => 'unknown',
    };
    await expect(runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--dm-mode', 'advice', '--board-image', 'off', '--dry-run',
    ]), { adapter })).rejects.toBeInstanceOf(D569IntegrityStop);
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).toMatchObject({
      rowContractVersion: 'arena-row-v3', outcome: 'integrity_indeterminate',
      engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
      turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
    });
    if (launcherToken === null) throw new Error('Integrity fixture did not observe its launcher.');
    const artifactPath = join(dirname(launcherToken), 'room-1-round-1-dispatch-integrity.json');
    expect(JSON.parse(readFileSync(artifactPath, 'utf8'))).toMatchObject({
      delivery: { status: 'delivered' }, contextSpool: { recordCount: 1 },
      processEvidence: { stdout: 'partial startup output', stderr: 'required engine startup failed' },
      partialResultEvidence: { status: 'partial', finalTextFragment: 'partial startup output' },
    });
  });

  it('rejects a request after the MCP child closes stdin without an unhandled EPIPE', async () => {
    const child = spawn(process.execPath, ['-e', [
      "process.on('SIGTERM', () => {});",
      "require('node:fs').closeSync(0);",
      "process.stderr.write('READY\\n');",
      'setInterval(() => {}, 1_000);',
    ].join(' ')], { stdio: ['pipe', 'pipe', 'pipe'] });
    const client = createMcpClient(child);
    await once(child.stderr, 'data');

    await expect(mcpRequest(client, 'tools/list', {})).rejects.toBeInstanceOf(McpChildExited);
    expect(child.exitCode).toBeNull();
    expect(child.signalCode).toBeNull();
    await stopMcpClient(client, true);
    expect(child.signalCode).toBe('SIGKILL');
  });

  it('routes a readline input error through typed rejection and complete teardown', async () => {
    const child = spawn(process.execPath, ['-e', [
      'process.stdin.resume();',
      'setInterval(() => {}, 1_000);',
    ].join(' ')], { stdio: ['pipe', 'pipe', 'pipe'] });
    const client = createMcpClient(child);
    const request = mcpRequest(client, 'tools/list', {});
    void request.catch(() => {});
    const failure = new Error('SIMULATED stdout failure');

    try {
      expect(() => child.stdout.emit('error', failure)).not.toThrow();
      await expect(request).rejects.toMatchObject({
        name: 'McpChildExited',
        code: 'MCP_CHILD_EXITED',
        cause: failure,
      });
      expect(client.pending.size).toBe(0);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await client.exit;
      await request.catch(() => {});
    }
  });

  it('rejects an in-flight MCP request specifically on child exit', async () => {
    const child = spawn(process.execPath, ['-e', [
      'process.stdin.resume();',
      'setInterval(() => {}, 1_000);',
    ].join(' ')], { stdio: ['pipe', 'pipe', 'pipe'] });
    const client = createMcpClient(child);
    const request = mcpRequest(client, 'tools/list', {});
    const closed = once(child, 'close');

    child.emit('exit', 7, null);

    await expect(request).rejects.toMatchObject({
      name: 'McpChildExited',
      code: 'MCP_CHILD_EXITED',
      message: expect.stringContaining('exited with code 7'),
    });
    await expect(client.exit).resolves.toBe(7);
    child.kill('SIGKILL');
    await closed;
  });

  it('rejects on stdout closure and terminates a child that remains alive', async () => {
    const child = spawn(process.execPath, ['-e', [
      'process.stdin.resume();',
      "process.stdin.once('data', () => require('node:fs').closeSync(1));",
      'setInterval(() => {}, 1_000);',
    ].join(' ')], { stdio: ['pipe', 'pipe', 'pipe'] });
    const client = createMcpClient(child);

    await expect(mcpRequest(client, 'tools/list', {})).rejects.toMatchObject({
      name: 'McpChildExited',
      code: 'MCP_CHILD_EXITED',
      message: expect.stringContaining('stdout closed'),
    });
    expect(client.pending.size).toBe(0);
    await stopMcpClient(client, true);
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
  });

  it('refuses an MCP request issued after the child has exited', async () => {
    const child = spawn(process.execPath, ['-e', 'process.exit(0)'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const client = createMcpClient(child);
    await client.exit;
    const write = vi.spyOn(child.stdin, 'write');

    await expect(mcpRequest(client, 'tools/list', {})).rejects.toBeInstanceOf(McpChildExited);
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });

  it('preserves a request failure through the caller try/finally cleanup path', async () => {
    const child = spawn(process.execPath, ['-e', [
      'process.stdin.resume();',
      "process.stdin.once('data', () => process.exit(7));",
    ].join(' ')], { stdio: ['pipe', 'pipe', 'pipe'] });
    const client = createMcpClient(child);
    let primaryFailure: unknown;
    let surfacedFailure: unknown;

    try {
      await (async () => {
        try {
          await mcpRequest(client, 'tools/list', {});
        } catch (error) {
          primaryFailure = error;
          throw error;
        } finally {
          await stopMcpClient(client);
        }
      })();
    } catch (error) {
      surfacedFailure = error;
    }

    expect(surfacedFailure).toBe(primaryFailure);
    expect(surfacedFailure).toBeInstanceOf(McpChildExited);
  });

  it('reports standalone abnormal MCP termination as a typed error', async () => {
    const child = spawn(process.execPath, ['-e', 'process.exit(9)'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const client = createMcpClient(child);

    await expect(stopMcpClient(client)).rejects.toBeInstanceOf(McpChildExited);
  });

  it('authorizes a serialized revision-bound Dodge proposal', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-dodge-'));
    const adapter = new SerializedRoundTripAdapter('use_action_dodge', [], true);
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });
    const rejectionReasons = result.rows[0]?.chainEvidence.failedAttempts
      .flatMap((attempt) => attempt.rejectionReasons) ?? [];

    expect(adapter.submittedOptions).toContainEqual(expect.objectContaining({ label: 'Dodge' }));
    expect(adapter.decodedOptions).toContainEqual(expect.objectContaining({
      action_slots: [{ slot: 'main', use: { kind: 'dodge' } }],
    }));
    expect(rejectionReasons).not.toContain('The engine could not authorize this proposal mechanic.');
    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized', refusals: [], overridePolicy: 'typed_reason',
    }));
    expect(result.rows[0]).toEqual(expect.objectContaining({
      plannedBy: { model: 'gpt-5.6-sol', effort: 'medium' },
      escalated: false,
      escalationModel: null,
      rationale: null,
      authorizedPlan: expect.arrayContaining([expect.objectContaining({
        reason: expect.stringContaining('exercise the serialized decision path'),
      })]),
    }));
    expect(result.rows[0]?.stateBinding.authorization).toEqual(result.rows[0]?.stateBinding.capsule);
    expect(adapter.sessionSnapshotValidations).toBeGreaterThan(0);
  });

  it('authorizes targeted Web and non-targeted Dodge through composite options', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-web-'));
    const adapter = new SerializedRoundTripAdapter('targeted_web');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.submittedOptions.some((option) => String(option['label']).includes('Web'))).toBe(true);
    expect(adapter.submittedOptions).toContainEqual(expect.objectContaining({ label: 'Dodge' }));
    expect(adapter.decodedOptions.some((option) => JSON.stringify(option['action_slots']).includes('web'))).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
    expect(result.rows[0]?.chainEvidence.failedAttempts.flatMap((attempt) => attempt.rejectionReasons))
      .not.toContain('Utility action web cannot authorize a target.');
  });

  it('round-trips the End Turn option emitted by the tactical context', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-end-turn-'));
    const adapter = new SerializedRoundTripAdapter('option_shaped_end_turn');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.submittedOptions).toContainEqual(expect.objectContaining({ label: 'End Turn' }));
    expect(adapter.decodedOptions).toContainEqual(expect.objectContaining({
      action_slots: [{ slot: 'main', use: { kind: 'end_turn' } }],
    }));
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
  });

  function primaryCodexArgvBytes(dispatched: AgentInvocation): string {
    return JSON.stringify(codexArgv({
      cwd: '/SIMULATED/workspace',
      model: dispatched.model,
      reasoningEffort: dispatched.reasoningEffort,
      engineCommand: '/SIMULATED/node',
      engineArgs: ['/SIMULATED/engine-mcp.mjs', '/SIMULATED/primary-launcher.json'],
      instructions: null,
      sessionId: 'SIMULATED-base-session',
    }));
  }

  it('wall begins before initial without speculation', async () => {
    const startsAtFirstDispatch: typeof createConversationRoundDeadline = (budgetMs, _startedAtMs, now) => {
      let deadline: AgentDispatchDeadline | null = null;
      const current = (): AgentDispatchDeadline => {
        deadline ??= createConversationRoundDeadline(budgetMs, now(), now);
        return deadline;
      };
      return {
        get signal() { return current().signal; },
        dispatch: (invocation) => current().dispatch(invocation),
        acceptsCompletion: () => current().acceptsCompletion(),
      };
    };
    const produce = async (roundDeadlineFactory: typeof createConversationRoundDeadline) => {
      const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-round-wall-start-'));
      const adapter = new RecordingConversationAdapter();
      let policyMs = 0;
      const result = await runConversation(parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--timeout-ms', '180000',
        ...LEGACY_BLOCK_ARGS,
      ]), {
        adapter,
        roomStates: [generateRoom(3_943_006).encounter.state],
        policyNow: () => policyMs,
        onPrimaryDispatchStart: () => { policyMs = 25; },
        roundDeadlineFactory,
      });
      const firstInvocation = adapter.startInvocations[0];
      const row = result.rows[0];
      if (firstInvocation === undefined || row === undefined) {
        throw new Error('Round-wall fixture produced no initial invocation or row.');
      }
      return {
        initialTimeoutMs: firstInvocation.timeoutMs,
        roundWallBudgetMs: row.roundWallBudgetMs,
        roundWallTimedOut: row.roundWallTimedOut,
        policyElapsedMs: row.policyElapsedMs,
        speculationPlanner: row.speculationPlanner,
      };
    };
    type Evidence = Awaited<ReturnType<typeof produce>>;
    const prove = (value: Evidence): void => {
      expect(value).toEqual({
        initialTimeoutMs: 179_975,
        roundWallBudgetMs: 180_000,
        roundWallTimedOut: false,
        policyElapsedMs: 25,
        speculationPlanner: null,
      });
    };
    await producerMutationReceipt(
      'wall begins before initial without speculation',
      createConversationRoundDeadline,
      startsAtFirstDispatch,
      produce,
      prove,
    );
  });

  it('speculation uses arm base until trigger', async () => {
    type SpeculationSelector = NonNullable<ConversationRunOptions['selectSpeculationPlanner']>;
    const armBaseSelector: SpeculationSelector = (base) => base;
    const escalationBaseSelector: SpeculationSelector = (base, escalation) => escalation ?? base;
    const roomState = await minimalAlternatingInitiativeRoom();
    const produce = async (selectSpeculationPlanner: SpeculationSelector) => {
      const speculationDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-base-'));
      const speculationAdapter = new SerializedRoundTripAdapter('attack');
      const speculative = await runConversation(parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(speculationDirectory, 'rows.jsonl'),
        '--combat-model', 'initiative_segments_v1', '--model', 'gpt-5.6-luna', '--effort', 'low',
        '--escalation-model', 'gpt-5.6-luna', '--escalation-effort', 'high', '--dry-run',
      ]), {
        adapter: speculationAdapter,
        roomStates: [roomState],
        selectSpeculationPlanner,
      });
      const speculativeRow = speculative.rows[0];
      if (speculativeRow === undefined) throw new Error('Speculation planner fixture produced no row.');
      return {
        speculationPlanner: speculativeRow.speculationPlanner,
        speculationEntryPlanners: speculativeRow.speculations.flatMap((entry) =>
          'plannedBy' in entry ? [entry.plannedBy] : []),
        speculationStatuses: speculativeRow.speculations.map((entry) => entry.status),
        speculationDiscardReasons: speculativeRow.speculations.flatMap((entry) =>
          entry.status === 'discarded' ? [entry.discardReason] : []),
        preTriggerEscalated: speculativeRow.escalated,
      };
    };
    type Evidence = Awaited<ReturnType<typeof produce>>;
    const prove = (value: Evidence): void => {
      expect(value.speculationPlanner).toEqual({ model: 'gpt-5.6-luna', effort: 'low' });
      expect(value.speculationEntryPlanners.every((planner) =>
        planner.model === 'gpt-5.6-luna' && planner.effort === 'low')).toBe(true);
      expect(value.speculationStatuses.length).toBeGreaterThan(0);
      expect(value.speculationDiscardReasons).not.toContain('dispatch_failed');
      expect(value.preTriggerEscalated).toBe(false);
    };
    await producerMutationReceipt(
      'speculation uses arm base until trigger',
      armBaseSelector,
      escalationBaseSelector,
      produce,
      prove,
    );

    const escalationDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversation-triggered-escalation-'));
    const escalationAdapter = new SerializedRoundTripAdapter('invalid_initial_and_correction');
    const escalated = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(escalationDirectory, 'rows.jsonl'),
      '--model', 'gpt-base', '--effort', 'low',
      '--escalation-model', 'gpt-5.6-luna', '--escalation-effort', 'high',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      adapter: escalationAdapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });
    expect(escalationAdapter.resumeInvocations[0]).toEqual(expect.objectContaining({
      model: 'gpt-base', reasoningEffort: 'low',
    }));
    expect(escalationAdapter.startInvocations[1]).toEqual(expect.objectContaining({
      model: 'gpt-5.6-luna', reasoningEffort: 'high',
      bootstrap: expect.objectContaining({ kind: 'escalation' }),
    }));
    expect(escalated.rows[0]).toEqual(expect.objectContaining({
      escalationTrigger: 'validation_failures',
      plannedBy: { model: 'gpt-5.6-luna', effort: 'high' },
    }));
  });

  it('restricted wall excludes engine work and includes later speculation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-restricted-wall-'));
    const adapter = new SerializedRoundTripAdapter('first_shown');
    let policyMs = 0;
    let crossedEngineBoundary = false;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--model', 'gpt-5.6-luna', '--effort', 'low',
      '--escalation-model', 'gpt-5.6-luna', '--escalation-effort', 'high', '--dry-run',
    ]), {
      adapter,
      roomStates: [await alternatingInitiativeRoom()],
      policyNow: () => policyMs,
      onPrimaryDispatchStart: () => { policyMs += 10; },
      onSpeculationDispatchStart: () => { policyMs += 20; },
      mutateBeforeSpeculationBoundary: (state) => {
        if (!crossedEngineBoundary) {
          crossedEngineBoundary = true;
          policyMs += 1_000;
        }
        return state;
      },
    });

    expect(crossedEngineBoundary).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      policyElapsedMs: 30,
      roundWallTimedOut: false,
      speculationPlanner: { model: 'gpt-5.6-luna', effort: 'low' },
    }));
  });

  it.each([1_000, 200_000])(
    'fallback computation of %i ms remains outside the restricted wall',
    async (fallbackWorkMs) => {
      const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fallback-wall-'));
      const adapter = new SerializedRoundTripAdapter('invalid_initial_and_correction');
      let policyMs = 0;
      let fallbackComputations = 0;
      const result = await runConversation(parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        ...LEGACY_BLOCK_ARGS,
      ]), {
        adapter,
        roomStates: [generateRoom(3_943_006).encounter.state],
        policyNow: () => policyMs,
        onDeterministicFallback: () => {
          fallbackComputations += 1;
          policyMs += fallbackWorkMs;
        },
      });

      expect(fallbackComputations).toBeGreaterThan(1);
      expect(result.rows[0]).toEqual(expect.objectContaining({
        outcome: 'authorized',
        planner: 'sim_controller',
        policyElapsedMs: 0,
        roundWallTimedOut: false,
      }));
    },
  );

  it('expired speculative adoption validation cannot adopt or execute that branch', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-adoption-deadline-'));
    const outPath = join(directory, 'rows.jsonl');
    const adapter = new SerializedRoundTripAdapter('first_shown');
    let policyMs = 0;
    let validated = false;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      adapter,
      roomStates: [await alternatingInitiativeRoom()],
      policyNow: () => policyMs,
      onSpeculationAdoptionValidated: () => {
        validated = true;
        policyMs = 180_000;
      },
    });

    expect(validated).toBe(true);
    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded',
      adopted: false,
      discardReason: 'budget_expired',
    }));
    const persisted = objectValue(
      JSON.parse(readFileSync(outPath, 'utf8').trim()) as unknown,
      'persisted adoption-expiry row',
    );
    const expiryEvidence = expect.objectContaining({
      outcome: 'refused',
      roundWallTimedOut: true,
      policyElapsedMs: 180_000,
      refusals: ['The conversation round dispatch deadline is exhausted.'],
      monsterSegments: [],
    });
    expect(result.rows[0]).toEqual(expiryEvidence);
    expect(persisted).toEqual(expiryEvidence);
  });

  it('expired recalculation authorization cannot retain or execute recalculated entries on the real path', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-recalculation-deadline-'));
    const adapter = new SerializedRoundTripAdapter('attack');
    let policyMs = 0;
    let validatedActorIds: readonly CombatantId[] | null = null;
    let retainedRecalculation: readonly unknown[] | null | undefined;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      adapter,
      roomStates: [await validRecalculationRoom()],
      policyNow: () => policyMs,
      forceSpeculationRecalculation: true,
      onSpeculationRecalculationValidated: (entries) => {
        validatedActorIds = entries.map((entry) => entry.proposal.actorId);
        policyMs = 180_000;
      },
      onSpeculationRecalculationResolved: (entries) => { retainedRecalculation = entries; },
    });

    expect(adapter.resumeInvocations).toContainEqual(expect.objectContaining({
      callPhase: 'speculation_recalculation',
    }));
    expect(validatedActorIds).toHaveLength(3);
    expect(validatedActorIds).toEqual(expect.arrayContaining([
      combatantId('combatant:generated-3943001-monster-1'),
      combatantId('combatant:generated-3943001-monster-2'),
      combatantId('combatant:generated-3943001-monster-3'),
    ]));
    expect(retainedRecalculation).toBeNull();
    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'refused',
      roundWallTimedOut: true,
      policyElapsedMs: 180_000,
      refusals: ['The conversation round dispatch deadline is exhausted.'],
      monsterSegments: [],
    }));
  });

  it('one rejected submission uses arm-base correction before D474 escalation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-rejected-submission-'));
    const adapter = new BoilerplateThenValidStructuredFinalAdapter();
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--model', 'gpt-5.6-luna', '--effort', 'low',
      '--escalation-model', 'gpt-5.6-luna', '--escalation-effort', 'high',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.resumeInvocations).toHaveLength(1);
    expect(adapter.resumeInvocations[0]).toEqual(expect.objectContaining({
      model: 'gpt-5.6-luna', reasoningEffort: 'low', callPhase: 'correction',
    }));
    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized',
      escalated: false,
      escalationTrigger: null,
      plannedBy: { model: 'gpt-5.6-luna', effort: 'low' },
    }));
  });

  it('empty structured correction is not D474 validation evidence on the real path', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-empty-structured-correction-'));
    const adapter = new BoilerplateThenValidStructuredFinalAdapter('empty');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--model', 'gpt-5.6-luna', '--effort', 'low',
      '--escalation-model', 'gpt-5.6-luna', '--escalation-effort', 'high',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.resumeInvocations).toHaveLength(1);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized',
      escalated: false,
      escalationTrigger: null,
      planner: expect.stringMatching(/^(?:engine_default|sim_controller)$/u),
      decisionRejectionCodes: ['REASON_REQUIRED', 'decision_missing'],
    }));
  });

  it('correction refusal triggers a fresh D474 escalation on the real path', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-correction-refusal-'));
    const adapter = new BoilerplateThenValidStructuredFinalAdapter('refusal');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--model', 'gpt-5.6-luna', '--effort', 'low',
      '--escalation-model', 'gpt-5.6-luna', '--escalation-effort', 'high',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.resumeInvocations).toHaveLength(1);
    expect(adapter.startInvocations).toHaveLength(2);
    expect(adapter.startInvocations[1]).toEqual(expect.objectContaining({
      model: 'gpt-5.6-luna', reasoningEffort: 'high', callPhase: 'correction',
      bootstrap: expect.objectContaining({ kind: 'escalation' }),
    }));
    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized',
      escalated: true,
      escalationTrigger: 'refusal',
      plannedBy: { model: 'gpt-5.6-luna', effort: 'high' },
    }));
  });

  it('actual refusal is the only single-attempt D474 trigger', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-explicit-refusal-'));
    const adapter = new SerializedRoundTripAdapter('explicit_refusal_then_escalation');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--model', 'gpt-5.6-luna', '--effort', 'low',
      '--escalation-model', 'gpt-5.6-luna', '--escalation-effort', 'high',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.startInvocations).toHaveLength(2);
    expect(adapter.resumeInvocations).toHaveLength(0);
    expect(adapter.startInvocations[1]).toEqual(expect.objectContaining({
      model: 'gpt-5.6-luna', reasoningEffort: 'high', callPhase: 'correction',
      bootstrap: expect.objectContaining({ kind: 'escalation' }),
    }));
    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized',
      escalated: true,
      escalationTrigger: 'refusal',
      plannedBy: { model: 'gpt-5.6-luna', effort: 'high' },
    }));
  });

  it('keeps tiered primary argv/config byte-identical and isolates escalation from the base session', { timeout: 60_000 }, async () => {
    const untieredDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversation-primary-untiered-'));
    const tieredDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversation-primary-tiered-'));
    const untieredAdapter = new SerializedRoundTripAdapter('invalid_then_dodge');
    const tieredAdapter = new SerializedRoundTripAdapter('invalid_initial_and_correction');
    const commonArgs = [
      '--rooms', '1', '--rounds', '1', '--model', 'gpt-base', '--effort', 'low',
      ...LEGACY_BLOCK_ARGS,
    ] as const;

    await runConversation(parseConversationArgs([
      ...commonArgs, '--out', join(untieredDirectory, 'rows.jsonl'),
    ]), { adapter: untieredAdapter, roomStates: [generateRoom(3_943_006).encounter.state] });
    await runConversation(parseConversationArgs([
      ...commonArgs, '--out', join(tieredDirectory, 'rows.jsonl'),
      '--escalation-model', 'gpt-escalation', '--escalation-effort', 'high',
    ]), { adapter: tieredAdapter, roomStates: [generateRoom(3_943_006).encounter.state] });

    const untieredPrimary = untieredAdapter.startInvocations[0];
    const tieredPrimary = tieredAdapter.startInvocations[0];
    if (untieredPrimary === undefined || tieredPrimary === undefined) {
      throw new Error('SIMULATED primary dispatch was not recorded.');
    }
    expect(primaryCodexArgvBytes(tieredPrimary)).toBe(primaryCodexArgvBytes(untieredPrimary));
    expect(tieredAdapter.startInvocations).toHaveLength(2);
    expect(tieredAdapter.resumeInvocations).toHaveLength(1);
    expect(tieredAdapter.resumeInvocations[0]).toEqual(expect.objectContaining({
      model: 'gpt-base', reasoningEffort: 'low',
    }));
    expect(tieredAdapter.resumeInvocations[0]).not.toHaveProperty('bootstrap');
    expect(tieredAdapter.startInvocations[1]?.instructions).toContain('OFFENSIVE corrected round');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('every actor with a legal attack must attack');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('Dash-to-close counts as offense for out-of-reach melee');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('Dodge is allowed only when that actor has no resolvable action');
    const escalation = tieredAdapter.startInvocations[1];
    if (escalation?.instructions === undefined || escalation.instructions === null) {
      throw new Error('Configured escalation omitted its typed startup instructions.');
    }
    expect(escalation.bootstrap).toMatchObject({
      kind: 'escalation', knowledgeBaseBundleHash: DEFAULT_KB_HASH,
      stateDelivery: 'full_engine_context',
    });
    const startupOrder = [
      escalation.instructions.indexOf('## Role'),
      escalation.instructions.indexOf('When a melee creature cannot reach an enemy'),
      escalation.instructions.indexOf('[SESSION_DIGEST]'),
      escalation.instructions.indexOf('[FULL_ENGINE_CONTEXT]'),
      escalation.instructions.indexOf('OFFENSIVE corrected round'),
    ];
    expect(startupOrder.every((position) => position >= 0)).toBe(true);
    expect(startupOrder).toEqual([...startupOrder].sort((left, right) => left - right));
    expect(untieredAdapter.startInvocations).toHaveLength(1);
    expect(untieredAdapter.resumeInvocations).toHaveLength(1);
  });

  it('constructs no escalation adapter or bootstrap for the exact post-shift no-flag control shape (mutation: implicit escalation default)', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-no-escalation-'));
    const adapter = new SerializedRoundTripAdapter('invalid_then_dodge');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--model', 'gpt-5.6-luna', '--effort', 'low',
      ...LEGACY_BLOCK_ARGS,
    ]);
    expect({ escalationModel: config.escalationModel, escalationEffort: config.escalationEffort })
      .toEqual({ escalationModel: null, escalationEffort: null });

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.bootstrap).toEqual({ kind: 'cold_start' });
    expect(adapter.resumeInvocations).toHaveLength(1);
    expect(adapter.resumeInvocations[0]?.bootstrap).toBeUndefined();
    expect(result.rows[0]).toEqual(expect.objectContaining({
      escalated: false,
      escalationModel: null,
      escalationSessionId: null,
    }));
  });

  it('keeps one sitting across rooms, rolls only at threshold, and explicit end prevents resume', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-sitting-rollover-'));
    const adapter = new SerializedRoundTripAdapter('first_shown', [1_000, 73]);
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);
    const policy = {
      kind: 'measured',
      threshold: measuredContextRolloverThreshold(1_000),
      evidence: 'SIMULATED conversation boundary',
    } as const;
    const result = await runConversation(config, {
      adapter,
      contextRolloverPolicy: policy,
      endSession: true,
    });

    expect(adapter.startInvocations).toHaveLength(2);
    expect(adapter.resumeInvocations).toHaveLength(0);
    expect(adapter.startInvocations[1]?.bootstrap).toMatchObject({ kind: 'context_rollover' });
    expect(result.rows.map((row) => ({
      room: row.room,
      generation: row.agentSessionGeneration,
      rolled: row.contextRolloverOccurred,
    }))).toEqual([
      { room: 1, generation: 0, rolled: false },
      { room: 2, generation: 1, rolled: true },
    ]);
    expect(result.binding?.sessionId).not.toBe(agentSessionIdFromCli(
      'codex:serialized:encounter:ai-dm-conversation:session-1',
    ));

    const store = new MemoryBrowserSessionStore();
    const runId = importSavedSession(store, result.journalExport);
    const journal = EncounterSessionJournal.resume(runId, store, new MemoryMirrorSink()).journal;
    expect(journal.ended()).toBe(true);
    const lifecycle = new AgentSessionLifecycle(journal, adapter, 1, policy);
    await expect(lifecycle.resumeRound({
      instructionSource: 'none',
      skill: null,
      runId,
      prompt: 'must not dispatch after explicit end',
      model: config.model,
      reasoningEffort: config.effort,
      sessionProfile: 'test',
      callPhase: 'initial',
      output: { kind: 'tool_driven' },
      launcherToken: 'SIMULATED-unused',
      timeoutMs: 1,
    }, createConversationRoundDeadline(1_000, 0, () => 0))).rejects.toThrow('Explicitly ended sitting');
    expect(adapter.startInvocations).toHaveLength(2);
  });

  it.each([
    {
      name: 'tiered',
      escalationArgs: ['--escalation-model', 'gpt-escalation', '--escalation-effort', 'high'],
      choice: 'invalid_initial_and_correction',
      expectedPlanner: { model: 'gpt-escalation', effort: 'high' },
      expectedEscalated: true,
      expectedEscalationModel: 'gpt-escalation',
    },
    {
      name: 'untiered',
      escalationArgs: [],
      choice: 'invalid_then_dodge',
      expectedPlanner: { model: 'gpt-base', effort: 'low' },
      expectedEscalated: false,
      expectedEscalationModel: null,
    },
  ] as const)(
    'routes a $name correction using actual dispatch bookkeeping',
    { timeout: 60_000 },
    async ({ choice, escalationArgs, expectedPlanner, expectedEscalated, expectedEscalationModel }) => {
      const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-tiered-correction-'));
      const adapter = new SerializedRoundTripAdapter(choice);
      const config = parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--model', 'gpt-base', '--effort', 'low',
        ...LEGACY_BLOCK_ARGS,
        ...escalationArgs,
      ]);

      const result = await runConversation(config, {
        adapter,
        roomStates: [generateRoom(3_943_006).encounter.state],
      });

      expect(adapter.startInvocations[0]).toEqual(expect.objectContaining({
        model: 'gpt-base', reasoningEffort: 'low',
      }));
      const correctionInvocation = expectedEscalated
        ? adapter.startInvocations[1]
        : adapter.resumeInvocations[0];
      expect(correctionInvocation).toEqual(expect.objectContaining({
        model: expectedPlanner.model, reasoningEffort: expectedPlanner.effort,
      }));
      expect(adapter.startInvocations).toHaveLength(expectedEscalated ? 2 : 1);
      expect(adapter.resumeInvocations).toHaveLength(1);
      expect(result.rows[0]).toEqual(expect.objectContaining({
        outcome: 'authorized',
        sessionId: 'codex:serialized:encounter:ai-dm-conversation:session-1',
        escalationSessionId: expectedEscalated
          ? 'codex:serialized:encounter:ai-dm-conversation:session-2'
          : null,
        plannedBy: expectedPlanner,
        escalated: expectedEscalated,
        escalationModel: expectedEscalationModel,
      }));
    },
  );

  it('authorizes a serialized MCP attack proposal', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-serialized-attack-'));
    const adapter = new SerializedRoundTripAdapter('attack');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_006).encounter.state],
    });

    expect(adapter.submittedOptions.some((option) => !['Dodge', 'End Turn'].includes(String(option['label'])))).toBe(true);
    expect(adapter.decodedOptions.some((option) => JSON.stringify(option['action_slots']).includes('attack'))).toBe(true);
    const context = adapter.turnContexts[0];
    if (context === undefined) throw new Error('Serialized public flow omitted its turn context.');
    const frontier = objectValue(context['team_plan_frontier'], 'serialized team plan frontier');
    const frontierCandidates = frontier['candidates'];
    const advertisedPlays = context['applicable_plays'];
    if (!Array.isArray(frontierCandidates) || !Array.isArray(advertisedPlays)) {
      throw new Error('Serialized public flow omitted team frontier candidates or advertised plays.');
    }
    expect(frontier).toMatchObject({
      policy: 'team-scorer-v1',
      frontier_resolution: 'contains_unresolved',
    });
    expect(advertisedPlays.map((entry) => objectValue(entry, 'advertised play')['name']))
      .toEqual(frontierCandidates.map((entry) =>
        objectValue(entry, 'team frontier candidate')['candidate_id']));
    expect(result.rows[0]).toEqual(expect.objectContaining({ outcome: 'authorized', refusals: [] }));
    expect(result.rows[0]?.stateBinding.authorization).toEqual(result.rows[0]?.stateBinding.capsule);
  });

  it('requests full context for round one and a delta for a resumed later round', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-round-delta-'));
    const adapter = new SerializedRoundTripAdapter('first_shown');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '2', '--out', join(directory, 'rows.jsonl'),
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      adapter,
      roomStates: [generateRoom(3_943_001).encounter.state],
    });
    const initialInvocations = [...adapter.startInvocations, ...adapter.resumeInvocations].filter((entry) =>
      entry.launcherToken.includes('-initial-launcher.json'));
    const secondManifest = initialInvocations[1] === undefined
      ? null
      : JSON.parse(readFileSync(initialInvocations[1].launcherToken, 'utf8')) as EngineMcpLauncherManifest;

    expect(result.rows).toHaveLength(2);
    expect(initialInvocations[0]?.prompt).toContain('granularity "full"');
    expect(initialInvocations[1]?.prompt).toContain('granularity "turn_delta"');
    expect(secondManifest?.turnContextDeltaBase).toEqual(expect.objectContaining({
      revision: result.rows[0]?.contextRevision,
    }));
  });

  it('preserves accepted suggested composite proposals in the authorized SIMULATED row', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-accepted-fallback-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [generateRoom(3_943_002).encounter.state],
      suggestionResponseByRequest: { 'room-1-round-1': 'as_is' },
    });
    const row = result.rows[0];
    expect(row).toEqual(expect.objectContaining({
      outcome: 'authorized', suggestionAdopted: 'as_is', refusals: [],
    }));
    expect(row?.authorizedPlan).toEqual(expect.arrayContaining([
      expect.objectContaining({
        acceptedProposal: expect.objectContaining({
          actor_id: expect.any(String), primary_option_id: expect.any(String), expected_revision: expect.any(Number),
        }),
      }),
    ]));
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toEqual(expect.objectContaining({
      authorizedPlan: expect.arrayContaining([
        expect.objectContaining({
          acceptedProposal: expect.objectContaining({
            primary_option_id: expect.any(String), fallback_option_id: expect.anything(),
          }),
        }),
      ]),
    }));
  });

  it('re-resolves independently specified stored mechanics before reporting divergence', () => {
    const state = freshMonsterPlanningState(generateRoom(3_943_006).encounter.state);
    const actor = state.combatants.find((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead');
    if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
    const option = availableEngineActorOptions(state, actor.profile.id, DIVERGENCE_OFFER_ENVIRONMENT)
      .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
    if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
    const proposal = {
      actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
      fallbackOptionId: null, reason: 'Exercise the fixture proposal path.', overrideJustification: null,
    };
    const actorToken = state.tokens.find((token) => token.combatantId === actor.profile.id);
    if (actorToken === undefined) throw new Error('Room 3943006 Dodge actor has no token.');
    const storedFinalPosition = {
      column: actorToken.position.column === 0 ? 1 : actorToken.position.column - 1,
      row: actorToken.position.row,
    };
    const storedSummary = `${actor.profile.id} expands Dodge into 1 ordered use(s) after 5 feet`;
    const authoritativeSummary = `${actor.profile.id} expands Dodge into 1 ordered use(s) after 0 feet`;

    expect(proposalResolutionDivergence(state, {
      proposal,
      option,
      primaryOption: option,
      fallbackOption: null,
      mechanics: {
        actorId: actor.profile.id,
        optionId: option.optionId,
        movementCostFeet: 5,
        path: [storedFinalPosition],
        finalPosition: storedFinalPosition,
        actionSlots: [{
          slot: 'main',
          kind: 'dodge',
          actionId: engineActionId('dodge'),
          spellId: null,
          targetIds: [],
          objectId: null,
          omittedRiders: [],
        }],
        omittedRiders: [],
      },
      selectedBranch: 'primary',
      resolutionDigest: '0'.repeat(64),
      summary: storedSummary,
    }, DIVERGENCE_OFFER_ENVIRONMENT)).toEqual([
      `${actor.profile.id}: resolved action sequence, targets, or movement cost diverged; ` +
        `proposal was "${storedSummary}" and authoritative resolution was "${authoritativeSummary}".`,
    ]);
  });

  it.each([3_943_004, 3_943_007])(
    'authorizes generated room %i through the real host after resolving boundary decisions',
    { timeout: 60_000 },
    async (seed) => {
      const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-generated-${String(seed)}-`));
      const generatedState = generateRoom(seed).encounter.state;
      const prepared = preparedMonsterRoundRevision(generatedState);
      const config = parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
        ...LEGACY_BLOCK_ARGS,
        ...ALL_OPTIONS_TEST_RENDERER_ARGS,
      ]);

      const result = await runConversation(config, { roomStates: [generatedState] });
      const row = result.rows[0];

      expect(prepared.resolvedDeathSaves).toBeGreaterThan(0);
      expect(row).toEqual(expect.objectContaining({
        outcome: 'authorized', agentDispatched: true, serviceNull: false,
      }));
      expect(row?.toolCalls).toBeGreaterThan(0);
      expect(row?.contextRevision).toBe(1 + prepared.revision - generatedState.revision);
      expect(row?.stateBinding.authorization).toEqual(row?.stateBinding.capsule);
      expect(row?.chainEvidence.failedAttempts.flatMap((attempt) =>
        attempt.rejectionReasons,
      ).some((reason) => reason.includes('Reaction offer'))).toBe(false);
      expect(row?.chainEvidence.failedAttempts.every((attempt) =>
        attempt.declaredProposal === null || typeof attempt.declaredProposal['option_id'] === 'string'))
        .toBe(true);
    },
  );

  it.each([
    ['decline', 'decline'],
    ['take', 'accept'],
  ] as const)(
    'auto-resolves an unattended ask Reaction with the %s policy and authorizes the SIMULATED arena round',
    { timeout: 60_000 },
    async (askDefault, resolution) => {
      const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-reaction-${askDefault}-`));
      const store = new MemoryBrowserSessionStore();
      const config = parseConversationArgs([
        '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
        '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
        '--reaction-ask-default', askDefault,
        ...LEGACY_BLOCK_ARGS,
      ]);

      const result = await runConversation(config, {
        roomStates: [pendingArenaReactionState()],
        store,
      });

      expect(result.rows).toEqual([
        expect.objectContaining({ outcome: 'authorized', refusals: [], agentDispatched: true }),
      ]);
      expect(store.revisions(encounterSessionId('encounter:ai-dm-conversation'))
        .map((revision) => revision.transition))
        .toContainEqual(expect.objectContaining({
          kind: 'unattended_reaction_auto_resolved',
          configuredPolicy: 'ask',
          askDefault,
          resolution,
        }));
      const restored = new MemoryBrowserSessionStore();
      importSavedSession(restored, result.journalExport);
      expect(restored.revisions(encounterSessionId('encounter:ai-dm-conversation'))
        .map((revision) => revision.transition.kind))
        .toContain('unattended_reaction_auto_resolved');
    },
  );

  it('restores sticky side-wide guidance across a room transition and resolves a pending offer before dispatch', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-sticky-reaction-'));
    const store = new MemoryBrowserSessionStore();
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      '--reaction-ask-default', 'decline',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [pendingArenaReactionState(), pendingArenaReactionState()],
      store,
      restoreAfterRound: 1,
      reactionGuidanceByRequest: {
        'room-1-round-1': { sideWide: { opportunity_attack: 'take' }, actors: [] },
      },
    });

    expect(result.restoredMidRun).toBe(true);
    expect(result.rows.map((row) => row.outcome)).toEqual(['authorized', 'authorized']);
    expect(result.rows.every((row) => row.agentDispatched)).toBe(true);
    const restoredStore = new MemoryBrowserSessionStore();
    importSavedSession(restoredStore, result.journalExport);
    const transitions = restoredStore.revisions(encounterSessionId('encounter:ai-dm-conversation'))
      .map((revision) => revision.transition);
    expect(transitions).toContainEqual(expect.objectContaining({
      kind: 'reaction_guidance_replaced',
      guidance: { sideWide: { opportunity_attack: 'take' }, actors: [] },
    }));
    expect(transitions).toContainEqual(expect.objectContaining({
      kind: 'reaction_guidance_auto_resolved',
      reactionKind: 'opportunity_attack', instruction: 'take',
      scope: { kind: 'side_wide' }, resolution: 'accept',
    }));
  });

  it('falls back to unattended toggle policy when sticky guidance does not cover the pending trigger', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-uncovered-reaction-'));
    const store = new MemoryBrowserSessionStore();
    const config = parseConversationArgs([
      '--rooms', '2', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      '--reaction-ask-default', 'decline',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [pendingArenaReactionState(), pendingArenaReactionState()],
      store,
      reactionGuidanceByRequest: {
        'room-1-round-1': { sideWide: { hit_by_attack: 'take' }, actors: [] },
      },
    });

    expect(result.rows[1]).toEqual(expect.objectContaining({ outcome: 'authorized', agentDispatched: true }));
    expect(store.revisions(encounterSessionId('encounter:ai-dm-conversation'))
      .map((revision) => revision.transition))
      .toContainEqual(expect.objectContaining({
        kind: 'unattended_reaction_auto_resolved', reactionKind: 'opportunity_attack',
        configuredPolicy: 'ask', askDefault: 'decline', resolution: 'decline',
      }));
  });

  it('keeps one SIMULATED session across two rooms, one correction, and a browser restore', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--fixtures', 'tests/fixtures/arena-basis',
      '--rooms', '2',
      '--rounds', '2',
      '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary',
      '--capture-rl-data',
      '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
      restoreAfterRound: 1,
    });
    const firstRoom = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const capturedActorKnowledge = firstRoom.combatants
      .filter((combatant) => combatant.profile.kind === 'monster')
      .map((combatant) => projectActorKnowledge(firstRoom, combatant.profile.id));

    expect(result.rows).toHaveLength(4);
    expect(result.rows.map((row) => row.outcome)).toEqual([
      'authorized', 'authorized', 'authorized', 'authorized',
    ]);
    expect(result.rows.every((row) => row.refusals.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.sessionId === null && row.escalationSessionId === null)).toBe(true);
    expect(new Set(result.rows.map((row) => row.sessionIdHash)).size).toBe(1);
    expect(result.rows[0]?.toolCalls).toBe(2);
    expect(result.rows[0]?.agentDispatched).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      plannedBy: null, planner: 'engine_default', autoSubmitBlocks: [],
      escalated: false, escalationModel: null,
    }));
    expect(result.rows[0]?.chainEvidence).toEqual({
      failedAttempts: expect.arrayContaining([
        expect.objectContaining({ attempt: 'primary' }),
        expect.objectContaining({ attempt: 'fallback' }),
        expect.objectContaining({ attempt: 'correction' }),
      ]),
      autoResolvedTrigger: expect.stringContaining('engine auto-submitted'),
      correctionFinalText: 'SIMULATED — proposal delivered through engine MCP spool',
    });
    expect(result.rows[0]?.proposalId).toContain('engine-default:');
    expect(result.rows[0]?.rlData).toEqual(expect.objectContaining({
      plannerLabel: 'engine_default',
      autoSubmitBlocks: [],
      intelPolicyVersions: {
        movement: 'movement-options-v2',
        opportunityCost: 'opportunity-cost-v1',
        teamScorer: 'team-scorer-v1',
        correction: 'dominance-correction-v1',
        materialityContext: 'materiality-context-v1',
        actorKnowledge: 'actor-knowledge-last-seen-v4',
        reactionSpendHold: 'reaction-spend-hold-v1',
        legendaryWindows: 'legendary-windows-v2',
        recoveryCapability: 'recovery-capability-v2',
      },
    }));
    // Fixture bands, hand-computed:
    // cleric hp 52 of max 52 = 100% -> band uninjured; effective AC 18 + 1 = 19 -> heavily_defended.
    // fighter hp 51 of max 67 = 76.1% -> band bloodied; AC 18 -> heavily_defended.
    // wizard hp 38 of max 38 = 100% -> band uninjured; AC 15 -> guarded.
    const projectedTargets = (distances: readonly [number, number, number]) => [
      {
        kind: 'perceived',
        targetId: 'combatant:cleric',
        placementStatus: 'placed',
        position: { column: 2, row: 4 },
        effectiveSize: 'Medium',
        placementMode: { kind: 'normal', actual: 'Medium' },
        footprint: [{ column: 2, row: 4 }],
        distanceFeet: distances[0],
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'heavily_defended' },
        hitPoints: { kind: 'perceived_band', band: 'uninjured' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
      {
        kind: 'perceived',
        targetId: 'combatant:fighter',
        placementStatus: 'placed',
        position: { column: 1, row: 2 },
        effectiveSize: 'Medium',
        placementMode: { kind: 'normal', actual: 'Medium' },
        footprint: [{ column: 1, row: 2 }],
        distanceFeet: distances[1],
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'heavily_defended' },
        hitPoints: { kind: 'perceived_band', band: 'bloodied' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
      {
        kind: 'perceived',
        targetId: 'combatant:wizard',
        placementStatus: 'placed',
        position: { column: 1, row: 6 },
        effectiveSize: 'Medium',
        placementMode: { kind: 'normal', actual: 'Medium' },
        footprint: [{ column: 1, row: 6 }],
        distanceFeet: distances[2],
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'guarded' },
        hitPoints: { kind: 'perceived_band', band: 'uninjured' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
    ];
    expect(capturedActorKnowledge).toEqual([
      {
        policy: 'actor-knowledge-last-seen-v4',
        actorId: 'combatant:generated-3943001-monster-1',
        targets: projectedTargets([70, 75, 75]),
      },
      {
        policy: 'actor-knowledge-last-seen-v4',
        actorId: 'combatant:generated-3943001-monster-2',
        targets: projectedTargets([65, 70, 70]),
      },
      {
        policy: 'actor-knowledge-last-seen-v4',
        actorId: 'combatant:generated-3943001-monster-3',
        targets: projectedTargets([70, 75, 75]),
      },
    ]);
    expect(result.rows[0]?.authorizedPlan?.some((entry) =>
      entry.resolutionSummary.actionSlots.some((slot) => slot.kind === 'dodge'))).toBe(false);
    expect(result.rows[1]?.proposalId).toContain('round:');
    expect(result.rows[0]?.projectionRevision).toBeGreaterThan(result.rows[0]?.contextRevision ?? 0);
    expect(result.rows[1]?.contextRevision).toBe(result.rows[0]?.projectionRevision);
    expect(result.rows[2]?.contextRevision).toBeGreaterThan(result.rows[1]?.projectionRevision ?? 0);
    expect(result.binding?.sessionId).toBe('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(result.binding).not.toBeNull();
    if (result.binding === null) throw new Error('SIMULATED run lost its agent binding.');
    expect(result.binding.lastDispatchedRevision).toBeGreaterThan(result.binding.startedAtRevision);
    expect(result.restoredMidRun).toBe(true);
    expect(result.journalExport).toContain('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
    const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--capture-rl-data', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [state],
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });

    const row = result.rows[0];
    expect(row).toEqual(expect.objectContaining({
      outcome: 'authorized',
      plannedBy: null,
      planner: 'sim_controller',
      proposalId: expect.stringContaining('sim-controller:'),
      autoSubmitBlocks: expect.arrayContaining([
        {
          actorId: 'combatant:generated-5117009-monster-1',
          reason: 'auto_submit_blocked_unresolved_frontier',
        },
      ]),
      chainEvidence: expect.objectContaining({
        autoResolvedTrigger: expect.stringContaining('unresolved frontier competition blocked engine auto-submit'),
      }),
    }));
    expect(row?.rlData).toEqual(expect.objectContaining({
      plannerLabel: 'sim_controller',
      autoSubmitBlocks: expect.arrayContaining([
        {
          actorId: 'combatant:generated-5117009-monster-1',
          reason: 'auto_submit_blocked_unresolved_frontier',
        },
      ]),
    }));
    const priestPlan = row?.authorizedPlan?.find((entry) =>
      entry.actorId === 'combatant:generated-5117009-monster-1');
    expect(priestPlan?.resolutionSummary.actionSlots).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'dodge' }),
    ]));
    expect(row?.projectionRevision).toBeGreaterThan(row?.contextRevision ?? 0);
  });

  it.each([
    {
      name: 'no proposal',
      expected: 'no_proposal',
      options: {
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: false,
    },
    {
      name: 'validation exhaustion',
      expected: 'validation_exhausted',
      options: {
        invalidInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: false,
    },
    {
      name: 'blocked auto-submit',
      expected: 'auto_submit_blocked',
      options: {
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: true,
    },
    {
      name: 'timeout',
      expected: 'timeout',
      options: {
        timeoutInitial: ['room-1-round-2'],
        failCorrection: ['room-1-round-2'],
      },
      hard: false,
    },
  ] as const)('records typed fallbackReason for $name from the stub adapter', { timeout: 60_000 }, async ({
    expected,
    options,
    hard,
  }) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fallback-${expected}-`));
    const rounds = expected === 'timeout' ? 2 : 1;
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', String(rounds), '--out', join(directory, 'rows.jsonl'),
      '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);
    const state = hard
      ? await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json')
      : await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');

    const result = await runConversation(config, { roomStates: [state], ...options });

    expect(result.rows.at(-1)?.fallbackReason).toBe(expected);
    expect(result.rows.at(-1)?.refusals).toEqual([]);
  });

  it('does not depend on turn-context rendering to resolve a brutal exhaustion frontier', async () => {
    const state = freshMonsterPlanningState(
      await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
    );
    const actorIds = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' ? [combatant.profile.id] : []);
    const resolutions = () => actorIds.map((actorId) =>
      actorOpportunityReport(state, actorId, BOUND_OFFER_ENVIRONMENT, state.revision).frontierResolution);
    const beforeRender = resolutions();
    const firstActorId = actorIds[0];
    if (firstActorId === undefined) throw new Error('Brutal fixture has no first monster actor.');
    const firstActorOptions = engineActorOptionsForEnvironment(
      state,
      firstActorId,
      BOUND_OFFER_ENVIRONMENT,
    );
    expect(firstActorOptions.humanOnly).toContainEqual(expect.objectContaining({
      label: 'spellcasting/detect-evil-and-good',
      declaredOption: {
        kind: 'spell',
        sourceActionId: 'spellcasting',
        spellId: 'detect-evil-and-good',
        slot: 'main',
      },
      noModeledEffect: {
        kind: 'unsupported_spell_payload',
        sourceActionId: 'spellcasting',
        spellId: 'detect-evil-and-good',
        limitation: 'utility_operation_unmodeled',
      },
    }));
    expect(firstActorOptions.offerable.some((option) => option.label === 'spellcasting/detect-evil-and-good'))
      .toBe(false);
    const fourthActorId = actorIds[3];
    if (fourthActorId === undefined) throw new Error('Brutal fixture has no fourth monster actor.');
    expect({
      actor: state.tokens.find((token) => token.combatantId === fourthActorId)?.position,
      actorSize: state.tokens.find((token) => token.combatantId === fourthActorId)?.placementMode.actual,
      speed: state.combatants.find((combatant) => combatant.profile.id === fourthActorId)?.profile.rules.speed,
      targets: state.tokens.filter((token) =>
        state.combatants.some((combatant) => combatant.profile.id === token.combatantId &&
          combatant.profile.kind === 'player_character')).map((token) => token.position),
    }).toEqual({
      actor: { column: 16, row: 3 },
      actorSize: 'Large',
      speed: 34,
      // Chebyshev separations are 15, 14, and 15 cells before accounting for
      // the wall whose only gap is at row 6.
      targets: [{ column: 1, row: 2 }, { column: 2, row: 4 }, { column: 1, row: 6 }],
    });
    const playerIds = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'player_character' ? [combatant.profile.id] : []);
    // Hand tracing the Large 2x2 source against the column-9 wall: its row-6
    // gap leaves two rays open to Fighter/Cleric and one ray open to Wizard.
    expect(playerIds.map((targetId) => {
      const trace = traceCombatantLine(state, fourthActorId, targetId);
      return { sourceCorner: trace.sourceCorner, blocked: trace.lines.map((line) => line.blocksSight) };
    })).toEqual([
      { sourceCorner: { column: 16, row: 3 }, blocked: [true, true, false, false] },
      { sourceCorner: { column: 16, row: 5 }, blocked: [true, true, false, false] },
      { sourceCorner: { column: 18, row: 5 }, blocked: [true, true, true, false] },
    ]);
    const runtime = createEngineMcpRuntime(state, { toolProfile: 'dm', requestedActorIds: actorIds });
    const capsule = runtime.feed.current();
    runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
      granularity: 'full',
      intel_mode: 'full',
    });

    expect(beforeRender).toEqual([
      'fully_resolved',
      'fully_resolved',
      'fully_resolved',
      'fully_resolved',
    ]);
    expect(resolutions()).toEqual(beforeRender);
  });

  it('hidden_options_logged_once: records every hidden option once with engine-state knowledge and stationary Disengage reasons', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-hidden-options-'));
    const outPath = join(directory, 'rows.jsonl');
    const hiddenActor = monsterProfile('hidden-options-actor', { initiativeBonus: 20 });
    const hiddenTarget = playerProfile('hidden-options-target', { initiativeBonus: -20 });
    const state = createEncounter({
      bounds: { columns: 3, rows: 1 },
      combatants: [hiddenActor, hiddenTarget],
      tokens: [placedToken(hiddenActor, 0), placedToken(hiddenTarget, 2)],
    });
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      adapter: new SerializedRoundTripAdapter('use_action_dodge'),
      roomStates: [state],
      partyPolicyOverride: 'heuristic_v0',
    });
    const row = result.rows[0];
    if (row === undefined) throw new Error('Hidden-option conversation produced no row.');
    const identities = row.hiddenOptions.map((option) => option.humanOptionId);

    expect(row.knowledgeModel).toBe('engine_state');
    expect(new Set(identities).size).toBe(identities.length);
    expect(row.hiddenOptions.filter((option) =>
      option.declaredOption.kind === 'standard_action' &&
      option.reason.kind === 'disengage_without_movement').length).toBeGreaterThan(0);
    expect(row.hiddenOptions.every((option) => option.actorId.length > 0 &&
      option.humanOptionId.startsWith('human-option:'))).toBe(true);
    expect(JSON.parse(readFileSync(outPath, 'utf8').trim())).toMatchObject({
      knowledgeModel: 'engine_state',
      hiddenOptions: row.hiddenOptions,
    });
  });

  it('runs a model-free stdio MCP dry-run smoke (mutation: count tool calls as KB reads)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-smoke-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath,
      '--cli-bin', 'definitely-not-a-model-binary', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config);

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', toolCalls: 2, kbReads: [], callsPerRound: 1,
        refusals: [], kbHash: DEFAULT_KB_HASH,
        contextRolloverOccurred: false,
        contextRolloverTriggerCount: 0,
        escalated: false,
        escalationSessionId: null,
      }),
    ]);
    expect(result.rows[0]?.tokens).toEqual({ input: 0, cachedInput: 0, output: 0, reasoning: 0 });
    const store = new MemoryBrowserSessionStore();
    const sessionId = importSavedSession(store, result.journalExport);
    expect(exportSavedSession(store, sessionId)).toBe(result.journalExport);
  });

  it('runs a three-room three-round model-free brutal smoke with the stub adapter', { timeout: 300_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-3round-smoke-'));
    const config = parseConversationArgs([
      '--fixtures', 'tests/fixtures/arena-basis-brutal',
      '--rooms', '3', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'derived_v1',
      '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config);

    expect(new Set(result.rows.map((row) => row.room))).toEqual(new Set([1, 2, 3]));
    expect(result.rows).toHaveLength(9);
    expect(result.rows.flatMap((row) => row.refusals)).toEqual([]);
    expect(result.rows.every((row) => row.knowledgeModel === 'engine_state')).toBe(true);
  });

  it('retries one SIMULATED service flap and uses the first healthy primary turn', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-flap-recovery-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      flapPrimaryByRequest: { 'room-1-round-1': 1 },
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', flapRetries: 1, serviceNull: false,
        toolCalls: 2, refusals: [],
      }),
    ]);
  });

  it('marks three consecutive SIMULATED service flaps as service_null without exhausting the turn', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-service-null-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      flapPrimaryByRequest: { 'room-1-round-1': 3 },
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'service_null', flapRetries: 2, serviceNull: true,
        toolCalls: 0, proposalId: null, refusals: [],
        plannedBy: null, escalated: false, escalationModel: null,
        authorizedPlan: null, roundNarrative: null,
        chainEvidence: { failedAttempts: [], autoResolvedTrigger: null, correctionFinalText: null },
      }),
    ]);
    expect(result.rows[0]?.projectionRevision).toBe(result.rows[0]?.contextRevision);
  });

  it('does not retry a SIMULATED primary turn that called engine tools before rejection', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-engine-rejection-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      invalidInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        outcome: 'authorized', planner: 'engine_default', flapRetries: 0, serviceNull: false,
        toolCalls: 3,
        chainEvidence: expect.objectContaining({
          failedAttempts: expect.arrayContaining([
            expect.objectContaining({ attempt: 'primary' }),
            expect.objectContaining({ attempt: 'fallback' }),
          ]),
        }),
      }),
    ]);
  });

  it('records when the configured turn-context trimmer fired', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-context-trim-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [oversizedTurnContextState()],
    });

    expect(result.rows[0]).toEqual(expect.objectContaining({ contextTruncated: true }));
    const rawTurnContext = result.rows[0]?.rawTurnContext;
    if (rawTurnContext === undefined || rawTurnContext === null) throw new Error('Trimmed row omitted its raw turn context.');
    const turnContext = objectValue(JSON.parse(rawTurnContext) as unknown, 'trimmed turn context');
    expect(new TextEncoder().encode(rawTurnContext).byteLength)
      .toBeLessThanOrEqual(config.turnContextMaximumBytes);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      turnContextMaximumBytes: config.turnContextMaximumBytes,
      preTrimBytes: expect.any(Number),
      postTrimBytes: expect.any(Number),
      optionsOmittedForSize: expect.any(Number),
      optionsOmittedForSizeByActor: expect.any(Array),
    }));
    expect(turnContext).toMatchObject({
      granularity: 'full',
      context_trimmed: true,
      compact_fallback: true,
      team_plan_frontier: {
        policy: 'team-scorer-v1',
        frontier_resolution: 'fully_resolved',
        detail_level: 'omitted',
        frontier_candidate_count: 2,
        removed_candidate_count: 0,
        reason: 'context_size_limit',
      },
    });
    const frontier = objectValue(turnContext['team_plan_frontier'], 'trimmed team plan frontier');
    expect(frontier).not.toHaveProperty('candidates');
    expect(frontier).not.toHaveProperty('removed');
    expect(turnContext).not.toHaveProperty('renderer_defect');
    const actors = turnContext['actors'];
    if (!Array.isArray(actors)) throw new Error('Compact fallback omitted actors.');
    expect(actors).toHaveLength(45);
    expect(actors.every((value) => {
      const options = objectValue(value, 'compact fallback actor')['options'];
      return Array.isArray(options) && options.length === 2 && options.every((option) =>
        /^k\d+$/u.test(String(objectValue(option, 'compact fallback option')['option_id'])));
    })).toBe(true);
  });

  it('injects the root and tactics pair byte-for-byte only on cold start and attributes its hash', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-kb-'));
    const outPath = join(directory, 'rows.jsonl');
    const root = kbInputs.fixtures.readText('tests/fixtures/ai-dm-kb/ai-dm-core.md');
    const tactics = kbInputs.fixtures.readText('tests/fixtures/ai-dm-kb/tactics.md');
    const resolvedRoot = KB_SUBJECTS.reduce<string>((text, subject) => text.replaceAll(
      `${AI_DM_KB_FIXTURE_DIRECTORY}/${subject}.md`,
      resolve(process.cwd(), AI_DM_KB_FIXTURE_DIRECTORY, `${subject}.md`),
    ), root);
    const startupInstructions = `${resolvedRoot}\n\n${tactics}`;
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '3', '--rounds', '1', '--out', outPath, '--kb', DEFAULT_AI_DM_KB_ROOT,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });

    expect(adapter.startInvocations).toHaveLength(1);
    expect(adapter.startInvocations[0]?.instructions).toBe(startupInstructions);
    expect(adapter.startInvocations[0]?.prompt).not.toContain(startupInstructions);
    if (config.instructionSource !== 'kb') throw new Error('Explicit KB config lost its instruction source.');
    expect(adapter.resumeInvocations.length).toBeGreaterThan(0);
    expect(adapter.resumeInvocations.every((entry) => entry.instructions === null)).toBe(true);
    expect(adapter.resumeInvocations.every((entry) => !entry.prompt.includes(startupInstructions))).toBe(true);
    const injectedText = [
      ...adapter.startInvocations.map((entry) => entry.instructions ?? ''),
      ...adapter.resumeInvocations.map((entry) => entry.instructions ?? ''),
    ].join('\n');
    expect(injectedText.split(startupInstructions).length - 1).toBe(1);

    expect(adapter.resumeInvocations.some((entry) =>
      entry.prompt.startsWith('[ROOM_TRANSITION]'))).toBe(false);

    const initialRoundInvocations = [...adapter.startInvocations, ...adapter.resumeInvocations].filter((entry) =>
      entry.launcherToken.includes('-initial-launcher.json'));
    expect(initialRoundInvocations).toHaveLength(9);
    expect(initialRoundInvocations.every((entry) => {
      const manifest = JSON.parse(readFileSync(entry.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
      return entry.prompt.includes('granularity "full"') &&
        manifest.turnContextDeltaBase === undefined;
    })).toBe(true);
    expect(result.rows.every((row) => row.kbHash === DEFAULT_KB_HASH)).toBe(true);
    expect([...adapter.startInvocations, ...adapter.resumeInvocations].every((entry) =>
      entry.instructionSource === 'kb' && entry.skill === null && entry.kbPath === config.kbPath,
    )).toBe(true);
    expect(result.rows.every((row) =>
      row.instructionSource === 'kb' && row.skillName === null && row.skillHash === null,
    )).toBe(true);
    expect(readFileSync(outPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line)))
      .toHaveLength(3);
  });

  it('threads a selected skill through every invocation and hashes the exact fixture bytes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-skill-'));
    const adapter = new RecordingConversationAdapter();
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--instruction-source', 'skill', '--skill', 'engine-submission',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });
    const invocations = [...adapter.startInvocations, ...adapter.resumeInvocations];
    expect(invocations.length).toBeGreaterThan(0);
    expect(invocations.every((entry) =>
      entry.instructionSource === 'skill' && entry.skill === 'engine-submission' && entry.kbPath === null,
    )).toBe(true);
    expect(result.rows).toEqual([expect.objectContaining({
      outcome: 'service_null',
      instructionSource: 'skill',
      skillName: 'engine-submission',
      skillHash: sha256(kbInputs.fixtures.readText(
        'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md',
      )),
    })]);
  });

  it.each([
    ['none', []],
    ['kb', ['--instruction-source', 'kb', '--kb', DEFAULT_AI_DM_KB_ROOT]],
    ['skill', ['--instruction-source', 'skill', '--skill', 'dm-round']],
  ] as const)('runs a model-free %s instruction-source smoke through a SIMULATED adapter', async (
    source,
    sourceArgs,
  ) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-${source}-smoke-`));
    const adapter = new SerializedRoundTripAdapter('attack');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      ...sourceArgs,
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, { adapter });
    expect(result.rows).toEqual([expect.objectContaining({
      outcome: 'authorized',
      instructionSource: source,
      skillName: source === 'skill' ? 'dm-round' : null,
      skillHash: source === 'skill' ? expect.stringMatching(/^[0-9a-f]{64}$/u) : null,
    })]);
    expect([...adapter.startInvocations, ...adapter.resumeInvocations].every((entry) =>
      entry.instructionSource === source,
    )).toBe(true);
  });

  it('starts the persistent SIMULATED session with the first round plan in one model dispatch', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cold-plan-'));
    const outPath = join(directory, 'rows.jsonl');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      ...LEGACY_BLOCK_ARGS,
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]));

    expect(result.rows[0]).toEqual(expect.objectContaining({
      outcome: 'authorized', agentDispatched: true, callsPerRound: 1,
      combatModel: 'monster_block_v1',
      roundProtocolVersion: 3,
      partyPolicyHash: null,
      materialityPolicyHash: null,
      adjustmentBudget: 0,
      pcTurns: [],
      adjustments: [],
      monsterSegments: [],
    }));
    expect(result.rows[0]?.startingRoomDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.rows[0]?.teamPlans).toEqual({
      party: null,
      monsters: expect.objectContaining({ initialProposalId: expect.any(String) }),
    });
    expect(result.rows[0]?.roundTotals).toEqual(expect.objectContaining({
      initialCalls: 1,
      adjustmentCalls: 0,
      correctionCalls: 0,
      serviceNullAdjustments: 0,
      tokens: result.rows[0]?.tokens,
    }));
    expect(result.rows[0]).not.toHaveProperty('chosenOptionIndices');
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).not.toHaveProperty('chosenOptionIndices');
  });

  it('queues a schema-final indexed decision through the same engine round path (mutation: parse valid final output but do not queue it)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]));
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index transport produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      firstDecisionAccepted: true,
      decisionAttempts: 1,
      decisionRejectionCodes: [],
      normalizationCodes: [],
      serviceNull: false,
    });
    expect(row.toolCalls).toBe(0);
    expect(row.rawTurnContext).not.toContain('context_not_requested');
    expect(row.authorizedPlan).not.toBeNull();
    if (row.chosenOptionIndices === undefined) {
      throw new Error('Final-index row omitted chosen option indices.');
    }
    expect(row.chosenOptionIndices.length).toBeGreaterThan(0);
    expect(row.chosenOptionIndices.every((selection) => selection.primaryOptionIndex === 0)).toBe(true);
    expect(row.authorizedPlan?.every((entry) => entry.reason ===
      'The engine recommendation preserves the current tactical objective.')).toBe(true);
  });

  it('rejects audited boilerplate at structured-final ingress before accepting a substantive correction', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-reason-gate-'));
    const adapter = new BoilerplateThenValidStructuredFinalAdapter();
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), { adapter });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index reason-gate run produced no row.');

    expect(adapter.decisionAttempts).toBe(2);
    expect(row).toMatchObject({
      outcome: 'authorized',
      firstDecisionAccepted: false,
      decisionAttempts: 2,
      decisionRejectionCodes: ['REASON_REQUIRED'],
      normalizationCodes: ['REASON_REQUIRED'],
      toolCalls: 0,
    });
    expect(row.authorizedPlan).not.toBeNull();
    expect(row.authorizedPlan?.every((entry) =>
      entry.reason === 'Hold the doorway so the injured scout can disengage safely.')).toBe(true);
    if (row.chosenOptionIndices === undefined) {
      throw new Error('Corrected final-index row omitted chosen option indices.');
    }
    expect(row.chosenOptionIndices.every((selection) => selection.fallbackOptionIndex === null)).toBe(true);
    expect(JSON.stringify(row.authorizedPlan)).not.toContain('Use the offered legal option for this actor.');
  });

  it('censors a cancelled structured-final turn as decision_timeout (mutation: classify cancelled final output as decision_missing)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-timeout-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), { timeoutInitial: ['room-1-round-1'] });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index timeout produced no row.');
    expect(row.decisionRejectionCodes).toContain('decision_timeout');
    expect(row.decisionRejectionCodes).not.toContain('decision_missing');
  });

  it('records the actor chosen index for recommendation-anchor measurement (mutation: omit chosen index from final row)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-indices-'));
    const outPath = join(directory, 'rows.jsonl');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]));
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index row is absent.');
    expect(row.chosenOptionIndices).toEqual(row.authorizedPlan?.map((entry) => ({
      actorId: entry.actorId, primaryOptionIndex: 0, fallbackOptionIndex: 1,
    })));
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).toEqual(expect.objectContaining({
      chosenOptionIndices: row.authorizedPlan?.map((entry) => ({
        actorId: entry.actorId, primaryOptionIndex: 0, fallbackOptionIndex: 1,
      })),
    }));
  });

  it('passes a persisted final-index row through packet validation', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-packet-'));
    const outPath = join(directory, 'rows.jsonl');
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      '--transport', 'final_indices', '--combat-model', 'initiative_segments_v1',
    ]);
    await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
    });
    const persisted = objectValue(JSON.parse(readFileSync(outPath, 'utf8')) as unknown, 'persisted arena row');
    const packet = buildRerunPacket([
      { ...persisted, seed: 3_943_001, arm: 'indexed-a' },
      { ...persisted, seed: 3_943_001, arm: 'indexed-b' },
    ], 1, { seeds: [3_943_001], reps: 1 });

    expect(packet.answerKey.entries).toHaveLength(2);
    expect(packet.answerKey.entries.every((entry) =>
      entry.rowEra === 'post_shift' &&
      entry.decisionTransport === 'final_indices' &&
      entry.chosenOptionIndices.length > 0)).toBe(true);
  });

  it('records no chosen indices when no final-index decision is accepted', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-exhausted-'));
    const outPath = join(directory, 'rows.jsonl');
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', outPath, '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), {
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Exhausted final-index run produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      firstDecisionAccepted: false,
      chosenOptionIndices: [],
      planner: 'engine_default',
    });
    expect(JSON.parse(readFileSync(outPath, 'utf8'))).toEqual(expect.objectContaining({
      decisionTransport: 'final_indices',
      chosenOptionIndices: [],
    }));
  });

  it('rejects speculative structured-final dispatch at the typed phase boundary (mutation: pass speculative through as a decision phase)', () => {
    expect(structuredFinalDecisionPhase('initial')).toBe('initial');
    expect(structuredFinalDecisionPhase('correction')).toBe('correction');
    expect(() => structuredFinalDecisionPhase('speculative'))
      .toThrow('Structured-final decisions are unavailable for speculative dispatch.');
  });

  it('records a missing final decision explicitly and repairs it with the same indexed correction shape (mutation: classify final absence as service_null)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-correction-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'), '--dry-run',
      '--transport', 'final_indices',
      ...LEGACY_BLOCK_ARGS,
    ]), { exhaustInitial: ['room-1-round-1'] });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index correction produced no row.');

    expect(row.refusals).toEqual([]);
    expect(row).toMatchObject({
      outcome: 'authorized',
      firstDecisionAccepted: false,
      decisionAttempts: 2,
      decisionRejectionCodes: ['decision_missing'],
      normalizationCodes: [],
      serviceNull: false,
    });
    expect(row.chainEvidence.correctionFinalText).toContain('catalogDigest');
  });

  it('uses the same indexed final contract for a G2-preflighted adjustment (mutation: send an adjustment through MCP)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-adjustment-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run', '--transport', 'final_indices',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
      }),
    });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index adjustment run produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      serviceNull: false,
      decisionRejectionCodes: [],
      normalizationCodes: [],
    });
    expect(row.adjustments).toHaveLength(1);
    expect(row.adjustments[0]).toMatchObject({
      outcome: 'adjusted',
      requestId: 'request:room-1-round-1-pc-turn-1',
      toolCalls: 0,
      modelCalls: 1,
    });
    expect(row.decisionAttempts).toBe(2);
  });

  it('repairs an indexed adjustment through the same correction ingress (mutation: use a tool-driven adjustment correction)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-final-indices-adjustment-correction-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run', '--transport', 'final_indices',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      exhaustInitial: ['room-1-round-1-pc-turn-1'],
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
      }),
    });
    const [row] = result.rows;
    if (row === undefined) throw new Error('Final-index adjustment correction run produced no row.');

    expect(row).toMatchObject({
      outcome: 'authorized',
      decisionTransport: 'final_indices',
      decisionAttempts: 3,
      decisionRejectionCodes: ['decision_missing'],
      normalizationCodes: [],
      serviceNull: false,
    });
    expect(row.adjustments[0]).toMatchObject({
      outcome: 'adjusted',
      correctionChain: expect.objectContaining({ result: 'accepted' }),
      toolCalls: 0,
      modelCalls: 2,
    });
  });

  it('directs K6 to consume an inline suggestion without fetching the same play again', () => {
    const k6 = readFileSync('tests/fixtures/ai-dm-kb/k6.txt', 'utf8');

    expect(k6).toContain('If suggested_plan is present, use its proposals directly');
    expect(k6).toContain('do not call engine.propose_from_play');
    expect(k6).toContain('Only when suggested_plan is absent');
  });

  it('admits the active process and local OpenAI conversation adapters', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cli-'));
    const outPath = join(directory, 'rows.jsonl');
    const defaults = parseConversationArgs(['--rooms', '1', '--out', outPath]);
    expect(defaults.combatModel).toBe('initiative_segments_v1');
    expect(defaults.initiativeProfile).toBe('derived_v1');
    expect(defaults.intelMode).toBe('full');
    expect(defaults.overridePolicy).toBe('typed_reason');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--override-policy', 'strict',
    ]).overridePolicy).toBe('strict');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--override-policy', 'free_text',
    ])).toThrow('--override-policy must be strict or typed_reason');
    expect(defaults.decisionTransport).toBe('mcp_minimal');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--transport', 'final_indices',
    ]).decisionTransport).toBe('final_indices');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--transport', 'final_ids',
    ])).toThrow('--transport must be mcp_minimal or final_indices');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'claude-code', '--transport', 'final_indices',
    ])).toThrow('final_indices currently requires --cli codex');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--intel-mode', 'off',
    ]).intelMode).toBe('off');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--intel-mode', 'partial',
    ])).toThrow('--intel-mode must be full or off.');
    const block = parseConversationArgs([
      '--rooms', '1', '--out', outPath,
      '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
    ]);
    expect(block.combatModel).toBe('monster_block_v1');
    expect(block.initiativeProfile).toBe('legacy');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--combat-model', 'unknown-model',
    ])).toThrow('--combat-model must be monster_block_v1 or initiative_segments_v1');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--initiative-profile', 'synthetic',
    ])).toThrow('--initiative-profile must be legacy or derived_v1');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'claude-code']).cli)
      .toBe('claude-code');
    expect(() => parseConversationArgs(['--rooms', '1', '--out', outPath, '--cli', 'pi']))
      .toThrow('--cli must be codex, claude-code, or local-openai');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
    ])).toEqual(expect.objectContaining({
      cli: 'local-openai', model: 'llama-SIMULATED', cliBin: '',
      localOpenAi: {
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama-SIMULATED',
        thinkMode: 'off',
      },
    }));
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
      '--local-think', 'on',
    ]).localOpenAi?.thinkMode).toBe('on');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--cli', 'local-openai',
      '--local-base-url', 'http://127.0.0.1:11434/v1', '--local-model', 'llama-SIMULATED',
      '--local-think', 'sometimes',
    ])).toThrow('--local-think must be on or off');
    expect(parseConversationArgs(['--rooms', '1', '--out', outPath])).toEqual(expect.objectContaining({
      instructionSource: 'none', skill: null,
    }));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'tests/fixtures/arena-basis/seed-3943001.json',
    ])).toThrow('--kb must name a root under tests/fixtures/ai-dm-kb');
    expect(parseConversationArgs([
      '--rooms', '1', '--out', outPath,
      '--escalation-model', 'gpt-escalation', '--escalation-effort', 'xhigh',
    ])).toEqual(expect.objectContaining({
      escalationModel: 'gpt-escalation', escalationEffort: 'xhigh',
    }));
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--escalation-model', 'gpt-escalation',
    ])).toThrow('--escalation-model and --escalation-effort must be supplied together');
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--kb', 'content/cc-by-sa/forbidden.txt',
    ])).toThrow('--kb cannot use content/cc-by-sa');
  });

  it('parses the D569 mode, repair, attempt, fact, cap, timeout, and judge-model combinations', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-blind-parse-'));
    const outPath = join(directory, 'rows.jsonl');
    const common = ['--rooms', '1', '--out', outPath, '--dm-mode', 'blind'] as const;

    expect(parseConversationArgs(common)).toEqual(expect.objectContaining({
      dmMode: 'blind', dmModeExplicit: true, blindRepairArm: 'code_only',
      blindMaxAttempts: 3, blindFacts: false, midRoundAdjustmentsEnabled: false,
      turnContextMaximumBytes: 65_536, timeoutMs: 240_000,
      instructionSource: 'kb', boardImageMode: 'png',
    }));
    expect(parseConversationArgs([
      ...common, '--cli', 'claude-code', '--model', 'claude-opus-5',
      '--blind-repair-arm', 'minimal_legal_alternative', '--blind-max-attempts', '2',
      '--blind-facts', 'on',
    ])).toEqual(expect.objectContaining({
      cli: 'claude-code', model: 'claude-opus-5',
      blindRepairArm: 'minimal_legal_alternative', blindMaxAttempts: 2, blindFacts: true,
    }));
    expect(parseConversationArgs([
      ...common, '--cli', 'codex', '--model', 'gpt-5.6-sol', '--effort', 'high',
    ])).toEqual(expect.objectContaining({ cli: 'codex', model: 'gpt-5.6-sol', effort: 'high' }));
    expect(() => parseConversationArgs([...common, '--transport', 'final_indices']))
      .toThrow('--board-image png requires --transport mcp_minimal');
    expect(() => parseConversationArgs([...common, '--board-image', 'off']))
      .toThrow('Blind mode requires MCP-minimal');
    expect(() => parseConversationArgs([...common, '--turn-context-max-bytes', '65535']))
      .toThrow('Blind mode requires MCP-minimal');
    expect(() => parseConversationArgs([...common, '--blind-max-attempts', '4'])).toThrow();
    expect(() => parseConversationArgs([
      '--rooms', '1', '--out', outPath, '--blind-facts', 'on',
    ])).toThrow('require --dm-mode blind');
  });

  it('derives per-combatant initiative for standalone fixtures and rejects an explicit legacy profile', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-fixture-constraint-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'derived.jsonl'), '--dry-run',
    ]));
    expect(result.rows[0]?.combatModel).toBe('initiative_segments_v1');
    expect(result.rows[0]).not.toHaveProperty('dmMode');
    expect(result.rows[0]).not.toHaveProperty('blindIntentText');
    expect(result.rows[0]).not.toHaveProperty('blindIngressAudit');

    const incompatible = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'legacy.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--initiative-profile', 'legacy', '--dry-run',
    ]);
    await expect(runConversation(incompatible)).rejects.toThrow(
      'initiative_segments_v1 fixture constraint: room 1 must declare config.initiativeMode="per_combatant"',
    );
  });

  it('walks an alternating initiative fixture without waking the DM for HP-only drift', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-no-drift-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
    });
    const row = result.rows[0];

    expect(row).toEqual(expect.objectContaining({
      combatModel: 'initiative_segments_v1',
      roundProtocolVersion: 3,
      outcome: 'authorized',
      adjustments: [],
      callsPerRound: 2,
      adjustmentBudget: 2,
    }));
    expect(row?.partyPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(row?.materialityPolicyHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(row?.teamPlans.party).toEqual(expect.objectContaining({
      planId: expect.any(String),
      planHash: expect.any(String),
      sharedObjective: 'defeat_the_hostile_team',
      programs: expect.any(Array),
    }));
    expect(row?.teamPlans.monsters).toEqual(expect.objectContaining({
      initialProposalId: expect.any(String),
      initialProposalHash: expect.any(String),
      authorizedProposals: expect.any(Array),
    }));
    expect(row?.initiativeOrder).toHaveLength(6);
    expect(row?.initiativeOrder).toEqual([
      'combatant:cleric',
      'combatant:generated-3943001-monster-3',
      'combatant:fighter',
      'combatant:wizard',
      'combatant:generated-3943001-monster-2',
      'combatant:generated-3943001-monster-1',
    ]);
    expect(row?.pcTurns).toHaveLength(3);
    expect(row?.pcTurns?.every((turn) => !turn.material)).toBe(true);
    expect(row?.pcTurns?.every((turn) =>
      turn.initiativeIndex >= 0 && turn.afterRevision > turn.beforeRevision &&
      turn.plannedProgramHash.length === 64 && turn.executedProgramHash.length === 64 &&
      turn.commandSequence.length > 0 && turn.adherenceReasons.length > 0)).toBe(true);
    expect(row?.monsterSegments?.map((segment) => segment.actors)).toEqual([
      ['combatant:generated-3943001-monster-3'],
      [
        'combatant:generated-3943001-monster-2',
        'combatant:generated-3943001-monster-1',
      ],
    ]);
    expect(row?.monsterSegments?.every((segment) =>
      Array.isArray(segment.deviationResolutions) &&
      segment.initiativeIndexes.length === segment.actors.length &&
      segment.afterRevision > segment.beforeRevision && segment.appliedPlanHash.length === 64)).toBe(true);
    expect(row?.roundTotals).toEqual(expect.objectContaining({
      initialCalls: 1,
      adjustmentCalls: 0,
      correctionCalls: 0,
      serviceNullAdjustments: 0,
    }));
    expect(row?.speculations).toContainEqual(expect.objectContaining({
      status: 'adopted', proposed: true, adopted: true, discarded: false,
      budgetMs: 60_000,
      branchCount: expect.any(Number),
      planningWallMs: expect.any(Number),
      boundaryWaitMs: expect.any(Number),
      source: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
      decision: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    }));
  });

  it('ends a three-round room as party_defeated when all PCs are dead entering the party segment', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-party-defeated-'));
    const base = await alternatingInitiativeRoom();
    const defeated: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) =>
        combatant.profile.kind === 'player_character'
          ? { ...combatant, hitPoints: 0, life: 'dead' as const, deathSaves: null }
          : combatant),
    };
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, { roomStates: [defeated] });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.terminalOutcome).toEqual({
      kind: 'encounter_over', result: 'party_defeated',
    });
    expect(result.rows[0]?.refusals).toEqual([]);
  });

  it('runs three rounds with a one-round party program by recording typed default turns', { timeout: 180_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-party-default-'));
    const base = await alternatingInitiativeRoom({ monsterHitPoints: 10_000 });
    const durable: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => combatant.profile.kind === 'player_character'
        ? {
            ...combatant,
            hitPoints: 10_000,
            profile: {
              ...combatant.profile,
              rules: { ...combatant.profile.rules, hitPointMaximum: 10_000 },
            },
          }
        : combatant),
    };
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '3', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const result = await runConversation(config, {
      roomStates: [durable],
      mutateScriptedPartyPlan: (plan, context) => context.round === 1
        ? plan
        : { ...plan, programs: [] },
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((row) => row.partyDefaultTurn)).toEqual([false, true, true]);
    expect(result.rows.flatMap((row) => row.refusals)).toEqual([]);
    expect(result.rows.slice(1).flatMap((row) => row.pcTurns)
      .every((turn) => turn.partyDefaultTurn !== null)).toBe(true);
  });

  it.each([
    ['keep', 'baseline_kept'],
    ['change', 'adjusted'],
  ] as const)('dispatches when a superior option appears and records adjustment choice %s', { timeout: 30_000 }, async (response, outcome) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-segments-${response}-`));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--capture-rl-data', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': response },
    });
    const row = result.rows[0];
    const adjustment = row?.adjustments[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Expected a dispatched adjustment fixture.');
    }

    expect(adjustment).toEqual(expect.objectContaining({
      preflight: 'superior_option_appeared',
      outcome,
      granularity: 'turn_delta',
      flapRetries: 0,
      triggerPcTurnOrdinal: 1,
      triggerInitiativeIndex: 0,
      requestId: 'request:room-1-round-1-pc-turn-1',
      openActors: expect.any(Array),
      proposalId: expect.any(String),
      baselinePlanHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      resultPlanHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      changedActors: expect.any(Array),
      correctionSessionId: null,
      usage: expect.objectContaining({ input: expect.any(Number) }),
      toolCalls: expect.any(Number),
      modelCalls: 1,
      refusals: [],
      correctionChain: null,
      rlData: expect.any(Array),
    }));
    expect(adjustment.stateBinding).toEqual({
      request: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
      result: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    });
    expect(adjustment.rawContext).toContain('"granularity":"turn_delta"');
    expect(row?.rlData).toEqual(expect.objectContaining({
      format: 'arena-rl-capture-v2',
      task: 'round_plan',
      submissionTool: 'engine.submit_round_proposals',
      roundProtocolVersion: 3,
      engineIntel: expect.objectContaining({
        policy: 'dm-intel-capture-v2-creature-space',
        policyVersions: expect.objectContaining({
          evaluator: 'tactical-evaluator-v3',
          renderer: 'dm-turn-intel-v2-creature-space',
          query: 'dm-intel-query-v2-creature-space',
          capture: 'dm-intel-capture-v2-creature-space',
        }),
        actors: expect.arrayContaining([expect.objectContaining({
          offeredOptionIds: expect.any(Array),
          rows: expect.any(Array),
        })]),
      }),
    }));
    expect(row?.engineIntel).toEqual(row?.rlData?.engineIntel);
    expect(adjustment.rlData[0]).toEqual(expect.objectContaining({
      format: 'arena-rl-capture-v2',
      task: 'plan_adjustment',
      submissionTool: 'engine.submit_plan_adjustment',
      parentPlanId: expect.any(String),
    }));
    expect(adjustment.reasons).toContain('OPEN_MONSTER_SET_CHANGED');
    expect(row?.adjustments).toHaveLength(1);
    expect(row?.roundTotals.adjustmentCalls).toBe(1);
    expect(row?.monsterSegments?.flatMap((segment) => segment.actors)).toHaveLength(2);
  });

  it('skips the D443-style adjustment when material bookkeeping changed but the retained plan stayed legal and non-dominated (mutation: always dispatch)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-symmetric-material-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const base = await alternatingInitiativeRoom({ fragileMonsterCount: 1 });
    const symmetricMaterialState: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => {
        switch (combatant.profile.id) {
          case 'combatant:cleric':
            return {
              ...combatant,
              profile: {
                ...combatant.profile,
                rules: { ...combatant.profile.rules, attacksPerAction: 1 },
              },
            };
          case 'combatant:generated-3943001-monster-1':
            return {
              ...combatant,
              hitPoints: 1,
              profile: {
                ...combatant.profile,
                rules: {
                  ...combatant.profile.rules,
                  armorClass: armorClass(0),
                  hitPointMaximum: 1,
                },
              },
            };
          default: return combatant;
        }
      }),
      tokens: base.tokens.map((token) => token.combatantId === 'combatant:generated-3943001-monster-1'
        ? { ...token, position: { column: 4, row: 7 } }
        : token),
    };

    // Cleric and monster-1 are adjacent, so the symmetric evaluator ranks its
    // unknown-AC melee attack (rank 2) ahead of force_save (rank 3). Monster-1
    // has AC 0 and 1 HP; the generic attack is +7 and 1d8 + 4, so the fixed
    // transcript's non-natural-1 hit deals at least 5 and changes the open set [m1,m2,m3]
    // to [m2,m3]. That is hand-computed OPEN_MONSTER_SET_CHANGED materiality.
    const result = await runConversationWithPartyPolicy('symmetric_evaluator_v1', config, {
      roomStates: [symmetricMaterialState],
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'keep' },
    });
    const row = result.rows[0];
    const firstTurn = row?.pcTurns?.[0];
    const adjustment = row?.adjustments?.[0];

    expect(row?.partyPolicyHash).toBe(createScriptedPartyPlan(symmetricMaterialState, {
      decisionPolicy: 'symmetric_evaluator_v1',
    }).policyHash);
    expect(firstTurn?.actor).toBe('combatant:cleric');
    expect(firstTurn?.commandSequence).toHaveLength(1);
    expect(firstTurn?.commandSequence.every((command) =>
      command.type === 'attack' && command.target === 'combatant:generated-3943001-monster-1')).toBe(true);
    expect(firstTurn?.material).toBe(true);
    expect(firstTurn?.materialityReasons).toEqual(['LIFE_STATE_CHANGED', 'OPEN_MONSTER_SET_CHANGED']);
    expect(row?.adjustments).toHaveLength(1);
    expect(adjustment?.trigger).toBe('combatant:cleric');
    expect(adjustment?.triggerPcTurnOrdinal).toBe(1);
    expect(adjustment?.reasons).toEqual(['LIFE_STATE_CHANGED', 'OPEN_MONSTER_SET_CHANGED']);
    expect(adjustment?.skipped).toBe('no_material_change');
    expect(row?.roundTotals.adjustmentCalls).toBe(0);
    expect(row?.speculations).toContainEqual(expect.objectContaining({
      status: 'adopted', proposed: true, adopted: true, discarded: false,
    }));
  });

  it('dispatches an adjustment when the retained primary becomes illegal', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-illegal-primary-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
      }),
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'keep' },
    });
    const adjustment = result.rows[0]?.adjustments[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Expected an illegal retained primary to dispatch adjustment planning.');
    }
    expect(adjustment.preflight).toBe('retained_plan_illegal');
    expect(result.rows[0]?.roundTotals.adjustmentCalls).toBe(1);
  });

  it('rejects a speculative context actor mismatch before model dispatch', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-context-mismatch-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    let speculationDispatches = 0;
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateSpeculativeContext: (context) => ({ ...context, actors: [] }),
      onSpeculationDispatchStart: () => { speculationDispatches += 1; },
    });
    const row = result.rows[0];
    expect(speculationDispatches).toBe(0);
    expect(row?.speculations.length).toBeGreaterThan(0);
    expect(row?.speculations.every((entry) =>
      entry.status === 'discarded' && entry.discardReason === 'context_actor_set_mismatch')).toBe(true);
    expect(row?.refusals.some((message) => message.includes('SPECULATIVE_BRANCH_CONTRACT_MISMATCH'))).toBe(false);
    expect(row?.outcome).toBe('authorized');
  });

  it('never authorizes a row when execution throws before its first completed turn (mutation: authorized before the loop)', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-execution-failed-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateSpeculativeContext: () => {
        throw new Error('SIMULATED execution fixture failure.');
      },
    });
    const row = result.rows[0];
    expect(row).toMatchObject({
      outcome: 'execution_failed',
      executionErrorClass: 'other',
      planner: 'model',
      pcTurns: [],
      monsterSegments: [],
    });
    expect(row?.refusals).toEqual(['SIMULATED execution fixture failure.']);
    expect(result.rows.some((entry) => entry.outcome === 'authorized' && entry.refusals.length > 0)).toBe(false);
  });

  it('records partial_execution when execution throws after a completed PC turn', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-partial-execution-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: () => {
        throw new Error('SIMULATED unresolved boundary decision.');
      },
    });
    const row = result.rows[0];
    expect(row?.outcome).toBe('partial_execution');
    expect(row?.executionErrorClass).toBe('unresolved_boundary_decision');
    expect(row?.pcTurns.length).toBeGreaterThan(0);
    expect(row?.refusals).toEqual(['SIMULATED unresolved boundary decision.']);
  });

  it('discards speculation when the actual board invalidates the planned option structure', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-material-change-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);
    let mutated = false;
    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: (state) => {
        if (mutated) return state;
        mutated = true;
        return {
          ...state,
          revision: state.revision + 1,
          combatants: state.combatants.map((combatant) => combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
        };
      },
    });

    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded', proposed: true, adopted: false, discarded: true,
      discardReason: expect.stringMatching(/^(?:no_scenario_match|option_mapping_failed|proposal_validation_failed)$/u),
      decision: expect.objectContaining({ revision: expect.any(Number), digest: expect.any(String) }),
    }));
    expect(result.rows[0]?.refusals).not.toContainEqual(expect.stringContaining('SPECULATION_RECALC_REQUIRED'));
  });

  it('aborts the cell when speculation recalculation infrastructure fails after staging output', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-recalc-infrastructure-'));
    let mutated = false;
    let policyMs = 0;
    let observedRecalculationExit: AgentTurnResult['exit'] | null = null;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: (state) => {
        if (mutated) return state;
        mutated = true;
        return {
          ...state,
          revision: state.revision + 1,
          combatants: state.combatants.map((combatant) => combatant.profile.kind === 'player_character'
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant),
        };
      },
      failSpeculationRecalculation: true,
      simulatedInProcessDispatchDelayMs: 10,
      forceSpeculationRecalculationForTest: true,
      policyNow: () => policyMs,
      onSpeculationRecalculationResultObservedForTest: (turn) => {
        observedRecalculationExit = turn.exit;
        policyMs = 180_000;
      },
    });
    expect(observedRecalculationExit).toBe('infrastructure_failed');
    expect(result.rows[0]).toMatchObject({
      outcome: 'infrastructure_failed',
      failingDispatch: {
        phase: 'speculation_recalculation', exit: 'infrastructure_failed',
        engineCatalogEvidence: { status: 'absent' },
        turnContextDelivery: { status: 'infrastructure_absent' },
      },
    });
    expect(result.rows[0]?.monsterSegments).toEqual([]);
  });

  it.each([
    ['end-of-round', { endRoundAfterSpeculationStartForTest: true }],
    ['exception-cleanup', { failAfterSpeculationStartForTest: true }],
  ] as const)('retains diagnosed speculative infrastructure at the %s join', async (_join, seam) => {
    const directory = mkdtempSync(join(tmpdir(), `d569-speculation-${_join}-join-`));
    let policyMs = 0;
    let observedSpeculationExit: AgentTurnResult['exit'] | null = null;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      failSpeculationInfrastructure: true,
      simulatedInProcessDispatchDelayMs: 1,
      policyNow: () => policyMs,
      onSpeculationResultObservedForTest: (turn) => {
        observedSpeculationExit = turn.exit;
        policyMs = 180_000;
      },
      ...seam,
    });
    expect(observedSpeculationExit).toBe('infrastructure_failed');
    expect(result.rows[0]).toMatchObject({
      outcome: 'infrastructure_failed',
      failingDispatch: {
        phase: 'speculative', exit: 'infrastructure_failed',
        engineCatalogEvidence: { status: 'absent' },
        turnContextDelivery: { status: 'infrastructure_absent' },
      },
    });
  });

  it('terminates incomplete speculation with a failed rebase without repeating the initiative loop', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-failed-rebase-terminal-'));
    let iterations = 0;
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      stagedSpeculationTimeout: true,
      forceSpeculationRecalculationForTest: true,
      simulatedInProcessDispatchDelayMs: 1,
      onInitiativeIterationForTest: () => {
        iterations += 1;
        if (iterations > 20) throw new Error('Initiative loop repeated after terminal speculation transition.');
      },
    });
    expect(iterations).toBeLessThanOrEqual(20);
    expect(result.rows[0]).toMatchObject({
      outcome: 'refused', fallbackReason: 'timeout', planner: 'model', monsterSegments: [],
    });
    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded', discarded: true, discardReason: 'budget_expired',
    }));
  });

  it('aborts speculative planning at the D407 pacing deadline', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-speculation-budget-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      speculationBudgetMs: 5,
      speculationDispatchDelayMs: 25,
    });
    const expired = result.rows[0]?.speculations.find((entry) =>
      entry.status === 'discarded' && entry.discardReason === 'budget_expired');

    expect(expired).toEqual(expect.objectContaining({
      status: 'discarded', budgetMs: 5, proposed: true, adopted: false, discarded: true,
      planningWallMs: expect.any(Number), boundaryWaitMs: expect.any(Number),
    }));
    expect(expired?.status === 'discarded' ? expired.planningWallMs : Number.POSITIVE_INFINITY)
      .toBeLessThan(1_000);
  });

  it('discards a speculative proposal staged before timeout without authorizing it', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-staged-timeout-'));
    const result = await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      stagedSpeculationTimeout: true,
      simulatedInProcessDispatchDelayMs: 1,
    });
    expect(result.rows[0]?.speculations).toContainEqual(expect.objectContaining({
      status: 'discarded', adopted: false, discarded: true, discardReason: 'budget_expired',
    }));
    expect(result.rows[0]?.outcome).not.toBe('infrastructure_failed');
    expect(result.rows[0]?.monsterSegments.flatMap((segment) => segment.actors).length).toBeGreaterThan(0);
  });

  it('does not spend a second adjustment flap budget when preflight finds no material plan change', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-independent-flaps-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]);

    const base = await alternatingInitiativeRoom({ fragileMonsterCount: 2 });
    const independentFlapState: EncounterState = {
      ...base,
      combatants: base.combatants.map((combatant) => ({
        ...combatant,
        profile: {
          ...combatant.profile,
          rules: {
            ...combatant.profile.rules,
            initiativeBonus: combatant.profile.id === 'combatant:cleric'
              ? 100
              : combatant.profile.id === 'combatant:fighter'
                ? 70
                : combatant.profile.id === 'combatant:wizard'
                  ? 40
                  : 0,
            ...(combatant.profile.id === 'combatant:fighter'
              ? { attacksPerAction: 1 }
              : {}),
            ...(combatant.profile.id === 'combatant:generated-3943001-monster-2'
              ? { armorClass: armorClass(0) }
              : {}),
          },
        },
      })),
      tokens: base.tokens.map((token) =>
        token.combatantId === 'combatant:generated-3943001-monster-1'
          ? { ...token, position: { column: 5, row: 4 } }
          : token),
    };
    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [independentFlapState],
      flapPrimaryByRequest: {
        'room-1-round-1-pc-turn-1': 1,
        'room-1-round-1-pc-turn-2': 1,
      },
      mutateBeforeAdjustmentPreflight: (state) => ({
        ...state,
        revision: state.revision + 1,
        combatants: state.combatants.map((combatant) =>
          combatant.profile.id === 'combatant:generated-3943001-monster-1'
            ? {
                ...combatant,
                profile: {
                  ...combatant.profile,
                  rules: { ...combatant.profile.rules, speed: feet(0) },
                },
              }
            : combatant),
      }),
    });

    expect(result.rows[0]?.adjustments?.slice(0, 2)).toEqual([
      expect.objectContaining({ flapRetries: 1, outcome: 'baseline_kept' }),
      expect.objectContaining({ skipped: 'no_material_change' }),
    ]);
  });

  it('runs one adjustment correction and retains the corrected replacement', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-correction-'));
    const phaseInvocations: AgentInvocation[] = [];
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
      simulatedInProcessDispatchDelayMs: 10,
      speculationDispatchDelayMs: 50,
      onAgentInvocation: (invocation) => { phaseInvocations.push(invocation); },
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'adjusted',
      flapRetries: 0,
    }));
    expect(result.rows[0]?.callsPerRound).toBeGreaterThanOrEqual(3);
    expect(new Set(phaseInvocations.map((invocation) => invocation.callPhase))).toEqual(new Set([
      'initial', 'speculation', 'adjustment', 'correction',
    ]));
    const dispatchIds = phaseInvocations.map((invocation) => invocation.engineDispatchId);
    expect(dispatchIds.every((dispatchId) => dispatchId !== undefined)).toBe(true);
    expect(new Set(dispatchIds).size).toBe(dispatchIds.length);
    for (const invocation of phaseInvocations) {
      const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
      expect(manifest).toMatchObject({
        readinessSpoolPath: expect.stringMatching(/-engine-readiness\.jsonl$/u),
        dispatchId: invocation.engineDispatchId,
      });
      expect(manifest.dispatchPhase).toBe(engineDispatchPhaseForCallPhase(invocation.callPhase));
    }
  });

  it('stamps speculation recalculation launchers with the speculative dispatch phase', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-recalc-phase-'));
    const invocations: AgentInvocation[] = [];
    let mutated = false;
    await runConversation(parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
    ]), {
      roomStates: [await alternatingInitiativeRoom()],
      mutateBeforeSpeculationBoundary: (state) => {
        if (mutated) return state;
        mutated = true;
        return { ...state, revision: state.revision + 1 };
      },
      forceSpeculationRecalculationForTest: true,
      simulatedInProcessDispatchDelayMs: 1,
      onAgentInvocation: (invocation) => { invocations.push(invocation); },
    });
    const recalculation = invocations.find((invocation) => invocation.callPhase === 'speculation_recalculation');
    if (recalculation === undefined) throw new Error('Speculation recalculation was not dispatched.');
    const manifest = JSON.parse(readFileSync(recalculation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    expect(manifest.dispatchPhase).toBe('speculative');
    expect(manifest.dispatchPhase).toBe(engineDispatchPhaseForCallPhase(recalculation.callPhase));
  });

  it('keeps the baseline after three adjustment service nulls and continues the round', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-service-null-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      flapPrimaryByRequest: { 'room-1-round-1-pc-turn-1': 3 },
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'service_null',
      flapRetries: 2,
    }));
    expect(result.rows[0]?.pcTurns).toHaveLength(3);
    expect(result.rows[0]?.monsterSegments?.flatMap((segment) => segment.actors).length)
      .toBeGreaterThan(0);
  });

  it('ignores a staged adjustment proposal after timeout and retains the authorized baseline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-staged-timeout-'));
    const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      stagedAdjustmentTimeout: ['room-1-round-1-pc-turn-1'],
      simulatedInProcessDispatchDelayMs: 10,
      speculationDispatchDelayMs: 50,
    });
    const adjustment = result.rows[0]?.adjustments?.[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Timed-out adjustment was not recorded.');
    }
    expect(adjustment).toMatchObject({
      outcome: 'service_null', proposalId: null, changedActors: [], flapRetries: 0,
    });
    expect(adjustment.resultPlanHash).toBe(adjustment.baselinePlanHash);
    expect(result.rows[0]?.monsterSegments.flatMap((segment) => segment.actors).length).toBeGreaterThan(0);
  });

  it('records adjustment timeout evidence before applying the expired round deadline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-expired-evidence-'));
    let policyMs = 0;
    let observedAdjustmentExit: AgentTurnResult['exit'] | null = null;
    const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      stagedAdjustmentTimeout: ['room-1-round-1-pc-turn-1'],
      simulatedInProcessDispatchDelayMs: 1,
      speculationDispatchDelayMs: 1,
      policyNow: () => policyMs,
      onAdjustmentResultObservedForTest: (turn) => {
        observedAdjustmentExit = turn.exit;
        policyMs = 180_000;
      },
    });
    const adjustment = result.rows[0]?.adjustments?.[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Expired adjustment timeout was not recorded.');
    }
    expect(observedAdjustmentExit).toBe('timed_out');
    expect(adjustment).toMatchObject({
      outcome: 'service_null', proposalId: null, changedActors: [], flapRetries: 0,
    });
    expect(adjustment.resultPlanHash).toBe(adjustment.baselinePlanHash);
    expect(result.rows[0]).toMatchObject({
      outcome: 'refused', roundWallTimedOut: true, monsterSegments: [],
    });
  });

  it('ignores an adjustment correction proposal staged before timeout and retains the authorized baseline', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-correction-staged-timeout-'));
    const result = await runConversationWithPartyPolicy('heuristic_v0', parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]), {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
      stagedAdjustmentCorrectionTimeout: ['room-1-round-1-pc-turn-1'],
      simulatedInProcessDispatchDelayMs: 10,
      speculationDispatchDelayMs: 50,
    });
    const adjustment = result.rows[0]?.adjustments?.[0];
    if (adjustment === undefined || adjustment.skipped !== null) {
      throw new Error('Timed-out adjustment correction was not recorded.');
    }
    expect(adjustment).toMatchObject({
      outcome: 'baseline_kept', proposalId: null, changedActors: [], flapRetries: 0,
      correctionChain: expect.objectContaining({ result: 'timed_out', proposalId: null }),
    });
    expect(adjustment.resultPlanHash).toBe(adjustment.baselinePlanHash);
    expect(result.rows[0]?.monsterSegments.flatMap((segment) => segment.actors).length).toBeGreaterThan(0);
  });

  it('treats adjustment correction no-response as protocol exhaustion, not a flap', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-segments-correction-exhaustion-'));
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--combat-model', 'initiative_segments_v1', '--dry-run',
      ...ALL_OPTIONS_TEST_RENDERER_ARGS,
    ]);

    const result = await runConversationWithPartyPolicy('heuristic_v0', config, {
      roomStates: [await alternatingInitiativeRoom({ fragileMonsterCount: 1 })],
      suggestionResponseByRequest: { 'room-1-round-1': 'ignored' },
      adjustmentResponseByRequest: { 'room-1-round-1-pc-turn-1': 'invalid' },
      failCorrection: ['room-1-round-1-pc-turn-1'],
    });

    expect(result.rows[0]?.adjustments?.[0]).toEqual(expect.objectContaining({
      outcome: 'baseline_kept',
      flapRetries: 0,
    }));
    expect(result.rows[0]?.monsterSegments?.flatMap((segment) => segment.actors).length)
      .toBeGreaterThan(0);
  });
});
