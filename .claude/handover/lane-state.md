# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 4312c3a (W-B1 wizard shell + suite hygiene merged). FLOORS:
vitest 3,154 tests / 193 files; Playwright 88 / 20 specs; build 0;
migrations 0000-0026 (0027 minted unmerged in wt/attunement); wire v1-v16
(v17 minted unmerged); existing a7-v* assertions.
All lanes merged main in (wt/pwa needed a one-hunk timeout-comment union,
resolved keeping BOTH measurements, tsc 0).

## In flight (supervisor = OPUS from this point; Fable credits exhausted)
- TRACK M (wt/attunement): FF-A gates by OPUS: scans 0/no-config/no-frozen,
  mints exactly 0027+v17, vitest 193/3,164 exit 0 (floor 3,154 + FF-A's 10,
  reconciles), D124 consent-gate negative control PROVEN both directions
  (mutate-ffa-toggle.py: killed 'flavor portability separates notes
  privacy' +6, revert 81/81 clean).
  D135 review round 1: FOUR defects, ALL VERIFIED BY SUPERVISOR AT THE
  CITED LINES AND ACCEPTED, none rejected:
  (P1) the share checkbox still reads 'Include my notes about this
  character' while the toggle exports alignment+appearance+backstory too —
  a real consent defect against D124 that would have shipped to main;
  (P1) notes validated with text() UTF-16 length while the three new
  fields use codePointText() — one toggle counting two ways;
  (P2) the typed too_large refusal exists in the client but the UI still
  calls createFragment(), so nothing consumes it (D124 requires an
  explicit error);
  (P2) the a7-v15 predecessor freeze is not falsifiably tested.
  FF-A-FIX dispatched (log ffa-fix.log, port 44480); FF-A's own PW run was
  STOPPED mid-flight because the tree is changing. Re-gate after: vitest,
  re-run mutate-ffa-toggle.py control, full PW 44480, round-2 review,
  merge.
- TRACK S (wt/pwa): D91-R + FIX + FIX2 all committed; main merged in.
  OPUS gates: scans 0, no mint/UnitM files, build 0, vitest 194/3,169
  exit 0, shape control re-proven (now kills the exhaustive-table test
  too).
  D135 ROUND 2: fixes (2)(3)(4) verified real and complete; fix (1) found
  INCOMPLETE and the supervisor CONFIRMED it at sheet.ts:1802/:1876 —
  FIX2 discarded an invalid contributor and kept resolving the SAME
  family, so invalid Wizard 3 + valid Cleric 2 falls into the
  sole-base-caster branch and PRINTS CLERIC-ONLY SLOTS (effective level 2)
  where the truth is effective level 5 -> 4/3/2. A plausible wrong number
  presented as fact = D33 violation, higher severity than the round-1
  finding. Rule now specified: any invalid contributor makes its WHOLE
  family absent-and-stated (no partial totals); families stay independent
  of each other. D91-R-FIX3 dispatched (log d91r-fix3.log, port 44477);
  D91-R's PW run was STOPPED (tree changing). This is round 3 of 3 for
  this unit under the D135 cap — if round-3 review is not CLEAN, invoke
  D136 (multi-perspective analysis) rather than a fourth blind fix.
  Re-gate after FIX3: vitest, shape control, full PW 44477, round-3
  review, merge.
- TRACK W (wt/print): W-B2 implementing (log wb2.log, port 44472).

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
