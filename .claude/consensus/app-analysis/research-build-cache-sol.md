# BUILD-CACHE-01 research: automatic, content-driven invalidation

Evidence labels used throughout:

- **VERIFIED—LOCAL** means I ran the displayed command, or inspected the displayed source, in the disposable clone at `fdcd0c445525caf82619fab04f3037e416c2e3b1`.
- **VERIFIED—PRIMARY** means the claim comes from the linked project documentation/source; the cited version/date is stated.
- **RECALLED—BRIEF** means it is supplied by the research brief but is not present in, or was deliberately not checked against, the disposable clone. There are no unsupported memory claims below.

## 1. Survey: how mature caches choose and hash inputs

| System | Input set and key | Environment | Config handling and false-hit boundary |
|---|---|---|---|
| Turborepo | **VERIFIED—PRIMARY (current `main`, accessed 2026-09-14):** the global hash contains lockfile state, global dependencies, global environment, and global configuration; the task hash contains the task definition, dependency hashes, package inputs, and task environment. With no `inputs`, all Git-tracked files in the package are inputs. Its current hasher reads the Git index, reuses blob IDs for clean tracked files, and discovers modified/deleted/untracked files; this is the modern equivalent of the older Git-command implementation, not literally a current `git ls-tree` + `git status` subprocess. [Caching](https://turborepo.com/docs/crafting-your-repository/caching), [`inputs`/`env` reference](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/configuration/tasks.md), [hasher architecture](https://github.com/vercel/turborepo/blob/main/crates/turborepo/ARCHITECTURE.md) | **VERIFIED—PRIMARY:** output-affecting values go in `env`/`globalEnv` and are hashed. `passThroughEnv` values are available but deliberately not hashed. Strict mode is the default and: “Only explicitly configured variables are available to tasks.” Loose mode exposes everything but can produce incorrect hits. [Environment modes, current `main`, accessed 2026-09-14](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/environment/modes.md) | **VERIFIED—PRIMARY:** resolved Turbo/task configuration affects the hash; it does not analyze a Vite/webpack configuration program to discover what that program reads. False hits are avoided by broad Git inputs plus explicit global dependencies and environment declarations; an incomplete declaration remains the user's responsibility. [Caching](https://turborepo.com/docs/crafting-your-repository/caching) |
| Nx | **VERIFIED—PRIMARY (current docs, accessed 2026-09-14):** a task defaults to all project files plus dependency inputs; `namedInputs` can compose/exclude glob sets. Project configuration is always included. External dependency versions, command arguments, runtime command output, and selected environment values can also be inputs. Gitignored files are excluded; `.nxignore` can exclude more. [Inputs reference](https://nx.dev/docs/reference/inputs), [caching model](https://nx.dev/docs/concepts/how-caching-works), [`.nxignore`](https://nx.dev/docs/reference/nxignore) | **VERIFIED—PRIMARY:** `{ "env": "NAME" }` hashes that variable; `{ "runtime": "node --version" }` hashes command output. Values are declarative, not inferred by parsing programs. [Inputs reference](https://nx.dev/docs/reference/inputs) | **VERIFIED—PRIMARY:** Nx hashes normalized project/workspace configuration and plugin-inferred task metadata, not every arbitrary file or environment read performed by a config program. Nx replaced its original Git-based JavaScript hasher with a native implementation in Nx 15.8. [Nx 15.8 announcement, 2023-03-09](https://nx.dev/blog/nx-15-8-rust-hasher-nx-console-for-intellij-deno-node-and-storybook) |
| Bazel / Buck2 | **VERIFIED—PRIMARY (Bazel 9.2 docs; Buck2 current docs; accessed 2026-09-14):** a cacheable action identifies its command, declared input files/tools, declared output names, and environment; input/output blobs live in a content-addressed store and the action digest maps to results. Buck2 likewise hashes the command and all declared action inputs. [Bazel remote cache](https://bazel.build/remote/caching), [Bazel actions API](https://bazel.build/rules/lib/builtins/actions), [Buck2 architecture](https://buck2.build/docs/concepts/architecture/), [Buck2 rule inputs](https://buck2.build/docs/rule_authors/writing_rules/) | **VERIFIED—PRIMARY:** Bazel rules provide explicit action `env`; `--action_env=NAME=value` fixes a value, `--action_env=NAME` takes the invocation value, and the environment is action metadata. Sandboxing/hermeticity restricts undeclared host effects. [Bazel command-line reference](https://bazel.build/reference/command-line-reference), [hermeticity](https://bazel.build/basics/hermeticity) | **VERIFIED—PRIMARY:** BUILD/Starlark analysis constructs actions; the build config is not simply hashed as an opaque program. Correctness comes from declared action inputs and isolation. If a rule omits an input, hermetic execution should make the access fail instead of silently affecting output. [BUILD files](https://bazel.build/concepts/build-files), [hermeticity](https://bazel.build/basics/hermeticity) |
| Gradle build cache | **VERIFIED—PRIMARY (Gradle 9.7.1 docs, accessed 2026-09-14):** a task key snapshots task type, declared input properties/files, output property names, relevant classpaths/plugins/build logic, and implementation. `@Input`, `@InputFile`, `@InputDirectory`, and related annotations declare inputs; incremental tasks can receive file changes. [Build cache](https://docs.gradle.org/current/userguide/build_cache.html), [incremental build](https://docs.gradle.org/current/userguide/incremental_build.html) | **VERIFIED—PRIMARY:** Gradle does **not** automatically track environment variables used during task execution; the task must register them as inputs. Volatile inputs reduce cache reuse. [Common caching problems](https://docs.gradle.org/current/userguide/common_caching_problems.html), [build-cache concepts](https://docs.gradle.org/current/userguide/build_cache_concepts.html) | **VERIFIED—PRIMARY:** build logic that affects execution participates, but Gradle's contract is declared task inputs—not AST analysis of arbitrary code and not necessarily an opaque whole-file config hash. Its separate Configuration Cache instruments some configuration-time reads; that is not the task-output build cache. [Configuration Cache](https://docs.gradle.org/current/userguide/configuration_cache.html) |
| webpack 5 filesystem cache | **VERIFIED—PRIMARY (webpack 5 docs/current source, accessed 2026-09-14):** `cache: { type: 'filesystem' }` persists module/build results. `cache.buildDependencies.config: [__filename]` hashes the config and everything webpack can follow through `require()`; package-manager-managed `node_modules` may be treated as immutable/versioned by snapshot settings. [Cache config](https://webpack.js.org/configuration/cache/), [webpack 5 persistent-cache design guide](https://github.com/webpack/changelog-v5/blob/master/guides/persistent-caching.md) | **VERIFIED—PRIMARY:** arbitrary environment, database, CLI, or untracked `fs.readFile` influences are not discovered. The design guide says to encode such state in `cache.version` (its example uses a Git-revision environment value). [Persistent-cache design guide](https://github.com/webpack/changelog-v5/blob/master/guides/persistent-caching.md) | **VERIFIED—PRIMARY:** this is the clearest example of hashing the config file as a whole plus statically discoverable required dependencies. It still needs declarations/versioning for dynamic file or environment inputs, so whole-config hashing avoids config-syntax classification without solving arbitrary I/O. |
| ccache / sccache | **VERIFIED—PRIMARY (ccache 4.11; sccache `main`; accessed 2026-09-14):** ccache direct mode keys compilation and validates a manifest of included headers; preprocessor mode hashes preprocessed output. sccache's C/C++ key includes preprocessed input, compiler, arguments, extra files, and relevant environment. [ccache 4.11 manual](https://ccache.dev/manual/4.11.html), [sccache caching](https://github.com/mozilla/sccache/blob/main/docs/Caching.md) | **VERIFIED—PRIMARY:** selected locale/compiler variables participate. `CCACHE_SLOPPINESS` opts out of checks for speed and explicitly permits stale reuse in specified cases. | **VERIFIED—PRIMARY:** neither parses a general build configuration; the unit is one compiler invocation. Direct mode avoids false hits by checking the concrete header set, while preprocessor mode pays preprocessing cost to derive effective content. This model does not provide partial caching of a Vite bundle. |
| Docker BuildKit | **VERIFIED—PRIMARY (current Docker docs, accessed 2026-09-14):** each Dockerfile instruction forms a layer-cache decision. `ADD`/`COPY` and bind mounts use checksums from selected context file metadata; `.dockerignore` removes context inputs. `RUN` does not automatically notice arbitrary files that the command might fetch/read. [Cache invalidation](https://docs.docker.com/build/cache/invalidation/), [build context](https://docs.docker.com/build/concepts/context/) | **VERIFIED—PRIMARY:** `ARG`/`ENV` instruction values affect later cache decisions. Secret contents deliberately do not invalidate a layer; Docker recommends an explicit cache-busting argument when needed. [Cache invalidation](https://docs.docker.com/build/cache/invalidation/), [Dockerfile reference](https://docs.docker.com/reference/dockerfile/) | **VERIFIED—PRIMARY:** the Dockerfile instruction text is part of the layer chain, not AST-classified for hidden behavior. False hits are avoided only for declared context/arguments; network and secret content require an explicit policy. |

**VERIFIED—PRIMARY synthesis:** mature caches do not solve arbitrary program dependency discovery with a hand-written grammar. They choose one of three contracts: broad source-controlled inputs plus declared environment (Turbo/Nx), explicit hermetic action inputs (Bazel/Buck2/Gradle), or a known execution unit whose dependency mechanism can be followed (webpack/compiler caches/BuildKit). The common defense against false hits is to make undeclared influences unavailable or explicitly version them—not to infer every possible program form.

## 2. Environment variables

### Candidate (i): allowlist, scrub, and hash — recommended

**VERIFIED—PRIMARY:** Turborepo strict mode establishes the relevant community pattern: only `env`, `globalEnv`, `passThroughEnv`, and `globalPassThroughEnv` values reach tasks; its docs call out cache correctness as a benefit. Only `env`/`globalEnv` values affect hashes, so an output-affecting variable must **not** be put only in `passThroughEnv`. [Turborepo environment modes, current `main`, accessed 2026-09-14](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/environment/modes.md)

**VERIFIED—LOCAL:** the current helper passes every parent variable through and only overwrites `NODE_ENV`, while the production Vite config directly reads `STATIC_APP_CACHE_DIR`. The second read is in a dev-server hook:

```text
$ nl -ba tools/dist-build-cache.mjs | sed -n '132,136p'; rg -n 'process.env' vite.config.ts tools/ai-bridge/plugin.ts
132 export function productionBuildEnv(parentEnv) {
133   return {
134     ...parentEnv,
135     NODE_ENV: 'production',
136   };
vite.config.ts:267:  cacheDir: process.env.STATIC_APP_CACHE_DIR ?? checkoutCacheDir,
tools/ai-bridge/plugin.ts:367:          process.env['AI_BRIDGE_FAKE'] === '1'
```

**VERIFIED—LOCAL recommendation:** construct the child environment from nothing. Fix `NODE_ENV=production`; set a controlled `PATH`, locale, timezone, temporary `HOME`, and npm config paths; admit `STATIC_APP_CACHE_DIR` as the one current declared external value; hash every admitted key/value with names and lengths. Invoke the local tool entry points directly, or also control every deterministic `npm run` variable npm injects into its child. Do not admit `AI_BRIDGE_FAKE` to production. If a future build needs `VITE_API_URL`, it must be deliberately added to the declared build environment and hash. An undeclared parent variable can then change neither key nor output because the child cannot see it.

**VERIFIED—PRIMARY:** Vite evaluates the config before loading `.env*` into `process.env`; ambient process values are available to the config, while Vite later exposes `VITE_`-prefixed values to application code. Scrubbing therefore must happen before starting Vite, and Vite env files must separately be file inputs. [Vite config docs, current `main`, accessed 2026-09-14](https://github.com/vitejs/vite/blob/main/docs/config/index.md), [Vite env docs, current `main`, accessed 2026-09-14](https://github.com/vitejs/vite/blob/main/docs/guide/env-and-mode.md)

### Candidate (ii): hash the entire environment — reject

**VERIFIED—PRIMARY:** mature systems select environment inputs rather than hash everything: Turbo distinguishes hashed `env` from unhashed pass-through values; Nx requires an env input; Gradle warns that volatile inputs destroy reuse. [Turbo task reference](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/configuration/tasks.md), [Nx inputs](https://nx.dev/docs/reference/inputs), [Gradle build-cache concepts, 9.7.1](https://docs.gradle.org/current/userguide/build_cache_concepts.html)

**VERIFIED—LOCAL analysis:** hashing the parent environment would make irrelevant `TERM`, `SSH_AUTH_SOCK`, shell level, CI job IDs, temporary directories, and credentials cause misses. It can also leak secret-derived material if diagnostics print inputs. Worse, hashing does not prevent a build subprocess from consulting an external service. Scrub + declared values gives a smaller key and a stronger causal guarantee.

### Candidate (iii): grep/parse `process.env` or `import.meta.env` — reject

**RECALLED—BRIEF:** the rejected grammar already produced false classifications for computed properties, destructuring, aliases, and values hidden in spreads. Grep has the same problem plus wrappers such as `const env = process.env`, helper imports, plugin code, `loadEnv`, and dynamic access. A complete JavaScript evaluator is the build itself. Whole-file hashing plus a scrubbed environment makes the syntax irrelevant.

## 3. The “just hash everything” design in this repository

### 3.1 What Git provides

**VERIFIED—PRIMARY:** `git ls-files -s -z` emits index mode, object ID, stage, and raw NUL-terminated path. `git status --porcelain=v1 -z --untracked-files=all` provides a stable machine format for HEAD/index/worktree differences and all nonignored untracked files. `git hash-object --no-filters` can hash current raw file content. [`git-ls-files`, current docs, accessed 2026-09-14](https://git-scm.com/docs/git-ls-files), [`git-status`](https://git-scm.com/docs/git-status), [`git-hash-object`](https://git-scm.com/docs/git-hash-object)

**VERIFIED—LOCAL:** the clean checkout has 11,504 tracked files. Enumerating their existing blob IDs rounded below 0.01 s; clean porcelain status took 0.03 s:

```text
$ /usr/bin/time -f 'ls-files-s elapsed=%e sec user=%U sys=%S maxrss=%M KB' git ls-files -s > /tmp/build-cache-ls-files.out
ls-files-s elapsed=0.00 sec user=0.00 sys=0.00 maxrss=8988 KB
$ wc -l /tmp/build-cache-ls-files.out
11504 /tmp/build-cache-ls-files.out
$ /usr/bin/time -f 'status-z elapsed=%e sec user=%U sys=%S maxrss=%M KB' git status --porcelain=v1 -z --untracked-files=all > /tmp/build-cache-status.out
status-z elapsed=0.03 sec user=0.00 sys=0.03 maxrss=9084 KB
$ wc -c /tmp/build-cache-status.out
0 /tmp/build-cache-status.out
```

**VERIFIED—LOCAL:** a fast key can frame and SHA-256 the index records, then overlay every porcelain record with status/path/mode plus the raw current hash, deletion marker, or rename endpoints. It must reject/bypass `assume-unchanged`/`skip-worktree` entries and inspect submodules with `--ignore-submodules=none`; otherwise Git may intentionally hide worktree changes. This clone has neither special entries nor submodules:

```text
$ git submodule status; git ls-files -v | awk '$1 ~ /^[a-zS]$/ {print}'; git status --short
# no output
```

**VERIFIED—LOCAL qualification:** clean index blob IDs reflect Git's filtered/canonical content. If “any content change” means literally every byte even when clean/smudge filters normalize it, hash every worktree file's raw bytes instead of reusing clean blob IDs. This clone has no tracked `.gitattributes`, so the fast path has no repository-declared content filter here:

```text
$ git ls-files .gitattributes '**/.gitattributes'
# no output
```

### 3.2 Correctness holes in the proposed nonignored-files-only key

**VERIFIED—PRIMARY:** a production-mode Vite build loads `.env`, `.env.local`, `.env.production`, and `.env.production.local` (mode-specific values win; already-present process variables win). By default only `VITE_` values are exposed to client source, but plugins/config can explicitly load or use other values. [Vite env-and-mode, current `main`, accessed 2026-09-14](https://github.com/vitejs/vite/blob/main/docs/guide/env-and-mode.md)

**VERIFIED—LOCAL:** none of those four files exists and, contrary to the hypothetical “gitignored `.env.production`” mutant, none is currently ignored by this repository:

```text
$ for f in .env .env.local .env.production .env.production.local; do
    if test -e "$f"; then s=present;
    elif git check-ignore -q -- "$f"; then s=absent-ignored;
    else s=absent-nonignored; fi
    printf '%-24s %s\n' "$f" "$s"
  done
.env                     absent-nonignored
.env.local               absent-nonignored
.env.production          absent-nonignored
.env.production.local    absent-nonignored
$ sed -n '1,18p' .gitignore
node_modules/
node_modules
tmp/
.vite/
.vitest/
dist/
test-results/
playwright-report/
reports/*
!reports/module-state-census.json
.stryker-tmp*/
*.tsbuildinfo
.build-lock/
.plan-lock/
.worktrees/
.codex-locks/
orchestration/wave-state
orchestration/*.verdict
```

**VERIFIED—LOCAL:** nevertheless, a key restricted to nonignored files has a general false-hit route: an ignored env/config/data file can affect Vite. The automatic correction is to ask Git for ignored files too (`git ls-files -z --others --ignored --exclude-standard`), hash every such file except enforced output/dependency roots, and always probe/hash the four Vite env paths even if ignore rules change. This uses Git's ignore model, not a handwritten import walker.

**VERIFIED—PRIMARY:** `package-lock.json` describes an exact dependency tree, and `npm ci` requires it, errors when it disagrees with `package.json`, removes an existing `node_modules`, and performs a frozen install. npm also warns that its hidden `node_modules/.package-lock.json` can miss a manually added file beneath an existing package directory. [npm `ci` 11.19.1 docs, last edited 2025-10-05](https://docs.npmjs.com/cli/v11/commands/npm-ci/), [package-lock docs, npm 11, accessed 2026-09-14](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)

**VERIFIED—PRIMARY/LOCAL conclusion:** lockfile + exact Node/npm/platform + disciplined `npm ci` is the normal managed-dependency contract (webpack similarly treats configured `managedPaths` as package-manager managed), but it is not cryptographic proof that nobody later modified `node_modules`. For “never stale,” either make installed dependencies immutable/fresh per job, validate a trusted install stamp and bypass on mismatch, or hash `node_modules` too. The last option is automatic but likely erases the desired speed. [webpack cache snapshots, current docs](https://webpack.js.org/configuration/cache/)

**VERIFIED—PRIMARY:** npm reads project, user (`$HOME/.npmrc`), global, environment, and CLI configuration. A synthetic `HOME` plus explicit `NPM_CONFIG_USERCONFIG`/`NPM_CONFIG_GLOBALCONFIG` prevents host npm configuration from becoming a hidden build input. [npm 11 `.npmrc` docs, accessed 2026-09-14](https://docs.npmjs.com/cli/v11/configuring-npm/npmrc)

**VERIFIED—LOCAL analysis:** no repository-content hash can detect arbitrary reads of `/etc`, `$HOME`, time, randomness, a network response, or a globally resolved module. Therefore an unconditional mathematical “never stale under arbitrary JavaScript” claim requires filesystem/network/process hermeticity. The proposed design can truthfully guarantee no stale hit under an enforced contract: repository files (including relevant ignored files), immutable lockfile-derived dependencies, scrubbed environment, fixed tools/platform, and no undeclared external I/O. On any unverifiable precondition it must bypass, never guess.

### 3.3 Cost and history

**VERIFIED—LOCAL:** the brief says the intended current redesign includes HEAD, but the clone's `tools/dist-build-cache.mjs` v1 does not. The clone's Vite config **does** write HEAD into an output artifact:

```text
$ nl -ba vite.config.ts | sed -n '111,120p'
111     writeBundle() {
112       if (outputDirectory === undefined) throw new Error('VTT handoff output directory is unavailable.');
113       const worker = selectVttHandoffWorkerAsset(deployableAssets(outputDirectory));
114       const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
115         cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
116       }).trim();
117       if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error('The build commit is invalid.');
118       writeFileSync(join(outputDirectory, 'vtt-handoff-artifact.json'), `${JSON.stringify({
119         artifact: 'dist',
120         commit,
```

**VERIFIED—LOCAL:** I classified the last 300 commits conservatively as “build-capable” if they touched `src`, `public`, `drizzle`, `docs`, `tools`, root HTML/package/tsconfig/Vite config, or emitted-license inputs. Merge commits with no paths in default `--name-only` output are reported separately:

```text
$ git log -300 --format='@@COMMIT %H' --name-only | node -e '
  const lines=require("fs").readFileSync(0,"utf8").split(/\n/); let commits=[], c;
  for(const l of lines) if(l.startsWith("@@COMMIT ")){if(c)commits.push(c);c=[]}else if(l&&c)c.push(l);
  if(c)commits.push(c);
  const exact=new Set(["index.html","package.json","package-lock.json","LICENSE","LICENSE-ART","ART-PROVENANCE.md"]);
  const builds=p=>/^(src|public|drizzle|docs|tools)\//.test(p)||exact.has(p)||/^tsconfig(?:\.[^.]+)?\.json$/.test(p)||/^vite\.config\.[cm]?[jt]s$/.test(p);
  let b=0,n=0,e=0,top=new Map,sets=new Map;
  for(const raw of commits){const ps=[...new Set(raw)];if(!ps.length){e++;continue}
    if(ps.some(builds))b++;else{n++;const k=[...new Set(ps.map(p=>p.split("/")[0]))].sort().join(",");sets.set(k,(sets.get(k)||0)+1)}
    for(const k of new Set(ps.map(p=>p.split("/")[0])))top.set(k,(top.get(k)||0)+1)}
  console.log(`SUMMARY commits=${commits.length} paths_shown=${commits.length-e} build_capable=${b} only_nonbuild=${n} empty_or_merge=${e} only_nonbuild_all=${(100*n/commits.length).toFixed(2)}% only_nonbuild_nonempty=${(100*n/(commits.length-e)).toFixed(2)}%`);
  console.log("TOP_LEVEL commits_touching");for(const [k,v] of [...top].sort((a,b)=>b[1]-a[1]).slice(0,20))console.log(String(v).padStart(4),k);
  console.log("ONLY_NONBUILD_PATHSET_COUNTS");for(const [k,v] of [...sets].sort((a,b)=>b[1]-a[1]))console.log(String(v).padStart(4),k);'
SUMMARY commits=300 paths_shown=282 build_capable=61 only_nonbuild=221 empty_or_merge=18 only_nonbuild_all=73.67% only_nonbuild_nonempty=78.37%
TOP_LEVEL commits_touching
 212 .claude
  70 tests
  38 tools
  36 src
   6 package.json
   3 docs
   2 vite.config.ts
   2 fixtures
   1 BUILD-PLAN.md
   1 playwright.config.ts
   1 .ai
   1 vitest.config.ts
ONLY_NONBUILD_PATHSET_COUNTS
 210 .claude
   8 tests
   1 playwright.config.ts,tests
   1 .ai
   1 .claude,tests
```

**VERIFIED—LOCAL interpretation:** this unusually `.claude`-heavy window says 221/300 commits would be reusable under a content-only fine-grained key **if** output did not contain HEAD. With HEAD included, all new commits miss even when their tree is identical, so a closure walker buys only hits for uncommitted edits outside its closure. A whole-tree key chiefly costs misses while editing tests/plans/docs that do not currently feed the artifact; the production build time, not the 0.03 s Git inventory, dominates.

### 3.4 Are `tests/**`, `.claude/**`, or unimported Markdown safe exclusions?

**VERIFIED—PRIMARY:** Vite's default application entry is `index.html`; referenced modules/assets form the bundle; `publicDir` is copied. But its JavaScript config can change root, public directory, Rollup inputs, plugins, and arbitrary build behavior. Vite also searches configuration such as PostCSS config. [Vite 7.3.6 build guide](https://github.com/vitejs/vite/blob/v7.3.6/docs/guide/build.md), [shared options, current docs](https://vite.dev/config/shared-options.html)

**VERIFIED—LOCAL:** Markdown is demonstrably unsafe as a class: production source has 30 unique `docs/**?raw` inputs, and 67 unique `drizzle/**?raw` inputs:

```text
$ rg -o "(?:docs|drizzle)/[^'\"?]+\?raw" src |
    sed 's#^.*:\(docs\|drizzle\)/#\1/#' | sed 's/?raw$//' |
    sort -u | cut -d/ -f1 | sort | uniq -c
     30 docs
     67 drizzle
```

**VERIFIED—LOCAL conclusion:** without parsing/executing the config or enforcing a sandbox, Vite documentation cannot prove that `tests/**` or `.claude/**` will never be read by a future plugin/config. The only defensible small exclusions are directories contractually owned by generated outputs/caches/dependencies: `dist/`, root `.tmp*`, `coverage/`, `playwright-report/`, `test-results/`, and `node_modules/`. Even those are safe because the wrapper defines and enforces their role, not because Vite makes arbitrary reads impossible. For the strongest simple design, test and `.claude` edits should miss.

## 4. Q1 — incremental / partial rebuild

**VERIFIED—PRIMARY (Vite 7.3.6):** `build.watch` / `vite build --watch` starts a long-running watcher and rebuilds when bundled files change. Vite's production build uses Rollup in this installed version. [Vite 7.3.6 build guide](https://github.com/vitejs/vite/blob/v7.3.6/docs/guide/build.md), [Vite 7.3.6 build options](https://github.com/vitejs/vite/blob/v7.3.6/docs/config/build-options.md)

**VERIFIED—PRIMARY:** Rollup's `cache` option accepts the previous bundle object and speeds a subsequent build by reanalyzing only changed modules; the documented example holds that object in the running JavaScript process. Rollup documents no stable serialization/disk format for carrying it across fresh gate or dev-server processes. [Rollup configuration `cache`, current `master`, accessed 2026-09-14](https://github.com/rollup/rollup/blob/master/docs/configuration-options/index.md)

**VERIFIED—PRIMARY:** esbuild's long-running `context` API retains parsed files in memory for `rebuild()` and watch use; the docs describe it as useful in development. That API is not a persistent Vite/Rollup production-output cache. [esbuild API, current docs, accessed 2026-09-14](https://esbuild.github.io/api/)

**VERIFIED—PRIMARY/LOCAL:** Rolldown Vite is a separate, experimental `rolldown-vite` package requiring an alias; this lockfile contains Vite 7.3.6 with Rollup 4.62.2. [Vite 7 Rolldown guide, accessed 2026-09-14](https://v7.vite.dev/guide/rolldown)

```text
$ node -e "const p=require('./package-lock.json').packages; for (const n of ['node_modules/vite','node_modules/typescript','node_modules/rollup','node_modules/esbuild']) console.log(n,p[n]?.version)"
node_modules/vite 7.3.6
node_modules/typescript 5.9.3
node_modules/rollup 4.62.2
node_modules/esbuild 0.28.1
```

**VERIFIED—PRIMARY/LOCAL:** `tsc -b` already has incremental project-reference state. TypeScript 5.6 made `.tsbuildinfo` emission unconditional for build mode, and both local referenced configurations set `/tmp/...tsbuildinfo` paths. [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references), [TypeScript 5.6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html)

```text
$ rg -n 'tsBuildInfoFile|noEmit' tsconfig.app.json tsconfig.node.json
tsconfig.app.json:15:    "tsBuildInfoFile": "/tmp/dnd-multiclass-spells-static-app.tsbuildinfo",
tsconfig.app.json:16:    "noEmit": true,
tsconfig.node.json:14:    "tsBuildInfoFile": "/tmp/dnd-multiclass-spells-static-node.tsbuildinfo",
tsconfig.node.json:15:    "noEmit": true,
```

**VERIFIED—PRIMARY answer to Q1:** there is no supported persistent, per-file production-artifact cache in this Vite 7.3.6/Rollup stack. A continuously running watch build can reuse an in-memory module cache, but emitted chunk names, imports, manifests, service-worker precache data, and plugin outputs form one coherent artifact and can cascade when one module changes. Across independent gate/restart processes, the practical cache unit is the complete `dist/`. `tsc -b` can remain incrementally cached separately. Migrating to webpack's filesystem cache or another bundler would be a toolchain redesign, not a feature to add to this wrapper.

## 5. Q2 — recursive / Merkle fingerprints

**VERIFIED—PRIMARY:** Git tree objects recursively store entry mode, name, and blob/subtree object ID; this is a Merkle tree. `git write-tree` writes a tree from the current index, `<rev>:<path>` selects a subtree, and `git diff-tree` compares two trees and can print names/statistics. [Git objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects), [`git-write-tree`, last updated for Git 2.50.0 on 2025-06-16](https://git-scm.com/docs/git-write-tree), [gitrevisions](https://git-scm.com/docs/gitrevisions), [`git-diff-tree`](https://git-scm.com/docs/git-diff-tree)

### 5.1 HEAD fingerprints

**VERIFIED—LOCAL:** the repository and requested directories have these fingerprints:

```text
$ git rev-parse HEAD; git rev-parse 'HEAD^{tree}'; git ls-tree HEAD src drizzle docs public tools
fdcd0c445525caf82619fab04f3037e416c2e3b1
9ab0a310f8cf371d22e5c7cafa7202ab370b028c
040000 tree f84de62ad3a5460b81650fe5cb4d08a2be59023b docs
040000 tree 09e49101d60196310cd118bb13d9745a827a4835 drizzle
040000 tree 4098ca3886eb37592aeeeaeb50d029c1d90517bf public
040000 tree dbe31f01d8745984e4f3a7dc7f17e9c5242a3e84 src
040000 tree 3e949a0eddc9dc8a3e1eafd03f45f69ba4a3258b tools
```

### 5.2 Dirty-tree proof with an isolated temporary index

**VERIFIED—LOCAL:** I added one temporary line to `README.md`, created a temporary index, and restored the file afterward with a patch. The real index tree remained unchanged; only `README.md` appeared in the tree diff:

```text
$ git status --short
 M README.md
$ git write-tree
9ab0a310f8cf371d22e5c7cafa7202ab370b028c
$ task_tmp=$(mktemp -d /tmp/build-cache-merkle.XXXXXX)
$ GIT_INDEX_FILE="$task_tmp/index" git read-tree HEAD
$ /usr/bin/time -f 'elapsed=%e sec user=%U sys=%S maxrss=%M KB' sh -c \
    'GIT_INDEX_FILE="$1" git add -A && GIT_INDEX_FILE="$1" git write-tree' sh "$task_tmp/index"
19dae6a1b3784b3dd8b9b564543d0ba040c6d9e6
elapsed=6.05 sec user=4.52 sys=1.52 maxrss=25620 KB
$ git diff-tree --no-commit-id --name-status -r 9ab0a310f8cf371d22e5c7cafa7202ab370b028c 19dae6a1b3784b3dd8b9b564543d0ba040c6d9e6
M       README.md
$ git diff-tree --stat 9ab0a310f8cf371d22e5c7cafa7202ab370b028c 19dae6a1b3784b3dd8b9b564543d0ba040c6d9e6
 README.md | 1 +
 1 file changed, 1 insertion(+)
$ git status --short; git write-tree
 M README.md
9ab0a310f8cf371d22e5c7cafa7202ab370b028c
```

**VERIFIED—LOCAL:** after the experiment was reverted, `git status --short` again produced no output. The measured 6.05 s is a cold full `git add -A` snapshot of roughly 11.5k files; it is much slower than using existing clean blob IDs plus hashing only dirty files.

### 5.3 “Where changed at a glance”

**VERIFIED—PRIMARY/LOCAL:** `git ls-tree <tree>` is already the per-directory fingerprint table. Compare root entries from the two tree IDs; unequal subtree IDs identify changed top-level directories, then recurse only into those. `git diff-tree -r --name-status` gives exact leaves, while `--stat` or `--dirstat=files,0,cumulative` gives a human summary. In the proof, every requested subtree ID stayed constant and only the root `README.md` blob changed:

```text
$ git ls-tree 19dae6a1b3784b3dd8b9b564543d0ba040c6d9e6 src drizzle docs public tools README.md
040000 tree f84de62ad3a5460b81650fe5cb4d08a2be59023b docs
040000 tree 09e49101d60196310cd118bb13d9745a827a4835 drizzle
100644 blob 0d0081a3ed0013188454b3c4eed0093401f6bae9 README.md
040000 tree 4098ca3886eb37592aeeeaeb50d029c1d90517bf public
040000 tree dbe31f01d8745984e4f3a7dc7f17e9c5242a3e84 src
040000 tree 3e949a0eddc9dc8a3e1eafd03f45f69ba4a3258b tools
```

**VERIFIED—LOCAL answer to Q2:** yes. Use Git trees for a diagnostic Merkle view and exact change localization. For the latency-sensitive key, reuse index blob IDs plus dirty overlays; optionally print the changed top-level paths on a miss. A normal temporary-index tree excludes ignored files, so the cache key must retain the separate ignored/env-file treatment from section 3.

## 6. Recommendation

### 6.1 One design

**VERIFIED—LOCAL recommendation:** replace input classes, closure walking, and config grammar with **repository-wide Git inventory + strict execution inputs**. It is fully automatic for config/source changes: editing any config syntax or adding any non-output repository file changes the key; there is no reviewed fingerprint constant to update.

**VERIFIED—LOCAL exact key composition, in this order:** feed each field through the existing length-framed SHA-256 helper.

1. Literal schema/version: `dnd-dist-build-cache-v2`.
2. Repository/execution-location identity: 40-byte `git rev-parse HEAD` result and canonical checkout root. Hashing the root sacrifices cross-worktree hits but closes `process.cwd()`/absolute-config-path output differences; a future hermetic fixed build root could replace it.
3. Tool/runtime identity: exact `process.version`, `process.platform`, `process.arch`, npm version, and build command/config-loader mode.
4. Dependency identity: raw SHA-256 of `package-lock.json` (also present in the Git stream) and a verified `npm ci` install-stamp identity. If the install cannot be trusted as immutable and matching, bypass the cache.
5. Strict child environment: sorted `name=value` records for **every** allowed value, including fixed values; initially `NODE_ENV=production`, controlled `PATH`, locale/TZ, synthetic `HOME`, npm config paths, and declared `STATIC_APP_CACHE_DIR`. No parent spread and no output-affecting pass-through values.
6. Tracked/index stream: raw NUL records from `git ls-files -s -z`, preserving path, mode, object ID, and stage.
7. Dirty/nonignored overlay: `git status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none`; for each record, sorted by raw path, frame status, old/new paths, current mode, and `git hash-object --no-filters` of every extant path; frame deletion explicitly.
8. Ignored inputs: raw records from `git ls-files -z --others --ignored --exclude-standard` with Git pathspec exclusions for the enforced output/cache/dependency roots below, then hash path, mode, and raw content. Independently probe the four Vite env paths so a future ignore-rule change cannot omit them.
9. Exclusion contract, itself versioned in field 1: `dist/`, `node_modules/`, `tmp/`, `.vite/`, `.vitest/`, `coverage/`, `playwright-report/`, `test-results/`, `reports/`, `.stryker-tmp*/`, and root generated `.tmp*` paths. Do not exclude `tests/`, `.claude/`, `docs/`, or `*.md`. The wrapper must reject symlinks that enter an excluded root from an included path.

**VERIFIED—LOCAL exact Git command set:** run with `--no-optional-locks` where supported and parse NUL, never lines:

```sh
git rev-parse HEAD
git ls-files -s -z
git status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none
git ls-files -z --others --ignored --exclude-standard -- . \
  ':(exclude,glob)node_modules/**' ':(exclude,glob)dist/**' \
  ':(exclude,glob)tmp/**' ':(exclude,glob).vite/**' ':(exclude,glob).vitest/**' \
  ':(exclude,glob)coverage/**' ':(exclude,glob)playwright-report/**' \
  ':(exclude,glob)test-results/**' ':(exclude,glob)reports/**' \
  ':(exclude,glob).stryker-tmp*/**' ':(exclude,glob).tmp*/**'
git hash-object --no-filters -- <dirty-or-untracked-path>
git ls-files -v                         # bypass on assume-unchanged/skip-worktree
git submodule status                    # bypass unless submodule dirtiness is fully keyed
```

**VERIFIED—LOCAL race policy:** calculate the key before lookup. On a miss, build under the strict child environment, calculate the key again, and store only if identical; otherwise discard the candidate and retry once or leave the real `dist/` uncached. On a hit, restore the immutable generation, verify its stored `dist` SHA-256 as v1 already does, and optionally recheck the input key before serving. Errors and uncertainty are fail-open-to-build, never fail-open-to-hit.

**VERIFIED—LOCAL hermetic boundary:** the wrapper should set a synthetic empty `HOME`, explicit npm config paths, local tool paths, and no network-dependent build behavior. It should reject unsupported filesystem objects and included symlinks that resolve outside the repository or into an excluded root. `node_modules` must be a fresh/immutable `npm ci` product or the cache must bypass. These are required for the phrase “never serves stale output”; Git hashing alone cannot police arbitrary host I/O.

### 6.2 HEAD, pointer, messages, and implementation size

**VERIFIED—LOCAL:** keep HEAD in the key. `vite.config.ts:114` emits it, and the service-worker plugin subsequently derives deployable-asset state; post-restore restamping is not a harmless one-file rewrite. The plugin order and later scan are explicit:

```text
$ nl -ba vite.config.ts | sed -n '167,183p;317,320p'
167     writeBundle() {
174       const shellAssets = deployableAssets(outputDirectory);
175       const cacheName = appShellCacheName(shellAssets);
180       writeFileSync(
181         join(outputDirectory, 'service-worker.js'),
182         serviceWorkerSource(cacheName, urls),
183       );
317 const shared = {
318   ...core,
319   plugins: [...core.plugins, bundledLicenseTexts(), vttHandoffArtifactStamp(), appShellServiceWorker()],
320 };
```

**VERIFIED—LOCAL:** a new commit with an identical tree must therefore miss unless the build is redesigned so every HEAD-derived output (including downstream hashes/manifests) is deterministically regenerated after restore.

**VERIFIED—LOCAL recommendation:** retain v1's good storage pattern: pointer at `${tmpdir()}/dnd-dist-build-cache-v2/pointers/<input-sha256>.json`; pointer names a unique immutable generation plus its `dist` digest; build/copy to `.partial`, rename the generation, then atomically rename the pointer. Suggested output:

```text
dist cache hit: <key> (HEAD <short>, verified <dist-digest-short>)
dist cache miss: <reason> (key <key>); running production build
dist cache stored: <key> (generation <id>)
dist cache bypass: <failed-precondition>; running production build
```

**VERIFIED—LOCAL estimate:** key computation should be about 100–140 lines of Node: spawn wrapper, NUL parsers, exclusion predicate, `lstat`/hash records, strict-env builder, and framed SHA-256. Cache restore/store remains separate existing logic. This is materially smaller than an import resolver or JavaScript grammar because it never interprets config code.

### 6.3 Required tests / named mutants

| Mutant | Required result |
|---|---|
| **VERIFIED—LOCAL:** edit tracked `src/**`, `vite.config.ts` in any syntactic form, a `docs/**?raw` file, or `drizzle/**`; delete/rename/chmod a tracked input | Miss. |
| **VERIFIED—LOCAL:** add an untracked nonignored file under `src/` | Miss, even before import; removal misses again. |
| **VERIFIED—LOCAL:** change declared `STATIC_APP_CACHE_DIR` | Miss because its value is hashed. |
| **VERIFIED—LOCAL:** change arbitrary undeclared parent env | Key stays equal **and** output stays equal because the variable is absent from the child. Add a fixture config that attempts the read and asserts `undefined`. |
| **VERIFIED—PRIMARY/LOCAL:** create/edit `.env.production` or `.env.production.local`, including after temporarily adding an ignore rule | Miss via nonignored/ignored inventory plus explicit Vite-env probes. Vite production mode reads these files. [Vite env docs](https://github.com/vitejs/vite/blob/main/docs/guide/env-and-mode.md) |
| **VERIFIED—LOCAL:** edit `tests/**`, `.claude/**`, or otherwise “unimported” Markdown | Miss under the recommended no-questionable-exclusions policy. |
| **VERIFIED—LOCAL:** edit `dist/**`, `coverage/**`, report output, or root `.tmp*` | Key unchanged; a hit overwrites/restores `dist` only after cache-generation digest verification. Assert exclusions cannot escape via symlink. |
| **VERIFIED—LOCAL:** same tree, new commit | Miss because HEAD is emitted. Assert the restored artifact's commit equals `git rev-parse HEAD`. |
| **VERIFIED—LOCAL:** Node/npm/platform, lockfile, or allowed env value changes | Miss. |
| **VERIFIED—LOCAL:** manually mutate `node_modules` after a trusted install | Wrapper must detect an invalid/untrusted install and bypass, or this test documents that immutable install storage is an enforced prerequisite. Never report a hit under uncertainty. |
| **VERIFIED—LOCAL:** corrupt pointer/generation/dist file | Verification failure, real build, no stale serve. |
| **VERIFIED—LOCAL:** modify an input during the build | Pre/post keys differ; do not store under the old key. |
| **VERIFIED—LOCAL:** set assume-unchanged/skip-worktree or dirty a submodule | Explicit bypass until fully supported. |

### 6.4 Trade-offs

| Design | Automatic coverage | Hit rate / cost | Stale-output risk | Verdict |
|---|---|---|---|---|
| Hand-declared directories (v1/status quo in clone) | **VERIFIED—LOCAL:** no; humans must remember every new input class. | Fast; best hits for edits elsewhere. | **VERIFIED—LOCAL:** high when a reachable file is omitted; current list excludes entire `drizzle/` and most `docs/`. | Reject. |
| Closure walker + config AST grammar | **RECALLED—BRIEF:** attempts fine-grained discovery, but arbitrary config behavior is not statically classifiable by the bespoke grammar. | More code/work; best theoretical dirty-worktree hit rate. | Repeated accepted-program false hits; manual fingerprint fallback violates automaticity. | Reject. |
| Whole Git tree, nonignored only | **VERIFIED—LOCAL:** automatic for tracked and ordinary untracked files. | About 0.03 s clean inventory here; misses on every repository edit and every HEAD change. | Ignored Vite env/data, ambient env, mutable dependencies, and external I/O remain holes. | Insufficient alone. |
| Whole repository inventory + safe output exclusions + strict environment/dependency contract | **VERIFIED—LOCAL/PRIMARY:** automatic for every config/source form and relevant ignored env/data without program parsing. | Same fast clean tracked path; hashes only dirty/ignored extras; test/plan edits miss. HEAD already prevents cross-commit reuse. | No stale hit within the stated contract; uncertain dependency/external state forces bypass. | **Recommend.** |

**VERIFIED—LOCAL final answer:** Q1 is “not persistently, with this Vite production stack; cache complete `dist/`.” Q2 is “yes; Git tree IDs already are recursive fingerprints, and a temporary index proves the dirty-tree variant, but use the faster index-plus-dirty overlay in the hot path.” The simplest reliable redesign is deliberately coarse: hash the repository state and HEAD, hash and scrub the declared environment, enforce dependency/external-I/O boundaries, verify cache generations, and rebuild on every ambiguity.

RESEARCH DONE
