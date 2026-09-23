<!-- codex exec -m gpt-6-sol -c model_reasoning_effort=xhigh --sandbox read-only; session 01a0cf61-3e70-75b3-972e-cb4454ed4553; task b8c2u2agz -->

## Dispositions

| Finding | Disposition | Reason |
|---|---|---|
| F1 | AGREE | X2 retains the computed aggregate `interveningCells`; removal is deferred to a separate API change. |
| F2 | DISAGREE | The clock normalization is narrow, but the parity procedure does not give the two children independent, identically initialized spools. The child reads existing spool contents at [entrypoint.ts:224](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/entrypoint.ts:224) and [entrypoint.ts:1127](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/entrypoint.ts:1127). |
| F3 | AGREE | Step 0 identifies the nine direct launch sites, limits the conversion to `startMcpClient`, and measures bundle build time. |
| F4 | DISAGREE | SHA digests alone omit the reversible bytes and provenance required by [decisions.md:96](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:96). Also, requiring a mutant to “fail the gate” does not identify a killer while the baseline gate already fails. |
| F5 | AGREE | Freeze-on-first-memo plus a planted write is a useful executable control for the named families. A9 remains unproven for callers outside those runs. |
| F6 | DISAGREE | The void rule will count the gate’s own worker load, and the initial-phase-only acceptance rule cannot accept an X4/X5 improvement that saves retry time. It also permits a faster initial phase with a slower full gate. |
| F7 | AGREE | The fresh second generation and the D569 and board-mode mutants address the preservation gaps; class-progression deduplication was dropped. |
| F8 | AGREE | The two-seed executable order test and permutation check address the sequencer concern. |
| F9 | AGREE | The model is labelled historical, and the plan explains the in-session model authorization and when D879 will record it. |
| F10 | AGREE | The plan now reports both phases, total wall, and bundle build cost, using real-gate walls for box-time estimates. |

## Assumptions

| ID | Changed or new assumption | Status | Evidence or proof needed |
|---|---|---|---|
| A3 | Lazy search preserves results and `isGoal`/`rank` logs in mixed order. | **UNPROVEN** | The proposed differential has not run. It must compare the frozen reference with the implementation and show exact assertion killers. |
| A4 | The bundle is faster and behaviorally equivalent. | **UNPROVEN** | Requires the measured boot comparison and parity from isolated, equal starting state. |
| A6 | Both docs files failed in all 19 inspected runs. | **UNPROVEN** | I could inspect the four supplied gate reports and 11 trial JSON files; all 15 support the claim. The other four runs need identified reports. |
| A7 | The 19-run census has only four non-timeout, non-docs exceptions. | **DISPROVED** | The four gate reporters alone show **five**: arena prompt-pin assertion, legacy invariance twice, local-openai pin, and arena-interleave. In [gate 1183392](/tmp/dnd-gate-reports/vitest-gate-2026-09-23T01-07-59.764Z-1183392-13793e90-f2d0-4632-8ffa-0ca9a23e57fb.json), the arena assertion failed in 8 ms, so it is not a timeout. |
| A9 | No caller mutates a queried `EncounterState`. | **UNPROVEN** | The proposed audit proves this only for paths executed by six named families. A caller inventory and coverage of the remaining paths, or an enforced runtime invariant, would establish the broader claim. |
| N1 | A load jump during a gate indicates outside contention. | **DISPROVED** | The gate itself runs up to eight workers ([vitest.config.ts:58](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/vitest.config.ts:58)). Starting below 1.5, its own CPU use can lift load beyond the proposed 50% threshold. |
| N2 | Recording only SHA digests meets the independent-pin rule. | **DISPROVED** | [decisions.md:96](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:96) additionally requires reversible encoding, clean approved-main commit/tree/tool provenance, and two-checkout equality. |

## New findings

1. **P1 — Acceptance measures the wrong wall for retry fixes.** X4 and X5 target failed-file retries, yet §7 requires a ≥60 s saving in the *initial* phase. Conversely, an arm can meet that rule while adding more retry time and worsening the gate the owner waits for. [gate-vitest.mjs:149](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/gate-vitest.mjs:149) runs a separate serial retry, which took 210–533 s in the supplied reports. **Fix:** preregister initial-wall acceptance for engine changes and actual total-gate-wall acceptance for retry changes; require no material regression in the other metric.

2. **P1 — The load void rule can discard normal runs.** A quiet start below 1.5 followed by the gate’s own eight-worker load can exceed “half its starting value.” This can leave the A/B design with no valid pairs. **Fix:** attribute load to the experiment versus outside processes, and require a minimum number of valid matched pairs before drawing an acceptance conclusion.

3. **P2 — X3 parity needs isolated spool state.** The server reads proposal, UI feedback, KB-read, and blind-ingress spools before or during execution ([entrypoint.ts:224](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/entrypoint.ts:224), [entrypoint.ts:1096](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/entrypoint.ts:1096), [entrypoint.ts:1134](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/entrypoint.ts:1134)). Reusing the same launcher paths lets the first child alter the second child’s input. **Fix:** run each child against a separate copy of every referenced spool, initialized to identical bytes, then compare outputs and resulting spools.

4. **P2 — The X1 preservation controls still have two false passes.** §5 specifies only hashes, contrary to the provenance rule. The proposed “relax neighbours eagerly” mutant can change `canTraverseStep`/`traversal` calls without changing results or the stated `isGoal`/`rank` logs: the current algorithm tests the goal before relaxing neighbours ([movement.ts:209](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/combat/movement.ts:209)). A mutant also “fails the gate” vacuously when docs already fail. **Fix:** capture reversible pinned bytes with the required provenance and two-checkout check; compare the cold-query world-callback trace for that mutant; name the exact newly failing assertion for every mutant and verify it passes without the mutation.

5. **P2 — The failure census omits a real pin failure.** The arena prompt-pin failure in gate 1183392 makes A7’s four-exception list incomplete. **Fix:** add it, reconcile the count against untruncated reporter assertions for all 19 runs, and distinguish pins from timeouts when declaring the expected red set.

6. **P2 — The revised trial design dropped an explicit coverage inventory.** §7 no longer checks file/test identities or counts before comparing speed. This matters especially for X7, which splits a test file: missing or undiscovered tests would appear as a performance gain. [decisions.md:73](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:73) requires expected, discovered, and executed evidence. **Fix:** require a title multiset and expected/discovered/executed inventory for every arm before accepting timing results.

## Verdict

**REVISE.** The engine experiments have substantially better controls, but the acceptance rule and load void rule can invalidate the measurements, and several preservation checks still permit a false pass.

[exited with code 0]
