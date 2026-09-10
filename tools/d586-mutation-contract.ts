import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

export const MUTATION_REGISTRY_VERSION = 'd586-elevation-mutants-v1' as const;

export interface MutationSelector {
  readonly nodeKind: string;
  readonly name?: string;
  readonly within?: string;
  readonly text?: string;
}

export interface ElevationMutation {
  readonly id: string;
  readonly phase: 'type' | 'runtime';
  readonly source: string;
  readonly selector: MutationSelector;
  readonly replacement: string;
  readonly spec: string;
  readonly title: string;
  readonly expectedDiagnostic?: string;
}

export interface MutationRegistry {
  readonly version: typeof MUTATION_REGISTRY_VERSION;
  readonly mutations: readonly ElevationMutation[];
}

export interface MutationResult {
  readonly id: string;
  readonly phase: 'type' | 'runtime';
  readonly status: 'killed';
  readonly spec: string;
  readonly title: string;
  readonly sourceShaBefore: string;
  readonly mutantSha: string;
  readonly sourceShaAfter: string;
}

interface JsonAssertionResult {
  readonly title: string;
  readonly fullName: string;
  readonly status: string;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredString(
  object: Readonly<Record<string, unknown>>,
  key: string,
): string {
  const value = object[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Mutation registry requires string ${key}.`);
  }
  return value;
}

function optionalString(
  object: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined {
  const value = object[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Mutation registry ${key} must be a non-empty string.`);
  }
  return value;
}

export function parseMutationRegistry(value: unknown): MutationRegistry {
  const root = objectValue(value);
  if (root === null || root.version !== MUTATION_REGISTRY_VERSION) {
    throw new Error(`Mutation registry version must be ${MUTATION_REGISTRY_VERSION}.`);
  }
  if (!Array.isArray(root.mutations)) {
    throw new Error('Mutation registry requires a mutations array.');
  }
  const mutations = root.mutations.map((entry): ElevationMutation => {
    const object = objectValue(entry);
    if (object === null) throw new Error('Mutation row must be an object.');
    const phase = object.phase;
    if (phase !== 'type' && phase !== 'runtime') {
      throw new Error('Mutation phase must be type or runtime.');
    }
    const selectorObject = objectValue(object.selector);
    if (selectorObject === null) {
      throw new Error('Mutation row requires an AST selector.');
    }
    const selector: MutationSelector = {
      nodeKind: requiredString(selectorObject, 'nodeKind'),
      ...(optionalString(selectorObject, 'name') === undefined
        ? {}
        : { name: requiredString(selectorObject, 'name') }),
      ...(optionalString(selectorObject, 'within') === undefined
        ? {}
        : { within: requiredString(selectorObject, 'within') }),
      ...(optionalString(selectorObject, 'text') === undefined
        ? {}
        : { text: requiredString(selectorObject, 'text') }),
    };
    const expectedDiagnostic = optionalString(object, 'expectedDiagnostic');
    if (phase === 'type' && expectedDiagnostic === undefined) {
      throw new Error('Type mutation requires expectedDiagnostic.');
    }
    return {
      id: requiredString(object, 'id'),
      phase,
      source: requiredString(object, 'source'),
      selector,
      replacement: requiredString(object, 'replacement'),
      spec: requiredString(object, 'spec'),
      title: requiredString(object, 'title'),
      ...(expectedDiagnostic === undefined ? {} : { expectedDiagnostic }),
    };
  });
  const ids = mutations.map((mutation) => mutation.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Mutation registry IDs must be unique.');
  }
  return { version: MUTATION_REGISTRY_VERSION, mutations };
}

function declarationName(node: ts.Node): string | null {
  if (
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isPropertySignature(node)
  ) {
    return node.name?.getText() ?? null;
  }
  return null;
}

function hasNamedAncestor(node: ts.Node, name: string): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (declarationName(current) === name) return true;
    current = current.parent;
  }
  return false;
}

export function injectAstMutation(
  path: string,
  source: string,
  mutation: Pick<ElevationMutation, 'selector' | 'replacement'>,
): string {
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const matches: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    const selector = mutation.selector;
    const kindMatches = ts.SyntaxKind[node.kind] === selector.nodeKind;
    const nameMatches = selector.name === undefined || declarationName(node) === selector.name;
    const ancestorMatches = selector.within === undefined || hasNamedAncestor(node, selector.within);
    const textMatches = selector.text === undefined || node.getText(sourceFile) === selector.text;
    if (kindMatches && nameMatches && ancestorMatches && textMatches) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (matches.length !== 1) {
    throw new Error(`AST selector matched ${String(matches.length)} nodes; expected exactly one.`);
  }
  const match = matches[0];
  if (match === undefined) throw new Error('AST selector unexpectedly had no match.');
  return `${source.slice(0, match.getStart(sourceFile))}${mutation.replacement}${source.slice(match.end)}`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseJsonReport(value: unknown): readonly JsonAssertionResult[] {
  const root = objectValue(value);
  if (root === null || !Array.isArray(root.testResults)) {
    throw new Error('Vitest JSON report has no testResults.');
  }
  return root.testResults.flatMap((testResult) => {
    const result = objectValue(testResult);
    if (result === null || !Array.isArray(result.assertionResults)) return [];
    return result.assertionResults.map((assertion): JsonAssertionResult => {
      const row = objectValue(assertion);
      if (row === null) throw new Error('Vitest assertion result must be an object.');
      return {
        title: requiredString(row, 'title'),
        fullName: requiredString(row, 'fullName'),
        status: requiredString(row, 'status'),
      };
    });
  });
}

async function runVitest(
  root: string,
  spec: string,
  reportPath: string,
  configPath?: string,
  environment?: Readonly<Record<string, string>>,
): Promise<{ readonly exitCode: number; readonly assertions: readonly JsonAssertionResult[]; readonly output: string }> {
  const executable = resolve(root, 'node_modules/vitest/vitest.mjs');
  const arguments_ = [
    executable, 'run', '--configLoader', 'runner', '--maxWorkers=1',
    '--fileParallelism=false', '--reporter=json', `--outputFile=${reportPath}`,
    ...(configPath === undefined ? [] : ['--config', configPath]),
    spec,
  ];
  const result = spawnSync(process.execPath, arguments_, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  let assertions: readonly JsonAssertionResult[] = [];
  try {
    assertions = parseJsonReport(JSON.parse(await readFile(reportPath, 'utf8')));
  } catch (error) {
    throw new Error(`Vitest did not produce a readable report.\n${output}`, { cause: error });
  }
  return { exitCode: result.status ?? 1, assertions, output };
}

function readCompilerConfiguration(root: string, path: string): ts.ParsedCommandLine {
  const absolute = resolve(root, path);
  const config = ts.readConfigFile(absolute, ts.sys.readFile);
  if (config.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }
  return ts.parseJsonConfigFileContent(config.config, ts.sys, root, undefined, absolute);
}

function compileWithOverlay(
  root: string,
  overlay?: { readonly path: string; readonly source: string },
): readonly ts.Diagnostic[] {
  return ['tsconfig.app.json', 'tsconfig.node.json'].flatMap((configPath) => {
    const config = readCompilerConfiguration(root, configPath);
    const host = ts.createCompilerHost(config.options);
    const originalReadFile = host.readFile.bind(host);
    host.readFile = (path) =>
      overlay !== undefined && resolve(path) === resolve(overlay.path)
        ? overlay.source
        : originalReadFile(path);
    host.getSourceFile = (path, languageVersion) => {
      const text = host.readFile(path);
      return text === undefined
        ? undefined
        : ts.createSourceFile(path, text, languageVersion, true);
    };
    const program = ts.createProgram({
      rootNames: config.fileNames,
      options: config.options,
      host,
      ...(config.projectReferences === undefined
        ? {}
        : { projectReferences: config.projectReferences }),
    });
    return ts.getPreEmitDiagnostics(program);
  });
}

function diagnosticText(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (diagnostic.file === undefined) return message;
  const start = diagnostic.start ?? 0;
  const location = diagnostic.file.getLineAndCharacterOfPosition(start);
  const sourceLine = diagnostic.file.text.split(/\r?\n/u)[location.line]?.trim() ?? '';
  let enclosingAlias = '';
  const visit = (node: ts.Node): void => {
    if (node.getStart(diagnostic.file) <= start && node.end >= start) {
      if (ts.isTypeAliasDeclaration(node)) enclosingAlias = node.name.text;
      ts.forEachChild(node, visit);
    }
  };
  visit(diagnostic.file);
  const assertion = enclosingAlias.length === 0 ? '' : `[${enclosingAlias}] `;
  return `${diagnostic.file.fileName}:${String(location.line + 1)}:${String(location.character + 1)} ${assertion}${sourceLine} ${message}`;
}

async function runtimeConfig(
  directory: string,
  root: string,
  sourcePath: string,
): Promise<string> {
  const configPath = join(directory, 'vitest.mutation.config.mjs');
  const baseConfig = resolve(root, 'vitest.config.ts');
  const vitestConfig = resolve(root, 'node_modules/vitest/dist/config.js');
  const contents = [
    `import { defineConfig, mergeConfig } from ${JSON.stringify(vitestConfig)};`,
    `import baseConfig from ${JSON.stringify(baseConfig)};`,
    `const sourcePath = ${JSON.stringify(resolve(sourcePath))};`,
    "const overlay = Buffer.from(process.env.D586_MUTATED_SOURCE_BASE64 ?? '', 'base64').toString('utf8');",
    "const plugin = { name: 'd586-in-memory-mutation', enforce: 'pre', load(id) {",
    "  return id.split('?')[0] === sourcePath ? overlay : null;",
    '} };',
    'export default mergeConfig(baseConfig, defineConfig({ plugins: [plugin] }));',
    '',
  ].join('\n');
  await writeFile(configPath, contents, 'utf8');
  return configPath;
}

export async function runMutationContract(
  root: string,
  registry: MutationRegistry,
  ids: readonly string[],
): Promise<readonly MutationResult[]> {
  const selected = ids.flatMap((id) => {
    const mutation = registry.mutations.find((candidate) => candidate.id === id);
    if (mutation === undefined) throw new Error(`Unknown mutation ID: ${id}.`);
    return [mutation];
  });
  if (selected.length === 0 || new Set(ids).size !== ids.length) {
    throw new Error('Mutation IDs must be a non-empty unique list.');
  }

  const initialStatus = spawnSync('git', ['status', '--porcelain=v2'], {
    cwd: root, encoding: 'utf8',
  }).stdout;
  const directory = await mkdtemp(join(tmpdir(), 'd586-mutations-'));
  const results: MutationResult[] = [];
  try {
    const runtimeSpecs = [...new Set(selected
      .filter((mutation) => mutation.phase === 'runtime')
      .map((mutation) => mutation.spec))];
    for (const [index, spec] of runtimeSpecs.entries()) {
      const baseline = await runVitest(
        root,
        spec,
        join(directory, `baseline-${String(index)}.json`),
      );
      if (baseline.exitCode !== 0 || baseline.assertions.some((row) => row.status !== 'passed')) {
        throw new Error(`Runtime baseline is not green for ${spec}.\n${baseline.output}`);
      }
    }
    if (selected.some((mutation) => mutation.phase === 'type')) {
      const baselineDiagnostics = compileWithOverlay(root);
      if (baselineDiagnostics.length > 0) {
        throw new Error(`Type baseline is not green:\n${baselineDiagnostics.map(diagnosticText).join('\n')}`);
      }
    }

    for (const [index, mutation] of selected.entries()) {
      const sourcePath = resolve(root, mutation.source);
      const original = await readFile(sourcePath, 'utf8');
      const originalSha = sha256(original);
      const mutated = injectAstMutation(sourcePath, original, mutation);
      const mutantSha = sha256(mutated);
      if (mutation.phase === 'type') {
        const diagnostics = compileWithOverlay(root, { path: sourcePath, source: mutated });
        const intended = mutation.expectedDiagnostic;
        if (
          intended === undefined ||
          diagnostics.length === 0 ||
          !diagnostics.some((diagnostic) => diagnosticText(diagnostic).includes(intended))
        ) {
          throw new Error(
            `${mutation.id} survived or produced the wrong type diagnostic:\n${diagnostics.map(diagnosticText).join('\n')}`,
          );
        }
      } else {
        const configPath = await runtimeConfig(directory, root, sourcePath);
        const run = await runVitest(
          root,
          mutation.spec,
          join(directory, `mutant-${String(index)}.json`),
          configPath,
          { D586_MUTATED_SOURCE_BASE64: Buffer.from(mutated).toString('base64') },
        );
        const failures = run.assertions.filter((assertion) => assertion.status === 'failed');
        if (
          run.exitCode === 0 ||
          failures.length !== 1 ||
          failures[0]?.title !== mutation.title
        ) {
          throw new Error(
            `${mutation.id} survived or failed the wrong test; failures=${failures.map((row) => row.fullName).join(', ')}.\n${run.output}`,
          );
        }
      }
      const after = await readFile(sourcePath, 'utf8');
      const sourceShaAfter = sha256(after);
      if (sourceShaAfter !== originalSha) {
        throw new Error(`${mutation.id} changed its repository source file.`);
      }
      results.push({
        id: mutation.id,
        phase: mutation.phase,
        status: 'killed',
        spec: mutation.spec,
        title: mutation.title,
        sourceShaBefore: originalSha,
        mutantSha,
        sourceShaAfter,
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  const finalStatus = spawnSync('git', ['status', '--porcelain=v2'], {
    cwd: root, encoding: 'utf8',
  }).stdout;
  if (initialStatus !== finalStatus) {
    throw new Error('Mutation contract changed repository status.');
  }
  return results;
}

function idsArgument(arguments_: readonly string[]): readonly string[] {
  const index = arguments_.indexOf('--ids');
  const value = index < 0 ? undefined : arguments_[index + 1];
  if (value === undefined || value.length === 0) {
    throw new Error('Mutation contract requires --ids.');
  }
  return value.split(',').filter((id) => id.length > 0);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const registryPath = resolve(root, 'tests/fixtures/d586-elevation-mutants.json');
  const registry = parseMutationRegistry(JSON.parse(await readFile(registryPath, 'utf8')));
  const rawIds = idsArgument(process.argv.slice(2));
  const expandedIds = rawIds.flatMap((id) =>
    id.endsWith('*')
      ? registry.mutations.filter((mutation) => mutation.id.startsWith(id.slice(0, -1))).map((mutation) => mutation.id)
      : [id],
  );
  const results = await runMutationContract(root, registry, expandedIds);
  process.stdout.write(`${JSON.stringify({ killed: results }, null, 2)}\n`);
}

if (process.env.VITEST === undefined) {
  await main();
}
