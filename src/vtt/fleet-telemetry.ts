export const VTT_FLEET_SCHEMA_VERSION = 2 as const;

export type FleetReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface FleetTokenCounts {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
}

/** One fleet schema for model and human controllers; human fields are null. */
export interface FleetTelemetry {
  readonly modelId: string | null;
  readonly reasoningEffort: FleetReasoningEffort | null;
  readonly buildId: string | null;
  readonly commit: string | null;
  readonly loadLevelTag: string | null;
  readonly latencyMs: number | null;
  readonly tokenCounts: FleetTokenCounts | null;
  readonly correctionAttempts: number | null;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function optionalText(value: string | null, label: string): string | null {
  if (value !== null && (value.length === 0 || value.trim() !== value)) {
    throw new TypeError(`${label} must be null or non-empty trimmed text.`);
  }
  return value;
}

export function emptyFleetTelemetry(): FleetTelemetry {
  return {
    modelId: null,
    reasoningEffort: null,
    buildId: null,
    commit: null,
    loadLevelTag: null,
    latencyMs: null,
    tokenCounts: null,
    correctionAttempts: null,
  };
}

export function modelFleetTelemetry(input: FleetTelemetry): FleetTelemetry {
  const modelId = optionalText(input.modelId, 'fleet.modelId');
  const effort = input.reasoningEffort;
  const allowedEfforts: ReadonlySet<FleetReasoningEffort> = new Set([
    'low', 'medium', 'high', 'xhigh', 'max',
  ]);
  if (modelId === null || effort === null || !allowedEfforts.has(effort)) {
    throw new TypeError('Model telemetry requires a model id and reasoning effort.');
  }
  optionalText(input.buildId, 'fleet.buildId');
  optionalText(input.commit, 'fleet.commit');
  optionalText(input.loadLevelTag, 'fleet.loadLevelTag');
  if (input.latencyMs === null || !Number.isFinite(input.latencyMs) || input.latencyMs < 0) {
    throw new TypeError('Model telemetry requires a non-negative finite latency.');
  }
  if (input.tokenCounts === null) throw new TypeError('Model telemetry requires token counts.');
  if (input.correctionAttempts === null) {
    throw new TypeError('Model telemetry requires a correction-attempt count.');
  }
  nonNegativeInteger(input.correctionAttempts, 'fleet.correctionAttempts');
  nonNegativeInteger(input.tokenCounts.input, 'fleet.tokenCounts.input');
  nonNegativeInteger(input.tokenCounts.cachedInput, 'fleet.tokenCounts.cachedInput');
  nonNegativeInteger(input.tokenCounts.output, 'fleet.tokenCounts.output');
  nonNegativeInteger(input.tokenCounts.reasoning, 'fleet.tokenCounts.reasoning');
  return structuredClone(input);
}
