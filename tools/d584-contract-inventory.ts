import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';

export const INVENTORY_FORMAT = 'd584-contract-inventory-v1' as const;

export const SLICE_ONE_RUNTIME_SPECS = [
  'tests/unit/combat/elevation.test.ts',
  'tests/unit/combat/movement-speeds.test.ts',
  'tests/unit/tools/d584-contract-inventory.test.ts',
  'tests/unit/tools/d586-mutation-contract.test.ts',
] as const;

export const INHERITED_D576_RUNTIME_SPECS = [
  'tests/unit/tools/ai-dm-screenshot-probe.test.ts',
] as const;

export interface InventoryArguments {
  readonly base: string;
  readonly baseline: string;
  readonly plan: string;
  readonly out: string;
  readonly runtimeOut: string;
}

export interface ChangeEntry {
  readonly status: string;
  readonly path: string;
}

export interface BaselinePath {
  readonly path: string;
  readonly status: string;
  readonly indexBlob: string;
  readonly worktreeSha256: string;
}

export interface BaselineRecord {
  readonly base: string;
  readonly head: string;
  readonly status: 'clean' | 'dirty';
  readonly paths: readonly BaselinePath[];
}

export interface ImportGraph {
  readonly importsByConsumer: Readonly<Record<string, readonly string[]>>;
  readonly consumersByProducer: Readonly<Record<string, readonly string[]>>;
}

export interface ContractInventory {
  readonly format: typeof INVENTORY_FORMAT;
  readonly base: string;
  readonly head: string;
  readonly plan: string;
  readonly baseline: BaselineRecord;
  readonly domains: {
    readonly committed: readonly ChangeEntry[];
    readonly staged: readonly ChangeEntry[];
    readonly unstaged: readonly ChangeEntry[];
    readonly untracked: readonly ChangeEntry[];
  };
  readonly planManifest: readonly string[];
  readonly changedOwnedPaths: readonly string[];
  readonly preExistingExclusions: readonly string[];
  readonly branchTestInventory: readonly string[];
  readonly missingBranchTests: readonly string[];
  readonly producerPaths: readonly string[];
  readonly runtimeSpecs: readonly string[];
  readonly compileControls: readonly string[];
  readonly importGraphRuntimeSpecs: readonly string[];
  readonly uncontrolledProducers: readonly string[];
  readonly counts: {
    readonly planManifest: number;
    readonly changedOwnedPaths: number;
    readonly preExistingExclusions: number;
    readonly branchTestInventory: number;
    readonly missingBranchTests: number;
    readonly producerPaths: number;
    readonly runtimeSpecs: number;
    readonly compileControls: number;
    readonly importGraphRuntimeSpecs: number;
  };
}

function valueAfter(arguments_: readonly string[], flag: string): string {
  const index = arguments_.indexOf(flag);
  const value = index < 0 ? undefined : arguments_[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Missing required ${flag} value.`);
  }
  return value;
}

export function parseInventoryArguments(
  arguments_: readonly string[],
): InventoryArguments {
  return {
    base: valueAfter(arguments_, '--base'),
    baseline: valueAfter(arguments_, '--baseline'),
    plan: valueAfter(arguments_, '--plan'),
    out: valueAfter(arguments_, '--out'),
    runtimeOut: valueAfter(arguments_, '--runtime-out'),
  };
}

export function parsePlanManifest(plan: string): readonly string[] {
  const start = plan.indexOf('## Slices and exact files');
  const end = plan.indexOf('## D584.4 cumulative verification contract');
  if (start < 0 || end <= start) {
    throw new Error('Plan does not contain the bounded slices manifest.');
  }
  const manifest = plan.slice(start, end);
  const paths = [...manifest.matchAll(/`((?:src|tests|tools)\/[^`]+)`/gu)]
    .map((match) => match[1])
    .filter((path): path is string => path !== undefined);
  return [...new Set(paths)].sort();
}

export function parseBaseline(text: string): BaselineRecord {
  let base: string | undefined;
  let head: string | undefined;
  let status: 'clean' | 'dirty' | undefined;
  const paths: BaselinePath[] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (line.length === 0 || line.startsWith('#')) continue;
    const fields = line.split('\t');
    if (fields[0] === 'base' && fields[1] !== undefined) base = fields[1];
    else if (fields[0] === 'head' && fields[1] !== undefined) head = fields[1];
    else if (fields[0] === 'status' && (fields[1] === 'clean' || fields[1] === 'dirty')) {
      status = fields[1];
    } else if (
      fields[0] === 'path' &&
      fields[1] !== undefined &&
      fields[2] !== undefined &&
      fields[3] !== undefined &&
      fields[4] !== undefined
    ) {
      paths.push({
        path: fields[1],
        status: fields[2],
        indexBlob: fields[3],
        worktreeSha256: fields[4],
      });
    } else {
      throw new Error(`Invalid baseline row: ${line}`);
    }
  }
  if (base === undefined || head === undefined || status === undefined) {
    throw new Error('Baseline must record base, head, and clean/dirty status.');
  }
  if ((status === 'clean') !== (paths.length === 0)) {
    throw new Error('Baseline clean/dirty status disagrees with its path rows.');
  }
  return { base, head, status, paths };
}

export function parseNameStatus(text: string): readonly ChangeEntry[] {
  return text.split(/\r?\n/u).flatMap((line) => {
    if (line.length === 0) return [];
    const fields = line.split('\t');
    const status = fields[0];
    const path = fields.at(-1);
    if (status === undefined || path === undefined) {
      throw new Error(`Invalid name-status row: ${line}`);
    }
    return [{ status, path }];
  });
}

/** Keeps inherited branch-test selection anchored to the merge base. */
export function branchTestDiffArguments(base: string): readonly string[] {
  return ['diff', '--name-status', `${base}...HEAD`, '--', 'tests'];
}

/** Resolves a moving branch ref to the immutable base actually shared with HEAD. */
export function inventoryBaseArguments(base: string): readonly string[] {
  return ['merge-base', base, 'HEAD'];
}

function matchesManifest(path: string, manifest: readonly string[]): boolean {
  return manifest.some((entry) =>
    entry.endsWith('/**') ? path.startsWith(entry.slice(0, -2)) : path === entry,
  );
}

function importSpecifiers(source: string): readonly string[] {
  const expressions = [
    /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /import\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];
  return expressions.flatMap((expression) =>
    [...source.matchAll(expression)]
      .map((match) => match[1])
      .filter((specifier): specifier is string => specifier?.startsWith('.') === true),
  );
}

function resolveRelativeImport(
  consumer: string,
  specifier: string,
  files: ReadonlySet<string>,
): string | null {
  const raw = resolve(dirname(consumer), specifier);
  const extension = extname(raw);
  const bases = extension.length === 0
    ? [raw, `${raw}.ts`, `${raw}.tsx`, `${raw}.mts`, `${raw}.mjs`, resolve(raw, 'index.ts')]
    : [raw, extension === '.js' ? `${raw.slice(0, -3)}.ts` : raw];
  return bases.find((candidate) => files.has(candidate)) ?? null;
}

export async function buildImportGraph(
  root: string,
  relativeFiles: readonly string[],
): Promise<ImportGraph> {
  const absoluteFiles = new Set(relativeFiles.map((path) => resolve(root, path)));
  const imports = new Map<string, Set<string>>();
  const consumers = new Map<string, Set<string>>();
  await Promise.all([...absoluteFiles].map(async (consumer) => {
    let source: string;
    try {
      source = await readFile(consumer, 'utf8');
    } catch {
      return;
    }
    for (const specifier of importSpecifiers(source)) {
      const producer = resolveRelativeImport(consumer, specifier, absoluteFiles);
      if (producer === null) continue;
      const consumerPath = relative(root, consumer);
      const producerPath = relative(root, producer);
      (imports.get(consumerPath) ?? (() => {
        const values = new Set<string>();
        imports.set(consumerPath, values);
        return values;
      })()).add(producerPath);
      (consumers.get(producerPath) ?? (() => {
        const values = new Set<string>();
        consumers.set(producerPath, values);
        return values;
      })()).add(consumerPath);
    }
  }));
  const sortedRecord = (values: ReadonlyMap<string, ReadonlySet<string>>) =>
    Object.fromEntries([...values].sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entries]) => [key, [...entries].sort()]));
  return {
    importsByConsumer: sortedRecord(imports),
    consumersByProducer: sortedRecord(consumers),
  };
}

export function reverseTestClosure(
  graph: ImportGraph,
  producers: readonly string[],
): readonly string[] {
  const pending = [...producers];
  const visited = new Set(pending);
  const tests = new Set<string>();
  while (pending.length > 0) {
    const producer = pending.shift();
    if (producer === undefined) break;
    for (const consumer of graph.consumersByProducer[producer] ?? []) {
      if (consumer.startsWith('tests/') && consumer.endsWith('.test.ts')) {
        tests.add(consumer);
      }
      if (!visited.has(consumer)) {
        visited.add(consumer);
        pending.push(consumer);
      }
    }
  }
  return [...tests].sort();
}

function git(root: string, arguments_: readonly string[]): string {
  return execFileSync('git', arguments_, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function allRepositoryFiles(root: string): readonly string[] {
  const pathspecs = ['*.ts', '*.tsx', '*.mts', '*.mjs'];
  const tracked = git(root, ['ls-files', '--', ...pathspecs]).split(/\r?\n/u);
  const untracked = git(root, [
    'ls-files', '--others', '--exclude-standard', '--', ...pathspecs,
  ])
    .split(/\r?\n/u);
  return [...new Set([...tracked, ...untracked])]
    .filter((path) => /\.(?:ts|tsx|mts|mjs)$/u.test(path))
    .sort();
}

export async function collectContractInventory(
  root: string,
  arguments_: InventoryArguments,
): Promise<ContractInventory> {
  const [planText, baselineText] = await Promise.all([
    readFile(resolve(root, arguments_.plan), 'utf8'),
    readFile(arguments_.baseline, 'utf8'),
  ]);
  const baseline = parseBaseline(baselineText);
  const base = git(root, inventoryBaseArguments(arguments_.base)).trim();
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  if (baseline.base !== base || baseline.head !== head) {
    throw new Error('Baseline base/head does not match this inventory run.');
  }

  const domains = {
    committed: parseNameStatus(git(root, ['diff', '--name-status', `${base}..HEAD`])),
    staged: parseNameStatus(git(root, ['diff', '--cached', '--name-status'])),
    unstaged: parseNameStatus(git(root, ['diff', '--name-status'])),
    untracked: git(root, ['ls-files', '--others', '--exclude-standard'])
      .split(/\r?\n/u)
      .filter((path) => path.length > 0)
      .map((path) => ({ status: '??', path })),
  } satisfies ContractInventory['domains'];

  const planManifest = parsePlanManifest(planText);
  const allChanges = [
    ...domains.committed,
    ...domains.staged,
    ...domains.unstaged,
    ...domains.untracked,
  ];
  const baselinePaths = new Set(baseline.paths.map((entry) => entry.path));
  const changedOwnedPaths = [...new Set(allChanges
    .map((entry) => entry.path)
    .filter((path) => matchesManifest(path, planManifest) && !baselinePaths.has(path)))]
    .sort();
  const preExistingExclusions = [...baselinePaths].sort();

  const branchTestEntries = parseNameStatus(
    git(root, branchTestDiffArguments(base)),
  );
  const branchTestInventory = branchTestEntries
    .filter((entry) => entry.status !== 'D' && entry.path.endsWith('.test.ts'))
    .map((entry) => entry.path);
  const missingBranchTests = branchTestEntries
    .filter((entry) => entry.status === 'D')
    .map((entry) => entry.path);
  const producerPaths = changedOwnedPaths.filter((path) =>
    /^(?:src|tools)\/.*\.ts$/u.test(path),
  );
  const repositoryFiles = allRepositoryFiles(root);
  const graph = await buildImportGraph(root, repositoryFiles);
  const importGraphRuntimeSpecs = reverseTestClosure(graph, producerPaths);
  const runtimeSpecs = [...new Set([
    ...SLICE_ONE_RUNTIME_SPECS,
    ...INHERITED_D576_RUNTIME_SPECS,
    ...branchTestInventory,
    ...importGraphRuntimeSpecs,
  ])].filter((path) => repositoryFiles.includes(path)).sort();
  const compileControls = changedOwnedPaths
    .filter((path) => path.startsWith('tests/types/') && path.endsWith('-test.ts'));
  const controlled = new Set<string>();
  for (const producer of producerPaths) {
    const consumers = graph.consumersByProducer[producer] ?? [];
    if (consumers.some((path) =>
      runtimeSpecs.includes(path) || compileControls.includes(path),
    )) controlled.add(producer);
  }
  const uncontrolledProducers = producerPaths
    .filter((producer) => !controlled.has(producer));

  const counts = {
    planManifest: planManifest.length,
    changedOwnedPaths: changedOwnedPaths.length,
    preExistingExclusions: preExistingExclusions.length,
    branchTestInventory: branchTestInventory.length,
    missingBranchTests: missingBranchTests.length,
    producerPaths: producerPaths.length,
    runtimeSpecs: runtimeSpecs.length,
    compileControls: compileControls.length,
    importGraphRuntimeSpecs: importGraphRuntimeSpecs.length,
  };
  return {
    format: INVENTORY_FORMAT,
    base,
    head,
    plan: arguments_.plan,
    baseline,
    domains,
    planManifest,
    changedOwnedPaths,
    preExistingExclusions,
    branchTestInventory: [...new Set(branchTestInventory)].sort(),
    missingBranchTests: [...new Set(missingBranchTests)].sort(),
    producerPaths,
    runtimeSpecs,
    compileControls,
    importGraphRuntimeSpecs,
    uncontrolledProducers,
    counts,
  };
}

async function main(): Promise<void> {
  const arguments_ = parseInventoryArguments(process.argv.slice(2));
  const root = process.cwd();
  const inventory = await collectContractInventory(root, arguments_);
  await Promise.all([
    writeFile(arguments_.out, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8'),
    writeFile(arguments_.runtimeOut, `${inventory.runtimeSpecs.join('\n')}\n`, 'utf8'),
  ]);
  if (inventory.uncontrolledProducers.length > 0) {
    throw new Error(
      `Owned producers lack runtime or compile controls: ${inventory.uncontrolledProducers.join(', ')}`,
    );
  }
  process.stdout.write(`${JSON.stringify(inventory.counts)}\n`);
}

if (process.env.VITEST === undefined) {
  await main();
}
