# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 4312c3a (W-B1 wizard shell + suite hygiene merged). FLOORS:
vitest 3,154 tests / 193 files; Playwright 88 / 20 specs; build 0;
migrations 0000-0026 (0027 minted unmerged in wt/attunement); wire v1-v16
(v17 minted unmerged); existing a7-v* assertions.
All lanes merged main in (wt/pwa needed a one-hunk timeout-comment union,
resolved keeping BOTH measurements, tsc 0).

## RESTART POINT 2026-08-02 (read this first after any context loss)
MAIN a00455a+ (FF-A merged; post-merge vitest 201/3,232; PW floor 93).
0027/v17 now FROZEN. Mirror: push `git push mirror main` AFTER EVERY MERGE
(D161, remote already configured).
GATES IN FLIGHT:
- P0B (wt/party): tsc 0 + vitest 201/3,234 DONE (supervisor, post-FF-A
  merge); NEXT: full PW 44521, control from its report (fixture header
  mutations + absent-not-zero), D135 review, merge, THEN re-dispatch
  P1-GH (amendment file p1gh-amendment.md in scratchpad still applies).
- W-D (wt/print): codex claims 202/3,224 + PW 92 + build 0; needs merge
  main (FF-A), full supervisor gate on 44474, review, merge.
- SS-1 (wt/pwa): codex claims 202/3,226 + PW 92 + build 0; same gate on
  44531. Its controls are listed in ss1.log.
- SUBCL-SEED design (wt/resp): doc written, AWAITING supervisor review.
  Owner question found: retire EK/AT legacy subclasses later? UNASKED.
- ss-2 brief EXISTS but its author died on output-format — brief content
  UNVERIFIED; spot-check before dispatching SS-2.
QUESTION ROUND 3 UNASKED: update-prompt backup/changelog; bug-report
channel (in-app copy button?); AI-chat panel's shipped fate (unruled —
D140 is about supervision, not the panel); party-demo-at-sitting (moot?
D164 solo sitting may answer it).
D168 OPEN ITEM: org name (srd55 username TAKEN on GitHub); spike-repo
deletion still pending owner scope grant.
NEW UNITS from D165-D167: three walkthrough scripts, librarian guided
checklist (P5), weapons/armor authoring forms (HA chain).

## In flight (supervisor = FABLE, 2026-08-01) — CASCADE COMPLETE, MINT LANE CLOSING
MAIN e29cd35. CASCADE DONE: W-C c92051c, FIX-ATTR 5e76552, P0 e0c046b,
RESP-1 802658a all merged with full supervisor gates (controls + suites).
Design docs merged: W-MC multiclass (37d373f), SPELL-SEC (e29cd35, SS-3
gated on FF-C), GitHub spike evidence (a90c16f — real 409/404/CORS/
rate-limit shapes + the identical-bytes sha trap; two throwaway repos
remain under the owner's account pending delete_repo scope).
FLOORS: vitest 3,218 / 201 files; Playwright 92 tests / 20 spec FILES
(SUPERVISOR CORRECTION: an earlier line here said 22 specs — wrong, caught
by codex's P1-GH floor check; the spec-file count is 20 on main, the
92-test floor was and is verified); build 0; migrations 0000-0026 (0027 in
FF-A, ungated-merged); wire v1-v16 (v17 in FF-A); a7-v* assertions.
P1-GH GATE STOP (2026-08-01, ratified): D154's remaining-rate-budget
cannot pass through the P0 port (no success-arm observation metadata;
exact-shape type tests pin it). P0B dispatched in wt/party (log p0b.log,
port 44521) to widen the port; P1-GH re-dispatches after P0B merges. The
finding was codex's; the defective amendment was the supervisor's.
Rulings D147-D160 recorded (see decisions.md). New unit queue additions:
W-MC-1..6 (after W-F), SS-1..5 (SS-3 after FF-C), SUBCL-SEED (D151),
PARTY roster (D157, after P5), spell form + fork (D158, after HA backend),
compact-print + verbose appendix (D159, design needed), WebKit spike
(D153, supervisor, next quiet browser slot), BROWSER probe+banner unit.
IN FLIGHT NOW: FF-A final full PW on 44480 (build 0 + vitest 201/3,232
verified on merged tree; scans clean — only 0027/v17 minted). Then HA-1
full gate in wt/mint2.

## Owner rulings 2026-08-01 (D147-D155) — queue consequences
- D147 wizard multiclass (BG3 flow, SRD prereqs + house-rule toggle):
  design doc AUTHORED by codex in wt/pwa (2026-08-01-wizard-multiclass-entry
  .md, claims MINT-FREE via character_rule_overrides) — SUPERVISOR REVIEW
  PENDING before commit. Implementation only after W-F merges. INSIDE the
  gate per D148.
- D148 gate HOLDS in full, no early sitting.
- D149 NEW UNIT(s): sheet spell section + print appendix (multiclass
  grouped by class, ordered level then name); legacy /characters/:id/print
  route retires. Design doc needed.
- D150 LIVE FORGE SPIKE authorized — BLOCKED ON OWNER creating three
  throwaway repos + tokens; request list must be shown to owner pre-run.
- D151 NEW UNIT: seed ALL SRD 5.2.1 subclasses (pinned extract).
- D152 numbers-only print (no feature-text unit).
- D153 SUPERVISOR TASK: local WebKit feasibility spike (playwright webkit
  project, owner-ordered config scope); then iOS Safari support decision;
  probe+banner unit for other browsers either way.
- D154 party = anon-primary participation (P5 reshaped).
- D155 warn-once public permanence (P5 addition).
Taken-for-now (D7 register): P3 index carries roster-needed fields, roster
page deferred; forward-migration-over-existing-OPFS proof unit joins
publish-prep; update-prompt backup offer deferred (D116 tension — ask owner
at publish prep).
All four cascade lanes (print/attr/party/resp) carry main bd09ba7; wt/attr
needed two conflict hunks vs D91-R (import union in sheet-view.ts; kept
main's measured-timeout form in character-sheet.spec.ts:495), resolved
mechanically by the supervisor, tsc 0.
HYG-3 dispatched in wt/hyg2 (log hyg3.log, port 44494): the ai-chat
loopback annotation from the "NEXT HYGIENE TARGET" note below. Merge it
before running further full suites where possible.
CONCURRENCY RULE EXTENDED 2026-08-01: TWO FULL VITEST SUITES CONTEND WITH
EACH OTHER exactly as Playwright suites do — each spawns a full worker
pool. Evidence: W-C + FIX-ATTR vitest launched together at machine load
0.06; W-C came back 4 red, ALL FOUR pure timeouts (60s/5s limits) in
migration-chain DB tests W-C never touched (migrations.test.ts,
catalog-data-migration-prefix-*-late.test.ts — the same files measured
60s+ under load before). Run ONE full vitest at a time, same as Playwright.

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
