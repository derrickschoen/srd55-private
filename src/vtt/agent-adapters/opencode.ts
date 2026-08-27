import { agentSessionIdFromCli } from '../agent-session';
import type { AgentInvocation, AgentSessionBinding, AgentTurnResult, AgentUsage } from '../agent-session';
import {
  AgentAdapterError,
  completedOutput,
  jsonEventLines,
  ProcessAgentSessionAdapter,
  record,
  type AgentAdapterOptions,
  type AgentProcessSpec,
} from './process';

// OpenCode was absent when §6 was frozen. Step 9 must replace this marker only
// after an installed supported version pins every flag and event below.
export const UNVERIFIED_CONTRACT_OPENCODE = 'UNVERIFIED_CONTRACT:opencode-cli-absent-at-design-time' as const;
export const OPENCODE_MCP_CONFIG_FLAG_UNVERIFIED = '--mcp-config' as const;

interface OpenCodeDecodedTurn {
  readonly sessionId: string;
  readonly finalText: string;
  readonly usage: AgentUsage | null;
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

  invocationSpec(invocation: AgentInvocation, sessionId: string | null): AgentProcessSpec {
    return this.spec(openCodeArgv({
      model: invocation.model,
      engineCommand: this.engineCommand() ?? 'engine-mcp',
      engineArgs: this.engineArgs(invocation.launcherToken),
      sessionId,
    }));
  }

  private async invoke(
    invocation: AgentInvocation,
    sessionId: string | null,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    const output = await this.runner().run(
      this.invocationSpec(invocation, sessionId),
      invocation.prompt,
      signal,
      invocation.timeoutMs,
    );
    completedOutput(output, sessionId !== null);
    if (output.cancelled && sessionId !== null) {
      return { sessionId: agentSessionIdFromCli(sessionId), finalText: '', usage: null, exit: 'cancelled' };
    }
    const decoded = decodeOpenCodeTurn(output.stdout, sessionId, (event) => this.observe(event));
    return {
      sessionId: agentSessionIdFromCli(decoded.sessionId),
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: output.cancelled ? 'cancelled' : 'completed',
    };
  }
}

interface OpenCodeArgvInput {
  readonly model: string;
  readonly engineCommand: string;
  readonly engineArgs: readonly string[];
  readonly sessionId: string | null;
}

export function openCodeArgv(input: OpenCodeArgvInput): readonly string[] {
  const mcpConfig = JSON.stringify({
    mcp: { engine: { type: 'local', command: [input.engineCommand, ...input.engineArgs], enabled: true } },
  });
  return [
    'run',
    '--format', 'json',
    '--model', input.model,
    OPENCODE_MCP_CONFIG_FLAG_UNVERIFIED, mcpConfig,
    ...(input.sessionId === null ? [] : ['--session', input.sessionId]),
  ];
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
    if (event['type'] === 'session.started' && typeof event['session_id'] === 'string') {
      sessionId = event['session_id'];
    }
    if (event['type'] === 'message.completed') {
      const message = record(event['message']);
      if (message?.['role'] === 'assistant' && typeof message['text'] === 'string') finalText = message['text'];
    }
    if (event['type'] === 'turn.completed') {
      const candidate = record(event['usage']);
      if (candidate !== null) usage = decodeUsage(candidate);
    }
  }
  if (sessionId === null || sessionId.trim().length === 0) {
    throw new AgentAdapterError('malformed_output', 'OpenCode JSON events did not contain session.started.session_id.');
  }
  if (priorSessionId !== null && sessionId !== priorSessionId) {
    throw new AgentAdapterError('malformed_output', 'OpenCode resume returned a different session ID.');
  }
  return { sessionId, finalText, usage };
}

function decodeUsage(value: Readonly<Record<string, unknown>>): AgentUsage | null {
  const inputTokens = integer(value['input_tokens']);
  const outputTokens = integer(value['output_tokens']);
  if (inputTokens === null || outputTokens === null) return null;
  return {
    inputTokens,
    cachedInputTokens: integer(value['cached_input_tokens']) ?? 0,
    outputTokens,
    reasoningTokens: integer(value['reasoning_tokens']) ?? 0,
  };
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
