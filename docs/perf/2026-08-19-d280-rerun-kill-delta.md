# D280 rerun kill-delta — audit vs post-fix-wave rerun (2026-08-19)

All eight shards rerun with `--rerun` (D308: statics ignored, incremental).
Audit baseline: docs/perf/2026-08-19-d280-campaign-report.md (10,200 mutants,
1,279 survivors). Rerun totals: Killed 5,175 / Survived 1,025 / NoCoverage 156 /
CompileError 3,982 / Timeout 13 / Ignored (statics) 21 / RuntimeError 2.

Caveat: statics that survived the audit appear as Ignored in the rerun; with
only 21 Ignored total, that inflates the apparent kill delta by at most 21.

| File | Audit | Rerun | Delta |
|---|---:|---:|---:|
| sheet.ts | 132 | 77 | -55 |
| attack-profiles.ts | 113 | 105 | -8 |
| configured-choice-rule.ts | 95 | 18 | -77 |
| feat-application.ts | 88 | 33 | -55 |
| srd-subclasses.ts | 88 | 104 | +16 |
| grant-rule-slot-generator.ts | 77 | 34 | -43 |
| grant-rule.ts | 75 | 31 | -44 |
| skill-grants.ts | 53 | 46 | -7 |
| equipment-grants.ts | 40 | 21 | -19 |
| character-level-source-reconciliation.ts | 40 | 18 | -22 |
| sheet-feature-values.ts | 38 | 23 | -15 |
| spell-access-builder.ts | 37 | 16 | -21 |
| **Top-12 total** | **876** | **526** | **-350** |
| **Campaign total** | **1,279** | **1,025** | **-254** |

The kill wave removed 350 survivors from its 12 target files (-40%). The
campaign net is smaller (-254) because new code added survivors elsewhere:
srd-subclass-content.ts now holds 111 (Draconic Resilience seeding, all new)
and srd-subclasses.ts rose +16 from the same feature. attack-profiles.ts
(-8) and skill-grants.ts (-7) barely moved — their kill lanes were triage-
classified but not yet dispatched.

Open scope decision for the owner: iterate kill lanes (next targets:
attack-profiles 105, srd-subclass-content 111, srd-subclasses 104,
skill-grants 46) or accept 1,025 and move on.
