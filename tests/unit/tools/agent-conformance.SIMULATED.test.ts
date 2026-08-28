import { describe, expect, it, vi } from 'vitest';
import { AgentAdapterError } from '../../../src/vtt/agent-adapters/process';
import { PI_MCP_SKIPPED_NO_EXTENSION } from '../../../src/vtt/agent-adapters/pi';
import { encounterSessionId } from '../../../src/combat/values';
import { agentSessionIdFromCli } from '../../../src/vtt/agent-session';
import type { AgentCliKind, AgentFailureClassification, AgentInvocation, AgentSessionAdapter, AgentSessionBinding, AgentTurnResult, CliProbe } from '../../../src/vtt/agent-session';
import { parseAgentConformanceArguments, runAgentConformance } from '../../../tools/agent-conformance';
import type { AgentConformanceDependencies } from '../../../tools/agent-conformance';

type Mode = 'verified' | 'absent' | 'authentication' | 'failed' | 'timeout' | 'skipped_mcp' |
  'resume_failure' | 'bad_mcp_proof';

const SIMULATED_DIGEST = '0123456789abcdef'.repeat(4);
const SIMULATED_PROOF = {
  digest: SIMULATED_DIGEST,
  stateRef: {
    runId: encounterSessionId('encounter:engine-mcp'),
    stateHandle: `engine-state:${SIMULATED_DIGEST}`,
    expectedRevision: 1,
  },
} as const;

class SIMULATEDCli implements AgentSessionAdapter {
  #resumes = 0;
  constructor(
    readonly kind: AgentCliKind,
    private readonly mode: Mode,
    private readonly invocations: AgentInvocation[],
    private readonly bindings: AgentSessionBinding[],
  ) {}
  probe(): Promise<CliProbe> { return Promise.resolve(this.mode === 'absent' ? { present: false, version: null } : { present: true, version: 'SIMULATED-1' }); }
  start(_invocation: AgentInvocation, _signal: AbortSignal): Promise<AgentTurnResult> {
    this.invocations.push(_invocation);
    if (this.mode === 'authentication') return Promise.reject(new AgentAdapterError('credentials_absent', 'SIMULATED authentication'));
    if (this.mode === 'failed') {
      return Promise.reject(new AgentAdapterError(
        'malformed_output',
        `SIMULATED malformed output ${'M'.repeat(600)}`,
        { stderr: `discarded-prefix-${'S'.repeat(600)}` },
      ));
    }
    if (this.mode === 'timeout') {
      return Promise.reject(new AgentAdapterError('timeout', 'Agent CLI timed out after 300000 ms.'));
    }
    return Promise.resolve({
      sessionId: agentSessionIdFromCli(`${this.kind}-SIMULATED-session`),
      finalText: 'BOOT',
      usage: null,
      exit: 'completed',
      ...(this.mode === 'skipped_mcp' ? { contractEvidence: [PI_MCP_SKIPPED_NO_EXTENSION] } : {}),
    });
  }
  resume(binding: AgentSessionBinding, _invocation: AgentInvocation, _signal: AbortSignal): Promise<AgentTurnResult> {
    this.invocations.push(_invocation);
    this.bindings.push(binding);
    this.#resumes += 1;
    if (this.mode === 'resume_failure' && this.#resumes === 1) {
      return Promise.reject(new AgentAdapterError('malformed_output', 'SIMULATED resume failure'));
    }
    if (this.#resumes === 3) return Promise.reject(new AgentAdapterError('resume_not_found', 'SIMULATED missing'));
    const proof = _invocation.prompt.includes('state summary');
    return Promise.resolve({
      sessionId: binding.sessionId,
      finalText: proof && this.mode !== 'bad_mcp_proof'
        ? SIMULATED_DIGEST
        : proof ? 'Called engine.get_state_summary successfully.' : 'RESUME',
      usage: null,
      exit: 'completed',
    });
  }
  classifyFailure(error: unknown): AgentFailureClassification {
    if (!(error instanceof AgentAdapterError)) return 'unknown';
    if (error.code === 'credentials_absent') return 'authentication';
    if (error.code === 'timeout') return 'transport';
    return error.code === 'resume_not_found' ? 'resume_not_found' : 'unknown';
  }
}

const MODES: Readonly<Record<AgentCliKind, Mode>> = { codex: 'verified', opencode: 'verified', pi: 'verified', 'claude-code': 'verified' };

function dependenciesFor(modes: Readonly<Record<AgentCliKind, Mode>>) {
  const output: string[] = [];
  const errors: string[] = [];
  const invocations: AgentInvocation[] = [];
  const bindings: AgentSessionBinding[] = [];
  const dependencies: AgentConformanceDependencies = {
    adapter: (kind) => new SIMULATEDCli(kind, modes[kind], invocations, bindings),
    now: () => '2026-08-27T20:00:00.000Z',
    stdout: (line) => { output.push(line); },
    stderr: (line) => { errors.push(line); },
    expectedMcpProof: () => Promise.resolve(SIMULATED_PROOF),
    writeReport: () => Promise.resolve(),
  };
  return { dependencies, output, errors, invocations, bindings };
}

describe('SIMULATED four-CLI conformance harness — not live CLI verification', () => {
  it('emits VERIFIED rows and exit 0 for all lifecycle cases', async () => {
    const fake = dependenciesFor(MODES);
    const report = await runAgentConformance({ cli: null, reportPath: null }, fake.dependencies);
    expect(report).toMatchObject({ aggregate: 'VERIFIED', exitCode: 0 });
    expect(report.records.map((row) => row.status)).toEqual(['VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED']);
    expect(report.records[0]?.lifecycle).toEqual({
      coldStart: true,
      sessionIdCaptured: true,
      resume: true,
      mcpProof: true,
      classifiedResumeFailure: true,
    });
    expect(report.records[0]?.contractEvidence.marker).toContain('UNVERIFIED_CONTRACT');
    expect(fake.output.slice(0, 2)).toEqual([
      expect.stringContaining('SUBSTITUTED_LOCAL'),
      'CLI | PRESENT | VERSION | STATUS | REASON | ERROR',
    ]);
    expect(fake.invocations.every((value) => value.reasoningEffort === 'low')).toBe(true);
    expect(fake.invocations.every((value) => value.timeoutMs === 300_000)).toBe(true);
    expect(fake.errors).toEqual([]);
  });

  it('emits FAILED and exit 1 for an installed contract failure', async () => {
    const fake = dependenciesFor({ ...MODES, pi: 'failed' });
    const report = await runAgentConformance({ cli: null, reportPath: null }, fake.dependencies);
    expect(report).toMatchObject({ aggregate: 'FAILED', exitCode: 1 });
    expect(report.records[2]).toMatchObject({ cli: 'pi', status: 'FAILED', reason: 'unknown' });
    expect(report.records[2]?.errorExcerpt).toHaveLength(500);
    expect(report.records[2]?.errorExcerpt).toContain('SIMULATED malformed output');
    expect(report.records[2]?.stderrTail).toBe('S'.repeat(500));
    expect(fake.errors[0]).toContain('pi | yes | SIMULATED-1 | FAILED | unknown');
    expect(fake.errors[0]).toContain('SIMULATED malformed output');
  });

  it('classifies timeout distinctly as transport and preserves a timeout excerpt', async () => {
    const fake = dependenciesFor({ ...MODES, codex: 'timeout' });
    const report = await runAgentConformance({ cli: 'codex', reportPath: null }, fake.dependencies);
    expect(report.records[0]).toMatchObject({
      status: 'FAILED',
      reason: 'transport',
      errorExcerpt: 'Agent CLI timed out after 300000 ms.',
      stderrTail: '',
    });
  });

  it('keeps a Pi run UNVERIFIED when the adapter reports skipped MCP wiring', async () => {
    const fake = dependenciesFor({ ...MODES, pi: 'skipped_mcp' });
    const report = await runAgentConformance({ cli: 'pi', reportPath: null }, fake.dependencies);
    expect(report).toMatchObject({ aggregate: 'UNVERIFIED', exitCode: 2 });
    expect(report.records[0]).toMatchObject({
      status: 'UNVERIFIED',
      reason: 'mcp_wiring_skipped_no_extension',
      errorExcerpt: 'Pi MCP wiring was skipped because no extension path was configured.',
      contractEvidence: { turnMarkers: [PI_MCP_SKIPPED_NO_EXTENSION] },
    });
  });

  it('does not report VERIFIED when the MCP proof reply omits the independently derived digest', async () => {
    const fake = dependenciesFor({ ...MODES, opencode: 'bad_mcp_proof' });
    const report = await runAgentConformance({ cli: 'opencode', reportPath: null }, fake.dependencies);
    expect(report.records[0]).toMatchObject({
      status: 'FAILED',
      reason: 'upstream_mcp_tools_not_exposed_issue_33027',
      lifecycle: { coldStart: true, sessionIdCaptured: true, resume: true, mcpProof: false, classifiedResumeFailure: true },
      errorExcerpt: expect.stringContaining('anomalyco/opencode#33027'),
    });
    expect(fake.invocations[2]?.prompt).not.toContain('engine.get_state_summary');
  });

  it('judges MCP proof by the independently derived digest alone and gives Pi proxy-specific instructions', async () => {
    const openCode = dependenciesFor(MODES);
    const openCodeReport = await runAgentConformance({ cli: 'opencode', reportPath: null }, openCode.dependencies);
    expect(openCodeReport.records[0]?.lifecycle.mcpProof).toBe(true);
    expect(openCode.invocations[2]?.prompt).toContain('engine state summary tool');
    expect(openCode.invocations[2]?.prompt).not.toContain('engine.get_state_summary');
    expect(openCode.invocations[2]?.prompt).toContain('"run_id":"encounter:engine-mcp"');
    expect(openCode.invocations[2]?.prompt).toContain(`"state_handle":"engine-state:${SIMULATED_DIGEST}"`);
    expect(openCode.invocations[2]?.prompt).toContain('"expected_revision":1');

    const pi = dependenciesFor(MODES);
    const piReport = await runAgentConformance({ cli: 'pi', reportPath: null }, pi.dependencies);
    expect(piReport.records[0]?.lifecycle.mcpProof).toBe(true);
    expect(pi.invocations[2]?.prompt).toContain('engine_engine_get_state_summary');
    expect(pi.invocations[2]?.prompt).toContain('mcp({search:"engine"})');
  });

  it('keeps generic lifecycle_incomplete reporting for a non-OpenCode MCP proof failure', async () => {
    const fake = dependenciesFor({ ...MODES, pi: 'bad_mcp_proof' });
    const report = await runAgentConformance({ cli: 'pi', reportPath: null }, fake.dependencies);
    expect(report.records[0]).toMatchObject({
      status: 'FAILED',
      reason: 'lifecycle_incomplete',
      lifecycle: { mcpProof: false },
      errorExcerpt: 'One or more required lifecycle proofs did not complete.',
    });
  });

  it('uses a valid-format fixed UUID for the Claude missing-session proof only', async () => {
    const claude = dependenciesFor(MODES);
    await runAgentConformance({ cli: 'claude-code', reportPath: null }, claude.dependencies);
    expect(claude.bindings[2]?.sessionId).toBe('00000000-0000-4000-8000-000000000001');

    const codex = dependenciesFor(MODES);
    await runAgentConformance({ cli: 'codex', reportPath: null }, codex.dependencies);
    expect(codex.bindings[2]?.sessionId).toBe('missing-session-codex');
  });

  it('preserves accumulated lifecycle evidence when a mid-lifecycle case fails', async () => {
    const fake = dependenciesFor({ ...MODES, codex: 'resume_failure' });
    const report = await runAgentConformance({ cli: 'codex', reportPath: null }, fake.dependencies);
    expect(report.records[0]).toMatchObject({
      status: 'FAILED',
      lifecycle: { coldStart: true, sessionIdCaptured: true, resume: false, mcpProof: false, classifiedResumeFailure: false },
      errorExcerpt: 'SIMULATED resume failure',
    });
  });

  it('reads the optional conformance timeout override', async () => {
    vi.stubEnv('DND_AGENT_CONFORMANCE_TIMEOUT_MS', '456789');
    try {
      const fake = dependenciesFor(MODES);
      await runAgentConformance({ cli: 'codex', reportPath: null }, fake.dependencies);
      expect(fake.invocations.every((value) => value.timeoutMs === 456_789)).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('prefers per-CLI timeout overrides over the global timeout', async () => {
    vi.stubEnv('DND_AGENT_CONFORMANCE_TIMEOUT_MS', '456789');
    vi.stubEnv('DND_AGENT_CONFORMANCE_TIMEOUT_MS_CODEX', '310001');
    vi.stubEnv('DND_AGENT_CONFORMANCE_TIMEOUT_MS_OPENCODE', '310002');
    vi.stubEnv('DND_AGENT_CONFORMANCE_TIMEOUT_MS_PI', '310003');
    vi.stubEnv('DND_AGENT_CONFORMANCE_TIMEOUT_MS_CLAUDE_CODE', '310004');
    try {
      const expected = new Map<AgentCliKind, number>([
        ['codex', 310_001],
        ['opencode', 310_002],
        ['pi', 310_003],
        ['claude-code', 310_004],
      ]);
      for (const kind of ['codex', 'opencode', 'pi', 'claude-code'] as const) {
        const fake = dependenciesFor(MODES);
        await runAgentConformance({ cli: kind, reportPath: null }, fake.dependencies);
        expect(fake.invocations.every((value) => value.timeoutMs === expected.get(kind))).toBe(true);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each([['absent', 'cli_absent'], ['authentication', 'authentication']] as const)(
    'emits UNVERIFIED %s and exit 2', async (mode, reason) => {
      const fake = dependenciesFor({ ...MODES, opencode: mode });
      const report = await runAgentConformance({ cli: 'opencode', reportPath: null }, fake.dependencies);
      expect(report).toMatchObject({ aggregate: 'UNVERIFIED', exitCode: 2 });
      expect(report.records[0]).toMatchObject({ cli: 'opencode', status: 'UNVERIFIED', reason });
    },
  );

  it('parses filtering and report arguments', () => {
    expect(parseAgentConformanceArguments(['--cli', 'codex', '--report', '/tmp/live.json'])).toEqual({ cli: 'codex', reportPath: '/tmp/live.json' });
    expect(parseAgentConformanceArguments(['--', '--cli', 'codex'])).toEqual({ cli: 'codex', reportPath: null });
    expect(() => parseAgentConformanceArguments(['--cli', 'other'])).toThrow('--cli requires');
    expect(() => parseAgentConformanceArguments(['--unknown'])).toThrow('Unknown agent conformance argument');
  });
});
