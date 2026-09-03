import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { encounterBranchId, encounterSessionId } from '../src/combat/values';
import { sha256 } from '../src/crypto/sha256';
import { createEngineStateCapsule, engineStateHandle, projectEngineEncounterState } from '../src/vtt/engine-state-capsule';
import type { EngineStateReference } from '../src/vtt/engine-state-capsule';
import { engineActionRegistry } from '../src/vtt/engine-query-port';
import { projectEngineInitiativeIntel } from '../src/vtt/engine-initiative-intel';
import { resolveAgentAdapter } from '../src/vtt/agent-adapters';
import { UNVERIFIED_CONTRACT_CLAUDE_CODE } from '../src/vtt/agent-adapters/claude-code';
import { UNVERIFIED_CONTRACT_CODEX } from '../src/vtt/agent-adapters/codex';
import { UNVERIFIED_CONTRACT_OPENCODE } from '../src/vtt/agent-adapters/opencode';
import { PI_MCP_SKIPPED_NO_EXTENSION, UNVERIFIED_CONTRACT_PI } from '../src/vtt/agent-adapters/pi';
import { AgentAdapterError, AGENT_ADAPTER_VERSION } from '../src/vtt/agent-adapters/process';
import { agentSessionIdFromCli, isAgentCliKind } from '../src/vtt/agent-session';
import type { AgentCliKind, AgentFailureClassification, AgentInvocation, AgentSessionAdapter, AgentSessionBinding } from '../src/vtt/agent-session';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';

export const AGENT_CLI_KINDS = ['codex', 'opencode', 'pi', 'claude-code'] as const;
export type ConformanceStatus = 'VERIFIED' | 'FAILED' | 'UNVERIFIED';
type LifecycleEvidence = Readonly<{
  coldStart: boolean;
  sessionIdCaptured: boolean;
  resume: boolean;
  mcpProof: boolean;
  attempts_used: number;
  classifiedResumeFailure: boolean;
}>;
type ContractEvidence = Readonly<{
  marker: string;
  liveStatus: ConformanceStatus;
  turnMarkers?: readonly string[];
}>;

export interface AgentConformanceRecord {
  readonly cli: AgentCliKind;
  readonly present: boolean;
  readonly version: string | null;
  readonly status: ConformanceStatus;
  readonly reason: AgentFailureClassification | 'lifecycle_incomplete' | 'resume_missing_session_was_accepted' |
    'mcp_wiring_skipped_no_extension' | 'upstream_mcp_tools_not_exposed_issue_33027' | null;
  readonly lifecycle: LifecycleEvidence;
  readonly contractEvidence: ContractEvidence;
  readonly errorExcerpt: string | null;
  readonly stderrTail: string | null;
}

export interface AgentConformanceReport {
  readonly schemaVersion: 1;
  readonly title: 'LIVE AGENT CLI CONFORMANCE — NOT SIMULATED';
  readonly generatedAt: string;
  readonly protocolConformance: Readonly<{ status: 'SUBSTITUTED_LOCAL'; reason: 'official_conformance_and_inspector_not_installed_network_fetch_forbidden' }>;
  readonly records: readonly AgentConformanceRecord[];
  readonly aggregate: ConformanceStatus;
  readonly exitCode: 0 | 1 | 2;
}

export interface AgentConformanceOptions { readonly cli: AgentCliKind | null; readonly reportPath: string | null }
export interface AgentConformanceDependencies {
  readonly adapter: (kind: AgentCliKind) => AgentSessionAdapter;
  readonly now: () => string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
  readonly expectedMcpProof: () => Promise<Readonly<{ proofToken: string; stateRef: EngineStateReference }>>;
  readonly writeReport: (path: string, report: AgentConformanceReport) => Promise<void>;
}

const CONTRACT_MARKERS: Readonly<Record<AgentCliKind, string>> = {
  codex: UNVERIFIED_CONTRACT_CODEX,
  opencode: UNVERIFIED_CONTRACT_OPENCODE,
  pi: UNVERIFIED_CONTRACT_PI,
  'claude-code': UNVERIFIED_CONTRACT_CLAUDE_CODE,
};
const DEFAULT_MODELS: Readonly<Record<AgentCliKind, string>> = {
  codex: 'gpt-5.6-sol',
  opencode: 'openai/gpt-5.6-sol',
  pi: 'openai/gpt-5.6-sol',
  'claude-code': 'sonnet',
};

const emptyLifecycle = (): LifecycleEvidence => ({
  coldStart: false,
  sessionIdCaptured: false,
  resume: false,
  mcpProof: false,
  attempts_used: 0,
  classifiedResumeFailure: false,
});
const statusForFailure = (classification: AgentFailureClassification): ConformanceStatus =>
  classification === 'cli_absent' || classification === 'authentication' ? 'UNVERIFIED' : 'FAILED';

function invocation(kind: AgentCliKind, prompt: string): AgentInvocation {
  const environmentKey = `DND_AGENT_CONFORMANCE_MODEL_${kind.replaceAll('-', '_').toUpperCase()}`;
  return {
    runId: encounterSessionId('encounter:engine-mcp'),
    prompt,
    model: process.env[environmentKey] ?? DEFAULT_MODELS[kind],
    reasoningEffort: 'low',
    callPhase: 'initial',
    launcherToken: `agent-conformance-${kind}-launcher-token`,
    timeoutMs: conformanceTimeoutMs(kind),
  };
}

function binding(kind: AgentCliKind, sessionId: string): AgentSessionBinding {
  return { cli: kind, sessionId: agentSessionIdFromCli(sessionId), adapterVersion: AGENT_ADAPTER_VERSION, recoveryGeneration: 0, predecessorSessionHash: null, startedAtRevision: 1, lastDispatchedRevision: 1, callUsage: [], currentContextTokens: null, status: 'active' };
}

function conformanceTimeoutMs(kind: AgentCliKind): number {
  const kindKey = `DND_AGENT_CONFORMANCE_TIMEOUT_MS_${kind.replaceAll('-', '_').toUpperCase()}`;
  const configured = process.env[kindKey] ?? process.env['DND_AGENT_CONFORMANCE_TIMEOUT_MS'];
  if (configured === undefined) return 300_000;
  const parsed = Number(configured);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError(`${kindKey} or DND_AGENT_CONFORMANCE_TIMEOUT_MS must be a positive safe integer.`);
  }
  return parsed;
}

function mcpProofPrompt(kind: AgentCliKind, stateRef: EngineStateReference): string {
  const reference = JSON.stringify({
    run_id: stateRef.runId,
    state_handle: stateRef.stateHandle,
    expected_revision: stateRef.expectedRevision,
  });
  if (kind === 'pi') {
    return [
      'Call the proxied tool engine_engine_get_state_summary; do not answer from prompt text.',
      'If that tool is unavailable, first call mcp({search:"engine"}) and then call the matching engine state-summary tool.',
      `Use turn-minimal granularity with this exact state_ref: ${reference}.`,
      'Reply with exactly the proof_token field from the tool result, a 64-character hexadecimal string.',
    ].join(' ');
  }
  return [
    'Use the engine MCP server now; do not answer from prompt text.',
    'Obtain the current round turn context for run encounter:engine-mcp at revision 1.',
    `Then use the engine state summary tool at turn-minimal granularity with this exact state_ref: ${reference}.`,
    'Reply with exactly the proof_token field from the tool result, a 64-character hexadecimal string.',
  ].join(' ');
}

interface FailureDiagnostic {
  readonly errorExcerpt: string;
  readonly stderrTail: string;
}

function failureDiagnostic(error: unknown, fallback: string): FailureDiagnostic {
  const message = error instanceof Error ? error.message : error === undefined ? fallback : String(error);
  const stderr = error instanceof AgentAdapterError ? error.stderr : '';
  return {
    errorExcerpt: message.slice(0, 500),
    stderrTail: stderr.slice(-500),
  };
}

function probeFailure(
  kind: AgentCliKind,
  version: string | null,
  reason: AgentFailureClassification,
  error?: unknown,
): AgentConformanceRecord {
  const status = statusForFailure(reason);
  return {
    cli: kind,
    present: reason !== 'cli_absent',
    version,
    status,
    reason,
    lifecycle: emptyLifecycle(),
    contractEvidence: { marker: CONTRACT_MARKERS[kind], liveStatus: status },
    ...failureDiagnostic(error, `CLI ${kind} failed during probe: ${reason}.`),
  };
}

async function verifyCli(
  kind: AgentCliKind,
  adapter: AgentSessionAdapter,
  expectedMcpProof: () => Promise<Readonly<{ proofToken: string; stateRef: EngineStateReference }>>,
): Promise<AgentConformanceRecord> {
  let version: string | null = null;
  try {
    const probe = await adapter.probe();
    version = probe.version;
    if (!probe.present) return probeFailure(kind, null, 'cli_absent');
  } catch (error) {
    return probeFailure(kind, version, adapter.classifyFailure(error), error);
  }

  const lifecycle = { coldStart: false, sessionIdCaptured: false, resume: false, mcpProof: false, attempts_used: 0, classifiedResumeFailure: false };
  const turnMarkers: string[] = [];
  try {
    const signal = new AbortController().signal;
    const started = await adapter.start(invocation(kind, 'Cold start the engine MCP server and reply ENGINE_BOOT_OK.'), signal);
    turnMarkers.push(...(started.contractEvidence ?? []));
    lifecycle.coldStart = started.exit === 'completed';
    lifecycle.sessionIdCaptured = String(started.resumeSessionId).length > 0;
    if (turnMarkers.includes(PI_MCP_SKIPPED_NO_EXTENSION)) {
      return {
        cli: kind,
        present: true,
        version,
        status: 'UNVERIFIED',
        reason: 'mcp_wiring_skipped_no_extension',
        lifecycle,
        contractEvidence: { marker: CONTRACT_MARKERS[kind], liveStatus: 'UNVERIFIED', turnMarkers },
        ...failureDiagnostic(undefined, 'Pi MCP wiring was skipped because no extension path was configured.'),
      };
    }
    const resumed = await adapter.resume(binding(kind, started.resumeSessionId), invocation(kind, 'Resume the session and reply ENGINE_RESUME_OK.'), signal);
    turnMarkers.push(...(resumed.contractEvidence ?? []));
    lifecycle.resume = resumed.exit === 'completed' && resumed.resumeSessionId === started.resumeSessionId;
    const proof = await expectedMcpProof();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      lifecycle.attempts_used = attempt;
      try {
        const mcpProof = await adapter.resume(
          binding(kind, started.resumeSessionId),
          invocation(kind, mcpProofPrompt(kind, proof.stateRef)),
          signal,
        );
        turnMarkers.push(...(mcpProof.contractEvidence ?? []));
        lifecycle.mcpProof = mcpProof.exit === 'completed' && mcpProof.resumeSessionId === started.resumeSessionId &&
          mcpProof.finalText.includes(proof.proofToken);
        if (lifecycle.mcpProof) break;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
    try {
      await adapter.resume(binding(kind, missingSessionId(kind)), invocation(kind, 'A deliberately missing session must fail.'), signal);
      return {
        cli: kind,
        present: true,
        version,
        status: 'FAILED',
        reason: 'resume_missing_session_was_accepted',
        lifecycle,
        contractEvidence: { marker: CONTRACT_MARKERS[kind], liveStatus: 'FAILED', turnMarkers },
        ...failureDiagnostic(undefined, 'The adapter accepted a deliberately missing resume session.'),
      };
    } catch (error) {
      const missingClassification = adapter.classifyFailure(error);
      if (missingClassification !== 'resume_not_found' && missingClassification !== 'resume_corrupt') {
        const status = statusForFailure(missingClassification);
        return {
          cli: kind,
          present: true,
          version,
          status,
          reason: missingClassification,
          lifecycle,
          contractEvidence: { marker: CONTRACT_MARKERS[kind], liveStatus: status, turnMarkers },
          ...failureDiagnostic(error, `Missing-session check failed: ${missingClassification}.`),
        };
      }
      lifecycle.classifiedResumeFailure = true;
    }
    const verified = lifecycle.coldStart && lifecycle.sessionIdCaptured && lifecycle.resume && lifecycle.mcpProof &&
      lifecycle.classifiedResumeFailure;
    const openCodeUpstreamFailure = kind === 'opencode' && lifecycle.coldStart && lifecycle.sessionIdCaptured &&
      lifecycle.resume && !lifecycle.mcpProof && lifecycle.classifiedResumeFailure;
    const verifiedStatus: ConformanceStatus = verified ? 'VERIFIED' : 'FAILED';
    return {
      cli: kind,
      present: true,
      version,
      status: verifiedStatus,
      reason: verified
        ? null
        : openCodeUpstreamFailure ? 'upstream_mcp_tools_not_exposed_issue_33027' : 'lifecycle_incomplete',
      lifecycle,
      contractEvidence: { marker: CONTRACT_MARKERS[kind], liveStatus: verifiedStatus, turnMarkers },
      errorExcerpt: verified
        ? null
        : openCodeUpstreamFailure
          ? 'OpenCode upstream issue anomalyco/opencode#33027: connected MCP tools are not exposed to the headless agent.'
          : 'One or more required lifecycle proofs did not complete.',
      stderrTail: verified ? null : '',
    };
  } catch (error) {
    const classification = adapter.classifyFailure(error);
    const status = statusForFailure(classification);
    return {
      cli: kind,
      present: true,
      version,
      status,
      reason: classification,
      lifecycle,
      contractEvidence: { marker: CONTRACT_MARKERS[kind], liveStatus: status, turnMarkers },
      ...failureDiagnostic(error, `CLI ${kind} lifecycle failed: ${classification}.`),
    };
  }
}

function reportExitCode(records: readonly AgentConformanceRecord[]): 0 | 1 | 2 {
  if (records.some((record) => record.status === 'FAILED')) return 1;
  if (records.some((record) => record.status === 'UNVERIFIED')) return 2;
  return 0;
}

function missingSessionId(kind: AgentCliKind): string {
  return kind === 'claude-code'
    ? '00000000-0000-4000-8000-000000000001'
    : `missing-session-${kind}`;
}

function defaultDependencies(): AgentConformanceDependencies {
  const fixturePath = resolve('tests/fixtures/arena-basis/seed-3943001.json');
  const engineArgs = [
    resolve('node_modules/vite-node/vite-node.mjs'),
    resolve('tools/engine-mcp-server.ts'),
    fixturePath,
  ];
  const proof = recomputeFixtureCapsuleProof(fixturePath);
  return {
    adapter: (kind) => resolveAgentAdapter(kind, {
      cwd: process.cwd(),
      engineCommand: process.execPath,
      engineArgs,
      ...(process.env['DND_PI_MCP_EXTENSION_PATH'] === undefined ? {} : { piMcpExtensionPath: process.env['DND_PI_MCP_EXTENSION_PATH'] }),
    }),
    now: () => new Date().toISOString(),
    stdout: (line) => { process.stdout.write(`${line}\n`); },
    stderr: (line) => { process.stderr.write(`${line}\n`); },
    expectedMcpProof: () => proof,
    writeReport: async (path, report) => {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    },
  };
}

async function recomputeFixtureCapsuleProof(
  fixturePath: string,
): Promise<Readonly<{ proofToken: string; stateRef: EngineStateReference }>> {
  const state = await loadArenaFixture(fixturePath);
  const actors = state.combatants
    .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
    .map((candidate) => candidate.profile.id)
    .sort();
  if (actors.length === 0) throw new TypeError('Agent conformance fixture has no living monster actors.');
  const capsule = createEngineStateCapsule({
    runId: encounterSessionId('encounter:engine-mcp'),
    branchId: encounterBranchId('branch:engine-mcp'),
    revision: 1,
    generatedAt: '2026-08-27T12:00:00.000Z',
    request: {
      requestId: 'request:engine-mcp',
      phase: 'initial',
      correctionNumber: 0,
      actors,
    },
    projection: projectEngineEncounterState(
      state,
      engineActionRegistry(state),
      projectEngineInitiativeIntel(state, []),
      1,
    ),
  });
  return {
    proofToken: sha256(`${capsule.digest}|turn_minimal|state_summary_proof_v1`),
    stateRef: {
      runId: capsule.runId,
      stateHandle: engineStateHandle(capsule),
      expectedRevision: capsule.revision,
    },
  };
}

function outsideRepository(path: string): string {
  const root = resolve('.');
  const output = resolve(path);
  const relation = relative(root, output);
  if (relation === '' || !relation.startsWith('..')) throw new TypeError('--report must resolve outside the repository.');
  return output;
}

export async function runAgentConformance(
  options: AgentConformanceOptions,
  dependencies: AgentConformanceDependencies = defaultDependencies(),
): Promise<AgentConformanceReport> {
  const kinds = options.cli === null ? AGENT_CLI_KINDS : [options.cli];
  dependencies.stdout('MCP_CONFORMANCE: SUBSTITUTED_LOCAL (official tooling unavailable without a network fetch)');
  dependencies.stdout('CLI | PRESENT | VERSION | STATUS | REASON | ERROR');
  const records: AgentConformanceRecord[] = [];
  for (const kind of kinds) {
    const row = await verifyCli(kind, dependencies.adapter(kind), dependencies.expectedMcpProof);
    records.push(row);
    const errorExcerpt = row.errorExcerpt?.replaceAll(/\s+/gu, ' ').trim() ?? '-';
    const tableLine = `${kind} | ${row.present ? 'yes' : 'no'} | ${row.version ?? '-'} | ${row.status} | ${row.reason ?? '-'} | ${errorExcerpt}`;
    dependencies.stdout(tableLine);
    if (row.status !== 'VERIFIED') dependencies.stderr(tableLine);
  }
  const code = reportExitCode(records);
  const aggregate: ConformanceStatus = code === 0 ? 'VERIFIED' : code === 1 ? 'FAILED' : 'UNVERIFIED';
  const report: AgentConformanceReport = { schemaVersion: 1, title: 'LIVE AGENT CLI CONFORMANCE — NOT SIMULATED', generatedAt: dependencies.now(), protocolConformance: { status: 'SUBSTITUTED_LOCAL', reason: 'official_conformance_and_inspector_not_installed_network_fetch_forbidden' }, records, aggregate, exitCode: code };
  if (options.reportPath !== null) await dependencies.writeReport(outsideRepository(options.reportPath), report);
  dependencies.stdout(`AGENT_CONFORMANCE_SUMMARY ${report.aggregate} exit=${String(report.exitCode)}`);
  dependencies.stdout(`REPORT_JSON ${JSON.stringify(report)}`);
  return report;
}
export function parseAgentConformanceArguments(argv: readonly string[]): AgentConformanceOptions {
  let cli: AgentCliKind | null = null;
  let reportPath: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === '--') continue;
    if (argument === '--cli') {
      if (!isAgentCliKind(value)) throw new TypeError('--cli requires codex, opencode, pi, or claude-code.');
      cli = value;
      index += 1;
    } else if (argument === '--report') {
      if (value === undefined || value.length === 0) throw new TypeError('--report requires a path outside the repository.');
      reportPath = value;
      index += 1;
    } else {
      throw new TypeError(`Unknown agent conformance argument: ${String(argument)}`);
    }
  }
  return { cli, reportPath };
}

async function main(): Promise<void> {
  process.stdout.write('AGENT_CONFORMANCE_START\n');
  const scriptIndex = process.argv.findIndex((argument) => argument.endsWith('/agent-conformance.ts') || argument.endsWith('\\agent-conformance.ts'));
  const argumentsValue = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  const report = await runAgentConformance(parseAgentConformanceArguments(argumentsValue));
  process.exitCode = report.exitCode;
}

if (process.env['VITEST'] !== 'true') await main();
