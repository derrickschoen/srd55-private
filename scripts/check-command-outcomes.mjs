import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const steps = [
  ['sg', ['scan', '--config', 'sgconfig.yml', 'src', 'tools', 'tests']],
  [
    'sg',
    [
      'test',
      '--config',
      'sgconfig.yml',
      '--test-dir',
      'ast-grep-tests',
      '--skip-snapshot-tests',
      '--include-off',
    ],
  ],
  ['node', ['scripts/check-offer-environment-architecture.mjs', '--self-test']],
  ['node', ['scripts/check-offer-environment-architecture.mjs']],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  if (result.error !== undefined) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.signal !== null) {
    console.error(`${command} terminated by ${result.signal}.`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
