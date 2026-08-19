import { z } from 'zod';
import { abilities, type Ability, type DamageType } from '../domain/enums';
import type { SaveSuccessOutcome } from './contracts';
import * as spellSourceReader from './spell-source-reader';
import type {
  BroadDamageSaveSuspect,
  SaveDamageClauseParse,
  SourceDamageOccurrence,
  SourceDerivedSaveClause,
} from './spell-source-reader';

/**
 * A DERIVATION CACHE FOR THE TEST PROCESS ONLY, AND THE KEY IS THE GUARANTEE.
 *
 * `src/simulation/coverage.ts` derives its whole source-of-truth oracle at
 * module evaluation: it reads the bundled SRD twice, reads the committed spell
 * extract twice, proves the two readings identical, and then runs every regex
 * in `spell-source-reader.ts` over all 339 spell bodies. Measured on this
 * checkout, the clause parse alone is 1.88s of the 2.09s total. Every one of
 * the 38 simulation test files pays it again, because each file evaluates the
 * module graph from scratch.
 *
 * The parse is a pure function of exactly two strings, so it can be reused —
 * but only across inputs that are PROVABLY the same inputs. That proof is the
 * cache key. It began as two halves, and both are checked on every hit:
 *
 *   corpus half   sha256 over the two corpus strings THIS process actually
 *                 holds, recomputed here rather than trusted. A test that
 *                 mocks `?raw` corpus text gets a different digest and a full
 *                 re-derivation, which is what makes the mocking tests still
 *                 test the parser.
 *   reader half   sha256 over `spell-source-reader.ts`'s own source bytes,
 *                 folded into the key by the writer (the vitest globalSetup,
 *                 which is the only thing that can read a file path) and
 *                 handed to this process through the environment. Editing the
 *                 reader changes the key, so every previously written cache
 *                 file is a miss.
 *
 * THE SOURCE BYTES ARE NOT ENOUGH ON THEIR OWN, and finding that out is the
 * reason the third check exists. `tests/unit/simulation/coverage-*.test.ts`
 * drive coverage.ts's module-level guards by `vi.doMock`ing the reader and
 * re-importing — a substituted parser over an UNCHANGED corpus and an
 * UNCHANGED reader file. Both halves above match, so the first cut of this
 * cache served those tests a real parse and eleven of them stopped testing
 * anything. `readerFingerprint` closes it by digesting the runtime source text
 * of every binding the reader namespace actually exposes in THIS process, so
 * any substitution of any export is a miss. It is a fail-safe comparison: if
 * the two processes ever disagree for an innocent reason, the result is a cold
 * cache, never a stale answer.
 *
 * WHAT MAY BE CACHED IS ONLY WHAT SURVIVES JSON. `parseSaveDamageClauses`
 * returns plain data; `assembleSaveDamageCoverage` mints — it freezes the
 * candidates and the counts — and it is deliberately NOT cached. Frozen
 * structures and WeakSet-minted evidence are re-established in this process,
 * from cached data, by exactly the code that would have run on freshly parsed
 * data. A cache hit changes when the regexes ran, and nothing else.
 *
 * THE PRODUCTION BROWSER PATH DOES NOT PARTICIPATE. Every line below that
 * touches a cache sits behind `import.meta.env.MODE === 'test'`, which Vite
 * statically replaces with `"production" === "test"` in a build, so Rollup
 * removes the branch outright. There is no static `node:` import anywhere in
 * this file — the host services are reached through
 * `process.getBuiltinModule`, a property access — so no bundler ever has a
 * node specifier to resolve. `import.meta.env.DEV` guarding dev-only code, and
 * `tools/assert-dist-clean.mjs` reading the shipped bytes to prove it gone, is
 * the pattern this project already uses for exactly this purpose.
 */

export type SpellSourceParse = {
  readonly bundled_bodies: ReadonlyMap<string, string>;
  readonly extracted_bodies: ReadonlyMap<string, string>;
  readonly bundled_digest_inputs: ReadonlyMap<string, string>;
  readonly extracted_digest_inputs: ReadonlyMap<string, string>;
  readonly clauses: SaveDamageClauseParse;
};

export const SPELL_PARSE_CACHE_FILE_ENV = 'SRD_SPELL_PARSE_CACHE_FILE';
export const SPELL_PARSE_CACHE_KEY_ENV = 'SRD_SPELL_PARSE_CACHE_KEY';

/**
 * The uncached derivation, used by the cache WRITER. The reader (coverage.ts)
 * deliberately does not call this on a miss: it makes the same reader calls
 * inline, in the order it always made them, so that a miss is byte-for-byte
 * the module evaluation that existed before this file did.
 */
export function deriveSpellSourceParse(
  bundledSrd: string,
  spellExtract: string,
): SpellSourceParse {
  const bundledBodies =
    spellSourceReader.spellDescriptionsFromFullLayout(bundledSrd);
  return {
    bundled_bodies: bundledBodies,
    extracted_bodies: spellSourceReader.spellDescriptionsByHeading(
      spellExtract,
    ),
    bundled_digest_inputs:
      spellSourceReader.spellBodyDigestInputsFromFullLayout(bundledSrd),
    extracted_digest_inputs: spellSourceReader.spellBodyDigestInputsByHeading(
      spellExtract,
    ),
    clauses: spellSourceReader.parseSaveDamageClauses(bundledBodies),
  };
}

/**
 * A digest of the reader module AS THIS PROCESS HAS IT — every exported
 * binding, by name, with functions rendered through `Function.prototype
 * .toString`. Two processes that loaded the same file through the same Vite
 * transform agree; a process whose reader has been substituted, wrapped or
 * partially overridden does not, and gets a miss.
 */
export function readerFingerprint(sha256Hex: (value: string) => string): string {
  const namespace: Readonly<Record<string, unknown>> = spellSourceReader;
  const rendered = Object.keys(namespace)
    .sort()
    .map((name) => {
      const value = namespace[name];
      return `${name}\n${
        typeof value === 'function'
          ? value.toString()
          : `#${JSON.stringify(value ?? null)}`
      }`;
    });
  return sha256Hex(rendered.join('\n\u0000\n'));
}

/* ------------------------------------------------------------------ *
 * Wire shape. Maps become entry arrays; everything else is already
 * JSON-representable because `parseSaveDamageClauses` produces plain data.
 * ------------------------------------------------------------------ */

const entriesSchema = z.array(z.tuple([z.string(), z.string()])).readonly();

const damageTypeSchema = z.custom<DamageType>(
  (value) => typeof value === 'string',
);

const abilitySchema = z.enum(abilities);

const saveSuccessKindSchema = z.enum(['none', 'half', 'sourced_damage']);

const damageSignatureSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('dice'),
    damage_type: z.union([damageTypeSchema, z.null()]),
    count: z.number(),
    die: z.number(),
  }),
  z.strictObject({
    kind: z.literal('flat'),
    damage_type: z.union([damageTypeSchema, z.null()]),
    amount: z.number(),
  }),
]);

const damageOccurrenceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('dice'),
    damage_type: z.union([damageTypeSchema, z.null()]),
    count: z.number(),
    die: z.number(),
    arm: z.enum(['failure', 'success']),
    timing: z.enum(['on_save_resolution', 'end_of_target_next_turn']),
    roll_transform: z.enum(['none', 'floor_half']),
    start: z.number(),
    end: z.number(),
    slot_index: z.number(),
    roll_index: z.number(),
  }),
  z.strictObject({
    kind: z.literal('flat'),
    damage_type: z.union([damageTypeSchema, z.null()]),
    amount: z.number(),
    arm: z.enum(['failure', 'success']),
    timing: z.enum(['on_save_resolution', 'end_of_target_next_turn']),
    roll_transform: z.enum(['none', 'floor_half']),
    start: z.number(),
    end: z.number(),
    slot_index: z.number(),
    roll_index: z.number(),
  }),
]);

const clauseSchema = z.strictObject({
  span: z.string(),
  start: z.number(),
  end: z.number(),
  save_start: z.number(),
  ability: abilitySchema,
  success: z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('available'),
      kind: saveSuccessKindSchema,
    }),
    z.strictObject({ status: z.literal('unavailable'), reason: z.string() }),
  ]),
  fixed_save_dc: z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('available'),
      value: z.union([z.number(), z.null()]),
    }),
    z.strictObject({ status: z.literal('unavailable'), reason: z.string() }),
  ]),
  frequency: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('each_declared_event') }),
    z.strictObject({
      kind: z.literal('once_per_turn'),
      turn: z.enum(['source', 'target']),
    }),
    z.strictObject({ kind: z.literal('once_per_round') }),
    z.strictObject({ kind: z.literal('unavailable'), reason: z.string() }),
  ]),
  duration: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('instantaneous') }),
    z.strictObject({
      kind: z.literal('includes_delayed_damage'),
      delayed_until: z.literal('end_of_target_next_turn'),
    }),
  ]),
  timing_unavailable_reason: z.union([z.string(), z.null()]),
  repetitions: z.discriminatedUnion('status', [
    z.strictObject({
      status: z.literal('available'),
      minimum: z.literal(1),
      maximum: z.union([z.literal(1), z.literal(2)]),
    }),
    z.strictObject({ status: z.literal('unavailable'), reason: z.string() }),
  ]),
  failed_damage_signatures: z.array(damageSignatureSchema).readonly(),
  damage_occurrences: z.array(damageOccurrenceSchema).readonly(),
});

const suspectSchema = z.strictObject({
  heading: z.string(),
  span: z.string(),
  start: z.number(),
  end: z.number(),
});

const payloadSchema = z.strictObject({
  bundled_bodies: entriesSchema,
  extracted_bodies: entriesSchema,
  bundled_digest_inputs: entriesSchema,
  extracted_digest_inputs: entriesSchema,
  clauses_by_heading: z
    .array(z.tuple([z.string(), z.array(clauseSchema).readonly()]))
    .readonly(),
  raw_clause_count: z.number(),
  broad_suspects: z.array(suspectSchema).readonly(),
});

/**
 * The schemas above are a SECOND statement of shapes that already exist as
 * types, and a second statement can drift. These assertions make drift a
 * compile error rather than a runtime cache failure: `Exact` holds only when
 * each type is assignable to the other, so a field added to, removed from or
 * retyped in the reader fails `tsc -b` — and so does a union arm the schema
 * forgot, which one-directional `satisfies z.ZodType<T>` would have accepted.
 */
type Exact<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : never
  : never;

const damageSignatureSchemaIsExact: Exact<
  z.infer<typeof damageSignatureSchema>,
  SourceDerivedSaveClause['failed_damage_signatures'][number]
> = true;
const damageOccurrenceSchemaIsExact: Exact<
  z.infer<typeof damageOccurrenceSchema>,
  SourceDamageOccurrence
> = true;
const clauseSchemaIsExact: Exact<
  z.infer<typeof clauseSchema>,
  SourceDerivedSaveClause
> = true;
const suspectSchemaIsExact: Exact<
  z.infer<typeof suspectSchema>,
  BroadDamageSaveSuspect
> = true;
const abilitySchemaIsExact: Exact<z.infer<typeof abilitySchema>, Ability> = true;
const saveSuccessKindSchemaIsExact: Exact<
  z.infer<typeof saveSuccessKindSchema>,
  SaveSuccessOutcome['kind']
> = true;

/**
 * Exported only so the assertions above cannot be deleted as unused. Reading
 * this object tells you nothing; failing to compile it tells you everything.
 */
export const spellSourceParseSchemaBindings = Object.freeze({
  damage_signature: damageSignatureSchemaIsExact,
  damage_occurrence: damageOccurrenceSchemaIsExact,
  clause: clauseSchemaIsExact,
  suspect: suspectSchemaIsExact,
  ability: abilitySchemaIsExact,
  save_success_kind: saveSuccessKindSchemaIsExact,
});

export function encodeSpellSourceParse(parse: SpellSourceParse): string {
  return JSON.stringify({
    bundled_bodies: [...parse.bundled_bodies],
    extracted_bodies: [...parse.extracted_bodies],
    bundled_digest_inputs: [...parse.bundled_digest_inputs],
    extracted_digest_inputs: [...parse.extracted_digest_inputs],
    clauses_by_heading: [...parse.clauses.clauses_by_heading],
    raw_clause_count: parse.clauses.raw_clause_count,
    broad_suspects: parse.clauses.broad_suspects,
  } satisfies z.infer<typeof payloadSchema>);
}

export function decodeSpellSourceParse(payload: string): SpellSourceParse {
  const decoded = payloadSchema.parse(JSON.parse(payload) as unknown);
  return {
    bundled_bodies: new Map(decoded.bundled_bodies),
    extracted_bodies: new Map(decoded.extracted_bodies),
    bundled_digest_inputs: new Map(decoded.bundled_digest_inputs),
    extracted_digest_inputs: new Map(decoded.extracted_digest_inputs),
    clauses: {
      clauses_by_heading: new Map(decoded.clauses_by_heading),
      raw_clause_count: decoded.raw_clause_count,
      broad_suspects: decoded.broad_suspects,
    },
  };
}

const envelopeSchema = z.strictObject({
  key: z.string(),
  corpus_key: z.string(),
  reader_fingerprint: z.string(),
  payload_sha256: z.string(),
  payload: z.string(),
});

export type SpellSourceParseCacheEnvelope = z.infer<typeof envelopeSchema>;

/* ------------------------------------------------------------------ *
 * Host services. Reached by property access, never by a `node:` import
 * specifier, so nothing here is resolvable — or even visible — to a bundler.
 * ------------------------------------------------------------------ */

type SyncTextReader = (path: string, encoding: 'utf8') => string;
type Hasher = {
  update(value: string): Hasher;
  digest(encoding: 'hex'): string;
};
type HashFactory = (algorithm: 'sha256') => Hasher;

type BuiltinHost = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly getBuiltinModule: (id: string) => unknown;
};

type TestHost = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly readTextFile: SyncTextReader;
  readonly sha256Hex: (value: string) => string;
};

function property(container: unknown, name: string): unknown {
  return typeof container === 'object' && container !== null
    ? (container as Readonly<Record<string, unknown>>)[name]
    : undefined;
}

function builtinHost(): BuiltinHost | null {
  const runtime = property(globalThis, 'process');
  const env = property(runtime, 'env');
  const getBuiltinModule = property(runtime, 'getBuiltinModule');
  if (
    typeof env !== 'object' ||
    env === null ||
    typeof getBuiltinModule !== 'function'
  ) {
    return null;
  }
  return {
    env: env as Readonly<Record<string, string | undefined>>,
    getBuiltinModule: (id: string): unknown =>
      (getBuiltinModule as (this: unknown, id: string) => unknown).call(
        runtime,
        id,
      ),
  };
}

/**
 * `null` whenever this is not a node test process: a production browser build
 * never reaches this function at all (the caller's `import.meta.env.MODE`
 * branch is removed), and a node process that globalSetup did not prepare has
 * no cache file to read.
 */
function testHost(): TestHost | null {
  const host = builtinHost();
  if (host === null) {
    return null;
  }
  const readFileSync = property(host.getBuiltinModule('node:fs'), 'readFileSync');
  const createHash = property(host.getBuiltinModule('node:crypto'), 'createHash');
  if (typeof readFileSync !== 'function' || typeof createHash !== 'function') {
    return null;
  }
  const hash = createHash as HashFactory;
  return {
    env: host.env,
    readTextFile: readFileSync as SyncTextReader,
    sha256Hex: (value: string): string =>
      hash('sha256').update(value).digest('hex'),
  };
}

/**
 * The corpus half of the key. Lengths are written in alongside the text so no
 * pair of corpora can be concatenated into another pair's digest input.
 */
export function corpusCacheKey(
  sha256Hex: (value: string) => string,
  bundledSrd: string,
  spellExtract: string,
): string {
  return sha256Hex(
    `srd-spell-source-parse/v1\n${bundledSrd.length}\n${spellExtract.length}\n${bundledSrd}\n${spellExtract}`,
  );
}

export function spellSourceParseCacheKey(
  sha256Hex: (value: string) => string,
  corpusKey: string,
  readerSource: string,
): string {
  return sha256Hex(
    `srd-spell-source-parse/v1\n${corpusKey}\n${readerSource.length}\n${readerSource}`,
  );
}

class SpellSourceParseCacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpellSourceParseCacheError';
  }
}

/**
 * A miss returns `null` and the caller derives exactly as it always did. Four
 * things are misses, and each is a whole input to the derivation:
 *
 *   no cache prepared          nothing set this process's environment
 *   key mismatch               the corpus or the reader FILE changed since the
 *                              file was written (the writer folds both in)
 *   fingerprint mismatch       the reader module in THIS process is not the one
 *                              the file was written from — a `vi.doMock`, a
 *                              wrapper, a partial override
 *   corpus mismatch            the strings this process is actually holding are
 *                              not the strings that were parsed
 *
 * Everything else — a file that will not parse, an envelope that is not an
 * envelope, a payload whose bytes do not hash to the digest recorded beside
 * them — is a CORRUPT cache, and a corrupt cache throws. Falling back to a
 * derivation there would make silent corruption indistinguishable from a
 * healthy run, and the whole point of storing the digest is to be unable to
 * ignore it.
 */
function hitFor(
  host: TestHost,
  bundledSrd: string,
  spellExtract: string,
): SpellSourceParse | null {
  const file = host.env[SPELL_PARSE_CACHE_FILE_ENV];
  const expectedKey = host.env[SPELL_PARSE_CACHE_KEY_ENV];
  if (
    file === undefined ||
    file === '' ||
    expectedKey === undefined ||
    expectedKey === ''
  ) {
    return null;
  }
  const envelope = readEnvelope(host, file);
  if (envelope === null || envelope.key !== expectedKey) {
    return null;
  }
  if (envelope.reader_fingerprint !== readerFingerprint(host.sha256Hex)) {
    return null;
  }
  if (
    envelope.corpus_key !==
    corpusCacheKey(host.sha256Hex, bundledSrd, spellExtract)
  ) {
    return null;
  }
  if (host.sha256Hex(envelope.payload) !== envelope.payload_sha256) {
    throw new SpellSourceParseCacheError(
      `The cached spell-source parse at ${file} does not hash to the digest ` +
        'recorded beside it. The file is corrupt; delete it and re-run. It ' +
        'has NOT been used.',
    );
  }
  return decodeSpellSourceParse(envelope.payload);
}

function readEnvelope(
  host: TestHost,
  file: string,
): SpellSourceParseCacheEnvelope | null {
  let text: string;
  try {
    text = host.readTextFile(file, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (cause) {
    throw new SpellSourceParseCacheError(
      `The cached spell-source parse at ${file} is not JSON. The file is ` +
        `corrupt; delete it and re-run. (${String(cause)})`,
    );
  }
  const envelope = envelopeSchema.safeParse(parsed);
  if (!envelope.success) {
    throw new SpellSourceParseCacheError(
      `The cached spell-source parse at ${file} is not a cache envelope. The ` +
        'file is corrupt; delete it and re-run.',
    );
  }
  return envelope.data;
}

/**
 * The one thing `src/simulation/coverage.ts` calls. `null` means "derive as
 * you always did", and coverage.ts then runs the reader calls it has always
 * run, inline, in the same order.
 *
 * In a production build `import.meta.env.MODE` is the literal `"production"`,
 * so the condition is statically false, Rollup deletes the branch, and this
 * function is a constant `null`. There is no cache in the browser — there is
 * not even a code path that could look for one.
 */
export function cachedSpellSourceParse(
  bundledSrd: string,
  spellExtract: string,
): SpellSourceParse | null {
  if (import.meta.env.MODE !== 'test') {
    return null;
  }
  const host = testHost();
  return host === null ? null : hitFor(host, bundledSrd, spellExtract);
}
