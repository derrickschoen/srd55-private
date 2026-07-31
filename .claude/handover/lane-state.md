# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 6a114de + (uncommitted Step-0 artifacts being committed now).
FLOORS: vitest 3,079 tests / 189 files; Playwright 88 tests / 20 specs;
build exit 0; migrations 0000-0025; wire v1-v16; existing a7-v* assertions.

## In flight
- Step 0 COMPLETE incl. baseline: build 0, vitest 189/3,079, Playwright
  88/88 on 44469 — all verified by supervisor on main b7b498e.
- TRACK M (wt/attunement): D91-M gate ran: touched-set 28 files OK, build 0,
  vitest 192/3,126, parser negative control proven both directions
  (mutate-d91m-parser.py). D135 codex review found 4 defects; 1-3 verified
  by supervisor at the cited lines, 4a (owning-class check) accepted, 4b
  (candidate-discovery pass) REJECTED — extract is SHA-pinned and the
  formula inventory is design-time exhaustive. Fix dispatch D91-M-FIX
  running (task bk7gwpon8, log d91m-fix.log, port 44470). Playwright gate
  was stopped (tree changing) — full re-gate after the fix: vitest +
  re-run negative control + Playwright 44470 + codex re-review round 2.
- TRACK W (wt/print): W-B1 dispatched EARLY (deviation from "after M0" —
  Taken for now: W-B1 depends only on merged W-A, not on migration 0026.
  Seam: floors in its brief are main's 3,079/189+88. Cost to flip: none.)
  Task <wb1>, log wb1.log, port 44471.
- TRACK S (wt/pwa): idle at 6a114de; S1 (D91-R) needs 0026 in main — waits
  for M0 merge.

## Rulings recorded this window
D118-D137 (see decisions.md). Newest four: D134 focus_points = Remaining
field; D135 codex review every unit; D136 stuck = multi-perspective
analysis, no strike limit; D137 whole queue including HA/CI.

## Taken-for-now register (D7-style defaults; flip cost noted)
- (none open — all prior defaults ratified or overridden by D118-D137)

## Codex-review rejection log (D135 step 5b)
- (empty)
