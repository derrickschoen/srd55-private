import ts from 'typescript';
import type { EncounterCommand } from '../../combat/events';
import { gridDistance } from '../../combat/grid';
import type { CombatantId } from '../../combat/values';
import type { DmBoardProjection } from '../encounter-projections';

const PROGRAM_FILE = '/turn-program.js';
const DECLARATIONS_FILE = '/turn-program-api.d.ts';
const LIB_FILE = '/turn-program-lib.d.ts';

const MINIMAL_LIBRARY = `interface Array<T> { readonly length: number; readonly [index: number]: T; }
interface ReadonlyArray<T> { readonly length: number; readonly [index: number]: T; }
interface Boolean {}
interface CallableFunction {}
interface Function {}
interface IArguments {}
interface NewableFunction {}
interface Number {}
interface Object {}
interface RegExp {}
interface String {}
`;

const COMPILER_OPTIONS: ts.CompilerOptions = Object.freeze({
  allowJs: true,
  checkJs: true,
  strict: true,
  noEmit: true,
  noLib: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: false,
  types: [],
});

const LIB_SOURCE = ts.createSourceFile(
  LIB_FILE,
  MINIMAL_LIBRARY,
  ts.ScriptTarget.ES2022,
  true,
  ts.ScriptKind.TS,
);

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compare);
}

function literalUnion(values: readonly string[]): string {
  return values.length === 0 ? 'never' : values.map((value) => JSON.stringify(value)).join(' | ');
}

function numberUnion(maximum: number): string {
  if (!Number.isSafeInteger(maximum) || maximum < 0) return 'never';
  return Array.from({ length: maximum + 1 }, (_, value) => String(value)).join(' | ');
}

function actionsForActor(
  projection: DmBoardProjection,
  actorId: CombatantId,
): readonly EncounterCommand[] {
  const batch = projection.turnProgramLegalActions?.find((entry) => entry.actorId === actorId);
  if (batch !== undefined) return batch.actions;
  const pending = projection.pendingRequest;
  return pending?.actorId === actorId ? pending.legalActions.actions : [];
}

function visibleCombatantIds(
  projection: DmBoardProjection,
  actorId: CombatantId,
): readonly string[] {
  const batch = projection.turnProgramLegalActions?.find((entry) => entry.actorId === actorId);
  if (batch !== undefined) return uniqueSorted(batch.combatantIds);
  const pending = projection.pendingRequest;
  const combatants = pending?.actorId === actorId
    ? pending.visibleState.combatants
    : projection.encounter.combatants;
  return uniqueSorted(combatants.map((combatant) => String(combatant.id)));
}

function movementBudget(projection: DmBoardProjection, actorId: CombatantId): number {
  const batch = projection.turnProgramLegalActions?.find((entry) => entry.actorId === actorId);
  if (batch !== undefined) return batch.movementBudgetFeet;
  const actor = projection.encounter.combatants.find((combatant) => combatant.id === actorId);
  if (actor !== undefined) return actor.turn.movement.remaining;
  const start = projection.encounter.combatants.find((combatant) => combatant.id === actorId)?.position;
  if (start === undefined) return 0;
  return Math.max(0, ...actionsForActor(projection, actorId)
    .filter((command): command is Extract<EncounterCommand, { readonly type: 'move' }> => command.type === 'move')
    .map((command) => {
      let previous = start;
      let spent = 0;
      for (const cell of command.path) {
        spent += gridDistance(previous, cell);
        previous = cell;
      }
      return spent;
    }));
}

export interface TurnProgramAmbientDeclaration {
  readonly actorId: CombatantId;
  readonly combatantIds: readonly string[];
  readonly spellIds: readonly string[];
  readonly attackIds: readonly string[];
  readonly movementBudgetFeet: number;
  readonly source: string;
}

export interface TurnProgramAmbientApiDescription {
  readonly actorId: CombatantId;
  readonly description: string;
}

function turnProgramAmbientFacts(
  projection: DmBoardProjection,
  actorId: CombatantId,
): Omit<TurnProgramAmbientDeclaration, 'source'> {
  const actions = actionsForActor(projection, actorId);
  return {
    actorId,
    combatantIds: visibleCombatantIds(projection, actorId),
    spellIds: uniqueSorted(actions.flatMap((command) =>
      command.type === 'cast_spell' ? [command.spellId] : [])),
    attackIds: uniqueSorted(actions.flatMap((command) =>
      command.type === 'attack' && command.attackId !== undefined ? [command.attackId] : [])),
    movementBudgetFeet: movementBudget(projection, actorId),
  };
}

/** Describes the dynamic ambient facts without emitting TypeScript declarations. */
export function describeTurnProgramAmbientApi(
  projection: DmBoardProjection,
  actorId: CombatantId,
): TurnProgramAmbientApiDescription {
  const facts = turnProgramAmbientFacts(projection, actorId);
  return {
    actorId,
    description: [
      `For actor ${actorId}, the restricted-JS API can reference these visible combatant IDs: ${facts.combatantIds.join(', ') || 'none'}.`,
      `The currently legal spell IDs are: ${facts.spellIds.join(', ') || 'none'}.`,
      `The currently legal named attack IDs are: ${facts.attackIds.join(', ') || 'none'}.`,
      `An explicit move or retreat distance may be an integer from 0 through ${String(facts.movementBudgetFeet)} feet.`,
    ].join(' '),
  };
}

/** Generates the complete ambient API for one actor from its decision-time DM projection. */
export function generateTurnProgramDeclarations(
  projection: DmBoardProjection,
  actorId: CombatantId,
): TurnProgramAmbientDeclaration {
  const { combatantIds, spellIds, attackIds, movementBudgetFeet } = turnProgramAmbientFacts(projection, actorId);
  const source = `declare const movementFeetBrand: unique symbol;
type CombatantId = ${literalUnion(combatantIds)};
type SpellId = ${literalUnion(spellIds)};
type AttackId = ${literalUnion(attackIds)};
type MovementBudgetFeet = ${String(movementBudgetFeet)};
type MovementFeet = (${numberUnion(movementBudgetFeet)}) & { readonly [movementFeetBrand]?: never };
interface Cell { readonly column: number; readonly row: number; }
interface DecisionProgram { readonly __decisionProgram: unique symbol; }
interface StandingRider { readonly __standingRider: unique symbol; }
declare function nearestEnemy(): CombatantId | null;
declare function lowestHp(combatants?: readonly CombatantId[]): CombatantId | null;
declare function alliesWithin(feet: number): readonly CombatantId[];
declare function enemiesWithin(feet: number): readonly CombatantId[];
declare function hpPercent(combatant: CombatantId): number;
declare function distanceTo(combatant: CombatantId): number;
declare function attack(target: CombatantId | null, rider?: StandingRider): DecisionProgram;
declare function attack(attackId: AttackId, target: CombatantId, rider?: StandingRider): DecisionProgram;
declare function bonusAttack(target: CombatantId): DecisionProgram;
declare function forceSave(target: CombatantId): DecisionProgram;
declare function castSpell(spellId: SpellId, target?: CombatantId): DecisionProgram;
declare function move(target: CombatantId, feet?: MovementFeet): DecisionProgram;
declare function retreat(column: number, row: number, feet?: MovementFeet): DecisionProgram;
declare function dash(): DecisionProgram;
declare function disengage(): DecisionProgram;
declare function dodge(): DecisionProgram;
declare function endTurn(): DecisionProgram;
declare function actionSurge(): DecisionProgram;
declare function priority(...programs: readonly DecisionProgram[]): DecisionProgram;
declare function priority(programs: readonly DecisionProgram[]): DecisionProgram;
declare function emit(program: DecisionProgram): DecisionProgram;
declare function focusFire(target: CombatantId | null): DecisionProgram;
declare function retreatWhenBelow(fractionHp: number, destination: Cell): DecisionProgram;
declare function flankWith(ally: CombatantId, target: CombatantId): DecisionProgram;
declare function holdChokepoint(destination: Cell): DecisionProgram;
declare function riderOnCrit(followUpAction: DecisionProgram): StandingRider;
`;
  return { actorId, combatantIds, spellIds, attackIds, movementBudgetFeet, source };
}

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

function sourceFile(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ES2022,
    true,
    fileName.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS,
  );
}

class CompilerSnapshot {
  readonly #declarations: ts.SourceFile;
  readonly #host: ts.CompilerHost;
  #programSource = sourceFile(PROGRAM_FILE, '');
  #previousProgram: ts.Program | undefined;

  constructor(declarationSource: string) {
    this.#declarations = sourceFile(DECLARATIONS_FILE, declarationSource);
    this.#host = {
      fileExists: (fileName) =>
        fileName === PROGRAM_FILE || fileName === DECLARATIONS_FILE || fileName === LIB_FILE,
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => '/',
      getDefaultLibFileName: () => LIB_FILE,
      getNewLine: () => '\n',
      getSourceFile: (fileName) => fileName === PROGRAM_FILE
        ? this.#programSource
        : fileName === DECLARATIONS_FILE
          ? this.#declarations
          : fileName === LIB_FILE
            ? LIB_SOURCE
            : undefined,
      readFile: (fileName) => this.#host.getSourceFile(fileName, ts.ScriptTarget.ES2022)?.text,
      useCaseSensitiveFileNames: () => true,
      writeFile: () => undefined,
    };
  }

  diagnostics(programSource: string): readonly ts.Diagnostic[] {
    this.#programSource = sourceFile(PROGRAM_FILE, programSource);
    const program = ts.createProgram({
      rootNames: [LIB_FILE, DECLARATIONS_FILE, PROGRAM_FILE],
      options: COMPILER_OPTIONS,
      host: this.#host,
      ...(this.#previousProgram === undefined ? {} : { oldProgram: this.#previousProgram }),
    });
    this.#previousProgram = program;
    return ts.getPreEmitDiagnostics(program);
  }
}

const MAX_COMPILER_SNAPSHOTS = 64;
const COMPILER_SNAPSHOTS = new Map<string, CompilerSnapshot>();

function compilerSnapshot(declarationSource: string): CompilerSnapshot {
  const cached = COMPILER_SNAPSHOTS.get(declarationSource);
  if (cached !== undefined) {
    COMPILER_SNAPSHOTS.delete(declarationSource);
    COMPILER_SNAPSHOTS.set(declarationSource, cached);
    return cached;
  }
  const created = new CompilerSnapshot(declarationSource);
  COMPILER_SNAPSHOTS.set(declarationSource, created);
  if (COMPILER_SNAPSHOTS.size > MAX_COMPILER_SNAPSHOTS) {
    const oldest = COMPILER_SNAPSHOTS.keys().next().value;
    if (oldest !== undefined) COMPILER_SNAPSHOTS.delete(oldest);
  }
  return created;
}

/** Type-checks without filesystem access; the immutable minimal library snapshot is shared by every call. */
export function typeCheckJsTurnProgram(
  programSource: string,
  declarationSource: string,
  now: () => number = () => performance.now(),
): TurnProgramTypeCheckResult {
  const startedAt = now();
  const diagnostics = compilerSnapshot(declarationSource).diagnostics(programSource)
    .map((diagnostic): TurnProgramTypeDiagnostic => {
    const position = diagnostic.file === undefined || diagnostic.start === undefined
      ? { line: 0, character: 0 }
      : diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return {
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      line: position.line + 1,
      column: position.character + 1,
    };
    });
  const durationMs = Math.max(0, now() - startedAt);
  return {
    passed: diagnostics.length === 0,
    diagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    durationMs,
    diagnostics,
  };
}
