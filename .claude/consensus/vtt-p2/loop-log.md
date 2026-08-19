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
