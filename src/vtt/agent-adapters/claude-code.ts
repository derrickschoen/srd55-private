import { agentSessionIdFromCli, contextTokenCount, turnInputTotal } from '../agent-session';
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

export function claudeCodeEngineToolName(toolName: string): string {
  return `mcp__engine__${toolName.replaceAll('.', '_')}`;
}

export const CLAUDE_ENGINE_TOOLS = Object.freeze(ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName));
export const CLAUDE_DM_ENGINE_TOOLS = Object.freeze(DM_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName));

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
      engineTools: this.options.engineToolProfile === 'dm' ? CLAUDE_DM_ENGINE_TOOLS : CLAUDE_ENGINE_TOOLS,
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
      return {
        resumeSessionId: agentSessionIdFromCli(sessionId), sessionId: null,
        finalText: '', usage: null, exit: 'cancelled',
      };
    }
    const decoded = decodeClaudeCodeTurn(
      output.stdout,
      sessionId,
      (event) => this.observe(event),
      this.options.engineToolProfile === 'dm' ? CLAUDE_DM_ENGINE_TOOLS : CLAUDE_ENGINE_TOOLS,
      this.options.engineToolProfile === 'dm'
        ? [
            ROUND_PLAN_DM_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName),
            PLAN_ADJUSTMENT_DM_ENGINE_TOOL_NAMES.map(claudeCodeEngineToolName),
          ]
        : undefined,
    );
    return {
      resumeSessionId: agentSessionIdFromCli(decoded.sessionId),
      sessionId: null,
      finalText: decoded.finalText,
      usage: decoded.usage,
      exit: output.cancelled ? 'cancelled' : 'completed',
    };
  }
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
