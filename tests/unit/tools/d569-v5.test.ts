import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import type { EncounterState } from '../../../src/combat/encounter';
import { applyRoomInitiativeProfile } from '../../../src/vtt/room-generator';
import {
  createEngineMcpRuntime,
  decodeArenaFixtureText,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { BlindModelIngressRecorder, type BlindIngressRecord } from '../../../src/vtt/blind-model-ingress';
import {
  agentSessionIdFromCli,
  engineDispatchId,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import {
  classifyEngineCatalogEvidence,
  type EngineReadinessRecord,
} from '../../../src/vtt/engine-dispatch-evidence';
import {
  analyzeRegisteredPrimaryPair,
  D569_PRIMARY_JUDGES,
  type D569PairedAnalysisDocuments,
} from '../../../tools/d569-v5/analyze-primary-pair';
import { mergeRepairedHard } from '../../../tools/d569-v5/merge-repaired-hard';
import {
  d569ReconciliationSidecarSchema,
  sha256Text,
  type D569ReconciliationSidecar,
} from '../../../tools/d569-v5/reconciliation';
import {
  D569_HARD_REPLACEMENT_KEYS,
  validateD569FirstArm,
  validateD569RegisteredFirstArm,
} from '../../../tools/d569-v5/validate-first-arm';
import {
  D569_EXPERIMENT_MANIFEST_PATH,
  dryRunD569Experiment,
  validateD569ObservedRows,
  type D569DryRunCell,
  type D569ExperimentManifest,
  type D569ObservedRow,
} from '../../../tools/d569-blind-experiment';
import { canonicalD569SecondFamilyRegeneration } from '../../../tools/d569-second-family-manifest';
import { BRUTAL_10_PROTOCOL, buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
import { parseArenaArgs, runArena } from '../../../tools/ai-dm-arena';
import type { ConversationBoardSnapshotService } from '../../../tools/ai-dm-conversation';
import type { BoardImageArtifact, BoardSnapshotCapture } from '../../../tools/ai-dm-board-snapshot';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';

const PATCHED_COMMIT = 'd60a0571a4588879c65992a17ab95023911d17c1';
const MANIFEST = JSON.parse(readFileSync(D569_EXPERIMENT_MANIFEST_PATH, 'utf8')) as D569ExperimentManifest;
const access = {
  readText: (path: string): string => readFileSync(path, 'utf8'),
  secondFamilyAccess: {
    readFixture: (path: string): string => readFileSync(path, 'utf8'),
    regenerate: canonicalD569SecondFamilyRegeneration,
  },
};
const CELLS = dryRunD569Experiment(MANIFEST, access).filter((cell) =>
  cell.arm === 'gpt-5.6-luna-blind');
const FIRST_BRUTAL_STATE = applyRoomInitiativeProfile(
  decodeArenaFixtureText(readFileSync('tests/fixtures/arena-basis-brutal/seed-6203001.json', 'utf8')),
  'derived_v1',
);

function historical(room: number, rep: number, sessionId: string | null) {
  return { room, round: rep, outcome: 'authorized', sessionId };
}

function current(cell: D569DryRunCell, outcome: 'authorized' | 'refused' | 'service_null' | 'infrastructure_failed') {
  const room = cell.seed - (cell.basis === 'hard' ? 5_117_000 : 6_203_000);
  const scheduledCellKey = `${String(room)}:${String(cell.rep)}`;
  const dispatchId = `engine-dispatch:grid-${String(room)}-${String(cell.rep)}-0001`;
  const infrastructure = outcome === 'infrastructure_failed';
  const delivered = outcome === 'authorized' || outcome === 'refused';
  const boardSha = sha256(`board:${cell.basis}:${scheduledCellKey}`);
  const catalog = infrastructure
    ? { status: 'absent' as const, basis: 'required_engine_initialization_failed' as const, dispatchId, corroboration: ['startup failed'] }
    : { status: 'ready' as const, basis: 'required_cli_completed_with_valid_catalog' as const, dispatchId, advertisedInvocationCount: 0, resourceOperationCount: 0 };
  const delivery = infrastructure
    ? { status: 'infrastructure_absent' as const, dispatchId, measurement: null }
    : delivered
      ? { status: 'delivered' as const, dispatchId, contextSha256: 'a'.repeat(64), measurement: { baseBytes: 100, semanticBytes: 10 } }
      : { status: 'not_requested' as const, dispatchId, reason: 'catalog_ready_model_did_not_fetch' as const, measurement: null };
  const state = applyRoomInitiativeProfile(decodeArenaFixtureText(readFileSync(cell.fixturePath, 'utf8')), 'derived_v1');
  return {
    rowContractVersion: 'arena-row-v3', arm: 'single', basis: cell.basis, seed: cell.seed,
    room, round: cell.rep, scheduledCellKey, dispatchId, outcome,
    sessionId: infrastructure ? null : `agent-session:grid-${String(room)}-${String(cell.rep)}`,
    repoCommit: PATCHED_COMMIT, cli: 'codex', model: cell.model, effort: cell.effort,
    dmMode: 'blind', blindRepairArm: 'code_only', blindMaxAttempts: 3, blindFacts: false,
    decisionTransport: 'mcp_minimal', instructionSource: 'kb', escalated: false,
    escalationModel: null, escalationEffort: null, midRoundAdjustmentsEnabled: false, fallbackReason: null, planner: 'model',
    combatModel: 'initiative_segments_v1', initiativeOrder: [], plannedBy: { model: cell.model, effort: cell.effort },
    roundNarrative: null,
    authorizedPlan: outcome === 'authorized' ? [{
      actorId: 'monster:test', resolutionSummary: { actionSlots: [{ kind: 'wait', targetIds: [] }], movementFeet: 0 },
    }] : null,
    firstDecisionAccepted: outcome === 'authorized', decisionAttempts: 1,
    decisionRejectionCodes: [], normalizationCodes: [], skillName: null, skillHash: null,
    rationale: null, overridePolicy: 'strict',
    blindContextVersion: 'blind-turn-context-v1', blindIntentVersion: 'blind-round-intent-v1',
    blindIntentText: null, blindIntents: null, blindResolverOutcome: [], blindRejectionCodes: [],
    blindAttempts: [], blindResolverLatencyMs: 0, semanticBoardEvidence: null,
    creatureFactsEvidence: { sha256: 'c'.repeat(64), utf8Bytes: 1 },
    legalMovementEvidence: { sha256: 'd'.repeat(64), utf8Bytes: 1 },
    blindPrivateAnswerKey: {},
    startingRoomDigest: sha256(canonicalJson(state)), kbHash: cell.sharedKbHash,
    sharedKbComponentHashes: MANIFEST.sharedKb.componentHashes,
    boardImage: {
      mode: 'png', sha256: boardSha, bytes: 24, width: 1, height: 1, captureMs: 0,
      relativePath: `board-images/${boardSha}.png`,
    },
    uiFeedback: null,
    visualProfile: {
      primerVersion: MANIFEST.visualPins.blind.primerVersion,
      images: [{ role: MANIFEST.visualPins.blind.imageRole, sha256: boardSha, ordinal: 1 }],
      glyphMode: MANIFEST.visualPins.blind.glyphMode,
      captureTilePx: MANIFEST.visualPins.blind.captureTilePx,
    },
    engineCatalogEvidence: catalog,
    turnContextDelivery: delivery,
    turnContextConfiguredCaps: { baseBytes: cell.baseContextCapBytes, semanticBytes: cell.semanticContextCapBytes },
    hostContextDiagnostic: null,
    ...(infrastructure ? { failingDispatch: {
      phase: 'primary' as const, exit: 'infrastructure_failed' as const, dispatchId,
      engineCatalogEvidence: catalog, turnContextDelivery: delivery, failureReason: 'startup failed',
    } } : {}),
    baseContextBytes: delivered ? 100 : null,
    semanticBoardBytes: delivered ? 10 : null,
    rawTurnContext: delivered ? '{}' : null,
    preTrimBytes: delivered ? 100 : null,
    postTrimBytes: delivered ? 100 : null,
    turnContextGranularity: delivered ? 'full' : null,
    optionsOmittedForSize: 0, optionsOmittedForSizeByActor: [], roundTotals: { contextBytes: delivered ? 2 : 0 },
    blindIngressAudit: delivered
      ? { version: 2, status: 'complete', passed: true, forbiddenContentPassed: true, delivery }
      : { version: 2, status: 'incomplete', passed: false, forbiddenContentPassed: true, delivery, missingRequiredFields: ['turn_context'] },
    ...(delivered ? { turnContextBudget: {
      configuredBaseBytes: cell.baseContextCapBytes,
      configuredSemanticBytes: cell.semanticContextCapBytes,
      actualBaseBytes: 100, actualSemanticBytes: 10, truncatedBlocks: [],
    } } : {}),
  };
}

function raw(lines: readonly Readonly<Record<string, unknown>>[]): string {
  return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`;
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a record.');
  }
  return value as Readonly<Record<string, unknown>>;
}

function reconciliation(source: string): D569ReconciliationSidecar {
  const lines = source.trimEnd().split('\n');
  const entries = ([6, 19, 20] as const).map((rawLineNumber) => {
    const line = lines[rawLineNumber - 1];
    if (line === undefined) throw new Error('Fixture raw line is absent.');
    const row = JSON.parse(line) as Readonly<Record<string, unknown>>;
    return {
      rawLineNumber, rawLineSha256: sha256Text(line),
      scheduledCellKey: `${String(row['room'])}:${String(row['round'])}`,
      recoveredSessionId: `recovered-session-${String(rawLineNumber)}`,
      rolloutPath: `/evidence/rollout-${String(rawLineNumber)}.jsonl`,
      rolloutSha256: String(rawLineNumber).padStart(64, '0'),
      reviewerApproval: { reviewer: 'independent-reviewer', approvedAt: '2026-09-09T20:00:00.000Z', decision: 'approved' as const },
    };
  });
  return d569ReconciliationSidecarSchema.parse({
    version: 'd569-reconciliation-v1', rawFileSha256: sha256Text(source), entries,
  });
}

function mutateFirst(source: string, mutation: (row: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>): string {
  const rows = source.trimEnd().split('\n').map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
  const first = rows[0];
  if (first === undefined) throw new Error('Mutation fixture is empty.');
  rows[0] = mutation(first);
  return raw(rows);
}

function retainedHistorical(cell: D569DryRunCell, lineNumber: number): Readonly<Record<string, unknown>> {
  const source = current(cell, 'authorized') as Readonly<Record<string, unknown>>;
  const v3Fields = new Set([
    'rowContractVersion', 'scheduledCellKey', 'dispatchId', 'engineCatalogEvidence', 'turnContextDelivery',
    'turnContextConfiguredCaps', 'hostContextDiagnostic', 'failingDispatch',
  ]);
  return {
    ...Object.fromEntries(Object.entries(source).filter(([key]) => !v3Fields.has(key))),
    repoCommit: '90484d453b7b6d1fe63ed28c0a53570a80e158e6',
    sessionId: [6, 19, 20].includes(lineNumber) ? null : `historical-session-${String(lineNumber)}`,
  };
}

function pairedDocuments(rows: readonly object[]): D569PairedAnalysisDocuments {
  const rawRows: Readonly<Record<string, unknown>>[] = rows.flatMap((row) =>
    ['gpt-5.6-luna-blind', 'gpt-5.6-luna-advice'].map((arm) => ({ ...row, arm })));
  const constructed = buildRerunPacket(rawRows, 569_575, BRUTAL_10_PROTOCOL);
  const packet = constructed.packet.entries.map((entry) => ({ ...entry }));
  const answerKey = constructed.answerKey.entries.map((entry) => ({ ...entry }));
  const scores = Object.fromEntries(D569_PRIMARY_JUDGES.map(({ seat }) => [seat, [] as Readonly<Record<string, unknown>>[]])) as {
    [Seat in (typeof D569_PRIMARY_JUDGES)[number]['seat']]: Readonly<Record<string, unknown>>[];
  };
  for (const entry of packet) {
    for (const { seat } of D569_PRIMARY_JUDGES) {
      scores[seat].push({ blindId: entry.blindId, targetPriority: 2, actionEconomy: 2, coherence: 1, positioning: 1, total: 6 });
    }
  }
  return { packet, answerKey, scoresBySeat: scores };
}

const BRUTAL_SOURCE = raw(CELLS.filter((cell) => cell.basis === 'brutal').map((cell, index) => {
  const row = current(cell, index === 7 ? 'infrastructure_failed' : 'authorized');
  return index === 7 ? { ...row, sessionId: 'observed-before-engine-startup-failed' } : row;
}));

function validateBrutal(rawText: string, manifest = MANIFEST) {
  return validateD569RegisteredFirstArm({
    rawText, basis: 'brutal', cliVersion: 'codex-cli 0.153.4', patchedCommit: PATCHED_COMMIT, manifest,
  });
}

class D569CancellationSnapshotService implements ConversationBoardSnapshotService {
  readonly outputDirectory = mkdtempSync(join(tmpdir(), 'd569-cancelled-delivery-board-'));

  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    const png = Buffer.alloc(96);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
    png.writeUInt32BE(1, 16);
    png.writeUInt32BE(1, 20);
    Buffer.from(input.source.stateDigest, 'utf8').copy(png, 24, 0, 64);
    const digest = createHash('sha256').update(png).digest('hex');
    const relativePath = `board-images/${digest}.png` as const;
    mkdirSync(join(this.outputDirectory, 'board-images'), { recursive: true });
    writeFileSync(join(this.outputDirectory, relativePath), png);
    const html = Buffer.from('<!doctype html><main>D569 cancellation evidence</main>\n');
    const htmlDigest = createHash('sha256').update(html).digest('hex');
    const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
    mkdirSync(join(this.outputDirectory, 'board-html', htmlDigest), { recursive: true });
    writeFileSync(join(this.outputDirectory, htmlRelativePath), html);
    return {
      version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png',
      relativePath, sha256: digest, bytes: png.byteLength, width: 1, height: 1,
      capturedAtUnixMs: Date.now(), captureMs: 1, source: { ...input.source },
      chromiumVersion: 'SIMULATED Chromium',
      html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
      blindState: {
        informationMode: 'blind_state', role: 'dm_board', ordinal: 1,
        primerVersion: MANIFEST.visualPins.blind.primerVersion,
        glyphMode: MANIFEST.visualPins.blind.glyphMode,
        captureTilePx: MANIFEST.visualPins.blind.captureTilePx,
        domEvidence: {
          optionSurfaceAbsent: true, nextEventPreviewAbsent: true,
          coordinateLabels: 1, creatureBadges: 1, rosterEntries: 1, hpBars: 1,
          legendEntries: 1, wallCells: 0, halfCoverCells: 0, threeQuartersCoverCells: 0,
          difficultCells: 0, obscuredCells: 0, illuminatedCells: 0, fogMarks: 0,
          doors: 0, objects: 0, hiddenMarks: 0, multiCellFootprints: 0,
        },
      },
    };
  }

  async close(): Promise<void> { return undefined; }
}

class D569CancellationAfterDeliveryAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;

  constructor(private readonly state: EncounterState) {}

  async probe() { return { present: true, version: 'D569-CANCELLATION-AFTER-DELIVERY' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    if (invocation.engineDispatchId === undefined) throw new Error('Cancellation fixture omitted dispatch identity.');
    const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
    if (manifest.turnContextSpoolPath === undefined || manifest.blindIngressSpoolPath === undefined ||
      manifest.dispatchPhase === undefined) {
      throw new Error('Cancellation fixture launcher omitted blind evidence spools.');
    }
    const runtime = createEngineMcpRuntime(this.state, {
      runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
      requestId: manifest.requestId, phase: manifest.phase, correctionNumber: manifest.correctionNumber,
      room: manifest.room, historyKind: manifest.historyKind, toolProfile: 'blind', dmMode: 'blind',
      offerEnvironment: buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment }),
    });
    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: manifest.runId, expected_revision: manifest.revision, scope: 'round', granularity: 'full',
    }));
    const deliveredContext = {
      ...context,
      semantic_board: {
        provenance: { format: 'd569-cancellation-semantic-board-v1' },
        cells: [{ badge: 1, relation: 'occupied' }],
      },
    };
    writeFileSync(manifest.turnContextSpoolPath, `${JSON.stringify({
      ...deliveredContext, dispatchId: invocation.engineDispatchId,
      dispatchProfile: 'blind', dispatchPhase: manifest.dispatchPhase,
    })}\n`, 'utf8');
    const existing = readFileSync(manifest.blindIngressSpoolPath, 'utf8').split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as BlindIngressRecord);
    const ingress = new BlindModelIngressRecorder(existing);
    ingress.record('turn_context', canonicalJson(deliveredContext));
    writeFileSync(manifest.blindIngressSpoolPath,
      `${ingress.records().map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
    return {
      exit: 'cancelled', resumeSessionId: agentSessionIdFromCli('d569-cancelled-delivery-session'),
      sessionId: 'd569-cancelled-delivery-session', finalText: 'cancelled after context retrieval', usage: null,
      cancellationReason: 'operator_cancelled_after_delivery',
      processEvidence: {
        startedAtUnixMs: 1, endedAtUnixMs: 2, exitCode: null, signal: 'SIGTERM',
        stdout: 'context delivered', stderr: '', decodedEvents: [],
      },
      partialResultEvidence: {
        status: 'partial', decodedEventCount: 1, finalTextFragment: 'cancelled after context retrieval',
        observedUsage: null, stagedInvocationIds: [],
      },
      engineCatalogEvidence: {
        status: 'ready', basis: 'advertised_tool_invoked', dispatchId: invocation.engineDispatchId,
        advertisedInvocationCount: 1, resourceOperationCount: 0,
      },
    };
  }

  async resume(_binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.start(invocation);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }
}

class D569TimeoutBeforeDeliveryAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;

  async probe() { return { present: true, version: 'D569-TIMEOUT-BEFORE-DELIVERY' }; }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    if (invocation.engineDispatchId === undefined) throw new Error('Timeout fixture omitted dispatch identity.');
    return {
      exit: 'timed_out', resumeSessionId: null, sessionId: 'd569-timeout-before-delivery-session',
      finalText: 'catalog observed before timeout', usage: null, timeoutMs: 240_000,
      processEvidence: {
        startedAtUnixMs: 1, endedAtUnixMs: 2, exitCode: null, signal: 'SIGTERM',
        stdout: 'catalog observed before timeout', stderr: '', decodedEvents: [],
      },
      partialResultEvidence: {
        status: 'partial', decodedEventCount: 1, finalTextFragment: 'catalog observed before timeout',
        observedUsage: null, stagedInvocationIds: [],
      },
      engineCatalogEvidence: {
        status: 'inconclusive', dispatchId: invocation.engineDispatchId, reason: 'no_correlated_catalog',
      },
    };
  }

  async resume(_binding: AgentSessionBinding, invocation: AgentInvocation): Promise<AgentTurnResult> {
    return this.start(invocation);
  }

  classifyFailure(): 'unknown' { return 'unknown'; }
}

async function produceCancellationAfterDeliveryRow(): Promise<Readonly<Record<string, unknown>>> {
  const directory = mkdtempSync(join(tmpdir(), 'd569-runner-cancelled-delivery-'));
  const service = new D569CancellationSnapshotService();
  const state = structuredClone(FIRST_BRUTAL_STATE);
  const rows = await runArena(parseArenaArgs([
    '--rooms', '1', '--reps', '1', '--seed', '6203001', '--basis', 'brutal',
    '--out', join(directory, 'rows.jsonl'), '--dm-mode', 'blind', '--cli', 'codex',
    '--model', 'gpt-5.6-luna', '--effort', 'high',
  ]), {
    adapter: new D569CancellationAfterDeliveryAdapter(state), repoCommit: PATCHED_COMMIT,
    heartbeat: () => undefined, boardSnapshotServiceFactory: async () => service,
    fixtureStates: [state],
  });
  const produced = rows[0];
  if (produced === undefined) throw new Error('Cancellation arena produced no row.');
  return JSON.parse(JSON.stringify(produced)) as Readonly<Record<string, unknown>>;
}

async function produceTimeoutBeforeDeliveryRow(): Promise<Readonly<Record<string, unknown>>> {
  const directory = mkdtempSync(join(tmpdir(), 'd569-runner-timeout-before-delivery-'));
  const service = new D569CancellationSnapshotService();
  const state = structuredClone(FIRST_BRUTAL_STATE);
  const rows = await runArena(parseArenaArgs([
    '--rooms', '1', '--reps', '1', '--seed', '6203001', '--basis', 'brutal',
    '--out', join(directory, 'rows.jsonl'), '--dm-mode', 'blind', '--cli', 'codex',
    '--model', 'gpt-5.6-luna', '--effort', 'high',
  ]), {
    adapter: new D569TimeoutBeforeDeliveryAdapter(), repoCommit: PATCHED_COMMIT,
    heartbeat: () => undefined, boardSnapshotServiceFactory: async () => service,
    fixtureStates: [state],
  });
  const produced = rows[0];
  if (produced === undefined) throw new Error('Timeout arena produced no row.');
  return JSON.parse(JSON.stringify(produced)) as Readonly<Record<string, unknown>>;
}

const RUNNER_CANCELLATION_AFTER_DELIVERY_ROW = await produceCancellationAfterDeliveryRow();
const RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW = await produceTimeoutBeforeDeliveryRow();

function capturedFailure(action: () => void): string {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('Expected consumer validation to reject contradictory evidence.');
}

type InvalidCatalogSource = 'malformed' | 'wrong_profile';

function classifiedInvalidCatalogForConsumer(
  dispatchIdValue: string,
  source: InvalidCatalogSource,
) {
  const dispatchId = engineDispatchId(dispatchIdValue);
  const readiness: readonly EngineReadinessRecord[] = source === 'wrong_profile' ? [{
    version: 1, dispatchId, phase: 'primary', profile: 'dm', requestId: 'request:d569-invalid-catalog',
    event: 'tools_list_stream_write_completed', generatedAtUnixMs: 1, writeCompletedAtUnixMs: 2,
    responseId: 'wrong-profile-response', responseSha256: 'a'.repeat(64),
    expectedToolNames: ['engine.get_turn_context'], returnedToolNames: ['engine.get_turn_context'],
    descriptorSha256: 'b'.repeat(64), validation: { status: 'valid' },
  }] : [];
  const evidence = classifyEngineCatalogEvidence({
    dispatchId, expectedProfile: 'blind', expectedPhase: 'primary',
    expectedRequestId: 'request:d569-invalid-catalog', expectedToolNames: ['engine.get_turn_context'],
    events: [], readiness, completed: false, requiredStartupFailed: false,
    ...(source === 'malformed' ? { malformedReadiness: true } : {}),
  });
  if (evidence.status !== 'inconclusive' || evidence.reason !== 'invalid_catalog_response') {
    throw new Error(`${source} consumer fixture did not classify as invalid catalog evidence.`);
  }
  return evidence;
}

function evaluateRunnerTimeoutConsumers(): {
  readonly packetRows: number;
  readonly registeredRows: number;
  readonly observedViolations: readonly string[];
  readonly contradictoryPacketError: string;
  readonly contradictoryRegisteredError: string;
  readonly contradictoryObservedViolations: readonly string[];
  readonly invalidCatalogResults: readonly {
    readonly exit: 'timed_out' | 'cancelled';
    readonly source: InvalidCatalogSource;
    readonly packetError: string;
    readonly registeredError: string;
    readonly observedViolations: readonly string[];
  }[];
} {
  const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
  const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
    .map((cell) => current(cell, 'authorized'));
  packetRows[0] = produced;
  const packetCount = pairedDocuments(packetRows).packet.length;
  const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
    .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
  registeredRows[0] = produced;
  const registeredCount = validateBrutal(raw(registeredRows)).length;
  const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
  if (cell === undefined) throw new Error('Registered timeout cell is absent.');
  const boardImage = record(produced['boardImage']);
  const observedSessionId = produced['sessionId'];
  const scheduledCellKey = produced['scheduledCellKey'];
  const dispatchId = produced['dispatchId'];
  if (typeof observedSessionId !== 'string' || observedSessionId.length === 0 ||
    typeof scheduledCellKey !== 'string' || typeof dispatchId !== 'string') {
    throw new Error('Runner timeout row omitted its observed session or dispatch identity.');
  }
  const observed: D569ObservedRow = {
    arm: cell.arm, cli: 'codex', cliVersion: 'codex-cli 0.153.4', model: cell.model, effort: cell.effort,
    family: cell.family, basis: cell.basis, seed: cell.seed, rep: cell.rep,
    sessionId: observedSessionId, outcome: 'refused', scheduledCellKey, dispatchId,
    engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
    turnContextDelivery: { status: 'timeout_before_delivery' },
    timeoutMs: cell.timeoutMs, escalationModel: null, modelDefaultFallback: false,
    stateHash: cell.stateHash, sharedKbHash: cell.sharedKbHash,
    visualSourceHash: cell.visualSourceHash, visualProfileHash: cell.visualProfileHash,
    visualArtifactHash: String(boardImage['sha256']), baseContextCapBytes: cell.baseContextCapBytes,
    semanticContextCapBytes: cell.semanticContextCapBytes, truncatedBlocks: [],
  };
  const observedViolations = validateD569ObservedRows([cell], [observed]).map((violation) => violation.code);
  const catalog = record(produced['engineCatalogEvidence']);
  const contradictory = {
    ...produced,
    engineCatalogEvidence: { ...catalog, reason: 'conflicting_success_and_failure' },
  };
  const contradictoryPacketRows = [...packetRows];
  contradictoryPacketRows[0] = contradictory;
  const contradictoryRegisteredRows = [...registeredRows];
  contradictoryRegisteredRows[0] = contradictory;
  const invalidCatalogResults = (['timed_out', 'cancelled'] as const).flatMap((exit) =>
    (['malformed', 'wrong_profile'] as const).map((source) => {
      const invalidCatalog = classifiedInvalidCatalogForConsumer(dispatchId, source);
      const delivery = exit === 'timed_out'
        ? produced['turnContextDelivery']
        : {
            status: 'not_requested' as const, dispatchId,
            reason: 'dispatch_cancelled' as const, measurement: null,
          };
      const ingress = record(produced['blindIngressAudit']);
      const invalidRow = {
        ...produced,
        ...(exit === 'cancelled'
          ? {
              outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
              turnContextDelivery: delivery,
              blindIngressAudit: { ...ingress, delivery },
              failingDispatch: {
                phase: 'primary', exit, dispatchId, engineCatalogEvidence: invalidCatalog,
                turnContextDelivery: delivery, failureReason: 'operator cancelled before delivery',
              },
            }
          : {}),
        engineCatalogEvidence: invalidCatalog,
      };
      const invalidPacketRows = [...packetRows];
      invalidPacketRows[0] = invalidRow;
      const invalidRegisteredRows = [...registeredRows];
      invalidRegisteredRows[0] = invalidRow;
      const observedDelivery: D569ObservedRow['turnContextDelivery'] = exit === 'timed_out'
        ? { status: 'timeout_before_delivery' }
        : { status: 'not_requested', reason: 'dispatch_cancelled' };
      const invalidObserved: D569ObservedRow = {
        ...observed,
        outcome: exit === 'timed_out' ? 'refused' : 'infrastructure_failed',
        engineCatalogEvidence: { status: 'inconclusive', reason: invalidCatalog.reason },
        turnContextDelivery: observedDelivery,
        ...(exit === 'cancelled' ? {
          failingDispatch: {
            dispatchId, exit, engineCatalogEvidence: { status: 'inconclusive' },
            turnContextDelivery: { status: 'not_requested' },
          },
        } : {}),
      };
      return {
        exit, source,
        packetError: capturedFailure(() => { pairedDocuments(invalidPacketRows); }),
        registeredError: capturedFailure(() => { validateBrutal(raw(invalidRegisteredRows)); }),
        observedViolations: validateD569ObservedRows([cell], [invalidObserved])
          .map((violation) => violation.code),
      };
    }));
  return {
    packetRows: packetCount,
    registeredRows: registeredCount,
    observedViolations,
    contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
    contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
    contradictoryObservedViolations: validateD569ObservedRows([cell], [{
      ...observed,
      engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
    }]).map((violation) => violation.code),
    invalidCatalogResults,
  };
}

const RUNNER_TIMEOUT_CONSUMERS = evaluateRunnerTimeoutConsumers();

describe('D569 v5 replacement validation and paired analysis tools', () => {
  it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
    const originalRows = Array.from({ length: 10 }, (_, roomIndex) => [1, 2, 3].map((rep) => historical(
      roomIndex + 1, rep,
      [6, 19, 20].includes(roomIndex * 3 + rep) ? null : `historical-session-${String(roomIndex + 1)}-${String(rep)}`,
    ))).flat();
    const original = raw(originalRows);
    const sidecar = reconciliation(original);
    const hardCells = CELLS.filter((cell) => cell.basis === 'hard');
    const replacements = raw(D569_HARD_REPLACEMENT_KEYS.map((key) => {
      const cell = hardCells.find((candidate) => `${String(candidate.seed - 5_117_000)}:${String(candidate.rep)}` === key);
      if (cell === undefined) throw new Error(`Missing hard replacement cell ${key}.`);
      return current(cell, key === '2:1' ? 'infrastructure_failed' : key === '4:1' ? 'service_null' : 'authorized');
    }));
    const mixed = mergeRepairedHard(original, replacements);
    const originalLines = original.trimEnd().split('\n');
    const mixedLines = mixed.trimEnd().split('\n');
    expect(mixedLines.filter((line, index) => line === originalLines[index])).toHaveLength(27);
    expect(validateD569FirstArm(mixed, sidecar)).toHaveLength(30);
  });

  it('migrates every registered validator invariant for a complete current brutal grid', () => {
    expect(validateBrutal(BRUTAL_SOURCE)).toHaveLength(30);
  });

  it('validates registered hard replacements against retained original cells and reconciliation provenance', () => {
    const hardCells = CELLS.filter((cell) => cell.basis === 'hard');
    const original = raw(hardCells.map((cell, index) => retainedHistorical(cell, index + 1)));
    const sidecar = reconciliation(original);
    const replacements = raw(D569_HARD_REPLACEMENT_KEYS.map((key) => {
      const [roomText, repText] = key.split(':');
      const seed = 5_117_000 + Number(roomText);
      const cell = hardCells.find((candidate) => candidate.seed === seed && candidate.rep === Number(repText));
      if (cell === undefined) throw new Error(`Missing registered hard replacement ${key}.`);
      return current(cell, 'authorized');
    }));
    const merged = mergeRepairedHard(original, replacements);
    const observations = validateD569RegisteredFirstArm({
      rawText: merged, basis: 'hard', cliVersion: 'codex-cli 0.153.4',
      patchedCommit: PATCHED_COMMIT, sidecar,
    });
    expect(observations).toHaveLength(30);
    expect(observations.filter((entry) => entry.row['sessionId'] === null)
      .map((entry) => entry.effectiveSessionId)).toEqual([
        'recovered-session-6', 'recovered-session-19', 'recovered-session-20',
      ]);
  });

  it('accepts a registered host-authorization refusal without treating attribution as a default', () => {
    const refused = mutateFirst(BRUTAL_SOURCE, (_row) => ({
      ...current(CELLS.find((cell) => cell.basis === 'brutal')!, 'refused'),
      fallbackReason: 'host_authorization_failed', planner: 'model',
    }));
    expect(validateBrutal(refused)).toHaveLength(30);
  });

  it('rejects a row that actually executed a model default', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({
      ...row, planner: 'engine_default', fallbackReason: 'no_proposal',
    })))).toThrow('model_default_fallback');
  });

  it('accepts cancellation after delivered context in registered validation', () => {
    const cancelled = mutateFirst(BRUTAL_SOURCE, (row) => {
      const dispatchId = String(row['dispatchId']);
      return {
        ...row, outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
        failingDispatch: {
          phase: 'primary', exit: 'cancelled', dispatchId,
          engineCatalogEvidence: row['engineCatalogEvidence'],
          turnContextDelivery: row['turnContextDelivery'],
          failureReason: 'operator cancelled after delivery',
        },
      };
    });
    expect(validateBrutal(cancelled)).toHaveLength(30);
  });

  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
    const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
    expect(produced).toMatchObject({
      outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
      turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
      failingDispatch: {
        phase: 'primary', exit: 'cancelled',
        turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
      },
    });
    expect(produced['semanticBoardBytes']).toEqual(expect.any(Number));
    expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
    const failure = record(produced['failingDispatch']);
    expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
    const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
      .map((cell) => current(cell, 'authorized'));
    packetRows[0] = produced;
    expect(pairedDocuments(packetRows).packet).toHaveLength(60);

    const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
      .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
    registeredRows[0] = produced;
    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
  });

  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
    const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
    expect(produced).toMatchObject({
      outcome: 'refused', fallbackReason: 'timeout',
      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
    });
    expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
    expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');
    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryObservedViolations).toContain('integrity_indeterminate');
  });

  it('rejects malformed and wrong-profile catalog evidence after timeout or cancellation in every consumer', () => {
    expect(RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults).toHaveLength(4);
    expect(RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults.map(({ exit, source }) => `${exit}:${source}`))
      .toEqual([
        'timed_out:malformed', 'timed_out:wrong_profile',
        'cancelled:malformed', 'cancelled:wrong_profile',
      ]);
    for (const result of RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults) {
      expect(result.packetError).toContain('integrity evidence');
      expect(result.registeredError).toContain('integrity-indeterminate');
      expect(result.observedViolations).toContain('integrity_indeterminate');
    }
  });

  it('rejects incomplete v3 evidence objects', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
      const catalog = record(row['engineCatalogEvidence']);
      return { ...row, engineCatalogEvidence: { status: catalog['status'], dispatchId: catalog['dispatchId'] } };
    }))).toThrow();
  });

  it('rejects an indeterminate delivery when the companion v3 catalog field is absent', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
      const { engineCatalogEvidence: _omitted, ...withoutCatalog } = row;
      return {
        ...withoutCatalog,
        turnContextDelivery: {
          status: 'indeterminate', dispatchId: row['dispatchId'],
          reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
          integrityAction: 'stop_after_persist',
        },
      };
    }))).toThrow();
  });

  it.each(['conflicting_success_and_failure', 'invalid_catalog_response'] as const)(
    'rejects a %s catalog when the companion v3 delivery field is absent',
    (reason) => {
      expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
        const { turnContextDelivery: _omitted, ...withoutDelivery } = row;
        return {
          ...withoutDelivery,
          engineCatalogEvidence: { status: 'inconclusive', dispatchId: row['dispatchId'], reason },
        };
      }))).toThrow();
    },
  );

  it('rejects incomplete v3 evidence nested in a failing dispatch', () => {
    const rows = BRUTAL_SOURCE.trimEnd().split('\n').map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
    const index = rows.findIndex((row) => row['outcome'] === 'infrastructure_failed');
    if (index < 0) throw new Error('Registered fixture lacks an infrastructure row.');
    const row = rows[index]!;
    const failure = record(row['failingDispatch']);
    const catalog = record(failure['engineCatalogEvidence']);
    rows[index] = {
      ...row,
      failingDispatch: {
        ...failure,
        engineCatalogEvidence: { status: catalog['status'], dispatchId: catalog['dispatchId'] },
      },
    };
    expect(() => validateBrutal(raw(rows))).toThrow();
  });

  it('rejects a missing v3 host diagnostic', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
      const { hostContextDiagnostic: _hostContextDiagnostic, ...withoutHostDiagnostic } = row;
      return withoutHostDiagnostic;
    }))).toThrow();
  });

  it('rejects partial v3 hybrids and integrity-indeterminate rows before analysis', () => {
    const historicalRows = Array.from({ length: 10 }, (_, roomIndex) => [1, 2, 3].map((rep) =>
      historical(roomIndex + 1, rep, `historical-${String(roomIndex + 1)}-${String(rep)}`))).flat();
    expect(() => validateD569FirstArm(raw(historicalRows.map((row, index) => index === 0
      ? { ...row, dispatchId: 'engine-dispatch:hybrid-0001' }
      : row)))).toThrow('partial arena-row-v3 hybrid');
    expect(() => validateD569FirstArm(mutateFirst(BRUTAL_SOURCE, (row) => ({
      ...row, outcome: 'integrity_indeterminate',
    })))).toThrow('integrity-indeterminate');
  });

  it('rejects registered seed mutations', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({ ...row, seed: 123 })))).toThrow('Unregistered');
  });

  it('rejects registered fixture-state mutations', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({ ...row, startingRoomDigest: '0'.repeat(64) }))))
      .toThrow('fixture state');
  });

  it('rejects registered code-cohort mutations', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({ ...row, repoCommit: 'f'.repeat(40) }))))
      .toThrow('Code-cohort');
  });

  it.each([
    ['model', (row: Readonly<Record<string, unknown>>) => ({ ...row, model: 'gpt-5.6-sol' }), 'launch provenance'],
    ['effort', (row: Readonly<Record<string, unknown>>) => ({ ...row, effort: 'medium' }), 'launch provenance'],
    ['KB hash', (row: Readonly<Record<string, unknown>>) => ({ ...row, kbHash: '0'.repeat(64) }), 'KB provenance'],
    ['KB components', (row: Readonly<Record<string, unknown>>) => ({
      ...row, sharedKbComponentHashes: { root: '0'.repeat(64) },
    }), 'KB provenance'],
    ['visual pin', (row: Readonly<Record<string, unknown>>) => ({
      ...row,
      visualProfile: { ...row['visualProfile'] as Readonly<Record<string, unknown>>, glyphMode: 'letters' },
    }), 'visual provenance'],
  ] as const)('rejects registered %s provenance mutations', (_label, mutate, message) => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, mutate))).toThrow(message);
  });

  it('rejects registered manifest mutations before accepting rows', () => {
    const changedManifest: D569ExperimentManifest = {
      ...MANIFEST,
      sharedKb: { ...MANIFEST.sharedKb, combinedStartupHash: '0'.repeat(64) },
    };
    expect(() => validateBrutal(BRUTAL_SOURCE, changedManifest)).toThrow('registered manifest is invalid');
  });

  it('runs raw outcomes through packet/key construction and the registered paired scorer', () => {
    const rawRows = CELLS.filter((cell) => cell.basis === 'brutal').map((cell, index) =>
      current(cell, index === 3 ? 'infrastructure_failed' : index === 8 ? 'service_null' : 'authorized'));
    const documents = pairedDocuments(rawRows);
    const result = analyzeRegisteredPrimaryPair({
      manifest: MANIFEST, basis: 'brutal', documents, resamples: 20, bootstrapSeed: 569_575,
    });
    expect(documents.packet).toHaveLength(60);
    expect(documents.answerKey).toHaveLength(60);
    expect(result.left.counts).toMatchObject({ infrastructureFailed: 1, serviceFailed: 1 });
    expect(result.pairedZeroInclusive.total.count).toBe(29);
    const mismatched = { ...documents, answerKey: documents.answerKey.slice(1) };
    expect(() => analyzeRegisteredPrimaryPair({
      manifest: MANIFEST, basis: 'brutal', documents: mismatched, resamples: 20,
    })).toThrow('same 60 blind IDs');
  });
});
