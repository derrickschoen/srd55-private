#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
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

const CACHE_VERSION = 5;
const CACHE_ROOT = '/tmp/dnd-verdict-cache';
const DISABLING_ENVIRONMENT = ['SQL_QUERY_LOG', 'AI_BRIDGE_LIVE'];
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
const EXTERNAL_EFFECT_MODULES = new Set([
  'node:child_process',
  'node:dgram',
  'node:http',
  'node:http2',
  'node:https',
  'node:net',
  'node:tls',
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

function constantStrings(source) {
  const values = new Map();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer !== undefined &&
        ts.isStringLiteralLike(declaration.initializer)
      ) {
        values.set(declaration.name.text, declaration.initializer.text);
      }
    }
  }
  return values;
}

function literalText(expression, constants) {
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isIdentifier(expression)) return constants.get(expression.text);
  return undefined;
}

function importMetaUrl(node) {
  return ts.isPropertyAccessExpression(node) &&
    node.name.text === 'url' &&
    ts.isMetaProperty(node.expression) &&
    node.expression.keywordToken === ts.SyntaxKind.ImportKeyword;
}

function newUrlSpecifier(expression, constants) {
  if (
    !ts.isNewExpression(expression) ||
    !ts.isIdentifier(expression.expression) ||
    expression.expression.text !== 'URL' ||
    expression.arguments?.length !== 2 ||
    !importMetaUrl(expression.arguments[1])
  ) return undefined;
  return literalText(expression.arguments[0], constants);
}

function fileReadSpecifier(expression, constants) {
  const direct = literalText(expression, constants);
  if (direct !== undefined) return { specifier: direct, relativeToImporter: false };
  const url = newUrlSpecifier(expression, constants);
  if (url !== undefined) return { specifier: url, relativeToImporter: true };
  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'fileURLToPath' &&
    expression.arguments.length === 1
  ) {
    const nested = newUrlSpecifier(expression.arguments[0], constants);
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

function expandGlob(importer, pattern) {
  if (!pattern.startsWith('.')) return undefined;
  const base = dirname(importer);
  const matcher = globRegex(posixPath(pattern));
  return filesBelow(base)
    .filter((path) => matcher.test(`./${posixPath(relative(base, path))}`))
    .sort((left, right) => repositoryPath(left).localeCompare(repositoryPath(right)));
}

function fsBindings(source) {
  const bindings = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    const moduleName = statement.moduleSpecifier.text;
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

function runtimeReferences(path, content) {
  const source = sourceFile(path, content);
  const constants = constantStrings(source);
  const fsReaders = fsBindings(source);
  const specifiers = [];
  const rootRelativeResources = [];
  const globbedPaths = [];
  const unresolved = [];
  const add = (expression, label) => {
    const specifier = literalText(expression, constants);
    if (specifier === undefined) unresolved.push(label);
    else {
      specifiers.push(specifier);
      if (EXTERNAL_EFFECT_MODULES.has(specifier)) {
        unresolved.push(`<external behavior via ${specifier}>`);
      }
    }
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const allNamedBindingsAreTypes =
        clause?.namedBindings !== undefined &&
        ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.length > 0 &&
        clause.namedBindings.elements.every((element) => element.isTypeOnly);
      if (clause?.isTypeOnly !== true && !allNamedBindingsAreTypes) {
        add(node.moduleSpecifier, '<non-literal import>');
      }
    } else if (ts.isExportDeclaration(node)) {
      if (!node.isTypeOnly && node.moduleSpecifier !== undefined) {
        add(node.moduleSpecifier, '<non-literal export>');
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      add(node.arguments[0], '<computed dynamic import>');
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length === 1
    ) {
      add(node.arguments[0], '<computed require>');
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
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'glob' &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      ts.isMetaProperty(node.expression.expression.expression)
    ) {
      const patterns = node.arguments.length === 0
        ? []
        : ts.isArrayLiteralExpression(node.arguments[0])
          ? node.arguments[0].elements.map((element) => literalText(element, constants))
          : [literalText(node.arguments[0], constants)];
      if (patterns.length === 0 || patterns.some((pattern) => pattern === undefined)) {
        unresolved.push('<computed import.meta.glob>');
      } else {
        for (const pattern of patterns) {
          const paths = expandGlob(path, pattern);
          if (paths === undefined) unresolved.push(`<unsupported import.meta.glob ${pattern}>`);
          else globbedPaths.push(...paths);
        }
      }
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'URL' &&
      node.arguments?.length === 2 &&
      importMetaUrl(node.arguments[1])
    ) {
      add(node.arguments[0], '<computed import.meta.url URL>');
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      fsReaders.has(node.expression.text) &&
      node.arguments.length > 0
    ) {
      const input = fileReadSpecifier(node.arguments[0], constants);
      if (input === undefined) {
        unresolved.push(`<computed filesystem input via ${node.expression.text}>`);
      } else if (input.relativeToImporter) {
        specifiers.push(input.specifier);
      } else if (input.specifier.startsWith('/') || input.specifier.startsWith('.')) {
        unresolved.push(`<filesystem input outside repository convention: ${input.specifier}>`);
      } else {
        rootRelativeResources.push(resolve(root, input.specifier));
      }
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

function buildClosure(testFile) {
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

function globalSalt() {
  const inventory = MODULE_INVENTORY_ROOTS
    .flatMap((directory) => filesBelow(resolve(root, directory)))
    .map(repositoryPath)
    .sort();
  return hashParts([
    `cache-version=${CACHE_VERSION}`,
    `node=${process.version}`,
    `platform=${process.platform}-${process.arch}`,
    `runner=${sha256(readFileSync(runnerPath))}`,
    `recorder=${sha256(readFileSync(resolve(root, 'tests/helpers/verdict-fs-recorder-setup.mjs')))}`,
    `vitest.config.ts=${sha256(readFileSync(resolve(root, 'vitest.config.ts')))}`,
    `package.json=${sha256(readFileSync(resolve(root, 'package.json')))}`,
    `package-lock.json=${sha256(readFileSync(resolve(root, 'package-lock.json')))}`,
    `module-inventory=${hashParts(inventory)}`,
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

function verdictDigest(testFile, closure, observedInputs, declaredInputs, salt) {
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
  return hashParts(parts);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function entryPath(digest) {
  return join(CACHE_ROOT, 'entries', `${digest}.json`);
}

function pointerPath(testFile) {
  return join(CACHE_ROOT, 'tests', `${sha256(repositoryPath(testFile))}.json`);
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

function cachedVerdict(testFile, salt) {
  const pointer = readJson(pointerPath(testFile));
  if (
    pointer === null ||
    typeof pointer !== 'object' ||
    pointer.testFile !== repositoryPath(testFile) ||
    typeof pointer.digest !== 'string'
  ) return undefined;
  const entry = readJson(entryPath(pointer.digest));
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
    salt,
  );
  return currentDigest === pointer.digest ? entry : undefined;
}

function storeVerdict(
  testFile,
  closure,
  observedInputs,
  declaredInputs,
  digest,
  testCount,
) {
  const entry = {
    version: CACHE_VERSION,
    testFile: repositoryPath(testFile),
    digest,
    closure,
    observedInputs,
    declaredInputs,
    testCount,
    recordedAt: new Date().toISOString(),
  };
  atomicJson(entryPath(digest), entry);
  atomicJson(pointerPath(testFile), { testFile: entry.testFile, digest });
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
    const record = readJson(path);
    if (
      record !== null &&
      typeof record === 'object' &&
      record.version === 1 &&
      typeof record.testFile === 'string' &&
      Array.isArray(record.observedInputs) &&
      record.observedInputs.every((item) => typeof item === 'string') &&
      Array.isArray(record.externalInputs) &&
      record.externalInputs.every((item) => typeof item === 'string') &&
      (record.declaredInputs === undefined || (
        Array.isArray(record.declaredInputs) &&
        record.declaredInputs.every((item) => typeof item === 'string')
      ))
    ) {
      observations.set(record.testFile, record);
    }
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
    if (cacheEnabled && cachedVerdict(testFile, salt) !== undefined) {
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
      const reasons = [
        ...(graph?.unresolved ?? []),
        ...(observation?.externalInputs ?? ['<filesystem observation missing>']),
      ];
      if (reasons.length > 0) failClosedByFile.set(name, reasons);
      if (graph?.cacheable === true && observation !== undefined && reasons.length === 0 && passed) {
        const declaredInputs = observation.declaredInputs ?? [];
        const digest = verdictDigest(
          testFile,
          graph.closure,
          observation.observedInputs,
          declaredInputs,
          salt,
        );
        if (digest === undefined) {
          failClosedByFile.set(name, ['<observed repository input could not be hashed>']);
        } else {
          storeVerdict(
            testFile,
            graph.closure,
            observation.observedInputs,
            declaredInputs,
            digest,
            assertions.length,
          );
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

main();
