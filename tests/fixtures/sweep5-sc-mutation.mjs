import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const sourcePath = resolve(root, 'src/rules/attack-profiles.ts');
const anchor = "const options = weapon.attack_kind === 'ranged'";
const replacement = "const options = weapon.attack_kind === 'melee'";
const original = readFileSync(sourcePath, 'utf8');
const matches = original.split(anchor).length - 1;
if (matches !== 1) {
  throw new Error(`S5-09 mutation expected one ordering anchor; found ${String(matches)}.`);
}
const mutated = original.replace(anchor, replacement);

let result;
try {
  writeFileSync(sourcePath, mutated);
  const applied = readFileSync(sourcePath, 'utf8');
  if (!applied.includes(replacement) || applied.includes(anchor)) {
    throw new Error('S5-09 mutation did not apply exactly.');
  }
  result = spawnSync(
    'npx',
    [
      'vitest',
      'run',
      '--configLoader',
      'runner',
      'tests/integration/rules/attack-profiles.test.ts',
      '--testNamePattern=opens a seeded Shortbow profile on Dexterity at Fighter 5',
      '--reporter=verbose',
    ],
    { cwd: root, encoding: 'utf8' },
  );
} finally {
  const current = readFileSync(sourcePath, 'utf8');
  if (current !== mutated) {
    throw new Error('S5-09 source changed while the mutation control was running.');
  }
  writeFileSync(sourcePath, original);
}

if (result.error !== undefined) throw result.error;
const output = `${result.stdout}\n${result.stderr}`;
if (result.status === 0) {
  throw new Error(`S5-09 ordering mutant survived.\n${output}`);
}
if (!output.includes('opens a seeded Shortbow profile on Dexterity at Fighter 5')) {
  throw new Error(`S5-09 named pin did not execute.\n${output}`);
}
process.stdout.write(
  'S5-09 ordering mutant killed by the seeded Fighter 5 Shortbow pin; source restored.\n',
);
