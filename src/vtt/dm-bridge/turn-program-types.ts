import ts from 'typescript';
import type { CombatantId } from '../../combat/values';
import type { DmBoardProjection } from '../encounter-projections';
import { generateTurnProgramDeclarations } from './turn-program-declarations';
import type {
  TurnProgramTypeChecker,
  TurnProgramTypeDiagnostic,
  TurnProgramTypeCheckResult,
} from './turn-program-type-contract';

export {
  MAX_TURN_PROGRAM_MOVEMENT_FEET,
  TurnProgramMovementDomainError,
  describeTurnProgramAmbientApi,
  generateTurnProgramDeclarations,
  type TurnProgramAmbientApiDescription,
  type TurnProgramAmbientDeclaration,
} from './turn-program-declarations';
export {
  JsTurnProgramTypeError,
  type TurnProgramTypeCheckResult,
  type TurnProgramTypeCheckTelemetry,
  type TurnProgramTypeChecker,
  type TurnProgramTypeDiagnostic,
} from './turn-program-type-contract';

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

/** Node-side compiler capability; inject this into JS-program decode limits. */
export const checkTurnProgramTypes: TurnProgramTypeChecker = (
  source,
  projection: DmBoardProjection,
  actorId: CombatantId,
  now,
) => {
  const declarations = generateTurnProgramDeclarations(projection, actorId);
  return {
    declarations,
    result: typeCheckJsTurnProgram(source, declarations.source, now),
  };
};
