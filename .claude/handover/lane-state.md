# Lane state — 2026-07-31 (repo-resident, session-independent)

READ .claude/HANDOVER.md FIRST — it is the operating manual; this file is
only the fast-moving state it references.

Main HEAD: 4312c3a (W-B1 wizard shell + suite hygiene merged). FLOORS:
vitest 3,154 tests / 193 files; Playwright 88 / 20 specs; build 0;
migrations 0000-0026 (0027 minted unmerged in wt/attunement); wire v1-v16
(v17 minted unmerged); existing a7-v* assertions.
All lanes merged main in (wt/pwa needed a one-hunk timeout-comment union,
resolved keeping BOTH measurements, tsc 0).

## FINDING AGAINST SUPERVISOR WORK (2026-08-02, full length per protocol)
The D150 spike's repo layout was IMPROVISED by the supervisor
(library/species/<file>.json, characters/<player>/<file>.json) and does
NOT conform to the party design's flat layout that P0 implements
(library/party-library.json + two-segment publication-ID paths). The
P1-GH review caught the collision when adapter fixtures built on spike
captures either bypassed the RepositoryPath brand or carried rejected
paths. Ruling recorded in the fix brief: captured response SHAPES are
law; path/identifier VALUES are sanitizable when renamed consistently per
request/response pair with disclosure. A real 401 was captured
post-review (spike/20-bad-token-401.txt); 403/413 fixtures stay marked
SYNTHETIC with port-level assertions only.

## RESTART POINT 2026-08-03-e (newest - read first)
MAIN 17ba3c1 (CI-3a merged; mirror pushed). FLOORS: vitest 215/3,549; PW
121 (22 SPEC FILES - earlier "24/25 specs" floor lines were supervisor
counting errors; 22 is measured); build 0; migrations 0000-0030; wire
v1-v17.
CI-3a: 3 review rounds at cap + 3 fix rounds (r2 inverted to generic
default-include canonicalization; r3 seam alignment with runtime).
Closure adjudicated by supervisor probes. One dead control disclosed
(effect-notes vs null-only vectors) - became finding M3.
PROCESS LESSON (cost: three killed ~25-min gate chains): do NOT launch
the final full chain until review closure; reviews first, chain last.
MINT LANE NOW: CI-3c dispatched (equipment/item catalog, may mint 0031,
port 44556, resumed codex session 019fc7ba). Then CI-3b -> CI-3s -> CI-4a.
HOMEBREW: D189 recorded (monk lvl-6 cantrip-in-Flurry, unarmed-only).
Monk pitch catalog in wt/party 7cc8fe3 with owner; oath doc 76c50d0 with
owner.

## RESTART POINT 2026-08-03-d (superseded by -e)
MAIN f18a2b6 (HA-1b merged; mirror pushed). FLOORS: vitest 214/3,499; PW
121/25 specs; build 0; migrations 0000-0030 FROZEN; wire v1-v17.
MERGED TODAY (order): D177 guidelines f15fd1b, SC-1 e8274e2, FF-C d749f15,
D188 9481808, BROWSER-PROBE 357d63c, HA-1b f18a2b6 (migration 0030;
contract surgery from CI-3a's correct blocked report).
MINT LANE: CI-3a re-dispatched after HA-1b (resume codex session
019fc7ba-4370-7520-9ac9-6bae4f45131b in wt/attunement, port 44483).
HOMEBREW TRACK: oath doc reworked per D188, with owner (wt/party 76c50d0,
approval markers open). MONK (D169): distance research done (avoid: ki-to-
upcast, concentration melee scaling, attack-replacement casting, "Way of
the Arcane ___" naming); three brainstorm panels collated; owner browsing
flavor menus (mirror/mockery + lockdown/divine-list directions); bake-off
of 2-3 level-3 loops next once owner picks. FINDING (mine): both brainstorm
briefs said Monk=HIGH dependence; guideline 01 measures MEDIUM - both
agents caught it; cost nothing but the error was the supervisor's.

## RESTART POINT 2026-08-03-c (superseded by -d)
MAIN d749f15 (FF-C merged; mirror pushed). FLOORS: vitest 211/3,470; PW
107/24 specs; build 0; migrations 0000-0029; wire v1-v17.
FF-C landed with D162 persistence in character_rule_overrides (new
preference RPC), 2 review rounds, 2 supervisor controls. REJECTED review
findings on record: share-cap edge (typed refusal at capacity = D124
design; FLAG FOR OWNER question round), SC-1 exact-level-set (provenance
SHA owns content).
GATE QUEUE NEXT: BROWSER-PROBE (wt/hyg2, digest GATE-READY), then CI-3a
dispatch (mint lane wt/attunement now free, strictly serial). OATH DOC
still awaiting owner (wt/party 922052f). Idle lanes fast-forwarded.

## RESTART POINT 2026-08-03-b (superseded by -c)
MAIN e8274e2 (SC-1 merged; mirror pushed). FLOORS: vitest 211/3,462; PW
104/24; build 0; migrations 0000-0029; wire v1-v17.
MERGED THIS MORNING: D177 guidelines f15fd1b (opus hygiene audit SAFE,
CC-BY notice appended to 01/02; manager deviation: it did not commit its
own deliverable), SC-1 e8274e2 (2 review rounds, 9 mutation vectors;
exact-level-set ask REJECTED - provenance SHA owns content).
IN FLIGHT: FF-C (wt/attunement, fix round 1 committed - D162 persistence
moved off localStorage into character_rule_overrides via new RPC; review
round 2 + full vitest running; then control + full PW + merge).
OATH DOC: draft committed in wt/party 922052f, sent to owner, 9
OWNER-APPROVAL markers OPEN - do not merge until the owner rules.
FINDING (codex process): during FF-C review round 1 codex piped the diff
to `claude -p` as a sub-reviewer (timed out, exit 124). Claude-credit
substitution inside the codex role - review briefs now carry an explicit
"no other agents/CLIs" line.
CONTENTION NOTE: full vitest beside a codex single-file-PW fix round
produced a worker-RPC-timeout exit 1 with all tests green; uncontended
re-run exit 0. The one-suite law now also means: prefer a quiet machine
for the FINAL pre-merge run.
NEXT AFTER FF-C: BROWSER-PROBE gate (wt/hyg2, digest GATE-READY), then
CI-3a dispatch (mint lane, strictly serial).

## RESTART POINT 2026-08-03 (superseded by -b above)
MAIN 4314313 (D177). MERGED TODAY: W-F 9af49bd (BAR ITEM 3 CLOSED - the
whole wizard chain is done), HA-1 ff31fe4 (migration 0028; mint lane
OPEN). FLOORS: vitest 3,414+ / 208 files; PW 104 / 24 specs; build 0;
migrations 0000-0028 frozen; wire v1-v17.
GATE QUEUE: P3 in wt/party (fix round for 3 review findings running -
log p3-fix.log; pre-fix suite was INVALIDATED by fix-round overlap, HMR
navigation signature; after fix: full re-gate, control, merge as 0029,
drop residual stash@{0}); then FF-C (wt/attunement, done+ungated), SC-1
(wt/resp, fixed+ungated), BROWSER-PROBE (wt/hyg2, digest GATE-READY).
After P3 merges: CI-3a dispatches (mint lane, STRICTLY serial now).
D177 GUIDELINE PROJECT: an ISOLATED FABLE MANAGER agent owns it (spawns
its own fable researchers + codex synthesis + opus hygiene audit,
commits docs/design/subclass-guidelines/ itself, reports SANITIZED).
CLEAN-ROOM RULE FOR THIS SESSION: do NOT read the research task outputs
(tasks/a14f5*, tasks/a4b95*, scratchpad/subclass-anatomy.log) - the main
session stays unpolluted; consume only the committed guideline files.
BLACKGUARD (D175): outline presented to owner; awaiting their taste on
name / level-10 slot / fiendish-vs-subtle. Then codex design doc on the
parallel track (does NOT block publication). OGL quarantine = D176.
Open owner items: org name (D168), spike-repo deletion, invented-monk
draft (D169), SS-2B marker extension flagged for next question round.

## MINT COLLISION 2026-08-02 (supervisor scheduling miss, full length)
P3 (dispatched to wt/party with a MINT brief) minted 0028_party_document_
states while HA-1's committed-but-ungated 0028 sat in wt/mint2. The brief
told codex to verify the tail; it verified against MAIN, where 0028 was
free - the collision is the supervisor's for dispatching a mint outside
the mint-lane serialization with a mint outstanding. RESOLUTION: HA-1's
0028 wins (mint lane, minted first). Order: HA-1 full gate + merge NOW,
then P3 fix-dispatch renumbers its migration to 0029 (file + registry +
schema-signature test), then P3 gate. P3's numbers (vitest 209/3,347, PW
100 claimed) will need re-verification after the renumber.

## SEAM RULING 2026-08-02 (taken-for-now, D7 register)
W-F round 2 stop, ratified: LU-W §7.4 (every acquired spell on the sheet)
vs SS-2 (unprepared spellbook entries excluded from Prepared/Known).
Resolution: SS-2B dispatched (wt/pwa, ss2b.log, port 44537) - distinct
"Spellbook" marker rows under the class group, after prepared/known,
same comparator, screen+print. Seam: marker vocabulary; flip cost: a
display toggle. W-F re-dispatches (third time) after SS-2B merges.
Owner note: this extends D149's marker set; flagged for the owner's
next question round rather than blocking.

## RESTART POINT 2026-08-02-c (read this first after any context loss)
MAIN c1830df (W-E merged; post-merge vitest 3,292; PW floor 97; mirror
pushed). MERGED since -b: SS-1 eafbd68 amendment note, W-D 9a00a8d,
P1-GH a0a5382, D173 e2ca90b, W-E c1830df.
OWNER QUESTION IN FLIGHT - MUST BE ANSWERED WHEN AGENTS RETURN: the owner
asked for (1) subclasses in older SRDs absent from SRD 5.2.1 with
2024-PHB markings, and (2) spells in older SRDs absent from 5.2.1 plus
old-vs-2024 mechanical differences. Two sonnet agents are researching
(logs land as task notifications). Synthesize + sanity-check their
VERIFIED-vs-RECALLED labels, then answer the owner context-rich.
IN FLIGHT: SS-2 full gate (wt/pwa, task running: merge+tscb+build+vitest+
PW 44532; on green: noncanonical-order control from ss2-fix, then merge,
THEN re-dispatch W-F which correctly gate-stopped on SS-2's files);
SC-1 (wt/resp, sc1.log); FF-C (wt/attunement, ffc.log, D162 amendment,
exports appendix machinery SS-3 needs).
STILL QUEUED: P2 gate (wt/party - ADJUDICATE codex's contradicted
full-suite claim: log showed 8 fails/5 files in known contention set vs
claimed 1; typecheck absent from its transcript - my solo numbers decide;
record claimed-vs-verified either way); BROWSER-PROBE gate (wt/hyg2,
digest verdict GATE-READY); HA-1 full gate (wt/mint2, mint-lane blocker);
then CI-3a. Sol-digest precedent: fix-log digestion via model:sonnet
agent worked well (caught the P2 claim discrepancy).
LOOP: dynamic heartbeat re-arms each turn with the owner's amended
prompt (parallelize + delegate-to-sol language). Fix rounds W-E/SS-2/P2/
BROWSER-PROBE all returned; W-E fully gated with TWO supervisor controls.

## RESTART POINT 2026-08-02-b (read this first after any context loss)
MAIN a0a5382. Mirror derrickschoen/srd55-private: push after EVERY merge.
MERGED TODAY: FF-A a00455a, P0B 582a175, SS-1 eafbd68, W-D 9a00a8d,
P1-GH a0a5382, + design docs (W-MC, SPELL-SEC, SUBCL-SEED, spike
evidence). FLOORS: vitest 3,280 / 204 files; PW 93 tests / 20 spec files;
build 0; migrations 0000-0027 frozen; wire v1-v17 frozen.
CONCURRENCY LAW: ONE full suite of any kind machine-wide; ~4 codex
dispatches max; codex CLI --testTimeout/--timeout flags are NOT gate
results.
IN FLIGHT: W-E (wt/print, log we.log); SS-2 (wt/pwa, ss2.log, amendment:
SS-1 already attached CharacterSheet.spells); P2 (wt/party, p2.log,
amendment: D154/D155/D156/D163 win); BROWSER-PROBE (wt/hyg2,
browser-probe.log); brief workflow authoring sc-1..6, walk-3,
update-prompt, bug-report.
NEXT GATES WAITING: HA-1 in wt/mint2 (committed long ago, needs merge
main + FULL gate + review - THE MINT LANE IS BLOCKED ON IT: after it,
CI-3a per the recorded mint order). Also pending: SUBCL invented-monk
draft for owner approval (D169); WebKit spike (D153); org name (D168);
spike-repo deletion (needs delete_repo grant); P1-GL/P1-CB briefs exist
(fixtures-only per D160).
QUESTION ROUNDS: 1-3 done (D161-D172). Codex review rejection log
addition - P1-GH round 2 read()-equality finding REJECTED (equality
against a parsed brand refuses mismatch; verified github.ts:331).

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
CONCURRENCY RULE TIGHTENED 2026-08-02: a FULL vitest beside a FULL
Playwright suite ALSO produces false reds — W-D's solo-green vitest went
3-red (authoring-contracts 10s probe + both 0011-0021 prefix tests at
60s, pure timeouts, none in W-D's files) while SS-1's suite ran. FINAL
RULE: at most ONE full suite of ANY kind machine-wide; single-FILE vitest
runs are the only thing allowed beside a running suite.
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
