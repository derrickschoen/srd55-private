#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  snapshotRawSourceImports,
  writeMutationVitestConfig,
} from './mutation-shard.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(projectRoot, 'reports/stryker');
const paths = {
  directory,
  rawSources: resolve(directory, 'raw-sources.json'),
  vitestConfig: resolve(directory, 'vitest.config.mjs'),
};

await mkdir(directory, { recursive: true });
const rawSources = await snapshotRawSourceImports(paths.rawSources);
await writeMutationVitestConfig(paths, rawSources);
