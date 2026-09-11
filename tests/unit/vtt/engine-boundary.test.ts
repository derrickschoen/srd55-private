import { dirname, relative, resolve } from 'node:path';
import { builtinModules } from 'node:module';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from '../../helpers/test-filesystem';

const ROOT = process.cwd();
const REDUCERS = new Set([
  'reduceEncounter',
  'reduceSessionEncounter',
  'reduceVaneWarrenEncounter',
]);
const PERMITTED_REDUCER_EDGES = [
  'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
  'src/vtt/session-encounter-reducer.ts#reduceSessionEncounter -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter',
  'src/vtt/session-persistence.ts#advanceSkippedTurn -> src/combat/encounter.ts#reduceEncounter',
  'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
  'src/vtt/vane-warren.ts#reduceVaneWarrenEncounter -> src/combat/encounter.ts#reduceEncounter',
  'src/vtt/vane-warren.ts#reduceVaneWarrenWorldObjectAction -> src/combat/encounter.ts#reduceEncounter',
] as const;

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

function allImportSpecifiers(sourceFile: ts.SourceFile): readonly string[] {
  const specifiers = [...valueImportSpecifiers(sourceFile)];
  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
    ) specifiers.push(statement.moduleSpecifier.text);
  }
  return [...new Set(specifiers)];
}

function parseModule(file: string, includeTypes: boolean): SourceModule {
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = (includeTypes ? allImportSpecifiers(sourceFile) : valueImportSpecifiers(sourceFile)).map((specifier) => ({
    specifier,
    resolved: resolveImport(file, specifier),
  }));
  return { file, sourceFile, imports };
}

function dependencyGraph(entrypoints: readonly string[], includeTypes = false): ReadonlyMap<string, SourceModule> {
  const graph = new Map<string, SourceModule>();
  const pending = entrypoints.map((entrypoint) => resolve(ROOT, entrypoint));
  const roots = new Set(pending);
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || graph.has(file)) continue;
    const module = parseModule(file, includeTypes && roots.has(file));
    graph.set(file, module);
    for (const edge of module.imports) {
      if (edge.resolved !== null && !graph.has(edge.resolved)) pending.push(edge.resolved);
    }
  }
  return graph;
}

function reachableSubgraph(
  graph: ReadonlyMap<string, SourceModule>, entrypoints: readonly string[],
): ReadonlyMap<string, SourceModule> {
  const reachable = new Map<string, SourceModule>();
  const pending = entrypoints.map((entrypoint) => resolve(ROOT, entrypoint));
  while (pending.length > 0) {
    const file = pending.pop();
    if (file === undefined || reachable.has(file)) continue;
    const module = graph.get(file);
    if (module === undefined) throw new Error(`Production graph omitted ${repositoryPath(file)}`);
    reachable.set(file, module);
    for (const edge of module.imports) if (edge.resolved !== null) pending.push(edge.resolved);
  }
  return reachable;
}

function graphProgram(
  graph: ReadonlyMap<string, SourceModule>,
  overrides: ReadonlyMap<string, string> = new Map(),
  includeLibraries = false,
): ts.Program {
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noLib: !includeLibraries,
    noResolve: includeLibraries,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const defaultSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const absolute = resolve(fileName);
    const override = overrides.get(absolute);
    const module = graph.get(absolute);
    if (override !== undefined || module !== undefined) {
      const source = override ?? module?.sourceFile.text;
      if (source === undefined) throw new Error(`Graph source is unavailable for ${absolute}`);
      return ts.createSourceFile(
        absolute, source, languageVersion, true,
        absolute.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
    }
    return defaultSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  return ts.createProgram({ rootNames: [...graph.keys()], options, host });
}

function resolvedSymbol(checker: ts.TypeChecker, node: ts.Node): ts.Symbol | null {
  let symbol = checker.getSymbolAtLocation(node);
  if (symbol === undefined) return null;
  const visited = new Set<ts.Symbol>();
  while ((symbol.flags & ts.SymbolFlags.Alias) !== 0 && !visited.has(symbol)) {
    visited.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

function platformViolations(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
  const violations: string[] = [];
  const nodeBuiltins = new Set(builtinModules.flatMap((name) => [name, name.replace(/^node:/u, '')]));
  const forbiddenNames = /^(?:document|window|indexedDB|IDB(?:Database|Factory|ObjectStore)|Document|HTMLElement|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?|SharedArrayBuffer|Atomics)$/u;
  const program = graphProgram(graph, new Map(), true);
  const checker = program.getTypeChecker();
  const isPlatformSymbol = (symbol: ts.Symbol | null): boolean => {
    if (symbol === null || !forbiddenNames.test(symbol.getName())) return false;
    return symbol.getDeclarations()?.some((declaration) => {
      const file = declaration.getSourceFile().fileName.replaceAll('\\', '/');
      return /\/typescript\/lib\/lib\.(?:dom|webworker|es\d+\.sharedmemory)\.d\.ts$/u.test(file);
    }) === true;
  };
  for (const module of graph.values()) {
    for (const edge of module.imports) {
      if (edge.specifier.startsWith('node:') || nodeBuiltins.has(edge.specifier.split('/')[0] ?? edge.specifier)) {
        violations.push(`${repositoryPath(module.file)} imports ${edge.specifier}`);
      }
    }
    const sourceFile = program.getSourceFile(module.file);
    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && isPlatformSymbol(resolvedSymbol(checker, node))) {
        violations.push(`${repositoryPath(module.file)} resolves ${node.getText(sourceFile)} to ${resolvedSymbol(checker, node)?.getName() ?? '<unknown>'}`);
      }
      if (
        ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)
      ) {
        const property = checker.getTypeAtLocation(node.expression).getProperty(node.argumentExpression.text);
        if (isPlatformSymbol(property ?? null)) {
          violations.push(`${repositoryPath(module.file)} resolves ${node.getText(sourceFile)} to ${property?.getName() ?? '<unknown>'}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
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

function reducerCallSites(
  graph: ReadonlyMap<string, SourceModule>,
  suppliedProgram?: ts.Program,
): readonly string[] {
  const program = suppliedProgram ?? graphProgram(graph);
  const checker = program.getTypeChecker();
  const calls: string[] = [];
  for (const module of graph.values()) {
    const sourceFile = program.getSourceFile(module.file);
    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
    const candidateNames = new Set(REDUCERS);
    for (const statement of sourceFile.statements) {
      const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
      if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
      for (const element of bindings.elements) {
        if (definingReducer(checker, element.name) !== null) candidateNames.add(element.name.text);
      }
    }
    const visit = (node: ts.Node): void => {
      const callName = ts.isCallExpression(node)
        ? ts.isIdentifier(node.expression) ? node.expression.text
          : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text
            : null
        : null;
      if (ts.isCallExpression(node) && callName !== null && candidateNames.has(callName) && !insideImport(node)) {
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

function runtimeConvergenceEvidence(
  graph: ReadonlyMap<string, SourceModule>,
  suppliedProgram?: ts.Program,
): {
  readonly constructedClasses: ReadonlySet<string>;
  readonly serviceValues: ReadonlySet<string>;
  readonly reducerCalls: readonly string[];
} {
  const program = suppliedProgram ?? graphProgram(graph);
  const checker = program.getTypeChecker();
  const constructions = new Set<string>();
  const serviceValues = new Set<string>();
  const reducerCalls: string[] = [];
  const definitionIdentity = (node: ts.Node): string | null => {
    const symbol = resolvedSymbol(checker, node);
    const declaration = symbol?.getDeclarations()?.find((candidate) => {
      const file = candidate.getSourceFile().fileName;
      return file.startsWith(`${ROOT}/`) && !file.includes('/node_modules/');
    });
    return symbol === null || declaration === undefined
      ? null
      : `${symbol.getName()}@${repositoryPath(declaration.getSourceFile().fileName)}`;
  };
  const typeIdentity = (node: ts.Node): string | null => {
    const type = checker.getTypeAtLocation(node);
    const symbol = type.aliasSymbol ?? type.getSymbol();
    const declaration = symbol?.getDeclarations()?.find((candidate) =>
      candidate.getSourceFile().fileName.startsWith(`${ROOT}/`));
    return symbol === undefined || declaration === undefined
      ? null
      : `${symbol.getName()}@${repositoryPath(declaration.getSourceFile().fileName)}`;
  };
  for (const module of graph.values()) {
    const sourceFile = program.getSourceFile(module.file);
    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
    const visit = (node: ts.Node): void => {
      if (ts.isNewExpression(node)) {
        const identity = definitionIdentity(node.expression);
        if (identity !== null) constructions.add(identity);
        if (identity === 'ProtocolRuntime@src/vtt/handoff/protocol-runtime.ts') {
          const argument = node.arguments?.[0];
          if (argument !== undefined) {
            if (ts.isObjectLiteralExpression(argument)) {
              for (const property of argument.properties) {
                if (ts.isShorthandPropertyAssignment(property) && property.name.text === 'service') {
                  const serviceIdentity = typeIdentity(property.name);
                  if (serviceIdentity !== null) serviceValues.add(serviceIdentity);
                } else if (
                  ts.isPropertyAssignment(property) && property.name.getText(sourceFile) === 'service'
                ) {
                  const serviceIdentity = typeIdentity(property.initializer);
                  if (serviceIdentity !== null) serviceValues.add(serviceIdentity);
                }
              }
            } else {
              const serviceProperty = checker.getTypeAtLocation(argument).getProperty('service');
              const declaration = serviceProperty?.valueDeclaration ?? serviceProperty?.declarations?.[0];
              if (serviceProperty !== undefined && declaration !== undefined) {
                const serviceType = checker.getTypeOfSymbolAtLocation(serviceProperty, declaration);
                const serviceSymbol = serviceType.aliasSymbol ?? serviceType.getSymbol();
                const serviceDeclaration = serviceSymbol?.getDeclarations()?.find((candidate) =>
                  candidate.getSourceFile().fileName.startsWith(`${ROOT}/`));
                if (serviceSymbol !== undefined && serviceDeclaration !== undefined) {
                  serviceValues.add(`${serviceSymbol.getName()}@${repositoryPath(serviceDeclaration.getSourceFile().fileName)}`);
                }
              }
            }
          }
        }
      }
      if (ts.isCallExpression(node) && !insideImport(node)) {
        const definition = definingReducer(checker, node.expression);
        if (definition !== null) {
          reducerCalls.push(
            `${repositoryPath(module.file)}#${enclosingOperation(node, sourceFile)} -> ` +
            `${repositoryPath(definition.file)}#${definition.symbol}`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sourceFile, visit);
  }
  return { constructedClasses: constructions, serviceValues, reducerCalls: reducerCalls.sort() };
}

function assertRuntimeConvergence(
  evidence: ReturnType<typeof runtimeConvergenceEvidence>,
  adapter: string,
): void {
  const definitions = [...evidence.constructedClasses];
  if (!definitions.includes('EncounterSessionService@src/vtt/encounter-session-service.ts')
    && !evidence.serviceValues.has('EncounterSessionService@src/vtt/encounter-session-service.ts')) {
    throw new Error('Runtime entry bypasses EncounterSessionService.');
  }
  if (!definitions.includes('ProtocolRuntime@src/vtt/handoff/protocol-runtime.ts')) {
    throw new Error('Runtime entry bypasses ProtocolRuntime.');
  }
  if (!definitions.includes(adapter)) throw new Error(`Runtime entry omits ${adapter}.`);
}

function assertPermittedReducerEdges(reducerCalls: readonly string[]): void {
  if (JSON.stringify(reducerCalls) !== JSON.stringify(PERMITTED_REDUCER_EDGES)) {
    throw new Error(`Runtime entries have an unexpected reducer edge: ${JSON.stringify(reducerCalls)}`);
  }
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
const RUNTIME_ENTRYPOINTS = [
  'src/vtt/handoff/in-process-transport.ts',
  'src/vtt/handoff/worker-entry.ts',
  'src/vtt/handoff/worker-transport.ts',
  'tools/vtt-handoff/node-runtime.ts',
  'src/vtt/handoff/websocket-transport.ts',
] as const;
const RUNTIME_ADAPTER_ENTRIES = [
  {
    files: ['src/vtt/handoff/in-process-transport.ts'],
    adapter: 'InProcessSceneTransport@src/vtt/handoff/in-process-transport.ts',
  },
  {
    files: ['src/vtt/handoff/worker-entry.ts', 'src/vtt/handoff/worker-transport.ts'],
    adapter: 'WorkerSceneTransport@src/vtt/handoff/worker-transport.ts',
  },
  {
    files: ['tools/vtt-handoff/node-runtime.ts', 'src/vtt/handoff/websocket-transport.ts'],
    adapter: 'WebSocketSceneTransport@src/vtt/handoff/websocket-transport.ts',
  },
] as const;

let cachedCoreGraph: ReadonlyMap<string, SourceModule> | null = null;
let cachedRuntimeGraph: ReadonlyMap<string, SourceModule> | null = null;
let cachedRuntimeReducerCalls: readonly string[] | null = null;
let cachedRuntimeProgram: ts.Program | null = null;

function coreDependencyGraph(): ReadonlyMap<string, SourceModule> {
  cachedCoreGraph ??= dependencyGraph(CORE_ENTRYPOINTS);
  return cachedCoreGraph;
}

function runtimeDependencyGraph(): ReadonlyMap<string, SourceModule> {
  cachedRuntimeGraph ??= dependencyGraph(RUNTIME_ENTRYPOINTS, true);
  return cachedRuntimeGraph;
}

function runtimeProgram(): ts.Program {
  cachedRuntimeProgram ??= graphProgram(runtimeDependencyGraph());
  return cachedRuntimeProgram;
}

function runtimeReducerCalls(): readonly string[] {
  cachedRuntimeReducerCalls ??= reducerCallSites(runtimeDependencyGraph(), runtimeProgram());
  return cachedRuntimeReducerCalls;
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

  it('rejects bare Node builtins plus aliased, destructured, and computed browser globals', () => {
    const file = resolve(ROOT, '.tmp/platform-gate-mutant.ts');
    const violations = (source: string): readonly string[] => {
      const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const module: SourceModule = {
        file,
        sourceFile,
        imports: valueImportSpecifiers(sourceFile).map((specifier) => ({ specifier, resolved: null })),
      };
      return platformViolations(new Map([[file, module]]));
    };
    expect(violations("import filesystem from 'fs'; void filesystem;")).toEqual([
      '.tmp/platform-gate-mutant.ts imports fs',
    ]);
    expect(violations(`function render(): void {
      const browser = globalThis;
      browser.document.createElement('div');
    }`)).toEqual([
      '.tmp/platform-gate-mutant.ts resolves document to document',
    ]);
    expect(violations('const { document: pageDocument } = globalThis; void pageDocument.body;')).toEqual([
      '.tmp/platform-gate-mutant.ts resolves document to document',
    ]);
    expect(violations("const browser = globalThis; void browser['indexedDB'];")).toEqual([
      ".tmp/platform-gate-mutant.ts resolves browser['indexedDB'] to indexedDB",
    ]);
    expect(violations("export {}; const document = { createElement: () => 'local' }; document.createElement();")).toEqual([]);
  });

  it('all runtime entries converge on the pinned session reducer edges', () => {
    expect(runtimeReducerCalls()).toEqual(PERMITTED_REDUCER_EDGES);
  });

  it('all renderer adapters converge on the session service', () => {
    const productionGraph = runtimeDependencyGraph();
    const entryGraphs = RUNTIME_ADAPTER_ENTRIES.map((entry) => reachableSubgraph(productionGraph, entry.files));
    const valid = runtimeConvergenceEvidence(productionGraph, runtimeProgram());
    for (const [index, entry] of RUNTIME_ADAPTER_ENTRIES.entries()) {
      const graph = entryGraphs[index];
      if (graph === undefined) throw new Error('Runtime entry graph is unavailable.');
      expect([...graph.keys()].map(repositoryPath).some((file) => file.startsWith('tests/helpers/'))).toBe(false);
      expect([...graph.keys()].map(repositoryPath)).not.toContain('src/vtt/encounter-app.ts');
      assertRuntimeConvergence(runtimeConvergenceEvidence(graph, runtimeProgram()), entry.adapter);
    }
    assertPermittedReducerEdges(valid.reducerCalls);
  });

  it('rejects source-mutated reducer and service bypasses', () => {
    const productionGraph = runtimeDependencyGraph();
    const inProcessGraph = reachableSubgraph(productionGraph, RUNTIME_ADAPTER_ENTRIES[0].files);
    const nodeFile = resolve(ROOT, 'tools/vtt-handoff/node-runtime.ts');
    const inProcessFile = resolve(ROOT, 'src/vtt/handoff/in-process-transport.ts');
    const bypassSource = readFileSync(inProcessFile, 'utf8')
      .replace('type ProtocolTransportFault,', 'type ProtocolSessionPort, type ProtocolTransportFault,')
      .replace('readonly service: EncounterSessionService;', 'readonly service: ProtocolSessionPort;');
    const sourceMutants = new Map([
      [nodeFile, [
      "import { reduceEncounter } from '../../src/combat/encounter';",
      readFileSync(nodeFile, 'utf8'),
      'reduceEncounter({} as never, {} as never);',
      ].join('\n')],
      [inProcessFile, bypassSource],
    ]);
    const mutantProgram = graphProgram(productionGraph, sourceMutants);
    const reducerMutantEvidence = runtimeConvergenceEvidence(
      productionGraph, mutantProgram,
    );
    expect(() => assertPermittedReducerEdges(reducerMutantEvidence.reducerCalls))
      .toThrow('unexpected reducer edge');

    const bypassEvidence = runtimeConvergenceEvidence(
      inProcessGraph,
      mutantProgram,
    );
    expect(() => assertRuntimeConvergence(bypassEvidence, RUNTIME_ADAPTER_ENTRIES[0].adapter))
      .toThrow('bypasses EncounterSessionService');
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
