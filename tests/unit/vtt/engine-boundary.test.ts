import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from '../../helpers/test-filesystem';

const ROOT = process.cwd();
const REDUCERS = new Set([
  'reduceEncounter',
  'reduceSessionEncounter',
  'reduceVaneWarrenEncounter',
]);

interface ImportEdge {
  readonly specifier: string;
  readonly resolved: string | null;
}

interface SourceModule {
  readonly file: string;
  readonly sourceFile: ts.SourceFile;
  readonly imports: readonly ImportEdge[];
}

function repositoryPath(absolutePath: string): string {
  return relative(ROOT, absolutePath).replaceAll('\\', '/');
}

function resolveImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function valueImportSpecifiers(sourceFile: ts.SourceFile): readonly string[] {
  const specifiers: string[] = [];
  const add = (expression: ts.Expression): void => {
    if (ts.isStringLiteral(expression)) specifiers.push(expression.text);
  };
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly === true) continue;
      if (
        clause !== undefined &&
        clause.name === undefined &&
        clause.namedBindings !== undefined &&
        ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.every((element) => element.isTypeOnly)
      ) continue;
      add(statement.moduleSpecifier);
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
      if (!statement.isTypeOnly) add(statement.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(statement) &&
      !statement.isTypeOnly &&
      ts.isExternalModuleReference(statement.moduleReference) &&
      statement.moduleReference.expression !== undefined
    ) {
      add(statement.moduleReference.expression);
    }
  }
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      const argument = node.arguments[0];
      if (argument !== undefined) add(argument);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return [...new Set(specifiers)];
}

function parseModule(file: string): SourceModule {
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = valueImportSpecifiers(sourceFile).map((specifier) => ({
    specifier,
    resolved: resolveImport(file, specifier),
  }));
  return { file, sourceFile, imports };
}

function dependencyGraph(entrypoints: readonly string[]): ReadonlyMap<string, SourceModule> {
  const graph = new Map<string, SourceModule>();
  const pending = entrypoints.map((entrypoint) => resolve(ROOT, entrypoint));
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || graph.has(file)) continue;
    const module = parseModule(file);
    graph.set(file, module);
    for (const edge of module.imports) {
      if (edge.resolved !== null && !graph.has(edge.resolved)) pending.push(edge.resolved);
    }
  }
  return graph;
}

function platformViolations(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
  const violations: string[] = [];
  for (const module of graph.values()) {
    for (const edge of module.imports) {
      if (edge.specifier.startsWith('node:')) {
        violations.push(`${repositoryPath(module.file)} imports ${edge.specifier}`);
      }
    }
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node)) {
        const expression = node.expression.getText(module.sourceFile);
        if (
          expression === 'document' ||
          expression === 'indexedDB' ||
          expression === 'globalThis.document' ||
          expression === 'globalThis.window' ||
          expression === 'globalThis.indexedDB'
        ) {
          violations.push(`${repositoryPath(module.file)} uses ${node.getText(module.sourceFile)}`);
        }
      }
      if (
        ts.isIdentifier(node) &&
        /^(?:indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?|SharedArrayBuffer|Atomics)$/u.test(node.text)
      ) {
        violations.push(`${repositoryPath(module.file)} names ${node.text}`);
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(module.sourceFile, visit);
  }
  return [...new Set(violations)].sort();
}

function insideImport(node: ts.Node): boolean {
  for (let current: ts.Node | undefined = node; current !== undefined; current = current.parent) {
    if (ts.isImportDeclaration(current)) return true;
    if (ts.isSourceFile(current)) return false;
  }
  return false;
}

interface ReducerDefinition {
  readonly file: string;
  readonly symbol: string;
}

function definingReducer(
  checker: ts.TypeChecker,
  expression: ts.LeftHandSideExpression,
): ReducerDefinition | null {
  const location = ts.isPropertyAccessExpression(expression) ? expression.name : expression;
  let symbol = checker.getSymbolAtLocation(location);
  if (symbol === undefined) return null;
  const visited = new Set<ts.Symbol>();
  while ((symbol.flags & ts.SymbolFlags.Alias) !== 0 && !visited.has(symbol)) {
    visited.add(symbol);
    const aliased = checker.getAliasedSymbol(symbol);
    if (aliased === symbol) break;
    symbol = aliased;
  }
  const name = symbol.getName();
  if (!REDUCERS.has(name)) return null;
  const declaration = symbol.getDeclarations()?.find((candidate) => {
    const file = candidate.getSourceFile().fileName;
    return file.startsWith(`${ROOT}/`) && !file.includes('/node_modules/');
  });
  return declaration === undefined
    ? null
    : { file: declaration.getSourceFile().fileName, symbol: name };
}

function enclosingOperation(node: ts.Node, sourceFile: ts.SourceFile): string {
  for (let current: ts.Node | undefined = node.parent; current !== undefined; current = current.parent) {
    if (
      ts.isMethodDeclaration(current) ||
      ts.isFunctionDeclaration(current) ||
      ts.isGetAccessorDeclaration(current) ||
      ts.isSetAccessorDeclaration(current)
    ) {
      return current.name?.getText(sourceFile) ?? '<anonymous>';
    }
    if (ts.isConstructorDeclaration(current)) return 'constructor';
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    ) return current.parent.name.text;
  }
  return '<module>';
}

function reducerCallSites(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
  const program = ts.createProgram({
    rootNames: [...graph.keys()],
    options: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noLib: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ESNext,
      types: [],
    },
  });
  const checker = program.getTypeChecker();
  const calls: string[] = [];
  for (const module of graph.values()) {
    const sourceFile = program.getSourceFile(module.file);
    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && !insideImport(node)) {
        const definition = definingReducer(checker, node.expression);
        if (definition !== null) {
          calls.push(
            `${repositoryPath(module.file)}#${enclosingOperation(node, sourceFile)} -> ` +
            `${repositoryPath(definition.file)}#${definition.symbol}`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }
  return calls.sort();
}

function selectorAuthorityViolations(file: string): readonly string[] {
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const authorityTypes = new Set(['DmView', 'EncounterState']);
  const authorityNamespaces = new Set<string>();
  const violations: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      if (
        /(?:dm-encounter-host|session-persistence|local-session-store)/u.test(specifier) ||
        specifier.includes('/transports/')
      ) violations.push(`imports forbidden selector dependency ${specifier}`);
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined) continue;
    if (ts.isNamespaceImport(bindings)) {
      authorityNamespaces.add(bindings.name.text);
      continue;
    }
    if (!ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      if (authorityTypes.has(imported)) violations.push(`imports authority type ${imported}`);
    }
  }
  const visit = (node: ts.Node): void => {
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isQualifiedName(node.typeName) &&
      ts.isIdentifier(node.typeName.left) &&
      authorityNamespaces.has(node.typeName.left.text) &&
      authorityTypes.has(node.typeName.right.text)
    ) {
      violations.push(`uses namespace authority type ${node.typeName.right.text}`);
    }
    if (ts.isImportTypeNode(node) && node.qualifier !== undefined) {
      const qualifier = node.qualifier.getText(sourceFile).split('.').at(-1);
      if (qualifier !== undefined && authorityTypes.has(qualifier)) {
        violations.push(`uses imported authority type ${qualifier}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return [...new Set(violations)].sort();
}

const CORE_ENTRYPOINTS = [
  'src/combat/coordinator.ts',
  'src/vtt/dm-encounter-host.ts',
  'src/vtt/encounter-session-service.ts',
  'src/vtt/handoff/protocol-runtime.ts',
  'src/vtt/handoff/in-process-transport.ts',
  'src/vtt/handoff/worker-entry.ts',
  'src/vtt/handoff/worker-transport.ts',
] as const;

let cachedCoreGraph: ReadonlyMap<string, SourceModule> | null = null;

function coreDependencyGraph(): ReadonlyMap<string, SourceModule> {
  cachedCoreGraph ??= dependencyGraph(CORE_ENTRYPOINTS);
  return cachedCoreGraph;
}

describe('renderer-neutral engine boundary graph', () => {
  it('recognizes static, re-export, side-effect, import-equals, dynamic, and require value edges', () => {
    const sample = ts.createSourceFile('forms.ts', `
      import defaultValue from './default-value';
      import { type TypeOnly, value } from './mixed';
      import type { OnlyType } from './type-only';
      import './side-effect';
      export { value as exported } from './re-export';
      export type { TypeOnly as ExportedType } from './type-export';
      import equalValue = require('./import-equals');
      void import('./dynamic');
      require('./required');
    `, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    expect([...valueImportSpecifiers(sample)].sort()).toEqual([
      './default-value',
      './dynamic',
      './import-equals',
      './mixed',
      './re-export',
      './required',
      './side-effect',
    ]);
  });

  it('resolves every value-import form and transitive platform dependency', () => {
    const graph = coreDependencyGraph();
    expect(graph.size).toBeGreaterThan(20);
    expect(platformViolations(graph)).toEqual([]);
  });

  it('all runtime entries converge on the pinned session reducer edges', () => {
    expect(reducerCallSites(coreDependencyGraph())).toEqual([
      'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
      'src/vtt/session-encounter-reducer.ts#reduceSessionEncounter -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter',
      'src/vtt/session-persistence.ts#advanceSkippedTurn -> src/combat/encounter.ts#reduceEncounter',
      'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
      'src/vtt/vane-warren.ts#reduceVaneWarrenEncounter -> src/combat/encounter.ts#reduceEncounter',
      'src/vtt/vane-warren.ts#reduceVaneWarrenWorldObjectAction -> src/combat/encounter.ts#reduceEncounter',
    ]);
  });

  it('keeps the complete selector value graph projection-only and platform-neutral', () => {
    const graph = dependencyGraph(['src/vtt/encounter-selectors.ts']);
    const files = [...graph.keys()].map(repositoryPath);
    expect(platformViolations(graph)).toEqual([]);
    expect(files).not.toContain('src/vtt/dm-encounter-host.ts');
    expect(files).not.toContain('src/vtt/session-persistence.ts');
    expect(files).not.toContain('src/vtt/local-session-store.ts');
    expect(files.some((file) => file.includes('/transports/'))).toBe(false);
    expect(selectorAuthorityViolations(resolve(ROOT, 'src/vtt/encounter-selectors.ts'))).toEqual([]);
    expect(readFileSync(resolve(ROOT, 'src/vtt/encounter-selectors.ts'), 'utf8'))
      .toContain('projection: PlayerBoardProjection');
  });
});
