# LUNA6-01: gpt-6-luna replaces gpt-5.6-luna, gpt-6-luna calls lose the 180 s wall, and a high-vs-xhigh study picks the route (plan r5)

- Revision r5, 2026-09-24 19:23 EDT (from `date`), Claude (Opus 5.5). Plan fix r4 of `plan-r4.md` (sha256 `d9132c228a7feae8b8e88667e4b1c55d64d4172e7ece0ab578747a5d66a98c0d`), reviewed by codex gpt-5.6-sol high r4: REVISE 4 P1 / 6 P2 / 2 P3 (`.tmp/runs/luna6/review-r4.log`, final message from line 4626, exit file 0) [V].
- Base: main `673c7ee31765c031fe2231b76a1e34b644c38a2e` (D890), the same base as r4 [V]. Every line number below holds at this commit.
- Status: DRAFT r5, for codex sol review r5. The plan is **self-contained**: every command, script, schema and pass criterion is written out here. Nothing refers back to r2, r3 or r4 for its content.
- Evidence tags: **[V]** = I checked it with a command this round (Appendix A). **[V-r4]** / **[V-r3]** / **[V-r2]** = checked in that round, not re-run. **[R]** = taken from a record or the supervisor's brief. **[I]** = inferred, listed in Appendix B.
- Change tags: **(owner 18:58)** and **(owner 19:01)** = the owner answers of 2026-09-24 (§0.1). **(r4 Pn-k)** = review r4 finding k of severity n, in the review's order (Appendix C). **(r3 P2-2)** and **(r3 P3-1)** = review r3 items that review r4 still marked PARTIAL. Untagged text is carried from r4.
- The only file written this round is this plan. I ran no tests, builds, vite-node scripts or agents, started no background process, and made no code or git change. The node arithmetic I ran is listed in Appendix A item 9; its scripts live in my session scratchpad, not in the repo.

---

## 0. Rulings, owner answers, readings

### 0.1 Owner rulings and answers (verbatim)

**D887** (`.claude/decisions.md:1752`) [V]:

> Owner, Luna scope re-put with corrected facts (D886 finding): "(a) at xhigh, (b) keep their effort". Ruling: every script-chosen Luna run (D569 arms, DATA-01 teacher, live play) moves to gpt-6-luna at xhigh; runs where effort is the variable under study (generate-data low, the D484 low/medium loop, the D425 low floor) move to gpt-6-luna at their stated effort; the code's no-flag default stays gpt-5.6-sol (legacy-invariance pins untouched).

**D890** (`.claude/decisions.md:1838-1848`) [V]:

> OWNER (LUNA6 r3 escalation, via AskUserQuestion), answer verbatim: "Lift the timeout cap on Luna. I want stats on speed vs quality for gpt-6-luna high vs xhigh". I then asked what the study should decide. The owner's answer: "Study picks the route (Recommended)".
> (a) The fixed 180 s round wall is removed for Luna runs. […] Only a 30 min per-call hang guard remains, and it is logged whenever it fires.
> (b) A measured study compares gpt-6-luna at high vs xhigh on the same states: response time per call, and decision quality scored as D569 arms are scored.
> (c) The study picks the route for script-chosen Luna runs. xhigh must beat high on quality by a pre-stated margin, using a named test. Until the study reports, script-chosen runs stay on today's route.
> This supersedes D887(a)'s fixed "script-chosen Luna → xhigh" for the route choice. D887(b), effort studies keep their effort, and D887(c), the no-flag default stays gpt-5.6-sol, are unchanged.

**Owner answers of 2026-09-24, not yet in a D-entry** (`.tmp/runs/perf-02/owner-q/answers.txt`, its last lines) [V]:

> 2026-09-24 18:58 Lift scope: gpt-6-luna only (plan's narrow reading; gpt-5.6-luna keeps 180 s until the study switches the route)
> 2026-09-24 19:01 Cohorts: Study on v5, v7 waits for v6 (route study runs on v5 cohorts/caps now; v7 not registered until COHORT v6 lands)

The supervisor's brief for this round adds, about the 18:58 answer [R]: only gpt-6-luna calls lose the 180 s wall and get the logged 30 min per-call hang guard; gpt-5.6-luna keeps 180 s until the study switches the route; **the speculation window stays, because the option the owner chose described this plan's narrow reading**; and DATA-01 teacher calls on gpt-6-luna fall under the same lift and guard. The answers-file line does not itself name the speculation window, so the Phase 0 D-entry records that part as the supervisor's account of the option text.

### 0.2 What r5 changes

| r4 element | r5 | Why |
|---|---|---|
| PR6/PR7/PR8 as plan readings, challenged by review r4 P1-1 | **Owner-confirmed** (owner 18:58). Review r4 P1-1 is answered by the owner, not by a plan change | §0.3 |
| Mixed-route refusal | **Kept**, now justified as the safety check the owner's reading implies: a round, or an arena invocation, carries one bound, and the owner's reading gives the two routes different bounds | §2.2 |
| DATA-01: "if DATA-01 adds a timeout" | A written **DATA-01 D890 implementation amendment**: route E after S-RESULT, every gpt-6-luna Responses call inside LUNA6's `guardedLunaCall`, logged, with a named witness for DATA-01's own batch | §7 (r4 P1-1) |
| D569 v7 registration (B3a, B3b, T3, T2c, 14 mutants, Q4a, Q4b, Q4c) | **Removed from executable scope.** A short deferred note remains | §6 (owner 19:01) |
| Study on v5 cohorts "silently" | Study on v5 cohorts and caps under a **recorded study-only supersession** (SA-2) of Part A :568 and :560 | §3.1 (owner 19:01; r4 P1-2) |
| LUNA6-SEQ capture (production output as oracle) | **Deleted.** Expected call sequences come from a written protocol state machine (§4.4), cross-checked against literals already frozen in existing tests | r4 P1-3, r3 P2-2 |
| Study scoring pipeline unspecified; T8 on synthetic values only | **End-to-end pipeline** (schedule → cells → ingest → packets → keys → three seat files → paired rows → call-log override → decision), every stage an in-repo, tested operator; guard expiry is preregistered as amendment **SA-1** | §3.7, §4.5 (r4 P1-4) |
| "Power is not claimed" | **Operating-characteristics simulation** from conservative variance bounds (pool3 panel data) before any spend; calibrated test level q*; a dominance rule; owner question **Q-POWER** | §3.5 (r4 P2-1) |
| Refusal-risk co-condition (upper bound ≤ 0.00) as a veto | **Removed as a veto**; reported as a secondary. Simulated, it vetoes xhigh 88 % of the time when both arms fail equally at 2 % | §3.4, Appendix E1 |
| Fixed ABBA arm blocks | **Randomized pair-adjacent order**: 120 pairs in a seeded random order, the two arms of a pair back to back in a seeded random order, the seed recorded before the schedule exists | §3.2 (r4 P2-2) |
| Latency percentiles over capped values | **Completion rate plus censoring**; a quantile that falls on a censored call is reported as censored, never as a number | §3.6 (r4 P2-3) |
| 8 study mutants | **22** study mutants, including sign, key mapping, blind-id sets, seat omission, leak, call-log association, cohorts, caps and schedule | §4.3 (r4 P2-4) |
| Call-log records appended at completion | **Two events per call** (dispatch, complete) joined by a dispatch ordinal assigned before delegation | §2.4 (r4 P2-5) |
| V9, V14, V15 named but not specified | V9 retired with v7; V14 and V15 are exact scripts, invocations, outputs and exit criteria; new V13e, V17, V18 | §8.2 (r4 P2-6) |
| "120 h ceiling" | **300 h** protocol ceiling (600 calls × 30 min), from the per-cell call bound | §3.9 (r4 P3-1) |
| P0a without remediation | P0a failure does not block B1; gpt-6-luna screenshot entries then run under an isolated codex home (M87) | §1.6 (r4 P3-2) |
| Q-ESC, Q-SPEC | **Removed.** Q-SPEC is answered (owner 18:58). Q-ESC reopened what D890 (c) already decides (review r4, PR4 row) | §8.5 |

### 0.3 Readings

**Supervisor readings of D887 recorded in D888** (`.claude/decisions.md:1771` onward) [V-r4]. They are not owner rulings.
- **R1. Live escalation.** Part A :330 says "two validation failures or a refusal trigger a fresh Luna-high session" [V]. R1 made that a fresh session on the base route (fresh context, no `max`).
- **R2. The two Luna-medium quality gates** (screenshot comprehension, :456; flat sight/cover probe gating elevation, :459) are script-chosen Luna runs and follow the (a) route. :456's "low research-only" arm is an effort study and keeps low.
- **R3. The codex explore route** in the owner's `~/.claude/CLAUDE.md:108-109` and the two history probes (`~/dnd-slim-runs/rejudge-driver.sh:5`, `.tmp/runs/conv-split-01/wait-and-dispatch.sh:7`) are codex helpers outside D887 and do not change.

**Plan readings.** The owner may strike any of these.
- **PR4 (R1 under D890).** Live escalation is a fresh gpt-6-luna session at **E**, the route S-RESULT records. Review r4 found this reading correct and the r4 question Q-ESC unnecessary, because D890 (c) already makes the study pick the script-chosen route. Q-ESC is removed; the escalation recovery rate is reported from live runs (K4), which lets the owner reopen it with data.
- **PR5.** The two quality gates run at E.
- **PR6 (owner-confirmed 18:58).** Until S-RESULT, a script-chosen Luna run uses the route it used before LUNA6: gpt-5.6-luna at the role's recorded effort, with today's 180 s wall. No current wrapper selects Luna for live play (§1.9).
- **PR7 (owner-confirmed 18:58).** The lift applies to every call whose route is gpt-6-luna, at any effort and on any path, including the (b) effort studies and the effort study. gpt-5.6-luna calls keep exactly today's behaviour.
- **PR8 (owner-confirmed 18:58, per the supervisor's account).** "Per call" means one adapter dispatch (`start` or `resume`), one screenshot CLI call, or one Responses API request. The live speculation window (60 s per player turn, capped at 300 s; `ai-dm-conversation.ts:262-263`, used at `:4805-4829`) stays. It is not the round wall and not the hang guard, and every speculation call is logged with `boundKind: 'speculation_window'`.
- **PR9.** Retired: it concerned D569 v7's non-Luna arms, and v7 is deferred (§6).
- **PR10.** Replaced by §7's amendment. D890 (c) supersedes DATA-01 r5's fixed xhigh for the teacher route, as review r4 said: the teacher uses E after S-RESULT.
- **PR11 (new).** D890 (c) says script-chosen runs "stay on today's route" until the study reports. The DATA-01 teacher has no route in operation (it has never run), so the only consistent reading is that **no paid DATA-01 teacher run on gpt-6-luna happens before S-RESULT**. DATA-01's own gates (the open S-4 answer, r5:22; the reserve measurement, r5:129) already block its paid pilot, so PR11 has no effect today. DATA-01's single route probe (r5:206) is an availability and price probe, not a production run, and may run before S-RESULT under the guard and log (§7).

### 0.4 Role table

| Luna role today (gpt-5.6-luna) | Effort today | Source | Class | Route after LUNA6 |
|---|---|---|---|---|
| Live play: player phase, speculation, arm-base correction and adjustment | medium | Part A :329 [V]; correction and adjustment run on the base planner (`ai-dm-conversation.ts:4200,4354-4357`) [V-r3] | (a) | today's route until S-RESULT (PR6), then gpt-6-luna **E** via the launcher |
| Live escalation | high, fresh session | :330 [V] | (a), PR4 | fresh gpt-6-luna **E** session |
| D569 arms (blind, advice, blind-minhint) | high | `tools/d569-blind-experiment.ts:34-39` [V] | (a) | **deferred**: no v7 until COHORT v6 lands on main (owner 19:01, §6) |
| DATA-01 teacher (direct Responses API) | xhigh in DATA-01 r5 | DATA-01 r5:18, :56 [V] | (a) | gpt-6-luna **E** after S-RESULT, guard and log per §7 (PR10, PR11) |
| Screenshot comprehension gate | medium | :456 [V-r4] | (a), PR5 | gpt-6-luna **E** |
| Flat sight/cover gate for elevation | medium | :459 [V-r4] | (a), PR5 | gpt-6-luna **E** |
| Screenshot "low research-only" arm | low | :456 [V-r4] | (b) | gpt-6-luna low, lifted |
| RL corpus `tools/rl/generate-data.ts` | low | `:49-53,:229-233,:283-284` [V-r4] | (b) | gpt-6-luna low, lifted (B2) |
| D484 low/medium loop | low, medium | :484 [V-r4] | (b) | gpt-6-luna low / medium, lifted |
| D425 low floor; D449 target "against Luna low" | low | :425, :449 [V-r4] | (b) | gpt-6-luna low, lifted |
| Room D slice-3 "Luna-medium distillation" (shelved) | medium | :561 [V-r4] | (a), plan reading | gpt-6-luna E if unshelved |
| Teacher/student measurement setting ("includes Luna medium") | medium | :430 [V] | (a), plan reading | gpt-6-luna E |
| **Effort study** (new, D890 b) | high and xhigh | D890 | effort is the variable | gpt-6-luna high and xhigh, lifted (§3) |
| Arena/conversation no-flag default (not Luna) | gpt-5.6-sol medium | `ai-dm-arena.ts:667`, `:675`; `ai-dm-conversation.ts:1264` [V] | (c) | **unchanged**, not lifted |
| VTT/Discord DM bridge default (not Luna) | gpt-5.6-terra medium | `src/vtt/dm-bridge/contracts.ts:98-99` [V-r2] | not a Luna run | unchanged |
| Supervisor codex explore route | gpt-5.6-luna medium | `~/.claude/CLAUDE.md:108-109` [V-r3] | outside D887 (R3) | unchanged |

**What D887 (c) removes (carried).** No default is repointed, no legacy oracle changes, no default assertion is edited, and no row budget field is added. **No runner default chooses a Luna model.** The sol branch of the resolver returns exactly today's values (§2.3); T6, the frozen legacy tests and the seven D880 pins prove it (V6a, V8).

---

## 1. Touch points

### 1.1 Census of the `gpt-5.6-luna` literal (carried from r4, unchanged at this base)

| Commit | Matching lines | Files | Literal occurrences | Occurrences outside records (`.claude docs reports progress`) |
|---|---:|---:|---:|---:|
| `47f62e88` (r3 base) | 197 | 36 | 301 | 186 [V-r4] |
| `673c7ee3` (this base) | 614 | 40 | 767 | 186 [V-r4] |

The rise at `673c7ee3` is records only (four archive files) [V-r4]. `gpt-6-luna` occurs 0 times in `src tools tests` [V]. Per file, in lines / occurrences [V-r4]: `tools/d569-blind-experiment.ts` 22/23, `tools/d569-v5/analyze-primary-pair.ts` 4/4, `tools/d569-v5/validate-first-arm.ts` 1/1, `tools/rl/generate-data.ts` 4/4, `tools/ai-dm-rerun-packet.ts` 2/2, `tests/fixtures/d569-blind-experiment-manifest.json` 12/26, `tests/fixtures/rl/authorized-arena-row.SIMULATED.jsonl` 1/2, `d569-blind-experiment.test.ts` 25/51, `d569-v5.test.ts` 4/5, `ai-dm-arena.test.ts` 15/21, `ai-dm-conversation.test.ts` 25/25, `ai-dm-screenshot-probe.test.ts` 10/14, `ai-dm-board-delivery.test.ts` 4/4, `ai-dm-rerun-packet.test.ts` 2/2, `rl-extract-sft.test.ts` 1/1, `rl-generate-data.test.ts` 1/1. None in `src/`.

### 1.2 Code that changes

| File:line | Today | Change | Batch |
|---|---|---|---|
| new `tools/model-routes.ts` | n/a | `LUNA_MODEL = 'gpt-6-luna'`, `HISTORICAL_LUNA_MODEL = 'gpt-5.6-luna'`, `LUNA_HANG_GUARD_MS = 1_800_000`, a local `LunaEffort` union (`'low' \| 'medium' \| 'high' \| 'xhigh'`), `lunaStudyRoute(effort)`, `resolveSessionBounds`, `resolveScreenshotTimeout` (§2.3). **Imports nothing from `./ai-dm-*`**; T1 checks with `expectTypeOf` that `LunaEffort` equals the runner's `ConversationEffort` | B1 |
| `src/vtt/agent-session-lifecycle.ts:36-88` | only `createConversationRoundDeadline` | add `createUnboundedRoundDeadline()` beside it (§2.3); the bounded function is unchanged | B1 |
| new `tools/luna-call-log.ts` | n/a | `LUNA_CALL_LOG_SCHEMA = 'luna-call-log-v2'`, `lunaCallLogPath(outPath)`, `lunaCallLogSink(path)`, `withLunaCallLog(adapter, sink, context)`, `guardedLunaCall(meta, sink, fn)`, `reconcileLunaCallLog(lines)` (§2.4) | B1 |
| `tools/ai-dm-conversation.ts` `:312`, `:768`, `:896-901` (run options), `:1264-1265`, `:4341`, `:4534`, `:5544-5548`, `:7147-7150`, `:7339`, `:7557` | 180 s wall; `timeoutMs` 120 000 / 240 000 | parser calls the resolver; `roundWallMs: number \| null`; unbounded deadline when null; call-log decorator in lifted runs; new optional run option `lunaCallLogPath?: string` (a run option, not a config field); blind engine deadline removed in lifted runs with the attempt baseline kept; `policyElapsedMs` unclamped when null; row `roundWallBudgetMs: number \| null` (§2.3) | B1 |
| `tools/ai-dm-arena.ts:97`, `:311` parser, `:423-428`, `:675`, `:685`, `:821-825`, `:888`, `:935-957`, `:976-1000` | `roundWallMs: 180000` literal type; only 180 000 accepted | `180000 \| null`; parser calls the resolver; `--round-wall-ms 180000` refused for a gpt-6-luna run; restricted-wall check accepts null; **both run loops pass `lunaCallLogPath: lunaCallLogPath(config.outPath)`** to every `runConversation`, because each cell's own `outPath` is a temporary file (`:947`, `:987`) [V] | B1 |
| `tools/ai-dm-screenshot-probe.ts:2049-2089` answerer, `:2175` parser | spawns `codex` with no timeout [V-r4] | optional `--timeout-ms`; `codexScreenshotAnswerer(options?: { cliBin?, timeoutMs?, onCall? })`; kills the child on expiry and records `timed_out`; gpt-6-luna entries get the hang guard; their calls are logged (§2.4). If P0a fails: gpt-6-luna entries run under an isolated codex home (§1.6) | B1 |
| `tools/rl/generate-data.ts:49-53,113,193-197,229-233,283-284` | v1 manifest, gpt-5.6-luna low, `--timeout-ms` 120 000 | `arena-rl-batch-v2`, gpt-6-luna low (b), no `--timeout-ms` in the arena argv (lifted); its own `--timeout-ms` option is removed and refused with the lift message; resuming a v1 manifest throws a named error | B2 |
| `tools/d569-blind-experiment.ts:988-1041` | private `mulberry32`, `percentile`, `clusterInterval`, `panelValues` | **additive exports by extraction, no behaviour change**: `d569ClusterBootstrapDraws(clusters, resamples, seed)` (the loop now inside `clusterInterval`, which then calls it), `d569Percentile(sorted, q)`, `d569PanelValues(row)`. The v5 outputs are pinned by the frozen `d569-blind-experiment.test.ts`, `d569-v5.test.ts` (V6a) and the d569-cells pin `fedcda76` (V8) | B6 |
| new `tools/luna6-effort-study.ts` and `tools/luna6-effort-study/{registration,schedule,ingest,packets,analyze,latency}.ts` | n/a | the study operator (§3.7): subcommands `schedule`, `ingest`, `packets`, `analyze`; registration typed from S-PREREG. The CLI entry runs only when invoked directly and never under Vitest (the guard pattern of `ai-dm-arena.ts:1042-1048`) | B6 |
| new `tools/luna-route-launch.ts` | n/a | the (a) launcher at route E (§5) | B5 |

`max` is not added to any effort union. No file under `tools/d569-v5/`, no D569 manifest, and nothing on a shelved branch changes.

### 1.3 Code that does NOT change

- The no-flag defaults: `ai-dm-arena.ts:667,675` and `ai-dm-conversation.ts:1264` (sol, medium, 120 000 / 240 000 ms), and the 180 s wall **for every run with no gpt-6-luna route** [V].
- The adapters and the engine server: `src/vtt/agent-adapters/` (codex passes `invocation.timeoutMs` to its process runner, `codex.ts:183-188`; the runner arms `setTimeout(timeOut, timeoutMs)`, `process.ts:153-154`) and `src/vtt/mcp/` (the engine checks `clock() >= blindDeadlineUnixMs`, `engine-server.ts:2363`; the launcher manifest accepts any positive safe integer, `entrypoint.ts:1021-1022`) [V-r4]. These are FROZEN (V6a).
- The speculation window: `SPECULATION_MS_PER_PLAYER_TURN = 60_000`, `SPECULATION_MAX_BUDGET_MS = 300_000` (`ai-dm-conversation.ts:262-263`); the speculation invocation's `timeoutMs = Math.min(invocation.timeoutMs ?? budgetMs, budgetMs)` and its own abort timer (`:4807`, `:4826-4829`) [V]. Owner-confirmed (PR8).
- The turn-exhaustion protocol: `src/vtt/turn-exhaustion-coordinator.ts` (`MAX_PROPOSAL_CORRECTIONS = 1`, `:11`) [V].
- The packet builder `tools/ai-dm-rerun-packet.ts` (FROZEN). The study calls its exported `buildRerunPacket(rows, shuffleSeed, protocol, options)` (`:1344-1355`), which accepts a protocol object [V].
- Runner stdout for non-lifted runs. Lifted runs add a call-log file and, only when the guard fires, one stderr line (§2.4).
- Out of scope: the Terra bridge, `scripted-skirmish.ts`, `agent-conformance.ts`, `~/.codex-aidm/config.toml`, and `src/vtt/blind-intent-resolver.ts:50` `BLIND_LIVE_WALL_MS` (the engine's fallback when no deadline is supplied, `engine-server.ts:1616`; the runner always supplies one) [V-r4].

### 1.4 History that lives in code or fixtures: byte-frozen

- `tools/ai-dm-rerun-packet.ts` including the D575 registry at `:1385-1403` [V-r4], and its test.
- `tests/fixtures/d569-blind-experiment-manifest.json`: raw sha256 `8c0bcb3c0afa8358c26129efbef82d0d2882135389d8dd8040fe7e4b6451e13a` [V: first 16 hex this round; full value V-r4], equal to `manifestRawSha256` in the v5 launch provenance [V-r2].
- `tests/fixtures/d569-second-family-manifest.json` `83daa7ea…` and `tests/fixtures/d569-prepatch-primary-bytes.json` `8c393a5d…` [V-r4].
- Every existing export of `tools/d569-blind-experiment.ts` keeps its name, signature and output.
- `tools/d569-v5/*` (analysis `cb49d78d`, merge `54e5e371`, reconciliation `922cd0a6`, validator `7a6daf6e`) [V-r4]; installed copies in `~/dnd-slim-runs/d569-v5/scripts/`: analysis `91542e61`, validator `7f177aff`, check-manifest `a316882c`, judge-staged `8004d85c` [V], advisory-gate `5641653a` [V].
- `tests/fixtures/ai-dm-legacy/*.json`, `tests/unit/tools/ai-dm-legacy-invariance.test.ts`, `tests/fixtures/rl/authorized-arena-row.SIMULATED.jsonl`.

### 1.5 Test placement, fixed in advance

| Class | Files | Check |
|---|---|---|
| **FROZEN** in every batch | `ai-dm-legacy-invariance.test.ts`, `ai-dm-conversation.test.ts`, `d569-blind-experiment.test.ts`, `d569-v5.test.ts`, `d569-second-family-manifest.test.ts`, `rl-extract-sft.test.ts`, `ai-dm-rerun-packet.test.ts`, `ai-dm-board-delivery.test.ts`; the §1.4 fixtures and code; `src/vtt/agent-adapters/`; `src/vtt/mcp/`; `src/vtt/turn-exhaustion-coordinator.ts` | V6a |
| **APPEND-ONLY**, only in the named batch | `ai-dm-arena.test.ts`: B1 appends describe `LUNA6 Luna lift wiring`; B5 appends `LUNA6 route witnesses`. `ai-dm-screenshot-probe.test.ts`: B1 appends `LUNA6 Luna lift wiring` | V6b. In every other batch these files are FROZEN against the previous LUNA6 landing |
| Edited | `rl-generate-data.test.ts` (B2); `model-routes.test.ts` (created in B1; B5 adds one test) | V4, mutants |
| New, each test ≤ 5 s solo (V10) | `model-routes.test.ts` (T1, B1), `luna6-guard.test.ts` (T4, B4), `luna6-effort-study.test.ts` (T8, B6), `luna6-route-launch.test.ts` (T7a, B5) | V10. On failure, STOP and report; nothing is relocated |

The runner-importing witnesses are appended to `ai-dm-arena.test.ts` because it already imports both runners (import block ending at `:56`; `parseConversationArgs` and `runConversation` at `:69-72`) and defines the helpers they reuse: `BlindArenaSnapshotService` (`:112`), `runBlindArenaCase` (`:368`), `InProcessArenaAdapter` (`:598`), `LEGACY_BLOCK_ARGS` (`:682`, = `--combat-model monster_block_v1 --initiative-profile legacy` [V]), `ALL_OPTIONS_TEST_RENDERER_ARGS` (`:699`), `generateRoom` (`:24`) [V-r4]. New tests use `tests/helpers/test-filesystem` or `declareTestInputs`, because `ast-grep-rules/no-raw-fs-in-tests.yml` forbids importing `fs` in tests [V-r4].

### 1.6 External configs and scripts (read only here)

- `~/.codex-aidm/models_cache.json` (fetched 2026-09-15, client 0.154.0) does not list gpt-6-luna; `~/.codex/models_cache.json` (2026-09-24, 0.156.1) does [V-r2]. The screenshot probe runs `codex` with `CODEX_HOME=/home/vagrant/.codex-aidm` (`ai-dm-screenshot-probe.ts:150,2057,2089`) [V-r2], so it reads the stale cache. Arena and conversation build an isolated home that symlinks only `auth.json` and `config.toml` from the operator home and has no model cache (`buildIsolatedCodexHome`, `ai-dm-conversation.ts:1291-1316`) [V], so they are not exposed to the stale cache.
- **P0a and its remediation (r4 P3-2).** P0a runs `CODEX_HOME=/home/vagrant/.codex-aidm codex exec -m gpt-6-luna -c model_reasoning_effort=<high|xhigh> --sandbox read-only -`, one call per effort, before B1.
  - Pass: recorded; nothing changes.
  - Fail: **B1 is not blocked**, because B1's screenshot tests use a fake CLI. B1 then also makes the screenshot probe run each gpt-6-luna entry under `buildIsolatedCodexHome(<the probe's --out directory>, { cwd, instructionSource: 'none' })`, the construction arena and conversation already use; entries for other models keep `~/.codex-aidm` unchanged. T2b gains `screenshot probe runs gpt-6-luna entries under an isolated codex home` and mutant M87. No gpt-6-luna screenshot run happens before that lands. `~/.codex-aidm` itself is never edited.
- `~/dnd-slim-runs/**` and `.tmp/runs/**` history wrappers are never edited or re-run.
- After landing, the supervisor updates the memory note `model-routing-2026-09-08.md`, whose line 3 still says "luna becomes gpt-6-luna xhigh everywhere, scope being re-confirmed" [V-r3].

### 1.7 Records are never rewritten

The landing D-entries supersede these Part A lines **by reference, for gpt-6-luna runs**: :329 and :330 (live effort, escalation, and the 180 s wall), :425, :430 (budgets: gpt-6-luna runs declare the hang guard), :449, :456, :459, :484, :561. Part A :560 and :568 are superseded **for the effort study only** by SA-2 (§3.1). The D569 first-arm settings in :568 are not superseded: v7 is deferred (§6).

### 1.8 Shelved branches

`claude/cohort-01` holds COHORT v6, including `d569-blind-experiment-manifest-v6` (Part A :515) [V]. Nothing on `claude/cohort-01`, `claude/vis-field` or `claude/conv-split-01` is edited (D847).

### 1.9 Run wrappers: census of today's wrappers (carried, [V-r3])

Method: grep for `gpt-5.6-luna` and `gpt-6-luna` in `.sh .bash .py .mjs .js .ts .md` under `~/dnd-slim-runs/` (skipping `stale-worktrees/`), `.tmp/runs/**/*.sh`, `tools/`, `scripts/`, `orchestration/` and `package.json`, continuation lines joined. Result: 66 files, 82 invocation lines that select a Luna route (55 arena, 23 screenshot probe, 1 conversation, 2 `codex exec` probes, 1 in-repo argv), plus 14 function-call feeder lines and 1 runbook prose line.

| Runner | Route flags | n | Where (unprefixed = `~/dnd-slim-runs/`) | Class if re-run |
|---|---|---:|---|---|
| arena | `--model gpt-5.6-luna --effort medium --timeout-ms 240000` | 14 | `.tmp/runs/`: run-brutal-b-arms.sh:4,5; run-cap-arms.sh:6; run-e1c-judged.sh:3,4; run-e1cb-judged.sh:7,8; run-e1cc-rep.sh:4,5; run-pool-reps.sh:4; run-pool-screen.sh:5; run-reruns-after-caps.sh:5,7,8 | (a) → launcher at E |
| arena | `--model gpt-5.6-luna --effort medium` | 5 | `.tmp/runs/`: run-e2-30rows.sh:3,4; run-e2-r110.sh:3,4; run-miniab-flags.sh:12 | (a) → launcher |
| arena | `--timeout-ms 240000 --model gpt-5.6-luna --effort medium` | 1 | run-d510-medium.sh:10 | (b) |
| arena | `--model gpt-5.6-luna --effort low` | 5 | run-d440-arms.sh:14; run-d441-arms.sh:9; run-d444-quads.sh:8; run-d514-reduced.sh:6; run-resume-arms.sh:36 | (b) |
| arena | `--timeout-ms 120000 --model gpt-5.6-luna --effort low` | 13 | run-d447-direct.sh:9; run-d447.sh:17; run-d466-control.sh:10; run-d483-cavfull.sh:12; run-d483-luna-protocol.sh:9; run-d483-rerun.sh:13; run-d490-override.sh:9; run-d500-transport{,-2,-3,-4}.sh:9; run-post-d443.sh:28; run-probe-then-d447.sh:18 | (b) |
| arena | `--timeout-ms 240000 --model gpt-5.6-luna --effort low` | 1 | run-d499-sgating-240.sh:10 | (b) |
| arena | `--model gpt-5.6-luna --effort low --timeout-ms 240000` | 5 | `.tmp/runs/run-d573-low.sh:4,7,8`; adoption-ab.sh:6; rejudge-driver.sh:17 | (b) |
| arena | effort as a variable | 6 | `.tmp/runs/run-miniab-classic5.sh:6`; run-d443-arms.sh:8; resume-after-reboot.sh:34; run-d513-image-on.sh:10; run-d514-reduced.sh:10; run-d521-capture-only.sh:7 | (b) |
| arena, escalation | `--model $m --effort $e $extra --timeout-ms 240000`, `extra="--escalation-model $em --escalation-effort $ee"` | 1 | cycle2.sh:5-12; its arms include `gpt-5.6-luna` base with `gpt-5.6-sol` escalation (`t-ll-sl`, `t-lm-sl`, `:19-20`) [V] | (b); a gpt-6-luna rerun of those two arms mixes routes and is refused (§2.2) |
| arena, D569 | `--dm-mode blind … --model gpt-5.6-luna --effort high --timeout-ms 240000` | 4 | `d569-v5/runbook-84326354.md:269,282,1013,1025` | deferred with v7 (§6) |
| conversation | `--timeout-ms 120000 --model gpt-5.6-luna --effort low` | 1 | smoke-3round.sh:6 | (b) |
| screenshot | `--models gpt-5.6-luna:medium` | 7 | `.tmp/runs/`: run-d562-probe24-r5d-seed2.sh:3; run-e1-arms.sh:4; run-e1-replication.sh:4; run-e1b-arms.sh:5; run-e1b-seed2.sh:4; run-d527-iso-baseline.sh:4; run-d541-probe24-r4-seed2.sh:4 | (a) gate → launcher `--runner screenshot` |
| screenshot | `--models gpt-5.6-luna:medium,gpt-5.6-luna:low` and reversed | 10 | `.tmp/runs/` run-d536/d561/d562/d525 probes | medium (a), low (b) |
| screenshot | `--models gpt-5.6-luna:low` | 6 | `.tmp/runs/run-d568-*.sh` | (b) |
| codex exec probe | `-m gpt-5.6-luna …` | 2 | rejudge-driver.sh:5; `.tmp/runs/conv-split-01/wait-and-dispatch.sh:7` | outside D887 (R3) |
| in-repo argv | `'--model', 'gpt-5.6-luna'` … `'low'` | 1 | `tools/rl/generate-data.ts:283` | (b) → B2 |

**No current wrapper selects Luna for live play.** New artifacts: the effort-study files under `~/dnd-slim-runs/luna6-effort/` (§3.7); after S-RESULT, the launcher (§5) and the `~/dnd-slim-runs/luna6/` wrappers; (b) study wrappers call runners directly with `--model gpt-6-luna --effort <low|medium>` and no `--timeout-ms`.

---

## 2. The lift: gpt-6-luna calls lose the 180 s wall and get one logged 30 min hang guard (owner 18:58)

### 2.1 Where the 180 s bound lives today [V: code read this round]

1. `tools/ai-dm-conversation.ts:1265` sets `roundWallMs: 180_000` unconditionally. `tools/ai-dm-arena.ts:423-428` accepts only `--round-wall-ms 180000` and stores it in `experimentPolicy` (`:685`); `:888` passes it into each cell's conversation config.
2. `:5544-5548` builds one `createConversationRoundDeadline(config.roundWallMs, roundStarted, policyNow)` per round.
3. Every agent dispatch goes through that deadline: the primary through `lifecycle.coldStartRound(primaryInvocation, roundDeadline)` or `resumeRound` (`:5633`, `:5636`), the correction through `resumeCorrection(…, deadline)` (`:6334`), escalation through `startEscalation(…, deadline)` (`:6203`), speculation through `roundDeadline.dispatch` (`:4826`), recalculation through `roundDeadline.dispatch` (`:6926`) [V-r4 for the last].
4. `src/vtt/agent-session-lifecycle.ts:64-76`: `dispatch()` returns `timeoutMs = Math.min(invocation.timeoutMs ?? remainderMs, remainderMs)` and rewrites the invocation; `:157-158` hands the adapter `dispatch.invocation` and `deadline.signal`, which aborts at the wall (`:52-61`). `acceptsCompletion()` rejects any completion after the wall (`:79-85`), and `coldStartRound` returns `expired` then (`:134`).
5. So a primary call is killed at the remaining round budget (≤ 180 s), whatever `--timeout-ms` says.
6. In blind mode the runner also sends the engine `blindDeadlineUnixMs = Date.now() + config.timeoutMs` (`:4534`), reused by the correction launcher (`:5848`); the engine refuses late blind submissions (`engine-server.ts:2363`); `:7339` derives the attempt timing baseline as `blindDeadlineUnixMs - config.timeoutMs` [V-r4].

**Finding against the records (carried, for the supervisor).** Part A :430 and :568 say D569 comparisons run at 240 s. The shared 180 s round deadline arrived in `89c2ee31` (2026-09-09 02:15), which is not an ancestor of the v5 launch commit (`90484d45` → `7d5b5d1b`, 2026-09-09 01:07) [V-r4]. v5's first arm ran with an effective 240 s; a dm-mode run on today's main is capped at 180 s.

### 2.2 Coverage: exactly which calls are lifted (PR7, owner 18:58)

The resolver sees **every** route a run can dispatch: the base route, the escalation route, and every `--arm`'s base and escalation.

| Run | Routes | Lifted? | Bounds |
|---|---|---|---|
| Arena or conversation, every route `gpt-6-luna` (any effort; legacy or dm-mode) | all gpt-6-luna | **yes** | per-call `timeoutMs` 1,800,000; no round wall; no engine blind deadline; call log. Speculation calls keep their window (PR8) |
| Arena or conversation, no route `gpt-6-luna` (sol default, Terra, gpt-5.6-luna today's route and history, local models) | none | no | today's exact values: 120 000 / 240 000 ms or `--timeout-ms`; 180 s wall |
| Arena or conversation mixing `gpt-6-luna` with another model (base vs escalation, or an `--arm` list) | mixed | **refused** at parse | `LUNA6: a run mixing gpt-6-luna and other routes cannot give each route its own bound (owner 2026-09-24: only gpt-6-luna calls lose the 180 s wall); split it`. Exit non-zero before any dispatch |
| gpt-6-luna run with `--timeout-ms` other than 1800000, or with `--round-wall-ms 180000` | gpt-6-luna | **refused** at parse | `LUNA6: gpt-6-luna <effort> runs uncensored (owner 2026-09-24); --timeout-ms <value> is refused (hang guard 1800000)`; the same template names `--round-wall-ms` |
| Screenshot probe, each `--models` entry | per entry | gpt-6-luna entries yes | gpt-6-luna: 1,800,000 per call; any other explicit `--timeout-ms` refused. Other models: today's behaviour (untimed unless `--timeout-ms`). The probe has no rounds, so entries never share a bound |
| DATA-01 gpt-6-luna Responses calls | gpt-6-luna | yes (owner 18:58, per the supervisor's brief) | carried by DATA-01's implementation through `guardedLunaCall` (§7); LUNA6 supplies and tests the helper |
| Supervisor codex helpers (R3) | — | no | unchanged |

**Why the mixed-route refusal stays (review r4 P1-1 called it unauthorized).** It is not a new policy; it is the check the owner's reading forces on the code's structure.
- The owner's reading gives the two routes different bounds: gpt-6-luna calls get the 30 min guard and no wall; every other call keeps the 180 s wall.
- **Within one conversation**, all calls of a round share one deadline object. The deadline decides both the clamp (`dispatch`, `agent-session-lifecycle.ts:64-76`) and whether an answer counts (`acceptsCompletion`, `:79-85`; the runner re-checks at `ai-dm-conversation.ts:5733`). If the round keeps the 180 s wall, a gpt-6-luna escalation answered at 200 s is thrown away, which breaks the lift. If the round loses the wall, the gpt-5.6-luna or Sol base call loses its 180 s, which breaks "only gpt-6-luna". No single deadline satisfies both, so a mixed conversation cannot run correctly.
- **Within one arena invocation**, `timeoutMs` and `experimentPolicy.roundWallMs` are invocation-level. They are copied into every cell's config (`ai-dm-arena.ts:887-888`) and every row's check (`:821-825`). A mixed `--arm` list would therefore silently give one arm the other arm's bound, and a comparison between a censored and an uncensored arm is confounded.
- Refusing is the fail-closed choice; the alternative is a silently wrong bound. Nothing scheduled is mixed: the study is all gpt-6-luna, v7 is deferred, and the only mixed history wrapper is cycle2's tiered arms (§1.9). Per-arm or per-call bounds are rejected in §4.6.

### 2.3 Mechanism (B1)

**Resolver** (`tools/model-routes.ts`):

```ts
resolveSessionBounds({ routes, path, explicitTimeoutMs, explicitRoundWall }):
  // routes: readonly { model: string; effort: string }[]; path: 'legacy' | 'dm_mode'
  // explicitTimeoutMs: number | null; explicitRoundWall: null | 180000
  luna = routes.filter(r => r.model === LUNA_MODEL).length
  if luna === 0:  return { timeoutMs: explicitTimeoutMs ?? (path === 'dm_mode' ? 240_000 : 120_000),
                           roundWallMs: 180_000,
                           bound: explicitTimeoutMs === null ? 'legacy_default' : 'cli_override' }
  if luna !== routes.length: throw mixed-route refusal
  if explicitTimeoutMs !== null && explicitTimeoutMs !== LUNA_HANG_GUARD_MS: throw lift refusal (names model, effort, value)
  if explicitRoundWall !== null: throw lift refusal (names --round-wall-ms)
  return { timeoutMs: LUNA_HANG_GUARD_MS, roundWallMs: null, bound: 'luna_hang_guard' }
```

The non-Luna branch returns what the parsers compute today, byte for byte (`ai-dm-conversation.ts:1264`, `ai-dm-arena.ts:675`) [V]. `bound` is **not stored on any config**: T6 compares whole configs (`ai-dm-legacy-invariance.test.ts:1278-1294`), and `ai-dm-arena.test.ts:960-963` asserts `parsed.experimentPolicy` toEqual `{ roundWallMs: 180_000, basisDirectory }` [V-r4]. The lift is encoded only by `roundWallMs: null` plus `timeoutMs: 1_800_000`. The call-log path travels as a **run option**, which T6 does not compare.

`resolveScreenshotTimeout({ model, explicitTimeoutMs })`: gpt-6-luna → 1,800,000 (an explicit value must equal it); any other model → `explicitTimeoutMs ?? null` (untimed, as today).

**Unbounded deadline** (`src/vtt/agent-session-lifecycle.ts`):

```ts
export function createUnboundedRoundDeadline(): AgentDispatchDeadline {
  const signal = new AbortController().signal;          // never aborted, no timer
  return {
    signal,
    dispatch(invocation) {
      if (invocation.timeoutMs === null) throw new RangeError('An unbounded round requires a per-call hang guard.');
      return { kind: 'open', timeoutMs: invocation.timeoutMs, invocation };
    },
    acceptsCompletion: () => true,
  };
}
```

`invocation.timeoutMs` is typed `number | null` (`src/vtt/agent-session.ts:175`) [V]. A huge number in place of `null` was rejected (§4.6).

**Runner changes** (`tools/ai-dm-conversation.ts`):
- `:1264-1265`: `timeoutMs` and `roundWallMs` from `resolveSessionBounds` with routes = base plus escalation. `:312`: `roundWallMs: number | null`.
- `:5544-5548`: `config.roundWallMs === null ? createUnboundedRoundDeadline() : (options.roundDeadlineFactory ?? createConversationRoundDeadline)(config.roundWallMs, roundStarted, policyNow)`.
- `:7147-7150`: `policyElapsedMs = roundWallTimedOut ? config.roundWallMs : (config.roundWallMs === null ? elapsed : Math.min(config.roundWallMs, elapsed))`. `roundWallTimedOut` cannot be true when `roundWallMs` is null.
- `:768`, `:7557`: row `roundWallBudgetMs: number | null`; `null` in lifted rows, 180 000 otherwise. The legacy comparator asserts 180 000 for sol and deletes the field (`ai-dm-legacy-invariance.test.ts:475,492`) [V-r4].
- `:4534`, `:7339`: `const blindRoundStartedUnixMs = Date.now(); const blindDeadlineUnixMs = config.roundWallMs === null ? Number.MAX_SAFE_INTEGER : blindRoundStartedUnixMs + config.timeoutMs;` and `attemptBaseline = blindRoundStartedUnixMs`. For non-lifted runs both equal today's arithmetic. `Number.MAX_SAFE_INTEGER` passes the manifest check (`entrypoint.ts:1021-1022`) and the engine check (`engine-server.ts:1617`), and `clock() >= 9007199254740991` is never true; the engine uses no timer for this deadline [V-r4].
- `:4341`: `new ModelCallBookkeepingAdapter(config.roundWallMs === null ? withLunaCallLog(selectedAdapter, lunaCallLogSink(options.lunaCallLogPath ?? lunaCallLogPath(config.outPath)), { cellKey: config.scheduledCellKey ?? '<room>:<round>' }) : selectedAdapter)`. Every dispatch path uses that `adapter` (lifecycle, speculation, recalculation) [V-r4], so the decorator sees every call, and the row's `callsPerRound = adapter.modelCalls - modelCallsBeforeRound` (`:7570`) [V] counts exactly the calls the decorator logs. The `cellKey` fallback string is the runner's own convention at `:4857`, `:5121`, `:5330` [V].

**Arena changes** (`tools/ai-dm-arena.ts`): the parser collects routes from `--model/--effort/--escalation-*` or from every `--arm label:model:effort[:escalationModel:escalationEffort]` (`:575-606`) [V] and calls `resolveSessionBounds`. `experimentPolicy.roundWallMs` becomes `180000 | null`. `arenaRows` (`:821-825`) requires `restrictedWall` finite and ≥ 0, and ≤ `roundWallMs` only when that is not null. Both run loops (`:935-957` independent, `:966-1000` interleaved) add `lunaCallLogPath: lunaCallLogPath(config.outPath)` to the options of every `runConversation`, so all cells of one invocation log to `<--out>.luna-calls.jsonl`.

### 2.4 The hang guard and its log (r4 P2-5)

- **Bound.** `LUNA_HANG_GUARD_MS = 1_800_000` per call (PR8). The codex adapter enforces it by killing the child (`process.ts:147-154`: SIGTERM, then SIGKILL after 1 s) and returns `exit: 'timed_out'` (`codex.ts:205-216`) [V-r4].
- **Log schema `luna-call-log-v2`**, JSONL, append-only, written synchronously so a crash keeps what was written. **Two events per call:**
  - `dispatch`, written **before** the call is delegated: `{ schema, event: 'dispatch', runId, cellKey, ordinal, surface: 'agent_adapter'|'screenshot_cli'|'responses_api', dispatch: 'start'|'resume'|null, callPhase, bootstrapKind: string|null, model, reasoningEffort, timeoutMs, boundKind, startedAtUnixMs }`;
  - `complete`, written after the call returns or throws: `{ schema, event: 'complete', runId, cellKey, ordinal, endedAtUnixMs, elapsedMs, exit, hangGuardFired, error: string|null, providerRequestId: string|null }`.
  - `ordinal` is a per-sink counter incremented **at dispatch**, before delegation, so concurrent calls (live speculation runs beside the primary) keep their dispatch order however they complete.
  - `boundKind = timeoutMs === LUNA_HANG_GUARD_MS ? 'hang_guard' : (callPhase is 'speculation' or 'speculation_recalculation' ? 'speculation_window' : 'shorter_than_guard')`. `hangGuardFired = exit === 'timed_out' && boundKind === 'hang_guard'`.
  - `reconcileLunaCallLog(lines)` joins the two events by `(runId, ordinal)`, returns records sorted by `(runId, ordinal)`, marks a dispatch without a completion as `pending: true` (crash evidence), and refuses a completion without a dispatch or a repeated `(runId, ordinal)`.
- **Paths.** Arena: `<--out>.luna-calls.jsonl` for the whole invocation (§2.3). Conversation invoked directly: `<--out>.luna-calls.jsonl`. Screenshot probe: next to its `--out`. DATA-01: next to its audit ledger (§7).
- **When the guard fires**, one stderr line: `[luna-hang-guard] FIRED run=<runId> cell=<cellKey> phase=<callPhase> model=<model> effort=<effort> timeoutMs=1800000 elapsedMs=<n>`.
- **`guardedLunaCall(meta, sink, fn)`** is the same guard for callers that are not agent adapters (DATA-01's Responses client, §7). It writes the dispatch event, creates an `AbortController`, arms `setTimeout(abort, meta.timeoutMs)` with `meta.timeoutMs` defaulting to `LUNA_HANG_GUARD_MS`, calls `fn(controller.signal)`, and on settlement writes the complete event (`exit: 'timed_out'` if the abort fired first). On a firing it writes the FIRED line and rethrows a `LunaHangGuardExpired` error.
- **Reporting.** Every Luna D-entry (V13b, V13e, S-RESULT, launches) states the call-log paths, the number of calls, and every `hangGuardFired` record. A firing is never silent, and in the study it is scored under SA-1 (§3.3).

### 2.5 Effective-timeout witnesses at the adapter boundary

- **Unit, B1 (T2a).** The witnesses inject an adapter at `ConversationRunOptions.adapter` (`ai-dm-conversation.ts:901`), where the real codex adapter sits. It records `{ dispatch, callPhase, bootstrapKind, model, reasoningEffort, timeoutMs, signalAbortedAtCall }`. The adapter-kind check (`:4340`) requires `kind === config.cli`, so it is `LunaWitnessAdapter` with `kind = 'codex'`, delegating to `InProcessArenaAdapter`; `simulatedInProcessDispatchDelayMs: 0` gives a codex-kind adapter the in-process tool session (`:4566-4567`) [V-r4]. W1, W2, W3, W6 and W7 are specified in §4.4 with expected sequences from the protocol state machine.
- **Live, after B1 (V13b).** One real codex round at each study effort, no `--timeout-ms`. The call log is written by the decorator wrapped directly around the real `CodexAgentAdapter`, so its `timeoutMs: 1800000` is the value `codex.ts:183-188` hands to `process.ts:153-154`'s kill timer [V-r4].
- **Real process past 180 s, after B1 (V13e).** Review r4 noted that V13b cannot force a call over 180 s and W1 uses a policy clock. V13e runs the real runner, the real codex adapter and the real process runner against a fake codex binary that sleeps 200 s: the lifted run must keep the call alive past 200 s, and the sol control must lose it to the round deadline (§8.2).

---

## 3. The effort study: gpt-6-luna high vs xhigh picks the route (D890 b, c)

### 3.1 Design (copied verbatim into the S-PREREG D-entry before any study cell runs)

- **Id** `luna6-effort-study-v1`. **Question:** does gpt-6-luna at xhigh beat gpt-6-luna at high on D569-scored decision quality by more than δ = 0.20, and at what cost in response time per call?
- **Arms:** `gpt-6-luna-high` (`gpt-6-luna`, `high`) and `gpt-6-luna-xhigh` (`gpt-6-luna`, `xhigh`). Both lifted (§2): 1,800,000 ms per call, no round wall, no engine blind deadline.
- **Same states (owner 19:01):** the D569 v5 primary cohorts from the v5 manifest [V]: `evaluation-hard` seeds 5117001–5117010 (`tests/fixtures/arena-basis-hard/seed-*.json`) and `evaluation-brutal` seeds 6203001–6203010 (`tests/fixtures/arena-basis-brutal/seed-*.json`), each fixture's sha256 checked against the v5 manifest's `primaryCohorts[].fixtures[].sha256` before the first cell (V18). 3 reps. Each cell is one fresh round on the fixture's starting state, identical for both arms. If the owner picks Q-POWER (b), the v5 second family is added (§3.5).
- **Caps (owner 19:01):** v5's `caps`: blind base 65,536, semantic 8,192, advice base 32,768 bytes [V].
- **Amendment SA-2 (study-only supersession), text frozen now:**

  ```json
  {"id":"luna6-sa2-v5-cohorts-and-caps","timing":"pre-run","date":"<S-PREREG date>","reason":"Owner answer 2026-09-24 19:01 ('Study on v5, v7 waits for v6'): luna6-effort-study-v1 runs on the D569 v5 primary cohorts (evaluation-hard 5117001-5117010, evaluation-brutal 6203001-6203010) and v5 caps (65536/8192/32768 bytes). For this study only, this supersedes Part A :568 'Current cap/cohort amendments replace historical 65536-byte / hard 5117xxx / brutal 6203xxx settings' and :560 'active cohorts/caps obey COHORT v6'; COHORT v6 exists only on the shelved claude/cohort-01 branch (D847). Limitation: Part A :486 records that 'COHORT v6 supersedes active brutal selection' (brutal_productivity filtering, :515-520); the brutal 6203 cohort is the unfiltered v5 selection. The route E this study picks applies to other states by D890 (c), not by measurement."}
  ```

- **Modes:** blind and advice. Settings follow the v5 manifest's `execution` block [V]: `freshSessionPerCell true, escalation false, modelDefaultFallback false, transport mcp_minimal, boardImage png`; KB `tests/fixtures/ai-dm-kb/d569/ai-dm-core.md`.
- **Exact cell command** (one arena invocation per cell; cwd = the study checkout at the landed B1+B6 commit; env `CODEX_HOME=/home/vagrant/.codex-aidm BOARD_SNAPSHOT_PREVIEW_PORT=4530`, as the v5 runbook exported [V]):

  ```
  node node_modules/vite-node/vite-node.mjs tools/ai-dm-arena.ts -- \
    --rooms 10 --reps 3 --seed <5117001|6203001> --basis <hard|brutal> --cells <room>:<rep> \
    --out /home/vagrant/dnd-slim-runs/luna6-effort/cells/<ordinal, 3 digits>.jsonl \
    --dm-mode <blind|advice> \
    [blind only: --blind-repair-arm code_only --blind-max-attempts 3 --blind-facts off] \
    --cli codex --cli-bin <absolute codex path recorded in S-PREREG> \
    --model gpt-6-luna --effort <high|xhigh> \
    --instruction-source kb --kb tests/fixtures/ai-dm-kb/d569/ai-dm-core.md \
    --transport mcp_minimal --board-image png --turn-context-max-bytes <65536 blind | 32768 advice> \
    --combat-model initiative_segments_v1 --initiative-profile derived_v1 \
    --party-policy symmetric_evaluator_v1 --override-policy typed_reason \
    --reaction-ask-default decline --intel-mode full
  ```

  These are the v5 runbook's flags (`runbook-84326354.md:1015-1024`) [V] with the route, `--cells`, the mode and the cap changed; `--timeout-ms` is absent (lifted by route). Output files are named by ordinal only, so no file name carries an arm or an effort.
- **Cells:** 2 arms × 2 modes × 2 bases × 10 seeds × 3 reps = **240 cells = 120 pairs**.

### 3.2 Order: randomized, pair-adjacent, seed first (r4 P2-2)

- **Seed first.** The supervisor draws the schedule seed `P` (`od -An -N4 -tu4 /dev/urandom`) and records it in S-PREREG. The schedule is generated only afterwards, by the landed B6 tool, and its sha256 is recorded in the S-SCHEDULE D-entry before the first cell.
- **Algorithm** (`tools/luna6-effort-study/schedule.ts`, deterministic):
  1. List the 120 pairs `(basis, mode, seed, rep)` in canonical order: basis hard before brutal, mode blind before advice, seed ascending, rep ascending.
  2. Shuffle them with Fisher–Yates driven by `mulberry32(P)`: for i from 119 down to 1, `j = floor(g() × (i + 1))`, swap. This is the same generator as D569 (`d569-blind-experiment.ts:988-996`) and the same loop as the packet builder's `shuffled` (`ai-dm-rerun-packet.ts:1194-1209`) [V].
  3. Walking the shuffled list, draw `xhighFirst = g() < 0.5` for each pair and emit its two cells back to back in that order. Ordinals run 1–240.
- **Why this design.** Each pair's two arms run minutes apart under the same provider and box conditions; which arm goes first is random; and the order of pairs is random across strata, so drift in time cannot align with arm, mode or basis. The runner's `--interleave` mode would run both arms concurrently in one process, but no dm-mode run has used it (0 wrapper hits for `--interleave` with `--dm-mode` [V]), and concurrent PNG snapshot capture on one service is untested [I]; the v5 runbook runs sequentially "to prevent a 4530 collision" (`runbook-84326354.md:995-996`) [V].
- **Runner script** `~/dnd-slim-runs/luna6-effort/run-schedule.sh` (supervisor, external; sha in S-SCHEDULE): for each schedule entry in ordinal order, wait while `~/dnd-slim-runs/luna6-effort/PAUSE` exists; skip an entry whose `cells/<ordinal>.exit` exists; run the entry's argv from `schedule.json`; write the exit code to `cells/<ordinal>.exit`. It never runs two cells at once. The supervisor creates `PAUSE` before a PERF-02 timed pair (D890: timed pairs run only while nothing else loads the box) and removes it afterwards; a pause falls between cells, so the order is kept. The script does not use `slot.sh`, whose 30-minute `timeout 1800` [V] is shorter than an advice cell's ceiling (§3.9).
- **Infrastructure rule.** A cell whose row outcome is `infrastructure_failed`, or which produced no row, has its **whole pair** rerun once, both arms in the original order, appended after ordinal 240 (ordinals 241 onward, recorded in the schedule's rerun section). The rerun replaces the pair. If the rerun also fails on infrastructure, the pair is excluded pairwise, as D569 excludes `infrastructure_failed` (`d569-blind-experiment.ts:1030-1031`) [V]. **STOP** and go to the owner if more than 12 pairs (10 %) end excluded, or on any `D569IntegrityStop`. A hang-guard firing is not infrastructure (SA-1).

### 3.3 Scoring: D569's panel, plus the preregistered amendment SA-1 (r4 P1-4)

- **D569 scoring.** The judge panel scores each packet entry on targetPriority 0–3, actionEconomy 0–3, coherence 0–2, positioning 0–2 (total 0–10). The Opus 4.8 notes-only advisory stage runs first, then the three scoring seats `claude-fable-5-1`, `gpt-6-astra` and `gpt-5.6-sol`, each at high in a fresh context (`judge-staged.sh` seat commands) [V]. A cell's value is D569's `panelValues` (`d569-blind-experiment.ts:1030-1041`) [V]: the sum over components of the mean across seats for an executed cell; 0 for `refused`, `execution_failed` and `service_failed` (zero-inclusive); `null` (excluded pairwise) for `infrastructure_failed`. Packet outcomes map as in `analyze-primary-pair.ts:61-70` [V]: `authorized` → executed, `service_null` → service_failed.
- **Amendment SA-1, text frozen now:**

  ```json
  {"id":"luna6-sa1-hang-guard-expiry-scores-zero","timing":"pre-run","date":"<S-PREREG date>","reason":"Owner ruling D890 (a): gpt-6-luna calls have a 30 min per-call hang guard, logged whenever it fires. A study cell with at least one call-log record hangGuardFired=true is scored 0 in every component, is never excluded, and counts as a failure in the reported failure-risk secondary, whatever outcome the runner recorded. D569 scoring would exclude such a cell if the runner classified it infrastructure_failed. The runner already classifies a timed-out primary as refused/timeout (tools/ai-dm-conversation.ts:5711-5714) and a timed-out correction as refused/correction_timeout (src/vtt/turn-exhaustion-coordinator.ts:398-399), so SA-1 changes only cells the runner classified otherwise."}
  ```

- **Where SA-1 is applied.** At analysis, after the key join, from the guard ledger that ingest builds from the call logs (§3.7). Judges still score such an entry if it is executed. They are blind to the override, and the unoverridden value is reported as a sensitivity result.

### 3.4 Decision rule and the named test

- **Estimand.** Δ = the mean over all complete pairs (both modes, both bases) of (xhigh − high) cell values after SA-1.
- **Named test: one-sided cluster-bootstrap percentile test of superiority by margin δ = 0.20, at the calibrated level q\*.** H0: Δ ≤ 0.20; H1: Δ > 0.20.
  - Clusters are encounter seeds: 20 clusters (10 hard, 10 brutal), each holding up to 6 paired differences (2 modes × 3 reps).
  - 100,000 resamples with the D569 generator and percentile rule (mulberry32; `index = floor(q·n)` clamped to `[0, n−1]`; `d569-blind-experiment.ts:988-1028`) [V], bootstrap seed **20260924**, through the extracted `d569ClusterBootstrapDraws` and `d569Percentile`.
  - Reject H0 iff the q\*-th percentile of the bootstrap distribution of Δ is > 0.20.
  - **q\*** is fixed by the V17 simulation before S-PREREG: the largest q in {0.025, 0.020, 0.015, 0.010, 0.005} whose simulated rejection rate at Δ = 0.20 (no failures) is ≤ 0.025 under both variance bounds. The calibration is needed because a percentile bootstrap over 20 clusters is anti-conservative: my 400-dataset check gave a rejection rate of 0.035 at q = 0.025, 0.030 at 0.020 and 0.020 at 0.015 [V: node; Monte Carlo SE ≈ 0.009].
- **Decision:** E = **xhigh** iff H0 is rejected; otherwise E = **high**. The burden is on xhigh (D890 c).
- **Why δ = 0.20.** It is the magnitude D569 registers as its noninferiority margin (`D569_NONINFERIORITY_MARGIN = -0.20`, `d569-blind-experiment.ts:30`) [V], the largest difference D569 treats as negligible.
- **No refusal veto (change from r4; Appendix E1).** r4 required the refusal-risk difference's 97.5th percentile to be ≤ 0.00 (D569's success-label rule, `:976-986`). D890 names quality only, and zero-inclusive scoring already charges each refused, failed or guard-expired cell its full value (about 7 points on pool3's arm means of 6.76–6.92 [V]). With 120 pairs the 0.00 bound is crossed by one net extra failure in one cluster. Simulated with equal failure rates in both arms, it passes only 12 % of the time at 2 % and 7 % at 5 % [V: node, 400 datasets], so it would have picked high on noise. The failure-risk difference is reported as a secondary with its interval.
- **One look.** A single analysis after all cells are judged. No interim look, and no cell is rerun to change the decision (the infrastructure rule of §3.2 is fixed in advance).
- **Secondary, reported, not deciding:** Δ per mode and per basis with intervals; executed-only Δ; per-component Δ; per-seat diagnostics; failure-risk difference (refused, execution_failed, service_failed or SA-1, as 1); Δ without SA-1; the number of SA-1 overrides.

### 3.5 Operating characteristics before any spend (r4 P2-1)

**Variance bounds from local panel data [V: node].** `~/dnd-slim-runs/pool3-*` holds a judged brutal pool: 90 cases (30 seeds × 3 reps) × 3 arms (`engine-top`, `sol-high`, `luna-medium`), scored by three seats (astra, opus, sol) on the same 0–10 rubric (`pool3-packet-3rep.json`, `pool3-key-3rep.json`, `pool3-judge-{astra,opus,sol}-3rep.json`). Paired differences by case, clustered by seed:

| Pair | SD of a paired difference | SD of a seed's mean of 3 | within-seed SD |
|---|---:|---:|---:|
| luna-medium − sol-high | 1.820 | 1.288 | 1.583 |
| engine-top − sol-high | 1.275 | 0.840 | 1.178 |
| luna-medium − engine-top | 1.391 | 1.090 | 1.072 |

- **Bound A** uses the largest pair (two different models): σ_b² = 1.288² − 1.583²/3 = 0.8236 between seeds, σ_w² = 2.5059 within. A study cluster of 6 differences then has variance 0.8236 + 2.5059/6 = 1.241 [V: node]. Two efforts of one model are expected to differ less than two models [I], which is what makes A conservative.
- **Bound B** inflates A by one-sided 95 % chi-square factors: 29/17.708 = 1.638 between (29 df), 60/43.188 = 1.389 within (60 df); cluster variance 1.929 [V: node].
- **Normal approximation** [V: node], one-sided α = 0.025, margin 0.20:

| Design | Bound | SE of Δ̂ | P(xhigh) at Δ = 0.3 / 0.5 / 0.7 / 1.0 | Δ with 80 % power |
|---|---|---:|---|---:|
| 20 clusters (registered) | A | 0.249 | 0.06 / 0.22 / 0.52 / 0.89 | 0.90 |
| 20 clusters | B | 0.311 | 0.05 / 0.16 / 0.36 / 0.73 | 1.07 |
| 40 clusters (+ v5 second family) | A | 0.176 | 0.08 / 0.40 / 0.81 / 1.00 | 0.69 |
| 40 clusters | B | 0.220 | 0.07 / 0.28 / 0.62 / 0.95 | 0.82 |

  My 400-dataset bootstrap check under bound A, 20 clusters, q = 0.025, agrees: P(xhigh) 0.285 at Δ = 0.5 and 0.905 at Δ = 1.0 [V: node].

**V17: the preregistered simulation (B0, before S-PREREG).**
- **Script** `.tmp/runs/luna6/power/simulate.mjs`: plain node, no repo imports, written by the implementer in batch B0, reviewed read-only by codex with S-PREREG, run by the supervisor. Its sha256 goes into S-PREREG.
- **Model.** For cluster c and pair j: high value `h = clamp(6.9 + a_c + e_h, 0, 10)`, xhigh value `x = clamp(6.9 + a_c + Δ + b_c + e_x, 0, 10)`, with `a_c ~ N(0, 1)`, `b_c ~ N(0, σ_b²)` and `e_h, e_x ~ N(0, σ_w²/2)`. Independently, each cell fails with probability p for its arm, and a failed cell's value is 0. 6.9 is pool3's arm-mean level [V].
- **Grid.** Bounds A and B; k ∈ {20, 40} clusters × 6 pairs; Δ ∈ {0.0, 0.2, 0.3, 0.5, 0.7, 1.0, 1.5}; failure rates (p_high, p_xhigh) ∈ {(0, 0), (0.02, 0.02), (0.05, 0.05), (0.02, 0.05)}; q ∈ {0.025, 0.020, 0.015, 0.010, 0.005}. 10,000 datasets per cell of the grid, 2,000 bootstrap resamples per dataset, the §3.4 procedure reimplemented with mulberry32 and `floor(q·n)`. Dataset seeds are `1_000_000 × scenario index + dataset index`.
- **Self-checks printed first; each must hold or the script exits 1.**
  - σ_b = σ_w = 0, a_c ≡ 0, p = 0, Δ = 1.0: P(xhigh) = 1.
  - The same with Δ = 0.2: P(xhigh) = 0, because the lower bound equals 0.2 and is not > 0.2.
  - The same with Δ = 0.0: P(xhigh) = 0.
- **Output** `.tmp/runs/luna6/power/oc.json` (canonical JSON): every grid cell's P(xhigh) with its Monte Carlo SE; q\* per k; for each k, the Δ with 80 % power under A and B at q\*. The last stdout line is `LUNA6 OC PASS qstar20=<q> qstar40=<q> p05A20=<P>`.
- **Dominance rule, fixed now.** "Inconclusive → high" is declared dominant if P(xhigh | Δ = 0.5, bound A, k = 20, p = 0, q\*) < 0.5. Δ = 0.5 is 2.5 times the margin and 5 % of the scale. The approximation above predicts about 0.2, so dominance is expected. **If dominance holds, the supervisor asks Q-POWER (§8.4) before S-PREREG, and nothing is spent until the owner answers.** If it does not hold, the registered 20-cluster design proceeds without the question.
- **Option (b), if the owner picks it.** Add the v5 second family: hard-2 5118001–5118010 and brutal-2 6207001–6207010, fixtures pinned by `d569-second-family-manifest.json` (`83daa7ea…`) [V-r4]. They launch with `--basis hard --basis-dir tests/fixtures/arena-basis-hard-2 --seed 5118001`, and brutal likewise (`basisFixturesPath` honours `--basis-dir`, `ai-dm-arena.ts:725-728` [V]). Packets are built by passing protocol objects `{ seeds: [5118001…5118010], reps: 3 }` and `{ seeds: [6207001…6207010], reps: 3 }` to the exported `buildRerunPacket`, with no builder change [V]. That gives 480 cells, 8 packets, twice the wall, and one more B6 mutant (M86: a second-family seed list off by one, killed by T8's registration literal). v5 registered the second family but never launched it (`runbook-84326354.md:51-58`) [V], and the study would consume it.

### 3.6 Speed measures, with the hang guard as right-censoring (r4 P2-3)

From the reconciled call logs, per arm × mode (and pooled per arm):
- `calls`; `completed` (exit `completed`); `censored` (`hangGuardFired`); `otherFailures` by exit (`cancelled`, `infrastructure_failed`, thrown); **completion rate** = completed / (completed + censored).
- **Latency quantiles by nearest rank** (`rank = ceil(q·n)`) over completed plus censored calls, with a censored call ranked above every completed call. A quantile whose rank falls on a completed call is reported as its `elapsedMs`. A quantile whose rank falls on a censored call is reported as the string `">=1800000 (censored)"`, **never as a number**. Because censoring happens only at the fixed 1,800,000 ms, this equals the Kaplan–Meier quantile [I: standard result for type I censoring]. Reported for p50, p90, p95 and max.
- `callsOver180s`: calls that the old wall would have censored (censored calls count).
- **Paired time ratio:** for pairs where neither cell has a censored or failed call, the median of `sum(xhigh elapsed) / sum(high elapsed)`. The number of pairs left out for censoring or failure is reported beside it. No mean of capped values and no ratio involving a censored call is reported.
- Reasoning and output tokens per call from the rows' `callUsage` (`src/vtt/agent-session.ts:61-70`) [V-r4], completed calls only.

Speed decides nothing; S-RESULT reports it beside the quality result.

### 3.7 The pipeline, end to end (r4 P1-4)

All operators are subcommands of `node node_modules/vite-node/vite-node.mjs tools/luna6-effort-study.ts <sub> --root /home/vagrant/dnd-slim-runs/luna6-effort`, run from the study checkout. Every file they write is opened with flag `wx`. Each prints one final line, `LUNA6 <SUB> PASS …`, and exits 0; or prints `LUNA6 <SUB> FAIL <where>: <reason>` lines and exits 1.

| Stage | Command / actor | Reads | Writes | Checks (all in code, tested by T8 unless noted) |
|---|---|---|---|---|
| 1 schedule | `schedule --seed <P> --codex-bin <abs>` | registration | `schedule.json` | 240 entries, 120 pairs, pair-adjacent, each (arm, mode, basis, seed, rep) once; prints the sha256 |
| 2 runs | `run-schedule.sh` (supervisor) | `schedule.json` | `cells/<o>.jsonl`, `cells/<o>.jsonl.luna-calls.jsonl`, `cells/<o>.exit` | exit files; V15 (i) |
| 3 ingest | `ingest` | schedule, cells, call logs | `normalized/<mode>-<basis>.jsonl` (60 relabelled rows each), `normalized/guard-ledger.json`, `normalized/ingest-report.json` | per entry: exactly one row; `seed`, `room`, `round` (= rep), `scheduledCellKey` = `<room>:<rep>`, `dmMode`, `model` `gpt-6-luna`, `effort`, `arm` `single`, `roundWallBudgetMs` null and `turnContextMaximumBytes` equal the entry and the registered cap; seed in the registered cohort; call log reconciles with no pending record, every record's `cellKey`, model and effort equal the row's, `timeoutMs` 1,800,000, `boundKind` `hang_guard`, and the number of completions equals `callsPerRound`; relabel changes exactly the field `arm` (`single` → the arm id, as v5 did, `runbook-84326354.md:1229-1239`) [V]; guard ledger entry `{ mode, basis, seed, rep, arm, ordinal, calls }` for every cell with a firing; the infrastructure rule of §3.2 |
| 4 packets | `packets --shuffle-seeds <blind-hard>,<blind-brutal>,<advice-hard>,<advice-brutal>` | normalized rows | `luna6-packet-<tag>.json`, `answer-keys/luna6-key-<tag>.json` for tags `blind-hard`, `blind-brutal`, `advice-hard`, `advice-brutal` | per tag: `buildRerunPacket(rows, seed, protocol)` with `R1_10_PROTOCOL` (hard) or `{ ...BRUTAL_10_PROTOCOL, reps: 3 }` (brutal) [V]; the builder's own `assertBlindedPacket` (`ai-dm-rerun-packet.ts:1212-1230`) [V]; then the study's token scan of the packet's canonical JSON for `gpt-6-luna`, `xhigh`, `reasoningEffort`, `"effort"`, `gpt-6-luna-high`, `gpt-6-luna-xhigh` (M78); 60 entries per packet, 30 per arm in the key |
| 5 judging | `~/dnd-slim-runs/luna6-effort/scripts/judge-study.sh <tag>` (supervisor) | packet | `luna6-judge-{opus48,sol,fable,astra}-<tag>.*`, judge log `~/dnd-slim-runs/judge-luna6-effort/luna6.log` | the script is `~/dnd-slim-runs/d569-v5/scripts/judge-staged.sh` (sha `8004d85c…`) [V] with exactly these edits: `run_root=$root/luna6-effort`, `family=luna6-effort/luna6`, `judge_log=$root/judge-luna6-effort/luna6.log`, the tag `case` list and usage string, and the output prefix `d569-` → `luna6-`. Its pinned checks of `judge-one.sh` (`6ae7f6b8…`) and `judge-advisory.py` (`671bfedf…`) and the advisory gate (`5641653a…`) stay [V]. `judge-one.sh` reads `$D/$FAM-packet-$TAG.json` for any family (`judge-one.sh:2,23`) [V]. S-PREREG records the `diff` and the new script's sha |
| 6 seat normalization | supervisor, python | seat outputs | `results/normalized-<tag>-{fable,astra,sol}.json` | the v5 method: `load_json_value` from `~/dnd-slim-runs/pool4-contrasts.py` (sha `0c20f794…`, `:69-88`) [V], refusing an existing target; no Opus artifact is opened |
| 7 analysis | `analyze` | packets, keys, normalized seats, guard ledger | `results/luna6-effort-study-result.json` | per tag: packet, key and all three seats hold the same 60 blind ids (set equality, not counts; M76); no duplicate id; exactly the seats fable, astra and sol (M77); key arms only the two registered ids; every case (seed, rep) has both arms; integer components in range with `total` = sum (the checks of `analyze-primary-pair.ts:78-140`) [V]; value via `d569PanelValues`; SA-1 override joined on (mode, basis, seed, rep, arm) (M79); pairs, clusters, bootstrap, decision (§3.4); secondaries; speed (§3.6) |

**Result document** (canonical JSON): `{ schema: 'luna6-effort-study-result-v1', registration: <id and sha>, decision: 'high'|'xhigh', delta: { mean, lower_qstar, upper_97_5 }, pairs, excludedPairs, clusters, sa1Overrides, secondary: {…}, speed: {…}, inputs: { schedule sha, packet shas, key shas, seat shas, ledger sha } }`.

### 3.8 Freeze sequence (no step consumes a later step's output)

| Step | Who | Output | Consumes |
|---|---|---|---|
| B0 + V17 | implementer writes `simulate.mjs`; codex reviews; supervisor runs | `oc.json`, q\*, the dominance verdict | this plan |
| Q-POWER | owner, only if dominance holds | (a) or (b) | V17 |
| S-PREREG | supervisor | D-entry: §3.1–§3.7 verbatim with q\*, P, the four packet shuffle seeds (drawn like P; `569575` not reused), SA-1, SA-2, the codex binary path, `judge-study.sh` diff and sha, the pinned judging and normalization shas, `simulate.mjs` and `oc.json` shas, the Q-POWER answer | V17, Q-POWER |
| B6 | implementer | study operator and T8; registration constants typed from S-PREREG | S-PREREG |
| S-SCHEDULE | supervisor | `schedule.json` and `run-schedule.sh` shas | B6 landed |
| V18 | supervisor | dry-run pipeline preflight PASS | S-SCHEDULE, B1 landed |
| Phase S runs → ingest → packets → judging → seats → analysis | supervisor | files of §3.7 | V18 |
| S-RESULT | supervisor | D-entry: E; Δ with interval; every secondary and speed number; every hang-guard firing; the result JSON verbatim and its sha; the DATA-01 route supersession by reference (§7) | the analysis output |

### 3.9 Cost, wall and ceiling (r4 P3-1)

- **Calls per cell, from the protocol** [V: code read]. Blind: exactly one dispatch (`dispatchAttempts = config.dmMode === 'blind' ? 1 : 3`, `ai-dm-conversation.ts:5566`; blind authorization failures are refused, not corrected, `turn-exhaustion-coordinator.ts:281-283,300-307`). Advice: at most 3 primary dispatches (retries only after a flapped, answerless completion, `ai-dm-conversation.ts:5768-5782`) plus at most 1 correction (`MAX_PROPOSAL_CORRECTIONS = 1`). Escalation is prohibited in D569 modes (`ai-dm-arena.ts:499-501`) [V], and speculation and adjustments are off (`:4706`; `midRoundAdjustmentsEnabled: !dmModeExplicit`, `ai-dm-arena.ts:653`) [V].
- **Ceiling** [V: node]: 120 blind cells × 1 + 120 advice cells × 4 = 600 calls × 1,800 s = **1,080,000 s = 300 h** of model time, the bound if every call ran to the guard. Per cell: blind ≤ 30 min, advice ≤ 2 h. Option (b) doubles it.
- **Estimate** [I; node]: if high ≈ gpt-5.6-luna high's screening median of 162.1 s per cell and xhigh is 1.5× to 2× that, then 120 × 162.1 = 19,452 s plus 29,178–38,904 s, **13.5 to 16.2 h** of model time, plus per-invocation start-up for 240 invocations (not measured).
- **Judging:** 4 packets × (Opus advisory + 3 seats), 240 entries. No local cost figure [I]. Codex usage is plan-billed (D381). If Fable is exhausted, the study STOPs loudly with no substitute (K9).

### 3.10 Until the study reports (PR6, PR11)

S-RESULT gates B5 (the launcher, whose route literal is E), every (a) run on gpt-6-luna, and DATA-01's paid teacher runs (PR11). Nothing else waits: B0, B1, B4, B2 and B6 proceed. A script-chosen run needed before S-RESULT uses today's gpt-5.6-luna route with its 180 s wall.

### 3.11 What the study can and cannot say

It measures route quality on 20 fixed v5 encounters (40 under Q-POWER b), in D569's two decision modes, under D569's panel. It does not measure live-play pacing (speculation is off in dm modes, `ai-dm-conversation.ts:4706`) [V], the screenshot gates, or DATA-01's labelling task. Applying E to those roles follows from D890 (c), not from their own measurement. It does not compare gpt-5.6-luna with gpt-6-luna. With 20 clusters it can detect a gain of about 0.9 panel points with 80 % power (bound A); S-RESULT states that detectable size beside the interval.

---

## 4. Pins, tests and mutants

### 4.1 Where each new expectation comes from (never from our own output)

| New expectation | Independent source | Forbidden shortcut |
|---|---|---|
| `LUNA_HANG_GUARD_MS` 1,800,000; the refusal messages | D890 "30 min per-call hang guard"; §2.2 text | reading the constant in the test |
| Non-Luna bounds 120 000 / 240 000 / 180 000 | today's code and the unchanged T6 | none |
| Call sequences of W1, W2, W3, W6, W7 and T7b's W3′ | **the protocol state machine of §4.4**, written from Part A :330 (D474) and :568, cross-checked against literals in FROZEN tests | running any scenario and asserting its output back (r4's LUNA6-SEQ, deleted) |
| W4's phase set | the frozen literal `{'initial','speculation','adjustment','correction'}` (`ai-dm-conversation.test.ts:4184-4186`) [V] | collecting phases from a LUNA6 run |
| W2 control value 179 975 | the literal arithmetic at `ai-dm-conversation.test.ts:1428-1434` [V-r4] | none |
| Sol control's refused row in W1 | the frozen literal at `ai-dm-conversation.test.ts:1646-1652` [V] | none |
| Study constants, SA-1, SA-2, q\*, seeds | S-PREREG (text before code) | computing expected values with the code under test |
| T8 bootstrap, decision, pipeline and latency expectations | hand derivations in §4.5 | running the operator and pasting its output |
| Schedule | properties (adjacency, both orders, each cell once, determinism) | pinning a generated order |
| `LUNA_PRODUCTION_ROUTE` and escalation literals | S-RESULT | `expect(route).toEqual(LUNA_PRODUCTION_ROUTE)` |
| Launch argv, provenance and spawn literals | §5, typed by hand; injected clock, commit and checkout root | `buildLunaRouteLaunch(…)` output as expectation |
| Append-only title lists (`titles.json`) | §4.3, typed by hand | listing titles from the candidate |
| Guard allowlist | §1.1 per-file counts adjusted by the planned diffs (B1 +1 in `tools/model-routes.ts`; B2 −4 in `tools/rl/generate-data.ts`) | counting at test time |

### 4.2 Mutation procedure (Part A :88-89; D890)

Each distinct mutation runs on a clean checkout of the candidate SHA under `PhpstormProjects`, never during a gate on that tree. Every heavy command goes through `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/perf-02/fanout/slot.sh <clone> …`. The harness is `.tmp/runs/luna6/impl/<batch>/mutate.mjs <id>`, and it exits non-zero on **any** deviation from these steps:

1. Record the target's sha256 (ORIG). For an untracked (new) file, also write an explicit byte backup.
2. **Killers pass unmutated.** For each named killer (file plus full title, regex-escaped for `-t`): `node node_modules/vitest/vitest.mjs run --configLoader runner --maxWorkers=1 <file> -t '<escaped title>' --reporter=json`. Require exit 0, exactly one test run and passed, none skipped. A command killer (M57) must return its stated unmutated result.
3. Apply an exact-string replacement that matches **exactly once**. Print `CHANGED <file>:<line>: <old> -> <new> (1)`.
4. `npx tsc -b --force` (the full project build including test files; not `tsconfig.app.json` alone, not tsgo) must exit 0. A mutant that fails to compile is a **compile control**, never a kill; this plan lists none, so the harness exits non-zero on one.
5. **Killers fail mutated.** Run each named killer again, teed to `<id>.<n>.log`. Every named killer must fail: non-zero exit, that title listed as failed, and a diff, violation list or designed refusal message containing the mutated value. A crash, import error, timeout or skip is not a kill.
6. Restore the exact bytes, require sha256 = ORIG, and print `RESTORED <sha>`.
7. **Killers pass again** on the restored bytes, with step 2's result.

Counts are of **distinct mutations**. The implementer runs all of them and the supervisor re-runs them; kill evidence is read from the logs. **Outcome-as-data:** a test that probes a path that can throw records each case as `{ ok: value }` or `{ error: message }` and asserts the whole list with `toEqual`.

### 4.3 Killers (titles frozen verbatim) and mutants

- **T1** `tests/unit/tools/model-routes.test.ts › LUNA6 model routes and the Luna hang guard`
- **T2a** `tests/unit/tools/ai-dm-arena.test.ts › LUNA6 Luna lift wiring` (appended, B1)
- **T2b** `tests/unit/tools/ai-dm-screenshot-probe.test.ts › LUNA6 Luna lift wiring` (appended, B1)
- **T4** `tests/unit/tools/luna6-guard.test.ts › LUNA6 historical Luna literal guard`
- **T5** `tests/unit/tools/rl-generate-data.test.ts › RL arena batch generator`
- **T6** `tests/unit/tools/ai-dm-legacy-invariance.test.ts › D569 implicit advice legacy invariance` (frozen)
- **T7a** `tests/unit/tools/luna6-route-launch.test.ts › LUNA6 route launcher`
- **T7b** `tests/unit/tools/ai-dm-arena.test.ts › LUNA6 route witnesses` (appended, B5)
- **T8** `tests/unit/tools/luna6-effort-study.test.ts › LUNA6 effort study`

Witness titles (T2a):
- **W1** = `a lifted round hands the hang guard to the adapter and accepts a 200 s answer that the sol control censors`;
- **W2** = `dm-mode adapter boundary: gpt-6-luna receives 1800000 while the sol control is clamped to the round wall`;
- **W3** = `every call of a lifted escalation round is logged at the adapter boundary in protocol order`;
- **W6** = `a hang-guard firing is logged with its phase, route and elapsed time and refuses the round as a timeout`;
- **W7** = `a lifted blind round has no engine-side deadline and keeps its attempt timings`.

**B1: the lift, the call log and the screenshot guard (28 distinct mutations; M87 is added only if P0a fails)**

| # | Mutation (plausible wrong value) | Exact killer(s) |
|---|---|---|
| M3 | `lunaStudyRoute(effort)` returns `'xhigh'` whatever its argument | T1 › `effort-study Luna routes keep their stated effort on gpt-6-luna (D887 b)` |
| M4 | Resolver gpt-6-luna branch returns `{ timeoutMs: 120_000, roundWallMs: 180_000 }` | T1 › `resolves every gpt-6-luna route to the 30 min hang guard with no round wall (owner 2026-09-24)`; T2a › `arena and conversation parsers lift the round wall and set the 30 min hang guard for gpt-6-luna routes` |
| M5 | Predicate `model === LUNA_MODEL` → `model.startsWith('gpt-')` | T1 › `keeps every non-Luna route on the legacy 120000 / 240000 timeouts and the 180000 round wall`; T6 › `keeps implicit and explicit incumbent configs equal except outPath while retaining internal advice mode metadata` |
| M6 | Legacy dm-mode default 240 000 → 180 000 | T1 › `keeps every non-Luna route …` |
| M7 | A mixed run is accepted with the first route's bounds | T1 › `refuses a run that mixes gpt-6-luna and other routes` |
| M8 | An explicit `--timeout-ms 120000` is accepted for gpt-6-luna | T1 › `refuses an explicit timeout or round wall that would censor a gpt-6-luna run` |
| M9 | `parseArenaArgs` bypasses the resolver | T2a › `arena and conversation parsers lift …` |
| M10 | `parseConversationArgs` bypasses the resolver | same |
| M11 | The screenshot answerer arms the timer but never kills the child | T2b › `screenshot probe kills a CLI call that exceeds its timeout, records timed_out and logs it` |
| M29 | `parseScreenshotProbeArgs` gives gpt-6-luna entries no timeout | T2b › `screenshot probe parser gives gpt-6-luna entries the 30 min hang guard and refuses a shorter --timeout-ms` |
| M41 | `createUnboundedRoundDeadline().dispatch` returns `Math.min(invocation.timeoutMs, 180_000)` | T1 › `the unbounded round deadline hands the invocation timeout to the adapter unchanged and never aborts`; T2a W2 |
| M42 | Runner builds the bounded deadline with `config.roundWallMs ?? 180_000` | T2a W1, W2 |
| M43 | Arena parser keeps `experimentPolicy.roundWallMs: 180_000` for gpt-6-luna | T2a › `arena and conversation parsers lift …` |
| M44 | Conversation parser keeps `roundWallMs: 180_000` for gpt-6-luna | same |
| M45 | `policyElapsedMs` clamps with `config.roundWallMs ?? 180_000` | T2a W1 (`policyElapsedMs` 180000 in place of 200000) |
| M46 | Lifted blind deadline `Number.MAX_SAFE_INTEGER` → `Date.now() + config.timeoutMs` | T2a W7 |
| M47 | Attempt baseline `blindRoundStartedUnixMs` → `blindDeadlineUnixMs - config.timeoutMs` | T2a W7 (`modelWallMs` 0 in place of ≥ 50) |
| M48 | The call-log decorator wraps `start` but not `resume` | T2a W3 (the correction resume is missing) |
| M49 | `hangGuardFired` computed from `exit === 'cancelled'` | T2a W6 |
| M50 | The `[luna-hang-guard] FIRED` line is not written | T2a W6 |
| M51 | `LUNA_HANG_GUARD_MS` 1_800_000 → 900_000 | T1 › `resolves every gpt-6-luna route …`; T2a W1 |
| M52 | Arena accepts `--round-wall-ms 180000` for a gpt-6-luna run | T1 › `refuses an explicit timeout or round wall …`; T2a › `arena and conversation parsers lift …` |
| M66 | The screenshot probe does not log gpt-6-luna calls | T2b › `screenshot probe kills a CLI call …` (call-log record literal) |
| **M69** (r4 P2-5) | The decorator assigns `ordinal` at completion, not at dispatch | T1 › `the call log pairs dispatch and completion events by dispatch ordinal when calls overlap` |
| **M70** | `guardedLunaCall` default timer 1_800_000 → 900_000 | T1 › `guardedLunaCall aborts at exactly 1800000 ms, logs the firing and writes one FIRED line` |
| **M71** | `guardedLunaCall` passes `fn` a fresh signal instead of its controller's | same |
| **M72** (Appendix E2) | The arena's run loops omit `lunaCallLogPath` (each cell logs into its temporary directory) | T2a W1 (the arena-level call log is absent) |
| **M73** | Call-log `cellKey` built from `<room>:<round>` instead of `scheduledCellKey` | T2a W1 (`cellKey` `'1:1'` in place of `'1:2'`) |
| M87 (only if P0a fails) | gpt-6-luna screenshot entries run under `~/.codex-aidm` | T2b › `screenshot probe runs gpt-6-luna entries under an isolated codex home` |

**B4: the guard (2).** M27: one extra `'gpt-5.6-luna'` in `tools/d569-blind-experiment.ts`. M28: `'gpt-5.6-luna'` planted in a comment in `src/vtt/agent-adapters/codex.ts`. Killer for both: T4 › `forbids gpt-5.6-luna in tools/ and src/ outside the exact historical allowlist`.

**B2: generate-data (3).** M13: arena argv `--effort` `'low'` → `'xhigh'`. M14: resume accepts `arena-rl-batch-v1`. M30: the arena argv still carries `'--timeout-ms', String(120_000)`. Killers: T5 › `writes per-batch manifests and resumes only incomplete or flapped seeds` for M13 and M30. Its value assertion is `firstCalls.map(({model, effort, timeoutMs, experimentPolicy}) => ({model, effort, timeoutMs, roundWallMs: experimentPolicy.roundWallMs}))` equal to three literals `{ model: 'gpt-6-luna', effort: 'low', timeoutMs: 1800000, roundWallMs: null }`; under M30 the evidence is the designed refusal naming `--timeout-ms 120000`. For M14: T5 › `refuses to resume a v1 gpt-5.6-luna batch manifest into a v2 gpt-6-luna batch`.

**B6: the study (22)** (r4 P2-4)

| # | Mutation | Killer (T8 ›) |
|---|---|---|
| M58 | Margin 0.20 → 0.00 | `picks xhigh only when the calibrated lower bound exceeds the margin`; `registers the preregistered study constants verbatim from S-PREREG` |
| M59 | Decision compares the mean, not the q\*-th percentile, with the margin | `picks xhigh only when …` |
| M60′ | A refused cell is excluded pairwise instead of scored 0 | `charges a refused or hang-guard cell as zero in the paired difference` |
| M61 | SA-1 override not applied | `runs the analysis from packet, answer key and three seat files to the decision, with the call-log override` |
| M62 | Bootstrap resamples cells, not encounter-seed clusters | `clusters the bootstrap by encounter seed across modes and bases` |
| M63 | Latency rank `ceil(q·n)` → index `floor(q·n)` | `summarises per-call response time with the hang guard as right-censoring` |
| M64 | Registered xhigh arm effort `'xhigh'` → `'high'` | `registers the preregistered study constants …` |
| M67 | Grid check accepts 239 cells (`>= 239`) | `refuses rows, packets or call logs that do not match the registered 240-cell grid` |
| M74 | Δ computed as high − xhigh | `runs the analysis from packet …` |
| M75 | Answer-key arm mapping swapped (`gpt-6-luna-high` read as xhigh) | same |
| M76 | Blind-id join checks counts, not id sets | `refuses packets, keys and seat files whose blind ids, seats, arms or pairs do not join` |
| M77 | Required seat set drops `sol` | same |
| M78 | Study token scan loses `xhigh` | `refuses a packet that names a model, an effort or an arm` |
| M79 | Guard ledger joined on (basis, seed, rep, arm), ignoring mode | `runs the analysis from packet …` |
| M80 | Ingest cohort check dropped (seed 5117011 accepted) | `ingests only registered cohort seeds, caps and routes and ties every call record to its cell` |
| M81 | Ingest cap check dropped (blind row at 32768 accepted) | same |
| M82 | Schedule emits the pairs' two arms in arm blocks, not adjacently | `schedules each pair's two arms adjacently in a seeded random order` |
| M83 | Schedule always puts high first | same |
| M84 | A censored call's rank is reported as the number 1800000 | `summarises per-call response time …` |
| M85 | Registered q\* → 0.025 | `registers the preregistered study constants …` |
| M88 | Schedule shuffles with `Math.random` | `schedules each pair's two arms …` (determinism) |
| M89 | Advice argv cap `32768` → `65536` | `builds the exact arena argv for a scheduled cell` |

**B5: launcher and route (17)**

| # | Mutation | Killer |
|---|---|---|
| M1 | `LUNA_PRODUCTION_ROUTE.model` → `'gpt-5.6-luna'` | T1 › `production and live escalation routes are the study route recorded in S-RESULT (owner 2026-09-24)`; T7a › `builds the exact live argv for arena and conversation at the study route` |
| M2 | `LUNA_PRODUCTION_ROUTE.effort` E → the other study effort | same two |
| M31 | `LUNA_LIVE_ESCALATION_ROUTE.effort` → the other study effort | T1 (same title); T7b › `arena escalation after two validation failures dispatches every call at the study route` |
| M32 | The launcher's `escalationArgs(route)` returns `[]` | T7a › `builds the exact live argv …`; T7b › `arena escalation …` |
| M33 | Launcher base route → `lunaStudyRoute('medium')` | T7a › `builds the exact live argv …`; T7b › `conversation primary, speculation, adjustment and correction calls all run at the study route` |
| M34 | Provenance `timeoutMs` → `120_000` | T7a › `records the hang guard, the lifted round wall and the study evidence in launch provenance`; T7b › `launch provenance timeout and round wall equal what both runners parse from the launch argv` |
| M35 | Provenance `roundWallMs: null` → `180_000` | same two |
| M36 | The refused-passthrough list loses `'--effort'` | T7a › `refuses route-bearing passthrough flags` |
| M37 | The runner is spawned before provenance is written | T7a › `writes launch provenance before the runner starts and refuses to overwrite it` |
| M38 | Screenshot branch route → `lunaStudyRoute('medium')` | T7a › `builds the exact screenshot gate argv at the study route` |
| M39a | `tools/model-routes.ts` gains `import { CONVERSATION_EFFORTS } from './ai-dm-conversation';` and uses it | T7a › `loading the launcher loads no runner module` |
| M40 | Runner map: arena → `'tools/ai-dm-conversation.ts'` | T7a › `spawns the runner with the exact direct-run command line, checkout cwd and inherited stdio` |
| M53 | Spawn `cwd: checkoutRoot` → `cwd: process.cwd()` | same |
| M54 | Spawn `stdio: 'inherit'` → `stdio: 'pipe'` | same |
| M55 | `return child.code ?? 1` → `return 0` | T7a › `propagates the runner exit code and maps a signal death to 1` |
| M56 | Provenance write flag `'wx'` → `'w'` | T7a › `writes launch provenance before the runner starts and refuses to overwrite it` |
| M57 | `main()` drops the returned code | command killer **V13d**: unmutated exit 1; mutated exit 0 |

**Totals: 72 distinct mutations** (B1 28, B4 2, B2 3, B6 22, B5 17), plus M87 if P0a fails and M86 if Q-POWER picks (b).

**Retired:** M12 (budget table, r4); r3's M39; M15–M26, M65, M68 (D569 v7, deferred by the owner 19:01); M60 (the refusal veto, removed in §3.4).

**Equivalent mutant, recorded as such.** "Escalation dispatch uses the base planner instead of the escalation planner" (`ai-dm-conversation.ts:4359-4361`) survives every LUNA6 witness while PR4 makes the two routes equal. That routing is pinned by the frozen `ai-dm-conversation.test.ts` tests at `:1444-1511` and `:1708-1734` [V-r4].

**Supporting tests without a dedicated mutant:** T4 › `reports a planted occurrence from an in-memory file map`; T1 › `screenshot calls give gpt-6-luna models the hang guard and leave other models untimed`; T1 › `reconciles call-log events and reports a dispatch without completion as pending`; T1's compile-time `expectTypeOf<LunaEffort>().toEqualTypeOf<ConversationEffort>()`, checked by V2.

### 4.4 The protocol oracle and the witness specifications (r4 P1-3, r3 P2-2)

**The oracle is a written state machine, not captured output.** For one round in the configurations the witnesses use (one round per cell, `LEGACY_BLOCK_ARGS` or D569 modes, no speculation or adjustment windows), the dispatches follow these rules. Each rule cites its record and the FROZEN literal that corroborates it. None of those literals is edited by LUNA6.

| Rule | Protocol (record) | Call(s) `[dispatch, callPhase, bootstrapKind]` | Frozen corroboration [V] |
|---|---|---|---|
| P1 fresh start | a cell's first dispatch opens a fresh session (Part A :568 "fresh session/cell"; lifecycle `bootstrap ?? { kind: 'cold_start' }`) | `[start, initial, cold_start]` | `ai-dm-conversation.test.ts:1670` (1 start when the initial answer is corrected) |
| P2 accepted | an accepted initial answer ends the round's dispatches | — | `:1828-1829` (untiered invalid-then-valid: 1 start, 1 resume; nothing follows the accepted correction) |
| P3 one correction | a rejected initial answer gets exactly one correction, on the same session (D474; `MAX_PROPOSAL_CORRECTIONS = 1`) | `[resume, correction, null]` | `:1670-1674` (1 start, 1 resume, `callPhase: 'correction'` on the base route) |
| P4 escalation | a second validation failure, or a refusal, with escalation configured opens a fresh escalation session (Part A :330, D474) | `[start, correction, escalation]` | `:1722-1727` (resume 1, start 2, `startInvocations[1]` `callPhase: 'correction'`, `bootstrap.kind: 'escalation'`); `:1787-1788` (invalid initial and correction: 2 starts, 1 resume) |
| P5 call timeout | a primary call that ends `timed_out` ends the round: outcome `refused`, `fallbackReason: 'timeout'`, no further call (Part A :330 "typed fallback … never silent delay") | — | `:948-980` (adapter `start` returns `timed_out`; its `resume` throws "Timeout fixture unexpectedly resumed."; row `refused` / `timeout`) |
| P6 round wall | with a bounded round, an answer observed after the wall is not accepted: `outcome: 'refused'`, `roundWallTimedOut: true`, `policyElapsedMs: 180000`, `refusals: ['The conversation round dispatch deadline is exhausted.']` | — | `:1646-1652` |
| P7 blind | an accepted blind answer ends the round after one dispatch | `[start, initial, cold_start]` | `ai-dm-arena.test.ts:389-400` (`outcome: 'authorized'`, `planner: 'model'` for the valid blind case) |

One more assumption, recorded [I] with a STOP rule: a one-round `LEGACY_BLOCK_ARGS` run dispatches no speculation, because there is no later monster turn to speculate for. The frozen totals above (`:1670-1671`, `:1787-1788`, `:1828-1829`) contain no extra `start` or `resume`, which corroborates it. **If red-first shows a sequence other than the oracle's, the implementer STOPs and reports. The expectation is never replaced by observed output.**

Every witness asserts its gpt-6-luna run's reconciled call log (sorted by ordinal) and its adapter-boundary record list, each equal to the oracle's sequence with `model`, `reasoningEffort` and `timeoutMs` added as literals.

**T2a (B1).**
- `arena and conversation parsers lift the round wall and set the 30 min hang guard for gpt-6-luna routes`: an outcome list over
  - arena legacy xhigh;
  - arena dm-mode advice high;
  - conversation legacy high with escalation gpt-6-luna xhigh;
  - `--arm a:gpt-6-luna:high --arm b:gpt-6-luna:xhigh --interleave`;
  - sol no-flag;
  - sol with `--timeout-ms 150000`;
  - gpt-6-luna with `--timeout-ms 120000` (refused);
  - gpt-6-luna with `--round-wall-ms 180000` (refused);
  - gpt-6-luna base with gpt-5.6-sol escalation (refused);
  - `--arm a:gpt-6-luna:high --arm b:gpt-5.6-sol:high --interleave` (refused).

  Each case records `{ ok: { timeoutMs, roundWallMs } }` or `{ error }`, asserted with one `toEqual` literal.
- **W1**:
  - Run: `runArena(parseArenaArgs(['--rooms','1','--reps','2','--cells','1:2','--seed','3943001','--dry-run','--cli','codex','--model','gpt-6-luna','--effort','xhigh','--out',<tmp>/w1.jsonl, ...LEGACY_BLOCK_ARGS, ...ALL_OPTIONS_TEST_RENDERER_ARGS]), { adapter: new LunaWitnessAdapter(), simulatedInProcessDispatchDelayMs: 0, policyNow: () => policyMs, onPrimaryResultObservedForTest: () => { policyMs = 200_000; }, heartbeat: () => undefined })`. The sol control is the same with no `--model/--effort`.
  - Asserted, as one literal: `{ luna: { calls: [P1 with {model:'gpt-6-luna', reasoningEffort:'xhigh', timeoutMs:1800000, signalAbortedAtCall:false}], row: { roundWallBudgetMs: null, roundWallTimedOut: false, policyElapsedMs: 200000, round: 2 }, callLog: [P1 + {cellKey:'1:2', timeoutMs:1800000, boundKind:'hang_guard', exit:'completed', hangGuardFired:false}] }, sol: { calls: [P1 with gpt-5.6-sol / medium / 120000], row: <P6 literal>, callLogExists: false } }`.
  - The call log is read from `<tmp>/w1.jsonl.luna-calls.jsonl`, the arena-level path (M72). `cellKey '1:2'` comes from `scheduledCellKey` (M73).
- **W2** `dm-mode adapter boundary: …`:
  - Run: `runConversation(parseConversationArgs(['--rooms','1','--rounds','1','--out',<tmp>,'--dm-mode','advice','--board-image','off','--cli','codex', …route, ...LEGACY_BLOCK_ARGS]), { adapter: new LunaWitnessAdapter(), roomStates: [generateRoom(3_943_006).encounter.state], simulatedInProcessDispatchDelayMs: 0, policyNow: () => policyMs, onPrimaryDispatchStart: () => { policyMs = 25; } })`, recording the first adapter call as data.
  - Asserted: `{ luna: { first: [P1], timeoutMs: 1800000 }, sol: { first: [P1], timeoutMs: 179975 } }`.
- **W3**:
  - Run: arena `--rooms 1 --reps 1 --seed 3943001 --dry-run --cli codex --model gpt-6-luna --effort xhigh --escalation-model gpt-6-luna --escalation-effort xhigh …LEGACY_BLOCK_ARGS` with `{ invalidInitial: ['room-1-round-1'], failCorrection: ['room-1-round-1'] }` (the frozen scenario of `ai-dm-arena.test.ts:2254-2266`, whose row literal has `escalated: true`) [V].
  - Asserted: the reconciled call log equals `[P1, P3, P4]` = `[[start, initial, cold_start], [resume, correction, null], [start, correction, escalation]]`, each record gpt-6-luna / xhigh / 1800000; the row's `callsPerRound` is 3.
- **W6**:
  - Run: `LunaWitnessAdapter({ timedOutPhases: ['initial'] })` returns, for the initial call, the adapter `timed_out` shape used by the frozen fixture at `ai-dm-conversation.test.ts:953-962` (with `timeoutMs: 1800000`).
  - Asserted: call log `[P1 + { exit: 'timed_out', hangGuardFired: true, boundKind: 'hang_guard', timeoutMs: 1800000, elapsedMs: '<n>' }]` (P5: no further call); row `{ outcome: 'refused', fallbackReason: 'timeout' }`; stderr lines captured by `vi.spyOn(process.stderr, 'write')` and matching `^\[luna-hang-guard\]` equal `['[luna-hang-guard] FIRED run=<runId> cell=1:1 phase=initial model=gpt-6-luna effort=xhigh timeoutMs=1800000 elapsedMs=<n>']` after normalising `<runId>` and `<n>`.
- **W7**:
  - Run: `runArena` with `--dry-run --dm-mode blind --blind-repair-arm code_only --blind-facts off --cli codex --model gpt-6-luna --effort xhigh` (the pattern of `runBlindArenaCase`, `:368-386`) and `{ boardSnapshotServiceFactory: async () => new BlindArenaSnapshotService('luna6-lift'), simulatedInProcessDispatchDelayMs: 50, onAgentInvocation }`.
  - Asserted: `{ calls: [P7], blindDeadlineUnixMs: 9007199254740991, firstAttemptModelWallAtLeastDelay: 50 }`, where the last field is `Math.min(row.<blind attempt list>[0].modelWallMs, 50)`. Under M47 it is 0.

**T2b (B1).**
- `screenshot probe parser gives gpt-6-luna entries the 30 min hang guard and refuses a shorter --timeout-ms`: outcome list over `--models gpt-6-luna:xhigh,gpt-5.6-sol:high` → `{ 'gpt-6-luna:xhigh': 1800000, 'gpt-5.6-sol:high': null }`; `--timeout-ms 1800000` (ok); `--timeout-ms 300000` (refused, naming the value).
- `screenshot probe kills a CLI call that exceeds its timeout, records timed_out and logs it`:
  - Run: `codexScreenshotAnswerer({ cliBin: <a fake CLI written with the test-filesystem helper that sleeps 10 s>, timeoutMs: 300, onCall })`.
  - Asserted: the result `{ status: 'timed_out' }`; the child is gone (`process.kill(pid, 0)` throws, recorded as data); the reconciled log record `{ surface: 'screenshot_cli', model: 'gpt-6-luna', reasoningEffort: 'xhigh', timeoutMs: 300, boundKind: 'shorter_than_guard', exit: 'timed_out', hangGuardFired: false }`. The 300 ms kill keeps the test inside V10.

**T1 additions (B1).**
- `the call log pairs dispatch and completion events by dispatch ordinal when calls overlap`:
  - Run: `withLunaCallLog` over a fake adapter. Call A (`initial`) is dispatched first and completes second; call B (`speculation`, `timeoutMs` 60000) is dispatched second and completes first.
  - Asserted: the reconciled list `[{ ordinal: 1, callPhase: 'initial', exit: 'completed', boundKind: 'hang_guard' }, { ordinal: 2, callPhase: 'speculation', exit: 'completed', boundKind: 'speculation_window' }]` and the raw event order `['dispatch:1','dispatch:2','complete:2','complete:1']`. Under M69 the pairing is crossed.
- `guardedLunaCall aborts at exactly 1800000 ms, logs the firing and writes one FIRED line`:
  - Run, with `vi.useFakeTimers()`: `fn` returns a promise that rejects only when its signal aborts. Advance 1,799,999 ms and record `settled`; advance 1 ms more and record it again.
  - Asserted: `{ before: false, after: true, error: 'LunaHangGuardExpired', record: { exit: 'timed_out', hangGuardFired: true, timeoutMs: 1800000 }, fired: 1 }`. Under M70 `before` is true; under M71 `after` is false.

T7a and T7b (B5) are specified in §5.

### 4.5 T8 (B6): hand-derived expectations

1. **Registration literal.** `LUNA6_EFFORT_STUDY` toEqual a literal typed from S-PREREG: id; the two arms; modes; strata (hard seeds 5117001–5117010, brutal 6203001–6203010, reps 3); caps 65536 / 8192 / 32768; margin 0.2; q\*; resamples 100000; bootstrap seed 20260924; schedule seed P; the four shuffle seeds; hang guard 1800000; seats `['fable','astra','sol']`; SA-1 and SA-2 texts.
2. **Decision** (unit, 20 clusters × 6 pairs; results hold for any q\* in [0.005, 0.025]): expected `['xhigh', 'high', 'high']` for
   - (a) every pair +0.5: every draw is 0.5, so the lower bound is 0.5 → xhigh;
   - (b) every pair +0.1 → high (M58, margin 0, flips it);
   - (c) 10 clusters at +0.8 and 10 at −0.3 (mean 0.25): a draw's mean is (1.1X − 6)/20 with X ~ Bin(20, ½), and P(X ≤ 9) = 0.4119 [V-r4: node] ≫ 0.025, so the lower bound is ≤ 0.2 → high (M59, mean in place of the bound, flips it).
3. **Zero-inclusive charging** (M60′): every cluster has 5 executed pairs at +1.0 and 1 pair whose xhigh cell is refused (0) while its high cell is executed at 6 (difference −6). Each cluster's mean is (5 − 6)/6 = −1/6, every draw is −0.1667 → high. Excluding the refused pair gives mean 1.0 → xhigh.
4. **Clusters** (M62): two seeds; seed A's 6 differences are 1.0 and seed B's 0.0. Seed clustering gives P(draw = 0) = P(draw = 1) = 1/4, so the interval at q\* is `{ lower: 0, upper: 1 }`. Resampling the 12 cells gives P(mean ≤ 1/12) = 13/4096 = 0.0032 < 0.005, so the lower bound is ≥ 2/12 > 0 for any q\* ≥ 0.005 [V: hand arithmetic].
5. **Latency with censoring** (M63, M84): 19 completed calls with elapsed 10, 20, …, 190 and 1 censored call.
   - Expected `{ calls: 20, completed: 19, censored: 1, completionRate: 0.95, p50: 100, p90: 180, p95: 190, max: '>=1800000 (censored)', callsOver180s: 1 }`, from ranks 10, 18, 19 and 20.
   - Under `floor(q·n)` indexing: p50 110, p90 190, and p95 is censored. Under M84 `max` is the number 1800000.
6. **Grid** (M67): 239 cells are refused with the missing cell named.
7. **End to end from packet to decision** (M61, M74, M75, M79). Mini registration: basis hard, protocol `{ seeds: [5117001, 5117002], reps: 1 }`, both modes, 1,000 resamples, bootstrap seed 1.
   - Inputs typed by hand for tags `blind-hard` and `advice-hard`:
     - packets: 4 entries each, `blind-001`–`blind-004`, caseIds `case-01-1` and `case-02-1` twice each, all `authorized`;
     - keys: each case has one xhigh and one high entry;
     - seats: fable, astra and sol each score xhigh entries `{3,3,1,1}` (total 8) and high entries `{2,2,1,1}` (total 6).
   - Case A, no guard ledger: 4 pairs, each +2 → `{ decision: 'xhigh', delta: { mean: 2, lower: 2, upper: 2 }, pairs: 4, clusters: 2, sa1Overrides: 0 }`.
   - Case B, ledger `[{ mode: 'blind', basis: 'hard', seed: 5117001, rep: 1, arm: 'gpt-6-luna-xhigh' }]`: that cell becomes 0, so its difference is −6. Cluster 5117001 is then {−6, +2} (mean −2) and cluster 5117002 is {+2, +2} (mean 2). A draw's mean is −2, 0 or 2 with probabilities ¼, ½, ¼ → `{ decision: 'high', delta: { mean: 0, lower: -2, upper: 2 }, sa1Overrides: 1 }`.
   - Under M61, case B equals case A. Under M74 or M75, case A gives mean −2 → high. Under M79, case B zeroes both modes' xhigh cells of seed 5117001: mean −2, lower −6.
8. **Join refusals** (M76, M77), as an outcome list whose last entry is the valid case A `{ ok: 'xhigh' }`. The refused variants and their exact messages:
   - sol seat for `advice-hard` has `blind-099` in place of `blind-003`, same count → `seat sol for advice-hard lacks blind-003 and has unregistered blind-099`;
   - sol seat file absent → `seat sol for advice-hard is missing`;
   - key for `blind-hard` repeats `blind-002` → `answer key for blind-hard has duplicate blind-002`;
   - key arm `gpt-5.6-luna-high` → `answer key for blind-hard names unregistered arm gpt-5.6-luna-high`;
   - both entries of `case-02-1` keyed xhigh → `blind-hard case-02-1 lacks arm gpt-6-luna-high`.
9. **Leak scan** (M78): a packet whose entry carries `"xhigh"` inside `executedPlan[0].reason` → `packet blind-hard contains forbidden token xhigh`; the clean packet → ok.
10. **Ingest** (M80, M81): minimal row objects and call logs for the mini registration, as an outcome list:
    - seed 5117011 → refused;
    - a blind row with `turnContextMaximumBytes` 32768 → refused;
    - `model: 'gpt-5.6-luna'` → refused;
    - a call record with `cellKey '2:1'` on a `'1:1'` row → refused;
    - 2 completions with `callsPerRound` 1 → refused;
    - a relabel that would change a field other than `arm` → refused;
    - a record with `hangGuardFired` → accepted, with one ledger entry.
11. **Schedule** (M82, M83, M88): `buildLuna6Schedule(LUNA6_EFFORT_STUDY, 1)` checked by properties computed in the test: `{ entries: 240, pairs: 120, pairsAdjacent: true, bothOrders: true, eachCellOnce: true, deterministic: true }`, where `deterministic` compares two calls byte for byte.
12. **Argv** (M89): the entry for (advice, brutal, seed 6203004, rep 2, xhigh) has exactly the §3.1 argv, typed as a literal in the test, with the ordinal normalised to `<n>`.

### 4.6 Rejected approaches

- **Budget tables derived from a pilot.** Superseded by D890.
- **An "infinite" round wall as a large number.** `createConversationRoundDeadline` re-arms `setTimeout(scheduleAbort, Math.ceil(remainderMs))` (`:58`), and Node clamps delays above 2,147,483,647 ms to 1 ms [I: Node timers documentation]: a 1 ms re-arm loop. **A 30 min round wall** was also rejected, because D890 asks for a per-call guard.
- **Per-call or per-arm bounds inside a mixed run.** A per-call exemption from the round's clamp still meets the round's `acceptsCompletion` (§2.2). Per-arm bounds in the arena need per-arm `experimentPolicy` and per-arm row checks for a run nobody schedules, and they would make a censored-vs-uncensored comparison look legitimate. Refused instead (§2.2).
- **A `bound` or `timeoutSource` field on configs, or a row field for the guard.** Breaks T6 and `ai-dm-arena.test.ts:960-963` by construction; the call log is a sidecar written only by lifted runs.
- **A captured sequence oracle (r4's LUNA6-SEQ).** Production output is not an independent oracle (Part A :96; review r4 P1-3); replaced by §4.4.
- **The arena's `--interleave` mode for the study.** Untested in dm modes with PNG capture (§3.2).
- **The D569 zero-margin refusal veto.** §3.4 and Appendix E1.
- **Extending the study after an inconclusive result.** A second look after seeing data inflates the error rate unless preregistered as a sequential design. If the owner wants more precision, Q-POWER (b) buys it up front.
- **A launcher that imports runners.** Their vite-node guards make it hazardous (T7a sentinel).
- **Swapping the 124 passthrough test occurrences, or renaming v5 exports.** The model there is echoed input; the pin tool imports `D569_EXPERIMENT_MANIFEST_PATH` and `dryRunD569Experiment` (`.tmp/runs/perf-02/pins/capture.ts:13-15`) [V-r4].
- **Relocating a slow new test** (fixed placement, §1.5).

---

## 5. The launcher and launch provenance (B5, after S-RESULT)

**Invocation:** `node node_modules/vite-node/vite-node.mjs tools/luna-route-launch.ts --runner <arena|conversation|screenshot> <passthrough…>`.
- **Route prefix, exact:**
  - arena and conversation: `--cli codex --model gpt-6-luna --effort <E> --escalation-model gpt-6-luna --escalation-effort <E>` (PR4);
  - screenshot: `--models gpt-6-luna:<E>`.
- **No `--timeout-ms` and no `--round-wall-ms`.** The lift applies by route (§2.2).
- **Refused passthrough flags** (exit 2, nothing written): `--cli --model --effort --escalation-model --escalation-effort --timeout-ms --models --dm-mode --arm --arm-combat-model --arm-override-policy --arm-instruction-source --arm-kb --local-base-url --local-model --local-api-key --local-think --round-wall-ms`. The parsers keep the last value of a repeated flag (`values.set`: `ai-dm-arena.ts:353`, `ai-dm-conversation.ts:1106`, `ai-dm-screenshot-probe.ts:2209`) [V-r3]; `--dm-mode` belongs to D569; `--arm*` runs are studies.
- **Child process.** Arena: `[process.execPath, 'node_modules/vite-node/vite-node.mjs', 'tools/ai-dm-arena.ts', '--', …prefix, …passthrough]` (the form proven by `ai-dm-arena.test.ts:2053-2073`) [V-r3]. Conversation: the same with `tools/ai-dm-conversation.ts`. Screenshot: no `--` (its parser does not strip one, `ai-dm-screenshot-probe.ts:3706-3722`) [V-r3]. In every case `cwd` is the injected checkout root, `stdio: 'inherit'`, and the launcher's exit code is the child's, or 1 if the child died by a signal. `main()` sets `process.exitCode = await runLunaRouteLaunch(process.argv.slice(2), NODE_DEPS)`. **The launcher imports only `tools/model-routes.ts` and node built-ins.**
- **Provenance** `<out>.luna6-launch.json`, written with flag `wx` **before** the spawn. It sits next to `--out`: outside the repo for arena and conversation, in the gitignored `dnd-slim-runs/` for the screenshot probe, whose parser requires an in-repo `--out` (`ai-dm-screenshot-probe.ts:2240`) [V-r3]. Schema `luna6-launch-provenance-v2`:

```json
{
  "schema": "luna6-launch-provenance-v2",
  "ruling": "D890 (lift; study picks the route); owner 2026-09-24 18:58 (gpt-6-luna only); D887 (b)(c) unchanged",
  "routeEvidence": "<S-RESULT D-id>",
  "runner": "arena | conversation | screenshot",
  "model": "gpt-6-luna",
  "effort": "<E>",
  "escalationModel": "gpt-6-luna | null (screenshot)",
  "escalationEffort": "<E> | null (screenshot)",
  "timeoutMs": 1800000,
  "timeoutSource": "luna_hang_guard",
  "roundWallMs": null,
  "callLogPath": "<out>.luna-calls.jsonl",
  "argv": ["<exact child argv after the runner path>"],
  "repoCommit": "<git rev-parse HEAD>",
  "launchedAt": "<ISO-8601>"
}
```

`timeoutMs`, `timeoutSource` and `roundWallMs` come from the same `resolveSessionBounds` call the parsers make; T7b W5 proves both runners parse the same values from the launch argv.

**T7a (B5).**
- **Runtime load sentinel** (M39a): `const loaded = vi.hoisted(() => [] as string[])` and three `vi.mock('../../../tools/ai-dm-{arena,conversation,screenshot-probe}', () => { loaded.push('<name>'); return {}; })`; then `await import('../../../tools/luna-route-launch')` recorded as `{ ok: true }` or `{ error }`. Asserted `{ loaded: [], outcome: { ok: true } }`. The conversation runner's vite-node guard (`ai-dm-conversation.ts:7693-7699`) has no `VITEST` check, unlike the arena's (`ai-dm-arena.ts:1042-1048`) [V-r4].
- **Spawn contract:** an injected spawner records `{ command, args, options }`. Asserted toEqual `[{ command: <process.execPath literal from the test>, args: ['node_modules/vite-node/vite-node.mjs','tools/ai-dm-arena.ts','--', …prefix, …passthrough], options: { cwd: '/SIMULATED/checkout', stdio: 'inherit' } }]` for arena; the same with `'tools/ai-dm-conversation.ts'`; for the screenshot probe, no `'--'`.
- **Exit codes:** the spawner resolves `{ code: 0 }`, `{ code: 7 }`, `{ code: null, signal: 'SIGTERM' }`; `runLunaRouteLaunch` returns `[0, 7, 1]`.
- **No overwrite:** two launches with the same `--out` give `[{ ok: <provenance literal> }, { error: <message containing 'EEXIST'> }]`, and the file afterwards equals the first provenance literal.

**T7b (B5).**
- **W3′**: W3's scenario with the launcher-built arena argv at route E. The reconciled call log equals `[P1, P3, P4]` at E.
- **W4**: the configuration of `ai-dm-conversation.test.ts:4161-4180`, copied as literals, run with the launcher-built conversation argv:
  - configuration: `initiative_segments_v1`; `alternatingInitiativeRoom({ fragileMonsterCount: 1 })`; `partyPolicyOverride: 'heuristic_v0'`; suggestion ignored; adjustment `'room-1-round-1-pc-turn-1': 'invalid'`; in-process delay 10; speculation delay 50.
  - The speculation window makes this run concurrent, so W4 does not pin a sequence. It asserts:
    - (i) the set of `callPhase` values equals the frozen literal `{'initial','speculation','adjustment','correction'}` (`:4184-4186`) [V];
    - (ii) the reconciled call log, the adapter-boundary records and the `onAgentInvocation` records agree one to one when ordered by ordinal;
    - (iii) the number of completions equals the row's `callsPerRound`, and is ≥ 3 (the frozen bound at `:4183`);
    - (iv) every record is gpt-6-luna at E. Speculation records have `boundKind: 'speculation_window'` and `timeoutMs` ≤ 300000 (PR8); all others have `boundKind: 'hang_guard'` and 1800000.
- **W5**: `{ provenance: [launch.provenance.timeoutMs, launch.provenance.roundWallMs], arena: [a.timeoutMs, a.experimentPolicy.roundWallMs], conversation: [c.timeoutMs, c.roundWallMs] }` equals `{ provenance: [1800000, null], arena: [1800000, null], conversation: [1800000, null] }`.

**Wrappers** (Phase 4, external, `~/dnd-slim-runs/luna6/`), each one launcher call:
- `live-arena.sh`: `cd <checkout at the landed commit> && node node_modules/vite-node/vite-node.mjs tools/luna-route-launch.ts --runner arena --basis <b> --rooms <n> --reps <r> --seed <s> --out <absolute path outside the repo>`;
- `live-conversation.sh`: `… --runner conversation --fixtures <dir> --rooms <n> --rounds <r> --out <absolute path outside the repo>`;
- `gate-comprehension.sh` (:456) and `gate-sight-cover.sh` (:459): `… --runner screenshot --states 24 --seed <s> --images-root dnd-slim-runs/<tag>-images --out dnd-slim-runs/<tag>.jsonl <gate flags>`. The :459 Sol-high stage is a separate direct `--models gpt-5.6-sol:high` call, unchanged.

Each wrapper's sha256 goes into the launch D-entry; V14 audits them. A wrapper that bypasses the launcher cannot be stopped in code, because D887 (c) keeps runner flags free (K14).

---

## 6. D569 v7: deferred (owner 19:01)

- The owner: "Study on v5, v7 waits for v6". **No D569 re-registration is in this plan's executable scope.** B3a, B3b, T3, T2c, the v7 fixture, the v7 operators, the v7 runbook, mutants M15–M26, M65, M68, V9 and the owner questions Q4a, Q4b and Q4c are removed.
- v5 stays byte-frozen (§1.4). Its gpt-5.6-luna arm is superseded as a route by D885/D887/D890. The landing D-entry records v5 as "superseded before completion; not analysed; no inferential claim", unchanged from r4's reading. The study uses v5's cohorts and caps, not its arms, manifest or analysis.
- **For the future plan, when COHORT v6 lands on main:**
  1. The new registration builds on COHORT v6's manifest (`d569-blind-experiment-manifest-v6`, Part A :515), not on v5.
  2. Its Luna arms use E from S-RESULT.
  3. Under the owner's 18:58 answer only gpt-6-luna calls are uncensored, so its arms need per-arm bounds rather than v5's single `experimentWallMs`. Review r4 recommended replacing that field; this is recorded here, not designed.
  4. Its primary blind-vs-advice contrast would run on states the route study also used (the v5 primary cohorts are not COHORT v6's brutal cohort, but hard 5117xxx is carried by v6 [R: Part A :520, "even unchanged hard rows"]). That overlap is a limitation to state in that plan.
- The r4 finding about v5's effective 240 s wall (§2.1) stays on record for that plan.

---

## 7. DATA-01: its plan stays closed; D890 reaches its teacher route and guard (r4 P1-1)

- **Status [V].** The DATA-01 plan is **CLOSED at revision 5** under the owner's QA4 (D889): `.claude/consensus/data-01/plan-r5.md`, sha256 `461245068a49d6b11aece353b3da607e5d3e3127345f38568f153805b2ab929c`. It is not edited.
- **What DATA-01 r5 says about the teacher [V].** r5:18: "D887 makes the DATA-01 teacher `gpt-6-luna` at `xhigh`". r5:56: "a new direct Responses client with strict JSON Schema, no prose, `gpt-6-luna`, `xhigh`, and a stateless request". r5:67: the audit keeps "provider id, usage, error, latency". r5:206: batch 3 (`tools/rl/model-label-clients.ts`, `tools/rl/label-dm-decisions.ts`, …) has "`xhigh→high` fails exact-route witness", and "Unit/stub work and one route probe proceed; paid pilot waits for §1/§6 gates".
- **The DATA-01 D890 implementation amendment.** Text for the supervisor to record as a D-entry when B1 lands and to quote verbatim in DATA-01's batch-3 brief:
  1. **Route.** D890 (c) supersedes DATA-01 r5:18 and :56's fixed xhigh, by reference: the teacher route is gpt-6-luna at **E**, as recorded in S-RESULT. The S-RESULT D-entry repeats this supersession. DATA-01's exact-route witness becomes "E → the other study effort fails the witness", with the route literal typed from S-RESULT.
  2. **Before S-RESULT (PR11).** No paid DATA-01 teacher call on gpt-6-luna runs. The one route probe may run: it is a probe, not a production run. It should cover both study efforts, so that DATA-01's price basis does not depend on which one S-RESULT picks. That is a recommendation, not a LUNA6 requirement.
  3. **Guard.** Every gpt-6-luna Responses request DATA-01 makes goes through LUNA6's `guardedLunaCall(meta, sink, (signal) => client.request(body, { signal }))` (from `tools/luna-call-log.ts`, landed in B1): teacher, route probe, format and agreement calls, load calls. `meta.timeoutMs` stays at the default `LUNA_HANG_GUARD_MS` (1,800,000). No other timeout is added: the owner's reading leaves only the guard.
  4. **Log.** Records are `luna-call-log-v2` with `surface: 'responses_api'`, `callPhase` one of `data01_teacher`, `data01_route_probe`, `data01_format`, `data01_agreement`, `data01_load`, and `providerRequestId` filled. The path is `<DATA-01 audit ledger path>.luna-calls.jsonl`. A firing writes the FIRED line, and DATA-01's audit ledger records the attempt with error `hang_guard`, as a failed attempt under r5:67's accounting.
  5. **Witness in DATA-01's batch 3.** Under fake timers, a fake client whose request settles only when its signal aborts: after 1,799,999 ms it is pending; after 1 ms more it is aborted; the call log and the audit ledger both record the firing. A named mutant, "the teacher request is not wrapped in `guardedLunaCall`", must be killed by it.
  6. **Not lifted.** DATA-01's Opus and Sol judge calls are not gpt-6-luna and keep what DATA-01 specifies (owner 18:58: gpt-6-luna only).
- **LUNA6 does not authorize, block or condition DATA-01's pilot.** Its gates remain its own: the S-4 answer (r5:22), the reserve measured "before any pilot beyond the one route probe" (r5:129), and the break-even thresholds (r5:153). The only holds are D890's, through PR11.
- **Cross-unit observations for DATA-01's own review** (information only):
  - Headroom formula (r3 P2-1, carried): for a reserve fraction `h` of the $500 cap, `r ≤ 500 × (1 − h) / N`; for a dollar reserve `H$`, `r ≤ (500 − H$) / N`. On r5's ledger [V-r4: node]:

  | N | h = 0 | h = 0.10 | h = 0.20 |
  |---:|---:|---:|---:|
  | 18,701 (minimum) | $0.02673654 | $0.02406288 | $0.02138923 |
  | 36,301 (scheduled maximum) | $0.01377373 | $0.01239635 | $0.01101898 |
  | 52,301 (attempted envelope) | $0.00956005 | $0.00860404 | $0.00764804 |

  - The gpt-6-luna prices ($0.10/$0.50 per M) remain **UNVERIFIED** (r5:129).

---

## 8. Order of work, verification, risks, owner questions

### 8.1 Order

1. **Phase 0 (supervisor):**
   - a D-entry recording the two owner answers of 2026-09-24 verbatim, the supervisor's account of the 18:58 option text (speculation window), and PR4–PR11;
   - **P0a** (§1.6) and **V13a**;
   - **B0** (implementer: `simulate.mjs` only, under `.tmp/runs/luna6/power/`); codex sol read-only review of it; **V17** (supervisor runs it);
   - **Q-POWER** if the dominance rule holds (§8.4);
   - **S-PREREG**.
2. **Phase 1 (code; D885 §7: Opus implements, codex sol reviews read-only, the supervisor verifies and commits).** Each batch runs red-first, then §4.2 mutants, then §8.2, then sol review, then the supervisor's gate.
   - **B1:** the lift, call log v2, `guardedLunaCall`, the screenshot guard (and M87's change if P0a failed); T1, T2a, T2b. Then **V13b** and **V13e**. Then the supervisor records the DATA-01 amendment (§7).
   - **B4:** the guard (T4).
   - **B2:** generate-data v2 (after B1).
   - **B6:** the study operator, the D569 extraction exports, and T8 (after B1 and S-PREREG).
3. **Phase S (supervisor):**
   - the study checkout at the landed commit;
   - S-SCHEDULE, then **V18**;
   - the runs, ingest, packets, judging, seat normalization and analysis (**V15**);
   - **S-RESULT**, reported to the owner with the speed and quality numbers.
4. **Phase 3 (code, after S-RESULT):** **B5**: launcher, T1's route test, T7a, T7b. Then **V13c** and **V13d**.
5. **Phase 4 (supervisor, external):** the `~/dnd-slim-runs/luna6/` wrappers and **V14**, the memory-note update.
6. **Phase 5:** live-play launches, under a separate launch decision.

**Coordination.**
- B1 and B5 append to `ai-dm-arena.test.ts`, which lengthens main's gate; V10b reports the added time to PERF-02.
- No LUNA6 test runs during a PERF-02 timed pair, and study cells pause through the `PAUSE` file (§3.2).
- CONV-SPLIT touches `ai-dm-conversation.test.ts`, which LUNA6 keeps FROZEN.
- LUNA6 deletes no test file, so the D583 changed-spec guard (D890) cannot fire on its account.

### 8.2 Verification

The implementer runs every check in its own clone; the supervisor re-runs them on a clean `git clone --shared` at the candidate SHA under `PhpstormProjects`. Heavy commands go through `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/perf-02/fanout/slot.sh <clone> …`. Evidence goes to `.tmp/runs/luna6/impl/<batch>/`. Claimed and verified are kept apart. `<base>` is the main commit the batch branched from; `<prev>` is the previous LUNA6 landing, or `<base>` for the first append.

| # | Check | Command | Pass criterion |
|---|---|---|---|
| V1 | Command outcomes | `npm run check:command-outcomes` (= `scripts/check-command-outcomes.sh`, `package.json:16`) [V-r4] | exit 0 |
| V2 | Types | `npx tsc -b --force` | exit 0; diagnostics read; more than 100 emitted files (Part A :71) |
| V3 | Lint | `sg scan src tools tests` | 0 errors (includes `no-raw-fs-in-tests`) |
| V4 | Targeted suites | `node node_modules/vitest/vitest.mjs run --configLoader runner --maxWorkers=1 <files> 2>&1 \| tee targeted.log` over the batch's new, edited and appended files plus every FROZEN test file | failed 0; skipped 0 in new files and appended describes; file and test counts pasted |
| V5 | Inventory | `node node_modules/vite-node/vite-node.mjs tools/d583-contract-inventory.ts --baseline-sha 60249dadaf466df9b53eec4e9805e41f70b665f358f81cccec3a0271466d1224 --txn-baseline-sha c79d8d15ea7b292efa9d5a21bcba20454072f267300ddd1428b3cfbd91d3a6df --out /tmp/luna6-<batch>-inventory.txt`, output copied to the evidence dir | JSON line pasted; the supervisor runs every listed spec, and that list is the denominator; new specs expected; baseline digests do not move (`tools/d583-contract-inventory.ts:237-310`) [V-r2] |
| **V6a** | FROZEN files, every batch | `git diff --exit-code <base> <cand> -- tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-prepatch-primary-bytes.json tests/fixtures/ai-dm-legacy/ tests/unit/tools/ai-dm-legacy-invariance.test.ts tests/unit/tools/d569-blind-experiment.test.ts tests/unit/tools/d569-v5.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/rl-extract-sft.test.ts tests/unit/tools/ai-dm-rerun-packet.test.ts tests/unit/tools/ai-dm-board-delivery.test.ts tools/d569-v5/ tools/ai-dm-rerun-packet.ts src/vtt/agent-adapters/ src/vtt/mcp/ src/vtt/turn-exhaustion-coordinator.ts`; `git show <cand>:tests/fixtures/d569-blind-experiment-manifest.json \| sha256sum`; `sha256sum ~/dnd-slim-runs/d569-v5/scripts/*` | exit 0; the v5 raw sha equals `8c0bcb3c…e6451e13a`; the installed shas equal §1.4 |
| **V6b** | APPEND-ONLY files (§1.5) | `git show <prev>:F > base; git show <cand>:F > cand; cmp -n "$(stat -c %s base)" base cand`; then `python3 .tmp/runs/luna6/impl/check-append-only.py base cand '<describe>' <batch>/titles.json`. The checker requires: (1) a non-empty UTF-8 suffix; (2) column-0 suffix lines only blank, `import` declarations, class or const declarations used by the describe, one `describe('<describe>', () => {` line and its `});`; (3) the suffix's `it(` titles equal `titles.json` as an **ordered** list; (4) no `.only`, `.skip`, `.todo`, `.each`, `describe.` modifier or `// @vitest-environment` comment anywhere in the suffix. At `673c7ee3` the hosts are 107,857 bytes (sha `daa44515…`) and 59,668 bytes (sha `b3cbeae7…`) [V-r4] | all exit 0 |
| V7 | Mutants | §4.2, per batch | every batch mutant KILLED with evidence; `RESTORED` sha = ORIG; killers pass again after restore; harness exit 0 |
| **V8** | Engine and tool pins, every batch except B4 | `mkdir -p <clone>/.tmp/perf-02/pins && cp /home/vagrant/PhpstormProjects/dnd-gate-exp-pins-Cm1J/.tmp/perf-02/pins/capture.ts <clone>/.tmp/perf-02/pins/capture.ts && echo "eca109add579fcf901edd862a1065c636a4454a276b87982cbb19fd034e3a13b  <clone>/.tmp/perf-02/pins/capture.ts" \| sha256sum -c`; `slot.sh <clone> node node_modules/vite-node/vite-node.mjs .tmp/perf-02/pins/capture.ts .tmp/perf-02/pins/out`; `sha256sum <clone>/.tmp/perf-02/pins/out/{arena-verdicts,blind-facts-contexts,blind-rows,d569-cells,legacy-capture,los-cover-rooms,survival-seeds}.json` | all 7 prefixes equal D880: arena-verdicts `b9d9141b`, blind-facts-contexts `d96399dd`, blind-rows `19d81fe0`, d569-cells `fedcda76`, legacy-capture `c24f0795`, los-cover-rooms `f5b03860`, survival-seeds `7411c915`. The capture's arena cases use the no-flag sol route (`capture.ts:118-123`) [V-r4] |
| V9 | retired with v7 (§6) | — | — |
| **V10** | Test cost | each new test in new files **and** appended describes: 3 solo runs, `node node_modules/vitest/vitest.mjs run --configLoader runner --maxWorkers=1 <file> -t '<escaped title>' --reporter=json`, reading `assertionResults[].duration`; each new file also run whole solo 3× (wall) | every new test's median ≤ 5,000 ms and every new file's median wall ≤ 5 s (`.tmp-plans/2026-09-23-perf-02-makespan-experiments.md:89`). On failure: STOP and report |
| V10b | Appended cost (information) | `-t '^LUNA6 Luna lift wiring'` and `-t '^LUNA6 route witnesses'`, each solo 3× in its host file | median reported to PERF-02 |
| V11 | Negative controls | T4's planted map; T1's non-Luna list plus the unchanged T6; `check-append-only.py` must fail on each of: (i) one byte flipped at offset 100 of the base region; (ii) a suffix containing `it.only(`; (iii) a top-level `it.skip(` after the describe's `});`; (iv) the frozen titles in a different order; (v) a `// @vitest-environment jsdom` line inside the describe | each control exits non-zero |
| V12 | Review and gates | codex gpt-5.6-sol read-only review of the batch diff (fresh session, D860); then the supervisor's `node tools/gate-vitest.mjs` on the candidate checkout, quiet box (D883, D890), inventory checked; after merge, the post-merge full gate on main (Part A :77). No Playwright: no browser spec touched | APPROVE; gate pass; post-merge pass |
| **V13a** | Availability, before B1 | `node node_modules/vite-node/vite-node.mjs tools/ai-dm-arena.ts -- --cli codex --model gpt-6-luna --effort xhigh --timeout-ms 1800000 --rooms 1 --reps 1 --seed 3943001 --out <abs outside repo>/v13a.jsonl` | a row from gpt-6-luna xhigh. **Availability only**: before B1 the 180 s round deadline applies, and a call over 180 s is reported as censored |
| **V13b** | Lifted smoke, after B1 | the V13a command with `--effort high` and then `--effort xhigh`, **no `--timeout-ms`**, `--out …/v13b-<effort>.jsonl`; a python check confirms no `--timeout-ms` or `--round-wall-ms` in the command text | the row has `roundWallBudgetMs: null`, `model: 'gpt-6-luna'` and the effort; `<out>.luna-calls.jsonl` reconciles with no pending record; every record has `timeoutMs: 1800000`, `boundKind: 'hang_guard'`, the route, `cellKey '1:1'`; completions = `callsPerRound`; each `elapsedMs` and any `hangGuardFired` reported |
| **V13e** | Real process past 180 s, after B1 | fake binary `.tmp/runs/luna6/impl/fake-codex-sleep.sh`: `#!/bin/sh` / `case "$1" in --version) echo "codex-cli 0.0.0-fake"; exit 0;; esac` / `sleep 200` / `exit 0`. Lifted: `node node_modules/vite-node/vite-node.mjs tools/ai-dm-arena.ts -- --cli codex --cli-bin <abs fake> --model gpt-6-luna --effort high --rooms 1 --reps 1 --seed 3943001 --out <abs>/v13e-luna.jsonl`. Control: the same with `--model gpt-5.6-sol --effort medium --out <abs>/v13e-sol.jsonl`. Both wrapped in `/usr/bin/time -f %e` | lifted: the first reconciled call record has `elapsedMs ≥ 200000`, `timeoutMs 1800000` and `exit ≠ 'timed_out'`, and the process wall ≥ 200 s; control: the row shows the round deadline (`roundWallTimedOut: true`, or the refusal `The conversation round dispatch deadline is exhausted.`), and the process wall is < 200 s. The row outcome itself is reported, not judged: the fake returns no answer [I] |
| **V13c** | Launcher smoke, after B5 | `node node_modules/vite-node/vite-node.mjs tools/luna-route-launch.ts --runner arena --rooms 1 --reps 1 --seed 3943001 --out <abs>/v13c-arena.jsonl`, and `--runner conversation --fixtures tests/fixtures/arena-basis --rooms 1 --rounds 1 --out <abs>/v13c-conv.jsonl` | provenance equals the §5 schema with `effort: <E>`, `timeoutMs: 1800000`, `roundWallMs: null`, `routeEvidence: <S-RESULT id>`; rows and call logs as in V13b at E |
| **V13d** | Launcher exit code (M57) | `node node_modules/vite-node/vite-node.mjs tools/luna-route-launch.ts --runner arena --rooms 1 --reps 1 --seed 3943001 --basis no-such-basis --out <abs>/v13d.jsonl; echo "exit=$?"` | `exit=1`; under M57 `exit=0` |
| **V14** | Wrapper audit (Phase 4) (r4 P2-6) | `python3 .tmp/runs/luna6/impl/v14-wrapper-audit.py --wrappers /home/vagrant/dnd-slim-runs/luna6 --expected-shas <file of "sha256  path" lines copied from the launch D-entry>`. The script reads every `*.sh` under `--wrappers`, joins backslash continuations, and checks: (i) no line invoking `tools/luna-route-launch.ts` contains `--model`, `--effort`, `--escalation-model`, `--escalation-effort`, `--timeout-ms`, `--round-wall-ms` or `--models`; (ii) no line invokes `tools/ai-dm-arena.ts`, `tools/ai-dm-conversation.ts` or `tools/ai-dm-screenshot-probe.ts` directly; (iii) every wrapper's sha256 appears in `--expected-shas`, and every listed path exists. It prints `V14 FAIL <path>:<line>: <reason>` per violation and exits 1 on any, else prints `V14 PASS wrappers=<n>` and exits 0. Its own sha256 goes into the launch D-entry | real run: exit 0 and the PASS line. Negative control: a temporary copy of the directory plus `bad.sh` containing `node node_modules/vite-node/vite-node.mjs tools/luna-route-launch.ts --runner arena --effort medium --out /tmp/x.jsonl` must exit 1 with `V14 FAIL <tmp>/bad.sh:1:` naming `--effort` |
| **V15** | Study operators (Phase S) (r4 P2-6) | in order, from the study checkout: `… tools/luna6-effort-study.ts ingest --root <R>`; `… packets --root <R> --shuffle-seeds <four seeds from S-PREREG>`; `bash <R>/scripts/judge-study.sh <tag>` for the four tags; the seat-normalization python of §3.7 stage 6; `… analyze --root <R>`; where `<R>` = `/home/vagrant/dnd-slim-runs/luna6-effort` and `…` = `node node_modules/vite-node/vite-node.mjs` | (i) every schedule ordinal has `cells/<o>.exit` = 0 or is covered by the infrastructure rule; (ii) ingest prints `LUNA6 INGEST PASS cells=240 pairs=<120 − excluded> excludedPairs=<n ≤ 12> sa1=<n> calls=<n>` and exits 0; (iii) packets prints `LUNA6 PACKETS PASS packets=4 entries=240 leakScan=clean`; (iv) each `judge-study.sh` run ends `JUDGE-STAGED <tag> DONE`, with seat exits 0 in the judge log; (v) normalization prints `SCORING OUTPUT NORMALIZATION PASS tags=4 seats=fable,astra,sol`; (vi) analyze prints `LUNA6 ANALYSIS PASS decision=<high\|xhigh> delta=<mean> lower=<q*-percentile> pairs=<n>`, and its result JSON is copied verbatim into S-RESULT with its sha256 |
| V16 | retired (the SEQ capture is deleted) | — | — |
| **V17** | Operating characteristics (Phase 0) | `node .tmp/runs/luna6/power/simulate.mjs --out .tmp/runs/luna6/power/oc.json` (the §3.5 specification) | the three self-checks print and hold; the last line is `LUNA6 OC PASS qstar20=<q> qstar40=<q> p05A20=<P>`; `oc.json` holds every grid cell with its Monte Carlo SE; q\* and the dominance verdict are copied into S-PREREG |
| **V18** | Dry-run pipeline preflight (Phase S, before any paid cell) | (1) fixture shas: `node -e` over the v5 manifest's `primaryCohorts[].fixtures[]`, comparing `sha256sum` of each path (a python equivalent is fine); (2) `run-schedule.sh --dry-run`, which appends `--dry-run` to every entry and writes under `<R>/dry/`; (3) `ingest --root <R>/dry`; (4) `packets --root <R>/dry --shuffle-seeds <four dry seeds, drawn separately and recorded>`; (5) a SIMULATED seat file per tag and seat, written by a python snippet that gives every executed entry components `{1,1,1,1}` and total 4; (6) `analyze --root <R>/dry` | (1) 20/20 shas equal the manifest; (2)–(4) and (6) print their PASS lines with 240 cells, 4 packets and 240 entries; (6) prints its decision fields; Δ is expected to be 0 because the SIMULATED dry-run adapter ignores the route [I], and a non-zero Δ is investigated and explained before any paid cell; the dry tree is kept and never mixed with the real one |

### 8.3 Risks

| # | Risk | Mitigation |
|---|---|---|
| K1 | An uncensored xhigh call runs for up to 30 min | D890 accepts it; the study reports the time cost; live launches wait for S-RESULT |
| K2 | gpt-6-luna is missing from the stale `~/.codex-aidm` cache | P0a, with the isolated-home remediation (§1.6) |
| K3 | Hang-guard firings bias the study | SA-1: scored 0, never excluded, counted and reported |
| K4 | Escalation at the same route recovers fewer failures than high-over-medium did | the recovery rate is reported from live runs; the owner can reopen PR4 with data |
| K5 | The pooled decision hides mode-specific effects | per-mode Δ reported |
| K6 | Lost comparability with gpt-5.6-luna baselines | cross-version comparisons are descriptive; gates re-established at E before they gate anything (PR5) |
| K8 | Codex-plan usage at xhigh | reported per arm |
| K9 | Fable exhaustion on the panel | stop loudly; never substitute |
| K10 | A new test breaks the 5 s cap | V10 stops and reports |
| K11 | Non-Luna screenshot-probe calls stay untimed | out of scope, unchanged |
| K12 | The RL corpus mixes gpt-5.6-luna low and gpt-6-luna low rows | rows carry `model`; filter or stratify |
| K13 | A runner module loaded by the launcher starts an unintended run | spawn only; the T7a runtime sentinel (M39a) |
| K14 | An external wrapper bypasses the launcher | V14 plus wrapper shas in the launch D-entry |
| K15 | Appended witnesses lengthen main's gate during PERF-02 | V10b; no LUNA6 test runs during timed pairs |
| K16 | Mixed-route studies (cycle2's tiered arms) are refused | intended (§2.2); split them or ask the owner |
| **K17** | The study is underpowered for moderate gains | V17 quantifies it before any spend; Q-POWER; S-RESULT states the detectable size |
| **K18** | A packet leaks the arm through a field or path | cell files named by ordinal; the builder's `assertBlindedPacket`; the study token scan (M78) |
| **K19** | Study cells and PERF-02 timed pairs disturb each other | the `PAUSE` file between cells; timed pairs only while nothing else loads the box (D890) |
| **K20** | The route study consumes states later D569 work may use | v5 primary cohorts only under (a); the overlap is stated for the future v7 plan (§6) |
| **K21** | The oracle's assumption of no speculation in one-round legacy runs is wrong | red-first STOP rule (§4.4); the frozen totals corroborate the assumption |

(K7, shelved-branch collisions through `_V7` names, is retired with v7.)

### 8.4 Owner questions still open (one at a time, each with a recommendation)

- **Q-POWER (asked only if V17's dominance rule holds; blocks S-PREREG).**
  - The question, filled from `oc.json`: "The route study's 20 encounter seeds can detect only a large quality gain. With the preregistered test, xhigh is chosen with probability ≈ <P at Δ = 0.5> when it is truly 0.5 panel points better (on a 0–10 scale), and it needs a gain of ≈ <Δ80> points to be chosen 80 % of the time. Below that, the study picks high by default, the cheaper route, as D890 (c) puts the burden on xhigh. (a) Run as registered: 240 cells, roughly 14–16 h of model time. (b) Add the v5 second family (20 more seeds, also registered in v5 and never launched): 480 cells, about twice the time, detectable gain ≈ <Δ80 at k = 40>, and the second family is used up."
  - *Recommendation: (a).* (b) does not make a moderate gain detectable either: under bound A the chance of choosing xhigh at a true 0.5 gain rises only from about 0.22 to about 0.40. It doubles the wall and spends the only other v5 cohort. A result that looks promising but is inconclusive is still visible in S-RESULT's interval, and a new study on fresh states (for example COHORT v6, once landed) can be preregistered then.

### 8.5 Questions removed

| Question | Answered by | Why |
|---|---|---|
| r4 Q-SPEC (speculation window) | owner 18:58 (the chosen option described the narrow reading, per the supervisor) | the window stays; its cuts are logged (PR8) |
| r4 Q-ESC (escalation effort if E = high) | D890 (c), per review r4 | PR4 already follows the study's route |
| r4 Q4a (v7 cohorts) | owner 19:01 | v7 waits for COHORT v6 |
| r4 Q4b (v7 contrasts at unequal effort) | owner 19:01 | v7 deferred |
| r4 Q4c (uncensored wall for v7 non-Luna arms) | owner 19:01 and 18:58 | v7 deferred; only gpt-6-luna calls are uncensored |
| r3 Q2 (live wall) | D890 (a) | wall removed for gpt-6-luna runs |
| r3 Q5 (DATA-01 cap) | D889 and DATA-01 r5's gates | LUNA6 authorizes nothing in DATA-01 |
| r2 Q7, Q3, Q6, Q5 part 2, Q1, Q9, Q8 | D887 (c), D887 (b), D887 scope, D885/D887/D890, R1/PR4, R2/PR5, R3 | carried |

---

## Appendix A. r5 verification log (commands I ran; outputs summarised)

1. `git status --porcelain` → clean. `git log -5 --oneline` → HEAD `673c7ee3` (D890), `3f3c4870`, `c4fd9a92`, `d702a534`, `47f62e88`. `git log -1 --format=%H` → `673c7ee31765c031fe2231b76a1e34b644c38a2e`. `sha256sum .tmp/runs/luna6/plan-r4.md` → `d9132c22…`. `ls .claude/consensus/luna6/` → `plan-r3.md`, `review-plan-sol-r3.log`.
2. `review-r4.log`: the lines exactly `codex` are 21, 1536 and 4626. The final message (4626 to end) was read in full; the exit file reads 0; the prompt is in `review-r4.sh`. `plan-r4.md` was read in full.
3. `decisions.md:1714-1872` (D885–D890) read in full. Part A lines 71, 77, 88, 89, 96, 97, 329, 330, 430, 515, 560, 568 printed; `grep COHORT v6` → :486, :512-520. `answers.txt` read in full (34 lines).
4. Code read this round:
   - `ai-dm-arena.ts:300-700` (parser, arms, interleave, dm-mode restrictions `:491-503`, the round wall `:423-428`), `:725-757`, `:840-1030` (`conversationConfig`, `runArena` with temporary out paths `:947`, `:987`);
   - `ai-dm-conversation.ts:262-263`, `:1262-1265`, `:1280-1316`, `:4338-4341`, `:4704-4707`, `:4796-4830`, `:5550-5790`, `:5840-5852`, `:6150-6210`, `:6290-6340`, `:7568-7571`; greps for `callPhase`, `timed_out`, `scheduledCellKey`, `dispatchAttempts`;
   - `src/vtt/agent-session-lifecycle.ts:1-200`; `src/vtt/agent-session.ts:43-58,80-100,140-178`; `src/vtt/turn-exhaustion-coordinator.ts:11,170-172,279-308,330-500`;
   - `tools/d569-v5/analyze-primary-pair.ts` (full); `tools/d569-blind-experiment.ts:20-40,900-1130`;
   - `tools/ai-dm-rerun-packet.ts:14-40,521-560,741-753,800-860,905-1000,1160-1370,1455-1500`.
5. Tests read: `ai-dm-conversation.test.ts:940-985,1630-1800,4140-4240`, plus a grep of every `startInvocations`/`resumeInvocations` length literal; `ai-dm-arena.test.ts:360-400,682-684,1825-1920,2240-2300`; `ai-dm-rerun-packet.test.ts` fixture greps; `tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl` (2 rows).
6. External, read-only: `~/dnd-slim-runs/d569-v5/runbook-84326354.md:48-62,255-300,995-1040,1225-1250,1440-1560`; `scripts/judge-staged.sh` (full), `advisory-gate.py` head; `judge-one.sh` greps (43 lines); `pool4-contrasts.py:69-94`; `cycle2.sh`; `sha256sum` of `judge-one.sh` (`6ae7f6b8…`), `judge-advisory.py` (`671bfedf…`), `pool4-contrasts.py` (`0c20f794…`), `judge-staged.sh` (`8004d85c…`), `advisory-gate.py` (`5641653a…`); `ls` of `~/dnd-slim-runs/d569-v5/`; the size and fields of a v5 dry-run blind row (≈ 73 KB).
7. DATA-01: `sha256sum .claude/consensus/data-01/plan-r5.md` → `461245068a49d6b1…`; greps for teacher, Responses, gpt-6-luna, xhigh and probe → lines 18, 20, 22, 32-37, 56, 67, 69, 71, 79, 85, 111-129, 138, 174, 206, 252, 342.
8. Fixtures: node over the v5 manifest (keys, cohorts, `execution`, `bootstrap`, `caps` 65536/8192/32768, `experimentWallMs` 240000, `secondFamily` pointer) and the second-family manifest head (hard-2 5118001–5118010, and the ledger entry naming 6207001–6207010); `sha256sum` of the v5 manifest (prefix `8c0bcb3c0afa8358`); `git grep -c gpt-6-luna -- src tools tests` → 0 files.
9. node arithmetic (scripts in the session scratchpad, not in the repo):
   - pool3 paired-difference variances (§3.5 table) and arm means 6.833 / 6.759 / 6.922;
   - normal-approximation power for bounds A and B, k = 20 and 40;
   - a 400-dataset bootstrap check of the rule (sizes 0.035 / 0.030 / 0.020 at q = 0.025 / 0.020 / 0.015; power 0.285 at Δ 0.5, 0.905 at Δ 1.0);
   - the refusal co-condition's pass rate with equal failure rates (1.0 / 0.12 / 0.0725 / 0.05 at p = 0 / 0.02 / 0.05 / 0.10);
   - the ceiling (600 calls, 300 h);
   - the r4 wall estimate re-derived (19,452 s; 13.51 h and 16.21 h).
10. `grep -- --interleave` over `~/dnd-slim-runs/*.sh` and `.tmp/runs/**/*.sh` → no wrapper combines it with `--dm-mode`; `ai-dm-arena.test.ts` has 12 interleave cases, none in a dm mode. `slot.sh` read: `timeout 1800`.
11. `date` → 2026-09-24 19:23 EDT.

## Appendix B. Inferred, not measured (the review should attack these)

- Two efforts of one model differ less, per cell, than two different models, so pool3's luna-medium − sol-high variance bounds the study's (bound A). Bound B adds a chi-square margin.
- The Kaplan–Meier equivalence of the censored nearest-rank rule under fixed-time censoring (standard; not derived here).
- Node clamps `setTimeout` delays above 2,147,483,647 ms to 1 ms (documentation).
- `LunaWitnessAdapter` (codex kind, delegating to `InProcessArenaAdapter`, `simulatedInProcessDispatchDelayMs: 0`) reproduces the frozen scenarios' dispatches under `--cli codex --model gpt-6-luna`. Red-first confirms; if not, STOP.
- A one-round `LEGACY_BLOCK_ARGS` run dispatches no speculation (K21).
- The SIMULATED blind dry run with `simulatedInProcessDispatchDelayMs: 50` records a first-attempt `modelWallMs` ≥ 50 (W7).
- V13e: the codex adapter and runner treat the fake binary's empty output as a finished call without an answer, with no retry that exceeds the wall budget of the check; the exact row outcome is reported, not judged.
- Concurrent PNG snapshot capture in one arena process is untested, which is why the study avoids `--interleave`.
- Per-invocation start-up time for 240 study cells (not measured); xhigh 1.5× to 2× high's time; judging cost.
- The installed judge chain (`judge-one.sh`, advisory gate) accepts the `luna6-effort/luna6` family path. `judge-one.sh:2,23` builds paths from any family, and V18 plus the first real tag will show it.
- The gpt-6-luna prices ($0.10/$0.50 per M) are unverified.

## Appendix C. Review r4 findings and where each is fixed

| Finding (review r4 order) | Disposition | Fix |
|---|---|---|
| **r4 P1-1** Lift under-scoped (gpt-5.6-luna unlifted, speculation kept, DATA-01 guard missing, mixed refusal) and over-scoped (non-Luna v7 arms) | **ANSWERED BY THE OWNER** (18:58: "gpt-6-luna only"; the speculation window stays), recorded in §0.1 and PR6–PR8. The remaining parts are FIXED | DATA-01 D890 implementation amendment with guard, log, route and witness (§7); `guardedLunaCall` in B1 (M70, M71); the mixed-route refusal kept and justified as the check the owner's reading forces (§2.2); the non-Luna v7 arm question gone with v7 (§6) |
| **r4 P1-2** Study on superseded cohorts without an explicit supersession | **ANSWERED BY THE OWNER** (19:01: "Study on v5") and FIXED | Amendment SA-2 records the study-only supersession of Part A :568 and :560, with the brutal-selection limitation (§3.1); fixture shas checked in V18; ingest refuses other seeds and caps (M80, M81) |
| **r4 P1-3** Sequence pin generated from production output | **FIXED** | LUNA6-SEQ deleted; the protocol state machine P1–P7 with record and frozen-literal corroboration (§4.4); W4 asserts only the frozen phase set and cross-channel agreement; red-first STOP rule |
| **r4 P1-4** Quality pipeline not specified or tested end to end; guard scoring not D569's | **FIXED** | §3.7's seven stages with exact commands, files and checks; T8 cases 7–10 run packet → key → three seat files → paired rows → call-log override with hand-derived results (M61, M74–M79); SA-1 preregistered as an explicit amendment (§3.3) |
| **r4 P2-1** No sample-size justification | **FIXED** | §3.5: variance bounds from pool3, normal approximation, V17 simulation with self-checks, calibrated q\*, the dominance rule and Q-POWER; the refusal veto removed after its operating characteristics were computed (Appendix E1) |
| **r4 P2-2** Arm blocks confounded with time | **FIXED** | §3.2: seeded random pair order, pair-adjacent arms in seeded random order, the seed recorded before the schedule exists; schedule properties tested (M82, M83, M88) |
| **r4 P2-3** Censored latency reported as ordinary latency | **FIXED** | §3.6: completion rate, censored count, quantiles that fall on a censored call reported as censored, ratios only over uncensored pairs (M84) |
| **r4 P2-4** Missing study mutants | **FIXED** | M74 sign, M75 key mapping, M76 id sets at equal count, M77 seat omission, M78 leak, M79 association, M80 cohorts, M81 caps, plus M82–M85, M88, M89 (§4.3) |
| **r4 P2-5** Call-log ordering under concurrent speculation | **FIXED** | two events per call, dispatch ordinal assigned before delegation, reconciliation by `(runId, ordinal)` with the `cellKey` carried (§2.4); M69 with an overlapping-call test |
| **r4 P2-6** V9/V14/V15 not self-contained | **FIXED** | V9 retired with v7; V14 and V15 give script names, invocations, checks, output lines and exit codes; V17 and V18 added likewise |
| **r4 P3-1** 120 h is not a ceiling | **FIXED** | 600 calls × 30 min = 300 h from the per-cell call bound (§3.9) |
| **r4 P3-2** Stale cache probe without remediation | **FIXED** | P0a failure does not block B1; gpt-6-luna screenshot entries move to an isolated home (M87); no gpt-6-luna screenshot run before that (§1.6) |

Review r4's scope table, item by item: PR4 kept and Q-ESC removed; PR5 kept; PR6 and PR7 owner-confirmed; PR8 owner-confirmed; PR9 retired; PR10 replaced by §7 and PR11. Review r4's adapter-boundary note (no real call beyond 180 s) is addressed by V13e.

Items from round 3 that review r4 still marked open: **r3 P2-2** (T7b oracle) is closed by §4.4; **r3 P3-1** (self-containment) by V14/V15/V17/V18.

## Appendix D. Findings still closed from earlier rounds

Review r4 marked CLOSED: r3 P1-2 (v7 provenance; now moot with v7 deferred), r3 P1-3 (M39a runtime sentinel; M56 `wx`), r3 P1-4 (DATA-01 authorization), r3 P2-1 (headroom formula), r3 P2-3 (launcher cwd, stdio, exit code). Review r3 had closed r2 P1-1, P1-2, P1-3, P2-1 and P2-2, and r1 P1-1, P1-2, P1-3, P2-1, P3-1 and P3-2 were closed at r2.

## Appendix E. Findings against our own work (full length)

**New this round.**

1. **r4's refusal co-condition would have vetoed xhigh almost always.**
   - r4 §3.2 required the xhigh − high refusal-risk difference to have a cluster-bootstrap 97.5th percentile ≤ 0.00, copying D569's success-label rule (`d569-blind-experiment.ts:976-986`, `D569_REFUSAL_RISK_MARGIN = 0.00`).
   - In a 20-cluster, 120-pair design, one cluster with one more xhigh failure than high failures puts positive mass in most bootstrap draws.
   - I simulated it with equal failure rates in both arms [V: node, 400 datasets]: it passes 12 % of the time at 2 % and 7 % at 5 %. At a 2 % rate, the chance of no xhigh-only failure at all among 120 pairs is 0.093.
   - So r4's rule would have picked high on noise whatever the quality difference. r4 adopted the rule without checking its operating characteristics.
   - Review r4 did not raise it; I found it while doing the power analysis review r4 asked for.
   - Removed as a veto; reported as a secondary (§3.4).
2. **r4's call log would have been written into the arena's per-cell temporary directory.**
   - r4 put `lunaCallLogPath(config.outPath)` inside `runConversation` (r4 §2.3, :4341). But the arena gives each cell a temporary `outPath` (`ai-dm-arena.ts:947` `resolve(temporaryDirectory, \`${room}-${rep}-single.jsonl\`)`, `:987` likewise) [V].
   - Every arena-level call log r4 relied on would have been missing: W1, W3, V13b's `<out>.luna-calls.jsonl`, and the study's call logs.
   - Found by reading `runArena` for the study design this round.
   - Fixed by the arena passing the arena-level path as a run option (§2.3), with M72 and W1's assertion. M73 covers the related cell-key error, which the same reading exposed (`round` is always 1 per arena cell; the rep lives in `scheduledCellKey`).
3. **r4's LUNA6-SEQ treated a capture of production output on the unchanged base as an independent oracle.** Part A :96 treats a comparison of current outputs as insufficient, and review r4 P1-3 said so. The base being unchanged did not make the capture independent of the code that produced it. Replaced by the written protocol (§4.4).
4. **r4 ran the study as eight fixed arm blocks** (ABBA across four strata), confounding arm with provider time within every mode × basis (review r4 P2-2).
5. **r4 reported percentiles over values capped at the guard as if uncensored** (review r4 P2-3).
6. **r4 called 240 × 1,800 s a ceiling while noting that advice cells make several calls** (review r4 P3-1). The protocol bound is 4 calls per advice cell: 300 h, not 120 h.

**Carried from r4 (still true, recorded again so this plan stands alone).**

7. r2 and r3 asserted that the 180 s round wall does not abort the primary session, and it does.
   - The r2 grep found only method references (`roundDeadline.signal`) and missed the deadline **passed as an argument** to `coldStartRound`/`resumeRound`, where `openDispatch` clamps `timeoutMs` and hands `deadline.signal` to the adapter.
   - r3 built a pilot, a budget table and a v7 wall on the claim. Review r3 caught it (P1-1), and the supervisor verified it (D889).
   - Rule: trace the object through calls, not its name through greps.
8. r3's M39 killer was a source scan, not a runtime observation; replaced by M39a's load sentinel.
9. r3's mutation protocol never re-ran killers after restoring (Part A :89); §4.2 steps 5–7 fix it and enforce the predicted failure set.
10. r3 said DATA-01's pilot was "authorized" if two LUNA6 cost tests passed, contradicting D888 and its own §5.4; withdrawn (§7).
11. r3's headroom formula printed `(500 − H)/N` while giving H as a percentage; the arithmetic used `500 × (1 − h)/N`; corrected.
12. r3 kept a Q4a option (wait for COHORT v6) that contradicted its unconditional "v7 from v5 bytes"; removed in r4. The owner has since chosen to wait for COHORT v6 for v7 itself (§6), which is consistent with removing v7 from this plan rather than keeping a branch inside it.
13. r3's V6a compared against a fixed base; §8.2 uses each batch's own `<base>`.
