/**
 * THE ONE DEFINITION OF A RUNTIME IMPORT EDGE (D915).
 *
 * Which module references make a module load another, as Vite and vite-node
 * actually run this repository. Every tsconfig here sets
 * `verbatimModuleSyntax`, and Vite's esbuild transform honours it, so:
 *
 *   import type { A } from './a';             erased
 *   export type { A } from './a';             erased
 *   import { type A } from './a';             KEPT as `import {} from './a'`
 *   export { type A } from './a';             KEPT as `import {} from './a'`
 *   import './a'; import a from './a';
 *   import * as a from './a'; export * from './a'
 *                                             evaluated with the importer
 *   import.meta.glob('./x/*.ts', { eager: true })
 *                                             evaluated with the importer
 *   import('./a'); import('./a', { with: { type: 'json' } }); require('./a');
 *   import.meta.glob('./x/*.ts')              evaluated when the call runs
 *   new URL('./a', import.meta.url)           an asset the module fetches or
 *                                             starts (a worker, a wasm file)
 *   f(import.meta.glob)                       not expandable: Vite expands
 *                                             only a direct call, so this
 *                                             fails closed (unsupported glob)
 *
 * The third and fourth lines are the trap: the bindings are types, yet the
 * module is still evaluated. The verdict cache once read them as erased (the
 * IMPORT-SLIM synthesis, item 0) while Vite evaluated them; it also missed
 * every glob, testing for `import.meta` as a property access where the parser
 * gives a MetaProperty, and every `import()` with options. Two definitions of
 * a runtime edge that disagree is exactly that bug.
 *
 * Who classifies through this module: the import-boundary guard
 * (scripts/check-import-boundaries.mjs) and the import censuses. The verdict
 * cache (scripts/test-affected.mjs) still has its own copy: RECORDER-A fixed
 * its two holes on its own branch with the semantics above, and whichever of
 * the two units lands second switches it to `classifyModuleReference` (D919).
 * The switch is mechanical: a declaration loads its module unless its
 * `evaluation` is `erased`; `specifiers` are the expressions naming the
 * target (an `import()`'s first argument, a glob's patterns), which
 * `specifierText` reads: a string literal, or a module-scope string constant
 * (`moduleStringConstants`), as the verdict cache has always read them. What
 * the verdict cache tracks beyond module references (vi.mock paths, file
 * reads, environment variables) stays its own.
 *
 * One caveat: a file that no tsconfig project includes (drizzle.config.ts,
 * vitest.stryker.config.ts, docs/) is transformed without
 * `verbatimModuleSyntax`, so esbuild drops its unused imports; this module
 * still reads them as loads, which over-approximates and never misses one.
 *
 * `classifyModuleReference` is the classifier. The rest resolves specifiers
 * the way Vite does for this repository (relative paths only; there are no
 * aliases) and builds the graph the guard's rules walk.
 */

import path from 'node:path';
import ts from 'typescript';

/**
 * How a reference loads its target:
 * - `erased`: never, the reference is a type;
 * - `static`: when the importer is evaluated;
 * - `dynamic`: when the call runs;
 * - `asset`: a file the module fetches or starts by URL, never evaluated in
 *   the importer's realm.
 */
export const EVALUATION = Object.freeze({
  ERASED: 'erased',
  STATIC: 'static',
  DYNAMIC: 'dynamic',
  ASSET: 'asset',
});

/** Vite's default `resolve.extensions`, in its order (tools/engine-child-bundle.ts). */
export const VITE_RESOLVE_EXTENSIONS = Object.freeze(['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']);

/** Files the graph parses as modules. A declaration file is never evaluated. */
export const CODE_EXTENSIONS = Object.freeze(['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs', '.jsx']);

export function isCodeFile(fileName) {
  return CODE_EXTENSIONS.includes(path.posix.extname(fileName)) && !/\.d\.[cm]?ts$/u.test(fileName);
}

function scriptKind(fileName) {
  const extension = path.posix.extname(fileName);
  if (extension === '.tsx') return ts.ScriptKind.TSX;
  if (extension === '.jsx') return ts.ScriptKind.JSX;
  if (['.js', '.mjs', '.cjs'].includes(extension)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export function parseModule(fileName, text) {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind(fileName));
}

function isImportMeta(node) {
  return ts.isMetaProperty(node) &&
    node.keywordToken === ts.SyntaxKind.ImportKeyword &&
    node.name.text === 'meta';
}

function isImportMetaUrl(node) {
  return ts.isPropertyAccessExpression(node) && node.name.text === 'url' && isImportMeta(node.expression);
}

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return undefined;
}

/**
 * Vite's `import.meta.glob` options, read only when every one is a literal
 * this file understands. Anything else (a spread, `base`, a computed `eager`)
 * makes the call unsupported, and a consumer must fail closed on it; its
 * evaluation is then taken as static, the reading that loads the most.
 */
function globOptions(argument) {
  if (argument === undefined) return { supported: true, eager: false, query: undefined };
  if (!ts.isObjectLiteralExpression(argument)) return { supported: false, eager: true, query: undefined };
  let eager = false;
  let query;
  for (const property of argument.properties) {
    if (!ts.isPropertyAssignment(property)) return { supported: false, eager: true, query: undefined };
    const name = propertyName(property.name);
    if (name === 'eager') {
      if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) eager = true;
      else if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) eager = false;
      else return { supported: false, eager: true, query: undefined };
    } else if (name === 'query') {
      if (!ts.isStringLiteralLike(property.initializer)) {
        return { supported: false, eager: true, query: undefined };
      }
      query = property.initializer.text.replace(/^\?/u, '');
    } else if (name !== 'import') {
      return { supported: false, eager: true, query: undefined };
    }
  }
  return { supported: true, eager, query };
}

function namedBindingsAreAllInlineTypes(elements) {
  return elements !== undefined && elements.length > 0 && elements.every((element) => element.isTypeOnly);
}

/**
 * Classifies one AST node. Returns undefined when the node is not a module
 * reference, otherwise:
 * - `syntax`: import | export | import-equals | dynamic-import | require |
 *   glob | asset-url;
 * - `evaluation`: one of EVALUATION;
 * - `specifiers`: the expressions naming the target (a glob's patterns);
 * - `inlineTypeOnly`: an import or re-export that is kept only for its side
 *   effect because every binding is an inline `type` (guard rule R1);
 * - `glob`: for a glob, `{ supported, eager, query }`; `import.meta.glob`
 *   used other than as a direct callee is a glob with no patterns and
 *   `supported: false`.
 */
export function classifyModuleReference(node) {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (clause?.isTypeOnly === true) {
      return reference('import', EVALUATION.ERASED, [node.moduleSpecifier]);
    }
    const namedBindings = clause?.namedBindings;
    const inlineTypeOnly = clause !== undefined &&
      clause.name === undefined &&
      namedBindings !== undefined &&
      ts.isNamedImports(namedBindings) &&
      namedBindingsAreAllInlineTypes(namedBindings.elements);
    return reference('import', EVALUATION.STATIC, [node.moduleSpecifier], inlineTypeOnly);
  }
  if (ts.isExportDeclaration(node)) {
    if (node.moduleSpecifier === undefined) return undefined;
    if (node.isTypeOnly) return reference('export', EVALUATION.ERASED, [node.moduleSpecifier]);
    const clause = node.exportClause;
    const inlineTypeOnly = clause !== undefined &&
      ts.isNamedExports(clause) &&
      namedBindingsAreAllInlineTypes(clause.elements);
    return reference('export', EVALUATION.STATIC, [node.moduleSpecifier], inlineTypeOnly);
  }
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
    return reference(
      'import-equals',
      node.isTypeOnly ? EVALUATION.ERASED : EVALUATION.STATIC,
      [node.moduleReference.expression],
    );
  }
  if (ts.isPropertyAccessExpression(node) && node.name.text === 'glob' && isImportMeta(node.expression)) {
    // A direct call is classified at the call. Any other use (passed, stored,
    // called through a variable) cannot be expanded, so it fails closed.
    const parent = node.parent;
    if (parent !== undefined && ts.isCallExpression(parent) && parent.expression === node) return undefined;
    return {
      syntax: 'glob',
      evaluation: EVALUATION.STATIC,
      specifiers: [],
      inlineTypeOnly: false,
      glob: { supported: false, eager: true, query: undefined },
    };
  }
  if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) return undefined;
  const callArguments = node.arguments ?? [];
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    // The first argument names the module; a second holds import attributes.
    return reference('dynamic-import', EVALUATION.DYNAMIC, callArguments.slice(0, 1));
  }
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'require' &&
    callArguments.length === 1
  ) {
    return reference('require', EVALUATION.DYNAMIC, callArguments.slice(0, 1));
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'glob' &&
    isImportMeta(node.expression.expression)
  ) {
    const first = callArguments[0];
    const patterns = first === undefined
      ? []
      : ts.isArrayLiteralExpression(first) ? [...first.elements] : [first];
    const options = globOptions(callArguments[1]);
    return {
      syntax: 'glob',
      evaluation: options.eager ? EVALUATION.STATIC : EVALUATION.DYNAMIC,
      specifiers: patterns,
      inlineTypeOnly: false,
      glob: options,
    };
  }
  if (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'URL' &&
    callArguments.length === 2 &&
    isImportMetaUrl(callArguments[1])
  ) {
    return reference('asset-url', EVALUATION.ASSET, callArguments.slice(0, 1));
  }
  return undefined;
}

function reference(syntax, evaluation, specifiers, inlineTypeOnly = false) {
  return { syntax, evaluation, specifiers, inlineTypeOnly };
}

/** Every module reference in a parsed file, with its 1-based line. */
export function moduleReferences(sourceFile) {
  const references = [];
  const visit = (node) => {
    const classified = classifyModuleReference(node);
    if (classified !== undefined) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      references.push({ ...classified, node, line });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

/**
 * Resolves one specifier written in `importer` (both repository-relative,
 * POSIX). A bare specifier or a `node:` builtin is external. A relative one
 * resolves as Vite's tryCleanFsResolve does for this repository: the file
 * itself, then each of Vite's extensions, a TypeScript file for a `.js`-style
 * name, then a directory index. A query (`?raw`, `?url`, `?worker`) makes the
 * target a resource: `{ kind: 'resource', id: 'docs/x.txt?raw' }`.
 *
 * `isFile(repositoryPath)` says whether a file exists.
 */
export function resolveModuleSpecifier(importer, specifier, isFile) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../') && specifier !== '.' && specifier !== '..') {
    return specifier.startsWith('/') ? { kind: 'unresolved', id: specifier } : { kind: 'external', id: specifier };
  }
  const [withoutFragment] = specifier.split('#');
  const queryIndex = withoutFragment.indexOf('?');
  const bare = queryIndex < 0 ? withoutFragment : withoutFragment.slice(0, queryIndex);
  const query = queryIndex < 0 ? '' : withoutFragment.slice(queryIndex + 1);
  // './dir/' names the directory: its index, never a 'dir//index.ts' node.
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), bare)).replace(/(?<=.)\/+$/u, '');
  if (base.startsWith('../') || base === '..') return { kind: 'unresolved', id: specifier };
  const candidates = [base];
  const extension = path.posix.extname(base);
  const typeScriptFor = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'] };
  for (const candidateExtension of VITE_RESOLVE_EXTENSIONS) candidates.push(base + candidateExtension);
  for (const typeScriptExtension of typeScriptFor[extension] ?? []) {
    candidates.push(base.slice(0, -extension.length) + typeScriptExtension);
  }
  for (const candidateExtension of VITE_RESOLVE_EXTENSIONS) candidates.push(`${base}/index${candidateExtension}`);
  const found = candidates.find((candidate) => isFile(candidate));
  if (found === undefined) return { kind: 'unresolved', id: specifier };
  // A relative path into a package is still a package: the graph stops there.
  if (found.split('/').includes('node_modules')) return { kind: 'external', id: found };
  if (query !== '') return { kind: 'resource', id: `${found}?${query}`, file: found };
  return isCodeFile(found) ? { kind: 'module', id: found, file: found } : { kind: 'resource', id: found, file: found };
}

function globRegex(pattern) {
  let regex = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*' && pattern[index + 1] === '*') {
      if (pattern[index + 2] === '/') {
        regex += '(?:.*/)?';
        index += 2;
      } else {
        regex += '.*';
        index += 1;
      }
    } else if (character === '*') {
      regex += '[^/]*';
    } else {
      regex += character.replace(/[\\^$.+?()[\]{}|]/gu, '\\$&');
    }
  }
  return new RegExp(`${regex}$`, 'u');
}

/**
 * Expands a relative glob (only `*` and `**`, optional `!` exclusions, as this
 * repository writes them). `filesBelow(directory)` lists the repository files
 * under a directory. Returns undefined for a pattern it cannot read, which a
 * consumer treats as unresolved.
 */
export function expandGlob(importer, patterns, filesBelow) {
  const include = [];
  const exclude = [];
  const directories = new Set();
  for (const pattern of patterns) {
    const negated = pattern.startsWith('!');
    const body = negated ? pattern.slice(1) : pattern;
    if (!body.startsWith('./') && !body.startsWith('../')) return undefined;
    if (/[?[\]{}()@+!]/u.test(body)) return undefined;
    const absolute = path.posix.normalize(path.posix.join(path.posix.dirname(importer), body));
    if (absolute.startsWith('../')) return undefined;
    (negated ? exclude : include).push(globRegex(absolute));
    if (!negated) {
      const segments = absolute.split('/');
      const literal = segments.slice(0, segments.findIndex((segment) => segment.includes('*')));
      directories.add(literal.join('/'));
    }
  }
  const candidates = new Set([...directories].flatMap((directory) => filesBelow(directory)));
  return [...candidates]
    .filter((file) => include.some((regex) => regex.test(file)) && !exclude.some((regex) => regex.test(file)))
    .sort();
}

/** Declarations that bind an identifier, for moduleStringConstants' shadowing check. */
function declaredName(node) {
  if (
    ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node) ||
    ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) || ts.isImportSpecifier(node) || ts.isImportClause(node) ||
    ts.isNamespaceImport(node) || ts.isImportEqualsDeclaration(node) || ts.isEnumDeclaration(node)
  ) {
    return node.name !== undefined && ts.isIdentifier(node.name) ? node.name.text : undefined;
  }
  return undefined;
}

/**
 * The module-scope `const NAME = '<string>'` bindings a specifier may name,
 * as in `const COVERAGE_PATH = '../src/simulation/coverage'; import(COVERAGE_PATH)`.
 * A name declared anywhere else in the file too is left out, since the
 * specifier might mean the other binding; the reference then fails closed.
 */
export function moduleStringConstants(sourceFile) {
  const declarations = new Map();
  const visit = (node) => {
    const name = declaredName(node);
    if (name !== undefined) declarations.set(name, (declarations.get(name) ?? 0) + 1);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const constants = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || (statement.declarationList.flags & ts.NodeFlags.Const) === 0) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer !== undefined &&
        ts.isStringLiteralLike(declaration.initializer) &&
        declarations.get(declaration.name.text) === 1
      ) {
        constants.set(declaration.name.text, declaration.initializer.text);
      }
    }
  }
  return constants;
}

const NO_CONSTANTS = new Map();

/** A specifier's text: a string literal, or an identifier bound by moduleStringConstants. */
export function specifierText(expression, constants) {
  if (expression === undefined) return undefined;
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isIdentifier(expression)) return constants.get(expression.text);
  return undefined;
}

/**
 * Builds the module graph from `roots` (repository paths of code files) and
 * every code file they reach, read through `host`. A specifier is read by
 * `specifierText`, so a module-scope string constant resolves:
 * - `host.isFile(path)`: whether a repository file exists;
 * - `host.readFile(path)`: its text;
 * - `host.filesBelow(directory)`: the repository files under a directory.
 *
 * Returns:
 * - `edges`: Map from each parsed module to its resolved edges
 *   `{ to, evaluation, syntax, line, inlineTypeOnly }` (externals are dropped);
 * - `inlineTypeOnly`: every R1 site `{ file, line, specifier, syntax }`;
 * - `unresolved`: references naming a repository file the graph could not
 *   find, `{ file, line, specifier, evaluation }`.
 */
export function buildModuleGraph(roots, host) {
  const edges = new Map();
  const inlineTypeOnly = [];
  const unresolved = [];
  const queue = [...roots];
  const queued = new Set(queue);
  while (queue.length > 0) {
    const file = queue.shift();
    const sourceFile = parseModule(file, host.readFile(file));
    // Constants are read only for a file that names a specifier by identifier
    // (a handful); walking every file for them costs half a second.
    let constants;
    const textOf = (expression) => specifierText(
      expression,
      expression !== undefined && ts.isIdentifier(expression)
        ? (constants ??= moduleStringConstants(sourceFile))
        : NO_CONSTANTS,
    );
    const out = [];
    const enqueue = (to) => {
      if (!to.includes('?') && isCodeFile(to) && !queued.has(to)) {
        queued.add(to);
        queue.push(to);
      }
    };
    for (const found of moduleReferences(sourceFile)) {
      const base = { evaluation: found.evaluation, syntax: found.syntax, line: found.line };
      if (found.inlineTypeOnly) {
        inlineTypeOnly.push({
          file,
          line: found.line,
          syntax: found.syntax,
          specifier: textOf(found.specifiers[0]) ?? '<non-literal>',
        });
      }
      if (found.syntax === 'glob') {
        const patterns = found.specifiers.map(textOf);
        const matched = !found.glob.supported || patterns.length === 0 || patterns.includes(undefined)
          ? undefined
          : expandGlob(file, patterns, host.filesBelow);
        if (matched === undefined) {
          unresolved.push({ file, line: found.line, specifier: '<import.meta.glob>', evaluation: found.evaluation });
          continue;
        }
        for (const target of matched) {
          if (target === file) continue;
          const to = found.glob.query === undefined ? target : `${target}?${found.glob.query}`;
          out.push({ ...base, to, inlineTypeOnly: false });
          enqueue(to);
        }
        continue;
      }
      const specifier = textOf(found.specifiers[0]);
      if (specifier === undefined) {
        if (found.evaluation !== EVALUATION.ERASED) {
          unresolved.push({ file, line: found.line, specifier: '<non-literal>', evaluation: found.evaluation });
        }
        continue;
      }
      if (found.evaluation === EVALUATION.ERASED) continue;
      const resolved = resolveModuleSpecifier(file, specifier, host.isFile);
      if (resolved.kind === 'external') continue;
      if (resolved.kind === 'unresolved') {
        unresolved.push({ file, line: found.line, specifier, evaluation: found.evaluation });
        continue;
      }
      out.push({ ...base, to: resolved.id, inlineTypeOnly: found.inlineTypeOnly });
      enqueue(resolved.id);
    }
    edges.set(file, out);
  }
  return { edges, inlineTypeOnly, unresolved };
}

/** The file a graph node is read from: a resource id without its query. */
export function nodeFile(id) {
  const queryIndex = id.indexOf('?');
  return queryIndex < 0 ? id : id.slice(0, queryIndex);
}

/**
 * Every node reachable from `start` (inclusive) over edges whose evaluation is
 * in `evaluations`, as a Map from node to the edge that first reached it
 * (`null` for `start`), so a caller can print one path with `pathTo`.
 */
export function closure(graph, start, evaluations) {
  const allowed = new Set(evaluations);
  const parents = new Map([[start, null]]);
  const stack = [start];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const edge of graph.edges.get(current) ?? []) {
      if (!allowed.has(edge.evaluation) || parents.has(edge.to)) continue;
      parents.set(edge.to, { from: current, line: edge.line, syntax: edge.syntax });
      stack.push(edge.to);
    }
  }
  return parents;
}

/** One path from the closure's start to `target`, as `file:line` hops. */
export function pathTo(parents, target) {
  const hops = [];
  let current = target;
  while (parents.get(current) !== null && parents.get(current) !== undefined) {
    const parent = parents.get(current);
    hops.unshift(`${parent.from}:${String(parent.line)}`);
    current = parent.from;
  }
  return [...hops, target];
}

/**
 * Strongly connected components with more than one member (or a self-edge),
 * over edges whose evaluation is in `evaluations`. Iterative Tarjan; members
 * and components are sorted, so the output is stable.
 */
export function cycles(graph, evaluations) {
  const allowed = new Set(evaluations);
  const successors = (node) => (graph.edges.get(node) ?? [])
    .filter((edge) => allowed.has(edge.evaluation))
    .map((edge) => edge.to);
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;
  for (const root of [...graph.edges.keys()].sort()) {
    if (index.has(root)) continue;
    const work = [{ node: root, next: 0, targets: successors(root) }];
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1];
      if (frame.next < frame.targets.length) {
        const target = frame.targets[frame.next];
        frame.next += 1;
        if (!index.has(target)) {
          index.set(target, counter);
          low.set(target, counter);
          counter += 1;
          stack.push(target);
          onStack.add(target);
          work.push({ node: target, next: 0, targets: successors(target) });
        } else if (onStack.has(target)) {
          low.set(frame.node, Math.min(low.get(frame.node), index.get(target)));
        }
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1].node;
        low.set(parent, Math.min(low.get(parent), low.get(frame.node)));
      }
      if (low.get(frame.node) === index.get(frame.node)) {
        const members = [];
        let member;
        do {
          member = stack.pop();
          onStack.delete(member);
          members.push(member);
        } while (member !== frame.node);
        const selfEdge = members.length === 1 && successors(members[0]).includes(members[0]);
        if (members.length > 1 || selfEdge) components.push(members.sort());
      }
    }
  }
  return components.sort((left, right) => right.length - left.length || left[0].localeCompare(right[0]));
}
