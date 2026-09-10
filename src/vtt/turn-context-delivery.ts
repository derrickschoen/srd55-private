import type {
  AgentTurnResult,
  EngineCatalogEvidence,
  EngineDispatchId,
} from './agent-session';

export interface TurnContextMeasurement {
  readonly baseBytes: number;
  readonly semanticBytes: number;
}

export interface TurnContextConfiguredCaps {
  readonly baseBytes: number;
  readonly semanticBytes: number;
}

export type TurnContextDelivery =
  | {
      readonly status: 'delivered';
      readonly dispatchId: EngineDispatchId;
      readonly contextSha256: string;
      readonly measurement: TurnContextMeasurement;
    }
  | {
      readonly status: 'not_requested';
      readonly dispatchId: EngineDispatchId;
      readonly reason: 'catalog_ready_model_did_not_fetch' | 'dispatch_cancelled';
      readonly measurement: null;
    }
  | { readonly status: 'timeout_before_delivery'; readonly dispatchId: EngineDispatchId; readonly measurement: null }
  | { readonly status: 'infrastructure_absent'; readonly dispatchId: EngineDispatchId; readonly measurement: null }
  | {
      readonly status: 'indeterminate';
      readonly dispatchId: EngineDispatchId;
      readonly reason: 'catalog_inconclusive_empty_context_spool';
      readonly measurement: null;
      readonly integrityAction: 'stop_after_persist';
    };

export type HostContextDiagnostic =
  | { readonly status: 'rendered'; readonly contextSha256: string }
  | { readonly status: 'unavailable'; readonly errorClass: string }
  | null;

export function classifyTurnContextDelivery(input: {
  readonly turn: AgentTurnResult;
  readonly catalogEvidence: EngineCatalogEvidence;
  readonly delivered: { readonly contextSha256: string; readonly measurement: TurnContextMeasurement } | null;
}): TurnContextDelivery {
  const dispatchId = input.catalogEvidence.dispatchId;
  if (input.delivered !== null) {
    return { status: 'delivered', dispatchId, ...input.delivered };
  }
  switch (input.turn.exit) {
    case 'cancelled':
      return { status: 'not_requested', dispatchId, reason: 'dispatch_cancelled', measurement: null };
    case 'timed_out':
      return { status: 'timeout_before_delivery', dispatchId, measurement: null };
    case 'infrastructure_failed': {
      if (input.catalogEvidence.status === 'inconclusive') {
        return {
          status: 'indeterminate', dispatchId,
          reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
          integrityAction: 'stop_after_persist',
        };
      }
      return { status: 'infrastructure_absent', dispatchId, measurement: null };
    }
    case 'completed':
      switch (input.catalogEvidence.status) {
        case 'ready':
          return {
            status: 'not_requested', dispatchId,
            reason: 'catalog_ready_model_did_not_fetch', measurement: null,
          };
        case 'absent':
          return { status: 'infrastructure_absent', dispatchId, measurement: null };
        case 'inconclusive':
          return {
            status: 'indeterminate', dispatchId,
            reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
            integrityAction: 'stop_after_persist',
          };
      }
  }
}
