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

// Pi was absent when §6 was frozen. Step 9 must pin its installed extension
// API, structured events, and whether --session accepts an ID or path.
export const UNVERIFIED_CONTRACT_PI = 'UNVERIFIED_CONTRACT:pi-cli-absent-at-design-time' as const;
export const PI_MCP_CONFIG_ENV_UNVERIFIED = 'DND_ENGINE_MCP_CONFIG' as const;

interface PiDecodedTurn {
  readonly sessionId: string;
  readonly finalText: string;
  readonly usage: AgentUsage | null;
}

export class PiAgentSessionAdapter extends ProcessAgentSessionAdapter {
  readonly kind = 'pi' as const;
  protected readonly defaultBinary = 'pi';

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
    const argv = piArgv({
      model: invocation.model,
      extensionPath: this.options.piMcpExtensionPath ?? 'pi-engine-mcp-extension',
      sessionId,
    });
    return {
      ...this.spec(argv),
      env: {
        [PI_MCP_CONFIG_ENV_UNVERIFIED]: JSON.stringify({
          command: this.engineCommand() ?? 'engine-mcp',
          args: this.engineArgs(invocation.launcherToken),
        }),
      },
    };
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
    const decoded = decodePiTurn(output.stdout, sessionId, (event) => this.observe(event));
    return {
      sessionId: agentSessionIdFromCli(decoded.sessionId),
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: output.cancelled ? 'cancelled' : 'completed',
    };
  }
}

interface PiArgvInput {
  readonly model: string;
  readonly extensionPath: string;
  readonly sessionId: string | null;
}

export function piArgv(input: PiArgvInput): readonly string[] {
  return [
    '--print',
    '--mode', 'json',
    '--model', input.model,
    '--extension', input.extensionPath,
    ...(input.sessionId === null ? [] : ['--session', input.sessionId]),
  ];
}

export function decodePiTurn(
  stdout: string,
  priorSessionId: string | null,
  onEvent: (event: Readonly<Record<string, unknown>>) => void = () => undefined,
): PiDecodedTurn {
  let sessionId = priorSessionId;
  let finalText = '';
  let usage: AgentUsage | null = null;
  for (const event of jsonEventLines(stdout)) {
    onEvent(event);
    if (event['type'] === 'session' && typeof event['session_id'] === 'string') sessionId = event['session_id'];
    if (event['type'] === 'message_end') {
      const message = record(event['message']);
      if (message?.['role'] === 'assistant' && typeof message['content'] === 'string') finalText = message['content'];
      const candidate = record(event['usage']) ?? (message === null ? null : record(message['usage']));
      if (candidate !== null) usage = decodeUsage(candidate);
    }
  }
  if (sessionId === null || sessionId.trim().length === 0) {
    throw new AgentAdapterError('malformed_output', 'Pi JSON events did not contain session.session_id.');
  }
  if (priorSessionId !== null && sessionId !== priorSessionId) {
    throw new AgentAdapterError('malformed_output', 'Pi resume returned a different session ID.');
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
