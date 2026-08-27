import { sha256 } from '../crypto/sha256';
import type {
  AgentInvocation,
  AgentSessionAdapter,
  AgentSessionBinding,
  AgentTurnResult,
} from './agent-session';
import type { EncounterSessionJournal } from './session-persistence';

export class AgentSessionLifecycle {
  constructor(
    private readonly journal: EncounterSessionJournal,
    private readonly adapter: AgentSessionAdapter,
    private readonly adapterVersion: number,
  ) {
    if (!Number.isSafeInteger(adapterVersion) || adapterVersion < 1) {
      throw new RangeError('Agent adapter version must be a positive integer.');
    }
  }

  async coldStart(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentSessionBinding> {
    if (invocation.runId !== this.journal.sessionId) {
      throw new Error('Agent invocation run does not match the authoritative journal.');
    }
    if (this.journal.agentSession() !== null) {
      throw new Error('Encounter run already has an agent session.');
    }
    const result = await this.adapter.start(invocation, signal);
    requireCompleted(result, 'Agent cold start');
    return this.journal.startAgentSession({
      cli: this.adapter.kind,
      sessionId: result.sessionId,
      adapterVersion: this.adapterVersion,
    });
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
      return requireResumedSameSession(
        await this.adapter.resume(dispatched, invocation, signal),
        dispatched,
        'Agent resume',
      );
    } catch (error) {
      const classification = this.adapter.classifyFailure(error);
      if (classification !== 'resume_not_found' && classification !== 'resume_corrupt') throw error;
      const predecessorSessionHash = sha256(dispatched.sessionId);
      const recoveryInvocation: AgentInvocation = {
        ...invocation,
        prompt: this.journal.recoveryBootstrapPrompt(predecessorSessionHash),
      };
      const bootstrap = requireCompleted(
        await this.adapter.start(recoveryInvocation, signal),
        'Agent recovery cold start',
      );
      if (bootstrap.sessionId === dispatched.sessionId) {
        throw new Error('Agent recovery cold start did not create a successor session.');
      }
      this.journal.recoverAgentSession({
        sessionId: bootstrap.sessionId,
        predecessorSessionHash,
        failure: classification,
      });
      const successor = this.journal.recordAgentSessionDispatch();
      return requireResumedSameSession(
        await this.adapter.resume(successor, invocation, signal),
        successor,
        'Recovered agent resume',
      );
    }
  }
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
  if (result.sessionId !== binding.sessionId) {
    throw new Error(`${operation} returned a different session ID.`);
  }
  return result;
}
