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

export const UNVERIFIED_CONTRACT_CODEX = 'UNVERIFIED_CONTRACT:codex-live-mcp-and-resume' as const;

export interface CodexDecodedTurn {
  readonly sessionId: string;
  readonly finalText: string;
  readonly usage: AgentUsage | null;
}

export class CodexAgentSessionAdapter extends ProcessAgentSessionAdapter {
  readonly kind = 'codex' as const;
  protected readonly defaultBinary = 'codex';

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
    return this.spec(codexArgv({
      cwd: this.options.cwd ?? process.cwd(),
      model: invocation.model,
      reasoningEffort: invocation.reasoningEffort,
      engineCommand: this.engineCommand(),
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
    const decoded = decodeCodexTurn(output.stdout, sessionId, (event) => this.observe(event));
    return {
      sessionId: agentSessionIdFromCli(decoded.sessionId),
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: output.cancelled ? 'cancelled' : 'completed',
    };
  }
}

export interface CodexArgvInput {
  readonly cwd: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly engineCommand: string | null;
  readonly engineArgs: readonly string[];
  readonly sessionId: string | null;
}

export function codexArgv(input: CodexArgvInput): readonly string[] {
  return [
    'exec',
    '-C', input.cwd,
    '--sandbox', 'read-only',
    '--json',
    '-m', input.model,
    '-c', `model_reasoning_effort=${JSON.stringify(input.reasoningEffort)}`,
    ...(input.engineCommand === null ? [] : [
      '-c', `mcp_servers.engine.command=${JSON.stringify(input.engineCommand)}`,
      '-c', `mcp_servers.engine.args=${JSON.stringify(input.engineArgs)}`,
    ]),
    ...(input.sessionId === null ? [] : ['resume', input.sessionId]),
    '-',
  ];
}

export function decodeCodexTurn(
  stdout: string,
  priorSessionId: string | null,
  onEvent: (event: Readonly<Record<string, unknown>>) => void = () => undefined,
): CodexDecodedTurn {
  let sessionId = priorSessionId;
  let finalText = '';
  let usage: AgentUsage | null = null;
  for (const event of jsonEventLines(stdout)) {
    onEvent(event);
    if (event['type'] === 'thread.started' && typeof event['thread_id'] === 'string') {
      sessionId = event['thread_id'];
    }
    if (event['type'] === 'item.completed') {
      const item = record(event['item']);
      if (item?.['type'] === 'agent_message' && typeof item['text'] === 'string') {
        finalText = item['text'];
      }
    }
    if (event['type'] === 'turn.completed') {
      const candidate = record(event['usage']);
      if (candidate !== null) usage = decodeUsage(candidate);
    }
  }
  if (sessionId === null || sessionId.trim().length === 0) {
    throw new AgentAdapterError('malformed_output', 'Codex event stream did not contain thread.started.thread_id.');
  }
  if (priorSessionId !== null && sessionId !== priorSessionId) {
    throw new AgentAdapterError('malformed_output', 'Codex resume returned a different thread ID.');
  }
  return { sessionId, finalText, usage };
}

function decodeUsage(value: Readonly<Record<string, unknown>>): AgentUsage | null {
  const inputTokens = integer(value['input_tokens']);
  const cachedInputTokens = integer(value['cached_input_tokens']);
  const outputTokens = integer(value['output_tokens']);
  const reasoningTokens = integer(value['reasoning_tokens']);
  return inputTokens === null || cachedInputTokens === null || outputTokens === null || reasoningTokens === null
    ? null
    : { inputTokens, cachedInputTokens, outputTokens, reasoningTokens };
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
