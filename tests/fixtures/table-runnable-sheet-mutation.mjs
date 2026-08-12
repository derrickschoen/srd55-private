import {
  copyFileSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('src/rules/sheet-feature-values.ts');
const backup = '/tmp/dnd-wt-sd-sheet-feature-values.backup.ts';
const before = "round: 'ceiling',";
const after = "round: 'floor',";

function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

const mode = process.argv[2];
if (mode === 'apply') {
  if (existsSync(backup)) {
    throw new Error(`Refusing to overwrite existing mutation backup ${backup}.`);
  }
  const text = readFileSync(source, 'utf8');
  if (occurrences(text, before) !== 1 || occurrences(text, after) !== 0) {
    throw new Error('Arcane Recovery rounding mutation target is not unique.');
  }
  copyFileSync(source, backup);
  writeFileSync(source, text.replace(before, after));
  const mutated = readFileSync(source, 'utf8');
  if (occurrences(mutated, after) !== 1 || occurrences(mutated, before) !== 0) {
    throw new Error('Arcane Recovery rounding mutation did not apply exactly once.');
  }
} else if (mode === 'restore') {
  if (!existsSync(backup)) {
    throw new Error(`Mutation backup ${backup} does not exist.`);
  }
  copyFileSync(backup, source);
  unlinkSync(backup);
  const restored = readFileSync(source, 'utf8');
  if (occurrences(restored, before) !== 1 || occurrences(restored, after) !== 0) {
    throw new Error('Arcane Recovery rounding mutation did not restore cleanly.');
  }
} else {
  throw new Error('Use apply or restore.');
}
