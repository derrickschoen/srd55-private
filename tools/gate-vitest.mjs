#!/usr/bin/env node

/**
 * Load-tolerant Vitest gate.
 *
 * Usage: `npm run test:gate`. The complete first pass and the one permitted
 * serial retry both acquire `/tmp/dnd-gate.lock`. JSON reporters are retained
 * in `/tmp/dnd-gate-reports` (or `DND_GATE_REPORT_DIR`) and the printed final
 * report distinguishes load flakes from files that failed both attempts.
 */

import { resolve } from 'node:path';
import {
  printVerdict,
  reportPath,
  repositoryPath,
  runLockedPhase,
  writeGateReport,
} from './gate-runner-lib.mjs';

function resultsFromReporter(reporter) {
  if (reporter === null || typeof reporter !== 'object' || !Array.isArray(reporter.testResults)) return [];
  return reporter.testResults.flatMap((result) => {
    if (result === null || typeof result !== 'object' || typeof result.name !== 'string') return [];
    const assertions = Array.isArray(result.assertionResults) ? result.assertionResults : [];
    const assertionFailed = assertions.some((assertion) =>
      assertion !== null && typeof assertion === 'object' && assertion.status === 'failed');
    return [{
      file: repositoryPath(result.name),
      status: result.status === 'passed' && !assertionFailed ? 'passed' : 'failed',
    }];
  });
}

function unique(values) {
  return [...new Set(values)].sort();
}

const vitestModule = resolve(process.env.DND_GATE_VITEST_MODULE ?? 'node_modules/vitest/vitest.mjs');
const passthroughArguments = process.argv.slice(2);
const initialReporterPath = reportPath('vitest', 'initial');
const initial = runLockedPhase({
  kind: 'vitest',
  phase: 'initial',
  executable: process.execPath,
  arguments: [
    vitestModule,
    'run',
    '--configLoader',
    'runner',
    '--reporter=json',
    `--outputFile.json=${initialReporterPath}`,
    ...passthroughArguments,
  ],
  reporterPath: initialReporterPath,
});
initial.results = resultsFromReporter(initial.reporter);

const initialFailedFiles = unique(
  initial.results.filter((result) => result.status === 'failed').map((result) => result.file),
);
const initialRunnerFailure = initial.reporterReadError !== null ||
  (initialFailedFiles.length === 0 && initial.reporter?.success !== true);

let retry = null;
let loadFlakes = [];
let failed = [];
if (initialFailedFiles.length > 0) {
  const retryReporterPath = reportPath('vitest', 'retry');
  retry = runLockedPhase({
    kind: 'vitest',
    phase: 'retry',
    executable: process.execPath,
    arguments: [
      vitestModule,
      'run',
      '--configLoader',
      'runner',
      '--reporter=json',
      `--outputFile.json=${retryReporterPath}`,
      '--no-file-parallelism',
      '--maxWorkers=1',
      ...initialFailedFiles,
    ],
    reporterPath: retryReporterPath,
  });
  retry.results = resultsFromReporter(retry.reporter);
  const retryStatusByFile = new Map(retry.results.map((result) => [result.file, result.status]));
  loadFlakes = initialFailedFiles.filter((file) => retryStatusByFile.get(file) === 'passed');
  failed = initialFailedFiles.filter((file) => retryStatusByFile.get(file) !== 'passed');
  if (retry.reporterReadError !== null || (failed.length === 0 && retry.reporter?.success !== true)) {
    failed.push('<vitest retry runner/report failure>');
  }
}
if (initialRunnerFailure) failed.push('<vitest runner/report failure>');
failed = unique(failed);

const report = {
  version: 1,
  kind: 'vitest',
  phases: { initial, retry },
  verdict: { loadFlakes, failed },
};
const finalReportPath = writeGateReport('vitest', report);
printVerdict(loadFlakes, failed, finalReportPath);
process.exitCode = failed.length === 0 ? 0 : 1;
