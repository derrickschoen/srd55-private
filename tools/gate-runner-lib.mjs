import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadavg, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { readJsonArtifact } from './gate-verdict.mjs';

export const GATE_LOCK_PATH = '/tmp/dnd-gate.lock';
export const GATE_LOCK_WAIT_SECONDS = 7_200;

function lockLauncher(environment) {
  const testModule = environment.DND_GATE_FLOCK_MODULE;
  if (testModule !== undefined) return { executable: process.execPath, arguments: [resolve(testModule)] };
  return { executable: 'flock', arguments: [] };
}

function structuredSpawnError(error) {
  if (error === undefined) return null;
  return {
    code: error !== null && typeof error === 'object' && typeof error.code === 'string' ? error.code : null,
    message: error instanceof Error ? error.message : String(error),
  };
}

export function runLockedPhase({
  kind,
  phase,
  executable,
  arguments: commandArguments,
  artifacts,
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
    env: {
      ...environment,
      DND_GATE_KIND: kind,
      DND_GATE_PHASE: phase,
      DND_GATE_PHASE_INVOCATION_ID: artifacts.phaseInvocationId,
      DND_GATE_EVIDENCE_PATH: artifacts.evidencePath,
    },
    stdio: 'inherit',
  });
  const stock = readJsonArtifact(artifacts.reporterPath);
  const evidence = readJsonArtifact(artifacts.evidencePath);
  return {
    phase,
    startedAt,
    loadAverage,
    durationMs: Math.round((performance.now() - started) * 100) / 100,
    phaseInvocationId: artifacts.phaseInvocationId,
    exitCode: result.status,
    signal: result.signal,
    command: {
      executable,
      arguments: commandArguments,
      lock: { executable: launcher.executable, arguments: flockArguments },
    },
    reporterPath: artifacts.reporterPath,
    evidencePath: artifacts.evidencePath,
    reporter: stock.value,
    evidence: evidence.value,
    stockRead: stock.read,
    evidenceRead: evidence.read,
    spawnError: structuredSpawnError(result.error),
  };
}

export function phaseArtifactPaths(kind, phase) {
  const directory = process.env.DND_GATE_REPORT_DIR ?? join(tmpdir(), 'dnd-gate-reports');
  mkdirSync(directory, { recursive: true });
  const phaseInvocationId = randomUUID();
  const stem = `${kind}-${phase}-${process.pid}-${phaseInvocationId}`;
  return {
    phaseInvocationId,
    reporterPath: join(directory, `${stem}.json`),
    evidencePath: join(directory, `${stem}.evidence.json`),
  };
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

function printItems(items) {
  if (items.length === 0) console.log('  (none)');
  else for (const item of items) console.log(`  ${item}`);
}

export function printVerdict(verdict, path) {
  console.log('\nPASSED ON RETRY (cause not inferred)');
  printItems(verdict.passedOnRetry);
  console.log('\nFAILED FILES');
  printItems(verdict.failedFiles);
  console.log('\nPHASE FAILURES');
  printItems(verdict.phaseFailures.map((failure) =>
    `${failure.phase}/${failure.domain}: ${failure.reasons.join(', ')}`));
  console.log(`\nJSON report: ${path}`);
}
