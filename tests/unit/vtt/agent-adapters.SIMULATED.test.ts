import { readFileSync } from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import {
  agentSessionIdFromCli,
  type AgentCliKind,
  type AgentInvocation,
  type AgentSessionBinding,
} from '../../../src/vtt/agent-session';
import { resolveAgentAdapter } from '../../../src/vtt/agent-adapters';
import {
  CLAUDE_ENGINE_TOOLS,
  ClaudeCodeAgentSessionAdapter,
  claudeCodeEngineToolName,
  UNVERIFIED_CONTRACT_CLAUDE_CODE,
} from '../../../src/vtt/agent-adapters/claude-code';
import { CodexAgentSessionAdapter, UNVERIFIED_CONTRACT_CODEX } from '../../../src/vtt/agent-adapters/codex';
import {
  OpenCodeAgentSessionAdapter,
  openCodeConfig,
  UNVERIFIED_CONTRACT_OPENCODE,
} from '../../../src/vtt/agent-adapters/opencode';
import {
  PI_MCP_CONFIG_FILENAME,
  PI_MCP_SKIPPED_NO_EXTENSION,
  PI_SESSION_ID_FROM_FILE,
  PiAgentSessionAdapter,
  piMcpConfig,
  UNVERIFIED_CONTRACT_PI,
} from '../../../src/vtt/agent-adapters/pi';
import {
  AgentAdapterError,
  type AgentProcessOutput,
  type AgentProcessRunner,
  type AgentProcessSpec,
} from '../../../src/vtt/agent-adapters/process';

const cwd = '/workspace/dnd-wt-vtt';
const engineCommand = '/workspace/node';
const engineArgs = ['/workspace/engine-mcp.mjs'];
const invocation: AgentInvocation = {
  runId: encounterSessionId('encounter:SIMULATED-adapter'),
  prompt: 'SIMULATED prompt over stdin',
  model: 'model-SIMULATED',
  reasoningEffort: 'high',
  launcherToken: 'launcher-token-SIMULATED',
  timeoutMs: 12_345,
};

class SIMULATEDChildProcessRunner implements AgentProcessRunner {
  readonly calls: { readonly spec: AgentProcessSpec; readonly stdin: string; readonly timeoutMs: number | null }[] = [];

  constructor(
    private readonly outcomes: (AgentProcessOutput | Error)[],
    private readonly onRun: (spec: AgentProcessSpec) => void = () => undefined,
  ) {}

  run(
    spec: AgentProcessSpec,
    stdin: string,
    _signal: AbortSignal,
    timeoutMs: number | null,
  ): Promise<AgentProcessOutput> {
    this.calls.push({ spec, stdin, timeoutMs });
    this.onRun(spec);
    const outcome = this.outcomes.shift();
    if (outcome === undefined) return Promise.reject(new Error('SIMULATED child process had no queued outcome.'));
    return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
  }
}

function output(stdout: string, stderr = '', exitCode: number | null = 0, cancelled = false): AgentProcessOutput {
  return { stdout, stderr, exitCode, cancelled };
}

function fixture(name: string): string {
  return readFileSync(resolve(`tests/fixtures/agent-adapters/${name}.SIMULATED.jsonl`), 'utf8');
}

function binding(kind: AgentCliKind, id: string): AgentSessionBinding {
  return {
    cli: kind,
    sessionId: agentSessionIdFromCli(id),
    adapterVersion: 1,
    recoveryGeneration: 0,
    predecessorSessionHash: null,
    startedAtRevision: 1,
    lastDispatchedRevision: 1,
    status: 'active',
  };
}

function options(runner: AgentProcessRunner) {
  return { binary: 'SIMULATED-cli', cwd, engineCommand, engineArgs, processRunner: runner } as const;
}

describe('SIMULATED agent CLI adapters — not live CLI verification', () => {
  it('SIMULATED selects all four adapters exhaustively by AgentCliKind', () => {
    for (const kind of ['codex', 'opencode', 'pi', 'claude-code'] as const) {
      expect(resolveAgentAdapter(kind).kind).toBe(kind);
    }
  });

  it('SIMULATED Codex uses the measured JSON event stream and places shared flags before resume', async () => {
    const runner = new SIMULATEDChildProcessRunner([output(fixture('codex-start')), output(fixture('codex-start').replaceAll('codex-thread-123', 'codex-thread-123'))]);
    const adapter = new CodexAgentSessionAdapter(options(runner));

    const started = await adapter.start(invocation, new AbortController().signal);
    const resumed = await adapter.resume(binding('codex', 'codex-thread-123'), invocation, new AbortController().signal);

    expect(started).toEqual({
      sessionId: 'codex-thread-123',
      finalText: '{"intents":[]}',
      usage: { inputTokens: 101, cachedInputTokens: 55, outputTokens: 17, reasoningTokens: 9 },
      exit: 'completed',
    });
    expect(resumed.sessionId).toBe('codex-thread-123');
    expect(runner.calls.map((call) => call.stdin)).toEqual([invocation.prompt, invocation.prompt]);
    expect(runner.calls[0]?.spec).toMatchObject({
      binary: 'SIMULATED-cli', cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const expectedPrefix = [
      'exec', '-C', cwd, '--sandbox', 'read-only', '--json', '-m', invocation.model,
      '-c', 'model_reasoning_effort="high"',
      '-c', `mcp_servers.engine.command=${JSON.stringify(engineCommand)}`,
      '-c', `mcp_servers.engine.args=${JSON.stringify([...engineArgs, invocation.launcherToken])}`,
    ];
    expect(runner.calls[0]?.spec.argv).toEqual([...expectedPrefix, '-']);
    expect(runner.calls[1]?.spec.argv).toEqual([...expectedPrefix, 'resume', 'codex-thread-123', '-']);
    expect(runner.calls[1]?.spec.argv.indexOf('resume')).toBeGreaterThan(
      runner.calls[1]?.spec.argv.findIndex((value) => value.startsWith('mcp_servers.engine.args=')) ?? -1,
    );
    expect(UNVERIFIED_CONTRACT_CODEX).toContain('UNVERIFIED_CONTRACT');
  });

  it('SIMULATED Codex classifies a replacement thread on resume as resume_not_found', async () => {
    const runner = new SIMULATEDChildProcessRunner([
      output(fixture('codex-start')),
      output(fixture('codex-start').replaceAll('codex-thread-123', 'codex-replacement-thread')),
    ]);
    const adapter = new CodexAgentSessionAdapter(options(runner));
    await adapter.start(invocation, new AbortController().signal);
    let failure: unknown;
    try {
      await adapter.resume(binding('codex', 'codex-thread-123'), invocation, new AbortController().signal);
    } catch (error) {
      failure = error;
    }
    expect(adapter.classifyFailure(failure)).toBe('resume_not_found');
    expect(failure).toMatchObject({ code: 'resume_not_found' });
  });

  it('SIMULATED Claude Code accepts built-ins while requiring connected engine MCP tools and the resume seam', async () => {
    const transcript = fixture('claude-code-start');
    const runner = new SIMULATEDChildProcessRunner([output(transcript), output(transcript)]);
    const adapter = new ClaudeCodeAgentSessionAdapter(options(runner));

    const started = await adapter.start(invocation, new AbortController().signal);
    await adapter.resume(binding('claude-code', 'claude-session-123'), invocation, new AbortController().signal);

    expect(started.sessionId).toBe('claude-session-123');
    expect(started.finalText).toBe('{"intents":[]}');
    expect(transcript).toContain('"Bash"');
    expect(transcript).toContain('"mcp_servers":[{"name":"engine","status":"connected"}]');
    const startArgv = runner.calls[0]?.spec.argv ?? [];
    expect(startArgv.slice(0, 6)).toEqual(['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--tools']);
    expect(startArgv).toContain('--strict-mcp-config');
    expect(startArgv.slice(startArgv.indexOf('--tools') + 1, startArgv.indexOf('--setting-sources'))).toEqual(CLAUDE_ENGINE_TOOLS);
    expect(claudeCodeEngineToolName('engine.get_state_summary')).toBe('mcp__engine__engine_get_state_summary');
    expect(CLAUDE_ENGINE_TOOLS).toHaveLength(13);
    expect(CLAUDE_ENGINE_TOOLS.every((name) => !name.includes('.'))).toBe(true);
    expect(JSON.parse(startArgv[startArgv.indexOf('--mcp-config') + 1] ?? '')).toEqual({
      mcpServers: { engine: { type: 'stdio', command: engineCommand, args: [...engineArgs, invocation.launcherToken] } },
    });
    const resumeArgv = runner.calls[1]?.spec.argv ?? [];
    expect(resumeArgv.slice(resumeArgv.indexOf('--resume'), resumeArgv.indexOf('--resume') + 2)).toEqual([
      '--resume', 'claude-session-123',
    ]);
    expect(UNVERIFIED_CONTRACT_CLAUDE_CODE).toContain('UNVERIFIED_CONTRACT');
  });

  it('SIMULATED Claude Code rejects a failed engine MCP connection', async () => {
    const transcript = fixture('claude-code-start').replace('"status":"connected"', '"status":"failed"');
    const adapter = new ClaudeCodeAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([output(transcript)])));
    let failure: unknown;
    try { await adapter.start(invocation, new AbortController().signal); }
    catch (error) { failure = error; }
    expect(adapter.classifyFailure(failure)).toBe('unknown');
    expect(failure).toBeInstanceOf(AgentAdapterError);
  });

  it('SIMULATED OpenCode decodes the literal supervisor-captured 1.18.23 event stream', async () => {
    // Literal fixture origin: .tmp-cli-evidence.txt supervisor capture, lines 40-42.
    const transcript = fixture('opencode-1.18.23');
    const runner = new SIMULATEDChildProcessRunner([output(transcript), output(transcript)]);
    const adapter = new OpenCodeAgentSessionAdapter(options(runner));

    expect(await adapter.start(invocation, new AbortController().signal)).toEqual({
      sessionId: 'ses_fba44c8fcffewZFncFkCWbLLuB',
      finalText: 'OC_EVIDENCE',
      usage: { inputTokens: 2051, cachedInputTokens: 0, outputTokens: 68, reasoningTokens: 0 },
      exit: 'completed',
    });
    await adapter.resume(
      binding('opencode', 'ses_fba44c8fcffewZFncFkCWbLLuB'),
      invocation,
      new AbortController().signal,
    );

    expect(runner.calls[0]?.spec.argv).toEqual(['run', '--format', 'json', '--model', invocation.model]);
    expect(runner.calls[1]?.spec.argv).toEqual([
      'run', '--format', 'json', '--model', invocation.model,
      '--session', 'ses_fba44c8fcffewZFncFkCWbLLuB',
    ]);
    expect(runner.calls[0]?.spec.env?.['OPENCODE_CONFIG']).toMatch(/^\/tmp\/dnd-wt-vtt-opencode-[a-f0-9]{24}\.json$/u);
    expect(UNVERIFIED_CONTRACT_OPENCODE).toContain('argv-and-events-evidence-based');
  });

  it('SIMULATED OpenCode emits a self-contained provider block only for ollama/* models', () => {
    const base = { engineCommand, engineArgs: [...engineArgs, invocation.launcherToken] };
    expect(openCodeConfig({ ...base, model: 'openai/gpt-5.6-sol' })).toEqual({
      mcp: {
        engine: {
          type: 'local', command: [engineCommand, ...engineArgs, invocation.launcherToken], enabled: true, timeout: 120_000,
        },
      },
    });
    expect(openCodeConfig({ ...base, model: 'ollama/gemma4:e4b' })).toEqual({
      mcp: {
        engine: {
          type: 'local', command: [engineCommand, ...engineArgs, invocation.launcherToken], enabled: true, timeout: 120_000,
        },
      },
      provider: {
        ollama: {
          npm: '@ai-sdk/openai-compatible',
          options: { baseURL: 'http://localhost:11434/v1' },
          models: { 'gemma4:e4b': { tool_call: true } },
        },
      },
    });
  });

  it('SIMULATED Pi decodes the literal supervisor-captured print-mode event stream', async () => {
    // Literal fixture origin: .tmp-cli-evidence.txt supervisor capture, lines 50-51.
    const transcript = fixture('pi-print');
    const observedConfigs: unknown[] = [];
    const runner = new SIMULATEDChildProcessRunner(
      [output(transcript), output(transcript)],
      (spec) => {
        observedConfigs.push(JSON.parse(readFileSync(resolve(spec.cwd, PI_MCP_CONFIG_FILENAME), 'utf8')) as unknown);
      },
    );
    const adapter = new PiAgentSessionAdapter({ ...options(runner), piMcpExtensionPath: '/workspace/pi-engine-extension.mjs' });

    const started = await adapter.start(invocation, new AbortController().signal);
    expect(started).toMatchObject({
      finalText: 'PI_EVIDENCE',
      usage: { inputTokens: 2051, cachedInputTokens: 0, outputTokens: 34, reasoningTokens: 0 },
      exit: 'completed',
      contractEvidence: [PI_SESSION_ID_FROM_FILE, 'MCP_EXTENSION_CONFIGURED'],
    });
    expect(started.sessionId).toMatch(/^\/tmp\/dnd-wt-vtt-pi-session-[0-9a-f-]{36}\.jsonl$/u);
    await adapter.resume(binding('pi', started.sessionId), invocation, new AbortController().signal);

    expect(runner.calls[1]?.spec.argv).toEqual([
      '--print', '--mode', 'json', '--model', invocation.model,
      '--extension', '/workspace/pi-engine-extension.mjs', '--session', started.sessionId,
    ]);
    expect(runner.calls[1]?.spec.cwd).toMatch(/^\/tmp\/dnd-wt-vtt-pi-mcp-/u);
    expect(PI_MCP_CONFIG_FILENAME).toBe('.mcp.json');
    expect(piMcpConfig(engineCommand, [...engineArgs, invocation.launcherToken])).toEqual({
      mcpServers: { engine: { command: engineCommand, args: [...engineArgs, invocation.launcherToken] } },
    });
    expect(observedConfigs).toEqual([
      piMcpConfig(engineCommand, [...engineArgs, invocation.launcherToken]),
      piMcpConfig(engineCommand, [...engineArgs, invocation.launcherToken]),
    ]);
    expect(UNVERIFIED_CONTRACT_PI).toContain('argv-and-events-evidence-based');
  });

  it('SIMULATED Pi passes provider/id directly and loudly skips MCP when no extension is configured', async () => {
    const runner = new SIMULATEDChildProcessRunner([output(fixture('pi-print'))]);
    const adapter = new PiAgentSessionAdapter(options(runner));
    const ollamaInvocation = { ...invocation, model: 'ollama/gemma4:e4b' };

    const result = await adapter.start(ollamaInvocation, new AbortController().signal);

    expect(runner.calls[0]?.spec.argv).toEqual([
      '--print', '--mode', 'json', '--model', 'ollama/gemma4:e4b', '--session', result.sessionId,
    ]);
    expect(runner.calls[0]?.spec.argv).not.toContain('--extension');
    expect(runner.calls[0]?.spec.env).toBeUndefined();
    expect(result.contractEvidence).toEqual([PI_SESSION_ID_FROM_FILE, PI_MCP_SKIPPED_NO_EXTENSION]);
  });

  it.each([
    ['session does not exist', true, 'resume_not_found'],
    ['corrupt session store', true, 'resume_corrupt'],
    ['authentication required: credentials absent', false, 'authentication'],
    ['ordinary agent failure', false, 'agent_exit'],
  ] as const)('SIMULATED classifies stderr %s', async (stderr, resuming, expected) => {
    const runner = new SIMULATEDChildProcessRunner([output('', stderr, 1)]);
    const adapter = new CodexAgentSessionAdapter(options(runner));
    let failure: unknown;
    try {
      if (resuming) await adapter.resume(binding('codex', 'failed-session'), invocation, new AbortController().signal);
      else await adapter.start(invocation, new AbortController().signal);
    } catch (error) { failure = error; }
    expect(adapter.classifyFailure(failure)).toBe(expected);
  });

  it.each([
    ['cli_absent', 'cli_absent'],
    ['spawn_failed', 'transport'],
    ['timeout', 'transport'],
    ['malformed_output', 'unknown'],
  ] as const)('SIMULATED maps internal process code %s to neutral classification %s', async (code, expected) => {
    const runner = new SIMULATEDChildProcessRunner([new AgentAdapterError(code, 'SIMULATED failure')]);
    const adapter = new CodexAgentSessionAdapter(options(runner));
    let failure: unknown;
    try { await adapter.start(invocation, new AbortController().signal); }
    catch (error) { failure = error; }
    expect(adapter.classifyFailure(failure)).toBe(expected);
  });

  it('SIMULATED reports cancellation without converting it into an agent failure', async () => {
    const runner = new SIMULATEDChildProcessRunner([output(fixture('codex-start'), '', null, true)]);
    const adapter = new CodexAgentSessionAdapter(options(runner));
    expect((await adapter.start(invocation, new AbortController().signal).then((result) => result.exit))).toBe('cancelled');
    expect(runner.calls[0]?.timeoutMs).toBe(invocation.timeoutMs);
  });

  it('SIMULATED preserves the existing binding when a resume is cancelled before output', async () => {
    const runner = new SIMULATEDChildProcessRunner([output('', '', null, true)]);
    const adapter = new ClaudeCodeAgentSessionAdapter(options(runner));
    expect(await adapter.resume(
      binding('claude-code', 'claude-session-cancelled'),
      invocation,
      new AbortController().signal,
    )).toEqual({
      sessionId: 'claude-session-cancelled', finalText: '', usage: null, exit: 'cancelled',
    });
  });
});
