import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const mutationTool = resolve(
  root,
  'tests/fixtures/content-identity-mutations.mjs',
);
const vitest = resolve(root, 'node_modules/.bin/vitest');
const mutationNames = [
  'class',
  'feat',
  'species',
  'background',
  'subclass',
  'spell',
  'weapon',
  'armor',
  'item',
  'content-v1',
  'key-kind-derived',
  'key-kind-asserted',
  'key-kind-bundled-stable',
  'ui-preview-counts',
  'ui-preview-conflicts',
  'ui-match-reason',
  'ui-same-name-guidance',
  'ui-refusal-block',
  'ui-preview-before-commit',
  'ui-remembered-refresh',
  'ui-remembered-identity',
  'ui-complete-backup-wording',
  'ui-reference-wording',
];

function command(executable, args) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
}

function guardNoTestRunner() {
  const result = command('ps', ['-eo', 'args']);
  if (result.status !== 0) {
    throw new Error(`Could not inspect processes: ${result.stderr}`);
  }
  const running = result.stdout.split('\n').filter((line) =>
    /vitest|playwright/u.test(line) &&
    !line.includes('verify-content-identity-mutations.mjs'),
  );
  if (running.length > 0) {
    throw new Error(`Existing test runner detected:\n${running.join('\n')}`);
  }
}

function mutationCommand(action, name) {
  const result = command(process.execPath, [mutationTool, action, name]);
  if (result.status !== 0) {
    throw new Error(
      `${action} ${name} failed:\n${result.stdout}${result.stderr}`,
    );
  }
  process.stdout.write(result.stdout);
  return result.stdout.trim();
}

function summary(output) {
  return output.split('\n').filter((line) =>
    /Test Files|Tests\s/u.test(line),
  ).join('\n');
}

function jsonSummary(report) {
  return ` Test Files  ${String(report.numFailedTestSuites)} failed, ` +
    `${String(report.numPassedTestSuites)} passed; Tests  ` +
    `${String(report.numFailedTests)} failed, ${String(report.numPassedTests)} passed`;
}

function namedDetectorFailed(report, testName) {
  const normalizedExpected = testName.replaceAll("'", '').replaceAll('"', '');
  return report.testResults.some((file) =>
    file.assertionResults.some((assertion) => {
      const candidate = `${assertion.fullName ?? ''} ${assertion.title ?? ''}`
        .replaceAll("'", '')
        .replaceAll('"', '');
      return assertion.status === 'failed' && candidate.includes(normalizedExpected);
    }),
  );
}

for (const name of mutationNames) {
  const description = mutationCommand('describe', name);
  const separator = description.indexOf(' :: ');
  if (separator < 0) throw new Error(`Malformed detector description: ${description}`);
  const testFile = description.slice(0, separator);
  const testName = description.slice(separator + 4);
  let applied = false;
  try {
    mutationCommand('apply', name);
    applied = true;
    guardNoTestRunner();
    const killed = command(vitest, ['run', testFile, '--reporter=json']);
    const killedOutput = `${killed.stdout}${killed.stderr}`;
    if (killed.status === 0) {
      throw new Error(`${name}: detector stayed green under an applied mutation.`);
    }
    let killedReport;
    try {
      killedReport = JSON.parse(killed.stdout);
    } catch {
      throw new Error(`${name}: detector report was not JSON.\n${killedOutput}`);
    }
    if (!namedDetectorFailed(killedReport, testName)) {
      throw new Error(
        `${name}: expected detector name was absent.\n${killedOutput}`,
      );
    }
    process.stdout.write(
      `DETECTED ${name} by "${testName}"\n${jsonSummary(killedReport)}\n`,
    );
  } finally {
    if (applied) mutationCommand('restore', name);
  }

  guardNoTestRunner();
  const clean = command(vitest, ['run', testFile, '--reporter=dot']);
  const cleanOutput = `${clean.stdout}${clean.stderr}`;
  if (clean.status !== 0) {
    throw new Error(`${name}: clean restoration did not pass.\n${cleanOutput}`);
  }
  process.stdout.write(`CLEAN ${name}\n${summary(cleanOutput)}\n`);
}
