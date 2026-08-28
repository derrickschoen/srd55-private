import { describe, expect, it } from 'vitest';
import { AgentAdapterError } from '../../../src/vtt/agent-adapters/process';
import { agentSessionIdFromCli } from '../../../src/vtt/agent-session';
import type { AgentCliKind, AgentFailureClassification, AgentInvocation, AgentSessionAdapter, AgentSessionBinding, AgentTurnResult, CliProbe } from '../../../src/vtt/agent-session';
import { parseAgentConformanceArguments, runAgentConformance } from '../../../tools/agent-conformance';
import type { AgentConformanceDependencies } from '../../../tools/agent-conformance';

type Mode = 'verified' | 'absent' | 'authentication' | 'failed';

class SIMULATEDCli implements AgentSessionAdapter {
  #resumes = 0;
  constructor(readonly kind: AgentCliKind, private readonly mode: Mode) {}
  probe(): Promise<CliProbe> { return Promise.resolve(this.mode === 'absent' ? { present: false, version: null } : { present: true, version: 'SIMULATED-1' }); }
  start(_invocation: AgentInvocation, _signal: AbortSignal): Promise<AgentTurnResult> {
    if (this.mode === 'authentication') return Promise.reject(new AgentAdapterError('credentials_absent', 'SIMULATED authentication'));
    if (this.mode === 'failed') return Promise.reject(new AgentAdapterError('malformed_output', 'SIMULATED malformed output'));
    return Promise.resolve({ sessionId: agentSessionIdFromCli(`${this.kind}-SIMULATED-session`), finalText: 'BOOT', usage: null, exit: 'completed' });
  }
  resume(binding: AgentSessionBinding, _invocation: AgentInvocation, _signal: AbortSignal): Promise<AgentTurnResult> {
    this.#resumes += 1;
    if (this.#resumes === 2) return Promise.reject(new AgentAdapterError('resume_not_found', 'SIMULATED missing'));
    return Promise.resolve({ sessionId: binding.sessionId, finalText: 'RESUME', usage: null, exit: 'completed' });
  }
  classifyFailure(error: unknown): AgentFailureClassification {
    if (!(error instanceof AgentAdapterError)) return 'unknown';
    if (error.code === 'credentials_absent') return 'authentication';
    return error.code === 'resume_not_found' ? 'resume_not_found' : 'unknown';
  }
}

const MODES: Readonly<Record<AgentCliKind, Mode>> = { codex: 'verified', opencode: 'verified', pi: 'verified', 'claude-code': 'verified' };

function dependenciesFor(modes: Readonly<Record<AgentCliKind, Mode>>) {
  const output: string[] = [];
  const errors: string[] = [];
  const dependencies: AgentConformanceDependencies = {
    adapter: (kind) => new SIMULATEDCli(kind, modes[kind]),
    now: () => '2026-08-27T20:00:00.000Z',
    stdout: (line) => { output.push(line); },
    stderr: (line) => { errors.push(line); },
    writeReport: () => Promise.resolve(),
  };
  return { dependencies, output, errors };
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
      'CLI | PRESENT | VERSION | STATUS | REASON',
    ]);
    expect(fake.errors).toEqual([]);
  });

  it('emits FAILED and exit 1 for an installed contract failure', async () => {
    const fake = dependenciesFor({ ...MODES, pi: 'failed' });
    const report = await runAgentConformance({ cli: null, reportPath: null }, fake.dependencies);
    expect(report).toMatchObject({ aggregate: 'FAILED', exitCode: 1 });
    expect(report.records[2]).toMatchObject({ cli: 'pi', status: 'FAILED', reason: 'unknown' });
    expect(fake.errors[0]).toContain('pi | yes | SIMULATED-1 | FAILED | unknown');
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
    expect(() => parseAgentConformanceArguments(['--cli', 'other'])).toThrow('--cli requires');
    expect(() => parseAgentConformanceArguments(['--unknown'])).toThrow('Unknown agent conformance argument');
  });
});
