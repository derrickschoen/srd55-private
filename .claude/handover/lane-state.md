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
MAIN 652a1a0. FLOORS: vitest 3,162 / 194 files; Playwright 88 / 20 specs;
build 0; migrations 0000-0026; wire v1-v16; existing a7-v* assertions.
MERGED THIS WINDOW: W-B2 (feat/Epic cards) — first unit to pass its D135
review CLEAN on the first round.

- TRACK M (wt/attunement): FF-A + FIX committed. My gates: scans clean,
  vitest 193/3,167, consent control re-proven on the RENAMED contract,
  Playwright 89/89 with NO override (codex's earlier 89 used a global
  --timeout=60000 and was rejected; the clean re-run vindicated the code,
  not the claim). Round-2 review: TWO defects accepted — (a) D142's raise
  of the notes cap to 20,000 is unimplemented (limit still 2,000; that
  ruling postdates the first fix, so it is new work), (b) the consent
  rename missed SharePreview.includesNotes, which now computes "any of the
  four" while still named for notes alone — a name that lies, same defect
  class as the checkbox label. FF-A-FIX2 dispatched (log ffa-fix2.log).
  Re-gate after: vitest, consent control, PW 44480 with NO override,
  round-3 review, merge.
- TRACK W (wt/print at main): FREE. Next: W-C from briefs/w-c.md, port
  44473 (LU-2 projection + identity-sentinel rollback preview).
- TRACK S (wt/pwa): D91-R + FIX + FIX2 + FIX3 committed; my gates done
  except the FINAL full PW on 44477 (the earlier run was stopped when FIX3
  changed the tree) and the round-3 D135 review. D143 pre-authorizes the
  whole-section fallback if that review still finds it wrong — take it
  WITHOUT asking.
- TRACK P (wt/party, NEW 4th worktree): PARTY-0 design committed
  (docs/design/2026-08-01-party-storage.md, 719 lines, 10 units).
  Sentinel gate PARTY-TOKEN-NEVER-TRAVELS specified. D146 settles scope
  (library AND characters) and sessionStorage credentials. Next: DOC-C and
  DOC-L are the mint prerequisites and belong to TRACK M's serial mint
  lane; P0 (contracts + recorded-fixture harness) is mint-free and can
  start in wt/party immediately after a brief is written from the design's
  section 12 unit table.

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
