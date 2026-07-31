# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 6a114de + (uncommitted Step-0 artifacts being committed now).
FLOORS: vitest 3,079 tests / 189 files; Playwright 88 tests / 20 specs;
build exit 0; migrations 0000-0025; wire v1-v16; existing a7-v* assertions.

## In flight / next actions (HANDOVER §5 queue positions)
- Step 0: artifacts committed; BASELINE STILL PENDING (build + vitest +
  Playwright on PLAYWRIGHT_PORT=44469 against main — run before any gate).
- TRACK M (wt/attunement at e0a9726): D91-M awaiting gate = M0. Its codex
  log lived in the old session scratchpad (d91m.log); if gone, gate stands
  on your own runs (claims restated in HANDOVER §2).
- TRACK W (wt/print at 6a114de): idle; W1 (W-B1) dispatches after M0 merges
  and lanes fast-forward.
- TRACK S (wt/pwa at 6a114de): idle; S1 (D91-R) dispatches after M0 merges
  (needs migration 0026 in main).

## Rulings recorded this window
D118-D137 (see decisions.md). Newest four: D134 focus_points = Remaining
field; D135 codex review every unit; D136 stuck = multi-perspective
analysis, no strike limit; D137 whole queue including HA/CI.

## Taken-for-now register (D7-style defaults; flip cost noted)
- (none open — all prior defaults ratified or overridden by D118-D137)

## Codex-review rejection log (D135 step 5b)
- (empty)
