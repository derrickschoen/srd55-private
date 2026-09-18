# TEST-PERF-01 plan r1 — astra review (HIGH, fresh session 01a0a88d-0e8a-71a1-8ac5-09eafb7d0c94, exit 0)

Verified the [plan](/home/vagrant/PhpstormProjects/dnd-wt-test-perf/.tmp-plans/2026-09-16-test-perf-01-plan.md) hash:

`568476b11d5b8f198925dedfda9a273871936318217084626e4ac4c921e3ef6a`

HEAD is `4a99570ddcda1d8e9d08dacb7264cb88d262f8c7`; working tree remained clean. I read D630, D632, the authoring brief, and the brainstorm. No files were edited or mutants installed; counterexamples below are source-derived.

1. **PERF-F1 — P2 — Splitting files silently weakens D583’s inherited coverage.**  
   **Plan lines:** 238–247, 296–305, 389–392.

   **Evidence:** `nl -ba tools/d583-contract-inventory.ts | sed -n '216,276p'` shows the inventory unions fixed inherited filenames with changed specs and reverse consumers. A read-only import and `contractInventoryUnion(..., [], new Set())` returned **148 files**, including the original `arena-basis-brutal-b.test.ts` and `room-generator-los-cover.test.ts`.

   After the splits land and the Git diff becomes empty, those filenames retain only 14 and 15 tests. The **33 execution rows and 96 property rows** moved elsewhere cease to be inherited coverage. Keeping the original filenames and their pinned inventory digest hides that loss.

   **Fix:** Each split batch must independently preserve inventory membership for its moved tests, including an empty-Git-diff control. Resolve the conflict with the plan’s prohibition on changing pins before dispatch. This cannot depend on accepting Batch 1.

2. **PERF-F2 — P2 — The D583 control does not exercise the new injected-index branch.**  
   **Plan lines:** 64–84.

   **Evidence:** `nl -ba tests/unit/tools/d583-contract-inventory.test.ts | sed -n '17,44p;137,178p'` shows the explicit nonempty source-change case at lines 142–162; it checks `movement-evaluator` and `team-scorer`. The plan deliberately leaves precisely this case uncached. The empty-inventory cases expect the inherited 148-file union.

   A new-branch mutant that substitutes empty reverse edges whenever an index is supplied can satisfy those cached cases while the uncached discovery control remains green. The direct fixed-point test exercises its hand-built graph, not the injected-index plumbing.

   **Fix:** Within the existing discovery title, run the same nonempty Git seam both uncached and with the prepared index. Apply the independent consumer assertions to both, compare complete inventories, and require an injected-index edge-dropping mutant to die.

3. **PERF-F3 — P2 — D569’s proof trust boundary and its named substitution control are incomplete.**  
   **Plan lines:** 161–188, 194–196.

   **Evidence:** `nl -ba tests/unit/tools/d569-blind-experiment.test.ts | sed -n '285,304p;619,633p;719,729p;839,859p'` shows:
   - Access includes separate `readText`, `readFixture`, and `regenerate` capabilities.
   - Changing primary bytes at the same path must produce `primary_fixture_hash`.
   - The fluke-guard test changes training seeds or second-family bytes; the plan requires fresh proofs for it.

   A digest of manifest declarations does not distinguish honest access A from access B returning different bytes for identical declarations. Reusing A’s proof with B could validate inputs that today’s validator rejects. Fresh-proof hostile tests do not exercise that substitution. Likewise, the named fluke-guard test cannot establish rejection of an **old injected proof** if it always prepares a fresh one.

   **Fix:** Specify whether the proof owns an immutable input snapshot or is bound to an access context; prohibit mixing proof evidence with another context. Add explicit old-proof/new-manifest and same-manifest/different-access witnesses, including second-family access. Test cached versus live validation results and preserve default-path violation/exception behavior. Name mutants for these new production branches.

4. **PERF-F4 — P2 — LOS’s nondeterminism control covers different seeds from the cached rooms.**  
   **Plan lines:** 238–252.

   **Evidence:** The seed extraction probe returned versioned seeds `5762001–5762003`, `5762101–5762103`, and `5762201–5762203`, with **zero** inside the property range `0..31`.  
   `nl -ba tests/unit/vtt/room-generator-los-cover.test.ts | sed -n '278,400p'` shows today’s aggregate tests regenerate the versioned rooms, while the property rows generate their separate seeds twice.

   Concrete counterexample: a generator cache returns a correct hard room for seed `5762101` on its first request, then a room missing cover on subsequent requests. Today the repeated membership aggregate fails. Under the plan, every aggregate receives the first correct cached room; all 96 independent property rows miss that seed.

   **Fix:** Independently regenerate each cached versioned seed and compare against its committed bytes/template, preferably after intervening generation work. Retain both property generations. Explicitly keep the large-creature test’s **standard/brutal seed 1** constructions; these are not among the nine templates.

5. **PERF-F5 — P2 — The proposed D569-v5 hook lacks a viable timeout budget.**  
   **Plan lines:** 357–360, 378–380, 453.

   **Evidence:**  
   `nl -ba node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js | sed -n '533,541p'` returns the default `hookTimeout` of **10,000 ms**.  
   `nl -ba tests/unit/tools/d569-v5.test.ts | sed -n '449,575p;640,718p'` shows timeout-consumer evaluation performs **six** registered-validator calls: one normal, four malformed/profile combinations, and one contradictory case.  
   `sed -n '272,303p' tools/d569-v5/validate-first-arm.ts` shows each call performs live manifest validation and then a dry run that validates again.

   The plan reports individual validator tests around **3.1 seconds**. Six such validations suggest roughly **18 seconds before adding the runner production**—already beyond the hook limit. This is an estimate from the source and reported timings, not a measured candidate-hook failure. Vitest also checks elapsed time after synchronous work, so CPU-bound execution does not escape the limit.

   **Fix:** Measure producer and consumer setup separately and specify bounded hook placement that respects the timeout policy. Resolve any required timeout exception explicitly. Batch 6 must work independently; Batch 3’s optional proof does not automatically accelerate these default production calls.

6. **PERF-F6 — P2 — Shared helper initialization needs a per-file ownership and worker-reuse test.**  
   **Plan lines:** 170–178, 238–245, 296–299, 352–359, 401–408.

   **Evidence:** `vitest.config.ts` sets `isolate:false`.  
   `nl -ba tests/helpers/test-inputs.ts | sed -n '178,186p;214,227p'` shows `declareTestInputs` attaches declarations to the **currently executing test file** and rejects duplicate declarations.  
   `nl -ba tests/helpers/verdict-fs-recorder-setup.mjs | sed -n '303,335p'` shows that recorder state changes per file.

   Moving module-scope declarations or hook registration into an imported helper can register them only for the first file evaluated in a reused worker. Deep freezing does not address this lifecycle problem. Separately, splitting standard/hard/brutal suites can conceal a cross-family module-state defect previously exercised sequentially.

   **Fix:** Shared modules should export factories and immutable declarations; each test file must register its own inputs, hooks, and fixture ownership. Add bounded same-worker/order checks for the split families, with recorder coverage where applicable. Preserve expanded titles, describe ancestry, seeds, assertions, and timeout arguments—not merely the count. No shipped worker configuration change is needed.

7. **PERF-F7 — P2 — Acceptance permits loaded-box measurements despite D632’s quiet-box requirement.**  
   **Plan lines:** 18–22, 86–87, 133–134, 200–201, 263, 320, 378.

   **Evidence:** D632 explicitly requires savings measured “back-to-back on the same **quiet box**.” The plan instead permits acceptance under the same load. My unchanged D583 diagnostic runs varied by **3.07 seconds**, with identical counts and command.

   “Discard if ambient load changes” has no stated observable criterion. A single favorable pair can therefore establish a false saving, particularly against the 6-second arena threshold.

   **Fix:** Keep loaded authoring measurements informational. Require quiet, consecutive baseline/candidate runs after implementation, explicit baseline commit identity, matching cache conditions, and retained verbose outputs. Define when a pair is invalid and how conflicting repeated pairs are resolved. Do not accept a pool-substituted benchmark.

8. **PERF-F8 — P3 — The D569 fixture count and regeneration description are inaccurate.**  
   **Plan lines:** 161–163, 194–195, 435.

   **Evidence:** Reading the manifest with Node returned **10 hard + 10 brutal = 20 primary fixtures**, not 32. The 32 values are hash pins spanning KB components and other declarations.  
   `sed -n '461,479p' tools/d569-second-family-manifest.ts` shows two regeneration calls per second-family fixture, with generation arguments **1 and 2**. The blind-experiment test’s access helper returns committed bytes for these calls rather than running the canonical generator.

   **Fix:** Distinguish 20 primary fixtures, 20 second-family fixtures, and 32 pinned hash fields. State that preparing evidence once retains **both** independent regeneration calls. Correct the mutant-to-title mapping: primary-byte corruption is checked in the “preserves all 32…” title.

The measurement probes were on the **loaded box**. Exact prescribed commands:

```sh
/usr/bin/time -f 'WALL_SECONDS=%e EXIT=%x' npx vitest run --configLoader runner --reporter=verbose tests/unit/tools/d583-contract-inventory.test.ts
/usr/bin/time -f 'WALL_SECONDS=%e EXIT=%x' npx vitest run --configLoader runner --reporter=verbose tests/unit/vtt/replay.test.ts
```

Both failed before collection with `ENOENT ... mkdir '/tmp/.../ssr'`:

| Suite | Wall | Vitest duration | Tests | Exit |
|---|---:|---:|---|---:|
| D583 | 1.99 s | 1.54 s | None collected | 1 |
| Replay | 1.94 s | 1.52 s | None collected | 1 |

For diagnostic remeasurement, I ran each following command twice consecutively against the **unchanged baseline**:

```sh
/usr/bin/time -f 'WALL_SECONDS=%e EXIT=%x' npx vitest run --configLoader runner --reporter=verbose --pool=threads tests/unit/tools/d583-contract-inventory.test.ts
/usr/bin/time -f 'WALL_SECONDS=%e EXIT=%x' npx vitest run --configLoader runner --reporter=verbose --pool=threads tests/unit/vtt/replay.test.ts
```

| Suite/run | Wall | Vitest duration | Test execution | Passed |
|---|---:|---:|---:|---:|
| D583 A | 31.11 s | 30.70 s | 28.94 s | 17/17 |
| D583 B | 34.18 s | 33.79 s | 31.97 s | 17/17 |
| Replay A | 31.85 s | 31.43 s | 28.56 s | 19/19 |
| Replay B | 32.01 s | 31.57 s | 28.65 s | 19/19 |

Reporter durations in declaration order, milliseconds:

```text
D583 A: 2,0,0,3939,3593,3568,3551,3531,3636,3559,3551,0,0,0,0,0,1
D583 B: 2,0,0,4281,3954,3943,3961,3925,4010,3949,3943,0,0,0,0,0,1
Replay A: 69,82,2976,1453,1472,1454,1446,2062,1912,1538,1454,1466,1435,1885,1846,3232,2,0,2773
Replay B: 66,78,2940,1471,1467,1454,1423,2027,1869,1589,1459,1452,1417,1896,1906,3294,2,0,2836
```

These broadly corroborate the plan’s reported costs—D583 **32.93 s**, replay **31.80 s**—but pool differences prevent exact comparison. No candidate exists, so these are **A/A diagnostics, not savings measurements**. The plan’s numbers differ from the brainstorm, but no retained raw authoring logs were supplied to independently establish their provenance.

The post-VIS sequencing and unchanged detection suite are correct. Replay’s clone-per-consumer design, fresh default-generation comparison, and retained replay assertions are reasonable controls. Arena’s JSON-parsed templates and cloned execution inputs also have a sound isolation basis. Those strengths do not close the inventory, proof-binding, lifecycle, and acceptance gaps above.

PLAN VERDICT: REJECT (0 P1, 7 P2)

REVIEW DONE
