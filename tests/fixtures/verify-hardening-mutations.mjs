import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const mutationTool = resolve(root, 'tests/fixtures/hardening-mutations.mjs');
const vitest = resolve(root, 'node_modules/.bin/vitest');
const mutationNames = [
  'digest-count-gate-inverted',
  'digest-fallback-name-skipped',
  'digest-canonical-order-reversed',
  'share-fallback-never-attempted',
  'share-omitted-content-never-computed',
  'share-budget-comparison-inverted',
];

function command(executable, args) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
}

function mutationCommand(action, name) {
  const result = command(process.execPath, [mutationTool, action, name]);
  if (result.status !== 0) {
    throw new Error(`${action} ${name} failed:\n${result.stdout}${result.stderr}`);
  }
  process.stdout.write(result.stdout);
  return result.stdout.trim();
}

function failures(report) {
  return report.testResults.flatMap((file) =>
    file.assertionResults
      .filter((assertion) => assertion.status === 'failed')
      .map((assertion) => assertion.fullName ?? assertion.title ?? '<unnamed>')
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
    const killed = command(vitest, ['run', testFile, '--reporter=json']);
    if (killed.status === 0) {
      throw new Error(`${name}: detector stayed green under an applied mutation.`);
    }
    const report = JSON.parse(killed.stdout);
    const failedNames = failures(report);
    if (!failedNames.some((failed) => failed.includes(testName))) {
      throw new Error(
        `${name}: expected detector was absent. Failures: ${failedNames.join('; ')}`,
      );
    }
    process.stdout.write(
      `KILLED ${name} by "${testName}"; ` +
      `${String(report.numFailedTests)} failed, ${String(report.numPassedTests)} passed\n`,
    );
  } finally {
    if (applied) mutationCommand('restore', name);
  }

  const clean = command(vitest, ['run', testFile, '--reporter=json']);
  if (clean.status !== 0) {
    throw new Error(`${name}: clean restoration did not pass.\n${clean.stdout}${clean.stderr}`);
  }
  const cleanReport = JSON.parse(clean.stdout);
  process.stdout.write(
    `CLEAN ${name}; ${String(cleanReport.numPassedTests)} tests passed\n`,
  );
}
