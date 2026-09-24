import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import ts from 'typescript';

const ROOT = resolve(import.meta.dirname, '..');
// Filename-set digest, normalized by demonstrate-then-normalize when PERF-02 split ai-dm-conversation.test.ts
// (D886 §14-15; +3 names, 140 -> 143). Pre-split 140-spec value:
// 60249dadaf466df9b53eec4e9805e41f70b665f358f81cccec3a0271466d1224
export const D583_BASELINE_SHA256 = '700a277da436a2cd1798b291e13825ffd4ea973a161e6ce4cb5c03390cd2c6d4';
export const SESSION_TRANSACTION_BASELINE_SHA256 = 'c79d8d15ea7b292efa9d5a21bcba20454072f267300ddd1428b3cfbd91d3a6df';
export const TRIAL_CORE_RECONCILIATION_BASELINE_SHA256 =
  'd798c8db3174b31ba8c2663d8c5702b4981e33d282fdfa656d495d05e8e9a00a';

export const SESSION_TRANSACTION_BASELINE_SPECS = [
  'tests/integration/vtt/ai-dm-combat-model.test.ts',
  'tests/unit/combat/resolution.test.ts',
  'tests/unit/tools/ai-dm-arena.test.ts',
  'tests/unit/tools/ai-dm-board-delivery.test.ts',
  'tests/unit/tools/ai-dm-conversation.test.ts',
  'tests/unit/tools/ai-dm-skills.test.ts',
  'tests/unit/tools/local-openai-conversation.SIMULATED.test.ts',
  'tests/unit/tools/rl-generate-data.test.ts',
  'tests/unit/vtt/arena-basis-brutal-b.test.ts',
  'tests/unit/vtt/composite-turn-proposals.test.ts',
  'tests/unit/vtt/composition.test.ts',
  'tests/unit/vtt/engine-context-integrations.test.ts',
  'tests/unit/vtt/engine-round-session.test.ts',
  'tests/unit/vtt/hypnotic-pattern-probe.test.ts',
  'tests/unit/vtt/mixed-kind-multiattack.test.ts',
  'tests/unit/vtt/reaction-guidance.test.ts',
  'tests/unit/vtt/renderer-profile.test.ts',
  'tests/unit/vtt/session-command-transaction.test.ts',
  'tests/unit/vtt/unicorns-blessing-consistency.test.ts',
];

export const TRIAL_CORE_RECONCILIATION_BASELINE_SPECS = [
  'tests/unit/combat/roll-provenance.test.ts',
  'tests/unit/tools/d583-contract-inventory.test.ts',
  'tests/unit/vtt/arena-basis-brutal-b.test.ts',
  'tests/unit/vtt/challenge-feasibility.test.ts',
  'tests/unit/vtt/composite-turn-proposals.test.ts',
  'tests/unit/vtt/engine-context-integrations.test.ts',
  'tests/unit/vtt/engine-round-session.test.ts',
  'tests/unit/vtt/hypnotic-pattern-probe.test.ts',
  'tests/unit/vtt/mixed-kind-multiattack.test.ts',
  'tests/unit/vtt/renderer-profile.test.ts',
  'tests/unit/vtt/session-command-transaction.test.ts',
  'tests/unit/vtt/unicorns-blessing-consistency.test.ts',
];

const GROUPS = {
  'tests/integration/vtt': 'd365-dungeon,dm-encounter-host-live-path,encounter-conclusion,monster-on-hit,pc-algorithm-policy,stored-character-round-trip,survival-policy,vane-warren-session',
  'tests/unit/bridge': 'client,decision-program,js-round-plan-integration,js-turn-program,narration,projection-transport,steering,turn-program-library',
  'tests/unit/combat': 'alerting,controllers-mutation,controllers,creature-cover,creature-space,damage-operations,death-saves,effects,encounter,enforcement-gaps,footprint-increment-two,initiative-modes,persistent-areas,random,resolution,search-memory,spells-batch-two,spells-level-four,spells-level-three,spells-level-two,spells-ranking-r9,spells,tactical-evaluator,terrain,visibility,wild-shape,world-objects',
  'tests/unit/tools': 'ai-dm-arena,ai-dm-board-delivery,ai-dm-board-snapshot,ai-dm-conversation,ai-dm-conversation-adjustments,ai-dm-conversation-final-decisions,ai-dm-conversation-smoke,ai-dm-knowledge-base,ai-dm-screenshot-probe,engine-mcp-boundary,engine-mcp-golden,engine-mcp-handler,generate-arena-basis,los-cover-call-sites,los-cover-era-audit,scrape-content-pack',
  'tests/unit/vtt': 'accessible-board,actor-knowledge,adjustment-exhaustion-coordinator,agent-session-lifecycle,arena-basis-brutal-b,board-chrome,challenge-feasibility,challenge-room-fixtures,choice-branches,composite-turn-proposals,composition,condition-lifecycle,content-pack,d466-b4-spell-payloads,detection-reactions,detection-ui,dm-tactical-intel,encounter-board-projection,encounter-projections,engine-context-integrations,engine-host-integration,engine-opportunity-movement-intel,engine-query-port,engine-round-session,engine-state-capsule,equipment,flammable-surfaces,footprint-increment-four,footprint-increment-three,forms,hidden-option-boundary,hypnotic-pattern-probe,last-seen,legendary-monsters,legendary-windows,local-session-store,mixed-kind-multiattack,monster-feature-support,monster-omitted-riders,offered-option-paths,option-modeling,option-outcome,party-pack-tiered-range,party-pack,party-session-state,plan-materiality,preview-hidden-rolls,projected-movement-options,projection-types,prose-renderer,reaction-guidance,reactions,recovery-capability,reference-party-size,refusal-handling,regret,renderer-profile,replay,roll-defense-modifiers,roll-modifiers-d351,room-generator-los-cover,room-generator,room-roster-preflight,save-manager,scripted-party-round,semantic-board-payload,senses,sequenced-effects,session-persistence,session-timeline-record,shared-outcome,snippets,spatial-movement,speculative-planning,stable-dom-render,summons,sustained-effects,symmetric-pc-evaluator,tactical-evaluator-r02,target-selection,turn-exhaustion-coordinator,vane-warren,watabou-adapter,wild-shape-persistence',
} as const;

export const D583_BASELINE_SPECS = Object.entries(GROUPS).flatMap(([directory, names]) =>
  names.split(',').map((name) => `${directory}/${name}.test.ts`)).sort();

export function inventoryDigest(paths: readonly string[]): string {
  return createHash('sha256').update(`${paths.join('\n')}\n`).digest('hex');
}

export function healingPotionUsesComponentIngress(): boolean {
  const encounter = readFileSync(resolve(ROOT, 'src/combat/encounter.ts'), 'utf8');
  const start = encounter.indexOf("case 'drink_healing_potion'");
  const end = encounter.indexOf('\n    case ', start + 1);
  if (start < 0 || end <= start) return false;
  const branch = encounter.slice(start, end);
  return branch.includes('const healing = rollDice(context.rng') && !branch.includes('healing += rollDie(');
}

export function reverseConsumerClosure(
  seeds: readonly string[],
  reverse: ReadonlyMap<string, ReadonlySet<string>> | Readonly<Record<string, readonly string[]>>,
): ReadonlySet<string> {
  const queue = [...seeds];
  const visited = new Set(queue);
  const consumers = new Set<string>();
  while (queue.length > 0) {
    const dependency = queue.shift();
    if (dependency === undefined) break;
    const directConsumers = reverse instanceof Map
      ? reverse.get(dependency) ?? []
      : (reverse as Readonly<Record<string, readonly string[]>>)[dependency] ?? [];
    for (const consumer of directConsumers) {
      if (consumer.startsWith('tests/') && consumer.endsWith('.test.ts')) consumers.add(consumer);
      if (!visited.has(consumer)) {
        visited.add(consumer);
        queue.push(consumer);
      }
    }
  }
  return consumers;
}

export function contractInventoryUnion(
  d583Baseline: readonly string[],
  transactionBaseline: readonly string[],
  reconciliationBaseline: readonly string[],
  changedSpecs: readonly string[],
  consumers: ReadonlySet<string>,
): readonly string[] {
  return [...new Set([
    ...d583Baseline,
    ...transactionBaseline,
    ...reconciliationBaseline,
    ...changedSpecs,
    ...consumers,
  ])].sort();
}

export interface DependencySpecifier {
  readonly specifier: string;
  readonly typeOnly: boolean;
  readonly syntax: 'import' | 'export' | 'import_equals' | 'dynamic_import' | 'require' | 'import_type';
}

export function dependencySpecifiers(sourceText: string, fileName: string): readonly DependencySpecifier[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result: DependencySpecifier[] = [];
  const add = (specifier: string, typeOnly: boolean, syntax: DependencySpecifier['syntax']): void => {
    result.push({ specifier, typeOnly, syntax });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      add(node.moduleSpecifier.text, node.importClause?.isTypeOnly === true, 'import');
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      add(node.moduleSpecifier.text, node.isTypeOnly, 'export');
    } else if (ts.isImportEqualsDeclaration(node)) {
      if (!ts.isExternalModuleReference(node.moduleReference) || node.moduleReference.expression === undefined ||
        !ts.isStringLiteral(node.moduleReference.expression)) {
        throw new Error(`Rejected unresolved TypeScript import-equals declaration in ${fileName}.`);
      }
      const specifier = node.moduleReference.expression.text;
      if (!specifier.startsWith('.')) {
        throw new Error(`Rejected external TypeScript import-equals declaration ${specifier} in ${fileName}.`);
      }
      add(specifier, node.isTypeOnly, 'import_equals');
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      add(node.argument.literal.text, true, 'import_type');
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const argument = node.arguments[0];
      if (argument !== undefined && ts.isStringLiteral(argument)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(argument.text, false, 'dynamic_import');
        if (ts.isIdentifier(node.expression) && node.expression.text === 'require') add(argument.text, false, 'require');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function sourceFiles(directory: string): readonly string[] {
  const result: string[] = [];
  const visit = (current: string): void => {
    for (const name of readdirSync(current)) {
      if (name === 'node_modules' || name === '.git' || name.startsWith('.tmp')) continue;
      const path = resolve(current, name);
      const info = statSync(path);
      if (info.isDirectory()) visit(path);
      else if (['.ts', '.tsx', '.mts', '.cts'].includes(extname(path))) result.push(relative(ROOT, path));
    }
  };
  visit(directory);
  return result.sort();
}

export interface DependencyIndex {
  readonly sourceFiles: readonly string[];
  readonly reverseEdges: Readonly<Record<string, readonly string[]>>;
}

export function buildDependencyIndex(): DependencyIndex {
  const files = sourceFiles(ROOT);
  const reverse = new Map<string, Set<string>>();
  for (const importer of files) {
    const text = readFileSync(resolve(ROOT, importer), 'utf8');
    for (const dependency of dependencySpecifiers(text, importer)) {
      const resolved = resolveLocal(importer, dependency.specifier);
      if (resolved === null) continue;
      const consumers = reverse.get(resolved) ?? new Set<string>();
      consumers.add(importer);
      reverse.set(resolved, consumers);
    }
  }
  const reverseEdges = Object.fromEntries(
    [...reverse.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dependency, consumers]) => [dependency, Object.freeze([...consumers].sort())]),
  ) as Readonly<Record<string, readonly string[]>>;
  return Object.freeze({
    sourceFiles: Object.freeze([...files]),
    reverseEdges: Object.freeze(reverseEdges),
  });
}

export function resolveLocal(importer: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const pathSpecifier = specifier.split('?')[0];
  if (pathSpecifier === undefined) return null;
  const base = resolve(ROOT, dirname(importer), pathSpecifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.d.ts`,
    `${base}.mts`,
    `${base}.cts`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.d.ts'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return ['.ts', '.tsx', '.mts', '.cts'].includes(extname(candidate)) ? relative(ROOT, candidate) : null;
    }
  }
  throw new Error(`Unresolved relative dependency ${specifier} from ${importer}.`);
}

export type GitRunner = (args: readonly string[]) => string | null;

// Injected runners propagate exceptions; only this default adapter converts Git execution failures to null.
export function gitOutput(args: readonly string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (_error: unknown) {
    return null;
  }
}

function changedPaths(git: GitRunner): readonly string[] {
  const mergedMain = git(['merge-base', 'HEAD', 'main'])?.trim() ?? '';
  const committed = git(['diff', '--name-only', 'main', '--']) ?? '';
  const branchCommitted = new Set((mergedMain === ''
    ? ''
    : git(['diff', '--name-only', mergedMain, '--']) ?? '')
    .split('\n').filter((path) => path.length > 0));
  const untracked = git(['ls-files', '--others', '--exclude-standard']) ?? '';
  const changed = [...new Set(`${committed}\n${untracked}`.split('\n').filter((path) => path.length > 0))].sort();
  for (const path of changed) {
    if (path.startsWith('tests/') && path.endsWith('.test.ts') &&
      !existsSync(resolve(ROOT, path)) && branchCommitted.has(path)) {
      throw new Error(`D583 changed spec was deleted: ${path}`);
    }
  }
  return changed.filter((path) => existsSync(resolve(ROOT, path)));
}

export function buildD583ContractInventory(
  input: Readonly<{
    changedPaths?: readonly string[];
    git?: GitRunner;
    index?: DependencyIndex;
  }> = {},
): readonly string[] {
  if (D583_BASELINE_SPECS.length !== 143 || inventoryDigest(D583_BASELINE_SPECS) !== D583_BASELINE_SHA256) {
    throw new Error('D583 inherited 143-spec baseline count or SHA-256 changed.');
  }
  for (const path of D583_BASELINE_SPECS) if (!existsSync(resolve(ROOT, path))) {
    throw new Error(`D583 inherited spec is missing: ${path}`);
  }
  if (SESSION_TRANSACTION_BASELINE_SPECS.length !== 19 ||
    inventoryDigest(SESSION_TRANSACTION_BASELINE_SPECS) !== SESSION_TRANSACTION_BASELINE_SHA256) {
    throw new Error('Session transaction inherited 19-spec baseline count or SHA-256 changed.');
  }
  for (const path of SESSION_TRANSACTION_BASELINE_SPECS) if (!existsSync(resolve(ROOT, path))) {
    throw new Error(`Session transaction inherited spec is missing: ${path}`);
  }
  if (TRIAL_CORE_RECONCILIATION_BASELINE_SPECS.length !== 12 ||
    inventoryDigest(TRIAL_CORE_RECONCILIATION_BASELINE_SPECS) !== TRIAL_CORE_RECONCILIATION_BASELINE_SHA256) {
    throw new Error('Trial-core reconciliation 12-spec baseline count or SHA-256 changed.');
  }
  for (const path of TRIAL_CORE_RECONCILIATION_BASELINE_SPECS) if (!existsSync(resolve(ROOT, path))) {
    throw new Error(`Trial-core reconciliation spec is missing: ${path}`);
  }
  const index = input.index ?? buildDependencyIndex();
  const changed = input.changedPaths ?? changedPaths(input.git ?? gitOutput);
  const consumers = reverseConsumerClosure(
    changed.filter((path) => /\.(?:ts|tsx|mts|cts)$/.test(path)),
    index.reverseEdges,
  );
  const changedSpecs = changed.filter((path) => path.startsWith('tests/') && path.endsWith('.test.ts'));
  return contractInventoryUnion(
    D583_BASELINE_SPECS,
    SESSION_TRANSACTION_BASELINE_SPECS,
    TRIAL_CORE_RECONCILIATION_BASELINE_SPECS,
    changedSpecs,
    consumers,
  );
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function main(): void {
  const expectedSha = argument('--baseline-sha');
  if (expectedSha !== D583_BASELINE_SHA256) throw new Error('Missing or mismatched D583 baseline SHA-256.');
  const expectedTxnSha = argument('--txn-baseline-sha');
  if (expectedTxnSha !== SESSION_TRANSACTION_BASELINE_SHA256) {
    throw new Error('Missing or mismatched session transaction baseline SHA-256.');
  }
  const output = argument('--out');
  if (output === null || !resolve(output).startsWith('/tmp/')) throw new Error('Inventory output must be under /tmp.');
  const required = (argument('--require') ?? '').split(',').filter((path) => path.length > 0);
  const inventory = buildD583ContractInventory();
  for (const path of required) if (!inventory.includes(path)) throw new Error(`Required spec absent from inventory: ${path}`);
  writeFileSync(output, `${inventory.join('\n')}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ paths: inventory.length, bytes: statSync(output).size, sha256: inventoryDigest(inventory) })}\n`);
}

if (process.env['VITEST'] !== 'true') main();
