# Unit VTT-P2 — consensus loop log (supervisor-owned, sole writer: Claude)

Binding: IMPLEMENTER = CODEX (gpt-5.6 via codex exec), REVIEWER = CLAUDE
(Fable 5, supervisor). Reason: project default per codex-consensus skill +
owner directive 2026-08-19 ("collaboration process with lifting assumptions and
different models, reviewing each other's work"). Owner ruling D312 binds scope.

Authority: commits authorized on lane branches and wt/vtt (standing supervision
loop); no push/publish/deploy ever. Candidate freezer: git commit object hash
(git 2.x, sha1); every candidate is a committed tree, identified below by hash.
State location: .claude/consensus/vtt-p2/ on branch wt/vtt (project-local,
precedent: .claude/assumptions/ in main repo).

Authoritative verification source: supervisor reruns on this machine (targeted
vitest + tsc for increments; full suite + build gate before wt/vtt→main).

## Artifact ledger

### A1 — phase-2 plan (docs/design/2026-08-19-vtt-phase2-movement-controllers.md)
- Mode PROSPECTIVE. Candidate: commit 2b4df188. Rounds: 1/3 — CLOSED (consensus).
- Reviewer (Claude) verified codex's assumption ledger entries A2, A6/A7, A9,
  A11, A18 plus Brand type, D262.8 citation, tools/sim vitest config,
  .ai/rules paths against source. No significant findings.
- DEVIATION (recorded): no blind independent assumption pass ran for this
  artifact (§6.2) — reviewer only verified the author's own list. Compensating
  control: source-level verification of every load-bearing entry. Blind passes
  are mandatory from A3 onward.

### A2 — increment 1: movement/range kernel
- Mode APPLIED (lane worktree, frozen by commit). Candidate: 57bda5a3.
  Rounds: 1/3 — CLOSED (consensus). Merged to wt/vtt same hash.
- Codex claimed: 19/19 + 1/1 tests, typecheck 0, mutations 1-8 killed (ledger
  in .tmp-lane.log). Supervisor verified independently: 19/19 + 1/1 rerun,
  tsc app+node exit 0 (after npm ci fixed stale deps), forbidden-pattern scan
  clean, KB SRD quotes proven via python against docs/srd/full/srd-5.2.1.txt,
  own negative control (planMovement budget > → >=) killed by named test.
- Substantive code review (2026-08-19, post-merge): no significant findings.
  Observations carried to A4 brief: (obs-1) reducer must re-check
  reactionAvailable per OA window — planMovement may emit repeated windows for
  one reactor on leave/re-enter/leave paths; (obs-2) ranged AttackRange needs
  normal<=long enforced at profile decode. Trivial accepted: per-iteration
  frontier sort, fine at 16x12.
- DEVIATION (recorded): code-level review happened after merge, not before.
  Gate-level review (tests/mutations/typecheck) preceded merge.

## Active / next

- A3 — increment 2 (shared resolver into tools/sim). BLOCKED on
  wt/simcore→main→wt/vtt sync (conflict window). Before dispatch: blind
  assumption pass by a dedicated codex session over tools/sim + src/combat.
- A4 — increment 3 (combatant/encounter reducer). Queued behind A3; brief must
  carry obs-1/obs-2.
- Round counting from A3 onward: every frozen candidate = one round, cap 3,
  then HARD_GATE(b).

## Tick history

- 2026-08-19: A1 authored+reviewed+closed; A2 authored+verified+closed+merged;
  unit log created retroactively at owner's direction (protocol formalized
  mid-unit; prior rounds recorded above with their deviations, not reinterpreted).

## A4 — increment 2: shared resolver (lane-wt/vttres)

- Candidate: lane commit merged to wt/vtt (see merge "increment 2 — shared
  resolver, golden-verified"). Codex-implemented after one environment stall
  (EROFS on the supervisor's read-only node_modules symlink; fixed with a real
  npm ci, session resumed — codex's stop was correct behavior).
- Round 1 review (supervisor, BEFORE merge): read resolution.ts/random.ts in
  full; verified advantage = two sequential draws, strict <DC saves, crit
  doubles dice not modifier, parameterized floors/thresholds. Register
  #2/#4/#5/#24/#27 all discharged by the golden-parity design (fixtures
  captured pre-change, exact outputs AND exact draw counts, 4 seeds,
  280 calls, 45,811 draws).
- Verified (supervisor, own runs): sim 176/176, combat 28/28, tsc app+node
  exit 0; own negative control (rollDie value skew, distinct from ledger)
  killed by all 4 golden tests, restored green. Ledger 9-13: codex-run,
  named tests recorded in lane log.
- Deviation accepted: mutation 10's briefed name was logically inverted
  (sim ties succeed); codex tested the correct mutant (<=DC) and said so.
- Status: CLOSED round 1. Full wt/vtt gate launched post-merge; result to be
  read from .tmp-gate-inc2.log before any main merge.

## A5 — phase-2 increment-map amendment (lane-wt/vttplan)

- Candidate: docs-only amendment rebuilding increments 3-10 from
  D313/D314/D315; codex-authored.
- Round 1 review (supervisor): full-diff read. All 17 in-scope D315 rulings
  traced to increments; out-of-scope items excluded as briefed; section 1-11
  contradictions flagged not rewritten; SRD grid wording checked and the
  intersection/touch rules honestly labeled product rules (D315.3); D315.8
  pause-vs-continue resolved operationally; mutations 17-66 continue the
  ledger. No blocking findings.
- Dispatch note (not a plan defect): increment 3 is large; the supervisor may
  sub-chunk its dispatch (3a state/conditions/effects, 3b controllers/
  policies/death flow) with the combined gate unchanged.
- Status: CLOSED round 1. Merged to wt/vtt. Increment 3 is now dispatchable.


## A6 — increment 3a: encounter state, conditions, effect lifecycle (lane-wt/vtt3a)

- Dispatched 2026-08-19 ~15:05 by the prior supervisor session (job c68ffdd0),
  which then ended. Lane survived the session death and is still producing:
  src/combat/{combatant,statblock,events,encounter,conditions,effects}.ts plus
  tests/unit/combat/{combatant,conditions,effects,encounter}.test.ts + fixtures.
- Brief carried the 3a/3b split from A5's dispatch note. Controllers, reaction
  policies, death-save flow and any UI are 3b and explicitly out of scope.
- Gate owed on completion (supervisor-run, NOT delegated): tests/unit/combat
  green, tools/sim unchanged-green with no sim file edits, both tsc configs
  exit 0, plus an independent negative control distinct from the lane's own
  ledger for mutations 17, 19-23.
- **A6 IS NOT OWNED BY THIS SESSION.** Correction to the entry above, written
  15:41 after checking the box rather than assuming: another live Claude session
  is supervising this lane and was mid-round-2 while this session's tick ran.
  Evidence, all read from disk: round 1 IS committed on the lane (1ef4a6c4,
  3,678 insertions across 12 files) with codex's own report of combat 81/81,
  sim 176/176 unchanged, both tsc green, 15 manifest rows, mutations 17/19-23
  killed, "Deviations: none". Then that other supervisor ran its OWN verification
  (.tmp-v1/.tmp-v2 at 15:34, .tmp-ctl/.tmp-ctl2 at 15:35) and found a surviving
  mutation: Paralyzed `hitsWithinFeetAreCritical` 5 -> 10 leaves all 81 tests
  green. It dispatched a round-2 fix requiring an independently-written
  value-pinning expectation table, and that codex was still appending to
  .tmp-lane.log at 15:40:49 — three seconds before this check.
- That finding is exactly failure lesson 7: the manifest coverage test proved
  STRUCTURE, not VALUES, so a well-formed wrong number survived. It is a good
  catch by whoever made it and it is NOT this session's to close.
- ACTION TAKEN HERE: this session stops driving A6 entirely. Its tick prompt was
  rewritten to forbid gating, merging, committing into, or dispatching against
  `dnd-lane-vtt3a`, and to re-check ownership before touching any lane. Two
  supervisors gating one worktree would race the suite against a mutation cycle
  — the exact serialization rule in supervision.md failure lesson 20.
- Status: IN FLIGHT under a DIFFERENT session, round 2. Not this session's unit.

## A7 — D314.14 Discord decision dossier (lane-wt/discord)

- Docs-only. Deliverable: docs/design/2026-08-19-discord-vtt-decision-dossier.md.
- Owner is UNDECIDED on Discord and ruled (D314.14) that a full dossier —
  concrete flows, worked examples, architecture, effort/cost per shape —
  precedes any ruling. Factual base is the completed research doc
  docs/research/2026-08-19-discord-vtt-feasibility.md; the dossier builds on it.
- Brief requires per-shape rulings-contradicted analysis by D-number (the
  Activity WebRTC ban vs the no-server design goal is the known headline; the
  brief asks for the others), an exit-cost column, and an UNVERIFIED section.
- Review treatment: this is an owner deliverable, not a gated code artifact —
  review for honesty and sourcing, not for tests.
- Round 1 review (supervisor): structure checked against the brief, every
  section present. Every D-number citation I sampled resolves correctly against
  decisions.md (D260.1/2/3/6/8, D262.8, D312.3-4, D313.1-2, D314.1/2/6-8/12,
  D315.1-7/9-11/18). The four cited seam files exist
  (src/vtt/{sync.ts,transports/{transport,manual,trystero}.ts}).
- The load-bearing finding is REAL and I verified it at source: the research doc
  prescribes moving Yjs sync to y-websocket, while the phase-2 plan line 1179
  says `src/vtt/sync.ts`: no Phase 2 encounter authority. Read as full-document
  Yjs replication that would violate D260.2/D260.8. Reconciled as WebSocket
  transport, not shared authoritative state.
- Honest where it counts: ranks Shape 3 last, calls it a trap by name, and says
  Shape 2 is a trap if sold as a live VTT. The worked rounds are concrete enough
  to be uncomfortable (Shape 2 turns one drag into several commands and images).
  UNVERIFIED table catches that the research's 25-member/50-tester limits are
  Activity-specific and do NOT transfer to bots.
- Status: CLOSED round 1. Merged to wt/vtt (d1eb3ea2). No blocking findings.

## A8 — D315.14 clean-license art survey (lane-wt/art)

- Docs-only. Deliverable: docs/design/2026-08-19-vtt-art-license-survey.md.
  Feeds increment 8, which D314.16 places BEFORE the owner's first session.
- Brief requires exact license + version per candidate, redistribution checked
  separately for repo and dist, a manifest schema that kills mutations 51-54,
  a D59 public-mirror verdict per asset, and an honest assessment of
  AI-generated imagery's provenance problem. Ambiguous licensing is a
  rejection, not an accepted risk. No asset files are downloaded or committed.
- Round 1 review (supervisor): all six briefed sections present. Recommends one
  external family only (per-icon Game-icons.net SVGs as token medallions) with
  the room/terrain/fog/focus/ADJUDICATED states drawn by a checked-in
  deterministic project renderer — fewer families, better coherence, less
  provenance surface. Rejects Dungeon Scrawl (Pro entitlement + BY-NC layers
  unprovable), Watabou (no immutable generator provenance), and DCSS unless
  every file is pinned to the clean export and checked against its own
  unknown-license list. That last one is a real trap correctly caught: "most
  tiles are CC0" is not authorization for a particular file.
- I verified the central D59 blocker MYSELF: game-icons.net is CC-BY-3.0 with
  PER-ICON authorship, and this repo ships CC-BY-4.0 only — `find` returns
  docs/licenses/CC-BY-4.0.txt as the sole licence text and NOTICE.md contains
  zero occurrences of "3.0". So no SVG may land until the 3.0 legal code,
  per-icon credits and dist emission exist. Consistent with the build's own
  "2 licence texts bundled".
- Also correctly separates MIT-on-source from the licence of committed art
  OUTPUTS, which is the kind of gap that ships silently.
- AI imagery rejected for this increment on provenance, not taste: no provider,
  account or generation entitlement is selected, and "AI-generated" is not a
  license. Distinguishes provider contract terms from a third-party-rights
  warranty, and copyrightability from permission.
- Status: CLOSED round 1. Merged to wt/vtt (b78fb370). No blocking findings.

## Tick history

- 2026-08-19 15:27: loop restarted after the prior supervisor session ended
  with A6 mid-flight. Cron reinstated at 30-minute cadence off the :00/:30
  marks. Two docs lanes opened alongside A6 because they contend for nothing —
  no suite, no build, no shared files. The `lane-wt/mutshard` merge gate is
  deliberately NOT started: it needs a quiet box and A6 is CPU-heavy.

## A6 — increment 3a: encounter state / conditions / effects (lane-wt/vtt3a)

- Round 1: FINDING by supervisor — plausible-wrong-value control
  (Paralyzed hitsWithinFeetAreCritical 5->10) SURVIVED codex's gate;
  manifest coverage proved structure, not values. Returned to codex.
- Round 2: independent literal expectation tables added (+18 tests,
  combat 99/99). Supervisor re-verified: the 5->10 mutant killed by
  "Paralyzed pins every mechanics literal, including the 5-foot
  critical-hit distance"; second value mutant (Petrified
  weightMultiplier 10->5) also killed; restored green. Paralyzed row
  checked word-for-word against srd-5.2.1.txt:11952-11963. Sim suite
  176/176 with zero tools/sim diff; tsc both configs exit 0.
- Ledger: mutations 17, 19-23 killed by named tests (codex-run,
  re-run in round 2); 18/24 deferred to 3b by design.
- Status: CLOSED round 2. Merged to wt/vtt; full gate launched
  (.tmp-gate-3a.log). Next dispatch: 3b (controllers, reaction
  policies, death-save flow, visibility, coordinator; mutations 17-24
  complete there).

## A9 — increment 3b: controllers, policies, death flow (lane-wt/vtt3a) — OPEN

- CLAIMED 2026-08-19 ~15:50 by the ORIGINAL supervisor session (the one that
  drove A1-A6; it did not end — it was mid-A6 when the 15:27 session
  restarted the loop). Coordination note to the parallel session: do NOT
  dispatch 3b or touch lane-wt/vtt3a; docs lanes and the mutshard merge gate
  remain yours. This session watches the loop log before every dispatch.
- Scope: Controller interface + Algorithm/Agent/Human implementations,
  standing per-PC reaction policies with prompt-on-ambiguity, PC death-save
  rolling (hidden-by-default results), stabilization, visibility projections,
  local coordinator. Mutations 18 and 24 complete the 17-24 ledger.
- Status: CLOSED round 1. Codex delivered controllers.ts/coordinator.ts/
  visibility.ts + three suites; supervisor verified combat 128/128, sim
  unchanged 176/176, tsc clean; death-save clauses checked word-for-word
  against srd-5.2.1.txt:1101-1113; supervisor control nat-1 failures 2->1
  killed by named tests (crit-damage clause shares the constant). Ledger
  17-24 complete (M18/M24 + three codex wrong-value controls). Merged to
  wt/vtt; full gate launched (.tmp-gate-3b.log). Increment 3 is COMPLETE
  pending that gate. Next: increment 4 (spell engine + templates) — still
  claimed by this session unless released here.

## A10 — increment 4a: AoE geometry kernel (lane-wt/vtt3a)

- Round 1: codex delivered six SRD shapes + D315.3 product rules +
  hand-derived fixtures; supervisor verified 147/147 but its
  origin-inclusion mutant (cone origin forced included) SURVIVED.
- Round 2: the mutant exposed a REAL bug (Emanation circle exclusion);
  codex fixed it and pinned per-shape origin semantics (Sphere/Cylinder
  always included per SRD — supervisor verified the Sphere text at
  srd-5.2.1.txt:12078-12084 right column).
- F19 RECURRENCE (supervisor error, full length): the round-2
  implementation was UNCOMMITTED when the supervisor ran its mutant and
  restored via `git checkout`, reverting templates.ts to round 1 while
  round-2 tests survived; the mismatch was committed, merged, and the
  full gate caught it (4 failures). A second error compounded it: the
  recovery merge was piped through `tail`, its --ff-only refusal was
  swallowed, and a gate re-ran on the stale tree before the mistake was
  caught by reading the log. Codex reapplied via session resume;
  the restore was committed BEFORE the re-run mutant control.
- Final state: combat 160/160, sim unchanged 176/176, tsc both clean,
  supervisor mutant killed against the COMMITTED tree, full wt/vtt gate
  GREEN 6,096/6,096 (.tmp-gate-4a3.log).
- Status: CLOSED round 2 (with two supervisor process failures
  recorded). Next: increment 4b (spell manifest + mechanics), claimed
  by this session.

## A11 — increment 4b-i: spell foundations + manifest + first batch (lane-wt/vtt3a)

- Preceded by an honest codex infeasibility stop: 4b as one dispatch =
  155+ spells with missing reducer foundations. Supervisor accepted the
  finding and sub-chunked (foundations + burn-down manifest + batches).
- Delivered: slots/upcast/components/casting economy, extended typed
  effect union, 175-row cited manifest (33 implemented: all 20 cantrips
  + 13 diverse L1; 142 pending, count pinned and may never increase),
  typed partial residuals instead of silent fallbacks.
- Supervisor verified: combat 234/234, sim unchanged 176/176, tsc both
  clean, manifest recounted, Fire Bolt checked word-for-word at its
  cited lines; own control (range 120->60) run against the COMMITTED
  tree, killed by named test. Codex ledger: higher-slot, false
  burn-down, d10->d8, slot-count controls killed.
- Full wt/vtt gate GREEN 6,170/6,170 (.tmp-gate-4bi.log).
- Status: CLOSED round 1. Next: 4b-ii (remaining 30 L1 spells), claimed
  by this session.

## NOTICE to the 15:27 supervisor session — STAND DOWN (D317.16)

The owner ruled 2026-08-19 (D317.16, committed on main): supervisor
sessions consolidate to the ORIGINAL session (the one that drove
A1-A6, A9-A11 and holds the D313-D317 conversation context). Please:
disable your cron, claim no further lanes, and leave any in-flight
lane's state in a final loop-log entry for the original session to
harvest. Docs artifacts you closed (A7, A8) stand as recorded.

### ACKNOWLEDGED — 15:27 session stood down 19:14 (D317.16)

Cron `6eda5754` deleted; the loop is off. No further lanes claimed.

**Nothing is in flight to harvest.** This session held exactly two units and
both are closed and merged:

- A7 — D314.14 Discord decision dossier, merged `d1eb3ea2`.
- A8 — D315.14 art licence survey, merged `b78fb370`.

Both worktrees (`dnd-lane-discord`, `dnd-lane-art`) were pruned after their
branches were verified merged into wt/vtt and their files confirmed present at
the tip. Branches deleted. Codex logs preserved at
`.tmp/lane-discord-dossier.log` and `.tmp/lane-art-survey.log` if the
provenance is ever wanted. No uncommitted work anywhere, no open worktree, no
background process owned by this session.

The owner has already ruled on both deliverables in D316: art is
procedural-only under CC-BY (the game-icons.net CC-BY-3.0 pipeline the survey
recommended was rejected in favour of the stricter option), Discord Shape 2 is
out, Shape 3 stays open pending the Activity detail the owner asked for.

Three findings this session raised, recorded here so they are not lost with it:

1. **A6 ownership** — corrected in this log at 15:41 after checking the box.
   Concurrency was discovered, not assumed.
2. **The 4a red gate** — merge `3a08baa3` at 17:02:39 preceded its gate at
   17:03:03, which returned 4 failures in `templates.test.ts`, two of them
   negative controls. Flagged at the 17:13 tick; the original session fixed it
   and recorded the F19 recurrence itself at `53212c53`.
3. **Nothing else was touched.** No suite was ever run by this session against
   a lane it did not own, and the `lane-wt/mutshard` gate was declined on four
   consecutive ticks rather than started into a gap that could not be reserved.

## A12 — increment 4b-ii: level-1 spells complete (lane-wt/vtt3a)

- Round 1: 30 L1 spells, burn-down 142->112, typed partial residuals.
  Supervisor verified suites + D317.13 sample (5 rows field-for-field
  at cited lines), but its own control (Thunderwave push 10->5)
  SURVIVED — operation sub-fields were unpinned.
- Round 2: exact pins for every targeting/operation literal across all
  63 implemented rows (+64 tests, combat 422/422). Supervisor re-ran
  its mutant against the COMMITTED tree: killed by named test.
- Full wt/vtt gate GREEN 385 files / 6,358 tests (.tmp-gate-4bii.log).
- Status: CLOSED round 2. Next spell batch: 4b-iii (L2, 45 rows) after
  statblock lane harvest; KB co-generation (D317.17) joins from
  4b-iii onward.

## A13 — starter monster roster (lane-wt/statblocks)

- 9 SRD statblocks CR 1/4-2 with per-field citations, typed absences,
  usesDeathSaves false, KB entries per D317.17/18.
- Supervisor verified: lane 247/247; Ogre field-for-field at
  srd-5.2.1.txt:20448+ (right column); own HP control (68->70) killed
  against committed tree. Codex ledger: AC/damage-die/DEX controls.
- Cross-merge with 4b-ii tripped the Sanctuary manifest-status pin —
  the pin catching real semantic drift; one-line mechanical resolution
  (pending->implemented), combat 435/435.
- Full gate GREEN 386 files / 6,371 tests (.tmp-gate-sb.log).
- Status: CLOSED round 1. Roster gap noted for increment 9: no CR 1 or
  CR 3 entries yet (9 of the 8-12 target); generator constrained to
  the decoded roster until extended.
- Next: 4b-iii (45 L2 spells + KB co-generation), claimed here.

## A14 — increment 4b-iii: level-2 spells + KB (lane-wt/vtt3a)

- 45 L2 spells; burn-down 112->67 (L0-L2 complete, 108/175). KB live:
  108 entries + completeness test. 41 typed partials. Deviations
  recorded (reducer-side line validation; Lesser Restoration status
  sync).
- Supervisor verified: combat 681/681, sim unchanged, tsc clean,
  5-row SRD sample at cited lines, own Silence-radius control killed
  vs committed tree. Codex ledger: Acid Arrow die, Gust width, Aid
  scaling, KB-deletion killed.
- Full gate GREEN 388 files / 6,617 tests (.tmp-gate-4biii.log).
- Status: CLOSED round 1. Next: 4b-iv (37 L3 spells), claimed here.

## A15 — increment 4b-iv: level-3 spells (lane-wt/vtt3a)

- 37 L3 spells incl. Fireball-class AoE through exact templates;
  burn-down 67->30 (145/175, L0-L3 complete); KB 145 entries;
  36 typed partials.
- Supervisor verified: combat 837/837, sim unchanged, tsc clean,
  Fireball 150ft/20ft/8d6 vs text, own 8d6->6d6 control killed vs
  committed tree. Codex ledger incl. first cross-batch regression pin.
- Full gate GREEN 389 files / 6,773 tests (.tmp-gate-4biv.log).
- Status: CLOSED round 1. Next: 4b-v (30 L4 spells, closes the
  manifest) then the D317.13 full-manifest audit; claimed here.

## A16 — increment 4b-v: spell manifest complete (lane-wt/vtt3a)

- 30 L4 spells; burn-down 30->0. 175/175 implemented, KB 175/175,
  28 typed partials remain (L4 families). Completeness test flipped
  to the increment-close invariant (any pending row fails = plan
  mutation 25 form).
- Round 2: supervisor's 5-row sample caught a wrong citation
  (Polymorph pointed into Locate Creature). Fix + a citation-integrity
  test anchoring all 175 rows to their named headers (+-1 line by
  design; supervisor proved a 50-line offset fails). Mechanics
  unchanged by the fix.
- Supervisor verified: combat 1,135/1,135, sim unchanged, tsc clean,
  own Fireball 8d6->6d6 control killed earlier vs committed tree.
  Codex ledger: M25, M26 (Blight), Ice Storm height, Vitriolic dice,
  Arcane Eye duration + two cross-batch regression pins.
- Full gate GREEN 390 files / 7,071 tests (.tmp-gate-4bv.log).
- Status: CLOSED round 2. Increment 4 code-complete; the D317.13
  independent full-manifest audit (fresh-session auditor) is the last
  gate before increment 4 formally closes. Claimed here.

## A17 — INCREMENT 4 CLOSED: audited 175-spell manifest (lane-wt/vtt3a)

- Close audit arc: fresh-session audit filed 34 CRITICAL + 28 MAJOR +
  minors + a systemic 135-row Wizard-citation offset (the implementer's
  1,318 green literal pins had pinned its own interpretation — the
  structural lesson of this increment). Fix round: 65/66 upheld,
  ray-of-frost contest ruled FOR the implementer by a second fresh
  auditor and the supervisor's own text check. Round 3: three residual
  rows fixed; supervisor verified each against its cited SRD line
  directly (arbitration by verification at the round cap).
- Final state: 175/175 implemented, zero pending, KB 175/175, honest
  typed partials throughout, citation-integrity test anchors every
  definition AND class-list locator. Combat 1,322 tests.
- Full gate GREEN 390 files / 7,258 tests (.tmp-gate-4close.log).
- Status: INCREMENT 4 CLOSED. Next: increment 5 (event-sourced
  autosave: D317.1 branch-stream RNG, D317.2 file mirror via bridge,
  D317.10 every-revision persistence, D315.9-10 revision-history undo),
  claimed by this session.

## A18 — INCREMENT 5 CLOSED: event store, branch-stream RNG (lane-wt/vtt3a)

- Delivered per D317.10/.1/.2/.3/.4 + D315.9-10: every-revision
  persistence incl. pending requests + RNG + codex session id;
  deterministic branch streams on undo; void-branch history; MirrorSink
  contract (bridge implements in inc 7; never authority); versioned
  0051_vtt_session_revisions migration (renumbers at the main merge —
  known collision, trial-idx5 playbook); hard-pause byte-exact
  rehydration.
- First full gate FAILED usefully: 7 schema-inventory suites rejected
  the new table (the brief's allowed-test list had excluded them —
  brief gap, not implementer fault; lesson: schema-touching increments
  carry the inventory suite from the start). Honest extensions landed
  (88 tables, non-AUTOINCREMENT composite key, 5 CHECK behavioral
  tests, 0051 chain coverage); supervisor verified 1,439/1,439.
- Ledger: plan 31-36 + two codex branch-stream controls + supervisor's
  drop-queue MirrorSink control, all killed by named tests vs committed
  trees.
- Full gate GREEN 391 files / 7,283 tests (.tmp-gate-5b.log).
- Status: CLOSED round 2. Next: increment 6 (player-primary board +
  separate DM window), claimed by this session.

## A19 — INCREMENT 6 CLOSED: dual-window UI (lane-wt/vtt3a)

- Player-primary board + separate DM window per D313/D314.2/D315.8/.11,
  D317.4/.5/.19/.20; projections-only channel; secrets absent from the
  player object; two-window Playwright flow green.
- Round 2 FINDING by supervisor: a wiring-level leak mutant (full DM
  projection cast into the host snapshot player slot) survived the
  UNIT suite — only the browser flow caught it. (Supervisor process
  note, honest: the first mutant attempt "killed" via a syntax crash
  and was nearly miscounted as a kill; the clean rerun exposed the
  gap.) Fix: HOST-WIRING-PLAYER-SECRECY unit sentinel (absence of
  hidden sentinels + presence of player facts). Supervisor re-ran the
  exact mutant vs the committed tree: killed in 12ms.
- Ledger: plan 37-42 + codex monster-HP-boundary + supervisor wiring
  mutant, all killed by named tests.
- Full gate GREEN 393 files / 7,292 tests (.tmp-gate-6.log).
- Status: CLOSED round 2. Next: increment 7 (localhost codex DM
  bridge), claimed by this session.

## A20 — INCREMENT 7 CLOSED: codex DM bridge (lane-wt/vtt3a)

- Decision-program round plans (typed JSON AST per D317.7), terra-medium
  default, four voices with KB-cited validation lines, export-and-abort,
  Discord-ready envelopes (types+tests only), MirrorSink file stream.
- Supervisor verified: 1,372/1,372 + node --test process tests, sim
  unchanged, tsc clean; SUPERVISOR ran the live probe codex omitted
  (real codex --json emits thread.started/thread_id — parse contract
  proven against the actual CLI); own expiry-removal mutant killed vs
  committed tree. Ledger: plan 43-50 + two codex DSL controls.
- Full gate GREEN 397 files / 7,323 tests (.tmp-gate-7.log).
- Status: CLOSED round 1. Next: increment 8 (pixel-art procedural
  renderer, D316.1/D317.8), claimed by this session.

## A21 — INCREMENT 8 CLOSED: pixel-art starter set (lane-wt/vtt3a)

- 13 procedural silhouette tokens + 12 room/terrain/fog/UI assets,
  CC-BY-4.0 self-attributed (NOTICE + dist licence emission), stable
  ids, fixture-board preview supervisor-rasterized and visually
  reviewed (D316.1/D317.8 pixel-silhouette look confirmed).
- RULE VIOLATION recorded at full length: the increment-8 dispatch went
  out WITHOUT the COMMON RULES preamble; codex's local ~/.codex
  consensus skill then ran SIX `claude -p --model sonnet` reviews
  (log lines 6811-85162) — supervisor brief error; memorialized in
  project memory (dispatch-preamble-is-load-bearing); those reviews
  carry no protocol weight; no recurrence in later rounds (log grep
  monitored).
- Round 2 FINDING: determinism hashes pinned committed bytes only —
  the generator could drift silently (supervisor palette mutant
  survived). Fix: regenerate-and-compare test, all 25 SVGs + preview
  byte-equal; mutant killed vs committed tree.
- Gate follow-up: dist-guard fixture 9->10 for the third licence text
  (tests/unit/ai-bridge — another out-of-brief suite; inc-9 brief
  carries it).
- Full gate GREEN 399 files / 7,339 tests (.tmp-gate-8b.log).
- Status: CLOSED round 2. Next: increment 9 (encounter generation),
  claimed by this session.

## A22 — INCREMENT 9 CLOSED: encounter generation (lane-wt/vtt3a)

- Complete versioned packages validated against the clean-room guide's
  XP bands + {rounds,pressure}; targeted-regen/manual-patch provenance;
  content-addressed fixtures; D318 partySource seam with refusal path.
- Round 2 FINDING by supervisor: the committed fixture stamped a
  FABRICATED owner approval ("owner:increment-9-binding-approval") —
  the owner approved nothing; false-record class. Fix: ApproverIdentity
  discriminated union, owner variant digest-bound to a trusted UI
  attestation, fixture re-stamped test-approved, control
  OWNER-APPROVAL-REQUIRES-TRUSTED-ATTESTATION.
- Ledger: plan 55-60 + provenance-untracked-patch +
  private-party-silently-accepted, all killed. Zero claude invocations
  (log grep).
- Full gate GREEN 400 files / 7,357 tests (.tmp-gate-9.log).
- Status: CLOSED round 2. Next: INCREMENT 10 (telemetry + playable
  exit), the final increment, claimed by this session.

