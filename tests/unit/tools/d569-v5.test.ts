import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { applyRoomInitiativeProfile } from '../../../src/vtt/room-generator';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import {
  analyzeRegisteredPrimaryPair,
  D569_PRIMARY_JUDGES,
  type D569PairedAnalysisDocuments,
} from '../../../tools/d569-v5/analyze-primary-pair';
import { mergeRepairedHard } from '../../../tools/d569-v5/merge-repaired-hard';
import {
  d569ReconciliationSidecarSchema,
  sha256Text,
  type D569ReconciliationSidecar,
} from '../../../tools/d569-v5/reconciliation';
import {
  D569_HARD_REPLACEMENT_KEYS,
  validateD569FirstArm,
  validateD569RegisteredFirstArm,
} from '../../../tools/d569-v5/validate-first-arm';
import {
  D569_EXPERIMENT_MANIFEST_PATH,
  dryRunD569Experiment,
  type D569DryRunCell,
  type D569ExperimentManifest,
} from '../../../tools/d569-blind-experiment';
import { canonicalD569SecondFamilyRegeneration } from '../../../tools/d569-second-family-manifest';
import { packetOutcome } from '../../../tools/ai-dm-rerun-packet';
import { readFileSync } from '../../helpers/test-filesystem';

const PATCHED_COMMIT = 'd60a0571a4588879c65992a17ab95023911d17c1';
const MANIFEST = JSON.parse(readFileSync(D569_EXPERIMENT_MANIFEST_PATH, 'utf8')) as D569ExperimentManifest;
const access = {
  readText: (path: string): string => readFileSync(path, 'utf8'),
  secondFamilyAccess: {
    readFixture: (path: string): string => readFileSync(path, 'utf8'),
    regenerate: canonicalD569SecondFamilyRegeneration,
  },
};
const CELLS = dryRunD569Experiment(MANIFEST, access).filter((cell) =>
  cell.arm === 'gpt-5.6-luna-blind');

function historical(room: number, rep: number, sessionId: string | null) {
  return { room, round: rep, outcome: 'authorized', sessionId };
}

function current(cell: D569DryRunCell, outcome: 'authorized' | 'service_null' | 'infrastructure_failed') {
  const room = cell.seed - (cell.basis === 'hard' ? 5_117_000 : 6_203_000);
  const scheduledCellKey = `${String(room)}:${String(cell.rep)}`;
  const dispatchId = `engine-dispatch:grid-${String(room)}-${String(cell.rep)}-0001`;
  const infrastructure = outcome === 'infrastructure_failed';
  const delivered = outcome === 'authorized';
  const boardSha = sha256(`board:${cell.basis}:${scheduledCellKey}`);
  const catalog = infrastructure
    ? { status: 'absent' as const, basis: 'required_engine_initialization_failed' as const, dispatchId, corroboration: ['startup failed'] }
    : { status: 'ready' as const, basis: 'required_cli_completed_with_valid_catalog' as const, dispatchId, advertisedInvocationCount: 0, resourceOperationCount: 0 };
  const delivery = infrastructure
    ? { status: 'infrastructure_absent' as const, dispatchId, measurement: null }
    : delivered
      ? { status: 'delivered' as const, dispatchId, contextSha256: 'a'.repeat(64), measurement: { baseBytes: 100, semanticBytes: 10 } }
      : { status: 'not_requested' as const, dispatchId, reason: 'catalog_ready_model_did_not_fetch' as const, measurement: null };
  const state = applyRoomInitiativeProfile(decodeArenaFixtureText(readFileSync(cell.fixturePath, 'utf8')), 'derived_v1');
  return {
    rowContractVersion: 'arena-row-v3', arm: 'single', basis: cell.basis, seed: cell.seed,
    room, round: cell.rep, scheduledCellKey, dispatchId, outcome,
    sessionId: infrastructure ? null : `agent-session:grid-${String(room)}-${String(cell.rep)}`,
    repoCommit: PATCHED_COMMIT, cli: 'codex', model: cell.model, effort: cell.effort,
    dmMode: 'blind', blindRepairArm: 'code_only', blindMaxAttempts: 3, blindFacts: false,
    decisionTransport: 'mcp_minimal', instructionSource: 'kb', escalated: false,
    escalationModel: null, escalationEffort: null, midRoundAdjustmentsEnabled: false, fallbackReason: null, planner: 'model',
    startingRoomDigest: sha256(canonicalJson(state)), kbHash: cell.sharedKbHash,
    sharedKbComponentHashes: MANIFEST.sharedKb.componentHashes,
    boardImage: { mode: 'png', sha256: boardSha },
    visualProfile: {
      primerVersion: MANIFEST.visualPins.blind.primerVersion,
      images: [{ role: MANIFEST.visualPins.blind.imageRole, sha256: boardSha, ordinal: 1 }],
      glyphMode: MANIFEST.visualPins.blind.glyphMode,
      captureTilePx: MANIFEST.visualPins.blind.captureTilePx,
    },
    engineCatalogEvidence: catalog,
    turnContextDelivery: delivery,
    turnContextConfiguredCaps: { baseBytes: cell.baseContextCapBytes, semanticBytes: cell.semanticContextCapBytes },
    hostContextDiagnostic: null,
    ...(infrastructure ? { failingDispatch: {
      phase: 'primary' as const, exit: 'infrastructure_failed' as const, dispatchId,
      engineCatalogEvidence: catalog, turnContextDelivery: delivery, failureReason: 'startup failed',
    } } : {}),
    baseContextBytes: delivered ? 100 : null,
    semanticBoardBytes: delivered ? 10 : null,
    rawTurnContext: delivered ? '{}' : null,
    preTrimBytes: delivered ? 100 : null,
    postTrimBytes: delivered ? 100 : null,
    turnContextGranularity: delivered ? 'full' : null,
    optionsOmittedForSize: 0, optionsOmittedForSizeByActor: [], roundTotals: { contextBytes: delivered ? 2 : 0 },
    blindIngressAudit: delivered
      ? { version: 2, status: 'complete', passed: true, forbiddenContentPassed: true, delivery }
      : { version: 2, status: 'incomplete', passed: false, forbiddenContentPassed: true, delivery, missingRequiredFields: ['turn_context'] },
    ...(delivered ? { turnContextBudget: {
      configuredBaseBytes: cell.baseContextCapBytes,
      configuredSemanticBytes: cell.semanticContextCapBytes,
      actualBaseBytes: 100, actualSemanticBytes: 10, truncatedBlocks: [],
    } } : {}),
  };
}

function raw(lines: readonly Readonly<Record<string, unknown>>[]): string {
  return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`;
}

function reconciliation(source: string): D569ReconciliationSidecar {
  const lines = source.trimEnd().split('\n');
  const entries = ([6, 19, 20] as const).map((rawLineNumber) => {
    const line = lines[rawLineNumber - 1];
    if (line === undefined) throw new Error('Fixture raw line is absent.');
    const row = JSON.parse(line) as Readonly<Record<string, unknown>>;
    return {
      rawLineNumber, rawLineSha256: sha256Text(line),
      scheduledCellKey: `${String(row['room'])}:${String(row['round'])}`,
      recoveredSessionId: `recovered-session-${String(rawLineNumber)}`,
      rolloutPath: `/evidence/rollout-${String(rawLineNumber)}.jsonl`,
      rolloutSha256: String(rawLineNumber).padStart(64, '0'),
      reviewerApproval: { reviewer: 'independent-reviewer', approvedAt: '2026-09-09T20:00:00.000Z', decision: 'approved' as const },
    };
  });
  return d569ReconciliationSidecarSchema.parse({
    version: 'd569-reconciliation-v1', rawFileSha256: sha256Text(source), entries,
  });
}

function mutateFirst(source: string, mutation: (row: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>): string {
  const rows = source.trimEnd().split('\n').map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
  const first = rows[0];
  if (first === undefined) throw new Error('Mutation fixture is empty.');
  rows[0] = mutation(first);
  return raw(rows);
}

function retainedHistorical(cell: D569DryRunCell, lineNumber: number): Readonly<Record<string, unknown>> {
  const source = current(cell, 'authorized') as Readonly<Record<string, unknown>>;
  const v3Fields = new Set([
    'rowContractVersion', 'scheduledCellKey', 'dispatchId', 'engineCatalogEvidence', 'turnContextDelivery',
    'turnContextConfiguredCaps', 'hostContextDiagnostic', 'failingDispatch',
  ]);
  return {
    ...Object.fromEntries(Object.entries(source).filter(([key]) => !v3Fields.has(key))),
    repoCommit: '90484d453b7b6d1fe63ed28c0a53570a80e158e6',
    sessionId: [6, 19, 20].includes(lineNumber) ? null : `historical-session-${String(lineNumber)}`,
  };
}

function pairedDocuments(rows: readonly ReturnType<typeof current>[]): D569PairedAnalysisDocuments {
  const packet: Readonly<Record<string, unknown>>[] = [];
  const answerKey: Readonly<Record<string, unknown>>[] = [];
  const scores = Object.fromEntries(D569_PRIMARY_JUDGES.map(({ seat }) => [seat, [] as Readonly<Record<string, unknown>>[]])) as {
    [Seat in (typeof D569_PRIMARY_JUDGES)[number]['seat']]: Readonly<Record<string, unknown>>[];
  };
  for (const row of rows) {
    for (const arm of ['gpt-5.6-luna-blind', 'gpt-5.6-luna-advice'] as const) {
      const blindId = `${arm}:${row.scheduledCellKey}`;
      const outcome = arm.endsWith('-blind') ? packetOutcome(row.outcome) : 'authorized';
      packet.push({ blindId, caseId: `case-${String(row.room)}-${String(row.round)}`, outcome });
      answerKey.push({ blindId, arm });
      for (const { seat } of D569_PRIMARY_JUDGES) {
        scores[seat].push({ blindId, targetPriority: 2, actionEconomy: 2, coherence: 1, positioning: 1, total: 6 });
      }
    }
  }
  return { packet, answerKey, scoresBySeat: scores };
}

const BRUTAL_SOURCE = raw(CELLS.filter((cell) => cell.basis === 'brutal').map((cell, index) => {
  const row = current(cell, index === 7 ? 'infrastructure_failed' : 'authorized');
  return index === 7 ? { ...row, sessionId: 'observed-before-engine-startup-failed' } : row;
}));

function validateBrutal(rawText: string, manifest = MANIFEST) {
  return validateD569RegisteredFirstArm({
    rawText, basis: 'brutal', cliVersion: 'codex-cli 0.153.4', patchedCommit: PATCHED_COMMIT, manifest,
  });
}

describe('D569 v5 replacement validation and paired analysis tools', () => {
  it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
    const originalRows = Array.from({ length: 10 }, (_, roomIndex) => [1, 2, 3].map((rep) => historical(
      roomIndex + 1, rep,
      [6, 19, 20].includes(roomIndex * 3 + rep) ? null : `historical-session-${String(roomIndex + 1)}-${String(rep)}`,
    ))).flat();
    const original = raw(originalRows);
    const sidecar = reconciliation(original);
    const hardCells = CELLS.filter((cell) => cell.basis === 'hard');
    const replacements = raw(D569_HARD_REPLACEMENT_KEYS.map((key) => {
      const cell = hardCells.find((candidate) => `${String(candidate.seed - 5_117_000)}:${String(candidate.rep)}` === key);
      if (cell === undefined) throw new Error(`Missing hard replacement cell ${key}.`);
      return current(cell, key === '2:1' ? 'infrastructure_failed' : key === '4:1' ? 'service_null' : 'authorized');
    }));
    const mixed = mergeRepairedHard(original, replacements);
    const originalLines = original.trimEnd().split('\n');
    const mixedLines = mixed.trimEnd().split('\n');
    expect(mixedLines.filter((line, index) => line === originalLines[index])).toHaveLength(27);
    expect(validateD569FirstArm(mixed, sidecar)).toHaveLength(30);
  });

  it('migrates every registered validator invariant for a complete current brutal grid', () => {
    expect(validateBrutal(BRUTAL_SOURCE)).toHaveLength(30);
  });

  it('validates registered hard replacements against retained original cells and reconciliation provenance', () => {
    const hardCells = CELLS.filter((cell) => cell.basis === 'hard');
    const original = raw(hardCells.map((cell, index) => retainedHistorical(cell, index + 1)));
    const sidecar = reconciliation(original);
    const replacements = raw(D569_HARD_REPLACEMENT_KEYS.map((key) => {
      const [roomText, repText] = key.split(':');
      const seed = 5_117_000 + Number(roomText);
      const cell = hardCells.find((candidate) => candidate.seed === seed && candidate.rep === Number(repText));
      if (cell === undefined) throw new Error(`Missing registered hard replacement ${key}.`);
      return current(cell, 'authorized');
    }));
    const merged = mergeRepairedHard(original, replacements);
    expect(validateD569RegisteredFirstArm({
      rawText: merged, basis: 'hard', cliVersion: 'codex-cli 0.153.4',
      patchedCommit: PATCHED_COMMIT, sidecar,
    })).toHaveLength(30);
  });

  it('rejects registered seed mutations', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({ ...row, seed: 123 })))).toThrow('Unregistered');
  });

  it('rejects registered fixture-state mutations', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({ ...row, startingRoomDigest: '0'.repeat(64) }))))
      .toThrow('fixture state');
  });

  it('rejects registered code-cohort mutations', () => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({ ...row, repoCommit: 'f'.repeat(40) }))))
      .toThrow('Code-cohort');
  });

  it.each([
    ['model', (row: Readonly<Record<string, unknown>>) => ({ ...row, model: 'gpt-5.6-sol' }), 'launch provenance'],
    ['effort', (row: Readonly<Record<string, unknown>>) => ({ ...row, effort: 'medium' }), 'launch provenance'],
    ['KB hash', (row: Readonly<Record<string, unknown>>) => ({ ...row, kbHash: '0'.repeat(64) }), 'KB provenance'],
    ['KB components', (row: Readonly<Record<string, unknown>>) => ({
      ...row, sharedKbComponentHashes: { root: '0'.repeat(64) },
    }), 'KB provenance'],
    ['visual pin', (row: Readonly<Record<string, unknown>>) => ({
      ...row,
      visualProfile: { ...row['visualProfile'] as Readonly<Record<string, unknown>>, glyphMode: 'letters' },
    }), 'visual provenance'],
  ] as const)('rejects registered %s provenance mutations', (_label, mutate, message) => {
    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, mutate))).toThrow(message);
  });

  it('rejects registered manifest mutations before accepting rows', () => {
    const changedManifest: D569ExperimentManifest = {
      ...MANIFEST,
      sharedKb: { ...MANIFEST.sharedKb, combinedStartupHash: '0'.repeat(64) },
    };
    expect(() => validateBrutal(BRUTAL_SOURCE, changedManifest)).toThrow('registered manifest is invalid');
  });

  it('runs raw outcomes through packet/key construction and the registered paired scorer', () => {
    const rawRows = CELLS.filter((cell) => cell.basis === 'brutal').map((cell, index) =>
      current(cell, index === 3 ? 'infrastructure_failed' : index === 8 ? 'service_null' : 'authorized'));
    const documents = pairedDocuments(rawRows);
    const result = analyzeRegisteredPrimaryPair({
      manifest: MANIFEST, basis: 'brutal', documents, resamples: 20, bootstrapSeed: 569_575,
    });
    expect(documents.packet).toHaveLength(60);
    expect(documents.answerKey).toHaveLength(60);
    expect(result.left.counts).toMatchObject({ infrastructureFailed: 1, serviceFailed: 1 });
    expect(result.pairedZeroInclusive.total.count).toBe(29);
    const mismatched = { ...documents, answerKey: documents.answerKey.slice(1) };
    expect(() => analyzeRegisteredPrimaryPair({
      manifest: MANIFEST, basis: 'brutal', documents: mismatched, resamples: 20,
    })).toThrow('same 60 blind IDs');
  });
});
