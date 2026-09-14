# M-2 plan r6 review r3 FINAL (astra resume 01a0a102…) on plan sha aa9dcbde…, harvested 2026-09-14 15:20

**REJECT PLAN M2 R6.** Two blocking corrections remain; neither requires another redesign.

Verified:

```text
wc -l -c:
698 39445

plan sha256:
aa9dcbdec118087c2cad3b1155125211cb46fd71d07cae9e9aa4734cd2280f52

HEAD:
fdcd0c445525caf82619fab04f3037e416c2e3b1

branch:
claude/build-cache
```

The frozen contract hash matches. Final `git status --short --untracked-files=all` is empty. No writes, builds, test runs, agents, or port access occurred.

**PR6-F1 — P1 — A leading quote in the directory component still permits wrong-file hashing.**  
[Plan:137](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:137), also :70 and :555–556.

The predicate checks the **basename**, but Git interprets quoting from the beginning of the **whole input line**.

Exact probes:

```sh
printf '"tools/assert-dist-clean.mjs"\n' |
  git hash-object --no-filters --stdin-paths

git hash-object --no-filters -- tools/assert-dist-clean.mjs
```

Both returned:

```text
138c76f1a272166b6972b7ff2d7a02ba7308c1a8
```

Evaluating the plan’s predicate:

```js
const path = Buffer.from('"tools/assert-dist-clean.mjs"');
const basename = path.subarray(path.lastIndexOf(47) + 1);
```

Result:

```text
basename: assert-dist-clean.mjs"
planRejects: false
literalExists: false
```

A literal file with directory `"tools` and basename `assert-dist-clean.mjs"` therefore passes the predicate. When both literal and ordinary paths exist, `lstat` checks the literal file while Git hashes the ordinary one. Changes to the literal contents can retain the same key.

**Minimal acceptable edit:** retain the existing checks and add `path[0] === 34`. Extend the two-file control to include a quoted whole path containing `/`, with different literal and ordinary contents. No quoting encoder is necessary.

**PR6-F2 — P1 — The mandatory verification suite cannot pass within the allowed-file list.**  
[Plan:320](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:320), [Plan:331–337](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:331).

The new script is:

```text
tsc -b && node tools/dist-build-cache.mjs
```

Two existing tests require the guard to appear directly in that string:

```text
tests/unit/tools/scraper-is-never-in-the-bundle.test.ts:80
expect(manifest.scripts.build).toContain('tools/assert-dist-clean.mjs');

tests/unit/ai-bridge/build-boundary.test.ts:109
expect(pkg.scripts['build']).toContain('node tools/assert-dist-clean.mjs');
```

Probe:

```sh
rg -n 'scripts.*build.*toContain|assert-dist-clean' \
  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
  tests/unit/ai-bridge/build-boundary.test.ts
```

Evaluating both string predicates against the planned script returned:

```json
{"scraperAssertion":false,"bridgeAssertion":false}
```

The plan explicitly runs these tests while forbidding changes to them. Their lack of imports from the cache module does not make them unaffected by script changes.

**Minimal acceptable edit:** authorize those two test files and replace only these direct-script-location assertions with assertions proving the new guarded route. Preserve the requirement that public builds reach the guard, and retain the planned MISS/HIT/BYPASS execution controls. Do not delete the assertions’ subject or restore the redundant host-locale guard.

The complete-verdict probe reproduced:

```text
records=11504 index_bytes=1657692 status_bytes=0
attribute_checks=57520 active_attributes=0
attribute_check_ms=58.973
special=0 symlinks=0 submodules=0 ignored_public=0
eligible=273 hidden=273 lock_mismatches=0/0/0
key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
complete_verdict_ms=208.869
```

I replayed the Node heredoc at :484–585 with two disclosed sandbox adaptations: unused stdin was ignored, and the attribute input used this equivalent shell pipeline:

```sh
git ls-files -z |
  git check-attr -z --stdin text eol filter ident working-tree-encoding
```

The direct synchronous Buffer-input attempt timed out after **5 seconds** in this sandbox. The shell pipeline completed successfully; its **58.973 ms** includes the additional `ls-files` invocation. The digest and all reported counts match the planner’s results.

The final pass otherwise finds:

| Area | Evidence and assessment |
|---|---|
| Cached guard paths | :162–163 require the fixed-environment guard before printing HIT; :165 executes the guarded direct leaf on MISS/BYPASS. Removing the public outer guard therefore closes the locale mismatch. |
| Direct callers | Re-read `serve.mjs:63` and `ai-dm-board-snapshot.ts:306`: both invoke the module and propagate nonzero exits. They inherit the new guarded HIT behavior unchanged. |
| Human uncached leaf | `build:dist:validated` still runs TypeScript → Vite → guard. It uses the host environment consistently for both Vite and guard and does not publish cache entries. Thus “every guard invocation uses the fixed locale” is too broad literally; the guarantee holds for cache-mediated builds. This uncached leaf does not recreate the earlier mixed-locale failure. |
| Equivalence test | Test the three human script strings separately, and compare the exported MISS/BYPASS descriptors with the expanded uncached leaf. HIT intentionally executes only the guard descriptor. Do not assert identical environments for the human uncached leaf and cached route. |
| Effective attributes | The five-attribute query closes the previously demonstrated worktree/info/user/system normalization gap. All **57,520** current values are `unspecified`. Rejecting even explicit `unset` values is conservative but does not bypass this checkout. |
| Other input routes | Index plus dirty overlay retains tracked-but-ignored files; ignored-public enumeration and four env probes cover the demonstrated ignored inputs. Symlink and special-index bypasses remain specified. No additional current stale-hit route was established beyond PR6-F1. |
| External-state boundary | Immutable npm-managed dependencies remain an explicit prerequisite. Direct children exclude npm configuration and undeclared Node variables. The previously inspected production code has no additional demonstrated HOME, TZ, time, randomness, or persistent Vite-config-cache output dependency. This remains a scoped contract, not arbitrary filesystem isolation. |
| Normal-use bypasses | Fresh installation matches **273/273** packages, with zero version/resolved/integrity mismatches; no indexed symlinks, submodules, special entries, or active attributes. The conservative path restrictions do not affect the current clean checkout. Large unignored scratch trees remain an unbounded traversal cost. |
| Fixture feasibility | Tiny Node stand-ins at the direct TypeScript/Vite/guard paths make the subprocess tests feasible without real compilation. `package.json` alone is insufficient. System-attribute coverage must use an isolated/mock Git seam rather than modify system files. |
| Mutants | HEAD inequality and both locale-helper assertions now supply the missing observations. `DROP_HIT_GUARD` is killed by the public HIT control requiring a clean-scan message. Other mappings remain feasible, subject to PR6-F1’s additional path arm. |
| Four-build proof | Per-log clean checks and both STORED==MISS comparisons are restored. The raw Markdown input, emitted marker check, `pipefail`, backup trap, distinct keys, artifact HEAD checks, and ambient FOO HIT form a coherent proof. No build execution was permitted. |
| Size | The cap is now **250 lines**, **17 lines / 6.4%** below HEAD, with **150** for key/verdict and **100** for the remainder. The arithmetic is correct; implementation feasibility remains a gate, not a demonstrated result. |

The six PR5 findings are addressed except for the residual path case in **PR6-F1**. Moving the guard creates the separate, deterministic test failure in **PR6-F2**.

| Dimension | Verdict |
|---|---|
| Soundness | **FAIL** — PR6-F1 |
| Dirty overlay and performance | **PARTIAL** — timing verified; one path predicate correction |
| Environment and guard routing | **PASS within the stated cache contract** |
| Test matrix and verification feasibility | **FAIL** — PR6-F2 |
| Four-build proof | **PASS by inspection** |
| Normal-use cache availability | **PASS on current probes** |
| Size and simplicity | **CONDITIONAL PASS; enforce implementation cap** |
| Supervisor corrections | **Nearly complete; two bounded edits remain** |

**REJECT PLAN M2 R6 — blocking: PR6-F1, PR6-F2.**

For the owner’s cap decision, the required revision is limited to **one additional path-byte rejection plus its regression, and authorization/update of two affected guard-routing assertions**. No further architecture change is requested.

M2 PLAN R6 REVIEW DONE
tokens used
210,043
**REJECT PLAN M2 R6.** Two blocking corrections remain; neither requires another redesign.

Verified:

```text
wc -l -c:
698 39445

plan sha256:
aa9dcbdec118087c2cad3b1155125211cb46fd71d07cae9e9aa4734cd2280f52

HEAD:
fdcd0c445525caf82619fab04f3037e416c2e3b1

branch:
claude/build-cache
```

The frozen contract hash matches. Final `git status --short --untracked-files=all` is empty. No writes, builds, test runs, agents, or port access occurred.

**PR6-F1 — P1 — A leading quote in the directory component still permits wrong-file hashing.**  
[Plan:137](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:137), also :70 and :555–556.

The predicate checks the **basename**, but Git interprets quoting from the beginning of the **whole input line**.

Exact probes:

```sh
printf '"tools/assert-dist-clean.mjs"\n' |
  git hash-object --no-filters --stdin-paths

git hash-object --no-filters -- tools/assert-dist-clean.mjs
```

Both returned:

```text
138c76f1a272166b6972b7ff2d7a02ba7308c1a8
```

Evaluating the plan’s predicate:

```js
const path = Buffer.from('"tools/assert-dist-clean.mjs"');
const basename = path.subarray(path.lastIndexOf(47) + 1);
```

Result:

```text
basename: assert-dist-clean.mjs"
planRejects: false
literalExists: false
```

A literal file with directory `"tools` and basename `assert-dist-clean.mjs"` therefore passes the predicate. When both literal and ordinary paths exist, `lstat` checks the literal file while Git hashes the ordinary one. Changes to the literal contents can retain the same key.

**Minimal acceptable edit:** retain the existing checks and add `path[0] === 34`. Extend the two-file control to include a quoted whole path containing `/`, with different literal and ordinary contents. No quoting encoder is necessary.

**PR6-F2 — P1 — The mandatory verification suite cannot pass within the allowed-file list.**  
[Plan:320](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:320), [Plan:331–337](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:331).

The new script is:

```text
tsc -b && node tools/dist-build-cache.mjs
```

Two existing tests require the guard to appear directly in that string:

```text
tests/unit/tools/scraper-is-never-in-the-bundle.test.ts:80
expect(manifest.scripts.build).toContain('tools/assert-dist-clean.mjs');

tests/unit/ai-bridge/build-boundary.test.ts:109
expect(pkg.scripts['build']).toContain('node tools/assert-dist-clean.mjs');
```

Probe:

```sh
rg -n 'scripts.*build.*toContain|assert-dist-clean' \
  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
  tests/unit/ai-bridge/build-boundary.test.ts
```

Evaluating both string predicates against the planned script returned:

```json
{"scraperAssertion":false,"bridgeAssertion":false}
```

The plan explicitly runs these tests while forbidding changes to them. Their lack of imports from the cache module does not make them unaffected by script changes.

**Minimal acceptable edit:** authorize those two test files and replace only these direct-script-location assertions with assertions proving the new guarded route. Preserve the requirement that public builds reach the guard, and retain the planned MISS/HIT/BYPASS execution controls. Do not delete the assertions’ subject or restore the redundant host-locale guard.

The complete-verdict probe reproduced:

```text
records=11504 index_bytes=1657692 status_bytes=0
attribute_checks=57520 active_attributes=0
attribute_check_ms=58.973
special=0 symlinks=0 submodules=0 ignored_public=0
eligible=273 hidden=273 lock_mismatches=0/0/0
key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
complete_verdict_ms=208.869
```

I replayed the Node heredoc at :484–585 with two disclosed sandbox adaptations: unused stdin was ignored, and the attribute input used this equivalent shell pipeline:

```sh
git ls-files -z |
  git check-attr -z --stdin text eol filter ident working-tree-encoding
```

The direct synchronous Buffer-input attempt timed out after **5 seconds** in this sandbox. The shell pipeline completed successfully; its **58.973 ms** includes the additional `ls-files` invocation. The digest and all reported counts match the planner’s results.

The final pass otherwise finds:

| Area | Evidence and assessment |
|---|---|
| Cached guard paths | :162–163 require the fixed-environment guard before printing HIT; :165 executes the guarded direct leaf on MISS/BYPASS. Removing the public outer guard therefore closes the locale mismatch. |
| Direct callers | Re-read `serve.mjs:63` and `ai-dm-board-snapshot.ts:306`: both invoke the module and propagate nonzero exits. They inherit the new guarded HIT behavior unchanged. |
| Human uncached leaf | `build:dist:validated` still runs TypeScript → Vite → guard. It uses the host environment consistently for both Vite and guard and does not publish cache entries. Thus “every guard invocation uses the fixed locale” is too broad literally; the guarantee holds for cache-mediated builds. This uncached leaf does not recreate the earlier mixed-locale failure. |
| Equivalence test | Test the three human script strings separately, and compare the exported MISS/BYPASS descriptors with the expanded uncached leaf. HIT intentionally executes only the guard descriptor. Do not assert identical environments for the human uncached leaf and cached route. |
| Effective attributes | The five-attribute query closes the previously demonstrated worktree/info/user/system normalization gap. All **57,520** current values are `unspecified`. Rejecting even explicit `unset` values is conservative but does not bypass this checkout. |
| Other input routes | Index plus dirty overlay retains tracked-but-ignored files; ignored-public enumeration and four env probes cover the demonstrated ignored inputs. Symlink and special-index bypasses remain specified. No additional current stale-hit route was established beyond PR6-F1. |
| External-state boundary | Immutable npm-managed dependencies remain an explicit prerequisite. Direct children exclude npm configuration and undeclared Node variables. The previously inspected production code has no additional demonstrated HOME, TZ, time, randomness, or persistent Vite-config-cache output dependency. This remains a scoped contract, not arbitrary filesystem isolation. |
| Normal-use bypasses | Fresh installation matches **273/273** packages, with zero version/resolved/integrity mismatches; no indexed symlinks, submodules, special entries, or active attributes. The conservative path restrictions do not affect the current clean checkout. Large unignored scratch trees remain an unbounded traversal cost. |
| Fixture feasibility | Tiny Node stand-ins at the direct TypeScript/Vite/guard paths make the subprocess tests feasible without real compilation. `package.json` alone is insufficient. System-attribute coverage must use an isolated/mock Git seam rather than modify system files. |
| Mutants | HEAD inequality and both locale-helper assertions now supply the missing observations. `DROP_HIT_GUARD` is killed by the public HIT control requiring a clean-scan message. Other mappings remain feasible, subject to PR6-F1’s additional path arm. |
| Four-build proof | Per-log clean checks and both STORED==MISS comparisons are restored. The raw Markdown input, emitted marker check, `pipefail`, backup trap, distinct keys, artifact HEAD checks, and ambient FOO HIT form a coherent proof. No build execution was permitted. |
| Size | The cap is now **250 lines**, **17 lines / 6.4%** below HEAD, with **150** for key/verdict and **100** for the remainder. The arithmetic is correct; implementation feasibility remains a gate, not a demonstrated result. |

The six PR5 findings are addressed except for the residual path case in **PR6-F1**. Moving the guard creates the separate, deterministic test failure in **PR6-F2**.

| Dimension | Verdict |
|---|---|
| Soundness | **FAIL** — PR6-F1 |
| Dirty overlay and performance | **PARTIAL** — timing verified; one path predicate correction |
| Environment and guard routing | **PASS within the stated cache contract** |
| Test matrix and verification feasibility | **FAIL** — PR6-F2 |
| Four-build proof | **PASS by inspection** |
| Normal-use cache availability | **PASS on current probes** |
| Size and simplicity | **CONDITIONAL PASS; enforce implementation cap** |
| Supervisor corrections | **Nearly complete; two bounded edits remain** |

**REJECT PLAN M2 R6 — blocking: PR6-F1, PR6-F2.**

For the owner’s cap decision, the required revision is limited to **one additional path-byte rejection plus its regression, and authorization/update of two affected guard-routing assertions**. No further architecture change is requested.

M2 PLAN R6 REVIEW DONE
