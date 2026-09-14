- **F97 RESOLVED:** The independent inventory matches the eleven §F gates. Exact-name lookup makes an omitted or misnamed gate PARTIAL at [report.ts:211](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:211). Tests omit each gate and independently pin the inventory names at [handoff-report.test.ts:153](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-report.test.ts:153).

- **F98 RESOLVED:** Production defaults to the real Git reader at [report.ts:238](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:238); publication forwards the optional injection. Exact clean/dirty evidence assertions replace the worktree-dependent expectation at [handoff-report.test.ts:133](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-report.test.ts:133).

- **F99 RESOLVED:** UUIDv7 validation, matching request/result paths and `.min(1)` prevent empty or mismatched art evidence from producing READY at [report.ts:60](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:60). Both report formats retain supplied request identities.

- **F100 RESOLVED:** [art-exchange.md:21](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/art-exchange.md:21) now accurately describes starter-art rendering and identifies exchange-frame consumption as future work.

1. **F101 — SIGNIFICANT — correctness: conflicting duplicate gate results can produce READY.**  
   The input schema permits duplicate gate names at [report.ts:55](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:55), while readiness examines only the **first** matching entry at [:212](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:212). An otherwise passing input containing `unit-gate: PASSED` followed by `unit-gate: FAILED` therefore produces READY, even though the report preserves and displays that failure. Reversing those entries changes readiness.

   **Required:** reject duplicate gate names as invalid evidence, yielding PARTIAL. Add conflicting-duplicate regressions in both orders; neither may produce READY.

**REJECT S10**