import { dirname, relative, resolve } from 'node:path';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from '../../helpers/test-filesystem';

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

const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const FORBIDDEN_GLOBALS = new Set([
  'document', 'window', 'indexedDB', 'IDBDatabase', 'IDBFactory', 'IDBObjectStore',
  'HTMLCanvasElement', 'OffscreenCanvas', 'CanvasRenderingContext', 'CanvasRenderingContext2D',
  'SharedArrayBuffer', 'Atomics', 'importScripts',
]);

function platformViolations(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
  const violations: string[] = [];
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
  const provenance = (node: ts.Expression, seen = new Set<ts.Symbol>()): string | null => {
    if (ts.isPropertyAccessExpression(node)) {
      const owner = provenance(node.expression, seen);
      if (owner === 'globalThis' && FORBIDDEN_GLOBALS.has(node.name.text)) return node.name.text;
      return owner !== null && FORBIDDEN_GLOBALS.has(owner) ? owner : null;
    }
    if (ts.isElementAccessExpression(node)) {
      const owner = provenance(node.expression, seen);
      const key = node.argumentExpression;
      if (owner === 'globalThis' && key !== undefined && ts.isStringLiteralLike(key) && FORBIDDEN_GLOBALS.has(key.text)) return key.text;
      return owner !== null && FORBIDDEN_GLOBALS.has(owner) ? owner : null;
    }
    if (!ts.isIdentifier(node)) return null;
    if (node.text === 'globalThis') return 'globalThis';
    let symbol = checker.getSymbolAtLocation(node);
    if (FORBIDDEN_GLOBALS.has(node.text)) {
      if (symbol === undefined) return node.text;
      const declarations = symbol.getDeclarations() ?? [];
      if (
        declarations.length > 0 &&
        declarations.every((declaration) => declaration.getSourceFile().isDeclarationFile)
      ) return node.text;
    }
    if (symbol === undefined || seen.has(symbol)) return null;
    seen.add(symbol);
    if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = checker.getAliasedSymbol(symbol);
    for (const declaration of symbol.getDeclarations() ?? []) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined) {
        const source = provenance(declaration.initializer, seen);
        if (source !== null) return source;
      }
      if (ts.isBindingElement(declaration)) {
        const key = declaration.propertyName ?? declaration.name;
        const variable = declaration.parent.parent;
        if (
          ts.isIdentifier(key) && FORBIDDEN_GLOBALS.has(key.text) &&
          ts.isVariableDeclaration(variable) && variable.initializer !== undefined &&
          provenance(variable.initializer, seen) === 'globalThis'
        ) return key.text;
      }
    }
    return null;
  };
  for (const module of graph.values()) {
    for (const edge of module.imports) {
      if (NODE_BUILTINS.has(edge.specifier)) {
        violations.push(`${repositoryPath(module.file)} imports ${edge.specifier}`);
      }
    }
    const sourceFile = program.getSourceFile(module.file);
    if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${module.file}`);
    const visit = (node: ts.Node): void => {
      const isPropertyLabel = ts.isIdentifier(node) && (
        ts.isPropertyAccessExpression(node.parent) && node.parent.name === node ||
        ts.isPropertyAssignment(node.parent) && node.parent.name === node ||
        ts.isBindingElement(node.parent) && node.parent.propertyName === node
      );
      if (
        (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
        !insideImport(node) && !isPropertyLabel
      ) {
        const forbidden = provenance(node);
        if (forbidden !== null && forbidden !== 'globalThis') {
          violations.push(`${repositoryPath(module.file)} resolves ${node.getText(sourceFile)} to ${forbidden}`);
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

function memberCallDefinitions(
  graph: ReadonlyMap<string, SourceModule>,
  file: string,
  receiver: string,
): readonly string[] {
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
  const sourceFile = program.getSourceFile(resolve(ROOT, file));
  if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${file}`);
  const definitions: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sourceFile) === receiver
    ) {
      const symbol = checker.getSymbolAtLocation(node.expression.name);
      const declaration = symbol?.getDeclarations()?.find(ts.isMethodDeclaration);
      const owner = declaration?.parent;
      if (declaration === undefined || owner === undefined || !ts.isClassDeclaration(owner)) {
        throw new Error(`Could not resolve ${node.expression.getText(sourceFile)}.`);
      }
      definitions.push(
        `${node.expression.name.getText(sourceFile)} -> ` +
        `${repositoryPath(declaration.getSourceFile().fileName)}#${owner.name?.text ?? '<anonymous>'}`,
      );
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return [...new Set(definitions)].sort();
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

function platformControlViolations(name: string, source: string): readonly string[] {
  const directory = mkdtempSync(resolve(tmpdir(), `vtt-worker-${name}-`));
  try {
    const control = resolve(directory, `${name}.ts`);
    writeFileSync(control, source);
    return platformViolations(dependencyGraph([control]));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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

  it('catches the direct platform control at its exact use site', () => {
    const violations = platformControlViolations('direct', `document.createElement('div');`);
    expect(violations.some((violation) => /\/direct\.ts resolves document\.createElement to document$/u.test(violation)))
      .toBe(true);
  });

  it('catches the alias platform control at its exact resolved use site', () => {
    const violations = platformControlViolations('alias', `
      const d = document;
      d.createElement('div');
    `);
    expect(violations.some((violation) => /\/vtt-worker-alias-[^/]+\/alias\.ts resolves d\.createElement to document$/u.test(violation)))
      .toBe(true);
  });

  it('catches the destructuring platform control at its exact resolved use site', () => {
    const violations = platformControlViolations('destructuring', `
      const { document: doc } = globalThis;
      doc.createElement('span');
    `);
    expect(violations.some((violation) => /\/vtt-worker-destructuring-[^/]+\/destructuring\.ts resolves doc\.createElement to document$/u.test(violation)))
      .toBe(true);
  });

  it('catches the computed-property platform control at its exact use site', () => {
    const violations = platformControlViolations('computed', `globalThis['SharedArrayBuffer'];`);
    expect(violations.some((violation) => /\/computed\.ts resolves globalThis\['SharedArrayBuffer'\] to SharedArrayBuffer$/u.test(violation)))
      .toBe(true);
  });

  it('catches the bare-builtin platform control at its exact import site', () => {
    const violations = platformControlViolations('builtin', `import fs from 'fs'; void fs;`);
    expect(violations.some((violation) => /\/builtin\.ts imports fs$/u.test(violation))).toBe(true);
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

  it('top-down UI mutations enter the rich session service', () => {
    const graph = dependencyGraph(['src/vtt/encounter-app.ts']);
    const serviceCalls = memberCallDefinitions(graph, 'src/vtt/encounter-app.ts', 'this.#session');
    expect(serviceCalls).toEqual([
      'adjudicate -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'close -> src/vtt/encounter-session-service.ts#EncounterSessionService',
      'delayTurn -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'dmUseWorldObject -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'endSession -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'finishAdventuringDay -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'finishRoom -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'interrupt -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'replaceController -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'resolveEngineAdjudication -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'resolvePendingDecision -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'resolvePendingPlacement -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'resolveRefusalPrompt -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'resolveRestInterruption -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'resume -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'rewindToRound -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'sessionEnded -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'setHiddenRollCategory -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'setReactionPreference -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'setRefusalHandling -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'skipTurn -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'start -> src/vtt/encounter-session-service.ts#EncounterSessionService',
      'submitTopDownOfferedAction -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'subscribeTopDown -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'topDownSnapshot -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
      'undoLast -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
    ]);
    expect(memberCallDefinitions(graph, 'src/vtt/encounter-app.ts', 'this.#lifecycle')).toEqual([
      'dispatch -> src/vtt/session-lifecycle.ts#IndexedDbSessionLifecycle',
    ]);
    expect(readFileSync(resolve(ROOT, 'src/vtt/encounter-app.ts'), 'utf8')).not.toContain('this.#host');
  });

  it('all runtime entries converge after top-down refactor', () => {
    const graph = dependencyGraph([...CORE_ENTRYPOINTS, 'src/vtt/encounter-app.ts']);
    const typeScriptGraph = new Map([...graph].filter(([file]) => /\.tsx?$/u.test(file)));
    expect(reducerCallSites(typeScriptGraph)).toEqual([
      'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
      'src/vtt/session-encounter-reducer.ts#reduceSessionEncounter -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter',
      'src/vtt/session-persistence.ts#advanceSkippedTurn -> src/combat/encounter.ts#reduceEncounter',
      'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
      'src/vtt/vane-warren.ts#reduceVaneWarrenEncounter -> src/combat/encounter.ts#reduceEncounter',
      'src/vtt/vane-warren.ts#reduceVaneWarrenWorldObjectAction -> src/combat/encounter.ts#reduceEncounter',
    ]);
    const files = [...graph.keys()].map(repositoryPath);
    expect(files).toContain('src/vtt/encounter-session-service.ts');
    expect(files).toContain('src/vtt/session-lifecycle.ts');
    expect(files).toContain('src/vtt/encounter-selectors.ts');
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
