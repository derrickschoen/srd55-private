# M-2 implementation review r1 (astra 01a09ee5-6200-7f60-a1eb-7edea3abbbb8) on 5fbf00a6, harvested 2026-09-14 04:04

**REJECT IMPL M2.** Validation/publication ordering is sound, but discovery still permits stale cache hits.

Review was read-only: no edits, git writes, other agents, full suite, or builds. I read both modules end to end, compared the baseline, and ran in-memory Node probes using the production functions with a virtual filesystem. Syntax checks and diff-check passed; production, lockfile, and frozen-contract hashes match the supplied values. The reported 66/66 and discovery census remain supervisor evidence.

**IB1-F1 — P1 blocks; blocks: yes — Glob expansion is incomplete.**  
[dist-build-inputs.mjs:119](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:119), [134](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:134), [383](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:383).

`**/` becomes `.*/`, requiring at least one directory. For:

```js
import.meta.glob('../extras/**/*.txt', { eager: true, query: '?raw' })
```

the enumerator omits `extras/a.txt`. My probe returned `cacheable:true` and an **unchanged digest after editing that file**. Vite’s installed matcher includes it.

Additional contract discrepancies:

- Negations execute in array order rather than after the positive union.
- Relative/root-relative syntax and repository escape are not enforced.
- Every glob recursively walks the entire repository, including outputs and `node_modules`; broad patterns can select prohibited input classes.
- That walk follows symlinks without the containment checks used by ordinary imports.

**Minimal change:** implement the stated glob grammar accurately, including zero-directory globstars and final negation filtering; constrain traversal and reject escapes/special entries. Add independent membership/edit and unsupported-pattern bypass fixtures.

**IB1-F2 — P1 blocks; blocks: yes — HTML detection misses supported resources and unsupported forms.**  
[dist-build-inputs.mjs:232](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:232).

These probes all returned `cacheable:true`, omitted the indicated dependency, and retained the same key after its edit:

| HTML | Omitted input |
|---|---|
| `<img src=./extras/a.png>` | `extras/a.png` |
| `<video src="./extras/a.mp4" poster="./extras/a.png">` | The second attribute’s image |
| `<script type="module">if (1 < 2) import("./extras/mod.js");</script>` | Inline module dependency |

The attribute regex consumes the whole element after its first resource attribute. The inline-script regex cannot match a body containing `<`. Unquoted attributes receive neither traversal nor rejection.

**Minimal change:** scan complete tags and all relevant attributes; detect script bodies independently of their JavaScript contents. Route unquoted/malformed/ambiguous forms to BYPASS and test repeated calls with zero cache access.

**IB1-F3 — P1 blocks; blocks: yes — CSS scanning is not the specified lexer.**  
[dist-build-inputs.mjs:201](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:201), [385](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:385).

For valid CSS:

```css
@import/**/ "../extras/nested.css";
```

installed PostCSS recognizes the import, but discovery ignores it. Editing `nested.css` retained a cacheable, unchanged key in my probe.

Glob-discovered `.scss` also bypasses the unsupported-stylesheet check: `import.meta.glob('../extras/a.scss')` hashes that file while ignoring its imported partials. An unterminated quoted CSS URL also returned `cacheable:true`.

**Minimal change:** implement comment/string-aware token handling with explicit rejection of unsupported/malformed tokens. Apply stylesheet classification to every discovered edge, including glob matches.

**IB1-F4 — P1 blocks; blocks: yes — Environment/configuration rejection is incomplete.**  
[dist-build-inputs.mjs:149](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:149), [317](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:317).

My probes accepted all these forms:

- `process['env']['BUILD_BASE']`
- `Object.values(process.env)`
- A Vite config re-exporting `extras/config.ts`, which reads `process.env.BUILD_BASE`
- `cfg.root = './app'`
- An imported/spread configuration containing `css.postcss`
- `const leaked = { cacheDir: process.env.STATIC_APP_CACHE_DIR }; export default { base: leaked.cacheDir };`

The environment scan only runs for root-config and `tools/` paths; configuration-property rejection only runs for root-config paths. The allowlist accepts any enclosing `cacheDir` property, rather than the specified `core.cacheDir` context. External package plugin factories also encounter no dedicated rejection.

An imported PostCSS redirection produced **an unchanged key after editing its untracked configuration file**. These violate §3.5 and PB3-F1.

**Minimal change:** track config/plugin reachability independently of directory names, recognize process/environment access structurally, enforce the exact two allowlist contexts, and bypass configuration composition or mutation that cannot be proven within the supported grammar.

**IB1-F5 — P1 blocks; blocks: yes — Workspace-root computation does not match Vite.**  
[dist-build-inputs.mjs:84](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:84).

Comparison against the actual Vite 7.3.6 workspace-search functions yielded:

| Virtual filesystem | Vite root | Implementation |
|---|---|---|
| Workspace marker at `/` | `/` | No bypass |
| Repository has its own marker; ancestor also has one | Repository | Bypass |

The implementation skips both the repository itself and the filesystem root. It also treats malformed ancestor manifests differently and omits Vite’s package-root fallback.

**Minimal change:** reproduce Vite’s nearest-marker/package-root algorithm and compare its result with the repository root on every lookup. Add both boundary fixtures, retaining the repeated-build/zero-access assertions.

**IB1-F6 — P2 should fix; blocks: no — Cache/discovery failures now fail otherwise available builds.**  
[dist-build-cache.mjs:190](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:190), [202](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:202), [207](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:207).

Discovery exceptions and cache-directory creation errors escape before the validated build. Store errors escape after successful validation. The committed baseline distinguished these from build failures and retained the real artifact after store failure. This is an unplanned availability regression.

Restore cache-specific fallback handling while keeping malformed HEAD, validation failures, and wrong provenance fatal.

**IB1-F7 — P2 should fix; blocks: no — The mutant ledger does not establish every named independent kill.**  
[dist-build-cache.test.ts:257](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:257), [334](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:334), [434](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:434).

I independently removed only ambient `VITE_*` collection in memory. **Every assertion in the environment test still passed:** the supposed ambient-change assertion compares against the digest from before the `.env.production` edit.

Other absent controls include unsupported glob options, exact allowlist contexts, independent spawn/nonzero failures, all four env-file add/edit/remove cases, and independent tsc/Vite/guard/digest failures on both MISS and BYPASS. The dirty-state reader returns a constant rather than observing fixture bytes as specified.

Shared mutation hashes across several labels do not establish that each narrowly scoped defect is killed.

**IB1-F8 — P3 note; blocks: no — Small literal-contract and readability deviations remain.**  
[dist-build-inputs.mjs:302](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:302), [385](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:385), [dist-build-cache.mjs:83](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:83).

The config regex excludes names such as `tsconfig.build.web.json`, despite the declared `tsconfig*.json` class. Environment framing uses `environment`, without the specified `vite.environment`/explicit empty-map marker. Type-only exports are traversed despite the stated exclusion.

Formatting is substantially improved and generally comparable with neighbouring tools. The remaining `else {for (...)` / `}}` block should be expanded; unused path imports should be removed.

**Conformance table**

| File / contract | Status | Assessment |
|---|---|---|
| `dist-build-inputs.mjs:36` — declared classes/current omissions | **PARTIAL** | Existing classes, implementation files and explicit licence reads included; supervisor recount supports 939 inputs. Broader closure defects remain. |
| `dist-build-inputs.mjs:101,305` — recursive executable closure/resolution | **PARTIAL** | Ordinary static/dynamic imports recurse outside `src`; unsupported/configuration boundaries are incomplete. |
| `dist-build-inputs.mjs:119,362` — glob contract | **NOT RESOLVED** | IB1-F1. |
| `dist-build-inputs.mjs:201,232` — CSS/HTML contract | **NOT RESOLVED** | IB1-F2/F3. |
| `dist-build-inputs.mjs:149,287` — environment contract | **PARTIAL** | Four env-file presence/bytes, dollar rejection, sorted ambient values work; build-time reads remain unmodelled. |
| `dist-build-inputs.mjs:84,159,277` — PB3-F1/PostCSS | **PARTIAL** | Root filename/version checks and direct literal overrides work; workspace and composed-config cases fail. |
| `dist-build-cache.mjs:72` — key construction | **PARTIAL** | v2, eight-byte frames, paths/bytes and labelled validated HEAD implemented; IB1-F8 literal deviations. |
| `dist-build-cache.mjs:110` — hit validation | **RESOLVED** | Pointer identity, contained generation, cached/copied digests and copied artifact commit checked before replacement. |
| `dist-build-cache.mjs:171,195,204` — fresh validation | **RESOLVED** | Validated subprocess completes before commit check and store/return. Recognized BYPASS performs no cache access. |
| `dist-build-cache.mjs:139` — atomic store | **RESOLVED** | Partial generation → complete generation → temporary pointer → atomic pointer rename preserved. Error availability differs: IB1-F6. |
| `package.json:10` — public build/F88-b | **RESOLVED** | Exact planned scripts; outer tsc and guard remain unconditional; inner production environment normalized. No dependency addition. |
| `dist-build-cache.test.ts:111` — retained tests | **RESOLVED** | All three normalization tests are verbatim. |
| `dist-build-cache.test.ts:141` — §5 matrix/mutants | **PARTIAL** | Useful controls, but several independent acceptance cases are absent or confounded. |
| `scraper-is-never-in-the-bundle.test.ts:80` | **RESOLVED** | Original guard assertion retained and strengthened. |
| `build-boundary.test.ts:109` | **RESOLVED** | Original assertion retained; exact scripts and four consumer propagation checks added. |
| §6 allowed files / M-3 boundary | **RESOLVED** | Exactly six allowed files; no gate-inventory work, dependency change, Node pin or frozen-contract change. |

The enumerator **rescans on every lookup**; it has no retained discovery cache. Returned inventories and reasons are sorted, paths are repository-relative, and keys omit creation metadata. The internal traversal itself is not consistently sorted or bounded. Those deterministic-output properties do not cure the omitted dependencies above.

For recognized MISS/BYPASS, the production order is **tsc → Vite → guard/bundled digest → artifact commit check → store on MISS only**. Guard rejection publishes nothing and propagates failure. Serve at `serve.mjs:63`, snapshot at `ai-dm-board-snapshot.ts:306`, deep-link config at `:27`, and browser spec at `:29` all propagate cache failure. Their orchestration is correct; stale-hit discovery remains the limitation.

HEAD is validated lowercase 40-hex, labelled in the key, and never restamped on restore. Relevant dirty bytes affect the key; unrelated dirty bytes do not. This matches the selected dirty-tree decision.

**Mutant spot-check table**

“Kills” below assesses the committed assertion against the narrow mutation; it does not claim I reran filesystem-mutating Vitest tests.

| Mutant | Killing assertion / location | Assessment |
|---|---|---|
| `IGNORE_STATIC_ASSET` | External icon membership, test `:182` | **Kills.** Moving the asset outside declared `src` removes the prior confound. |
| `TRUST_DIRECTORY_DIGEST_ONLY` | Rebuild count and HEAD after forged valid digest, `:417` | **Kills.** Independently forged digest isolates commit validation; not tautological. |
| `HEAD_FALLBACK_EMPTY` | Specific error plus zero build callbacks, `:455` | **Kills.** Later provenance failure cannot satisfy the zero-build control. |
| `UNSORTED_TRAVERSAL` | Inventory equals its sorted copy, `:230` | **Kills.** A meaningful output invariant, despite similar filesystem iteration orders. |
| `HASH_BYTES_WITHOUT_PATHS` | Equal-byte rename changes digest, `:197` | **Kills.** Importer remains unchanged. |
| `ALWAYS_REBUILD` | Second-call build count remains one, `:394` | **Kills.** Independent warm-hit control. |
| `OMIT_AMBIENT_VITE` | Ambient assertion, `:267` | **Survives my in-memory replay.** Earlier env-file edit changes the key. |
| `IGNORE_GLOB_OPTIONS` | Glob test, `:186` | **No narrow kill.** Only supported options are exercised. |
| `BROAD_ENV_ALLOWLIST` | Environment rejection test, `:334` | **No narrow kill.** Neither exact exception nor moved/broadened exception is tested. |
| `IGNORE_BUILD_EXIT` | Injected rejection test, `:434` | **No narrow kill.** Removing the real subprocess-status check leaves the injected throwing callback intact. |

**Removed prior assertion lines: none.** The normalization block is byte-for-byte present. Fixtures are runtime-only, use unique `tmpdir()` descendants, and are removed in `afterEach` at test `:107`. No new shared environment mutation or order/worker-state dependence was found under `isolate:false`.

**The §7 three-build proof remains correctly specified for the repaired implementation.** Its exact output matches are:

- Cache `:204`: ``output.write(`dist cache miss: ${digest}\n`);``
- Cache `:127`: ``output.write(`dist cache hit: ${digest}\n`);``
- Guard `:435`: `` `dist clean: ${files.length} files scanned, ` ``
- Cache `:158`: ``output.write(`dist cache stored: ${digest}\n`);``

Thus MISS/MISS/HIT, guard-before-store, immediate stamp checks, restoration, first-build `NODE_ENV=test`, and duration collection remain appropriate. The proof is still pending and cannot substitute for the missing discovery fixtures.

No separate contradiction with D589/D594/D612/D612.1 or M-3 creep was found. Public validation and production normalization preserve those decisions.

**REJECT IMPL M2**

M2 IMPL REVIEW R1 DONE