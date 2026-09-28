#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { isBuiltin } from 'node:module';
import { tmpdir } from 'node:os';
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import {
  classifyModuleReference,
  EVALUATION,
  moduleStringConstants,
  specifierText,
} from './runtime-import-edges.mjs';

const CACHE_VERSION = 6;
export const CACHE_ROOT = '/tmp/dnd-verdict-cache';
const DISABLING_ENVIRONMENT = ['SQL_QUERY_LOG', 'AI_BRIDGE_LIVE'];
/*
 * Variables that key EVERY verdict. A variable a test's JavaScript reads in
 * its worker while that file runs is recorded by the verdict recorder and keys
 * that file's verdict by value (`environmentInputs`). These stay for reads the
 * recorder cannot attribute: native code (TZ, LANG, LC_ALL: time zone and
 * ICU); the Vitest main process, its config and its global setups (CI,
 * NODE_ENV and STATIC_APP_CACHE_DIR among them); and module-scope reads, which
 * a worker running several files (isolate: false) makes for the first only.
 * The recorder's header comment states both attribution limits in full.
 */
const HASHED_ENVIRONMENT = [
  'AI_BRIDGE_FAKE',
  'CI',
  'DND_SQL_TRACE',
  'LANG',
  'LC_ALL',
  'NODE_ENV',
  'SHARE_PROPERTY_SEED',
  'STATIC_APP_CACHE_DIR',
  'TZ',
];
const MODULE_INVENTORY_ROOTS = ['db', 'drizzle', 'scripts', 'src', 'tests', 'tools'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'];
const RESOURCE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.json',
  '.md',
  '.sql',
  '.svg',
  '.txt',
  '.wasm',
]);
const FILE_READ_FUNCTIONS = new Set([
  'access',
  'accessSync',
  'createReadStream',
  'existsSync',
  'lstat',
  'lstatSync',
  'open',
  'openSync',
  'readFile',
  'readFileSync',
  'readdir',
  'readdirSync',
  'realpath',
  'realpathSync',
  'stat',
  'statSync',
]);
const MOCK_MODULE_FUNCTIONS = new Set([
  'doMock',
  'doUnmock',
  'importActual',
  'mock',
  'unmock',
]);
/*
 * Built-ins whose effects happen where the verdict recorder records nothing:
 * the network, and code run in another process or thread (a worker thread has
 * its own node:fs and its own copy of process.env). Named in their node:
 * form; builtinSpecifier maps a bare `child_process` onto it.
 */
const EXTERNAL_EFFECT_MODULES = new Set([
  'node:child_process',
  'node:cluster',
  'node:dgram',
  'node:http',
  'node:http2',
  'node:https',
  'node:net',
  'node:tls',
  'node:worker_threads',
]);

const root = realpathSync(process.cwd());
const runnerPath = fileURLToPath(import.meta.url);

function posixPath(path) {
  return path.split(sep).join('/');
}

function repositoryPath(path) {
  return posixPath(relative(root, path));
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function hashParts(parts) {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(String(Buffer.byteLength(part)));
    hash.update(':');
    hash.update(part);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function scriptKind(path) {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function sourceFile(path, content) {
  return ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(path),
  );
}

function importMetaUrl(node) {
  return ts.isPropertyAccessExpression(node) &&
    node.name.text === 'url' &&
    ts.isMetaProperty(node.expression) &&
    node.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    node.expression.name.text === 'meta';
}

/*
 * WHICH MODULE REFERENCES LOAD A MODULE is not decided here. It is the one
 * runtime-edge definition in scripts/runtime-import-edges.mjs
 * (`classifyModuleReference`), which the import-boundary guard uses too
 * (D919: the verdict cache switched to it when RECORDER-A and IMPORT-GUARD
 * landed together, D932). Both tsconfigs set verbatimModuleSyntax, so only
 * `import type` and `export type ... from` are erased; `import { type A }`
 * loads its module; a glob is `import.meta.glob` (a MetaProperty) called
 * directly; an `import()` names its module in its first argument. What the
 * walker adds is its own: resolution against the file system, and failing
 * closed on what a stored verdict could not see change.
 */

/** The reason a module reference whose target the walker cannot read fails closed, by its syntax. */
const COMPUTED_REFERENCE = Object.freeze({
  import: '<non-literal import>',
  export: '<non-literal export>',
  'import-equals': '<computed import = require>',
  'dynamic-import': '<computed dynamic import>',
  require: '<computed require>',
  'asset-url': '<computed import.meta.url URL>',
});

/** The reason a glob call the classifier cannot read (`glob.unsupported`) fails closed. */
function unsupportedGlobReason(unsupported) {
  switch (unsupported.kind) {
    case 'not-called':
      return '<import.meta.glob not called directly>';
    case 'computed-options':
      return '<computed import.meta.glob options>';
    case 'option':
      return `<unsupported import.meta.glob option ${unsupported.name}>`;
    case 'computed-option':
      return `<computed import.meta.glob option ${unsupported.name}>`;
    default:
      return `<unsupported import.meta.glob: ${String(unsupported.kind)}>`;
  }
}

/** A `new URL(<specifier>, import.meta.url)` expression's specifier text, as the classifier reads it. */
function assetUrlSpecifier(expression, textOf) {
  const reference = classifyModuleReference(expression);
  return reference?.syntax === 'asset-url' ? textOf(reference.specifiers[0]) : undefined;
}

function fileReadSpecifier(expression, textOf) {
  const direct = textOf(expression);
  if (direct !== undefined) return { specifier: direct, relativeToImporter: false };
  const url = assetUrlSpecifier(expression, textOf);
  if (url !== undefined) return { specifier: url, relativeToImporter: true };
  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'fileURLToPath' &&
    expression.arguments.length === 1
  ) {
    const nested = assetUrlSpecifier(expression.arguments[0], textOf);
    if (nested !== undefined) {
      return { specifier: nested, relativeToImporter: true };
    }
  }
  return undefined;
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
    } else if (character === '?') {
      regex += '[^/]';
    } else {
      regex += character.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&');
    }
  }
  return new RegExp(`${regex}$`, 'u');
}

/**
 * Every regular file below `directory`; undefined when a link or special file
 * could hide one. Vite's globber follows a link, and the module inventory
 * lists a link without following it, so a file added behind one changes no
 * salt.
 */
function regularFilesBelow(directory) {
  if (!existsSync(directory)) return [];
  if (realpathSync(directory) !== directory) return undefined;
  if (!statSync(directory).isDirectory()) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const below = regularFilesBelow(path);
      if (below === undefined) return undefined;
      files.push(...below);
    } else if (entry.isFile()) {
      files.push(path);
    } else {
      return undefined;
    }
  }
  return files;
}

// Glob syntax the matcher below does not implement (braces, classes,
// extglobs, escapes), so a pattern using it fails closed.
const UNMATCHED_GLOB_SYNTAX = /[{}[\]()!+@\\]/u;

/**
 * The files one `import.meta.glob` pattern can load, or undefined when the
 * walker cannot say and the call fails closed. A pattern is relative to its
 * importer and uses only `*`, `**` and `?`. Its static base must lie in a
 * MODULE_INVENTORY_ROOTS directory, so a matching file added later changes the
 * global salt. Matching is looser than Vite's (a dotfile matches), which can
 * only add inputs.
 */
function globTargets(importer, pattern) {
  if (!pattern.startsWith('./') && !pattern.startsWith('../')) return undefined;
  if (UNMATCHED_GLOB_SYNTAX.test(pattern)) return undefined;
  const segments = pattern.split('/');
  const firstWildcard = segments.findIndex((segment) => /[*?]/u.test(segment));
  const staticLength = firstWildcard < 0 ? segments.length - 1 : firstWildcard;
  const base = resolve(dirname(importer), ...segments.slice(0, staticLength));
  const inventoried = MODULE_INVENTORY_ROOTS.some((directory) => {
    const inventoryRoot = resolve(root, directory);
    return base === inventoryRoot || base.startsWith(`${inventoryRoot}${sep}`);
  });
  if (!inventoried) return undefined;
  const matcher = globRegex(segments.slice(staticLength).join('/'));
  const files = regularFilesBelow(base);
  if (files === undefined) return undefined;
  return files
    .filter((path) => matcher.test(posixPath(relative(base, path))))
    .sort((left, right) => repositoryPath(left).localeCompare(repositoryPath(right)));
}

/**
 * The files a glob `reference` (classifyModuleReference) can load, pushing a
 * reason to `unresolved` for what the walker cannot follow: a glob not called
 * directly, a computed pattern, and options the classifier cannot read
 * (`glob.unsupported`: `base` moves every pattern, `exhaustive` changes which
 * files match, a computed option could be either). A negative pattern is
 * ignored: it can only remove a file. The options the classifier reads
 * (eager, import, query) change how a match loads, not which files match.
 */
function globCallTargets(importer, reference, textOf, unresolved) {
  if (reference.glob.unsupported?.kind === 'not-called') {
    unresolved.push(unsupportedGlobReason(reference.glob.unsupported));
    return [];
  }
  const patterns = reference.specifiers.map(textOf);
  if (patterns.length === 0 || patterns.some((pattern) => pattern === undefined)) {
    unresolved.push('<computed import.meta.glob>');
    return [];
  }
  if (!reference.glob.supported) {
    unresolved.push(unsupportedGlobReason(reference.glob.unsupported));
    return [];
  }
  const targets = [];
  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue;
    const paths = globTargets(importer, pattern);
    if (paths === undefined) unresolved.push(`<unsupported import.meta.glob ${pattern}>`);
    else targets.push(...paths);
  }
  return targets;
}

/**
 * A Node built-in by its node: name, which the walker compares against: a bare
 * `fs` or `child_process` loads the same module as `node:fs` or
 * `node:child_process`. Any other specifier is returned as it is.
 */
function builtinSpecifier(specifier) {
  return !specifier.startsWith('node:') && isBuiltin(specifier) ? `node:${specifier}` : specifier;
}

function fsBindings(source) {
  const bindings = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    const moduleName = builtinSpecifier(statement.moduleSpecifier.text);
    if (
      !['node:fs', 'node:fs/promises'].includes(moduleName) &&
      !/(?:^|\/)helpers\/test-filesystem(?:-promises)?$/u.test(moduleName)
    ) continue;
    const namedBindings = statement.importClause?.namedBindings;
    if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) continue;
    for (const element of namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text;
      if (FILE_READ_FUNCTIONS.has(imported)) bindings.add(element.name.text);
    }
  }
  return bindings;
}

/** Whether `identifier` names the method a call invokes: `receiver.identifier(...)`. */
function calledAsMethod(identifier) {
  const access = identifier.parent;
  return ts.isPropertyAccessExpression(access) &&
    access.name === identifier &&
    ts.isCallExpression(access.parent) &&
    access.parent.expression === access;
}

/**
 * Whether a `createRequire` is one the walker follows: the plain import
 * binding, or the call in `const require = createRequire(import.meta.url)`,
 * whose require(...) calls the walker follows by name, from the importer's
 * directory as that require resolves them. Any other createRequire returns a
 * loader the walker cannot see.
 */
function followedCreateRequire(identifier) {
  const parent = identifier.parent;
  if (ts.isImportSpecifier(parent)) {
    return parent.name === identifier && parent.propertyName === undefined;
  }
  const callee = ts.isPropertyAccessExpression(parent) && parent.name === identifier
    ? parent
    : identifier;
  const call = callee.parent;
  return ts.isCallExpression(call) &&
    call.expression === callee &&
    call.arguments.length === 1 &&
    importMetaUrl(call.arguments[0]) &&
    ts.isVariableDeclaration(call.parent) &&
    call.parent.initializer === call &&
    ts.isIdentifier(call.parent.name) &&
    call.parent.name.text === 'require';
}

const NO_CONSTANTS = new Map();

function runtimeReferences(path, content) {
  const source = sourceFile(path, content);
  // Module-scope string constants are read only for a file that names a
  // specifier by identifier, as the guard reads them (buildModuleGraph).
  let constants;
  const textOf = (expression) => specifierText(
    expression,
    expression !== undefined && ts.isIdentifier(expression)
      ? (constants ??= moduleStringConstants(source))
      : NO_CONSTANTS,
  );
  const fsReaders = fsBindings(source);
  const specifiers = [];
  const rootRelativeResources = [];
  const globbedPaths = [];
  const unresolved = [];
  const add = (expression, label) => {
    const specifier = textOf(expression);
    if (specifier === undefined) unresolved.push(label);
    else {
      specifiers.push(specifier);
      const builtin = builtinSpecifier(specifier);
      if (EXTERNAL_EFFECT_MODULES.has(builtin)) {
        unresolved.push(`<external behavior via ${builtin}>`);
      }
    }
  };

  const visit = (node) => {
    const reference = classifyModuleReference(node);
    if (reference !== undefined) {
      if (reference.syntax === 'glob') {
        globbedPaths.push(...globCallTargets(path, reference, textOf, unresolved));
      } else if (reference.evaluation !== EVALUATION.ERASED) {
        // Every other reference names its target in its first specifier (an
        // import()'s options, a second argument, are not a file). A type-only
        // one (`import type`, `export type ... from`) loads nothing.
        add(reference.specifiers[0], COMPUTED_REFERENCE[reference.syntax]);
      }
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'getBuiltinModule'
    ) {
      // process.getBuiltinModule loads a built-in without an import form.
      if (node.arguments.length === 0) unresolved.push('<computed process.getBuiltinModule>');
      else add(node.arguments[0], '<computed process.getBuiltinModule>');
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'vi' &&
      MOCK_MODULE_FUNCTIONS.has(node.expression.name.text) &&
      node.arguments.length > 0
    ) {
      add(node.arguments[0], `<computed vi.${node.expression.name.text}>`);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      fsReaders.has(node.expression.text) &&
      node.arguments.length > 0
    ) {
      const input = fileReadSpecifier(node.arguments[0], textOf);
      if (input === undefined) {
        unresolved.push(`<computed filesystem input via ${node.expression.text}>`);
      } else if (input.relativeToImporter) {
        specifiers.push(input.specifier);
      } else if (input.specifier.startsWith('/') || input.specifier.startsWith('.')) {
        unresolved.push(`<filesystem input outside repository convention: ${input.specifier}>`);
      } else {
        rootRelativeResources.push(resolve(root, input.specifier));
      }
    } else if (ts.isIdentifier(node) && node.text === 'getBuiltinModule') {
      if (!calledAsMethod(node)) unresolved.push('<process.getBuiltinModule not called directly>');
    } else if (ts.isIdentifier(node) && node.text === 'createRequire') {
      if (!followedCreateRequire(node)) unresolved.push('<createRequire not bound to require>');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return {
    globbedPaths: [...new Set(globbedPaths)],
    rootRelativeResources: [...new Set(rootRelativeResources)],
    specifiers: [...new Set(specifiers)],
    unresolved: [...new Set(unresolved)],
  };
}

function resolvedLocalReference(importer, rawSpecifier) {
  if (!rawSpecifier.startsWith('.')) return { kind: 'external' };
  const [withoutFragment] = rawSpecifier.split('#');
  const [specifier, query = ''] = withoutFragment.split('?');
  if (specifier === '') return { kind: 'unresolved' };
  const initial = resolve(dirname(importer), specifier);
  if (!initial.startsWith(`${root}${sep}`)) return { kind: 'unresolved' };
  if (existsSync(initial) && statSync(initial).isFile()) {
    return SOURCE_EXTENSIONS.includes(extname(initial))
      ? { kind: 'module', path: initial }
      : { kind: 'resource', path: initial };
  }
  if (query.split('&').some((part) => ['raw', 'url', 'worker'].includes(part))) {
    return existsSync(initial) && statSync(initial).isFile()
      ? { kind: 'resource', path: initial }
      : { kind: 'unresolved' };
  }
  const extension = extname(initial);
  if (RESOURCE_EXTENSIONS.has(extension)) {
    return existsSync(initial) && statSync(initial).isFile()
      ? { kind: 'resource', path: initial }
      : { kind: 'unresolved' };
  }
  const candidates = [];
  if (SOURCE_EXTENSIONS.includes(extension)) {
    candidates.push(initial);
    if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
      candidates.push(initial.slice(0, -extension.length) + '.ts');
      candidates.push(initial.slice(0, -extension.length) + '.tsx');
    }
  } else if (extension !== '') {
    if (existsSync(initial) && statSync(initial).isFile()) {
      return { kind: 'resource', path: initial };
    }
    for (const candidateExtension of SOURCE_EXTENSIONS) {
      candidates.push(initial + candidateExtension);
    }
  } else {
    for (const candidateExtension of SOURCE_EXTENSIONS) {
      candidates.push(initial + candidateExtension);
    }
    for (const candidateExtension of SOURCE_EXTENSIONS) {
      candidates.push(resolve(initial, `index${candidateExtension}`));
    }
  }
  const found = candidates.find((candidate) =>
    existsSync(candidate) && statSync(candidate).isFile());
  return found === undefined
    ? { kind: 'unresolved' }
    : { kind: 'module', path: found };
}

const moduleRecords = new Map();

function readModule(path) {
  const previous = moduleRecords.get(path);
  if (previous !== undefined) return previous;
  const content = readFileSync(path, 'utf8');
  const references = runtimeReferences(path, content);
  const hasFilesystemBindings = fsBindings(sourceFile(path, content)).size > 0;
  const unresolvedReferences = references.unresolved.filter((reason) =>
    !reason.startsWith('<computed filesystem input') &&
    !(hasFilesystemBindings && reason === '<computed import.meta.url URL>'));
  // These readers consume content-addressed performance caches whose own keys
  // bind every semantic input and whose sidecar hashes reject corrupt bytes.
  // Their filesystem path/content affects speed, not the resulting assertions.
  const record = {
    content,
    dependencies: [],
    resources: [],
    unresolved: unresolvedReferences.map((reason) =>
      `${repositoryPath(path)} -> ${reason}`),
  };
  // Vite loads a module by its real path and resolves its imports from there,
  // and a file added behind a linked directory changes no inventory entry.
  if (realpathSync(path) !== path) {
    record.unresolved.push(`${repositoryPath(path)} -> <module reached through a symbolic link>`);
  }
  moduleRecords.set(path, record);
  for (const specifier of references.specifiers) {
    const resolved = resolvedLocalReference(path, specifier);
    if (resolved.kind === 'module') record.dependencies.push(resolved.path);
    else if (resolved.kind === 'resource') record.resources.push(resolved.path);
    else if (resolved.kind === 'unresolved') {
      const candidate = specifier.startsWith('.')
        ? resolve(dirname(path), specifier.split(/[?#]/u, 1)[0])
        : undefined;
      if (candidate === undefined || !existsSync(candidate) || !statSync(candidate).isDirectory()) {
        record.unresolved.push(`${repositoryPath(path)} -> ${specifier}`);
      }
    }
  }
  for (const dependency of references.globbedPaths) {
    if (SOURCE_EXTENSIONS.includes(extname(dependency))) record.dependencies.push(dependency);
    else record.resources.push(dependency);
  }
  for (const resource of references.rootRelativeResources) {
    if (existsSync(resource) && statSync(resource).isFile()) record.resources.push(resource);
    else record.unresolved.push(`${repositoryPath(path)} -> ${repositoryPath(resource)}`);
  }
  record.dependencies = [...new Set(record.dependencies)];
  record.resources = [...new Set(record.resources)];
  return record;
}

export function buildClosure(testFile) {
  const pending = [testFile];
  const visited = new Set();
  const resources = new Set();
  const unresolved = [];
  while (pending.length > 0) {
    const path = pending.pop();
    if (visited.has(path)) continue;
    visited.add(path);
    const record = readModule(path);
    unresolved.push(...record.unresolved);
    for (const resource of record.resources) resources.add(resource);
    pending.push(...record.dependencies);
  }
  visited.delete(testFile);
  return {
    closure: [...visited, ...resources]
      .map(repositoryPath)
      .sort((left, right) => left.localeCompare(right)),
    unresolved: [...new Set(unresolved)].sort(),
  };
}

/**
 * The module-path inventory below `directories`, which keys the global salt:
 * every entry that is not a directory, by kind, and a symbolic link with its
 * target. A file or link added anywhere below changes it, so a stored verdict
 * is not reused after a path appears that a glob or a resolution could reach.
 * A link is listed, not followed: a glob over one (regularFilesBelow) and a
 * module reached through one (readModule) fail closed.
 */
export function moduleInventory(directories) {
  const entries = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else entries.push(inventoryEntry(entry, path));
    }
  };
  for (const directory of directories) {
    if (existsSync(directory)) visit(directory);
  }
  return hashParts(entries.map((entry) => JSON.stringify(entry)).sort());
}

function inventoryEntry(entry, path) {
  const name = repositoryPath(path);
  if (entry.isSymbolicLink()) return ['link', name, readlinkSync(path)];
  return [entry.isFile() ? 'file' : 'special', name];
}

export function globalSalt() {
  const inventory = moduleInventory(
    MODULE_INVENTORY_ROOTS.map((directory) => resolve(root, directory)),
  );
  return hashParts([
    `cache-version=${CACHE_VERSION}`,
    `node=${process.version}`,
    `platform=${process.platform}-${process.arch}`,
    `runner=${sha256(readFileSync(runnerPath))}`,
    `recorder=${sha256(readFileSync(resolve(root, 'tests/helpers/verdict-fs-recorder-setup.mjs')))}`,
    `vitest.config.ts=${sha256(readFileSync(resolve(root, 'vitest.config.ts')))}`,
    `package.json=${sha256(readFileSync(resolve(root, 'package.json')))}`,
    `package-lock.json=${sha256(readFileSync(resolve(root, 'package-lock.json')))}`,
    `module-inventory=${inventory}`,
    ...HASHED_ENVIRONMENT.map((name) => `${name}=${process.env[name] ?? '<unset>'}`),
  ]);
}

function directoryState(directory, recursive) {
  const parts = [];
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const child = resolve(path, entry.name);
      const name = posixPath(relative(directory, child));
      if (entry.isDirectory()) {
        parts.push(`directory=${name}`);
        if (recursive && entry.name !== 'node_modules') visit(child);
      } else if (entry.isFile()) {
        parts.push(`file=${name}`);
      } else {
        parts.push(`special=${name}`);
      }
    }
  };
  visit(directory);
  return hashParts(parts);
}

function observedInputState(observation) {
  const separator = observation.indexOf(':');
  if (separator < 0) return undefined;
  const kind = observation.slice(0, separator);
  const name = observation.slice(separator + 1);
  const path = resolve(root, name);
  if (path !== root && !path.startsWith(`${root}${sep}`)) return undefined;
  if (!existsSync(path)) return '<missing>';
  const stats = statSync(path);
  if (stats.isFile()) {
    return hashParts([
      'file',
      `mode=${stats.mode}`,
      `sha256=${sha256(readFileSync(path))}`,
    ]);
  }
  if (stats.isDirectory()) {
    if (kind === 'directory' || kind === 'directory-tree') {
      return hashParts([
        kind,
        `mode=${stats.mode}`,
        `listing=${directoryState(path, kind === 'directory-tree')}`,
      ]);
    }
    return hashParts([
      'directory',
      `mode=${stats.mode}`,
    ]);
  }
  return undefined;
}

/** One variable as it keys a verdict: its value in this process, or its absence. */
function environmentState(name) {
  const value = process.env[name];
  return value === undefined ? 'unset' : `set=${value}`;
}

function verdictDigest(testFile, closure, observedInputs, declaredInputs, environmentInputs, salt) {
  const parts = [
    `test=${repositoryPath(testFile)}`,
    `test-sha256=${sha256(readFileSync(testFile))}`,
    `global=${salt}`,
  ];
  for (const name of closure) {
    const path = resolve(root, name);
    if (!existsSync(path) || !statSync(path).isFile()) return undefined;
    parts.push(`module=${name}`, `sha256=${sha256(readFileSync(path))}`);
  }
  for (const name of observedInputs) {
    const state = observedInputState(name);
    if (state === undefined) return undefined;
    parts.push(`observed-input=${name}`, `state=${state}`);
  }
  for (const name of declaredInputs) {
    const state = observedInputState(name);
    if (state === undefined) return undefined;
    parts.push(`declared-input=${name}`, `state=${state}`);
  }
  for (const name of environmentInputs) {
    parts.push(`environment-input=${name}`, `state=${environmentState(name)}`);
  }
  return hashParts(parts);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function entryPath(cacheRoot, digest) {
  return join(cacheRoot, 'entries', `${digest}.json`);
}

function pointerPath(cacheRoot, testFile) {
  return join(cacheRoot, 'tests', `${sha256(repositoryPath(testFile))}.json`);
}

function validEntry(value, testFile, digest, closure) {
  return value !== null &&
    typeof value === 'object' &&
    value.version === CACHE_VERSION &&
    value.testFile === repositoryPath(testFile) &&
    value.digest === digest &&
    Number.isInteger(value.testCount) &&
    value.testCount > 0 &&
    typeof value.recordedAt === 'string' &&
    Array.isArray(value.closure) &&
    value.closure.every((item) => typeof item === 'string') &&
    Array.isArray(value.observedInputs) &&
    value.observedInputs.every((item) => typeof item === 'string') &&
    Array.isArray(value.declaredInputs) &&
    value.declaredInputs.every((item) => typeof item === 'string') &&
    Array.isArray(value.environmentInputs) &&
    value.environmentInputs.every((item) => typeof item === 'string') &&
    (closure === undefined || (
      value.closure.length === closure.length &&
      value.closure.every((item, index) => item === closure[index])
    ));
}

function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${Math.random().toString(16).slice(2)}.partial`;
  writeFileSync(temporary, `${JSON.stringify(value)}\n`, 'utf8');
  renameSync(temporary, path);
}

/** The green verdict stored for `testFile` in `cacheRoot`, when every input it was keyed on is unchanged. */
export function cachedVerdict(testFile, salt, cacheRoot) {
  const pointer = readJson(pointerPath(cacheRoot, testFile));
  if (
    pointer === null ||
    typeof pointer !== 'object' ||
    pointer.testFile !== repositoryPath(testFile) ||
    typeof pointer.digest !== 'string'
  ) return undefined;
  const entry = readJson(entryPath(cacheRoot, pointer.digest));
  if (!validEntry(entry, testFile, pointer.digest, undefined)) return undefined;

  // Self-healing invariant: reading a different path requires either a code
  // change in the saved closure or changed data content in observedInputs. The
  // former forces a recording run; the latter is hashed directly here. The
  // module-path inventory separately covers a newly resolvable path or glob.
  const currentDigest = verdictDigest(
    testFile,
    entry.closure,
    entry.observedInputs,
    entry.declaredInputs,
    entry.environmentInputs,
    salt,
  );
  return currentDigest === pointer.digest ? entry : undefined;
}

/**
 * Stores a green verdict for `testFile` in `cacheRoot`, keyed on its closure
 * (`graph`), the recorder's observation `record` and the global salt. Returns
 * the digest, or undefined when an observed input cannot be hashed.
 */
export function storeVerdict({ testFile, graph, record, testCount, salt, cacheRoot }) {
  const declaredInputs = record.declaredInputs ?? [];
  const digest = verdictDigest(
    testFile,
    graph.closure,
    record.observedInputs,
    declaredInputs,
    record.environmentInputs,
    salt,
  );
  if (digest === undefined) return undefined;
  const entry = {
    version: CACHE_VERSION,
    testFile: repositoryPath(testFile),
    digest,
    closure: graph.closure,
    observedInputs: record.observedInputs,
    declaredInputs,
    environmentInputs: record.environmentInputs,
    testCount,
    recordedAt: new Date().toISOString(),
  };
  atomicJson(entryPath(cacheRoot, digest), entry);
  atomicJson(pointerPath(cacheRoot, testFile), { testFile: entry.testFile, digest });
  return digest;
}

/** The recorder's observation record (verdict-fs-recorder-setup.mjs) when it is well formed; else undefined. */
export function observationRecord(record) {
  return record !== null &&
    typeof record === 'object' &&
    record.version === 2 &&
    typeof record.testFile === 'string' &&
    Array.isArray(record.observedInputs) &&
    record.observedInputs.every((item) => typeof item === 'string') &&
    Array.isArray(record.externalInputs) &&
    record.externalInputs.every((item) => typeof item === 'string') &&
    Array.isArray(record.environmentInputs) &&
    record.environmentInputs.every((item) => typeof item === 'string') &&
    typeof record.environmentEnumerated === 'boolean' &&
    (record.declaredInputs === undefined || (
      Array.isArray(record.declaredInputs) &&
      record.declaredInputs.every((item) => typeof item === 'string')
    ))
    ? record
    : undefined;
}

/**
 * Why a file's verdict may not be stored even when it passed; empty when it
 * may. A file that enumerated process.env read every variable, and no subset
 * of them can key its verdict.
 */
export function failClosedReasons(graph, record) {
  return [
    ...(graph?.unresolved ?? []),
    ...(record?.externalInputs ?? ['<filesystem observation missing>']),
    ...(record?.environmentEnumerated === true ? ['<process.env enumerated>'] : []),
  ];
}

function testFiles() {
  const includeLive = process.env.AI_BRIDGE_LIVE === '1';
  return filesBelow(resolve(root, 'tests'))
    .filter((path) =>
      path.endsWith('.test.ts') || (includeLive && path.endsWith('.live-test.ts')))
    .sort((left, right) => repositoryPath(left).localeCompare(repositoryPath(right)));
}

function runVitest(files) {
  const reportDirectory = mkdtempSync(join(tmpdir(), 'dnd-verdict-report-'));
  const reportPath = join(reportDirectory, 'vitest.json');
  const observationsDirectory = mkdtempSync(join(tmpdir(), 'dnd-verdict-observations-'));
  const vitest = resolve(root, 'node_modules/vitest/vitest.mjs');
  const result = spawnSync(
    process.execPath,
    [
      vitest,
      'run',
      '--configLoader',
      'runner',
      '--reporter=default',
      '--reporter=json',
      `--outputFile.json=${reportPath}`,
      ...files.map(repositoryPath),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        VERDICT_FS_OBSERVATIONS_DIR: observationsDirectory,
        VERDICT_REPOSITORY_ROOT: root,
      },
      stdio: 'inherit',
    },
  );
  const report = readJson(reportPath);
  const observations = new Map();
  for (const path of filesBelow(observationsDirectory)) {
    const record = observationRecord(readJson(path));
    if (record !== undefined) observations.set(record.testFile, record);
  }
  rmSync(reportDirectory, { recursive: true, force: true });
  rmSync(observationsDirectory, { recursive: true, force: true });
  return { status: result.status ?? 1, report, observations };
}

function main() {
  const startedAt = performance.now();
  const files = testFiles();
  const disabledBy = DISABLING_ENVIRONMENT.filter((name) => process.env[name] !== undefined);
  const cacheEnabled = disabledBy.length === 0;
  const salt = globalSalt();
  const cached = [];
  const pending = [];
  const prepared = new Map();
  let uncacheable = 0;
  const uncacheableReasons = new Map();

  for (const testFile of files) {
    if (cacheEnabled && cachedVerdict(testFile, salt, CACHE_ROOT) !== undefined) {
      cached.push(testFile);
      continue;
    }
    const graph = buildClosure(testFile);
    const cacheable = graph.unresolved.length === 0;
    if (!cacheable) {
      uncacheable += 1;
      for (const reason of graph.unresolved) {
        uncacheableReasons.set(reason, (uncacheableReasons.get(reason) ?? 0) + 1);
      }
    }
    prepared.set(repositoryPath(testFile), { ...graph, cacheable });
    pending.push(testFile);
  }

  console.log(`${cached.length} cached-green skipped / ${pending.length} to run`);
  if (!cacheEnabled) {
    console.log(`verdict reuse disabled: ${disabledBy.join(', ')} is set`);
  } else if (uncacheable > 0) {
    console.log(`${uncacheable} test file(s) are fail-closed on unresolved runtime inputs`);
    if (process.env.VERDICT_CACHE_DEBUG === '1') {
      for (const [reason, count] of [...uncacheableReasons.entries()]
        .sort((left, right) => right[1] - left[1])) {
        console.log(`${count}x ${reason}`);
      }
    }
  }
  if (pending.length === 0) {
    console.log(`affected run completed in ${((performance.now() - startedAt) / 1000).toFixed(2)}s`);
    return;
  }

  const { status, report, observations } = runVitest(pending);
  const failClosedByFile = new Map();
  if (cacheEnabled && report !== undefined && Array.isArray(report.testResults)) {
    for (const result of report.testResults) {
      const testFile = realpathSync(result.name);
      const name = repositoryPath(testFile);
      const graph = prepared.get(name);
      const assertions = Array.isArray(result.assertionResults) ? result.assertionResults : [];
      const passed = result.status === 'passed' &&
        assertions.length > 0 &&
        assertions.every((assertion) => assertion.status === 'passed');
      const observation = observations.get(name);
      const reasons = failClosedReasons(graph, observation);
      if (reasons.length > 0) failClosedByFile.set(name, reasons);
      if (graph?.cacheable === true && observation !== undefined && reasons.length === 0 && passed) {
        const digest = storeVerdict({
          testFile,
          graph,
          record: observation,
          testCount: assertions.length,
          salt,
          cacheRoot: CACHE_ROOT,
        });
        if (digest === undefined) {
          failClosedByFile.set(name, ['<observed repository input could not be hashed>']);
        }
      }
    }
  }
  if (cacheEnabled && failClosedByFile.size > 0) {
    console.log(`${failClosedByFile.size} test file(s) remain fail-closed after observation`);
    if (process.env.VERDICT_CACHE_DEBUG === '1') {
      for (const [name, reasons] of [...failClosedByFile.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))) {
        console.log(`${name} -> ${reasons.join('; ')}`);
      }
    }
  }
  console.log(`affected run completed in ${((performance.now() - startedAt) / 1000).toFixed(2)}s`);
  process.exitCode = status;
}

/** True when node runs this file itself; the verdict cache's own tests import it without running it. */
function invokedDirectly() {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(process.argv[1]) === runnerPath;
  } catch {
    return false;
  }
}

if (invokedDirectly()) main();
