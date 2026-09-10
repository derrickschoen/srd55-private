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
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly === true) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
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
  return { file, sourceFile, imports, reducerAliases };
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

function reducerEdges(graph: ReadonlyMap<string, SourceModule>): readonly string[] {
  const edges = new Set<string>();
  for (const module of graph.values()) {
    const addAlias = (identifier: ts.Identifier): void => {
      const target = module.reducerAliases.get(identifier.text);
      if (target?.resolved !== null && target?.resolved !== undefined) {
        edges.add(`${repositoryPath(module.file)} -> ${repositoryPath(target.resolved)}#${target.imported}`);
      }
    };
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && !insideImport(node)) {
        addAlias(node.expression);
      } else if (
        ts.isPropertyAssignment(node) &&
        node.name.getText(module.sourceFile) === 'commandReducer' &&
        ts.isIdentifier(node.initializer)
      ) {
        addAlias(node.initializer);
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(module.sourceFile, visit);
  }
  return [...edges].sort();
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
    expect(reducerEdges(dependencyGraph(CORE_ENTRYPOINTS))).toEqual([
      'src/vtt/dm-encounter-host.ts -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
      'src/vtt/session-encounter-reducer.ts -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter',
      'src/vtt/session-persistence.ts -> src/combat/encounter.ts#reduceEncounter',
      'src/vtt/session-persistence.ts -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
      'src/vtt/vane-warren.ts -> src/combat/encounter.ts#reduceEncounter',
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
    expect(readFileSync(resolve(ROOT, 'src/vtt/encounter-selectors.ts'), 'utf8'))
      .toContain('projection: PlayerBoardProjection');
  });
});
