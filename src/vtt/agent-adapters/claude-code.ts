import { agentSessionIdFromCli, contextTokenCount, turnInputTotal } from '../agent-session';
import type { AgentInvocation, AgentSessionBinding, AgentTurnResult, AgentUsage } from '../agent-session';
import {
  AgentAdapterError,
  agentProcessEvidence,
  completedOutput,
  jsonEventLines,
  observedInvocationIds,
  processEventInvocationId,
  ProcessAgentSessionAdapter,
  record,
  tolerantObservedJsonEvents,
  type AgentAdapterOptions,
  type AgentProcessSpec,
} from './process';

// Step 9 must replace this marker only after the installed CLI proves the
// allowlist, MCP negotiation, session stability, and resumed proposal flow.
export const UNVERIFIED_CONTRACT_CLAUDE_CODE = 'UNVERIFIED_CONTRACT:claude-code-mcp-and-resume' as const;

const ENGINE_TOOL_NAMES = [
  'engine.get_turn_context',
  'engine.propose_from_play',
  'engine.get_state_summary',
  'engine.get_combatant_options',
  'engine.query_path',
  'engine.query_reach',
  'engine.query_cover',
  'engine.query_visibility',
  'engine.query_dice_expectation',
  'engine.validate_proposal',
  'engine.submit_round_proposals',
  'engine.submit_plan_adjustment',
  'engine.submit_speculative_round_plan',
  'engine.submit_proposal',
  'engine.emit_narration',
  'engine.request_dm_adjudication',
] as const;
const DM_ENGINE_TOOL_NAMES = [
  'engine.get_turn_context',
  'engine.propose_from_play',
  'engine.validate_proposal',
  'engine.submit_round_proposals',
  'engine.submit_plan_adjustment',
  'engine.request_dm_adjudication',
] as const;
const ROUND_PLAN_DM_ENGINE_TOOL_NAMES = DM_ENGINE_TOOL_NAMES.filter((name) =>
  name !== 'engine.submit_plan_adjustment');
const PLAN_ADJUSTMENT_DM_ENGINE_TOOL_NAMES = DM_ENGINE_TOOL_NAMES.filter((name) =>
  name !== 'engine.propose_from_play' && name !== 'engine.submit_round_proposals');
const BLIND_ENGINE_TOOL_NAMES = [
  'engine.get_turn_context',
  'engine.read_kb_subject',
  'engine.submit_blind_round_intents',
] as const;

export function claudeCodeEngineToolName(toolName: string): string {
  return `mcp__engine__${toolName.replaceAll('.', '_')}`;
}

export const CLAUDE_ENGINE_TOOLS = Object.freeze(ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName));
export const CLAUDE_DM_ENGINE_TOOLS = Object.freeze(DM_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName));
export const CLAUDE_BLIND_ENGINE_TOOLS = Object.freeze(BLIND_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName));

function configuredClaudeTools(profile: AgentAdapterOptions['engineToolProfile']): readonly string[] {
  return profile === 'blind'
    ? CLAUDE_BLIND_ENGINE_TOOLS
    : profile === 'dm' ? CLAUDE_DM_ENGINE_TOOLS : CLAUDE_ENGINE_TOOLS;
}

interface ClaudeDecodedTurn {
  readonly sessionId: string;
  readonly finalText: string;
  readonly usage: AgentUsage | null;
}

export class ClaudeCodeAgentSessionAdapter extends ProcessAgentSessionAdapter {
  readonly kind = 'claude-code' as const;
  protected readonly defaultBinary = 'claude';

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
    return this.spec(claudeCodeArgv({
      model: invocation.model,
      engineCommand: this.engineCommand() ?? 'engine-mcp',
      engineArgs: this.engineArgs(invocation.launcherToken),
      instructions: invocation.instructions ?? null,
      sessionId,
      engineTools: configuredClaudeTools(this.options.engineToolProfile),
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
    const observedEvents = tolerantObservedJsonEvents(output);
    const processEvidence = agentProcessEvidence(output, observedEvents.map((entry) => ({
      invocationId: processEventInvocationId(entry.event),
      kind: typeof entry.event['type'] === 'string' ? entry.event['type'] : 'unknown',
      observedAtUnixMs: entry.observedAtUnixMs,
    })));
    const partial = decodeClaudeCodeObserved(observedEvents.map((entry) => entry.event), sessionId);
    const partialResumeSessionId = partial.sessionId === null
      ? null
      : agentSessionIdFromCli(partial.sessionId);
    completedOutput(output, sessionId !== null);
    if (output.timedOut) {
      return {
        resumeSessionId: partialResumeSessionId, sessionId: null,
        finalText: partial.finalText, usage: partial.usage, exit: 'timed_out', timeoutMs: invocation.timeoutMs ?? 1,
        processEvidence, engineCatalogEvidence: null,
        partialResultEvidence: {
          status: 'partial', decodedEventCount: observedEvents.length,
          finalTextFragment: partial.finalText, observedUsage: partial.usage,
          stagedInvocationIds: observedInvocationIds(observedEvents),
        },
      };
    }
    if (output.cancelled) return {
      resumeSessionId: partialResumeSessionId, sessionId: null,
      finalText: partial.finalText, usage: partial.usage, exit: 'cancelled', cancellationReason: String(signal.reason ?? 'abort_signal'),
      processEvidence, engineCatalogEvidence: null,
      partialResultEvidence: {
        status: 'partial', decodedEventCount: observedEvents.length,
        finalTextFragment: partial.finalText, observedUsage: partial.usage,
        stagedInvocationIds: observedInvocationIds(observedEvents),
      },
    };
    const decoded = decodeClaudeCodeTurn(
      output.stdout,
      sessionId,
      (event) => this.observe(event),
      configuredClaudeTools(this.options.engineToolProfile),
      this.options.engineToolProfile === 'dm'
        ? [
            ROUND_PLAN_DM_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName),
            PLAN_ADJUSTMENT_DM_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName),
          ]
        : this.options.engineToolProfile === 'blind'
          ? [BLIND_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName)]
          : undefined,
    );
    return {
      resumeSessionId: agentSessionIdFromCli(decoded.sessionId),
      sessionId: null,
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: 'completed', processEvidence, engineCatalogEvidence: null,
      partialResultEvidence: { status: 'complete', decodedEventCount: output.stdoutLines.length },
    };
  }
}

function decodeClaudeCodeObserved(
  events: readonly Readonly<Record<string, unknown>>[],
  priorSessionId: string | null,
): { readonly sessionId: string | null; readonly finalText: string; readonly usage: AgentUsage | null } {
  let sessionId = priorSessionId;
  let finalText = '';
  let usage: AgentUsage | null = null;
  for (const event of events) {
    if (typeof event['session_id'] === 'string' && event['session_id'].length > 0) {
      sessionId = event['session_id'];
    }
    if (event['type'] === 'result' && typeof event['result'] === 'string') finalText = event['result'];
    const message = record(event['message']);
    const content = message?.['content'];
    if (Array.isArray(content)) {
      const fragments = content.flatMap((part) => {
        const candidate = record(part);
        return candidate?.['type'] === 'text' && typeof candidate['text'] === 'string'
          ? [candidate['text']] : [];
      });
      if (fragments.length > 0) finalText = fragments.join('');
    }
    const candidate = record(event['usage']);
    if (candidate !== null) usage = decodeUsage(candidate) ?? usage;
  }
  return { sessionId, finalText, usage };
}

interface ClaudeArgvInput {
  readonly model: string;
  readonly engineCommand: string;
  readonly engineArgs: readonly string[];
  readonly instructions?: string | null;
  readonly sessionId: string | null;
  readonly engineTools?: readonly string[];
}

export function claudeCodeArgv(input: ClaudeArgvInput): readonly string[] {
  const mcpConfig = JSON.stringify({
    mcpServers: {
      engine: { type: 'stdio', command: input.engineCommand, args: input.engineArgs },
    },
  });
  return [
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--tools', ...(input.engineTools ?? CLAUDE_ENGINE_TOOLS),
    '--allowedTools', 'mcp__engine__*',
    '--setting-sources', '',
    '--strict-mcp-config',
    '--mcp-config', mcpConfig,
    '--permission-mode', 'default',
    '--model', input.model,
    ...(input.sessionId === null && input.instructions !== null && input.instructions !== undefined
      ? ['--append-system-prompt', input.instructions]
      : []),
    ...(input.sessionId === null ? [] : ['--resume', input.sessionId]),
  ];
}

export function decodeClaudeCodeTurn(
  stdout: string,
  priorSessionId: string | null,
  onEvent: (event: Readonly<Record<string, unknown>>) => void = () => undefined,
  expectedEngineTools: readonly string[] = CLAUDE_ENGINE_TOOLS,
  acceptedRequestToolSets: readonly (readonly string[])[] = [expectedEngineTools],
): ClaudeDecodedTurn {
  let initSeen = false;
  let sessionId: string | null = null;
  let finalText = '';
  let usage: AgentUsage | null = null;
  for (const event of jsonEventLines(stdout)) {
    onEvent(event);
    if (event['type'] === 'system' && event['subtype'] === 'init') {
      assertClaudeInitTools(event['tools'], expectedEngineTools, acceptedRequestToolSets);
      assertClaudeEngineServerConnected(event['mcp_servers']);
      if (typeof event['session_id'] !== 'string' || event['session_id'].trim().length === 0) {
        throw new AgentAdapterError('malformed_output', 'Claude Code init event omitted session_id.');
      }
      initSeen = true;
      sessionId = event['session_id'];
    }
    if (event['type'] === 'result') {
      if (typeof event['result'] === 'string') finalText = event['result'];
      const candidate = record(event['usage']);
      if (candidate !== null) usage = decodeUsage(candidate);
    }
  }
  if (!initSeen || sessionId === null) {
    throw new AgentAdapterError('malformed_output', 'Claude Code stream did not contain a system/init event.');
  }
  if (priorSessionId !== null && sessionId !== priorSessionId) {
    throw new AgentAdapterError('malformed_output', 'Claude Code resume returned a different session ID.');
  }
  return { sessionId, finalText, usage };
}

function assertClaudeInitTools(
  value: unknown,
  allowedEngineTools: readonly string[],
  acceptedRequestToolSets: readonly (readonly string[])[],
): void {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new AgentAdapterError('malformed_output', 'Claude Code init tools were not a string array.');
  }
  const names = value as readonly string[];
  const engineNames = names.filter((name) => name.startsWith('mcp__engine__'));
  const exactAcceptedSet = acceptedRequestToolSets.some((accepted) =>
    accepted.length === engineNames.length && accepted.every((name) => engineNames.includes(name)));
  if (!exactAcceptedSet ||
    names.some((name) => name.startsWith('mcp__engine__') && !allowedEngineTools.includes(name)) ||
    names.some((name) => name.startsWith('mcp__') && !name.startsWith('mcp__engine__'))) {
    throw new AgentAdapterError('malformed_output', 'Claude Code init engine tools did not match the selected profile or admitted a foreign MCP tool.');
  }
}

function assertClaudeEngineServerConnected(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new AgentAdapterError('malformed_output', 'Claude Code init MCP server inventory was not an array.');
  }
  const servers = value.map((candidate) => record(candidate));
  if (servers.some((server) => server === null) ||
    !servers.some((server) => server?.['name'] === 'engine' && server['status'] === 'connected')) {
    throw new AgentAdapterError('malformed_output', 'Claude Code init did not report the engine MCP server connected.');
  }
}

function decodeUsage(value: Readonly<Record<string, unknown>>): AgentUsage | null {
  const inputTokens = integer(value['input_tokens']);
  const cachedInputTokens = integer(value['cache_read_input_tokens'] ?? value['cached_input_tokens']);
  const outputTokens = integer(value['output_tokens']);
  if (inputTokens === null || cachedInputTokens === null || outputTokens === null) return null;
  return {
    turnInputTotal: turnInputTotal(inputTokens),
    contextInputTokens: contextTokenCount(inputTokens),
    modelContextWindow: null,
    cachedInputTokens,
    outputTokens,
    reasoningTokens: integer(value['reasoning_tokens']) ?? 0,
  };
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
