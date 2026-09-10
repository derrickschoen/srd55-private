import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    | 'unresolved_module_edge'
    | 'loader_reference_escaped';
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

export interface HeldoutLeakInspectionContext {
  /** Candidate-revision paths, used to expand Vite import.meta.glob calls. */
  readonly candidateFiles?: readonly string[];
  /** Candidate-revision package.json contents keyed by repository-relative path. */
  readonly packageJsonFiles?: Readonly<Record<string, string>>;
  /** Complete candidate sources used when resolution configuration invalidates unchanged consumers. */
  readonly candidateSourceFiles?: Readonly<Record<string, string>>;
  readonly resolutionConfigChanged?: boolean;
  readonly configuredAliasPrefixes?: readonly string[];
  readonly unresolvedResolutionConfigPaths?: readonly string[];
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
  if (/\.d\.(?:ts|mts|cts)$/u.test(path)) return false;
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

export const HELDOUT_MODULE_SPECIFIER_POLICY = {
  normalized: [
    'query and fragment suffixes are removed for module identity and retained for finding detail',
    'repeated and trailing slashes are collapsed',
    'dot and parent path segments are resolved lexically',
    'a trailing index, index.js, or index.ts resolves to its containing module path',
    'a trailing .js or .ts extension resolves to the extensionless module identity',
    'file URLs use fileURLToPath semantics, including percent-decoding, before identity comparison',
    'package #imports use exact-first Node pattern ordering in the nearest candidate package.json',
    'literal filesystem Vite globs support base, leading **, *, **, ?, arrays, exclusions, and query options',
  ],
  meaningChangingQueries: [
    'raw', 'url', 'inline', 'worker', 'sharedworker', 'init', 'import', 'no-inline',
  ],
  findings: [
    'a normalized held-out import is a protocol_import',
    'a normalized held-out resolver call is a protocol_resolution',
    'a recognized non-constant module edge is an unresolved_module_edge',
    'an undecodable or unknown-scheme edge and an unresolved package #import fail closed',
    'a known loader reference escaping recognized call syntax is loader_reference_escaped',
  ],
  interpreted: [
    'loader bindings are tracked by TypeScript symbol identity and exact aliases inherit their loader role',
    'tracked symbols are allowed only in a direct recognized load/resolve call or an exact alias declaration',
    'resolution configuration changes invalidate candidate consumers for reinspection',
  ],
  failsClosed: [
    'every other reference to a tracked loader symbol is loader_reference_escaped',
    'unresolved targets, options, package conditions, globs, aliases, URL schemes, and data modules are findings',
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
  if (ts.isElementAccessExpression(unwrapped)) return constantString(unwrapped.argumentExpression);
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

function globRegex(pattern: string): RegExp | null {
  if (/[{}[\]\\]/u.test(pattern) || /(?:@|\+|\?|\*|!)\(/u.test(pattern)) return null;
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
    } else if (character === '?') {
      source += '[^/]';
    } else {
      source += character?.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&') ?? '';
    }
  }
  return new RegExp(`${source}$`, 'u');
}

function repositoryGlobPattern(
  importer: string,
  pattern: string,
  base: string | null,
): string | null {
  const bareOrAlias = !pattern.startsWith('./') && !pattern.startsWith('../') &&
    !pattern.startsWith('/') && !pattern.startsWith('**');
  if (pattern.startsWith('#') || bareOrAlias) return null;
  if (base !== null && (base.startsWith('#') || (
    !base.startsWith('./') && !base.startsWith('../') && !base.startsWith('/')
  ))) return null;
  const baseDirectory = base === null
    ? posix.dirname(importer)
    : base.startsWith('/')
      ? base.slice(1)
      : posix.join(posix.dirname(importer), base);
  const absolute = pattern.startsWith('/')
    ? pattern.slice(1)
    : pattern.startsWith('**')
      ? pattern
      : posix.join(baseDirectory, pattern);
  return posix.normalize(absolute).replace(/^\.\//u, '');
}

interface GlobOptions {
  readonly query: string;
  readonly base: string | null;
}

function literalObjectProperties(
  expression: ts.Expression,
): ReadonlyMap<string, ts.Expression> | null {
  const unwrapped = unwrapTransparentExpression(expression);
  if (!ts.isObjectLiteralExpression(unwrapped)) return null;
  const properties = new Map<string, ts.Expression>();
  for (const property of unwrapped.properties) {
    if (ts.isSpreadAssignment(property)) {
      const spread = literalObjectProperties(property.expression);
      if (spread === null) return null;
      for (const [key, value] of spread) properties.set(key, value);
      continue;
    }
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) return null;
    const key = propertyNameText(property.name);
    if (key === null) return null;
    properties.set(key, property.initializer);
  }
  return properties;
}

function literalOptionValue(expression: ts.Expression): boolean {
  const unwrapped = unwrapTransparentExpression(expression);
  if (constantString(unwrapped) !== null || ts.isNumericLiteral(unwrapped) ||
    unwrapped.kind === ts.SyntaxKind.TrueKeyword || unwrapped.kind === ts.SyntaxKind.FalseKeyword ||
    unwrapped.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isArrayLiteralExpression(unwrapped)) {
    return unwrapped.elements.every((element) =>
      !ts.isSpreadElement(element) && literalOptionValue(element));
  }
  const properties = literalObjectProperties(unwrapped);
  return properties !== null && [...properties.values()].every((value) => literalOptionValue(value));
}

function globOptions(expression: ts.Expression | undefined): GlobOptions | null {
  if (expression === undefined) return { query: '', base: null };
  const properties = literalObjectProperties(expression);
  if (properties === null || [...properties.values()].some((value) => !literalOptionValue(value))) return null;
  const queryInitializer = properties.get('query');
  let query = '';
  if (queryInitializer !== undefined) {
    const initializer = unwrapTransparentExpression(queryInitializer);
    const value = constantString(initializer);
    if (value !== null) {
      query = value.length === 0 || value.startsWith('?') ? value : `?${value}`;
    } else {
      if (!ts.isObjectLiteralExpression(initializer)) return null;
      const parameters: string[] = [];
      for (const property of initializer.properties) {
        if (!ts.isPropertyAssignment(property)) return null;
        const key = propertyNameText(property.name);
        if (key === null) return null;
        const queryValue = constantString(property.initializer) ??
          (ts.isNumericLiteral(property.initializer) ? property.initializer.text : null) ??
          (property.initializer.kind === ts.SyntaxKind.TrueKeyword ? 'true' : null) ??
          (property.initializer.kind === ts.SyntaxKind.FalseKeyword ? 'false' : null);
        if (queryValue === null) return null;
        parameters.push(`${encodeURIComponent(key)}=${encodeURIComponent(queryValue)}`);
      }
      query = parameters.length === 0 ? '' : `?${parameters.join('&')}`;
    }
  }
  const baseInitializer = properties.get('base');
  const base = baseInitializer === undefined
    ? null
    : constantString(baseInitializer);
  if (baseInitializer !== undefined && base === null) return null;
  return { query, base };
}

function expandGlobEdges(
  importer: string,
  patterns: readonly string[],
  options: GlobOptions,
  candidateFiles: readonly string[] | undefined,
): readonly string[] | null {
  const positive = patterns.filter((pattern) => !pattern.startsWith('!'));
  const negative = patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));
  if (positive.length === 0) return null;
  const normalizedPositive = positive.map((pattern) =>
    repositoryGlobPattern(importer, pattern, options.base));
  const normalizedNegative = negative.map((pattern) =>
    repositoryGlobPattern(importer, pattern, options.base));
  if ([...normalizedPositive, ...normalizedNegative].some((pattern) => pattern === null)) return null;
  const positiveRegexes = normalizedPositive.map((pattern) =>
    pattern === null ? null : globRegex(pattern));
  const negativeRegexes = normalizedNegative.map((pattern) =>
    pattern === null ? null : globRegex(pattern));
  if ([...positiveRegexes, ...negativeRegexes].some((regex) => regex === null)) return null;
  if (candidateFiles === undefined) {
    return positive.every((pattern) => !/[*?{}[\]]/u.test(pattern))
      ? normalizedPositive.map((pattern) => `${pattern ?? ''}${options.query}`)
      : null;
  }
  return candidateFiles.filter((candidatePath) =>
    positiveRegexes.some((regex) => regex?.test(candidatePath) === true) &&
    !negativeRegexes.some((regex) => regex?.test(candidatePath) === true))
    .map((candidatePath) => `${candidatePath}${options.query}`);
}

/**
 * Enumerates statically named module edges from TypeScript syntax. Comments and
 * whitespace are trivia, so they cannot split a token sequence past this wall.
 */
function discoverModuleEdges(
  path: string,
  source: string,
  context: HeldoutLeakInspectionContext = {},
  dataDepth = 0,
): readonly ModuleEdge[] {
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

  type TrackedLoaderKind =
    | 'loader'
    | 'resolver'
    | 'import_meta'
    | 'glob'
    | 'factory'
    | 'module_namespace'
    | 'worker_namespace'
    | 'worker'
    | 'shared_worker'
    | 'script_loader'
    | 'global_namespace';
  const compilerOptions: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  };
  const compilerHost: ts.CompilerHost = {
    fileExists: (fileName) => fileName === path,
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => '',
    getDefaultLibFileName: () => '',
    getDirectories: () => [],
    getNewLine: () => '\n',
    getSourceFile: (fileName) => fileName === path ? sourceFile : undefined,
    readFile: (fileName) => fileName === path ? source : undefined,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => undefined,
  };
  const checker = ts.createProgram([path], compilerOptions, compilerHost).getTypeChecker();
  const trackedSymbols = new Map<ts.Symbol, Set<TrackedLoaderKind>>();
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
    return existing.size !== before;
  };
  const singletonKind = (kind: TrackedLoaderKind): ReadonlySet<TrackedLoaderKind> => new Set([kind]);
  const ambientIdentifierKind = (identifier: ts.Identifier): TrackedLoaderKind | null => {
    if (identifier.text === 'require') return 'loader';
    if (identifier.text === 'module') return 'module_namespace';
    if (identifier.text === 'Worker') return 'worker';
    if (identifier.text === 'SharedWorker') return 'shared_worker';
    if (identifier.text === 'importScripts') return 'script_loader';
    if (['self', 'globalThis', 'window'].includes(identifier.text)) return 'global_namespace';
    return null;
  };
  const identifierKinds = (identifier: ts.Identifier): ReadonlySet<TrackedLoaderKind> => {
    const symbol = symbolAt(identifier);
    if (symbol !== undefined) {
      const tracked = trackedSymbols.get(symbol);
      if (tracked !== undefined) return tracked;
      if (symbol.declarations?.some((declaration) => declaration.getSourceFile() === sourceFile) === true) {
        return new Set();
      }
    }
    const ambient = ambientIdentifierKind(identifier);
    return ambient === null ? new Set() : singletonKind(ambient);
  };
  const moduleNamespaceKind = (specifier: string | null): TrackedLoaderKind | null => {
    if (specifier === 'node:module' || specifier === 'module') return 'module_namespace';
    if (specifier === 'node:worker_threads' || specifier === 'worker_threads') {
      return 'worker_namespace';
    }
    return null;
  };
  const expressionKinds = (expression: ts.Expression): ReadonlySet<TrackedLoaderKind> => {
    let unwrapped = unwrapTransparentExpression(expression);
    while (ts.isAwaitExpression(unwrapped)) {
      unwrapped = unwrapTransparentExpression(unwrapped.expression);
    }
    if (ts.isIdentifier(unwrapped)) return identifierKinds(unwrapped);
    if (isImportMeta(unwrapped)) return singletonKind('import_meta');
    if (ts.isPropertyAccessExpression(unwrapped) || ts.isElementAccessExpression(unwrapped)) {
      const receiverKinds = expressionKinds(unwrapped.expression);
      const key = propertyKey(unwrapped);
      if (key === null) return new Set();
      if (receiverKinds.has('loader') && key === 'resolve') return singletonKind('resolver');
      if (receiverKinds.has('module_namespace') && key === 'createRequire') {
        return singletonKind('factory');
      }
      if (receiverKinds.has('module_namespace') && key === 'require') return singletonKind('loader');
      if (receiverKinds.has('import_meta') && key === 'resolve') return singletonKind('resolver');
      if (receiverKinds.has('import_meta') && key === 'glob') return singletonKind('glob');
      if ((receiverKinds.has('worker_namespace') || receiverKinds.has('global_namespace')) &&
        key === 'Worker') return singletonKind('worker');
      if (receiverKinds.has('global_namespace') && key === 'SharedWorker') {
        return singletonKind('shared_worker');
      }
      if (receiverKinds.has('global_namespace') && key === 'importScripts') {
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
    }
    ts.forEachChild(node, seedImports);
  };
  seedImports(sourceFile);
  let propagated = true;
  while (propagated) {
    propagated = false;
    const propagateAliases = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
        const sourceKinds = expressionKinds(node.initializer);
        if (ts.isIdentifier(node.name) && sourceKinds.size > 0) {
          propagated = addTrackedSymbol(node.name, sourceKinds) || propagated;
        } else if (ts.isObjectBindingPattern(node.name) && sourceKinds.size > 0) {
          for (const element of node.name.elements) {
            if (!ts.isIdentifier(element.name)) continue;
            const key = element.propertyName === undefined
              ? element.name.text
              : propertyNameText(element.propertyName);
            let kind: TrackedLoaderKind | null = null;
            if (sourceKinds.has('loader') && key === 'resolve') kind = 'resolver';
            if (sourceKinds.has('module_namespace') && key === 'createRequire') kind = 'factory';
            if (sourceKinds.has('module_namespace') && key === 'require') kind = 'loader';
            if (sourceKinds.has('module_namespace') && (key === 'default' || key === 'Module')) {
              kind = 'module_namespace';
            }
            if (sourceKinds.has('import_meta') && key === 'resolve') kind = 'resolver';
            if (sourceKinds.has('import_meta') && key === 'glob') kind = 'glob';
            if ((sourceKinds.has('worker_namespace') || sourceKinds.has('global_namespace')) &&
              key === 'Worker') kind = 'worker';
            if (sourceKinds.has('worker_namespace') && key === 'default') kind = 'worker_namespace';
            if (sourceKinds.has('global_namespace') && key === 'SharedWorker') kind = 'shared_worker';
            if (sourceKinds.has('global_namespace') && key === 'importScripts') kind = 'script_loader';
            if (kind !== null) propagated = addTrackedSymbol(element.name, singletonKind(kind)) || propagated;
          }
        }
      }
      ts.forEachChild(node, propagateAliases);
    };
    propagateAliases(sourceFile);
  }
  const createRequireReference = (expression: ts.Expression): boolean =>
    expressionKinds(expression).has('factory');
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
    const exportedVariable = ts.isVariableDeclaration(parent) && parent.name === identifier &&
      ts.isVariableDeclarationList(parent.parent) && ts.isVariableStatement(parent.parent.parent) &&
      ts.canHaveModifiers(parent.parent.parent) &&
      ts.getModifiers(parent.parent.parent)?.some((modifier) =>
        modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
    return (ts.isVariableDeclaration(parent) && parent.name === identifier && !exportedVariable) ||
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
  const isMetaUrlFactoryArgument = (expression: ts.Expression): boolean => {
    if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== 'url' ||
      !isImportMeta(expression.expression)) return false;
    const parent = expression.parent;
    if (ts.isCallExpression(parent) && parent.arguments.includes(expression) &&
      expressionKinds(parent.expression).has('factory')) return true;
    if (!ts.isNewExpression(parent) || !ts.isIdentifier(parent.expression) ||
      parent.expression.text !== 'URL' || parent.arguments?.[1] !== expression) return false;
    const workerConstruction = parent.parent;
    return ts.isNewExpression(workerConstruction) && workerConstruction.arguments?.[0] === parent &&
      (expressionKinds(workerConstruction.expression).has('worker') ||
        expressionKinds(workerConstruction.expression).has('shared_worker'));
  };
  const isAllowedTrackedReference = (reference: ts.Expression): boolean => {
    let current = reference;
    while (true) {
      const parent = current.parent;
      if ((ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) ||
        ts.isSatisfiesExpression(parent) || ts.isNonNullExpression(parent) ||
        ts.isTypeAssertionExpression(parent) || ts.isAwaitExpression(parent)) &&
        parent.expression === current) {
        current = parent;
        continue;
      }
      if (ts.isPropertyAccessExpression(parent) && parent.expression === current) {
        current = parent;
        continue;
      }
      if (ts.isElementAccessExpression(parent) && parent.expression === current) return false;
      if (ts.isCallExpression(parent) && parent.expression === current) {
        return isCallableTrackedKind(expressionKinds(current));
      }
      if (ts.isNewExpression(parent) && parent.expression === current) {
        const kinds = expressionKinds(current);
        return kinds.has('worker') || kinds.has('shared_worker');
      }
      if (ts.isVariableDeclaration(parent) && parent.initializer === current) {
        return expressionKinds(current).size > 0;
      }
      return isMetaUrlFactoryArgument(current);
    }
  };
  let loaderEscapeRecorded = false;
  const recordLoaderEscape = (): void => {
    if (loaderEscapeRecorded) return;
    loaderEscapeRecorded = true;
    addUnresolved('loader_reference');
  };
  const isTrackedModuleReExport = (node: ts.Node): boolean =>
    ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && !node.isTypeOnly &&
    moduleNamespaceKind(constantString(node.moduleSpecifier)) !== null;
  const visited = new Set<ts.Node>();
  const visit = (node: ts.Node): void => {
    if (visited.has(node)) return;
    visited.add(node);
    if (isTrackedModuleReExport(node)) {
      recordLoaderEscape();
    } else if (ts.isIdentifier(node) && !isDeclarationIdentifier(node) &&
      identifierKinds(node).size > 0 && !isAllowedTrackedReference(node)) {
      recordLoaderEscape();
    } else if (ts.isMetaProperty(node) && isImportMeta(node) && !isAllowedTrackedReference(node)) {
      recordLoaderEscape();
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
        const options = globOptions(node.arguments[1]);
        const matches = patterns === null || options === null
          ? null
          : expandGlobEdges(path, patterns, options, context.candidateFiles);
        if (matches === null) addUnresolved('import_meta_glob');
        else for (const match of matches) {
          result.push({ kind: 'import', syntax: 'import_meta_glob', specifier: match });
        }
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
        nested.push(...discoverModuleEdges(`${path}.data-${String(dataDepth)}.ts`, decoded, context, dataDepth + 1));
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

function importsTarget(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return null;
  const candidates = (Array.isArray(value) ? value : Object.values(value))
    .map((candidate) => importsTarget(candidate));
  if (candidates.length === 0 || candidates.some((candidate) => candidate === null)) return null;
  const distinct = [...new Set(candidates)];
  return distinct.length === 1 ? distinct[0] ?? null : null;
}

function resolvePackageImport(
  importer: string,
  specifier: string,
  packageJsonFiles: Readonly<Record<string, string>> | undefined,
): string | null {
  if (packageJsonFiles === undefined) return null;
  let directory = posix.dirname(importer);
  while (true) {
    const packagePath = directory === '.' ? 'package.json' : `${directory}/package.json`;
    const source = packageJsonFiles[packagePath];
    if (source !== undefined) {
      try {
        const parsed: unknown = JSON.parse(source);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const imports = Reflect.get(parsed, 'imports');
        if (imports === null || typeof imports !== 'object' || Array.isArray(imports)) return null;
        const entries = Object.entries(imports);
        const exact = entries.find(([key]) => key === specifier);
        if (exact !== undefined) {
          const target = importsTarget(exact[1]);
          if (target === null) return null;
          return target.startsWith('./') ? posix.join(directory, target) : target;
        }
        const patterns = entries.flatMap(([key, value]) => {
          const star = key.indexOf('*');
          if (star < 0 || star !== key.lastIndexOf('*')) return [];
          const prefix = key.slice(0, star);
          const suffix = key.slice(star + 1);
          return specifier.startsWith(prefix) && specifier.endsWith(suffix)
            ? [{ key, value, prefix, suffix }]
            : [];
        }).sort((left, right) =>
          right.prefix.length - left.prefix.length ||
          right.suffix.length - left.suffix.length ||
          right.key.length - left.key.length);
        const selected = patterns[0];
        if (selected === undefined) return null;
        let target = importsTarget(selected.value);
        if (target === null) return null;
        const substitution = specifier.slice(
          selected.prefix.length,
          specifier.length - selected.suffix.length,
        );
        target = target.replaceAll('*', substitution);
        return target.startsWith('./') ? posix.join(directory, target) : target;
      } catch {
        return null;
      }
      return null;
    }
    if (directory === '.') break;
    directory = posix.dirname(directory);
  }
  return null;
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
  context: HeldoutLeakInspectionContext,
): NormalizedModuleSpecifier | null {
  const schemeCandidate = originalSpecifier.trimStart();
  let specifier = /^[a-z][a-z0-9+.-]*:/iu.test(schemeCandidate)
    ? schemeCandidate
    : originalSpecifier;
  if (specifier.startsWith('#')) {
    const resolved = resolvePackageImport(importer, specifier, context.packageJsonFiles);
    if (resolved === null) return null;
    specifier = resolved;
  }
  if (context.configuredAliasPrefixes?.some((alias) =>
    alias === '*' || specifier === alias || specifier.startsWith(alias)) === true) {
    return null;
  }
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
  context: HeldoutLeakInspectionContext,
): NormalizedModuleSpecifier | null {
  const normalized = normalizeModuleSpecifier(specifier, importer, context);
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
  context: HeldoutLeakInspectionContext,
): NormalizedModuleSpecifier | null {
  for (const edge of edges) {
    if (edge.kind !== kind || edge.specifier === null) continue;
    const normalized = heldoutProtocolSpecifier(edge.specifier, importer, context);
    if (normalized !== null) return normalized;
  }
  return null;
}

function firstInvalidSpecifier(
  edges: readonly ModuleEdge[],
  importer: string,
  context: HeldoutLeakInspectionContext,
): ModuleEdge | undefined {
  return edges.find((edge) => edge.specifier !== null &&
    normalizeModuleSpecifier(edge.specifier, importer, context) === null);
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
  context: HeldoutLeakInspectionContext = {},
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
  const aliasDiscoveries = changes.flatMap((change) => {
    if (!/^vite\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(posix.basename(change.path))) return [];
    return [{ path: change.path, discovery: viteAliases(
      change.sourceText ?? change.addedText,
      change.path,
    ) }];
  });
  const discoveredAliases = aliasDiscoveries.flatMap(({ discovery }) => discovery.aliases);
  const unresolvedResolutionConfigPaths = [...new Set([
    ...(context.unresolvedResolutionConfigPaths ?? []),
    ...aliasDiscoveries.filter(({ discovery }) => discovery.unresolved).map(({ path }) => path),
  ])];
  const inspectionContext: HeldoutLeakInspectionContext = {
    ...context,
    configuredAliasPrefixes: [...new Set([
      ...(context.configuredAliasPrefixes ?? []),
      ...discoveredAliases,
    ])],
    unresolvedResolutionConfigPaths,
  };
  const effectiveChanges = new Map(changes.map((change) => [change.path, change]));
  const resolutionConfigChanged = inspectionContext.resolutionConfigChanged === true ||
    changes.some((change) => isResolutionConfigPath(change.path));
  if (resolutionConfigChanged) {
    for (const [path, sourceText] of Object.entries(inspectionContext.candidateSourceFiles ?? {})) {
      if (!effectiveChanges.has(path)) effectiveChanges.set(path, { path, addedText: '', sourceText });
    }
  }
  for (const configPath of unresolvedResolutionConfigPaths) {
    findings.push({
      path: configPath,
      kind: 'unresolved_module_edge',
      detail: 'Vite alias configuration is not statically resolvable',
    });
  }
  for (const change of effectiveChanges.values()) {
    const reference = reserveReference(change.addedText, bindings);
    if (reference !== null && (
      semanticInputPath(change.path) ||
      (!EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path))
    )) {
      findings.push({ path: change.path, kind: 'reserve_reference', detail: reference });
    }
    const edges = isTypeScriptOrJavaScript(change.path)
      ? discoverModuleEdges(change.path, change.sourceText ?? change.addedText, inspectionContext)
      : [];
    const restrictedPath = !EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path);
    const heldoutImport = firstHeldoutEdge(edges, 'import', change.path, inspectionContext);
    if (restrictedPath && heldoutImport !== null) {
      findings.push({
        path: change.path,
        kind: 'protocol_import',
        detail: `held-out protocol imported outside evaluation tooling${specifierSuffixDetail(heldoutImport)}`,
      });
    }
    const heldoutResolution = firstHeldoutEdge(edges, 'resolution', change.path, inspectionContext);
    if (restrictedPath && heldoutResolution !== null) {
      findings.push({
        path: change.path,
        kind: 'protocol_resolution',
        detail: `held-out protocol resolved outside evaluation tooling${specifierSuffixDetail(heldoutResolution)}`,
      });
    }
    const unresolved = edges.find((edge) => edge.kind === 'unresolved') ??
      firstInvalidSpecifier(edges, change.path, inspectionContext);
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
    findings,
  };
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
    /^vite\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(basename);
}

function jsonAliases(source: string, path: string): readonly string[] {
  try {
    const parsed = ts.parseConfigFileTextToJson(path, source);
    if (parsed.error !== undefined || parsed.config === undefined) return [];
    const config: unknown = parsed.config;
    if (config === null || typeof config !== 'object' || Array.isArray(config)) return [];
    const compilerOptions = Reflect.get(config, 'compilerOptions');
    const paths = compilerOptions !== null && typeof compilerOptions === 'object'
      ? Reflect.get(compilerOptions, 'paths')
      : undefined;
    const aliases = paths !== null && typeof paths === 'object' && !Array.isArray(paths)
      ? Object.keys(paths).map((key) => key === '*'
        ? '*'
        : key.slice(0, key.indexOf('*') < 0 ? key.length : key.indexOf('*')))
      : [];
    const exportsValue = Reflect.get(config, 'exports');
    const packageName = typeof Reflect.get(config, 'name') === 'string'
      ? Reflect.get(config, 'name')
      : null;
    return exportsValue === undefined || typeof packageName !== 'string'
      ? aliases
      : [...aliases, packageName];
  } catch {
    return [];
  }
}

interface ViteAliasDiscovery {
  readonly aliases: readonly string[];
  readonly unresolved: boolean;
}

function viteAliases(source: string, path: string): ViteAliasDiscovery {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path));
  const aliases = new Set<string>();
  let unresolved = false;
  const localExpressions = new Map<string, ts.Expression>();
  const collectLocals = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      localExpressions.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, collectLocals);
  };
  collectLocals(sourceFile);
  const resolveLocal = (expression: ts.Expression, seen: ReadonlySet<string>): ts.Expression | null => {
    const unwrapped = unwrapTransparentExpression(expression);
    if (!ts.isIdentifier(unwrapped)) return unwrapped;
    if (seen.has(unwrapped.text)) return null;
    const local = localExpressions.get(unwrapped.text);
    return local === undefined
      ? null
      : resolveLocal(local, new Set([...seen, unwrapped.text]));
  };
  const collectAliasInitializer = (initializer: ts.Expression, seen: ReadonlySet<string>): void => {
    const resolved = resolveLocal(initializer, seen);
    if (resolved === null) {
      aliases.add('*');
      unresolved = true;
      return;
    }
    const unwrapped = unwrapTransparentExpression(resolved);
    if (ts.isObjectLiteralExpression(unwrapped)) {
      for (const property of unwrapped.properties) {
        if (ts.isSpreadAssignment(property)) {
          collectAliasInitializer(property.expression, seen);
        } else if (ts.isPropertyAssignment(property) &&
          !ts.isComputedPropertyName(property.name) && constantString(property.initializer) !== null) {
          const key = propertyNameText(property.name);
          aliases.add(key ?? '*');
        } else {
          aliases.add('*');
          unresolved = true;
        }
      }
    } else if (ts.isArrayLiteralExpression(unwrapped)) {
      for (const element of unwrapped.elements) {
        if (ts.isSpreadElement(element)) {
          collectAliasInitializer(element.expression, seen);
          continue;
        }
        const resolvedElement = resolveLocal(element, seen);
        if (resolvedElement === null || !ts.isObjectLiteralExpression(resolvedElement)) {
          aliases.add('*');
          unresolved = true;
          continue;
        }
        const find = resolvedElement.properties.find((property) =>
          ts.isPropertyAssignment(property) && propertyNameText(property.name) === 'find');
        const replacement = resolvedElement.properties.find((property) =>
          ts.isPropertyAssignment(property) && propertyNameText(property.name) === 'replacement');
        if (find === undefined || replacement === undefined ||
          !ts.isPropertyAssignment(find) || !ts.isPropertyAssignment(replacement) ||
          constantString(replacement.initializer) === null) {
          aliases.add('*');
          unresolved = true;
          continue;
        }
        const key = constantString(find.initializer);
        if (key !== null) aliases.add(key);
        else if (ts.isRegularExpressionLiteral(unwrapTransparentExpression(find.initializer))) aliases.add('*');
        else {
          aliases.add('*');
          unresolved = true;
        }
      }
    } else {
      aliases.add('*');
      unresolved = true;
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && propertyNameText(node.name) === 'alias') {
      collectAliasInitializer(node.initializer, new Set());
    } else if (ts.isShorthandPropertyAssignment(node) && node.name.text === 'alias') {
      collectAliasInitializer(node.name, new Set());
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { aliases: [...aliases], unresolved };
}

function candidateInspectionContext(base: string, candidate: string): HeldoutLeakInspectionContext {
  const tree = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', candidate], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).split('\0').filter((path) => path.length > 0);
  const packageJsonFiles: Record<string, string> = {};
  const configSources: Record<string, string> = {};
  for (const path of tree.filter((candidatePath) =>
    isResolutionConfigPath(candidatePath))) {
    const source = execFileSync('git', ['show', `${candidate}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    configSources[path] = source;
    if (posix.basename(path) === 'package.json') packageJsonFiles[path] = source;
  }
  const changedPaths = parseGitNameStatusZ(execFileSync(
    'git', ['diff', '--name-status', '-z', base, candidate],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  ));
  const resolutionConfigChanged = changedPaths.some((change) =>
    isResolutionConfigPath(change.path) ||
    (change.previousPath !== undefined && isResolutionConfigPath(change.previousPath)));
  const candidateSourceFiles: Record<string, string> = {};
  if (resolutionConfigChanged) {
    for (const path of tree.filter((candidatePath) =>
      (candidatePath.startsWith('src/') || candidatePath.startsWith('tools/') ||
        candidatePath.startsWith('tests/')) && isTypeScriptOrJavaScript(candidatePath))) {
      candidateSourceFiles[path] = execFileSync('git', ['show', `${candidate}:${path}`], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
    }
  }
  const viteDiscoveries = Object.entries(configSources).flatMap(([path, source]) =>
    posix.basename(path).startsWith('vite.config.')
      ? [{ path, discovery: viteAliases(source, path) }]
      : []);
  const configuredAliasPrefixes = [...new Set([
    ...Object.entries(configSources).flatMap(([path, source]) =>
      posix.basename(path).startsWith('vite.config.') ? [] : jsonAliases(source, path)),
    ...viteDiscoveries.flatMap(({ discovery }) => discovery.aliases),
  ])].filter((alias) => alias.length > 0);
  return {
    candidateFiles: tree,
    packageJsonFiles,
    candidateSourceFiles,
    resolutionConfigChanged,
    configuredAliasPrefixes,
    unresolvedResolutionConfigPaths: viteDiscoveries
      .filter(({ discovery }) => discovery.unresolved)
      .map(({ path }) => path),
  };
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
    candidateInspectionContext(config.base, config.candidate),
  );
  process.stdout.write(`${canonicalJson(report)}\n`);
  if (report.findings.length > 0) process.exitCode = 1;
}

const scriptIndex = process.argv.findIndex((argument) =>
  argument.endsWith('/heldout-leak-check.ts') || argument.endsWith('\\heldout-leak-check.ts'));
if (scriptIndex >= 0) main(process.argv.slice(scriptIndex + 1));
else if (process.argv.includes('--base') && process.argv.includes('--candidate')) main(process.argv.slice(2));
