# M-2 fix round 1 + proof completion lane report (sol), harvested 2026-09-14 03:34

Implemented SF-1, SF-2, strengthened four surviving mutant tests, and completed the production mutation runs. Both production files were restored byte-for-byte before final verification.

### SF-1 — restored tests

Restored verbatim from `git show HEAD:tests/unit/tools/dist-build-cache.test.ts`:

- `overrides an inherited NODE_ENV with production`
  - Asserts inherited `NODE_ENV=test` becomes `production`.
- `sets NODE_ENV to production when the parent leaves it unset`
  - Restores the missing unset-parent assertion.
- `preserves every other parent variable`
  - Restores `childEnv !== parentEnv`.
  - Confirms the parent remains unchanged.
  - Confirms `PATH` and `CUSTOM_BUILD_SETTING` survive.

Focused total changed from 60 to 62 because one consolidated test became the three required committed tests.

SF-1 snapshot:

```text
tests/unit/tools/dist-build-cache.test.ts | 135 ++++++++++++++++++++++++++----
1 file changed, 117 insertions(+), 18 deletions(-)
```

This is the cumulative diff against HEAD at the SF-1 checkpoint; the SF-1 patch itself replaced one test with three, adding two discovered cases.

### SF-2 — formatting

Command:

```sh
deno fmt --line-width 120 --single-quote \
  tools/dist-build-inputs.mjs \
  tools/dist-build-cache.mjs \
  tests/unit/tools/dist-build-cache.test.ts \
  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
  tests/unit/ai-bridge/build-boundary.test.ts
```

Exit 0, five files checked.

| File | Before max/>120 | After max/>120 |
|---|---:|---:|
| `tools/dist-build-inputs.mjs` | 602 / 49 | 120 / 0 |
| `tools/dist-build-cache.mjs` | 282 / 29 | 116 / 0 |
| `dist-build-cache.test.ts` | 710 / 48 | 130 / 1 |
| `scraper-is-never-in-the-bundle.test.ts` | 93 / 0 | 93 / 0 |
| `build-boundary.test.ts` | 113 / 0 | 113 / 0 |

The remaining 130-character line is solely a test-title string literal, covered by the stated exception.

Focused behavior around formatting:

```text
Before SF-1/format: 3 files passed, 60/60 tests
After SF-1, before format: 3 files passed, 62/62 tests
After format: 3 files passed, 62/62 tests
Final after mutant-strengthening: 3 files passed, 66/66 tests
```

Post-format cumulative diff snapshot for the five files:

```text
tests/unit/ai-bridge/build-boundary.test.ts        |  31 +-
tests/unit/tools/dist-build-cache.test.ts          | 407 ++++++++++++++++++++-
tests/unit/tools/scraper-is-never-in-the-bundle.test.ts | 6 +
tools/dist-build-cache.mjs                         | 333 +++++++----------
4 tracked files changed, 567 insertions(+), 210 deletions(-)
```

The new untracked enumerator is not included by `git diff --stat`.

### Pristine production hashes

```text
E = 1670b2524042e5afe5b948108d2ab8e1643bb57d3730f0f079ef9ed8e930b805
    tools/dist-build-inputs.mjs

C = 9ad225f9d49550458b517f1224af8833c90d1fbdbe4786cad2dca2cc1b95df2e
    tools/dist-build-cache.mjs
```

Every enumerator mutation restored to `E`; every cache mutation restored to `C`.

### Mutation hash ledger

Applied-hash abbreviations:

```text
M01 f02814c0956e959bf8cc202fbd44c39a7aee64ade4612d63bfa6b56a4dda61a5
M02 14c2d0993132b2aa7134a2c76bda0a64ef5e7c38575eebe5cb8eced729cdb9ef
M03 2956aa8c2b8ad4beeaceddec41b13fb45ff8251202ac7855c41f9818be075d36
M04 9720a623ca5c791a55e5d912d5252831df4727d2674e706024bcced5cd20cee3
M05 1dcec1b859b1e9bbdb4652d3f1a8ea8715ca6b1b4f44ef6316999650ac7305aa
M06 01f79f213b2880c57f7e90ae163bdc7eb675c4c5b2ac9c7b8b77ca70266c215d
M07 8e44395fe100cb586c3c00cfb562634ee31d216395dcabf9c753801c7ca322d9
M08 b2c8a1c80d8b22df7a51abc10116c335d76d0425af651e22482c10297f1e2da9
M09 b774026319094d10b7c9593bab7a8ae3c3a2e4789c9d18192fa34eb294c9fdca
M10 8b9618e40df19dcd7277b85b758ed9d13cf2153067f519c1ae32e6a34d43f63e
M11 e70cf042300503080476041cfc56d016d1fac99f3190b448ae9e8a93727225c7
M12 6ecd52585e94cdd39ba44a70295fdb87302bbe6cc29d0a57dcbd579ae8b242b1
M13 06b5538a389e71f6a4cba8e06b5f4f23b3491305bb12b4f8325e15dadfd208f6
M14 2d4b0f8442bef74baa2cb43515757bceded965dae929454e18df424630e5dcba
M15 171d2f61713a35efca73278cb0db5776a249515895bc7d605d256796126d78e8
M16 45caace2a381a53ceb4e81c8d03069f81585e703e9f7e808ea0f4eb55292ae44
M17 7342398d7813d3d73ce4d9a7f6c73eeff670828a960ac23a8b49ede4e48a2c47
M18 1c8c51789a4565a68042f5a16ae28b2aafef694d08e8657cc79a068e678816e3
M19 25fdef8514288515b19355a5a983c525cf915022d82300ffe91cc57104633783
M20 a63c3a75ad9dbe2ac92b466de4af66d70335fc93df9ef50a08c995365c0a295c
M21 27f5f491b6368e6ee6873e57491ab498921a70e15b6699701fab0432e3da2c90
M22 a6a79773a9ea86c89f5d5af44e4d5ac7b0b914dcb2cff315b3d40046facdc3cd
M23 90ee55ea984fd74390090b728ce3bed3564a20a4202137e8770882d7088cc8b0
M24 945b2b4f466ee38d4c0006892116960c5b3b7bc438415a0a96d6c89acc60e3b1
M25 36060c4ee7f48ac5478729a0f912e68bc7bef09ea4689c6125642f45ed2c4d57
M26 f2fae4166f426dad81db3744a49eff76fc923919e939d43cd05e67c079e08405
M27 9c3f7c3a779389a7cfa4dd9f6852ca4f92480a4eb9f2057b18506cf205fe80a1
M28 2defd15d7f23a3ab98530d19b6c6af16ae12347819d15e9acf7cdd3bbd724a1e
M29 82ee9d791145dce7ed3cf884ba810008bb8096597c65bdf86b7f9acbb505e5a3
M30 bb96a3f91c2af5a60c8dba13bde9a5f6e66974611bfe219bfd523e22c6b8c6d7
```

Each listed killing command used:

```sh
npx vitest run --configLoader runner <spec> -t '<title>'
```

and exited 1.

| Mutant | Applied | Killing test | Restored |
|---|---|---|---|
| `ALWAYS_REBUILD` | M01 | `ALWAYS_REBUILD / NEVER_RESTORE …` | C |
| `NEVER_RESTORE` | M01 | Same | C |
| `VITE_ONLY_MISS` | M28 | `VITE_ONLY_MISS keeps the validated leaf…` | C |
| `OMIT_EXTERNAL_RAW` | M02 | `STOP_RECURSION_OUTSIDE_SRC …` | E |
| `HASH_PATH_NOT_BYTES` | M03 | Same | C |
| `HASH_ONLY_DRIZZLE` | M02 | `HASH_ONLY_DRIZZLE hashes docs and drizzle…` | E |
| `STOP_RECURSION_OUTSIDE_SRC` | M02 | External recursion test | E |
| `IGNORE_EXTERNAL_DYNAMIC_IMPORT` | M02 | External recursion test | E |
| `RAW_ONLY` | M05 | Static asset/new URL test | E |
| `IGNORE_STATIC_ASSET` | M05 | Static asset/new URL test | E |
| `IGNORE_NEW_URL` | M05 | Static asset/new URL test | E |
| `IGNORE_ROOT_RELATIVE` | M06 | Root-relative test | E |
| `GUESS_ALIAS` | M08 | `IGNORE_UNSUPPORTED_PATTERN / GUESS_ALIAS: alias` | E |
| `UNSUPPORTED_EDGE_HIT` | M08 | Repeated bypass/zero-access test | E |
| `IGNORE_GLOB_NEGATION` | M07 | Glob test | E |
| `IGNORE_GLOB_OPTIONS` | M07 | Glob test | E |
| `STALE_GLOB` | M07 | Glob test | E |
| `HASH_BYTES_WITHOUT_PATHS` | M04 | Equal-byte rename test | C |
| `IGNORE_UNSUPPORTED_PATTERN` | M08 | Nonliteral/brace glob tests | E |
| `CACHE_AFTER_BYPASS` | M08 | Repeated bypass tests | E |
| `IGNORE_CSS_IMPORT` | M09 | External CSS dependency test | E |
| `IGNORE_CSS_URL` | M09 | External CSS dependency test | E |
| `CACHE_UNPARSED_CSS` | M08 | CSS bypass tests | E |
| `IGNORE_HTML_ASSET` | M10 | External HTML asset test | E |
| `CACHE_UNPARSED_HTML` | M08 | HTML bypass tests | E |
| `MISS_INLINE_MODULE` | M08 | Inline-module bypass test | E |
| `MISS_INLINE_STYLE` | M08 | Inline-style bypass test | E |
| `MISS_STYLE_ATTRIBUTE` | M08 | Style-attribute bypass test | E |
| `PARSE_ONLY_URL_FUNCTION` | M08 | `image-set` bypass test | E |
| `TREAT_PREPROCESSOR_AS_CSS` | M08 | SCSS bypass test | E |
| `MISS_AUTO_POSTCSS` | M08 | Three PostCSS sentinel tests | E |
| `STALE_VITE_DETECTOR` | M08/M30 | Version and redirected-config tests | E |
| `IGNORE_PLUGIN_CLOSURE` | M11 | Plugin closure test | E |
| `IGNORE_PLUGIN_READS` | M12 | Explicit plugin-read input test | E |
| `OMIT_VITE_ENV_FILES` | M13 | Vite environment test | C |
| `OMIT_AMBIENT_VITE` | M13 | Vite environment test | C |
| `UNSORTED_ENV` | M14 | Vite environment test | E |
| `EXPAND_UNKEYED_ENV` | M08 | Environment interpolation bypass tests | E |
| `IGNORE_CONFIG_ENV_READ` | M08 | Config environment bypass test | E |
| `BROAD_ENV_ALLOWLIST` | M08 | Environment allowlist test | E |
| `HASH_ABSOLUTE_ROOT` | M15 | Cross-root determinism test | C |
| `UNSORTED_TRAVERSAL` | M17 | Sorted inventory invariant | E |
| `HASH_CREATION_METADATA` | M16 | Cross-root determinism test | C |
| `RETAIN_STALE_DISCOVERY` | M18 | Orphaned external-input test | E |
| `HASH_WHOLE_EXTERNAL_DIRECTORY` | M18 | Orphaned external-input test | E |
| `DIRTY_TREE_BIT_IN_KEY` | M19 | Zero status-read test | C |
| `HASH_WHOLE_REPOSITORY` | M19 | Zero status-read/stable-hit test | C |
| `OMIT_HEAD` | M20 | HEAD-key test | C |
| `RESTAMP_ON_RESTORE` | M21 | HEAD-key test | C |
| `TRUST_DIRECTORY_DIGEST_ONLY` | M22 | Valid digest/wrong embedded commit test | C |
| `STORE_WRONG_PROVENANCE` | M23 | Wrong provenance test | C |
| `TRUST_POINTER` | M24 | Malformed pointer test | C |
| `ALLOW_ESCAPE` | M25 | Valid escaped-artifact test | C |
| `HEAD_FALLBACK_EMPTY` | M26 | Exact malformed-HEAD test | C |
| `IGNORE_BUILD_EXIT` | M27 | Rejected-build publication test | C |
| `DIRECT_CONSUMER_VITE_ONLY` | M27/M28 | Validation rejection and validated-leaf tests | C |
| `IGNORE_VALIDATION_EXIT` | M27 | Validation rejection test | C |
| `STORE_BEFORE_GUARD` | M27 | Rejected-build publication test | C |
| `RETURN_REJECTED_DIST` | M27 | Rejected-build return test | C |

PB3-F1 amendment proof:

| Mutant | Applied | Killing tests | Restored |
|---|---|---|---|
| Ignore ancestor workspace root | M29 | Ancestor marker and zero-cache-access tests | E |
| Ignore Vite `root`/`css.postcss` redirection | M30 | Redirected-config and repeated-bypass tests | E |

### Surviving mutants strengthened

Four initial runs exited 0 and were fixed before production restoration:

- `RAW_ONLY / IGNORE_STATIC_ASSET / IGNORE_NEW_URL`
  - Cause: assets under `src` were already declared.
  - Fix: moved test assets to `extras/`.
  - Same M05 production SHA then exited 1.
- `TRUST_DIRECTORY_DIGEST_ONLY`
  - Cause: no valid-digest/wrong-commit cache entry existed.
  - Fix: independently forged the directory digest and changed the embedded commit.
  - Same M22 production SHA then exited 1.
- `HEAD_FALLBACK_EMPTY`
  - Cause: broad `toThrow('HEAD')` matched a later provenance error.
  - Fix: exact malformed-HEAD message plus zero build-callback assertion.
  - Same M26 production SHA then exited 1.
- `UNSORTED_TRAVERSAL`
  - Cause: both fixture filesystems returned equivalent traversal order.
  - Fix: directly assert the returned inventory is lexically sorted.
  - Same M17 production SHA then exited 1.

Additional independent controls added for orphaned external inputs, escaped generations, and the validated MISS/BYPASS leaf.

### Final green

```text
npx tsc -b --force
exit 0

sg scan
exit 0

npx vitest run --configLoader runner \
  tests/unit/tools/dist-build-cache.test.ts \
  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
  tests/unit/ai-bridge/build-boundary.test.ts
exit 0
Test Files  3 passed (3)
Tests       66 passed (66)
Duration    2.13s

node --check tools/dist-build-inputs.mjs
exit 0

node --check tools/dist-build-cache.mjs
exit 0

git diff --check
exit 0
```

Recount, exit 0:

```json
{
  "old": 840,
  "current": 939,
  "added": 99,
  "priorOmissions": 97,
  "docs": 30,
  "drizzle": 67,
  "cacheImplementation": 2,
  "unresolved": 0
}
```

Discovery:

```sh
npx vitest list --configLoader runner --filesOnly --json > /tmp/m2-after2.json
```

Exit 0:

```json
{"rows":640,"fixture_paths":0,"cache_specs":1}
```

Final hashes:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
1670b2524042e5afe5b948108d2ab8e1643bb57d3730f0f079ef9ed8e930b805  tools/dist-build-inputs.mjs
9ad225f9d49550458b517f1224af8833c90d1fbdbe4786cad2dca2cc1b95df2e  tools/dist-build-cache.mjs
```

Final status contains exactly the six allowed files:

```text
 M package.json
 M tests/unit/ai-bridge/build-boundary.test.ts
 M tests/unit/tools/dist-build-cache.test.ts
 M tests/unit/tools/scraper-is-never-in-the-bundle.test.ts
 M tools/dist-build-cache.mjs
?? tools/dist-build-inputs.mjs
```

No full gate, full suite, Playwright run, `npm run build`, or three-build proof was run.

M2 FIX R1 DONE