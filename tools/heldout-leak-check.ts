import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import {
  runHeldoutRuntimeGuard,
  runHeldoutIsolationPreflight,
  type HeldoutConfigurationLoad,
  type HeldoutRuntimePreflight,
  type HeldoutRuntimeResolution,
  type HeldoutSeedAssignment,
} from './heldout-runtime-guard.ts';

export type HeldoutSlice = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

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
    | 'unresolved_module_edge'
    | 'loader_reference_escaped'
    | 'runtime_protocol_resolution'
    | 'configuration_load_failed';
  readonly detail: string;
}

export interface HeldoutLeakReport {
  readonly protocol: 'heldout-ordinary-v1';
  readonly slice: HeldoutSlice;
  readonly reserveDigests: readonly string[];
  readonly resultPaths: readonly string[];
  readonly checkedFiles: number;
  /** Files which completed the full TypeScript AST and symbol inspection pass. */
  readonly astInspectedFiles: number;
  readonly runtimeCompleted?: boolean;
  readonly preflight?: HeldoutRuntimePreflight;
  readonly configurationLoad?: readonly HeldoutConfigurationLoad[];
  readonly resolution?: readonly HeldoutRuntimeResolution[];
  readonly seedAssignments?: readonly HeldoutSeedAssignment[];
  readonly loadedConfigurationFiles?: readonly string[];
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
  'tools/heldout-runtime-guard.ts',
  'tools/heldout-runtime-guard-worker.mjs',
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
  if (/\.d\.(?:ts|mts|cts)$/u.test(path)) return false;
  return ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
    .some((extension) => path.endsWith(extension));
}

interface PreparedModuleAnalysis {
  readonly sourceFile: ts.SourceFile;
  readonly checker: ts.TypeChecker;
}

function prepareModuleAnalyses(
  sources: ReadonlyMap<string, string>,
): ReadonlyMap<string, PreparedModuleAnalysis> {
  const sourceFiles = new Map([...sources].map(([path, source]) => [
    path,
    ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path)),
  ]));
  const compilerOptions: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
    noLib: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    target: ts.ScriptTarget.Latest,
  };
  const compilerHost: ts.CompilerHost = {
    fileExists: (fileName) => sourceFiles.has(fileName),
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => '',
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (fileName) => sourceFiles.get(fileName),
    readFile: (fileName) => sources.get(fileName),
    resolveModuleNames: (moduleNames, containingFile) => moduleNames.map((moduleName) => {
      if (!moduleName.startsWith('.')) return undefined;
      const base = posix.normalize(posix.join(posix.dirname(containingFile), moduleName));
      const candidates = [
        base,
        ...['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'].map((suffix) =>
          `${base}${suffix}`),
        ...['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'].map((suffix) =>
          `${base}/index${suffix}`),
      ];
      const resolvedFileName = candidates.find((candidate) => sourceFiles.has(candidate));
      if (resolvedFileName === undefined) return undefined;
      const extension = resolvedFileName.endsWith('.tsx')
        ? ts.Extension.Tsx
        : resolvedFileName.endsWith('.mts')
          ? ts.Extension.Mts
          : resolvedFileName.endsWith('.cts')
            ? ts.Extension.Cts
            : resolvedFileName.endsWith('.js') || resolvedFileName.endsWith('.jsx')
              ? ts.Extension.Js
              : resolvedFileName.endsWith('.mjs')
                ? ts.Extension.Mjs
                : resolvedFileName.endsWith('.cjs')
                  ? ts.Extension.Cjs
                  : ts.Extension.Ts;
      return { resolvedFileName, extension, isExternalLibraryImport: false };
    }),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => undefined,
  };
  const checker = ts.createProgram([...sources.keys()], compilerOptions, compilerHost).getTypeChecker();
  return new Map([...sourceFiles].map(([path, sourceFile]) => [path, { sourceFile, checker }]));
}

type ModuleEdgeSyntax =
  | 'static_import'
  | 're_export'
  | 'import_equals'
  | 'import_type'
  | 'dynamic_import'
  | 'require'
  | 'require_resolve'
  | 'import_meta_resolve'
  | 'import_meta_glob'
  | 'worker'
  | 'shared_worker'
  | 'import_scripts'
  | 'jsdoc_import'
  | 'loader_reference';

interface ModuleEdge {
  readonly kind: 'import' | 'resolution' | 'unresolved';
  readonly syntax: ModuleEdgeSyntax;
  readonly specifier: string | null;
}

/** Executable source strings are not syntax-level module edges and are intentionally outside this wall. */
export const HELDOUT_LEAK_AST_OUT_OF_SCOPE = [
  'eval executable strings',
  'new Function executable strings',
  'custom loader implementations',
  'runtime-generated code',
] as const;

/** Rule N audit; executable configuration references are delegated to the isolated runtime guard. */
export const HELDOUT_LEAK_FLOW_AUDIT = [
  { position: 'declaration initializer', loaderValues: 'Rule N1 permits only a plain const namespace alias; Rule N2 permits inert browser-global transfer' },
  { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use' },
  { position: 'assignment', loaderValues: 'Rule N1 failed_closed; Rule N2 browser globals remain inert until loader-member use' },
  { position: 'destructuring declaration', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for every loader key extracted from an unknown source' },
  { position: 'destructuring assignment', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for every loader key extracted from an unknown source' },
  { position: 'parameter default', loaderValues: 'Rule N1 failed_closed; Rule N2 permits browser-global transfer but not loader use through the parameter' },
  { position: 'return', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'yield', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'throw', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'await or promise resolution', loaderValues: 'Rule N1 permits only await import of a constant built-in namespace and otherwise failed_closed; Rule N2 validates loader use' },
  { position: 'template substitution', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'spread', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'property value', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage' },
  { position: 'array element', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage' },
  { position: 'call argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'constructor argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'call receiver', loaderValues: 'Rule N1 permits only direct namespace member derivation; Rule N2 validates loader members by symbol' },
  { position: 'conditional, logical, or comma expression', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
  { position: 'class field or heritage', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage' },
  { position: 'export', loaderValues: 'Rule N1 failed_closed except its exact alias initializer; Rule N2 permits inert global transfer' },
  { position: 'for-of head', loaderValues: 'Rule N1 failed_closed; Rule N2 validates later loader use' },
  { position: 'for-in head', loaderValues: 'Rule N1 failed_closed; Rule N2 validates later loader use' },
  { position: 'tagged template', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer' },
] as const;

export const HELDOUT_MODULE_SPECIFIER_POLICY = {
  normalized: [
    'query and fragment suffixes are removed for module identity and retained for finding detail',
    'repeated and trailing slashes are collapsed',
    'dot and parent path segments are resolved lexically',
    'a trailing index, index.js, or index.ts resolves to its containing module path',
    'a trailing .js or .ts extension resolves to the extensionless module identity',
    'file URLs use fileURLToPath semantics, including percent-decoding, before identity comparison',
    'package #imports and Vite glob matching are delegated to the installed runtime resolver and transform',
  ],
  meaningChangingQueries: [
    'raw', 'url', 'inline', 'worker', 'sharedworker', 'init', 'import', 'no-inline',
  ],
  findings: [
    'a normalized held-out import is a protocol_import',
    'a normalized held-out resolver call is a protocol_resolution',
    'a recognized non-constant module edge is an unresolved_module_edge',
    'an undecodable or unknown-scheme direct edge fails closed',
    'a known loader reference escaping recognized call syntax is loader_reference_escaped',
  ],
  interpreted: [
    'loader-valued expressions are require, module.require, importScripts, Worker or SharedWorker (bare or global-qualified), require.resolve, import.meta.resolve, import.meta.glob, createRequire from module built-ins and its result, worker_threads.Worker, and exact aliases',
    'Rule N1 permits import.meta and module/worker namespaces only as direct member receivers or exact plain-const aliases',
    'Rule N2 permits browser globals to transfer inertly and validates Worker, SharedWorker, and importScripts members at use by symbol-proven global provenance',
    'a loader-valued expression is allowed only as a direct callee with a constant specifier, a receiver leading to a recognized member call, or the whole initializer of a non-exported plain-identifier const alias',
    'runtime Vite serve and Vitest root/project resolver and transform evidence governs configuration semantics, aliases, plugin hooks, projects, and extends',
    'runtime graph traversal follows value edges; erased type-only edges remain static findings',
    'every eligible candidate file receives the full AST and symbol inspection pass without a textual pre-gate',
  ],
  failsClosed: [
    'every other position of a loader-valued expression is loader_reference_escaped from one generic check',
    'every disallowed Rule N1 namespace position and every non-symbol-proven Rule N2 loader-member use is loader_reference_escaped from the same generic check',
    'runtime configuration load, resolver, transform, project, or ordinary-edge failures are findings in the isolated runtime guard',
    'unresolved direct targets, URL schemes, and data modules are static findings',
  ],
  outOfScope: HELDOUT_LEAK_AST_OUT_OF_SCOPE,
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

type ResolutionSyntax = Extract<
  ModuleEdgeSyntax,
  'require_resolve' | 'import_meta_resolve'
>;

function isImportMeta(expression: ts.Expression): boolean {
  const unwrapped = unwrapTransparentExpression(expression);
  return ts.isMetaProperty(unwrapped) &&
    unwrapped.keywordToken === ts.SyntaxKind.ImportKeyword && unwrapped.name.text === 'meta';
}

function propertyKey(expression: ts.Expression): string | null {
  const unwrapped = unwrapTransparentExpression(expression);
  if (ts.isPropertyAccessExpression(unwrapped)) return unwrapped.name.text;
  if (ts.isElementAccessExpression(unwrapped)) {
    const argument = unwrapTransparentExpression(unwrapped.argumentExpression);
    return ts.isNumericLiteral(argument) ? argument.text : constantString(argument);
  }
  return null;
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return ts.isComputedPropertyName(name) ? constantString(name.expression) : null;
}

function propertyReceiver(expression: ts.Expression): ts.Expression | null {
  const unwrapped = unwrapTransparentExpression(expression);
  if (ts.isPropertyAccessExpression(unwrapped) || ts.isElementAccessExpression(unwrapped)) {
    return unwrapped.expression;
  }
  return null;
}

function importMetaProperty(expression: ts.Expression, name: string): boolean {
  const receiver = propertyReceiver(expression);
  return receiver !== null && isImportMeta(receiver) && propertyKey(expression) === name;
}

function globPatternExpression(expression: ts.Expression | undefined): readonly string[] | null {
  if (expression === undefined) return null;
  const unwrapped = unwrapTransparentExpression(expression);
  if (ts.isArrayLiteralExpression(unwrapped)) {
    const patterns = unwrapped.elements.map((element) =>
      ts.isSpreadElement(element) ? null : constantString(element));
    return patterns.some((pattern) => pattern === null)
      ? null
      : patterns.filter((pattern): pattern is string => pattern !== null);
  }
  const pattern = constantString(unwrapped);
  return pattern === null ? null : [pattern];
}

function isLiteralGlobOption(expression: ts.Expression): boolean {
  const unwrapped = unwrapTransparentExpression(expression);
  if (constantString(unwrapped) !== null || ts.isNumericLiteral(unwrapped) ||
    unwrapped.kind === ts.SyntaxKind.TrueKeyword || unwrapped.kind === ts.SyntaxKind.FalseKeyword ||
    unwrapped.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isArrayLiteralExpression(unwrapped)) {
    return unwrapped.elements.every((element) =>
      !ts.isSpreadElement(element) && isLiteralGlobOption(element));
  }
  if (!ts.isObjectLiteralExpression(unwrapped)) return false;
  return unwrapped.properties.every((property) => {
    if (ts.isSpreadAssignment(property)) {
      return ts.isObjectLiteralExpression(unwrapTransparentExpression(property.expression)) &&
        isLiteralGlobOption(property.expression);
    }
    return ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name) &&
      propertyNameText(property.name) !== null && isLiteralGlobOption(property.initializer);
  });
}

function hasLiteralLoaderOptions(expression: ts.Expression | undefined): boolean {
  return expression === undefined ||
    (ts.isObjectLiteralExpression(unwrapTransparentExpression(expression)) && isLiteralGlobOption(expression));
}

/**
 * Enumerates statically named module edges from TypeScript syntax. Comments and
 * whitespace are trivia, so they cannot split a token sequence past this wall.
 */
function discoverModuleEdges(
  path: string,
  source: string,
  dataDepth = 0,
  prepared?: PreparedModuleAnalysis,
): readonly ModuleEdge[] {
  const analysis = prepared ?? prepareModuleAnalyses(new Map([[path, source]])).get(path);
  if (analysis === undefined) throw new TypeError(`Held-out leak inspection lost ${path}.`);
  const { sourceFile, checker } = analysis;
  const parseDiagnostics = (sourceFile as ts.SourceFile & {
    readonly parseDiagnostics?: readonly ts.Diagnostic[];
  }).parseDiagnostics ?? [];
  const parseErrors = parseDiagnostics.filter((diagnostic) =>
    diagnostic.category === ts.DiagnosticCategory.Error);
  if (parseErrors.length > 0) {
    const detail = parseErrors.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')).join('; ');
    throw new TypeError(`Held-out leak inspection could not parse ${path}: ${detail}`);
  }
  const result: ModuleEdge[] = [];

  type TrackedLoaderKind =
    | 'loader'
    | 'resolver'
    | 'glob'
    | 'factory'
    | 'module_namespace'
    | 'worker_namespace'
    | 'worker'
    | 'shared_worker'
    | 'script_loader';
  const trackedSymbols = new Map<ts.Symbol, Set<TrackedLoaderKind>>();
  const trackedNames = new Set<string>();
  const importMetaSymbols = new Set<ts.Symbol>();
  const globalNamespaceSymbols = new Set<ts.Symbol>();
  const browserGlobalTypedSymbols = new Set<ts.Symbol>();
  const symbolAt = (identifier: ts.Identifier): ts.Symbol | undefined => {
    if (ts.isExportSpecifier(identifier.parent)) {
      return checker.getExportSpecifierLocalTargetSymbol(identifier.parent) ??
        checker.getSymbolAtLocation(identifier);
    }
    if (ts.isShorthandPropertyAssignment(identifier.parent)) {
      return checker.getShorthandAssignmentValueSymbol(identifier.parent) ??
        checker.getSymbolAtLocation(identifier);
    }
    return checker.getSymbolAtLocation(identifier);
  };
  const identifierText = (identifier: ts.Identifier): string => String(identifier.escapedText);
  const addTrackedSymbol = (
    identifier: ts.Identifier,
    kinds: ReadonlySet<TrackedLoaderKind>,
  ): boolean => {
    const symbol = symbolAt(identifier);
    if (symbol === undefined) return false;
    const existing = trackedSymbols.get(symbol) ?? new Set<TrackedLoaderKind>();
    const before = existing.size;
    for (const kind of kinds) existing.add(kind);
    trackedSymbols.set(symbol, existing);
    trackedNames.add(identifierText(identifier));
    return existing.size !== before;
  };
  const singletonKind = (kind: TrackedLoaderKind): ReadonlySet<TrackedLoaderKind> => new Set([kind]);
  const ambientIdentifierKind = (identifier: ts.Identifier): TrackedLoaderKind | null => {
    const name = identifierText(identifier);
    if (name === 'require') return 'loader';
    if (name === 'module') return 'module_namespace';
    if (name === 'Worker') return 'worker';
    if (name === 'SharedWorker') return 'shared_worker';
    if (name === 'importScripts') return 'script_loader';
    return null;
  };
  const isAmbientDeclaration = (declaration: ts.Declaration): boolean => {
    let current: ts.Node = declaration;
    while (!ts.isSourceFile(current)) {
      if (ts.canHaveModifiers(current) && ts.getModifiers(current)?.some((modifier) =>
        modifier.kind === ts.SyntaxKind.DeclareKeyword) === true) return true;
      current = current.parent;
    }
    return false;
  };
  const hasRuntimeDeclarationInSource = (symbol: ts.Symbol): boolean =>
    symbol.declarations?.some((declaration) =>
      declaration.getSourceFile() === sourceFile && !isAmbientDeclaration(declaration)) === true;
  const isUnshadowedAmbientIdentifier = (
    expression: ts.Expression,
    names: readonly string[],
  ): boolean => {
    const unwrapped = unwrapTransparentExpression(expression);
    if (!ts.isIdentifier(unwrapped) || !names.includes(identifierText(unwrapped))) return false;
    const symbol = symbolAt(unwrapped);
    return symbol === undefined || !hasRuntimeDeclarationInSource(symbol);
  };
  const isImportMetaNamespace = (expression: ts.Expression): boolean => {
    const unwrapped = unwrapTransparentExpression(expression);
    if (isImportMeta(unwrapped)) return true;
    if (!ts.isIdentifier(unwrapped)) return false;
    const symbol = symbolAt(unwrapped);
    return symbol !== undefined && importMetaSymbols.has(symbol);
  };
  const isGlobalNamespace = (expression: ts.Expression): boolean => {
    const unwrapped = unwrapTransparentExpression(expression);
    if (isUnshadowedAmbientIdentifier(unwrapped, ['self', 'globalThis', 'window'])) return true;
    if (!ts.isIdentifier(unwrapped)) return false;
    const symbol = symbolAt(unwrapped);
    return symbol !== undefined && globalNamespaceSymbols.has(symbol);
  };
  const parameterHasBrowserGlobalType = (parameter: ts.ParameterDeclaration): boolean => {
    const type = parameter.type;
    if (type === undefined) return false;
    if (ts.isTypeQueryNode(type) && ts.isIdentifier(type.exprName)) {
      return isUnshadowedAmbientIdentifier(type.exprName, ['window', 'self', 'globalThis']);
    }
    if (!ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName) ||
      type.typeName.text !== 'Window') return false;
    const symbol = checker.getSymbolAtLocation(type.typeName);
    const declarations = symbol?.declarations ?? [];
    return symbol === undefined || declarations.length === 0 || declarations.every((declaration) =>
      declaration.getSourceFile() !== sourceFile || isAmbientDeclaration(declaration));
  };
  const isBrowserGlobalSource = (expression: ts.Expression): boolean => {
    if (isGlobalNamespace(expression)) return true;
    const unwrapped = unwrapTransparentExpression(expression);
    if (!ts.isIdentifier(unwrapped)) return false;
    const symbol = symbolAt(unwrapped);
    return symbol !== undefined && browserGlobalTypedSymbols.has(symbol);
  };
  const identifierKinds = (identifier: ts.Identifier): ReadonlySet<TrackedLoaderKind> => {
    const ambient = ambientIdentifierKind(identifier);
    if (ambient === null && !trackedNames.has(identifierText(identifier))) return new Set();
    const symbol = symbolAt(identifier);
    if (symbol !== undefined) {
      const tracked = trackedSymbols.get(symbol);
      if (tracked !== undefined) return tracked;
      if (hasRuntimeDeclarationInSource(symbol)) {
        return new Set();
      }
    }
    return ambient === null ? new Set() : singletonKind(ambient);
  };
  const moduleNamespaceKind = (specifier: string | null): TrackedLoaderKind | null => {
    if (specifier === 'node:module' || specifier === 'module') return 'module_namespace';
    if (specifier === 'node:worker_threads' || specifier === 'worker_threads') {
      return 'worker_namespace';
    }
    return null;
  };
  const builtinExportKind = (
    namespace: TrackedLoaderKind,
    exportedName: string,
  ): TrackedLoaderKind | null => {
    if (namespace === 'module_namespace') {
      if (exportedName === '*' || exportedName === 'default' || exportedName === 'Module') {
        return 'module_namespace';
      }
      if (exportedName === 'createRequire') return 'factory';
      if (exportedName === 'require') return 'loader';
    }
    if (namespace === 'worker_namespace') {
      if (exportedName === '*' || exportedName === 'default') return 'worker_namespace';
      if (exportedName === 'Worker') return 'worker';
    }
    return null;
  };
  const declarationModuleExport = (
    declaration: ts.Declaration,
  ): { readonly specifier: string; readonly exportedName: string } | null => {
    let exportedName: string | null = null;
    if (ts.isNamespaceImport(declaration) || ts.isNamespaceExport(declaration)) exportedName = '*';
    else if (ts.isImportClause(declaration)) exportedName = 'default';
    else if (ts.isImportSpecifier(declaration) || ts.isExportSpecifier(declaration)) {
      exportedName = (declaration.propertyName ?? declaration.name).text;
    }
    if (exportedName === null) return null;
    let current: ts.Node = declaration;
    while (!ts.isSourceFile(current)) {
      if ((ts.isImportDeclaration(current) || ts.isExportDeclaration(current)) &&
        current.moduleSpecifier !== undefined) {
        const specifier = constantString(current.moduleSpecifier);
        return specifier === null ? null : { specifier, exportedName };
      }
      current = current.parent;
    }
    return null;
  };
  const importedOriginKind = (identifier: ts.Identifier): TrackedLoaderKind | null => {
    const originKind = (
      candidate: ts.Symbol,
      seen: Set<ts.Symbol>,
    ): TrackedLoaderKind | null => {
      if (seen.has(candidate)) return null;
      seen.add(candidate);
      for (const declaration of candidate.declarations ?? []) {
        const origin = declarationModuleExport(declaration);
        if (origin === null) continue;
        const namespace = moduleNamespaceKind(origin.specifier);
        if (namespace !== null) {
          const kind = builtinExportKind(namespace, origin.exportedName);
          if (kind !== null) return kind;
          continue;
        }
        if (!origin.specifier.startsWith('.')) continue;
        let importOrExport: ts.Node = declaration;
        while (!ts.isSourceFile(importOrExport) &&
          !ts.isImportDeclaration(importOrExport) &&
          !ts.isExportDeclaration(importOrExport)) importOrExport = importOrExport.parent;
        if (ts.isSourceFile(importOrExport) || importOrExport.moduleSpecifier === undefined) continue;
        const moduleSymbol = checker.getSymbolAtLocation(importOrExport.moduleSpecifier);
        const exported = moduleSymbol === undefined
          ? undefined
          : checker.getExportsOfModule(moduleSymbol).find((entry) => entry.name === origin.exportedName);
        if (exported !== undefined) {
          const kind = originKind(exported, seen);
          if (kind !== null) return kind;
        }
      }
      if ((candidate.flags & ts.SymbolFlags.Alias) !== 0) {
        const target = checker.getAliasedSymbol(candidate);
        if (target !== candidate) return originKind(target, seen);
      }
      return null;
    };
    const symbol = symbolAt(identifier);
    if (symbol === undefined) return null;
    const seen = new Set<ts.Symbol>();
    return originKind(symbol, seen);
  };
  const expressionKinds = (expression: ts.Expression): ReadonlySet<TrackedLoaderKind> => {
    const unwrapped = unwrapTransparentExpression(expression);
    if (ts.isAwaitExpression(unwrapped)) {
      const awaited = unwrapTransparentExpression(unwrapped.expression);
      return ts.isCallExpression(awaited) && awaited.expression.kind === ts.SyntaxKind.ImportKeyword
        ? expressionKinds(awaited)
        : new Set();
    }
    if (ts.isIdentifier(unwrapped)) return identifierKinds(unwrapped);
    if (ts.isPropertyAccessExpression(unwrapped) || ts.isElementAccessExpression(unwrapped)) {
      const receiverKinds = expressionKinds(unwrapped.expression);
      const key = propertyKey(unwrapped);
      if (key === null) return new Set();
      if (receiverKinds.has('loader') && key === 'resolve') return singletonKind('resolver');
      if (receiverKinds.has('module_namespace') && key === 'createRequire') {
        return singletonKind('factory');
      }
      if (receiverKinds.has('module_namespace') && key === 'require') return singletonKind('loader');
      if (receiverKinds.has('module_namespace') && (key === 'default' || key === 'Module')) {
        return singletonKind('module_namespace');
      }
      if (isImportMetaNamespace(unwrapped.expression) && key === 'resolve') {
        return singletonKind('resolver');
      }
      if (isImportMetaNamespace(unwrapped.expression) && key === 'glob') return singletonKind('glob');
      if ((receiverKinds.has('worker_namespace') || isBrowserGlobalSource(unwrapped.expression)) &&
        key === 'Worker') return singletonKind('worker');
      if (receiverKinds.has('worker_namespace') && key === 'default') {
        return singletonKind('worker_namespace');
      }
      if (isBrowserGlobalSource(unwrapped.expression) && key === 'SharedWorker') {
        return singletonKind('shared_worker');
      }
      if (isBrowserGlobalSource(unwrapped.expression) && key === 'importScripts') {
        return singletonKind('script_loader');
      }
      return new Set();
    }
    if (ts.isCallExpression(unwrapped)) {
      if (unwrapped.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const namespace = moduleNamespaceKind(constantString(unwrapped.arguments[0]));
        return namespace === null ? new Set() : singletonKind(namespace);
      }
      const calleeKinds = expressionKinds(unwrapped.expression);
      if (calleeKinds.has('factory')) return singletonKind('loader');
      if (calleeKinds.has('loader')) {
        const namespace = moduleNamespaceKind(constantString(unwrapped.arguments[0]));
        return namespace === null ? new Set() : singletonKind(namespace);
      }
    }
    return new Set();
  };
  const bindingDeclarations: Array<ts.VariableDeclaration | ts.ParameterDeclaration> = [];
  const assignmentBindings: Array<{
    readonly target: ts.BindingName | ts.Expression;
    readonly source: ts.Expression;
    readonly node: ts.Node;
  }> = [];
  const forOfBindingSource = (expression: ts.Expression): ts.Expression | null => {
    const unwrapped = unwrapTransparentExpression(expression);
    if (!ts.isArrayLiteralExpression(unwrapped)) return unwrapped;
    const elements = unwrapped.elements.filter((element) => !ts.isOmittedExpression(element));
    const first = elements[0];
    if (elements.length !== 1 || first === undefined || ts.isSpreadElement(first)) return null;
    return first;
  };
  const seedImports = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const namespace = moduleNamespaceKind(constantString(node.moduleSpecifier));
      const clause = node.importClause;
      if (namespace !== null && clause !== undefined) {
        if (clause.name !== undefined) addTrackedSymbol(clause.name, singletonKind(namespace));
        const bindings = clause.namedBindings;
        if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
          addTrackedSymbol(bindings.name, singletonKind(namespace));
        } else if (bindings !== undefined) {
          for (const element of bindings.elements) {
            const imported = element.propertyName?.text ?? element.name.text;
            if (namespace === 'module_namespace' && imported === 'createRequire') {
              addTrackedSymbol(element.name, singletonKind('factory'));
            }
            if (namespace === 'module_namespace' && ['default', 'Module'].includes(imported)) {
              addTrackedSymbol(element.name, singletonKind('module_namespace'));
            }
            if (namespace === 'worker_namespace' && imported === 'Worker') {
              addTrackedSymbol(element.name, singletonKind('worker'));
            }
            if (namespace === 'worker_namespace' && imported === 'default') {
              addTrackedSymbol(element.name, singletonKind('worker_namespace'));
            }
          }
        }
      }
      if (clause?.name !== undefined) {
        const kind = importedOriginKind(clause.name);
        if (kind !== null) addTrackedSymbol(clause.name, singletonKind(kind));
      }
      const importedBindings = clause?.namedBindings;
      if (importedBindings !== undefined && ts.isNamespaceImport(importedBindings)) {
        const kind = importedOriginKind(importedBindings.name);
        if (kind !== null) addTrackedSymbol(importedBindings.name, singletonKind(kind));
      } else if (importedBindings !== undefined) {
        for (const element of importedBindings.elements) {
          const kind = importedOriginKind(element.name);
          if (kind !== null) addTrackedSymbol(element.name, singletonKind(kind));
        }
      }
    } else if (ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)) {
      const namespace = moduleNamespaceKind(constantString(node.moduleReference.expression));
      if (namespace !== null) addTrackedSymbol(node.name, singletonKind(namespace));
    }
    if ((ts.isVariableDeclaration(node) && node.initializer !== undefined) ||
      (ts.isParameter(node) && (node.initializer !== undefined || parameterHasBrowserGlobalType(node) ||
        !ts.isIdentifier(node.name)))) {
      bindingDeclarations.push(node);
    }
    if (ts.isParameter(node) && ts.isIdentifier(node.name) && parameterHasBrowserGlobalType(node)) {
      const symbol = symbolAt(node.name);
      if (symbol !== undefined) browserGlobalTypedSymbols.add(symbol);
    }
    if (ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      assignmentBindings.push({ target: node.left, source: node.right, node });
    }
    if (ts.isForOfStatement(node)) {
      const source = forOfBindingSource(node.expression) ?? node.expression;
      if (ts.isVariableDeclarationList(node.initializer)) {
        for (const declaration of node.initializer.declarations) {
          assignmentBindings.push({ target: declaration.name, source, node: declaration });
        }
      } else {
        assignmentBindings.push({ target: node.initializer, source, node });
      }
    }
    ts.forEachChild(node, seedImports);
  };
  seedImports(sourceFile);
  interface BindingSource {
    readonly kinds: ReadonlySet<TrackedLoaderKind>;
    readonly importMeta: boolean;
    readonly globalNamespace: boolean;
    readonly browserGlobalSource: boolean;
  }
  const bindingSourceFor = (expression: ts.Expression): BindingSource => ({
    kinds: expressionKinds(expression),
    importMeta: isImportMetaNamespace(expression),
    globalNamespace: isGlobalNamespace(expression),
    browserGlobalSource: isBrowserGlobalSource(expression),
  });
  const bindingSourceIsRecognized = (sourceBinding: BindingSource): boolean =>
    sourceBinding.kinds.size > 0 || sourceBinding.importMeta || sourceBinding.browserGlobalSource;
  const permitsNamespaceAlias = (
    declaration: ts.VariableDeclaration | ts.ParameterDeclaration,
  ): declaration is ts.VariableDeclaration => {
    if (!ts.isVariableDeclaration(declaration) || !ts.isIdentifier(declaration.name) ||
      !ts.isVariableDeclarationList(declaration.parent) ||
      (declaration.parent.flags & ts.NodeFlags.Const) === 0) return false;
    const statement = declaration.parent.parent;
    return !ts.isVariableStatement(statement) || ts.getModifiers(statement)?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.ExportKeyword) !== true;
  };
  const bindingMemberKind = (
    sourceBinding: BindingSource,
    key: string,
  ): TrackedLoaderKind | null => {
    if (sourceBinding.kinds.has('loader') && key === 'resolve') return 'resolver';
    if (sourceBinding.kinds.has('module_namespace') && key === 'createRequire') return 'factory';
    if (sourceBinding.kinds.has('module_namespace') && key === 'require') return 'loader';
    if (sourceBinding.kinds.has('module_namespace') && (key === 'default' || key === 'Module')) {
      return 'module_namespace';
    }
    if (sourceBinding.importMeta && key === 'resolve') return 'resolver';
    if (sourceBinding.importMeta && key === 'glob') return 'glob';
    if ((sourceBinding.kinds.has('worker_namespace') || sourceBinding.browserGlobalSource) &&
      key === 'Worker') return 'worker';
    if (sourceBinding.kinds.has('worker_namespace') && key === 'default') {
      return 'worker_namespace';
    }
    if (sourceBinding.browserGlobalSource && key === 'SharedWorker') return 'shared_worker';
    if (sourceBinding.browserGlobalSource && key === 'importScripts') return 'script_loader';
    return null;
  };
  type BrowserLoaderExtraction = 'loader' | 'unknown' | 'none';
  const combineBrowserExtractions = (
    values: readonly BrowserLoaderExtraction[],
  ): BrowserLoaderExtraction => values.includes('loader')
    ? 'loader'
    : values.includes('unknown') ? 'unknown' : 'none';
  const browserLoaderExtraction = (
    target: ts.BindingName | ts.Expression,
  ): BrowserLoaderExtraction => {
    if (ts.isArrayBindingPattern(target) || (ts.isExpression(target) &&
      ts.isArrayLiteralExpression(unwrapTransparentExpression(target)))) return 'unknown';
    if (ts.isObjectBindingPattern(target)) {
      return combineBrowserExtractions(target.elements.map((element) => {
        if (element.dotDotDotToken !== undefined) return 'unknown';
        const key = element.propertyName === undefined && ts.isIdentifier(element.name)
          ? identifierText(element.name)
          : element.propertyName === undefined
            ? null
            : propertyNameText(element.propertyName);
        if (key === null) return 'unknown';
        if (['Worker', 'SharedWorker', 'importScripts'].includes(key)) return 'loader';
        return ts.isIdentifier(element.name) ? 'none' : browserLoaderExtraction(element.name);
      }));
    }
    const unwrapped = ts.isExpression(target) ? unwrapTransparentExpression(target) : target;
    if (!ts.isObjectLiteralExpression(unwrapped)) return 'none';
    return combineBrowserExtractions(unwrapped.properties.map((property) => {
      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
        return 'unknown';
      }
      const key = propertyNameText(property.name);
      if (key === null) return 'unknown';
      if (['Worker', 'SharedWorker', 'importScripts'].includes(key)) return 'loader';
      return ts.isPropertyAssignment(property)
        ? browserLoaderExtraction(property.initializer)
        : 'none';
    }));
  };
  const propagateIdentifier = (
    identifier: ts.Identifier,
    sourceBinding: BindingSource,
  ): boolean => {
      let changed = sourceBinding.kinds.size > 0 &&
        addTrackedSymbol(identifier, sourceBinding.kinds);
      const symbol = symbolAt(identifier);
      if (symbol !== undefined && sourceBinding.importMeta && !importMetaSymbols.has(symbol)) {
        importMetaSymbols.add(symbol);
        changed = true;
      }
      if (symbol !== undefined && sourceBinding.globalNamespace &&
        !globalNamespaceSymbols.has(symbol)) {
        globalNamespaceSymbols.add(symbol);
        changed = true;
      }
      return changed;
  };
  const propagateBinding = (
    name: ts.BindingName,
    sourceBinding: BindingSource,
  ): { readonly changed: boolean; readonly complete: boolean } => {
    if (ts.isIdentifier(name)) {
      return {
        changed: propagateIdentifier(name, sourceBinding),
        complete: true,
      };
    }
    if (ts.isArrayBindingPattern(name)) return { changed: false, complete: false };
    let changed = false;
    let complete = true;
    for (const element of name.elements) {
      const key = element.propertyName === undefined && ts.isIdentifier(element.name)
        ? identifierText(element.name)
        : element.propertyName === undefined
          ? null
          : propertyNameText(element.propertyName);
      if (element.dotDotDotToken !== undefined || key === null) {
        complete = false;
        continue;
      }
      const kind = bindingMemberKind(sourceBinding, key);
      if (kind === null) {
        if (!ts.isIdentifier(element.name)) complete = false;
        continue;
      }
      if (element.initializer !== undefined) {
        complete = false;
        continue;
      }
      const nested = propagateBinding(element.name, {
        kinds: singletonKind(kind),
        importMeta: false,
        globalNamespace: false,
        browserGlobalSource: false,
      });
      changed = nested.changed || changed;
      complete = nested.complete && complete;
    }
    return { changed, complete };
  };
  const propagateAssignmentBinding = (
    target: ts.BindingName | ts.Expression,
    sourceBinding: BindingSource,
  ): { readonly changed: boolean; readonly complete: boolean } => {
    if (ts.isIdentifier(target)) {
      return { changed: propagateIdentifier(target, sourceBinding), complete: true };
    }
    if (ts.isObjectBindingPattern(target) || ts.isArrayBindingPattern(target)) {
      return propagateBinding(target, sourceBinding);
    }
    const unwrapped = unwrapTransparentExpression(target);
    if (ts.isArrayLiteralExpression(unwrapped)) return { changed: false, complete: false };
    if (!ts.isObjectLiteralExpression(unwrapped)) return { changed: false, complete: false };
    let changed = false;
    let complete = true;
    for (const property of unwrapped.properties) {
      let key: string | null = null;
      let assignmentTarget: ts.Expression | null = null;
      if (ts.isPropertyAssignment(property)) {
        key = propertyNameText(property.name);
        assignmentTarget = property.initializer;
      } else if (ts.isShorthandPropertyAssignment(property) &&
        property.objectAssignmentInitializer === undefined) {
        key = identifierText(property.name);
        assignmentTarget = property.name;
      }
      if (key === null || assignmentTarget === null) {
        complete = false;
        continue;
      }
      const kind = bindingMemberKind(sourceBinding, key);
      if (kind === null) {
        const assignment = unwrapTransparentExpression(assignmentTarget);
        if (!ts.isIdentifier(assignment)) complete = false;
        continue;
      }
      const nested = propagateAssignmentBinding(assignmentTarget, {
        kinds: singletonKind(kind),
        importMeta: false,
        globalNamespace: false,
        browserGlobalSource: false,
      });
      changed = nested.changed || changed;
      complete = nested.complete && complete;
    }
    return { changed, complete };
  };
  const unresolvedNamespaceBindings = new Set<ts.Node>();
  let propagated = true;
  while (propagated) {
    propagated = false;
    for (const node of bindingDeclarations) {
      const initializer = node.initializer;
      const sourceBinding: BindingSource = initializer !== undefined
        ? bindingSourceFor(initializer)
        : {
          kinds: new Set(),
          importMeta: false,
          globalNamespace: false,
          browserGlobalSource: ts.isParameter(node) && parameterHasBrowserGlobalType(node),
        };
      const extraction = browserLoaderExtraction(node.name);
      if (!bindingSourceIsRecognized(sourceBinding)) {
        if (extraction === 'loader') unresolvedNamespaceBindings.add(node);
        continue;
      }
      if (sourceBinding.browserGlobalSource && extraction === 'unknown') {
        unresolvedNamespaceBindings.add(node);
      }
      const propagation = propagateBinding(node.name, {
        ...sourceBinding,
        globalNamespace: sourceBinding.globalNamespace && permitsNamespaceAlias(node),
        browserGlobalSource: sourceBinding.browserGlobalSource,
      });
      propagated = propagation.changed || propagated;
      if (!propagation.complete) unresolvedNamespaceBindings.add(node);
    }
    for (const binding of assignmentBindings) {
      const sourceBinding = bindingSourceFor(binding.source);
      const extraction = browserLoaderExtraction(binding.target);
      if (!bindingSourceIsRecognized(sourceBinding)) {
        if (extraction === 'loader') unresolvedNamespaceBindings.add(binding.node);
        continue;
      }
      if (sourceBinding.browserGlobalSource && extraction === 'unknown') {
        unresolvedNamespaceBindings.add(binding.node);
      }
      const propagation = propagateAssignmentBinding(binding.target, {
        ...sourceBinding,
        globalNamespace: false,
        browserGlobalSource: sourceBinding.browserGlobalSource,
      });
      propagated = propagation.changed || propagated;
      if (!propagation.complete) unresolvedNamespaceBindings.add(binding.node);
    }
  }
  const loaderReference = (expression: ts.Expression): boolean =>
    expressionKinds(expression).has('loader');
  const resolverReference = (expression: ts.Expression): ResolutionSyntax | null =>
    expressionKinds(expression).has('resolver') ? 'require_resolve' : null;
  const workerSyntax = (
    expression: ts.Expression,
  ): Extract<ModuleEdgeSyntax, 'worker' | 'shared_worker'> | null => {
    const trackedKinds = expressionKinds(expression);
    if (trackedKinds.has('worker')) return 'worker';
    if (trackedKinds.has('shared_worker')) return 'shared_worker';
    return null;
  };
  const scriptLoaderReference = (expression: ts.Expression): boolean =>
    expressionKinds(expression).has('script_loader');
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
  const addArgumentArray = (
    syntax: ModuleEdgeSyntax,
    expression: ts.Expression | undefined,
    resolvedKind: 'import' | 'resolution',
  ): void => {
    if (expression === undefined) {
      addUnresolved(syntax);
      return;
    }
    const unwrapped = unwrapTransparentExpression(expression);
    const first = ts.isArrayLiteralExpression(unwrapped) ? unwrapped.elements[0] : undefined;
    if (first === undefined || ts.isSpreadElement(first)) {
      addUnresolved(syntax);
      return;
    }
    add(syntax, first, resolvedKind);
  };
  const isDeclarationIdentifier = (identifier: ts.Identifier): boolean => {
    const parent = identifier.parent;
    return (ts.isVariableDeclaration(parent) && parent.name === identifier) ||
      (ts.isBindingElement(parent) && parent.name === identifier) ||
      (ts.isImportClause(parent) && parent.name === identifier) ||
      (ts.isImportSpecifier(parent)) ||
      (ts.isNamespaceImport(parent) && parent.name === identifier) ||
      (ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
      (ts.isPropertyAssignment(parent) && parent.name === identifier) ||
      (ts.isMethodDeclaration(parent) && parent.name === identifier) ||
      (ts.isParameter(parent) && parent.name === identifier) ||
      (ts.isFunctionDeclaration(parent) && parent.name === identifier) ||
      (ts.isClassDeclaration(parent) && parent.name === identifier);
  };
  const isCallableTrackedKind = (kinds: ReadonlySet<TrackedLoaderKind>): boolean =>
    kinds.has('loader') || kinds.has('resolver') || kinds.has('glob') ||
    kinds.has('factory') || kinds.has('script_loader');
  const isLoaderValued = (kinds: ReadonlySet<TrackedLoaderKind>): boolean =>
    kinds.has('loader') || kinds.has('resolver') || kinds.has('glob') || kinds.has('factory') ||
    kinds.has('worker') || kinds.has('shared_worker') || kinds.has('script_loader');
  const variableDeclarationForBinding = (node: ts.Node): ts.VariableDeclaration | null => {
    let current = node;
    while (ts.isBindingElement(current.parent) || ts.isObjectBindingPattern(current.parent) ||
      ts.isArrayBindingPattern(current.parent)) current = current.parent;
    return ts.isVariableDeclaration(current.parent) ? current.parent : null;
  };
  const isExportedVariable = (declaration: ts.VariableDeclaration): boolean => {
    const declarationList = declaration.parent;
    const statement = ts.isVariableDeclarationList(declarationList) ? declarationList.parent : undefined;
    return statement !== undefined && ts.isVariableStatement(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
  };
  const isExactAliasInitializer = (expression: ts.Expression): boolean => {
    const parent = expression.parent;
    if (!ts.isVariableDeclaration(parent) || parent.initializer !== expression ||
      !ts.isIdentifier(parent.name) || isExportedVariable(parent)) return false;
    return ts.isVariableDeclarationList(parent.parent) &&
      (parent.parent.flags & ts.NodeFlags.Const) !== 0;
  };
  const isAllowedLoaderValue = (reference: ts.Expression): boolean => {
    const initial = unwrapTransparentExpression(reference);
    if (ts.isElementAccessExpression(initial)) {
      const kinds = expressionKinds(initial);
      if (propertyKey(initial) === null || (!kinds.has('worker') &&
        !kinds.has('shared_worker') && !kinds.has('script_loader'))) return false;
    }
    let current = reference;
    while (true) {
      const parent = current.parent;
      if ((ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) ||
        ts.isSatisfiesExpression(parent) || ts.isNonNullExpression(parent) ||
        ts.isTypeAssertionExpression(parent)) &&
        parent.expression === current) {
        current = parent;
        continue;
      }
      if (ts.isPropertyAccessExpression(parent) && parent.expression === current &&
        isLoaderValued(expressionKinds(parent))) {
        current = parent;
        continue;
      }
      if (ts.isElementAccessExpression(parent) && parent.expression === current) return false;
      if (ts.isCallExpression(parent) && parent.expression === current) {
        const kinds = expressionKinds(current);
        if (!isCallableTrackedKind(kinds)) return false;
        if (kinds.has('factory')) return true;
        if (kinds.has('glob')) {
          return globPatternExpression(parent.arguments[0]) !== null &&
            hasLiteralLoaderOptions(parent.arguments[1]);
        }
        if (kinds.has('script_loader')) {
          return parent.arguments.length > 0 &&
            parent.arguments.every((argument) => constantString(argument) !== null);
        }
        return constantString(parent.arguments[0]) !== null;
      }
      if (ts.isNewExpression(parent) && parent.expression === current) {
        const kinds = expressionKinds(current);
        if (!kinds.has('worker') && !kinds.has('shared_worker')) return false;
        const first = parent.arguments?.[0];
        if (first === undefined) return false;
        const target = unwrapTransparentExpression(first);
        return constantString(target) !== null ||
          (ts.isNewExpression(target) && target.arguments?.[0] !== undefined &&
            constantString(target.arguments[0]) !== null && target.arguments[1] !== undefined &&
            importMetaProperty(target.arguments[1], 'url'));
      }
      return isExactAliasInitializer(current);
    }
  };
  let loaderEscapeRecorded = false;
  const recordLoaderEscape = (): void => {
    if (loaderEscapeRecorded) return;
    loaderEscapeRecorded = true;
    addUnresolved('loader_reference');
  };
  const isTrackedModuleReExport = (node: ts.Node): boolean => {
    if (!ts.isExportDeclaration(node) || node.moduleSpecifier === undefined || node.isTypeOnly) {
      return false;
    }
    const namespace = moduleNamespaceKind(constantString(node.moduleSpecifier));
    if (namespace === null) return false;
    if (node.exportClause === undefined) return true;
    if (ts.isNamespaceExport(node.exportClause)) return true;
    return node.exportClause.elements.some((element) => {
      if (element.isTypeOnly) return false;
      const exportedName = element.propertyName ?? element.name;
      const exportedSourceName = ts.isIdentifier(exportedName)
        ? identifierText(exportedName)
        : exportedName.text;
      return builtinExportKind(namespace, exportedSourceName) !== null;
    });
  };
  const loaderValuedExpression = (node: ts.Node): ts.Expression | null => {
    if (!(ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) || ts.isCallExpression(node))) return null;
    return isLoaderValued(expressionKinds(node)) ? node : null;
  };
  const isUnsupportedNamespaceMemberAccess = (node: ts.Node): boolean => {
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    const receiverKinds = expressionKinds(node.expression);
    const key = propertyKey(node);
    const recognizedReceiver = receiverKinds.has('module_namespace') ||
      receiverKinds.has('worker_namespace') || receiverKinds.has('loader') ||
      isImportMetaNamespace(node.expression) || isBrowserGlobalSource(node.expression);
    if (!recognizedReceiver) return false;
    if (key === null) return true;
    if (!receiverKinds.has('module_namespace') && !receiverKinds.has('worker_namespace')) return false;
    return expressionKinds(node).size === 0;
  };
  const n1NamespaceRoot = (node: ts.Node): ts.Expression | null => {
    if (!ts.isExpression(node)) return null;
    const kinds = expressionKinds(node);
    return isImportMetaNamespace(node) || kinds.has('module_namespace') ||
      kinds.has('worker_namespace') ? node : null;
  };
  const isAllowedN1NamespaceRoot = (reference: ts.Expression): boolean => {
    let current = reference;
    while (true) {
      const parent = current.parent;
      if ((ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) ||
        ts.isSatisfiesExpression(parent) || ts.isNonNullExpression(parent) ||
        ts.isTypeAssertionExpression(parent)) &&
        parent.expression === current) {
        current = parent;
        continue;
      }
      if (ts.isAwaitExpression(parent) && parent.expression === current) {
        const awaited = unwrapTransparentExpression(current);
        if (ts.isCallExpression(awaited) && awaited.expression.kind === ts.SyntaxKind.ImportKeyword &&
          moduleNamespaceKind(constantString(awaited.arguments[0])) !== null) {
          current = parent;
          continue;
        }
      }
      if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
        parent.expression === current) return true;
      return isExactAliasInitializer(current);
    }
  };
  const globalLoaderMember = (node: ts.Node): boolean => {
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    const key = propertyKey(node);
    if (key === null || !['Worker', 'SharedWorker', 'importScripts'].includes(key)) return false;
    const kinds = expressionKinds(node);
    return !kinds.has('worker') && !kinds.has('shared_worker') && !kinds.has('script_loader');
  };
  const unrecognizedBareGlobalLoader = (node: ts.Node): boolean => {
    if (!ts.isIdentifier(node) || isDeclarationIdentifier(node)) return false;
    const name = identifierText(node);
    if (!['Worker', 'SharedWorker', 'importScripts'].includes(name)) return false;
    const kinds = identifierKinds(node);
    return !kinds.has('worker') && !kinds.has('shared_worker') && !kinds.has('script_loader');
  };
  const isWithinTypeNode = (node: ts.Node): boolean => {
    let current = node.parent;
    while (!ts.isSourceFile(current)) {
      if (ts.isExpressionWithTypeArguments(current) && ts.isHeritageClause(current.parent) &&
        current.parent.token === ts.SyntaxKind.ExtendsKeyword &&
        (ts.isClassDeclaration(current.parent.parent) || ts.isClassExpression(current.parent.parent))) {
        return false;
      }
      if (ts.isTypeNode(current)) return true;
      current = current.parent;
    }
    return false;
  };
  const visited = new Set<ts.Node>();
  const visit = (node: ts.Node): void => {
    if (visited.has(node)) return;
    visited.add(node);
    const namespaceRoot = n1NamespaceRoot(node);
    const escapedNamespace = namespaceRoot !== null && !isWithinTypeNode(node) &&
      (!ts.isIdentifier(node) || !isDeclarationIdentifier(node)) &&
      !isAllowedN1NamespaceRoot(namespaceRoot);
    if (isTrackedModuleReExport(node) || isUnsupportedNamespaceMemberAccess(node) ||
      unresolvedNamespaceBindings.has(node) || escapedNamespace || globalLoaderMember(node) ||
      unrecognizedBareGlobalLoader(node)) {
      recordLoaderEscape();
    } else {
      const loaderValue = loaderValuedExpression(node);
      const declaration = ts.isIdentifier(node) ? variableDeclarationForBinding(node) : null;
      const exportedBinding = declaration !== null && isExportedVariable(declaration);
      if (loaderValue !== null && !isWithinTypeNode(node) &&
        (!ts.isIdentifier(node) || !isDeclarationIdentifier(node) || exportedBinding) &&
        !isAllowedLoaderValue(loaderValue)) recordLoaderEscape();
    }
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
    } else if (ts.isJSDocImportTag(node)) {
      add('jsdoc_import', node.moduleSpecifier);
    } else if (ts.isNewExpression(node)) {
      const constructor = unwrapTransparentExpression(node.expression);
      const syntax = workerSyntax(constructor);
      if (syntax !== null) {
        const first = node.arguments?.[0];
        const url = first === undefined ? undefined : unwrapTransparentExpression(first);
        if (url !== undefined && ts.isNewExpression(url) &&
          ts.isIdentifier(unwrapTransparentExpression(url.expression)) &&
          unwrapTransparentExpression(url.expression).getText() === 'URL' &&
          url.arguments?.[1] !== undefined && importMetaProperty(url.arguments[1], 'url')) {
          add(syntax, url.arguments[0]);
        } else if (first !== undefined && constantString(first) !== null) {
          add(syntax, first);
        } else {
          addUnresolved(syntax);
        }
      }
    } else if (ts.isCallExpression(node)) {
      const callee = unwrapTransparentExpression(node.expression);
      const firstArgument = node.arguments[0];
      if (callee.kind === ts.SyntaxKind.ImportKeyword) {
        add('dynamic_import', firstArgument);
      } else if (expressionKinds(callee).has('glob')) {
        const patterns = globPatternExpression(firstArgument);
        if (patterns === null || !hasLiteralLoaderOptions(node.arguments[1])) addUnresolved('import_meta_glob');
      } else if (scriptLoaderReference(callee)) {
        if (node.arguments.length === 0) addUnresolved('import_scripts');
        for (const argument of node.arguments) add('import_scripts', argument);
      } else if (loaderReference(callee)) {
        add('require', firstArgument);
      } else {
        const resolution = resolverReference(callee);
        if (resolution !== null) {
          add(resolution, firstArgument, 'resolution');
        } else {
          const receiver = propertyReceiver(callee);
          const method = propertyKey(callee);
          const receiverResolution = receiver === null ? null : resolverReference(receiver);
          const receiverLoader = receiver !== null && loaderReference(receiver);
          if ((receiverResolution !== null || receiverLoader) && method === 'call') {
            add(receiverResolution ?? 'require', node.arguments[1],
              receiverResolution === null ? 'import' : 'resolution');
          } else if ((receiverResolution !== null || receiverLoader) && method === 'apply') {
            addArgumentArray(receiverResolution ?? 'require', node.arguments[1],
              receiverResolution === null ? 'import' : 'resolution');
          } else if ((receiverResolution !== null || receiverLoader) && method === 'bind') {
            // The generic tracked-reference check rejects bind; no module target is executed here.
          } else if (propertyReceiver(callee) !== null &&
            ts.isIdentifier(unwrapTransparentExpression(propertyReceiver(callee) ?? callee)) &&
            unwrapTransparentExpression(propertyReceiver(callee) ?? callee).getText() === 'Reflect' &&
            propertyKey(callee) === 'apply') {
            const target = node.arguments[0];
            const targetResolution = target === undefined ? null : resolverReference(target);
            const targetLoader = target !== undefined && loaderReference(target);
            if (targetResolution !== null || targetLoader) {
              addArgumentArray(targetResolution ?? 'require', node.arguments[2],
                targetResolution === null ? 'import' : 'resolution');
            }
          } else if (ts.isElementAccessExpression(callee)) {
            const elementReceiver = callee.expression;
            if ((loaderReference(elementReceiver) || isImportMeta(elementReceiver)) &&
              constantString(callee.argumentExpression) === null) {
              addUnresolved(loaderReference(elementReceiver)
                ? 'require_resolve'
                : 'import_meta_resolve');
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
    for (const jsDocNode of ts.getJSDocCommentsAndTags(node)) visit(jsDocNode);
  };
  visit(sourceFile);

  if (dataDepth < 4) {
    const nested: ModuleEdge[] = [];
    for (const edge of result) {
      if (edge.specifier === null || !edge.specifier.trimStart().startsWith('data:')) continue;
      const decoded = decodeDataModule(edge.specifier);
      if (decoded === null) {
        nested.push({ kind: 'unresolved', syntax: edge.syntax, specifier: null });
      } else {
        nested.push(...discoverModuleEdges(`${path}.data-${String(dataDepth)}.ts`, decoded, dataDepth + 1));
      }
    }
    result.push(...nested);
  } else if (result.some((edge) => edge.specifier?.trimStart().startsWith('data:') === true)) {
    addUnresolved('dynamic_import');
  }
  return result;
}

function decodeDataModule(specifier: string): string | null {
  const match = /^data:([^,]*),(.*)$/isu.exec(specifier.trimStart());
  if (match === null) return null;
  const metadata = match[1] ?? '';
  const payload = match[2] ?? '';
  const mediaType = metadata.split(';', 1)[0]?.toLowerCase() ?? '';
  if (!['text/javascript', 'application/javascript'].includes(mediaType)) return null;
  try {
    if (/(?:^|;)base64(?:;|$)/iu.test(metadata)) {
      if (!/^[a-z0-9+/]*={0,2}$/iu.test(payload) || payload.length % 4 !== 0) return null;
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(payload, 'base64'));
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
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

function normalizeModuleSpecifier(
  originalSpecifier: string,
  importer: string,
): NormalizedModuleSpecifier | null {
  const schemeCandidate = originalSpecifier.trimStart();
  let specifier = /^[a-z][a-z0-9+.-]*:/iu.test(schemeCandidate)
    ? schemeCandidate
    : originalSpecifier;
  if (specifier.startsWith('file:')) {
    try {
      const url = new URL(specifier);
      specifier = `${fileURLToPath(url)}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(specifier) &&
    !specifier.startsWith('node:') && !specifier.startsWith('data:')) return null;
  const queryIndex = specifier.indexOf('?');
  const fragmentIndex = specifier.startsWith('#') ? -1 : specifier.indexOf('#');
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

function heldoutProtocolSpecifier(
  specifier: string,
  importer: string,
): NormalizedModuleSpecifier | null {
  const normalized = normalizeModuleSpecifier(specifier, importer);
  if (normalized === null) return null;
  return normalized.path === 'heldout-evaluation' ||
    normalized.path.endsWith('/heldout-evaluation')
    ? normalized
    : null;
}

function firstHeldoutEdge(
  edges: readonly ModuleEdge[],
  kind: Extract<ModuleEdge['kind'], 'import' | 'resolution'>,
  importer: string,
): NormalizedModuleSpecifier | null {
  for (const edge of edges) {
    if (edge.kind !== kind || edge.specifier === null) continue;
    const normalized = heldoutProtocolSpecifier(edge.specifier, importer);
    if (normalized !== null) return normalized;
  }
  return null;
}

function firstInvalidSpecifier(
  edges: readonly ModuleEdge[],
  importer: string,
): ModuleEdge | undefined {
  return edges.find((edge) => edge.specifier !== null &&
    normalizeModuleSpecifier(edge.specifier, importer) === null);
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
  const effectiveChanges = new Map(changes.map((change) => [change.path, change]));
  const astSources = new Map([...effectiveChanges.values()]
    .filter((change) => isTypeScriptOrJavaScript(change.path))
    .map((change) => [change.path, change.sourceText ?? change.addedText]));
  const preparedAnalyses = prepareModuleAnalyses(astSources);
  let astInspectedFiles = 0;
  for (const change of effectiveChanges.values()) {
    const reference = reserveReference(change.addedText, bindings);
    if (reference !== null && (
      semanticInputPath(change.path) ||
      (!EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path))
    )) {
      findings.push({ path: change.path, kind: 'reserve_reference', detail: reference });
    }
    const eligibleForAstInspection = isTypeScriptOrJavaScript(change.path);
    const edges = eligibleForAstInspection
      ? discoverModuleEdges(
        change.path,
        change.sourceText ?? change.addedText,
        0,
        preparedAnalyses.get(change.path),
      )
      : [];
    if (eligibleForAstInspection) astInspectedFiles += 1;
    const restrictedPath = !EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path);
    const heldoutImport = firstHeldoutEdge(edges, 'import', change.path);
    if (restrictedPath && heldoutImport !== null) {
      findings.push({
        path: change.path,
        kind: 'protocol_import',
        detail: `held-out protocol imported outside evaluation tooling${specifierSuffixDetail(heldoutImport)}`,
      });
    }
    const heldoutResolution = firstHeldoutEdge(edges, 'resolution', change.path);
    if (restrictedPath && heldoutResolution !== null) {
      findings.push({
        path: change.path,
        kind: 'protocol_resolution',
        detail: `held-out protocol resolved outside evaluation tooling${specifierSuffixDetail(heldoutResolution)}`,
      });
    }
    const unresolved = edges.find((edge) => edge.kind === 'unresolved') ??
      firstInvalidSpecifier(edges, change.path);
    if (restrictedPath && unresolved !== undefined) {
      findings.push({
        path: change.path,
        kind: unresolved.syntax === 'loader_reference'
          ? 'loader_reference_escaped'
          : 'unresolved_module_edge',
        detail: unresolved.syntax === 'loader_reference'
          ? 'known loader reference escaped recognized syntax outside evaluation tooling'
          : `unresolved ${unresolved.syntax} edge outside evaluation tooling`,
      });
    }
  }
  return {
    protocol: 'heldout-ordinary-v1',
    slice,
    reserveDigests: [...bindings.reserveDigests],
    resultPaths: [...bindings.resultPaths],
    checkedFiles: effectiveChanges.size,
    astInspectedFiles,
    findings,
  };
}

export function inspectHeldoutCandidateTree(
  root: string,
  slice: HeldoutSlice,
  bindings: HeldoutLeakBindings,
  loadedConfigurationFiles: readonly string[] = [],
): HeldoutLeakReport {
  const candidateSources: HeldoutChangedText[] = [];
  const collectedPaths = new Set<string>();
  const collect = (directory: string, prefix = ''): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name))) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
      const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
      const absolute = posix.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (prefix.length > 0 || relative === 'src' || relative === 'tools') collect(absolute, relative);
      } else if (isTypeScriptOrJavaScript(relative) && (
        relative.startsWith('src/') || relative.startsWith('tools/') || isRootViteOrVitestConfig(relative)
      )) {
        const sourceText = readFileSync(absolute, 'utf8');
        candidateSources.push({ path: relative, addedText: sourceText, sourceText });
        collectedPaths.add(relative);
      }
    }
  };
  collect(root);
  for (const relative of [...loadedConfigurationFiles].sort()) {
    if (collectedPaths.has(relative) || relative.startsWith('/') || relative.split('/').includes('..') ||
      !isTypeScriptOrJavaScript(relative)) continue;
    const absolute = posix.join(root, relative);
    const sourceText = readFileSync(absolute, 'utf8');
    candidateSources.push({ path: relative, addedText: sourceText, sourceText });
    collectedPaths.add(relative);
  }
  return inspectHeldoutLeakChanges(candidateSources, slice, bindings);
}

export interface GitCandidatePath {
  readonly status: string;
  readonly path: string;
  readonly previousPath?: string;
}

/** Parses Git's stable NUL protocol; path quoting and embedded newlines are data, not syntax. */
export function parseGitNameStatusZ(output: string): readonly GitCandidatePath[] {
  const fields = output.split('\0');
  if (fields.at(-1) === '') fields.pop();
  const changes: GitCandidatePath[] = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index];
    if (status === undefined || !/^[A-Z][0-9]*$/u.test(status)) {
      throw new TypeError('Malformed NUL-delimited Git name-status output.');
    }
    index += 1;
    if (status.startsWith('R') || status.startsWith('C')) {
      const previousPath = fields[index];
      const path = fields[index + 1];
      if (previousPath === undefined || path === undefined) {
        throw new TypeError('Truncated Git rename/copy record.');
      }
      changes.push({ status, previousPath, path });
      index += 2;
    } else {
      const path = fields[index];
      if (path === undefined) throw new TypeError('Truncated Git name-status record.');
      changes.push({ status, path });
      index += 1;
    }
  }
  return changes;
}

export function changesFromGitNameStatus(
  output: string,
  sourceForPath: (path: string) => string,
  addedTextForPath: (path: string) => string,
): readonly HeldoutChangedText[] {
  return parseGitNameStatusZ(output).filter((change) => change.status !== 'D').map((change) => ({
    path: change.path,
    addedText: addedTextForPath(change.path),
    sourceText: sourceForPath(change.path),
  }));
}

function addedLines(base: string, candidate: string, path: string): string {
  const patch = execFileSync(
    'git',
    ['diff', '--no-ext-diff', '--unified=0', base, candidate, '--', path],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return patch.split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .join('\n');
}

function addedChanges(base: string, candidate: string): readonly HeldoutChangedText[] {
  const nameStatus = execFileSync(
    'git',
    ['diff', '--name-status', '-z', '--diff-filter=ACMRTUXB', base, candidate],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const selected = parseGitNameStatusZ(nameStatus).filter((change) =>
    change.status !== 'D' && (
      change.path.startsWith('src/') || change.path.startsWith('tools/') ||
      change.path.startsWith('tests/') || isResolutionConfigPath(change.path)
    ));
  const selectedStatus = selected.flatMap((change) => change.previousPath === undefined
    ? [change.status, change.path]
    : [change.status, change.previousPath, change.path]).join('\0');
  return changesFromGitNameStatus(
    selectedStatus.length === 0 ? '' : `${selectedStatus}\0`,
    (path) => execFileSync('git', ['show', `${candidate}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
    (path) => addedLines(base, candidate, path),
  );
}

function isResolutionConfigPath(path: string): boolean {
  const basename = posix.basename(path);
  return basename === 'package.json' || /^tsconfig(?:\.[^.]+)?\.json$/u.test(basename) ||
    isRootViteOrVitestConfig(path);
}

function isRootViteOrVitestConfig(path: string): boolean {
  return !path.includes('/') &&
    /^(?:vite|vitest)(?:\.[^.]+)*\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(path);
}

export function parseHeldoutLeakArgs(argv: readonly string[]): {
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

function childExit(child: ReturnType<typeof spawn>): Promise<number | null> {
  return new Promise((resolveExit, rejectExit) => {
    child.once('error', rejectExit);
    child.once('exit', (code) => resolveExit(code));
  });
}

async function extractCandidateArchive(revision: string, destination: string): Promise<void> {
  const archive = spawn('git', ['archive', '--format=tar', revision], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const extraction = spawn('tar', ['-xf', '-', '-C', destination], {
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  if (archive.stdout === null || archive.stderr === null || extraction.stdin === null ||
    extraction.stderr === null) throw new TypeError('Candidate archive pipes were not created.');
  let archiveError = '';
  let extractionError = '';
  archive.stderr.setEncoding('utf8');
  extraction.stderr.setEncoding('utf8');
  archive.stderr.on('data', (chunk: string) => { archiveError += chunk; });
  extraction.stderr.on('data', (chunk: string) => { extractionError += chunk; });
  extraction.stdin.on('error', () => undefined);
  archive.stdout.pipe(extraction.stdin);
  const [archiveCode, extractionCode] = await Promise.all([childExit(archive), childExit(extraction)]);
  if (archiveCode !== 0 || extractionCode !== 0) {
    throw new TypeError(`Candidate archive extraction failed: ${archiveError || extractionError ||
      `git=${String(archiveCode)} tar=${String(extractionCode)}`}`);
  }
}

export async function runHeldoutLeakCli(argv: readonly string[]): Promise<void> {
  const config = parseHeldoutLeakArgs(argv);
  const preflight = runHeldoutIsolationPreflight();
  if (preflight.status === 'isolation_failed') {
    const report: HeldoutLeakReport = {
      protocol: 'heldout-ordinary-v1',
      slice: config.slice,
      reserveDigests: [...config.bindings.reserveDigests],
      resultPaths: [...config.bindings.resultPaths],
      checkedFiles: 0,
      astInspectedFiles: 0,
      runtimeCompleted: false,
      preflight,
      configurationLoad: [{
        file: '<preflight>',
        kind: 'preflight',
        project: null,
        environment: 'isolation',
        status: 'isolation_failed',
        errorClass: 'IsolationError',
        runtimeRoot: preflight.runtimeRoot,
        runtimeVersion: preflight.runtimeVersion,
      }],
      resolution: [],
      seedAssignments: [],
      loadedConfigurationFiles: [],
      findings: [{
        path: '<preflight>',
        kind: 'configuration_load_failed',
        detail: preflight.detail ?? 'Isolation preflight failed.',
      }],
    };
    process.stdout.write(`${JSON.stringify(report)}\n`);
    process.exitCode = 1;
    return;
  }
  const changedStaticReport = inspectHeldoutLeakChanges(
    addedChanges(config.base, config.candidate),
    config.slice,
    config.bindings,
  );
  const scratchRoot = mkdtempSync(`${tmpdir()}/heldout-runtime-candidate-`);
  const candidateRoot = posix.join(scratchRoot, 'candidate');
  mkdirSync(candidateRoot);
  mkdirSync(posix.join(candidateRoot, 'node_modules'));
  try {
    await extractCandidateArchive(config.candidate, candidateRoot);
    const runtimeReport = await runHeldoutRuntimeGuard({
      root: candidateRoot,
      slice: config.slice,
      bindings: config.bindings,
    });
    const candidateStaticReport = inspectHeldoutCandidateTree(
      candidateRoot,
      config.slice,
      config.bindings,
      runtimeReport.loadedConfigurationFiles,
    );
    const staticFindingKeys = new Set<string>();
    const staticFindings = [...changedStaticReport.findings, ...candidateStaticReport.findings].filter((finding) => {
      const key = JSON.stringify(finding);
      if (staticFindingKeys.has(key)) return false;
      staticFindingKeys.add(key);
      return true;
    });
    const report: HeldoutLeakReport = {
      ...candidateStaticReport,
      findings: [...staticFindings, ...runtimeReport.findings],
      runtimeCompleted: runtimeReport.completed,
      preflight: runtimeReport.preflight,
      configurationLoad: runtimeReport.configurationLoad,
      resolution: runtimeReport.resolution,
      seedAssignments: runtimeReport.seedAssignments,
      loadedConfigurationFiles: runtimeReport.loadedConfigurationFiles,
    };
    process.stdout.write(`${JSON.stringify(report)}\n`);
    if (report.findings.length > 0) process.exitCode = 1;
  } finally {
    rmSync(scratchRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  void runHeldoutLeakCli(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
