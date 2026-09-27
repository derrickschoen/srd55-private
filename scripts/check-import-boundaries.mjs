#!/usr/bin/env node
/**
 * THE IMPORT-BOUNDARY GUARD (D915).
 *
 * Checks what the runtime import graph lets a module load, with the one
 * definition of a runtime edge in scripts/runtime-import-edges.mjs. The graph
 * starts from every code file under src, tools, tests, scripts and db (and the
 * root config files) and follows every reference it resolves.
 *
 *   R0 complete graph     every static import in the graph resolves, or the
 *                         other rules would pass on a graph with a hole.
 *   R1 no side-effect     an import or re-export whose bindings are all inline
 *      type import        `type` (`import { type A } from './a'`) still
 *                         evaluates './a'. Write `import type { A }`. The P8
 *                         codemod (.tmp/runs/import-guard/p8-codemod.mjs)
 *                         rewrites them.
 *   R2 SRD corpus         only the listed modules import the SRD corpora
 *      allowlist          (docs/srd/full/*, spell-descriptions.txt), in any
 *                         form. The list is exact: a stale entry fails too.
 *                         SRD-BUILDTIME removes the runtime entries (D915).
 *   R3 forbidden          no path, however indirect, from an entry to a
 *      reachability       forbidden module. A `pending` entry is one that does
 *                         not hold yet; it fails once it holds, so the unit
 *                         that makes it hold also makes it active.
 *   R4 cycle allowlist    the static-edge cycles (SCCs) are exactly the listed
 *                         ones: a new, grown, shrunk or vanished SCC fails.
 *   R5 closure budgets    each sentinel's static closure stays within
 *                         scripts/import-budgets.json ({files, bytes}).
 *                         `--update` lowers a budget to the measured value
 *                         plus the file's margin and never raises one; raising
 *                         is a hand edit, visible in review.
 *
 * usage: node scripts/check-import-boundaries.mjs [--self-test | --update] [--root <checkout>]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildModuleGraph,
  closure,
  cycles,
  EVALUATION,
  isCodeFile,
  nodeFile,
  pathTo,
} from './runtime-import-edges.mjs';

const SCAN_ROOTS = ['src', 'tools', 'tests', 'scripts', 'db'];
const BUDGETS_FILE = 'scripts/import-budgets.json';
const STATIC = [EVALUATION.STATIC];
const RUNTIME = [EVALUATION.STATIC, EVALUATION.DYNAMIC];

/** R2: the SRD text corpora (repository paths, matched without a query). */
const SRD_CORPORA = [
  { label: 'the full SRD', matches: (file) => file.startsWith('docs/srd/full/') },
  { label: 'the SRD spell descriptions', matches: (file) => file === 'docs/srd/source/spell-descriptions.txt' },
];

/**
 * R2: who may import a corpus today. SRD-BUILDTIME (D915) turns the runtime
 * derivations into generated data and deletes each `runtime` entry in the
 * same commit; the goal is that only the generator and its drift tests
 * remain.
 */
const SRD_CORPUS_IMPORTERS = [
  { importer: 'src/rules/class-resources-srd.ts', corpus: 'docs/srd/full/srd-5.2.1.txt', runtime: true },
  { importer: 'src/rules/spells-srd.ts', corpus: 'docs/srd/source/spell-descriptions.txt', runtime: true },
  { importer: 'src/simulation/coverage.ts', corpus: 'docs/srd/full/srd-5.2.1.txt', runtime: true },
  { importer: 'src/simulation/coverage.ts', corpus: 'docs/srd/source/spell-descriptions.txt', runtime: true },
  { importer: 'tests/unit/rules/class-resources-srd.test.ts', corpus: 'docs/srd/full/srd-5.2.1.txt' },
  { importer: 'tests/unit/simulation/gate-pattern-sentence-start-lookbehind.test.ts', corpus: 'docs/srd/full/srd-5.2.1.txt' },
  {
    importer: 'tests/unit/simulation/gate-pattern-sentence-start-lookbehind.test.ts',
    corpus: 'docs/srd/source/spell-descriptions.txt',
  },
  { importer: 'tests/unit/simulation/save-damage-coverage-freezing.test.ts', corpus: 'docs/srd/source/spell-descriptions.txt' },
  { importer: 'tests/unit/tools/engine-child-bundle.test.ts', corpus: 'docs/srd/full/srd-5.2.1.txt' },
  { importer: 'tests/unit/tools/engine-child-bundle.test.ts', corpus: 'docs/srd/source/spell-descriptions.txt' },
];

/**
 * R3: `from` is a repository path or a directory prefix ending in `/`; `to` a
 * graph node (a resource carries its query); `via` the edges followed:
 * `runtime` (static and dynamic imports) or `static` (what loads with the
 * module, such as an entry's boot chunk).
 */
const FORBIDDEN_REACHABILITY = [
  {
    status: 'active',
    from: 'tests/helpers/open-db.ts',
    to: 'src/db/bootstrap.ts',
    via: 'runtime',
    why: 'a schema-only test database must not load the seed (OPENDB, D915); seeded openers are in open-seeded-db.ts',
  },
  {
    status: 'pending',
    from: 'tools/engine-mcp-server.ts',
    to: 'src/simulation/coverage.ts',
    via: 'runtime',
    why: 'the engine child must not parse the SRD (SRD-BUILDTIME P1, D915)',
  },
  {
    status: 'pending',
    from: 'tools/engine-mcp-server.ts',
    to: 'docs/srd/full/srd-5.2.1.txt?raw',
    via: 'runtime',
    why: 'the engine child must not carry the SRD text (SRD-BUILDTIME, D915)',
  },
  {
    status: 'pending',
    from: 'src/combat/',
    to: 'src/simulation/coverage.ts',
    via: 'runtime',
    why: 'combat code reaches coverage.ts only through the d20 folds (SRD-BUILDTIME P1, D915)',
  },
  {
    status: 'pending',
    from: 'src/main.ts',
    to: 'docs/srd/full/srd-5.2.1.txt?raw',
    via: 'static',
    why: 'the boot chunk must not carry the SRD text (SRD-BUILDTIME P3, D915)',
  },
  {
    status: 'pending',
    from: 'src/combat/encounter.ts',
    to: 'src/vtt/party-pack.ts',
    via: 'runtime',
    why: 'the reducer should not load the party-pack schema (IMPORT-SLIM P2)',
  },
];

/**
 * R4: today's static-edge SCCs, exactly (IMPORT-SLIM synthesis §5: sizes 7,
 * 6, 3 and 2). IMPORT-SLIM P4 breaks the guided-creation one.
 */
const ALLOWED_CYCLES = [
  [
    'src/vtt/engine-query-port.ts',
    'src/vtt/intel/option-outcome.ts',
    'src/vtt/intent-resolver.ts',
    'src/vtt/offers/offer-declarations.ts',
    'src/vtt/offers/offer-generator-registry.ts',
    'src/vtt/offers/standard-offer-generator.ts',
    'src/vtt/turn-option-registry.ts',
  ],
  [
    'src/builder/equipment-step.ts',
    'src/builder/guided-creation.ts',
    'src/commands/character-command-executor.ts',
    'src/grants/equipment-grants.ts',
    'src/queries/character-catalog-disclosures.ts',
    'src/queries/character-sheet-builder.ts',
  ],
  ['src/builder/background-choices.ts', 'src/builder/contracts.ts', 'src/builder/equipment-choices.ts'],
  ['src/access/spell-slot-assignment-factory.ts', 'src/access/spell-slot-assignment.ts'],
];

// ---------------------------------------------------------------------------
// Rules. Each takes the graph and its policy and returns
// { diagnostics, notes }: a diagnostic fails the check, a note is printed.

function ruleR0(graph) {
  const diagnostics = graph.unresolved
    .filter((reference) => reference.evaluation === EVALUATION.STATIC)
    .map((reference) =>
      `R0 ${reference.file}:${String(reference.line)}: cannot resolve static import '${reference.specifier}'; ` +
      'the other rules cannot see past it');
  return { diagnostics, notes: [] };
}

function ruleR1(graph) {
  const diagnostics = graph.inlineTypeOnly.map((site) =>
    `R1 ${site.file}:${String(site.line)}: every binding from '${site.specifier}' is an inline \`type\`, ` +
    `so the ${site.syntax} still evaluates it; write \`${site.syntax} type { ... }\``);
  return { diagnostics, notes: [] };
}

function ruleR2(graph, corpora, allowed) {
  const diagnostics = [];
  const seen = new Set();
  for (const [importer, edges] of graph.edges) {
    for (const edge of edges) {
      if (!RUNTIME.includes(edge.evaluation)) continue;
      const file = nodeFile(edge.to);
      const corpus = corpora.find((candidate) => candidate.matches(file));
      if (corpus === undefined) continue;
      const key = `${importer}\0${file}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!allowed.some((entry) => entry.importer === importer && entry.corpus === file)) {
        diagnostics.push(`R2 ${importer}:${String(edge.line)}: imports ${corpus.label} (${edge.to}) ` +
          'but is not on the SRD corpus allowlist; derive the data at build time instead');
      }
    }
  }
  for (const entry of allowed) {
    if (!seen.has(`${entry.importer}\0${entry.corpus}`)) {
      diagnostics.push(`R2 stale allowlist entry: ${entry.importer} no longer imports ${entry.corpus}; delete the entry`);
    }
  }
  return { diagnostics, notes: [] };
}

function entryFiles(graph, from) {
  if (!from.endsWith('/')) return graph.edges.has(from) ? [from] : [];
  return [...graph.edges.keys()].filter((file) => file.startsWith(from)).sort();
}

function ruleR3(graph, entries, isFile) {
  const diagnostics = [];
  const notes = [];
  const unresolvedByFile = new Map();
  for (const reference of graph.unresolved) {
    const list = unresolvedByFile.get(reference.file) ?? [];
    list.push(reference);
    unresolvedByFile.set(reference.file, list);
  }
  for (const entry of entries) {
    const evaluations = entry.via === 'static' ? STATIC : RUNTIME;
    const starts = entryFiles(graph, entry.from);
    if (starts.length === 0) {
      diagnostics.push(`R3 ${entry.from}: no such module; fix or delete the entry`);
      continue;
    }
    if (!isFile(nodeFile(entry.to))) {
      diagnostics.push(`R3 ${entry.to}: no such target, so the entry could never fail; fix or delete it`);
      continue;
    }
    const violations = [];
    const unproven = [];
    for (const start of starts) {
      const reached = closure(graph, start, evaluations);
      if (reached.has(entry.to)) violations.push(pathTo(reached, entry.to).join(' -> '));
      for (const file of reached.keys()) {
        for (const reference of unresolvedByFile.get(file) ?? []) {
          if (evaluations.includes(reference.evaluation)) {
            unproven.push(`${reference.file}:${String(reference.line)} (${reference.specifier})`);
          }
        }
      }
    }
    const label = `${entry.from} -/-> ${entry.to} (${entry.via})`;
    if (entry.status === 'active') {
      for (const violation of violations) diagnostics.push(`R3 ${label}: reached by ${violation}; ${entry.why}`);
      const distinct = [...new Set(unproven)];
      if (distinct.length > 0) {
        diagnostics.push(`R3 ${label}: cannot prove, ${String(distinct.length)} unresolved reference(s) in the ` +
          `closure, first at ${distinct[0]}`);
      }
    } else if (violations.length === 0 && unproven.length === 0) {
      diagnostics.push(`R3 ${label}: this pending entry now holds; make it active in the same commit`);
    } else {
      notes.push(`R3 pending ${label}: ${String(violations.length)} path(s), e.g. ${violations[0] ?? unproven[0]}`);
    }
  }
  return { diagnostics, notes };
}

function ruleR4(graph, allowedCycles) {
  const diagnostics = [];
  const found = cycles(graph, STATIC);
  const key = (members) => members.join('\n');
  const allowedKeys = new Set(allowedCycles.map((members) => key([...members].sort())));
  const foundKeys = new Set(found.map(key));
  for (const component of found) {
    if (allowedKeys.has(key(component))) continue;
    const overlapping = allowedCycles.filter((members) => members.some((member) => component.includes(member)));
    const verb = overlapping.length === 0
      ? 'new cycle'
      : overlapping.some((members) => members.length < component.length) ? 'cycle grew' : 'cycle changed';
    diagnostics.push(`R4 ${verb} (${String(component.length)} modules): ${component.join(', ')}`);
  }
  for (const members of allowedCycles) {
    if (!foundKeys.has(key([...members].sort()))) {
      diagnostics.push(`R4 stale allowlist entry (${String(members.length)} modules, no longer one SCC): ` +
        `${members.join(', ')}; replace it with the SCCs this run reports`);
    }
  }
  return { diagnostics, notes: [], found };
}

function measureClosure(graph, sentinel, sizeOf) {
  const reached = closure(graph, sentinel, STATIC);
  let bytes = 0;
  for (const id of reached.keys()) bytes += sizeOf(nodeFile(id));
  return { files: reached.size, bytes };
}

function ruleR5(graph, budgets, sizeOf) {
  const diagnostics = [];
  const notes = [];
  const measured = {};
  for (const [sentinel, budget] of Object.entries(budgets.sentinels)) {
    if (!graph.edges.has(sentinel)) {
      diagnostics.push(`R5 ${sentinel}: sentinel is not a module in the graph; fix or delete its budget`);
      continue;
    }
    const current = measureClosure(graph, sentinel, sizeOf);
    measured[sentinel] = current;
    for (const unit of ['files', 'bytes']) {
      if (current[unit] > budget[unit]) {
        diagnostics.push(`R5 ${sentinel}: static closure has ${String(current[unit])} ${unit}, over its budget of ` +
          `${String(budget[unit])}; slim the import, or raise the budget by hand in ${BUDGETS_FILE}`);
      }
    }
    notes.push(`R5 ${sentinel}: ${String(current.files)}/${String(budget.files)} files, ` +
      `${String(current.bytes)}/${String(budget.bytes)} bytes`);
  }
  return { diagnostics, notes, measured };
}

/**
 * `--update`: each budget becomes min(budget, ceil(measured × (100 +
 * marginPercent) / 100)), in integers so the ceiling is exact. It never
 * raises one; a measurement over budget is reported and left alone.
 */
function lowerBudgets(budgets, measured) {
  const next = structuredClone(budgets);
  const changes = [];
  const refusals = [];
  for (const [sentinel, budget] of Object.entries(budgets.sentinels)) {
    const current = measured[sentinel];
    if (current === undefined) continue;
    for (const unit of ['files', 'bytes']) {
      const target = Math.ceil((current[unit] * (100 + budgets.marginPercent[unit])) / 100);
      if (current[unit] > budget[unit]) {
        refusals.push(`${sentinel} ${unit}: measured ${String(current[unit])} is over the budget ` +
          `${String(budget[unit])}; --update never raises a budget`);
      } else if (target < budget[unit]) {
        next.sentinels[sentinel][unit] = target;
        changes.push(`${sentinel} ${unit}: ${String(budget[unit])} -> ${String(target)}`);
      }
    }
  }
  return { budgets: next, changes, refusals };
}

function runRules(graph, policy) {
  const results = {
    R0: ruleR0(graph),
    R1: ruleR1(graph),
    R2: ruleR2(graph, policy.corpora, policy.corpusImporters),
    R3: ruleR3(graph, policy.forbidden, policy.isFile),
    R4: ruleR4(graph, policy.cycles),
    R5: ruleR5(graph, policy.budgets, policy.sizeOf),
  };
  return results;
}

// ---------------------------------------------------------------------------
// The checkout.

function checkoutHost(root) {
  const walk = (directory) => {
    const absolute = path.join(root, directory);
    let entries;
    try {
      entries = fs.readdirSync(absolute, { withFileTypes: true });
    } catch {
      return [];
    }
    const out = [];
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
      const child = directory === '' ? entry.name : `${directory}/${entry.name}`;
      if (entry.isDirectory()) out.push(...walk(child));
      else if (entry.isFile()) out.push(child);
    }
    return out;
  };
  const stats = new Map();
  const stat = (file) => {
    if (!stats.has(file)) {
      try {
        stats.set(file, fs.statSync(path.join(root, file)));
      } catch {
        stats.set(file, null);
      }
    }
    return stats.get(file);
  };
  return {
    isFile: (file) => stat(file)?.isFile() === true,
    readFile: (file) => fs.readFileSync(path.join(root, file), 'utf8'),
    filesBelow: walk,
    sizeOf: (file) => stat(file)?.size ?? 0,
    roots: () => [
      ...SCAN_ROOTS.flatMap(walk),
      ...fs.readdirSync(root).filter((name) => /\.(?:ts|mts|cts|mjs|js)$/u.test(name)),
    ].filter(isCodeFile).sort(),
  };
}

function readBudgets(root) {
  const file = path.join(root, BUDGETS_FILE);
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const unit of ['files', 'bytes']) {
    if (!Number.isInteger(parsed.marginPercent?.[unit]) || parsed.marginPercent[unit] < 0) {
      throw new Error(`${BUDGETS_FILE}: marginPercent.${unit} must be a non-negative integer`);
    }
  }
  for (const [sentinel, budget] of Object.entries(parsed.sentinels ?? {})) {
    for (const unit of ['files', 'bytes']) {
      if (!Number.isInteger(budget?.[unit]) || budget[unit] <= 0) {
        throw new Error(`${BUDGETS_FILE}: ${sentinel}.${unit} must be a positive integer`);
      }
    }
  }
  return parsed;
}

function runCheckout(root, update) {
  const started = performance.now();
  const host = checkoutHost(root);
  const roots = host.roots();
  const graph = buildModuleGraph(roots, host);
  const built = performance.now();
  const budgets = readBudgets(root);
  const results = runRules(graph, {
    corpora: SRD_CORPORA,
    corpusImporters: SRD_CORPUS_IMPORTERS,
    forbidden: FORBIDDEN_REACHABILITY,
    cycles: ALLOWED_CYCLES,
    budgets,
    sizeOf: host.sizeOf,
    isFile: host.isFile,
  });
  const diagnostics = Object.values(results).flatMap((result) => result.diagnostics);
  for (const note of Object.values(results).flatMap((result) => result.notes)) console.log(note);
  if (update) {
    const lowered = lowerBudgets(budgets, results.R5.measured);
    for (const refusal of lowered.refusals) console.error(`--update: ${refusal}`);
    if (lowered.changes.length > 0) {
      fs.writeFileSync(path.join(root, BUDGETS_FILE), `${JSON.stringify(lowered.budgets, null, 2)}\n`);
    }
    console.log(lowered.changes.length === 0
      ? '--update: no budget lowered'
      : `--update: lowered ${lowered.changes.join('; ')}`);
  }
  const edgeCount = [...graph.edges.values()].reduce((sum, edges) => sum + edges.length, 0);
  const seconds = ((performance.now() - started) / 1000).toFixed(2);
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(diagnostic);
    console.error(`import boundaries: ${String(diagnostics.length)} violation(s) in ${String(graph.edges.size)} modules`);
    process.exitCode = 1;
    return;
  }
  console.log(`import boundaries: R0-R5 hold over ${String(graph.edges.size)} modules and ${String(edgeCount)} edges ` +
    `(${String(results.R4.found.length)} allowed cycles; graph ${((built - started) / 1000).toFixed(2)} s, total ${seconds} s)`);
}

// ---------------------------------------------------------------------------
// Self-test: every rule, green on a clean fixture and red on each planted
// violation. Fixtures are in-memory checkouts.

function fixtureHost(files) {
  const names = Object.keys(files);
  return {
    isFile: (file) => Object.hasOwn(files, file),
    readFile: (file) => files[file],
    filesBelow: (directory) => names.filter((name) => name.startsWith(`${directory}/`)),
    sizeOf: (file) => Buffer.byteLength(files[file] ?? ''),
  };
}

function fixtureResults(files, policy = {}) {
  const host = fixtureHost(files);
  const graph = buildModuleGraph(Object.keys(files).filter(isCodeFile), host);
  return runRules(graph, {
    corpora: [{ label: 'the corpus', matches: (file) => file.startsWith('docs/corpus/') }],
    corpusImporters: [],
    forbidden: [],
    cycles: [],
    budgets: { marginPercent: { files: 10, bytes: 10 }, sentinels: {} },
    sizeOf: host.sizeOf,
    isFile: host.isFile,
    ...policy,
  });
}

const SELF_TESTS = [
  {
    rule: 'R0',
    name: 'every static import resolves',
    expect: 0,
    files: { 'src/a.ts': "import { b } from './b';\nimport('./missing-but-dynamic');\n", 'src/b.ts': 'export const b = 1;\n' },
  },
  {
    rule: 'R0',
    name: 'a static import of a missing module',
    expect: 1,
    mentions: ["'./missing'"],
    files: { 'src/a.ts': "import { b } from './missing';\n" },
  },
  {
    rule: 'R1',
    name: 'type-only, mixed and default imports',
    expect: 0,
    files: {
      'src/a.ts': "import type { B } from './b';\nimport { type C, c } from './b';\nimport d, { type E } from './b';\n" +
        "export type { B as F } from './b';\nimport {} from './b';\nexport { c as g } from './b';\n",
      'src/b.ts': 'export type B = 1; export type C = 2; export type E = 3; export const c = 1; export default 4;\n',
    },
  },
  {
    rule: 'R1',
    name: '`import { type A }` and `export { type A } from`',
    expect: 2,
    mentions: ['src/a.ts:1', 'src/a.ts:2'],
    files: {
      'src/a.ts': "import { type B, type C as D } from './b';\nexport { type B as E } from './b';\n",
      'src/b.ts': 'export type B = 1; export type C = 2;\n',
    },
  },
  {
    rule: 'R2',
    name: 'an allowlisted importer and a non-corpus raw import',
    expect: 0,
    policy: { corpusImporters: [{ importer: 'src/allowed.ts', corpus: 'docs/corpus/srd.txt' }] },
    files: {
      'src/allowed.ts': "import srd from '../docs/corpus/srd.txt?raw';\nimport other from '../docs/other.txt?raw';\n",
      'docs/corpus/srd.txt': 'SRD',
      'docs/other.txt': 'other',
    },
  },
  {
    rule: 'R2',
    name: 'off-list static, dynamic and eager-glob raw imports of the corpus',
    expect: 3,
    mentions: ['src/static.ts:1', 'src/dynamic.ts:1', 'src/glob.ts:1'],
    policy: { corpusImporters: [{ importer: 'src/allowed.ts', corpus: 'docs/corpus/srd.txt' }] },
    files: {
      'src/allowed.ts': "import srd from '../docs/corpus/srd.txt?raw';\n",
      'src/static.ts': "import srd from '../docs/corpus/srd.txt?raw';\n",
      'src/dynamic.ts': "export const load = () => import('../docs/corpus/srd.txt?raw');\n",
      'src/glob.ts': "export const all = import.meta.glob('../docs/corpus/*.txt', { query: '?raw', eager: true });\n",
      'docs/corpus/srd.txt': 'SRD',
    },
  },
  {
    rule: 'R2',
    name: 'a stale allowlist entry',
    expect: 1,
    mentions: ['stale allowlist entry: src/allowed.ts'],
    policy: { corpusImporters: [{ importer: 'src/allowed.ts', corpus: 'docs/corpus/srd.txt' }] },
    files: { 'src/allowed.ts': 'export const nothing = 0;\n', 'docs/corpus/srd.txt': 'SRD' },
  },
  {
    rule: 'R3',
    name: 'the forbidden module reached only through `import type`',
    expect: 0,
    policy: { forbidden: [{ status: 'active', from: 'tests/helpers/open-db.ts', to: 'src/db/bootstrap.ts', via: 'runtime', why: 'x' }] },
    files: {
      'tests/helpers/open-db.ts': "import { schema } from './mid';\nimport type { Seed } from '../../src/db/bootstrap';\n",
      'tests/helpers/mid.ts': "import type { Seed } from '../../src/db/bootstrap';\nexport const schema = 1;\n",
      'src/db/bootstrap.ts': 'export type Seed = 1;\n',
    },
  },
  {
    rule: 'R3',
    name: 'the forbidden module reached indirectly by `import { type }`',
    expect: 1,
    also: { R1: 1 },
    mentions: ['tests/helpers/open-db.ts:1 -> tests/helpers/mid.ts:1 -> src/db/bootstrap.ts'],
    policy: { forbidden: [{ status: 'active', from: 'tests/helpers/open-db.ts', to: 'src/db/bootstrap.ts', via: 'runtime', why: 'x' }] },
    files: {
      'tests/helpers/open-db.ts': "import { schema } from './mid';\n",
      'tests/helpers/mid.ts': "import { type Seed } from '../../src/db/bootstrap';\nexport const schema = 1;\n",
      'src/db/bootstrap.ts': 'export type Seed = 1;\n',
    },
  },
  {
    rule: 'R3',
    name: 'the forbidden module reached by a dynamic import',
    expect: 1,
    mentions: ['tests/helpers/open-db.ts:1 -> src/db/bootstrap.ts'],
    policy: { forbidden: [{ status: 'active', from: 'tests/helpers/open-db.ts', to: 'src/db/bootstrap.ts', via: 'runtime', why: 'x' }] },
    files: {
      'tests/helpers/open-db.ts': "export const seed = () => import('../../src/db/bootstrap');\n",
      'src/db/bootstrap.ts': 'export const seed = 1;\n',
    },
  },
  {
    rule: 'R3',
    name: 'an unresolvable dynamic import in the closure fails closed',
    expect: 1,
    mentions: ['cannot prove'],
    policy: { forbidden: [{ status: 'active', from: 'tests/helpers/open-db.ts', to: 'src/db/bootstrap.ts', via: 'runtime', why: 'x' }] },
    files: {
      'tests/helpers/open-db.ts': 'export const load = (name: string) => import(name);\n',
      'src/db/bootstrap.ts': 'export const seed = 1;\n',
    },
  },
  {
    rule: 'R3',
    name: 'a static-only entry ignores a lazy route; a pending entry that is still violated',
    expect: 0,
    policy: {
      forbidden: [
        { status: 'active', from: 'src/main.ts', to: 'src/big.ts', via: 'static', why: 'x' },
        { status: 'pending', from: 'src/', to: 'src/big.ts', via: 'runtime', why: 'x' },
      ],
    },
    files: {
      'src/main.ts': "export const later = () => import('./big');\n",
      'src/big.ts': 'export const big = 1;\n',
    },
  },
  {
    rule: 'R3',
    name: 'a pending entry that now holds, and entries whose module or target is gone',
    expect: 3,
    mentions: ['now holds', 'src/gone.ts: no such module', 'src/typo.ts: no such target'],
    policy: {
      forbidden: [
        { status: 'pending', from: 'src/main.ts', to: 'src/big.ts', via: 'runtime', why: 'x' },
        { status: 'active', from: 'src/gone.ts', to: 'src/big.ts', via: 'runtime', why: 'x' },
        { status: 'active', from: 'src/main.ts', to: 'src/typo.ts', via: 'runtime', why: 'x' },
      ],
    },
    files: { 'src/main.ts': 'export const small = 1;\n', 'src/big.ts': 'export const big = 1;\n' },
  },
  {
    rule: 'R4',
    name: 'the allowed cycle, and a cycle closed only by `import type`',
    expect: 0,
    policy: { cycles: [['src/a.ts', 'src/b.ts']] },
    files: {
      'src/a.ts': "import { b } from './b';\nexport const a = 1;\n",
      'src/b.ts': "import { a } from './a';\nimport type { C } from './c';\nexport const b = 1;\n",
      'src/c.ts': "import type { b } from './b';\nexport type C = 1;\n",
    },
  },
  {
    rule: 'R4',
    name: 'a new cycle closed by `import { type }`, and the allowed cycle grown',
    expect: 3,
    also: { R1: 1 },
    mentions: ['new cycle (2 modules): src/d.ts, src/e.ts', 'cycle grew (3 modules): src/a.ts, src/b.ts, src/c.ts', 'stale allowlist entry (2 modules'],
    policy: { cycles: [['src/a.ts', 'src/b.ts']] },
    files: {
      'src/a.ts': "import { b } from './b';\nexport const a = 1;\n",
      'src/b.ts': "import { c } from './c';\nexport const b = 1;\n",
      'src/c.ts': "import { a } from './a';\nexport const c = 1;\n",
      'src/d.ts': "import { e } from './e';\nexport type D = 1;\n",
      'src/e.ts': "import { type D } from './d';\nexport const e = 1;\n",
    },
  },
  {
    rule: 'R5',
    name: 'a sentinel within budget',
    expect: 0,
    policy: { budgets: { marginPercent: { files: 10, bytes: 10 }, sentinels: { 'src/main.ts': { files: 2, bytes: 100 } } } },
    files: { 'src/main.ts': "import { b } from './b';\n", 'src/b.ts': 'export const b = 1;\n' },
  },
  {
    rule: 'R5',
    name: 'a sentinel over its file and byte budgets, and a missing sentinel',
    expect: 3,
    mentions: ['2 files, over its budget of 1', '45 bytes, over its budget of 30', 'src/gone.ts: sentinel is not a module'],
    policy: {
      budgets: {
        marginPercent: { files: 10, bytes: 10 },
        sentinels: { 'src/main.ts': { files: 1, bytes: 30 }, 'src/gone.ts': { files: 1, bytes: 1 } },
      },
    },
    files: { 'src/main.ts': "import { b } from './b';\n", 'src/b.ts': 'export const b = 1;\n' },
  },
];

function lowerBudgetsSelfTest() {
  const failures = [];
  const budgets = {
    marginPercent: { files: 10, bytes: 50 },
    sentinels: { 'a.ts': { files: 100, bytes: 1000 }, 'b.ts': { files: 10, bytes: 100 } },
  };
  const result = lowerBudgets(budgets, { 'a.ts': { files: 50, bytes: 800 }, 'b.ts': { files: 11, bytes: 90 } });
  const a = result.budgets.sentinels['a.ts'];
  const b = result.budgets.sentinels['b.ts'];
  if (a.files !== 55 || a.bytes !== 1000) failures.push(`--update lowered a.ts to ${JSON.stringify(a)}, expected {files:55, bytes:1000}`);
  if (b.files !== 10 || b.bytes !== 100) failures.push(`--update changed b.ts to ${JSON.stringify(b)}, expected it unchanged`);
  if (result.refusals.length !== 1) failures.push(`--update reported ${String(result.refusals.length)} refusal(s), expected 1`);
  if (budgets.sentinels['a.ts'].files !== 100) failures.push('--update mutated its input');
  return failures;
}

function runSelfTest() {
  const failures = [];
  const report = [];
  for (const fixture of SELF_TESTS) {
    const results = fixtureResults(fixture.files, fixture.policy);
    const own = results[fixture.rule].diagnostics;
    // A fixture may plant a violation of another rule on purpose (an R3 path
    // through `import { type }` is also an R1 site); it says how many.
    const others = Object.entries(results)
      .filter(([rule, result]) => rule !== fixture.rule && result.diagnostics.length !== (fixture.also?.[rule] ?? 0))
      .flatMap(([, result]) => result.diagnostics);
    report.push(`${fixture.rule} ${fixture.expect === 0 ? 'green' : 'red  '} ${String(own.length)} finding(s): ${fixture.name}`);
    for (const mention of fixture.mentions ?? []) {
      if (!own.some((diagnostic) => diagnostic.includes(mention))) {
        failures.push(`${fixture.rule} fixture '${fixture.name}': no finding mentions '${mention}':\n  ${own.join('\n  ')}`);
      }
    }
    if (own.length !== fixture.expect) {
      failures.push(`${fixture.rule} fixture '${fixture.name}': expected ${String(fixture.expect)} finding(s), got ` +
        `${String(own.length)}${own.length > 0 ? `:\n  ${own.join('\n  ')}` : ''}`);
    }
    if (others.length > 0) {
      failures.push(`${fixture.rule} fixture '${fixture.name}': other rules fired:\n  ${others.join('\n  ')}`);
    }
  }
  failures.push(...lowerBudgetsSelfTest());
  for (const rule of ['R0', 'R1', 'R2', 'R3', 'R4', 'R5']) {
    const fixtures = SELF_TESTS.filter((fixture) => fixture.rule === rule);
    if (!fixtures.some((fixture) => fixture.expect === 0) ||
      !fixtures.some((fixture) => fixture.expect > 0 && (fixture.mentions?.length ?? 0) > 0)) {
      failures.push(`${rule}: the self-test needs a green and a red fixture`);
    }
  }
  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
    return;
  }
  for (const line of report) console.log(line);
  console.log(`import-boundaries self-test: ${String(SELF_TESTS.length)} fixtures and the --update ratchet passed`);
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
const root = path.resolve(rootIndex < 0 ? process.cwd() : args[rootIndex + 1] ?? '');
const known = new Set(['--self-test', '--update', '--root']);
const unknown = args.filter((arg, index) => !known.has(arg) && index !== rootIndex + 1);
if (unknown.length > 0 || (rootIndex >= 0 && args[rootIndex + 1] === undefined) ||
  (args.includes('--self-test') && args.includes('--update'))) {
  console.error(`usage: node scripts/check-import-boundaries.mjs [--self-test | --update] [--root <checkout>]; got: ${args.join(' ')}`);
  process.exitCode = 1;
} else if (args.includes('--self-test')) {
  runSelfTest();
} else {
  runCheckout(root, args.includes('--update'));
}
