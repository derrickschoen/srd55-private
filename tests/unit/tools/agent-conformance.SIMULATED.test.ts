import { describe, expect, it, vi } from 'vitest';
import { AgentAdapterError } from '../../../src/vtt/agent-adapters/process';
import { PI_MCP_SKIPPED_NO_EXTENSION } from '../../../src/vtt/agent-adapters/pi';
import { agentSessionIdFromCli } from '../../../src/vtt/agent-session';
import type { AgentCliKind, AgentFailureClassification, AgentInvocation, AgentSessionAdapter, AgentSessionBinding, AgentTurnResult, CliProbe } from '../../../src/vtt/agent-session';
import { parseAgentConformanceArguments, runAgentConformance } from '../../../tools/agent-conformance';
import type { AgentConformanceDependencies } from '../../../tools/agent-conformance';

type Mode = 'verified' | 'absent' | 'authentication' | 'failed' | 'timeout' | 'skipped_mcp';

class SIMULATEDCli implements AgentSessionAdapter {
  #resumes = 0;
  constructor(
    readonly kind: AgentCliKind,
    private readonly mode: Mode,
    private readonly invocations: AgentInvocation[],
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
    this.#resumes += 1;
    if (this.#resumes === 2) return Promise.reject(new AgentAdapterError('resume_not_found', 'SIMULATED missing'));
    return Promise.resolve({ sessionId: binding.sessionId, finalText: 'RESUME', usage: null, exit: 'completed' });
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
  const dependencies: AgentConformanceDependencies = {
    adapter: (kind) => new SIMULATEDCli(kind, modes[kind], invocations),
    now: () => '2026-08-27T20:00:00.000Z',
    stdout: (line) => { output.push(line); },
    stderr: (line) => { errors.push(line); },
    writeReport: () => Promise.resolve(),
  };
  return { dependencies, output, errors, invocations };
}

describe('SIMULATED four-CLI conformance harness — not live CLI verification', () => {
  it('emits VERIFIED rows and exit 0 for all lifecycle cases', async () => {
    const fake = dependenciesFor(MODES);
    const report = await runAgentConformance({ cli: null, reportPath: null }, fake.dependencies);
    expect(report).toMatchObject({ aggregate: 'VERIFIED', exitCode: 0 });
    expect(report.records.map((row) => row.status)).toEqual(['VERIFIED', 'VERIFIED', 'VERIFIED', 'VERIFIED']);
    expect(report.records[0]?.lifecycle).toEqual({ coldStart: true, sessionIdCaptured: true, resume: true, classifiedResumeFailure: true });
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
