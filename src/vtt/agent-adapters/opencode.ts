import { createHash } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { agentSessionIdFromCli, contextTokenCount, turnInputTotal } from '../agent-session';
import type { AgentInvocation, AgentSessionBinding, AgentTurnResult, AgentUsage } from '../agent-session';
import {
  AgentAdapterError,
  agentProcessEvidence,
  completedOutput,
  jsonEventLines,
  ProcessAgentSessionAdapter,
  record,
  type AgentAdapterOptions,
  type AgentProcessSpec,
} from './process';

// The argv and JSON event shapes are pinned to supervisor-captured OpenCode
// 1.18.23 evidence. Live MCP negotiation and lifecycle verification remain for
// the conformance harness, so this marker deliberately remains UNVERIFIED.
export const UNVERIFIED_CONTRACT_OPENCODE =
  'UNVERIFIED_CONTRACT:opencode-argv-and-events-evidence-based-live-mcp-pending' as const;

interface OpenCodeDecodedTurn {
  readonly sessionId: string;
  readonly finalText: string;
  readonly usage: AgentUsage | null;
}

interface OpenCodeConfig {
  readonly mcp: Readonly<{
    engine: Readonly<{
      type: 'local';
      command: readonly string[];
      enabled: true;
      timeout: 120_000;
    }>;
  }>;
  readonly provider?: Readonly<{
    ollama: Readonly<{
      npm: '@ai-sdk/openai-compatible';
      options: Readonly<{ baseURL: 'http://localhost:11434/v1' }>;
      models: Readonly<Record<string, Readonly<{ tool_call: true }>>>;
    }>;
  }>;
}

export class OpenCodeAgentSessionAdapter extends ProcessAgentSessionAdapter {
  readonly kind = 'opencode' as const;
  protected readonly defaultBinary = 'opencode';

  constructor(options: AgentAdapterOptions = {}) {
    super(options);
  }

  start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    return this.invoke(invocation, null, signal);
  }

  resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    return this.invoke(invocation, binding.sessionId, signal);
  }

  invocationSpec(invocation: AgentInvocation, sessionId: string | null, configPath: string): AgentProcessSpec {
    return {
      ...this.spec(openCodeArgv({ model: invocation.model, sessionId })),
      env: { OPENCODE_CONFIG: configPath },
    };
  }

  private async invoke(
    invocation: AgentInvocation,
    sessionId: string | null,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    const configPath = openCodeConfigPath(invocation.launcherToken);
    const config = openCodeConfig({
      model: invocation.model,
      engineCommand: this.engineCommand() ?? 'engine-mcp',
      engineArgs: this.engineArgs(invocation.launcherToken),
    });
    // OPENCODE_CONFIG replaces rather than merges the user's global config.
    // This isolated generated file must therefore contain every provider and
    // MCP setting needed by this run; the global file is never modified.
    await writeFile(configPath, `${JSON.stringify(config)}\n`, { encoding: 'utf8', mode: 0o600 });
    try {
      const output = await this.runner().run(
        this.invocationSpec(invocation, sessionId, configPath),
        invocation.prompt,
        signal,
        invocation.timeoutMs,
      );
      const processEvidence = agentProcessEvidence(output);
      completedOutput(output, sessionId !== null);
      if (output.timedOut) {
        return {
          resumeSessionId: sessionId === null ? null : agentSessionIdFromCli(sessionId), sessionId: null,
          finalText: output.stdout, usage: null, exit: 'timed_out', timeoutMs: invocation.timeoutMs ?? 1,
          processEvidence, engineCatalogEvidence: null,
          partialResultEvidence: { status: 'partial', decodedEventCount: 0, finalTextFragment: output.stdout, observedUsage: null, stagedInvocationIds: [] },
        };
      }
      if (output.cancelled) return {
        resumeSessionId: sessionId === null ? null : agentSessionIdFromCli(sessionId), sessionId: null,
        finalText: output.stdout, usage: null, exit: 'cancelled', cancellationReason: String(signal.reason ?? 'abort_signal'),
        processEvidence, engineCatalogEvidence: null,
        partialResultEvidence: { status: 'partial', decodedEventCount: 0, finalTextFragment: output.stdout, observedUsage: null, stagedInvocationIds: [] },
      };
      const decoded = decodeOpenCodeTurn(output.stdout, sessionId, (event) => this.observe(event));
      return {
        resumeSessionId: agentSessionIdFromCli(decoded.sessionId),
        sessionId: null,
        finalText: decoded.finalText,
        usage: decoded.usage,
        exit: 'completed', processEvidence, engineCatalogEvidence: null,
        partialResultEvidence: { status: 'complete', decodedEventCount: output.stdoutLines.length },
      };
    } finally {
      await rm(configPath, { force: true });
    }
  }
}

interface OpenCodeArgvInput {
  readonly model: string;
  readonly sessionId: string | null;
}

interface OpenCodeConfigInput {
  readonly model: string;
  readonly engineCommand: string;
  readonly engineArgs: readonly string[];
}

export function openCodeArgv(input: OpenCodeArgvInput): readonly string[] {
  return [
    'run',
    '--format', 'json',
    '--model', input.model,
    ...(input.sessionId === null ? [] : ['--session', input.sessionId]),
  ];
}

export function openCodeConfig(input: OpenCodeConfigInput): OpenCodeConfig {
  const modelId = input.model.startsWith('ollama/') ? input.model.slice('ollama/'.length) : null;
  return {
    mcp: {
      engine: {
        type: 'local',
        command: [input.engineCommand, ...input.engineArgs],
        enabled: true,
        timeout: 120_000,
      },
    },
    ...(modelId === null || modelId.length === 0 ? {} : {
      provider: {
        ollama: {
          npm: '@ai-sdk/openai-compatible',
          options: { baseURL: 'http://localhost:11434/v1' },
          models: { [modelId]: { tool_call: true } },
        },
      },
    }),
  };
}

function openCodeConfigPath(launcherToken: string): string {
  const digest = createHash('sha256').update(launcherToken).digest('hex').slice(0, 24);
  return join(tmpdir(), `dnd-wt-vtt-opencode-${digest}.json`);
}

export function decodeOpenCodeTurn(
  stdout: string,
  priorSessionId: string | null,
  onEvent: (event: Readonly<Record<string, unknown>>) => void = () => undefined,
): OpenCodeDecodedTurn {
  let sessionId = priorSessionId;
  let finalText = '';
  let usage: AgentUsage | null = null;
  for (const event of jsonEventLines(stdout)) {
    onEvent(event);
    if (typeof event['sessionID'] === 'string') sessionId = event['sessionID'];
    const part = record(event['part']);
    if (event['type'] === 'text' && part?.['type'] === 'text' && typeof part['text'] === 'string') {
      finalText = part['text'];
    }
    if (event['type'] === 'step_finish' && part?.['type'] === 'step-finish') {
      const candidate = record(part['tokens']);
      if (candidate !== null) usage = decodeUsage(candidate);
    }
  }
  if (sessionId === null || sessionId.trim().length === 0) {
    throw new AgentAdapterError('malformed_output', 'OpenCode JSON events did not contain top-level sessionID.');
  }
  if (priorSessionId !== null && sessionId !== priorSessionId) {
    throw new AgentAdapterError('malformed_output', 'OpenCode resume returned a different session ID.');
  }
  return { sessionId, finalText, usage };
}

function decodeUsage(value: Readonly<Record<string, unknown>>): AgentUsage | null {
  const totalTokens = integer(value['total']);
  const inputTokens = integer(value['input']);
  const outputTokens = integer(value['output']);
  const cache = record(value['cache']);
  const reasoningTokens = integer(value['reasoning']);
  const cacheReadTokens = integer(cache?.['read']);
  const cacheWriteTokens = integer(cache?.['write']);
  if (totalTokens === null || inputTokens === null || outputTokens === null || reasoningTokens === null ||
    cacheReadTokens === null || cacheWriteTokens === null) return null;
  return {
    turnInputTotal: turnInputTotal(inputTokens),
    contextInputTokens: contextTokenCount(inputTokens),
    modelContextWindow: null,
    cachedInputTokens: cacheReadTokens,
    outputTokens,
    reasoningTokens,
  };
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
