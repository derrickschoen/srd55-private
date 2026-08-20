import { canonicalJson } from '../commands/canonical-json';
import type { ControllerDecision, ControllerRequest } from '../combat/controllers';
import type { EncounterCommand } from '../combat/events';
import type { PlayerBoardProjection } from './encounter-projections';

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
    readonly action: unknown;
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function decodePlayerDecision(
  value: unknown,
  sessionId: string,
  pending: ControllerRequest,
): ControllerDecision {
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
  const encodedAction = canonicalJson(decision.action);
  const action = pending.legalActions.actions.find(
    (candidate) => canonicalJson(candidate) === encodedAction,
  );
  if (action === undefined) {
    throw new TypeError('HumanController decision is not one of the projected legal actions.');
  }
  return {
    requestId: pending.requestId,
    encounterRevision: pending.encounterRevision,
    action,
  };
}

export function playerDecisionMessage(
  sessionId: string,
  request: {
    readonly requestId: string;
    readonly encounterRevision: number;
  },
  action: EncounterCommand,
): PlayerDecisionMessage {
  return {
    kind: 'human_controller_decision',
    sessionId,
    decision: {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action,
    },
  };
}

export function isHostWindowMessage(
  value: unknown,
  sessionId: string,
): value is HostWindowMessage {
  if (!isRecord(value) || value.sessionId !== sessionId) return false;
  if (value.kind !== 'player_projection' || !isRecord(value.projection)) return false;
  return value.projection.audience === 'player';
}
