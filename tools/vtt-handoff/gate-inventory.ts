import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeSync,
} from 'node:fs';
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export type GateTier = 'gate' | 'landing' | 'supervisor-only';
export type GateReportKind = 'vitest' | 'playwright';

export interface RequiredEnvironmentVariable {
  readonly name: string;
  readonly allowedValues?: readonly string[];
}

export type GateDiscovery =
  | { readonly kind: 'none' }
  | {
    readonly kind: 'vitest';
    readonly configPath: string;
    readonly rootDir: string;
    readonly selectors: readonly string[];
    readonly expectedFiles: 'from-config' | readonly string[];
  }
  | {
    readonly kind: 'playwright';
    readonly configPath: string;
    readonly rootDir: string;
    readonly selectors: readonly string[];
    readonly expectedFiles: 'from-config' | readonly string[];
    readonly expectedTestCount?: number;
  };

export interface ReportExpectation {
  readonly receipt: 'gate-execution-v1';
  readonly gateVerdict: null | {
    readonly version: 2;
    readonly kind: GateReportKind;
    readonly directoryEnvironmentVariable: 'DND_GATE_REPORT_DIR';
  };
}

export interface RequiredHandoffGate {
  readonly id: string;
  readonly tier: GateTier;
  readonly argv: readonly [string, ...string[]];
  readonly env: Readonly<Record<string, string>>;
  readonly requiredEnv: readonly RequiredEnvironmentVariable[];
  readonly cwd: '.';
  readonly configPaths: readonly string[];
  readonly discovery: GateDiscovery;
  readonly report: ReportExpectation;
  readonly prerequisites: readonly string[];
}

const CUMULATIVE_VITEST_FILES = [
  'tests/unit/tools/d583-contract-inventory.test.ts',
  'tests/unit/vtt/art-request.test.ts',
  'tests/unit/vtt/art-stage.test.ts',
  'tests/unit/vtt/art-validator.test.ts',
  'tests/unit/vtt/controller-assignment.test.ts',
  'tests/unit/vtt/detection-ui.test.ts',
  'tests/unit/vtt/door-intent.test.ts',
  'tests/unit/vtt/encounter-board-projection.test.ts',
  'tests/unit/vtt/encounter-projections.test.ts',
  'tests/unit/vtt/encounter-selectors.test.ts',
  'tests/unit/vtt/encounter-session-service.test.ts',
  'tests/unit/vtt/engine-boundary.test.ts',
  'tests/unit/vtt/handoff-bootstrap.test.ts',
  'tests/unit/vtt/handoff-contract.test.ts',
  'tests/unit/vtt/handoff-examples.test.ts',
  'tests/unit/vtt/handoff-package-contract.test.ts',
  'tests/unit/vtt/handoff-publish.test.ts',
  'tests/unit/vtt/in-process-transport.test.ts',
  'tests/unit/vtt/local-session-store.test.ts',
  'tests/unit/vtt/node-runtime.test.ts',
  'tests/unit/vtt/node-websocket-transport.test.ts',
  'tests/unit/vtt/png-validator.test.ts',
  'tests/unit/vtt/preview-hidden-rolls.test.ts',
  'tests/unit/vtt/protocol-runtime.test.ts',
  'tests/unit/vtt/runtime-parity.test.ts',
  'tests/unit/vtt/scene-snapshot.test.ts',
  'tests/unit/vtt/semantic-board-payload.test.ts',
  'tests/unit/vtt/serve-existing-dist.test.ts',
  'tests/unit/vtt/session-lifecycle.test.ts',
  'tests/unit/vtt/session-persistence.test.ts',
  'tests/unit/vtt/two-room-fixture.test.ts',
  'tests/unit/vtt/uuidv7.test.ts',
  'tests/unit/vtt/windows-probe.test.ts',
  'tests/unit/vtt/worker-boundary.test.ts',
] as const;

const VITEST_REPORT = {
  receipt: 'gate-execution-v1',
  gateVerdict: { version: 2, kind: 'vitest', directoryEnvironmentVariable: 'DND_GATE_REPORT_DIR' },
} as const satisfies ReportExpectation;

const PLAYWRIGHT_REPORT = {
  receipt: 'gate-execution-v1',
  gateVerdict: { version: 2, kind: 'playwright', directoryEnvironmentVariable: 'DND_GATE_REPORT_DIR' },
} as const satisfies ReportExpectation;

const OUTER_REPORT = {
  receipt: 'gate-execution-v1',
  gateVerdict: null,
} as const satisfies ReportExpectation;

const HANDOFF_CONFIG = 'tests/browser/vtt-handoff/playwright.config.ts';
const PORT_ENV = { PLAYWRIGHT_PORT: '4410', PLAYWRIGHT_WORKERS: '1' } as const;
const HANDOFF_REQUIRED_ENV = [
  { name: 'PLAYWRIGHT_PORT' },
  { name: 'PLAYWRIGHT_WORKERS', allowedValues: ['1'] },
  { name: 'VTT_HANDOFF_ARTIFACT', allowedValues: ['dev', 'dist'] },
] as const;

export const REQUIRED_HANDOFF_GATES = [
  {
    id: 'full-typecheck',
    tier: 'gate',
    argv: ['npx', 'tsc', '-b', '--force'],
    env: {},
    requiredEnv: [],
    cwd: '.',
    configPaths: ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json'],
    discovery: { kind: 'none' },
    report: OUTER_REPORT,
    prerequisites: [],
  },
  {
    id: 'structural-scan',
    tier: 'gate',
    argv: ['sg', 'scan'],
    env: {},
    requiredEnv: [],
    cwd: '.',
    configPaths: ['sgconfig.yml'],
    discovery: { kind: 'none' },
    report: OUTER_REPORT,
    prerequisites: [],
  },
  {
    id: 'unit-gate',
    tier: 'gate',
    argv: ['npm', 'run', 'test:gate'],
    env: {},
    requiredEnv: [],
    cwd: '.',
    configPaths: ['vitest.config.ts'],
    discovery: {
      kind: 'vitest',
      configPath: 'vitest.config.ts',
      rootDir: '.',
      selectors: [],
      expectedFiles: 'from-config',
    },
    report: VITEST_REPORT,
    prerequisites: [],
  },
  {
    id: 'production-build',
    tier: 'landing',
    argv: ['npm', 'run', 'build'],
    env: {},
    requiredEnv: [],
    cwd: '.',
    configPaths: ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts'],
    discovery: { kind: 'none' },
    report: OUTER_REPORT,
    prerequisites: [],
  },
  {
    id: 'node-runtime-launch',
    tier: 'supervisor-only',
    argv: [
      'node',
      'tools/gate-vitest.mjs',
      '--config',
      'tests/integration-supervisor/vitest.config.ts',
      'tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts',
    ],
    env: {},
    requiredEnv: [],
    cwd: '.',
    configPaths: ['tests/integration-supervisor/vitest.config.ts'],
    discovery: {
      kind: 'vitest',
      configPath: 'tests/integration-supervisor/vitest.config.ts',
      rootDir: '.',
      selectors: ['tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts'],
      expectedFiles: ['tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts'],
    },
    report: VITEST_REPORT,
    prerequisites: ['production-build'],
  },
  {
    id: 'worker-dist-playwright',
    tier: 'landing',
    argv: ['node', 'tools/gate-playwright.mjs', `--config=${HANDOFF_CONFIG}`, 'worker.spec.ts'],
    env: { ...PORT_ENV, VTT_HANDOFF_ARTIFACT: 'dist' },
    requiredEnv: HANDOFF_REQUIRED_ENV,
    cwd: '.',
    configPaths: [HANDOFF_CONFIG],
    discovery: {
      kind: 'playwright',
      configPath: HANDOFF_CONFIG,
      rootDir: 'tests/browser/vtt-handoff',
      selectors: ['worker.spec.ts'],
      expectedFiles: ['tests/browser/vtt-handoff/worker.spec.ts'],
      expectedTestCount: 1,
    },
    report: PLAYWRIGHT_REPORT,
    prerequisites: ['production-build'],
  },
  {
    id: 'browser-gate',
    tier: 'gate',
    argv: ['npm', 'run', 'test:gate:browser'],
    env: PORT_ENV,
    requiredEnv: [
      { name: 'PLAYWRIGHT_PORT' },
      { name: 'PLAYWRIGHT_WORKERS', allowedValues: ['1'] },
    ],
    cwd: '.',
    configPaths: ['playwright.config.ts'],
    discovery: {
      kind: 'playwright',
      configPath: 'playwright.config.ts',
      rootDir: 'tests/browser',
      selectors: [],
      expectedFiles: 'from-config',
    },
    report: PLAYWRIGHT_REPORT,
    prerequisites: [],
  },
  {
    id: 'cumulative-targeted-vitest',
    tier: 'landing',
    argv: ['node', 'tools/gate-vitest.mjs', ...CUMULATIVE_VITEST_FILES],
    env: {},
    requiredEnv: [],
    cwd: '.',
    configPaths: ['vitest.config.ts'],
    discovery: {
      kind: 'vitest',
      configPath: 'vitest.config.ts',
      rootDir: '.',
      selectors: CUMULATIVE_VITEST_FILES,
      expectedFiles: CUMULATIVE_VITEST_FILES,
    },
    report: VITEST_REPORT,
    prerequisites: [],
  },
  {
    id: 'worker-dev-playwright',
    tier: 'landing',
    argv: ['node', 'tools/gate-playwright.mjs', `--config=${HANDOFF_CONFIG}`, 'worker.spec.ts'],
    env: { ...PORT_ENV, VTT_HANDOFF_ARTIFACT: 'dev' },
    requiredEnv: HANDOFF_REQUIRED_ENV,
    cwd: '.',
    configPaths: [HANDOFF_CONFIG],
    discovery: {
      kind: 'playwright',
      configPath: HANDOFF_CONFIG,
      rootDir: 'tests/browser/vtt-handoff',
      selectors: ['worker.spec.ts'],
      expectedFiles: ['tests/browser/vtt-handoff/worker.spec.ts'],
      expectedTestCount: 1,
    },
    report: PLAYWRIGHT_REPORT,
    prerequisites: [],
  },
  {
    id: 'runtime-parity-playwright',
    tier: 'landing',
    argv: ['node', 'tools/gate-playwright.mjs', `--config=${HANDOFF_CONFIG}`, 'runtime-parity.spec.ts'],
    env: { ...PORT_ENV, VTT_HANDOFF_ARTIFACT: 'dev' },
    requiredEnv: HANDOFF_REQUIRED_ENV,
    cwd: '.',
    configPaths: [HANDOFF_CONFIG],
    discovery: {
      kind: 'playwright',
      configPath: HANDOFF_CONFIG,
      rootDir: 'tests/browser/vtt-handoff',
      selectors: ['runtime-parity.spec.ts'],
      expectedFiles: ['tests/browser/vtt-handoff/runtime-parity.spec.ts'],
      expectedTestCount: 1,
    },
    report: PLAYWRIGHT_REPORT,
    prerequisites: [],
  },
  {
    id: 'top-down-smoke-playwright',
    tier: 'landing',
    argv: ['node', 'tools/gate-playwright.mjs', `--config=${HANDOFF_CONFIG}`, 'top-down-smoke.spec.ts'],
    env: { ...PORT_ENV, VTT_HANDOFF_ARTIFACT: 'dev' },
    requiredEnv: HANDOFF_REQUIRED_ENV,
    cwd: '.',
    configPaths: [HANDOFF_CONFIG],
    discovery: {
      kind: 'playwright',
      configPath: HANDOFF_CONFIG,
      rootDir: 'tests/browser/vtt-handoff',
      selectors: ['top-down-smoke.spec.ts'],
      expectedFiles: ['tests/browser/vtt-handoff/top-down-smoke.spec.ts'],
      expectedTestCount: 1,
    },
    report: PLAYWRIGHT_REPORT,
    prerequisites: [],
  },
] as const satisfies readonly RequiredHandoffGate[];

export type GateId = typeof REQUIRED_HANDOFF_GATES[number]['id'];

const EXPECTED_GATE_IDS = [
  'full-typecheck',
  'structural-scan',
  'unit-gate',
  'production-build',
  'node-runtime-launch',
  'worker-dist-playwright',
  'browser-gate',
  'cumulative-targeted-vitest',
  'worker-dev-playwright',
  'runtime-parity-playwright',
  'top-down-smoke-playwright',
] as const;
const EXPECTED_TEST_GATE_KINDS: Readonly<Record<string, GateReportKind>> = {
  'unit-gate': 'vitest',
  'node-runtime-launch': 'vitest',
  'worker-dist-playwright': 'playwright',
  'browser-gate': 'playwright',
  'cumulative-targeted-vitest': 'vitest',
  'worker-dev-playwright': 'playwright',
  'runtime-parity-playwright': 'playwright',
  'top-down-smoke-playwright': 'playwright',
};
const FORBIDDEN_MODULE_OVERRIDES = [
  'DND_GATE_VITEST_MODULE',
  'DND_GATE_PLAYWRIGHT_MODULE',
  'DND_GATE_FLOCK_MODULE',
] as const;
const PLAYWRIGHT_DISCOVERY_REDIRECTS = [
  'PLAYWRIGHT_JSON_OUTPUT_FILE',
  'PLAYWRIGHT_JSON_OUTPUT_NAME',
  'PLAYWRIGHT_JSON_OUTPUT_DIR',
] as const;

function environmentCopy(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(environment).filter((entry): entry is [string, string] =>
    entry[1] !== undefined));
}

export function prepareExecutionEnvironment(
  ambient: NodeJS.ProcessEnv,
  gate: RequiredHandoffGate,
  reportDirectory: string,
): NodeJS.ProcessEnv {
  for (const name of FORBIDDEN_MODULE_OVERRIDES) {
    if (ambient[name] !== undefined || gate.env[name] !== undefined) {
      throw new Error(`FORBIDDEN_GATE_MODULE_OVERRIDE: ${name}`);
    }
  }
  const prepared = environmentCopy(ambient);
  for (const name of FORBIDDEN_MODULE_OVERRIDES) delete prepared[name];
  return { ...prepared, ...gate.env, DND_GATE_REPORT_DIR: reportDirectory };
}

export function prepareDiscoveryEnvironment(
  ambient: NodeJS.ProcessEnv,
  gate: RequiredHandoffGate,
): NodeJS.ProcessEnv {
  const prepared = { ...environmentCopy(ambient), ...gate.env };
  for (const name of [...FORBIDDEN_MODULE_OVERRIDES, ...PLAYWRIGHT_DISCOVERY_REDIRECTS]) {
    delete prepared[name];
  }
  return prepared;
}

function quotePosix(token: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/u.test(token)) return token;
  if (token.length === 0) return "''";
  return `'${token.replaceAll("'", `'"'"'`)}'`;
}

export function renderGateCommand(gate: RequiredHandoffGate): string {
  const environment = Object.entries(gate.env)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${quotePosix(value)}`);
  return [...environment, ...gate.argv.map(quotePosix)].join(' ');
}

export function renderReceiptCommand(
  gate: RequiredHandoffGate,
  reportDirectory: string,
  prerequisiteReceiptPaths: readonly string[] = [],
): string {
  const arguments_ = [
    'npm',
    'run',
    'handoff:gate',
    '--',
    'run',
    gate.id,
    '--report-dir',
    reportDirectory,
    ...prerequisiteReceiptPaths.flatMap((path) => ['--prerequisite-receipt', path]),
  ];
  return arguments_.map(quotePosix).join(' ');
}

export interface InventoryResolution {
  readonly fileExists: (path: string) => boolean;
  readonly commandPath: (command: string) => string | null;
  readonly packageScripts: Readonly<Record<string, string>>;
}

export interface InventoryValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

function pathCommand(command: string, environment: NodeJS.ProcessEnv = process.env): string | null {
  if (command.includes('/')) return existsSync(command) ? realpathSync(command) : null;
  for (const directory of (environment.PATH ?? '').split(delimiter)) {
    if (directory.length === 0) continue;
    const candidate = join(directory, command);
    if (existsSync(candidate)) return realpathSync(candidate);
  }
  return null;
}

function systemResolution(repositoryRoot: string): InventoryResolution {
  const packageCandidate = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as unknown;
  const scripts = isRecord(packageCandidate) && isRecord(packageCandidate.scripts)
    ? Object.fromEntries(Object.entries(packageCandidate.scripts).filter((entry): entry is [string, string] =>
      typeof entry[1] === 'string'))
    : {};
  return {
    fileExists: (path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    },
    commandPath: (command) => pathCommand(command),
    packageScripts: scripts,
  };
}

function localExecutable(repositoryRoot: string, command: string): string {
  return join(repositoryRoot, 'node_modules', '.bin', command);
}

function npmScriptTargets(script: string): readonly string[] | null {
  if (/[|;<>`$()]/u.test(script)) return null;
  const targets: string[] = [];
  for (const segment of script.split('&&')) {
    const tokens = segment.trim().split(/\s+/u);
    const command = tokens.find((token) => !/^[A-Z_][A-Z0-9_]*=/u.test(token));
    if (command === undefined) return null;
    if (command === 'node') {
      const index = tokens.indexOf(command);
      const target = tokens[index + 1];
      if (target === undefined) return null;
      targets.push(target);
    } else {
      targets.push(`node_modules/.bin/${command}`);
    }
  }
  return targets;
}

function validateLauncher(
  gate: RequiredHandoffGate,
  repositoryRoot: string,
  resolution: InventoryResolution,
  errors: string[],
): void {
  const executable = gate.argv[0];
  if (resolution.commandPath(executable) === null) errors.push(`ARGV_EXECUTABLE_MISSING: ${gate.id}: ${executable}`);
  if (executable === 'node') {
    const target = gate.argv[1];
    if (target === undefined || !resolution.fileExists(resolve(repositoryRoot, target))) {
      errors.push(`ARGV_NODE_TARGET_MISSING: ${gate.id}: ${target ?? '(missing)'}`);
    }
  }
  if (executable === 'npx') {
    const target = gate.argv[1];
    if (target === undefined || !resolution.fileExists(localExecutable(repositoryRoot, target))) {
      errors.push(`ARGV_LOCAL_EXECUTABLE_MISSING: ${gate.id}: ${target ?? '(missing)'}`);
    }
  }
  if (executable !== 'npm' || gate.argv[1] !== 'run') return;
  const scriptName = gate.argv[2];
  const script = scriptName === undefined ? undefined : resolution.packageScripts[scriptName];
  if (script === undefined) {
    errors.push(`ARGV_NPM_SCRIPT_MISSING: ${gate.id}: ${scriptName ?? '(missing)'}`);
    return;
  }
  const targets = npmScriptTargets(script);
  if (targets === null) {
    errors.push(`ARGV_NPM_SCRIPT_UNRESOLVED: ${gate.id}: ${scriptName}`);
    return;
  }
  for (const target of targets) {
    if (!resolution.fileExists(resolve(repositoryRoot, target))) {
      errors.push(`ARGV_NPM_TARGET_MISSING: ${gate.id}: ${target}`);
    }
  }
}

function declaredRunnerTarget(
  gate: RequiredHandoffGate,
  resolution: InventoryResolution,
): string | null {
  if (gate.argv[0] === 'node') return gate.argv[1] ?? null;
  if (gate.argv[0] !== 'npm' || gate.argv[1] !== 'run') return null;
  const scriptName = gate.argv[2];
  const script = scriptName === undefined ? undefined : resolution.packageScripts[scriptName];
  if (script === undefined) return null;
  return npmScriptTargets(script)?.find((target) => target.includes('tools/gate-')) ?? null;
}

function insideRepository(repositoryRoot: string, path: string): boolean {
  const relation = relative(resolve(repositoryRoot), resolve(path));
  return relation === '' || (relation !== '..' && !relation.startsWith(`..${sep}`) && !isAbsolute(relation));
}

function duplicates(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate].sort();
}

export function validateGateInventory(
  candidate: readonly RequiredHandoffGate[],
  repositoryRoot: string,
  resolution: InventoryResolution = systemResolution(repositoryRoot),
): InventoryValidation {
  const errors: string[] = [];
  const ids = candidate.map((gate) => gate.id);
  if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_GATE_IDS)) errors.push('GATE_ID_SET_MISMATCH');
  for (const id of duplicates(ids)) errors.push(`GATE_ID_DUPLICATE: ${id}`);
  for (const gate of candidate) {
    if (gate.id.length === 0) errors.push('GATE_ID_EMPTY');
    if (gate.cwd !== '.' || !insideRepository(repositoryRoot, resolve(repositoryRoot, gate.cwd))) {
      errors.push(`GATE_CWD_INVALID: ${gate.id}`);
    }
    if (gate.argv.length === 0 || gate.argv.some((token) =>
      token.length === 0 || /<[^>]*>|TODO|\$\(|[;&|`]/u.test(token))) {
      errors.push(`GATE_ARGV_INVALID: ${gate.id}`);
    }
    validateLauncher(gate, repositoryRoot, resolution, errors);
    for (const name of FORBIDDEN_MODULE_OVERRIDES) {
      if (gate.env[name] !== undefined) errors.push(`GATE_ENV_FORBIDDEN: ${gate.id}: ${name}`);
    }
    for (const name of PLAYWRIGHT_DISCOVERY_REDIRECTS) {
      if (gate.env[name] !== undefined) errors.push(`GATE_ENV_FORBIDDEN: ${gate.id}: ${name}`);
    }
    for (const [name, value] of Object.entries(gate.env)) {
      if (/\$\(|[;|`]/u.test(value)) errors.push(`GATE_ENV_INVALID: ${gate.id}: ${name}`);
    }
    for (const configPath of gate.configPaths) {
      const absolute = resolve(repositoryRoot, configPath);
      if (!insideRepository(repositoryRoot, absolute) || !resolution.fileExists(absolute)) {
        errors.push(`GATE_CONFIG_MISSING: ${gate.id}: ${configPath}`);
      }
    }
    for (const requirement of gate.requiredEnv) {
      const value = gate.env[requirement.name];
      if (value === undefined) errors.push(`GATE_ENV_MISSING: ${gate.id}: ${requirement.name}`);
      if (value !== undefined && requirement.allowedValues !== undefined &&
        !requirement.allowedValues.includes(value)) {
        errors.push(`GATE_ENV_INVALID: ${gate.id}: ${requirement.name}`);
      }
    }
    if (gate.env.PLAYWRIGHT_PORT === '4173') errors.push(`GATE_PORT_FORBIDDEN: ${gate.id}`);
    if (gate.env.PLAYWRIGHT_PORT !== undefined &&
      (!/^\d+$/u.test(gate.env.PLAYWRIGHT_PORT) || Number(gate.env.PLAYWRIGHT_PORT) > 65_535 ||
        Number(gate.env.PLAYWRIGHT_PORT) < 1)) {
      errors.push(`GATE_PORT_INVALID: ${gate.id}`);
    }
    if (gate.discovery.kind !== 'none' && gate.discovery.expectedFiles !== 'from-config') {
      for (const file of gate.discovery.expectedFiles) {
        const absolute = resolve(repositoryRoot, file);
        if (!insideRepository(repositoryRoot, absolute) || !resolution.fileExists(absolute)) {
          errors.push(`GATE_EXPECTED_FILE_MISSING: ${gate.id}: ${file}`);
        }
      }
      for (const file of duplicates(gate.discovery.expectedFiles)) {
        errors.push(`GATE_EXPECTED_FILE_DUPLICATE: ${gate.id}: ${file}`);
      }
    }
    if (gate.discovery.kind !== 'none') {
      const discoveryRoot = resolve(repositoryRoot, gate.discovery.rootDir);
      if (gate.discovery.rootDir.length === 0 || !insideRepository(repositoryRoot, discoveryRoot)) {
        errors.push(`GATE_DISCOVERY_ROOT_INVALID: ${gate.id}`);
      }
    }
    if (gate.discovery.kind === 'none' && gate.report.gateVerdict !== null) {
      errors.push(`GATE_REPORT_KIND_MISMATCH: ${gate.id}`);
    }
    if (gate.discovery.kind !== 'none' &&
      (gate.report.gateVerdict?.kind !== gate.discovery.kind ||
        !gate.configPaths.includes(gate.discovery.configPath))) {
      errors.push(`GATE_REPORT_KIND_MISMATCH: ${gate.id}`);
    }
    const expectedKind = EXPECTED_TEST_GATE_KINDS[gate.id];
    if (expectedKind !== undefined) {
      if (gate.discovery.kind === 'none' || gate.report.gateVerdict === null) {
        errors.push(`GATE_TEST_REQUIREMENT_MISSING: ${gate.id}`);
      }
      const expectedRunner = `tools/gate-${expectedKind}.mjs`;
      if (declaredRunnerTarget(gate, resolution) !== expectedRunner) {
        errors.push(`GATE_RUNNER_KIND_MISMATCH: ${gate.id}`);
      }
    }
    if (gate.tier === 'supervisor-only' && gate.discovery.kind !== 'none' &&
      gate.discovery.selectors.some((selector) => !selector.startsWith('tests/integration-supervisor/'))) {
      errors.push(`GATE_SUPERVISOR_SELECTOR_INVALID: ${gate.id}`);
    }
    for (const prerequisite of gate.prerequisites) {
      if (!ids.includes(prerequisite) || prerequisite === gate.id) {
        errors.push(`GATE_PREREQUISITE_INVALID: ${gate.id}: ${prerequisite}`);
      }
    }
  }
  const byId = new Map(candidate.map((gate) => [gate.id, gate]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      errors.push(`GATE_PREREQUISITE_CYCLE: ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id);
  const dist = byId.get('worker-dist-playwright');
  if (!dist?.prerequisites.includes('production-build')) errors.push('GATE_DIST_BUILD_PREREQUISITE_MISSING');
  if (byId.get('node-runtime-launch')?.tier !== 'supervisor-only') errors.push('GATE_SUPERVISOR_TIER_INVALID');
  const cumulative = byId.get('cumulative-targeted-vitest')?.discovery;
  if (cumulative?.kind !== 'vitest' || cumulative.expectedFiles === 'from-config' ||
    JSON.stringify(cumulative.expectedFiles) !== JSON.stringify(CUMULATIVE_VITEST_FILES)) {
    errors.push('GATE_CUMULATIVE_FILE_SET_MISMATCH');
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizedRepositoryFile(repositoryRoot: string, path: string): string {
  const absolute = resolve(path);
  if (!insideRepository(repositoryRoot, absolute)) throw new Error(`DISCOVERY_PATH_OUTSIDE_REPOSITORY: ${path}`);
  return relative(resolve(repositoryRoot), absolute).split(sep).join('/');
}

export interface DiscoveryResult {
  readonly kind: GateDiscovery['kind'];
  readonly rootDir: string | null;
  readonly files: readonly string[];
  readonly testIdentities: readonly string[];
}

export function parseVitestList(document: unknown, repositoryRoot = process.cwd()): DiscoveryResult {
  if (!Array.isArray(document)) throw new Error('VITEST_DISCOVERY_MALFORMED');
  const files = document.map((entry) => {
    if (!isRecord(entry) || typeof entry.file !== 'string') throw new Error('VITEST_DISCOVERY_MALFORMED');
    return normalizedRepositoryFile(repositoryRoot, entry.file);
  }).sort();
  if (files.length === 0) throw new Error('VITEST_DISCOVERY_EMPTY');
  if (duplicates(files).length > 0) throw new Error('VITEST_DISCOVERY_DUPLICATE');
  return { kind: 'vitest', rootDir: resolve(repositoryRoot), files, testIdentities: [] };
}

export function parsePlaywrightList(document: unknown, repositoryRoot = process.cwd()): DiscoveryResult {
  if (!isRecord(document) || !isRecord(document.config) || typeof document.config.rootDir !== 'string' ||
    !isAbsolute(document.config.rootDir) || !Array.isArray(document.suites) || !Array.isArray(document.errors) ||
    document.errors.length > 0) {
    throw new Error('PLAYWRIGHT_DISCOVERY_MALFORMED');
  }
  const rootDir = resolve(document.config.rootDir);
  if (!insideRepository(repositoryRoot, rootDir)) throw new Error('PLAYWRIGHT_ROOT_OUTSIDE_REPOSITORY');
  const files: string[] = [];
  const testIdentities: string[] = [];
  const visit = (suite: unknown, inheritedFile: string | null): void => {
    if (!isRecord(suite)) throw new Error('PLAYWRIGHT_DISCOVERY_MALFORMED');
    const suiteFile = typeof suite.file === 'string' ? suite.file : inheritedFile;
    if (suite.specs !== undefined) {
      if (!Array.isArray(suite.specs)) throw new Error('PLAYWRIGHT_DISCOVERY_MALFORMED');
      for (const specification of suite.specs) {
        if (!isRecord(specification) || typeof specification.id !== 'string') {
          throw new Error('PLAYWRIGHT_DISCOVERY_MALFORMED');
        }
        const file = typeof specification.file === 'string' ? specification.file : suiteFile;
        if (file === null) throw new Error('PLAYWRIGHT_DISCOVERY_FILE_MISSING');
        const absolute = isAbsolute(file) ? resolve(file) : resolve(rootDir, file);
        const normalized = normalizedRepositoryFile(repositoryRoot, absolute);
        if (!Array.isArray(specification.tests) || specification.tests.length === 0) {
          throw new Error('PLAYWRIGHT_DISCOVERY_TEST_MISSING');
        }
        files.push(normalized);
        for (const test of specification.tests) {
          if (!isRecord(test) || typeof test.projectName !== 'string') {
            throw new Error('PLAYWRIGHT_DISCOVERY_MALFORMED');
          }
          testIdentities.push(`${test.projectName}:${specification.id}:${absolute}`);
        }
      }
    }
    if (suite.suites !== undefined) {
      if (!Array.isArray(suite.suites)) throw new Error('PLAYWRIGHT_DISCOVERY_MALFORMED');
      for (const child of suite.suites) visit(child, suiteFile);
    }
  };
  for (const suite of document.suites) visit(suite, null);
  const uniqueFiles = [...new Set(files)].sort();
  const sortedTests = [...testIdentities].sort();
  if (sortedTests.length === 0) throw new Error('PLAYWRIGHT_DISCOVERY_EMPTY');
  if (duplicates(sortedTests).length > 0) throw new Error('PLAYWRIGHT_DISCOVERY_DUPLICATE');
  return { kind: 'playwright', rootDir, files: uniqueFiles, testIdentities: sortedTests };
}

function parseStdoutJson(stdout: string, kind: GateReportKind): unknown {
  try {
    return JSON.parse(stdout) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${kind.toUpperCase()}_DISCOVERY_JSON_INVALID: ${message}`);
  }
}

export function resolveGateDiscovery(
  gate: RequiredHandoffGate,
  repositoryRoot = process.cwd(),
): DiscoveryResult {
  if (gate.discovery.kind === 'none') {
    return { kind: 'none', rootDir: null, files: [], testIdentities: [] };
  }
  const environment = prepareDiscoveryEnvironment(process.env, gate);
  const modulePath = gate.discovery.kind === 'vitest'
    ? join(repositoryRoot, 'node_modules/vitest/vitest.mjs')
    : join(repositoryRoot, 'node_modules/@playwright/test/cli.js');
  const arguments_ = gate.discovery.kind === 'vitest'
    ? [
      modulePath,
      'list',
      '--configLoader',
      'runner',
      '--config',
      gate.discovery.configPath,
      ...gate.discovery.selectors,
      '--filesOnly',
      '--json',
    ]
    : [
      modulePath,
      'test',
      `--config=${gate.discovery.configPath}`,
      ...gate.discovery.selectors,
      '--list',
      '--reporter=json',
    ];
  const result = spawnSync(process.execPath, arguments_, {
    cwd: repositoryRoot,
    env: environment,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error !== undefined || result.signal !== null || result.status !== 0) {
    throw new Error(
      `DISCOVERY_PROCESS_FAILED: ${gate.id}: ${result.error?.message ?? result.signal ?? String(result.status)}: ` +
      result.stderr.trim(),
    );
  }
  const discovered = gate.discovery.kind === 'vitest'
    ? parseVitestList(parseStdoutJson(result.stdout, 'vitest'), repositoryRoot)
    : parsePlaywrightList(parseStdoutJson(result.stdout, 'playwright'), repositoryRoot);
  if (discovered.rootDir !== resolve(repositoryRoot, gate.discovery.rootDir)) {
    throw new Error(`DISCOVERY_ROOT_MISMATCH: ${gate.id}`);
  }
  if (gate.discovery.expectedFiles !== 'from-config') {
    const expected = [...gate.discovery.expectedFiles].sort();
    if (JSON.stringify(discovered.files) !== JSON.stringify(expected)) {
      throw new Error(`DISCOVERY_FILE_SET_MISMATCH: ${gate.id}`);
    }
  }
  if (gate.discovery.kind === 'playwright' && gate.discovery.expectedTestCount !== undefined &&
    discovered.testIdentities.length !== gate.discovery.expectedTestCount) {
    throw new Error(`DISCOVERY_TEST_COUNT_MISMATCH: ${gate.id}`);
  }
  return discovered;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function inventoryEntryDigest(gate: RequiredHandoffGate): string {
  return sha256(JSON.stringify(gate));
}

interface StructuredError {
  readonly code: string | null;
  readonly message: string;
}

interface M1Command {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly lock: { readonly executable: string; readonly arguments: readonly string[] };
}

interface M1Discovery {
  readonly requestedExecutionIds: readonly string[];
  readonly reportedExecutionIds: readonly string[];
  readonly requestedFiles: readonly string[];
  readonly reportedFiles: readonly string[];
}

interface M1FileOutcome {
  readonly file: string;
  readonly status: 'passed' | 'failed' | 'skipped' | 'unfinished';
  readonly executionIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface M1ExecutionOutcome {
  readonly executionId: string;
  readonly file: string;
  readonly status: 'passed' | 'failed' | 'skipped' | 'unfinished';
  readonly approvedSkip: boolean;
}

interface M1Phase {
  readonly phase: 'initial' | 'retry';
  readonly phaseInvocationId: string;
  readonly command: M1Command;
  readonly discovery: M1Discovery;
  readonly fileOutcomes: readonly M1FileOutcome[];
  readonly executionAccountingAvailable: boolean;
  readonly executionOutcomes: readonly M1ExecutionOutcome[];
}

export interface M1Verdict {
  readonly status: 'passed' | 'failed';
  readonly passedOnRetry: readonly string[];
  readonly failedFiles: readonly string[];
  readonly phaseFailures: readonly unknown[];
}

export interface M1GateReport {
  readonly version: 2;
  readonly kind: GateReportKind;
  readonly phases: { readonly initial: M1Phase; readonly retry: M1Phase | null };
  readonly verdict: M1Verdict;
}

export interface GatePhaseExecutionAccounting {
  readonly phase: 'initial' | 'retry';
  readonly phaseInvocationId: string;
  readonly requiredTestIdentities: readonly string[];
  readonly executedTestIdentities: readonly string[];
  readonly failedTestIdentities: readonly string[];
  readonly skippedTestIdentities: readonly string[];
  readonly approvedSkippedTestIdentities: readonly string[];
}

export interface GateExecutionAccounting {
  readonly requiredFiles: readonly string[];
  readonly requiredTestIdentities: readonly string[];
  readonly phases: readonly GatePhaseExecutionAccounting[];
}

function stringArray(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : null;
}

function parseM1Command(value: unknown): M1Command | null {
  if (!isRecord(value) || typeof value.executable !== 'string' || !isRecord(value.lock) ||
    typeof value.lock.executable !== 'string') return null;
  const arguments_ = stringArray(value.arguments);
  const lockArguments = stringArray(value.lock.arguments);
  return arguments_ === null || lockArguments === null ? null : {
    executable: value.executable,
    arguments: arguments_,
    lock: { executable: value.lock.executable, arguments: lockArguments },
  };
}

function parseM1Discovery(value: unknown): M1Discovery | null {
  if (!isRecord(value)) return null;
  const requestedExecutionIds = stringArray(value.requestedExecutionIds);
  const reportedExecutionIds = stringArray(value.reportedExecutionIds);
  const requestedFiles = stringArray(value.requestedFiles);
  const reportedFiles = stringArray(value.reportedFiles);
  if (requestedExecutionIds === null || reportedExecutionIds === null || requestedFiles === null ||
    reportedFiles === null) return null;
  return { requestedExecutionIds, reportedExecutionIds, requestedFiles, reportedFiles };
}

function executionStatus(value: unknown): M1ExecutionOutcome['status'] | null {
  return value === 'passed' || value === 'failed' || value === 'skipped' || value === 'unfinished'
    ? value
    : null;
}

function parseExecutionOutcomes(value: unknown): readonly M1ExecutionOutcome[] | null {
  if (!Array.isArray(value)) return null;
  const outcomes: M1ExecutionOutcome[] = [];
  for (const outcome of value) {
    if (!isRecord(outcome) || typeof outcome.executionId !== 'string' || typeof outcome.file !== 'string' ||
      typeof outcome.approvedSkip !== 'boolean') return null;
    const status = executionStatus(outcome.status);
    if (status === null) return null;
    outcomes.push({
      executionId: outcome.executionId,
      file: outcome.file,
      status,
      approvedSkip: outcome.approvedSkip,
    });
  }
  return outcomes;
}

function playwrightEvidenceOutcomes(evidence: Record<string, unknown>): readonly M1ExecutionOutcome[] | null {
  if (!Array.isArray(evidence.tests)) return null;
  const outcomes: M1ExecutionOutcome[] = [];
  for (const test of evidence.tests) {
    if (!isRecord(test) || typeof test.executionId !== 'string' || typeof test.file !== 'string') return null;
    const approvedSkip = test.status === 'skipped' && test.expectedStatus === 'skipped';
    let status: M1ExecutionOutcome['status'];
    if (test.onTestEndObserved === false || test.status === 'interrupted') status = 'unfinished';
    else if (approvedSkip) status = 'skipped';
    else if (test.status === 'skipped') status = 'unfinished';
    else if (test.outcome === 'flaky' || test.status === test.expectedStatus) status = 'passed';
    else status = 'failed';
    outcomes.push({ executionId: test.executionId, file: test.file, status, approvedSkip });
  }
  return outcomes;
}

function vitestEvidenceOutcomes(evidence: Record<string, unknown>): readonly M1ExecutionOutcome[] | null {
  if (!Array.isArray(evidence.modules)) return null;
  const outcomes: M1ExecutionOutcome[] = [];
  for (const module of evidence.modules) {
    if (!isRecord(module) || typeof module.executionId !== 'string' || typeof module.file !== 'string') return null;
    const status = module.state === 'pending' || module.state === 'queued'
      ? 'unfinished'
      : executionStatus(module.state);
    if (status === null) return null;
    outcomes.push({
      executionId: module.executionId,
      file: module.file,
      status,
      approvedSkip: status === 'skipped',
    });
  }
  return outcomes;
}

function phaseExecutionOutcomes(
  value: Record<string, unknown>,
  kind: GateReportKind,
): { readonly available: boolean; readonly outcomes: readonly M1ExecutionOutcome[] } {
  const direct = parseExecutionOutcomes(value.executionOutcomes);
  if (direct !== null) return { available: true, outcomes: direct };
  if (!isRecord(value.evidence)) return { available: false, outcomes: [] };
  const outcomes = kind === 'playwright'
    ? playwrightEvidenceOutcomes(value.evidence)
    : vitestEvidenceOutcomes(value.evidence);
  return outcomes === null
    ? { available: false, outcomes: [] }
    : { available: true, outcomes };
}

function parseM1Phase(value: unknown, expectedPhase: M1Phase['phase'], kind: GateReportKind): M1Phase | null {
  if (!isRecord(value) || value.phase !== expectedPhase || typeof value.phaseInvocationId !== 'string' ||
    !Array.isArray(value.fileOutcomes)) return null;
  const command = parseM1Command(value.command);
  const discovery = parseM1Discovery(value.discovery);
  if (command === null || discovery === null) return null;
  const fileOutcomes: M1FileOutcome[] = [];
  for (const outcome of value.fileOutcomes) {
    if (!isRecord(outcome) || typeof outcome.file !== 'string') return null;
    const status = executionStatus(outcome.status);
    const executionIds = outcome.executionIds === undefined ? [] : stringArray(outcome.executionIds);
    const reasons = outcome.reasons === undefined ? [] : stringArray(outcome.reasons);
    if (status === null || executionIds === null || reasons === null) return null;
    fileOutcomes.push({ file: outcome.file, status, executionIds, reasons });
  }
  const executionAccounting = phaseExecutionOutcomes(value, kind);
  return {
    phase: expectedPhase,
    phaseInvocationId: value.phaseInvocationId,
    command,
    discovery,
    fileOutcomes,
    executionAccountingAvailable: executionAccounting.available,
    executionOutcomes: executionAccounting.outcomes,
  };
}

export function parseM1GateReport(value: unknown): M1GateReport {
  if (!isRecord(value) || value.version !== 2 || (value.kind !== 'vitest' && value.kind !== 'playwright') ||
    !isRecord(value.phases) || !isRecord(value.verdict) ||
    (value.verdict.status !== 'passed' && value.verdict.status !== 'failed')) {
    throw new Error('M1_REPORT_INVALID');
  }
  const initial = parseM1Phase(value.phases.initial, 'initial', value.kind);
  const retry = value.phases.retry === null ? null : parseM1Phase(value.phases.retry, 'retry', value.kind);
  const passedOnRetry = stringArray(value.verdict.passedOnRetry);
  const failedFiles = stringArray(value.verdict.failedFiles);
  if (initial === null || (value.phases.retry !== null && retry === null) || passedOnRetry === null ||
    failedFiles === null || !Array.isArray(value.verdict.phaseFailures)) throw new Error('M1_REPORT_INVALID');
  return {
    version: 2,
    kind: value.kind,
    phases: { initial, retry },
    verdict: {
      status: value.verdict.status,
      passedOnRetry,
      failedFiles,
      phaseFailures: value.verdict.phaseFailures,
    },
  };
}

function phaseAccounting(phase: M1Phase): GatePhaseExecutionAccounting {
  return {
    phase: phase.phase,
    phaseInvocationId: phase.phaseInvocationId,
    requiredTestIdentities: sorted(phase.discovery.requestedExecutionIds),
    executedTestIdentities: sorted(phase.executionOutcomes
      .filter((outcome) => outcome.status === 'passed' || outcome.status === 'failed')
      .map((outcome) => outcome.executionId)),
    failedTestIdentities: sorted(phase.executionOutcomes
      .filter((outcome) => outcome.status === 'failed')
      .map((outcome) => outcome.executionId)),
    skippedTestIdentities: sorted(phase.executionOutcomes
      .filter((outcome) => outcome.status === 'skipped')
      .map((outcome) => outcome.executionId)),
    approvedSkippedTestIdentities: sorted(phase.executionOutcomes
      .filter((outcome) => outcome.status === 'skipped' && outcome.approvedSkip)
      .map((outcome) => outcome.executionId)),
  };
}

export function executionAccounting(
  report: M1GateReport,
  discovery: DiscoveryResult,
): GateExecutionAccounting | null {
  const phases = [report.phases.initial, report.phases.retry]
    .filter((phase): phase is M1Phase => phase !== null);
  if (phases.some((phase) => !phase.executionAccountingAvailable)) return null;
  const requiredTestIdentities = report.kind === 'playwright'
    ? discovery.testIdentities
    : report.phases.initial.discovery.requestedExecutionIds;
  return {
    requiredFiles: discovery.files,
    requiredTestIdentities: sorted(requiredTestIdentities),
    phases: phases.map(phaseAccounting),
  };
}

function resolvedCommand(command: string, repositoryRoot: string): string | null {
  if (isAbsolute(command)) return existsSync(command) ? realpathSync(command) : null;
  if (command.includes('/')) {
    const candidate = resolve(repositoryRoot, command);
    return existsSync(candidate) ? realpathSync(candidate) : null;
  }
  return pathCommand(command);
}

function suffixMatches(values: readonly string[], suffix: readonly string[]): boolean {
  if (suffix.length > values.length) return false;
  return suffix.every((value, index) => values[values.length - suffix.length + index] === value);
}

export function authenticateM1PhaseCommands(
  report: M1GateReport,
  repositoryRoot: string,
): boolean {
  const expectedModule = realpathSync(join(
    repositoryRoot,
    report.kind === 'vitest' ? 'node_modules/vitest/vitest.mjs' : 'node_modules/@playwright/test/cli.js',
  ));
  const expectedNode = realpathSync(process.execPath);
  const expectedFlock = pathCommand('flock');
  if (expectedFlock === null) return false;
  for (const phase of [report.phases.initial, report.phases.retry].filter((entry): entry is M1Phase =>
    entry !== null)) {
    const executable = resolvedCommand(phase.command.executable, repositoryRoot);
    const module = phase.command.arguments[0] === undefined
      ? null
      : resolvedCommand(phase.command.arguments[0], repositoryRoot);
    const lock = resolvedCommand(phase.command.lock.executable, repositoryRoot);
    const commandSuffix = [phase.command.executable, ...phase.command.arguments];
    if (executable !== expectedNode || module !== expectedModule || lock !== expectedFlock ||
      !suffixMatches(phase.command.lock.arguments, commandSuffix)) return false;
  }
  return true;
}

function sorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

export function reconcileM1Discovery(
  gate: RequiredHandoffGate,
  discovery: DiscoveryResult,
  report: M1GateReport,
): readonly string[] {
  const reasons: string[] = [];
  const initial = report.phases.initial;
  if (JSON.stringify(sorted(initial.discovery.requestedFiles)) !== JSON.stringify(discovery.files) ||
    JSON.stringify(sorted(initial.discovery.reportedFiles)) !== JSON.stringify(discovery.files)) {
    reasons.push('INITIAL_DISCOVERY_FILE_MISMATCH');
  }
  if (report.kind === 'playwright' &&
    (JSON.stringify(sorted(initial.discovery.requestedExecutionIds)) !== JSON.stringify(discovery.testIdentities) ||
      JSON.stringify(sorted(initial.discovery.reportedExecutionIds)) !== JSON.stringify(discovery.testIdentities))) {
    reasons.push('INITIAL_DISCOVERY_IDENTITY_MISMATCH');
  }
  if (gate.discovery.kind !== 'none' && gate.discovery.expectedFiles !== 'from-config' &&
    JSON.stringify(sorted(gate.discovery.expectedFiles)) !== JSON.stringify(discovery.files)) {
    reasons.push('EXPECTED_DISCOVERY_FILE_MISMATCH');
  }
  const initiallyFailed = sorted(initial.fileOutcomes
    .filter((outcome) => outcome.status === 'failed')
    .map((outcome) => outcome.file));
  const retry = report.phases.retry;
  if (retry !== null) {
    if (JSON.stringify(sorted(retry.discovery.requestedFiles)) !== JSON.stringify(initiallyFailed) ||
      JSON.stringify(sorted(retry.discovery.reportedFiles)) !== JSON.stringify(initiallyFailed) ||
      retry.fileOutcomes.some((outcome) => !initiallyFailed.includes(outcome.file))) {
      reasons.push('RETRY_DISCOVERY_SCOPE_MISMATCH');
    }
    if (report.kind === 'playwright') {
      const expectedRetryIdentities = sorted(discovery.testIdentities.filter((identity) => {
        const normalizedIdentity = identity.replaceAll('\\', '/');
        return initiallyFailed.some((file) => normalizedIdentity.endsWith(`/${file}`));
      }));
      if (JSON.stringify(sorted(retry.discovery.requestedExecutionIds)) !==
        JSON.stringify(expectedRetryIdentities) ||
        JSON.stringify(sorted(retry.discovery.reportedExecutionIds)) !==
        JSON.stringify(expectedRetryIdentities)) {
        reasons.push('RETRY_DISCOVERY_IDENTITY_MISMATCH');
      }
    }
  } else if (initiallyFailed.length > 0) {
    reasons.push('RETRY_DISCOVERY_MISSING');
  }
  return reasons;
}

export interface GateExecutionReceipt {
  readonly version: 1;
  readonly gateId: string;
  readonly tier: GateTier;
  readonly inventoryDigest: string;
  readonly invocationId: string;
  readonly repositoryRoot: string;
  readonly revisionBefore: string;
  readonly revisionAfter: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly argv: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly cwd: string;
  readonly discovery: DiscoveryResult;
  readonly outer: {
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly spawnError: StructuredError | null;
  };
  readonly m1Report: null | {
    readonly path: string;
    readonly sha256: string;
    readonly kind: GateReportKind;
    readonly phaseInvocationIds: readonly string[];
  };
  readonly m1Verdict: M1Verdict | null;
  readonly launcherAuthenticated: boolean | null;
  readonly executionAccounting: GateExecutionAccounting | null;
  readonly finalStatus: 'passed' | 'failed';
  readonly failureReasons: readonly string[];
}

function structuredError(error: Error | undefined): StructuredError | null {
  if (error === undefined) return null;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : null;
  return { code, message: error.message };
}

function gitHead(repositoryRoot: string): string {
  const result = spawnSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`GATE_RECEIPT_GIT_FAILED: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

export interface InventoryProcessResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly error?: Error;
}

export interface InventoryRunnerAdapter {
  readonly revision: (repositoryRoot: string) => string;
  readonly discover: (gate: RequiredHandoffGate, repositoryRoot: string) => DiscoveryResult;
  readonly execute: (
    gate: RequiredHandoffGate,
    repositoryRoot: string,
    environment: NodeJS.ProcessEnv,
  ) => InventoryProcessResult;
  readonly invocationId: () => string;
  readonly timestamp: () => string;
}

const systemInventoryRunner: InventoryRunnerAdapter = {
  revision: gitHead,
  discover: resolveGateDiscovery,
  execute: (gate, repositoryRoot, environment) => spawnSync(gate.argv[0], gate.argv.slice(1), {
    cwd: resolve(repositoryRoot, gate.cwd),
    env: environment,
    stdio: 'inherit',
  }),
  invocationId: randomUUID,
  timestamp: () => new Date().toISOString(),
};

function readM1Report(reportDirectory: string, kind: GateReportKind): {
  readonly path: string;
  readonly sha256: string;
  readonly report: M1GateReport;
} {
  const paths = readdirSync(reportDirectory)
    .filter((name) => name.startsWith(`${kind}-gate-`) && name.endsWith('.json'))
    .map((name) => join(reportDirectory, name));
  if (paths.length !== 1) throw new Error(`M1_REPORT_COUNT_INVALID: ${String(paths.length)}`);
  const path = paths[0];
  if (path === undefined) throw new Error('M1_REPORT_MISSING');
  const bytes = readFileSync(path);
  return { path, sha256: sha256(bytes), report: parseM1GateReport(JSON.parse(bytes.toString('utf8')) as unknown) };
}

function writeExclusiveJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const descriptor = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  try {
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
  } finally {
    closeSync(descriptor);
  }
}

export function runInventoryGate(
  gate: RequiredHandoffGate,
  reportDirectory: string,
  repositoryRoot = process.cwd(),
  prerequisiteReceiptPaths: readonly string[] = [],
  runner: InventoryRunnerAdapter = systemInventoryRunner,
): { readonly receipt: GateExecutionReceipt; readonly path: string } {
  if (!isAbsolute(reportDirectory)) throw new Error('GATE_REPORT_DIRECTORY_NOT_ABSOLUTE');
  const validation = validateGateInventory(REQUIRED_HANDOFF_GATES, repositoryRoot);
  if (!validation.valid) throw new Error(`GATE_INVENTORY_INVALID: ${validation.errors.join('; ')}`);
  const revisionBefore = runner.revision(repositoryRoot);
  if (prerequisiteReceiptPaths.length !== gate.prerequisites.length) {
    throw new Error(`GATE_PREREQUISITE_RECEIPT_COUNT_INVALID: ${gate.id}`);
  }
  for (const [index, prerequisiteId] of gate.prerequisites.entries()) {
    const prerequisite = REQUIRED_HANDOFF_GATES.find((candidate) => candidate.id === prerequisiteId);
    const receiptPath = prerequisiteReceiptPaths[index];
    if (prerequisite === undefined || receiptPath === undefined) {
      throw new Error(`GATE_PREREQUISITE_RECEIPT_MISSING: ${prerequisiteId}`);
    }
    const outcome = reconcileGateReceipt(prerequisite, receiptPath, revisionBefore, repositoryRoot);
    if (outcome.state !== 'passed' && outcome.state !== 'passed-on-retry') {
      throw new Error(`GATE_PREREQUISITE_NOT_PASSED: ${prerequisiteId}`);
    }
  }
  const invocationDirectory = join(reportDirectory, `${gate.id}-${runner.invocationId()}`);
  const environment = prepareExecutionEnvironment(process.env, gate, invocationDirectory);
  mkdirSync(reportDirectory, { recursive: true });
  mkdirSync(invocationDirectory, { recursive: false });
  const discovery = runner.discover(gate, repositoryRoot);
  const invocationId = runner.invocationId();
  const startedAt = runner.timestamp();
  const result = runner.execute(gate, repositoryRoot, environment);
  const finishedAt = runner.timestamp();
  const revisionAfter = runner.revision(repositoryRoot);
  const failureReasons: string[] = [];
  const spawnError = structuredError(result.error);
  if (spawnError !== null) failureReasons.push('OUTER_SPAWN_ERROR');
  if (result.signal !== null) failureReasons.push(`OUTER_SIGNAL: ${result.signal}`);
  if (result.status === null) failureReasons.push('OUTER_EXIT_MISSING');
  else if (result.status !== 0) {
    failureReasons.push(`OUTER_EXIT_NONZERO: ${String(result.status)}`);
  }
  if (revisionBefore !== revisionAfter) failureReasons.push('OUTER_REVISION_CHANGED');
  let m1Report: GateExecutionReceipt['m1Report'] = null;
  let m1Verdict: M1Verdict | null = null;
  let launcherAuthenticated: boolean | null = null;
  let accounting: GateExecutionAccounting | null = null;
  if (gate.report.gateVerdict !== null) {
    try {
      const evidence = readM1Report(invocationDirectory, gate.report.gateVerdict.kind);
      m1Verdict = evidence.report.verdict;
      m1Report = {
        path: evidence.path,
        sha256: evidence.sha256,
        kind: evidence.report.kind,
        phaseInvocationIds: [
          evidence.report.phases.initial.phaseInvocationId,
          ...(evidence.report.phases.retry === null ? [] : [evidence.report.phases.retry.phaseInvocationId]),
        ],
      };
      launcherAuthenticated = authenticateM1PhaseCommands(evidence.report, repositoryRoot);
      accounting = executionAccounting(evidence.report, discovery);
      if (!launcherAuthenticated) failureReasons.push('M1_LAUNCHER_UNAUTHENTICATED');
      failureReasons.push(...reconcileM1Discovery(gate, discovery, evidence.report));
      failureReasons.push(...validateM1ExecutionAccounting(discovery, evidence.report, repositoryRoot));
      if (m1Verdict.status !== 'passed') failureReasons.push('M1_VERDICT_FAILED');
    } catch (error) {
      failureReasons.push(`M1_REPORT_INVALID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const receipt: GateExecutionReceipt = {
    version: 1,
    gateId: gate.id,
    tier: gate.tier,
    inventoryDigest: inventoryEntryDigest(gate),
    invocationId,
    repositoryRoot: realpathSync(repositoryRoot),
    revisionBefore,
    revisionAfter,
    startedAt,
    finishedAt,
    argv: gate.argv,
    env: gate.env,
    cwd: gate.cwd,
    discovery,
    outer: { exitCode: result.status, signal: result.signal, spawnError },
    m1Report,
    m1Verdict,
    launcherAuthenticated,
    executionAccounting: accounting,
    finalStatus: failureReasons.length === 0 ? 'passed' : 'failed',
    failureReasons,
  };
  const path = join(invocationDirectory, `${gate.id}-${invocationId}.receipt.json`);
  writeExclusiveJson(path, receipt);
  return { receipt, path };
}

export interface GateReconciliation {
  readonly id: string;
  readonly tier: GateTier;
  readonly required: true;
  readonly command: string;
  readonly state: 'passed' | 'passed-on-retry' | 'failed' | 'not-run';
  readonly receiptPath: string | null;
  readonly invocationId: string | null;
  readonly reportPath: string | null;
  readonly phaseInvocationIds: readonly string[];
  readonly prerequisites: readonly string[];
  readonly requiredFiles: readonly string[];
  readonly discoveredFiles: readonly string[];
  readonly executedFiles: readonly string[];
  readonly failedFiles: readonly string[];
  readonly skippedFiles: readonly string[];
  readonly requiredTestIdentities: readonly string[];
  readonly executedTestIdentities: readonly string[];
  readonly failedTestIdentities: readonly string[];
  readonly skippedTestIdentities: readonly string[];
  readonly approvedSkippedTestIdentities: readonly string[];
  readonly phaseAccounting: readonly GatePhaseExecutionAccounting[];
  readonly passedOnRetry: readonly string[];
  readonly phaseFailures: readonly unknown[];
  readonly m1Verdict: M1Verdict | null;
  readonly reasons: readonly string[];
}

function emptyReconciliation(
  gate: RequiredHandoffGate,
  state: GateReconciliation['state'],
  receiptPath: string | null,
  reasons: readonly string[],
): GateReconciliation {
  const requiredFiles = gate.discovery.kind === 'none' || gate.discovery.expectedFiles === 'from-config'
    ? []
    : gate.discovery.expectedFiles;
  return {
    id: gate.id,
    tier: gate.tier,
    required: true,
    command: renderGateCommand(gate),
    state,
    receiptPath,
    invocationId: null,
    reportPath: null,
    phaseInvocationIds: [],
    prerequisites: gate.prerequisites,
    requiredFiles,
    discoveredFiles: [],
    executedFiles: [],
    failedFiles: [],
    skippedFiles: [],
    requiredTestIdentities: [],
    executedTestIdentities: [],
    failedTestIdentities: [],
    skippedTestIdentities: [],
    approvedSkippedTestIdentities: [],
    phaseAccounting: [],
    passedOnRetry: [],
    phaseFailures: [],
    m1Verdict: null,
    reasons,
  };
}

function parsePhaseAccounting(value: unknown): GatePhaseExecutionAccounting | null {
  if (!isRecord(value) || (value.phase !== 'initial' && value.phase !== 'retry') ||
    typeof value.phaseInvocationId !== 'string') return null;
  const requiredTestIdentities = stringArray(value.requiredTestIdentities);
  const executedTestIdentities = stringArray(value.executedTestIdentities);
  const failedTestIdentities = stringArray(value.failedTestIdentities);
  const skippedTestIdentities = stringArray(value.skippedTestIdentities);
  const approvedSkippedTestIdentities = stringArray(value.approvedSkippedTestIdentities);
  if (requiredTestIdentities === null || executedTestIdentities === null || failedTestIdentities === null ||
    skippedTestIdentities === null || approvedSkippedTestIdentities === null) return null;
  return {
    phase: value.phase,
    phaseInvocationId: value.phaseInvocationId,
    requiredTestIdentities,
    executedTestIdentities,
    failedTestIdentities,
    skippedTestIdentities,
    approvedSkippedTestIdentities,
  };
}

function parseExecutionAccounting(value: unknown): GateExecutionAccounting | null {
  if (!isRecord(value) || !Array.isArray(value.phases)) return null;
  const requiredFiles = stringArray(value.requiredFiles);
  const requiredTestIdentities = stringArray(value.requiredTestIdentities);
  const phases = value.phases.map(parsePhaseAccounting);
  if (requiredFiles === null || requiredTestIdentities === null || phases.some((phase) => phase === null)) return null;
  return {
    requiredFiles,
    requiredTestIdentities,
    phases: phases.filter((phase): phase is GatePhaseExecutionAccounting => phase !== null),
  };
}

function parseReceipt(value: unknown): GateExecutionReceipt {
  if (!isRecord(value) || value.version !== 1 || typeof value.gateId !== 'string' ||
    !['gate', 'landing', 'supervisor-only'].includes(String(value.tier)) ||
    typeof value.inventoryDigest !== 'string' || typeof value.invocationId !== 'string' ||
    typeof value.repositoryRoot !== 'string' || typeof value.revisionBefore !== 'string' ||
    typeof value.revisionAfter !== 'string' || typeof value.startedAt !== 'string' ||
    typeof value.finishedAt !== 'string' || !Array.isArray(value.argv) ||
    !value.argv.every((entry) => typeof entry === 'string') || !isRecord(value.env) ||
    !Object.values(value.env).every((entry) => typeof entry === 'string') || typeof value.cwd !== 'string' ||
    !isRecord(value.discovery) || !isRecord(value.outer) ||
    (value.finalStatus !== 'passed' && value.finalStatus !== 'failed') || !Array.isArray(value.failureReasons) ||
    !value.failureReasons.every((entry) => typeof entry === 'string')) throw new Error('GATE_RECEIPT_INVALID');
  if (!['none', 'vitest', 'playwright'].includes(String(value.discovery.kind)) ||
    !(value.discovery.rootDir === null || typeof value.discovery.rootDir === 'string')) {
    throw new Error('GATE_RECEIPT_INVALID');
  }
  const discoveryFiles = stringArray(value.discovery.files);
  const discoveryTestIdentities = stringArray(value.discovery.testIdentities);
  if (discoveryFiles === null || discoveryTestIdentities === null ||
    !(value.outer.exitCode === null || typeof value.outer.exitCode === 'number') ||
    !(value.outer.signal === null || typeof value.outer.signal === 'string') ||
    !(value.outer.spawnError === null || (isRecord(value.outer.spawnError) &&
      (value.outer.spawnError.code === null || typeof value.outer.spawnError.code === 'string') &&
      typeof value.outer.spawnError.message === 'string'))) {
    throw new Error('GATE_RECEIPT_INVALID');
  }
  if (value.m1Report !== null && (!isRecord(value.m1Report) || typeof value.m1Report.path !== 'string' ||
    typeof value.m1Report.sha256 !== 'string' ||
    (value.m1Report.kind !== 'vitest' && value.m1Report.kind !== 'playwright') ||
    stringArray(value.m1Report.phaseInvocationIds) === null)) {
    throw new Error('GATE_RECEIPT_INVALID');
  }
  if (value.m1Verdict !== null && (!isRecord(value.m1Verdict) ||
    (value.m1Verdict.status !== 'passed' && value.m1Verdict.status !== 'failed') ||
    stringArray(value.m1Verdict.passedOnRetry) === null || stringArray(value.m1Verdict.failedFiles) === null ||
    !Array.isArray(value.m1Verdict.phaseFailures))) {
    throw new Error('GATE_RECEIPT_INVALID');
  }
  if (!(value.launcherAuthenticated === null || typeof value.launcherAuthenticated === 'boolean')) {
    throw new Error('GATE_RECEIPT_INVALID');
  }
  if (value.executionAccounting !== null && parseExecutionAccounting(value.executionAccounting) === null) {
    throw new Error('GATE_RECEIPT_INVALID');
  }
  return value as unknown as GateExecutionReceipt;
}

function sameRealPath(left: string, right: string): boolean {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return false;
  }
}

function isCanonicalStringSet(values: readonly string[]): boolean {
  return values.length === new Set(values).size && JSON.stringify(values) === JSON.stringify([...values].sort());
}

function validateReceiptDiscovery(
  gate: RequiredHandoffGate,
  discovery: DiscoveryResult,
  repositoryRoot: string,
): readonly string[] {
  const reasons: string[] = [];
  if (discovery.kind !== gate.discovery.kind) return ['RECEIPT_DISCOVERY_KIND_MISMATCH'];
  if (!isCanonicalStringSet(discovery.files) || !isCanonicalStringSet(discovery.testIdentities)) {
    reasons.push('RECEIPT_DISCOVERY_NOT_CANONICAL');
  }
  if (gate.discovery.kind === 'none') {
    if (discovery.rootDir !== null || discovery.files.length > 0 || discovery.testIdentities.length > 0) {
      reasons.push('RECEIPT_DISCOVERY_UNEXPECTED');
    }
    return reasons;
  }
  if (discovery.files.length === 0) reasons.push('RECEIPT_DISCOVERY_EMPTY');
  for (const file of discovery.files) {
    try {
      if (normalizedRepositoryFile(repositoryRoot, resolve(repositoryRoot, file)) !== file) {
        reasons.push('RECEIPT_DISCOVERY_FILE_INVALID');
      }
    } catch {
      reasons.push('RECEIPT_DISCOVERY_FILE_INVALID');
    }
  }
  if (discovery.rootDir === null || !isAbsolute(discovery.rootDir) ||
    !insideRepository(repositoryRoot, discovery.rootDir)) {
    reasons.push('RECEIPT_DISCOVERY_ROOT_INVALID');
  }
  if (discovery.rootDir !== resolve(repositoryRoot, gate.discovery.rootDir)) {
    reasons.push('RECEIPT_DISCOVERY_ROOT_MISMATCH');
  }
  if (gate.discovery.kind === 'vitest') {
    if (discovery.rootDir === null || !sameRealPath(discovery.rootDir, repositoryRoot)) {
      reasons.push('RECEIPT_DISCOVERY_ROOT_INVALID');
    }
    if (discovery.testIdentities.length > 0) reasons.push('RECEIPT_DISCOVERY_IDENTITY_UNEXPECTED');
  } else {
    if (discovery.testIdentities.length === 0) reasons.push('RECEIPT_DISCOVERY_TESTS_EMPTY');
    for (const identity of discovery.testIdentities) {
      const normalizedIdentity = identity.replaceAll('\\', '/');
      if (!discovery.files.some((file) => normalizedIdentity.endsWith(`/${file}`))) {
        reasons.push('RECEIPT_DISCOVERY_IDENTITY_INVALID');
      }
    }
    if (gate.discovery.expectedTestCount !== undefined &&
      discovery.testIdentities.length !== gate.discovery.expectedTestCount) {
      reasons.push('RECEIPT_DISCOVERY_TEST_COUNT_MISMATCH');
    }
  }
  if (gate.discovery.expectedFiles !== 'from-config' &&
    JSON.stringify(discovery.files) !== JSON.stringify([...gate.discovery.expectedFiles].sort())) {
    reasons.push('RECEIPT_DISCOVERY_EXPECTED_FILES_MISMATCH');
  }
  return [...new Set(reasons)];
}

function validateM1ExecutionAccounting(
  discovery: DiscoveryResult,
  report: M1GateReport,
  repositoryRoot: string,
): readonly string[] {
  const reasons: string[] = [];
  const initial = report.phases.initial;
  const initiallyFailed = sorted(initial.fileOutcomes
    .filter((outcome) => outcome.status === 'failed')
    .map((outcome) => outcome.file));
  for (const phase of [initial, report.phases.retry].filter((entry): entry is M1Phase => entry !== null)) {
    const expectedFiles = phase.phase === 'initial' ? discovery.files : initiallyFailed;
    const requestedIds = sorted(phase.discovery.requestedExecutionIds);
    const reportedIds = sorted(phase.discovery.reportedExecutionIds);
    const outcomeIds = sorted(phase.executionOutcomes.map((outcome) => outcome.executionId));
    const outcomeFiles = sorted(phase.fileOutcomes.map((outcome) => outcome.file));
    if (!phase.executionAccountingAvailable) reasons.push('M1_EXECUTION_ACCOUNTING_UNAVAILABLE');
    if (expectedFiles.length === 0 || requestedIds.length === 0 || reportedIds.length === 0 ||
      outcomeIds.length === 0 || outcomeFiles.length === 0) {
      reasons.push('M1_EXECUTION_ACCOUNTING_EMPTY');
    }
    if (JSON.stringify(requestedIds) !== JSON.stringify(reportedIds) ||
      JSON.stringify(reportedIds) !== JSON.stringify(outcomeIds)) {
      reasons.push('M1_EXECUTION_ACCOUNTING_MISMATCH');
    }
    if (JSON.stringify(outcomeFiles) !== JSON.stringify(expectedFiles)) {
      reasons.push('M1_FILE_ACCOUNTING_MISMATCH');
    }
    if (phase.executionOutcomes.some((outcome) => outcome.status === 'unfinished' ||
      (outcome.status === 'skipped' && !outcome.approvedSkip))) {
      reasons.push('M1_EXECUTION_ACCOUNTING_INCOMPLETE');
    }
    const identitySets = [
      phase.discovery.requestedExecutionIds,
      phase.discovery.reportedExecutionIds,
      phase.executionOutcomes.map((outcome) => outcome.executionId),
      phase.fileOutcomes.map((outcome) => outcome.file),
    ];
    if (identitySets.some((values) => !isCanonicalStringSet(values))) {
      reasons.push('M1_EXECUTION_ACCOUNTING_NOT_CANONICAL');
    }
    const phaseFiles = sorted(phase.fileOutcomes.map((outcome) => outcome.file));
    for (const outcome of phase.executionOutcomes) {
      let normalizedFile: string;
      try {
        normalizedFile = normalizedRepositoryFile(repositoryRoot, outcome.file);
      } catch {
        reasons.push('M1_EXECUTION_FILE_INVALID');
        continue;
      }
      const fileOutcome = phase.fileOutcomes.find((candidate) => candidate.file === normalizedFile);
      if (fileOutcome === undefined || !fileOutcome.executionIds.includes(outcome.executionId) ||
        !phaseFiles.includes(normalizedFile)) {
        reasons.push('M1_EXECUTION_FILE_MISMATCH');
      }
    }
  }
  return [...new Set(reasons)];
}

export function reconcileGateReceipt(
  gate: RequiredHandoffGate,
  receiptPath: string | null,
  currentHead: string,
  repositoryRoot: string,
): GateReconciliation {
  if (receiptPath === null || !existsSync(receiptPath)) {
    return emptyReconciliation(gate, 'not-run', null, [`REQUIRED_GATE_NOT_RUN: ${gate.id}`]);
  }
  let receipt: GateExecutionReceipt;
  try {
    receipt = parseReceipt(JSON.parse(readFileSync(receiptPath, 'utf8')) as unknown);
  } catch (error) {
    return emptyReconciliation(gate, 'failed', receiptPath, [
      `REQUIRED_GATE_RECEIPT_INVALID: ${gate.id}: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }
  const base = {
    ...emptyReconciliation(gate, 'failed', receiptPath, []),
    invocationId: receipt.invocationId,
    reportPath: receipt.m1Report?.path ?? null,
    phaseInvocationIds: receipt.m1Report?.phaseInvocationIds ?? [],
    requiredFiles: gate.discovery.kind === 'none' || gate.discovery.expectedFiles === 'from-config'
      ? receipt.discovery.files
      : gate.discovery.expectedFiles,
    discoveredFiles: receipt.discovery.files,
    m1Verdict: receipt.m1Verdict,
    passedOnRetry: receipt.m1Verdict?.passedOnRetry ?? [],
    phaseFailures: receipt.m1Verdict?.phaseFailures ?? [],
  };
  if (receipt.revisionBefore !== receipt.revisionAfter) {
    return { ...base, state: 'failed', reasons: ['OUTER_REVISION_CHANGED'] };
  }
  if (receipt.revisionBefore !== currentHead) {
    return {
      ...emptyReconciliation(gate, 'not-run', receiptPath, [`REQUIRED_GATE_STALE_REVISION: ${gate.id}`]),
      invocationId: receipt.invocationId,
    };
  }
  if (receipt.gateId !== gate.id || receipt.tier !== gate.tier ||
    receipt.inventoryDigest !== inventoryEntryDigest(gate) ||
    JSON.stringify(receipt.argv) !== JSON.stringify(gate.argv) ||
    JSON.stringify(receipt.env) !== JSON.stringify(gate.env) || receipt.cwd !== gate.cwd ||
    !sameRealPath(receipt.repositoryRoot, repositoryRoot)) {
    return { ...base, state: 'not-run', reasons: [`REQUIRED_GATE_RECEIPT_MISMATCH: ${gate.id}`] };
  }
  const reasons = [...receipt.failureReasons];
  reasons.push(...validateReceiptDiscovery(gate, receipt.discovery, repositoryRoot));
  const outerSuccess = receipt.outer.spawnError === null && receipt.outer.signal === null &&
    receipt.outer.exitCode === 0;
  if (receipt.outer.spawnError !== null) reasons.push('OUTER_SPAWN_ERROR');
  if (receipt.outer.signal !== null) reasons.push(`OUTER_SIGNAL: ${receipt.outer.signal}`);
  if (receipt.outer.exitCode !== null && receipt.outer.exitCode !== 0) {
    reasons.push(`OUTER_EXIT_NONZERO: ${String(receipt.outer.exitCode)}`);
  }
  if (receipt.outer.exitCode === null && receipt.outer.signal === null && receipt.outer.spawnError === null) {
    reasons.push('OUTER_EXIT_MISSING');
  }
  if (!outerSuccess && reasons.length === 0) reasons.push('OUTER_PROCESS_FAILED');
  let report: M1GateReport | null = null;
  if (gate.report.gateVerdict !== null) {
    if (receipt.executionAccounting === null) reasons.push('RECEIPT_EXECUTION_ACCOUNTING_MISSING');
    if (receipt.m1Report === null || !existsSync(receipt.m1Report.path)) {
      reasons.push('M1_REPORT_MISSING');
    } else {
      try {
        const bytes = readFileSync(receipt.m1Report.path);
        if (sha256(bytes) !== receipt.m1Report.sha256) reasons.push('M1_REPORT_DIGEST_MISMATCH');
        report = parseM1GateReport(JSON.parse(bytes.toString('utf8')) as unknown);
        if (report.kind !== gate.report.gateVerdict.kind || receipt.m1Report.kind !== report.kind) {
          reasons.push('M1_REPORT_KIND_MISMATCH');
        }
        const phaseIds = [
          report.phases.initial.phaseInvocationId,
          ...(report.phases.retry === null ? [] : [report.phases.retry.phaseInvocationId]),
        ];
        if (JSON.stringify(phaseIds) !== JSON.stringify(receipt.m1Report.phaseInvocationIds)) {
          reasons.push('M1_REPORT_INVOCATION_MISMATCH');
        }
        if (!authenticateM1PhaseCommands(report, repositoryRoot)) reasons.push('M1_LAUNCHER_UNAUTHENTICATED');
        reasons.push(...reconcileM1Discovery(gate, receipt.discovery, report));
        reasons.push(...validateM1ExecutionAccounting(receipt.discovery, report, repositoryRoot));
        if (JSON.stringify(receipt.executionAccounting) !==
          JSON.stringify(executionAccounting(report, receipt.discovery))) {
          reasons.push('RECEIPT_EXECUTION_ACCOUNTING_MISMATCH');
        }
        if (JSON.stringify(receipt.m1Verdict) !== JSON.stringify(report.verdict)) {
          reasons.push('M1_VERDICT_RECEIPT_MISMATCH');
        }
        if (report.verdict.status !== 'passed') reasons.push('M1_VERDICT_FAILED');
      } catch (error) {
        reasons.push(`M1_REPORT_INVALID: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else if (receipt.executionAccounting !== null) {
    reasons.push('RECEIPT_EXECUTION_ACCOUNTING_UNEXPECTED');
  }
  const initialOutcomes = report?.phases.initial.fileOutcomes ?? [];
  const retryOutcomes = report?.phases.retry?.fileOutcomes ?? [];
  const outcomes = [...initialOutcomes, ...retryOutcomes];
  const executedFiles = sorted(outcomes
    .filter((outcome) => outcome.status !== 'skipped')
    .map((outcome) => outcome.file));
  const skippedFiles = sorted(outcomes
    .filter((outcome) => outcome.status === 'skipped')
    .map((outcome) => outcome.file));
  const verdict = report?.verdict ?? receipt.m1Verdict;
  const accounting = report === null ? receipt.executionAccounting : executionAccounting(report, receipt.discovery);
  const phases = accounting?.phases ?? [];
  const executedTestIdentities = sorted(phases.flatMap((phase) => phase.executedTestIdentities));
  const failedTestIdentities = sorted(phases.flatMap((phase) => phase.failedTestIdentities));
  const skippedTestIdentities = sorted(phases.flatMap((phase) => phase.skippedTestIdentities));
  const approvedSkippedTestIdentities = sorted(phases.flatMap((phase) =>
    phase.approvedSkippedTestIdentities));
  const state = reasons.length > 0
    ? 'failed'
    : (verdict?.passedOnRetry.length ?? 0) > 0
      ? 'passed-on-retry'
      : 'passed';
  return {
    ...base,
    state,
    executedFiles,
    failedFiles: verdict?.failedFiles ?? [],
    skippedFiles,
    passedOnRetry: verdict?.passedOnRetry ?? [],
    phaseFailures: verdict?.phaseFailures ?? [],
    m1Verdict: verdict,
    requiredTestIdentities: accounting?.requiredTestIdentities ?? [],
    executedTestIdentities,
    failedTestIdentities,
    skippedTestIdentities,
    approvedSkippedTestIdentities,
    phaseAccounting: phases,
    reasons: [...new Set(reasons)],
  };
}

function printRenderedInventory(): void {
  process.stdout.write(
    '# The commands below are leaf invocations and do not write outer receipts.\n' +
    `# Receipt-producing example: ${renderReceiptCommand(
      REQUIRED_HANDOFF_GATES[0],
      '/tmp/vtt-handoff-gate-receipts',
    )}\n`,
  );
  for (const gate of REQUIRED_HANDOFF_GATES) {
    process.stdout.write(`# ${gate.id}\n${renderGateCommand(gate)}\n`);
  }
}

function validateResolvedInventory(repositoryRoot: string): void {
  const validation = validateGateInventory(REQUIRED_HANDOFF_GATES, repositoryRoot);
  if (!validation.valid) throw new Error(`GATE_INVENTORY_INVALID: ${validation.errors.join('; ')}`);
  for (const gate of REQUIRED_HANDOFF_GATES) {
    prepareExecutionEnvironment(process.env, gate, join(repositoryRoot, '.inventory-validation-report'));
  }
  const discoveries = REQUIRED_HANDOFF_GATES.map((gate) => ({
    id: gate.id,
    discovery: resolveGateDiscovery(gate, repositoryRoot),
  }));
  process.stdout.write(`${JSON.stringify({ valid: true, gates: discoveries }, null, 2)}\n`);
}

function cli(): void {
  const [mode, selection, ...rest] = process.argv.slice(2);
  if (mode === 'render' && selection === '--all') {
    printRenderedInventory();
    return;
  }
  if (mode === 'validate' && selection === '--resolve' && rest[0] === '--json') {
    validateResolvedInventory(process.cwd());
    return;
  }
  if (mode === 'run' && selection !== undefined) {
    const gate = REQUIRED_HANDOFF_GATES.find((candidate) => candidate.id === selection);
    if (gate === undefined) throw new Error(`UNKNOWN_GATE_ID: ${selection}`);
    const reportIndex = rest.indexOf('--report-dir');
    const reportDirectory = reportIndex === -1 ? undefined : rest[reportIndex + 1];
    if (reportDirectory === undefined) throw new Error('GATE_REPORT_DIRECTORY_REQUIRED');
    const prerequisiteReceiptPaths = rest.flatMap((value, index): readonly string[] => {
      const next = rest[index + 1];
      return value === '--prerequisite-receipt' && next !== undefined ? [next] : [];
    });
    const result = runInventoryGate(gate, reportDirectory, process.cwd(), prerequisiteReceiptPaths);
    process.stdout.write(`${JSON.stringify({ receiptPath: result.path, status: result.receipt.finalStatus })}\n`);
    if (result.receipt.finalStatus !== 'passed') process.exitCode = 1;
    return;
  }
  throw new Error('Usage: handoff:gate render --all | validate --resolve --json | run <id> --report-dir <path>');
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  cli();
}
