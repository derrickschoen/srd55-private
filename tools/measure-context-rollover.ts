#!/usr/bin/env -S npx tsx

import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

async function rolloutFiles(directory: string): Promise<readonly string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await rolloutFiles(path));
    else if (entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) files.push(path);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function completedInputTokens(value: unknown): readonly number[] {
  const candidate = record(value);
  if (candidate === null) return [];
  if (candidate['type'] === 'turn.completed') {
    const usage = record(candidate['usage']);
    const inputTokens = usage?.['input_tokens'];
    return typeof inputTokens === 'number' && Number.isSafeInteger(inputTokens) && inputTokens >= 0
      ? [inputTokens]
      : [];
  }
  return Object.values(candidate).flatMap(completedInputTokens);
}

function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
}

async function main(): Promise<void> {
  const sessionsDirectory = process.argv[2];
  if (sessionsDirectory === undefined || process.argv.length !== 3) {
    throw new TypeError('Usage: npx tsx tools/measure-context-rollover.ts <sessions-directory>');
  }
  const resolvedDirectory = resolve(sessionsDirectory);
  if (!(await stat(resolvedDirectory)).isDirectory()) {
    throw new TypeError('Sessions path must be a directory.');
  }
  const counts: number[] = [];
  for (const file of await rolloutFiles(resolvedDirectory)) {
    const lines = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (line.trim().length === 0) continue;
      let decoded: unknown;
      try {
        decoded = JSON.parse(line);
      } catch {
        continue;
      }
      counts.push(...completedInputTokens(decoded));
    }
  }
  if (counts.length === 0) {
    process.stdout.write('count: 0\nmedian: n/a\np90: n/a\nmax: n/a\n');
    return;
  }
  counts.sort((left, right) => left - right);
  const middle = Math.floor(counts.length / 2);
  const median = counts.length % 2 === 0
    ? (counts[middle - 1]! + counts[middle]!) / 2
    : counts[middle]!;
  process.stdout.write([
    `count: ${String(counts.length)}`,
    `median: ${String(median)}`,
    `p90: ${String(percentile(counts, 0.9))}`,
    `max: ${String(counts.at(-1))}`,
    '',
  ].join('\n'));
}

await main();
