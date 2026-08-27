#!/usr/bin/env node
// Runs a mutation command and makes failure LOUD: any non-zero exit writes
// .tmp-mutation-FAILED at the project root so the supervisor loop can detect,
// fix, and restart the lane without scanning megabyte logs. Success removes
// the sentinel.

import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sentinel = resolve(projectRoot, '.tmp-mutation-FAILED');

const override = process.env.MUTATION_LOUD_CMD;
const [command, ...args] = override === undefined ? ['npx', 'stryker', 'run'] : override.split(' ');

rmSync(sentinel, { force: true });
const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit' });

const code = result.status ?? 1;
if (code !== 0 || result.signal !== null || result.error !== undefined) {
  writeFileSync(
    sentinel,
    [
      `when: ${new Date().toISOString()}`,
      `command: ${command} ${args.join(' ')}`,
      `exit: ${String(result.status)} signal: ${String(result.signal)}`,
      `error: ${result.error === undefined ? 'none' : String(result.error)}`,
      'action: supervisor — read the lane log for the failure, fix, restart the run.',
      '',
    ].join('\n'),
  );
  process.exit(code === 0 ? 1 : code);
}
