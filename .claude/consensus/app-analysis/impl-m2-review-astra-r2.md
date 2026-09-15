# M-2 implementation review r2 — gpt-6-astra (read-only)

Reviewed edc70ffb on claude/build-cache. Session 01a0a1ae-5b33-7971-b5c1-8b01ab356292. Log .tmp/runs/fanout/review-impl-m2-r2.log.

**ACCEPT IMPL M2 at `edc70ffbfb4a923e2e1c1893911f261f2ee5faf2`. Blocking list: none.**

IM1-F1–F4 are resolved. Two nonblocking findings remain.

**IM2-F1 — P2 — Test wrappers can mask a spawn error accompanied by status zero.**  
[dist-build-cache.test.ts:262](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:262), also lines 192 and 287.

Both wrappers propagate `result.status ?? 1` without checking `result.error`. This matters because round 1 observed the unusual combination `status: 0` and `spawnSync git EPERM`.

**Probe:** executed the generated wrapper in memory, injecting:

```text
{status: 0, error: Error("spawnSync git EPERM"), stdout: "valid output"}
→ wrapperStatus=0, stdout="valid output"
```

Ordinary status propagation works: **0→0, 1→1, 7→7, null→1**, for both wrappers.

**Minimal change:** handle `result.error` before transforming output and force a nonzero exit. This affects the test harness; production already checks `result.error` at module line 31.

**IM2-F2 — P3 — The ledger counts one mutant twice.**  
[impl-m2-fix-r1-sol.md:58](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/impl-m2-fix-r1-sol.md:58), also line 63.

**Probe/output:** parsing the mutation table produced **22 rows, 21 unique hashes**. `DROP_EFFECTIVE_ATTRS` and `DROP_ATTR_CHECK` both identify:

```text
a3d11811dc881038a03daf03693455befe71d6e7356ee91d00f13466c584bdf4
```

These are two labels for the same mutated module, not two independent mutations.

**Minimal change:** report **21 distinct mutants / 22 labels**, documenting the alias.

| Prior finding | Closure and independent evidence |
|---|---|
| **IM1-F1 — integration proofs** | **Resolved.** `runPublicBuild` at [236](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:236) selects the existing npm CLI beside `process.execPath`, runs `run build`, and explicitly removes inherited `NODE_OPTIONS`. The locale test executes four public builds: MISS/HIT under each locale. The config fixture exists and the stand-in imports it; `observed.secret` comes from `config.undeclared`. |
| **IM1-F2 — size** | **Resolved.** Standalone markers are at **13 and 162**: **150 inclusive, 148 interior**. Environment construction and both key constants are inside. No application-defined key dependency remains outside. Whole module: **239 lines**. |
| **IM1-F3 — Git grammar** | **Resolved for the specified controls.** Lines [113–130](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:113) validate octal mode syntax, stage 0–3, verbose-record shape, attribute count, echoed Buffer paths, ordered attribute names and values. All five malformed-output cases returned `git-failure` through the generated fake-Git wrapper in memory. |
| **IM1-F4 — public inputs** | **Resolved.** The test now compares reversed enumeration against the baseline key, then independently edits each existing ignored file. Both previously surviving mutants now fail the named test. |

The fixture’s tracked module copy is sound: it reads the production file during each fixture’s creation and executes that copy. My probe found identical source/copy SHA-256:

```text
d4f835aefc74541419f39e01fb0114a7146c4591763a98e2c5b663e709c82025
```

Mutated production bytes consequently propagate into newly created fixtures. The replay confirmed this; the copy does not conceal mutants.

The environment replay produced:

```text
en_US.UTF-8: MISS/STORED, HIT; both status 0, both dist clean
da_DK.UTF-8: MISS/STORED, HIT; both status 0, both dist clean
observed outputs: 4
distinct observed outputs: 1
LANG=C.UTF-8, LC_ALL=C.UTF-8
secret read from config: undefined
outer-cache preload records: 1
direct-Vite preload records: 0
sentinel and NODE_OPTIONS in direct Vite: undefined
```

The preload also ran in the outer public-script TypeScript step, as expected. The test correctly distinguishes that from the direct Vite child.

These are **in-memory results**, using the production module, existing test callbacks/generated scripts, and installed npm’s INI parser/environment exporter. Filesystem, Git and process execution boundaries were virtualized; this is not a native npm/ICU integration run.

| Review dimension | Verdict and evidence |
|---|---|
| **Plan fidelity** | **PASS.** Key ordering remains at module 144–158; quote checks at 56 cover both first-byte locations; Buffer/NUL parsing and overlay ordering remain intact. Restore, guards, build, post-build recheck and publication at 184–235 are unchanged except line positions. Script wiring and authorized boundary assertions are unchanged. |
| **Stale-hit probes** | **PASS in memory.** All ten repeated probes produced the required outcomes, below. |
| **Mutant ledger** | **PASS with IM2-F2 correction.** Nine independently replayed mutations failed their named assertions; every corresponding baseline passed. |
| **Expectation audit** | **PASS.** No unrelated assertion removal. Locale equality is strengthened to four outputs; preload assertions now identify the relevant processes. Retained assertions remain at test lines **374–375**: child environment is a new object and parent `NODE_ENV` stays `development`. |
| **Callers** | **PASS.** Both callers and production exit handling are unchanged. Removed-export search returned **0 matches**. |
| **Formatting/size** | **PASS.** Module **239**, complete marked computation **150 inclusive**. Maximum columns **119/116/112/113**, with **0** over 120. AST check found **0** same-block statements sharing a start line. |
| **Four-build prediction** | **Expected to pass**, subject to successful builds and stable inputs. The fix changes neither the proof script nor public build wiring/raw-import path. Expected sequence remains MISS/STORE K1 → MISS/STORE K2 → HIT K2 → HIT K2. Not executed. |

Repeated stale-hit probes, each starting from a stored generation:

| Change | Result |
|---|---|
| Ignored-public addition | Different key; MISS/STORED |
| Public symlink | BYPASS `symlink` |
| Whole-line-quoted path | BYPASS `unsupported-path` |
| CRLF with configured attributes | BYPASS `normalization` |
| Hidden-lock version drift | BYPASS `stale-install` |
| Undeclared environment variable | Same key; HIT; identical observed bytes |
| Ambient da-DK locale | Same key; HIT; identical observed bytes |
| Edit during build | MISS; `unstable-inputs`; no publication |
| Tracked deletion | Different key; MISS/STORED |
| Assume-unchanged entry | BYPASS `special-index` |

Mutation replay results:

| Mutant | Observed failure |
|---|---|
| `DROP_HEAD` | HEAD-only change retained the same key |
| `PASS_PARENT_LOCALE` | da-DK values violated fixed-locale expectations |
| `DROP_QUOTE_BYPASS` | Quoted path became cacheable |
| `SPAWN_NPM` | **`'injected' !== undefined`**, the intended isolation failure |
| `SKIP_POST_BUILD_RECHECK` | Stored instead of reporting unstable inputs |
| `DROP_HIT_GUARD` | HIT lacked `dist clean` |
| `DROP_PUBLIC_SORT` | Reversed enumeration produced a different key |
| `DROP_PUBLIC_CONTENT_IDS` | Editing an existing ignored file retained its key |
| `DROP_ATTR_PATH_CHECK` | Wrong attribute-path echo became cacheable |

Five replay hashes exactly matched the ledger: HEAD, quote, recheck, public sort and attribute-path check. The other four were equivalent runtime mutations with different source edits.

`PATH` and `M2_FAKE_GIT` restoration is protected by `finally`. The absolute real-Git path prevents wrapper recursion. Module-load `which git` introduces a Unix utility dependency; it is not a production dependency. The deterministic npm CLI exists on this checkout. Neither wrapper turns an ordinary nonzero child status into success; IM2-F1 covers the separate error-field case.

Independent command checks included:

```sh
git show --stat --oneline HEAD
git diff HEAD~1 HEAD -- tools/dist-build-cache.mjs
git diff HEAD~1 HEAD -- tests/unit/tools/dist-build-cache.test.ts
git diff --check HEAD~1 HEAD
node --check tools/dist-build-cache.mjs
npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts tests/unit/tools/scraper-is-never-in-the-bundle.test.ts tests/unit/ai-bridge/build-boundary.test.ts
npx vitest list --configLoader runner --filesOnly --json
rg -n 'DIST_BUILD_INPUT_CLASSES|distBuildInputFiles|distBuildInputDigest' src tools tests scripts
```

Read-only `node --input-type=module` stdin probes performed the source counts, ledger audit and virtual replays.

Syntax/whitespace checks exited **0**. Discovery returned **641 unique files, 0 fixture paths**. Native focused Vitest hit the sandbox restriction again: **3 failed suites, 0 executed tests**, `ENOENT` creating `/tmp/3aeqiBKhQSPnKmIIad9lu/ssr`. Thus **66/66 remains supervisor evidence**.

The frozen plan and contract pins match exactly. `package-lock.json` is unchanged, `tools/dist-build-inputs.mjs` remains absent, and the final worktree is clean.

**ACCEPT IMPL M2 — no P1 findings.**

M2 IMPL REVIEW R2 DONE