# COHORT-01 B6 — astra MEDIUM review r1 (session 01a0b8ff-1c5a-7091-af2a-66d636ccae6c, candidate aeefe48a)

**REJECT — P3 test-only fix round.** No P1/P2 findings; fixture and manifest hashes stand.

- **P3 — Missing exact-seed namespace witness:** [d569-second-family-manifest.test.ts:215](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-second-family-manifest.test.ts:215) tests cross-cohort overlap but misses an unexpected seed inside its own namespace. My in-memory reproduction with `6211011` returned `cohort_seed_range` **and** `seed_overlap`; the range-broadened mutant returned only `cohort_seed_range`. Acceptance remains blocked, but the mutant changes observable validation and violates Batch 6’s explicitly required exact-fixture exemption. Add a direct `6211011 → seed_overlap` witness, preferably paired with `5118011`, and demonstrate that the reported mutant fails it.

Rulings on the other flags:

1. **Narrowed assertion accepted.** Appended whitespace changes the raw fixture hash but disappears during legacy JSON projection. Canonical regenerations therefore agree. The independent-generation witnesses at manifest-test lines 320/330/342 retain meaningful coverage; another blind-experiment witness is not required.
2. **Canonical helper accepted for historical tests.** The plan permits the fixture-reader helper there; it does not require it. Historical versions, caps, cell shapes, and assertions retain their meaning.

Independent verification:

- Exactly the eight authorized files and specified insertion/deletion counts.
- Both hash tools reproduced outer v6: `419993c24eab35149e85288c6da9ab3ae7347f92b05603e9db09524ef216cb76`.
- Structural comparison found exactly 34 changed leaves within the four authorized areas, including N2’s cap amendment.
- In-memory source mutants bypassing exact-ledger validation and ignoring generation 2 were killed by their named witnesses.
- Guarded v5 execution produced 480/660/480 cells across primary, hints, and second-family paths: 201 reads, no v6 manifest reads or v6 validation-branch execution. Source inspection confirms the historical suite uses v5 registration.
- Canonical v6 validation returned zero violations. Working tree remains clean.

COHORT-01 REVIEW B6 DONE
