import { sha256 } from '../crypto/sha256';
import type {
  AgentInvocation,
  AgentColdStartOutcome,
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

  async coldStart(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentColdStartOutcome> {
    const result = await this.#coldStart(invocation, signal);
    if (result.exit !== 'completed') return { kind: 'unbound', turn: result };
    const binding = this.journal.startAgentSession({
      cli: this.adapter.kind,
      sessionId: result.resumeSessionId,
      adapterVersion: this.adapterVersion,
      measuredRolloverThreshold: measuredThreshold(this.rolloverPolicy),
    });
    this.#recordUsage(result, invocation);
    return { kind: 'bound', binding: this.journal.agentSession() ?? binding, turn: result };
  }

  async coldStartRound(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentColdStartOutcome> {
    const result = await this.#coldStart(invocation, signal);
    if (result.exit !== 'completed') return { kind: 'unbound', turn: result };
    const binding = this.journal.startAgentSession({
      cli: this.adapter.kind,
      sessionId: result.resumeSessionId,
      adapterVersion: this.adapterVersion,
      measuredRolloverThreshold: measuredThreshold(this.rolloverPolicy),
    });
    this.journal.recordAgentSessionDispatch();
    this.#recordUsage(result, invocation);
    return { kind: 'bound', binding: this.journal.agentSession() ?? binding, turn: result };
  }

  async #coldStart(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
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
    return this.adapter.start({
      ...invocation,
      bootstrap: invocation.bootstrap ?? { kind: 'cold_start' },
    }, signal);
  }

  resumeRound(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    return this.#resume(invocation, signal);
  }

  resumeRoomTransition(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    return this.#resume(invocation, signal);
  }

  resumeCorrection(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    return this.#resume(invocation, signal);
  }

  async #resume(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
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
      return this.#rollOver(persisted, invocation, signal);
    }
    const dispatched = this.journal.recordAgentSessionDispatch();
    try {
      const result = requireResumedSameSession(
        await this.adapter.resume(dispatched, invocation, signal),
        dispatched,
        'Agent resume',
      );
      if (result.exit !== 'completed') return result;
      this.#recordUsage(result, invocation);
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
      const bootstrapResult = await this.adapter.start(recoveryInvocation, signal);
      if (bootstrapResult.exit !== 'completed') {
        if (invocation.recoveryEngineDispatchId === undefined) {
          throw new Error('Failed recovery dispatch omitted its engine dispatch identity.');
        }
        this.journal.recordAgentSessionRecoveryFailure({
          predecessorSessionHash,
          dispatchId: invocation.recoveryEngineDispatchId,
          exit: bootstrapResult.exit,
        });
        return bootstrapResult;
      }
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
      this.#recordUsage(result, invocation);
      return result;
    }
  }

  async startEscalation(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
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
    return this.adapter.start({
      ...invocation,
      instructions: freshSessionInstructions(freshContext, bootstrap, invocation.instructions),
      bootstrap,
      launcherToken: requireFullContextLauncher(invocation, 'escalation'),
    }, signal);
  }

  async #rollOver(
    persisted: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
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
    const result = await this.adapter.start({
      ...invocation,
      instructions: freshSessionInstructions(freshContext, bootstrap),
      bootstrap,
      launcherToken: requireFullContextLauncher(invocation, 'context rollover'),
    }, signal);
    if (result.exit !== 'completed') return result;
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
    this.#recordUsage(dispatched, invocation);
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

function requireResumedSameSession(
  result: AgentTurnResult,
  binding: AgentSessionBinding,
  operation: string,
): AgentTurnResult {
  if (result.exit !== 'completed') return result;
  if (result.resumeSessionId !== binding.sessionId) {
    throw new Error(`${operation} returned a different session ID.`);
  }
  return result;
}
