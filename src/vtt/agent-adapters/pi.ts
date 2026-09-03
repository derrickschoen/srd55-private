import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { agentSessionIdFromCli, contextTokenCount } from '../agent-session';
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

// The argv and event shapes are pinned to supervisor-captured Pi evidence.
// Print-mode events do not expose a session ID, so this adapter deliberately
// uses its explicit --session file path as the opaque lifecycle session ID.
export const UNVERIFIED_CONTRACT_PI =
  'UNVERIFIED_CONTRACT:pi-argv-and-events-evidence-based-live-mcp-extension-pending' as const;
export const PI_MCP_CONFIG_FILENAME = '.mcp.json' as const;
export const PI_MCP_SKIPPED_NO_EXTENSION = 'SKIPPED_NO_EXTENSION' as const;
export const PI_SESSION_ID_FROM_FILE = 'SESSION_ID_FROM_EXPLICIT_SESSION_FILE_PATH' as const;

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
    return this.invoke(invocation, piSessionFilePath(), false, signal);
  }

  resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    if (!isAbsolute(binding.sessionId)) {
      return Promise.reject(new AgentAdapterError(
        'resume_not_found',
        'Pi resume session ID is not the absolute session-file path issued by this adapter.',
      ));
    }
    return this.invoke(invocation, binding.sessionId, true, signal);
  }

  invocationSpec(invocation: AgentInvocation, sessionId: string, mcpDirectory: string | null): AgentProcessSpec {
    const extensionPath = this.options.piMcpExtensionPath ?? null;
    const spec = this.spec(piArgv({
      model: invocation.model,
      extensionPath,
      mcpConfigPath: mcpDirectory === null ? null : join(mcpDirectory, PI_MCP_CONFIG_FILENAME),
      sessionId,
    }));
    return mcpDirectory === null ? spec : { ...spec, cwd: mcpDirectory };
  }

  private async invoke(
    invocation: AgentInvocation,
    sessionId: string,
    resuming: boolean,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    const mcpDirectory = this.options.piMcpExtensionPath === undefined ? null : piMcpDirectory(sessionId);
    if (mcpDirectory !== null) {
      // Pi persists the session cwd. This directory is intentionally stable for
      // the full session and is not removed between turns; the adapter contract
      // currently has no terminal session callback at which cleanup is safe.
      await mkdir(mcpDirectory, { recursive: true, mode: 0o700 });
      await writeFile(
        join(mcpDirectory, PI_MCP_CONFIG_FILENAME),
        `${JSON.stringify(piMcpConfig(
          this.engineCommand() ?? 'engine-mcp',
          this.engineArgs(invocation.launcherToken),
        ))}\n`,
        { encoding: 'utf8', mode: 0o600 },
      );
    }
    const output = await this.runner().run(
      this.invocationSpec(invocation, sessionId, mcpDirectory),
      invocation.prompt,
      signal,
      invocation.timeoutMs,
    );
    completedOutput(output, resuming);
    if (output.cancelled) {
      return {
        resumeSessionId: agentSessionIdFromCli(sessionId),
        sessionId: null,
        finalText: '',
        usage: null,
        exit: 'cancelled',
        contractEvidence: piContractEvidence(this.options.piMcpExtensionPath),
      };
    }
    const decoded = decodePiTurn(output.stdout, sessionId, (event) => this.observe(event));
    return {
      resumeSessionId: agentSessionIdFromCli(decoded.sessionId),
      sessionId: null,
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: 'completed',
      contractEvidence: piContractEvidence(this.options.piMcpExtensionPath),
    };
  }
}

export function piMcpConfig(command: string, args: readonly string[]): Readonly<Record<string, unknown>> {
  return { mcpServers: { engine: { command, args, lifecycle: 'eager' } } };
}

interface PiArgvInput {
  readonly model: string;
  readonly extensionPath: string | null;
  readonly mcpConfigPath: string | null;
  readonly sessionId: string;
}

export function piArgv(input: PiArgvInput): readonly string[] {
  return [
    '--print',
    '--mode', 'json',
    // Pi accepts provider/id directly as --model's value.
    '--model', input.model,
    ...(input.extensionPath === null ? [] : ['--extension', input.extensionPath]),
    // The explicit extension config path prevents a pre-existing
    // ~/.pi/agent/mcp.json engine definition from becoming a second layer.
    // Duplicate engine definitions are a known pi-mcp-adapter conflict.
    ...(input.mcpConfigPath === null ? [] : ['--mcp-config', input.mcpConfigPath]),
    '--session', input.sessionId,
  ];
}

function piSessionFilePath(): string {
  return join(tmpdir(), `dnd-wt-vtt-pi-session-${randomUUID()}.jsonl`);
}

function piMcpDirectory(sessionId: string): string {
  const digest = createHash('sha256').update(sessionId).digest('hex').slice(0, 24);
  return join(tmpdir(), `dnd-wt-vtt-pi-mcp-${digest}`);
}

function piContractEvidence(extensionPath: string | undefined): readonly string[] {
  return [
    PI_SESSION_ID_FROM_FILE,
    extensionPath === undefined ? PI_MCP_SKIPPED_NO_EXTENSION : 'MCP_EXTENSION_CONFIGURED',
  ];
}

export function decodePiTurn(
  stdout: string,
  sessionFilePath: string | null,
  onEvent: (event: Readonly<Record<string, unknown>>) => void = () => undefined,
): PiDecodedTurn {
  let finalText = '';
  let usage: AgentUsage | null = null;
  for (const event of jsonEventLines(stdout)) {
    onEvent(event);
    const emittedSessionId = sessionIdFromEvent(event);
    if (emittedSessionId !== null && sessionFilePath !== null && emittedSessionId !== sessionFilePath) {
      throw new AgentAdapterError('malformed_output', 'Pi returned a different session ID from its explicit session file path.');
    }
    for (const message of messagesFromEvent(event)) {
      if (message['role'] !== 'assistant') continue;
      const text = textFromContent(message['content']);
      if (text !== null) finalText = text;
      const candidate = record(message['usage']);
      if (candidate !== null) usage = decodeUsage(candidate);
    }
    const eventUsage = record(event['usage']);
    if (eventUsage !== null) usage = decodeUsage(eventUsage);
  }
  if (sessionFilePath === null || sessionFilePath.trim().length === 0) {
    throw new AgentAdapterError(
      'malformed_output',
      'Pi print-mode events omit session IDs; an explicit --session file path is required.',
    );
  }
  return { sessionId: sessionFilePath, finalText, usage };
}

function sessionIdFromEvent(event: Readonly<Record<string, unknown>>): string | null {
  for (const key of ['sessionID', 'sessionId', 'session_id'] as const) {
    const candidate = event[key];
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  return null;
}

function messagesFromEvent(event: Readonly<Record<string, unknown>>): readonly Readonly<Record<string, unknown>>[] {
  if (event['type'] === 'message_update' || event['type'] === 'message_end' || event['type'] === 'turn_end') {
    const message = record(event['message']);
    return message === null ? [] : [message];
  }
  if (event['type'] !== 'agent_end' || !Array.isArray(event['messages'])) return [];
  return event['messages'].flatMap((value) => {
    const message = record(value);
    return message === null ? [] : [message];
  });
}

function textFromContent(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return null;
  const texts = value.flatMap((part) => {
    const candidate = record(part);
    return candidate?.['type'] === 'text' && typeof candidate['text'] === 'string'
      ? [candidate['text']]
      : [];
  });
  return texts.length === 0 ? null : texts.join('');
}

function decodeUsage(value: Readonly<Record<string, unknown>>): AgentUsage | null {
  const inputTokens = integer(value['input']);
  const outputTokens = integer(value['output']);
  if (inputTokens === null || outputTokens === null || integer(value['totalTokens']) === null) return null;
  return {
    inputTokens: contextTokenCount(inputTokens),
    cachedInputTokens: integer(value['cacheRead']) ?? 0,
    outputTokens,
    reasoningTokens: 0,
  };
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
