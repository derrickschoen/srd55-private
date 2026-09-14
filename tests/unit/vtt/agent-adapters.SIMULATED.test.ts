import { mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
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
  CLAUDE_DM_ENGINE_TOOLS,
  CLAUDE_ENGINE_TOOLS,
  ClaudeCodeAgentSessionAdapter,
  claudeCodeEngineToolName,
  UNVERIFIED_CONTRACT_CLAUDE_CODE,
} from '../../../src/vtt/agent-adapters/claude-code';
import {
  CodexAgentSessionAdapter,
  CodexRolloutContextReader,
  codexArgv,
  UNVERIFIED_CONTRACT_CODEX,
} from '../../../src/vtt/agent-adapters/codex';
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
import { readdir } from '../../helpers/test-filesystem-promises';

const cwd = '/workspace/dnd-wt-vtt';
const engineCommand = '/workspace/node';
const engineArgs = ['/workspace/engine-mcp.mjs'];
const codexFixtureHome = resolve('tests/fixtures/codex-home-SIMULATED');
const codexFixtureClock = (): Date => new Date('2026-09-04T00:00:00.000Z');
const invocation: AgentInvocation = {
  instructionSource: 'none',
  skill: null,
  runId: encounterSessionId('encounter:SIMULATED-adapter'),
  prompt: 'SIMULATED prompt over stdin',
  instructions: 'SIMULATED session-level KB instructions',
  model: 'model-SIMULATED',
  reasoningEffort: 'high',
  callPhase: 'initial',
  output: { kind: 'tool_driven' },
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
  const startedAtUnixMs = 1_000;
  return {
    stdout, stderr, exitCode, signal: null, cancelled, timedOut: false,
    startedAtUnixMs, endedAtUnixMs: 1_001,
    stdoutLines: stdout.split('\n').filter((line) => line.length > 0)
      .map((line, index) => ({ line, observedAtUnixMs: startedAtUnixMs + index })),
  };
}

function fixture(name: string): string {
  return readFileSync(resolve(`tests/fixtures/agent-adapters/${name}.SIMULATED.jsonl`), 'utf8');
}

function expectedProcessEvidence(
  stdout: string,
  decodeJsonEvents: boolean,
): NonNullable<Awaited<ReturnType<CodexAgentSessionAdapter['start']>>['processEvidence']> {
  const lines = stdout.split('\n').filter((line) => line.length > 0);
  return {
    startedAtUnixMs: 1_000,
    endedAtUnixMs: 1_001,
    exitCode: 0,
    signal: null,
    stdout,
    stderr: '',
    decodedEvents: decodeJsonEvents ? lines.flatMap((line, index) => {
      let event: Readonly<Record<string, unknown>>;
      try { event = JSON.parse(line) as Readonly<Record<string, unknown>>; } catch { return []; }
      const item = typeof event['item'] === 'object' && event['item'] !== null && !Array.isArray(event['item'])
        ? event['item'] as Readonly<Record<string, unknown>> : null;
      return [{
        invocationId: typeof item?.['id'] === 'string' ? item['id'] : null,
        kind: typeof event['type'] === 'string' ? event['type'] : 'unknown',
        observedAtUnixMs: 1_000 + index,
      }];
    }) : [],
  };
}

function binding(kind: AgentCliKind, id: string): AgentSessionBinding {
  return {
    cli: kind,
    sessionId: agentSessionIdFromCli(id),
    adapterVersion: 1,
    generation: 0,
    rolloverTriggerCount: 0,
    measuredRolloverThreshold: null,
    lastDigestHash: null,
    predecessorSessionHash: null,
    startedAtRevision: 1,
    lastDispatchedRevision: 1,
    callUsage: [],
    currentContextTokens: null,
    status: 'active',
  };
}

function options(runner: AgentProcessRunner) {
  return {
    binary: 'SIMULATED-cli', cwd, engineCommand, engineArgs, processRunner: runner,
    codexHome: codexFixtureHome,
    rolloutClock: codexFixtureClock,
  } as const;
}

describe('SIMULATED agent CLI adapters — not live CLI verification', () => {
  it('SIMULATED selects all four adapters exhaustively by AgentCliKind', () => {
    for (const kind of ['codex', 'opencode', 'pi', 'claude-code'] as const) {
      expect(resolveAgentAdapter(kind).kind).toBe(kind);
    }
  });

  it('SIMULATED Codex uses the measured JSON event stream and places shared flags before resume', async () => {
    const transcript = fixture('codex-start');
    const runner = new SIMULATEDChildProcessRunner([output(transcript), output(transcript.replaceAll('codex-thread-123', 'codex-thread-123'))]);
    const adapter = new CodexAgentSessionAdapter(options(runner));

    const started = await adapter.start(invocation, new AbortController().signal);
    const resumed = await adapter.resume(binding('codex', 'codex-thread-123'), invocation, new AbortController().signal);

    expect(started).toEqual({
      resumeSessionId: 'codex-thread-123',
      sessionId: 'codex-thread-123',
      finalText: '{"proposals":[]}',
      usage: {
        turnInputTotal: 101,
        contextInputTokens: 71001,
        modelContextWindow: 258400,
        cachedInputTokens: 55,
        outputTokens: 17,
        reasoningTokens: 9,
      },
      exit: 'completed',
      processEvidence: expectedProcessEvidence(transcript, true),
      partialResultEvidence: { status: 'complete', decodedEventCount: 3 },
      engineCatalogEvidence: null,
    });
    expect(resumed.resumeSessionId).toBe('codex-thread-123');
    expect(resumed.sessionId).toBe('codex-thread-123');
    expect(runner.calls.map((call) => call.stdin)).toEqual([invocation.prompt, invocation.prompt]);
    expect(runner.calls[0]?.spec).toMatchObject({
      binary: 'SIMULATED-cli', cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'],
      env: { CODEX_HOME: resolve('tests/fixtures/codex-home-SIMULATED') },
    });
    const expectedPrefix = [
      'exec', '-C', cwd, '--sandbox', 'read-only', '--json', '-m', invocation.model,
      '-c', 'model_reasoning_effort="high"',
      '-c', `mcp_servers.engine.command=${JSON.stringify(engineCommand)}`,
      '-c', `mcp_servers.engine.args=${JSON.stringify([...engineArgs, invocation.launcherToken])}`,
      '-c', 'mcp_servers.engine.required=true',
      '-c', 'mcp_servers.engine.startup_timeout_sec=60',
      '-c', 'mcp_servers.engine.tool_timeout_sec=60',
    ];
    expect(runner.calls[0]?.spec.argv).toEqual([
      ...expectedPrefix,
      '-c', `developer_instructions=${JSON.stringify(invocation.instructions)}`,
      '-',
    ]);
    expect(runner.calls[1]?.spec.argv).toEqual([...expectedPrefix, 'resume', 'codex-thread-123', '-']);
    expect(runner.calls[1]?.spec.argv).not.toContain(
      `developer_instructions=${JSON.stringify(invocation.instructions)}`,
    );
    expect(runner.calls[1]?.spec.argv.indexOf('resume')).toBeGreaterThan(
      runner.calls[1]?.spec.argv.findIndex((value) => value.startsWith('mcp_servers.engine.args=')) ?? -1,
    );
    expect(UNVERIFIED_CONTRACT_CODEX).toContain('UNVERIFIED_CONTRACT');
  });

  it('SIMULATED Codex constrains indexed final output before resume and omits the engine MCP server', async () => {
    const runner = new SIMULATEDChildProcessRunner([output(fixture('codex-start')), output(fixture('codex-start'))]);
    const adapter = new CodexAgentSessionAdapter(options(runner));
    const finalInvocation: AgentInvocation = {
      ...invocation,
      output: {
        kind: 'structured_final',
        schemaPath: '/SIMULATED/final-indices-schema.json',
        decisionEncoding: 'indices',
        engineTools: 'disabled',
      },
    };

    await adapter.start(finalInvocation, new AbortController().signal);
    await adapter.resume(binding('codex', 'codex-thread-123'), finalInvocation, new AbortController().signal);

    const startArgv = runner.calls[0]?.spec.argv;
    const resumeArgv = runner.calls[1]?.spec.argv;
    expect(startArgv).toEqual(expect.arrayContaining([
      '--output-schema', '/SIMULATED/final-indices-schema.json',
    ]));
    expect(resumeArgv).toEqual(expect.arrayContaining([
      '--output-schema', '/SIMULATED/final-indices-schema.json',
      'resume', 'codex-thread-123',
    ]));
    expect(resumeArgv?.indexOf('--output-schema')).toBeLessThan(resumeArgv?.indexOf('resume') ?? -1);
    expect(startArgv?.some((value) => value.startsWith('mcp_servers.engine.'))).toBe(false);
    expect(resumeArgv?.some((value) => value.startsWith('mcp_servers.engine.'))).toBe(false);
  });

  it('SIMULATED Codex lists the rollout directory at most once per session binding (mutation: rescan per call)', async () => {
    let directoryListings = 0;
    const reader = new CodexRolloutContextReader(
      codexFixtureHome,
      async (directory) => {
        directoryListings += 1;
        return readdir(directory, { withFileTypes: true });
      },
      codexFixtureClock,
    );

    const first = await reader.read('codex-thread-123');
    const second = await reader.read('codex-thread-123');

    expect(first).toEqual({ contextInputTokens: 71001, modelContextWindow: 258400 });
    expect(second).toEqual(first);
    expect(directoryListings).toBe(4);
  });

  it('SIMULATED Codex finds a session rollout created yesterday when read today', async () => {
    const reader = new CodexRolloutContextReader(codexFixtureHome, undefined, codexFixtureClock);

    await expect(reader.read('codex-thread-123')).resolves.toEqual({
      contextInputTokens: 71001,
      modelContextWindow: 258400,
    });
  });

  it('SIMULATED Codex scans exactly today and three prior UTC days (mutation: wrong-day-only or unbounded scan)', async () => {
    const listedDirectories: string[] = [];
    const reader = new CodexRolloutContextReader(
      codexFixtureHome,
      async (directory) => {
        listedDirectories.push(directory);
        return readdir(directory, { withFileTypes: true });
      },
      codexFixtureClock,
    );

    await expect(reader.read('codex-thread-123')).resolves.toEqual({
      contextInputTokens: 71001,
      modelContextWindow: 258400,
    });
    expect(listedDirectories).toEqual([
      resolve(codexFixtureHome, 'sessions/2026/09/04'),
      resolve(codexFixtureHome, 'sessions/2026/09/03'),
      resolve(codexFixtureHome, 'sessions/2026/09/02'),
      resolve(codexFixtureHome, 'sessions/2026/09/01'),
    ]);
  });

  it('SIMULATED Codex extracts the UUID from captured stdout session id output', async () => {
    const transcript = fixture('codex-session-id-stdout');
    const adapter = new CodexAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([
      output(transcript),
    ])));

    expect(await adapter.start(invocation, new AbortController().signal)).toEqual({
      resumeSessionId: '019d1234-5678-7abc-8def-0123456789ab',
      sessionId: '019d1234-5678-7abc-8def-0123456789ab',
      finalText: 'CAPTURED_CODEX_STDOUT',
      usage: {
        turnInputTotal: 89,
        contextInputTokens: 67002,
        modelContextWindow: 258400,
        cachedInputTokens: 34,
        outputTokens: 13,
        reasoningTokens: 5,
      },
      exit: 'completed',
      processEvidence: expectedProcessEvidence(transcript, true),
      partialResultEvidence: { status: 'complete', decodedEventCount: 2 },
      engineCatalogEvidence: null,
    });
  });

  it('SIMULATED Codex returns required-engine startup failure with complete process evidence', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'd569-required-engine-'));
    const readinessSpoolPath = resolve(directory, 'readiness.jsonl');
    const launcherToken = resolve(directory, 'launcher.json');
    const dispatchId = 'engine-dispatch:required-startup-0001';
    writeFileSync(readinessSpoolPath, '', 'utf8');
    writeFileSync(launcherToken, JSON.stringify({
      dispatchId, readinessSpoolPath, toolProfile: 'blind', dispatchPhase: 'primary',
      requestId: 'request:required-startup',
    }), 'utf8');
    const transcript = [
      JSON.stringify({ type: 'thread.started', thread_id: 'codex-partial-thread' }),
      JSON.stringify({ type: 'item.completed', item: { id: 'staged-1', type: 'agent_message', text: 'partial' } }),
    ].join('\n');
    const stderr = 'Required MCP server engine failed to initialize: simulated startup failure';
    const adapter = new CodexAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([
      output(transcript, stderr, 1),
    ])));

    expect(await adapter.start({ ...invocation, launcherToken }, new AbortController().signal)).toEqual({
      exit: 'infrastructure_failed',
      resumeSessionId: 'codex-partial-thread',
      sessionId: 'codex-partial-thread',
      finalText: 'partial',
      usage: null,
      component: 'engine_mcp_startup',
      failureReason: stderr,
      processEvidence: {
        ...expectedProcessEvidence(transcript, true),
        exitCode: 1,
        stderr,
      },
      partialResultEvidence: {
        status: 'partial', decodedEventCount: 2, finalTextFragment: 'partial',
        observedUsage: null, stagedInvocationIds: ['staged-1'],
      },
      engineCatalogEvidence: {
        status: 'absent', basis: 'required_engine_initialization_failed', dispatchId,
        corroboration: [stderr],
      },
    });
  });

  it.each(['malformed', 'conflicting'] as const)(
    'SIMULATED Codex routes %s readiness plus startup text to integrity handling',
    async (kind) => {
      const directory = mkdtempSync(resolve(tmpdir(), `d569-readiness-${kind}-`));
      const readinessSpoolPath = resolve(directory, 'readiness.jsonl');
      const launcherToken = resolve(directory, 'launcher.json');
      const dispatchId = `engine-dispatch:${kind}-readiness-0001`;
      writeFileSync(launcherToken, JSON.stringify({
        dispatchId, readinessSpoolPath: 'readiness.jsonl', toolProfile: 'blind', dispatchPhase: 'primary',
        requestId: 'request:readiness-conflict',
      }), 'utf8');
      writeFileSync(readinessSpoolPath, kind === 'malformed' ? '{"version":\n' : `${JSON.stringify({
        version: 1, dispatchId, phase: 'primary', profile: 'blind',
        requestId: 'request:readiness-conflict', event: 'tools_list_stream_write_completed',
        generatedAtUnixMs: 10, writeCompletedAtUnixMs: 11, responseId: '1',
        responseSha256: 'a'.repeat(64), expectedToolNames: ['engine.get_turn_context'],
        returnedToolNames: ['engine.get_turn_context'], descriptorSha256: 'b'.repeat(64),
        validation: { status: 'valid' },
      })}\n`, 'utf8');
      const adapter = new CodexAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([
        output('', 'Required MCP server engine failed to initialize', 1),
      ])));
      const forensicTurn = await adapter.start({ ...invocation, launcherToken }, new AbortController().signal);
      expect(forensicTurn).toMatchObject({
        exit: 'infrastructure_failed',
        processEvidence: { exitCode: 1, stderr: 'Required MCP server engine failed to initialize' },
        partialResultEvidence: {
          status: 'partial', decodedEventCount: 0, finalTextFragment: '', stagedInvocationIds: [],
        },
        engineCatalogEvidence: { status: 'inconclusive', dispatchId },
      });
    },
  );

  it('SIMULATED Codex exposes each completed call usage independently (mutation: summing)', async () => {
    const usages = [
      { input_tokens: 101, cached_input_tokens: 31, output_tokens: 17, reasoning_output_tokens: 7 },
      { input_tokens: 203, cached_input_tokens: 41, output_tokens: 29, reasoning_output_tokens: 11 },
      { input_tokens: 307, cached_input_tokens: 43, output_tokens: 31, reasoning_output_tokens: 13 },
    ] as const;
    const runner = new SIMULATEDChildProcessRunner(usages.map((usage, index) => output([
      JSON.stringify({ type: 'thread.started', thread_id: `codex-independent-${String(index + 1)}` }),
      JSON.stringify({ type: 'turn.completed', usage }),
    ].join('\n'))));
    const adapter = new CodexAgentSessionAdapter(options(runner));

    const results = [];
    for (const _usage of usages) {
      results.push(await adapter.start(invocation, new AbortController().signal));
    }

    expect(results.map((result) => result.usage)).toEqual([
      { turnInputTotal: 101, contextInputTokens: 51003, modelContextWindow: 258400, cachedInputTokens: 31, outputTokens: 17, reasoningTokens: 7 },
      { turnInputTotal: 203, contextInputTokens: 52004, modelContextWindow: 258400, cachedInputTokens: 41, outputTokens: 29, reasoningTokens: 11 },
      { turnInputTotal: 307, contextInputTokens: 53005, modelContextWindow: 258400, cachedInputTokens: 43, outputTokens: 31, reasoningTokens: 13 },
    ]);
    expect(results.at(-1)?.usage?.turnInputTotal).toBe(307);
    expect(results.at(-1)?.usage?.turnInputTotal).not.toBe(611);
  });

  it('SIMULATED Codex disables project docs, the plugin surface, and skill instructions only for arena sessions', () => {
    const base = {
      cwd,
      model: invocation.model,
      reasoningEffort: invocation.reasoningEffort,
      engineCommand,
      engineArgs,
      sessionId: null,
    } as const;
    const ordinary = codexArgv(base);
    const arena = codexArgv({ ...base, arenaSession: true });
    const skillArena = codexArgv({ ...base, arenaSession: true, instructionSource: 'skill' });
    const arenaResume = codexArgv({ ...base, arenaSession: true, sessionId: 'codex-arena-thread' });

    expect(ordinary).not.toContain('project_doc_max_bytes=0');
    expect(ordinary).not.toContain('features.plugins=false');
    expect(ordinary).not.toContain('skills.include_instructions=false');
    expect(arena).toContain('project_doc_max_bytes=0');
    expect(arena).toContain('features.plugins=false');
    expect(arena).toContain('skills.include_instructions=false');
    expect(skillArena).toContain('features.plugins=false');
    expect(skillArena).toContain('skills.include_instructions=true');
    expect(skillArena).not.toContain('skills.include_instructions=false');
    expect(arena).toEqual([
      'exec', '-C', cwd, '--sandbox', 'read-only', '--json', '-m', invocation.model,
      '-c', `model_reasoning_effort=${JSON.stringify(invocation.reasoningEffort)}`,
      '-c', 'project_doc_max_bytes=0',
      '-c', 'features.plugins=false',
      '-c', 'skills.include_instructions=false',
      '-c', `mcp_servers.engine.command=${JSON.stringify(engineCommand)}`,
      '-c', `mcp_servers.engine.args=${JSON.stringify(engineArgs)}`,
      '-c', 'mcp_servers.engine.required=true',
      '-c', 'mcp_servers.engine.startup_timeout_sec=60',
      '-c', 'mcp_servers.engine.tool_timeout_sec=60',
      '-',
    ]);
    expect(arenaResume).toEqual(expect.arrayContaining([
      'project_doc_max_bytes=0',
      'features.plugins=false',
      'skills.include_instructions=false',
      'resume',
      'codex-arena-thread',
    ]));
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
    const transcript = fixture('claude-code-start').split('\n').filter((line) => line.length > 0).map((line) => {
      const event = JSON.parse(line) as Readonly<Record<string, unknown>>;
      if (event['type'] !== 'system' || event['subtype'] !== 'init') return line;
      const tools = event['tools'];
      if (!Array.isArray(tools)) throw new TypeError('SIMULATED Claude init tools are not an array.');
      return JSON.stringify({
        ...event,
        tools: [...tools.filter((name) => typeof name === 'string' && !name.startsWith('mcp__engine__')), ...CLAUDE_ENGINE_TOOLS],
      });
    }).join('\n');
    const runner = new SIMULATEDChildProcessRunner([output(transcript), output(transcript)]);
    const adapter = new ClaudeCodeAgentSessionAdapter(options(runner));

    const started = await adapter.start(invocation, new AbortController().signal);
    await adapter.resume(binding('claude-code', 'claude-session-123'), invocation, new AbortController().signal);

    expect(started.resumeSessionId).toBe('claude-session-123');
    expect(started.sessionId).toBeNull();
    expect(started.finalText).toBe('{"proposals":[]}');
    expect(transcript).toContain('"Bash"');
    expect(transcript).toContain('"mcp_servers":[{"name":"engine","status":"connected"}]');
    const startArgv = runner.calls[0]?.spec.argv ?? [];
    const mcpConfig = JSON.stringify({
      mcpServers: {
        engine: {
          type: 'stdio', command: engineCommand, args: [...engineArgs, invocation.launcherToken],
        },
      },
    });
    expect(startArgv).toEqual([
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--tools', ...CLAUDE_ENGINE_TOOLS,
      '--allowedTools', 'mcp__engine__*',
      '--setting-sources', '',
      '--strict-mcp-config',
      '--mcp-config', mcpConfig,
      '--permission-mode', 'default',
      '--model', invocation.model,
      '--append-system-prompt', invocation.instructions,
    ]);
    expect(startArgv.slice(0, 6)).toEqual(['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--tools']);
    expect(startArgv).toContain('--strict-mcp-config');
    expect(startArgv.slice(startArgv.indexOf('--tools') + 1, startArgv.indexOf('--allowedTools'))).toEqual(CLAUDE_ENGINE_TOOLS);
    expect(startArgv.slice(startArgv.indexOf('--allowedTools') + 1, startArgv.indexOf('--setting-sources'))).toEqual([
      'mcp__engine__*',
    ]);
    expect(startArgv).not.toContain(invocation.prompt);
    expect(runner.calls.map((call) => call.stdin)).toEqual([invocation.prompt, invocation.prompt]);
    expect(claudeCodeEngineToolName('engine.get_state_summary')).toBe('mcp__engine__engine_get_state_summary');
    expect(CLAUDE_ENGINE_TOOLS).toHaveLength(16);
    expect(CLAUDE_ENGINE_TOOLS.every((name) => !name.includes('.'))).toBe(true);
    expect(JSON.parse(startArgv[startArgv.indexOf('--mcp-config') + 1] ?? '')).toEqual({
      mcpServers: { engine: { type: 'stdio', command: engineCommand, args: [...engineArgs, invocation.launcherToken] } },
    });
    const resumeArgv = runner.calls[1]?.spec.argv ?? [];
    expect(resumeArgv).not.toContain('--append-system-prompt');
    expect(resumeArgv).not.toContain(invocation.instructions);
    expect(resumeArgv.slice(resumeArgv.indexOf('--resume'), resumeArgv.indexOf('--resume') + 2)).toEqual([
      '--resume', 'claude-session-123',
    ]);
    expect(UNVERIFIED_CONTRACT_CLAUDE_CODE).toContain('UNVERIFIED_CONTRACT');
  });

  it('SIMULATED Claude Code narrows both its allowlist and init contract for the DM profile', async () => {
    const transcript = fixture('claude-code-start').split('\n').filter((line) => line.length > 0).map((line) => {
      const event = JSON.parse(line) as Readonly<Record<string, unknown>>;
      if (event['type'] !== 'system' || event['subtype'] !== 'init') return line;
      const tools = event['tools'];
      if (!Array.isArray(tools)) throw new TypeError('SIMULATED Claude init tools are not an array.');
      return JSON.stringify({
        ...event,
        tools: [
          ...tools.filter((name) => typeof name === 'string' && !name.startsWith('mcp__engine__')),
          ...CLAUDE_DM_ENGINE_TOOLS.filter((name) => !name.endsWith('submit_plan_adjustment')),
        ],
      });
    }).join('\n');
    const runner = new SIMULATEDChildProcessRunner([output(transcript)]);
    const adapter = new ClaudeCodeAgentSessionAdapter({
      ...options(runner),
      engineToolProfile: 'dm',
    });

    await adapter.start(invocation, new AbortController().signal);

    const argv = runner.calls[0]?.spec.argv ?? [];
    expect(argv.slice(argv.indexOf('--tools') + 1, argv.indexOf('--allowedTools'))).toEqual(CLAUDE_DM_ENGINE_TOOLS);
    expect(CLAUDE_DM_ENGINE_TOOLS).toHaveLength(6);
  });

  it('SIMULATED Claude Code accepts the request-scoped adjustment DM inventory', async () => {
    const transcript = fixture('claude-code-start').split('\n').filter((line) => line.length > 0).map((line) => {
      const event = JSON.parse(line) as Readonly<Record<string, unknown>>;
      if (event['type'] !== 'system' || event['subtype'] !== 'init') return line;
      const tools = event['tools'];
      if (!Array.isArray(tools)) throw new TypeError('SIMULATED Claude init tools are not an array.');
      return JSON.stringify({
        ...event,
        tools: [
          ...tools.filter((name) => typeof name === 'string' && !name.startsWith('mcp__engine__')),
          ...CLAUDE_DM_ENGINE_TOOLS.filter((name) =>
            !name.endsWith('propose_from_play') && !name.endsWith('submit_round_proposals')),
        ],
      });
    }).join('\n');
    const runner = new SIMULATEDChildProcessRunner([output(transcript)]);
    const adapter = new ClaudeCodeAgentSessionAdapter({ ...options(runner), engineToolProfile: 'dm' });

    await expect(adapter.start(invocation, new AbortController().signal)).resolves.toMatchObject({ exit: 'completed' });
    expect(runner.calls[0]?.spec.argv).toEqual(expect.arrayContaining([
      'mcp__engine__engine_submit_round_proposals',
      'mcp__engine__engine_submit_plan_adjustment',
    ]));
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

  it('SIMULATED Claude Code classifies live missing-conversation messages as resume_not_found', async () => {
    const runner = new SIMULATEDChildProcessRunner([
      output('', "No conversation found; provided value does not match any session", 1),
    ]);
    const adapter = new ClaudeCodeAgentSessionAdapter(options(runner));
    let failure: unknown;
    try {
      await adapter.resume(
        binding('claude-code', '00000000-0000-4000-8000-000000000001'),
        invocation,
        new AbortController().signal,
      );
    } catch (error) { failure = error; }
    expect(adapter.classifyFailure(failure)).toBe('resume_not_found');
    expect(failure).toMatchObject({ code: 'resume_not_found' });
  });

  it('SIMULATED OpenCode decodes the literal supervisor-captured 1.18.23 event stream', async () => {
    // Literal fixture origin: .tmp-cli-evidence.txt supervisor capture, lines 40-42.
    const transcript = fixture('opencode-1.18.23');
    const runner = new SIMULATEDChildProcessRunner([output(transcript), output(transcript)]);
    const adapter = new OpenCodeAgentSessionAdapter(options(runner));

    expect(await adapter.start(invocation, new AbortController().signal)).toEqual({
      resumeSessionId: 'ses_fba44c8fcffewZFncFkCWbLLuB',
      sessionId: null,
      finalText: 'OC_EVIDENCE',
      usage: { turnInputTotal: 2051, contextInputTokens: 2051, modelContextWindow: null, cachedInputTokens: 0, outputTokens: 68, reasoningTokens: 0 },
      exit: 'completed',
      processEvidence: expectedProcessEvidence(transcript, true),
      partialResultEvidence: { status: 'complete', decodedEventCount: 3 },
      engineCatalogEvidence: null,
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
    const startAdapter = new PiAgentSessionAdapter({ ...options(runner), piMcpExtensionPath: '/workspace/pi-engine-extension.mjs' });

    const started = await startAdapter.start(invocation, new AbortController().signal);
    expect(started).toMatchObject({
      finalText: 'PI_EVIDENCE',
      usage: { turnInputTotal: 2051, contextInputTokens: 2051, modelContextWindow: null, cachedInputTokens: 0, outputTokens: 34, reasoningTokens: 0 },
      exit: 'completed',
      contractEvidence: [PI_SESSION_ID_FROM_FILE, 'MCP_EXTENSION_CONFIGURED'],
    });
    expect(started.sessionId).toBeNull();
    expect(started.resumeSessionId).toMatch(/^\/tmp\/dnd-wt-vtt-pi-session-[0-9a-f-]{36}\.jsonl$/u);
    if (started.exit !== 'completed') throw new Error('SIMULATED Pi start did not complete.');
    const resumeAdapter = new PiAgentSessionAdapter({ ...options(runner), piMcpExtensionPath: '/workspace/pi-engine-extension.mjs' });
    await resumeAdapter.resume(binding('pi', started.resumeSessionId), invocation, new AbortController().signal);

    expect(runner.calls[1]?.spec.argv).toEqual([
      '--print', '--mode', 'json', '--model', invocation.model,
      '--extension', '/workspace/pi-engine-extension.mjs',
      '--mcp-config', resolve(runner.calls[1]?.spec.cwd ?? '', PI_MCP_CONFIG_FILENAME),
      '--session', started.resumeSessionId,
    ]);
    expect(runner.calls[0]?.spec.cwd).toMatch(/^\/tmp\/dnd-wt-vtt-pi-mcp-[a-f0-9]{24}$/u);
    expect(runner.calls[0]?.spec.cwd.startsWith(`${tmpdir()}/`)).toBe(true);
    expect(runner.calls[1]?.spec.cwd).toBe(runner.calls[0]?.spec.cwd);
    expect(PI_MCP_CONFIG_FILENAME).toBe('.mcp.json');
    expect(piMcpConfig(engineCommand, [...engineArgs, invocation.launcherToken])).toEqual({
      mcpServers: {
        engine: {
          command: engineCommand, args: [...engineArgs, invocation.launcherToken], lifecycle: 'eager',
        },
      },
    });
    expect(observedConfigs).toEqual([
      piMcpConfig(engineCommand, [...engineArgs, invocation.launcherToken]),
      piMcpConfig(engineCommand, [...engineArgs, invocation.launcherToken]),
    ]);
    expect(UNVERIFIED_CONTRACT_PI).toContain('argv-and-events-evidence-based');
  });

  it('SIMULATED Pi classifies a missing stored session cwd as resume_corrupt', async () => {
    const runner = new SIMULATEDChildProcessRunner([
      output('', 'Stored session working directory does not exist: /tmp/dnd-wt-vtt-pi-mcp-gone', 1),
    ]);
    const adapter = new PiAgentSessionAdapter({ ...options(runner), piMcpExtensionPath: '/workspace/pi-engine-extension.mjs' });
    let failure: unknown;
    try {
      await adapter.resume(
        binding('pi', '/tmp/dnd-wt-vtt-pi-session-SIMULATED.jsonl'),
        invocation,
        new AbortController().signal,
      );
    } catch (error) { failure = error; }
    expect(adapter.classifyFailure(failure)).toBe('resume_corrupt');
    expect(failure).toMatchObject({ code: 'resume_corrupt' });
  });

  it('SIMULATED Pi passes provider/id directly and loudly skips MCP when no extension is configured', async () => {
    const runner = new SIMULATEDChildProcessRunner([output(fixture('pi-print'))]);
    const adapter = new PiAgentSessionAdapter(options(runner));
    const ollamaInvocation = { ...invocation, model: 'ollama/gemma4:e4b' };

    const result = await adapter.start(ollamaInvocation, new AbortController().signal);

    expect(runner.calls[0]?.spec.argv).toEqual([
      '--print', '--mode', 'json', '--model', 'ollama/gemma4:e4b', '--session', result.resumeSessionId,
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

  it('SIMULATED does not attribute another required MCP server failure to engine infrastructure', async () => {
    const runner = new SIMULATEDChildProcessRunner([
      output('', "required MCP server 'memory' failed to initialize", 1),
    ]);
    const adapter = new CodexAgentSessionAdapter(options(runner));
    let failure: unknown;
    try { await adapter.start(invocation, new AbortController().signal); }
    catch (error) { failure = error; }
    expect(failure).toMatchObject({ code: 'agent_exit' });
    expect(adapter.classifyFailure(failure)).toBe('agent_exit');
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

  it('SIMULATED preserves partial stdout, stderr, signal, and staged ids on timeout', async () => {
    const transcript = [
      JSON.stringify({ type: 'thread.started', thread_id: 'codex-timeout-thread' }),
      JSON.stringify({ type: 'item.completed', item: { id: 'staged-timeout-1', type: 'agent_message', text: 'partial timeout text' } }),
    ].join('\n');
    const timedOut = {
      ...output(transcript, 'timeout stderr', null),
      signal: 'SIGTERM',
      timedOut: true,
    } as const;
    const adapter = new CodexAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([timedOut])));
    const result = await adapter.start(invocation, new AbortController().signal);

    expect(result).toEqual({
      exit: 'timed_out', resumeSessionId: 'codex-timeout-thread', sessionId: 'codex-timeout-thread',
      finalText: 'partial timeout text', usage: null, timeoutMs: 12_345,
      processEvidence: {
        ...expectedProcessEvidence(transcript, true), exitCode: null, signal: 'SIGTERM', stderr: 'timeout stderr',
      },
      partialResultEvidence: {
        status: 'partial', decodedEventCount: 2, finalTextFragment: 'partial timeout text',
        observedUsage: null, stagedInvocationIds: ['staged-timeout-1'],
      },
      engineCatalogEvidence: null,
    });
  });

  it('SIMULATED preserves the existing binding when a resume is cancelled before output', async () => {
    const runner = new SIMULATEDChildProcessRunner([output('', '', null, true)]);
    const adapter = new ClaudeCodeAgentSessionAdapter(options(runner));
    expect(await adapter.resume(
      binding('claude-code', 'claude-session-cancelled'),
      invocation,
      new AbortController().signal,
    )).toEqual({
      resumeSessionId: 'claude-session-cancelled', sessionId: null,
      finalText: '', usage: null, exit: 'cancelled',
      processEvidence: {
        startedAtUnixMs: 1_000, endedAtUnixMs: 1_001, exitCode: null, signal: null,
        stdout: '', stderr: '', decodedEvents: [],
      },
      engineCatalogEvidence: null,
      cancellationReason: 'abort_signal',
      partialResultEvidence: {
        status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null,
        stagedInvocationIds: [],
      },
    });
  });

  it('SIMULATED Claude Code retains decoded partial session, text, usage, and live timestamps on timeout', async () => {
    const transcript = fixture('claude-code-start');
    const adapter = new ClaudeCodeAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([{
      ...output(transcript, 'timeout', null), timedOut: true, signal: 'SIGTERM',
    }])));
    const result = await adapter.start(invocation, new AbortController().signal);
    expect(result).toMatchObject({
      exit: 'timed_out', resumeSessionId: 'claude-session-123', finalText: '{"proposals":[]}',
      partialResultEvidence: { status: 'partial', decodedEventCount: 2, finalTextFragment: '{"proposals":[]}' },
    });
    expect(result.usage).not.toBeNull();
    expect(result.processEvidence?.decodedEvents).toHaveLength(2);
    expect(result.processEvidence?.decodedEvents.map((event) => event.observedAtUnixMs)).toEqual([1_000, 1_001]);
  });

  it('SIMULATED OpenCode retains decoded partial session, text, usage, invocation IDs, and timestamps on cancellation', async () => {
    const base = fixture('opencode-1.18.23');
    const transcript = `${base}\n${JSON.stringify({ type: 'tool', part: { id: 'oc-staged-1' } })}`;
    const adapter = new OpenCodeAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([{
      ...output(transcript, '', null, true), signal: 'SIGTERM',
    }])));
    const result = await adapter.start(invocation, new AbortController().signal);
    expect(result).toMatchObject({
      exit: 'cancelled', resumeSessionId: 'ses_fba44c8fcffewZFncFkCWbLLuB', finalText: 'OC_EVIDENCE',
      partialResultEvidence: {
        status: 'partial', decodedEventCount: 4, finalTextFragment: 'OC_EVIDENCE',
        stagedInvocationIds: [
          'oc-staged-1',
          'prt_045bb38520011ifKCyZczTrxgQ',
          'prt_045bb9da6001VI9q3qpFC0c3D6',
          'prt_045bbac97001RfgtLLiY0vGPyl',
        ],
      },
    });
    expect(result.usage).not.toBeNull();
    expect(result.processEvidence?.decodedEvents).toHaveLength(4);
  });

  it('SIMULATED Pi retains decoded partial text, usage, invocation IDs, and timestamps on timeout', async () => {
    const base = fixture('pi-print');
    const transcript = `${base}\n${JSON.stringify({ type: 'tool_call', tool_call_id: 'pi-staged-1' })}`;
    const adapter = new PiAgentSessionAdapter(options(new SIMULATEDChildProcessRunner([{
      ...output(transcript, '', null), timedOut: true, signal: 'SIGTERM',
    }])));
    const result = await adapter.start(invocation, new AbortController().signal);
    expect(result).toMatchObject({
      exit: 'timed_out', finalText: 'PI_EVIDENCE',
      partialResultEvidence: {
        status: 'partial', decodedEventCount: 3, finalTextFragment: 'PI_EVIDENCE',
        stagedInvocationIds: ['pi-staged-1'],
      },
    });
    expect(result.resumeSessionId).toMatch(/^\/tmp\/dnd-wt-vtt-pi-session-/u);
    expect(result.usage).not.toBeNull();
    expect(result.processEvidence?.decodedEvents).toHaveLength(3);
  });
});
