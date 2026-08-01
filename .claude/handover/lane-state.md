# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 4312c3a (W-B1 wizard shell + suite hygiene merged). FLOORS:
vitest 3,154 tests / 193 files; Playwright 88 / 20 specs; build 0;
migrations 0000-0026 (0027 minted unmerged in wt/attunement); wire v1-v16
(v17 minted unmerged); existing a7-v* assertions.
All lanes merged main in (wt/pwa needed a one-hunk timeout-comment union,
resolved keeping BOTH measurements, tsc 0).

## In flight (supervisor = OPUS)
- TRACK M (wt/attunement): FF-A + FF-A-FIX committed in-lane (50 files vs
  main; scans 0 forbidden, NO config touched, mints 0027+v17 only).
  FF-A-FIX closed all four round-1 defects incl. the consent-label privacy
  defect. FINDING AGAINST THE WORK: codex's own Playwright claim (89 pass)
  used a GLOBAL `--timeout=60000` CLI override; its unmodified run was
  87/89 with two 30s timeouts. A global override is not an acceptable gate
  result — the sanctioned remedy is per-test timeouts with measured
  alone-times. SUPERVISOR MUST re-run full PW on 44480 with NO override;
  if the same two tests time out, dispatch a measured per-test annotation
  fixlet (identical pattern to the merged suite-hygiene unit), never a
  global flag. Then: vitest, re-run mutate-ffa-toggle.py control, round-2
  review, merge.
- TRACK S (wt/pwa): D91-R + FIX + FIX2 + FIX3 all committed. FIX3
  implements D143 (per-family absence, no partial totals). Codex claims
  vitest 194/3,172, PW 89 on 44477, build 0, its own re-review CLEAN.
  OWED by supervisor: vitest, shape control re-run, full PW 44477,
  round-3 D135 review, merge. D143 pre-authorizes the whole-section
  fallback if round 3 still finds it wrong — take it WITHOUT asking.
- TRACK W (wt/print): W-B2 complete, uncommitted, awaiting gate. Codex
  reports named controls verified + clean second-agent review; it modified
  NO Playwright specs. Gate: commit, merge main in, scans, build, vitest,
  one negative control (suggest add-radio-to-refused-card), full PW on
  44472, D135 review, merge. Then W-C (briefs/w-c.md, port 44473).

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
