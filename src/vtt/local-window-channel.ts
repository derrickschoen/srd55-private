import type { ControllerRequest } from '../combat/controllers';
import { offeredActionId } from './encounter-projections';
import type { PlayerBoardProjection } from './encounter-projections';
import type { HostCoordinatorTransactionOutcome } from './dm-encounter-host';

export interface HostWindowMessage {
  readonly kind: 'player_projection';
  readonly sessionId: string;
  readonly projection: PlayerBoardProjection;
}

export interface PlayerDecisionMessage {
  readonly kind: 'human_controller_decision';
  readonly sessionId: string;
  readonly decision: {
    readonly requestId: string;
    readonly encounterRevision: number;
    readonly offeredActionId: string;
  };
}

export type TopDownSubmissionFeedback =
  | { readonly kind: 'committed' }
  | { readonly kind: 'error'; readonly message: string };

export interface PlayerSubmissionFeedbackMessage {
  readonly kind: 'human_controller_decision_result';
  readonly sessionId: string;
  readonly requestId: string;
  readonly feedback: TopDownSubmissionFeedback;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function decodePlayerDecision(
  value: unknown,
  sessionId: string,
  pending: ControllerRequest,
): { readonly requestId: string; readonly encounterRevision: number; readonly offeredActionId: string } {
  if (!isRecord(value) || value.kind !== 'human_controller_decision') {
    throw new TypeError('Local window message is not a HumanController decision.');
  }
  if (value.sessionId !== sessionId || !isRecord(value.decision)) {
    throw new TypeError('HumanController decision belongs to another session.');
  }
  const decision = value.decision;
  if (
    decision.requestId !== pending.requestId ||
    decision.encounterRevision !== pending.encounterRevision
  ) {
    throw new TypeError('HumanController decision is stale.');
  }
  const offeredActionIds = pending.legalActions.actions.map((_action, index) =>
    offeredActionId(pending.requestId, index));
  if (typeof decision.offeredActionId !== 'string' || !offeredActionIds.includes(decision.offeredActionId)) {
    throw new TypeError('HumanController decision is not one of the projected offered action IDs.');
  }
  return {
    requestId: pending.requestId,
    encounterRevision: pending.encounterRevision,
    offeredActionId: decision.offeredActionId,
  };
}

export function playerDecisionMessage(
  sessionId: string,
  request: {
    readonly requestId: string;
    readonly encounterRevision: number;
  },
  selectedOfferedActionId: string,
): PlayerDecisionMessage {
  return {
    kind: 'human_controller_decision',
    sessionId,
    decision: {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      offeredActionId: selectedOfferedActionId,
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The top-down submission failed.';
}

export async function handleTopDownSubmission(
  submit: () => Promise<HostCoordinatorTransactionOutcome>,
  surface: (feedback: TopDownSubmissionFeedback) => void,
): Promise<void> {
  try {
    const outcome = await submit();
    switch (outcome.kind) {
      case 'committed':
        surface({ kind: 'committed' });
        return;
      case 'refused':
      case 'cancelled':
        surface({ kind: 'error', message: outcome.reason });
        return;
      case 'closed':
        surface({ kind: 'error', message: 'The encounter session is closed.' });
        return;
      case 'failed':
        surface({
          kind: 'error',
          message: `${outcome.phase === 'pre_apply' ? 'Before applying' : 'After applying'}: ${errorMessage(outcome.error)}`,
        });
        return;
    }
  } catch (error: unknown) {
    surface({ kind: 'error', message: errorMessage(error) });
  }
}

export function playerSubmissionFeedbackMessage(
  sessionId: string,
  requestId: string,
  feedback: TopDownSubmissionFeedback,
): PlayerSubmissionFeedbackMessage {
  return { kind: 'human_controller_decision_result', sessionId, requestId, feedback };
}

export function isPlayerSubmissionFeedbackMessage(
  value: unknown,
  sessionId: string,
): value is PlayerSubmissionFeedbackMessage {
  if (!isRecord(value) || value.kind !== 'human_controller_decision_result' || value.sessionId !== sessionId) {
    return false;
  }
  if (typeof value.requestId !== 'string' || !isRecord(value.feedback)) return false;
  return value.feedback.kind === 'committed' ||
    (value.feedback.kind === 'error' && typeof value.feedback.message === 'string');
}

export function isHostWindowMessage(
  value: unknown,
  sessionId: string,
): value is HostWindowMessage {
  if (!isRecord(value) || value.sessionId !== sessionId) return false;
  if (value.kind !== 'player_projection' || !isRecord(value.projection)) return false;
  return value.projection.audience === 'player';
}
