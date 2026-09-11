import { builtinModules, createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeSync } from 'node:fs';
import { dirname, extname, posix, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const PROTOCOL = 'heldout-runtime-v1';
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
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
const BUILTINS = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const workRequire = createRequire('/work/package.json');

function readInput(limit) {
  return new Promise((resolveInput, rejectInput) => {
    let text = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      text += chunk;
      if (text.length > limit) rejectInput(new TypeError('request_too_large'));
    });
    process.stdin.on('end', () => resolveInput(text));
    process.stdin.on('error', rejectInput);
  });
}

function stringProperty(value, key) {
  if (value === null || typeof value !== 'object') return null;
  const member = Reflect.get(value, key);
  return typeof member === 'string' ? member : null;
}

function stringArray(value, key) {
  if (value === null || typeof value !== 'object') return null;
  const member = Reflect.get(value, key);
  return Array.isArray(member) && member.every((item) => typeof item === 'string') ? member : null;
}

function parseRequest(text) {
  const value = JSON.parse(text);
  if (stringProperty(value, 'protocol') !== PROTOCOL) throw new TypeError('invalid_protocol');
  const slice = stringProperty(value, 'slice');
  const phaseTimeoutMs = value !== null && typeof value === 'object'
    ? Reflect.get(value, 'phaseTimeoutMs')
    : null;
  const bindings = value !== null && typeof value === 'object' ? Reflect.get(value, 'bindings') : null;
  const valueEdges = value !== null && typeof value === 'object' ? Reflect.get(value, 'valueEdges') : null;
  const trustedLockDigest = stringProperty(value, 'trustedLockDigest');
  const reserveDigests = stringArray(bindings, 'reserveDigests');
  const resultPaths = stringArray(bindings, 'resultPaths');
  if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(slice) ||
    typeof phaseTimeoutMs !== 'number' || !Number.isSafeInteger(phaseTimeoutMs) ||
    phaseTimeoutMs < 1 || phaseTimeoutMs > 30_000 || reserveDigests === null || resultPaths === null ||
    trustedLockDigest === null || !/^[a-f0-9]{64}$/u.test(trustedLockDigest) ||
    valueEdges === null || typeof valueEdges !== 'object' || Array.isArray(valueEdges) ||
    !Object.entries(valueEdges).every(([path, edges]) => typeof path === 'string' && Array.isArray(edges) &&
      edges.every((edge) => edge !== null && typeof edge === 'object' &&
        typeof Reflect.get(edge, 'kind') === 'string' &&
        (typeof Reflect.get(edge, 'specifier') === 'string' || Reflect.get(edge, 'specifier') === null)))) {
    throw new TypeError('invalid_request');
  }
  return { slice, phaseTimeoutMs, trustedLockDigest, valueEdges, bindings: { reserveDigests, resultPaths } };
}

function withTimeout(promise, milliseconds, label) {
  let timer;
  const timeout = new Promise((_, rejectTimeout) => {
    timer = setTimeout(() => rejectTimeout(new TypeError(`phase_timeout:${label}`)), milliseconds);
    timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function walk(directory, prefix = '') {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name))) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
    const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, relative));
    else files.push(relative);
  }
  return files;
}

function sourceSeeds() {
  return walk('/work').filter((path) =>
    (path.startsWith('src/') || path.startsWith('tools/')) &&
    SOURCE_EXTENSIONS.has(extname(path)) && !/\.d\.(?:ts|mts|cts)$/u.test(path) &&
    !EVALUATION_FILES.has(path)).sort();
}

function rootConfigs() {
  return readdirSync('/work', { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name)
    .filter((name) => /^(?:vite|vitest)(?:\.[^.]+)*\.config\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(name))
    .sort();
}

function scriptKind(ts, path) {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.jsx') || path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function constantString(ts, expression) {
  if (expression === undefined) return null;
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) || ts.isNonNullExpression(expression) ||
    ts.isTypeAssertionExpression(expression)) return constantString(ts, expression.expression);
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = constantString(ts, expression.left);
    const right = constantString(ts, expression.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      const substitution = constantString(ts, span.expression);
      if (substitution === null) return null;
      value += substitution + span.literal.text;
    }
    return value;
  }
  return null;
}

function runtimeEdges(ts, path, source) {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(ts, path));
  const edges = [];
  const add = (specifier, kind = 'static_import') => edges.push({ specifier, kind });
  const addRuntimeUrl = (specifier) => {
    if (specifier === null) return;
    const target = resolve(dirname(withoutQuery(path)), withoutQuery(specifier));
    try {
      if (statSync(target).isDirectory()) return;
    } catch {
      // Missing URL-backed files must reach resolution and fail closed.
    }
    add(specifier, 'static_import');
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const valueBinding = clause === undefined || (!clause.isTypeOnly && (
        clause.name !== undefined || clause.namedBindings === undefined ||
        ts.isNamespaceImport(clause.namedBindings) ||
        clause.namedBindings.elements.some((element) => !element.isTypeOnly)
      ));
      if (valueBinding) add(constantString(ts, node.moduleSpecifier), 'static_import');
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && !node.isTypeOnly) {
      const valueExport = node.exportClause === undefined || ts.isNamespaceExport(node.exportClause) ||
        node.exportClause.elements.some((element) => !element.isTypeOnly);
      if (valueExport) add(constantString(ts, node.moduleSpecifier), 're_export');
    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference)) {
      add(constantString(ts, node.moduleReference.expression), 'import_equals');
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(constantString(ts, node.arguments[0]), 'dynamic_import');
      else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
        add(constantString(ts, node.arguments[0]), 'require');
      } else if (ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'require' &&
        node.expression.name.text === 'resolve') {
        add(constantString(ts, node.arguments[0]), 'require_resolve');
      } else if (ts.isPropertyAccessExpression(node.expression) &&
        ts.isMetaProperty(node.expression.expression) && node.expression.expression.name.text === 'meta' &&
        node.expression.name.text === 'resolve') {
        add(constantString(ts, node.arguments[0]), 'import_meta_resolve');
      }
      else if (ts.isIdentifier(node.expression) && node.expression.text === 'importScripts') {
        for (const argument of node.arguments) add(constantString(ts, argument), 'import_scripts');
      }
    } else if (ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) && node.expression.text === 'URL' &&
      node.arguments?.[1] !== undefined && ts.isPropertyAccessExpression(node.arguments[1]) &&
      ts.isMetaProperty(node.arguments[1].expression) &&
      node.arguments[1].expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
      node.arguments[1].expression.name.text === 'meta' && node.arguments[1].name.text === 'url') {
      addRuntimeUrl(constantString(ts, node.arguments[0]));
    } else if (ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) && ['Worker', 'SharedWorker'].includes(node.expression.text)) {
      const first = node.arguments?.[0];
      if (first !== undefined && ts.isNewExpression(first) && ts.isIdentifier(first.expression) &&
        first.expression.text === 'URL') add(constantString(ts, first.arguments?.[0]),
          node.expression.text === 'Worker' ? 'worker' : 'shared_worker');
      else add(constantString(ts, first), node.expression.text === 'Worker' ? 'worker' : 'shared_worker');
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return edges;
}

function unboundedRootGlobPatterns(ts, path, source) {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(ts, path));
  const patterns = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'glob' && ts.isMetaProperty(node.expression.expression) &&
      node.expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
      node.expression.expression.name.text === 'meta') {
      const argument = node.arguments[0];
      const values = argument !== undefined && ts.isArrayLiteralExpression(argument)
        ? argument.elements.map((element) => constantString(ts, element))
        : [constantString(ts, argument)];
      for (const value of values) {
        const positive = value?.startsWith('!') === true ? value.slice(1) : value;
        if (positive?.startsWith('**') === true) patterns.push(value ?? positive);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return patterns;
}

function withoutQuery(id) {
  const query = id.indexOf('?');
  const fragment = id.indexOf('#');
  const indexes = [query, fragment].filter((index) => index >= 0);
  return indexes.length === 0 ? id : id.slice(0, Math.min(...indexes));
}

function canonicalId(id) {
  if (id === null) return null;
  let value = id;
  if (value.startsWith('file:')) {
    try {
      const url = new URL(value);
      value = `${fileURLToPath(url)}${url.search}${url.hash}`;
    } catch {
      return value;
    }
  }
  return value.replaceAll('/work/', '<candidate>/').replace(/^\/work$/u, '<candidate>');
}

function canonicalFilesystemIdentity(id) {
  const bare = withoutQuery(id);
  const suffix = id.slice(bare.length);
  let path = bare;
  if (path.startsWith('file:')) {
    try {
      path = fileURLToPath(path);
    } catch {
      return id;
    }
  }
  if (!path.startsWith('/')) return id;
  try {
    return `${realpathSync(path)}${suffix}`;
  } catch {
    return id;
  }
}

function decodedViteInternalId(id) {
  if (id.startsWith('/@id/__x00__')) return `\0${id.slice('/@id/__x00__'.length)}`;
  if (id.startsWith('/@id/')) return id.slice('/@id/'.length);
  return null;
}

function digestMatches(path, reserveDigests) {
  if (!existsSync(path)) return false;
  try {
    const bytes = readFileSync(path);
    const hash = createHash('sha256').update(bytes).digest('hex');
    return reserveDigests.includes(hash) || reserveDigests.some((digest) => bytes.includes(Buffer.from(digest)));
  } catch {
    return false;
  }
}

function textContainsReserveDigest(text, reserveDigests) {
  const normalized = text.toLowerCase();
  return reserveDigests.some((digest) => normalized.includes(digest.toLowerCase()));
}

function protectedIdentity(id, bindings) {
  const canonical = withoutQuery(id);
  let path = canonical;
  if (path.startsWith('file:')) {
    try {
      path = fileURLToPath(path);
    } catch {
      return true;
    }
  }
  const normalized = path.split(sep).join('/');
  if (normalized === '/work/src/vtt/heldout-evaluation.ts' ||
    normalized.endsWith('/src/vtt/heldout-evaluation.ts') ||
    bindings.resultPaths.some((resultPath) => normalized.startsWith(resultPath))) return true;
  return normalized.startsWith('/work/') && digestMatches(normalized, bindings.reserveDigests);
}

function barePackageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/', 1)[0] ?? '';
}

function hasPackageProvenance(path, nodeModulesRoot) {
  let current = path;
  while (current.startsWith(`${nodeModulesRoot}${sep}`)) {
    if (existsSync(resolve(current, 'package.json'))) return true;
    const parent = resolve(current, '..');
    if (parent === current) break;
    current = parent;
  }
  return false;
}

function builtinSpecifier(specifier) {
  const browserExternalPrefix = '/@id/__vite-browser-external:';
  return BUILTINS.has(specifier) ||
    specifier.startsWith(browserExternalPrefix) && BUILTINS.has(specifier.slice(browserExternalPrefix.length));
}

function externalBoundary(specifier, canonicalIdentity, external) {
  const id = canonicalIdentity;
  if (builtinSpecifier(id) || (id === specifier && builtinSpecifier(specifier))) {
    return { status: 'external_builtin', canonical: id };
  }
  let resolved = id;
  try {
    if (external === true && !resolved.startsWith('/')) resolved = workRequire.resolve(specifier);
    resolved = realpathSync(withoutQuery(resolved));
  } catch {
    return null;
  }
  const nodeModulesRoot = realpathSync('/work/node_modules');
  if (!resolved.startsWith(`${nodeModulesRoot}${sep}`)) return null;
  const resolvedDirectory = existsSync(resolved) && !extname(resolved) ? resolved : resolve(resolved, '..');
  if (!hasPackageProvenance(resolvedDirectory, nodeModulesRoot)) return null;
  if (specifier.startsWith('/') || specifier.startsWith('file:')) {
    return { status: 'external_dependency', canonical: resolved };
  }
  if (specifier.startsWith('.') || specifier.startsWith('#') ||
    /^[a-z][a-z0-9+.-]*:/iu.test(specifier)) return null;
  const packageName = barePackageName(specifier);
  if (packageName.length === 0) return null;
  try {
    workRequire.resolve(`${packageName}/package.json`);
  } catch {
    const packageRoot = packageName.startsWith('@')
      ? resolve(nodeModulesRoot, ...packageName.split('/'))
      : resolve(nodeModulesRoot, packageName);
    if (!existsSync(resolve(packageRoot, 'package.json'))) return null;
  }
  return { status: 'external_dependency', canonical: resolved };
}

function conditionsFor(environment) {
  const conditions = environment?.config?.resolve?.conditions;
  return Array.isArray(conditions) ? conditions.filter((value) => typeof value === 'string').sort() : [];
}

function environmentIsServer(name, environment) {
  return name === 'ssr' || name === '__vitest__' || environment?.config?.consumer === 'server';
}

function optimizerIsDisabled(server) {
  const root = server.config.optimizeDeps;
  if (root?.noDiscovery !== true || !Array.isArray(root.include) || root.include.length !== 0) return false;
  return Object.values(server.config.environments ?? {}).every((options) => {
    const optimizeDeps = options?.optimizeDeps;
    return optimizeDeps === undefined ||
      (optimizeDeps.noDiscovery === true && Array.isArray(optimizeDeps.include) && optimizeDeps.include.length === 0);
  });
}

function optimizerGuardPlugin() {
  return {
    name: 'heldout-runtime-disable-optimizer',
    enforce: 'post',
    configResolved(config) {
      // Vite 7.3.6 config.js:31891 and :34890 disable optimization only when
      // discovery is off and the explicit include list is empty.
      config.optimizeDeps.noDiscovery = true;
      config.optimizeDeps.include = [];
      for (const environment of Object.values(config.environments ?? {})) {
        environment.optimizeDeps ??= {};
        environment.optimizeDeps.noDiscovery = true;
        environment.optimizeDeps.include = [];
      }
    },
  };
}

function errorClass(error) {
  if (error instanceof Error) return error.name;
  return 'UnknownError';
}

function canonicalFailureDetail(configuration, phase, error) {
  return `${configuration} ${phase} failed (${errorClass(error)})`;
}

function reportPath(path) {
  return canonicalId(path) ?? path;
}

async function main() {
  const request = parseRequest(await readInput(1024 * 1024));
  const candidateLockDigest = createHash('sha256').update(readFileSync('/work/package-lock.json')).digest('hex');
  if (candidateLockDigest !== request.trustedLockDigest) throw new TypeError('candidate_lock_changed_in_sandbox');
  const viteEntry = workRequire.resolve('vite');
  const vitestEntry = workRequire.resolve('vitest/node');
  const typescriptEntry = workRequire.resolve('typescript');
  const [{ createServer }, { createVitest }, tsModule] = await Promise.all([
    import(pathToFileURL(viteEntry).href),
    import(pathToFileURL(vitestEntry).href),
    import(pathToFileURL(typescriptEntry).href),
  ]);
  const ts = tsModule.default;
  const runtimeRoot = '/opt/node';
  const runtimeVersion = process.version;
  const configurationLoad = [];
  const resolution = [];
  const seedAssignments = [];
  const loadedConfigurationFiles = new Set();
  const findings = [];
  const closedContainers = new WeakSet();
  const seeds = sourceSeeds();
  const configs = rootConfigs();

  const recordLoad = (file, kind, project, environment, status, error) => {
    configurationLoad.push({
      file,
      kind,
      project,
      environment,
      status,
      errorClass: error,
      runtimeRoot,
      runtimeVersion,
    });
  };

  recordLoad('<preflight>', 'preflight', null, 'isolation', 'loaded', null);

  const addResolution = (row) => {
    const completeRow = { loaderKind: null, ...row };
    resolution.push(completeRow);
    if (completeRow.status === 'protected' && completeRow.source !== 'protected_control') {
      findings.push({
        path: completeRow.importer ?? completeRow.configuration,
        kind: 'runtime_protocol_resolution',
        detail: `${completeRow.specifier} resolved to ${completeRow.resolvedId ?? '<unresolved>'} in ${completeRow.environment}`,
      });
    } else if (completeRow.status === 'unresolved' && completeRow.source !== 'protected_control') {
      findings.push({
        path: completeRow.importer ?? completeRow.configuration,
        kind: 'unresolved_module_edge',
        detail: `${completeRow.specifier} was unresolved in ${completeRow.environment}`,
      });
    }
  };

  const recordConfigurationFailure = (configuration, kind, project, environment, phase, error) => {
    const timedOut = error instanceof Error && error.message.startsWith('phase_timeout:');
    recordLoad(configuration, kind, project, environment, timedOut ? 'timed_out' : 'failed', errorClass(error));
    findings.push({
      path: configuration,
      kind: 'configuration_load_failed',
      detail: canonicalFailureDetail(configuration, phase, error),
    });
  };

  const closeServerStrict = async (server) => {
    let firstFailure = null;
    for (const [name, environment] of Object.entries(server.environments).sort(([left], [right]) =>
      left.localeCompare(right))) {
      const container = environment.pluginContainer;
      if (closedContainers.has(container)) continue;
      closedContainers.add(container);
      try {
        await container.close();
      } catch (error) {
        firstFailure ??= error;
      }
    }
    try {
      await server.close();
    } catch (error) {
      firstFailure ??= error;
    }
    if (firstFailure !== null) throw firstFailure;
  };

  const inspectEnvironment = async (configuration, project, name, environment, aliasEntries, includeSeeds) => {
    const serverStyle = environmentIsServer(name, environment);
    const environmentRoot = typeof environment.config.root === 'string' ? environment.config.root : '/work';
    const assigned = includeSeeds
      ? seeds.filter((seed) => seed.startsWith('src/') || serverStyle)
      : [];
    const assignedIdentities = new Set(assigned.map((seed) => `/work/${seed}`));
    const conditions = conditionsFor(environment);
    for (const seed of assigned) {
      seedAssignments.push({ seed, configuration, project, environment: name });
    }
    const visited = new Set();
    const queue = assigned.map((seed) => ({
      id: `/work/${seed}`,
      seed,
      source: 'graph',
      loaderKind: null,
    }));
    const importerForAliases = assigned[0] === undefined ? '/work/src/main.ts' : `/work/${assigned[0]}`;
    for (const alias of aliasEntries) {
      if (typeof alias.find !== 'string') continue;
      queue.push({ id: importerForAliases, seed: '<alias-key>', source: 'alias_key', specifier: alias.find,
        loaderKind: 'static_import' });
    }
    queue.push({
      id: importerForAliases,
      seed: '<protected-control>',
      source: 'protected_control',
      specifier: '/src/vtt/heldout-evaluation.ts',
      loaderKind: 'static_import',
    });
    const addUnresolvedEdge = (current, specifier, source = current.source) => {
      addResolution({
        configuration,
        project,
        environment: name,
        phase: 'resolve',
        conditions,
        seed: current.seed,
        specifier: specifier ?? '<non-constant>',
        importer: canonicalId(current.id),
        resolvedId: null,
        source,
        loaderKind: current.loaderKind,
        status: 'unresolved',
      });
    };
    while (queue.length > 0) {
      queue.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
      const current = queue.shift();
      if (current === undefined) break;
      if (current.specifier !== undefined) {
        let resolvedResult;
        try {
          const isRequire = current.loaderKind === 'require' || current.loaderKind === 'require_resolve' ||
            current.loaderKind === 'import_equals';
          resolvedResult = await environment.pluginContainer.resolveId(current.specifier, current.id, isRequire
            ? { custom: { 'node-resolve': { isRequire: true } } }
            : undefined);
        } catch {
          resolvedResult = null;
        }
        const resolvedId = resolvedResult?.id ?? null;
        const canonicalIdentity = resolvedId === null ? null : canonicalFilesystemIdentity(resolvedId);
        const boundary = canonicalIdentity === null ? null : externalBoundary(
          current.specifier,
          canonicalIdentity,
          resolvedResult?.external === true,
        );
        const identity = boundary?.canonical ?? canonicalIdentity;
        let status;
        if (identity !== null && protectedIdentity(identity, request.bindings)) {
          status = current.source === 'protected_control' ? 'control' : 'protected';
        } else if (resolvedId === null) {
          status = builtinSpecifier(current.specifier) ? 'external_builtin' : 'unresolved';
        } else if (boundary !== null) {
          status = boundary.status;
        } else {
          status = resolvedResult?.external === true ? 'unresolved' : 'resolved';
        }
        addResolution({
          configuration,
          project,
          environment: name,
          phase: 'resolve',
          conditions,
          seed: current.seed,
          specifier: current.specifier,
          importer: canonicalId(current.id),
          resolvedId: canonicalId(identity),
          source: current.source,
          loaderKind: current.loaderKind,
          status,
        });
        if (status === 'unresolved' || status === 'protected' || status === 'control' ||
          status === 'external_builtin' || status === 'external_dependency' || resolvedId === null) continue;
        if (withoutQuery(resolvedId) === resolvedId && assignedIdentities.has(withoutQuery(canonicalIdentity ?? resolvedId))) {
          // Every eligible candidate source is an explicit environment seed. Its
          // own deterministic seed visit supplies transform evidence without
          // recursively multiplying provenance through the whole source graph.
          continue;
        }
        queue.push({
          id: resolvedId,
          seed: current.seed,
          source: current.source,
          loaderKind: current.loaderKind,
          requested: { specifier: current.specifier, importer: current.id },
        });
        continue;
      }
      const provenance = current.source === 'protected_control' ? 'control' : 'ordinary';
      const visitKey = `${name}\0${provenance}\0${current.id}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);
      const localPath = withoutQuery(current.id);
      let sourceText = null;
      if (localPath.startsWith('/work/') && existsSync(localPath)) {
        sourceText = readFileSync(localPath, 'utf8');
      }
      if (sourceText !== null) {
        const relative = localPath.startsWith('/work/') ? localPath.slice('/work/'.length) : null;
        const suppliedEdges = relative === null ? null : request.valueEdges[relative] ?? null;
        const edges = suppliedEdges ?? runtimeEdges(ts, localPath, sourceText);
        for (const edge of edges) {
          if (edge.kind === 'import_meta_glob') continue;
          if (edge.specifier === null || edge.kind === 'aliased_import_meta_glob') {
            addUnresolvedEdge(current, edge.specifier, current.source);
          } else {
            const internalId = decodedViteInternalId(edge.specifier);
            if (internalId === null) {
              queue.push({ id: current.id, seed: current.seed, source: current.source, specifier: edge.specifier,
                loaderKind: edge.kind });
            } else {
              queue.push({ id: internalId, seed: current.seed, source: current.source,
                loaderKind: edge.kind, requested: { specifier: edge.specifier, importer: current.id } });
            }
          }
        }
        const unboundedGlobs = unboundedRootGlobPatterns(ts, localPath, sourceText);
        if (unboundedGlobs.length > 0) {
          for (const pattern of unboundedGlobs) {
            addResolution({
              configuration,
              project,
              environment: name,
              phase: 'transform',
              conditions,
              seed: current.seed,
              specifier: pattern,
              importer: canonicalId(current.id),
              resolvedId: null,
              source: 'transformed',
              loaderKind: 'import_meta_glob',
              status: 'unresolved',
            });
          }
          continue;
        }
      }
      let transformed = null;
      try {
        if (current.id.startsWith('\0') || !current.id.startsWith('/')) {
          const loaded = await environment.pluginContainer.load(current.id);
          if (loaded !== null) {
            const code = typeof loaded === 'string' ? loaded : loaded.code;
            const result = await environment.pluginContainer.transform(code, current.id);
            transformed = result ?? { code };
          }
        } else {
          const suffix = current.id.slice(localPath.length);
          const url = localPath.startsWith(`${environmentRoot}/`)
            ? `/${posix.relative(environmentRoot, localPath)}${suffix}`
            : localPath.startsWith('/work/')
              ? `/@fs/${localPath}${suffix}`
              : current.id;
          transformed = await environment.transformRequest(url);
        }
      } catch {
        transformed = null;
      }
      if (transformed === null) {
        addResolution({
          configuration,
          project,
          environment: name,
          phase: 'transform',
          conditions,
          seed: current.seed,
          specifier: current.requested?.specifier ?? canonicalId(current.id) ?? current.id,
          importer: canonicalId(current.requested?.importer ?? current.id),
          resolvedId: null,
          source: current.source === 'graph' ? 'transformed' : current.source,
          loaderKind: current.loaderKind,
          status: 'unresolved',
        });
        continue;
      }
      addResolution({
        configuration,
        project,
        environment: name,
        phase: 'transform',
        conditions,
        seed: current.seed,
        specifier: current.requested?.specifier ?? canonicalId(current.id) ?? current.id,
        importer: canonicalId(current.requested?.importer ?? current.id),
        resolvedId: canonicalId(current.id),
        source: current.source === 'graph' ? 'transformed' : current.source,
        loaderKind: current.loaderKind,
        status: protectedIdentity(current.id, request.bindings) ||
          textContainsReserveDigest(transformed.code, request.bindings.reserveDigests)
          ? current.source === 'protected_control' ? 'control' : 'protected'
          : 'clean',
      });
      for (const edge of runtimeEdges(ts, current.id, transformed.code)) {
        queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: edge.specifier,
          loaderKind: edge.kind });
      }
      for (const [kind, dependencies] of [
        ['static_import', transformed.deps],
        ['dynamic_import', transformed.dynamicDeps],
      ]) {
        if (!Array.isArray(dependencies)) continue;
        for (const dependency of [...dependencies].filter((value) => typeof value === 'string').sort()) {
          queue.push({ id: current.id, seed: current.seed, source: 'transformed', specifier: dependency,
            loaderKind: kind });
        }
      }
    }
  };

  const inspectServer = async (configuration, kind, project, server, includeSeeds = true) => {
    if (server.httpServer !== null) throw new TypeError('guard_server_listening');
    if (!optimizerIsDisabled(server)) throw new TypeError('optimizer_not_disabled');
    const aliases = Array.isArray(server.config.resolve.alias) ? server.config.resolve.alias : [];
    const loadedConfig = typeof server.config.configFile === 'string' ? realpathSync(server.config.configFile) : null;
    if (loadedConfig?.startsWith('/work/') === true) loadedConfigurationFiles.add(loadedConfig.slice('/work/'.length));
    for (const [name, environment] of Object.entries(server.environments).sort(([left], [right]) => left.localeCompare(right))) {
      await inspectEnvironment(configuration, project, name, environment, aliases, includeSeeds);
      recordLoad(configuration, kind, project, name, 'loaded', null);
    }
  };

  for (const config of configs.filter((path) => path.startsWith('vite') && !path.startsWith('vitest'))) {
    let server;
    try {
      server = await withTimeout(createServer({
        configFile: `/work/${config}`,
        configLoader: 'runner',
        appType: 'custom',
        plugins: [optimizerGuardPlugin()],
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, hmr: false, watch: null },
      }), request.phaseTimeoutMs, `vite:${config}:load`);
      try {
        await withTimeout(inspectServer(config, 'vite-serve', null, server),
          request.phaseTimeoutMs, `vite:${config}:inspect`);
      } catch (error) {
        throw new TypeError(`vite_inspect_failed:${error instanceof Error ? error.message : String(error)}`, {
          cause: error,
        });
      }
    } catch (error) {
      recordConfigurationFailure(config, 'vite-serve', null, '<load>', 'load-or-inspect', error);
    } finally {
      if (server !== undefined) {
        try {
          await closeServerStrict(server);
        } catch (error) {
          recordConfigurationFailure(config, 'vite-serve', null, '<close>', 'close', error);
        }
      }
    }
  }

  for (const config of configs.filter((path) => path.startsWith('vitest'))) {
    let vitest;
    try {
      // Vitest 4.1.10 cli-api:13125, :13150, :13172, and :14222 initializes
      // VCS/hooks/reporters/caches and may listen unless API is forced off.
      vitest = await withTimeout(createVitest('test', {
        root: '/work',
        config: `/work/${config}`,
        configLoader: 'runner',
        watch: false,
        run: false,
        passWithNoTests: true,
        api: false,
      }, {
        plugins: [optimizerGuardPlugin()],
        server: { watch: null, hmr: false },
        optimizeDeps: { noDiscovery: true, include: [] },
      }), request.phaseTimeoutMs, `vitest:${config}:load`);
      if (vitest.config.api?.port) throw new TypeError('vitest_api_listener_enabled');
      try {
        await withTimeout(inspectServer(config, 'vitest-root', null, vitest.vite, false),
          request.phaseTimeoutMs, `vitest:${config}:root`);
      } catch (error) {
        throw new TypeError(`vitest_root_inspect_failed:${error instanceof Error ? error.message : String(error)}`, {
          cause: error,
        });
      }
      for (const project of [...vitest.projects].sort((left, right) => left.name.localeCompare(right.name))) {
        if (project.config.browser.enabled) throw new TypeError(`browser_project_unsupported:${project.name}`);
        await withTimeout(inspectServer(config, 'vitest-project', project.name, project.vite),
          request.phaseTimeoutMs, `vitest:${config}:${project.name || '<root>'}`);
      }
    } catch (error) {
      recordConfigurationFailure(config, 'vitest-root', null, '<load>', 'load-or-inspect', error);
    } finally {
      if (vitest !== undefined) {
        try {
          for (const project of [...vitest.projects].sort((left, right) => left.name.localeCompare(right.name))) {
            await closeServerStrict(project.vite);
          }
          await closeServerStrict(vitest.vite);
          await vitest.close();
        } catch (error) {
          recordConfigurationFailure(config, 'vitest-root', null, '<close>', 'close', error);
        }
      }
    }
  }

  if (configs.length === 0) {
    findings.push({ path: '<configuration>', kind: 'configuration_load_failed', detail: 'No Vite or Vitest config found.' });
    recordLoad('<configuration>', 'vite-serve', null, '<load>', 'failed', 'ConfigurationNotFound');
  }

  const rowKey = (row) => JSON.stringify(row);
  const sortedResolution = [...new Map(resolution.sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
    .map((row) => [rowKey(row), row])).values()];
  const sortedAssignments = [...new Map(seedAssignments.sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
    .map((row) => [rowKey(row), row])).values()];
  const report = {
    protocol: PROTOCOL,
    slice: request.slice,
    completed: true,
    eligibleFiles: seeds.length,
    astInspectedFiles: seeds.filter((seed) => request.valueEdges[seed] !== undefined).length,
    configurationLoad: configurationLoad.sort((left, right) => rowKey(left).localeCompare(rowKey(right))),
    resolution: sortedResolution,
    seedAssignments: sortedAssignments,
    loadedConfigurationFiles: [...loadedConfigurationFiles].sort(),
    findings: [...new Map(findings.sort((left, right) => rowKey(left).localeCompare(rowKey(right)))
      .map((row) => [rowKey(row), row])).values()],
  };
  writeSync(3, JSON.stringify(report));
}

main().catch((error) => {
  writeSync(2, `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
