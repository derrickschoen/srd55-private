import { describe, expect, it } from 'vitest';
import { engineDispatchId } from '../../../src/vtt/agent-session';
import {
  classifyEngineCatalogEvidence,
  decodeEngineReadinessRecord,
  type EngineObservedEvent,
  type EngineReadinessRecord,
} from '../../../src/vtt/engine-dispatch-evidence';

const dispatch = engineDispatchId('engine-dispatch:test-primary-0001');
const earlierDispatch = engineDispatchId('engine-dispatch:test-earlier-0001');
const expected = ['engine.get_turn_context', 'engine.submit_blind_round_intents'] as const;

function readiness(
  dispatchId = dispatch,
  overrides: Partial<EngineReadinessRecord> = {},
): EngineReadinessRecord {
  return {
    version: 1,
    dispatchId,
    phase: 'primary',
    profile: 'blind',
    requestId: 'request:room-1-round-1',
    event: 'tools_list_stream_write_completed',
    generatedAtUnixMs: 10,
    writeCompletedAtUnixMs: 11,
    responseId: '1',
    responseSha256: 'a'.repeat(64),
    expectedToolNames: expected,
    returnedToolNames: expected,
    descriptorSha256: 'b'.repeat(64),
    validation: { status: 'valid' },
    ...overrides,
  };
}

function classify(input: {
  readonly events?: readonly EngineObservedEvent[];
  readonly records?: readonly EngineReadinessRecord[];
  readonly completed?: boolean;
  readonly failed?: boolean;
  readonly malformedReadiness?: boolean;
}) {
  return classifyEngineCatalogEvidence({
    dispatchId: dispatch,
    expectedProfile: 'blind',
    expectedPhase: 'primary',
    expectedRequestId: 'request:room-1-round-1',
    expectedToolNames: expected,
    events: input.events ?? [],
    readiness: input.records ?? [],
    completed: input.completed ?? true,
    requiredStartupFailed: input.failed ?? false,
    ...(input.malformedReadiness === undefined ? {} : { malformedReadiness: input.malformedReadiness }),
  });
}

describe('engine dispatch catalog evidence', () => {
  it.each(['primary', 'correction', 'adjustment', 'speculative'] as const)(
    'classifies required-server startup failure in the %s phase as diagnosed absence',
    (phase) => {
      expect(classifyEngineCatalogEvidence({
        dispatchId: dispatch,
        expectedProfile: 'blind',
        expectedPhase: phase,
        expectedRequestId: 'request:room-1-round-1',
        expectedToolNames: expected,
        events: [],
        readiness: [],
        completed: false,
        requiredStartupFailed: true,
        corroboration: [`${phase} startup failed`],
      })).toEqual({
        status: 'absent',
        basis: 'required_engine_initialization_failed',
        dispatchId: dispatch,
        corroboration: [`${phase} startup failed`],
      });
    },
  );

  it.each(['nDXgPJ', 'CUAnqn', 'bvZkpX'])('%s resource-only trajectory is not an advertised invocation', (name) => {
    const evidence = classify({
      events: [
        { invocationId: `${name}-1`, kind: 'item.started', server: 'codex_apps', toolName: 'read_mcp_resource', observedAtUnixMs: 20 },
        { invocationId: `${name}-1`, kind: 'item.completed', server: 'codex_apps', toolName: 'read_mcp_resource', observedAtUnixMs: 21 },
        { invocationId: `${name}-2`, kind: 'item.completed', server: null, toolName: 'list_mcp_resource_templates', observedAtUnixMs: 22 },
      ],
    });
    expect(evidence).toEqual({ status: 'inconclusive', dispatchId: dispatch, reason: 'no_correlated_catalog' });
  });

  it('deduplicates exact advertised invocations and keeps resource operations separate', () => {
    expect(classify({
      events: [
        { invocationId: 'call-1', kind: 'item.started', server: 'engine', toolName: 'engine.get_turn_context', observedAtUnixMs: 50 },
        { invocationId: 'call-1', kind: 'item.completed', server: 'engine', toolName: 'engine.get_turn_context', observedAtUnixMs: 51 },
        { invocationId: 'resource-1', kind: 'item.completed', server: 'engine', toolName: 'read_mcp_resource', observedAtUnixMs: 52 },
      ],
    })).toEqual({
      status: 'ready', basis: 'advertised_tool_invoked', dispatchId: dispatch,
      advertisedInvocationCount: 1, resourceOperationCount: 1,
    });
  });

  it('accepts valid required-CLI catalog evidence across model and scheduling delays', () => {
    const record = readiness(dispatch, { generatedAtUnixMs: 10, writeCompletedAtUnixMs: 11 });
    expect(classify({
      records: [record],
      events: [{ invocationId: null, kind: 'turn.completed', server: null, toolName: null, observedAtUnixMs: 90_000 }],
    })).toEqual({
      status: 'ready', basis: 'required_cli_completed_with_valid_catalog', dispatchId: dispatch,
      advertisedInvocationCount: 0, resourceOperationCount: 0,
    });
  });

  it('an exact invocation proves readiness even when its live timestamp is null', () => {
    expect(classify({ events: [{
      invocationId: 'call-null-time', kind: 'item.completed', server: 'engine',
      toolName: 'engine.get_turn_context', observedAtUnixMs: null,
    }] })).toEqual({
      status: 'ready', basis: 'advertised_tool_invoked', dispatchId: dispatch,
      advertisedInvocationCount: 1, resourceOperationCount: 0,
    });
  });

  it('rejects wrong-profile and malformed catalog evidence', () => {
    expect(classify({ records: [readiness(dispatch, { profile: 'dm' })] })).toEqual({
      status: 'inconclusive', dispatchId: dispatch, reason: 'invalid_catalog_response',
    });
    expect(() => decodeEngineReadinessRecord({ ...readiness(), returnedToolNames: [3] }))
      .toThrow('Engine readiness record is malformed.');
    expect(classify({ malformedReadiness: true })).toEqual({
      status: 'inconclusive', dispatchId: dispatch, reason: 'invalid_catalog_response',
    });
  });

  it('keeps mixed valid and malformed or wrong-profile readiness evidence inconclusive', () => {
    expect(classify({ records: [readiness()], malformedReadiness: true })).toEqual({
      status: 'inconclusive', dispatchId: dispatch, reason: 'invalid_catalog_response',
    });
    expect(classify({ records: [readiness(), readiness(dispatch, { profile: 'dm' })] })).toEqual({
      status: 'inconclusive', dispatchId: dispatch, reason: 'invalid_catalog_response',
    });
  });

  it('does not correlate an earlier successful list to a failed retry', () => {
    expect(classify({ records: [readiness(earlierDispatch)], completed: false, failed: true })).toEqual({
      status: 'absent', basis: 'required_engine_initialization_failed', dispatchId: dispatch,
      corroboration: [],
    });
  });

  it('marks success plus startup failure for one dispatch inconclusive', () => {
    expect(classify({ records: [readiness()], completed: false, failed: true })).toEqual({
      status: 'inconclusive', dispatchId: dispatch, reason: 'conflicting_success_and_failure',
    });
  });

  it('marks an untimestamped advertised invocation plus startup failure inconclusive', () => {
    expect(classify({
      events: [{
        invocationId: null,
        kind: 'item.completed',
        server: 'engine',
        toolName: 'engine.get_turn_context',
        observedAtUnixMs: null,
      }],
      completed: false,
      failed: true,
    })).toEqual({
      status: 'inconclusive', dispatchId: dispatch, reason: 'conflicting_success_and_failure',
    });
  });
});
