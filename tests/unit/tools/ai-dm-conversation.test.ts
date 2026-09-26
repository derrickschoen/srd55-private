import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  agentSessionIdFromCli,
  measuredContextRolloverThreshold,
  engineDispatchId,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentTurnResult,
} from '../../../src/vtt/agent-session';
import {
  AgentSessionLifecycle,
  createConversationRoundDeadline,
  type AgentDispatchDeadline,
} from '../../../src/vtt/agent-session-lifecycle';
import {
  parseConversationArgs,
  proposalResolutionDivergence,
  isPlanAdjustmentProposal,
  isRoundProposal,
  runConversation,
  createMcpClient,
  McpChildExited,
  mcpRequest,
  stopMcpClient,
  profiledTurnContextArguments,
  persistD569IntegrityStop,
  type ConversationBoardSnapshotService,
  type ConversationRunOptions,
} from '../../../tools/ai-dm-conversation';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { createEncounter } from '../../../src/combat/encounter';
import { combatantId, encounterSessionId, type CombatantId } from '../../../src/combat/values';
import { generateRoom } from '../../../src/vtt/room-generator';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  engineActorOptionsForEnvironment,
} from '../../../src/vtt/intent-resolver';
import {
  freshMonsterPlanningState,
  loadArenaFixture,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION } from '../../../src/vtt/mcp/engine-server';
import {
  importSavedSession,
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { codexArgv } from '../../../src/vtt/agent-adapters/codex';
import { D569IntegrityStop } from '../../../src/vtt/d569-integrity';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { engineActionId } from '../../../src/vtt/turn-proposal';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { traceCombatantLine } from '../../../src/combat/cover';
import {
  DEFAULT_KB_HASH,
  revisionBoundOfferEnvironmentInput,
  createEngineMcpRuntime,
  minimalAlternatingInitiativeRoom,
  validRecalculationRoom,
  RecordingConversationAdapter,
  objectValue,
  d569BoardSnapshotService,
  incompleteCatalogAdapter,
  classifiedInvalidCatalog,
  runIncompleteCatalogIntegrityStop,
  BoilerplateThenValidStructuredFinalAdapter,
  SerializedRoundTripAdapter,
  pendingArenaReactionState,
  preparedMonsterRoundRevision,
  producerMutationReceipt,
} from './ai-dm-conversation-fixtures';

const BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment(revisionBoundOfferEnvironmentInput());
const DIVERGENCE_OFFER_ENVIRONMENT = buildOfferEnvironment(revisionBoundOfferEnvironmentInput());
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
      .not.toContain('every actor with a legal attack must attack');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('every actor with a legal attack against a creature it plausibly knows about must attack');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('Dash-to-close counts as offense for out-of-reach melee');
    expect(tieredAdapter.startInvocations[1]?.instructions)
      .toContain('Dodge is allowed only when that actor has no resolvable action');
    const escalation = tieredAdapter.startInvocations[1];
    if (escalation?.instructions === undefined || escalation.instructions === null) {
      throw new Error('Configured escalation omitted its typed startup instructions.');
    }
    expect(escalation.instructions.split('## Monster knowledge').length - 1).toBe(1);
    expect(escalation.instructions.split(MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION).length - 1).toBe(1);
    expect(escalation.bootstrap).toMatchObject({
      kind: 'escalation', knowledgeBaseBundleHash: DEFAULT_KB_HASH,
      stateDelivery: 'full_engine_context',
    });
    const escalationPromptLines = escalation.prompt.split('\n');
    expect(escalationPromptLines.filter((line) =>
      line === MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION)).toHaveLength(1);
    expect(escalationPromptLines.indexOf(MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION))
      .toBeLessThan(escalationPromptLines.findIndex((line) => line.startsWith('Turn resource:')));
    expect(MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION)
      .toContain('This knowledge constraint takes precedence');
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
      offerEnvironmentDigest: DIVERGENCE_OFFER_ENVIRONMENT.digest,
      resolutionDigest: '0'.repeat(64),
      summary: storedSummary,
    }, DIVERGENCE_OFFER_ENVIRONMENT)).toEqual([
      `${actor.profile.id}: resolved action sequence, targets, or movement cost diverged; ` +
        `proposal was "${storedSummary}" and authoritative resolution was "${authoritativeSummary}".`,
    ]);
  });

  it('divergence refuses a stored resolution produced under a different offer environment', () => {
    const state = freshMonsterPlanningState(generateRoom(3_943_006).encounter.state);
    const actor = state.combatants.find((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead');
    if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
    const option = availableEngineActorOptions(state, actor.profile.id, BOUND_OFFER_ENVIRONMENT)
      .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
    if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
    const proposal = {
      actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
      fallbackOptionId: null, reason: 'Exercise environment provenance.', overrideJustification: null,
    };
    const resolution = createPureTurnProposalResolver(BOUND_OFFER_ENVIRONMENT).resolve(state, proposal);
    if (!resolution.valid) throw new Error('Environment provenance fixture did not resolve.');
    const legacyEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

    const storedResolution = {
      proposal,
      option: resolution.option,
      primaryOption: resolution.primaryOption,
      fallbackOption: resolution.fallbackOption,
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
      offerEnvironmentDigest: BOUND_OFFER_ENVIRONMENT.digest,
      resolutionDigest: resolution.resolutionDigest,
      summary: resolution.summary,
    };
    expect(proposalResolutionDivergence(state, storedResolution, BOUND_OFFER_ENVIRONMENT)).toEqual([]);
    expect(proposalResolutionDivergence(state, storedResolution, legacyEnvironment)).toEqual([
      `${actor.profile.id}: stored resolution was produced under offer environment ` +
        `${BOUND_OFFER_ENVIRONMENT.digest}, authoritative environment is ${legacyEnvironment.digest}.`,
    ]);
  });

  it('rejects stored proposal resolutions with missing or non-64-hex environment digests', () => {
    const state = freshMonsterPlanningState(generateRoom(3_943_006).encounter.state);
    const actor = state.combatants.find((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead');
    if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
    const option = availableEngineActorOptions(state, actor.profile.id, BOUND_OFFER_ENVIRONMENT)
      .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
    if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
    const proposal = {
      actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
      fallbackOptionId: null, reason: 'Exercise stored proposal decoding.', overrideJustification: null,
    };
    const resolution = createPureTurnProposalResolver(BOUND_OFFER_ENVIRONMENT).resolve(state, proposal);
    if (!resolution.valid) throw new Error('Stored proposal decoder fixture did not resolve.');
    const storedResolution = {
      proposal,
      option: resolution.option,
      primaryOption: resolution.primaryOption,
      fallbackOption: resolution.fallbackOption,
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
      offerEnvironmentDigest: BOUND_OFFER_ENVIRONMENT.digest,
      resolutionDigest: resolution.resolutionDigest,
      summary: resolution.summary,
    };
    const { offerEnvironmentDigest: _omittedDigest, ...missingDigest } = storedResolution;
    const envelope = {
      kind: 'round_turn_proposal',
      proposalId: 'proposal:codec',
      runId: 'encounter:codec',
      branchId: 'branch:codec',
      requestId: 'request:codec',
      expectedRevision: 1,
      stateDigest: 'state',
      stateHandle: 'handle',
      phase: 'initial',
      idempotencyKey: 'codec-0001',
      resolutions: [storedResolution],
      rationale: null,
      reactionGuidance: null,
    };
    expect(isRoundProposal(envelope)).toBe(true);
    expect(isRoundProposal({
      ...envelope,
      resolutions: [missingDigest],
    })).toBe(false);
    expect(isRoundProposal({
      ...envelope,
      resolutions: [{ ...storedResolution, offerEnvironmentDigest: 'not-a-digest' }],
    })).toBe(false);
    expect(isRoundProposal({
      ...envelope,
      resolutions: [{ ...storedResolution, offerEnvironmentDigest: 'a'.repeat(63) }],
    })).toBe(false);
    expect(isRoundProposal({
      ...envelope,
      resolutions: [{ ...storedResolution, offerEnvironmentDigest: 'a'.repeat(65) }],
    })).toBe(false);
    expect(isRoundProposal({
      ...envelope,
      resolutions: [{ ...storedResolution, offerEnvironmentDigest: 'A'.repeat(64) }],
    })).toBe(false);
    const nonStringDigests: readonly unknown[] = [
      [BOUND_OFFER_ENVIRONMENT.digest],
      64,
      null,
      { digest: BOUND_OFFER_ENVIRONMENT.digest },
    ];
    for (const nonStringDigest of nonStringDigests) {
      expect(isRoundProposal({
        ...envelope,
        resolutions: [{ ...storedResolution, offerEnvironmentDigest: nonStringDigest }],
      })).toBe(false);
      expect(isRoundProposal({
        ...envelope,
        resolutions: [{ ...storedResolution, resolutionDigest: nonStringDigest }],
      })).toBe(false);
    }
  });

  it('rejects plan adjustment envelopes whose stored updates carry malformed digests', () => {
    const state = freshMonsterPlanningState(generateRoom(3_943_006).encounter.state);
    const actor = state.combatants.find((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead');
    if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
    const option = availableEngineActorOptions(state, actor.profile.id, BOUND_OFFER_ENVIRONMENT)
      .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
    if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
    const proposal = {
      actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
      fallbackOptionId: null, reason: 'Exercise stored adjustment decoding.', overrideJustification: null,
    };
    const resolution = createPureTurnProposalResolver(BOUND_OFFER_ENVIRONMENT).resolve(state, proposal);
    if (!resolution.valid) throw new Error('Stored adjustment decoder fixture did not resolve.');
    const storedResolution = {
      proposal,
      option: resolution.option,
      primaryOption: resolution.primaryOption,
      fallbackOption: resolution.fallbackOption,
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
      offerEnvironmentDigest: BOUND_OFFER_ENVIRONMENT.digest,
      resolutionDigest: resolution.resolutionDigest,
      summary: resolution.summary,
    };
    const envelope = {
      kind: 'plan_adjustment_turn_proposal',
      proposalId: 'proposal:adjustment-codec',
      runId: 'encounter:adjustment-codec',
      branchId: 'branch:adjustment-codec',
      requestId: 'request:adjustment-codec',
      expectedRevision: 1,
      stateDigest: 'state',
      stateHandle: 'handle',
      phase: 'initial',
      idempotencyKey: 'adjustment-codec-0001',
      baseline_plan_hash: 'a'.repeat(64),
      updates: [storedResolution],
    };
    const { offerEnvironmentDigest: _missingEnvironmentDigest, ...missingEnvironmentDigest } = storedResolution;
    const { resolutionDigest: _missingResolutionDigest, ...missingResolutionDigest } = storedResolution;
    expect(isPlanAdjustmentProposal(envelope)).toBe(true);
    expect(isPlanAdjustmentProposal({ ...envelope, updates: [missingEnvironmentDigest] })).toBe(false);
    expect(isPlanAdjustmentProposal({
      ...envelope,
      updates: [{ ...storedResolution, offerEnvironmentDigest: 'a'.repeat(63) }],
    })).toBe(false);
    expect(isPlanAdjustmentProposal({
      ...envelope,
      updates: [{ ...storedResolution, offerEnvironmentDigest: 'A'.repeat(64) }],
    })).toBe(false);
    expect(isPlanAdjustmentProposal({
      ...envelope,
      updates: [{ ...storedResolution, offerEnvironmentDigest: [BOUND_OFFER_ENVIRONMENT.digest] }],
    })).toBe(false);
    expect(isPlanAdjustmentProposal({ ...envelope, updates: [missingResolutionDigest] })).toBe(false);
    expect(isPlanAdjustmentProposal({
      ...envelope,
      updates: [{ ...storedResolution, resolutionDigest: 'a'.repeat(63) }],
    })).toBe(false);
    expect(isPlanAdjustmentProposal({
      ...envelope,
      updates: [{ ...storedResolution, resolutionDigest: 'A'.repeat(64) }],
    })).toBe(false);
    expect(isPlanAdjustmentProposal({
      ...envelope,
      updates: [{ ...storedResolution, resolutionDigest: [resolution.resolutionDigest] }],
    })).toBe(false);
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
});
