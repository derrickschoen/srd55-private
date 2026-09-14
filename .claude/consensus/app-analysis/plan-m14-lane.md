# M-14 plan lane report (sol 01a09e4f-205a-7131-af22-d3d573c40fe7), harvested 2026-09-14 01:19

Plan written: [2026-09-14-operational-guidance-facts-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/.tmp-plans/2026-09-14-operational-guidance-facts-plan.md)

- `wc -l -c`: **463 lines, 23,988 bytes**
- Filename: **45 characters**
- SHA-256: `4e3f4bcd2d54edf62576895a9a2f8930cb5bb4c89207f0eb7a88b92cf49bbde3`
- `git status --short --untracked-files=all`: **empty** (plan is ignored by `.gitignore`)
- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

Verified narrowing site:

- `src/queries/character-spell-section-builder.ts:98-103`
- `spellLevel()` at `:225-233`
- Storage/read-model call at `:343`

Stale compile-guidance hits:

- `.claude/supervision.md:99`
- `.claude/decisions.md:6560,6563` — historical corrective record
- `docs/design/2026-08-14-simcore-review-round-9-plan.md:79`
- `docs/design/2026-08-15-simcore-review-round-10-plan.md:87`
- `docs/design/2026-08-15-simcore-review-round-13-plan.md:54`
- `docs/design/2026-08-15-simcore-review-round-15-plan.md:54`
- `docs/design/2026-08-15-simcore-review-round-16-plan.md:70`
- `docs/perf/2026-08-19-relationship-index-trials.md:205`
- `docs/audits/2026-08-21-hotspot-wave-batch1-ledger.md:124`

Concurrency hits:

- `.claude/supervision.md:103-104`
- Semantic lock-policy hits: `.claude/RULES.md:47-48`

Read-only discovery found **640 unique Vitest files**, not the supplied 599 baseline: 508 unit, 131 integration, and 1 parity file. The plan records an executable captured-set comparison expecting 640→641 at this HEAD.

PLAN M14 DONE