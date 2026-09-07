import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';

export const GATE_LOCK_PATH = '/tmp/dnd-gate.lock';
export const GATE_LOCK_WAIT_SECONDS = 7_200;

function lockLauncher(environment) {
  const testModule = environment.DND_GATE_FLOCK_MODULE;
  if (testModule !== undefined) {
    return { executable: process.execPath, arguments: [resolve(testModule)] };
  }
  return { executable: 'flock', arguments: [] };
}

function readJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')), error: null };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function runLockedPhase({
  kind,
  phase,
  executable,
  arguments: commandArguments,
  reporterPath,
  environment = process.env,
}) {
  const startedAt = new Date().toISOString();
  const loadAverage = loadavg();
  const started = performance.now();
  const launcher = lockLauncher(environment);
  const flockArguments = [
    ...launcher.arguments,
    '-w',
    String(GATE_LOCK_WAIT_SECONDS),
    GATE_LOCK_PATH,
    executable,
    ...commandArguments,
  ];
  const result = spawnSync(launcher.executable, flockArguments, {
    cwd: process.cwd(),
    env: { ...environment, DND_GATE_KIND: kind, DND_GATE_PHASE: phase },
    stdio: 'inherit',
  });
  const reporter = readJson(reporterPath);
  return {
    phase,
    startedAt,
    loadAverage,
    durationMs: Math.round((performance.now() - started) * 100) / 100,
    exitCode: result.status ?? 1,
    signal: result.signal,
    command: {
      executable,
      arguments: commandArguments,
      lock: {
        executable: launcher.executable,
        arguments: flockArguments,
      },
    },
    reporterPath,
    reporter: reporter.value,
    reporterReadError: reporter.error,
    spawnError: result.error?.message ?? null,
  };
}

export function reportPath(kind, phase) {
  const directory = process.env.DND_GATE_REPORT_DIR ?? join(tmpdir(), 'dnd-gate-reports');
  mkdirSync(directory, { recursive: true });
  return join(directory, `${kind}-${phase}-${process.pid}-${randomUUID()}.json`);
}

export function writeGateReport(kind, report) {
  const directory = process.env.DND_GATE_REPORT_DIR ?? join(tmpdir(), 'dnd-gate-reports');
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `${kind}-gate-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}-${randomUUID()}.json`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return path;
}

export function repositoryPath(path) {
  const absolute = resolve(path);
  const root = `${resolve(process.cwd())}/`;
  return absolute.startsWith(root) ? absolute.slice(root.length) : absolute;
}

export function printVerdict(loadFlakes, failed, path) {
  console.log('\nLOAD FLAKES (passed serially)');
  if (loadFlakes.length === 0) console.log('  (none)');
  else for (const file of loadFlakes) console.log(`  ${file}`);
  console.log('\nFAILED');
  if (failed.length === 0) console.log('  (none)');
  else for (const file of failed) console.log(`  ${file}`);
  console.log(`\nJSON report: ${path}`);
}
