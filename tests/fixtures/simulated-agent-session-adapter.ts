import { agentSessionId } from '../../src/combat/values';
import type {
  AgentFailureClassification,
  AgentInvocation,
  AgentSessionAdapter,
  AgentSessionBinding,
  AgentTurnResult,
} from '../../src/vtt/agent-session';

export class SIMULATEDResumeFailure extends Error {
  constructor(readonly classification: AgentFailureClassification) {
    super(`SIMULATED ${classification}`);
  }
}

export class SIMULATEDAgentSessionAdapter implements AgentSessionAdapter {
  readonly kind = 'codex' as const;
  readonly startInvocations: AgentInvocation[] = [];
  readonly resumeInvocations: Array<{
    readonly binding: AgentSessionBinding;
    readonly invocation: AgentInvocation;
  }> = [];
  readonly #startIds: string[];
  readonly #resumeFailures: SIMULATEDResumeFailure[];
  readonly #onResume: ((invocation: AgentInvocation) => void) | undefined;

  constructor(input: {
    readonly startIds: readonly string[];
    readonly resumeFailures?: readonly SIMULATEDResumeFailure[];
    readonly onResume?: (invocation: AgentInvocation) => void;
  }) {
    this.#startIds = [...input.startIds];
    this.#resumeFailures = [...(input.resumeFailures ?? [])];
    this.#onResume = input.onResume;
  }

  async probe() {
    return { present: true, version: 'SIMULATED' };
  }

  async start(invocation: AgentInvocation): Promise<AgentTurnResult> {
    this.startInvocations.push(invocation);
    const next = this.#startIds.shift();
    if (next === undefined) throw new Error('SIMULATED start script exhausted.');
    return completed(next, 'SIMULATED bootstrap');
  }

  async resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
  ): Promise<AgentTurnResult> {
    this.resumeInvocations.push({ binding, invocation });
    const failure = this.#resumeFailures.shift();
    if (failure !== undefined) throw failure;
    this.#onResume?.(invocation);
    return completed(binding.sessionId, `SIMULATED resume ${invocation.prompt}`);
  }

  classifyFailure(error: unknown): AgentFailureClassification {
    return error instanceof SIMULATEDResumeFailure ? error.classification : 'unknown';
  }
}

function completed(sessionId: string, finalText: string): AgentTurnResult {
  return {
    sessionId: agentSessionId(sessionId),
    finalText,
    usage: null,
    exit: 'completed',
  };
}
