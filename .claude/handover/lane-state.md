# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 5841448 (D91-M merged). FLOORS: vitest 3,132 tests / 192 files;
Playwright 88 tests / 20 specs; build exit 0; migrations 0000-0026; wire
v1-v16; existing a7-v* assertions. Baseline + D91-M gates all
supervisor-verified (post-merge main vitest 192/3,132 exit 0).

## In flight
- Main bb6dc0b. THREE lanes now hold gated-or-gating work:
- TRACK M (wt/attunement): FF-A implemented + committed in-lane (48 files,
  scans clean, mints = migration 0027 + wire v17 exactly as owned). Codex
  claims vitest 192/3,142 exit 0, build 0, frozen zero-diffs; its full PW
  87/88 with the one failure = php-parity 'captures every restorable'
  timeout 31.4s vs 30s — the SAME machine-wide contention pattern (test
  measured 21.0s alone). Supervisor gates still owed: full vitest, one
  negative control (suggest: single-toggle share gate — option off carries
  none of the four fields; or the size-guard refusal), full PW, D135
  review, merge. NOTE: FF-A edited php-feature-parity.spec.ts — expect a
  mechanical merge with the hygiene fixlet's timeout annotations.
- SUITE-HYGIENE fixlet dispatched in wt/print (log hygiene.log, port
  44496): measured 60_000 per-test timeouts for ALL >=15s-alone heavy
  tests in php-parity + guided-builder specs, then a full PW. This ends
  the four-instance flake rotation. On its green: merge W-B1 (+hygiene)
  via merge-to-main.sh, post-merge vitest on main, fast-forward all lanes,
  dispatch W-B2; then re-gate FF-A and D91-R(+FIX2) whose reruns inherit
  the annotations via merge-main.
- TRACK W (wt/print): W-B1+FIX all gates green EXCEPT the full-PW merge
  gate, which has flaked on a DIFFERENT single spec in each of two
  contended runs (reports-and-print:83 then guided-builder:39), both
  timeout-signature, both proven isolated-green by the supervisor (35s-fix
  applied to the first in wt/pwa; guided-builder:39 measured 20.2s alone vs
  its 30s ceiling = thin margin under 3-lane load). NEXT STEP (when FF-A
  and D91-R-FIX2 codex runs finish): dispatch a one-line codex fixlet
  adding a measured per-test timeout (60_000, comment '20.2s alone') to
  guided-builder.spec.ts:39 in wt/print, then ONE quiet full PW on 44496;
  green -> merge via merge-to-main.sh, post-merge vitest on main,
  fast-forward, dispatch W-B2 (briefs/w-b2.md). Round-2 review already
  CLEAN; vitest 193/3,154 and controls already supervisor-verified.
- TRACK S (wt/pwa): D91-R implemented + committed in-lane (supervisor).
  Scans 0 forbidden, no Unit-M files touched, 10 files in scope. Codex
  claims vitest 193/3,142, build 0; its full Playwright was 87/89 — one
  contention flake (28.0s isolated green) and ONE REAL durational finding:
  reports-and-print exceeds its 30s per-test timeout even isolated
  (34.9-35.8s) because the print render got heavier. Codex correctly
  refused the out-of-scope edit; supervisor lifted the fence for exactly
  that spec — D91-R-FIX dispatched (log d91r-fix.log, port 44477):
  measured per-test timeout amendment, full PW re-run. Remaining gate
  after: supervisor full vitest + one negative control (pick from the
  20-row table in d91r.log) + full PW + D135 review + merge.
  Then FIX-ATTR, RESP-1, BANNER per HANDOVER §5.

## D91-R review round 1 (D135) — all four ACCEPTED, FIX2 in flight
- sheet.ts:1752 return-aborts whole slot resolver on one bad class (verified
  by supervisor at the line) -> families must resolve independently.
- Unmarked class-name interpolation in absence details (D4 free-text).
- Classification-map test not exhaustive (flip wild_shape stays green).
- break-inside not asserted in print test.
FIX2 dispatched (log d91r-fix2.log, port 44477). After it: supervisor
re-gate (vitest + shape control re-run + full PW) + round-2 review + merge.

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
