import { describe, expect, it } from 'vitest';
import { agentSessionId } from '../../../src/combat/values';
import { engineDispatchId, type AgentTurnResult, type EngineCatalogEvidence } from '../../../src/vtt/agent-session';
import { classifyTurnContextDelivery } from '../../../src/vtt/turn-context-delivery';

const dispatchId = engineDispatchId('engine-dispatch:delivery-test-0001');
const base = {
  resumeSessionId: agentSessionId('agent-session:delivery-test'),
  sessionId: null,
  finalText: '',
  usage: null,
  processEvidence: null,
  engineCatalogEvidence: null,
} as const;
const ready: EngineCatalogEvidence = {
  status: 'ready', basis: 'required_cli_completed_with_valid_catalog', dispatchId,
  advertisedInvocationCount: 0, resourceOperationCount: 0,
};
const absent: EngineCatalogEvidence = {
  status: 'absent', basis: 'required_engine_initialization_failed', dispatchId, corroboration: [],
};
const inconclusive: EngineCatalogEvidence = {
  status: 'inconclusive', dispatchId, reason: 'no_correlated_catalog',
};
const conflicting: EngineCatalogEvidence = {
  status: 'inconclusive', dispatchId, reason: 'conflicting_success_and_failure',
};

function turn(exit: AgentTurnResult['exit']): AgentTurnResult {
  switch (exit) {
    case 'completed': return { ...base, exit, partialResultEvidence: { status: 'complete', decodedEventCount: 0 } };
    case 'cancelled': return { ...base, exit, cancellationReason: 'abort_signal', partialResultEvidence: { status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null, stagedInvocationIds: [] } };
    case 'timed_out': return { ...base, exit, timeoutMs: 180_000, partialResultEvidence: { status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null, stagedInvocationIds: [] } };
    case 'infrastructure_failed': return { ...base, exit, component: 'engine_mcp_startup', failureReason: 'startup failed', partialResultEvidence: { status: 'partial', decodedEventCount: 0, finalTextFragment: '', observedUsage: null, stagedInvocationIds: [] } };
  }
}

describe('turn-context delivery classification', () => {
  it('covers every delivery state without conflating attribution', () => {
    expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: ready, delivered: { contextSha256: 'a'.repeat(64), measurement: { baseBytes: 10, semanticBytes: 2 } } })).toEqual({ status: 'delivered', dispatchId, contextSha256: 'a'.repeat(64), measurement: { baseBytes: 10, semanticBytes: 2 } });
    expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: ready, delivered: null })).toEqual({ status: 'not_requested', dispatchId, reason: 'catalog_ready_model_did_not_fetch', measurement: null });
    expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: ready, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
    expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'timeout_before_delivery', dispatchId, measurement: null });
    for (const exit of ['timed_out', 'cancelled'] as const) {
      expect(classifyTurnContextDelivery({ turn: turn(exit), catalogEvidence: conflicting, delivered: null }))
        .toEqual({
          status: 'indeterminate', dispatchId,
          reason: 'catalog_inconclusive_empty_context_spool', measurement: null,
          integrityAction: 'stop_after_persist',
        });
    }
    expect(classifyTurnContextDelivery({ turn: turn('infrastructure_failed'), catalogEvidence: absent, delivered: null })).toEqual({ status: 'infrastructure_absent', dispatchId, measurement: null });
    expect(classifyTurnContextDelivery({ turn: turn('completed'), catalogEvidence: inconclusive, delivered: null })).toEqual({ status: 'indeterminate', dispatchId, reason: 'catalog_inconclusive_empty_context_spool', measurement: null, integrityAction: 'stop_after_persist' });
  });

  it('preserves delivered status when timeout follows retrieval', () => {
    expect(classifyTurnContextDelivery({ turn: turn('timed_out'), catalogEvidence: ready, delivered: { contextSha256: 'b'.repeat(64), measurement: { baseBytes: 8, semanticBytes: 0 } } }).status).toBe('delivered');
  });

  it('preserves delivered evidence when cancellation follows retrieval', () => {
    expect(classifyTurnContextDelivery({
      turn: turn('cancelled'), catalogEvidence: ready,
      delivered: { contextSha256: 'c'.repeat(64), measurement: { baseBytes: 12, semanticBytes: 3 } },
    })).toEqual({
      status: 'delivered', dispatchId, contextSha256: 'c'.repeat(64),
      measurement: { baseBytes: 12, semanticBytes: 3 },
    });
  });
});
