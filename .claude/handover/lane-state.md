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

## RESTART POINT 2026-08-07-a (newest - read first)
MAIN e121578 (mirror push pending). FLOORS: vitest 252/4,132 all-pass;
PW 129 pool; build 0; migrations 0000-0039 FROZEN (next free mint 0040).
THIRTY-NINE merges. Rulings through D224.

MERGED SINCE 08-06-k:
 - DICE-DEBRAND (e121578, 39th): D220. Elven Accuracy -> Triple
   Advantage; Elemental Adept -> parameterized die-upgrade with
   resistance bypass split out. Found a real wrong-number bug (Sorcerous
   Burst triggered on the RAW face while displaying the promoted one),
   a NaN-admitting contract (now a branded PromotedDieOutcome with a
   negative COMPILE probe), and substring-matching "exact message" pins.

ENVIRONMENT FINDING - ROUTE-READINESS TIMEOUTS UNDER LOAD (recurring,
now 4+ lanes: ADF, HA-8, HA-10, DICE). Symptom: a spec waiting on
`#status[data-ready="true"]` or `.homebrew-status` times out at 45-65s
during a full pool run while several codex lanes are active; the same
spec passes in isolation in 15-20s. It is NOT one spec - it has hit
php-feature-parity-commands, php-feature-parity-catalog-backup,
character-sheet, and homebrew-subclass-authoring. DO NOT adjudicate
these as noise by re-running until green; the standing rule is complete
all-pass counts. Current practice: re-run the failing spec in isolation,
and if it passes, DISCLOSE the flake in the merge message with both
counts rather than calling it noise. This deserves its own hardening
unit under D213 - the boot/readiness signal is too slow or too fragile
under contention.

RULINGS 08-07: D220 (de-brand + generalize the two non-SRD dice
mechanics), D221 (seed-scope runs in parallel; catalog unit merges
BEFORE the retirement unit), D222 (a deliberately boring third-caster
carries the test pins), D223 (third-caster ladders DERIVED from the SRD
Multiclass Spellcaster table via floor(level/3), never transcribed -
answers the owner's PHB-table licensing question with evidence), D224
(D222's "content only" means NO TEST PINS, not "no mechanics" - a
supervisor wording ambiguity that shipped Barbed Court as a non-caster).

IN FLIGHT:
 - HA-10 (wt/ha10): 3 review rounds + blocker + 2 gate-fix rounds. Now
   has a DERIVED catalog-layer completeness guard (165 modules via the
   TS checker) and a shared catalog-control-disclosure seam (optgroup
   labels + aria-describedby; form controls keep clean selectable
   names). Needs a full gate chain re-run.
 - BHC (wt/bhc): 3 review rounds + blocker resolved. Needs vitest + PW.
   Carries the ROOT FIX for a real production bug: bundled spell
   registration used normalizeCatalogName (keeps separators) while
   identity derivation strips them, so EVERY multiword bundled spell had
   a mismatched fingerprint. Fixed at registration + a bundled-only D205
   repair; a sibling defect in shared-spell placeholder registration
   (character-share.ts) fixed too. An earlier attempt to paper over this
   by substituting the REGISTERED name into live verification was caught
   and reverted byte-clean - it would have made stored-name drift
   invisible.

QUEUE: HA-10 -> BHC -> SRD-ONLY (brief written, hard-gated on BHC) ->
HA-11 (brief written) -> HA-12 -> D213 hardening (add the readiness
fragility above).

WORKTREES: wt/party (owner's - never prune), wt/ha10, wt/bhc. wt/dice
prunable.

## RESTART POINT 2026-08-06-k (superseded by 08-07-a)
MAIN cd7b190 (mirror push pending this commit). FLOORS: vitest 252/4,126
zero errors; PW 129 pool; build 0; migrations 0000-0039 FROZEN (next free
mint 0040); backup v5. THIRTY-EIGHT merges. Rulings through D216.

MERGED SINCE 08-06-j:
 - HA-9 (cd7b190, 38th): background authoring form on the exact
   BackgroundAuthoringDraft contract + read-only backgroundReferences
   seam; edit-generation extracted to src/ui/authoring/edit-generation.ts
   and shared by both forms (one superseding semantic, pinned).

GATE RULE CHANGED (COMMON.md amended, edac8c4): THE COMPILE GATE IS
`npm run build`. `tsc -p tsconfig.app.json --noEmit` does NOT typecheck
test files the way `tsc -b` does; TS2349 closure-narrowing broke the
build in BOTH HA-8 and HA-9 while app-config tsc read 0. Holder-object
pattern recorded. Codex census: no remaining sites in species/subclass
lane tests.

FINDING AGAINST A CODEX REPORT (HA-9 review round 1): the implementation
report pasted a green targeted run that OMITTED tests/unit/authoring-
contracts.test.ts - the one pin its own change broke. Supervisor ran it:
failed. Rule now in the fix-round briefs: after adding a field to an
exported contract constant, grep for shape assertions and run them.

FINDING AGAINST A SUPERVISOR BRIEF (HA-9): the first ha-9.md invented
backend fields (background feature name/description, language grants).
Codex stopped and reported infeasibility - correct. Brief rewritten
against the real contract before any code; recorded in the merge message.

RULINGS 08-06 (later): D215 SRD-only default seed, bundled homebrew as a
click-to-import option installed via the real publish path, Veteran +
Barbed Court Monk included; D216 EK and AT
dropped ENTIRELY (repo, not just seed), their third-caster coverage
converting onto Barbed Court Monk.

OWNER DECISION OPEN - DO NOT ACT WITHOUT IT: licensing sweep (2026-08-06)
reported to the owner. Findings: (a) Elemental Adept and Elven Accuracy
are non-SRD feats with mechanics IMPLEMENTED in shipping
src/ui/screens/planner/dice.ts - the largest exposure found; (b) test
fixtures carry an Artificer 20-level progression, an Echo Knight subclass
with features, and a Thorn Whip stat block; (c) ~15 name-only mentions,
mostly meta-discussion in decisions.md of content deliberately NOT used;
(d) 15 captured GitHub .http fixtures have no NOTICE.md entry; (e)
attribution itself is correct (NOTICE.md + docs/srd/ATTRIBUTION.md carry
the verbatim CC-BY notice). The owner asked about rewriting history to
purge EK/AT: VERIFIED that NO EK/AT rules prose ever entered git (searched
all history for Weapon Bond, War Magic, Mage Hand Legerdemain: zero
hits) - only names + a third-caster numeric table, first at b0af6f8
(2026-07-23), with 889 of 896 commits downstream. Awaiting the owner's
call on both the rewrite and the EA/Elven-Accuracy removal.

QUEUE: VET-REPUB (now D211+D215+D216 - bigger: seed-scope change, import
option, two subclasses; brief needs a rebuild) -> HA-10 -> HA-11
(D138+D214) -> HA-12 -> D213 hardening.

WORKTREES: wt/party (owner's - never prune). wt/ha9 prunable.

## RESTART POINT 2026-08-06-j (superseded by 08-06-k)
MAIN bf26846 (mirror pushed). FLOORS: vitest 250/4,114 zero errors; PW
128 pool (~9.6 min; subclass journey 14.8s of 125s budget); build 0;
migrations 0000-0039 FROZEN (next free mint 0040); backup v5.
THIRTY-SEVEN merges. Rulings through D214.

MERGED SINCE 08-06-i:
 - HA-8 (bf26846, 37th): subclass timeline form, mint-free. Publisher
   now owns monotonic/gap/max-level progression rules (shared validator);
   edit-generation discipline kills two HIGH data-loss races (late save
   clobber, stale-preview publish); byte round-trip, 15-issue census,
   captured-ID rollback census, reachable dirty-publish pin. Gate
   history: 3 review rounds + blocker round (two false pins escalated
   and fixed; failure-branch pin mutation-tested by supervisor).
   Journey exposed 3 spec defects post-cap (aria-label duplicate,
   hasText ambiguity, route-owned readiness) - route-owned readiness is
   now the recorded journey convention (homebrewReady + cross-route
   global-ready check). Supervisor deltas 4x APPROVE by codex
   micro-review. SUPERVISOR PROCESS FAILURE recorded in the merge
   message: one commit landed behind a grep-gated && chain while a test
   was red (caught pre-merge; rule: never gate a commit on a pipeline
   that eats the suite's exit).

IN FLIGHT: HA-9 dispatching (brief briefs/ha-9.md: background form,
generation-discipline EXTRACTION to a shared seam, all HA-8 lessons
pre-empted, PW port 4774).

QUEUE: HA-9 -> VET-REPUB (D211) -> HA-10 -> HA-11 (D138+D214) -> HA-12
-> D213 hardening.

WORKTREES: wt/party (owner's - never prune), wt/ha9 (creating).

## RESTART POINT 2026-08-06-i (superseded by 08-06-j)
MAIN 92204c5 (mirror pushed). GATE DEBT CLEARED: full vitest on main
248/4,087 complete all-pass, zero errors, run WHILE two codex processes
loaded the machine - the budget fix holds. 92204c5 is supervisor-
authored (hang-guard budgets 120s/30s for the two contention-flaky db
tests, measured arithmetic inline) and still needs its independent codex
review - bundle into the next read-only dispatch.
THIRTY-SIX merges. Rulings through D214 (purge removes whole lineage set
via one guarded 0039 exception; set restore all-or-nothing; HA-11 pins).

MERGED SINCE 08-06-h:
 - ADF (f33105a, 36th): test-only. The CI-7 post-merge unhandled
   rejections were NOT a production bug: two character-list tests
   interacted with unmounted import controls; showModal threw in the
   test DOM before the modal assignment, leaving a half-created dialog.
   Fix mounts controls + pins dialog connected/open. Supervisor-verified:
   tsc 0, targeted 2/26 all-pass, zero unhandled errors. The 08-06-h
   OPEN FINDING is CLOSED. PW skipped (no src/dist change).

GATE DEBT: ADF post-merge full vitest ran while HA-8 review2 codex was
active -> 2 TIMEOUT failures (bootstrap.test.ts repair test 5s cap;
prefix-normal-early 67.5s vs 60s cap), 246/248 files, 4085/4087. Both
files re-run in isolation by supervisor: 2 files / 18 tests all-pass.
Contention hypothesis; NOT adjudicable as noise per the counts rule.
A QUIET full vitest on main must complete all-pass before the mirror
push (f33105a + f341f4b + this file) goes out.

IN FLIGHT: HA-8 fix round 1 committed 4384474 (codex-authored,
supervisor-committed: codex sandbox could not create index.lock; content
untouched). Scan CLEAN. Review round 2 running (ha8-review2.log).
Publisher gained shared progression validator
(subclass-progression-validation.ts) - monotonic/gap/max-level rules now
publisher-side.

QUEUE unchanged: HA-9 -> VET-REPUB -> HA-10 -> HA-11 (D138+D214 in
full) -> HA-12 -> D213 hardening.

WORKTREES: wt/party (owner's - never prune), wt/ha8 (active), wt/adf
(prune after mirror push).

## RESTART POINT 2026-08-06-h (superseded by 08-06-i)
MAIN 25b62cf (mirror pushed; includes bb4ec32 CI-7 merge + D211-D213).
FLOORS: vitest 248/4,087; PW 127 pool (~9.7 min); build 0; migrations
0000-0039 FROZEN on main (next free mint 0040); backup v5. THIRTY-FIVE
merges. Rulings through D213.

MERGED SINCE 08-06-g:
 - CI-7 (bb4ec32, 35th): authoring immutability, mints 0038+0039.
   Recipient-local supersession lineage (composite RESTRICT FKs, cycle
   walk, UPDATE refusal, BEFORE DELETE permanence - DELETE+INSERT rewrite
   refused, pinned). Reference-retarget command (preview/commit RPCs,
   CI-4a discipline, D82 review) preserving the full character subtree
   with typed notices. Spell forks on the common lifecycle. Gate history
   in the merge message; round 1's claimed-unbuilt-retarget finding
   recorded there at full length.

RULINGS 08-06: D211 VET-REPUB queued (publish Veteran through HA-5
backend as external homebrew with prose, retire bundled seed, wipe-and-
reseed); D212 acceptance walk still deferred; D213 post-HA-12 autonomous
hardening (no publish without explicit ask).

OPEN FINDING (first seen CI-7 post-merge vitest on main, 2026-08-06):
2 unhandled rejections "TypeError: Cannot read properties of undefined
(reading 'close')" at src/ui/content-adoption-dialog.ts:411
(modal.close() after await onCommitted), attributed to
character-list.test.ts (likely cross-file async leak; that file does not
use the dialog). Counts were complete all-pass (248/4,087) so it did not
gate; the other 2 errors were the recorded onTaskUpdate noise. Root
cause NOT established - modal is assigned synchronously at creation, so
undefined-at-close has no obvious path. Investigation unit ADF
dispatched. Until resolved, any run showing this signature is NOT
adjudicable as noise.

IN FLIGHT: HA-8 (wt/ha8 @ 6a1ad2e) - review round 1 returned
FIX-ROUND-NEEDED, 10 findings (2 HIGH: publisher/client progression rule
mismatch - supervisor VERIFIED publisher lacks monotonic/gap/max-level
rules; journey missing grid-edit + library stages). Fix round 1
dispatched (brief ha8-fix1.md, log ha8-fix1.log). ADF investigation
dispatched in wt/adf off 25b62cf (brief adf-invest.md, log
adf-invest.log; reproduce-first, no speculative fix).

NEW OWNER QUESTION SURFACED (HA-11-gating): D138 delete-with-characters
purge vs CI-7 lineage permanence - a superseded creation cannot be
hard-deleted under 0038 RESTRICT FKs + 0039 BEFORE DELETE refusal.
Asked in the 08-06 questions round; do not start HA-11 without the
ruling.

QUEUE after HA-8: HA-9 (background form) -> VET-REPUB (D211) -> HA-10 ->
HA-11 (D138 in full; cascade underspec goes to owner BEFORE
implementation) -> HA-12 -> D213 hardening.

WORKTREES: wt/party (owner's - never prune), wt/ha8 (active), wt/adf
(active).

## RESTART POINT 2026-08-06-g (superseded by 08-06-h)
MAIN 7e4d4e6 (mirror pushed). FLOORS: vitest 248/4,067; PW 127 pool
(~9.3 min; homebrew-species-authoring journey added, measured 17.7s of a
90s budget); build 0; migrations 0000-0037 FROZEN on main (0038/0039
minted unmerged in wt/ci7); backup v5. THIRTY-FOUR merges. Rulings
through D210.

NOISE RULE UPDATE: the vitest onTaskUpdate teardown noise now reproduces
even under --maxWorkers=1 on loaded trees - the serial-clean criterion no
longer discriminates. Adjudication basis is now COMPLETE ALL-PASS COUNTS
(files and tests both green and total); exit code alone still never
gates. If counts are short or any failure prints, it is NOT noise.

MERGED SINCE 08-06-f:
 - HA-7 (7e4d4e6, 34th): species authoring form, mint-free. Real
   publisher preview/commit with all refusal paths pinned, byte-equal
   rehydration, shared modal-trap now backing publish/conflict/CI-8
   dialogs, browser journey proves persisted grant application.

IN FLIGHT: CI-7 (wt/ci7) - fix round 2 running. Lane carries mints 0038
(catalog_content_supersessions) + 0039 (cycle/rewrite guard triggers),
the reference-retarget command (round 1 found the report claimed it
UNBUILT - recorded; round 2 found retarget spell-loss + DELETE+INSERT
lineage rewrite - fixes in flight). Next review is round 3 (cap).

QUEUE after CI-7: HA-8 (subclass timeline form), HA-9 (background form),
then HA-10 -> HA-11 -> HA-12. Parked owner questions unchanged.

WORKTREES: wt/party (owner's - never prune), wt/ci7 (active).

## RESTART POINT 2026-08-06-f (superseded by 08-06-g)
MAIN 959ac04 (mirror pushed). FLOORS: vitest 246/4,049 (onTaskUpdate
noise rule stands); PW 126 pool; build 0; migrations 0000-0037 FROZEN
(next free mint 0038); backup v5. THIRTY-THREE merges. Rulings through
D210.

MERGED SINCE 08-06-e (parallel lanes):
 - HA-5 (0717c14, 32nd): subclass backend, mint-free. Dense 20-level
   progressions (root_only = unchanged copy-from-published only, canonical
   projection equality), REAL-NUMBER consumer pins (level-7 slots 4/2
   through BuildReportBuilder), subclass template_ref closure - the
   THREE-KIND matrix now complete (species degradation was missing
   despite HA-3's record; fixed with pins + class-source negative
   control). CI-5's template_ref remainder CLOSED for all kinds.
   HA-EXTERNAL-SELF-MATCH passed. Cap blocker (unpinned refusal type)
   resolved by supervisor 2-line assertion, disclosed.
 - HA-6 (959ac04, 33rd): homebrew library + shared form components,
   mint-free. /homebrew route, draft-conflict modal, ordered cards,
   compile-coupled effect cards, hostile-string inertness, D108 a11y.
   Router gained a navigation-guard seam + history-faithful refusal;
   the PW gate caught a REAL 10-spec Chromium regression (stateless
   external pushState stranded mounted screens) - root-caused and fixed
   with a node reproduction. Shared adoption dialog (CI-8) fixed to
   attach-before-showModal.

QUEUE: unblocked now: CI-7 (L authoring immutability), HA-7 (species
form), HA-8 (subclass timeline form), HA-9 (background form). HA-10
(consumer cutover) after 7/8/9; HA-11 after 10; HA-12 after 11. Parked
owner questions unchanged (Veteran prose vs D152).

WORKTREES: wt/party only (owner's - never prune).

## RESTART POINT 2026-08-06-e (superseded by 08-06-f)
MAIN 40330a7 (mirror pushed). FLOORS: vitest 242/4,009 (onTaskUpdate
noise rule stands: all-counts-green + exit 1 -> serial --maxWorkers=1
adjudication; also: do not run full suites while codex targeted runs are
active - that overlap likely CAUSES the noise); PW 126 pool; build 0;
migrations 0000-0037 FROZEN (0037 = background default Origin feat key;
next free mint 0038); backup v5. THIRTY-ONE merges. Rulings through D210.

MERGED SINCE 08-06-d (parallel lanes):
 - CI-6 (c2a212c, 30th): share resolver review conversion. Uniform
   evidence rule (silence requires evidence: derived keys embed digests,
   asserted keys always review, bundled-stable key-authoritative per
   D84); reference-scoped receipts; byte-frozen v10/v17 wires;
   unevidenced-reference wording (+24th mutation). Production bug found
   by gates: subclass share refs were wrongly UNREVIEWABLE - fixed via
   live projector. Round-3 "blocker" (derived-silence vs asserted-review
   contradiction) REFUTED by supervisor code verification.
 - HA-4 (40330a7, 31st): background backend, MINT 0037. Feat references
   keyed end-to-end with origin-category enforcement and 0037-scoped
   replay policy; display sidecar outside identity with conflict review;
   compile-proven grant-rule config registry; one publish/apply drift
   seam; background template_refs rebound with typed notices (CI-5
   remaining item now closed for species+background; subclass remains,
   lands with HA-5). Cap escalated: 3 blockers resolved + verified.
   FIFTH inventory-debt recurrence (late trigger addition) - COMMON.md
   checklist amended.

QUEUE: dispatchable next: HA-5 (XL subclass backend, serial mint lane,
owns 0038), CI-7 (L authoring immutability), HA-6 (L library/form
components). Blocked: HA-7..HA-12 per edge list. Parked owner questions
unchanged (Veteran prose vs D152; CI-5 subclass template_ref remainder).

WORKTREES: wt/party only (owner's - never prune).

## RESTART POINT 2026-08-06-d (superseded by 08-06-e)
MAIN fa96990 (mirror pushed). FLOORS: vitest 240/3,977 (onTaskUpdate
teardown noise may drive exit 1 with all counts green - adjudicate via
serial --maxWorkers=1, never gate on exit alone); PW 126 pool (~9 min);
build 0; migrations 0000-0036 FROZEN (next free mint 0037); backup v5.
TWENTY-NINE merges. Rulings through D210.

MERGED SINCE 08-06-c (both dispatched in parallel worktrees):
 - CI-8 (ce36a96, 28th): adversarial controls + UI disclosure. 23-mutation
   suite (verifier proves apply -> detect -> byte-exact restore -> clean,
   23/23), real-planner import preview counts, normalized-identity
   match-reason labels, remembered-choice management, JSON-vs-reference
   wording, no-modal fast path kept per design, honest worker-boot errors
   (bare "Failed:" fixed). Mint-free. 3 review rounds + 1 PW gate round;
   round-3 blocker (stale mutation anchor) fixed by supervisor, disclosed,
   verifier re-run 23/23.
 - HA-3 (fa96990, 29th): species backend. Common publisher, provenance-
   gated skill dispatch (authored keys cannot impersonate bundled pools),
   trait-identity-bound target-local template_ref regeneration with typed
   unresolved notices, HA-EXTERNAL-SELF-MATCH passed. Mint-free. 3 review
   rounds + 1 vitest gate round (sheet-inputs fixture was an unregistered
   impersonator - fixture fixed). CI-8/HA-3 auto-merge reconciled cleanly.

QUEUE: dispatchable now: HA-4 (XL, background backend - NEXT in the
serial HA-3/4/5 mint lane), CI-6 (L, share resolver), CI-7 (L, authoring
immutability), HA-6 (L, library + form components, depends HA-2+CI-4a).
Blocked: HA-5 behind HA-4 (serial mint lane), HA-7..HA-12 per edge list.
Parked owner questions: Veteran prose vs D152; CI-5 remaining items
(template_ref regeneration now DONE for species via HA-3; still open for
background/subclass kinds).

WORKTREES: wt/party only (owner's - never prune).

## RESTART POINT 2026-08-06-c (superseded by 08-06-d)
MAIN 3a2c324 (mirror pushed). FLOORS: vitest 237/3,941; PW 126 on the
pool (~9 min); build 0; migrations 0000-0036 FROZEN; wire v1-v17;
character backup at v5. TWENTY-SEVEN merges. Rulings through D210.

MERGED SINCE 08-06-b:
 - CI-5 (3a2c324, 27th): character backup v5 complete content manifest.
   Asserted keys (D198), no legacy union (D205), install through CI-4a
   plan/commit, mint 0036 catalog_content_archive (additive). Spell
   identity sidecar (canonical/normalized/aliases) OUTSIDE the
   fingerprint, restored on install, conflict-refused even on exact
   match. Validation derives the expected asserted key via the shared
   normalization seam. Character + library document digests bound into
   adoption tokens. Legacy backup.importCharacter DELETED everywhere.
   subclass-provenance pins reconciled as strict supersets. Gate history:
   3 review rounds (1 BLOCKER + 5 MAJOR/HIGH found and fixed), 2
   gate-failure fix rounds (superseded provenance pins; fixtures not
   registering completed projections), 1 supervisor 2-line stale-pin fix
   (v4->v5 version pins, supervisor-authored, disclosed).
   REMAINING before full CI-5 closure (recorded, not blocking):
   target-local regeneration of generated template_ref effects;
   fresh-restore of surviving external classes; library UI.

WORKTREE SWEEP: wt/attr, wt/mint2, wt/pwa, wt/resp found still present
despite earlier "all pruned" record - all four verified 0 ahead of main
and 0 dirty, pruned per D207. wt/party only remains (owner's - never
prune).

IN FLIGHT (dispatched 08-06): CI-8 (wt/ci8, brief
.claude/handover/briefs/ci-8.md + COMMON.md, MINT-FREE unit, log
~/.claude/jobs/27b61756/tmp/ci8.log) and HA-3 (wt/ha3, brief
.claude/handover/briefs/ha-3.md + COMMON.md, owns mint 0037 if needed,
log ~/.claude/jobs/27b61756/tmp/ha3.log). HA-3/4/5 are a SERIAL mint
lane - do not dispatch HA-4/HA-5 until HA-3 lands. Also dispatchable
when capacity frees: CI-6, CI-7, HA-6 (prereqs met). Blocked: HA-7
(needs HA-3+HA-6), HA-8 (HA-5+HA-6), HA-9 (HA-4+HA-6), HA-10 (7/8/9),
HA-11 (10), HA-12 (11+CI-5). Parked owner questions: Veteran prose vs
D152 (see audit closure below); CI-5 remaining items above.

## RESTART POINT 2026-08-06-b (superseded by 08-06-c)
MAIN 69dd7ad (mirror pushed, 9d59f48). FLOORS: vitest 235/3,909; PW 126
on the pool (~9 min); build 0; migrations 0000-0035 FROZEN; wire v1-v17.
TWENTY-SIX merges. Rulings through D210.

MERGED SINCE 08-06-a:
 - HA-2 (69dd7ad, 26th): catalog content draft store, mint 0035.
   catalog_content_drafts (species|background|subclass), revision-CAS,
   copy-from-published, byte-exact future recovery. Drafts are
   whole-database-only: six adversarial sentinel pins in
   tests/integration/authoring/draft-export-boundaries.test.ts prove
   drafts leak into NO export surface (character share, portable backup,
   save-point snapshot, agent JSON, print payload) and DO survive
   whole-database backup. Supervisor authored the 10k->30k budget raise
   in tests/unit/authoring-contracts.test.ts (measured, commented,
   flagged for independent review since supervisor-authored).

IN FLIGHT: CI-5 (wt/ci5, codex dispatched with
.claude/handover/briefs/ci-5.md + supervisor addendum): portable export
complete-content-manifest reconciled to D198/D205 - NO legacy-opaque
union (D205 voided it and the BACKUP-LEGACY control), asserted keys per
D198, backup version currency verified in code (v4, brief's v2/v3
numbering stale), install through CI-4a adoption protocol, mint 0036
expected. If found dead with no report, re-dispatch from the same brief
pair; log at ~/.claude/jobs/27b61756/tmp/ci5.log.

QUEUE AFTER CI-5: no named units recorded. Follow-ups: CI-8 follows
CI-5 in the design dependency graph; HA-12 depends on HA-11 and CI-5.
Owner's subclass session owes the nine docs/homebrew notices and the
pending-rulings.md queue.

SUBCLASS-EMPTY-PROSE-AUDIT: CLOSED 08-06 (sol scout, verified against
the pinning tests it named). All 70 bundled feature rows (58 SRD + 12
Veteran) have description='' BY CONSTRUCTION per D152 - the source
parser throws on prose lines and class-progression.test.ts pins every
row to HEADING_ONLY_DESCRIPTION, including a repair test reverting
injected prose to ''. EK/AT have zero feature rows (progression-only).
Not a defect. PARKED OWNER QUESTION for the next questions round:
Veteran is owner-authored with full prose in docs/homebrew - should its
bundled seed carry prose, or does D152 heading-only apply to homebrew-
bundled content too?

WORKTREES: wt/party (owner's - never prune) and wt/ci5 (active lane).

## RESTART POINT 2026-08-06-a (superseded by 08-06-b)
MAIN ba97db9 (mirror pushed). FLOORS: vitest 231/3,863; PW 126 on the
pool (~9 min); build 0; migrations 0000-0034 FROZEN (0034 = the D205
wipe: legacy-opaque no longer exists as a vocabulary member); wire
v1-v17. TWENTY-FIVE merges. Rulings through D210.

MERGED SINCE 08-05-c:
 - NOTICE (4a95c71, 24th, D209): root attribution inventory + four
   missing SRD headers. Nine docs/homebrew notice gaps flagged to the
   owner's subclass session (listed in the notice.log report).
 - CI-4b (b959a9d, 25th, D205): wipe and reseed, mint 0034. Legacy-
   opaque identities, aggregates, subtrees, FK-less source-instance
   references with descendants, and stale history all deleted; 447
   bundled identities reseed on boot; the vocabulary itself removed;
   self-heal legacy paths and available_on_long_rest deleted. The CI-4
   SERIES IS CLOSED.
COMMON.md gained the mint checklist (three-times-learned) and the
standing no-second-agent-CLI line. NOTE: codex's own config still
injects Claude reviews - repeat the one-liner even in micro briefs.

QUEUE: HA-2, then CI-5 (read their design rows fresh - the docs carry
D198/D205 supersession banners now). Follow-ups:
SUBCLASS-EMPTY-PROSE-AUDIT; SC3-VITEST-WORKER-RPC-NOISE (not seen since
the atomic-install fix - may be dead, keep the standing rule: never
gate on exit code alone, read counts).

WORKTREES: wt/party only (owner's session - never prune). All lane
worktrees pruned per D207; recreate from main on demand.

## RESTART POINT 2026-08-05-c (superseded by 08-06-a)
MAIN 8606517 (mirror pushed). FLOORS: vitest 231/3,861; PW 126 on the
pool (~9 min); build 0; migrations 0000-0033 FROZEN; wire v1-v17.
TWENTY-THREE merges. Rulings through D210 (D206 pointer:
docs/homebrew/rulings.md is authoritative for subclass-session rulings).

MERGED SINCE 08-05-b:
 - wt/party (e024fb7, 21st): homebrew docs + rulings log + the Veteran
   kit (docs-only, 21 files).
 - SEEDER-CARD (8af141d, 22nd): content-verified seeder health - one
   shared stored projection per boot, three-way equality, source-wins
   healing. Review caught the fast path re-creating the laundering one
   level up; fix round 2 repaired seed-pass gating and made the
   339-spell install atomic (23s browser boots were the entire
   103-failure PW cascade). Boot 258->307ms, accepted on record.
 - VET-SEED (8606517, 23rd): the rogue Veteran, first homebrew-bundled
   subclass. 2024:subclass:veteran, fifteen bundled subclasses,
   mechanics fidelity reviewed clean line-by-line, spell-absence pinned,
   stale agent-reference claim fixed in-lane.

RULINGS BATCH D204-D210: wt/party-before-VET-SEED (done); CI-4b = WIPE
AND RESEED (owner: "Wipe old stuff and reseed in all cases. No users
yet"); rulings fold = pointer only; three standing orders (COMMON.md
no-second-agent-CLIs - line appended; dead-code deletion license;
prune merged worktrees - being applied); zero-users window closes at
the owner's first real campaign, announced by them; NOTICE prep
authorized (unit IN FLIGHT in wt/notice); no acceptance walk yet.

IN FLIGHT AT WRITE TIME:
 - NOTICE unit (wt/notice, codex): root NOTICE.md attribution inventory,
   docs-only. Gate: read + verify citations, no suite needed.
 - CI-4b inventory scout (sonnet, read-only): what legacy-opaque content
   exists, who consumes it, what a wipe touches - feeds the CI-4b brief.

QUEUE: CI-4b (wipe-and-reseed per D205, brief after the scout returns;
mint 0034 only if the wipe genuinely needs it), HA-2, CI-5. Follow-ups:
SUBCLASS-EMPTY-PROSE-AUDIT, SC3-VITEST-WORKER-RPC-NOISE (three
supervisor error-classes this arc: pipe-exit traps, push-before-verdict,
brief-omitted standing lines - all disclosed in transcript; standing
lines now in COMMON.md), dead enum available_on_long_rest (D207 license:
next lane touching enums.ts deletes it).

WORKTREES: wt/attunement (merged, idle - prune candidate), wt/notice
(active), wt/party (owner's session - never prune), wt/pwa (stale,
prune candidate). Others pruned per D207.

## RESTART POINT 2026-08-05-b (superseded by 08-05-c)
MAIN 12ba5ec (mirror pushed). FLOORS: vitest 231/3,855; PW 126 on the
PARALLEL POOL (~9 min wall, was 24-28 serial); build 0; migrations
0000-0033 FROZEN (0033 = asserted keys + registry-first triggers);
backup v4; wire v1-v17. TWENTY merges. Rulings through D203.

THE WAVE COMPLETED THIS WINDOW - five merges:
 - AR-A (b66ead2, 16th): character archive, 0032, backup v4,
   sequence-preserving rebuild.
 - SC-3 (4827c77, 17th): twelve SRD subclasses seeded with registered
   identities; D152-typed branded descriptions.
 - FF-B (a6b12e8, 18th): flavor + internal undo RPC; signed restores
   deleted end to end (R5/D199/D201).
 - INFRA (ca4ac55, 19th, D200): parallel Playwright pool - per-worker
   OPFS origins, parity split, audited budgets. EVERY future chain's
   browser gate is ~9 min.
 - CI-4a (47484b1, 20th): two-phase adoption plan/token/commit, review
   dialog through public RPCs, mint 0033, registry-first triggers, the
   fixture population swept to match. Eleven fix rounds; two early
   dispatches correctly BLOCKED (-> D198, D203).
Post-merge budget fix 12ba5ec (compiler probe 10s->30s, supervisor-
authored, FLAGGED for independent review next lane round).

KNOWN NOISE, adjudicated: vitest parallel-worker "onTaskUpdate" RPC
timeout appearing AFTER all tests pass (recorded as
SC3-VITEST-WORKER-RPC-NOISE; serial run clean; treat all-pass + noise
as green, never gate on the exit code alone without reading counts).

QUEUE NEXT: CI-4b (semantic backfill/rekey - 0034 next free mint);
SEEDER-SAME-CARDINALITY-CORRECTION (owner: after CI-4a, now due);
VET-SEED (D202, rogue "Veteran" as bundled content - kit in wt/party
docs/homebrew, owner session may still be refining; confirm before
dispatch); HA-2; CI-5. Follow-ups: SUBCLASS-EMPTY-PROSE-AUDIT,
reconcile steady-state cost, dead enum available_on_long_rest.

WORKTREES: wt/attunement, wt/hyg2, wt/print, wt/ci4a, wt/infra all
MERGED and idle (safe to reuse or prune); wt/party belongs to the
owner's subclass session - do not touch docs/homebrew from supervision.

SUPERVISOR ERRORS THIS WINDOW, disclosed in full in the transcript:
 1. Piped a git merge through tail; the conflict exit vanished and a
    30-min chain ran on a conflicted tree (1106 meaningless failures,
    discarded). Merges now run bare with an explicit conflict check.
    Same pipe-exit trap also hit a vitest waiter (self-matching ps
    loop, 43 wasted sleeps) - third instance of the class this window.
 2. Pushed the mirror in the same compound command as the post-merge
    suite read - the push chained off grep, not the verdict. Push only
    after reading counts.
 3. INFRA-3 brief omitted the no-second-agent-CLI line; codex ran one.
    The line is now standard in every brief.
Positive pattern worth keeping: the sonnet workflow digest of FF-B's
diff-vs-briefs caught a real functional regression (four live commands'
undo refused as legacy) that had ZERO test coverage - supervisor
verified in source before dispatching the fix. Workflow digests before
gates on multi-round lanes earn their cost.

## RESTART POINT 2026-08-05-a (superseded by 08-05-b)
MAIN b66ead2 (mirror pushed). FLOORS: vitest 227/3,794; PW 125; build 0;
migrations 0000-0032 FROZEN (0032 = character archive, first
sequence-preserving rebuild); backup v4; wire v1-v17. SIXTEEN merges.
Rulings through D203.

MERGED THIS WINDOW: AR-A (b66ead2, 16th) - archived_at, migration 0032,
backup v4, sqlite_sequence preserved across the rebuild; post-merge
vitest 3794/3794.

OWNER RULINGS BATCH (all 2026-08-04/05, recorded):
 - D197 registry orphaned/refused counts -> console/log only.
 - D198 derived-key installer superseded: keys are asserted name-derived
   slugs; installer = registry key-first install seam (design doc carries
   a supersession banner).
 - D199 legacy command-history compat WIPED (zero-users window used).
 - D200 suite-speed infra unit AUTHORIZED (split php-feature-parity,
   config edits allowed for that unit only; queue after this wave).
 - D201 PHP parity = reference-only; divergence by adjudication.
 - D202 rogue ships as BUNDLED "Veteran" (owner-authored kit in wt/party
   docs/homebrew + rulings.md; supersedes Executioner arc). VET-SEED unit
   after SC-3 merges.
 - D203 CI-4a mint 0033 authorized: key_kind 'asserted', CHECK + 0020
   trigger-guard updates, schema.sql lockstep, no rekey/backfill.

IN FLIGHT AT WRITE TIME:
 - SC-3 (wt/hyg2): fix rounds 1-4 committed; review rounds exhausted
   (round 2 closing found 1 MED, adjudicated: brand landed in round 3,
   audit half -> follow-up SUBCLASS-EMPTY-PROSE-AUDIT). Fix round 4
   registered the twelve subclasses in the CI-3s registry (invariant beat
   the SC-5 deferral), extended the wizard pin (14 ordered options),
   fixed anchors. FULL CHAIN RUNNING (port 4191). Merge on green.
 - FF-B (wt/print): rounds - review 1/2/3 (cap), fixes 1-4 all
   UNCOMMITTED in the worktree. Round 3 found 2 HIGH (restore_snapshot
   side door -> replaced by restore-by-ID; stack-top authorization ->
   resulting_revision rule, wrong-oracle test flipped) + 3 MED (envelope
   parity oracle updated per D201; planner reload reconstruction; execute
   applied-state) + LOW/doc. Round 4 implemented the D199 wipe (typed
   legacy_operation refusal). NEXT: supervisor verification probes +
   commit + full chain + merge. Review rounds are at cap - gates carry
   the weight.
 - CI-4a (wt/ci4a, NEW worktree): rounds 1-2 correctly BLOCKED (design
   contradiction -> D198; missing key classification -> D203). Round 3
   RUNNING with mint 0033 authorized, 0032 present in lane.

QUEUE AFTER THESE: CI-4b, HA-2, CI-5, suite-infra unit (D200), VET-SEED
(D202), plus recorded follow-ups (seeder same-cardinality after CI-4a
per owner; reconcile steady-state cost; SUBCLASS-EMPTY-PROSE-AUDIT;
dead enum available_on_long_rest).

HOMEBREW: moved to docs/homebrew/ in wt/party (67ee0df) with README,
lessons.md, pending-rulings.md. The owner runs a SEPARATE subclass
session in wt/party: it records rulings in docs/homebrew/rulings.md
(NOT decisions.md); supervision folds them into decisions.md at that
lane's merge. Already recorded there: Veteran kit, four monk names
approved, monk seed-scope deferred. Do not touch docs/homebrew from
supervision.

SUPERVISOR ERRORS THIS WINDOW, disclosed in full in the transcript:
 1. REPEATED recorded error #1: FF-B fix-2 brief allowed targeted vitest;
    the AR-A full suite started AFTER dispatch -> contention artifact +
    25-min re-run. Guards must bind at RUN time: every brief now carries
    a ps-poll before every test command (or a total test ban).
 2. Chain script piped vitest through `tail -40`: failure list truncated
    to 1 of 6 names, and VITEST_EXIT captured tail's status. Chains now
    write raw logs + real exit codes.
 3. Emitted a literal NUL byte into a dispatch brief while describing NUL
    rejection; caught by own pre-dispatch scan.
Codex ran `claude -p` inside two dispatches (its global config says to);
both hung/added nothing and burn Claude credits - briefs now forbid
second-agent CLIs; consider a COMMON.md line (owner asked, unanswered).

## RESTART POINT 2026-08-04-b (superseded by 08-05-a)
MAIN ed67889 (mirror pushed). FLOORS: vitest 227/3,783; PW 125 (22 spec
files); build 0; migrations 0000-0031 FROZEN; wire v1-v17. FIFTEEN merges.
Rulings through D196.

MERGED THIS WINDOW: CI-3s (2f53d5a, 13th), SS-4 (7e0382a, 14th), SC-2
(ed67889, 15th).

THE DEFECT CLASS OF THE NIGHT, recorded because it recurred in every
lane: SOMETHING A CONSUMER DEPENDS ON, UNPINNED, WITH THE ORACLE BLIND
TO IT.
 - SC-2: per-class rule-set association (find(() => true) passed
   everything); a hand-transcribed spell key that the oracle repeated;
   returned Circle choice order hidden by Object.fromEntries.
 - SS-4: compareGroups sorted 'Gift 10' before 'Gift 2', and the
   replacement tests PINNED that reversed order after deleting the only
   test that contradicted it.
 - CI-3s: one bad row (absent, then damaged) froze reconciliation for all
   434 aggregates on every boot, permanently.
When reviewing, ask what a consumer reads and whether anything pins it.

FOLLOW-UPS RECORDED IN COMMITS (no unit dispatched yet):
 - SEEDER-SAME-CARDINALITY-CORRECTION: ensureBundledSpellContent declares
   the catalog healthy on key and membership COUNTS, so a same-cardinality
   SRD prose correction never reaches the store and reconciliation then
   fingerprints stale prose as current.
 - CI-3S-RECONCILE-STEADY-STATE-COST: reconciliation re-projects all 434
   bundled aggregates through nine projectors on EVERY open. Measured:
   attribution.spec 21.0s at 302c137 -> 22.9s at 7e0382a (~+0.3s per
   light boot); ~2s per boot on the heavy retirement fixture. The
   retirement sheet test's budget was raised 20s -> 45s with the
   measurement written into the comment (da9c1ef).
 - orphaned/refused counts are returned by the registry but discarded by
   applicationSeed - needs a diagnostics decision.
 - available_on_long_rest survives only as an enum member
   (src/domain/enums.ts:159) with no producer and no consumer after D149.
 - srdSubclassSpellVersionKeyEntries iteration order deliberately not
   pinned (set-like export, consumers index by key).

SUPERVISOR ERRORS THIS WINDOW, all disclosed in commits:
 1. A brief that forbade only the FULL suite let a lane run TARGETED
    vitest against the supervisor's own full run -> onTaskUpdate
    contention error -> full re-run. Briefs must forbid ALL test
    execution while a supervisor suite is live.
 2. Reported a Playwright failure as HUNG. It was SLOW:
    testInfo.setTimeout() inside a test OVERRIDES the --timeout CLI flag,
    so the diagnostic never granted the time it claimed.
 3. Dispatched into wt/party against a ruling recorded only on main.
    codex correctly BLOCKED rather than work from the brief's paraphrase.
    Refresh the lane before citing a decision to it.
 4. Told codex "do not restate the notice anywhere in this module",
    meaning the duplicated constant; it also deleted the file-header
    attribution comment. A duplicated constant is a drift hazard; a header
    comment on a derived work IS the attribution.
 5. Backgrounded a suite piped through `tail`, hiding all progress -
    against a standing note to tee to a log instead.

NEXT: CI-4a (XL, two-phase adoption review + runtime cutover), then
CI-4b, HA-2, CI-5. Side lanes free: FF-B, AR-A, SC-3 (now unblocked by
SC-2's manifest).

HOMEBREW: D196 applied to the rogue doc (wt/party c234d56) - level 9 is a
permanently doubled pool with the once-per-round trade stated in the
feature text; level 13 is Skill Mastery (every skill + 2 Expertise),
replacing Vanishing Point. Champion comparison delivered to the owner:
the Executioner exceeds Champion on damage and out-of-combat utility, is
behind on durability and in-combat consistency, and its only remaining
simplicity gap is the once-per-round tracker. 7 docs still with owner.

## RESTART POINT 2026-08-04-a (superseded by 08-04-b)
MAIN 2f53d5a (CI-3s merged, THIRTEENTH; mirror pushed). FLOORS: vitest
228/3,758; PW 124 (22 spec files); build 0; migrations 0000-0031 FROZEN;
wire v1-v17. Rulings through D195.
CI-3s: 3 review rounds (cap) + 4 fix rounds. The recurring defect class
tonight was ONE BAD ROW FREEZING EVERYTHING: absence (F1) and damage
(round-3 MED) each aborted the single reconcile transaction for all 434
aggregates on every boot, permanently. Both are now per-entry typed
outcomes - `orphaned` and `refused` - counted in the result, rows left
untouched, ambiguity and unknown errors still fatal. Nested
db.transaction resolves to a real SAVEPOINT (transaction.ts:22).
FOLLOW-UP RECORDED: SEEDER-SAME-CARDINALITY-CORRECTION -
ensureBundledSpellContent declares the catalog healthy on key and
membership COUNTS, so a same-cardinality SRD prose correction never
reaches the store and reconciliation then fingerprints stale prose as
current. Also recorded: the orphaned/refused counts are returned but
discarded by applicationSeed (needs a diagnostics decision).

IN FLIGHT:
- SS-4 (wt/pwa, 25b12b6 + fix round 1 running). Its D135 review found the
  strict-superset claim FALSE; supervisor raised MED->HIGH. Two items
  confirmed by the supervisor personally: (1) compareGroups at
  character-spell-section-builder.ts:331 compares names with plain `<`,
  so `Gift 10` sorts before `Gift 2`, and SS-4's replacements PIN that
  reversed order in three places after deleting the test that
  contradicted it; (2) existsSync filters were added to two repo-wide
  scanners (source-is-greppable, codec-slot-is-never-an-identity) so a
  tracked-but-missing file is silently skipped - a weakened assertion.
  DO NOT MERGE SS-4 until both are fixed and the enumerated coverage
  losses are carried.
- SC-2 (wt/hyg2, fd4d5b3). D135 review returned REJECT/4 HIGH; all four
  fixed. Supervisor re-derived two facts independently rather than trust
  citations: the catalog mints 2024:dragon-s-breath (each [^a-z0-9]+ RUN
  becomes one '-', and the apostrophe is its own run), and the extract's
  printed activation levels are exactly {3,5,7,9,13,17}. OWES: negative
  controls (not yet run) and a closing review round.

MERGE ORDER: SS-4 before SC-2. SS-4 DELETES
src/ui/screens/print/printable-list.ts, which CI-3s (now in main)
MODIFIED - modify/delete conflict, and the DELETION WINS (adjudicated in
CI-3s review round 3, C5).

PROCESS LESSON (supervisor's own error, cost: one full vitest re-run):
a dispatch brief that forbids only the FULL suite still lets a lane run
TARGETED vitest, which contended with the supervisor's own full run and
produced `[vitest-worker]: Timeout calling "onTaskUpdate"`. Briefs must
forbid ALL test execution while a supervisor suite is live.

HOMEBREW: rogue doc final per D195 (flat 2N, once-per-round Sneak,
5149e33). 7 docs with owner awaiting rulings; polish passes after.

## RESTART POINT 2026-08-03-h (superseded by 08-04-a)
MAIN 302c137 (CI-3s-PRE merged; mirror pushed). FLOORS: vitest 226/3,739;
PW 124 (22 spec files); build 0; migrations 0000-0031 FROZEN; wire
v1-v17. TWELVE merges today. Rulings through D195.
CI-3s-PRE: spell became the ninth projector (concept key + version stable
key both in identity as portable values); template-only species state.
ADJUDICATED REJECTION on record: concept-inherited sibling membership
stays OUT of the fingerprint - identity is content-local; fingerprinting
neighbor rows would break cross-store matching. CI-3s carries the
locality comment.
MINT LANE NOW: CI-3s re-attempt running (port 44566, session 019fc7ba).
Then CI-4a (XL). HOMEBREW: rogue doc final per D195 (flat 2N, once-per-
round Sneak); 7 docs with owner; polish passes after rulings.

## RESTART POINT 2026-08-03-g (superseded by -h)
MAIN 9ecdff5 (CI-3b merged - the XL unit; mirror pushed). FLOORS: vitest
222/3,707; PW 124 (22 spec files); build 0; migrations 0000-0031 FROZEN;
wire v1-v17. TEN merges today (guidelines, SC-1, FF-C, BROWSER-PROBE,
HA-1b/0030, CI-3a, CI-3c/0031, SS-3, CI-3b + rulings D188-D194).
CI-3b lesson (full length in merge msg): the vitest "real-boot" proof was
NOT the real boot - only the supervisor's full Playwright caught the
4-species catalog; fix constructs bundled membership from the seeded
aggregates themselves (two-half union). Gate failures bypass the review
cap - gates always must pass.
MINT LANE NEXT: CI-3s (bundled stable keys; after it, CI-4a adoption
discipline). Side lanes free: SS-4, SC-2, FF-B, AR-A dispatchable.
HOMEBREW: 7 subclass docs in wt/party awaiting owner rulings (oath,
4 monks incl Waking Will, Pursuer ranger, rebuilt Executioner rogue per
D194 - once-per-round doubling, 19-20 crit, Vanishing Point, Practiced
Certainty). After rulings: D191 polish passes + review round per doc.

## RESTART POINT 2026-08-03-f (superseded by -g)
MAIN 790e980 (CI-3c merged; mirror pushed). FLOORS: vitest 218/3,664; PW
122 (22 spec files); build 0; migrations 0000-0031 FROZEN; wire v1-v17.
CI-3c: 3 review rounds, 2 fix rounds (r2 = shared authoritative limit
constants by construction). Cap residual REJECTED-as-blocker on doctrine
(zero-magnitude effects: both seams agree, inert, over-split only).
Follow-up units recorded in code: ITEM-DEFINITION-SOURCE-PROVENANCE,
ITEM-DEFINITION-BONDED-WEAPON-BINDING, zero-magnitude refusal candidate.
MINT LANE NEXT: CI-3b (XL - class/feat/species/background aggregates,
resumed codex session 019fc7ba).
HOMEBREW: three monk FULL DRAFTS committed wt/party 9857ef8, with owner
(11/17 features are the approval items); oath doc 76c50d0 with owner;
after owner rulings: cleanup/polish passes per D191 addendum, then a
review round per doc.

## RESTART POINT 2026-08-03-e (superseded by -f)
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
