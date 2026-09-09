import { sha256 } from '../crypto/sha256';
import type {
  AgentInvocation,
  AgentSessionAdapter,
  AgentSessionBinding,
  AgentTurnResult,
  ContextRolloverPolicy,
  ContextTokenCount,
  FreshSessionBootstrap,
  FreshSessionContext,
  MeasuredContextRolloverThreshold,
} from './agent-session';
import { agentCallUsage, measuredContextRolloverThreshold } from './agent-session';
import { verifyAgentSessionDigest } from './agent-session-digest';
import type { EncounterSessionJournal } from './session-persistence';

export type AgentDispatchBudget =
  | { readonly kind: 'open'; readonly timeoutMs: number; readonly invocation: AgentInvocation }
  | { readonly kind: 'exhausted' };

export interface AgentDispatchDeadline {
  readonly signal: AbortSignal;
  dispatch(invocation: AgentInvocation): AgentDispatchBudget;
  acceptsCompletion(): boolean;
}

export class AgentDispatchDeadlineExceededError extends Error {
  override readonly name = 'AgentDispatchDeadlineExceededError' as const;

  constructor() {
    super('The conversation round dispatch deadline is exhausted.');
  }
}

export function createConversationRoundDeadline(
  budgetMs: number,
  startedAtMs: number,
  now: () => number,
): AgentDispatchDeadline {
  if (!Number.isSafeInteger(budgetMs) || budgetMs < 1) {
    throw new RangeError('Conversation round budget must be a positive safe integer.');
  }
  if (!Number.isFinite(startedAtMs)) {
    throw new RangeError('Conversation round start must be finite.');
  }
  const expiresAtMs = startedAtMs + budgetMs;
  if (!Number.isFinite(expiresAtMs)) {
    throw new RangeError('Conversation round deadline must be finite.');
  }
  const controller = new AbortController();
  const initialRemainder = expiresAtMs - finiteNow(now);
  if (Math.floor(initialRemainder) < 1) controller.abort();
  else {
    const timer = setTimeout(() => controller.abort(), Math.ceil(initialRemainder));
    timer.unref();
  }
  return {
    signal: controller.signal,
    dispatch(invocation): AgentDispatchBudget {
      const remainderMs = Math.floor(expiresAtMs - finiteNow(now));
      if (remainderMs < 1 || controller.signal.aborted) {
        if (!controller.signal.aborted) controller.abort();
        return { kind: 'exhausted' };
      }
      const timeoutMs = Math.min(invocation.timeoutMs ?? remainderMs, remainderMs);
      return {
        kind: 'open',
        timeoutMs,
        invocation: timeoutMs === invocation.timeoutMs
          ? invocation
          : { ...invocation, timeoutMs },
      };
    },
    acceptsCompletion(): boolean {
      if (controller.signal.aborted) return false;
      if (expiresAtMs - finiteNow(now) < 1) {
        controller.abort();
        return false;
      }
      return true;
    },
  };
}

function finiteNow(now: () => number): number {
  const value = now();
  if (!Number.isFinite(value)) throw new RangeError('Conversation round clock must be finite.');
  return value;
}

function openDispatch(
  deadline: AgentDispatchDeadline,
  invocation: AgentInvocation,
): Extract<AgentDispatchBudget, { readonly kind: 'open' }> {
  const budget = deadline.dispatch(invocation);
  if (budget.kind === 'exhausted') throw new AgentDispatchDeadlineExceededError();
  return budget;
}

function requireAcceptedCompletion(deadline: AgentDispatchDeadline): void {
  if (!deadline.acceptsCompletion()) throw new AgentDispatchDeadlineExceededError();
}

export class AgentSessionLifecycle {
  constructor(
    private readonly journal: EncounterSessionJournal,
    private readonly adapter: AgentSessionAdapter,
    private readonly adapterVersion: number,
    private readonly rolloverPolicy: ContextRolloverPolicy = CONTEXT_ROLLOVER_POLICY,
  ) {
    if (!Number.isSafeInteger(adapterVersion) || adapterVersion < 1) {
      throw new RangeError('Agent adapter version must be a positive integer.');
    }
  }

  async coldStart(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentSessionBinding> {
    const result = await this.#coldStart(invocation, deadline);
    requireAcceptedCompletion(deadline);
    const binding = this.journal.startAgentSession({
      cli: this.adapter.kind,
      sessionId: result.resumeSessionId,
      adapterVersion: this.adapterVersion,
      measuredRolloverThreshold: measuredThreshold(this.rolloverPolicy),
    });
    this.#recordUsage(result, invocation);
    return this.journal.agentSession() ?? binding;
  }

  async coldStartRound(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
    const result = await this.#coldStart(invocation, deadline);
    requireAcceptedCompletion(deadline);
    this.journal.startAgentSession({
      cli: this.adapter.kind,
      sessionId: result.resumeSessionId,
      adapterVersion: this.adapterVersion,
      measuredRolloverThreshold: measuredThreshold(this.rolloverPolicy),
    });
    this.journal.recordAgentSessionDispatch();
    this.#recordUsage(result, invocation);
    return result;
  }

  async #coldStart(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
    if (invocation.runId !== this.journal.sessionId) {
      throw new Error('Agent invocation run does not match the authoritative journal.');
    }
    if (this.journal.agentSession() !== null) {
      throw new Error('Encounter run already has an agent session.');
    }
    if (invocation.sessionProfile !== 'arena' && invocation.sessionProfile !== 'test' &&
      this.rolloverPolicy.kind === 'unmeasured') {
      throw new UnmeasuredContextRolloverPolicyError();
    }
    const dispatch = openDispatch(deadline, {
      ...invocation,
      bootstrap: invocation.bootstrap ?? { kind: 'cold_start' },
    });
    const result = requireCompleted(
      await this.adapter.start(dispatch.invocation, deadline.signal),
      'Agent cold start',
    );
    requireAcceptedCompletion(deadline);
    return result;
  }

  resumeRound(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
    return this.#resume(invocation, deadline);
  }

  resumeRoomTransition(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
    return this.#resume(invocation, deadline);
  }

  resumeCorrection(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
    return this.#resume(invocation, deadline);
  }

  async #resume(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
    if (invocation.runId !== this.journal.sessionId) {
      throw new Error('Agent invocation run does not match the authoritative journal.');
    }
    if (this.journal.ended()) {
      throw new Error('Explicitly ended sitting cannot resume an agent session.');
    }
    const persisted = this.journal.agentSession();
    if (persisted === null || persisted.status !== 'active') {
      throw new Error('Cold start and persist the agent binding before dispatch.');
    }
    if (persisted.cli !== this.adapter.kind) {
      throw new Error('Changing agent CLI requires an explicit DM selection.');
    }
    if (persisted.currentContextTokens !== null && shouldRollOver(
      persisted.currentContextTokens,
      this.rolloverPolicy,
    )) {
      return this.#rollOver(persisted, invocation, deadline);
    }
    const dispatch = openDispatch(deadline, invocation);
    const dispatched = this.journal.recordAgentSessionDispatch();
    try {
      const result = requireResumedSameSession(
        await this.adapter.resume(dispatched, dispatch.invocation, deadline.signal),
        dispatched,
        'Agent resume',
      );
      requireAcceptedCompletion(deadline);
      this.#recordUsage(result, dispatch.invocation);
      return result;
    } catch (error) {
      const classification = this.adapter.classifyFailure(error);
      if (classification !== 'resume_not_found' && classification !== 'resume_corrupt') throw error;
      const predecessorSessionHash = sha256(dispatched.sessionId);
      const digest = this.journal.agentSessionDigest();
      verifyAgentSessionDigest(digest);
      const freshContext = requireFreshSessionContext(invocation, 'resume recovery');
      const typedBootstrap: FreshSessionBootstrap = {
        kind: 'resume_recovery',
        knowledgeBaseBundleHash: freshContext.knowledgeBaseBundleHash,
        digest,
        stateDelivery: 'full_engine_context',
        predecessorSessionHash,
      };
      const recoveryInvocation: AgentInvocation = {
        ...invocation,
        prompt: `[RECOVERY_DISPATCH]\n${invocation.prompt}`,
        instructions: freshSessionInstructions(freshContext, typedBootstrap),
        bootstrap: typedBootstrap,
        launcherToken: requireFullContextLauncher(invocation, 'resume recovery'),
      };
      const recoveryDispatch = openDispatch(deadline, recoveryInvocation);
      const bootstrapResult = requireCompleted(
        await this.adapter.start(recoveryDispatch.invocation, deadline.signal),
        'Agent recovery cold start',
      );
      requireAcceptedCompletion(deadline);
      if (bootstrapResult.resumeSessionId === dispatched.sessionId) {
        throw new Error('Agent recovery cold start did not create a successor session.');
      }
      const successor = this.journal.recoverAgentSession({
        sessionId: bootstrapResult.resumeSessionId,
        predecessorSessionHash,
        failure: classification,
        digestHash: digest.hash,
      });
      this.journal.recordAgentSessionDispatch();
      const result = requireResumedSameSession(
        bootstrapResult,
        successor,
        'Recovered agent dispatch',
      );
      this.#recordUsage(result, recoveryDispatch.invocation);
      return result;
    }
  }

  async startEscalation(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
    if (this.journal.ended()) throw new Error('Explicitly ended sitting cannot escalate.');
    const freshContext = requireFreshSessionContext(invocation, 'escalation');
    const digest = this.journal.agentSessionDigest();
    verifyAgentSessionDigest(digest);
    const bootstrap: FreshSessionBootstrap = {
      kind: 'escalation',
      knowledgeBaseBundleHash: freshContext.knowledgeBaseBundleHash,
      digest,
      stateDelivery: 'full_engine_context',
    };
    const dispatch = openDispatch(deadline, {
      ...invocation,
      instructions: freshSessionInstructions(freshContext, bootstrap, invocation.instructions),
      bootstrap,
      launcherToken: requireFullContextLauncher(invocation, 'escalation'),
    });
    const result = requireCompleted(
      await this.adapter.start(dispatch.invocation, deadline.signal),
      'Agent escalation cold start',
    );
    requireAcceptedCompletion(deadline);
    return result;
  }

  async #rollOver(
    persisted: AgentSessionBinding,
    invocation: AgentInvocation,
    deadline: AgentDispatchDeadline,
  ): Promise<AgentTurnResult> {
    if (this.rolloverPolicy.kind !== 'measured' || persisted.currentContextTokens === null) {
      throw new Error('Context rollover requires measured usage and policy.');
    }
    const freshContext = requireFreshSessionContext(invocation, 'context rollover');
    const digest = this.journal.agentSessionDigest();
    verifyAgentSessionDigest(digest);
    const bootstrap: FreshSessionBootstrap = {
      kind: 'context_rollover',
      knowledgeBaseBundleHash: freshContext.knowledgeBaseBundleHash,
      digest,
      stateDelivery: 'full_engine_context',
    };
    const dispatch = openDispatch(deadline, {
      ...invocation,
      instructions: freshSessionInstructions(freshContext, bootstrap),
      bootstrap,
      launcherToken: requireFullContextLauncher(invocation, 'context rollover'),
    });
    const result = requireCompleted(
      await this.adapter.start(dispatch.invocation, deadline.signal),
      'Agent context rollover cold start',
    );
    requireAcceptedCompletion(deadline);
    if (result.resumeSessionId === persisted.sessionId) {
      throw new Error('Agent context rollover did not create a successor session.');
    }
    const successor = this.journal.rollOverAgentSession({
      sessionId: result.resumeSessionId,
      predecessorSessionHash: sha256(persisted.sessionId),
      latestInputTokens: persisted.currentContextTokens,
      threshold: this.rolloverPolicy.threshold,
      digestHash: digest.hash,
    });
    this.journal.recordAgentSessionDispatch();
    const dispatched = requireResumedSameSession(result, successor, 'Context rollover dispatch');
    this.#recordUsage(dispatched, dispatch.invocation);
    return dispatched;
  }

  #recordUsage(result: AgentTurnResult, invocation: AgentInvocation): void {
    if (result.usage === null) return;
    const ordinal = (this.journal.agentSession()?.callUsage.length ?? 0) + 1;
    this.journal.recordAgentCallUsage(agentCallUsage(result.usage, invocation.callPhase, ordinal));
  }
}

export const CONTEXT_ROLLOVER_POLICY: ContextRolloverPolicy = {
  kind: 'measured',
  threshold: measuredContextRolloverThreshold(160000),
  evidence: 'supervisor 2026-09-03: 13392 per-call samples / 1083 rollouts; median 29102 p90 46093 p99 86762 max 238731; window 258400',
};

export class UnmeasuredContextRolloverPolicyError extends Error {
  override readonly name = 'UnmeasuredContextRolloverPolicyError' as const;

  constructor() {
    super('A real agent session requires a measured context rollover policy.');
  }
}

export function shouldRollOver(
  latestInput: ContextTokenCount,
  policy: ContextRolloverPolicy,
): boolean {
  return policy.kind === 'measured' && latestInput >= policy.threshold;
}

function measuredThreshold(policy: ContextRolloverPolicy): MeasuredContextRolloverThreshold | null {
  return policy.kind === 'measured' ? policy.threshold : null;
}

function requireFreshSessionContext(invocation: AgentInvocation, operation: string): FreshSessionContext {
  if (invocation.freshSessionContext === undefined) {
    throw new Error(`${operation} requires the root+tactics KB bundle and hash.`);
  }
  return invocation.freshSessionContext;
}

function requireFullContextLauncher(invocation: AgentInvocation, operation: string): string {
  if (invocation.recoveryLauncherToken === undefined) {
    throw new Error(`${operation} requires a full-engine-context launcher.`);
  }
  return invocation.recoveryLauncherToken;
}

export function freshSessionInstructions(
  context: FreshSessionContext,
  bootstrap: FreshSessionBootstrap,
  trailingInstructions: string | null | undefined = null,
): string {
  if (bootstrap.kind === 'cold_start') return context.startupInstructions;
  verifyAgentSessionDigest(bootstrap.digest);
  if (bootstrap.knowledgeBaseBundleHash !== context.knowledgeBaseBundleHash ||
    bootstrap.stateDelivery !== 'full_engine_context') {
    throw new Error('Fresh session bootstrap does not match its KB bundle or state delivery.');
  }
  return [
    context.startupInstructions,
    `[SESSION_DIGEST]\n${bootstrap.digest.bytes}`,
    '[FULL_ENGINE_CONTEXT]\nCall engine.get_turn_context with granularity "full" before planning.',
    ...(trailingInstructions === null || trailingInstructions === undefined ? [] : [trailingInstructions]),
  ].join('\n\n');
}

function requireCompleted(result: AgentTurnResult, operation: string): AgentTurnResult {
  if (result.exit !== 'completed') throw new Error(`${operation} was cancelled.`);
  return result;
}

function requireResumedSameSession(
  result: AgentTurnResult,
  binding: AgentSessionBinding,
  operation: string,
): AgentTurnResult {
  requireCompleted(result, operation);
  if (result.resumeSessionId !== binding.sessionId) {
    throw new Error(`${operation} returned a different session ID.`);
  }
  return result;
}
