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
 *   R2 SRD text           the SRD text is every file under docs/srd/ (the
 *      allowlist          full SRD and every extract), referenced in any form.
 *                         Tests may reference it; so may SRD tooling, listed
 *                         with exactly what it references (a stale entry
 *                         fails). Production code never does, and no entry
 *                         can admit it: SRD-BUILDTIME turned every runtime
 *                         derivation into generated typed data, so the SRD
 *                         is read by tests and tooling only (D915, D932).
 *                         The path decides which: tools/ and scripts/ are
 *                         tooling, the rest is production, whatever an entry
 *                         says. No production module may reach the SRD
 *                         through a test or a tool either, by import or as a
 *                         worker (asset URL). And every
 *                         production path must be provable (review r3 P2):
 *                         on a production module, or on any test or tool
 *                         one loads or ships, an unresolved reference that
 *                         might name the SRD text (a computed or an absolute
 *                         one) fails unless its file is allowlisted with a
 *                         reason.
 *   R3 forbidden          no path, however indirect, from an entry to a
 *      reachability       forbidden module (or any file under a directory). A
 *                         `pending` entry is one that does not hold yet; it
 *                         fails once it holds, so the unit that makes it hold
 *                         also makes it active.
 *   R4 cycle allowlist    the static-edge cycles (SCCs) are exactly the listed
 *                         ones: a new, grown, shrunk or vanished SCC fails.
 *   R5 closure budgets    each sentinel's static closure stays within
 *                         scripts/import-budgets.json ({files, bytes}); an
 *                         ordinary run fails over budget and writes nothing.
 *                         `--update` sets every budget to the measured value
 *                         plus the file's margin, raising or lowering it
 *                         (D927), and judges R5 again against the file it
 *                         wrote; the diff of that file shows every change.
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
/** R2 follows every reference that loads or ships a file: an asset URL puts the file in the build too. */
const SHIPS = [EVALUATION.STATIC, EVALUATION.DYNAMIC, EVALUATION.ASSET];

/**
 * R2: the SRD text, `docs/srd/**`: the full SRD, every extract under
 * docs/srd/source/ and their provenance notes. A reference in any form counts:
 * a static or dynamic import with or without a query (`?raw`, `?url`), an
 * eager or lazy glob, or `new URL(..., import.meta.url)`.
 */
const SRD_TEXT = 'docs/srd/';

/** R2: tests reference the SRD text freely; they are its drift tests and the extract tests. */
const SRD_TEST_PREFIX = 'tests/';

/**
 * R2: a module's PATH says whether it is tooling, never its allowlist entry
 * (review r2 P2: an src/ importer labelled `tooling` was once accepted, and
 * then neither counted as a runtime importer nor stopped as a carrier).
 * Tooling is what runs at build or maintenance time: everything under tools/
 * and scripts/. Every other module outside tests/ is production: src/ (the
 * app and the engine) and, failing closed, db/ and the root config files.
 */
const SRD_TOOLING_PREFIXES = Object.freeze(['tools/', 'scripts/']);

/** R2's policy apart from the allowlists; the self-test runs it unchanged. */
const SRD_POLICY = Object.freeze({
  text: SRD_TEXT,
  testPrefix: SRD_TEST_PREFIX,
  toolingPrefixes: SRD_TOOLING_PREFIXES,
});

/** R2: 'test', 'tooling' or 'production', from the path alone (`srd`: R2's policy). */
function moduleKind(file, srd) {
  if (file.startsWith(srd.testPrefix)) return 'test';
  if (srd.toolingPrefixes.some((prefix) => file.startsWith(prefix))) return 'tooling';
  return 'production';
}

/**
 * R2: every module on a PRODUCTION PATH, which R2 must be able to prove reads
 * no SRD text: each production module (by its path: src/, db/ and the root
 * config files), and every module one of them loads or ships (SHIPS: static,
 * dynamic, or started by asset URL), a tool or a test included, since
 * tools/bridge.ts imported by src/main.ts runs in production (review r3 P2).
 * Returns a Map from each to the edge that first reached it (null for a
 * production module), breadth first, as closure() returns, so pathTo prints
 * the shortest way in.
 */
function productionPaths(graph, srd) {
  const parents = new Map();
  for (const file of graph.edges.keys()) {
    if (moduleKind(file, srd) === 'production') parents.set(file, null);
  }
  const queue = [...parents.keys()];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const edge of graph.edges.get(current) ?? []) {
      if (!SHIPS.includes(edge.evaluation) || parents.has(edge.to)) continue;
      parents.set(edge.to, { from: current, line: edge.line, syntax: edge.syntax });
      queue.push(edge.to);
    }
  }
  return parents;
}

/**
 * R2: the tools (modules under tools/ or scripts/) that reference the SRD
 * text, each `{ importer, tooling: '<why>', files }` with exactly the files it
 * references (the check fails on a file an entry does not list, and on a
 * listed file the module no longer references) and nothing else.
 *
 * There is no entry for production code, and none can be written: a
 * production module that references the SRD text fails whether or not an
 * entry names it, and an entry naming one fails too. Until landing batch 1
 * this list also held the 18 runtime importers of the D917 census, each
 * marked for SRD-BUILDTIME to remove; SRD-BUILDTIME turned every one into
 * generated typed data (src/rules/generated/, src/simulation/generated/), so
 * the list of runtime importers is empty and R2 no longer admits one (D915,
 * D932). The SRD-BUILDTIME generator (scripts/generate-srd-artifacts.ts) and
 * its drift tests read the corpora through the file system and tests, not by a
 * module reference, so they need no entry.
 */
const SRD_TEXT_IMPORTERS = [
  {
    importer: 'scripts/srd/dehyphenate.mjs',
    tooling: 'reflows the spell-description extract in place (a maintenance CLI)',
    files: ['docs/srd/source/spell-descriptions.txt'],
  },
];

/** R2: the keys a tooling entry has, and no other. */
const SRD_TOOLING_ENTRY_KEYS = Object.freeze(['importer', 'tooling', 'files']);

/** R2: the unit that made every runtime SRD derivation generated data (D915), named in R2's findings. */
const SRD_BUILDTIME = 'SRD-BUILDTIME';

/**
 * R2: the files on a production path whose unresolved references R2 accepts
 * unproven, each `{ file, references, why }`: how many there are (all of
 * them; one more, or one fewer, fails, so a new computed import beside an
 * accepted one is seen) and why none can name the SRD text. A stale entry
 * fails. Empty: no production path has an unresolved reference today (the
 * fix3 census, 2026-09-27: 69 unresolved references, every one in a test or
 * a tool that no production module loads or ships).
 */
const SRD_UNPROVEN_REFERENCES = [];

/**
 * R3: `from` is a repository path or a directory prefix ending in `/`; `to` a
 * graph node (a resource carries its query) or a directory prefix ending in
 * `/`, which stands for every file below it in any form; `via` the edges
 * followed: `runtime` (static and dynamic imports) or `static` (what loads
 * with the module, such as an entry's boot chunk).
 */
const FORBIDDEN_REACHABILITY = [
  {
    status: 'active',
    from: 'tests/helpers/open-db.ts',
    to: 'src/db/bootstrap.ts',
    via: 'runtime',
    why: 'a schema-only test database must not load the seed (OPENDB, D915); seeded openers are in open-seeded-db.ts',
  },
  // The next four hold since SRD-BUILDTIME (landing batch 1, D932).
  {
    status: 'active',
    from: 'tools/engine-mcp-server.ts',
    to: 'src/simulation/coverage.ts',
    via: 'runtime',
    why: 'the engine child must not parse the SRD (SRD-BUILDTIME P1, D915)',
  },
  {
    status: 'active',
    from: 'tools/engine-mcp-server.ts',
    to: SRD_TEXT,
    via: 'runtime',
    why: 'the engine child must not carry the SRD text, any of it (SRD-BUILDTIME, D915)',
  },
  {
    status: 'active',
    from: 'src/combat/',
    to: 'src/simulation/coverage.ts',
    via: 'runtime',
    why: 'combat code does not reach coverage.ts; the d20 folds are in d20-probability.ts (SRD-BUILDTIME P1, D915)',
  },
  {
    status: 'active',
    from: 'src/main.ts',
    to: SRD_TEXT,
    via: 'static',
    why: 'the boot chunk must not carry the SRD text, any of it (SRD-BUILDTIME P3, D915)',
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

/**
 * `srd`: `{ text, testPrefix, toolingPrefixes, importers, unproven }`: the SRD
 * text's directory, the tests' directory, the tooling directories, the SRD
 * text allowlist (SRD_TEXT_IMPORTERS) and the unresolved-reference allowlist
 * (SRD_UNPROVEN_REFERENCES).
 */
function ruleR2(graph, srd) {
  const diagnostics = [];
  const isTest = (file) => moduleKind(file, srd) === 'test';
  const isTooling = (file) => moduleKind(file, srd) === 'tooling';
  const tooling = srd.toolingPrefixes.join(' or ');
  const entries = new Map();
  for (const entry of srd.importers) {
    const problems = [];
    const why = typeof entry.tooling === 'string' && entry.tooling.trim() !== '';
    const kind = moduleKind(entry.importer, srd);
    if (kind === 'test') problems.push('is a test, and tests need no entry');
    if (entries.has(entry.importer)) problems.push('is listed twice');
    if (kind === 'production') {
      problems.push(`is production code (not under ${tooling}), which never references the SRD text ` +
        `(${SRD_BUILDTIME}, D915, D932), so no entry can list it, whatever the entry says`);
    }
    if (kind === 'tooling' && (!why || Object.keys(entry).some((key) => !SRD_TOOLING_ENTRY_KEYS.includes(key)))) {
      problems.push(`is tooling (under ${tooling}), so it says tooling: '<why>' and nothing else`);
    }
    if (!Array.isArray(entry.files) || entry.files.length === 0 || entry.files.some((file) => !file.startsWith(srd.text))) {
      problems.push(`must list the ${srd.text} files it references`);
    }
    for (const problem of problems) diagnostics.push(`R2 allowlist entry ${entry.importer} ${problem}`);
    entries.set(entry.importer, entry);
  }

  // Direct references: importer -> SRD file -> the first edge naming it.
  const referenced = new Map();
  for (const [importer, edges] of graph.edges) {
    for (const edge of edges) {
      const file = nodeFile(edge.to);
      if (!SHIPS.includes(edge.evaluation) || !file.startsWith(srd.text)) continue;
      const files = referenced.get(importer) ?? new Map();
      if (!files.has(file)) files.set(file, edge);
      referenced.set(importer, files);
    }
  }
  // A production reference fails whether or not an entry names it (an entry
  // that does has failed above): no allowlist admits one.
  for (const [importer, files] of referenced) {
    if (isTest(importer)) continue;
    const production = !isTooling(importer);
    const entry = entries.get(importer);
    for (const [file, edge] of files) {
      if (production) {
        diagnostics.push(`R2 ${importer}:${String(edge.line)}: references the SRD text (${edge.to}) from production ` +
          `code, which never reads it; derive the data at build time into generated typed data (${SRD_BUILDTIME}, D915)`);
      } else if (entry === undefined) {
        diagnostics.push(`R2 ${importer}:${String(edge.line)}: references the SRD text (${edge.to}) but is not on the ` +
          "SRD text allowlist; a tool that reads it is listed with tooling: '<why>' and the files it references");
      } else if (!(entry.files ?? []).includes(file)) {
        diagnostics.push(`R2 ${importer}:${String(edge.line)}: references ${edge.to}, which its allowlist entry does not ` +
          'list; an entry only ever shrinks');
      }
    }
  }
  for (const entry of srd.importers) {
    for (const file of Array.isArray(entry.files) ? entry.files : []) {
      if (referenced.get(entry.importer)?.has(file) !== true) {
        diagnostics.push(`R2 stale allowlist entry: ${entry.importer} no longer references ${file}; delete it from ` +
          'the entry, and the entry with its last file');
      }
    }
  }

  // Carriers: tests and tools that reach the SRD text. A module that is
  // neither may not load or ship one: an asset URL starts it as a worker, in
  // production. (A production module that references the SRD text itself has
  // failed above.)
  const importersOf = new Map();
  for (const [importer, edges] of graph.edges) {
    for (const edge of edges) {
      if (!SHIPS.includes(edge.evaluation)) continue;
      const list = importersOf.get(edge.to) ?? [];
      list.push({ importer, line: edge.line });
      importersOf.set(edge.to, list);
    }
  }
  const carries = new Map();
  for (const [importer, files] of referenced) {
    if (isTest(importer) || isTooling(importer)) carries.set(importer, [...files.keys()][0]);
  }
  const queue = [...carries.keys()];
  const crossings = new Set();
  while (queue.length > 0) {
    const carrier = queue.shift();
    for (const { importer, line } of importersOf.get(carrier) ?? []) {
      if (carries.has(importer)) continue;
      if (isTest(importer) || isTooling(importer)) {
        carries.set(importer, carries.get(carrier));
        queue.push(importer);
        continue;
      }
      crossings.add(`R2 ${importer}:${String(line)}: reaches the SRD text (${carries.get(carrier)}) through ${carrier}, ` +
        'a test or a tool; outside tests and tooling the SRD text is never reached');
    }
  }
  diagnostics.push(...crossings);

  // Every production path must be provable, not only src/ (review r3 P2). A
  // computed reference there might name the SRD text, and so might an
  // absolute one: Vite reads '/docs/srd/...' from the root, or any absolute
  // path from the file system. A relative literal names its path. Static
  // ones are R0's.
  const onProductionPath = productionPaths(graph, srd);
  const unproven = new Map();
  for (const reference of graph.unresolved) {
    if (!onProductionPath.has(reference.file) || reference.evaluation === EVALUATION.STATIC) continue;
    const named = reference.specifier.startsWith('<') || reference.specifier.startsWith('/')
      ? undefined
      : path.posix.join(path.posix.dirname(reference.file), reference.specifier.split(/[?#]/u)[0]);
    if (named !== undefined && !named.startsWith(srd.text)) continue;
    const list = unproven.get(reference.file) ?? [];
    list.push(reference);
    unproven.set(reference.file, list);
  }
  // A file's entry, or null when an entry for it is wrong (and so fails).
  const accepted = new Map();
  for (const entry of srd.unproven) {
    const problems = [];
    if (typeof entry.why !== 'string' || entry.why.trim() === '') {
      problems.push('gives no reason; say why none of its references can name the SRD text');
    }
    if (accepted.has(entry.file)) problems.push('is listed twice');
    for (const problem of problems) diagnostics.push(`R2 unresolved-reference allowlist entry ${entry.file} ${problem}`);
    accepted.set(entry.file, problems.length === 0 && !accepted.has(entry.file) ? entry : null);
  }
  let acceptedReferences = 0;
  for (const [file, entry] of accepted) {
    const references = unproven.get(file) ?? [];
    if (references.length === 0) {
      diagnostics.push(`R2 stale unresolved-reference allowlist entry: ${file} has no unresolved reference on a ` +
        'production path; delete the entry');
    } else if (entry !== null && entry.references !== references.length) {
      diagnostics.push(`R2 ${file}: ${String(references.length)} unresolved reference(s) on a production path (line(s) ` +
        `${references.map((reference) => String(reference.line)).join(', ')}), but its allowlist entry accepts ` +
        `${String(entry.references)}; name the files literally, or change the entry and its reason where review sees it`);
    } else if (entry !== null) {
      acceptedReferences += references.length;
    }
  }
  for (const [file, references] of unproven) {
    // Accepted, or its entry is wrong and has failed above.
    if (accepted.has(file)) continue;
    const way = onProductionPath.get(file) === null
      ? ''
      : ` (reached from production by ${pathTo(onProductionPath, file).join(' -> ')})`;
    for (const reference of references) {
      diagnostics.push(`R2 ${file}:${String(reference.line)}: cannot resolve ${reference.evaluation} reference ` +
        `'${reference.specifier}' on a production path${way}, so R2 cannot prove it reads no SRD text; name the ` +
        'file literally, or list this file in SRD_UNPROVEN_REFERENCES with a reason');
    }
  }

  const productionImporters = [...referenced.keys()].filter((importer) => moduleKind(importer, srd) === 'production');
  const toolEntries = srd.importers.filter((entry) => moduleKind(entry.importer, srd) === 'tooling');
  const pathModules = [...onProductionPath.keys()].filter((id) => graph.edges.has(id));
  const reachedOthers = pathModules.filter((file) => moduleKind(file, srd) !== 'production');
  const notes = [
    `R2 ${String(productionImporters.length)} production importer(s) of the SRD text; ` +
      `${String(toolEntries.length)} tool(s) listed`,
    `R2 ${String(pathModules.length)} module(s) on production paths, ${String(reachedOthers.length)} of them tests or ` +
      `tools that production loads or ships; ${String(acceptedReferences)} unresolved reference(s) there accepted unproven`,
  ];
  return { diagnostics, notes };
}

function entryFiles(graph, from) {
  if (!from.endsWith('/')) return graph.edges.has(from) ? [from] : [];
  return [...graph.edges.keys()].filter((file) => file.startsWith(from)).sort();
}

/** The first node in a closure that is `to`, or any file below `to` when it ends in `/`. */
function reachedTarget(reached, to) {
  if (!to.endsWith('/')) return reached.has(to) ? to : undefined;
  return [...reached.keys()].filter((id) => nodeFile(id).startsWith(to)).sort()[0];
}

/** `host`: `{ isFile, filesBelow }`, as for buildModuleGraph. */
function ruleR3(graph, entries, host) {
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
    const exists = entry.to.endsWith('/')
      ? host.filesBelow(entry.to.slice(0, -1)).length > 0
      : host.isFile(nodeFile(entry.to));
    if (!exists) {
      diagnostics.push(`R3 ${entry.to}: no such target, so the entry could never fail; fix or delete it`);
      continue;
    }
    const violations = [];
    const unproven = [];
    for (const start of starts) {
      const reached = closure(graph, start, evaluations);
      const hit = reachedTarget(reached, entry.to);
      if (hit !== undefined) violations.push(pathTo(reached, hit).join(' -> '));
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
          `${String(budget[unit])}; slim the import, or accept the growth with --update (the diff of ${BUDGETS_FILE} shows it)`);
      }
    }
    notes.push(`R5 ${sentinel}: ${String(current.files)}/${String(budget.files)} files, ` +
      `${String(current.bytes)}/${String(budget.bytes)} bytes`);
  }
  return { diagnostics, notes, measured };
}

/**
 * `--update` (D927, owner: "Allow automatic raises"): each budget becomes
 * ceil(measured × (100 + marginPercent) / 100), raised or lowered to it. A
 * sentinel that is not in the graph keeps its budget, and R5 still fails on
 * it. Returns the new budgets and one line per change.
 */
function updateBudgets(budgets, measured) {
  const next = structuredClone(budgets);
  const changes = [];
  for (const [sentinel, budget] of Object.entries(budgets.sentinels)) {
    const current = measured[sentinel];
    if (current === undefined) continue;
    for (const unit of ['files', 'bytes']) {
      const target = Math.ceil((current[unit] * (100 + budgets.marginPercent[unit])) / 100);
      if (target === budget[unit]) continue;
      next.sentinels[sentinel][unit] = target;
      changes.push(`${sentinel} ${unit}: ${String(budget[unit])} -> ${String(target)} ` +
        `(${target > budget[unit] ? 'raised' : 'lowered'})`);
    }
  }
  return { budgets: next, changes };
}

function runRules(graph, policy) {
  const results = {
    R0: ruleR0(graph),
    R1: ruleR1(graph),
    R2: ruleR2(graph, policy.srd),
    R3: ruleR3(graph, policy.forbidden, policy),
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
    writeFile: (file, text) => fs.writeFileSync(path.join(root, file), text),
    filesBelow: walk,
    sizeOf: (file) => stat(file)?.size ?? 0,
    roots: () => [
      ...SCAN_ROOTS.flatMap(walk),
      ...fs.readdirSync(root).filter((name) => /\.(?:ts|mts|cts|mjs|js)$/u.test(name)),
    ].filter(isCodeFile).sort(),
  };
}

function readBudgets(host) {
  const parsed = JSON.parse(host.readFile(BUDGETS_FILE));
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

/** The repository's R2 allowlists, R3 entries and R4 cycles. */
const REPOSITORY_RULES = Object.freeze({
  srdImporters: SRD_TEXT_IMPORTERS,
  srdUnproven: SRD_UNPROVEN_REFERENCES,
  forbidden: FORBIDDEN_REACHABILITY,
  cycles: ALLOWED_CYCLES,
});

/**
 * One run over a checkout. `host`: as for buildModuleGraph, plus roots(),
 * sizeOf() and writeFile(); `rules`: `{ srdImporters, srdUnproven, forbidden, cycles }`.
 * With `update`, the budgets file is rewritten to the measurement and R5 is
 * judged again against the file as written, so the run fails only on what an
 * update cannot settle (another rule, or a sentinel that is not in the graph).
 * The CLI and the self-test both run exactly this.
 */
function checkCheckout(host, rules, update) {
  const started = performance.now();
  const graph = buildModuleGraph(host.roots(), host);
  const graphSeconds = (performance.now() - started) / 1000;
  const budgets = readBudgets(host);
  const results = runRules(graph, {
    srd: { ...SRD_POLICY, importers: rules.srdImporters, unproven: rules.srdUnproven },
    forbidden: rules.forbidden,
    cycles: rules.cycles,
    budgets,
    sizeOf: host.sizeOf,
    isFile: host.isFile,
    filesBelow: host.filesBelow,
  });
  const changes = [];
  if (update) {
    const updated = updateBudgets(budgets, results.R5.measured);
    changes.push(...updated.changes);
    if (updated.changes.length > 0) host.writeFile(BUDGETS_FILE, `${JSON.stringify(updated.budgets, null, 2)}\n`);
    results.R5 = ruleR5(graph, readBudgets(host), host.sizeOf);
  }
  return { graph, graphSeconds, results, changes };
}

function runCheckout(root, update) {
  const started = performance.now();
  const { graph, graphSeconds, results, changes } = checkCheckout(checkoutHost(root), REPOSITORY_RULES, update);
  const diagnostics = Object.values(results).flatMap((result) => result.diagnostics);
  for (const note of Object.values(results).flatMap((result) => result.notes)) console.log(note);
  if (update) {
    console.log(changes.length === 0
      ? '--update: every budget already equals its measurement plus the margin'
      : `--update: ${changes.join('; ')}`);
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
    `(${String(results.R4.found.length)} allowed cycles; graph ${graphSeconds.toFixed(2)} s, total ${seconds} s)`);
}

// ---------------------------------------------------------------------------
// Self-test: every rule, green on a clean fixture and red on each planted
// violation. Fixtures are in-memory checkouts.

/** An in-memory checkout over `files`, which writeFile() changes in place. */
function fixtureHost(files) {
  return {
    isFile: (file) => Object.hasOwn(files, file),
    readFile: (file) => files[file],
    writeFile: (file, text) => {
      files[file] = text;
    },
    filesBelow: (directory) => Object.keys(files).filter((name) => name.startsWith(`${directory}/`)),
    sizeOf: (file) => Buffer.byteLength(files[file] ?? ''),
    roots: () => Object.keys(files).filter(isCodeFile).sort(),
  };
}

function fixtureResults(files, policy = {}) {
  const host = fixtureHost(files);
  const graph = buildModuleGraph(Object.keys(files).filter(isCodeFile), host);
  return runRules(graph, {
    forbidden: [],
    cycles: [],
    budgets: { marginPercent: { files: 10, bytes: 10 }, sentinels: {} },
    sizeOf: host.sizeOf,
    isFile: host.isFile,
    filesBelow: host.filesBelow,
    ...policy,
    // The real SRD policy, with the fixture's allowlists.
    srd: { ...SRD_POLICY, importers: policy.srdImporters ?? [], unproven: policy.srdUnproven ?? [] },
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
    name: 'a production module that imports generated data (the SRD-BUILDTIME shape), a listed tool and an unlisted tool ' +
      'importing it, tests in every form, a non-SRD raw import',
    expect: 0,
    noteMentions: ['R2 0 production importer(s) of the SRD text; 1 tool(s) listed'],
    policy: {
      srdImporters: [{ importer: 'scripts/srd/tool.mjs', tooling: 'a maintenance CLI', files: ['docs/srd/full/srd.txt'] }],
    },
    files: {
      'src/rules/armor-srd.ts': "import { ARMOR } from './generated/armor-srd';\nexport const armor = ARMOR;\n",
      'src/rules/generated/armor-srd.ts': "export const ARMOR = ['padded'] as const;\n",
      'src/sheet.ts': "import { armor } from './rules/armor-srd';\nimport notes from '../docs/other.txt?raw';\n",
      'scripts/srd/tool.mjs': "export const text = new URL('../../docs/srd/full/srd.txt', import.meta.url);\n",
      'tools/srd-report.ts': "import { text } from '../scripts/srd/tool.mjs';\nexport const report = () => text;\n",
      'tests/unit/extracts.test.ts': "import table from '../../docs/srd/source/armor-table.txt?raw';\n" +
        "import full from '../../docs/srd/full/srd.txt?raw';\n" +
        "export const all = import.meta.glob('../../docs/srd/source/*.txt', { query: '?raw', eager: true });\n" +
        "export const url = new URL('../../docs/srd/source/feats.txt', import.meta.url);\n",
      'tests/helpers/srd-text.ts': "export const load = () => import('../../docs/srd/source/feats.txt?raw');\n",
      'tests/unit/feats.test.ts': "import { load } from '../helpers/srd-text';\nimport { text } from '../../scripts/srd/tool.mjs';\n",
      'docs/srd/source/armor-table.txt': 'armor',
      'docs/srd/source/feats.txt': 'feats',
      'docs/srd/full/srd.txt': 'SRD',
      'docs/other.txt': 'other',
    },
  },
  {
    rule: 'R2',
    name: 'a planted production importer of an extract no entry lists (the r1 P1 case)',
    expect: 1,
    mentions: ['R2 src/rules/sheet-math-srd.ts:1: references the SRD text (docs/srd/source/sheet-math.txt?raw) from production code'],
    files: {
      'src/rules/sheet-math-srd.ts': "import sheetMath from '../../docs/srd/source/sheet-math.txt?raw';\n",
      'docs/srd/source/sheet-math.txt': 'sheet math',
    },
  },
  {
    // D932: the allowlist of runtime importers is empty, and no entry can
    // refill it. Before landing batch 1 this entry admitted this importer.
    rule: 'R2',
    name: 'a planted production importer listed as the SRD-BUILDTIME allowlist once admitted it (D932)',
    expect: 2,
    mentions: [
      'R2 allowlist entry src/rules/armor-srd.ts is production code',
      'R2 src/rules/armor-srd.ts:1: references the SRD text (docs/srd/source/armor-table.txt?raw) from production code',
    ],
    noteMentions: ['R2 1 production importer(s) of the SRD text; 0 tool(s) listed'],
    policy: {
      srdImporters: [{ importer: 'src/rules/armor-srd.ts', removedBy: SRD_BUILDTIME, files: ['docs/srd/source/armor-table.txt'] }],
    },
    files: {
      'src/rules/armor-srd.ts': "import table from '../../docs/srd/source/armor-table.txt?raw';\nexport const armor = table;\n",
      'src/sheet.ts': "import { armor } from './rules/armor-srd';\n",
      'docs/srd/source/armor-table.txt': 'armor',
    },
  },
  {
    rule: 'R2',
    name: 'every other entry shape for a production importer is refused too, and none admits its reference',
    expect: 6,
    mentions: [
      'R2 allowlist entry src/neither.ts is production code',
      'R2 allowlist entry src/someday.ts is production code',
      'R2 allowlist entry src/both.ts is production code',
      'R2 src/neither.ts:1: references the SRD text',
      'R2 src/someday.ts:1: references the SRD text',
      'R2 src/both.ts:1: references the SRD text',
    ],
    policy: {
      srdImporters: [
        { importer: 'src/neither.ts', files: ['docs/srd/source/feats.txt'] },
        { importer: 'src/someday.ts', removedBy: 'a later unit', files: ['docs/srd/source/feats.txt'] },
        { importer: 'src/both.ts', removedBy: SRD_BUILDTIME, tooling: 'a tool', files: ['docs/srd/source/feats.txt'] },
      ],
    },
    files: {
      'src/neither.ts': "import feats from '../docs/srd/source/feats.txt?raw';\n",
      'src/someday.ts': "import feats from '../docs/srd/source/feats.txt?raw';\n",
      'src/both.ts': "import feats from '../docs/srd/source/feats.txt?raw';\n",
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'an unlisted `?url` import, dynamic import, eager glob and asset URL of the SRD text',
    expect: 4,
    mentions: ['src/static-url.ts:1', 'src/dynamic.ts:1', 'src/glob.ts:1', 'src/asset.ts:1'],
    files: {
      'src/static-url.ts': "import href from '../docs/srd/full/srd.txt?url';\n",
      'src/dynamic.ts': "export const load = () => import('../docs/srd/source/feats.txt?raw');\n",
      'src/glob.ts': "export const all = import.meta.glob('../docs/srd/source/*.txt', { query: '?raw', eager: true });\n",
      'src/asset.ts': "export const url = new URL('../docs/srd/full/srd.txt', import.meta.url);\n",
      'docs/srd/source/feats.txt': 'feats',
      'docs/srd/full/srd.txt': 'SRD',
    },
  },
  {
    rule: 'R2',
    name: 'a listed tool that takes a new extract, and entries gone stale',
    expect: 3,
    mentions: [
      'R2 scripts/srd/armor.mjs:2: references docs/srd/source/feats.txt?raw, which its allowlist entry does not list',
      'stale allowlist entry: scripts/srd/armor.mjs no longer references docs/srd/source/weapons-table.txt',
      'stale allowlist entry: tools/skills-report.ts no longer references docs/srd/source/skills-table.txt',
    ],
    policy: {
      srdImporters: [
        {
          importer: 'scripts/srd/armor.mjs',
          tooling: 'an armor table report',
          files: ['docs/srd/source/armor-table.txt', 'docs/srd/source/weapons-table.txt'],
        },
        { importer: 'tools/skills-report.ts', tooling: 'a skills report', files: ['docs/srd/source/skills-table.txt'] },
      ],
    },
    files: {
      'scripts/srd/armor.mjs': "import table from '../../docs/srd/source/armor-table.txt?raw';\n" +
        "import feats from '../../docs/srd/source/feats.txt?raw';\n",
      'tools/skills-report.ts': "import { SKILLS } from '../src/rules/generated/skills';\n",
      'src/rules/generated/skills.ts': 'export const SKILLS = [] as const;\n',
      'docs/srd/source/armor-table.txt': 'armor',
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'modules that reach the SRD text through a tool and through a test helper',
    expect: 2,
    mentions: [
      'R2 src/rules/generated-user.ts:1: reaches the SRD text (docs/srd/source/feats.txt) through scripts/srd/generate.ts',
      'R2 src/leak.ts:1: reaches the SRD text (docs/srd/full/srd.txt) through tests/helpers/srd-reexport.ts',
    ],
    policy: {
      srdImporters: [{ importer: 'scripts/srd/generate.ts', tooling: 'the generator', files: ['docs/srd/source/feats.txt'] }],
    },
    files: {
      'scripts/srd/generate.ts': "import feats from '../../docs/srd/source/feats.txt?raw';\nexport const generate = () => feats;\n",
      'src/rules/generated-user.ts': "import { generate } from '../../scripts/srd/generate';\n",
      'tests/helpers/srd-text.ts': "import full from '../../docs/srd/full/srd.txt?raw';\nexport const text = full;\n",
      'tests/helpers/srd-reexport.ts': "export { text } from './srd-text';\n",
      'src/leak.ts': "export const later = () => import('../tests/helpers/srd-reexport');\n",
      'tests/unit/drift.test.ts': "import { text } from '../helpers/srd-text';\nimport { generate } from '../../scripts/srd/generate';\n",
      'docs/srd/source/feats.txt': 'feats',
      'docs/srd/full/srd.txt': 'SRD',
    },
  },
  {
    rule: 'R2',
    name: 'a module that starts a listed SRD-reading tool as a worker (asset URL) reaches the SRD text through it',
    expect: 1,
    mentions: ['R2 src/main.ts:1: reaches the SRD text (docs/srd/source/feats.txt) through tools/srd-worker.ts'],
    policy: {
      srdImporters: [{ importer: 'tools/srd-worker.ts', tooling: 'a worker that reads the SRD', files: ['docs/srd/source/feats.txt'] }],
    },
    files: {
      'src/main.ts': "export const worker = new URL('../tools/srd-worker.ts', import.meta.url);\n",
      'tools/srd-worker.ts': "import feats from '../docs/srd/source/feats.txt?raw';\nexport const f = feats;\n",
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'allowlist entries that are wrong in themselves',
    expect: 4,
    mentions: [
      'R2 allowlist entry tests/unit/extract.test.ts is a test',
      'R2 allowlist entry scripts/srd/twice.mjs is listed twice',
      'R2 allowlist entry tools/no-files.ts must list the docs/srd/ files it references',
      'R2 tools/no-files.ts:1: references docs/srd/source/feats.txt?raw, which its allowlist entry does not list',
    ],
    policy: {
      srdImporters: [
        { importer: 'tests/unit/extract.test.ts', tooling: 'a drift test', files: ['docs/srd/source/feats.txt'] },
        { importer: 'scripts/srd/twice.mjs', tooling: 'a report', files: ['docs/srd/source/feats.txt'] },
        { importer: 'scripts/srd/twice.mjs', tooling: 'a report', files: ['docs/srd/source/feats.txt'] },
        { importer: 'tools/no-files.ts', tooling: 'a report', files: [] },
      ],
    },
    files: {
      'tests/unit/extract.test.ts': "import feats from '../../docs/srd/source/feats.txt?raw';\n",
      'scripts/srd/twice.mjs': "import feats from '../../docs/srd/source/feats.txt?raw';\n",
      'tools/no-files.ts': "import feats from '../docs/srd/source/feats.txt?raw';\n",
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'an src/ importer labelled tooling (the r2 P2 case): its path makes it production, and its reference fails',
    expect: 2,
    mentions: [
      'R2 allowlist entry src/rules/x.ts is production code',
      'R2 src/rules/x.ts:1: references the SRD text (docs/srd/source/feats.txt?raw) from production code',
    ],
    noteMentions: ['R2 1 production importer(s) of the SRD text; 0 tool(s) listed'],
    policy: {
      srdImporters: [{ importer: 'src/rules/x.ts', tooling: 'claimed generator', files: ['docs/srd/source/feats.txt'] }],
    },
    files: {
      'src/rules/x.ts': "import feats from '../../docs/srd/source/feats.txt?raw';\nexport const x = feats;\n",
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'a tool entry that also says removedBy, one with no why; db/ and a root config file labelled tooling (fail closed)',
    expect: 6,
    mentions: [
      'R2 allowlist entry scripts/srd/removed.mjs is tooling',
      'R2 allowlist entry tools/no-why.ts is tooling',
      'R2 allowlist entry db/schema/srd.ts is production code',
      'R2 allowlist entry vite.config.ts is production code',
      'R2 db/schema/srd.ts:1: references the SRD text (docs/srd/source/feats.txt?raw) from production code',
      'R2 vite.config.ts:1: references the SRD text (docs/srd/source/feats.txt?raw) from production code',
    ],
    noteMentions: ['R2 2 production importer(s) of the SRD text; 2 tool(s) listed'],
    policy: {
      srdImporters: [
        { importer: 'scripts/srd/removed.mjs', tooling: 'a generator', removedBy: SRD_BUILDTIME, files: ['docs/srd/source/feats.txt'] },
        { importer: 'tools/no-why.ts', tooling: ' ', files: ['docs/srd/source/feats.txt'] },
        { importer: 'db/schema/srd.ts', tooling: 'a schema note', files: ['docs/srd/source/feats.txt'] },
        { importer: 'vite.config.ts', tooling: 'a build plugin', files: ['docs/srd/source/feats.txt'] },
      ],
    },
    files: {
      'scripts/srd/removed.mjs': "import feats from '../../docs/srd/source/feats.txt?raw';\n",
      'tools/no-why.ts': "import feats from '../docs/srd/source/feats.txt?raw';\n",
      'db/schema/srd.ts': "import feats from '../../docs/srd/source/feats.txt?raw';\n",
      'vite.config.ts': "import feats from './docs/srd/source/feats.txt?raw';\n",
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'a computed dynamic import in src/ (a tool that no production module loads is not R2\'s to prove)',
    expect: 1,
    mentions: ["R2 src/load.ts:1: cannot resolve dynamic reference '<non-literal>'"],
    files: {
      'src/load.ts': 'export const load = (name: string) => import(`../docs/srd/source/${name}.txt?raw`);\n',
      'tools/run.ts': 'export const run = (name: string) => import(name);\n',
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'computed imports in production outside src/: db/srd.ts and a root config file (the r3 P2 case)',
    expect: 2,
    mentions: [
      "R2 db/srd.ts:1: cannot resolve dynamic reference '<non-literal>' on a production path, so R2 cannot prove",
      "R2 vite.config.ts:1: cannot resolve dynamic reference '<non-literal>' on a production path, so R2 cannot prove",
    ],
    noteMentions: ['R2 2 module(s) on production paths, 0 of them tests or tools'],
    files: {
      'db/srd.ts': 'export const load = (name: string) => import(`../docs/srd/source/${name}.txt?raw`);\n',
      'vite.config.ts': 'export default (name: string) => import(name);\n',
      'docs/srd/source/feats.txt': 'feats',
    },
  },
  {
    rule: 'R2',
    name: 'computed imports in tools and a test helper that src/main.ts loads or ships (the r3 P2 case): statically, ' +
      'through another tool, lazily and as a worker; a tool that no production module reaches is not R2\'s to prove',
    expect: 5,
    mentions: [
      "R2 tools/bridge.ts:2: cannot resolve dynamic reference '<non-literal>' on a production path " +
        '(reached from production by src/main.ts:1 -> tools/bridge.ts)',
      "R2 tools/deeper.ts:1: cannot resolve dynamic reference '<non-literal>' on a production path " +
        '(reached from production by src/main.ts:1 -> tools/bridge.ts:1 -> tools/deeper.ts)',
      "R2 tools/lazy.ts:1: cannot resolve dynamic reference '<non-literal>' on a production path " +
        '(reached from production by src/main.ts:2 -> tools/lazy.ts)',
      "R2 tools/worker.ts:1: cannot resolve dynamic reference '<non-literal>' on a production path " +
        '(reached from production by src/main.ts:3 -> tools/worker.ts)',
      "R2 tests/helpers/fixture.ts:1: cannot resolve dynamic reference '<non-literal>' on a production path " +
        '(reached from production by src/main.ts:4 -> tests/helpers/fixture.ts)',
    ],
    noteMentions: ['R2 6 module(s) on production paths, 5 of them tests or tools that production loads or ships'],
    files: {
      'src/main.ts': "import { load } from '../tools/bridge';\nexport const later = () => import('../tools/lazy');\n" +
        "export const worker = new URL('../tools/worker.ts', import.meta.url);\n" +
        "export const fixture = () => import('../tests/helpers/fixture');\n",
      'tools/bridge.ts': "import { deeper } from './deeper';\nexport const load = (name: string) => import(name);\n",
      'tools/deeper.ts': 'export const deeper = (name: string) => import(name);\n',
      'tools/lazy.ts': 'export const lazy = (name: string) => import(name);\n',
      'tools/worker.ts': 'export const work = (name: string) => import(name);\n',
      'tests/helpers/fixture.ts': 'export const fixture = (name: string) => import(name);\n',
      'tools/run.ts': 'export const run = (name: string) => import(name);\n',
    },
  },
  {
    rule: 'R2',
    name: 'absolute specifiers on a production path: Vite reads them from the root or the file system, so neither is proven',
    expect: 2,
    mentions: [
      "R2 src/abs.ts:1: cannot resolve dynamic reference '/docs/srd/full/srd.txt?raw' on a production path",
      "R2 src/abs.ts:2: cannot resolve dynamic reference '/assets/other.js' on a production path",
    ],
    files: {
      'src/abs.ts': "export const srd = () => import('/docs/srd/full/srd.txt?raw');\n" +
        "export const other = () => import('/assets/other.js');\n",
      'docs/srd/full/srd.txt': 'SRD',
    },
  },
  {
    rule: 'R2',
    name: 'computed imports on a production path, listed with their count and reason',
    expect: 0,
    noteMentions: ['; 2 unresolved reference(s) there accepted unproven'],
    policy: {
      srdUnproven: [{ file: 'db/plugins.ts', references: 2, why: 'loads a named package plugin, never a repository file' }],
    },
    files: {
      'db/plugins.ts': 'export const a = (name: string) => import(name);\n' +
        'export const b = (name: string) => import(`${name}/plugin`);\n',
    },
  },
  {
    rule: 'R2',
    name: 'unresolved-reference entries that are wrong: no reason, a count one short (a new computed import) and one ' +
      'over, stale, for a file no production module reaches, listed twice',
    expect: 6,
    mentions: [
      'R2 unresolved-reference allowlist entry db/no-why.ts gives no reason',
      'R2 unresolved-reference allowlist entry db/twice.ts is listed twice',
      'R2 db/grown.ts: 2 unresolved reference(s) on a production path (line(s) 1, 2), but its allowlist entry accepts 1',
      'R2 db/shrunk.ts: 1 unresolved reference(s) on a production path (line(s) 1), but its allowlist entry accepts 2',
      'R2 stale unresolved-reference allowlist entry: db/fixed.ts has no unresolved reference on a production path',
      'R2 stale unresolved-reference allowlist entry: tools/unreached.ts has no unresolved reference on a production path',
    ],
    // A wrong entry accepts nothing: db/no-why.ts and db/twice.ts have one
    // reference each and entries that count it, yet none is accepted.
    noteMentions: ['; 0 unresolved reference(s) there accepted unproven'],
    policy: {
      srdUnproven: [
        { file: 'db/no-why.ts', references: 1, why: ' ' },
        { file: 'db/grown.ts', references: 1, why: 'a plugin loader' },
        { file: 'db/shrunk.ts', references: 2, why: 'a plugin loader' },
        { file: 'db/fixed.ts', references: 1, why: 'a plugin loader' },
        { file: 'tools/unreached.ts', references: 1, why: 'a maintenance CLI' },
        { file: 'db/twice.ts', references: 1, why: 'a plugin loader' },
        { file: 'db/twice.ts', references: 1, why: 'a plugin loader' },
      ],
    },
    files: {
      'db/no-why.ts': 'export const a = (name: string) => import(name);\n',
      'db/grown.ts': 'export const a = (name: string) => import(name);\nexport const b = (name: string) => import(name);\n',
      'db/shrunk.ts': 'export const a = (name: string) => import(name);\n',
      'db/fixed.ts': "export const a = () => import('./plugin');\n",
      'db/plugin.ts': 'export const plugin = 1;\n',
      'tools/unreached.ts': 'export const a = (name: string) => import(name);\n',
      'db/twice.ts': 'export const a = (name: string) => import(name);\n',
    },
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
    rule: 'R3',
    name: 'a directory target that a static entry reaches only lazily',
    expect: 0,
    policy: { forbidden: [{ status: 'active', from: 'src/main.ts', to: 'docs/big/', via: 'static', why: 'x' }] },
    files: {
      'src/main.ts': "import { mid } from './mid';\nexport const later = () => import('../docs/big/part/b.txt?raw');\n",
      'src/mid.ts': "import notes from '../docs/other.txt?raw';\nexport const mid = 1;\n",
      'docs/big/part/b.txt': 'big',
      'docs/other.txt': 'other',
    },
  },
  {
    rule: 'R3',
    name: 'a directory target reached by a file below it, and a directory target with no files',
    expect: 2,
    mentions: ['src/main.ts:1 -> src/mid.ts:1 -> docs/big/part/b.txt?raw', 'docs/gone/: no such target'],
    policy: {
      forbidden: [
        { status: 'active', from: 'src/main.ts', to: 'docs/big/', via: 'runtime', why: 'x' },
        { status: 'active', from: 'src/main.ts', to: 'docs/gone/', via: 'runtime', why: 'x' },
      ],
    },
    files: {
      'src/main.ts': "import { mid } from './mid';\n",
      'src/mid.ts': "import big from '../docs/big/part/b.txt?raw';\nexport const mid = 1;\n",
      'docs/big/part/b.txt': 'big',
    },
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

/**
 * The --update witness (D927), run through checkCheckout exactly as the CLI
 * runs it. src/main.ts is over both budgets and src/lean.ts far under them.
 * The budgets after --update are worked by hand, at margins of 10% for files
 * and 30% for bytes (different, so each unit must use its own):
 *   src/main.ts loads itself (25 bytes) and src/b.ts (20 bytes): 2 files and
 *     45 bytes, so ceil(2 × 1.1) = ceil(2.2) = 3 files and ceil(45 × 1.3) =
 *     ceil(58.5) = 59 bytes, raised from 1 and 30;
 *   src/lean.ts is 1 file of 23 bytes, so ceil(1.1) = 2 files and
 *     ceil(23 × 1.3) = ceil(29.9) = 30 bytes, lowered from 5 and 1000.
 */
const UPDATE_WITNESS_BUDGETS = {
  about: 'the --update witness',
  marginPercent: { files: 10, bytes: 30 },
  sentinels: { 'src/main.ts': { files: 1, bytes: 30 }, 'src/lean.ts': { files: 5, bytes: 1000 } },
};
const UPDATE_WITNESS_WRITTEN = '{\n  "about": "the --update witness",\n  "marginPercent": {\n    "files": 10,\n    "bytes": 30\n  },\n' +
  '  "sentinels": {\n    "src/main.ts": {\n      "files": 3,\n      "bytes": 59\n    },\n    "src/lean.ts": {\n' +
  '      "files": 2,\n      "bytes": 30\n    }\n  }\n}\n';
const UPDATE_WITNESS_CHANGES = [
  'src/main.ts files: 1 -> 3 (raised)',
  'src/main.ts bytes: 30 -> 59 (raised)',
  'src/lean.ts files: 5 -> 2 (lowered)',
  'src/lean.ts bytes: 1000 -> 30 (lowered)',
];

function updateWitness() {
  const failures = [];
  const files = {
    'src/main.ts': "import { b } from './b';\n",
    'src/b.ts': 'export const b = 1;\n',
    'src/lean.ts': 'export const lean = 1;\n',
    [BUDGETS_FILE]: `${JSON.stringify(UPDATE_WITNESS_BUDGETS, null, 2)}\n`,
  };
  const before = files[BUDGETS_FILE];
  const host = fixtureHost(files);
  const rules = { srdImporters: [], srdUnproven: [], forbidden: [], cycles: [] };
  const run = (step, update) => {
    const outcome = checkCheckout(host, rules, update);
    const others = Object.entries(outcome.results).filter(([rule]) => rule !== 'R5').flatMap(([, result]) => result.diagnostics);
    if (others.length > 0) failures.push(`--update witness, ${step}: other rules fired:\n  ${others.join('\n  ')}`);
    return { r5: outcome.results.R5.diagnostics, changes: outcome.changes };
  };

  const ordinary = run('an ordinary run', false);
  if (ordinary.r5.length !== 2 || !ordinary.r5.every((diagnostic) => diagnostic.startsWith('R5 src/main.ts: static closure has'))) {
    failures.push(`--update witness: an ordinary run must fail src/main.ts's file and byte budgets, got:\n  ${ordinary.r5.join('\n  ')}`);
  }
  if (files[BUDGETS_FILE] !== before) failures.push('--update witness: an ordinary run rewrote the budgets');

  const updated = run('--update', true);
  if (files[BUDGETS_FILE] !== UPDATE_WITNESS_WRITTEN) {
    failures.push(`--update witness: wrote\n${files[BUDGETS_FILE]}expected\n${UPDATE_WITNESS_WRITTEN}`);
  }
  if (JSON.stringify(updated.changes) !== JSON.stringify(UPDATE_WITNESS_CHANGES)) {
    failures.push(`--update witness: reported ${JSON.stringify(updated.changes)}, expected ${JSON.stringify(UPDATE_WITNESS_CHANGES)}`);
  }
  if (updated.r5.length > 0) failures.push(`--update witness: R5 still fails after --update:\n  ${updated.r5.join('\n  ')}`);

  const again = run('a second --update', true);
  if (again.changes.length > 0 || files[BUDGETS_FILE] !== UPDATE_WITNESS_WRITTEN) {
    failures.push(`--update witness: a second --update changed ${JSON.stringify(again.changes)}`);
  }
  const after = run('an ordinary run after --update', false);
  if (after.r5.length > 0) failures.push(`--update witness: an ordinary run after --update fails:\n  ${after.r5.join('\n  ')}`);
  return { failures, report: `R5 --update ${updated.changes.join('; ')}; then R5 green` };
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
    const notes = results[fixture.rule].notes;
    for (const mention of fixture.noteMentions ?? []) {
      if (!notes.some((note) => note.includes(mention))) {
        failures.push(`${fixture.rule} fixture '${fixture.name}': no note mentions '${mention}':\n  ${notes.join('\n  ')}`);
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
  const witness = updateWitness();
  failures.push(...witness.failures);
  report.push(witness.report);
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
  console.log(`import-boundaries self-test: ${String(SELF_TESTS.length)} fixtures and the --update witness passed`);
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
