import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import bundledSrd521 from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import {
  assembleSaveDamageCoverage,
  deriveSaveDamageCoverageFromBodies,
  parseSaveDamageClauses,
} from '../../../src/simulation/spell-source-reader';
import {
  cachedSpellSourceParse,
  corpusCacheKey,
  decodeSpellSourceParse,
  deriveSpellSourceParse,
  encodeSpellSourceParse,
  readerFingerprint,
  spellSourceParseCacheKey,
  SPELL_PARSE_CACHE_FILE_ENV,
  SPELL_PARSE_CACHE_KEY_ENV,
  type SpellSourceParse,
} from '../../../src/simulation/spell-source-parse-cache';

/**
 * THE CACHE KEY IS THE GUARANTEE, SO THE KEY IS WHAT THIS FILE PROBES.
 *
 * A derivation cache that is merely fast is worthless — the failure it would
 * ship is a suite that passes green against a stale parse of a corpus nobody
 * has any more. Every test below plants a cache file whose payload is
 * DETECTABLY WRONG (a clause count 1000 too high, which the real corpus cannot
 * produce) and then asks what comes back:
 *
 *   the planted value  the cache was genuinely consulted, so the timing win is
 *                      real and not an artefact of measurement
 *   `null`             the check refused it, and `src/simulation/coverage.ts`
 *                      falls through to the derivation it always did
 *
 * Mutating toward a plausible wrong value rather than deleting the file is
 * deliberate. Absence is easy to notice and is not the failure that ships.
 */

const READER_PATH = '../../../src/simulation/spell-source-reader';
type Reader = typeof import('../../../src/simulation/spell-source-reader');
type Cache = typeof import('../../../src/simulation/spell-source-parse-cache');

const sha256Hex = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const realParse = deriveSpellSourceParse(
  bundledSrd521,
  bundledSpellDescriptions,
);
const PLANTED_COUNT = realParse.clauses.raw_clause_count + 1000;

const plantedParse: SpellSourceParse = {
  ...realParse,
  clauses: { ...realParse.clauses, raw_clause_count: PLANTED_COUNT },
};

const realCorpusKey = corpusCacheKey(
  sha256Hex,
  bundledSrd521,
  bundledSpellDescriptions,
);
const READER_SOURCE_STAND_IN = 'the reader source bytes at cache-writing time';
const realKey = spellSourceParseCacheKey(
  sha256Hex,
  realCorpusKey,
  READER_SOURCE_STAND_IN,
);

const directory = mkdtempSync(join(tmpdir(), 'spell-source-parse-cache-'));
const savedFile = process.env[SPELL_PARSE_CACHE_FILE_ENV];
const savedKey = process.env[SPELL_PARSE_CACHE_KEY_ENV];

let planted = 0;

/**
 * Writes one cache file and points the reader at it. `payload` is written as
 * given, and the digest may be taken over something else, because corrupting
 * the bytes after the digest was computed is the only way to reach the
 * corruption path — a faithful writer can never produce it.
 */
function plant(options: {
  readonly payload: string;
  readonly payloadDigestOver?: string;
  readonly corpusKey?: string;
  readonly readerFingerprint?: string;
  readonly announcedKey?: string;
}): void {
  planted += 1;
  const file = join(directory, `cache-${planted}.json`);
  writeFileSync(
    file,
    JSON.stringify({
      key: realKey,
      corpus_key: options.corpusKey ?? realCorpusKey,
      reader_fingerprint:
        options.readerFingerprint ?? readerFingerprint(sha256Hex),
      payload_sha256: sha256Hex(options.payloadDigestOver ?? options.payload),
      payload: options.payload,
    }),
    'utf8',
  );
  process.env[SPELL_PARSE_CACHE_FILE_ENV] = file;
  process.env[SPELL_PARSE_CACHE_KEY_ENV] = options.announcedKey ?? realKey;
}

function restoreEnvironment(): void {
  if (savedFile === undefined) {
    delete process.env[SPELL_PARSE_CACHE_FILE_ENV];
  } else {
    process.env[SPELL_PARSE_CACHE_FILE_ENV] = savedFile;
  }
  if (savedKey === undefined) {
    delete process.env[SPELL_PARSE_CACHE_KEY_ENV];
  } else {
    process.env[SPELL_PARSE_CACHE_KEY_ENV] = savedKey;
  }
}

afterEach(() => {
  restoreEnvironment();
  vi.doUnmock(READER_PATH);
  vi.resetModules();
});
afterAll(() => {
  restoreEnvironment();
  rmSync(directory, { recursive: true, force: true });
});

const planted_count_of = (parse: SpellSourceParse | null): number | null =>
  parse === null ? null : parse.clauses.raw_clause_count;

describe('splitting the parse from the minting', () => {
  const bodies = new Map([...realParse.bundled_bodies].slice(0, 12));

  it('assembles exactly what the one-shot derivation always produced', () => {
    expect(
      assembleSaveDamageCoverage(bodies, parseSaveDamageClauses(bodies)),
    ).toEqual(deriveSaveDamageCoverageFromBodies(bodies));
  });

  it('freezes the candidates and the counts on cached data as on fresh data', () => {
    const coverage = assembleSaveDamageCoverage(
      bodies,
      decodeSpellSourceParse(
        encodeSpellSourceParse({
          ...realParse,
          clauses: parseSaveDamageClauses(bodies),
        }),
      ).clauses,
    );
    expect(Object.isFrozen(coverage.counts)).toBe(true);
    expect(coverage.candidates.length).toBeGreaterThan(0);
    expect(
      coverage.candidates.every((candidate) => Object.isFrozen(candidate)),
    ).toBe(true);
  });
});

describe('the cached payload survives JSON without loss', () => {
  it('decodes the whole corpus parse to something equal to what was encoded', () => {
    expect(decodeSpellSourceParse(encodeSpellSourceParse(realParse))).toEqual(
      realParse,
    );
  });
});

describe('a cache whose every check passes is used', () => {
  it('returns the cached parse rather than re-deriving it', () => {
    plant({ payload: encodeSpellSourceParse(plantedParse) });
    expect(
      planted_count_of(
        cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
      ),
    ).toBe(PLANTED_COUNT);
  });
});

describe('a corrupt cache is never used quietly', () => {
  it('throws when the payload bytes do not hash to the recorded digest', () => {
    const payload = encodeSpellSourceParse(plantedParse);
    const corrupted = `${payload.slice(0, 40)}X${payload.slice(41)}`;
    expect(corrupted).not.toBe(payload);
    expect(corrupted.length).toBe(payload.length);
    plant({ payload: corrupted, payloadDigestOver: payload });
    expect(() =>
      cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
    ).toThrow(/does not hash to the digest/u);
  });

  it('throws when the file is not JSON at all', () => {
    const file = join(directory, 'not-json.json');
    writeFileSync(file, '{ this is not json', 'utf8');
    process.env[SPELL_PARSE_CACHE_FILE_ENV] = file;
    process.env[SPELL_PARSE_CACHE_KEY_ENV] = realKey;
    expect(() =>
      cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
    ).toThrow(/is not JSON/u);
  });

  it('throws when the payload is well-formed JSON but not a parse', () => {
    plant({ payload: JSON.stringify({ bundled_bodies: [] }) });
    expect(() =>
      cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
    ).toThrow();
  });
});

describe('a changed input is a miss', () => {
  it('misses when the corpus this process holds is not the cached corpus', () => {
    plant({ payload: encodeSpellSourceParse(plantedParse) });
    const changedCorpus = `${bundledSpellDescriptions}\n`;
    expect(changedCorpus).not.toBe(bundledSpellDescriptions);
    expect(cachedSpellSourceParse(bundledSrd521, changedCorpus)).toBeNull();
  });

  it('misses when the reader source behind the cached key has changed', () => {
    plant({
      payload: encodeSpellSourceParse(plantedParse),
      announcedKey: spellSourceParseCacheKey(
        sha256Hex,
        realCorpusKey,
        `${READER_SOURCE_STAND_IN} // one edit`,
      ),
    });
    expect(
      cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
    ).toBeNull();
  });

  it('misses when no cache has been prepared at all', () => {
    delete process.env[SPELL_PARSE_CACHE_FILE_ENV];
    delete process.env[SPELL_PARSE_CACHE_KEY_ENV];
    expect(
      cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
    ).toBeNull();
  });

  /**
   * The check the first cut of this cache did not have, and the one that
   * matters most to the rest of the suite. `coverage-*.test.ts` drive
   * coverage.ts's module-level guards by substituting reader exports over an
   * unchanged corpus and an unchanged reader FILE; both other halves of the key
   * still match, so without this the substituted parser is never called and
   * eleven near-miss probes silently stop probing.
   *
   * The override below is a WRAPPER that behaves identically to the function it
   * replaces. Only its source text differs, so nothing but the fingerprint can
   * possibly notice it — which is exactly the property being asserted.
   */
  it('misses when a reader export has been substituted, even by an identical wrapper', async () => {
    plant({ payload: encodeSpellSourceParse(plantedParse) });
    vi.resetModules();
    vi.doMock(READER_PATH, async () => {
      const actual = await vi.importActual<Reader>(READER_PATH);
      return {
        ...actual,
        spellDescriptionsByHeading: (extract: string) =>
          actual.spellDescriptionsByHeading(extract),
      };
    });
    const cache: Cache = await import(
      '../../../src/simulation/spell-source-parse-cache'
    );
    expect(
      cache.cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
    ).toBeNull();
  });

  it('hits again once the substitution is gone, so the miss above was the mock', async () => {
    plant({ payload: encodeSpellSourceParse(plantedParse) });
    vi.resetModules();
    const cache: Cache = await import(
      '../../../src/simulation/spell-source-parse-cache'
    );
    expect(
      planted_count_of(
        cache.cachedSpellSourceParse(bundledSrd521, bundledSpellDescriptions),
      ),
    ).toBe(PLANTED_COUNT);
  });
});
