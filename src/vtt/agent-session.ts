import type { EncounterSessionId, AgentSessionId } from '../combat/values';

export type AgentCliKind = 'codex' | 'opencode' | 'pi' | 'claude-code';
export type AgentAdapterKind = AgentCliKind | 'local-openai';

export interface AgentToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

export interface AgentToolSession {
  readonly tools: readonly AgentToolDescriptor[];
  execute(name: string, argumentsValue: unknown): unknown;
}

export interface AgentSessionBinding {
  readonly cli: AgentAdapterKind;
  readonly sessionId: AgentSessionId;
  readonly adapterVersion: number;
  readonly recoveryGeneration: number;
  readonly predecessorSessionHash: string | null;
  readonly startedAtRevision: number;
  readonly lastDispatchedRevision: number;
  readonly status: 'active' | 'superseded_after_resume_failure';
}

export interface AgentInvocation {
  readonly runId: EncounterSessionId;
  readonly prompt: string;
  /** Session-level instructions supplied only when creating a new agent session. */
  readonly instructions?: string | null;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly sessionProfile?: 'arena';
  readonly launcherToken: string;
  /** Full-context launcher used only if resume recovery creates a fresh agent session. */
  readonly recoveryLauncherToken?: string;
  readonly timeoutMs: number | null;
  /** Direct in-process engine surface used by adapters that do not speak MCP. */
  readonly toolSession?: AgentToolSession;
}

export interface AgentUsage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
}

export interface AgentTurnResult {
  readonly sessionId: AgentSessionId;
  readonly finalText: string;
  readonly usage: AgentUsage | null;
  readonly exit: 'completed' | 'cancelled';
  readonly contractEvidence?: readonly string[];
}

export interface CliProbe {
  readonly present: boolean;
  readonly version: string | null;
}

export type AgentFailureClassification =
  | 'cli_absent'
  | 'resume_not_found'
  | 'resume_corrupt'
  | 'authentication'
  | 'transport'
  | 'agent_exit'
  | 'unknown';

export interface AgentSessionAdapter {
  readonly kind: AgentAdapterKind;
  probe(): Promise<CliProbe>;
  start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult>;
  resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult>;
  classifyFailure(error: unknown): AgentFailureClassification;
}

export function agentSessionIdFromCli(value: string): AgentSessionId {
  if (value.length === 0 || value.trim() !== value || value.length > 200) {
    throw new TypeError('Agent CLI session ID must be a non-empty, trimmed opaque string of at most 200 characters.');
  }
  return value as AgentSessionId;
}

export function isAgentCliKind(value: unknown): value is AgentCliKind {
  return value === 'codex' || value === 'opencode' || value === 'pi' || value === 'claude-code';
}

export function isAgentAdapterKind(value: unknown): value is AgentAdapterKind {
  return isAgentCliKind(value) || value === 'local-openai';
}

export function isAgentSessionBinding(value: unknown): value is AgentSessionBinding {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const binding = value as Readonly<Record<string, unknown>>;
  return Object.keys(binding).length === 8 &&
    isAgentAdapterKind(binding.cli) &&
    typeof binding.sessionId === 'string' && binding.sessionId.length > 0 && binding.sessionId.trim() === binding.sessionId && binding.sessionId.length <= 200 &&
    Number.isSafeInteger(binding.adapterVersion) && typeof binding.adapterVersion === 'number' && binding.adapterVersion >= 1 &&
    Number.isSafeInteger(binding.recoveryGeneration) && typeof binding.recoveryGeneration === 'number' && binding.recoveryGeneration >= 0 &&
    (binding.predecessorSessionHash === null || typeof binding.predecessorSessionHash === 'string') &&
    Number.isSafeInteger(binding.startedAtRevision) && typeof binding.startedAtRevision === 'number' && binding.startedAtRevision >= 1 &&
    Number.isSafeInteger(binding.lastDispatchedRevision) && typeof binding.lastDispatchedRevision === 'number' && binding.lastDispatchedRevision >= 0 &&
    (binding.status === 'active' || binding.status === 'superseded_after_resume_failure');
}
