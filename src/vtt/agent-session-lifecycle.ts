import { sha256 } from '../crypto/sha256';
import type {
  ContextRolloverPolicy,
  ContextTokenCount,
  AgentInvocation,
  AgentSessionAdapter,
  AgentSessionBinding,
  AgentTurnResult,
} from './agent-session';
import { agentCallUsage } from './agent-session';
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

  async coldStart(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentSessionBinding> {
    const result = await this.#coldStart(invocation, signal);
    const binding = this.journal.startAgentSession({
      cli: this.adapter.kind,
      sessionId: result.resumeSessionId,
      adapterVersion: this.adapterVersion,
    });
    this.#recordUsage(result, invocation);
    return this.journal.agentSession() ?? binding;
  }

  async coldStartRound(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    const result = await this.#coldStart(invocation, signal);
    this.journal.startAgentSession({
      cli: this.adapter.kind,
      sessionId: result.resumeSessionId,
      adapterVersion: this.adapterVersion,
    });
    this.journal.recordAgentSessionDispatch();
    this.#recordUsage(result, invocation);
    return result;
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
    const result = await this.adapter.start(invocation, signal);
    requireCompleted(result, 'Agent cold start');
    return result;
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
    const persisted = this.journal.agentSession();
    if (persisted === null || persisted.status !== 'active') {
      throw new Error('Cold start and persist the agent binding before dispatch.');
    }
    if (persisted.cli !== this.adapter.kind) {
      throw new Error('Changing agent CLI requires an explicit DM selection.');
    }
    const dispatched = this.journal.recordAgentSessionDispatch();
    try {
      const result = requireResumedSameSession(
        await this.adapter.resume(dispatched, invocation, signal),
        dispatched,
        'Agent resume',
      );
      this.#recordUsage(result, invocation);
      return result;
    } catch (error) {
      const classification = this.adapter.classifyFailure(error);
      if (classification !== 'resume_not_found' && classification !== 'resume_corrupt') throw error;
      const predecessorSessionHash = sha256(dispatched.sessionId);
      const recoveryInvocation: AgentInvocation = {
        ...invocation,
        prompt: `${this.journal.recoveryBootstrapPrompt(predecessorSessionHash)}\n\n[RECOVERY_DISPATCH]\n${invocation.prompt}`,
        launcherToken: invocation.recoveryLauncherToken ?? invocation.launcherToken,
      };
      const bootstrap = requireCompleted(
        await this.adapter.start(recoveryInvocation, signal),
        'Agent recovery cold start',
      );
      if (bootstrap.resumeSessionId === dispatched.sessionId) {
        throw new Error('Agent recovery cold start did not create a successor session.');
      }
      const successor = this.journal.recoverAgentSession({
        sessionId: bootstrap.resumeSessionId,
        predecessorSessionHash,
        failure: classification,
      });
      this.journal.recordAgentSessionDispatch();
      const result = requireResumedSameSession(
        bootstrap,
        successor,
        'Recovered agent dispatch',
      );
      this.#recordUsage(result, invocation);
      return result;
    }
  }

  #recordUsage(result: AgentTurnResult, invocation: AgentInvocation): void {
    if (result.usage === null) return;
    const ordinal = (this.journal.agentSession()?.callUsage.length ?? 0) + 1;
    this.journal.recordAgentCallUsage(agentCallUsage(result.usage, invocation.callPhase, ordinal));
  }
}

export const CONTEXT_ROLLOVER_POLICY: ContextRolloverPolicy = { kind: 'unmeasured' };

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
