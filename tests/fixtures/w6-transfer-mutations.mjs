#!/usr/bin/env node

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const action = process.argv[2];
const mutation = process.argv[3];
const backupPath = resolve(
  '/tmp',
  `srd-55-w6-transfer-${mutation ?? 'unknown'}.json`,
);

const mutations = {
  'structural-duplicate': {
    path: 'src/ui/screens/character-list/import-backup-controls.ts',
    from: 'characterDetails(candidate.value.character) === incomingDetails',
    to: 'characterDetails(candidate.value.character) !== incomingDetails',
  },
};

const selected = mutations[mutation];
if (selected === undefined || (action !== 'apply' && action !== 'restore')) {
  throw new Error(
    'Usage: node tests/fixtures/w6-transfer-mutations.mjs apply|restore structural-duplicate',
  );
}

const targetPath = resolve(root, selected.path);

if (action === 'apply') {
  if (existsSync(backupPath)) {
    throw new Error(`Mutation backup already exists: ${backupPath}`);
  }
  const original = readFileSync(targetPath, 'utf8');
  const occurrences = original.split(selected.from).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected exactly one mutation target in ${selected.path}; found ${String(occurrences)}.`,
    );
  }
  writeFileSync(backupPath, JSON.stringify({ path: selected.path, original }));
  writeFileSync(targetPath, original.replace(selected.from, selected.to));
} else {
  if (!existsSync(backupPath)) {
    throw new Error(`Mutation backup does not exist: ${backupPath}`);
  }
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  if (backup.path !== selected.path || typeof backup.original !== 'string') {
    throw new Error('Mutation backup does not match the selected target.');
  }
  writeFileSync(targetPath, backup.original);
  unlinkSync(backupPath);
}
