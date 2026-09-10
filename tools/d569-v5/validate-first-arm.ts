import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { canonicalJson } from '../../src/commands/canonical-json';
import { applyRoomInitiativeProfile } from '../../src/vtt/room-generator';
import { decodeArenaFixtureText } from '../../src/vtt/mcp/entrypoint';
import { d569DeliveryHasIntegritySignal } from '../../src/vtt/turn-context-delivery';
import { canonicalD569SecondFamilyRegeneration } from '../d569-second-family-manifest';
import {
  D569_EXPERIMENT_MANIFEST_PATH,
  dryRunD569Experiment,
  validateD569ExperimentManifest,
  validateD569ObservedRows,
  type D569ExperimentManifest,
  type D569ObservedRow,
} from '../d569-blind-experiment';
import {
  readReconciliationSidecar,
  sha256Text,
  validateReconciliationSidecar,
  type D569ReconciliationSidecar,
} from './reconciliation';

const recordSchema = z.record(z.string(), z.unknown());
const safeIntegerSchema = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const catalogSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ready'),
    basis: z.enum(['advertised_tool_invoked', 'required_cli_completed_with_valid_catalog']),
    dispatchId: z.string().min(16), advertisedInvocationCount: safeIntegerSchema.nonnegative(),
    resourceOperationCount: safeIntegerSchema.nonnegative(),
  }).strict(),
  z.object({
    status: z.literal('absent'), basis: z.literal('required_engine_initialization_failed'),
    dispatchId: z.string().min(16), corroboration: z.array(z.string()),
  }).strict(),
  z.object({
    status: z.literal('inconclusive'), dispatchId: z.string().min(16),
    reason: z.enum(['no_correlated_catalog', 'invalid_catalog_response', 'missing_live_timestamp',
      'conflicting_success_and_failure', 'timestamp_only']),
  }).strict(),
]);
const deliverySchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('delivered'), dispatchId: z.string().min(16),
    contextSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    measurement: z.object({ baseBytes: z.number().nonnegative(), semanticBytes: z.number().nonnegative() }).strict(),
  }).strict(),
  z.object({
    status: z.literal('not_requested'), dispatchId: z.string().min(16),
    reason: z.enum(['catalog_ready_model_did_not_fetch', 'dispatch_cancelled']), measurement: z.null(),
  }).strict(),
  z.object({ status: z.literal('timeout_before_delivery'), dispatchId: z.string().min(16), measurement: z.null() }).strict(),
  z.object({ status: z.literal('infrastructure_absent'), dispatchId: z.string().min(16), measurement: z.null() }).strict(),
  z.object({
    status: z.literal('indeterminate'), dispatchId: z.string().min(16),
    reason: z.literal('catalog_inconclusive_empty_context_spool'), measurement: z.null(),
    integrityAction: z.literal('stop_after_persist'),
  }).strict(),
]);
const hostContextDiagnosticSchema = z.union([
  z.object({ status: z.literal('rendered'), contextSha256: z.string().regex(/^[a-f0-9]{64}$/u) }).strict(),
  z.object({ status: z.literal('unavailable'), errorClass: z.string().min(1) }).strict(),
  z.null(),
]);
const failingDispatchSchema = z.object({
  phase: z.enum(['primary', 'correction', 'adjustment', 'speculative', 'speculation_recalculation']),
  exit: z.enum(['cancelled', 'infrastructure_failed']),
  dispatchId: z.string().min(16),
  engineCatalogEvidence: catalogSchema,
  turnContextDelivery: deliverySchema,
  failureReason: z.string(),
}).strict();

export const D569_ORIGINAL_COMMIT = '90484d453b7b6d1fe63ed28c0a53570a80e158e6' as const;
export const D569_HARD_REPLACEMENT_KEYS = ['2:1', '4:1', '8:1'] as const;

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
  hostContextDiagnosticSchema.parse(row['hostContextDiagnostic']);
  if (catalog.dispatchId !== dispatchId || delivery.dispatchId !== dispatchId) {
    throw new TypeError(`D569 v3 dispatch correlation failed for ${scheduledCellKey}.`);
  }
  if (scheduledCellKey !== historicalCellKey(row)) {
    throw new TypeError(`D569 v3 scheduled key does not match room/round for ${scheduledCellKey}.`);
  }
  if (row['outcome'] === 'integrity_indeterminate' || d569DeliveryHasIntegritySignal(catalog, delivery)) {
    throw new TypeError(`D569 integrity-indeterminate observation ${scheduledCellKey} cannot enter validation.`);
  }
  if ((catalog.status === 'absent') !== (delivery.status === 'infrastructure_absent')) {
    throw new TypeError(`D569 v3 ${scheduledCellKey} has inconsistent catalog/delivery absence evidence.`);
  }
  if ((catalog.status === 'absent' || delivery.status === 'not_requested' && delivery.reason === 'dispatch_cancelled') &&
    row['outcome'] !== 'infrastructure_failed') {
    throw new TypeError(`D569 v3 ${scheduledCellKey} has infrastructure evidence without an infrastructure outcome.`);
  }
  if (row['outcome'] === 'infrastructure_failed') {
    const failure = failingDispatchSchema.parse(row['failingDispatch']);
    if (failure.dispatchId !== failure.engineCatalogEvidence.dispatchId ||
      failure.dispatchId !== failure.turnContextDelivery.dispatchId ||
      failure.exit === 'cancelled' && failure.turnContextDelivery.status !== 'delivered' &&
        (failure.turnContextDelivery.status !== 'not_requested' ||
          failure.turnContextDelivery.reason !== 'dispatch_cancelled') ||
      failure.exit === 'infrastructure_failed' && (failure.engineCatalogEvidence.status !== 'absent' ||
        failure.turnContextDelivery.status !== 'infrastructure_absent')) {
      throw new TypeError(`Diagnosed infrastructure row ${scheduledCellKey} has inconsistent evidence.`);
    }
    if (failure.phase === 'primary' && (failure.dispatchId !== dispatchId ||
      canonicalJson(failure.engineCatalogEvidence) !== canonicalJson(catalog) ||
      canonicalJson(failure.turnContextDelivery) !== canonicalJson(delivery))) {
      throw new TypeError(`Primary failure evidence diverges from primary delivery at ${scheduledCellKey}.`);
    }
    if (failure.phase !== 'primary' && failure.dispatchId === dispatchId) {
      throw new TypeError(`Later failure reused the primary dispatch identity at ${scheduledCellKey}.`);
    }
    if (failure.exit === 'cancelled' && row['fallbackReason'] !== 'dispatch_cancelled') {
      throw new TypeError(`Cancelled dispatch ${scheduledCellKey} lacks dispatch_cancelled attribution.`);
    }
  } else if (row['failingDispatch'] !== undefined) {
    throw new TypeError(`Non-infrastructure row ${scheduledCellKey} cannot identify a failing dispatch.`);
  } else if (typeof row['sessionId'] !== 'string' || row['sessionId'].length === 0) {
    throw new TypeError(`Scored v3 row ${scheduledCellKey} requires a real session identity.`);
  }
  const delivered = delivery.status === 'delivered';
  for (const field of ['baseContextBytes', 'semanticBoardBytes', 'rawTurnContext', 'preTrimBytes',
    'postTrimBytes', 'turnContextGranularity'] as const) {
    if (delivered === (row[field] === null || row[field] === undefined)) {
      throw new TypeError(`D569 v3 ${scheduledCellKey} has delivery-inconsistent ${field}.`);
    }
  }
  if (!delivered) {
    const roundTotals = objectValue(row['roundTotals'], 'roundTotals');
    if (roundTotals['contextBytes'] !== 0 || row['optionsOmittedForSize'] !== 0 ||
      !Array.isArray(row['optionsOmittedForSizeByActor']) || row['optionsOmittedForSizeByActor'].length !== 0) {
      throw new TypeError(`D569 v3 ${scheduledCellKey} has nonzero telemetry without delivered context.`);
    }
  }
  const audit = row['blindIngressAudit'];
  if (typeof audit === 'object' && audit !== null && !Array.isArray(audit)) {
    const auditRecord = audit as Readonly<Record<string, unknown>>;
    if (auditRecord['version'] === 2 && auditRecord['forbiddenContentPassed'] !== true) {
      throw new TypeError(`D569 v3 ${scheduledCellKey} has a forbidden-content ingress violation.`);
    }
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
  const failureDispatchIds = observations.flatMap((entry) => {
    const failure = entry.row['failingDispatch'];
    if (typeof failure !== 'object' || failure === null || Array.isArray(failure)) return [];
    const dispatchId = (failure as Readonly<Record<string, unknown>>)['dispatchId'];
    return typeof dispatchId === 'string' && dispatchId !== entry.row['dispatchId'] ? [dispatchId] : [];
  });
  const allDispatchIds = [...dispatchIds, ...failureDispatchIds];
  if (new Set(allDispatchIds).size !== allDispatchIds.length) {
    throw new TypeError('D569 rows contain duplicate dispatch identities.');
  }
  return observations;
}

export interface D569RegisteredFirstArmInput {
  readonly rawText: string;
  readonly basis: 'hard' | 'brutal';
  readonly cliVersion: string;
  readonly patchedCommit: string;
  readonly projectRoot?: string;
  readonly sidecar?: D569ReconciliationSidecar | null;
  readonly manifest?: D569ExperimentManifest;
}

function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a nonempty string.`);
  return value;
}

function requiredInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new TypeError(`${label} must be an integer.`);
  return value;
}

/** Validates the registered D569 arm, including every launch/input invariant from the pinned validator. */
export function validateD569RegisteredFirstArm(
  input: D569RegisteredFirstArmInput,
): readonly D569ValidatedObservation[] {
  const projectRoot = input.projectRoot ?? process.cwd();
  const readProjectText = (path: string): string => readFileSync(resolve(projectRoot, path), 'utf8');
  const manifest = input.manifest ??
    JSON.parse(readProjectText(D569_EXPERIMENT_MANIFEST_PATH)) as D569ExperimentManifest;
  const access = {
    readText: readProjectText,
    secondFamilyAccess: {
      readFixture: readProjectText,
      regenerate: canonicalD569SecondFamilyRegeneration,
    },
  };
  const manifestViolations = validateD569ExperimentManifest(manifest, access);
  if (manifestViolations.length !== 0) {
    throw new TypeError(`D569 registered manifest is invalid: ${JSON.stringify(manifestViolations)}`);
  }
  const registeredCells = dryRunD569Experiment(manifest, access).filter((cell) =>
    cell.arm === 'gpt-5.6-luna-blind' && cell.basis === input.basis);
  const observations = validateD569FirstArm(input.rawText, input.sidecar ?? null);
  const cellsByKey = new Map(registeredCells.map((cell) => [
    `${String(cell.seed)}:${String(cell.rep)}`, cell,
  ] as const));
  const visualPin = manifest.visualPins.blind;
  const observedRows: D569ObservedRow[] = observations.map((observation): D569ObservedRow => {
    const row = observation.row;
    const seed = requiredInteger(row['seed'], `row ${String(observation.lineNumber)} seed`);
    const rep = requiredInteger(row['round'], `row ${String(observation.lineNumber)} round`);
    const cell = cellsByKey.get(`${String(seed)}:${String(rep)}`);
    if (cell === undefined) throw new TypeError(`Unregistered ${input.basis} seed/rep ${String(seed)}:${String(rep)}.`);
    if (row['basis'] !== input.basis || row['arm'] !== 'single' || row['room'] !== seed -
      (input.basis === 'hard' ? 5_117_000 : 6_203_000)) {
      throw new TypeError(`Registered basis/seed/room mismatch at ${observation.scheduledCellKey}.`);
    }
    const current = row['rowContractVersion'] === 'arena-row-v3';
    const expectedCurrent = input.basis === 'brutal' ||
      D569_HARD_REPLACEMENT_KEYS.includes(observation.scheduledCellKey as (typeof D569_HARD_REPLACEMENT_KEYS)[number]);
    if (current !== expectedCurrent) {
      throw new TypeError(`Code-cohort split mismatch at ${observation.scheduledCellKey}.`);
    }
    const expectedCommit = current ? input.patchedCommit : D569_ORIGINAL_COMMIT;
    if (row['repoCommit'] !== expectedCommit) {
      throw new TypeError(`Code-cohort revision mismatch at ${observation.scheduledCellKey}.`);
    }
    const loadedState = applyRoomInitiativeProfile(
      decodeArenaFixtureText(readProjectText(cell.fixturePath)),
      'derived_v1',
    );
    if (row['startingRoomDigest'] !== sha256Text(canonicalJson(loadedState))) {
      throw new TypeError(`Loaded fixture state mismatch at ${observation.scheduledCellKey}.`);
    }
    if (row['cli'] !== 'codex' || row['model'] !== cell.model || row['effort'] !== cell.effort ||
      row['dmMode'] !== 'blind' || row['blindRepairArm'] !== 'code_only' ||
      row['blindMaxAttempts'] !== 3 || row['blindFacts'] !== false ||
      row['decisionTransport'] !== 'mcp_minimal' || row['instructionSource'] !== 'kb' ||
      row['escalated'] !== false || row['escalationModel'] !== null ||
      row['escalationEffort'] !== null ||
      row['midRoundAdjustmentsEnabled'] !== false) {
      throw new TypeError(`Registered launch provenance mismatch at ${observation.scheduledCellKey}.`);
    }
    if (row['kbHash'] !== cell.sharedKbHash ||
      canonicalJson(row['sharedKbComponentHashes']) !== canonicalJson(manifest.sharedKb.componentHashes)) {
      throw new TypeError(`Registered KB provenance mismatch at ${observation.scheduledCellKey}.`);
    }
    const visualProfile = objectValue(row['visualProfile'], 'visualProfile');
    const images = visualProfile['images'];
    const boardImage = objectValue(row['boardImage'], 'boardImage');
    const visualDescriptor = {
      informationMode: 'blind_state',
      primerVersion: visualProfile['primerVersion'],
      imageRole: Array.isArray(images) ? objectValue(images[0], 'visualProfile.images[0]')['role'] : null,
      glyphMode: visualProfile['glyphMode'],
      captureTilePx: visualProfile['captureTilePx'],
    };
    if (boardImage['mode'] !== 'png' || canonicalJson(visualDescriptor) !== canonicalJson(visualPin) || !Array.isArray(images) ||
      images.length !== 1 || objectValue(images[0], 'visualProfile.images[0]')['sha256'] !== boardImage['sha256']) {
      throw new TypeError(`Registered visual provenance mismatch at ${observation.scheduledCellKey}.`);
    }
    const ingressAudit = objectValue(row['blindIngressAudit'], 'blindIngressAudit');
    if (current) {
      const deliveryStatus = deliverySchema.parse(row['turnContextDelivery']).status;
      const delivered = deliveryStatus === 'delivered';
      if (ingressAudit['version'] !== 2 || ingressAudit['forbiddenContentPassed'] !== true ||
        (delivered && (ingressAudit['status'] !== 'complete' || ingressAudit['passed'] !== true)) ||
        (!delivered && (ingressAudit['status'] !== 'incomplete' || ingressAudit['passed'] !== false))) {
        throw new TypeError(`Registered ingress provenance mismatch at ${observation.scheduledCellKey}.`);
      }
    } else if (ingressAudit['passed'] !== true) {
      throw new TypeError(`Historical ingress provenance mismatch at ${observation.scheduledCellKey}.`);
    }
    const caps = current
      ? objectValue(row['turnContextConfiguredCaps'], 'turnContextConfiguredCaps')
      : objectValue(row['turnContextBudget'], 'turnContextBudget');
    const baseCap = current ? caps['baseBytes'] : caps['configuredBaseBytes'];
    const semanticCap = current ? caps['semanticBytes'] : caps['configuredSemanticBytes'];
    if (baseCap !== cell.baseContextCapBytes || semanticCap !== cell.semanticContextCapBytes) {
      throw new TypeError(`Registered context caps mismatch at ${observation.scheduledCellKey}.`);
    }
    const truncatedBlocks = row['turnContextBudget'] === undefined
      ? []
      : objectValue(row['turnContextBudget'], 'turnContextBudget')['truncatedBlocks'];
    if (!Array.isArray(truncatedBlocks) || truncatedBlocks.some((entry) => typeof entry !== 'string')) {
      throw new TypeError(`Invalid truncation provenance at ${observation.scheduledCellKey}.`);
    }
    const boardHash = requiredString(boardImage['sha256'], 'boardImage.sha256');
    return {
      arm: cell.arm, cli: 'codex', cliVersion: input.cliVersion,
      model: cell.model, effort: cell.effort, family: cell.family, basis: cell.basis,
      seed, rep, sessionId: observation.effectiveSessionId,
      outcome: observation.outcome === 'auto_resolved' || observation.outcome === 'awaiting_dm_adjudication' ||
        observation.outcome === 'local_error' ? 'refused' : observation.outcome,
      scheduledCellKey: observation.scheduledCellKey,
      ...(typeof row['dispatchId'] === 'string' ? { dispatchId: row['dispatchId'] } : {}),
      ...(current ? {
        engineCatalogEvidence: catalogSchema.parse(row['engineCatalogEvidence']),
        turnContextDelivery: deliverySchema.parse(row['turnContextDelivery']),
      } : {}),
      ...(current && row['failingDispatch'] !== undefined ? {
        failingDispatch: (() => {
            const failure = failingDispatchSchema.parse(row['failingDispatch']);
            return {
              dispatchId: failure.dispatchId,
              exit: failure.exit,
              engineCatalogEvidence: { status: failure.engineCatalogEvidence.status },
              turnContextDelivery: { status: failure.turnContextDelivery.status },
            };
          })(),
      } : {}),
      timeoutMs: cell.timeoutMs,
      escalationModel: row['escalationModel'] === null ? null : requiredString(row['escalationModel'], 'escalationModel'),
      modelDefaultFallback: observation.infrastructure ? false : row['planner'] === 'engine_default',
      stateHash: cell.stateHash,
      sharedKbHash: requiredString(row['kbHash'], 'kbHash'),
      visualSourceHash: cell.visualSourceHash,
      visualProfileHash: cell.visualProfileHash,
      visualArtifactHash: boardHash,
      baseContextCapBytes: requiredInteger(baseCap, 'base context cap'),
      semanticContextCapBytes: requiredInteger(semanticCap, 'semantic context cap'),
      truncatedBlocks: truncatedBlocks as readonly string[],
    };
  });
  const violations = validateD569ObservedRows(registeredCells, observedRows);
  if (violations.length !== 0) throw new TypeError(JSON.stringify(violations, null, 2));
  return observations;
}

function main(argv: readonly string[]): void {
  const rawPath = argv[0];
  const basis = argv[1];
  const cliVersion = process.env['D569_CLI_VERSION'];
  const patchedCommit = process.env['D569_PATCHED_COMMIT'];
  if (rawPath === undefined || (basis !== 'hard' && basis !== 'brutal') ||
    cliVersion === undefined || patchedCommit === undefined) {
    throw new TypeError('Usage: validate-first-arm.ts RAW.jsonl hard|brutal [RECONCILIATION.json], with D569_CLI_VERSION and D569_PATCHED_COMMIT');
  }
  const rawText = readFileSync(rawPath, 'utf8');
  const sidecar = argv[2] === undefined ? null : readReconciliationSidecar(argv[2]);
  const observations = validateD569RegisteredFirstArm({ rawText, basis, cliVersion, patchedCommit, sidecar });
  process.stdout.write(`${JSON.stringify({
    status: 'valid', rows: observations.length,
    rawSha256: sha256Text(rawText),
    infrastructureRows: observations.filter((entry) => entry.infrastructure).length,
  })}\n`);
}

if (process.argv[1]?.endsWith('validate-first-arm.ts') === true) main(process.argv.slice(2));
