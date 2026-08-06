# CI-6 — L: share resolver/review conversion, reference-only wire

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ci6 (branch wt/ci6 from main).
Design row, docs/design/2026-07-30-content-identity.md:1326-1331, VERBATIM:

> **CI-6 — L: share resolver/review conversion, reference-only wire.** Replace
> exact catalog helpers across preview/import/placeholder paths with typed
> key-first/fingerprint-fallback resolution; reuse CI-4a's modal and remembered
> decisions; clone the local candidate when requested; add frozen v10 plus
> then-current stable/legacy/derived/fallback fixtures and CI-SHARE-REFERENCE.
> No tuple changes are caused by identity.

Read the doc THROUGH its D198 supersession banner; .claude/decisions.md wins.

## Currency corrections (binding; the row predates these)
- "legacy/derived" fixture vocabulary is PARTIALLY VOID: D205 deleted
  legacy-opaque entirely (migration 0034). Frozen HISTORICAL wire fixtures (v10
  and then-current captures) may still CONTAIN old vocabulary as inert bytes -
  that is what "frozen fixture" means - but no LIVE resolution path may accept
  or emit it. key_kind today: bundled-stable | derived | asserted (D198/D203).
- Wire is at v17. "No tuple changes are caused by identity" still binds: if you
  believe a wire bump is needed, STOP and report rather than minting v18.
- Migrations 0000-0036 FROZEN. This unit is EXPECTED MINT-FREE; if a migration
  seems required, stop and report why.
- CI-8 merged: the adoption dialog now labels match reasons via normalized
  identity comparison and has a real-planner preview test; reuse that modal and
  its seams (src/ui/content-adoption-dialog.ts), do not fork a share-specific
  dialog.
- The sharing module (src/sharing/, src/worker/handlers/sharing.ts) retains its
  own importCharacter-named methods - those are sharing's seam, NOT the deleted
  backup.importCharacter RPC; do not resurrect the latter.
- CI-SHARE-REFERENCE is the control named by the doc; CI-SRD-FALLBACK-REVIEW is
  the fifth review control (D198 banner).

## Standing constraints
- Leave all work UNCOMMITTED; supervisor commits. No second-agent CLIs.
- NO full vitest/Playwright/build. Targeted vitest only; ps-guard before every
  test command (`ps -eo args | grep -E "vitest|playwright" | grep -v grep`).
- Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo, no config
  edits, no weakened assertions, no test deletion (strict-superset only), never
  regenerate an expectation from own output. Frozen fixtures are FROZEN - new
  fixtures are added alongside, never edited into.

## Report
Per row clause built/partial; which exact-helper call sites were replaced
(enumerate file:line); frozen-fixture inventory added; targeted vitest counts
pasted; tsc -b exit; git diff --stat tail. Distinguish ran from inferred.
