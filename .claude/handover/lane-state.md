# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 4312c3a (W-B1 wizard shell + suite hygiene merged). FLOORS:
vitest 3,154 tests / 193 files; Playwright 88 / 20 specs; build 0;
migrations 0000-0026 (0027 minted unmerged in wt/attunement); wire v1-v16
(v17 minted unmerged); existing a7-v* assertions.
All lanes merged main in (wt/pwa needed a one-hunk timeout-comment union,
resolved keeping BOTH measurements, tsc 0).

## In flight (supervisor = OPUS) — EIGHT LANES
MAIN 33a8693. FLOORS: vitest 3,162 / 194 files; Playwright 88 / 20 specs;
build 0; migrations 0000-0026; wire v1-v16; a7-v* assertions.

**MINT ORDER CORRECTED 2026-08-01 (a real dependency finding).** DOC-C was
dispatched into the chained mint lane and codex STOPPED under process rule 6:
DOC-C's reference closure needs the semantic projectors and the CI-2a
plan/commit importer (planContentImport / commitContentImport /
installContentAggregate / PortableContentAggregate) — none of which exist.
Those come from CI-3a/CI-3b/CI-4a. So the party document formats sit DEEP in
the mint chain, not at its head. TRUE MINT ORDER:
  FF-A (in flight) -> HA-1 -> CI-3a -> CI-3c -> CI-3b -> CI-3s -> CI-4a ->
  CI-4b -> DOC-C -> DOC-L -> AR-A -> HA-2 -> CI-5 -> HA-3/4/5 -> CI-6/7/8
Consequence worth carrying to the owner: party storage (D145/D146, inside
v1) cannot land until most of the CI chain lands.

- wt/attunement (MINT HEAD): FF-A-FIX2 (D142 notes cap 20,000 + the
  SharePreview.includesNotes rename the round-2 review caught).
- wt/mint2 (MINT CHAIN, branched from mint tip, inherits 0027/v17): HA-1
  authorable effect storage + fingerprint inventory, port 44482. Deps
  verified merged: HA-0 3ff299a, CI-2a e121b4c.
- wt/print: W-C rollback preview adapter, port 44473.
- wt/pwa: D91-R-FIX4 — the D143a whole-section fallback (see below).
- wt/attr: FIX-ATTR print attribution + build id, port 44478.
- wt/resp: RESP-1 responsive pass, port 44484.
- wt/party: P0 storage contracts + recorded-fixture harness, port 44510.
- Briefs ready and unblocked-when-their-deps-land: p1-gh/gl/cb, p2..p7,
  ff-b, ff-c, doc-c (do NOT dispatch until CI-4b merges), ar-* per NOTES.

## MACHINE-WIDE GATE BLOCKER (2026-08-01) — and its evidence
Eight concurrent lanes exceeded what main's per-test timeouts tolerate. THREE
independent lanes failed their full Playwright on the SAME one or two tests:
  tests/browser/reports-and-print.spec.ts:83  — 36.3s ALONE (W-C), 34.9-35.8s
    (D91-R), i.e. over the 30s default even uncontended
  tests/browser/php-feature-parity.spec.ts:1520 — 25.2s alone, <20% margin
PROVEN NOT CAUSED BY THE UNITS: in wt/resp the supervisor stashed RESP-1's
entire diff and the same test failed identically, then restored it. So the
failure is attributable to load and to alone-times near the ceiling, not to
any lane's changes.
FIX IN FLIGHT: SUITE-HYGIENE-2 in wt/hyg2 (branched from main, log hyg2.log,
port 44493) adds measured per-test timeouts to both, plus any other test in
those two files at/over 15s alone. MERGE IT FIRST; every other lane then
merges main and re-runs its full Playwright ONCE for a clean signal.
DO NOT merge a unit on a red suite. DO NOT accept a global --timeout override
as a gate result (rejected once already this session).

CORROBORATION: codex independently ran the same diagnostic in wt/party —
removed P0's own integration, watched the test fail identically. Two
independent parties, same conclusion.

TRIPWIRE: P0 described the failure as "the build-report screen does not
return after reload", which is hang-shaped rather than slow-shaped. The test
DOES pass on a quiet machine (88 green in W-B2's run, 89 in FF-A's and
D91-R's), so timing is the current best explanation. BUT if it still fails
after SUITE-HYGIENE-2's 90s ceiling merges, that is a REAL defect in the
build-report route and must be dispatched as one — do not raise the ceiling
again.

NEXT HYGIENE TARGET (do this before the cascade's later suites):
tests/browser/ai-chat.spec.ts:215 "a hostile page on another loopback origin
cannot reach the bridge, even holding the secret" — measured 22.5s ALONE
against the 30s default, i.e. ~25% margin, and it timed out at 30.3s in a
loaded full run. The supervisor re-ran it isolated and the SECURITY PROPERTY
HOLDS; the failure was contention. It qualifies for the same measured
annotation as the hygiene-2 tests (rule: >=15s alone gets one). Annotate it
before it costs another lane a false red. NOTE: this spec starts a second
loopback origin, so it may be more load-sensitive than its runtime suggests.

MERGE CASCADE once hyg2 is on main (four units are committed and scanned
clean, awaiting only a trustworthy suite):
  wt/print  W-C      14 files  vitest 195/3,168 (codex), review CLEAN
  wt/resp   RESP-1    4 files  vitest 194/3,162, review CLEAN
  wt/attr   FIX-ATTR  6 files  vitest 194/3,162, review CLEAN
  wt/party  P0       (mint-free) vitest 199/3,189, review CLEAN round 2
For each: merge main, full PW ONCE, D135 review, then merge-to-main.sh.
Run the four D135 reviews concurrently (read-only, cheap); run at most TWO
Playwright suites at a time — eight lanes is what caused this blocker.



## D91-R: D143a fallback taken (round 3 of 3)
Round 3 found the last per-family gap at sheet.ts:1760 — an invalid base
progression_type IS the family discriminator, so neither family is knowable,
yet both still printed. D143's pre-authorization triggered; supervisor took
the whole-section rule WITHOUT asking. FIX4 in flight. Gate after: vitest,
shape control, full PW 44477, ONE more review, merge. When gating, CHECK
that replaced assertions carry their ruling justification (D143a) rather
than reading as deletions-to-green.

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
