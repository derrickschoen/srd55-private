import type { CombatantId } from '../../combat/values';
import type { DmBoardProjection } from '../encounter-projections';
import type { TurnProgramAmbientDeclaration } from './turn-program-declarations';

export interface TurnProgramTypeDiagnostic {
  readonly code: number;
  readonly message: string;
  readonly line: number;
  readonly column: number;
}

export interface TurnProgramTypeCheckTelemetry {
  readonly passed: boolean;
  readonly diagnosticCodes: readonly number[];
  readonly durationMs: number;
}

export interface TurnProgramTypeCheckResult extends TurnProgramTypeCheckTelemetry {
  readonly diagnostics: readonly TurnProgramTypeDiagnostic[];
}

export interface CheckedTurnProgram {
  readonly declarations: TurnProgramAmbientDeclaration;
  readonly result: TurnProgramTypeCheckResult;
}

/** Compiler capability supplied only by node-side typed-program entries. */
export type TurnProgramTypeChecker = (
  source: string,
  projection: DmBoardProjection,
  actorId: CombatantId,
  now?: () => number,
) => CheckedTurnProgram;

export class JsTurnProgramTypeError extends TypeError {
  override readonly name = 'JsTurnProgramTypeError' as const;

  constructor(readonly diagnostics: readonly TurnProgramTypeDiagnostic[]) {
    super([
      'JS turn-program type check failed:',
      ...diagnostics.map((diagnostic) =>
        `TS${String(diagnostic.code)} at ${String(diagnostic.line)}:${String(diagnostic.column)}: ${diagnostic.message}`),
    ].join('\n'));
  }
}
