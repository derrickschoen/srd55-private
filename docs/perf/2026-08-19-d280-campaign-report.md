# D280 mutation campaign — full 8-shard audit report

Computed 2026-08-19 by the supervisor directly from the eight per-shard
`mutation.json` reports (the aggregate `merge` command correctly refused to
join shards 1–2's pre-homebrew-v3 test metadata with the later shards' — see
"merge conflict" below; mutant verdicts are unaffected).

## Campaign totals

| Status | Count |
|---|---:|
| Killed | 4,596 |
| Timeout | 12 |
| Survived | **1,279** |
| NoCoverage | 363 |
| CompileError (checker) | 3,947 |
| RuntimeError | 3 |
| **Total mutants** | **10,200** |

**Mutation score: 73.73%** of the 6,250 valid (non-checker) mutants.
Total wall-clock: **14.6 h** across 8 shards (concurrency 4 for shards 1–2,
8 thereafter; shards 5 and 7 ran on a contended box). All shards full-audit
mode — statics ON per D308.

## Per-shard

| Shard | Mutants | Killed | Survived | Runtime |
|---|---:|---:|---:|---:|
| 001 | 1,604 | 742 | 180 | 61.9 m |
| 002 | 2,636 | 980 | 382 | 178.7 m |
| 003 | 706 | 344 | 79 | 43.6 m |
| 004 | 546 | 260 | 57 | 65.0 m |
| 005 | 691 | 358 | 136 | 181.2 m |
| 006 | 902 | 395 | 130 | 65.8 m |
| 007 | 1,750 | 946 | 168 | 220.4 m |
| 008 | 1,365 | 571 | 147 | 56.6 m |

## Survivor map — top files (1,279 total)

| File | Survivors |
|---|---:|
| sheet.ts | 132 |
| attack-profiles.ts | 113 |
| configured-choice-rule.ts | 95 |
| feat-application.ts | 88 |
| srd-subclasses.ts | 88 |
| grant-rule-slot-generator.ts | 77 |
| grant-rule.ts | 75 |
| skill-grants.ts | 53 |
| equipment-grants.ts | 40 |
| character-level-source-reconciliation.ts | 40 |
| sheet-feature-values.ts | 38 |
| spell-access-builder.ts | 37 |

The **grants/reconciliation cluster** (configured-choice-rule, grant-rule,
grant-rule-slot-generator, skill-grants, equipment-grants,
character-level-source-reconciliation, grant-rule-planner) holds ~420
survivors — roughly a third of the campaign — and is the triage lane's
priority. The sheet/attack rendering pair (sheet.ts, attack-profiles.ts,
sheet-feature-values.ts) holds ~283 more.

## Known campaign-history footnotes

- Shard-001 ran twice (old suite 114.4 m vs new 61.9 m — the 1.85× A/B).
  Two verdict flips against the perf-converted tests were recorded at
  harvest (srd-subclass-content.ts:132-133 Killed→Survived) and are in the
  survivor list.
- 63 survivors across shards 1–2 are static-only mutants that `ignoreStatic`
  would have hidden — the D308 evidence base.
- **Merge conflict (tooling gap):** `mutation-shard.mjs merge` fails with
  "Conflicting definition for test id 8" because shards ran across a test-file
  change boundary (homebrew-v3 landed between shards 2 and 3). Fix queued:
  namespace per-shard test ids in the merged `testFiles` the same way mutant
  ids already are. Until then, per-shard reports are the authority.

## Next (per D309/D310)

D310 triage lane dispatches on this report: classify all 1,279 survivors
(real gap / equivalent mutant / low-value) with per-file counts; the owner
rules on fix scope from that report. Interleaves with post-journey work per
D309.
