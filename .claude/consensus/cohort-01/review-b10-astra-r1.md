# COHORT-01 B10 — astra MEDIUM review r1 (session 01a0b9fd-affd-7562-b9f1-dae391fa3a2b, candidate a0ca3795)

**REJECT — 1 P2; no P1/P3 findings.**

- **P2 — Fixed cap lacks an independent assertion:** [blind-turn-context.test.ts:579](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/blind-turn-context.test.ts:579) compares against the imported production constant, and line 591 uses that same constant in the expected message. Changing the cap to `32_769` would preserve both assertions. Batch 10 explicitly requires `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768`. Add `expect(BLIND_SEMANTIC_BOARD_MAX_BYTES).toBe(32_768)`.

Otherwise, the witness satisfies the requested checks: input-derived byte arithmetic; 40,002 bytes independently confirmed; schema parsing before rendering; exact error name/message comparison, including `String(...)`; justified test-local 20-second timeout; exactly one file changed (+50), with Batch 8 untouched.

I inspected both recorded mutant failures and the supervisor’s 79/79 result; I did not rerun the expensive suite.

COHORT-01 REVIEW B10 DONE
