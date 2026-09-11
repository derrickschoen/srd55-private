**F30 — SIGNIFICANT: The ordinary-incomplete exception also accepts positively invalid catalogs.**  
The shared predicate exempts every inconclusive reason except `conflicting_success_and_failure` when delivery is `timeout_before_delivery` or pre-delivery `dispatch_cancelled`: [turn-context-delivery.ts:71](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:71).

That includes `invalid_catalog_response`, which the classifier emits for malformed records, wrong profiles and other failed contract checks at [engine-dispatch-evidence.ts:113](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/engine-dispatch-evidence.ts:113). These are evidence-integrity failures, not merely missing observations.

Consequently, changing the new timeout fixture’s catalog reason to `invalid_catalog_response` leaves it admissible through the runner and all three consumers. The new regression only mutates the reason to `conflicting_success_and_failure`. Narrow the ordinary-observation exception and add malformed/wrong-profile timeout and cancellation cases; preserve their persist-before-STOP handling.

**F31 — SIGNIFICANT: Observed-row validation now overlooks integrity evidence when its companion field is absent.**  
The new conjunction at [d569-blind-experiment.ts:785](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-blind-experiment.ts:785) calls the predicate only when **both** evidence fields exist. Both remain optional in [D569ObservedRow:734](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-blind-experiment.ts:734).

An otherwise valid observation carrying either:

- `turnContextDelivery: { status: 'indeterminate' }` without catalog evidence, or
- a conflicting catalog without delivery evidence

now bypasses the integrity violation. The remaining checks do not reject either combination. Previously, either signal independently triggered rejection. Preserve historical rows with neither field, but reject partial evidence and independently decisive integrity signals. Add direct observed-row regressions for both omissions.

**Verified claims**

- **F27’s named timeout case now reaches production consumers.** The row comes from actual `runArena` with an injected adapter at [test:388](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-v5.test.ts:388), then enters production packet construction and registered validation at [test:426](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/d569-v5.test.ts:426). Registered validation itself calls `validateD569ObservedRows` at [validator:414](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/d569-v5/validate-first-arm.ts:414). The supplemental direct observed-row case is reconstructed separately; it does not replace that production path.
- **F28’s named contradictory cases are fixed.** Contradiction handling precedes timeout/cancellation classification, and both runner guards use the shared predicate. Delivered contradictions remain delivered evidence while causing persistence and STOP. See [classification:87](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-context-delivery.ts:87), [shared guard:3446](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:3446), and [runner regressions:705](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:705).
- **F29 is restored with meaningful coverage.** The [empty-spool test:733](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:733) asserts persisted process/partial evidence, indeterminate delivery, null authorization/execution and absent failing-dispatch attribution. I inspected the recorded mutation: it removes the actual infrastructure-plus-inconclusive branch. The [mutant fails](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp/d569-r5-f29-final-mutant.vitest.log:99), and [restoration passes](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp/d569-r5-f29-final-restored.vitest.log:96), with matching pre/post hash `98053bcde1cf3625dc55785c54419a1f0adeff045b319c236d702fe06417ac3e`.
- The exception does reject inconclusive `not_requested/catalog_ready_model_did_not_fetch` and inconclusive delivered evidence. `unavailable` is not an accepted delivery variant in the strict packet/registered schemas. F30 and F31 remain the boundary defects.
- Finalized cancellation measurements, real adapter-driven cleanup joins, completed-only binding, proposal-consumption gates, blind host-authorization refusal, and carried historical packet mappings remain present.
- HEAD and the nine-file diff match the candidate. No tests were removed, and no added suppression/skip patterns or test-budget changes were found. Frozen-contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`; runbook and independent prepatch-fixture hashes are unchanged.
- I ran no tests or builds, invoked no agents, made no writes, and did not access sibling worktrees.

VERDICT: REJECT
review complete