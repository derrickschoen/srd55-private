#!/usr/bin/env node

import { resolve } from 'node:path';
import {
  phaseArtifactPaths,
  printVerdict,
  runLockedPhase,
  writeGateReport,
} from './gate-runner-lib.mjs';
import { classifyPhase, reduceGateVerdict } from './gate-verdict.mjs';

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
  const uncontrolled = withoutControlledOptions(argumentsList, new Set(['--reporter', '--retries', '--workers']));
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

const playwrightModule = resolve(process.env.DND_GATE_PLAYWRIGHT_MODULE ?? 'node_modules/@playwright/test/cli.js');
const evidenceReporter = resolve('tools/gate-playwright-evidence-reporter.mjs');
const passthroughArguments = process.argv.slice(2);
const initialArguments = withoutControlledOptions(passthroughArguments, new Set(['--reporter', '--retries']));
const retryOptions = retryOptionsFrom(passthroughArguments);

function playwrightEnvironment(artifacts) {
  return { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: artifacts.reporterPath };
}

const initialArtifacts = phaseArtifactPaths('playwright', 'initial');
const initialRaw = runLockedPhase({
  kind: 'playwright',
  phase: 'initial',
  executable: process.execPath,
  arguments: [
    playwrightModule,
    'test',
    `--reporter=json,${evidenceReporter}`,
    '--retries=0',
    ...initialArguments,
  ],
  artifacts: initialArtifacts,
  environment: playwrightEnvironment(initialArtifacts),
});
const initial = classifyPhase({ kind: 'playwright', ...initialRaw, requestedFiles: null });
const initialFailedFiles = initial.fileOutcomes
  .filter((outcome) => outcome.status === 'failed')
  .map((outcome) => outcome.file);

let retry = null;
if (initialFailedFiles.length > 0) {
  const retryArtifacts = phaseArtifactPaths('playwright', 'retry');
  const retryRaw = runLockedPhase({
    kind: 'playwright',
    phase: 'retry',
    executable: process.execPath,
    arguments: [
      playwrightModule,
      'test',
      `--reporter=json,${evidenceReporter}`,
      '--retries=0',
      '--workers=1',
      ...retryOptions,
      ...initialFailedFiles,
    ],
    artifacts: retryArtifacts,
    environment: playwrightEnvironment(retryArtifacts),
  });
  retry = classifyPhase({ kind: 'playwright', ...retryRaw, requestedFiles: initialFailedFiles });
}

const verdict = reduceGateVerdict(initial, retry);
const report = { version: 2, kind: 'playwright', phases: { initial, retry }, verdict };
const finalReportPath = writeGateReport('playwright', report);
printVerdict(verdict, finalReportPath);
process.exitCode = verdict.status === 'passed' ? 0 : 1;
