import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const sourcePath = resolve(
  root,
  'src/eligibility/spell-selection-collection.ts',
);
const backupPath = resolve('/tmp', 's5-wizard-spellbook-mutation.json');
const action = process.argv[2];
const original =
  '            AND collection_entry.spell_version_id = ${candidateExpression}';
const mutant =
  '            AND collection_entry.spell_version_id IS NOT NULL /* S5_WIZARD_WHOLE_LIST_MUTANT */';
const detector =
  'tests/integration/eligibility/has-any.test.ts :: offers and accepts only active spellbook rows for a collection-constrained preparation';

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
    throw new Error('The Wizard spellbook mutation anchor is not exact.');
  }
  writeFileSync(backupPath, JSON.stringify({ source }), 'utf8');
  writeFileSync(sourcePath, source.replace(original, mutant), 'utf8');
  if (occurrences(readFileSync(sourcePath, 'utf8'), mutant) !== 1) {
    throw new Error('The Wizard whole-list mutation did not apply.');
  }
  process.stdout.write('APPLIED S5_WIZARD_WHOLE_LIST_MUTANT\n');
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error(`Mutation backup is missing at ${backupPath}.`);
  }
  const saved = JSON.parse(readFileSync(backupPath, 'utf8'));
  if (typeof saved.source !== 'string') {
    throw new Error('Mutation backup is malformed.');
  }
  if (occurrences(readFileSync(sourcePath, 'utf8'), mutant) !== 1) {
    throw new Error('The applied Wizard mutation marker is missing.');
  }
  writeFileSync(sourcePath, saved.source, 'utf8');
  if (readFileSync(sourcePath, 'utf8') !== saved.source) {
    throw new Error('Wizard spellbook mutation restore was not byte-exact.');
  }
  unlinkSync(backupPath);
  process.stdout.write('RESTORED S5_WIZARD_WHOLE_LIST_MUTANT byte-exact source\n');
} else {
  throw new Error('Usage: wizard-spellbook-mutation.mjs describe|apply|restore');
}
