**F101 RESOLVED.** Duplicate gate names now invalidate evidence at [report.ts:59](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:59), producing PARTIAL with `SUPERVISOR_RESULTS_INVALID` and null evidence. Both conflicting orderings exercise the report builder and assert that exact result at [handoff-report.test.ts:182](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-report.test.ts:182). Valid-evidence rendering is unchanged; no existing assertions were weakened.

No new blocking findings.

S0–S10 is code-complete, with recorded residuals retained. Remaining supervisor work: merge main, run the integrated §F full/artifact battery with the NODE_ENV fix landed for the launch probe, run the owner-checkout Windows probe, then publish the report using real results.

**ACCEPT S10**