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

export interface ContextUsageSample {
  readonly inputTokens: number;
  readonly modelContextWindow: number | null;
}

export function completedContextUsage(value: unknown): readonly ContextUsageSample[] {
  const candidate = record(value);
  if (candidate === null) return [];
  if (candidate['type'] === 'turn.completed') {
    const usage = record(candidate['usage']);
    const inputTokens = usage?.['input_tokens'];
    return typeof inputTokens === 'number' && Number.isSafeInteger(inputTokens) && inputTokens >= 0
      ? [{ inputTokens, modelContextWindow: null }]
      : [];
  }
  if (candidate['type'] === 'event_msg') {
    const payload = record(candidate['payload']);
    const info = payload?.['type'] === 'token_count' ? record(payload['info']) : null;
    const usage = record(info?.['last_token_usage']);
    const inputTokens = usage?.['input_tokens'];
    const modelContextWindow = info?.['model_context_window'];
    return typeof inputTokens === 'number' && Number.isSafeInteger(inputTokens) && inputTokens >= 0
      ? [{
          inputTokens,
          modelContextWindow: typeof modelContextWindow === 'number' &&
            Number.isSafeInteger(modelContextWindow) && modelContextWindow > 0
            ? modelContextWindow : null,
        }]
      : [];
  }
  return Object.values(candidate).flatMap(completedContextUsage);
}

function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
}

export async function main(): Promise<void> {
  const sessionsDirectory = process.argv[2];
  if (sessionsDirectory === undefined || process.argv.length !== 3) {
    throw new TypeError('Usage: npx tsx tools/measure-context-rollover.ts <sessions-directory>');
  }
  const resolvedDirectory = resolve(sessionsDirectory);
  if (!(await stat(resolvedDirectory)).isDirectory()) {
    throw new TypeError('Sessions path must be a directory.');
  }
  const counts: number[] = [];
  const windows = new Set<number>();
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
      for (const sample of completedContextUsage(decoded)) {
        counts.push(sample.inputTokens);
        if (sample.modelContextWindow !== null) windows.add(sample.modelContextWindow);
      }
    }
  }
  if (counts.length === 0) {
    process.stdout.write('count: 0\nmedian: n/a\np90: n/a\np99: n/a\nmax: n/a\nmodel_context_window: n/a\n');
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
    `p99: ${String(percentile(counts, 0.99))}`,
    `max: ${String(counts.at(-1))}`,
    `model_context_window: ${windows.size === 0 ? 'n/a' : [...windows].sort((left, right) => left - right).join(',')}`,
    '',
  ].join('\n'));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/measure-context-rollover.ts') || invokedPath.endsWith('\\measure-context-rollover.ts')
)) await main();
