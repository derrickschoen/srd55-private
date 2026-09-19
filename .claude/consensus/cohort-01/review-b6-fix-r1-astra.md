# COHORT-01 B6 fix r1 — astra MEDIUM re-review (session 01a0b916-190c-7082-93b5-4dc810ea67d8, candidate 65db21a9)

**ACCEPT — P1: 0 / P2: 0 / P3: 0.**

- Confirmed exactly one changed file, +16 lines; no fixture, manifest, or tool bytes changed.
- Both witnesses use the real v2 manifest and require the actual `cohort_seed_range` and `seed_overlap` codes.
- Independently reproduced the in-memory mutant: exactly the two new witnesses fail; 66 tests pass, including the cross-cohort witness.
- Unmodified code: all 129 tests pass across the three targeted suites.
- Against the Batch 6 plan and standing r1 rulings, `aeefe48a` plus this fix closes the remaining gap. Nothing from r1 remains open.

COHORT-01 REVIEW B6 FIX R1 DONE
