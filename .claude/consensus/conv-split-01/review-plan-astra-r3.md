**VERDICT: APPROVE — P1: 0 open; P2: 0 open; P3: 0 open.**

Reviewed main `9cad22d247fc9223a5e628b558a0b78792fa4626`. Plan SHA-256 matches `e6d0d1c20e7fd3498f7fbe5cb4b24d2bd9837693a0d6384b658f9d3291e32b3c`. Source inspection and read-only AST analysis only; no tests, builds, type checks, or writes.

1. **r2 P1-2 — CLOSED.** [Plan line 30](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:30): “`LEGACY_BLOCK_ARGS` (791–793) and `ALL_OPTIONS_TEST_RENDERER_ARGS` (795–809)” and “the transform operates on whole AST declarations.” Independently confirmed both complete declaration ranges. Line 32 uses the corrected ranges too.

2. **r2 P1-3 — CLOSED.** [Plan line 72](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:72): “keep every declaration and reader intact” and replace “`recorder.current.declaredInputs = declared;` with a no-op.” Source confirms line 223 attaches the declaration to recorder state; validation and returned readers remain intact. The plan explicitly requires “all 110 tests to pass in both arms and exactly one base record and four candidate records.”

3. **r2 P2, normalization — CLOSED.** [Plan line 72](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:72) freezes `<ROOT>`, `/proc/<PID>/`, and `path:<SELF_SNAPSHOT>`, requiring “every candidate file to contribute exactly one.” The snapshot mapping matches the recorder’s active-file exemption. “Nothing else is rewritten,” external observations remain included, and “any unexplained difference fails the diagnostic.” The implementer no longer chooses the normalization policy.

4. **r2 P1-4 — CLOSED.** [Plan line 58](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:58): “fixtures module counted once plus the four test files,” with explicit byte equality for each array copy and C’s `kbInputs` declaration. Independently verified the base counts **443/83/1/1/48** and **27 prelude declarations − `kbInputs` − two arrays = 24 relocated declarations**. The base import-table check permits that specified relocation and rejects other source-module binding changes.

5. **r2 P1-5 — CLOSED.** [Plan line 80](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:80) requires **11,479 baseline / 11,480 candidate**, with “the exact title delta being the one added d583 all-success seam control.” A/A uses a disposable cache; subsequent A/B caches start fresh and receive one prewarm each. The formula is explicit: “saving = median baseline wall − median candidate wall.” One complete repeat is allowed, both trial medians must pass, and “a repeat never erases a new red.” [Line 83](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:83) correctly totals **11 runs**, approximately **1.5–2.4 hours**, before waits and diagnostics.

6. **r2 P3 — CLOSED.** [Plan line 26](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-22-conv-split-01-plan.md:26) labels the prediction “an unvalidated estimate” and historical completions “scheduling observations from the old schedule, not bounds under the new one.”

No material implementer judgment gap remains in the reviewed revisions. Previously closed findings and rejected alternatives remain undisturbed. Approval covers the plan; implementation evidence remains to be collected.

CONV-SPLIT-01 PLAN REVIEW R3 DONE