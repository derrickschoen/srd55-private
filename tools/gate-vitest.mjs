#!/usr/bin/env node

import { resolve } from 'node:path';
import {
  phaseArtifactPaths,
  printVerdict,
  runLockedPhase,
  writeGateReport,
} from './gate-runner-lib.mjs';
import { classifyPhase, reduceGateVerdict } from './gate-verdict.mjs';

const VALUE_OPTIONS = new Set([
  '-r', '--root', '-c', '--config', '-u', '--update', '-t', '--testNamePattern',
  '--dir', '--api', '--silent', '--mode', '--browser', '--browser.name',
  '--browser.api', '--browser.api.port', '--browser.api.host', '--browser.connectTimeout',
  '--browser.trace', '--browser.locators', '--pool', '--execArgv', '--vmMemoryLimit',
  '--environment', '--shard', '--changed', '--sequence', '--sequence.seed',
  '--sequence.hooks', '--sequence.setupFiles', '--inspect', '--inspectBrk',
  '--testTimeout', '--hookTimeout', '--bail', '--retry', '--retry.count',
  '--retry.delay', '--retry.condition', '--diff', '--exclude', '--project',
  '--slowTestThreshold', '--teardownTimeout', '--maxConcurrency', '--attachmentsDir',
  '--configLoader', '--mergeReports', '--listTags', '--tagsFilter', '--experimental',
  '--coverage.provider', '--coverage.include', '--coverage.exclude',
  '--coverage.reportsDirectory', '--coverage.reporter', '--coverage.thresholds.autoUpdate',
  '--coverage.thresholds.lines', '--coverage.thresholds.functions',
  '--coverage.thresholds.branches', '--coverage.thresholds.statements',
  '--coverage.ignoreClassMethods', '--coverage.processingConcurrency',
  '--coverage.customProviderModule', '--coverage.watermarks.statements',
  '--coverage.watermarks.lines', '--coverage.watermarks.branches',
  '--coverage.watermarks.functions', '--coverage.changed', '--coverage.htmlDir',
  '--typecheck.checker', '--typecheck.tsconfig', '--typecheck.spawnTimeout',
  '--expect', '--expect.poll.interval', '--expect.poll.timeout',
  '--experimental.importDurations.print', '--experimental.importDurations.limit',
  '--experimental.importDurations.thresholds.warn', '--experimental.importDurations.thresholds.danger',
  '--experimental.vcsProvider',
]);

function splitTail(argumentsList) {
  const delimiter = argumentsList.indexOf('--');
  return delimiter === -1
    ? { head: argumentsList, tail: [] }
    : { head: argumentsList.slice(0, delimiter), tail: argumentsList.slice(delimiter) };
}

function controlledOption(argument) {
  return argument === '--reporter' || argument.startsWith('--reporter=') ||
    argument === '--outputFile' || argument.startsWith('--outputFile=') || argument.startsWith('--outputFile.') ||
    argument === '--fileParallelism' || argument.startsWith('--fileParallelism=') ||
    argument === '--no-file-parallelism' ||
    argument === '--maxWorkers' || argument.startsWith('--maxWorkers=');
}

function controlledOptionTakesValue(argument) {
  const name = optionName(argument);
  return name === '--reporter' || name === '--outputFile' || name.startsWith('--outputFile.') ||
    name === '--maxWorkers' || name === '--fileParallelism';
}

function optionName(argument) {
  const equals = argument.indexOf('=');
  return equals === -1 ? argument : argument.slice(0, equals);
}

function initialArgumentsFrom(argumentsList) {
  const { head, tail } = splitTail(argumentsList);
  const retained = [];
  for (let index = 0; index < head.length; index += 1) {
    const argument = head[index];
    if (!controlledOption(argument)) {
      retained.push(argument);
      continue;
    }
    if (!argument.includes('=') && controlledOptionTakesValue(argument) &&
      head[index + 1] !== undefined && !head[index + 1].startsWith('-')) index += 1;
  }
  return [...retained, ...tail];
}

export function retainedVitestRetryTokens(argumentsList) {
  const { head, tail } = splitTail(argumentsList);
  const retained = [];
  for (let index = 0; index < head.length; index += 1) {
    const argument = head[index];
    if (controlledOption(argument)) {
      if (!argument.includes('=') && controlledOptionTakesValue(argument) &&
        head[index + 1] !== undefined && !head[index + 1].startsWith('-')) index += 1;
      continue;
    }
    if (!argument.startsWith('-')) continue;
    retained.push(argument);
    const name = optionName(argument);
    if (!argument.includes('=') && VALUE_OPTIONS.has(name)) {
      const value = head[index + 1];
      if (value !== undefined && !value.startsWith('-')) {
        retained.push(value);
        index += 1;
      }
    }
  }
  return { retained, tail };
}

const vitestModule = resolve(process.env.DND_GATE_VITEST_MODULE ?? 'node_modules/vitest/vitest.mjs');
const evidenceReporter = resolve('tools/gate-vitest-evidence-reporter.mjs');
const passthroughArguments = process.argv.slice(2);
const initialArtifacts = phaseArtifactPaths('vitest', 'initial');
const initialRaw = runLockedPhase({
  kind: 'vitest',
  phase: 'initial',
  executable: process.execPath,
  arguments: [
    vitestModule,
    'run',
    '--configLoader',
    'runner',
    '--reporter=json',
    `--reporter=${evidenceReporter}`,
    `--outputFile.json=${initialArtifacts.reporterPath}`,
    ...initialArgumentsFrom(passthroughArguments),
  ],
  artifacts: initialArtifacts,
});
const initial = classifyPhase({ kind: 'vitest', ...initialRaw, requestedFiles: null });
const initialFailedFiles = initial.fileOutcomes
  .filter((outcome) => outcome.status === 'failed')
  .map((outcome) => outcome.file);

let retry = null;
if (initialFailedFiles.length > 0) {
  const retryArtifacts = phaseArtifactPaths('vitest', 'retry');
  const parsed = retainedVitestRetryTokens(passthroughArguments);
  const retryRaw = runLockedPhase({
    kind: 'vitest',
    phase: 'retry',
    executable: process.execPath,
    arguments: [
      vitestModule,
      'run',
      ...parsed.retained,
      '--configLoader',
      'runner',
      '--reporter=json',
      `--reporter=${evidenceReporter}`,
      `--outputFile.json=${retryArtifacts.reporterPath}`,
      '--no-file-parallelism',
      '--maxWorkers=1',
      ...initialFailedFiles,
      ...parsed.tail,
    ],
    artifacts: retryArtifacts,
  });
  retry = classifyPhase({ kind: 'vitest', ...retryRaw, requestedFiles: initialFailedFiles });
}

const verdict = reduceGateVerdict(initial, retry);
const report = { version: 2, kind: 'vitest', phases: { initial, retry }, verdict };
const finalReportPath = writeGateReport('vitest', report);
printVerdict(verdict, finalReportPath);
process.exitCode = verdict.status === 'passed' ? 0 : 1;
