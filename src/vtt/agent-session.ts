import type { EncounterSessionId, AgentSessionId } from '../combat/values';
import type { AgentSessionDigest } from './agent-session-digest';

declare const contextTokenCountBrand: unique symbol;
declare const turnInputTotalBrand: unique symbol;
declare const measuredContextRolloverThresholdBrand: unique symbol;

export type ContextTokenCount = number & { readonly [contextTokenCountBrand]: true };
export type TurnInputTotal = number & { readonly [turnInputTotalBrand]: true };
export type MeasuredContextRolloverThreshold = number & {
  readonly [measuredContextRolloverThresholdBrand]: true;
};

export type AgentCallPhase =
  | 'initial'
  | 'adjustment'
  | 'correction'
  | 'speculation'
  | 'speculation_recalculation';

export interface AgentCallUsage {
  readonly turnInputTotal: TurnInputTotal;
  readonly contextInputTokens: ContextTokenCount;
  readonly modelContextWindow: ContextTokenCount | null;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
  readonly callPhase: AgentCallPhase;
  readonly ordinal: number;
}

export type ContextRolloverPolicy =
  | { readonly kind: 'unmeasured' }
  | {
      readonly kind: 'measured';
      readonly threshold: MeasuredContextRolloverThreshold;
      readonly evidence: string;
    };

export type FreshSessionBootstrap =
  | { readonly kind: 'cold_start' }
  | {
      readonly kind: 'context_rollover';
      readonly knowledgeBaseBundleHash: string;
      readonly digest: AgentSessionDigest;
      readonly stateDelivery: 'full_engine_context';
    }
  | {
      readonly kind: 'resume_recovery';
      readonly knowledgeBaseBundleHash: string;
      readonly digest: AgentSessionDigest;
      readonly stateDelivery: 'full_engine_context';
      readonly predecessorSessionHash: string;
    }
  | {
      readonly kind: 'escalation';
      readonly knowledgeBaseBundleHash: string;
      readonly digest: AgentSessionDigest;
      readonly stateDelivery: 'full_engine_context';
    };

export interface FreshSessionContext {
  readonly knowledgeBaseBundleHash: string;
  readonly startupInstructions: string;
}

export const AGENT_SKILL_NAMES = ['engine-submission', 'dm-round'] as const;
export type AgentSkillName = (typeof AGENT_SKILL_NAMES)[number];

export type AgentInstructionSource =
  | { readonly instructionSource: 'none'; readonly skill: null }
  | { readonly instructionSource: 'kb'; readonly skill: null; readonly kbPath: string }
  | { readonly instructionSource: 'skill'; readonly skill: AgentSkillName; readonly kbPath: null };

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
  readonly generation: number;
  readonly rolloverTriggerCount: number;
  readonly measuredRolloverThreshold: MeasuredContextRolloverThreshold | null;
  readonly lastDigestHash: string | null;
  readonly predecessorSessionHash: string | null;
  readonly startedAtRevision: number;
  readonly lastDispatchedRevision: number;
  readonly callUsage: readonly AgentCallUsage[];
  readonly currentContextTokens: ContextTokenCount | null;
  readonly status: 'active' | 'superseded_after_resume_failure' | 'superseded_after_context_rollover';
}

export type AgentInvocation = AgentInstructionSource & {
  readonly runId: EncounterSessionId;
  readonly prompt: string;
  /** Session-level instructions supplied only when creating a new agent session. */
  readonly instructions?: string | null;
  /** Typed provenance for every genuinely fresh session. */
  readonly bootstrap?: FreshSessionBootstrap;
  /** Root+tactics bytes and relocation-stable bundle hash needed by fresh successors. */
  readonly freshSessionContext?: FreshSessionContext;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly sessionProfile?: 'arena' | 'test';
  readonly callPhase: AgentCallPhase;
  readonly launcherToken: string;
  /** Full-context launcher used only if resume recovery creates a fresh agent session. */
  readonly recoveryLauncherToken?: string;
  readonly timeoutMs: number | null;
  /** Direct in-process engine surface used by adapters that do not speak MCP. */
  readonly toolSession?: AgentToolSession;
};

export interface AgentUsage {
  readonly turnInputTotal: TurnInputTotal;
  readonly contextInputTokens: ContextTokenCount;
  readonly modelContextWindow: ContextTokenCount | null;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
}

export interface AgentTurnResult {
  /** Opaque adapter session used by the generic resume lifecycle. */
  readonly resumeSessionId: AgentSessionId;
  /** Codex rollout session ID; null for adapters without Codex rollout logs. */
  readonly sessionId: string | null;
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

export function contextTokenCount(value: number): ContextTokenCount {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Context token count must be a non-negative safe integer.');
  }
  return value as ContextTokenCount;
}

export function turnInputTotal(value: number): TurnInputTotal {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Turn input total must be a non-negative safe integer.');
  }
  return value as TurnInputTotal;
}

export function measuredContextRolloverThreshold(value: number): MeasuredContextRolloverThreshold {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('Context rollover threshold must be a positive safe integer.');
  }
  return value as MeasuredContextRolloverThreshold;
}

export function agentCallUsage(
  usage: AgentUsage,
  callPhase: AgentCallPhase,
  ordinal: number,
): AgentCallUsage {
  if (!Number.isSafeInteger(ordinal) || ordinal < 1) {
    throw new RangeError('Agent call usage ordinal must be a positive safe integer.');
  }
  return {
    turnInputTotal: usage.turnInputTotal,
    contextInputTokens: usage.contextInputTokens,
    modelContextWindow: usage.modelContextWindow,
    cachedInput: usage.cachedInputTokens,
    output: usage.outputTokens,
    reasoning: usage.reasoningTokens,
    callPhase,
    ordinal,
  };
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
  return Object.keys(binding).length === 13 &&
    isAgentAdapterKind(binding.cli) &&
    typeof binding.sessionId === 'string' && binding.sessionId.length > 0 && binding.sessionId.trim() === binding.sessionId && binding.sessionId.length <= 200 &&
    Number.isSafeInteger(binding.adapterVersion) && typeof binding.adapterVersion === 'number' && binding.adapterVersion >= 1 &&
    Number.isSafeInteger(binding.generation) && typeof binding.generation === 'number' && binding.generation >= 0 &&
    Number.isSafeInteger(binding.rolloverTriggerCount) && typeof binding.rolloverTriggerCount === 'number' && binding.rolloverTriggerCount >= 0 &&
    (binding.measuredRolloverThreshold === null || isMeasuredContextRolloverThreshold(binding.measuredRolloverThreshold)) &&
    (binding.lastDigestHash === null || isSha256(binding.lastDigestHash)) &&
    (binding.predecessorSessionHash === null || typeof binding.predecessorSessionHash === 'string') &&
    Number.isSafeInteger(binding.startedAtRevision) && typeof binding.startedAtRevision === 'number' && binding.startedAtRevision >= 1 &&
    Number.isSafeInteger(binding.lastDispatchedRevision) && typeof binding.lastDispatchedRevision === 'number' && binding.lastDispatchedRevision >= 0 &&
    Array.isArray(binding.callUsage) && binding.callUsage.every(isAgentCallUsage) &&
    (binding.currentContextTokens === null || isContextTokenCount(binding.currentContextTokens)) &&
    (binding.callUsage.length === 0
      ? binding.currentContextTokens === null
      : binding.currentContextTokens === binding.callUsage.at(-1)?.contextInputTokens) &&
    (binding.status === 'active' || binding.status === 'superseded_after_resume_failure' ||
      binding.status === 'superseded_after_context_rollover');
}

function isContextTokenCount(value: unknown): value is ContextTokenCount {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isMeasuredContextRolloverThreshold(value: unknown): value is MeasuredContextRolloverThreshold {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

export function isAgentCallUsage(value: unknown): value is AgentCallUsage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const usage = value as Readonly<Record<string, unknown>>;
  return Object.keys(usage).length === 8 &&
    isTurnInputTotal(usage.turnInputTotal) &&
    isContextTokenCount(usage.contextInputTokens) &&
    (usage.modelContextWindow === null || isContextTokenCount(usage.modelContextWindow)) &&
    typeof usage.cachedInput === 'number' && Number.isSafeInteger(usage.cachedInput) && usage.cachedInput >= 0 &&
    typeof usage.output === 'number' && Number.isSafeInteger(usage.output) && usage.output >= 0 &&
    typeof usage.reasoning === 'number' && Number.isSafeInteger(usage.reasoning) && usage.reasoning >= 0 &&
    (usage.callPhase === 'initial' || usage.callPhase === 'adjustment' || usage.callPhase === 'correction' ||
      usage.callPhase === 'speculation' || usage.callPhase === 'speculation_recalculation') &&
    typeof usage.ordinal === 'number' && Number.isSafeInteger(usage.ordinal) && usage.ordinal >= 1;
}

function isTurnInputTotal(value: unknown): value is TurnInputTotal {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
