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

export type EngineCatalogIntegrityView =
  | { readonly status: 'ready' | 'absent' }
  | {
      readonly status: 'inconclusive';
      readonly reason:
        | 'no_correlated_catalog'
        | 'invalid_catalog_response'
        | 'missing_live_timestamp'
        | 'conflicting_success_and_failure'
        | 'timestamp_only';
    };

export type EngineCatalogInconclusiveReason = Extract<
  EngineCatalogIntegrityView,
  { readonly status: 'inconclusive' }
>['reason'];

export type TurnContextDeliveryIntegrityView =
  | { readonly status: 'delivered' }
  | { readonly status: 'not_requested'; readonly reason: 'catalog_ready_model_did_not_fetch' | 'dispatch_cancelled' }
  | { readonly status: 'timeout_before_delivery' | 'infrastructure_absent' | 'indeterminate' };

export function engineCatalogReasonIsMissingObservation(reason: EngineCatalogInconclusiveReason): boolean {
  switch (reason) {
    case 'no_correlated_catalog':
    case 'missing_live_timestamp':
    case 'timestamp_only':
      return true;
    case 'invalid_catalog_response':
    case 'conflicting_success_and_failure':
      return false;
  }
}

export function engineCatalogHasIntegrityFailure(evidence: EngineCatalogIntegrityView): boolean {
  return evidence.status === 'inconclusive' && !engineCatalogReasonIsMissingObservation(evidence.reason);
}

/** True when D569 evidence must be persisted and stopped rather than packetized or scored. */
export function d569DeliveryHasIntegritySignal(
  catalog: EngineCatalogIntegrityView,
  delivery: TurnContextDeliveryIntegrityView,
): boolean {
  if (delivery.status === 'indeterminate' || engineCatalogHasIntegrityFailure(catalog)) return true;
  if (delivery.status === 'delivered') return catalog.status !== 'ready';
  if (catalog.status !== 'inconclusive') return false;
  return delivery.status !== 'timeout_before_delivery' &&
    !(delivery.status === 'not_requested' && delivery.reason === 'dispatch_cancelled');
}

export function d569PartialEvidenceHasIntegritySignal(
  catalog: EngineCatalogIntegrityView | undefined,
  delivery: TurnContextDeliveryIntegrityView | undefined,
): boolean {
  if (delivery?.status === 'indeterminate') return true;
  if (catalog !== undefined && engineCatalogHasIntegrityFailure(catalog)) return true;
  return catalog !== undefined && delivery !== undefined && d569DeliveryHasIntegritySignal(catalog, delivery);
}

export function classifyTurnContextDelivery(input: {
  readonly turn: AgentTurnResult;
  readonly catalogEvidence: EngineCatalogEvidence;
  readonly delivered: { readonly contextSha256: string; readonly measurement: TurnContextMeasurement } | null;
}): TurnContextDelivery {
  const dispatchId = input.catalogEvidence.dispatchId;
  if (input.delivered !== null) {
    return { status: 'delivered', dispatchId, ...input.delivered };
  }
  if (engineCatalogHasIntegrityFailure(input.catalogEvidence)) {
    return {
      status: 'indeterminate', dispatchId,
      reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
      integrityAction: 'stop_after_persist',
    };
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
