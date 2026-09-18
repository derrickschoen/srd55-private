# TEST-PERF-01 plan r2 — astra review (HIGH, resume 01a0a88d…, exit 0)

Verified **558 lines** and SHA-256:

`af8fbadf516f1120b5fcd8bbe285e42e7dbb47f7f28fea1904f4284661b06ef5`

D633 accepts all eight original findings. HEAD remains `4a99570d`; the working tree is clean. The remaining issues can be resolved by binding dispatch amendments; another architectural revision is unnecessary.

| Finding | Status | Verification |
|---|---|---|
| **PERF-F1** | **CLOSED** | Plan **42–66** explicitly permits independently derived filename-inventory pin changes, adds moved files to fixed inheritance, and requires empty-diff membership controls. Re-running the inventory probe returned **148** existing files; the listed additions are **4 + 3 + 3 + 2 = 12**, producing **160**. Each split updates inventory independently of Batch 1. Content pins remain excluded from the exception. |
| **PERF-F2** | **CLOSED** | Plan **105–121** now exercises the identical nonempty seam through both branches, checks both consumers independently, and compares complete inventories. My probe confirmed `movement-evaluator.test.ts` and `team-scorer.test.ts` are **not inherited**, so an injected-index edge-dropping mutant cannot pass through baseline membership alone. |
| **PERF-F3** | **CLOSED** | Plan **201–225** chooses immutable snapshot semantics and prohibits supplying access alongside a proof. Old-proof/new-manifest and changed-access witnesses are explicit. Substituting access B for A now either enters live validation or violates the mixed-source rule; proof-only validation intentionally observes its frozen snapshot. I found no surviving access substitution consistent with these requirements. A separate regeneration-witness issue is **PERF-F9** below. |
| **PERF-F4** | **CLOSED** | Plan **286–299** independently regenerates all nine versioned seeds after intervening generation and compares against committed bytes and the template. Source probes reconfirmed **zero overlap** with property seeds `0..31`; the new control therefore closes the actual gap. Both property generations and the standard/brutal seed-1 large-creature constructions remain explicit. |
| **PERF-F5** | **CLOSED**, with numerical correction | Plan **414–420** separates the timeout producer from six consumer hooks and rejects any candidate hook reaching 10 seconds. Installed Vitest resolves `sequence.hooks` to **`stack`**, executes these hooks sequentially, and gives **each hook** its own **10,000 ms** limit. Thus approximately 27 seconds total setup is permissible across seven hooks. The reported average is **3,252.69 ms**, not evidence of the maximum; measuring every candidate hook is correctly required. See **PERF-F11**. |
| **PERF-F6** | **CLOSED** | Plan **68–75** prohibits helper-owned declarations, hooks, fixtures, and mutable state; each file registers its own inputs and lifecycle. This matches `test-inputs.ts:219–223`, which attaches declarations to the current file, and recorder setup at **303–359**, which replaces that state per file. Two observed reverse file orders with one worker provide a checkable reuse audit without changing shipped topology. |
| **PERF-F7** | **STILL OPEN — bounded correction** | Quiet-box reservation, retained outputs, explicit invalidation conditions, unchanged pool, and repeated-trial resolution are now specified at **458–473**. However, its A/A stage contradicts equal cache preparation: baseline receives two additional runs. **PERF-F10** gives the exact correction. |
| **PERF-F8** | **CLOSED** | Plan **195–199** correctly distinguishes fixture counts and hash fields. Re-reading both manifests returned primary counts **[10,10]**, second-family counts **[10,10]**, and **32** hash fields. Source **461–472** retains regeneration arguments **1 and 2**; the plan accurately notes that this suite’s current regeneration seam returns committed bytes. |

The source checks included:

```sh
nl -ba tools/d569-second-family-manifest.ts | sed -n '455,480p'
nl -ba tests/helpers/test-inputs.ts | sed -n '178,238p'
nl -ba tests/helpers/verdict-fs-recorder-setup.mjs | sed -n '303,362p'
nl -ba node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js | sed -n '460,482p;535,541p'
nl -ba node_modules/@vitest/runner/dist/chunk-artifact.js | sed -n '2598,2649p'
```

**PERF-F9 — P2 — The named generation-2 mutant still needs a distinguishing witness.**  
**Plan lines:** 224, 236.

The existing changed-second-fixture case changes fixture bytes while both regeneration calls return the original bytes. Replacing generation 2 with generation 1 still reports both regeneration violations. Merely “exercising both calls” does not establish that their results are independently checked.

I evaluated the actual regeneration-check block in memory, replacing only the second call with `firstGeneration`:

```text
Witness                 Original violations                          Mutant violations
Existing changed bytes  first_regeneration, independent_regeneration  first_regeneration, independent_regeneration
Only generation 2 bad   independent_regeneration                      []
```

The existing witness cannot distinguish this mutant; the second-only witness can.

**Binding amendment:**
> In the existing changed-second-family title, prepare a fresh proof with unchanged valid fixture bytes and generation 1, but different bytes returned only for generation 2; require `second_family_independent_regeneration` and require replacing generation 2 with generation 1 to make that assertion fail.

**PERF-F10 — P2 — A/A contaminates the supposedly equal cache preparation.**  
**Plan lines:** 460–472.

The specified sequence is one discarded warm-up per arm, then baseline A/A, then measured comparisons. Immediately before comparison, cache run counts are therefore **A=3, B=1**. After three comparisons they are **A=6, B=4**, contradicting line 461.

Also, `STATIC_APP_CACHE_DIR` controls the Vite cache, while the global setup separately uses the spell-source and seeded-database caches under `tmpdir()`. Naming one cache directory does not describe all cache preparation.

**Binding amendment:**
> Run the A/A stability check with disposable diagnostic caches, then freshly and equally prepare both arms before the three comparison pairs, recording equivalent warm/reuse status for the Vite, spell-source-parse, and seeded-database caches; apply background/load/output invalidation rules to every pair and repeat this preparation for any repeated trial.

The remaining acceptance arithmetic is enforceable: compare the two arm medians, preserve every pair, and require both trial medians to pass when conflicting deltas trigger a repeat.

**PERF-F11 — P3 — The hook explanation quotes the wrong measured aggregate.**  
**Plan lines:** 403–405, 417.

The reported consumer evaluator is **19,516.15 ms**, but line 417 calls it **18.75 seconds**.

Checked arithmetic:

```text
Consumer average:             19516.15 / 6 = 3252.6917 ms
Timeout producer + consumers:  7568.08 + 19516.15 = 27084.23 ms
Cancellation producer margin: 10000 - 7563.86 = 2436.14 ms
Timeout producer margin:      10000 - 7568.08 = 2431.92 ms
```

These producer margins are observations on the author’s loaded box, not guaranteed headroom after dispatch.

**Binding amendment:**
> Replace line 417’s `18.75 s` and `3.1 s` with `19.51615 s` and `3.25269 s average`, explicitly retaining the requirement to measure every complete candidate hook rather than treating the average as its maximum.

The executable in-memory mutant and arithmetic probe was:

```sh
node --input-type=module <<'JS'
import { readFileSync as read } from 'node:fs';
const s = read('tools/d569-second-family-manifest.ts', 'utf8');
const start = s.indexOf('      const firstGeneration = access.regenerate');
const body = s.slice(start, s.indexOf('\n    }\n  }\n  return violations;', start));
function run(b, bytes, regenerate) {
  return new Function('access','fixture','difficulty','fixtureBytes','violations','addViolation',b+';return violations;')(
    {regenerate},{seed:5118001},'hard',bytes,[],(v,ok,code)=>{if(!ok)v.push(code)});
}
const mutant = body.replace('access.regenerate(fixture.seed, difficulty, 2)', 'firstGeneration');
for (const [name, bytes, fn] of [['existing','original ',()=> 'original'],['second-only','original',(_s,_d,g)=>g===2?'original ':'original']])
  console.log(name, JSON.stringify(run(body,bytes,fn)), JSON.stringify(run(mutant,bytes,fn)));
console.log('consumer average ms',19516.15/6,'producer+consumers ms',7568.08+19516.15);
console.log('warmup counts after A/A',JSON.stringify({A:1+2,B:1}));
JS
```

The new material otherwise stays within D632 plus D633’s accepted corrections. The seven hooks preserve real productions and consumers; the inheritance changes repair split coverage; the single-worker runs are diagnostics. No engine cache or shipped worker-topology change is introduced.

One dispatch detail: the new discriminated D569 API also requires mechanical live-source updates in `tools/d569-v5/validate-first-arm.ts:286,290` and the then-current `d569-v5.test.ts:67`. Include these under Batch 3’s existing “update all callers directly” instruction, without introducing production proof caching or requiring Batch 6.

No new wall-time measurements were taken this round. I checked the author’s setup-probe placement and arithmetic; I did not rerun its file-writing probe in this read-only session. Post-VIS remeasurement, individual hook limits, and actual savings remain implementation acceptance gates.

PLAN VERDICT: ACCEPT WITH AMENDMENTS (PERF-F9, PERF-F10, PERF-F11)

REVIEW DONE
