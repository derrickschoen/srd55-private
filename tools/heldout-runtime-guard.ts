import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const HELDOUT_RUNTIME_PROTOCOL = 'heldout-runtime-v1' as const;
export const HELDOUT_RUNTIME_PHASE_TIMEOUT_MS = 30_000;
export const HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS = 120_000;
export const HELDOUT_RUNTIME_NODE_VERSION = 'v24.13.0';

export interface HeldoutRuntimeBindings {
  readonly reserveDigests: readonly string[];
  readonly resultPaths: readonly string[];
}

export interface HeldoutRuntimeGuardRequest {
  readonly root: string;
  readonly slice: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  readonly bindings: HeldoutRuntimeBindings;
  /** Trusted installation whose package-lock and node_modules authenticate execution dependencies. */
  readonly trustedRoot?: string;
  readonly phaseTimeoutMs?: number;
  readonly aggregateTimeoutMs?: number;
}

export interface HeldoutPreflightAttempt {
  readonly profile: string;
  readonly status: 'failed' | 'passed';
  readonly errorClass: string | null;
}

export interface HeldoutRuntimePreflight {
  readonly status: 'passed' | 'isolation_failed';
  readonly bubblewrapVersion: string;
  readonly runtimeRoot: string;
  readonly runtimeVersion: string;
  readonly uidTaskCount: number;
  readonly nprocLimit: number;
  readonly attempts: readonly HeldoutPreflightAttempt[];
  readonly checks: readonly string[];
  readonly detail?: string;
}

export type HeldoutRuntimeValueEdgeKind =
  | 'static_import'
  | 're_export'
  | 'import_equals'
  | 'dynamic_import'
  | 'require'
  | 'require_resolve'
  | 'import_meta_resolve'
  | 'import_meta_glob'
  | 'aliased_import_meta_glob'
  | 'worker'
  | 'shared_worker'
  | 'import_scripts';

export interface HeldoutRuntimeValueEdge {
  readonly specifier: string | null;
  readonly kind: HeldoutRuntimeValueEdgeKind;
}

export interface HeldoutConfigurationLoad {
  readonly file: string;
  readonly kind: 'vite-serve' | 'vitest-root' | 'vitest-project' | 'preflight';
  readonly project: string | null;
  readonly environment: string;
  readonly status: 'loaded' | 'failed' | 'timed_out' | 'isolation_failed';
  readonly errorClass: string | null;
  readonly runtimeRoot: string;
  readonly runtimeVersion: string;
}

export interface HeldoutRuntimeResolution {
  readonly configuration: string;
  readonly project: string | null;
  readonly environment: string;
  readonly phase: 'resolve' | 'transform';
  readonly conditions: readonly string[];
  readonly seed: string;
  readonly specifier: string;
  readonly importer: string | null;
  readonly resolvedId: string | null;
  readonly source: 'graph' | 'transformed' | 'alias_key' | 'protected_control';
  readonly status:
    | 'clean'
    | 'resolved'
    | 'protected'
    | 'unresolved'
    | 'control'
    | 'external_builtin'
    | 'external_dependency';
}

export interface HeldoutSeedAssignment {
  readonly seed: string;
  readonly configuration: string;
  readonly project: string | null;
  readonly environment: string;
}

export interface HeldoutRuntimeFinding {
  readonly path: string;
  readonly kind:
    | 'runtime_protocol_resolution'
    | 'configuration_load_failed'
    | 'unresolved_module_edge';
  readonly detail: string;
}

export interface HeldoutRuntimeGuardReport {
  readonly protocol: typeof HELDOUT_RUNTIME_PROTOCOL;
  readonly slice: HeldoutRuntimeGuardRequest['slice'];
  readonly completed: boolean;
  readonly eligibleFiles: number;
  readonly astInspectedFiles: number;
  readonly preflight: HeldoutRuntimePreflight;
  readonly configurationLoad: readonly HeldoutConfigurationLoad[];
  readonly resolution: readonly HeldoutRuntimeResolution[];
  readonly seedAssignments: readonly HeldoutSeedAssignment[];
  readonly findings: readonly HeldoutRuntimeFinding[];
}

interface WorkerRequest {
  readonly protocol: typeof HELDOUT_RUNTIME_PROTOCOL;
  readonly slice: HeldoutRuntimeGuardRequest['slice'];
  readonly bindings: HeldoutRuntimeBindings;
  readonly phaseTimeoutMs: number;
  readonly trustedLockDigest: string;
  readonly valueEdges: Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>>;
}

const HISTORICAL_PREFLIGHT_ATTEMPTS: readonly HeldoutPreflightAttempt[] = [{
  profile: '/usr/bin/prlimit --nproc=64 --nofile=256 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /usr/bin/node -e <canary>',
  status: 'failed',
  errorClass: 'runtime_node_mismatch',
}, {
  profile: '/usr/bin/prlimit --as=1073741824 --nproc=64 --nofile=256 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node -e <canary>',
  status: 'failed',
  errorClass: 'v8_code_range_reservation_failed',
}, {
  profile: '/usr/bin/prlimit --nproc=512 --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node -e <canary>',
  status: 'failed',
  errorClass: 'uid_thread_limit_exhausted',
}];

let successfulPreflight: HeldoutRuntimePreflight | undefined;

function bubblewrapExecutable(): string {
  return process.env.HELDOUT_RUNTIME_BWRAP_PATH ?? '/usr/bin/bwrap';
}

function stringProperty(value: unknown, property: string): string | null {
  if (value === null || typeof value !== 'object') return null;
  const member = Reflect.get(value, property);
  return typeof member === 'string' ? member : null;
}

function sha256(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function runtimeIdentity(): { readonly root: string; readonly version: string } {
  const executable = realpathSync(process.execPath);
  const root = dirname(dirname(executable));
  const node = join(root, 'bin', 'node');
  const probe = spawnSync(node, ['--version'], { encoding: 'utf8' });
  const version = probe.stdout.trim();
  if (probe.status !== 0 || version !== process.version || version !== HELDOUT_RUNTIME_NODE_VERSION) {
    throw new TypeError(`Node runtime mismatch: running ${process.version}, mounted ${version || '<none>'}.`);
  }
  return { root, version };
}

export function heldoutRuntimeNprocLimit(uidTaskCount: number): number {
  if (!Number.isSafeInteger(uidTaskCount) || uidTaskCount < 1) {
    throw new TypeError('UID task count must be a positive safe integer.');
  }
  return Math.max(2_048, uidTaskCount + 1_024);
}

function currentUidTaskCount(): number {
  const uid = process.getuid?.();
  if (uid === undefined) throw new TypeError('isolation_failed: UID task accounting is unavailable.');
  let count = 0;
  for (const entry of readdirSync('/proc', { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
    try {
      const status = readFileSync(`/proc/${entry.name}/status`, 'utf8');
      const owner = /^Uid:\s+(\d+)/mu.exec(status)?.[1];
      const threads = /^Threads:\s+(\d+)/mu.exec(status)?.[1];
      if (owner !== String(uid) || threads === undefined) continue;
      count += Number(threads);
    } catch {
      // Processes can exit between directory enumeration and status inspection.
    }
  }
  if (count < 1) throw new TypeError('isolation_failed: UID task accounting returned no tasks.');
  return count;
}

function runtimeScriptKind(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(extname(path))) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function unwrapRuntimeExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) || ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)) current = current.expression;
  return current;
}

function runtimeConstantString(expression: ts.Expression | undefined): string | null {
  if (expression === undefined) return null;
  const current = unwrapRuntimeExpression(expression);
  if (ts.isStringLiteralLike(current)) return current.text;
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = runtimeConstantString(current.left);
    const right = runtimeConstantString(current.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isTemplateExpression(current)) {
    let value = current.head.text;
    for (const span of current.templateSpans) {
      const substitution = runtimeConstantString(span.expression);
      if (substitution === null) return null;
      value += substitution + span.literal.text;
    }
    return value;
  }
  return null;
}

type RuntimeLoaderRole = 'require' | 'require_resolve' | 'import_meta_resolve' |
  'import_meta_glob' | 'worker' | 'shared_worker' | 'import_scripts';

function directRuntimeRole(expression: ts.Expression): RuntimeLoaderRole | null {
  const current = unwrapRuntimeExpression(expression);
  if (ts.isIdentifier(current)) {
    if (current.text === 'require') return 'require';
    if (current.text === 'Worker') return 'worker';
    if (current.text === 'SharedWorker') return 'shared_worker';
    if (current.text === 'importScripts') return 'import_scripts';
  }
  if (!ts.isPropertyAccessExpression(current)) return null;
  if (ts.isIdentifier(current.expression) && current.expression.text === 'require' &&
    current.name.text === 'resolve') return 'require_resolve';
  if (ts.isMetaProperty(current.expression) && current.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    current.expression.name.text === 'meta') {
    if (current.name.text === 'resolve') return 'import_meta_resolve';
    if (current.name.text === 'glob') return 'import_meta_glob';
  }
  return null;
}

/** Runtime-value edges handed to the isolated real resolver. Type-only syntax is deliberately absent. */
export function discoverHeldoutRuntimeValueEdges(
  path: string,
  source: string,
): readonly HeldoutRuntimeValueEdge[] {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, runtimeScriptKind(path));
  const roles = new Map<string, RuntimeLoaderRole>();
  const runtimeDeclarations = new Set<string>();
  const visitDeclarations = (node: ts.Node): void => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node)) && node.name !== undefined && ts.isIdentifier(node.name) &&
      !(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) =>
        modifier.kind === ts.SyntaxKind.DeclareKeyword))) runtimeDeclarations.add(node.name.text);
    ts.forEachChild(node, visitDeclarations);
  };
  visitDeclarations(sourceFile);
  for (const [name, role] of [
    ['require', 'require'], ['Worker', 'worker'], ['SharedWorker', 'shared_worker'],
    ['importScripts', 'import_scripts'],
  ] as const) if (!runtimeDeclarations.has(name)) roles.set(name, role);
  let changed = true;
  while (changed) {
    changed = false;
    const visitAliases = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
        const initializer = unwrapRuntimeExpression(node.initializer);
        const role = ts.isIdentifier(initializer) ? roles.get(initializer.text) ?? null : directRuntimeRole(initializer);
        if (role !== null && roles.get(node.name.text) !== role) {
          roles.set(node.name.text, role);
          changed = true;
        }
      }
      ts.forEachChild(node, visitAliases);
    };
    visitAliases(sourceFile);
  }
  const edges: HeldoutRuntimeValueEdge[] = [];
  const add = (kind: HeldoutRuntimeValueEdgeKind, expression: ts.Expression | undefined): void => {
    edges.push({ kind, specifier: runtimeConstantString(expression) });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const isValue = clause === undefined || (!clause.isTypeOnly && (clause.name !== undefined ||
        clause.namedBindings === undefined || ts.isNamespaceImport(clause.namedBindings) ||
        clause.namedBindings.elements.some((element) => !element.isTypeOnly)));
      if (isValue) add('static_import', node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && !node.isTypeOnly) {
      const isValue = node.exportClause === undefined || ts.isNamespaceExport(node.exportClause) ||
        node.exportClause.elements.some((element) => !element.isTypeOnly);
      if (isValue) add('re_export', node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference)) {
      add('import_equals', node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add('dynamic_import', node.arguments[0]);
      else {
        const direct = directRuntimeRole(node.expression);
        const role = direct ?? (ts.isIdentifier(node.expression) ? roles.get(node.expression.text) ?? null : null);
        if (role === 'require') add('require', node.arguments[0]);
        else if (role === 'require_resolve') add('require_resolve', node.arguments[0]);
        else if (role === 'import_meta_resolve') add('import_meta_resolve', node.arguments[0]);
        else if (role === 'import_meta_glob') {
          add(direct === null ? 'aliased_import_meta_glob' : 'import_meta_glob', node.arguments[0]);
        } else if (role === 'import_scripts') {
          for (const argument of node.arguments) add('import_scripts', argument);
        }
      }
    } else if (ts.isNewExpression(node)) {
      const direct = directRuntimeRole(node.expression);
      const role = direct ?? (ts.isIdentifier(node.expression) ? roles.get(node.expression.text) ?? null : null);
      if (role === 'worker' || role === 'shared_worker') {
        const first = node.arguments?.[0];
        if (first !== undefined && ts.isNewExpression(first) && ts.isIdentifier(first.expression) &&
          first.expression.text === 'URL') add(role, first.arguments?.[0]);
        else add(role, first);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return edges;
}

function candidateValueEdges(root: string): Readonly<Record<string, readonly HeldoutRuntimeValueEdge[]>> {
  const result: Record<string, readonly HeldoutRuntimeValueEdge[]> = {};
  const walk = (directory: string, prefix = ''): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name))) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
      const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute, relative);
      else if ((relative.startsWith('src/') || relative.startsWith('tools/')) &&
        ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(relative)) &&
        !/\.d\.(?:ts|mts|cts)$/u.test(relative)) {
        result[relative] = discoverHeldoutRuntimeValueEdges(relative, readFileSync(absolute, 'utf8'));
      }
    }
  };
  walk(root);
  return result;
}

function sharedBwrapArguments(
  runtimeRoot: string,
  workRoot: string,
  guardRoot: string,
  scratchRoot: string,
  nodeModulesRoot: string,
): string[] {
  return [
    '--die-with-parent',
    '--new-session',
    '--unshare-user',
    '--unshare-pid',
    '--unshare-ipc',
    '--unshare-uts',
    '--unshare-cgroup',
    '--unshare-net',
    '--cap-drop', 'ALL',
    '--ro-bind', '/usr', '/usr',
    '--ro-bind', '/lib', '/lib',
    '--ro-bind', '/lib64', '/lib64',
    '--ro-bind', runtimeRoot, '/opt/node',
    '--dev', '/dev',
    '--proc', '/proc',
    '--tmpfs', '/etc',
    '--ro-bind', '/etc/hosts', '/etc/hosts',
    '--ro-bind', '/etc/nsswitch.conf', '/etc/nsswitch.conf',
    '--ro-bind', workRoot, '/work',
    '--ro-bind', guardRoot, '/guard',
    '--ro-bind', nodeModulesRoot, '/work/node_modules',
    '--bind', scratchRoot, '/scratch',
    '--bind', join(scratchRoot, 'tmp'), '/tmp',
    '--bind', join(scratchRoot, 'home'), '/home/guard',
    '--chdir', '/work',
  ];
}

function cleanEnvironment(): readonly string[] {
  return [
    'PATH=/opt/node/bin:/usr/bin:/bin',
    'HOME=/home/guard',
    'TMPDIR=/tmp',
    'XDG_CACHE_HOME=/scratch/cache',
    'STATIC_APP_CACHE_DIR=/scratch/cache/vite',
    'NODE_ENV=test',
    'CI=1',
    'GOMAXPROCS=8',
    'LANG=C.UTF-8',
    'LC_ALL=C.UTF-8',
  ];
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function prepareScratch(root: string): void {
  mkdirSync(root, { recursive: true });
  mkdirSync(join(root, 'tmp'), { recursive: true });
  mkdirSync(join(root, 'home'), { recursive: true });
  mkdirSync(join(root, 'cache'), { recursive: true });
}

function performHeldoutIsolationPreflight(
  trustedRoot = process.cwd(),
): HeldoutRuntimePreflight {
  if (successfulPreflight !== undefined) return successfulPreflight;
  const runtime = runtimeIdentity();
  const uidTaskCount = currentUidTaskCount();
  const nprocLimit = heldoutRuntimeNprocLimit(uidTaskCount);
  const bubblewrapPath = bubblewrapExecutable();
  const bubblewrap = spawnSync(bubblewrapPath, ['--version'], { encoding: 'utf8' });
  if (bubblewrap.status !== 0 || bubblewrap.stdout.trim() !== 'bubblewrap 0.6.1') {
    throw new TypeError(`isolation_failed: ${bubblewrap.error?.message ??
      (bubblewrap.stderr?.trim() || 'bubblewrap 0.6.1 unavailable')}`);
  }
  const scratchRoot = join(tmpdir(), `heldout-runtime-preflight-${String(process.pid)}`);
  const workRoot = join(scratchRoot, 'candidate');
  const guardRoot = join(scratchRoot, 'guard');
  rmSync(scratchRoot, { recursive: true, force: true });
  prepareScratch(scratchRoot);
  mkdirSync(workRoot, { recursive: true });
  mkdirSync(guardRoot, { recursive: true });
  mkdirSync(join(workRoot, 'node_modules'), { recursive: true });
  const nodeModulesRoot = join(trustedRoot, 'node_modules');
  const script = [
    "const fs=require('node:fs')",
    "const net=require('node:net')",
    `if(process.version!==${JSON.stringify(runtime.version)})throw new Error('runtime version mismatch')`,
    "if(process.env.HOME!=='/home/guard')throw new Error('HOME mismatch')",
    "fs.writeFileSync('/scratch/write-ok','ok')",
    "for(const p of ['/work/nope','/guard/nope','/opt/node/nope','/usr/nope']){let denied=false;try{fs.writeFileSync(p,'x')}catch{denied=true}if(!denied)throw new Error(p+' writable')}",
    "if(fs.existsSync('/home/vagrant'))throw new Error('host home visible')",
    "const socket=net.connect({host:'198.51.100.1',port:9})",
    "const timer=setTimeout(()=>{socket.destroy();process.exit(2)},1000)",
    "socket.on('connect',()=>{clearTimeout(timer);socket.destroy();process.exit(3)})",
    "socket.on('error',()=>{clearTimeout(timer);process.stdout.write('passed')})",
  ].join(';');
  const args = [
    `--nproc=${String(nprocLimit)}`,
    '--nofile=1024',
    '--fsize=16777216',
    '--cpu=300',
    '--',
    bubblewrapPath,
    ...sharedBwrapArguments(runtime.root, workRoot, guardRoot, scratchRoot, nodeModulesRoot),
    '/usr/bin/env', '-i', ...cleanEnvironment(),
    '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64', '-e', script,
  ];
  const probe = spawnSync('/usr/bin/prlimit', args, { encoding: 'utf8', timeout: 5_000 });
  if (probe.status !== 0 || probe.stdout !== 'passed') {
    rmSync(scratchRoot, { recursive: true, force: true });
    throw new TypeError(`isolation_failed: ${probe.error?.message ?? (probe.stderr.trim() || `exit ${String(probe.status)}`)}`);
  }
  const parentDeathArgs = [
    `--nproc=${String(nprocLimit)}`, '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
    bubblewrapPath,
    ...sharedBwrapArguments(runtime.root, workRoot, guardRoot, scratchRoot, nodeModulesRoot),
    '/usr/bin/env', '-i', ...cleanEnvironment(),
    '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64',
    '-e', "setInterval(() => undefined, 1000)",
  ];
  const isolatedPidFile = join(scratchRoot, 'isolated.pid');
  const parentDeathScript = [
    'set -eu',
    '(',
    `  /usr/bin/prlimit ${parentDeathArgs.map(shellQuote).join(' ')} &`,
    '  isolated=$!',
    `  echo "$isolated" > ${shellQuote(isolatedPidFile)}`,
    '  wait "$isolated"',
    ') &',
    'supervisor=$!',
    `while [ ! -s ${shellQuote(isolatedPidFile)} ]; do sleep 0.01; done`,
    `isolated=$(cat ${shellQuote(isolatedPidFile)})`,
    'kill -KILL "$supervisor"',
    'wait "$supervisor" 2>/dev/null || true',
    'attempt=0',
    'while kill -0 "$isolated" 2>/dev/null; do',
    '  attempt=$((attempt + 1))',
    '  if [ "$attempt" -ge 200 ]; then exit 1; fi',
    '  sleep 0.01',
    'done',
  ].join('\n');
  const parentDeath = spawnSync('/bin/sh', ['-c', parentDeathScript], {
    encoding: 'utf8',
    timeout: 5_000,
  });
  if (parentDeath.status !== 0) {
    rmSync(scratchRoot, { recursive: true, force: true });
    throw new TypeError(`isolation_failed: parent-death canary ${parentDeath.error?.message ??
      (parentDeath.stderr.trim() || `exit ${String(parentDeath.status)}`)}`);
  }
  successfulPreflight = {
    status: 'passed',
    bubblewrapVersion: bubblewrap.stdout.trim(),
    runtimeRoot: runtime.root,
    runtimeVersion: runtime.version,
    uidTaskCount,
    nprocLimit,
    attempts: [...HISTORICAL_PREFLIGHT_ATTEMPTS, {
      profile: `/usr/bin/prlimit --nproc=${String(nprocLimit)} --nofile=1024 --fsize=16777216 --cpu=300 -- /usr/bin/bwrap <namespaces-and-read-only-mounts> /opt/node/bin/node --max-old-space-size=1024 --max-semi-space-size=64 -e <canary>`,
      status: 'passed',
      errorClass: null,
    }],
    checks: [
      'node_runtime_matches_parent',
      'scratch_write_allowed',
      'work_read_only',
      'guard_read_only',
      'runtime_read_only',
      'system_runtime_read_only',
      'home_isolated',
      'external_network_unreachable',
      'new_session_and_die_with_parent_enabled',
    ],
  };
  rmSync(scratchRoot, { recursive: true, force: true });
  return successfulPreflight;
}

export function runHeldoutIsolationPreflight(
  trustedRoot = process.cwd(),
): HeldoutRuntimePreflight {
  try {
    return performHeldoutIsolationPreflight(trustedRoot);
  } catch (error: unknown) {
    const runtimeRoot = dirname(dirname(realpathSync(process.execPath)));
    const bubblewrap = spawnSync(bubblewrapExecutable(), ['--version'], { encoding: 'utf8' });
    const detail = error instanceof Error ? error.message : String(error);
    return {
      status: 'isolation_failed',
      bubblewrapVersion: bubblewrap.status === 0 ? bubblewrap.stdout.trim() : '<unavailable>',
      runtimeRoot,
      runtimeVersion: process.version,
      uidTaskCount: 0,
      nprocLimit: 0,
      attempts: [...HISTORICAL_PREFLIGHT_ATTEMPTS, {
        profile: 'final Node-runtime bubblewrap profile',
        status: 'failed',
        errorClass: error instanceof Error ? error.name : 'UnknownError',
      }],
      checks: [],
      detail,
    };
  }
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function exactKeys(value: Readonly<Record<string, unknown>>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === allowed.length && keys.every((key, index) => key === [...allowed].sort()[index]);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function parseConfigurationLoad(value: unknown): HeldoutConfigurationLoad {
  const row = recordValue(value);
  const keys = ['environment', 'errorClass', 'file', 'kind', 'project', 'runtimeRoot', 'runtimeVersion', 'status'];
  if (row === null || !exactKeys(row, keys) || typeof row.file !== 'string' ||
    !oneOf(row.kind, ['vite-serve', 'vitest-root', 'vitest-project', 'preflight']) ||
    !nullableString(row.project) || typeof row.environment !== 'string' ||
    !oneOf(row.status, ['loaded', 'failed', 'timed_out', 'isolation_failed']) ||
    !nullableString(row.errorClass) || typeof row.runtimeRoot !== 'string' ||
    typeof row.runtimeVersion !== 'string') throw new TypeError('Malformed configurationLoad row.');
  return {
    file: row.file,
    kind: row.kind,
    project: row.project,
    environment: row.environment,
    status: row.status,
    errorClass: row.errorClass,
    runtimeRoot: row.runtimeRoot,
    runtimeVersion: row.runtimeVersion,
  };
}

function parseResolution(value: unknown): HeldoutRuntimeResolution {
  const row = recordValue(value);
  const keys = ['conditions', 'configuration', 'environment', 'importer', 'phase', 'project', 'resolvedId',
    'seed', 'source', 'specifier', 'status'];
  if (row === null || !exactKeys(row, keys) || typeof row.configuration !== 'string' ||
    !nullableString(row.project) || typeof row.environment !== 'string' ||
    !oneOf(row.phase, ['resolve', 'transform']) || !Array.isArray(row.conditions) ||
    !row.conditions.every((item) => typeof item === 'string') || typeof row.seed !== 'string' ||
    typeof row.specifier !== 'string' || !nullableString(row.importer) || !nullableString(row.resolvedId) ||
    !oneOf(row.source, ['graph', 'transformed', 'alias_key', 'protected_control']) ||
    !oneOf(row.status, ['clean', 'resolved', 'protected', 'unresolved', 'control', 'external_builtin',
      'external_dependency'])) throw new TypeError('Malformed resolution row.');
  return {
    configuration: row.configuration,
    project: row.project,
    environment: row.environment,
    phase: row.phase,
    conditions: [...row.conditions],
    seed: row.seed,
    specifier: row.specifier,
    importer: row.importer,
    resolvedId: row.resolvedId,
    source: row.source,
    status: row.status,
  };
}

function parseSeedAssignment(value: unknown): HeldoutSeedAssignment {
  const row = recordValue(value);
  const keys = ['configuration', 'environment', 'project', 'seed'];
  if (row === null || !exactKeys(row, keys) || typeof row.seed !== 'string' ||
    typeof row.configuration !== 'string' || !nullableString(row.project) ||
    typeof row.environment !== 'string') throw new TypeError('Malformed seedAssignments row.');
  return { seed: row.seed, configuration: row.configuration, project: row.project, environment: row.environment };
}

function parseFinding(value: unknown): HeldoutRuntimeFinding {
  const row = recordValue(value);
  const keys = ['detail', 'kind', 'path'];
  if (row === null || !exactKeys(row, keys) || typeof row.path !== 'string' ||
    !oneOf(row.kind, ['runtime_protocol_resolution', 'configuration_load_failed', 'unresolved_module_edge']) ||
    typeof row.detail !== 'string') throw new TypeError('Malformed findings row.');
  return { path: row.path, kind: row.kind, detail: row.detail };
}

export function parseHeldoutWorkerReport(
  value: unknown,
  expectedSlice: HeldoutRuntimeGuardRequest['slice'],
): Omit<HeldoutRuntimeGuardReport, 'preflight'> {
  if (value === null || typeof value !== 'object' ||
    stringProperty(value, 'protocol') !== HELDOUT_RUNTIME_PROTOCOL) {
    throw new TypeError('Runtime guard emitted an invalid protocol response.');
  }
  const slice = stringProperty(value, 'slice');
  const configurationLoad = Reflect.get(value, 'configurationLoad');
  const resolutionRows = Reflect.get(value, 'resolution');
  const seedAssignments = Reflect.get(value, 'seedAssignments');
  const findings = Reflect.get(value, 'findings');
  const record = recordValue(value);
  if (record === null || !exactKeys(record,
    ['astInspectedFiles', 'completed', 'configurationLoad', 'eligibleFiles', 'findings', 'protocol', 'resolution',
      'seedAssignments', 'slice']) ||
    slice !== expectedSlice || record.completed !== true ||
    typeof record.eligibleFiles !== 'number' || !Number.isSafeInteger(record.eligibleFiles) ||
    typeof record.astInspectedFiles !== 'number' || !Number.isSafeInteger(record.astInspectedFiles) ||
    record.eligibleFiles < 0 || record.astInspectedFiles !== record.eligibleFiles ||
    !Array.isArray(configurationLoad) || !Array.isArray(resolutionRows) ||
    !Array.isArray(seedAssignments) || !Array.isArray(findings)) {
    throw new TypeError('Runtime guard emitted malformed report fields.');
  }
  const parsedLoads = configurationLoad.map(parseConfigurationLoad);
  if (!parsedLoads.some((row) => row.kind === 'preflight' && row.status === 'loaded')) {
    throw new TypeError('Runtime guard report lacks completion preflight evidence.');
  }
  return {
    protocol: HELDOUT_RUNTIME_PROTOCOL,
    slice: expectedSlice,
    completed: true,
    eligibleFiles: record.eligibleFiles,
    astInspectedFiles: record.astInspectedFiles,
    configurationLoad: parsedLoads,
    resolution: resolutionRows.map(parseResolution),
    seedAssignments: seedAssignments.map(parseSeedAssignment),
    findings: findings.map(parseFinding),
  };
}

function collectPipe(stream: NodeJS.ReadableStream, limit: number): Promise<string> {
  return new Promise((resolvePipe, rejectPipe) => {
    let text = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
      text += chunk;
      if (text.length > limit) rejectPipe(new TypeError('Runtime guard pipe exceeded its byte limit.'));
    });
    stream.on('end', () => resolvePipe(text));
    stream.on('error', rejectPipe);
  });
}

function isReadableStream(value: unknown): value is NodeJS.ReadableStream {
  return value !== null && typeof value === 'object' &&
    typeof Reflect.get(value, 'setEncoding') === 'function' &&
    typeof Reflect.get(value, 'on') === 'function';
}

export async function runHeldoutRuntimeGuard(
  request: HeldoutRuntimeGuardRequest,
): Promise<HeldoutRuntimeGuardReport> {
  const trustedRoot = resolve(request.trustedRoot ?? process.cwd());
  const preflight = runHeldoutIsolationPreflight(trustedRoot);
  if (preflight.status === 'isolation_failed') {
    const detail = preflight.detail ?? 'Isolation preflight failed.';
    return {
      protocol: HELDOUT_RUNTIME_PROTOCOL,
      slice: request.slice,
      completed: false,
      eligibleFiles: 0,
      astInspectedFiles: 0,
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
      findings: [{ path: '<preflight>', kind: 'configuration_load_failed', detail }],
    };
  }
  const root = realpathSync(request.root);
  const runtime = { root: preflight.runtimeRoot, version: preflight.runtimeVersion };
  const trustedLock = readFileSync(join(trustedRoot, 'package-lock.json'));
  const candidateLockPath = join(root, 'package-lock.json');
  if (!existsSync(candidateLockPath) || sha256(readFileSync(candidateLockPath)) !== sha256(trustedLock)) {
    throw new TypeError('configuration_load_failed: candidate lock does not match the trusted installation baseline.');
  }
  for (const [name, expected] of [['vite', '7.3.6'], ['vitest', '4.1.10']] as const) {
    const metadata: unknown = JSON.parse(readFileSync(join(trustedRoot, 'node_modules', name, 'package.json'), 'utf8'));
    if (stringProperty(metadata, 'version') !== expected) {
      throw new TypeError(`configuration_load_failed: installed ${name} must be ${expected}.`);
    }
  }
  const scratchRoot = join(tmpdir(), `heldout-runtime-${String(process.pid)}-${String(Date.now())}`);
  prepareScratch(scratchRoot);
  if (!existsSync(join(root, 'node_modules'))) {
    rmSync(scratchRoot, { recursive: true, force: true });
    throw new TypeError('configuration_load_failed: candidate node_modules mount point is missing.');
  }
  const workerRequest: WorkerRequest = {
    protocol: HELDOUT_RUNTIME_PROTOCOL,
    slice: request.slice,
    bindings: request.bindings,
    phaseTimeoutMs: request.phaseTimeoutMs ?? HELDOUT_RUNTIME_PHASE_TIMEOUT_MS,
    trustedLockDigest: sha256(trustedLock),
    valueEdges: candidateValueEdges(root),
  };
  const args = [
    `--nproc=${String(preflight.nprocLimit)}`, '--nofile=1024', '--fsize=16777216', '--cpu=300', '--',
    bubblewrapExecutable(),
    ...sharedBwrapArguments(runtime.root, root, dirname(fileURLToPath(import.meta.url)), scratchRoot,
      join(trustedRoot, 'node_modules')),
    '/usr/bin/env', '-i', ...cleanEnvironment(),
    '/opt/node/bin/node', '--max-old-space-size=1024', '--max-semi-space-size=64',
    '/guard/heldout-runtime-guard-worker.mjs',
  ];
  let child: ReturnType<typeof spawn> | undefined;
  try {
    child = spawn('/usr/bin/prlimit', args, {
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    });
    const runningChild = child;
    const reportStream = runningChild.stdio[3];
    if (!isReadableStream(reportStream) || runningChild.stdout === null ||
      runningChild.stderr === null || runningChild.stdin === null) {
      throw new TypeError('Runtime guard pipes were not created.');
    }
    const reportTextPromise = collectPipe(reportStream, 128 * 1024 * 1024);
    const diagnosticsPromise = collectPipe(runningChild.stdout, 4 * 1024 * 1024);
    const errorsPromise = collectPipe(runningChild.stderr, 4 * 1024 * 1024);
    runningChild.stdin.end(JSON.stringify(workerRequest));
    const aggregateTimeout = request.aggregateTimeoutMs ?? HELDOUT_RUNTIME_AGGREGATE_TIMEOUT_MS;
    const exitPromise = new Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>((resolveExit, rejectExit) => {
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        try {
          process.kill(-runningChild.pid!, 'SIGKILL');
        } catch {
          runningChild.kill('SIGKILL');
        }
      }, aggregateTimeout);
      runningChild.once('error', (error) => {
        clearTimeout(timer);
        rejectExit(error);
      });
      runningChild.once('exit', (code, signal) => {
        clearTimeout(timer);
        if (timedOut) {
          rejectExit(new TypeError(`configuration_load_failed: aggregate timeout after ${String(aggregateTimeout)}ms; child reaped.`));
        } else {
          resolveExit({ code, signal });
        }
      });
    });
    const [exit, reportText, diagnostics, errors] = await Promise.all([
      exitPromise,
      reportTextPromise,
      diagnosticsPromise,
      errorsPromise,
    ]);
    if (exit.code !== 0 || exit.signal !== null) {
      throw new TypeError(`configuration_load_failed: worker exit ${String(exit.code)}/${exit.signal ?? 'none'}: ${errors || diagnostics}`);
    }
    if (reportText.length === 0) throw new TypeError('configuration_load_failed: worker emitted no report.');
    let decoded: unknown;
    try {
      decoded = JSON.parse(reportText);
    } catch {
      throw new TypeError('configuration_load_failed: worker emitted malformed JSON.');
    }
    const parsed = parseHeldoutWorkerReport(decoded, request.slice);
    return { ...parsed, preflight };
  } finally {
    if (child !== undefined && child.exitCode === null && child.signalCode === null) {
      try {
        process.kill(-child.pid!, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
    rmSync(scratchRoot, { recursive: true, force: true });
  }
}
