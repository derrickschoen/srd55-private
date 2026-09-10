import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import {
  engineDispatchId,
  type EngineCatalogEvidence,
  type EngineDispatchId,
  type EngineDispatchPhase,
} from './agent-session';

export interface EngineReadinessRecord {
  readonly version: 1;
  readonly dispatchId: EngineDispatchId;
  readonly phase: EngineDispatchPhase;
  readonly profile: 'dm' | 'blind';
  readonly requestId: string;
  readonly event: 'tools_list_response_generated' | 'tools_list_stream_write_completed';
  readonly generatedAtUnixMs: number;
  readonly writeCompletedAtUnixMs: number | null;
  readonly responseId: string;
  readonly responseSha256: string;
  readonly expectedToolNames: readonly string[];
  readonly returnedToolNames: readonly string[];
  readonly descriptorSha256: string | null;
  readonly validation:
    | { readonly status: 'valid' }
    | { readonly status: 'invalid'; readonly violations: readonly string[] };
}

export interface EngineObservedEvent {
  readonly invocationId: string | null;
  readonly kind: string;
  readonly server: string | null;
  readonly toolName: string | null;
  readonly observedAtUnixMs: number | null;
}

const RESOURCE_OPERATIONS = new Set([
  'read_mcp_resource',
  'list_mcp_resources',
  'list_mcp_resource_templates',
]);

export function descriptorSha256(descriptors: readonly unknown[]): string {
  return sha256(canonicalJson(descriptors));
}

export function decodeEngineReadinessRecord(value: unknown): EngineReadinessRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Engine readiness record must be an object.');
  }
  const record = value as Readonly<Record<string, unknown>>;
  const phase = record['phase'];
  const profile = record['profile'];
  const event = record['event'];
  const validation = record['validation'];
  if (record['version'] !== 1 || typeof record['dispatchId'] !== 'string' ||
    (phase !== 'primary' && phase !== 'correction' && phase !== 'adjustment' && phase !== 'speculative') ||
    (profile !== 'dm' && profile !== 'blind') || typeof record['requestId'] !== 'string' ||
    (event !== 'tools_list_response_generated' && event !== 'tools_list_stream_write_completed') ||
    typeof record['generatedAtUnixMs'] !== 'number' ||
    !(record['writeCompletedAtUnixMs'] === null || typeof record['writeCompletedAtUnixMs'] === 'number') ||
    typeof record['responseId'] !== 'string' || typeof record['responseSha256'] !== 'string' ||
    !Array.isArray(record['expectedToolNames']) || !record['expectedToolNames'].every((name) => typeof name === 'string') ||
    !Array.isArray(record['returnedToolNames']) || !record['returnedToolNames'].every((name) => typeof name === 'string') ||
    !(record['descriptorSha256'] === null || typeof record['descriptorSha256'] === 'string') ||
    typeof validation !== 'object' || validation === null || Array.isArray(validation)) {
    throw new TypeError('Engine readiness record is malformed.');
  }
  const validationRecord = validation as Readonly<Record<string, unknown>>;
  if (!(validationRecord['status'] === 'valid' || validationRecord['status'] === 'invalid' &&
    Array.isArray(validationRecord['violations']) &&
    validationRecord['violations'].every((violation) => typeof violation === 'string'))) {
    throw new TypeError('Engine readiness validation is malformed.');
  }
  return { ...record, dispatchId: engineDispatchId(record['dispatchId']) } as EngineReadinessRecord;
}

export function classifyEngineCatalogEvidence(input: {
  readonly dispatchId: EngineDispatchId;
  readonly expectedProfile?: EngineReadinessRecord['profile'];
  readonly expectedPhase?: EngineDispatchPhase;
  readonly expectedRequestId?: string;
  readonly expectedToolNames: readonly string[];
  readonly events: readonly EngineObservedEvent[];
  readonly readiness: readonly EngineReadinessRecord[];
  readonly completed: boolean;
  readonly requiredStartupFailed: boolean;
  readonly malformedReadiness?: boolean;
  readonly corroboration?: readonly string[];
}): EngineCatalogEvidence {
  const expected = new Set(input.expectedToolNames);
  const invocationIds = new Set<string>();
  const resourceInvocationIds = new Set<string>();
  let missingTimestamp = false;
  let advertisedObserved = false;
  for (const event of input.events) {
    if (event.server === 'engine' && event.toolName !== null && expected.has(event.toolName)) {
      advertisedObserved = true;
      if (event.observedAtUnixMs === null) missingTimestamp = true;
      if (event.invocationId !== null) invocationIds.add(event.invocationId);
    }
    if (event.toolName !== null && RESOURCE_OPERATIONS.has(event.toolName) && event.invocationId !== null) {
      resourceInvocationIds.add(event.invocationId);
    }
  }
  const correlated = input.readiness.filter((record) => record.dispatchId === input.dispatchId);
  const matchesDispatchContract = (record: EngineReadinessRecord): boolean =>
    (input.expectedProfile === undefined || record.profile === input.expectedProfile) &&
    (input.expectedPhase === undefined || record.phase === input.expectedPhase) &&
    (input.expectedRequestId === undefined || record.requestId === input.expectedRequestId);
  const valid = correlated.some((record) => record.event === 'tools_list_stream_write_completed' &&
    record.validation.status === 'valid' && matchesDispatchContract(record));
  const invalid = input.malformedReadiness === true || correlated.some((record) =>
    record.validation.status === 'invalid' || !matchesDispatchContract(record));
  if ((valid || advertisedObserved) && input.requiredStartupFailed) {
    return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'conflicting_success_and_failure' };
  }
  if (invocationIds.size > 0) {
    return {
      status: 'ready', basis: 'advertised_tool_invoked', dispatchId: input.dispatchId,
      advertisedInvocationCount: invocationIds.size, resourceOperationCount: resourceInvocationIds.size,
    };
  }
  if (input.completed && valid) {
    return {
      status: 'ready', basis: 'required_cli_completed_with_valid_catalog', dispatchId: input.dispatchId,
      advertisedInvocationCount: 0, resourceOperationCount: resourceInvocationIds.size,
    };
  }
  if (invalid) return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'invalid_catalog_response' };
  if (input.requiredStartupFailed && !valid) {
    return {
      status: 'absent', basis: 'required_engine_initialization_failed', dispatchId: input.dispatchId,
      corroboration: input.corroboration ?? [],
    };
  }
  if (missingTimestamp) return { status: 'inconclusive', dispatchId: input.dispatchId, reason: 'missing_live_timestamp' };
  return {
    status: 'inconclusive', dispatchId: input.dispatchId,
    reason: correlated.length === 0 ? 'no_correlated_catalog' : 'timestamp_only',
  };
}
