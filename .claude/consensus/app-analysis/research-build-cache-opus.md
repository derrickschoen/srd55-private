# BUILD-CACHE-01 redesign — research report

Scope: replace the hand-declared input list (and the rejected import-closure +
AST-grammar attempt) with a fully automatic, content-driven cache key that never
serves a stale artifact. Answers the owner's rejection (no checked-in
fingerprint, no manual step, "just recompute if any file contents change") and
the two questions Q1 (incremental rebuild) and Q2 (recursive fingerprint).

Legend: **VERIFIED-LOCAL** = command run in the throwaway clone at
`fdcd0c44`, output pasted. **VERIFIED-DOC** = quoted from primary docs/source
with URL. **RECALLED** = from memory, flagged.

Repo facts established up front (VERIFIED-LOCAL):

- 11 504 tracked files; `git ls-tree -r -l HEAD` totals **623.3 MB**, of which
  `.vtt-exp-out/` alone is **8 452 files / 555.5 MB** (tracked — NOT in
  `.gitignore`). This dominates any scheme that re-reads file bytes.
- Real build wiring (package.json): `build = tsc -b && vite build --configLoader
  runner && node tools/assert-dist-clean.mjs`. The cache wrapper
  `tools/dist-build-cache.mjs` is NOT called by `npm run build`; it *wraps* it
  (`runRealBuild` spawns `npm run build`) and is invoked by `tools/serve.mjs:63`
  and `tools/ai-dm-board-snapshot.ts:306`. (Brief's "`npm run build = tsc &&
  dist-build-cache && assert-dist-clean`" is slightly off; the code above is
  authoritative.)
- Env surface baked into the artifact is essentially empty (see §2/§3).

---

## 1. Survey — how mature caches choose the INPUT SET automatically (without parsing the build config's program)

The universal pattern: **enumerate inputs from the version-control / filesystem
layer, hash the config file(s) as opaque bytes, and declare env vars** — none of
them parse the build program to discover what it reads. Where a tool needs to
know "did the config change", it hashes the config file whole; where it needs
"did an env var change", it requires the var be declared (or scrubs the env).

| Tool | What is hashed for the input set | Config file | Env vars | How false hits are avoided |
|---|---|---|---|---|
| **Turborepo** | Git-tracked files in the package (uses git to list + hash), filtered by `inputs`; `globalDependencies` for root files. Config is just a file in that set. | Hashed as a file (it lives in the tracked set); no program parsing. | `env`/`globalEnv` (names, wildcards) hashed by value; `passThroughEnv` excluded from hash; **strict `envMode` filters the child env to only declared vars** | Strict mode = undeclared var cannot reach the build, so it cannot change output → nothing to detect |
| **Nx** | Native Rust hasher over `namedInputs`/`inputs` globs of workspace files; `.nxignore` + `.gitignore` exclude; lockfile change marks all affected | File in the input globs | env inputs (`{"env":"NAME"}`) and `runtime` inputs (`{"runtime":"node -v"}`) hashed by value | Conservative defaults (lockfile → invalidate all); explicit inputs |
| **Bazel / Buck2** | Merkle-tree digest of the *declared* action input files (CAS, content-addressed) + command + args | A file input if declared | **Only vars whitelisted via `--action_env` enter the action key**; hermetic sandbox strips the rest | Hermetic sandbox: action sees only declared inputs + declared env |
| **Gradle** | Snapshot of `@Input`/`@InputFiles` properties, with input normalization | File input | Env reads recorded as config inputs (via a bytecode-rewriting Java agent, i.e. runtime instrumentation, not static parse); `ValueSource` lets you normalize | Missing declared input = wrong build (documented risk); relies on task authors |
| **Webpack 5 fs cache** | Module graph + `cache.buildDependencies.config: [__filename]` — hashes the config file **and everything it `require`s** | **Hashed as bytes (+ its require closure)**, not parsed for behavior | Not automatic; you fold env into `cache.version` / `name` yourself | `buildDependencies` closure + `cache.version` |
| **ccache / sccache** | Direct mode: hash(source + normalized compiler cmdline + discovered header list & their hashes). Preprocessor mode: hash preprocessed output | n/a | Selected vars in the hash; `CCACHE_SLOPPINESS` *relaxes* checks (opt-in unsafety, e.g. `time_macros`) | Header-list revalidation; falls back to preprocessor mode when unsure |
| **Docker BuildKit** | Content-addressed hash of the build context + instruction; `.dockerignore` prunes | n/a (Dockerfile is an instruction input) | `ARG`/`ENV` values participate in layer key | Content-addressed context; cache mounts scoped by id |

Sources: Turborepo caching + configuration + env docs
<https://turborepo.dev/docs/crafting-your-repository/caching>,
<https://turborepo.dev/docs/reference/configuration>,
<https://turborepo.dev/docs/crafting-your-repository/using-environment-variables>
(fetched 2026-09-14); Turbo node_modules discussion
<https://github.com/vercel/turborepo/discussions/8896>. Nx inputs
<https://nx.dev/docs/reference/inputs>, how-caching-works
<https://nx.dev/docs/concepts/how-caching-works>, runtime inputs
<https://nx.dev/docs/reference/deprecated/runtime-cache-inputs> (2026-09-14).
Bazel remote caching <https://bazel.build/remote/caching>, `--action_env`
discussion <https://groups.google.com/g/bazel-discuss/c/VgvEsN5Ixj4>. Gradle
config-input tracking
<https://blog.gradle.org/improvements-in-the-build-configuration-input-tracking>,
<https://docs.gradle.org/current/userguide/configuration_cache_requirements.html>.
Webpack cache <https://webpack.js.org/configuration/cache/>. ccache manual
<https://ccache.dev/manual/latest.html>. (All primary pages, current as of
2026-09-14.)

**Takeaway for us:** not one of these parses the config *program* to decide the
input set or to find env reads. The two families are (a) declare inputs + hash
the config file whole (Turbo/Nx/Webpack/Bazel), and (b) for env, either declare
the vars or **scrub the environment so undeclared vars cannot matter**
(Turbo strict, Bazel hermetic). The rejected AST grammar is a third family
nobody uses, and its only near-relative — Gradle — does the detection by runtime
instrumentation of the actual execution, never by parsing source text.

---

## 2. Environment variables — the automatic answer

The AST attempt existed to answer "the config might read an env var that a
file-content hash can't see." The community answer is **(i) allowlist + scrub**,
not detection.

**(i) Allowlist + scrub (RECOMMENDED).** Run the build child with an environment
containing *only* declared variables, and hash those declared values. Then an
undeclared variable **cannot** affect output, so there is nothing to detect and
no config parsing is required. This is exactly Turborepo strict mode
(VERIFIED-DOC, fetched 2026-09-14,
<https://turborepo.dev/docs/crafting-your-repository/using-environment-variables>):

> Strict Mode … "Filter environment variables available to a task's runtime to
> **only** those that are specified in the `globalEnv` and `env` keys in
> `turbo.json`."

and it is Bazel's hermetic sandbox with `--action_env`
(<https://bazel.build/remote/caching>): "Only environment variables explicitly
whitelisted via `--action_env` are included in an action definition." The scrub
is what makes the hash *sound*: you are not promising to detect reads, you are
removing the ability to read anything undeclared.

**(ii) Hash the entire environment — rejected.** Turbo calls the non-filtered
form "loose" mode and warns it "makes it easier to restore cached artifacts
produced under the wrong environment"; hashing the *whole* env is the opposite
failure — `SSH_AUTH_SOCK`, `TERM`, `PWD`, a shell nonce, CI run ids all change
constantly, so you would never get a hit. Nobody hashes the raw ambient env.

**(iii) Grep/AST for `process.env` / `import.meta.env` reads — this is the trap
we're leaving.** It is undecidable in general (computed keys `core['cacheDir']`,
destructuring, aliasing `const p = process`), which is precisely the three
review rounds the owner rejected. Gradle only makes it work by rewriting
bytecode and observing the *actual run* — not by reading source.

**This repo's env surface (VERIFIED-LOCAL).** The artifact depends on almost no
env var:

```
$ grep -rn "import.meta.env" src   # only Vite built-ins, statically replaced
src/main.ts:136: if (import.meta.env.DEV) {          # DEV=false in prod
src/worker/handlers/system.ts:285: !import.meta.env.PROD   # PROD=true
src/db/worker.ts:133: import.meta.env.MODE ...       # MODE="production"
src/pwa/register-service-worker.ts:64: import.meta.env.BASE_URL   # "/"
$ grep -rn "VITE_" src tools index.html    # (no output — zero user env vars)
$ grep -n "loadEnv\|define:" *.ts          # (no output — config never loads env)
```

`import.meta.env.{DEV,PROD,MODE,BASE_URL}` are fixed by the build *mode*
(production) and `base:'/'`, not by ambient env. `vite.config.ts` reads exactly
one ambient var, `STATIC_APP_CACHE_DIR` (line 267), and it only selects the Vite
dep-optimizer **cache directory location** — it does not change output bytes.
`NODE_ENV` is forced to `production` by the wrapper (`productionBuildEnv`,
dist-build-cache.mjs:132). Net: the declared allowlist is tiny and the scrub is
cheap.

**Recommendation:** allowlist + scrub. Declared set to *hash by value*:
`NODE_ENV` (pinned `production`) and `STATIC_APP_CACHE_DIR` (if set). Pass
through but do **not** hash the machine-variable execution vars the toolchain
needs: `PATH`, `HOME`, `TMPDIR`, `SHELL`, plus npm/node internals. Everything
else is dropped from the child env. Undeclared `VITE_*` in the ambient
environment therefore cannot reach `import.meta.env` and cannot silently change
the artifact.

---

## 3. The "just hash everything" design — correctness and cost

Proposed key source: every git-tracked file (path + blob id) + dirty/untracked
non-ignored files (path + `git hash-object`) − output dirs, plus
package-lock.json, node version, declared env values, and HEAD. All enumeration
from **git**, never a hand-written walker.

### (a) Correctness — can this key give a false HIT?

A false hit requires an input that changes the artifact but is invisible to the
key. Candidates:

1. **Vite `.env` files (the real hole).** VERIFIED-DOC
   (<https://vite.dev/guide/env-and-mode>, 2026-09-14): `vite build` runs in
   `production` mode and loads, in increasing priority, `.env`, `.env.local`,
   `.env.[mode]` (`.env.production`), `.env.[mode].local`; "environment
   variables that already exist when Vite is executed have the highest
   priority". `.env.local` and `*.local` are **git-ignored by convention**
   ("You should add `*.local` to your `.gitignore`"). So a git-tracked-only hash
   would *miss* a gitignored `.env.local`/`.env.production.local` that injects a
   `VITE_*` value into the bundle → **false hit possible in principle**.
   - VERIFIED-LOCAL, this repo: **no such files exist and none are referenced.**
     ```
     $ git ls-files | grep -iE '(^|/)\.env'
     tools/discord-launcher/.env.example      # not a Vite env file, not at root
     $ find . -maxdepth 2 -name '.env*' -not -path './node_modules/*'   # (none)
     ```
     Default `envDir` is the project root; there are no root `.env*` files, and
     no `VITE_`-prefixed variable is consumed anywhere.
   - **Fix regardless (belt-and-suspenders):** explicitly stat+hash the four
     Vite env paths at the root (`.env`, `.env.local`, `.env.production`,
     `.env.production.local`) into the key even though gitignored. Cheap, closes
     the hole permanently, needs no parsing. The env **scrub** of §2 closes the
     *ambient* `VITE_*` half.

2. **Files outside the repo** — `~/.npmrc`, global npm prefix, a globally linked
   package. These affect *dependency resolution*, which is already pinned by
   `package-lock.json` + `npm ci` discipline. Turbo and Nx accept exactly this
   boundary: Turbo "doesn't hash on the contents of node_modules … hashes the
   resolved versions … based on the root lockfile"
   (<https://github.com/vercel/turborepo/discussions/8896>, 2026-09-14); Nx
   marks all affected on lockfile change. Lockfile + node version is the
   industry-standard proxy; we adopt it.

3. **`node_modules` contents** — same as above: not hashed by anyone; the
   lockfile + Node version + `npm ci` is the contract. Include `package-lock.json`
   blob id and `process.version` in the key.

4. **Toolchain/OS** (git, node minor, platform). Node version is in the key; the
   rest is out of scope like every tool here (accepted risk, matches Bazel's
   "different `$PATH` won't share cache hits" only when declared).

Conclusion: with the two additions (hash root `.env*`, scrub the env), there is
**no reachable false-hit path** for this repo. The design is *strictly safer*
than status quo, which hashes a hand-declared list and already ignores `.env`
files entirely.

### (b) Cost — what the fine-grained closure actually buys

The current key already folds HEAD in (vite.config.ts:114 bakes `git rev-parse
HEAD` into `vtt-handoff-artifact.json`, and the redesign keeps a commit stamp).
**With HEAD in the key, every commit misses regardless.** The only extra hits a
content key buys over "HEAD + coarse" are on **uncommitted** edits outside the
input set. So the question is: how often is the tree dirty with only non-build
edits — and, if we ever drop HEAD, how many commits touch only non-build files?

VERIFIED-LOCAL, last 300 commits classified by whether any build-relevant path
(`src/`, `public/`, `index.html`, `vite.config.ts`, `tsconfig*`,
`package*.json`, `tools/{ai-bridge,licenses,pwa}`, `drizzle/`, `docs/licenses`,
`LICENSE*`, `ART-PROVENANCE`) is touched:

```
total commits analysed: 300  (empty/merge: 18)
touch >=1 build-relevant file: 38
touch ONLY non-build files:    244  (81.3%)
top non-build dirs: .claude(475 file-touches), tests(67), tools(37), docs(3)
```

**81.3% of recent commits touch only non-build files** — overwhelmingly
`.claude/` and `tests/`. That is the size of the prize: a key scoped to real
build inputs (or a whole-tree key with the §c safe exclusions) would **hit** on
~4 of every 5 commits, where the status-quo HEAD-in-key design misses all of
them. This is the strongest quantitative argument for the redesign, and it
argues for *either* dropping HEAD from the cache key *or* excluding
`tests/`+`.claude/` — see §6.

### (c) Safe exclusions without any config parsing

Vite's build reads a *provably bounded* set: `index.html` + everything `src`
imports (statically, via `?raw`, and via `import.meta.glob`), `public/` copied
verbatim, `vite.config.ts` + its import closure, and root `.env*`. It never
reads `tests/`, `.claude/`, `progress/`, `orchestration/`, `reports/`,
`.vtt-exp-out/`, `*.md` that nothing imports, `stryker*.json`,
`playwright.config.ts`, `vitest*.config.ts`. Argument from Vite's documented
model, not from parsing: the module graph is rooted at `index.html`/config, so a
path not reachable from those roots cannot enter the bundle.

Two honest caveats that make exclusion *safe but must be conservative*:

- **`import.meta.glob` (VERIFIED-LOCAL)** widens the graph dynamically:
  `src/worker/registry.ts:109 import.meta.glob('./handlers/**/*.ts')` and
  `src/ui/app.ts:33 import.meta.glob('./screens/**/screen.ts')`. A **new** file
  under those globbed dirs becomes an input with no edit to any existing file.
  This is why a static import-closure walker is unsafe here and why "hash the
  whole `src/` subtree" (not a walker) is the right grain — the whole-tree hash
  catches glob-added files automatically.
- **`?raw` reach (VERIFIED-LOCAL):** 67 `?raw` imports into `drizzle/` and 33
  into `docs/` from `src/`. These are real inputs (the omission the original
  analysis found). Whole-tree/`git ls-files` includes them for free; any
  exclusion list must therefore **not** exclude `drizzle/` or `docs/`.

Safe exclusion set (only paths provably unreachable from the Vite roots):
`tests/`, `.claude/`, `.ai/`, `progress/`, `orchestration/`, `reports/`,
`.vtt-exp-out/`, `art/incoming/`, `db/`, `contracts/`, `fixtures/`, `scripts/`,
`ast-grep-rules/`, top-level `*.md`, `stryker*.json`, `playwright.config.ts`,
`vitest*.config.ts`, `deno.lock`, `wrangler.toml`, `drizzle.config.ts`. Note
that including a non-input only ever causes a false **miss** (a needless
rebuild), never a false hit — so exclusions are a pure *hit-rate* optimization
and can be tuned later without risking staleness. Recommendation: ship the
whole-tree key first (trivially correct), add exclusions as a second, reviewable
allowlist-of-what-to-drop if the `tests/`+`.claude/` churn hurts.

---

## 4. Q1 — incremental / partial rebuild (rebuild only changed modules)

**Answer: no per-file output caching is available for the Vite production
artifact today; the practical unit is the whole `dist/`.**

- **Vite `build.watch` / `--watch`** is for a long-lived rebuild loop, not
  cross-invocation persistence, and it re-processes *all* inputs on any change.
  VERIFIED-DOC (<https://vite.dev/guide/build>, 2026-09-14): the page documents
  only "With the `--watch` flag enabled, changes to files to be bundled will
  trigger a rebuild" and contains **no** mention of `rollupOptions.cache`,
  on-disk build cache, or incremental production caching. Community reports
  (<https://github.com/vitejs/vite/discussions/15440>, /12943, /17541) confirm a
  single-file change re-processes every `rollupOptions.input`.
- **Rollup `cache`** is **in-memory only** and for watch mode. VERIFIED-DOC
  (<https://rollupjs.org/configuration-options/#cache>): it is "The `cache`
  property of a previous bundle. Use it to speed up subsequent builds **in watch
  mode** — Rollup will only reanalyse the modules that have changed"; you
  retrieve it via `bundle.cache` and pass it to the next in-process build.
  **No automatic disk persistence** — it does not survive a fresh `vite build`.
- **Rolldown-vite** (the Rust bundler Vite 7 is migrating to) improves cache
  *invalidation* consistency but does not expose a persistent per-module
  production output cache today (RECALLED — no primary doc found describing a
  persistent on-disk production cache; treat as unverified).
- **esbuild incremental** is a dev-server concern, not the production artifact.
- **`tsc -b`** already gives incremental *type-checking* via `*.tsbuildinfo`
  (gitignored here). That speeds the `tsc -b` half of `npm run build`, not the
  `vite build` half that emits `dist/`.

So Q1's "cache all but the changed files, rebuild incrementally" is **not
offered by the toolchain for the emitted bundle**. The artifact is monolithic
(one Rollup graph for `index`, one for the sqlite worker), so the correct cache
unit is the whole `dist/` keyed on all inputs — which is what the current design
and this redesign both do. Chasing per-module output caching would mean
authoring a custom bundler cache; not worth it for a minutes-long build that the
whole-`dist` cache already turns into a copy.

---

## 5. Q2 — recursive / Merkle fingerprints (git trees, proven in the clone)

Git tree objects **are** a Merkle tree: each tree's id is the hash of its
entries (mode+type+id+name), so a directory's id summarizes its whole subtree,
and two tree ids differing means something under them changed. VERIFIED-DOC
(<https://web.mit.edu/git/git-doc/git-write-tree.html>; git-scm internals): "a
bunch of Merkle trees that point to other Merkle trees." This gives the owner's
"recursive fingerprint at each level" for free.

**(a) Per-directory fingerprints at HEAD (VERIFIED-LOCAL):**

```
$ git rev-parse HEAD^{tree}   # whole-tree fingerprint
9ab0a310f8cf371d22e5c7cafa7202ab370b028c
$ for d in src drizzle docs public tools; do echo "$d $(git rev-parse HEAD:$d)"; done
src      dbe31f01d8745984e4f3a7dc7f17e9c5242a3e84
drizzle  09e49101d60196310cd118bb13d9745a827a4835
docs     f84de62ad3a5460b81650fe5cb4d08a2be59023b
public   4098ca3886eb37592aeeeaeb50d029c1d90517bf
tools    3e949a0eddc9dc8a3e1eafd03f45f69ba4a3258b
```

**(b) Fingerprint of the DIRTY working tree via a temporary index, real index
untouched (VERIFIED-LOCAL):**

```
$ git status --porcelain            # clean, 0 bytes
$ echo "// scratch change" >> src/main.ts
$ export GIT_INDEX_FILE=/tmp/x
$ cp .git/index "$GIT_INDEX_FILE"   # copy real index so nothing tracked is lost
$ git add -A && git write-tree
121cf001d1997076989cbfa5555751ae547766d8      # dirty-tree fingerprint
$ git diff-tree -r 9ab0a310... 121cf001...
:100644 100644 c34960cc… d62e1ee5… M    src/main.ts   # names EXACTLY the file
$ unset GIT_INDEX_FILE
$ git status --porcelain            # real index untouched: only working-tree M
 M src/main.ts
$ git checkout src/main.ts          # reverted
```

The temp-index write-tree produced a tree id for the *dirty* working tree,
`git diff-tree` named exactly the one changed file, and `git status` before/after
proves the real `.git/index` was never modified.

**(c) Timing on this ~11.5k-file repo (VERIFIED-LOCAL, `/usr/bin/time -v`):**

| Operation | Wall clock | Notes |
|---|---|---|
| warm temp-index `add -A && write-tree` (copy real index, 1 dirty file) | **0.05 s** | the realistic path — git reuses stored blob ids, hashes only dirty files |
| `git ls-files -s \| wc -l` (11 504 tracked blob ids) | **0.00 s** | index read, no hashing |
| `git status --porcelain -z --untracked-files=all` | **0.04 s** | dirty/untracked overlay |
| cold temp-index (empty start, git must hash all 623 MB) | **2.66 s** | **do not do this** — see gotcha |

**Gotcha found and proven (VERIFIED-LOCAL) — never start from an empty index.**
An empty-index `git add -A` respects `.gitignore` for *untracked* paths and
therefore **drops tracked-but-ignored files**, producing a different tree:

```
$ GIT_INDEX_FILE=/tmp/cold rm -f /tmp/cold; git add -A; git write-tree
c4e991873c29e664125f67c061263b26611fdc0f          # != HEAD tree
$ git diff-tree -r 9ab0a310... c4e991873...
D  orchestration/wave-state
D  reports/mutation/mutation.json
D  reports/perf/fullsuite-sql/sql-profile.json     # 3 tracked files dropped
```

Worse, `git check-ignore` will **not** warn you: a tracked path is never
reported as ignored, so `git ls-files | git check-ignore --stdin` returns
**nothing** for these three files even though `add -A` drops them. Copying the
real index first (warm path) preserves them and reproduces HEAD exactly:

```
$ cp .git/index /tmp/warm; GIT_INDEX_FILE=/tmp/warm git add -A; git write-tree
9ab0a310f8cf371d22e5c7cafa7202ab370b028c          # == HEAD tree, deterministic
```

**(d) "Where did it change, at a glance" table falls out of `git diff-tree`:**
`git diff-tree --stat <headTree> <dirtyTree>` gives a per-file/per-directory
change summary; `git ls-tree <tree> <dir>` prints the child fingerprints; and
diffing two directory tree ids (`git rev-parse A:src` vs `B:src`) tells you in
one comparison whether `src/` changed at all. That is precisely the owner's
"recursive fingerprint of each level so we know at a glance where changes are,"
implemented by git with no custom code.

---

## 6. Recommendation — one design, simplest, fully automatic, never stale

**Cache the whole `dist/`, keyed by a git-derived content digest of all inputs,
built in a scrubbed environment. No walker, no AST, no checked-in fingerprint,
no manual step.**

### Key composition (in order)

1. `CACHE_FORMAT` constant (bump to invalidate all).
2. **Tracked inputs:** `git ls-files -s -z` → lines of `mode blobid path`.
   (Instant; reuses git's stored blob ids — this is why cost is ~0.05 s not the
   2.66 s of re-reading 623 MB.)
3. **Dirty overlay:** `git status --porcelain=v1 -z --untracked-files=all`; for
   each modified/added/untracked path, replace/append `mode
   <git hash-object path> path`; drop deleted paths. Ignored paths never appear
   (git omits them), so no output-dir filtering of `dist/`, `.tmp*`, etc. is
   needed beyond what `.gitignore` already does.
4. **Root Vite env files (belt-and-suspenders):** stat+hash `.env`, `.env.local`,
   `.env.production`, `.env.production.local` at repo root if present (closes the
   gitignored-`.env` hole from §3a; currently all absent).
5. `package-lock.json` blob id (already in the tracked set, but pin explicitly).
6. `process.version` (Node — pins the toolchain the lockfile assumes).
7. **Declared env values:** `NODE_ENV=production`, and `STATIC_APP_CACHE_DIR` if
   set — hashed by value.
8. **Commit stamp:** `git rev-parse HEAD` — but see the HEAD decision below.

Hash all of the above (framed length-prefixed, as the current code already does
in `framed()`), sha256 → `inputDigest`. Pointer + generation storage: **keep the
existing `dist-build-cache.mjs` machinery unchanged** (tmpdir pointer
`${inputDigest}.json`, verified generation copy, atomic rename, `directoryDigest`
re-verification on restore). Only `distBuildInputDigest` / `distBuildInputFiles`
change — the store/restore/atomicity code is already sound and content-verifies
what it restores.

### Env allowlist + scrub

Run `runRealBuild` with a scrubbed env: keep execution-only vars (`PATH`, `HOME`,
`TMPDIR`, `SHELL`, npm/node internals) passed through **but not hashed**; set
`NODE_ENV=production` and forward `STATIC_APP_CACHE_DIR` if present (both
**hashed**); drop everything else, so no undeclared `VITE_*` can reach the build.

### The HEAD decision (argue from vite.config.ts:114)

vite.config.ts:114 bakes `git rev-parse HEAD` into `dist/vtt-handoff-artifact.json`
(the `commit` field). So the *artifact bytes literally contain HEAD* — two
commits with an identical tree still produce different `dist/`. Therefore **HEAD
must stay in the key** (option A, safe, simple), OR the stamp must be re-derived
from the input digest instead of the commit (option B: change vite.config.ts:114
to stamp the `inputDigest`/tree id rather than the commit, then drop HEAD from
the key and gain hits across no-op recommits and the 81% non-build commits).
Recommendation: **ship option A now** (HEAD in key — provably never stale, and
cross-commit hits were never the point given §3b). Consider option B later as a
deliberate, reviewed change to the stamp — it is the only lever that converts the
81%-non-build-commit finding into cache hits, but it changes a shipped artifact
field and must be its own decision.

### Where the pointer lives / miss/hit output

Unchanged from today: pointer under `os.tmpdir()/dnd-dist-build-cache-v1/`,
generations verified by `directoryDigest`. Prints (existing strings):
`dist cache hit: <digest>` / `dist cache miss: running npm run build` /
`dist cache stored: <digest>`.

### Implementation size

The key computation replaces `DIST_BUILD_INPUT_CLASSES`, `rootConfigurationFiles`,
`regularFiles`, `distBuildInputFiles`, `distBuildInputDigest` (~90 lines today)
with roughly: run `git ls-files -s -z`, run `git status --porcelain -z`,
`git hash-object` the dirty set, stat+hash root `.env*`, fold in
lockfile/node/env/HEAD, sha256. **Estimate ~110–140 lines** for the key
computation (well under 150), *deleting* the walker. The 880-line closure+AST
branch is removed entirely. Net: large deletion, small addition.

### Test list (named mutants)

| Test | Expected |
|---|---|
| edit a tracked `src/**.ts` | **miss** (blob id changes) |
| new **untracked** file under `src/worker/handlers/` (glob input) | **miss** (status overlay + `git hash-object`) — covers `import.meta.glob` |
| edit `drizzle/*.sql` reached by `?raw` | **miss** |
| declared env var change (`STATIC_APP_CACHE_DIR`) | **miss** (hashed value) |
| **undeclared** env var set (e.g. `VITE_FOO=x`, `FOO=y`) | **hit** — scrubbed out of child env, not in key (this is the point) |
| gitignored `.env.production` created/edited at root | **miss** (§6 step 4 hashes it) — proves the belt-and-suspenders |
| edit `tests/**` or `.claude/**` | **hit** if the §3c exclusion allowlist is shipped; **miss** with the plain whole-tree key (ship whole-tree first: correct-but-conservative) |
| `git commit` with an **identical tree** (no file change) | **miss while HEAD is in key** (option A); would be a **hit** under option B — and vite.config.ts:114 bakes HEAD, so option A is correct until the stamp is changed |
| tracked-but-ignored file (`orchestration/wave-state`) edited | **miss** (`ls-files -s` includes it; never use empty-index write-tree — §5c) |
| restore integrity: corrupt a cached generation | **miss/rebuild** (existing `directoryDigest` re-verify) |

### Trade-off table

| Design | Automatic? | False-hit risk | Hit rate | Complexity |
|---|---|---|---|---|
| **Hand-declared list (status quo)** | partial | **Yes** — omitted 97 `?raw` files (67 drizzle, 30 docs) served stale; ignores `.env` | low (HEAD in key ⇒ every commit misses) | low, but silently wrong |
| **Closure walker + AST grammar (rejected)** | no (manual fingerprint on config edit) | Yes — 3 config forms accepted wrongly across 3 rounds; unsafe with `import.meta.glob` | high | very high (880 lines + grammar) — owner rejected |
| **Whole-tree git hash** | **yes** | **None** (with env scrub + root `.env*` hash) | good on dirty non-build edits; misses per-commit (HEAD) | **low** (~110–140 lines, deletes the walker) |
| **Whole-tree + safe exclusions** | yes | None (exclusions only cause misses, never hits) | **best** — hits the 81% non-build commits/edits | low + a small reviewable drop-list |

**Bottom line:** enumerate inputs from git (`ls-files -s` + `status` overlay +
`hash-object`), hash the config *as bytes like every other file*, scrub the
environment so undeclared vars can't matter and hash only the declared ones,
hash root `.env*` for safety, keep HEAD (option A) until you deliberately change
vite.config.ts:114's stamp. This is what Turborepo/Nx/Bazel do, it is fully
automatic, it has no reachable false-hit path for this repo, it costs ~0.05 s,
and it replaces 880 lines with ~130.

RESEARCH DONE
