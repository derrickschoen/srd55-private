import { readFileSync, writeFileSync } from 'node:fs';
import { validateD569FirstArm } from './validate-first-arm';
import { readReconciliationSidecar } from './reconciliation';
import { sha256Text } from './reconciliation';

export const D569_HARD_REPLACEMENT_KEYS = ['2:1', '4:1', '8:1'] as const;

function rowKey(line: string): string {
  const value: unknown = JSON.parse(line);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('D569 row must be an object.');
  const row = value as Readonly<Record<string, unknown>>;
  if (typeof row['scheduledCellKey'] === 'string') return row['scheduledCellKey'];
  if (typeof row['room'] === 'number' && typeof row['round'] === 'number') {
    return `${String(row['room'])}:${String(row['round'])}`;
  }
  throw new TypeError('D569 row lacks a scheduled cell identity.');
}

export function mergeRepairedHard(originalRaw: string, replacementRaw: string): string {
  const original = originalRaw.split('\n').filter((line) => line.length > 0);
  const replacementLines = replacementRaw.split('\n').filter((line) => line.length > 0);
  const replacements = new Map(replacementLines
    .map((line) => [rowKey(line), line] as const));
  if (replacementLines.length !== D569_HARD_REPLACEMENT_KEYS.length ||
    replacements.size !== D569_HARD_REPLACEMENT_KEYS.length ||
    D569_HARD_REPLACEMENT_KEYS.some((key) => !replacements.has(key))) {
    throw new TypeError('Patched hard input must contain exactly replacement keys 2:1, 4:1, and 8:1.');
  }
  const merged = original.map((line) => replacements.get(rowKey(line)) ?? line);
  for (const key of D569_HARD_REPLACEMENT_KEYS) {
    if (!original.some((line) => rowKey(line) === key)) throw new TypeError(`Original hard grid lacks ${key}.`);
  }
  return `${merged.join('\n')}\n`;
}

function main(argv: readonly string[]): void {
  const [originalPath, replacementsPath, sidecarPath, outputPath] = argv;
  if (originalPath === undefined || replacementsPath === undefined || sidecarPath === undefined || outputPath === undefined) {
    throw new TypeError('Usage: merge-repaired-hard.ts ORIGINAL.jsonl REPLACEMENTS.jsonl RECONCILIATION.json OUTPUT.jsonl');
  }
  const original = readFileSync(originalPath, 'utf8');
  const sidecar = readReconciliationSidecar(sidecarPath);
  if (sha256Text(original) !== sidecar.rawFileSha256) {
    throw new TypeError('Original hard raw hash does not match the reconciliation sidecar.');
  }
  validateD569FirstArm(original, sidecar);
  const merged = mergeRepairedHard(original, readFileSync(replacementsPath, 'utf8'));
  validateD569FirstArm(merged, sidecar);
  writeFileSync(outputPath, merged, { encoding: 'utf8', flag: 'wx' });
}

if (process.argv[1]?.endsWith('merge-repaired-hard.ts') === true) main(process.argv.slice(2));
