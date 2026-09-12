import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalJson } from '../../src/commands/canonical-json';
import {
  analyzeD569Pair,
  D569_EXPERIMENT_MANIFEST_PATH,
  type D569AnalysisRow,
  type D569ExperimentBasis,
  type D569ExperimentManifest,
  type D569PairAnalysis,
  type D569PanelComponents,
} from '../d569-blind-experiment';

export const D569_PRIMARY_COMPARISON = 'gpt-5.6-luna-blind-vs-advice' as const;
export const D569_PRIMARY_JUDGES = [
  { seat: 'fable', judge: 'claude-fable-5-1' },
  { seat: 'astra', judge: 'gpt-6-astra' },
  { seat: 'sol', judge: 'gpt-5.6-sol' },
] as const;

const componentLimits = {
  targetPriority: 3, actionEconomy: 3, coherence: 2, positioning: 2,
} as const;
type JsonRecord = Readonly<Record<string, unknown>>;

export interface D569PairedAnalysisDocuments {
  readonly packet: readonly JsonRecord[];
  readonly answerKey: readonly JsonRecord[];
  readonly scoresBySeat: Readonly<Record<(typeof D569_PRIMARY_JUDGES)[number]['seat'], readonly JsonRecord[]>>;
}

function objectValue(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as JsonRecord;
}
function arrayDocument(value: unknown, label: string): readonly JsonRecord[] {
  const rows = Array.isArray(value) ? value : objectValue(value, label)['entries'];
  if (!Array.isArray(rows)) throw new TypeError(`${label}.entries must be an array.`);
  return rows.map((row, index) => objectValue(row, `${label}[${String(index)}]`));
}
function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a nonempty string.`);
  return value;
}
function integerValue(value: unknown, label: string, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`${label} must be an integer in 0..${String(maximum)}.`);
  }
  return value;
}
function indexByBlindId(rows: readonly JsonRecord[], label: string): ReadonlyMap<string, JsonRecord> {
  const indexed = new Map<string, JsonRecord>();
  for (const row of rows) {
    const blindId = stringValue(row['blindId'], `${label}.blindId`);
    if (indexed.has(blindId)) throw new TypeError(`${label} has duplicate ${blindId}.`);
    indexed.set(blindId, row);
  }
  return indexed;
}
function analysisOutcome(value: unknown, label: string): D569AnalysisRow['outcome'] {
  switch (stringValue(value, label)) {
    case 'authorized': return 'executed';
    case 'refused': return 'refused';
    case 'execution_failed': return 'execution_failed';
    case 'service_null': return 'service_failed';
    case 'infrastructure_failed': return 'infrastructure_failed';
    default: throw new TypeError(`${label} is not a registered packet outcome.`);
  }
}

/** Migrated packet/key/panel pipeline. Both-arm key matching precedes infrastructure exclusion. */
export function analyzeRegisteredPrimaryPair(input: {
  readonly manifest: D569ExperimentManifest;
  readonly basis: D569ExperimentBasis;
  readonly documents: D569PairedAnalysisDocuments;
  readonly resamples?: number;
  readonly bootstrapSeed?: number;
}): D569PairAnalysis {
  if (input.manifest.version !== 'd569-blind-experiment-v5' ||
    input.manifest.bootstrap.resamples !== 100_000 || input.manifest.bootstrap.seed !== 569_575) {
    throw new TypeError('D569 analysis manifest version/bootstrap registration mismatch.');
  }
  const comparison = input.manifest.analysisComparisons.find((entry) => entry.id === D569_PRIMARY_COMPARISON);
  if (comparison === undefined || comparison.leftArm !== 'gpt-5.6-luna-blind' ||
    comparison.rightArm !== 'gpt-5.6-luna-advice') {
    throw new TypeError('D569 primary comparison is not registered by the manifest.');
  }
  const packetById = indexByBlindId(input.documents.packet, `${input.basis} packet`);
  const keyById = indexByBlindId(input.documents.answerKey, `${input.basis} answer key`);
  const scoresBySeat = new Map(D569_PRIMARY_JUDGES.map(({ seat }) => [
    seat, indexByBlindId(input.documents.scoresBySeat[seat], `${input.basis} ${seat}`),
  ] as const));
  const allSets = [keyById, ...scoresBySeat.values()];
  if (packetById.size !== 60 || allSets.some((set) => set.size !== 60) ||
    allSets.some((set) => [...packetById.keys()].some((id) => !set.has(id))) ||
    allSets.some((set) => [...set.keys()].some((id) => !packetById.has(id)))) {
    throw new TypeError(`${input.basis} packet, key, and every judge seat must have the same 60 blind IDs.`);
  }
  const pairedKeys = new Map<string, Set<string>>();
  const rows = [...packetById.entries()].map(([blindId, packet]): D569AnalysisRow => {
    const key = keyById.get(blindId);
    if (key === undefined) throw new TypeError(`${input.basis} answer key lacks ${blindId}.`);
    const arm = stringValue(key['arm'], `${input.basis} key ${blindId}.arm`);
    if (arm !== comparison.leftArm && arm !== comparison.rightArm) {
      throw new TypeError(`${input.basis} ${blindId} has unregistered arm ${arm}.`);
    }
    const caseId = stringValue(packet['caseId'], `${input.basis} packet ${blindId}.caseId`);
    const match = /^case-(\d+)-(\d+)$/u.exec(caseId);
    if (match === null) throw new TypeError(`${input.basis} ${blindId} has invalid caseId ${caseId}.`);
    const room = Number(match[1]);
    const rep = Number(match[2]);
    if (!Number.isInteger(room) || room < 1 || room > 10 || !Number.isInteger(rep) || rep < 1 || rep > 3) {
      throw new TypeError(`${input.basis} ${blindId} has out-of-grid caseId ${caseId}.`);
    }
    const pairKey = `${String(room)}:${String(rep)}`;
    pairedKeys.set(pairKey, new Set([...(pairedKeys.get(pairKey) ?? []), arm]));
    const outcome = analysisOutcome(packet['outcome'], `${input.basis} packet ${blindId}.outcome`);
    const seats = outcome === 'executed' ? D569_PRIMARY_JUDGES.map(({ seat, judge }) => {
      const score = scoresBySeat.get(seat)?.get(blindId);
      if (score === undefined) throw new TypeError(`${input.basis} ${seat} lacks ${blindId}.`);
      const components = Object.fromEntries(Object.entries(componentLimits).map(([name, maximum]) => [
        name, integerValue(score[name], `${input.basis} ${seat} ${blindId}.${name}`, maximum),
      ])) as D569PanelComponents;
      const total = integerValue(score['total'], `${input.basis} ${seat} ${blindId}.total`, 10);
      if (total !== components.targetPriority + components.actionEconomy + components.coherence + components.positioning) {
        throw new TypeError(`${input.basis} ${seat} ${blindId} total mismatch.`);
      }
      return { judge, components };
    }) : [];
    return {
      arm, family: 'primary', basis: input.basis,
      seed: (input.basis === 'hard' ? 5_117_000 : 6_203_000) + room,
      rep, outcome, seats,
    };
  });
  if (pairedKeys.size !== 30 || [...pairedKeys.values()].some((arms) =>
    arms.size !== 2 || !arms.has(comparison.leftArm) || !arms.has(comparison.rightArm))) {
    throw new TypeError(`${input.basis} must match both registered arms for every cell before infrastructure exclusion.`);
  }
  return analyzeD569Pair(rows, {
    manifest: input.manifest,
    comparisonId: D569_PRIMARY_COMPARISON,
    family: 'primary', basis: input.basis,
    resamples: input.resamples ?? input.manifest.bootstrap.resamples,
    bootstrapSeed: input.bootstrapSeed ?? input.manifest.bootstrap.seed,
  });
}

function parse(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')) as unknown; }
function main(): void {
  if (process.argv.includes('--verify-only')) { process.stdout.write('D569 ANALYSIS SCRIPT VERIFY PASS\n'); return; }
  const root = process.env['D569_ROOT'];
  const output = process.env['D569_ANALYSIS_OUTPUT'];
  if (root === undefined || output === undefined) throw new TypeError('D569_ROOT and D569_ANALYSIS_OUTPUT are required.');
  const manifest = parse(D569_EXPERIMENT_MANIFEST_PATH) as D569ExperimentManifest;
  const analyses = Object.fromEntries((['hard', 'brutal'] as const).map((basis) => {
    const tag = `luna-blind-vs-advice-${basis}`;
    return [basis, analyzeRegisteredPrimaryPair({ manifest, basis, documents: {
      packet: arrayDocument(parse(`${root}/d569-packet-${tag}.json`), `${basis} packet`),
      answerKey: arrayDocument(parse(`${root}/answer-keys/d569-key-${tag}.json`), `${basis} key`),
      scoresBySeat: Object.fromEntries(D569_PRIMARY_JUDGES.map(({ seat }) => [seat,
        arrayDocument(parse(`${root}/results/normalized-${basis}-${seat}.json`), `${basis} ${seat}`),
      ])) as D569PairedAnalysisDocuments['scoresBySeat'],
    } })] as const;
  }));
  writeFileSync(output, `${canonicalJson({
    manifestVersion: manifest.version, comparisonId: D569_PRIMARY_COMPARISON, family: 'primary',
    scoringSeats: D569_PRIMARY_JUDGES.map(({ judge }) => judge),
    resamples: manifest.bootstrap.resamples, bootstrapSeed: manifest.bootstrap.seed, analyses,
  })}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  process.stdout.write('D569 REGISTERED ANALYSIS PASS comparison=gpt-5.6-luna-blind-vs-advice family=primary bases=hard,brutal\n');
}
if (process.argv[1]?.endsWith('analyze-primary-pair.ts') === true) main();
