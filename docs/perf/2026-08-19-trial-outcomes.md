# DB-perf trial outcomes

Date: 2026-08-19. Supervisor record of what each measured trial did, so the
evidence documents in this directory read against what actually landed.

## Landed on main

| Trial | Commits | Measured result |
|---|---|---|
| Spell projection batch (T1) | `32dddeca` | family executions 250,677 → 35,798 (−85.7%) in the traced corpus |
| Snapshot order + rowid capi (T2) | `9de2655a`, `07eebd97` | snapshot −553ms; 278k `last_insert_rowid()` round-trips → 0 |
| Eligibility ordering index (C1, migration 0049) | `471842fc` | temp b-tree removed from the `LIMIT 50` eligibility search plan |
| Level-up feat batch (C2) | `4eb473f7` | 94 → 1 statements per `LevelUpStateQuery.build()` |
| Spell-access input batch (C3) | `36c2e37e` | 38 → 2 statements per spell-section build |
| Relationship indexes ranks 2/4/6 (migration 0050) | `e30ad27b` (renumbered in merge `9b851014`) | scaled-fixture medians: reference check 0.455→0.210ms, affected selections 0.271→0.029ms, retirement 48.8→45.8ms; write cost +8.7% for all four candidates measured together |

## Killed by measurement (not merged)

| Candidate | Branch | Kill evidence |
|---|---|---|
| Fingerprint content-key index (rank 5) | `lane-wt/trial-idx5` | primary hotspot `253e74033e` VM steps unchanged (25,200,491 before and after); only the low-frequency integrity lookup improved (−66% VM steps, 7ms total). The trial also proved the additive-index migration pattern (its migration 0049 preserved populated pre-index images). |
| Spell-loadout character index (rank 9) | measured in relgrowth lane, not adopted | endpoint latency 28.7→29.8ms (worse) despite scan steps 368→70 — plan-shape win only |

Verdicts REJECT/DEFER from the cross-analysis (index ranks 3, 7, 8, 10–13;
rewrites 3, 4, 5) remain on file in the candidate documents, unmeasured.
