# Character-share format comparison

## Conclusion

The shipped format is **fixed-layout positional JSON compressed with
browser-native gzip**. It provides the only meaningful format-size reduction in
this comparison while retaining native JSON parsing and compression. The
versioned mapper and strict tuple validation are now part of the implementation,
and golden tests pin the layout. MessagePack, CBOR, a TSV hybrid, database JSONB,
and Brotli fallbacks do not improve the result enough to justify their decoder
or maintenance cost.

This conclusion compares serialization bytes only after minification and
compression. Decoder bundle cost, import safety, and debuggability are then used
to decide whether a byte win is worth adopting.

## Method

The original comparison used the precursor of
[`minimal-share-example.json`](./minimal-share-example.json). That example now
tracks the live logical validator. The measurements remain historical results
for that earlier specimen. The positional mapper in
[`measure-formats.mjs`](./measure-formats.mjs) now follows the live v2 field
order for every structure populated by this specimen, so reruns compare it
honestly; the production codec, version registry, and golden tests remain
authoritative.

The baseline is `JSON.stringify()` of the full specimen. “Trimmed” applies the
previously agreed semantic policy:

- remove every `note` and `notes` field;
- omit `null`;
- omit the known `false` defaults `character.allow_legacy` and
  `selections[].keep`;
- omit arrays and objects that become empty;
- retain empty strings, zero, `true`, all nonempty optional collections, class
  abilities, and nonempty configuration.

Removing notes is intentionally lossy product policy, not a serialization win.
Alternate encodings used the same 2,140-byte trimmed value, so comparisons
against that row isolated the wire format. The historical script round-tripped
the positional, TSV, MessagePack, and CBOR forms back to that trimmed value.

All measurements below are real measurements from Node v24.13.0 on Linux x64,
zlib 1.3.1, Brotli 1.1.0, SQLite 3.50.4, PostgreSQL 18.3 via PGlite 0.5.4,
`@msgpack/msgpack` 3.1.3, and `cborg` 5.1.8. Gzip and deflate-raw use level 9.
Brotli uses quality 11 and text mode as requested. Base64url is unpadded.

## Measurements

| Encoding | Basis | Raw B | gzip B | deflate-raw B | Brotli B | Best compressor | Best base64url chars |
|---|---|---:|---:|---:|---:|---|---:|
| Minified JSON | measured, full specimen | 2,815 | 987 | 969 | 800 | Brotli | 1,067 |
| Trimmed minified JSON | measured | 2,140 | 718 | 700 | 587 | Brotli | 783 |
| Positional JSON tuples | measured | 1,204 | 469 | 451 | **405** | Brotli | **540** |
| TSV/JSON hybrid | measured prototype | 1,659 | 688 | 670 | 567 | Brotli | 756 |
| MessagePack, keyed object | measured | 1,754 | 749 | 731 | 625 | Brotli | 834 |
| MessagePack, positional tuples | measured | 998 | 502 | 484 | 427 | Brotli | 570 |
| CBOR, keyed object | measured | 1,764 | 714 | 696 | 598 | Brotli | 798 |
| CBOR, positional tuples | measured | 1,007 | 481 | 463 | 415 | Brotli | 554 |
| SQLite JSONB, keyed object | measured internal blob | 1,851 | 811 | 793 | 675 | Brotli | 900 |
| PostgreSQL `jsonb_send`, keyed object | measured wire form | 2,320 | 734 | 716 | 624 | Brotli | 832 |

The PostgreSQL internal `jsonb` datum was **2,756 B**, measured with
`pg_column_size`; it cannot be fed to the compressors as a supported export
format. PostgreSQL's measured `jsonb_send` value is a version byte followed by
normalized JSON text, not its internal representation.

The important format comparison is against trimmed JSON:

- positional JSON saves 249 B (34.7%) with gzip and 182 B (31.0%) with Brotli;
- the TSV hybrid saves only 30 B with gzip and 20 B with Brotli;
- keyed CBOR saves 4 B with gzip but costs 11 B with Brotli;
- keyed MessagePack is larger with every compressor;
- encoding the positional shape as MessagePack or CBOR is also larger after
  compression than encoding those tuples as JSON.

Repeated keys and `2024:` prefixes look expensive in raw JSON, but general
compression already represents those repetitions cheaply. The useful win comes
from the schema-aware shape, not from a generic binary token format.

### Reproduce

The benchmark is [`measure-formats.mjs`](./measure-formats.mjs). The temporary
install does not touch this project's package manifest or lockfile:

```sh
bench_modules="$(mktemp -d /tmp/dnd-share-formats.XXXXXX)"
npm_config_cache=/tmp/dnd-share-npm-cache \
  npm install --prefix "$bench_modules" --no-save --ignore-scripts \
  @msgpack/msgpack@3.1.3 cborg@5.1.8 @electric-sql/pglite@0.5.4
node --no-warnings docs/sharing/measure-formats.mjs \
  --modules="$bench_modules/node_modules"
```

Without `--modules`, the built-in JSON, positional, TSV, and SQLite rows still
run; MessagePack, CBOR, and PostgreSQL are skipped.

## Compressor comparison on the winner

| Positional JSON compressor | Bytes | Base64url chars | Marginal browser library |
|---|---:|---:|---:|
| gzip level 9 | 469 | 626 | 0 |
| deflate-raw level 9 | 451 | 602 | 0 |
| Brotli quality 11 | **405** | **540** | 0 only where natively supported |

Deflate-raw saves a fixed 18 B / 24 URL characters over gzip here because it
omits the gzip wrapper and checksum. Gzip is easier to identify and includes an
integrity check. Either is comfortably below the earlier approximately
1,447-character target: even full minified JSON plus gzip is 1,316 characters,
and trimmed JSON plus gzip is 958.

As of **2026-07-24**, `CompressionStream` and `DecompressionStream` provide
gzip, deflate, and deflate-raw without a library across current major browsers;
MDN describes the API as cross-browser baseline since May 2023. The living
standard now also names Brotli. Brotli is native in Safari 18.4+ and Firefox
147+, but remains absent from Chrome/Edge/other Chromium browsers. Therefore it
is not a zero-bundle, cross-browser choice today. The API also exposes no
quality-level option, so browser-produced sizes can differ from these requested
Node level-9/quality-11 measurements.

Sources: [Compression Streams standard](https://compression.spec.whatwg.org/),
[MDN constructor and formats](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream/CompressionStream),
[Firefox 147 release notes](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/147),
and [current Brotli compatibility](https://caniuse.com/mdn-api_compressionstream_compressionstream_brotli).

## Decoder and bundle cost

These are decode-only, tree-shaken browser bundles made with this repository's
esbuild, then compressed at gzip level 9 / Brotli quality 11. They exclude the
schema validator needed by every format.

| Incremental decoder | Minified raw | gzip transfer | Brotli transfer | Comment |
|---|---:|---:|---:|---|
| JSON + native decompressor | 0 KB | 0 KB | 0 KB | `JSON.parse` plus browser API |
| Positional tuple mapper | 0.91 KB | **0.51 KB** | 0.42 KB | Representative mapper used by benchmark |
| TSV row mapper | 0.69 KB | 0.44 KB | 0.39 KB | Escaping and column checks only |
| `@msgpack/msgpack` decode | 13.83 KB | **4.21 KB** | 3.80 KB | Real v3.1.3 bundle |
| `cborg` decode | 22.61 KB | **7.06 KB** | 6.29 KB | Real v5.1.8 bundle |
| `brotli-dec-wasm` | 217.75 KB | **101.47 KB** | 63.83 KB | v2.3.2 JS glue + 208.44 KB WASM |
| `brotli-wasm` encode + decode | 1,069.73 KB | **576.98 KB** | 396.00 KB | v3.0.1 glue + WASM; needed to create and read Brotli links in Chromium |

For perspective, adding the 4.21 KB gzip MessagePack decoder to save nothing is
strictly worse. The 0.51 KB gzip positional mapper costs more transferred app
bytes than one link saves (249 B versus trimmed gzip), although app assets can be
cached and URL length is a different budget.

SQLite is already a project dependency. Its current production WASM and worker
assets total 1,078.21 KB raw / 466.82 KB gzip, so reuse could be zero incremental
bundle bytes if they are already loaded. That does not make SQLite JSONB a valid
share format.

## Import safety

Every decoder must operate on attacker-controlled fragment data:

1. Reject a fragment over a small encoded limit before base64 decoding.
2. Reject compressed input over a second limit.
3. Count decompressed bytes while reading the stream and abort before the
   configured output limit; `DecompressionStream` does not impose the
   application's limit.
4. Parse only after the bounded byte buffer is complete.
5. Require the exact format/version, maximum nesting, maximum record counts,
   tuple lengths, scalar types, string lengths, key grammar, and known
   properties. Build a fresh validated object rather than merging parsed input.

JSON has the smallest parser surface because parsing is native, but it still
needs schema validation and safe handling of keys such as `__proto__`.
Positional JSON removes attacker-controlled property names, while making strict
tuple-length and version checks essential.

`@msgpack/msgpack` defaults its length limits to 32-bit maxima. A real importer
would have to set `maxStrLength`, `maxBinLength`, `maxArrayLength`,
`maxMapLength`, and `maxExtLength`; its decoder rejects `__proto__`.
`cborg` should use strict mode, reject indefinite values, undefined, bigint,
NaN/infinity, duplicate map keys, and preferably decode maps separately before
an allowlisted conversion. A decompressed byte cap remains mandatory for all
three.

## Other candidates

### TSV hybrid

The measured prototype keeps trimmed JSON for the document but replaces
`selections`, `spellbook`, and each loadout's `entries` with headerless,
fixed-column tab/newline strings. Backslash, tab, CR, and LF are escaped before
the final `JSON.stringify`.

It is feasible with strict column counts and limits, but it is effectively a
second positional grammar inside JSON. It saves only 20–30 compressed bytes,
requires escaping and scalar coercion, and is harder to inspect. Do not adopt it.

### JSONB

“JSONB” is not one interchange format. SQLite and PostgreSQL use incompatible
database-internal representations. SQLite explicitly says applications should
not use its JSONB outside SQLite; PostgreSQL documents `jsonb` as a decomposed
storage representation rather than a portable byte format.

The expectation that JSONB is always larger before compression is therefore
only half right:

- SQLite JSONB was **1,851 B**, 13.5% smaller than 2,140 B text, but 12.9%
  larger after gzip (811 B versus 718 B).
- PostgreSQL's internal datum was **2,756 B**, 28.8% larger than text.
- PostgreSQL `jsonb_send` was **2,320 B** and compressed to 734/716/624 B; it is
  essentially versioned normalized text and still loses to the original JSON.

These are measurements, not estimates. They confirm that neither database
format belongs in a URL fragment. Sources:
[SQLite JSONB format](https://sqlite.org/jsonb.html),
[SQLite JSON functions](https://www.sqlite.org/json1.html), and
[PostgreSQL JSON types](https://www.postgresql.org/docs/current/datatype-json.html).

## Base64url and larger alphabets

Unpadded base64url asymptotically adds 33.3%: three bytes become four
characters. A custom base using all 66 RFC 3986 unreserved ASCII characters
would save less than 1% versus base64url. Base85 reduces expansion from 33.3% to
25%, only about 6.25% fewer characters, but common alphabets include URL-reserved
or messenger-sensitive punctuation. Percent-encoding can erase the saving, and
chat/email autolinking and copy/paste become less reliable. Base64url is worth
keeping.

## Ranked recommendation

1. **Positional JSON + gzip**: shipped. In this historical specimen it reached
   626 characters, retains the gzip wrapper/checksum, uses browser-native
   primitives, and keeps the mapping protected by a version and golden tests.
2. **Trimmed minified JSON + gzip**: a reasonable debugging baseline, but 958
   URL characters for this specimen and materially larger than positional JSON.
3. **TSV hybrid**: technically feasible, but 30 gzip bytes saved does not
   justify a second escaping grammar.
4. **CBOR or MessagePack**: reject. Generic CBOR saves at most 4 B while
   MessagePack is larger after compression, their decoders add 7.06/4.21 KB
   gzip, and even their positional forms lose to positional JSON.
5. **Brotli**: use only after Chromium implements the browser stream API. On the
   winner it saves 64 B / 86 characters versus gzip, nowhere near enough to
   justify a 101 KB gzip decode-only fallback or a 577 KB full codec.
6. **SQLite/PostgreSQL JSONB**: disqualified because neither is the portable
   application interchange format its name suggests.

## Brief self-critique

MessagePack, CBOR, SQLite JSONB, PostgreSQL storage/`jsonb_send`, and every
compression number above are real measurements; none is estimated. The TSV row
is a real measurement of one explicit prototype, but another tabular grammar
could differ. Decoder bundle figures are real builds of representative
libraries/mappers, not additions to this app, and exclude shared validation
code. This is one requested specimen, so it should not be generalized to all
character sizes without a corpus. Finally, Brotli is in the web standard and is
actually native in current Firefox and Safari, but it is **not** a library-free
cross-browser option because Chromium still lacks it.
