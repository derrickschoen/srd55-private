import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import schema from '../../src/db/schema.sql?raw';
import {
  applicationBootVerificationBuildKey,
  applicationSeed,
} from '../../src/db/bootstrap';
import type { ApplicationSeedProfile } from '../../src/db/application-seed-profile';
import { DatabaseContext } from '../../src/db/database';
import { registerSqliteQueryEngine } from '../../src/db/query';

const CACHE_FORMAT = 'seeded-test-database-v1';

const cacheFileEnvironment: Readonly<Record<ApplicationSeedProfile, string>> =
  Object.freeze({
    full: 'DND_SEEDED_DATABASE_IMAGE_FULL',
    'test-core': 'DND_SEEDED_DATABASE_IMAGE_TEST_CORE',
  });

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function cacheKey(profile: ApplicationSeedProfile): string {
  return sha256(JSON.stringify({
    format: CACHE_FORMAT,
    profile,
    build: applicationBootVerificationBuildKey(),
  }));
}

function cacheFile(root: string, profile: ApplicationSeedProfile): string {
  const checkout = sha256(realpathSync(root)).slice(0, 16);
  const directory = join(
    tmpdir(),
    'dnd-seeded-test-database-cache',
    checkout,
  );
  mkdirSync(directory, { recursive: true });
  return join(directory, `${profile}-${cacheKey(profile)}.sqlite3`);
}

function reusableImage(file: string, key: string): Uint8Array | null {
  try {
    const bytes = new Uint8Array(readFileSync(file));
    const stamp = readFileSync(`${file}.sha256`, 'utf8').trim();
    return stamp === `${key}:${sha256(bytes)}` ? bytes : null;
  } catch {
    return null;
  }
}

function writeImage(file: string, key: string, bytes: Uint8Array): void {
  const imageTemporary = `${file}.${String(process.pid)}.partial`;
  const stampTemporary = `${file}.${String(process.pid)}.sha256.partial`;
  writeFileSync(imageTemporary, bytes);
  writeFileSync(stampTemporary, `${key}:${sha256(bytes)}\n`, 'utf8');
  renameSync(imageTemporary, file);
  renameSync(stampTemporary, `${file}.sha256`);
}

/**
 * Builds each schema-and-seed image once in Vitest's main process, then gives
 * every worker the immutable file through an environment variable. The cache
 * key binds the image to the checkout, seed profile, schema/migration build
 * key, and pinned bundled-content digest. A sidecar digest rejects incomplete
 * or corrupted writes before any worker can restore them.
 */
export async function prepareSeededDatabaseImageCaches(
  profiles: readonly ApplicationSeedProfile[],
): Promise<void> {
  const root = process.cwd();
  const misses: {
    readonly profile: ApplicationSeedProfile;
    readonly file: string;
    readonly key: string;
  }[] = [];

  for (const profile of profiles) {
    const key = cacheKey(profile);
    const file = cacheFile(root, profile);
    if (reusableImage(file, key) === null) {
      misses.push({ profile, file, key });
    }
    process.env[cacheFileEnvironment[profile]] = file;
  }

  if (misses.length === 0) return;

  const sqlite3 = await sqlite3InitModule();
  registerSqliteQueryEngine(sqlite3);
  for (const miss of misses) {
    const connection = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      connection.exec(schema);
      applicationSeed(new DatabaseContext(connection), 'full', miss.profile);
      writeImage(
        miss.file,
        miss.key,
        sqlite3.capi.sqlite3_js_db_export(connection).slice(),
      );
    } finally {
      connection.close();
    }
  }
}

export function readPreparedSeededDatabaseImage(
  profile: ApplicationSeedProfile,
): Uint8Array | null {
  const file = process.env[cacheFileEnvironment[profile]];
  if (file === undefined || file === '') return null;
  const image = reusableImage(file, cacheKey(profile));
  if (image === null) {
    throw new Error(
      `Prepared seeded database image is missing or corrupt: ${file}`,
    );
  }
  return image;
}
