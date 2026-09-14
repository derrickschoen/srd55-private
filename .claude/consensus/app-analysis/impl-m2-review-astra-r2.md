# M-2 implementation review r2 (astra 01a09f29-f331-75c0-a1ac-1b8de7a5265e) on 5dfe6c1e, harvested 2026-09-14 05:19

**REJECT IMPL M2.** The round-1 examples are repaired, but additional accepted forms still produce stale cache keys.

Review remained read-only. I reran production functions against a virtual filesystem, replayed 46 selected committed regression callbacks—93 assertions, zero failures—and tested twelve narrow mutants in memory. Syntax checks and cumulative diff-check pass; production hashes match the supplied pristine hashes. The reported 122/122 and census remain supervisor evidence.

**IB2-F1 — P1; blocks: yes — Environment exceptions still admit artifact-affecting reads.**  
[dist-build-inputs.mjs:274](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:274), [324](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:324).

This config remains cacheable:

```js
const core = {
  nested: { cacheDir: process.env.STATIC_APP_CACHE_DIR }
};
export default { base: core.nested.cacheDir };
```

The implementation checks enclosing names, not the exact `core.cacheDir` path. Changing the environment from `/a/` to `/b/` retained the key. An orchestration probe performed one build, then **HIT and returned `/a/`**.

Also accepted:

- Exact `core.cacheDir` subsequently reused as `base`.
- `import { env } from 'node:process'` followed by `env.BUILD_BASE`.
- A method named `configureServer` whose environment-dependent return value is explicitly called from a build hook.

`import.meta.env.X` in config is also accepted; I classify that as an unsupported-form detection gap, without claiming a successful production build for that probe.

**Minimal change:** enforce the exact parent/binding contexts and reject environment aliases or uses outside the supported grammar. When artifact independence cannot be established, BYPASS. Add independent changed-environment, repeated-build/zero-access controls.

**IB2-F2 — P1; blocks: yes — Config reachability and composition remain incomplete.**  
[dist-build-inputs.mjs:525](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:525), [294](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:294), [309](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:309).

For this graph:

```text
vite.config.ts → extras/config.ts → src/config.ts
```

`src/config.ts` is scanned as ordinary source before config reachability arrives. The shared `scanned` set prevents subsequent config analysis. Its `process.env.BUILD_BASE` read remained cacheable with an unchanged key across environment changes.

Additionally:

- Computed configuration properties are rejected only in root config files; an imported config containing `const key='root'; export default {[key]:'./app'}` is accepted.
- `export default {...await import('external-plugin')}` bypasses both the static-import external-plugin check and the imported-identifier spread check.

**Minimal change:** track completion of config analysis separately from ordinary traversal; apply config restrictions throughout its closure; reject unsupported dynamic composition and external factories regardless of import syntax.

**IB2-F3 — P1; blocks: yes — HTML attribute matching can conceal inline modules; resource elements remain omitted.**  
[dist-build-inputs.mjs:440](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:440), [449](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:449), [455](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:455).

```html
<script type="module" data-src="./extras/decoy.js">
  import "./extras/real.js";
</script>
```

The regex mistakes `data-src` for `src`, hashes the decoy, and skips inline-script detection. Editing `real.js` retained a cacheable, unchanged key. A script with `href` instead of `src` produces the same failure.

`<audio src>` and `<object data>` also omit their resources without bypass. Both are actual Vite resource forms, confirmed in [installed Vite:23281](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/node_modules/vite/dist/node/chunks/config.js:23281).

**Minimal change:** tokenize actual attribute names outside quoted values; determine external-script status only from a real `src` attribute. Support or conservatively bypass the remaining Vite resource elements.

**IB2-F4 — P1; blocks: yes — CSS escapes can hash the wrong resource.**  
[dist-build-inputs.mjs:392](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:392).

For:

```css
a { background: url("../extras/a\(b.png") }
```

with both `a\(b.png` and `a(b.png` present, discovery hashes the former. Vite requests the latter: I replayed its installed `doUrlReplace` function to verify this. Editing `a(b.png` therefore retained a cacheable, unchanged key.

**Minimal change:** implement the already-specified BYPASS for unsupported CSS escapes before resolving resources. Add this decoy-path fixture and repeated zero-access assertions.

**IB2-F5 — P1; blocks: yes — Glob exclusions silently omit supported matches, while traversal remains insufficiently bounded.**  
[dist-build-inputs.mjs:171](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:171).

`import.meta.glob('../dist/*.txt', {eager:true, query:'?raw'})` remains cacheable while omitting `dist/input.txt`; editing it leaves the key unchanged. Vite’s glob invocation excludes `node_modules`, not `dist`, as confirmed at [installed Vite:28256](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/node_modules/vite/dist/node/chunks/config.js:28256).

Separately, the walker excludes directories only at repository root. Even a narrow `../extras/*.txt` probe traversed `outputs/`, `extras/node_modules/`, `extras/dist/`, and `extras/outputs/`. Other declared non-input classes, including `.tmp*/` and `.claude/`, are not pruned.

**Minimal change:** prune prohibited classes before descending at every applicable depth. BYPASS patterns whose Vite matches cannot be represented within that boundary; never silently remove such matches and declare discovery complete.

**IB2-F6 — P3; blocks: no — The literal `tsconfig*.json` class remains narrower than specified.**  
[dist-build-inputs.mjs:514](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:514).

`tsconfig.build.web.json` is now included, but `tsconfigextra.json` remains omitted.

**Minimal change:** match the declared filename class and add a non-dot suffix fixture.

**IB1 dispositions**

| Finding | Disposition | Evidence |
|---|---|---|
| IB1-F1 | **PARTIAL** | Globstar, negation, escape, symlink and option probes repaired; IB2-F5 remains. Inputs:151–227. |
| IB1-F2 | **PARTIAL** | Original three failures repaired; IB2-F3 remains. Inputs:434–465. |
| IB1-F3 | **PARTIAL** | Comment imports, malformed strings and glob stylesheet classification repaired; IB2-F4 remains. Inputs:335–401. |
| IB1-F4 | **PARTIAL** | Seven original probes bypass; IB2-F1/F2 remain. Inputs:254–330, 525–530. |
| IB1-F5 | **RESOLVED** | Boundary results match installed Vite; computation repeats per lookup. Inputs:106–130, 481. |
| IB1-F6 | **RESOLVED** | Cache-specific failures fall back; validation/provenance failures remain fatal. Cache:192–231. |
| IB1-F7 | **RESOLVED** | Sampled narrow controls now kill, including ambient environment and subprocess exit. Tests:277, 430, 548, 817. |
| IB1-F8 | **PARTIAL** | Environment record, type-only export fixture and formatting repaired; literal filename gap remains. Inputs:505–514, 569. |

Here, **Inputs** means `tools/dist-build-inputs.mjs`, **Cache** means `tools/dist-build-cache.mjs`, and **Tests** means `tests/unit/tools/dist-build-cache.test.ts`.

**Probe results**

“Tracked” means membership was present and editing the resource changed the key. “Stale” means discovery accepted it while the relevant edit left the key unchanged.

| Form | Result |
|---|---|
| Zero-directory `**/` | Tracked |
| Negation first, applied after positive union | Correct exclusion |
| `../extras/**/*.{txt,md}` and bare `**/*.{txt,md}` | BYPASS |
| Only a negative pattern | BYPASS |
| Absolute `/extras/**/*.txt` | Tracked as Vite root-relative |
| Repository escape | BYPASS |
| Pattern reaching symlinked directory | BYPASS |
| Unsupported glob option value | BYPASS |
| Narrow glob traversal boundary | FAIL: prohibited directories visited |
| Explicit `../dist/*.txt` | **Stale** |
| Explicit `../outputs/*.txt` | Included despite output boundary |
| `<video src poster>` | Both tracked |
| Unquoted resource attribute | BYPASS |
| Inline module containing `<` | BYPASS |
| `<link rel=stylesheet href>` | Tracked |
| `<source srcset>` | BYPASS |
| Quoted attribute value containing `>` | Correctly tracked |
| Commented-out resource tag | Conservatively tracked; harmless extra dependency |
| Script `data-src` / `href` masking inline body | **Stale** |
| `<audio src>` / `<object data>` | **Stale** |
| CSS comment between `@import` and string | Tracked |
| `@import url("…")` | Tracked |
| `@import url(…)` without quotes | BYPASS |
| `image-set`, unterminated string | BYPASS |
| Glob-discovered `.scss`, `.less`, `.sass` | BYPASS |
| CSS resource inside `@layer` / `@supports` | Tracked |
| Escaped URL with literal-path decoy | **Stale** |
| Escaped `@\69mport` | Accepted; unsupported escape not rejected |
| R1 direct env, computed env, `Object.values(process.env)` | All BYPASS |
| R1 config re-export, property assignment, imported PostCSS spread | All BYPASS |
| R1 leaked `cacheDir` outside `core` | BYPASS |
| `process.env` passed to function | BYPASS |
| Static external package plugin factory | BYPASS |
| Spread of awaited external import | Accepted incorrectly |
| Spread of awaited local PostCSS config | BYPASS |
| `import.meta.env.X` in config | Accepted incorrectly |
| Exact two existing allowlist fixtures | Accepted |
| Nested `core.nested.cacheDir` | **Stale; actual cache HIT reproduced** |
| `AI_BRIDGE_FAKE` outside `configureServer` | BYPASS |
| Named `configureServer` explicitly called during build | Accepted; environment unkeyed |
| Imported `node:process` environment alias | **Stale key** |
| Config target previously scanned under `src` | **Stale key** |
| Workspace marker at `/` | BYPASS |
| Repository marker plus ancestor marker | Repository wins |
| Malformed ancestor manifest | Matches Vite: ignored |
| No workspace marker | Matches package-root fallback |
| Ancestor marker added between lookups | First accepted; second BYPASS |
| Discovery throws / cache root unwritable | One validated uncached build; artifact retained |
| Store fails after validation | Artifact retained |
| Malformed HEAD | Fatal before build/cache access |
| Validation failure / wrong fresh provenance | Fatal; no publication |
| Ordinary MISS then HIT | One build; validated artifact restored |

**Twelve-mutant ledger spot-check**

These were my in-memory mutations, not a claim to reproduce every historical ledger SHA. All baseline callbacks passed and all narrow mutations were killed.

| Mutant | Killing assertion in current cache spec |
|---|---|
| `OMIT_AMBIENT_VITE` | Independent environment-only digest inequality, :430 |
| `IGNORE_GLOB_OPTIONS` | Unsupported option bypass, :277 |
| `BROAD_ENV_ALLOWLIST` | Leaked `cacheDir` rejected, :548 |
| `IGNORE_BUILD_EXIT` | Nonzero injected subprocess status throws, :817 |
| `CACHE_AFTER_BYPASS` — shared-mutation entry | Zero cache accesses, :857 |
| `IGNORE_PLUGIN_CLOSURE` — shared-mutation entry | `tools/plugin.txt` membership, :418 |
| `HASH_WHOLE_EXTERNAL_DIRECTORY` — shared-mutation entry | Orphan edit leaves digest unchanged, :391 |
| `HASH_WHOLE_REPOSITORY` — shared-mutation entry | Irrelevant dirty-byte edit leaves build count one, :930 |
| `OMIT_HEAD` | Different HEAD changes digest, :382 |
| `HEAD_FALLBACK_EMPTY` | Specific malformed-HEAD rejection, :884 |
| `ALWAYS_REBUILD` | Warm lookup leaves build count one, :822 |
| `TRUST_DIRECTORY_DIGEST_ONLY` | Valid digest with wrong embedded commit rebuilds, :833 |

For the shared bypass and dirty-state cases, I also isolated the later assertions in memory so an earlier failing assertion could not substitute for their claimed independent kills.

**Expectation and scope audit**

No test deletion or weakened expectation found. Textually removed assertion lines versus `5fbf00a6` are:

- Cache spec old **182–184**: combined membership assertion, replaced by explicit cacheability and four individual membership assertions at current :200–205.
- Boundary spec old **138–139**: `spawnSync` string assertions, replaced by equivalent `spawn` assertions matching the injection seam.

The three normalization tests remain byte-identical. Fixtures remain unique runtime `tmpdir()` descendants with `afterEach` cleanup at cache spec :122. No new shared-environment mutation or test order/worker dependence was found. Formatting is acceptable: maximum lines remain 120/116/130, with 130 confined to the test title.

The cumulative diff remains within the six authorized files. Package scripts and scraper assertions are unchanged this round; package-lock is unchanged.

The three-build proof print statements are unchanged:

- Cache :226 — `dist cache miss:`
- Cache :127 — `dist cache hit:`
- Guard :436 — `dist clean: N files scanned`

**REJECT IMPL M2**

M2 IMPL REVIEW R2 DONE