import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve('src/queries/character-sheet-builder.ts');
const backupPath = resolve('/tmp', 'dnd-wt-e3-feature-value-mutation.ts');
const original = `entry.class_content_key,
            entry.class_level as ClassLevel,`;
const mutant = `entry.class_content_key,
            (totalLevel ?? entry.class_level) as ClassLevel, // E3 MUTANT: total level`;
const action = process.argv[2];

if (action === 'apply') {
  const source = readFileSync(sourcePath, 'utf8');
  if (source.split(original).length !== 2 || source.includes(mutant)) {
    throw new Error('E3 class-level mutation anchor is not exact.');
  }
  writeFileSync(backupPath, source);
  writeFileSync(sourcePath, source.replace(original, mutant));
  process.stdout.write('applied E3 Rogue-total-level mutation\n');
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error('E3 mutation backup is missing.');
  }
  writeFileSync(sourcePath, readFileSync(backupPath, 'utf8'));
  unlinkSync(backupPath);
  process.stdout.write('restored E3 Rogue-total-level mutation\n');
} else {
  throw new Error('Usage: node tests/fixtures/e3-feature-value-mutation.mjs apply|restore');
}
