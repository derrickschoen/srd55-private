#!/usr/bin/env node

/**
 * Load-tolerant Playwright gate.
 *
 * Usage: `npm run test:gate:browser -- <specs/options>`. Both phases acquire
 * `/tmp/dnd-gate.lock`; retries remain disabled, and only failed spec files get
 * one serial (`--workers=1`) second pass. Use `PLAYWRIGHT_PORT` to select a
 * non-4173 port. The final JSON report path is printed.
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
  const byFile = new Map();
  function visitSuite(suite, inheritedFile) {
    if (suite === null || typeof suite !== 'object') return;
    const file = typeof suite.file === 'string' ? suite.file : inheritedFile;
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        if (spec === null || typeof spec !== 'object') continue;
        const specFile = typeof spec.file === 'string' ? spec.file : file;
        if (specFile === undefined) continue;
        const normalized = repositoryPath(specFile);
        const status = spec.ok === true ? 'passed' : 'failed';
        if (status === 'failed' || byFile.get(normalized) === undefined) byFile.set(normalized, status);
      }
    }
    if (Array.isArray(suite.suites)) {
      for (const child of suite.suites) visitSuite(child, file);
    }
  }
  if (reporter !== null && typeof reporter === 'object' && Array.isArray(reporter.suites)) {
    for (const suite of reporter.suites) visitSuite(suite, undefined);
  }
  return [...byFile].map(([file, status]) => ({ file, status })).sort((left, right) => left.file.localeCompare(right.file));
}

function unique(values) {
  return [...new Set(values)].sort();
}

function reporterSucceeded(reporter) {
  return reporter !== null &&
    typeof reporter === 'object' &&
    Array.isArray(reporter.errors) &&
    reporter.errors.length === 0 &&
    reporter.stats !== null &&
    typeof reporter.stats === 'object' &&
    reporter.stats.unexpected === 0;
}

const playwrightModule = resolve(process.env.DND_GATE_PLAYWRIGHT_MODULE ?? 'node_modules/@playwright/test/cli.js');
const passthroughArguments = process.argv.slice(2);

function withoutControlledOptions(argumentsList, controlledNames) {
  const retained = [];
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === undefined) continue;
    const controlled = [...controlledNames].find((name) => argument === name || argument.startsWith(`${name}=`));
    if (controlled === undefined) {
      retained.push(argument);
      continue;
    }
    if (argument === controlled && argumentsList[index + 1]?.startsWith('-') === false) index += 1;
  }
  return retained;
}

const PLAYWRIGHT_OPTIONS_WITH_VALUES = new Set([
  '--browser',
  '--config',
  '--global-timeout',
  '--grep',
  '--grep-invert',
  '--max-failures',
  '--output',
  '--project',
  '--repeat-each',
  '--shard',
  '--timeout',
  '--trace',
  '--tsconfig',
  '--ui-host',
  '--ui-port',
  '--update-source-method',
]);

function retryOptionsFrom(argumentsList) {
  const uncontrolled = withoutControlledOptions(
    argumentsList,
    new Set(['--reporter', '--retries', '--workers']),
  );
  const retained = [];
  for (let index = 0; index < uncontrolled.length; index += 1) {
    const argument = uncontrolled[index];
    if (argument === undefined || !argument.startsWith('-')) continue;
    retained.push(argument);
    if (!argument.includes('=') && PLAYWRIGHT_OPTIONS_WITH_VALUES.has(argument)) {
      const value = uncontrolled[index + 1];
      if (value !== undefined) {
        retained.push(value);
        index += 1;
      }
    }
  }
  return retained;
}

const initialArguments = withoutControlledOptions(
  passthroughArguments,
  new Set(['--reporter', '--retries']),
);
const retryOptions = retryOptionsFrom(passthroughArguments);

function playwrightEnvironment(path) {
  return { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: path };
}

const initialReporterPath = reportPath('playwright', 'initial');
const initial = runLockedPhase({
  kind: 'playwright',
  phase: 'initial',
  executable: process.execPath,
  arguments: [playwrightModule, 'test', '--reporter=json', '--retries=0', ...initialArguments],
  reporterPath: initialReporterPath,
  environment: playwrightEnvironment(initialReporterPath),
});
initial.results = resultsFromReporter(initial.reporter);

const initialFailedFiles = unique(
  initial.results.filter((result) => result.status === 'failed').map((result) => result.file),
);
const initialRunnerFailure = initial.reporterReadError !== null ||
  (initialFailedFiles.length === 0 && !reporterSucceeded(initial.reporter));

let retry = null;
let loadFlakes = [];
let failed = [];
if (initialFailedFiles.length > 0) {
  const retryReporterPath = reportPath('playwright', 'retry');
  retry = runLockedPhase({
    kind: 'playwright',
    phase: 'retry',
    executable: process.execPath,
    arguments: [
      playwrightModule,
      'test',
      '--reporter=json',
      '--retries=0',
      '--workers=1',
      ...retryOptions,
      ...initialFailedFiles,
    ],
    reporterPath: retryReporterPath,
    environment: playwrightEnvironment(retryReporterPath),
  });
  retry.results = resultsFromReporter(retry.reporter);
  const retryStatusByFile = new Map(retry.results.map((result) => [result.file, result.status]));
  loadFlakes = initialFailedFiles.filter((file) => retryStatusByFile.get(file) === 'passed');
  failed = initialFailedFiles.filter((file) => retryStatusByFile.get(file) !== 'passed');
  if (retry.reporterReadError !== null || (failed.length === 0 && !reporterSucceeded(retry.reporter))) {
    failed.push('<playwright retry runner/report failure>');
  }
}
if (initialRunnerFailure) failed.push('<playwright runner/report failure>');
failed = unique(failed);

const report = {
  version: 1,
  kind: 'playwright',
  phases: { initial, retry },
  verdict: { loadFlakes, failed },
};
const finalReportPath = writeGateReport('playwright', report);
printVerdict(loadFlakes, failed, finalReportPath);
process.exitCode = failed.length === 0 ? 0 : 1;
