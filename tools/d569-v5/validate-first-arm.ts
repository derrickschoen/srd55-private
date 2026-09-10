import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  readReconciliationSidecar,
  sha256Text,
  validateReconciliationSidecar,
  type D569ReconciliationSidecar,
} from './reconciliation';

const recordSchema = z.record(z.string(), z.unknown());
const catalogSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ready'), dispatchId: z.string().min(16) }).passthrough(),
  z.object({ status: z.literal('absent'), dispatchId: z.string().min(16) }).passthrough(),
  z.object({ status: z.literal('inconclusive'), dispatchId: z.string().min(16) }).passthrough(),
]);
const deliverySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('delivered'), dispatchId: z.string().min(16), measurement: z.object({ baseBytes: z.number().nonnegative(), semanticBytes: z.number().nonnegative() }) }).passthrough(),
  z.object({ status: z.literal('not_requested'), dispatchId: z.string().min(16), measurement: z.null() }).passthrough(),
  z.object({ status: z.literal('timeout_before_delivery'), dispatchId: z.string().min(16), measurement: z.null() }).passthrough(),
  z.object({ status: z.literal('infrastructure_absent'), dispatchId: z.string().min(16), measurement: z.null() }).passthrough(),
  z.object({ status: z.literal('indeterminate'), dispatchId: z.string().min(16), measurement: z.null() }).passthrough(),
]);

const V3_ONLY_FIELDS = [
  'scheduledCellKey', 'dispatchId', 'engineCatalogEvidence', 'turnContextDelivery',
  'turnContextConfiguredCaps', 'hostContextDiagnostic',
] as const;

export interface D569ValidatedObservation {
  readonly lineNumber: number;
  readonly scheduledCellKey: string;
  readonly outcome: D569RawOutcome;
  readonly infrastructure: boolean;
  readonly effectiveSessionId: string | null;
  readonly row: Readonly<Record<string, unknown>>;
}

export const D569_RAW_OUTCOMES = [
  'authorized', 'refused', 'auto_resolved', 'awaiting_dm_adjudication', 'local_error',
  'execution_failed', 'partial_execution', 'service_null', 'infrastructure_failed',
  'integrity_indeterminate',
] as const;
export type D569RawOutcome = (typeof D569_RAW_OUTCOMES)[number];
const outcomeSchema = z.enum(D569_RAW_OUTCOMES);

function historicalCellKey(row: Readonly<Record<string, unknown>>): string {
  if (typeof row['room'] !== 'number' || !Number.isSafeInteger(row['room']) ||
    typeof row['round'] !== 'number' || !Number.isSafeInteger(row['round'])) {
    throw new TypeError('Historical D569 row lacks integer room/round identity.');
  }
  return `${String(row['room'])}:${String(row['round'])}`;
}

function validateV3(row: Readonly<Record<string, unknown>>): void {
  if (row['rowContractVersion'] !== 'arena-row-v3') throw new TypeError('Unknown row contract version.');
  const scheduledCellKey = z.string().regex(/^\d+:[1-9]\d*$/u).parse(row['scheduledCellKey']);
  const dispatchId = z.string().min(16).parse(row['dispatchId']);
  const catalog = catalogSchema.parse(row['engineCatalogEvidence']);
  const delivery = deliverySchema.parse(row['turnContextDelivery']);
  z.object({ baseBytes: z.number().nonnegative(), semanticBytes: z.number().nonnegative() })
    .parse(row['turnContextConfiguredCaps']);
  if (catalog.dispatchId !== dispatchId || delivery.dispatchId !== dispatchId) {
    throw new TypeError(`D569 v3 dispatch correlation failed for ${scheduledCellKey}.`);
  }
  if (scheduledCellKey !== historicalCellKey(row)) {
    throw new TypeError(`D569 v3 scheduled key does not match room/round for ${scheduledCellKey}.`);
  }
  if (row['outcome'] === 'integrity_indeterminate' || catalog.status === 'inconclusive' || delivery.status === 'indeterminate') {
    throw new TypeError(`D569 integrity-indeterminate observation ${scheduledCellKey} cannot enter validation.`);
  }
  if (row['outcome'] === 'infrastructure_failed') {
    if (row['sessionId'] !== null || catalog.status !== 'absent' || delivery.status !== 'infrastructure_absent') {
      throw new TypeError(`Diagnosed infrastructure row ${scheduledCellKey} has inconsistent evidence.`);
    }
  } else if (typeof row['sessionId'] !== 'string' || row['sessionId'].length === 0) {
    throw new TypeError(`Scored v3 row ${scheduledCellKey} requires a real session identity.`);
  }
}

export function validateD569FirstArm(
  rawText: string,
  sidecar: D569ReconciliationSidecar | null = null,
): readonly D569ValidatedObservation[] {
  const lines = rawText.split('\n').filter((line) => line.length > 0);
  const reconciled = sidecar === null ? new Map() : validateReconciliationSidecar(rawText, sidecar);
  const observations = lines.map((line, index): D569ValidatedObservation => {
    const row = recordSchema.parse(JSON.parse(line) as unknown);
    const lineNumber = index + 1;
    const current = Object.prototype.hasOwnProperty.call(row, 'rowContractVersion');
    if (!current && V3_ONLY_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(row, field))) {
      throw new TypeError(`Historical row ${String(lineNumber)} is a partial arena-row-v3 hybrid.`);
    }
    if (current) validateV3(row);
    const scheduledCellKey = current ? String(row['scheduledCellKey']) : historicalCellKey(row);
    const outcome = outcomeSchema.parse(row['outcome']);
    const sessionId = typeof row['sessionId'] === 'string' && row['sessionId'].length > 0
      ? row['sessionId'] : null;
    const reconciliation = reconciled.get(lineNumber);
    if (reconciliation !== undefined && reconciliation.scheduledCellKey !== scheduledCellKey) {
      throw new TypeError(`Reconciliation scheduled key mismatch at raw line ${String(lineNumber)}.`);
    }
    const effectiveSessionId = sessionId ?? reconciliation?.recoveredSessionId ?? null;
    if (!current && effectiveSessionId === null) {
      throw new TypeError(`Historical row ${String(lineNumber)} lacks real or reconciled session identity.`);
    }
    return {
      lineNumber,
      scheduledCellKey,
      outcome,
      infrastructure: outcome === 'infrastructure_failed',
      effectiveSessionId,
      row,
    };
  });
  const keys = observations.map((entry) => entry.scheduledCellKey);
  if (new Set(keys).size !== keys.length) throw new TypeError('D569 rows contain duplicate scheduled cell keys.');
  const expectedKeys = Array.from({ length: 10 }, (_, roomIndex) =>
    [1, 2, 3].map((rep) => `${String(roomIndex + 1)}:${String(rep)}`)).flat();
  if (keys.length !== expectedKeys.length || expectedKeys.some((key) => !keys.includes(key))) {
    throw new TypeError('D569 first-arm grid must contain exactly scheduled keys 1:1 through 10:3.');
  }
  const identities = observations.flatMap((entry) => entry.effectiveSessionId === null ? [] : [entry.effectiveSessionId]);
  if (new Set(identities).size !== identities.length) throw new TypeError('D569 rows contain duplicate session identities.');
  const dispatchIds = observations.flatMap((entry) => {
    const dispatchId = entry.row['dispatchId'];
    return typeof dispatchId === 'string' ? [dispatchId] : [];
  });
  if (new Set(dispatchIds).size !== dispatchIds.length) throw new TypeError('D569 rows contain duplicate dispatch identities.');
  return observations;
}

function main(argv: readonly string[]): void {
  const rawPath = argv[0];
  if (rawPath === undefined) throw new TypeError('Usage: validate-first-arm.ts RAW.jsonl [RECONCILIATION.json]');
  const rawText = readFileSync(rawPath, 'utf8');
  const sidecar = argv[1] === undefined ? null : readReconciliationSidecar(argv[1]);
  const observations = validateD569FirstArm(rawText, sidecar);
  process.stdout.write(`${JSON.stringify({
    status: 'valid', rows: observations.length,
    rawSha256: sha256Text(rawText),
    infrastructureRows: observations.filter((entry) => entry.infrastructure).length,
  })}\n`);
}

if (process.argv[1]?.endsWith('validate-first-arm.ts') === true) main(process.argv.slice(2));
