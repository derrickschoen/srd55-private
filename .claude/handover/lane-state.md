# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 5841448 (D91-M merged). FLOORS: vitest 3,132 tests / 192 files;
Playwright 88 tests / 20 specs; build exit 0; migrations 0000-0026; wire
v1-v16; existing a7-v* assertions. Baseline + D91-M gates all
supervisor-verified (post-merge main vitest 192/3,132 exit 0).

## In flight
- TRACK M (wt/attunement at 5841448): EXP-URL dispatching (doc-only, log
  expurl.log). Then FF-A (briefs/ff-a.md, port 44480) once EXP-URL merges.
- TRACK W (wt/print): W-B1 gate ran (touched-set exact, scans 0, build 0,
  merged vitest 193/3,150, D119 control both directions). D135 review round
  1: 1 High (terminal states drop pending_epic_resolution — D118 violation,
  verified at level-up-wizard.ts:51 vs seam lines 431/437/445) + 3 Medium
  (Cancel hardcoded vs launch surface; Gains not falsifiable; permissive
  a11y tests) — ALL FOUR ACCEPTED, none rejected. W-B1-FIX dispatched (log
  wb1-fix.log, port 44496). Re-gate after: vitest + control re-run +
  Playwright 44496 + round-2 review. Then W-B2 (briefs/w-b2.md).
- TRACK S (wt/pwa at 5841448): D91-R dispatching (briefs/d91-r.md, port
  44477, log d91r.log). Then FIX-ATTR, RESP-1, BANNER per HANDOVER §5.

## Rulings recorded this window
D118-D137 (see decisions.md). Newest four: D134 focus_points = Remaining
field; D135 codex review every unit; D136 stuck = multi-perspective
analysis, no strike limit; D137 whole queue including HA/CI.

## Taken-for-now register (D7-style defaults; flip cost noted)
- (none open — all prior defaults ratified or overridden by D118-D137)

## Codex-review rejection log (D135 step 5b)
- D91-M round 1: candidate-discovery pass for unknown formula features —
  REJECTED (extract SHA-pinned by srd-extract-provenance.test.ts; formula
  inventory design-time exhaustive). Defects 1-3 + 4a accepted and fixed.
- D91-M round 2: word-overlap header-masking edge (Focus Uses/Focus Points)
  — REJECTED (checksum test precedes the parser; realistic re-extract
  failure covered by the fixed non-overlapping case; adversarial-input
  construction, same rationale as round-1 4b). All four fixes verified
  real by the reviewer. Round 2 otherwise CLEAN; unit proceeds to merge on
  Playwright green (fix-gate: build 0, vitest 192/3,132, control 7-kill/
  13-restore).
