# Session restart handoff — 2026-08-17

Written for the next supervisor session. The old session's env was poisoned
by a Fireworks CLI install (`ANTHROPIC_BASE_URL`→fireworks,
`CLAUDE_CODE_SUBAGENT_MODEL=deepseek-v4-flash`); owner reversed it on disk;
the restart itself is the fix. After restart, `env | grep -i fireworks`
inside a Bash call should be empty — verify before spawning any Agent.

## STILL RUNNING after the session exits (nohup'd — they survive)

Six lanes, dispatched ~17:55 local. Logs in
`/tmp/claude-1000/-home-vagrant-PhpstormProjects-dnd-multiclass-spells-static/f955f35b-84c1-4b19-891f-5038b32cd4ad/scratchpad/`
(dir survives until reboot). Check `ps -eo args | grep -E "codex exec|claude -p"`.

| Worktree | Branch | Runner | Task | Log |
|---|---|---|---|---|
| ~/PhpstormProjects/dnd-lane-d278-inc1 | lane-wt/lane-d278-inc1 | codex | D278 increment 1 (refusals module) per `.claude/plans/2026-08-17-d278-refusals-foundation.md` — plan is consensus-RATIFIED (3 rounds; round-3 H1 folded in by supervisor arbitration) | lane-d278.log |
| ~/PhpstormProjects/dnd-lane-d299 | lane-wt/lane-d299 | codex | D299 ui-hidden visibility flag | lane-d299.log |
| ~/PhpstormProjects/dnd-lane-grants-mig | lane-wt/lane-grants-mig | codex | src/grants defect-throw migration (~94 sites); refusal-like sites deferred+listed | lane-grants.log |
| ~/PhpstormProjects/dnd-lane-inc5 | lane-wt/inc5 (from wt/simcore) | codex | Wave-5 inc-5 exhaustive-switch conversions from R2 CONVERT list | lane-inc5.log |
| ~/PhpstormProjects/dnd-lane-coldopen | lane-wt/lane-coldopen | codex | Cold Open measured delta (D297) + Vanward control | lane-coldopen.log |
| ~/PhpstormProjects/dnd-lane-d286-review | lane-wt/lane-d286-review | claude -p (env-cleaned) | D286 stranger journey: desktop resume + mobile pass; report to docs/design/2026-08-17-d286-stranger-journey-review.md in its worktree | lane-d286.log |

Lane briefs: `l-*.txt` in the same scratchpad dir. All lanes: commit on
their branch, no push, terse report as their final log message (extract
with: `awk '/^codex$/{n=NR} END{print n}'` then `sed -n "$n,\$p"`).
Read each lane's verdict/report BEFORE merging; verify independently.

## Verification owed (non-delegable, quiet box)

- **D283 merge is IN main but NOT yet gated quiet.** Merge + tsc green +
  full suite ran with 291 files / 4,879 passed but 5 instrument-level
  `onTaskUpdate` errors (contended box) → run discarded per protocol. The
  re-run waiter died with the session. Owed: solo `npx vitest run` on
  main, expect 0 errors, exit 0. If red, the merge commit to bisect is
  the `lane/d283-boot-stamp` merge.
- **D284 (`lane/d284-second-tab`, ded5aa60) NOT yet merged** — merge after
  D283 gates green; review note: it added a 7th RpcErrorCode
  `storage_pool_locked` — reconcile wording with D278's "RpcError is
  defect-only" (a boot-time environmental failure is a defect-channel
  item, acceptable, but say so where the six-member comment lived).
- **D283 perf claim unmeasured**: `tools/perf/database-boot-perf.mjs`
  (Playwright, needs the preview at :4173) — run once no browser lane is
  active; the stamp's added cost (exportFile+SHA-256 per boot) is also
  unmeasured.
- **specs 11-12 merged** into main (licensing-checked). Spec finding to
  surface to owner: max-assemblable = **19** cantrips supersedes D251.2's
  18; bundled SRD text truncated mid-sentence at line 4507 (Pact of the
  Tome benefit) — possible corpus defect worth its own check.

## Today's decisions (all committed alone, newest first on main)

D296 all eight homebrew v3 adopted → D297 both Ambush chassis / Chorus
cost from d4 / cleric slot open → D298 lightweight test content, not
Veteran-grade → D299 ui-hidden marking. Main also has: specs-11-12 merge,
D283 merge (ungated), D296-D299 commits. Untracked: the D278 plan file
(intentionally uncommitted — plans stay untracked in this repo? decide:
it is referenced by the running d278 lane at its absolute path).

## Parallel-suite protocol (new, owner-approved experiment result)

Two full suites at `--maxWorkers=8` each: all tests pass, ~35% wall
saved, BUT vitest's worker-RPC heartbeat times out under contention → 
exit 1 with 0 failures. So: parallel capped suites = advisory only;
official merge gates = solo quiet run, exit code is the contract. Do not
raise vitest's internal timeout to force green.

## Queue after lanes land (D277 order)

1. Gate+merge each lane (order: d278-inc1 → d299 → grants-mig; inc5 goes
   to wt/simcore not main; coldopen + d286 are docs/report merges).
2. D278 increments 2-4 (rollback helper; clone transport test;
   commands.execute end-to-end — read the plan's H1 additions first).
3. Migration lanes module-by-module off the R1 worklist
   (scratchpad `r1-throw-inventory-final.md`; 801 sites, commands 174 /
   catalog 110 / grants 94 densest). Refusal-heavy modules wait for
   D278 increments; defect-only can go now.
4. Eight homebrew v3 entries as `ui_hidden` catalog content (needs D299
   lane merged). Lightweight per D298.
5. Round 24 adversarial delta on simcore (cross-merge done, tsc green,
   advisory suite 5,245/5,245) after inc5 lands; then quiet 2-of-2;
   then simcore→main (v1 gate per D279).
6. D286 report findings: MAJORs auto-block v1 (D294).

## Standing hard stops (unchanged)

No deploy (D266/D286). No push/publish/outward. No #6150 upstream post
(D275). decisions.md supervisor-only append-only. Licensing per D59.
Forbidden paths to green unchanged. Codex out of credits → stop loudly.
