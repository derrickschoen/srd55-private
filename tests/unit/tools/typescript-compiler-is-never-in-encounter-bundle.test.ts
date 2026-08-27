import { existsSync, readFileSync } from '../../helpers/test-filesystem';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const encounterEntry = resolve(repoRoot, 'src/vtt/encounter-app.ts');

function runtimeModuleSpecifiers(path: string): readonly string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.ESNext,
    false,
    ts.ScriptKind.TS,
  );
  const specifiers: string[] = [];
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly === true) continue;
      if (
        clause !== undefined &&
        clause.name === undefined &&
        clause.namedBindings !== undefined &&
        ts.isNamedImports(clause.namedBindings)
      ) {
        if (clause.namedBindings.elements.every((element) => element.isTypeOnly)) continue;
      }
      if (ts.isStringLiteral(statement.moduleSpecifier)) {
        specifiers.push(statement.moduleSpecifier.text);
      }
      continue;
    }
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;
    if (
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.every((element) => element.isTypeOnly)
    ) {
      continue;
    }
    if (statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }
  return specifiers;
}

function resolveLocalImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const unresolved = resolve(dirname(importer), specifier);
  const withoutJsExtension = unresolved.endsWith('.js') ? unresolved.slice(0, -3) : unresolved;
  return [
    unresolved,
    `${unresolved}.ts`,
    `${unresolved}.tsx`,
    `${withoutJsExtension}.ts`,
    `${withoutJsExtension}.tsx`,
    resolve(unresolved, 'index.ts'),
    resolve(unresolved, 'index.tsx'),
  ].find((candidate) => existsSync(candidate)) ?? null;
}

function typescriptImportChain(): readonly string[] | null {
  const pending: { readonly path: string; readonly chain: readonly string[] }[] = [{
    path: encounterEntry,
    chain: [relative(repoRoot, encounterEntry)],
  }];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined || seen.has(current.path)) continue;
    seen.add(current.path);
    for (const specifier of runtimeModuleSpecifiers(current.path)) {
      if (specifier === 'typescript' || specifier.startsWith('typescript/')) {
        return [...current.chain, specifier];
      }
      const target = resolveLocalImport(current.path, specifier);
      if (target !== null) {
        pending.push({
          path: target,
          chain: [...current.chain, relative(repoRoot, target)],
        });
      }
    }
  }
  return null;
}

/**
 * TypeScript is a node-side checker, not an encounter-app dependency. This
 * source-graph assertion gives the offending chain at edit time; the build's
 * unchanged byte scan independently proves that no compiler bytes ship.
 */
describe('the TypeScript compiler is never in the encounter-app bundle', () => {
  it('does not occur in the encounter-app static import graph', () => {
    const chain = typescriptImportChain();
    expect(
      chain,
      `encounter-app statically reaches the TypeScript compiler:\n${chain?.join(' -> ') ?? ''}`,
    ).toBeNull();
  });
});
