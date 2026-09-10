import { readFileSync } from 'node:fs';
import {
  validateD569FirstArm,
  type D569RawOutcome,
  type D569ValidatedObservation,
} from './validate-first-arm';
import { readReconciliationSidecar } from './reconciliation';

export type D569AnalysisOutcome =
  | 'executed'
  | 'refused'
  | 'execution_failed'
  | 'service_failed'
  | 'infrastructure_failed';

export interface D569AnalysisCell {
  readonly scheduledCellKey: string;
  readonly outcome: D569AnalysisOutcome;
  readonly score: number | null;
  readonly excluded: boolean;
}

export function analysisOutcome(outcome: D569RawOutcome): D569AnalysisOutcome {
  switch (outcome) {
    case 'authorized': return 'executed';
    case 'refused':
    case 'auto_resolved':
    case 'awaiting_dm_adjudication':
    case 'local_error': return 'refused';
    case 'execution_failed':
    case 'partial_execution': return 'execution_failed';
    case 'service_null': return 'service_failed';
    case 'infrastructure_failed': return 'infrastructure_failed';
    case 'integrity_indeterminate':
      throw new TypeError('Integrity-indeterminate rows cannot enter D569 analysis.');
  }
  outcome satisfies never;
  throw new Error('Unreachable D569 outcome.');
}

export function analysisCells(rows: readonly D569ValidatedObservation[]): readonly D569AnalysisCell[] {
  return rows.map((row) => {
    const outcome = analysisOutcome(row.outcome);
    return {
      scheduledCellKey: row.scheduledCellKey,
      outcome,
      score: outcome === 'executed' ? null : outcome === 'infrastructure_failed' ? null : 0,
      excluded: outcome === 'infrastructure_failed',
    };
  });
}

function main(argv: readonly string[]): void {
  const rawPath = argv[0];
  if (rawPath === undefined) throw new TypeError('Usage: analyze-primary-pair.ts RAW.jsonl [RECONCILIATION.json]');
  const rawText = readFileSync(rawPath, 'utf8');
  const sidecar = argv[1] === undefined ? null : readReconciliationSidecar(argv[1]);
  const cells = analysisCells(validateD569FirstArm(rawText, sidecar));
  process.stdout.write(`${JSON.stringify({
    cells: cells.length,
    scoredFailures: cells.filter((cell) => cell.score === 0).length,
    excludedInfrastructure: cells.filter((cell) => cell.excluded).length,
    results: cells,
  })}\n`);
}

if (process.argv[1]?.endsWith('analyze-primary-pair.ts') === true) main(process.argv.slice(2));
