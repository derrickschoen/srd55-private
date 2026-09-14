# M-2 implementation review r1 — gpt-6-astra (read-only)

Reviewed d6468048 on claude/build-cache (dnd-wt-build-cache). Session 01a0a1ae-5b33-7971-b5c1-8b01ab356292. Log .tmp/runs/fanout/review-impl-m2-r1.log. Supervisor verification of the four findings follows in loop-log.md.

**REJECT IMPL M2 — blocking findings: IM1-F1 and IM1-F2.**

Reviewed `d6468048c08f07a4bcad779f576a05a805997ae8`, parent `40f04e2cad4d5d5e170d6caf0adb033e14252990`. The worktree remained clean. Both the frozen plan and contract SHA-256 values match the supplied pins.

**IM1-F1 — P1 — Required environment integration proofs are missing.**  
[dist-build-cache.test.ts:179](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:179)

`runCache()` launches Node directly. Consequently:

- `FIXED_LOCALE_OUTPUT` never runs the required public `npm run build`.
- `HOST_NPM_CONFIG_IS_INERT` explicitly supplies `NODE_OPTIONS`; its single preload PID proves that Node loaded the supplied option, not that npm reconstructed it from `.npmrc`.
- No `vite.config.mjs` fixture exists. `UNDECLARED_ENV_IS_HERMETIC` observes variables inside the stand-in Vite executable at lines 137–159.

**Probe/output:** `rg -n 'vite\.config\.mjs|npm.*run|steps\.log|guard\.log|childEnv\)\.not|parentEnv\.NODE_ENV' tests/unit/tools/dist-build-cache.test.ts` finds no config fixture or executable npm invocation. The in-memory `SPAWN_NPM` replay makes the named test fail at `expect(run.status).toBe(0)` with **`1 !== 0`** because the fixture package has no build scripts. That is not the claimed injection-isolation failure.

**Minimal change:** add the planned fixture scripts and config; exercise the public npm path for locale and `.npmrc` cases; distinguish outer-process preload execution from the direct Vite child. Retain the existing environment assertions.

**IM1-F2 — P1 — The complete key/verdict computation exceeds its hard cap.**  
[dist-build-cache.mjs:22](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:22)

The marker encloses lines 23–172: exactly **150** lines. It excludes `productionBuildEnv`, lines 16–22, even though verdict computation calls it at line 151 to construct hashed inputs.

**Probe/output:** read-only TypeScript AST/source counting returned:

```text
markerInterior=150
environmentExtra=7
constantsExtra=3
completeKeyVerdictLines=160
```

The computation is **at least 157 lines**, or **160** including its three supporting constants. The whole module honestly meets **250** lines; the complete key/verdict portion does not meet **150**.

**Minimal change:** reduce the complete computation to the authorized cap and count its dependencies consistently. Moving markers does not resolve it.

**IM1-F3 — P2 — Required machine-output validation is incomplete.**  
[dist-build-cache.mjs:140](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:140)

Attribute parsing checks the total field count and values, but never verifies the returned paths or attribute names. Index parsing at line 129 likewise does not validate mode/stage grammar, and the `-v` stream lacks record-shape validation.

**Probe/output:** the unchanged production module received virtual `check-attr` triples containing `wrong-path`, `not-an-attribute`, and `unspecified`, with the expected field count. It returned **`cacheable: true`**, with the same baseline key.

**Minimal change:** validate the required record grammar, including five correctly identified attribute triples per tracked path; return `git-failure` for malformed output. This reproduces a contract deviation, not an observed failure of ordinary Git.

**IM1-F4 — P2 — Ignored-public assertions do not verify production ordering or content-ID consumption.**  
[dist-build-cache.test.ts:357](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:357)

The test checks Git’s independently obtained ordering and hashes. Adding paths changes the production key even if their content IDs are discarded.

**Probe/output:** two additional in-memory mutants both survived `IGNORED_PUBLIC_FILE_MISS`:

```text
DROP_PUBLIC_SORT         passed=true
DROP_PUBLIC_CONTENT_IDS  passed=true
```

**Minimal change:** reverse the enumeration supplied to the production computation, assert key invariance, then edit each already-present ignored file independently and require distinct keys. The current production implementation does sort and hash them correctly.

| Dimension | Verdict and evidence |
|---|---|
| **1. Plan fidelity** | **FAIL**, principally F1/F2; detailed mapping below. |
| **2. Stale-hit probes** | **PASS within virtual-fixture limits:** all ten produced the required outcomes. Native integration remains unverified here. |
| **3. Mutant ledger** | **PARTIAL:** six requested behaviors killed their named assertions in memory; npm failure does not prove isolation. Two additional public-input mutants survived. |
| **4. Expectation audit** | **PASS:** only the three authorized behavioral rewrites; original environment assertions strengthened, with both retained identity/nonmutation assertions present. |
| **5. Callers** | **PASS:** CLI invocation and failure propagation preserved; no removed-export callers found. |
| **6. Formatting/size** | **FAIL:** whole module 250; complete key/verdict ≥157. Four reviewed code files meet 120 columns. |
| **7. Four-build proof** | **Expected to pass as written under the supervisor’s writable environment**, assuming successful builds and stable inputs. Not executed here. |

The production-plan mapping is:

| Requirement | Implementation evidence |
|---|---|
| **§3.2 verdicts** | `invalid-head` at [124](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:124); Git failures at 29–46; submodule/symlink/special-index at 131–134; dirty/public symlinks at 73; unsupported paths at 63; normalization at 135–141; stale installation at 91–110 and 142–144. F3 qualifies malformed-output handling. |
| **§3.4 key order** | [155–169](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:155): format, HEAD, runtime/platform/architecture, indexed lock ID, hidden-lock digest, sorted environment, terminal-NUL index records, canonical overlay, sorted ignored public content, four fixed-order env probes. |
| **§3.5 Git/parsing** | [29–85](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:29): 64 MiB, optional locks disabled, NUL parsing, fixed status offsets, rename old-path consumption, Buffer ordering, validation before `lstat`, raw batch hashing. Line 63 checks **both first byte and basename first byte**. Attribute stdin is reconstructed from index paths rather than obtained through a separate `git ls-files -z`; ordinary path contents are equivalent. |
| **§3.6 lifecycle** | [195–246](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:195): verdict before lookup; pointer format/key/HEAD and generation-name containment; source/copy digests; artifact HEAD; restored-hit guard; validated miss/bypass steps; post-build artifact check; complete recheck before publication. Bypass performs no pointer lookup/store. Generation publication precedes atomic pointer replacement. |
| **§3.7 printing** | HIT 208, STORED 226, BYPASS 233, MISS 238, unstable-inputs 243. HIT prints only after its guard succeeds. |
| **§4 environment** | [16–21](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:16): starts with `{}`; only PATH/HOME/TMPDIR/TZ pass unhashed; forced production/fixed locale and optional STATIC_APP_CACHE_DIR are hashed at 152–156. [190](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:190) directly spawns `process.execPath`; descriptors at 11–15 match the three planned steps. |
| **§6 scripts/assertions** | All three package script strings match exactly. Guard-route rewrites are at [scraper:93](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts:93) and [boundary:123](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/ai-bridge/build-boundary.test.ts:123). |

The descriptor equivalence test is **not tautological**: it reads the real `package.json` and imports the actual production descriptors. It checks them against separately written equivalent expectations, although it does not mechanically expand the parsed scripts into descriptors.

The ten probes used the production exports with filesystem/Git/process boundaries virtualized entirely in memory. Each began with a stored generation:

| Probe | Observed result |
|---|---|
| Add ignored public file | Different key; MISS → STORED |
| Symlink beneath public | BYPASS `symlink` |
| Whole-line-quoted path | BYPASS `unsupported-path` |
| CRLF plus configured `core.attributesFile` | BYPASS `normalization` |
| Hidden package version drift | BYPASS `stale-install` |
| Undeclared environment variable | Same key; HIT; identical observed bytes |
| Ambient `LANG/LC_ALL=da_DK.UTF-8` | Same key; HIT; identical observed bytes; guard receives fixed locale |
| Edit during build | MISS → `unstable-inputs`; no publication |
| Delete tracked file | Different key; MISS → STORED |
| Assume-unchanged entry | BYPASS `special-index` |

These establish computation/control-flow behavior. They do **not** replace native Git-attribute resolution, npm execution, or separate-process ICU-locale integration.

For mutation replay, I transpiled the existing named test callbacks and production module in memory; each baseline passed:

| Mutant | Named assertion that failed |
|---|---|
| `DROP_HEAD` | `HEAD_ONLY_CHANGE_MISS`: before/after keys became equal |
| `PASS_PARENT_LOCALE` | Allowlist test: da-DK values replaced expected C.UTF-8 |
| `DROP_QUOTE_BYPASS` | Whole-path quote case: cacheable instead of bypass |
| `SPAWN_NPM` | `HOST_NPM_CONFIG_IS_INERT`: status 1 instead of 0; F1 applies |
| `SKIP_POST_BUILD_RECHECK` | Race case: STORED instead of unstable-inputs |
| `DROP_HIT_GUARD` | Locale case: HIT without `dist clean` |

The HEAD, quote, and recheck mutant hashes exactly matched the ledger. The other three were independent implementations of the same runtime mutations. The pristine and final disk SHA remained:

```text
b46de8391e31c1cd1b85ed6d8d3334c8498fa6eab8d3975821885064f2fa5162
```

The expectation diff retains:

```text
dist-build-cache.test.ts:274  expect(childEnv).not.toBe(parentEnv)
dist-build-cache.test.ts:275  expect(parentEnv.NODE_ENV).toBe('development')
```

[serve.mjs:63](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/serve.mjs:63) still rejects spawn errors and nonzero status. [ai-dm-board-snapshot.ts:306](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/ai-dm-board-snapshot.ts:306) still rejects errors, signals and nonzero exits. The module catches build failures and sets exit code **1** at line 250. A failed restored-hit guard becomes a validated rebuild attempt; persistent failure therefore reaches both callers.

The removed-export search was:

```sh
rg -n 'DIST_BUILD_INPUT_CLASSES|distBuildInputFiles|distBuildInputDigest|dist-build-cache' src tools tests scripts
```

It found **zero references to the three removed exports**.

Independent verification commands included:

```sh
git show --stat --oneline HEAD
git diff --numstat HEAD~1 HEAD
git diff --check HEAD~1 HEAD
node --check tools/dist-build-cache.mjs
npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts tests/unit/tools/scraper-is-never-in-the-bundle.test.ts tests/unit/ai-bridge/build-boundary.test.ts
npx vitest list --configLoader runner --filesOnly --json
```

Results: syntax and whitespace checks **0**; discovery **641 unique files, 0 fixture paths**. Focused Vitest exited **1 before loading tests**: three failed suites, **0 executed tests**, with `ENOENT` creating `/tmp/PVIOtWr9N9-mMAfLGsaG3/ssr`. A separate Node Git probe returned `spawnSync git EPERM`. Thus **61/61 remains supervisor evidence**, not independently reproduced native evidence.

Read-only `node --input-type=module` stdin probes supplied the virtual replays and AST counts. Line maxima were **119/116/112/113**, with **0** overlong lines and no same-block statements sharing a start line. `package-lock.json` is unchanged; `tools/dist-build-inputs.mjs` is absent.

For the four-build prediction, native read-only checks found **11,505 index records**, **0** indexed symlinks/submodules/special entries, **57,525 attribute triples with 0 specified values**, and matching lock version **3**, **273 eligible/273 installed packages**, **0 mismatches**. All four root env files are absent; autocrlf is unset. The proof’s document is still imported with `?raw`. Its fresh TMPDIR, retained document edit, subsequent identical input state, and undeclared `FOO` therefore support the expected **MISS/STORE K1 → MISS/STORE K2 → HIT K2 → HIT K2** sequence. Actual build success and emitted-marker presence remain for the supervisor to establish.

**REJECT IMPL M2: resolve IM1-F1 and IM1-F2 before acceptance.**

M2 IMPL REVIEW R1 DONE