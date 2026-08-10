import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const sourcePath = resolve(root, 'src/authoring/reference-retarget.ts');
const backupPath = resolve('/tmp', 'srd55-replacement-review-mutation.json');
const action = process.argv[2];
const original =
  '? `the replacement allows only level ${String(levels.minimum)} spells`';
const mutant =
  '? `the replacement allows level ${String(levels.minimum)} spells` // S3_04_MUTANT';
const detector =
  'tests/integration/authoring/handlers.test.ts :: preserves selected species spells and returns a typed notice for a newly incompatible selection';

function occurrences(source, needle) {
  return source.split(needle).length - 1;
}

if (action === 'describe') {
  process.stdout.write(`${detector}\n`);
} else if (action === 'apply') {
  if (existsSync(backupPath)) {
    throw new Error(`Mutation backup already exists at ${backupPath}.`);
  }
  const source = readFileSync(sourcePath, 'utf8');
  if (occurrences(source, original) !== 1 || occurrences(source, mutant) !== 0) {
    throw new Error('The replacement-consequence mutation anchor is not exact.');
  }
  writeFileSync(backupPath, JSON.stringify({ source }), 'utf8');
  writeFileSync(sourcePath, source.replace(original, mutant), 'utf8');
  const applied = readFileSync(sourcePath, 'utf8');
  if (occurrences(applied, mutant) !== 1 || occurrences(applied, original) !== 0) {
    throw new Error('The replacement-consequence mutation did not apply.');
  }
  process.stdout.write('APPLIED S3_04_MUTANT replacement level consequence\n');
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error(`Mutation backup is missing at ${backupPath}.`);
  }
  const saved = JSON.parse(readFileSync(backupPath, 'utf8'));
  if (typeof saved.source !== 'string') {
    throw new Error('Mutation backup is malformed.');
  }
  const mutated = readFileSync(sourcePath, 'utf8');
  if (occurrences(mutated, mutant) !== 1) {
    throw new Error('The applied mutation marker is missing before restore.');
  }
  writeFileSync(sourcePath, saved.source, 'utf8');
  if (readFileSync(sourcePath, 'utf8') !== saved.source) {
    throw new Error('Mutation restore was not byte-exact.');
  }
  unlinkSync(backupPath);
  process.stdout.write('RESTORED S3_04_MUTANT byte-exact source\n');
} else {
  throw new Error('Usage: replacement-review-mutation.mjs describe|apply|restore');
}
