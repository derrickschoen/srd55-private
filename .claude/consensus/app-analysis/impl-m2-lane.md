# M-2 implementation lane report (sol 01a09e4f-2055-7711-8cc5-acb79f449911), harvested 2026-09-14 03:04

Implementation is present and focused checks are green, but I cannot truthfully mark the unit complete: the accepted plan required physically applying and restoring every named mutant. Only three grouped mutations received that proof.

Changed files:

- [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs)
- [dist-build-cache.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs)
- [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts)
- [scraper-is-never-in-the-bundle.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts)
- [build-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/ai-bridge/build-boundary.test.ts)
- [package.json](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/package.json)

### RED/GREEN

| Phase | Command | Exit | Result |
|---|---|---:|---|
| RED | `npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts tests/unit/tools/scraper-is-never-in-the-bundle.test.ts tests/unit/ai-bridge/build-boundary.test.ts` | 1 | 3 files failed; 2 tests failed, 18 passed |
| Initial typecheck | `npx tsc -b --force` | 2 | 2 TS7016 errors for the new MJS modules |
| GREEN | Same focused Vitest command | 0 | 3 files passed; 60 tests passed |
| GREEN | `npx tsc -b --force` | 0 | No output |
| GREEN | `sg scan` | 0 | No output |
| GREEN | `node --check tools/dist-build-inputs.mjs` | 0 | No output |
| GREEN | `node --check tools/dist-build-cache.mjs` | 0 | No output |
| GREEN | `git diff --check` | 0 | No output |

No full build, full gate, full Vitest suite, Playwright suite, or three-build proof was run.

### Recount

Implementation recount exited 0:

```json
{
  "old": 840,
  "current": 939,
  "added": 99,
  "removed": 0,
  "priorOmissions": 97,
  "docs": 30,
  "drizzle": 67,
  "cacheImplementation": 2,
  "unresolved": 0
}
```

### Discovery proof

Command:

```sh
npx vitest list --configLoader runner --filesOnly --json > /tmp/m2-after.json
```

Exit 0. Read-only count:

```json
{"rows":640,"fixture_paths":0,"cache_specs":1}
```

### Scripts

Before:

```text
build = tsc -b && vite build --configLoader runner && node tools/assert-dist-clean.mjs
```

After:

```text
build = tsc -b && node tools/dist-build-cache.mjs && node tools/assert-dist-clean.mjs
build:dist = vite build --configLoader runner
build:dist:validated = tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs
```

Both retained guard assertions evaluate true:

```json
{"guardSubstring":true,"exactGuardSubstring":true}
```

### Physically applied mutation proof

| Mutation | Applied SHA | Killing test/result | Restored SHA |
|---|---|---|---|
| Ancestor workspace detector disabled | `dd621179b0703f87993e96ade888dd120c230e0fe1f16337ffaec23db073e8a4` | PB3-F1 ancestor and zero-cache-access tests; 2 failed | `4811bfbff5ed5ef3b0105b45816be89c7a862bcfbd919e70ae4ad862918c1834` |
| Vite root/css.postcss detectors disabled | `de919eaa16837a813f1dba86441fbfbf7c7ae0afcb91ef781d3d126dd5292fb7` | Redirected-root, css.postcss, and stale-detector tests; 3 failed | `4811bfbff5ed5ef3b0105b45816be89c7a862bcfbd919e70ae4ad862918c1834` |
| Validation failure swallowed before publication | `336d8eb5fd0a7bce38fc6a1be918ef5a29d57d2854b26969670544c867feccc3` | `STORE_BEFORE_GUARD / RETURN_REJECTED_DIST / IGNORE_VALIDATION_EXIT / IGNORE_BUILD_EXIT / DIRECT_CONSUMER_VITE_ONLY`; 1 failed | `3411add81736b0aa7eaf7ab0b0d435071eece45e795a2b59aad7793d075f3942` |

These remaining plan-named mutants have assertions but were not individually applied/restored, so their required applied/restored SHA fields are unavailable:

```text
ALWAYS_REBUILD, NEVER_RESTORE, VITE_ONLY_MISS,
OMIT_EXTERNAL_RAW, HASH_PATH_NOT_BYTES, HASH_ONLY_DRIZZLE,
STOP_RECURSION_OUTSIDE_SRC, IGNORE_EXTERNAL_DYNAMIC_IMPORT,
RAW_ONLY, IGNORE_STATIC_ASSET, IGNORE_NEW_URL, IGNORE_ROOT_RELATIVE,
GUESS_ALIAS, UNSUPPORTED_EDGE_HIT, IGNORE_GLOB_NEGATION,
IGNORE_GLOB_OPTIONS, STALE_GLOB, HASH_BYTES_WITHOUT_PATHS,
IGNORE_UNSUPPORTED_PATTERN, CACHE_AFTER_BYPASS, IGNORE_CSS_IMPORT,
IGNORE_CSS_URL, CACHE_UNPARSED_CSS, IGNORE_HTML_ASSET,
CACHE_UNPARSED_HTML, MISS_INLINE_MODULE, MISS_INLINE_STYLE,
MISS_STYLE_ATTRIBUTE, PARSE_ONLY_URL_FUNCTION,
TREAT_PREPROCESSOR_AS_CSS, MISS_AUTO_POSTCSS, IGNORE_PLUGIN_CLOSURE,
IGNORE_PLUGIN_READS, OMIT_VITE_ENV_FILES, OMIT_AMBIENT_VITE,
UNSORTED_ENV, EXPAND_UNKEYED_ENV, IGNORE_CONFIG_ENV_READ,
BROAD_ENV_ALLOWLIST, HASH_ABSOLUTE_ROOT, UNSORTED_TRAVERSAL,
HASH_CREATION_METADATA, RETAIN_STALE_DISCOVERY,
HASH_WHOLE_EXTERNAL_DIRECTORY, DIRTY_TREE_BIT_IN_KEY,
HASH_WHOLE_REPOSITORY, OMIT_HEAD, RESTAMP_ON_RESTORE,
TRUST_DIRECTORY_DIGEST_ONLY, STORE_WRONG_PROVENANCE, TRUST_POINTER,
ALLOW_ESCAPE, HEAD_FALLBACK_EMPTY
```

### Final state

`git status --short --untracked-files=all`:

```text
 M package.json
 M tests/unit/ai-bridge/build-boundary.test.ts
 M tests/unit/tools/dist-build-cache.test.ts
 M tests/unit/tools/scraper-is-never-in-the-bundle.test.ts
 M tools/dist-build-cache.mjs
?? tools/dist-build-inputs.mjs
```

Hashes:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
4811bfbff5ed5ef3b0105b45816be89c7a862bcfbd919e70ae4ad862918c1834  tools/dist-build-inputs.mjs
3411add81736b0aa7eaf7ab0b0d435071eece45e795a2b59aad7793d075f3942  tools/dist-build-cache.mjs
```

`package-lock.json` matches its before SHA and the frozen contract is unchanged.

BLOCKED: the required per-mutant apply/red/restore proof was not completed for every named mutant.