import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const sourcePath = resolve(root, 'src/catalog/content-adoption.ts');
const backupPath = resolve('/tmp', 'w7-replacement-collision-mutation.json');
const action = process.argv[2];
const original = `      const defaultChoice = reviewClass === 'key-collision' ? null : 'match';`;
const mutant = `      const defaultChoice = 'match'; // W7_COLLISION_DEFAULT_MUTANT`;
const detector =
  'tests/integration/authoring/handlers.test.ts :: retargets exact and reviewed references through client, worker, and service without silent divergence';

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
    throw new Error('The replacement collision mutation anchor is not exact.');
  }
  writeFileSync(backupPath, JSON.stringify({ source }), 'utf8');
  writeFileSync(sourcePath, source.replace(original, mutant), 'utf8');
  if (occurrences(readFileSync(sourcePath, 'utf8'), mutant) !== 1) {
    throw new Error('The replacement collision mutation did not apply.');
  }
  process.stdout.write('APPLIED W7_COLLISION_DEFAULT_MUTANT\n');
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error(`Mutation backup is missing at ${backupPath}.`);
  }
  const saved = JSON.parse(readFileSync(backupPath, 'utf8'));
  if (typeof saved.source !== 'string') {
    throw new Error('Mutation backup is malformed.');
  }
  if (occurrences(readFileSync(sourcePath, 'utf8'), mutant) !== 1) {
    throw new Error('The applied mutation marker is missing before restore.');
  }
  writeFileSync(sourcePath, saved.source, 'utf8');
  if (readFileSync(sourcePath, 'utf8') !== saved.source) {
    throw new Error('Mutation restore was not byte-exact.');
  }
  unlinkSync(backupPath);
  process.stdout.write('RESTORED W7_COLLISION_DEFAULT_MUTANT byte-exact source\n');
} else {
  throw new Error('Usage: replacement-collision-mutation.mjs describe|apply|restore');
}
