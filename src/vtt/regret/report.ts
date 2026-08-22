import type { ExperimentTableRecordV6 } from '../experiment-telemetry';
import {
  evaluateCapture,
  REGRET_ORACLE_VERSION,
  type CaptureRegretResult,
} from './rollout';

export const REGRET_SCALARIZATION =
  'Per capture: outcome*(maxSideHP+1)*(maxResources+1) + sideHP*(maxResources+1) + resources; bounds come from the captured initial state, preserving the lexicographic ordering exactly.';

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const upper = ordered[middle];
  if (upper === undefined) return 0;
  if (ordered.length % 2 === 1) return upper;
  const lower = ordered[middle - 1];
  return lower === undefined ? upper : (lower + upper) / 2;
}

export interface TableRegretAggregate {
  readonly decisionCount: number;
  readonly meanScalarRegret: number;
  readonly medianScalarRegret: number;
  readonly percentOptimalDecisions: number;
  readonly meanCollapseFactor: number;
  readonly truncationDecisionCount: number;
  readonly droppedCandidateCount: number;
}

export interface TableRegretReport {
  readonly schemaVersion: 1;
  readonly oracleVersion: typeof REGRET_ORACLE_VERSION;
  readonly sourceFile: string;
  readonly tableIndex: number;
  readonly armId: string;
  readonly scalarization: typeof REGRET_SCALARIZATION;
  readonly aggregate: TableRegretAggregate;
  readonly decisions: readonly CaptureRegretResult[];
}

export function aggregateDecisions(
  decisions: readonly CaptureRegretResult[],
): TableRegretAggregate {
  const regrets = decisions.map((decision) => decision.scalarRegret);
  return {
    decisionCount: decisions.length,
    meanScalarRegret: mean(regrets),
    medianScalarRegret: median(regrets),
    percentOptimalDecisions: decisions.length === 0
      ? 0
      : decisions.filter((decision) => decision.scalarRegret === 0).length * 100 / decisions.length,
    meanCollapseFactor: mean(decisions.map((decision) => decision.collapse.collapseFactor)),
    truncationDecisionCount: decisions.filter((decision) => decision.truncated).length,
    droppedCandidateCount: decisions.reduce(
      (total, decision) => total + decision.droppedCandidateCount,
      0,
    ),
  };
}

export async function evaluateTable(
  sourceFile: string,
  table: ExperimentTableRecordV6,
  onDecision?: (completed: number, total: number) => void,
): Promise<TableRegretReport> {
  const decisions: CaptureRegretResult[] = [];
  for (const capture of table.quality.rolloutInputCaptures) {
    decisions.push(await evaluateCapture(capture));
    onDecision?.(decisions.length, table.quality.rolloutInputCaptures.length);
  }
  return {
    schemaVersion: 1,
    oracleVersion: REGRET_ORACLE_VERSION,
    sourceFile,
    tableIndex: table.tableIndex,
    armId: table.armId,
    scalarization: REGRET_SCALARIZATION,
    aggregate: aggregateDecisions(decisions),
    decisions,
  };
}

export interface ArmRegretAggregate extends TableRegretAggregate {
  readonly armId: string;
  readonly tableCount: number;
}

export interface RegretAggregateReport {
  readonly schemaVersion: 1;
  readonly oracleVersion: typeof REGRET_ORACLE_VERSION;
  readonly sourceRunDirectory: string;
  readonly tableCount: number;
  readonly decisionCount: number;
  readonly scalarization: typeof REGRET_SCALARIZATION;
  readonly arms: readonly ArmRegretAggregate[];
}

export function aggregateTables(
  sourceRunDirectory: string,
  tables: readonly TableRegretReport[],
): RegretAggregateReport {
  const armIds = [...new Set(tables.map((table) => table.armId))].sort();
  const arms = armIds.map((armId): ArmRegretAggregate => {
    const armTables = tables.filter((table) => table.armId === armId);
    const decisions = armTables.flatMap((table) => table.decisions);
    return {
      armId,
      tableCount: armTables.length,
      ...aggregateDecisions(decisions),
    };
  });
  return {
    schemaVersion: 1,
    oracleVersion: REGRET_ORACLE_VERSION,
    sourceRunDirectory,
    tableCount: tables.length,
    decisionCount: tables.reduce((total, table) => total + table.decisions.length, 0),
    scalarization: REGRET_SCALARIZATION,
    arms,
  };
}
