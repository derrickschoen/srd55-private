import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterAll, describe, expect, it } from 'vitest';
import {
  createEncounter,
  reduceEncounter,
  type EncounterCommandReducer,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import {
  mulberry32,
  restoreMulberry32,
  type SerializableRng,
} from '../../../src/combat/random';
import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
import {
  runSessionCommandTransaction,
  SessionCommandTransaction,
  type SessionCommandTransactionInput,
} from '../../../src/vtt/session-command-transaction';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const transactionEntry = resolve(repoRoot, 'src/vtt/session-command-transaction.ts');
const temporaryRoot = resolve(repoRoot, '.tmp');
mkdirSync(temporaryRoot, { recursive: true });
const guardRoot = mkdtempSync(join(temporaryRoot, 'session-command-transaction-guard-'));
const outsideRoot = mkdtempSync(join(tmpdir(), 'session-command-transaction-outside-'));

afterAll(() => {
  rmSync(guardRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
});

function transactionInput(
  state: EncounterState,
  parent: SerializableRng,
  reducer: EncounterCommandReducer,
  options: {
    readonly initialBoundary?: 'preserve' | 'resolve_before_program';
    readonly boundaryScope?: 'reaction_offers_only' | 'initiative_segment';
    readonly askDefault?: 'decline' | 'take';
    readonly guidance?: SessionCommandTransactionInput<SerializableRng>['guidance'];
    readonly onFork?: () => void;
  } = {},
): SessionCommandTransactionInput<SerializableRng> {
  return {
    state,
    random: {
      fork: () => {
        options.onFork?.();
        return restoreMulberry32(parent.snapshot());
      },
    },
    reducer,
    boundaryPolicy: { kind: 'unattended', askDefault: options.askDefault ?? 'decline' },
    guidance: options.guidance ?? null,
    boundaryScope: options.boundaryScope ?? 'initiative_segment',
    initialBoundary: options.initialBoundary ?? 'preserve',
  };
}

function simpleState(): EncounterState {
  const actor = playerProfile('transaction-actor', { initiativeBonus: 20 });
  const target = monsterProfile('transaction-target', { initiativeBonus: -20 });
  return createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [actor, target],
    tokens: [placedToken(actor, 1), placedToken(target, 4)],
  });
}

function recordingReducer(
  draws: number[],
  commands: EncounterCommand['type'][],
): EncounterCommandReducer {
  return (state, command, rng) => {
    commands.push(command.type);
    draws.push(rng());
    return { state: { ...state, revision: state.revision + 1 }, events: [] };
  };
}

function pendingReaction(): {
  readonly beforeOffer: EncounterState;
  readonly offered: EncounterState;
  readonly moverId: ReturnType<typeof playerProfile>['id'];
  readonly reactorId: ReturnType<typeof monsterProfile>['id'];
  readonly decisionId: string;
} {
  const mover = playerProfile('transaction-mover', { hitPoints: 100, initiativeBonus: 20 });
  const reactor = monsterProfile('transaction-reactor', { hitPoints: 100, initiativeBonus: -20 });
  const beforeOffer = reduceEncounter(createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [mover, reactor],
    tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
  }), { type: 'roll_initiative' }, () => 0.5).state;
  const offered = reduceEncounter(beforeOffer, {
    type: 'move',
    actor: mover.id,
    path: [{ column: 2, row: 0 }],
    cause: 'voluntary',
  }, () => 0.5).state;
  const decision = offered.pendingDecisions.find((entry) => entry.kind === 'reaction_offer');
  if (decision === undefined) throw new Error('Transaction fixture did not offer a reaction.');
  return {
    beforeOffer,
    offered,
    moverId: mover.id,
    reactorId: reactor.id,
    decisionId: decision.id,
  };
}

describe('session command transaction', () => {
  it('forks once, advances one retained fork across commands, and completes once', () => {
    const state = simpleState();
    const parent = mulberry32(58_410_101);
    const parentBefore = parent.snapshot();
    const expected = restoreMulberry32(parentBefore);
    const expectedDraws = [expected(), expected()];
    const draws: number[] = [];
    const commands: EncounterCommand['type'][] = [];
    let forks = 0;
    const transaction = SessionCommandTransaction.begin(transactionInput(
      state,
      parent,
      recordingReducer(draws, commands),
      { onFork: () => { forks += 1; } },
    ));

    expect(transaction.currentState()).toBe(state);
    const firstState = transaction.apply({ type: 'roll_initiative' });
    const secondState = transaction.apply({ type: 'roll_initiative' });
    const completed = transaction.complete('done');

    expect(forks).toBe(1);
    expect(commands).toEqual(['roll_initiative', 'roll_initiative']);
    expect(draws).toEqual(expectedDraws);
    expect([firstState.revision, secondState.revision]).toEqual([
      state.revision + 1,
      state.revision + 2,
    ]);
    expect(completed).toMatchObject({
      kind: 'completed',
      state: { revision: state.revision + 2 },
      revisionDelta: 2,
      value: 'done',
      fallbackResolutions: [],
      guidedResolutions: [],
    });
    expect(completed.random.snapshot()).toEqual(expected.snapshot());
    expect(parent.snapshot()).toEqual(parentBefore);
    expect(() => transaction.apply({ type: 'roll_initiative' })).toThrow(
      'Cannot apply a command after the session command transaction is completed.',
    );
    expect(() => transaction.complete('twice')).toThrow(
      'Cannot complete after the session command transaction is completed.',
    );
    expect(() => transaction.rollback(new Error('late'))).toThrow(
      'Cannot roll back after the session command transaction is completed.',
    );
  });

  it('closes a rolled-back transaction and preserves the exact error object', () => {
    const state = simpleState();
    const transaction = SessionCommandTransaction.begin(transactionInput(
      state,
      mulberry32(58_410_102),
      recordingReducer([], []),
    ));
    const error = new RangeError('exact rollback sentinel');

    const rolledBack = transaction.rollback(error);

    expect(rolledBack.kind).toBe('rolled_back');
    expect(rolledBack.error).toBe(error);
    expect(transaction.currentState()).toBe(state);
    expect(() => transaction.rollback(error)).toThrow(
      'Cannot roll back after the session command transaction is rolled_back.',
    );
    expect(() => transaction.apply({ type: 'roll_initiative' })).toThrow(
      'Cannot apply a command after the session command transaction is rolled_back.',
    );
  });

  it('gives programs only a frozen currentState/apply port', () => {
    const observedKeys: string[][] = [];
    const frozen: boolean[] = [];
    const outcome = runSessionCommandTransaction(
      transactionInput(simpleState(), mulberry32(58_410_103), recordingReducer([], [])),
      (commands) => {
        observedKeys.push(Object.keys(commands).sort());
        frozen.push(Object.isFrozen(commands));
        return commands.currentState().revision;
      },
    );

    expect(observedKeys).toEqual([['apply', 'currentState']]);
    expect(frozen).toEqual([true]);
    expect(outcome).toMatchObject({ kind: 'completed', revisionDelta: 0 });
  });

  it('keeps preserve and resolve-before-program distinct on pending evidence', () => {
    const fixture = pendingReaction();
    const preserveSeen: number[] = [];
    const preserve = runSessionCommandTransaction(
      transactionInput(
        fixture.offered,
        mulberry32(58_410_104),
        reduceSessionEncounter,
        { initialBoundary: 'preserve' },
      ),
      (commands) => {
        preserveSeen.push(commands.currentState().pendingDecisions.length);
        return 'preserved';
      },
    );
    const resolvedSeen: number[] = [];
    const resolved = runSessionCommandTransaction(
      transactionInput(
        fixture.offered,
        mulberry32(58_410_104),
        reduceSessionEncounter,
        { initialBoundary: 'resolve_before_program' },
      ),
      (commands) => {
        resolvedSeen.push(commands.currentState().pendingDecisions.length);
        return 'resolved';
      },
    );

    expect(preserveSeen).toEqual([1]);
    expect(preserve).toMatchObject({
      kind: 'completed',
      revisionDelta: 0,
      fallbackResolutions: [],
      guidedResolutions: [],
    });
    expect(resolvedSeen).toEqual([0]);
    expect(resolved).toMatchObject({
      kind: 'completed',
      revisionDelta: 1,
      fallbackResolutions: [{
        decisionId: fixture.decisionId,
        combatant: fixture.reactorId,
        reactionKind: 'opportunity_attack',
        configuredPolicy: 'ask',
        askDefault: 'decline',
        resolution: 'decline',
      }],
      guidedResolutions: [],
    });
  });

  it('drains after each command and retains exact reducer-command and evidence order', () => {
    const mover = playerProfile('transaction-order-mover', { initiativeBonus: 20 });
    const first = monsterProfile('transaction-order-first', { initiativeBonus: -10 });
    const second = monsterProfile('transaction-order-second', { initiativeBonus: -20 });
    const state = reduceEncounter(createEncounter({
      bounds: { columns: 6, rows: 4 },
      combatants: [mover, first, second],
      tokens: [
        placedToken(mover, 1, 1),
        placedToken(first, 0, 1),
        placedToken(second, 1, 0),
      ],
    }), { type: 'roll_initiative' }, () => 0.5).state;
    const commandLog: EncounterCommand[] = [];
    const reducer: EncounterCommandReducer = (current, command, rng, options) => {
      commandLog.push(command);
      return reduceSessionEncounter(current, command, rng, options);
    };

    const outcome = runSessionCommandTransaction(
      transactionInput(state, mulberry32(58_410_105), reducer),
      (commands) => commands.apply({
        type: 'move',
        actor: mover.id,
        path: [{ column: 2, row: 1 }, { column: 3, row: 1 }],
        cause: 'voluntary',
      }).revision,
    );

    expect(commandLog.map((command) => command.type)).toEqual([
      'move',
      'resolve_pending_decision',
      'resolve_pending_decision',
    ]);
    expect(outcome).toMatchObject({
      kind: 'completed',
      revisionDelta: 3,
      fallbackResolutions: [
        { combatant: first.id, resolution: 'decline' },
        { combatant: second.id, resolution: 'decline' },
      ],
      guidedResolutions: [],
    });
    if (outcome.kind !== 'completed') throw outcome.error;
    expect(outcome.revisionDelta).toBe(outcome.state.revision - state.revision);
  });

  it('partitions guided boundary evidence from fallback evidence', () => {
    const fixture = pendingReaction();
    const outcome = runSessionCommandTransaction(
      transactionInput(
        fixture.beforeOffer,
        mulberry32(58_410_106),
        reduceSessionEncounter,
        {
          guidance: {
            sideWide: { opportunity_attack: 'decline' },
            actors: [],
          },
        },
      ),
      (commands) => commands.apply({
        type: 'move',
        actor: fixture.moverId,
        path: [{ column: 2, row: 0 }],
        cause: 'voluntary',
      }).revision,
    );

    expect(outcome).toMatchObject({
      kind: 'completed',
      fallbackResolutions: [],
      guidedResolutions: [{
        combatant: fixture.reactorId,
        reactionKind: 'opportunity_attack',
        instruction: 'decline',
        scope: { kind: 'side_wide' },
        resolution: 'decline',
      }],
    });
  });

  it('discards trial state, random progression, and evidence on outer rollback', () => {
    const fixture = pendingReaction();
    const parent = mulberry32(58_410_107);
    const parentBefore = parent.snapshot();
    const independentlyStepped = restoreMulberry32(parentBefore);
    const expectedTrialDraws = [independentlyStepped(), independentlyStepped()];
    const trialDraws: number[] = [];
    const randomConsumingReducer: EncounterCommandReducer = (state, command, rng, options) => {
      trialDraws.push(rng());
      return reduceSessionEncounter(state, command, rng, options);
    };
    const error = new Error('outer rollback sentinel');
    const outcome = runSessionCommandTransaction(
      transactionInput(
        fixture.beforeOffer,
        parent,
        randomConsumingReducer,
      ),
      (commands) => {
        const attempted = commands.apply({
          type: 'move',
          actor: fixture.moverId,
          path: [{ column: 2, row: 0 }],
          cause: 'voluntary',
        });
        expect(attempted.revision).toBe(fixture.beforeOffer.revision + 2);
        expect(trialDraws.length).toBeGreaterThan(0);
        expect(trialDraws).toEqual(expectedTrialDraws);
        throw error;
      },
    );

    expect(outcome.kind).toBe('rolled_back');
    if (outcome.kind !== 'rolled_back') {
      throw new Error('Failed transaction unexpectedly completed.');
    }
    expect(outcome.error).toBe(error);
    expect(Reflect.has(outcome, 'state')).toBe(false);
    expect(Reflect.has(outcome, 'random')).toBe(false);
    expect(Reflect.has(outcome, 'fallbackResolutions')).toBe(false);
    expect(parent.snapshot()).toEqual(parentBefore);
    expect(fixture.beforeOffer.pendingDecisions).toEqual([]);
  });
});

type ModuleEdgeKind =
  | 'import_declaration'
  | 'export_declaration'
  | 'import_equals'
  | 'import_type'
  | 'dynamic_import'
  | 'require';

interface ModuleEdge {
  readonly kind: ModuleEdgeKind;
  readonly specifier: string | null;
  readonly runtime: boolean;
}

function moduleEdges(sourceText: string, path: string): readonly ModuleEdge[] {
  const source = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TS,
  );
  const edges: ModuleEdge[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      edges.push({
        kind: 'import_declaration',
        specifier: ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null,
        runtime: node.importClause?.isTypeOnly !== true,
      });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      edges.push({
        kind: 'export_declaration',
        specifier: ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null,
        runtime: !node.isTypeOnly,
      });
    } else if (ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      edges.push({
        kind: 'import_equals',
        specifier: expression !== undefined && ts.isStringLiteral(expression)
          ? expression.text
          : null,
        runtime: !node.isTypeOnly,
      });
    } else if (ts.isImportTypeNode(node)) {
      edges.push({
        kind: 'import_type',
        specifier: ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)
          ? node.argument.literal.text
          : null,
        runtime: false,
      });
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      edges.push({
        kind: 'dynamic_import',
        specifier: argument !== undefined && ts.isStringLiteral(argument) ? argument.text : null,
        runtime: true,
      });
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === 'require') {
      const [argument] = node.arguments;
      edges.push({
        kind: 'require',
        specifier: argument !== undefined && ts.isStringLiteral(argument) ? argument.text : null,
        runtime: true,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return edges;
}

const configPath = join(repoRoot, 'tsconfig.node.json');
const configRead = ts.readConfigFile(configPath, (path) => readFileSync(path, 'utf8'));
if (configRead.error !== undefined) {
  throw new Error(ts.flattenDiagnosticMessageText(configRead.error.messageText, '\n'));
}
const parsedConfig = ts.parseJsonConfigFileContent(
  configRead.config,
  ts.sys,
  repoRoot,
  undefined,
  configPath,
);
if (parsedConfig.errors.length > 0) {
  throw new Error(parsedConfig.errors.map((error) =>
    ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
}

const canonicalRepoRoot = ts.sys.realpath?.(repoRoot) ?? repoRoot;
const rawExtensions = new Set([
  '.txt',
  '.md',
  '.sql',
  '.svg',
  '.css',
  '.html',
  '.ts',
  '.tsx',
]);

function repositoryRelative(path: string): string {
  return relative(canonicalRepoRoot, path).split(sep).join('/');
}

function isInsideRepository(path: string): boolean {
  const pathFromRoot = relative(canonicalRepoRoot, path);
  return pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot);
}

function isForbiddenPath(path: string): boolean {
  const normalized = repositoryRelative(path);
  const segments = normalized.split('/');
  return normalized === 'tools' || normalized.startsWith('tools/') ||
    normalized === 'src/vtt/intel' || normalized.startsWith('src/vtt/intel/') ||
    segments.includes('diagnostics') || basename(normalized).toLowerCase().includes('diagnostic');
}

type ResolvedEdge =
  | { readonly kind: 'external' }
  | { readonly kind: 'source'; readonly path: string }
  | { readonly kind: 'asset'; readonly path: string };

function canonicalFile(path: string): string {
  return ts.sys.realpath?.(path) ?? path;
}

function resolveModuleEdge(importer: string, specifier: string | null): ResolvedEdge {
  if (specifier === null) {
    throw new Error(`Non-literal module edge in ${repositoryRelative(importer)}.`);
  }
  if (specifier.includes('?') || specifier.includes('#')) {
    const rawMatch = /^(\.\.?\/[^?#]+)\?raw$/.exec(specifier);
    if (rawMatch === null) {
      throw new Error(`Unsupported module query or fragment: ${specifier}.`);
    }
    const rawPath = rawMatch[1];
    if (rawPath === undefined) throw new Error(`Raw asset path is absent: ${specifier}.`);
    const candidate = resolve(dirname(importer), rawPath);
    if (!existsSync(candidate)) throw new Error(`Raw asset does not exist: ${specifier}.`);
    const real = canonicalFile(candidate);
    if (!isInsideRepository(real)) throw new Error(`Raw asset escapes the repository: ${specifier}.`);
    if (!statSync(real).isFile()) throw new Error(`Raw asset is not a regular file: ${specifier}.`);
    if (isForbiddenPath(real)) throw new Error(`Raw asset resolves to forbidden path ${repositoryRelative(real)}.`);
    if (!rawExtensions.has(extname(real))) {
      throw new Error(`Raw asset extension is not allowed: ${specifier}.`);
    }
    return { kind: 'asset', path: real };
  }
  const resolution = ts.resolveModuleName(
    specifier,
    importer,
    parsedConfig.options,
    ts.sys,
  ).resolvedModule;
  if (resolution === undefined) {
    if (specifier.startsWith('.') || specifier.startsWith('#')) {
      throw new Error(`Unresolved local module edge: ${specifier}.`);
    }
    throw new Error(`Unresolved project or package module edge: ${specifier}.`);
  }
  const real = canonicalFile(resolution.resolvedFileName);
  if (resolution.isExternalLibraryImport === true) return { kind: 'external' };
  if (!isInsideRepository(real)) {
    throw new Error(`Local module edge escapes the repository: ${specifier}.`);
  }
  return { kind: 'source', path: real };
}

function assertAllowedTarget(target: ResolvedEdge): void {
  if (target.kind !== 'external' && isForbiddenPath(target.path)) {
    throw new Error(`Forbidden session transaction dependency: ${repositoryRelative(target.path)}.`);
  }
}

function assertDirectEdges(sourceText: string, importer: string): void {
  for (const edge of moduleEdges(sourceText, importer)) {
    const target = resolveModuleEdge(importer, edge.specifier);
    assertAllowedTarget(target);
  }
}

function walkRuntimeGraph(entry: string): {
  readonly sources: ReadonlySet<string>;
  readonly assets: ReadonlySet<string>;
} {
  assertDirectEdges(readFileSync(entry, 'utf8'), entry);
  const pending = [entry];
  const sources = new Set<string>();
  const assets = new Set<string>();
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined || sources.has(current)) continue;
    sources.add(current);
    const sourceText = readFileSync(current, 'utf8');
    for (const edge of moduleEdges(sourceText, current)) {
      if (!edge.runtime) continue;
      const target = resolveModuleEdge(current, edge.specifier);
      assertAllowedTarget(target);
      if (target.kind === 'asset') assets.add(target.path);
      if (target.kind === 'source') pending.push(target.path);
    }
  }
  return { sources, assets };
}

function relativeSpecifier(fromFile: string, toFile: string): string {
  const path = relative(dirname(fromFile), toFile).split(sep).join('/');
  return path.startsWith('.') ? path : `./${path}`;
}

describe('session command transaction dependency boundary', () => {
  it('keeps every direct and transitive runtime edge outside forbidden modules', () => {
    const graph = walkRuntimeGraph(transactionEntry);
    expect(graph.sources.has(transactionEntry)).toBe(true);
    expect(graph.sources.size).toBeGreaterThan(1);
    expect([...graph.sources, ...graph.assets].filter(isForbiddenPath)).toEqual([]);
  });

  it.each([
    ["import './intel/contracts';", 'import_declaration'],
    ["export * from './intel/contracts';", 'export_declaration'],
    ["import contracts = require('./intel/contracts');", 'import_equals'],
    ["type Contracts = import('./intel/contracts').EngineTurnQuery;", 'import_type'],
    ["void import('./intel/contracts');", 'dynamic_import'],
    ["require('./intel/contracts');", 'require'],
    ["import type { EngineTurnQuery } from './intel/contracts';", 'type_only_import'],
    ["export type { EngineTurnQuery } from './intel/contracts';", 'type_only_export'],
  ])('rejects forbidden %s edges (%s)', (sourceText) => {
    const importer = resolve(repoRoot, 'src/vtt/session-command-transaction-guard-fixture.ts');
    expect(() => assertDirectEdges(sourceText, importer)).toThrow(
      'Forbidden session transaction dependency: src/vtt/intel/contracts.ts.',
    );
  });

  it('rejects direct tools and diagnostics dependencies', () => {
    const importer = join(guardRoot, 'entry.ts');
    const diagnosticsDirectory = join(guardRoot, 'diagnostics');
    mkdirSync(diagnosticsDirectory);
    const diagnosticModule = join(guardRoot, 'transaction-diagnostic.ts');
    writeFileSync(join(diagnosticsDirectory, 'trace.ts'), 'export const trace = true;\n');
    writeFileSync(diagnosticModule, 'export const diagnostic = true;\n');
    const tool = resolve(repoRoot, 'tools/ai-dm-conversation.ts');

    for (const forbidden of [join(diagnosticsDirectory, 'trace.ts'), diagnosticModule, tool]) {
      const specifier = relativeSpecifier(importer, forbidden);
      expect(() => assertDirectEdges(`import '${specifier}';`, importer)).toThrow(
        'Forbidden session transaction dependency',
      );
    }
  });

  it('retains named type bindings as runtime edges and erases only declaration-level type edges', () => {
    const edges = moduleEdges([
      "import { type Imported } from './named-import';",
      "export { type Exported } from './named-export';",
      "import type { DeclaredImport } from './declared-import';",
      "export type { DeclaredExport } from './declared-export';",
      "import type DeclaredEquals = require('./declared-equals');",
    ].join('\n'), join(guardRoot, 'emit-sensitive.ts'));

    expect(edges.map((edge) => [edge.kind, edge.specifier, edge.runtime])).toEqual([
      ['import_declaration', './named-import', true],
      ['export_declaration', './named-export', true],
      ['import_declaration', './declared-import', false],
      ['export_declaration', './declared-export', false],
      ['import_equals', './declared-equals', false],
    ]);
  });

  it.each([
    "void import(variable);",
    'require(variable);',
  ])('fails closed for non-literal module calls: %s', (sourceText) => {
    expect(() => assertDirectEdges(sourceText, join(guardRoot, 'non-literal.ts'))).toThrow(
      'Non-literal module edge',
    );
  });

  it('accepts only inventoried raw extensions as terminal byte assets', () => {
    const importer = join(guardRoot, 'raw-entry.ts');
    writeFileSync(importer, "import './payload.ts?raw';\n");
    for (const extension of rawExtensions) {
      writeFileSync(join(guardRoot, `asset${extension}`), `raw ${extension}\n`);
      expect(resolveModuleEdge(importer, `./asset${extension}?raw`)).toMatchObject({
        kind: 'asset',
      });
    }
    const payload = join(guardRoot, 'payload.ts');
    writeFileSync(payload, "import '../../../../src/vtt/intel/contracts'; this is raw bytes\n");

    const graph = walkRuntimeGraph(importer);

    expect(graph.sources).toEqual(new Set([importer]));
    expect(graph.assets).toEqual(new Set([payload]));
  });

  it('fails closed for every rejected raw-asset branch', () => {
    const importer = join(guardRoot, 'raw-invalid-entry.ts');
    writeFileSync(importer, 'export {};\n');
    const valid = join(guardRoot, 'valid.txt');
    const unsupported = join(guardRoot, 'unsupported.json');
    const forbidden = resolve(repoRoot, 'src/vtt/intel/contracts.ts');
    const outside = join(outsideRoot, 'outside.txt');
    const directory = join(guardRoot, 'directory.txt');
    writeFileSync(valid, 'valid\n');
    writeFileSync(unsupported, '{}\n');
    writeFileSync(outside, 'outside\n');
    mkdirSync(directory);
    const cases = [
      ['./missing.txt?raw', 'does not exist'],
      [`${relativeSpecifier(importer, outside)}?raw`, 'escapes the repository'],
      [`${relativeSpecifier(importer, forbidden)}?raw`, 'forbidden path'],
      ['./valid.txt?url', 'Unsupported module query or fragment'],
      ['./valid.txt#raw', 'Unsupported module query or fragment'],
      ['./valid.txt?raw?raw', 'Unsupported module query or fragment'],
      ['./directory.txt?raw', 'not a regular file'],
      ['./unsupported.json?raw', 'extension is not allowed'],
    ] as const;

    for (const [specifier, message] of cases) {
      expect(() => resolveModuleEdge(importer, specifier), specifier).toThrow(message);
    }
  });
});
