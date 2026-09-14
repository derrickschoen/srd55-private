# M-2 implementation review r3 FINAL (astra 01a09f6e-9586-7912-936b-e93804d11462) on 2d659dbc, harvested 2026-09-14 06:34

**REJECT IMPL M2.** The exact round-2 reproductions are repaired, but two P1 findings remain. Both produced silent HITs through the production cache functions with a virtual filesystem and an injected build callback. No actual build was run.

**IB3-F1 — P1; blocks: yes — Environment-dependent values still escape the recognizers.**

[dist-build-inputs.mjs:442](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:442), [456](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:456).

These remain CACHEABLE:

```ts
const checkoutCacheDir = './cache';
const core = {
  cacheDir: process.env.STATIC_APP_CACHE_DIR ?? checkoutCacheDir
};
export default { ...core, base: core['cacheDir'] };
```

The destructuring variant also passes:

```ts
const { cacheDir } = core;
export default { ...core, base: cacheDir };
```

So does:

```ts
const p = (process);
export default { base: p.env.BUILD_BASE };
```

For **each**, changing the relevant environment from `/a/` to `/b/` produced an unchanged key, one build, then **HIT returning `/a/`**. The build callback evaluated the supplied config against the supplied environment.

**Minimal change:** enforce permitted uses of the environment-bearing bindings, including aliases, destructuring and element access. Reject unrecognized uses instead of checking only `core.cacheDir` and the exact initializer text `process`. Add these three changed-environment/zero-access controls.

**IB3-F2 — P1; blocks: yes — Config restrictions still depend on syntactic proximity to `export default`.**

[dist-build-inputs.mjs:379](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:379), [401](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:401).

```ts
const key = 'root';
const shared = { [key]: './extras/app' };
export default { ...shared };
```

Discovery accepts this, omits `extras/app/index.html`, and retains the key after that file changes. The orchestration reproduction built once, then **HIT returned the old HTML**. The callback evaluated the config and read its selected root.

The computed-property check requires an enclosing export assignment; the spread exception accepts the identifier spelling `shared` without establishing its declaration’s supported shape.

**Minimal change:** validate the declarations behind permitted config spreads and reject unsupported computed configuration in variable initializers. A blanket rejection throughout the config closure would wrongly reject today’s computed data-property constructors.

For final-round arbitration, a bounded alternative covering both findings is to permit the reviewed current config programs through checked-in AST fingerprints and BYPASS different programs. The current implementation’s selective rejection rules do **not** establish the promised exact supported grammar.

| IB2 finding | Disposition | Evidence |
|---|---|---|
| IB2-F1 | **PARTIAL** | Original examples now bypass; bracket/destructuring/parenthesized variants remain. Inputs:334, 429, 442, 456. |
| IB2-F2 | **PARTIAL** | Separate config scanning repairs reachability; original imported computed property and dynamic composition bypass. Hidden local composition remains. Inputs:379, 401, 419, 778. |
| IB2-F3 | **RESOLVED** | Script decoys bypass; audio/object resources affect the key. Inputs:557, 591, 714. |
| IB2-F4 | **RESOLVED** | Both escaped-resource and escaped-import probes bypass. Inputs:518. |
| IB2-F5 | **RESOLVED** | Explicit prohibited targets bypass; narrow traversal stays bounded; recursive prohibited boundaries bypass. Inputs:188, 222, 239. |
| IB2-F6 | **RESOLVED** | `tsconfigextra.json` is included and its edit changes the key. Inputs:770. |

Here, **Inputs** denotes `tools/dist-build-inputs.mjs`.

“Tracked” below means the relevant file was included and its edit changed the digest. “Stale” means an artifact-affecting change retained an accepted key.

| Probe form | Result |
|---|---|
| Original nested `core.nested.cacheDir` | **BYPASS** |
| Original exact `core.cacheDir` reused as base | **BYPASS** |
| `node:process` environment alias | **BYPASS** |
| Called `configureServer` | **BYPASS** |
| Config `import.meta.env` | **BYPASS** |
| `vite.config → extras/config → src/config` environment read | **BYPASS** |
| Computed property directly exported by imported config | **BYPASS** |
| `{...await import('external-plugin')}` | **BYPASS** |
| Script `data-src` decoy | **BYPASS** |
| Script `href` decoy | **BYPASS** |
| `<audio src>` | **Tracked** |
| `<object data>` | **Tracked** |
| CSS escaped URL with literal-path decoy | **BYPASS** |
| CSS `@\69mport` | **BYPASS** |
| `../dist/*.txt` | **BYPASS** |
| `../outputs/*.txt` | **BYPASS** |
| Narrow `extras/*.txt` beside `node_modules`, `dist`, `.tmp*`, `.claude` | **Tracked**; no descent into those directories |
| Recursive `extras/**/*.txt` crossing those boundaries | **BYPASS** |
| `tsconfigextra.json` | **Tracked** |
| HTML-linked CSS containing a commented-out import and a live import | **Tracked** live dependency; commented import excluded |
| HTML-linked CSS using `@import/*comment*/"…"` | **Tracked** |
| Import with `?url` | **Tracked** |
| Glob with `import: 'default'` | **Tracked** |
| Glob with `as: 'raw'` | **BYPASS** |
| `import { type X, y }` | **Tracked** |
| `export * from` chain | **Tracked** |
| JSON import | **Tracked** |
| `.mjs` module and static re-export chain | **Tracked** |
| `.cjs` module using static import/export syntax | **Tracked** |
| HTML `<img srcset>` with multiple candidates | **BYPASS** |
| `<use href="…#id">` inside inline SVG | **Tracked** |
| Symlinked file inside `src`, targeting a repository file | **Tracked** |
| Distinct `A.ts`/`a.ts`, importing and editing `A.ts` | **Tracked** |
| Import whose filename case does not match the existing file | **BYPASS** |
| `process.env` inside plugin `config()` hook | **BYPASS** |
| **New:** `core['cacheDir']` reuse | **Stale; HIT reproduced** |
| **New:** destructured cacheDir reuse | **Stale; HIT reproduced** |
| **New:** `const p = (process)` | **Stale; HIT reproduced** |
| **New:** computed root in local `shared` initializer | **Stale; HIT reproduced** |

The original nested-cacheDir control reproduced the round-2 failure against `5dfe6c1e`: one build, then HIT returning `/a/`. Against `2d659dbc`, it performed **two builds, zero cache accesses, and returned `/b/`**.

**(B) Real repository:** production discovery is **CACHEABLE**, with an empty reason list and **939 files**, both with the actual environment and with `{}`. No present input causes a false bypass.

Comparing against the baseline inventory reproduced **840 → 939**: all **97 omissions** are present—**67 drizzle files and 30 docs files**—plus the two cache implementation modules.

I also reproduced the **1,494/2,806 import counts, 38/72 export counts, nine literal dynamic imports, four URL edges, two eager globs, eleven CSS files without resource tokens, and two config environment reads**. The lane’s **734/24/134** figures were not reproduced as production scanner counts: instrumentation found **716 unique scanned executable files, seven outside `src`, and 111 unique resource targets**. Those census labels need clarification; closure membership and current cacheability are independently confirmed.

**(C) Eight-mutant spot-check:** each mutation was applied only in memory. Every baseline callback passed; every mutant was killed by its own narrow committed control.

| Mutant | Killing control in cache spec |
|---|---|
| `ALLOW_NODE_PROCESS_IMPORT` | Named alias row, :664 |
| `ALLOW_IMPORT_META_ENV` | Import-meta row, :664 |
| `SHARE_CONFIG_SCAN_LEDGER` | Previously scanned config target, :677 |
| `ALLOW_COMPUTED_CONFIG` | Imported computed property, :685 |
| `OMIT_AUDIO_RESOURCE` | Audio membership, :763 |
| `ALLOW_CSS_ESCAPE` | Escaped decoy fixture, :774 |
| `PRUNE_ONLY_AT_ROOT` | Recursive boundary fixture, :813—all eight classes killed |
| `NARROW_TSCONFIG_CLASS` | Non-dot suffix membership, :823 |

These reproduce narrow mutation behavior, not the historical ledger hashes. Including repeated-build controls, I replayed **42 selected committed callbacks, 89 assertions, zero baseline failures**.

**(D) Expectation/scope audit:** removed assertion lines versus `5dfe6c1e`: **none**. No weakened expectation found. The broad-glob fixture now separately asserts BYPASS; its existing membership/exclusion assertions remain. Fixtures are runtime-only, use unique temporary roots, and retain `afterEach` cleanup at [dist-build-cache.test.ts:129](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:129). No new order or worker-state dependence found.

Formatting is acceptable: maxima **120/116/130**, with 130 confined to a test title. Syntax checks and both diff checks passed. Production hashes match the supplied pristine hashes; package-lock is unchanged. The cumulative diff remains within six authorized files. Full-suite/build results remain supervisor evidence.

**(E) Three-build proof print sites are unchanged this round:**

- [Cache :226](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:226): `dist cache miss:`
- [Cache :127](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:127): `dist cache hit:`
- [Guard :436](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/assert-dist-clean.mjs:436): `dist clean: N files scanned`

**REJECT IMPL M2**

M2 IMPL REVIEW R3 DONE