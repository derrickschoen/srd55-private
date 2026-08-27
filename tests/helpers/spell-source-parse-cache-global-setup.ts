import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import bundledSrd521 from '../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../docs/srd/source/spell-descriptions.txt?raw';
import {
  corpusCacheKey,
  deriveSpellSourceParse,
  encodeSpellSourceParse,
  readerFingerprint,
  spellSourceParseCacheKey,
  SPELL_PARSE_CACHE_FILE_ENV,
  SPELL_PARSE_CACHE_KEY_ENV,
} from '../../src/simulation/spell-source-parse-cache';
import { prepareSeededDatabaseImageCaches } from './seeded-database-image-cache';

/**
 * ONE SRD PARSE PER SUITE RUN INSTEAD OF ONE PER TEST FILE.
 *
 * `src/simulation/coverage.ts` derives its oracle at module evaluation, and 38
 * simulation test files each evaluate the module graph from scratch, so the
 * corpus regex parse ran 38 times per run — measured at 2.09s a time, of which
 * 1.88s is the clause parse alone.
 *
 * This runs once, in the vitest main process, before any worker is forked. It
 * derives the parse (or reuses a previous run's file), writes it as JSON beside
 * a key, and hands the workers the path and the key through the environment.
 * `spellSourceParse` in the worker re-checks BOTH halves of that key against
 * the corpus it is actually holding before it will use a byte of the file, so
 * the tests that mock the corpus still exercise the real parser.
 *
 * The key covers the two corpus strings AND `spell-source-reader.ts`'s own
 * source bytes. Editing either is a miss and a full re-derivation — that check
 * is the entire safety argument, so it is deliberately not clever.
 *
 * The corpus strings are taken from the same `?raw` imports the consumer uses,
 * not from `readFileSync`, so the digest is over the exact strings the consumer
 * will hold and no transform difference can make the cache permanently cold.
 */

const READER_SOURCE = 'src/simulation/spell-source-reader.ts';

const sha256Hex = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

function cacheFilePath(root: string): string {
  const directory = join(tmpdir(), 'dnd-srd-spell-source-parse-cache');
  mkdirSync(directory, { recursive: true });
  const checkout = sha256Hex(realpathSync(root)).slice(0, 16);
  return join(directory, `${checkout}.json`);
}

export default async function setup(): Promise<void> {
  const root = process.cwd();
  const corpusKey = corpusCacheKey(
    sha256Hex,
    bundledSrd521,
    bundledSpellDescriptions,
  );
  const key = spellSourceParseCacheKey(
    sha256Hex,
    corpusKey,
    readFileSync(resolve(root, READER_SOURCE), 'utf8'),
  );
  const file = cacheFilePath(root);
  const fingerprint = readerFingerprint(sha256Hex);

  if (
    reusableStamp(file) === `${key}\n${fingerprint}`
  ) {
    announce('reused', file);
  } else {
    const payload = encodeSpellSourceParse(
      deriveSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
    );
    const temporary = `${file}.${process.pid}.partial`;
    writeFileSync(
      temporary,
      JSON.stringify({
        key,
        corpus_key: corpusKey,
        reader_fingerprint: fingerprint,
        payload_sha256: sha256Hex(payload),
        payload,
      }),
      'utf8',
    );
    renameSync(temporary, file);
    announce('derived', file);
  }

  process.env[SPELL_PARSE_CACHE_FILE_ENV] = file;
  process.env[SPELL_PARSE_CACHE_KEY_ENV] = key;
  // Build immutable seed images before workers fork; every test restores its
  // own writable clone, so mutations never cross a test boundary.
  await prepareSeededDatabaseImageCaches(['full', 'test-core']);
}

/**
 * The key AND reader fingerprint an existing cache file claims, or `null` when
 * there is no usable file. Both, because the worker checks both: a file whose
 * fingerprint this process would not reproduce is a file every worker would
 * reject, and reusing it would leave the cache permanently cold instead of
 * being rewritten once.
 *
 * Anything unreadable or unparseable is treated as absent HERE — this is the
 * writer, and it is about to overwrite the file anyway. The reader in
 * `spell-source-parse-cache.ts` is the half that must refuse to be quiet about
 * corruption, because it is the half that would otherwise use it.
 */
function reusableStamp(file: string): string | null {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof envelope !== 'object' || envelope === null) {
    return null;
  }
  const fields: Readonly<Record<string, unknown>> = envelope as Readonly<
    Record<string, unknown>
  >;
  const key = fields['key'];
  const fingerprint = fields['reader_fingerprint'];
  return typeof key === 'string' && typeof fingerprint === 'string'
    ? `${key}\n${fingerprint}`
    : null;
}

function announce(outcome: 'reused' | 'derived', file: string): void {
  console.log(`[spell-source-parse-cache] ${outcome} ${file}`);
}
