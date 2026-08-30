import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const FORBIDDEN_RUNTIME_FILES = [
  'src/combat/encounter.ts',
  'src/combat/random.ts',
  'src/vtt/session-encounter-reducer.ts',
  'src/vtt/session-persistence.ts',
  'src/vtt/local-session-store.ts',
  'src/vtt/save-manager.ts',
  'src/vtt/save-folder.ts',
] as const;

function normalized(path: string): string {
  return path.split(sep).join('/');
}

async function existingModule(candidate: string): Promise<string | null> {
  const queryIndex = candidate.indexOf('?');
  const pathCandidate = queryIndex === -1 ? candidate : candidate.slice(0, queryIndex);
  for (const path of [
    pathCandidate,
    `${pathCandidate}.ts`,
    `${pathCandidate}.tsx`,
    resolve(pathCandidate, 'index.ts'),
  ]) {
    try {
      if ((await stat(path)).isFile()) return resolve(path);
    } catch {
      // A missing candidate is expected while resolving extensionless imports.
    }
  }
  return null;
}

function runtimeSpecifiers(path: string, source: string): readonly string[] {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      if (clause?.isTypeOnly !== true && ts.isStringLiteral(node.moduleSpecifier)) {
        const bindings = clause?.namedBindings;
        const hasRuntimeBinding = clause === undefined || clause.name !== undefined ||
          bindings === undefined || ts.isNamespaceImport(bindings) ||
          bindings.elements.some((element) => !element.isTypeOnly);
        if (hasRuntimeBinding) specifiers.push(node.moduleSpecifier.text);
      }
      return;
    }
    if (ts.isExportDeclaration(node) && node.isTypeOnly !== true && node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
      return;
    }
    const dynamicImport = ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
      ? node.arguments[0]
      : undefined;
    if (dynamicImport !== undefined && ts.isStringLiteral(dynamicImport)) {
      specifiers.push(dynamicImport.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return specifiers;
}

export async function collectEngineMcpRuntimeGraph(
  entrypoint = resolve('tools/engine-mcp-server.ts'),
): Promise<readonly string[]> {
  const queue = [resolve(entrypoint)];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined || visited.has(path)) continue;
    visited.add(path);
    const source = await readFile(path, 'utf8');
    for (const specifier of runtimeSpecifiers(path, source)) {
      if (!specifier.startsWith('.')) continue;
      const dependency = await existingModule(resolve(dirname(path), specifier));
      if (dependency === null) throw new Error(`Unresolved runtime import ${specifier} from ${path}.`);
      if (!visited.has(dependency)) queue.push(dependency);
    }
  }
  return [...visited].sort();
}

export async function engineMcpImportBoundaryFailures(
  entrypoint = resolve('tools/engine-mcp-server.ts'),
): Promise<readonly string[]> {
  const root = resolve('.');
  const graph = await collectEngineMcpRuntimeGraph(entrypoint);
  const relativeGraph = new Set(graph.map((path) => normalized(relative(root, path))));
  return FORBIDDEN_RUNTIME_FILES.filter((path) => relativeGraph.has(path));
}

async function walk(path: string): Promise<readonly string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export interface EngineMcpArtifactScan {
  readonly status: 'VERIFIED' | 'FAILED';
  readonly scope: 'SOURCE_GRAPH_AND_REPOSITORY_PATHS_WITHOUT_GIT';
  readonly graphFileCount: number;
  readonly failures: readonly string[];
}

export async function scanEngineMcpArtifacts(
  entrypoint = resolve('tools/engine-mcp-server.ts'),
): Promise<EngineMcpArtifactScan> {
  const root = resolve('.');
  const graph = await collectEngineMcpRuntimeGraph(entrypoint);
  const failures: string[] = [];
  for (const path of graph) {
    const source = await readFile(path, 'utf8');
    const label = normalized(relative(root, path));
    if (source.includes('CC_BY_SA_SENTINEL_MUST_NEVER_CROSS')) failures.push(`${label}: CC-BY-SA sentinel bytes`);
    if (/\b(?:codex-thread|claude-session|opencode-session|pi-session)-[A-Za-z0-9_-]+\b/u.test(source)) {
      failures.push(`${label}: agent session transcript token`);
    }
    if (/\b(?:console\.error|process\.stderr\.write)\b/u.test(source)) {
      failures.push(`${label}: unbounded direct stderr writer`);
    }
  }
  for (const base of ['src', 'tests', 'tools']) {
    for (const path of await walk(resolve(base))) {
      const label = normalized(relative(root, path));
      if (extname(path) === '.jsonl' && !label.includes('.SIMULATED.')) {
        failures.push(`${label}: non-SIMULATED session transcript path`);
      }
    }
  }
  return {
    status: failures.length === 0 ? 'VERIFIED' : 'FAILED',
    scope: 'SOURCE_GRAPH_AND_REPOSITORY_PATHS_WITHOUT_GIT',
    graphFileCount: graph.length,
    failures,
  };
}
