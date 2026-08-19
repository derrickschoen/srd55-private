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

