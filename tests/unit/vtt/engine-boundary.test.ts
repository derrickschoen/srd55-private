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
  readonly reducerAliases: ReadonlyMap<string, { readonly imported: string; readonly resolved: string | null }>;
  readonly reducerNamespaces: ReadonlyMap<string, string | null>;
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
  const reducerAliases = new Map<string, { readonly imported: string; readonly resolved: string | null }>();
  const reducerNamespaces = new Map<string, string | null>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly === true) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (ts.isNamespaceImport(bindings)) {
      reducerNamespaces.set(bindings.name.text, resolveImport(file, statement.moduleSpecifier.text));
      continue;
    }
    if (!ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if (element.isTypeOnly) continue;
      const imported = element.propertyName?.text ?? element.name.text;
      if (!REDUCERS.has(imported)) continue;
      reducerAliases.set(element.name.text, {
        imported,
        resolved: resolveImport(file, statement.moduleSpecifier.text),
      });
    }
  }
  return { file, sourceFile, imports, reducerAliases, reducerNamespaces };
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
      if (edge.specifier === 'node:fs' || edge.specifier.startsWith('node:fs/')) {
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
        /^(?:indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|OffscreenCanvas|CanvasRenderingContext(?:2D)?)$/u.test(node.text)
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

function definesSymbol(sourceFile: ts.SourceFile, symbol: string): boolean {
  return sourceFile.statements.some((statement) => {
    if (ts.isFunctionDeclaration(statement)) return statement.name?.text === symbol;
    if (!ts.isVariableStatement(statement)) return false;
    return statement.declarationList.declarations.some(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === symbol,
    );
  });
}

function resolveReducerDefinition(
  file: string,
  symbol: string,
  visited: ReadonlySet<string> = new Set(),
): ReducerDefinition | null {
  const visitKey = `${file}\u0000${symbol}`;
  if (visited.has(visitKey)) return null;
  const nextVisited = new Set(visited).add(visitKey);
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (REDUCERS.has(symbol) && definesSymbol(sourceFile, symbol)) return { file, symbol };
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      statement.isTypeOnly ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) continue;
    const target = resolveImport(file, statement.moduleSpecifier.text);
    if (target === null) continue;
    if (statement.exportClause === undefined) {
      const resolved = resolveReducerDefinition(target, symbol, nextVisited);
      if (resolved !== null) return resolved;
      continue;
    }
    if (!ts.isNamedExports(statement.exportClause)) continue;
    for (const element of statement.exportClause.elements) {
      if (element.isTypeOnly || element.name.text !== symbol) continue;
      const imported = element.propertyName?.text ?? element.name.text;
      const resolved = resolveReducerDefinition(target, imported, nextVisited);
      if (resolved !== null) return resolved;
    }
  }
  return null;
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
  const calls: string[] = [];
  for (const module of graph.values()) {
    const add = (definition: ReducerDefinition | null, node: ts.CallExpression): void => {
      if (definition === null) return;
      calls.push(
        `${repositoryPath(module.file)}#${enclosingOperation(node, module.sourceFile)} -> ` +
        `${repositoryPath(definition.file)}#${definition.symbol}`,
      );
    };
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && !insideImport(node)) {
        if (ts.isIdentifier(node.expression)) {
          const target = module.reducerAliases.get(node.expression.text);
          if (target?.resolved !== null && target?.resolved !== undefined) {
            add(resolveReducerDefinition(target.resolved, target.imported), node);
          }
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          const owner = node.expression.expression;
          const symbol = node.expression.name.text;
          if (ts.isIdentifier(owner) && REDUCERS.has(symbol)) {
            const target = module.reducerNamespaces.get(owner.text);
            if (target !== null && target !== undefined) {
              add(resolveReducerDefinition(target, symbol), node);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(module.sourceFile, visit);
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
] as const;

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
    const graph = dependencyGraph(CORE_ENTRYPOINTS);
    expect(graph.size).toBeGreaterThan(20);
    expect(platformViolations(graph)).toEqual([]);
  });

  it('all runtime entries converge on the pinned session reducer edges', () => {
    expect(reducerCallSites(dependencyGraph(CORE_ENTRYPOINTS))).toEqual([
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
