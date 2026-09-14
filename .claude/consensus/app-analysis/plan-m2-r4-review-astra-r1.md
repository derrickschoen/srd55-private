# M-2 plan r4 review r1 (astra 01a0a102-b520-7f62-a7fa-dd71b328fa4c) on plan sha 6098a213…, harvested 2026-09-14 14:05

**REJECT PLAN M2 R4.** The Git-based direction is appropriate, but this revision has stale-hit routes and two incomplete acceptance proofs.

Verified:

- Plan: **591 lines, 28,909 bytes**, SHA-256 `6098a2130a93e810e0f6f92980fef496567c7fa53152fe54def2cc8a1a44edb8`.
- HEAD: `fdcd0c445525caf82619fab04f3037e416c2e3b1`; branch: `claude/build-cache`.
- Frozen contract SHA-256 matches `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Final `git status --short --untracked-files=all`: **empty**.
- No files written, builds, test runs, model calls, or port access.

**PR4-F1 — P1 — Ignored public files are unkeyed production inputs.**  
[Plan:24](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:24), also :126–127.

Probe:

```sh
git check-ignore -v -- public/proof.tsbuildinfo public/.tmp-cache-proof.txt
```

Output:

```text
.gitignore:12:*.tsbuildinfo public/proof.tsbuildinfo
.gitignore:32:.tmp-*       public/.tmp-cache-proof.txt
```

Reading Vite 7.3.6’s `node_modules/vite/dist/node/chunks/config.js` establishes:

- :33445 defaults `copyPublicDir` to `true`.
- :33412 calls `copyDir(publicDir, outDir)`.
- :2173–2182 copies directory entries without consulting Git ignores.

Consequently, adding either file after caching leaves every planned key field unchanged, while a real production build copies new bytes into `dist/`. There are currently **98 public files** and **zero ignored files under public/src/docs**; this is a proven reachable omission, not a claim that such an omitted file already exists.

**Minimal change:** include ignored `public/**` files through Git enumeration and content hashing, with an ignored-public-file regression. This is a locally justified exception to D1’s ignored-file restriction.

**PR4-F2 — P1 — Locale affects emitted service-worker bytes but is passed unhashed.**  
[Plan:176](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:176).

The requested search:

```sh
rg -n 'Date|toLocale|Intl|localeCompare|process\.cwd|tmpdir|random' \
  vite.config.ts tools/pwa tools/licenses tools/ai-bridge
```

finds `tools/pwa/service-worker.ts:19`, where `appShellVersion()` sorts filenames using default-locale `localeCompare()`.

I invoked that actual helper read-only under `LANG=LC_ALL=en_US.UTF-8` and `da_DK.UTF-8`, using these two assets:

```js
[
  { fileName: 'assets/index-aaa.js', source: 'a' },
  { fileName: 'assets/index-az.js', source: 'z' },
]
```

| Locale | Order | Actual helper result |
|---|---|---|
| en-US | `aaa`, `az` | `1ed55b4e6ef4a643` |
| da-DK | `az`, `aaa` | `456c40d44eed648a` |

The current **98 public assets alone** produced the same `a9e553edbf7c5705` in all four tested locales; they do not include generated Rollup chunks. The two-asset control nevertheless proves the production helper’s output dependency.

**Minimal change:** hash the passed `LANG` and `LC_ALL` values, distinguishing absent from present. Add this locale-sensitive control. This local proof justifies departing from D2. No build-time date formatting or TZ-dependent output was found in the requested files.

**PR4-F3 — P1 — Batch dirty-file hashing; individual spawns are materially slower.**  
[Plan:111](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:111), :125.

Exact benchmark:

```bash
mapfile -d '' review_hash_paths < <(
  git ls-files -z -- 'art/requests/*.json'
)
review_hash_paths=("${review_hash_paths[@]:0:85}")

for review_trial in 1 2 3; do
  time for review_hash_path in "${review_hash_paths[@]}"; do
    git hash-object --no-filters -- "$review_hash_path" > /dev/null
  done
  time printf '%s\n' "${review_hash_paths[@]}" |
    git hash-object --no-filters --stdin-paths > /dev/null
done
```

These **85 files total 259,981 bytes**.

| Trial | Sequential | Batch |
|---|---:|---:|
| 1 | 112 ms | 2 ms |
| 2 | 103 ms | 2 ms |
| 3 | 102 ms | 2 ms |

Both output streams had SHA-256:

```text
2de5e52dfd867349a33260010beabce7b541121fea8b483c9f60f61778e94f08
```

**Minimal change:** hash extant paths in batches. `--stdin-paths` is **line-delimited**, not NUL-delimited: preserve the newline/tab filename tests using Git-compatible quoting, or use bounded argument batches.

Also, `--untracked-files=all` enumerates every file in an unignored scratch directory. The **64 MiB buffer limits captured output, not traversal time**. Document this cost and use a timeout if claiming bounded probe duration.

**PR4-F4 — P1 — The named DROP_HEAD mutant can survive its named test.**  
[Plan:218](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:218), :238.

Reading :133–138 shows an independent pointer/artifact HEAD check. Therefore removing only `frame(head)` can still produce:

1. Same key after the new commit.
2. Rejection of the old generation because its HEAD differs.
3. A rebuild stamped with the new HEAD.
4. A subsequent successful HIT.

That satisfies the behavior currently specified at :218–219.

**Minimal change:** explicitly assert `keyBefore !== keyAfter` across identical-tree commits, separately from rebuild count and artifact validation.

The remaining eight mappings are sound in principle, subject to these fixture details:

| Mutant | Necessary killing observation |
|---|---|
| DROP_STATUS_OVERLAY | Unstaged edit, unchanged index, changed key |
| DROP_HASH_OBJECT | Two dirty byte states with identical mtime/status/mode |
| DROP_ENV_PROBES | Ignore rule established before the baseline |
| SPREAD_PARENT_ENV | Exact environment-helper assertion |
| SKIP_POST_BUILD_RECHECK | No pointer published after the child edits an input |
| ACCEPT_STALE_INSTALL | BYPASS and zero pointer access |
| IGNORE_DELETIONS | Unstaged deletion, unchanged index |
| UNSORTED_OVERLAY | Synthetic permutations reach the production canonicalizer |

These are design assessments, not executed mutation tests.

**PR4-F5 — P1 — The four-build proof does not edit a raw-import input.**  
[Plan:316](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:316).

Probe:

```sh
rg -n 'docs/srd/SOURCE.md' src
```

Output contains only comments:

```text
src/rules/weapons-srd.ts:13
src/rules/origins-srd.ts:14
src/rules/armor-srd.ts:14
```

`git ls-files -- docs/srd/SOURCE.md` confirms it is tracked. It is **not** the required `?raw` input.

A suitable proven alternative:

```sh
rg -n '\.md\?raw' src
```

```text
src/ui/screens/player-guide/screen.ts:1:
import playerGuideMarkdown from '../../../../docs/guides/player-build-and-share.md?raw';
```

**Minimal change:** edit and restore that imported Markdown file; additionally verify the marker reaches emitted bytes.

The shell mechanics otherwise look correct: `set -euo pipefail` propagates npm failures through `tee`; the EXIT trap restores the backup; the unique `TMPDIR` provides a cold cache; the fourth invocation correctly supplies ambient `FOO=bar`. On a correct implementation, the current script could pass while proving only broad docs invalidation. The fresh install does not obstruct it; no four-build execution was permitted.

**PR4-F6 — P1 — Clean tracked symlinks can hide changing target contents.**  
[Plan:94](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:94), :124–125.

`git ls-files -s -z` currently contains **zero mode-120000 entries**. Nevertheless, the plan explicitly supports symlinks.

For a clean tracked symlink, the index identifies the link text; no dirty overlay is produced when only an external or ignored target changes. Vite’s `copyDir()` follows targets through `statSync()` and `copyFileSync()`. A tracked link under `public/` therefore supplies an immediate stale-hit route without changing Vite configuration.

**Minimal change:** BYPASS on indexed or dirty symlinks. That is substantially simpler than target traversal and closes this route without resurrecting a walker.

**PR4-F7 — P1 — npm can reintroduce NODE_OPTIONS from unhashed host configuration.**  
[Plan:184](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:184).

Installed npm source inspection:

```sh
rg -n 'NODE_OPTIONS|node-options' \
  /home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/npm/node_modules/@npmcli/config/lib/set-envs.js
```

Output:

```text
102:  if (cliConf['node-options']) {
103:    env.NODE_OPTIONS = cliConf['node-options']
```

Passing the real HOME leaves user npm configuration available. Changing its `node-options` to load an external module can change child behavior while all planned key fields remain fixed. The environment-listing probe establishes today’s values, not an enforced restriction on future npm configuration.

**Minimal change:** neutralize external user/global npm configuration for the build child with explicit controlled npm configuration paths, while retaining tracked project configuration. Test that host configuration cannot reintroduce an undeclared variable. Document fixed npm overrides as part of the environment contract.

The requested `rg -n 'NODE_OPTIONS' scripts tools package.json` returned **no matches**. Dropping the parent variable is therefore compatible with the inspected gate invocations.

**PR4-F8 — P2 — “Content” must be qualified for Git normalization.**  
[Plan:9](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:9), :94.

Exact read-only control:

```sh
printf 'cache-proof\n' |
  git -c core.autocrlf=true hash-object --path=src/cache-proof.txt --stdin
printf 'cache-proof\r\n' |
  git -c core.autocrlf=true hash-object --path=src/cache-proof.txt --stdin
printf 'cache-proof\n' | git hash-object --no-filters --stdin
printf 'cache-proof\r\n' | git hash-object --no-filters --stdin
```

Outputs:

```text
a64c7fa441cf483efdc123f8965eec30a31d88af
a64c7fa441cf483efdc123f8965eec30a31d88af
a64c7fa441cf483efdc123f8965eec30a31d88af
4ab14c5c187c2934b6bd13a83123429de969146f
```

Clean normalized files can share index identities despite different raw bytes. No tracked `.gitattributes` or matching `core.autocrlf`/filter configuration was found here.

**Minimal change:** state and enforce the normalization boundary—BYPASS when unsupported normalization is active, or hash affected raw contents. The Sol report explicitly identifies this qualification.

**PR4-F9 — P2 — Hidden-lock matching is useful, but not proof of installed bytes.**  
[Plan:76](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:76), :586.

Applying the plan’s exact `allows()` predicate to the actual JSON files produced:

| Measurement | Result |
|---|---:|
| Root package entries, excluding `""` | 376 |
| Entries with `os` arrays | 109 |
| Entries with `cpu` arrays | 106 |
| Entries with `libc` | 0 |
| Eligible / hidden packages | **273 / 273** |
| Missing / extra / version mismatches | **0 / 0 / 0** |
| `any` / negative qualifier cases | 0 / 0 |

Hidden SHA-256 matches the plan:

```text
105f6967c08bcab6df88805b0cea2184f8a46fefb0161d1cf880b20f238cfbc9
```

An in-memory change to `ws`’s root-lock `resolved` and `integrity`, preserving version, still classified as matching. Editing installed package files without changing the hidden lock is also outside this check.

**Minimal change:** compare available `resolved`/`integrity` identities and describe immutable, npm-managed dependencies as a prerequisite. Replace the unconditional “never” claim.

Keep the small platform filter: it removes **103** legitimately uninstalled entries. Plain set equality would reject this fresh install; raw lock equality cannot work either (**193,670 versus 141,080 bytes**). A remembered hidden-lock SHA needs an independently established matching-install event and does not detect later package-file edits, so it is not a simpler substitute.

**PR4-F10 — P2 — Preserve the existing nonmutation assertions explicitly.**  
[Plan:199](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:199).

HEAD’s rewritten test also asserts:

```ts
expect(childEnv).not.toBe(parentEnv);
expect(parentEnv.NODE_ENV).toBe('development');
```

The plan specifies the new allowlist assertions but does not explicitly retain these independent invariants.

**Minimal change:** carry both assertions into the replacement. The changed variable-preservation expectation is correctly labelled as the one deliberate semantic rewrite; these two assertions need no weakening.

The temporary-repository integration seam is feasible: its `package.json` can define `build:dist:validated` as a tiny Node script that imports fixture `vite.config.mjs`, records observations, and writes an artifact stamped from fixture HEAD. Start the cold build with the undeclared variable already set. An injected callback is useful for orchestration cases but cannot substitute for this subprocess environment test.

The remaining requested checks establish the following:

- **Ignore audit:** generated/dependency rules are `node_modules/`, `node_modules`, `tmp/`, `.vite/`, `.vitest/`, `dist/`, `test-results/`, `playwright-report/`, `reports/*`, `.stryker-tmp*/`, `*.tsbuildinfo`, `.build-lock/`, `.plan-lock/`, `.worktrees/`, `.codex-locks/`, `.wave-lock/`, `.tmp/`, `.tmp-*`, `__pycache__/`, `.vtt-soak-out/`, and `dnd-slim-runs/`. Other rules cover orchestration state/verdicts/logs, `scraped/`, the Discord `.env`, BG3 notes, incoming art, and screenshots. Exceptions retain `reports/module-state-census.json` and `art/incoming/README.md`. None names a conventional root PostCSS/Browserslist config. **`coverage/` is not ignored here.** Unanchored rules explain PR4-F1.
- **Root configurations:** `git ls-files -- 'postcss.config.*' 'tsconfig*.json' '.browserslistrc' 'package.json'` returns `package.json` and all three tsconfigs. Contrary to the question’s premise, PostCSS configs and `.browserslistrc` are **absent, not tracked**. Ordinary creation would enter the untracked overlay.
- **Tracked but ignored:** `git ls-files -ci --exclude-standard` returns exactly `orchestration/wave-state`, `reports/mutation/mutation.json`, and `reports/perf/fullsuite-sql/sql-profile.json`. The planned real-index inventory retains all three.
- **Vite optimizer:** installed Vite is **7.3.6**. Its resolver at `config.js:32558` enables dependency-optimizer resolution only when `environment.mode === "dev"`. The production build does not consume that optimizer cache. Changing its contents is not a demonstrated production-output dependency.
- **Actual config effects:** `process.cwd()` selects HEAD, derives the default cache-directory name, and supplies development filesystem permissions. `tmpdir()` selects temporary storage. Bridge randomness, temporary directories, and timers occur in development/request functions; `aiBridge()` is not instantiated for production. No current output use of host time or randomness was found. Arbitrary future external reads remain outside Git inventory; opaque config hashing is not filesystem isolation.
- **Git grammar:** Git **2.34.1**’s `git status --help` confirms `XY`, `??`, NUL terminators, unquoted path bytes, and reversed rename endpoints. The plan’s grammar is correct; consume the extra path slot when either status byte indicates rename/copy.
- **Environment probe:** the exact `env -i … NODE_ENV=production npm run env` command at plan :515–517 reproduced `NODE`, forced `NODE_ENV`, and all **11** listed `npm_config_*` names/values. npm also constructs lifecycle/package/path variables internally; they need no ambient inheritance.
- **Clean-key probe:** **11,504 records**, **1,657,692 index bytes**, **0 status bytes**, **0 special-index entries**, **0 submodules**; all four env files are absent and nonignored. The plan’s probe reproduced key `f3c2f5e00c493e36e1e46c5ee3369946aa2950b5477f5b9a790b2cd13e566b37` in **82.298 ms**. The only adaptation was Git subprocess `stdio: ['ignore','pipe','inherit']`; this sandbox returned `EPERM` with the default unused stdin pipe.
- **Discovery:** `npx vitest list --configLoader runner --filesOnly --json` returned an array of **641 files**.
- **Size:** ≤150 lines for the key/verdict remains plausible. ≤230 total is an aggressive, unproven target once restore/store validation is included. The platform predicate earns its complexity; no AST, walker, or install-stamp subsystem is warranted.

Explicit reconciliation:

| Decision/report point | Assessment |
|---|---|
| D1 | Composition followed, but ignored public inputs need the locally proved exception. |
| D2 | Followed as written; locale and external npm configuration require evidence-backed corrections. |
| D3 | Followed: no extra Git-visible exclusions. |
| D4 | Planned bypasses, HEAD checks, and pre/post MISS checks conform. They do not provide transactional snapshots or eliminate edit-and-revert races. |
| D5 | Exact scripts conform; both direct callers remain compatible. |
| D6 | Print prefixes conform. |
| D7 | Single-module approach conforms; tighter 230-line target remains to be demonstrated. |
| Both reports’ agreement | Whole-dist caching, Git inventory, opaque config bytes, env scrub, HEAD, and verified generations are retained. |
| Sol differences | Root identity, stronger host isolation, ignored inputs, and symlink restrictions were omitted under supervisor reconciliation. The plan must acknowledge the remaining boundaries and the locally proved exceptions above. |
| Opus differences | Deferring exclusions and retaining HEAD are justified by D3 and the emitted commit stamp. No cross-commit hit-rate benefit is claimed incorrectly. |
| IB3 redesign requirement | Syntax-dependent omissions disappear for Git-visible inputs; undeclared ambient aliases are closed only to the extent that the child environment is actually controlled. |

| Dimension | Verdict |
|---|---|
| 1. Soundness | **FAIL** — ignored public files, symlinks; dependency/normalization qualifications |
| 2. Dirty overlay | **CHANGE REQUIRED** — grammar correct; batch hashing |
| 3. Environment contract | **FAIL** — locale and host npm configuration |
| 4. Test matrix | **FAIL** — DROP_HEAD masked; retain existing invariants |
| 5. Size and simplicity | **CONDITIONAL** — direction sound; total size unproven |
| 6. Four-build proof | **FAIL AS ACCEPTANCE PROOF** — selected file is not raw-imported |
| 7. Deviations | **REVISION REQUIRED** — document and apply the locally justified exceptions |

**REJECT PLAN M2 R4 — blocking: PR4-F1, PR4-F2, PR4-F3, PR4-F4, PR4-F5, PR4-F6, PR4-F7.**

M2 PLAN R4 REVIEW DONE
tokens used
121,196
**REJECT PLAN M2 R4.** The Git-based direction is appropriate, but this revision has stale-hit routes and two incomplete acceptance proofs.

Verified:

- Plan: **591 lines, 28,909 bytes**, SHA-256 `6098a2130a93e810e0f6f92980fef496567c7fa53152fe54def2cc8a1a44edb8`.
- HEAD: `fdcd0c445525caf82619fab04f3037e416c2e3b1`; branch: `claude/build-cache`.
- Frozen contract SHA-256 matches `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Final `git status --short --untracked-files=all`: **empty**.
- No files written, builds, test runs, model calls, or port access.

**PR4-F1 — P1 — Ignored public files are unkeyed production inputs.**  
[Plan:24](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:24), also :126–127.

Probe:

```sh
git check-ignore -v -- public/proof.tsbuildinfo public/.tmp-cache-proof.txt
```

Output:

```text
.gitignore:12:*.tsbuildinfo public/proof.tsbuildinfo
.gitignore:32:.tmp-*       public/.tmp-cache-proof.txt
```

Reading Vite 7.3.6’s `node_modules/vite/dist/node/chunks/config.js` establishes:

- :33445 defaults `copyPublicDir` to `true`.
- :33412 calls `copyDir(publicDir, outDir)`.
- :2173–2182 copies directory entries without consulting Git ignores.

Consequently, adding either file after caching leaves every planned key field unchanged, while a real production build copies new bytes into `dist/`. There are currently **98 public files** and **zero ignored files under public/src/docs**; this is a proven reachable omission, not a claim that such an omitted file already exists.

**Minimal change:** include ignored `public/**` files through Git enumeration and content hashing, with an ignored-public-file regression. This is a locally justified exception to D1’s ignored-file restriction.

**PR4-F2 — P1 — Locale affects emitted service-worker bytes but is passed unhashed.**  
[Plan:176](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:176).

The requested search:

```sh
rg -n 'Date|toLocale|Intl|localeCompare|process\.cwd|tmpdir|random' \
  vite.config.ts tools/pwa tools/licenses tools/ai-bridge
```

finds `tools/pwa/service-worker.ts:19`, where `appShellVersion()` sorts filenames using default-locale `localeCompare()`.

I invoked that actual helper read-only under `LANG=LC_ALL=en_US.UTF-8` and `da_DK.UTF-8`, using these two assets:

```js
[
  { fileName: 'assets/index-aaa.js', source: 'a' },
  { fileName: 'assets/index-az.js', source: 'z' },
]
```

| Locale | Order | Actual helper result |
|---|---|---|
| en-US | `aaa`, `az` | `1ed55b4e6ef4a643` |
| da-DK | `az`, `aaa` | `456c40d44eed648a` |

The current **98 public assets alone** produced the same `a9e553edbf7c5705` in all four tested locales; they do not include generated Rollup chunks. The two-asset control nevertheless proves the production helper’s output dependency.

**Minimal change:** hash the passed `LANG` and `LC_ALL` values, distinguishing absent from present. Add this locale-sensitive control. This local proof justifies departing from D2. No build-time date formatting or TZ-dependent output was found in the requested files.

**PR4-F3 — P1 — Batch dirty-file hashing; individual spawns are materially slower.**  
[Plan:111](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:111), :125.

Exact benchmark:

```bash
mapfile -d '' review_hash_paths < <(
  git ls-files -z -- 'art/requests/*.json'
)
review_hash_paths=("${review_hash_paths[@]:0:85}")

for review_trial in 1 2 3; do
  time for review_hash_path in "${review_hash_paths[@]}"; do
    git hash-object --no-filters -- "$review_hash_path" > /dev/null
  done
  time printf '%s\n' "${review_hash_paths[@]}" |
    git hash-object --no-filters --stdin-paths > /dev/null
done
```

These **85 files total 259,981 bytes**.

| Trial | Sequential | Batch |
|---|---:|---:|
| 1 | 112 ms | 2 ms |
| 2 | 103 ms | 2 ms |
| 3 | 102 ms | 2 ms |

Both output streams had SHA-256:

```text
2de5e52dfd867349a33260010beabce7b541121fea8b483c9f60f61778e94f08
```

**Minimal change:** hash extant paths in batches. `--stdin-paths` is **line-delimited**, not NUL-delimited: preserve the newline/tab filename tests using Git-compatible quoting, or use bounded argument batches.

Also, `--untracked-files=all` enumerates every file in an unignored scratch directory. The **64 MiB buffer limits captured output, not traversal time**. Document this cost and use a timeout if claiming bounded probe duration.

**PR4-F4 — P1 — The named DROP_HEAD mutant can survive its named test.**  
[Plan:218](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:218), :238.

Reading :133–138 shows an independent pointer/artifact HEAD check. Therefore removing only `frame(head)` can still produce:

1. Same key after the new commit.
2. Rejection of the old generation because its HEAD differs.
3. A rebuild stamped with the new HEAD.
4. A subsequent successful HIT.

That satisfies the behavior currently specified at :218–219.

**Minimal change:** explicitly assert `keyBefore !== keyAfter` across identical-tree commits, separately from rebuild count and artifact validation.

The remaining eight mappings are sound in principle, subject to these fixture details:

| Mutant | Necessary killing observation |
|---|---|
| DROP_STATUS_OVERLAY | Unstaged edit, unchanged index, changed key |
| DROP_HASH_OBJECT | Two dirty byte states with identical mtime/status/mode |
| DROP_ENV_PROBES | Ignore rule established before the baseline |
| SPREAD_PARENT_ENV | Exact environment-helper assertion |
| SKIP_POST_BUILD_RECHECK | No pointer published after the child edits an input |
| ACCEPT_STALE_INSTALL | BYPASS and zero pointer access |
| IGNORE_DELETIONS | Unstaged deletion, unchanged index |
| UNSORTED_OVERLAY | Synthetic permutations reach the production canonicalizer |

These are design assessments, not executed mutation tests.

**PR4-F5 — P1 — The four-build proof does not edit a raw-import input.**  
[Plan:316](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:316).

Probe:

```sh
rg -n 'docs/srd/SOURCE.md' src
```

Output contains only comments:

```text
src/rules/weapons-srd.ts:13
src/rules/origins-srd.ts:14
src/rules/armor-srd.ts:14
```

`git ls-files -- docs/srd/SOURCE.md` confirms it is tracked. It is **not** the required `?raw` input.

A suitable proven alternative:

```sh
rg -n '\.md\?raw' src
```

```text
src/ui/screens/player-guide/screen.ts:1:
import playerGuideMarkdown from '../../../../docs/guides/player-build-and-share.md?raw';
```

**Minimal change:** edit and restore that imported Markdown file; additionally verify the marker reaches emitted bytes.

The shell mechanics otherwise look correct: `set -euo pipefail` propagates npm failures through `tee`; the EXIT trap restores the backup; the unique `TMPDIR` provides a cold cache; the fourth invocation correctly supplies ambient `FOO=bar`. On a correct implementation, the current script could pass while proving only broad docs invalidation. The fresh install does not obstruct it; no four-build execution was permitted.

**PR4-F6 — P1 — Clean tracked symlinks can hide changing target contents.**  
[Plan:94](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:94), :124–125.

`git ls-files -s -z` currently contains **zero mode-120000 entries**. Nevertheless, the plan explicitly supports symlinks.

For a clean tracked symlink, the index identifies the link text; no dirty overlay is produced when only an external or ignored target changes. Vite’s `copyDir()` follows targets through `statSync()` and `copyFileSync()`. A tracked link under `public/` therefore supplies an immediate stale-hit route without changing Vite configuration.

**Minimal change:** BYPASS on indexed or dirty symlinks. That is substantially simpler than target traversal and closes this route without resurrecting a walker.

**PR4-F7 — P1 — npm can reintroduce NODE_OPTIONS from unhashed host configuration.**  
[Plan:184](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:184).

Installed npm source inspection:

```sh
rg -n 'NODE_OPTIONS|node-options' \
  /home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/npm/node_modules/@npmcli/config/lib/set-envs.js
```

Output:

```text
102:  if (cliConf['node-options']) {
103:    env.NODE_OPTIONS = cliConf['node-options']
```

Passing the real HOME leaves user npm configuration available. Changing its `node-options` to load an external module can change child behavior while all planned key fields remain fixed. The environment-listing probe establishes today’s values, not an enforced restriction on future npm configuration.

**Minimal change:** neutralize external user/global npm configuration for the build child with explicit controlled npm configuration paths, while retaining tracked project configuration. Test that host configuration cannot reintroduce an undeclared variable. Document fixed npm overrides as part of the environment contract.

The requested `rg -n 'NODE_OPTIONS' scripts tools package.json` returned **no matches**. Dropping the parent variable is therefore compatible with the inspected gate invocations.

**PR4-F8 — P2 — “Content” must be qualified for Git normalization.**  
[Plan:9](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:9), :94.

Exact read-only control:

```sh
printf 'cache-proof\n' |
  git -c core.autocrlf=true hash-object --path=src/cache-proof.txt --stdin
printf 'cache-proof\r\n' |
  git -c core.autocrlf=true hash-object --path=src/cache-proof.txt --stdin
printf 'cache-proof\n' | git hash-object --no-filters --stdin
printf 'cache-proof\r\n' | git hash-object --no-filters --stdin
```

Outputs:

```text
a64c7fa441cf483efdc123f8965eec30a31d88af
a64c7fa441cf483efdc123f8965eec30a31d88af
a64c7fa441cf483efdc123f8965eec30a31d88af
4ab14c5c187c2934b6bd13a83123429de969146f
```

Clean normalized files can share index identities despite different raw bytes. No tracked `.gitattributes` or matching `core.autocrlf`/filter configuration was found here.

**Minimal change:** state and enforce the normalization boundary—BYPASS when unsupported normalization is active, or hash affected raw contents. The Sol report explicitly identifies this qualification.

**PR4-F9 — P2 — Hidden-lock matching is useful, but not proof of installed bytes.**  
[Plan:76](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:76), :586.

Applying the plan’s exact `allows()` predicate to the actual JSON files produced:

| Measurement | Result |
|---|---:|
| Root package entries, excluding `""` | 376 |
| Entries with `os` arrays | 109 |
| Entries with `cpu` arrays | 106 |
| Entries with `libc` | 0 |
| Eligible / hidden packages | **273 / 273** |
| Missing / extra / version mismatches | **0 / 0 / 0** |
| `any` / negative qualifier cases | 0 / 0 |

Hidden SHA-256 matches the plan:

```text
105f6967c08bcab6df88805b0cea2184f8a46fefb0161d1cf880b20f238cfbc9
```

An in-memory change to `ws`’s root-lock `resolved` and `integrity`, preserving version, still classified as matching. Editing installed package files without changing the hidden lock is also outside this check.

**Minimal change:** compare available `resolved`/`integrity` identities and describe immutable, npm-managed dependencies as a prerequisite. Replace the unconditional “never” claim.

Keep the small platform filter: it removes **103** legitimately uninstalled entries. Plain set equality would reject this fresh install; raw lock equality cannot work either (**193,670 versus 141,080 bytes**). A remembered hidden-lock SHA needs an independently established matching-install event and does not detect later package-file edits, so it is not a simpler substitute.

**PR4-F10 — P2 — Preserve the existing nonmutation assertions explicitly.**  
[Plan:199](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:199).

HEAD’s rewritten test also asserts:

```ts
expect(childEnv).not.toBe(parentEnv);
expect(parentEnv.NODE_ENV).toBe('development');
```

The plan specifies the new allowlist assertions but does not explicitly retain these independent invariants.

**Minimal change:** carry both assertions into the replacement. The changed variable-preservation expectation is correctly labelled as the one deliberate semantic rewrite; these two assertions need no weakening.

The temporary-repository integration seam is feasible: its `package.json` can define `build:dist:validated` as a tiny Node script that imports fixture `vite.config.mjs`, records observations, and writes an artifact stamped from fixture HEAD. Start the cold build with the undeclared variable already set. An injected callback is useful for orchestration cases but cannot substitute for this subprocess environment test.

The remaining requested checks establish the following:

- **Ignore audit:** generated/dependency rules are `node_modules/`, `node_modules`, `tmp/`, `.vite/`, `.vitest/`, `dist/`, `test-results/`, `playwright-report/`, `reports/*`, `.stryker-tmp*/`, `*.tsbuildinfo`, `.build-lock/`, `.plan-lock/`, `.worktrees/`, `.codex-locks/`, `.wave-lock/`, `.tmp/`, `.tmp-*`, `__pycache__/`, `.vtt-soak-out/`, and `dnd-slim-runs/`. Other rules cover orchestration state/verdicts/logs, `scraped/`, the Discord `.env`, BG3 notes, incoming art, and screenshots. Exceptions retain `reports/module-state-census.json` and `art/incoming/README.md`. None names a conventional root PostCSS/Browserslist config. **`coverage/` is not ignored here.** Unanchored rules explain PR4-F1.
- **Root configurations:** `git ls-files -- 'postcss.config.*' 'tsconfig*.json' '.browserslistrc' 'package.json'` returns `package.json` and all three tsconfigs. Contrary to the question’s premise, PostCSS configs and `.browserslistrc` are **absent, not tracked**. Ordinary creation would enter the untracked overlay.
- **Tracked but ignored:** `git ls-files -ci --exclude-standard` returns exactly `orchestration/wave-state`, `reports/mutation/mutation.json`, and `reports/perf/fullsuite-sql/sql-profile.json`. The planned real-index inventory retains all three.
- **Vite optimizer:** installed Vite is **7.3.6**. Its resolver at `config.js:32558` enables dependency-optimizer resolution only when `environment.mode === "dev"`. The production build does not consume that optimizer cache. Changing its contents is not a demonstrated production-output dependency.
- **Actual config effects:** `process.cwd()` selects HEAD, derives the default cache-directory name, and supplies development filesystem permissions. `tmpdir()` selects temporary storage. Bridge randomness, temporary directories, and timers occur in development/request functions; `aiBridge()` is not instantiated for production. No current output use of host time or randomness was found. Arbitrary future external reads remain outside Git inventory; opaque config hashing is not filesystem isolation.
- **Git grammar:** Git **2.34.1**’s `git status --help` confirms `XY`, `??`, NUL terminators, unquoted path bytes, and reversed rename endpoints. The plan’s grammar is correct; consume the extra path slot when either status byte indicates rename/copy.
- **Environment probe:** the exact `env -i … NODE_ENV=production npm run env` command at plan :515–517 reproduced `NODE`, forced `NODE_ENV`, and all **11** listed `npm_config_*` names/values. npm also constructs lifecycle/package/path variables internally; they need no ambient inheritance.
- **Clean-key probe:** **11,504 records**, **1,657,692 index bytes**, **0 status bytes**, **0 special-index entries**, **0 submodules**; all four env files are absent and nonignored. The plan’s probe reproduced key `f3c2f5e00c493e36e1e46c5ee3369946aa2950b5477f5b9a790b2cd13e566b37` in **82.298 ms**. The only adaptation was Git subprocess `stdio: ['ignore','pipe','inherit']`; this sandbox returned `EPERM` with the default unused stdin pipe.
- **Discovery:** `npx vitest list --configLoader runner --filesOnly --json` returned an array of **641 files**.
- **Size:** ≤150 lines for the key/verdict remains plausible. ≤230 total is an aggressive, unproven target once restore/store validation is included. The platform predicate earns its complexity; no AST, walker, or install-stamp subsystem is warranted.

Explicit reconciliation:

| Decision/report point | Assessment |
|---|---|
| D1 | Composition followed, but ignored public inputs need the locally proved exception. |
| D2 | Followed as written; locale and external npm configuration require evidence-backed corrections. |
| D3 | Followed: no extra Git-visible exclusions. |
| D4 | Planned bypasses, HEAD checks, and pre/post MISS checks conform. They do not provide transactional snapshots or eliminate edit-and-revert races. |
| D5 | Exact scripts conform; both direct callers remain compatible. |
| D6 | Print prefixes conform. |
| D7 | Single-module approach conforms; tighter 230-line target remains to be demonstrated. |
| Both reports’ agreement | Whole-dist caching, Git inventory, opaque config bytes, env scrub, HEAD, and verified generations are retained. |
| Sol differences | Root identity, stronger host isolation, ignored inputs, and symlink restrictions were omitted under supervisor reconciliation. The plan must acknowledge the remaining boundaries and the locally proved exceptions above. |
| Opus differences | Deferring exclusions and retaining HEAD are justified by D3 and the emitted commit stamp. No cross-commit hit-rate benefit is claimed incorrectly. |
| IB3 redesign requirement | Syntax-dependent omissions disappear for Git-visible inputs; undeclared ambient aliases are closed only to the extent that the child environment is actually controlled. |

| Dimension | Verdict |
|---|---|
| 1. Soundness | **FAIL** — ignored public files, symlinks; dependency/normalization qualifications |
| 2. Dirty overlay | **CHANGE REQUIRED** — grammar correct; batch hashing |
| 3. Environment contract | **FAIL** — locale and host npm configuration |
| 4. Test matrix | **FAIL** — DROP_HEAD masked; retain existing invariants |
| 5. Size and simplicity | **CONDITIONAL** — direction sound; total size unproven |
| 6. Four-build proof | **FAIL AS ACCEPTANCE PROOF** — selected file is not raw-imported |
| 7. Deviations | **REVISION REQUIRED** — document and apply the locally justified exceptions |

**REJECT PLAN M2 R4 — blocking: PR4-F1, PR4-F2, PR4-F3, PR4-F4, PR4-F5, PR4-F6, PR4-F7.**

M2 PLAN R4 REVIEW DONE
