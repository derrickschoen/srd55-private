import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { canonicalJson } from '../src/commands/canonical-json';
import type { HeldoutSlice } from '../src/vtt/heldout-evaluation';
import ts from 'typescript';

export interface HeldoutChangedText {
  readonly path: string;
  readonly addedText: string;
  /** Complete candidate source, when available, so imports are parsed as a file rather than a diff fragment. */
  readonly sourceText?: string;
}

export interface HeldoutLeakFinding {
  readonly path: string;
  readonly kind:
    | 'reserve_reference'
    | 'protocol_import'
    | 'protocol_resolution'
    | 'unresolved_module_edge';
  readonly detail: string;
}

export interface HeldoutLeakReport {
  readonly protocol: 'heldout-ordinary-v1';
  readonly slice: HeldoutSlice;
  readonly reserveDigests: readonly string[];
  readonly resultPaths: readonly string[];
  readonly checkedFiles: number;
  readonly findings: readonly HeldoutLeakFinding[];
}

export interface HeldoutLeakBindings {
  readonly reserveDigests: readonly string[];
  readonly resultPaths: readonly string[];
}

const EVALUATION_FILES = new Set([
  'src/vtt/heldout-evaluation.ts',
  'src/vtt/room-generator.ts',
  'tools/generate-heldout-party-basis.ts',
  'tools/generate-arena-basis.ts',
  'tools/ai-dm-arena.ts',
  'tools/ai-dm-heldout-report.ts',
  'tools/ai-dm-heldout-judge-prompt.ts',
  'tools/heldout-leak-check.ts',
  'tools/ai-dm-rerun-packet.ts',
]);

function normalizedDigits(text: string): readonly number[] {
  return [...text.matchAll(/\b[0-9][0-9_,]{5,}\b/gu)].map((match) =>
    Number((match[0] ?? '').replaceAll('_', '').replaceAll(',', '')))
    .filter((value) => Number.isSafeInteger(value));
}

const RESERVE_RESULT_PATH = /(?:\/home\/vagrant\/dnd-slim-runs\/)?heldout-[a-f]-(?:encounters|rounds|packet|key|judge|report)[a-z0-9._/-]*/iu;

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function isTypeScriptOrJavaScript(path: string): boolean {
  return ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
    .some((extension) => path.endsWith(extension));
}

type ModuleEdgeSyntax =
  | 'static_import'
  | 're_export'
  | 'import_equals'
  | 'import_type'
  | 'dynamic_import'
  | 'require'
  | 'require_resolve'
  | 'import_meta_resolve';

interface ModuleEdge {
  readonly kind: 'import' | 'resolution' | 'unresolved';
  readonly syntax: ModuleEdgeSyntax;
  readonly specifier: string | null;
}

/** Executable source strings are not syntax-level module edges and are intentionally outside this wall. */
export const HELDOUT_LEAK_AST_OUT_OF_SCOPE = [
  'eval executable strings',
  'new Function executable strings',
] as const;

export const HELDOUT_MODULE_SPECIFIER_POLICY = {
  normalized: [
    'query and fragment suffixes are removed for module identity and retained for finding detail',
    'repeated and trailing slashes are collapsed',
    'dot and parent path segments are resolved lexically',
    'a trailing index, index.js, or index.ts resolves to its containing module path',
    'a trailing .js or .ts extension resolves to the extensionless module identity',
  ],
  meaningChangingQueries: [
    'raw', 'url', 'inline', 'worker', 'sharedworker', 'init', 'import', 'no-inline',
  ],
  findings: [
    'a normalized held-out import is a protocol_import',
    'a normalized held-out resolver call is a protocol_resolution',
    'a recognized non-constant module edge is an unresolved_module_edge',
  ],
} as const;

function unwrapTransparentExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function constantString(expression: ts.Expression | undefined): string | null {
  if (expression === undefined) return null;
  const unwrapped = unwrapTransparentExpression(expression);
  if (ts.isStringLiteral(unwrapped) || ts.isNoSubstitutionTemplateLiteral(unwrapped)) {
    return unwrapped.text;
  }
  if (ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = constantString(unwrapped.left);
    const right = constantString(unwrapped.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isTemplateExpression(unwrapped)) {
    let result = unwrapped.head.text;
    for (const span of unwrapped.templateSpans) {
      const substitution = constantString(span.expression);
      if (substitution === null) return null;
      result += substitution + span.literal.text;
    }
    return result;
  }
  return null;
}

function isRequireCallee(expression: ts.Expression): boolean {
  const callee = unwrapTransparentExpression(expression);
  return ts.isIdentifier(callee) && callee.text === 'require';
}

type ResolutionSyntax = Extract<
  ModuleEdgeSyntax,
  'require_resolve' | 'import_meta_resolve'
>;

function resolutionReceiverSyntax(expression: ts.Expression): ResolutionSyntax | null {
  const receiver = unwrapTransparentExpression(expression);
  if (ts.isIdentifier(receiver) && receiver.text === 'require') return 'require_resolve';
  if (ts.isMetaProperty(receiver) &&
    receiver.keywordToken === ts.SyntaxKind.ImportKeyword && receiver.name.text === 'meta') {
    return 'import_meta_resolve';
  }
  return null;
}

function resolutionCallee(expression: ts.Expression): {
  readonly syntax: ResolutionSyntax;
  readonly key: 'resolve' | 'unresolved';
} | null {
  const callee = unwrapTransparentExpression(expression);
  if (ts.isPropertyAccessExpression(callee)) {
    const syntax = resolutionReceiverSyntax(callee.expression);
    return syntax !== null && callee.name.text === 'resolve'
      ? { syntax, key: 'resolve' }
      : null;
  }
  if (ts.isElementAccessExpression(callee)) {
    const syntax = resolutionReceiverSyntax(callee.expression);
    if (syntax === null) return null;
    const key = constantString(callee.argumentExpression);
    if (key === null) return { syntax, key: 'unresolved' };
    return key === 'resolve' ? { syntax, key: 'resolve' } : null;
  }
  return null;
}

/**
 * Enumerates statically named module edges from TypeScript syntax. Comments and
 * whitespace are trivia, so they cannot split a token sequence past this wall.
 */
function discoverModuleEdges(path: string, source: string): readonly ModuleEdge[] {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
      jsx: ts.JsxEmit.Preserve,
    },
    fileName: path,
    reportDiagnostics: true,
  });
  const parseErrors = (transpiled.diagnostics ?? []).filter((diagnostic) =>
    diagnostic.category === ts.DiagnosticCategory.Error);
  if (parseErrors.length > 0) {
    const detail = parseErrors.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')).join('; ');
    throw new TypeError(`Held-out leak inspection could not parse ${path}: ${detail}`);
  }

  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(path),
  );
  const result: ModuleEdge[] = [];
  const add = (
    syntax: ModuleEdgeSyntax,
    expression: ts.Expression | undefined,
    resolvedKind: 'import' | 'resolution' = 'import',
  ): void => {
    const specifier = constantString(expression);
    result.push({
      kind: specifier === null ? 'unresolved' : resolvedKind,
      syntax,
      specifier,
    });
  };
  const addUnresolved = (syntax: ModuleEdgeSyntax): void => {
    result.push({ kind: 'unresolved', syntax, specifier: null });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      add('static_import', node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      add('re_export', node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add('import_equals', node.moduleReference.expression);
    } else if (ts.isImportTypeNode(node)) {
      add('import_type', ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
    } else if (ts.isCallExpression(node)) {
      const callee = unwrapTransparentExpression(node.expression);
      const firstArgument = node.arguments[0];
      if (callee.kind === ts.SyntaxKind.ImportKeyword) {
        add('dynamic_import', firstArgument);
      } else if (isRequireCallee(callee)) {
        add('require', firstArgument);
      } else {
        const resolution = resolutionCallee(callee);
        if (resolution?.key === 'resolve') {
          add(resolution.syntax, firstArgument, 'resolution');
        } else if (resolution?.key === 'unresolved') {
          addUnresolved(resolution.syntax);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return result;
}

export function moduleSpecifiers(path: string, source: string): readonly string[] {
  return [...new Set(discoverModuleEdges(path, source).flatMap((edge) =>
    edge.specifier === null ? [] : [edge.specifier]))].sort();
}

interface NormalizedModuleSpecifier {
  readonly path: string;
  readonly suffix: string;
  readonly meaningChangingQuery: boolean;
}

function stripKnownModuleSuffix(path: string): string {
  for (const suffix of ['/index.js', '/index.ts', '/index']) {
    if (path.endsWith(suffix)) return path.slice(0, -suffix.length);
  }
  for (const extension of ['.js', '.ts']) {
    if (path.endsWith(extension)) return path.slice(0, -extension.length);
  }
  return path;
}

function normalizeModuleSpecifier(specifier: string): NormalizedModuleSpecifier {
  const queryIndex = specifier.indexOf('?');
  const fragmentIndex = specifier.indexOf('#');
  const suffixIndexes = [queryIndex, fragmentIndex].filter((index) => index >= 0);
  const suffixIndex = suffixIndexes.length === 0 ? specifier.length : Math.min(...suffixIndexes);
  const suffix = specifier.slice(suffixIndex);
  let path = posix.normalize(specifier.slice(0, suffixIndex));
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  path = stripKnownModuleSuffix(path);

  const query = queryIndex < 0
    ? ''
    : specifier.slice(queryIndex + 1, fragmentIndex > queryIndex ? fragmentIndex : specifier.length);
  const meaningChangingQueries: readonly string[] =
    HELDOUT_MODULE_SPECIFIER_POLICY.meaningChangingQueries;
  const meaningChangingQuery = query.split('&').some((parameter) => {
    const key = parameter.split('=', 1)[0];
    return key !== undefined && meaningChangingQueries.includes(key);
  });
  return { path, suffix, meaningChangingQuery };
}

function heldoutProtocolSpecifier(specifier: string): NormalizedModuleSpecifier | null {
  const normalized = normalizeModuleSpecifier(specifier);
  return normalized.path === 'heldout-evaluation' ||
    normalized.path.endsWith('/heldout-evaluation')
    ? normalized
    : null;
}

function firstHeldoutEdge(
  edges: readonly ModuleEdge[],
  kind: Extract<ModuleEdge['kind'], 'import' | 'resolution'>,
): NormalizedModuleSpecifier | null {
  for (const edge of edges) {
    if (edge.kind !== kind || edge.specifier === null) continue;
    const normalized = heldoutProtocolSpecifier(edge.specifier);
    if (normalized !== null) return normalized;
  }
  return null;
}

function specifierSuffixDetail(specifier: NormalizedModuleSpecifier): string {
  if (specifier.suffix.length === 0) return '';
  const kind = specifier.meaningChangingQuery
    ? 'meaning-changing loader suffix'
    : 'specifier suffix';
  return ` via ${kind} ${JSON.stringify(specifier.suffix)}`;
}

function reserveReference(text: string, bindings: HeldoutLeakBindings): string | null {
  if (text.includes('heldout-ordinary-v1') || text.includes('heldout-ordinary-v1-basis')) {
    return 'held-out reserve protocol or path';
  }
  const resultPath = bindings.resultPaths.find((path) => text.includes(path));
  if (resultPath !== undefined) return `bound reserve result path ${resultPath}`;
  const conventionalResultPath = text.match(RESERVE_RESULT_PATH)?.[0];
  if (conventionalResultPath !== undefined) {
    return `held-out reserve result path ${conventionalResultPath}`;
  }
  const normalizedText = text.toLowerCase();
  const reserveDigest = bindings.reserveDigests.find((digest) =>
    normalizedText.includes(digest.toLowerCase()));
  if (reserveDigest !== undefined) return `bound reserve digest ${reserveDigest}`;
  for (const value of normalizedDigits(text)) {
    if (value >= 7_860_001 && value <= 7_860_144) return `reserve room seed ${String(value)}`;
    if (value >= 8_860_001 && value <= 8_860_432) return `reserve combat seed ${String(value)}`;
    if (value >= 7_861_101 && value <= 7_861_106) return `reserve shuffle seed ${String(value)}`;
    if (value >= 7_862_101 && value <= 7_862_106) return `reserve bootstrap seed ${String(value)}`;
  }
  return null;
}

function isTestOrFixture(path: string): boolean {
  return path.startsWith('tests/');
}

function semanticInputPath(path: string): boolean {
  return /(ranking|opportunity-cost|prompt|tuning|challenge|play|score)/iu.test(path);
}

export function inspectHeldoutLeakChanges(
  changes: readonly HeldoutChangedText[],
  slice: HeldoutSlice,
  bindings: HeldoutLeakBindings,
): HeldoutLeakReport {
  if (bindings.reserveDigests.length === 0 || bindings.resultPaths.length === 0) {
    throw new TypeError('Held-out leak inspection requires reserve digest and result path bindings.');
  }
  if (bindings.reserveDigests.some((digest) => !/^[a-f0-9]{64}$/iu.test(digest))) {
    throw new TypeError('Held-out reserve digests must be SHA-256 values.');
  }
  if (bindings.resultPaths.some((path) =>
    !path.startsWith('/home/vagrant/dnd-slim-runs/heldout-'))) {
    throw new TypeError('Held-out reserve result paths must use the registered result root.');
  }
  const findings: HeldoutLeakFinding[] = [];
  for (const change of changes) {
    const reference = reserveReference(change.addedText, bindings);
    if (reference !== null && (
      semanticInputPath(change.path) ||
      (!EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path))
    )) {
      findings.push({ path: change.path, kind: 'reserve_reference', detail: reference });
    }
    const edges = isTypeScriptOrJavaScript(change.path)
      ? discoverModuleEdges(change.path, change.sourceText ?? change.addedText)
      : [];
    const restrictedPath = !EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path);
    const heldoutImport = firstHeldoutEdge(edges, 'import');
    if (restrictedPath && heldoutImport !== null) {
      findings.push({
        path: change.path,
        kind: 'protocol_import',
        detail: `held-out protocol imported outside evaluation tooling${specifierSuffixDetail(heldoutImport)}`,
      });
    }
    const heldoutResolution = firstHeldoutEdge(edges, 'resolution');
    if (restrictedPath && heldoutResolution !== null) {
      findings.push({
        path: change.path,
        kind: 'protocol_resolution',
        detail: `held-out protocol resolved outside evaluation tooling${specifierSuffixDetail(heldoutResolution)}`,
      });
    }
    const unresolved = edges.find((edge) => edge.kind === 'unresolved');
    if (restrictedPath && unresolved !== undefined) {
      findings.push({
        path: change.path,
        kind: 'unresolved_module_edge',
        detail: `unresolved ${unresolved.syntax} edge outside evaluation tooling`,
      });
    }
  }
  return {
    protocol: 'heldout-ordinary-v1',
    slice,
    reserveDigests: [...bindings.reserveDigests],
    resultPaths: [...bindings.resultPaths],
    checkedFiles: changes.length,
    findings,
  };
}

function addedChanges(base: string, candidate: string): readonly HeldoutChangedText[] {
  const diff = execFileSync(
    'git',
    ['diff', '--no-ext-diff', '--unified=0', base, candidate, '--', 'src', 'tools', 'tests'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const byPath = new Map<string, string[]>();
  let path: string | null = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      path = line.slice('+++ b/'.length);
      if (!byPath.has(path)) byPath.set(path, []);
      continue;
    }
    if (path !== null && line.startsWith('+') && !line.startsWith('+++')) {
      const lines = byPath.get(path) ?? [];
      lines.push(line.slice(1));
      byPath.set(path, lines);
    }
  }
  return [...byPath].map(([changedPath, lines]) => ({
    path: changedPath,
    addedText: lines.join('\n'),
    sourceText: execFileSync('git', ['show', `${candidate}:${changedPath}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  }));
}

function parseArgs(argv: readonly string[]): {
  readonly base: string;
  readonly candidate: string;
  readonly slice: HeldoutSlice;
  readonly bindings: HeldoutLeakBindings;
} {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const values = new Map<string, string>();
  const reserveDigests: string[] = [];
  const resultPaths: string[] = [];
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (option === undefined || ![
      '--base', '--candidate', '--protocol', '--slice', '--reserve-digest', '--result-path',
    ].includes(option)) {
      throw new TypeError(`Unknown held-out leak option ${option ?? '<missing>'}.`);
    }
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
    if (option === '--reserve-digest') reserveDigests.push(value);
    else if (option === '--result-path') resultPaths.push(value);
    else values.set(option, value);
  }
  if (values.get('--protocol') !== 'heldout-ordinary-v1') {
    throw new TypeError('--protocol must be heldout-ordinary-v1.');
  }
  const base = values.get('--base');
  const candidate = values.get('--candidate');
  const slice = values.get('--slice');
  if (base === undefined || candidate === undefined ||
    !['A', 'B', 'C', 'D', 'E', 'F'].includes(slice ?? '')) {
    throw new TypeError('--base, --candidate, and --slice A-F are required.');
  }
  if (reserveDigests.length === 0 || resultPaths.length === 0) {
    throw new TypeError('At least one --reserve-digest and --result-path are required.');
  }
  return {
    base,
    candidate,
    slice: slice as HeldoutSlice,
    bindings: { reserveDigests, resultPaths },
  };
}

function main(argv: readonly string[]): void {
  const config = parseArgs(argv);
  const report = inspectHeldoutLeakChanges(
    addedChanges(config.base, config.candidate),
    config.slice,
    config.bindings,
  );
  process.stdout.write(`${canonicalJson(report)}\n`);
  if (report.findings.length > 0) process.exitCode = 1;
}

const scriptIndex = process.argv.findIndex((argument) =>
  argument.endsWith('/heldout-leak-check.ts') || argument.endsWith('\\heldout-leak-check.ts'));
if (scriptIndex >= 0) main(process.argv.slice(scriptIndex + 1));
else if (process.argv.includes('--base') && process.argv.includes('--candidate')) main(process.argv.slice(2));
