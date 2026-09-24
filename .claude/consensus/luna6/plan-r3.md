# LUNA6-01: gpt-6-luna replaces gpt-5.6-luna in every Luna role (plan r3)

- Revision r3, 2026-09-24, Claude (Opus 5.5). Plan fix r2 of `plan-r2.md` (sha256 `b86d1e23c648a486…`, reviewed by codex gpt-5.6-sol high r2: REVISE 3 P1 / 3 P2 / 1 P3 plus 4 PARTIAL round-1 items, `.tmp/runs/luna6/review-r2.log`, exit 0).
- Base: main `47f62e88` (D888, committed while r3 was being written). Since the r2 base `45c2056a` it changes records only: `git diff --stat 45c2056a 47f62e88 -- src tools tests` is empty, and the commit adds `.claude/consensus/data-01/plan-r4.md` and 26 lines of `decisions.md` (D888) [V]. Every code and test line number from r2 still holds, and `45c2056a` remains the V6 comparison base.
- Status: DRAFT r3, for codex sol review r3. The open owner questions are in §6.4; §6.5 lists the questions a ruling or a supervisor reading removed.
- Evidence tags: **[V]** = I checked it with a command this round (Appendix A). **[V-r2]** / **[V-r0]** = checked by r2 / the draft, not re-run. **[R]** = taken from a record, not re-verified. **[I]** = inferred.
- Change tags: **(r2 Pn-k)** = fix for review r2 finding k of severity n, numbered in the review's order (Appendix D). **(r1 Pn-k)** = a round-1 item that r2 left PARTIAL. **(R1)/(R2)/(R3)** = a D887 supervisor reading (§0.2). Untagged text is carried from r2.
- The only file written this round is this plan. I ran no tests, builds or agents, started no background process, and made no code or git change.

---

## 0. The rulings, the readings, and what they cover

### 0.1 The ruling (D887, verbatim, `.claude/decisions.md:1752`) [V]

> Owner, Luna scope re-put with corrected facts (D886 finding): "(a) at xhigh, (b) keep their effort". Ruling: every script-chosen Luna run (D569 arms, DATA-01 teacher, live play) moves to gpt-6-luna at xhigh; runs where effort is the variable under study (generate-data low, the D484 low/medium loop, the D425 low floor) move to gpt-6-luna at their stated effort; the code's no-flag default stays gpt-5.6-sol (legacy-invariance pins untouched).

### 0.2 Supervisor readings of D887 (r2 P1-1)

These are the **supervisor's** readings of the quote above. They are already recorded in D888 as "SUPERVISOR READINGS of D887 given to the fix agent (not owner rulings)" (`.claude/decisions.md:1771` onward) [V]. They are not owner words and are not owner questions, and the owner may strike any of them.

- **(R1) Live escalation.** Part A :330 makes escalation part of live play: "two validation failures or a refusal trigger a fresh Luna-high session" [V]. Under the (a) clause, "every script-chosen Luna run (… live play) moves to gpt-6-luna at xhigh", that session becomes a **fresh gpt-6-luna xhigh session**. There is no `max`, because the ruling names xhigh. The mechanism is not removed, because the ruling moves runs and does not delete them. There is no lower effort, because that would be a Luna run in live play below xhigh. Part A :330's "next turn returns medium" becomes "next turn returns to the xhigh base". This replaces r2's Q1.
  - *Consequence, reported rather than asked:* the base and escalation routes are now identical. Escalation therefore differs from the arm-base correction only by the fresh session and the escalation instructions (`tools/ai-dm-conversation.ts:4358-4363`) [V]. The pilot reports the escalation recovery rate for information (R4 in §6.3).
- **(R2) The two Luna-medium quality gates** are the screenshot comprehension gate ("Luna medium every class ≥ 0.9 gates picture reruns", Part A :456) and the flat sight/cover probe that gates elevation ("Sol high then Luna medium", :459) [V]. They are script-chosen Luna runs, and effort is not the variable they study, so they move to **gpt-6-luna xhigh**. :456's "low research-only" arm is an effort study and stays **low** under (b). This replaces r2's Q9.
- **(R3) The codex explore route.** The owner's global `~/.claude/CLAUDE.md:108-109` says "Route bounded Explore work to `gpt-5.6-luna` at medium reasoning" [V]. That is a codex helper setting for the supervisor, not a game Luna run, so it is **outside D887 and does not change**. This replaces r2's Q8.
  - *Plan extension of R3 (mine, flagged for the reviewer):* the two history wrappers that call `codex exec -m gpt-5.6-luna` as an availability or tool probe are tooling, not game runs, and are outside D887 on the same reading. They are `~/dnd-slim-runs/rejudge-driver.sh:5` and `.tmp/runs/conv-split-01/wait-and-dispatch.sh:7` [V].

### 0.3 Role table

| Luna role today (gpt-5.6-luna) | Effort today | Source | Class | New route |
|---|---|---|---|---|
| Live play: player phase, speculation, arm-base correction and adjustment | medium | Part A :329 [V]; correction and adjustment run on the base planner (`ai-dm-conversation.ts:4200,4354-4357`) [V] | (a) | gpt-6-luna **xhigh** |
| Live escalation (2 validation failures or a refusal) | high, fresh session | :330 [V] | (a) by **R1** | fresh gpt-6-luna **xhigh** session |
| D569 arms (blind, advice, blind-minhint) | high | `tools/d569-blind-experiment.ts:34-39,80-104` [V-r2] | (a) | gpt-6-luna **xhigh**, registration v7 (§4) |
| DATA-01 teacher (direct Responses API) | high | DATA-01 plan r4:18,56 [V] | (a) | gpt-6-luna **xhigh** (§5) |
| Screenshot comprehension **gate** | medium | :456 [V] | (a) by **R2** | gpt-6-luna **xhigh** |
| Flat sight/cover **gate** for elevation | medium | :459 [V] | (a) by **R2** | gpt-6-luna **xhigh** |
| Screenshot "low research-only" arm | low | :456 [V] | (b) | gpt-6-luna low |
| RL corpus `tools/rl/generate-data.ts` | low (K6) | `:49-53,:229-233,:283-284` [V-r2] | (b) | gpt-6-luna **low** |
| D484 low/medium experiment loop | low, medium | :484 [V] | (b) | gpt-6-luna low / medium |
| D425 "Luna low intelligence floor" | low | :425 [V] | (b) | gpt-6-luna low |
| D449 training target "against Luna low" | low | :449 [V] | (b), plan reading: it is the D425 floor | gpt-6-luna low |
| Room D slice-3 "Luna-medium distillation" (shelved) | medium | :561 [V] | (a), plan reading | gpt-6-luna xhigh if unshelved |
| Teacher/student measurement setting ("includes Luna medium") | medium | :430 [V] | (a), plan reading | gpt-6-luna xhigh |
| Arena/conversation **no-flag default** (not Luna) | gpt-5.6-sol medium | `ai-dm-arena.ts:379,667`; `ai-dm-conversation.ts:1121,1256` [V-r2] | (c) | **unchanged** |
| VTT/Discord DM bridge default (not Luna) | gpt-5.6-terra medium | `src/vtt/dm-bridge/contracts.ts:98-99` [V-r2] | not a Luna run | unchanged (§6.5) |
| Supervisor codex MCP explore route | gpt-5.6-luna medium | `~/.claude/CLAUDE.md:108-109` [V] | outside D887 by **R3** | unchanged |

"Plan reading" marks a classification made by this plan, not by the supervisor; r2 made the same readings and review r2 did not contest them.

**What (c) removes (carried from r2).** Every r2 removal stands: no default repointing, no legacy-oracle change, no edits to the default assertions, no row budget fields, and no R5. After (c), **no runner default chooses a Luna model**.

**Plan reading on the launcher (r2 P1-1) (r2 P2-3).** In r2, an (a) live-play run got its route from flags hand-written into an external wrapper, and that route could not be tested. r3 assembles the (a) route in a new in-repo launcher, `tools/luna-route-launch.ts` (§1.9, batch B5). The launcher is not a runner default. The runners' no-flag defaults stay sol/medium under (c), and their flags stay free for (b) studies. The launcher exists so that the (a) route and its budget provenance can be tested. It holds no model literal: it imports `LUNA_PRODUCTION_ROUTE` and `LUNA_LIVE_ESCALATION_ROUTE` from `tools/model-routes.ts`.

---

## 1. Touch points

### 1.1 Census: matching lines vs literal occurrences

Unchanged from r2. Recounted this round at both `45c2056a` and `47f62e88`, the counts are identical: 197 matching lines in 36 files, 301 literal occurrences, and 186 occurrences outside records [V]. D888 adds no `gpt-5.6-luna` literal. The per-file counts are in r2 §1.1. Review r2 reproduced 194 lines / 36 files / 298 literals at `f8234034` [R: review-r2.log].

### 1.2 Code that changes

| File:line | What it does today | Change | Batch |
|---|---|---|---|
| new `tools/model-routes.ts` | n/a | `LUNA_MODEL`, `HISTORICAL_LUNA_MODEL`; `LUNA_PRODUCTION_ROUTE` = gpt-6-luna xhigh (a); **`LUNA_LIVE_ESCALATION_ROUTE` = gpt-6-luna xhigh (R1)**; `lunaStudyRoute(effort)` (b); `SESSION_BUDGETS` (empty at B1); `resolveSessionTimeout` (§3.3). The effort type is imported with `import type` only (M39) | B1 |
| `tools/ai-dm-arena.ts:311` `parseArenaArgs`, `:675` timeout default | 120 000 ms (legacy) / 240 000 ms (dm-mode) for every route | Call the resolver. Add an optional third parameter, `options: { budgets?: SessionBudgetTable } = {}`, for test injection. No new config field (§3.3) (r2 P2-3). The bytes of the sol/medium no-flag path are unchanged (D887) | B1 |
| `tools/ai-dm-conversation.ts:1084` `parseConversationArgs`, `:1264` | same | same | B1 |
| `tools/ai-dm-screenshot-probe.ts:2175` parser, `:2049-2089` answerer | spawns `codex` with no timeout [V-r2] | Optional `--timeout-ms`, plus an optional second parameter `{ budgets? }`. Kill the child on expiry. gpt-6-luna uses the resolver (path `screenshot`) | B1 |
| **new `tools/luna-route-launch.ts`** | n/a | The (a) launcher: exact route argv, refused passthrough flags, launch provenance written before the runner is spawned as a child process. It imports no runner module (§1.9, §3.5) | **B5** |
| `SESSION_BUDGETS` entries | n/a | Pilot-derived entries, each with its evidence D-id (§3.4) | B1b |
| `tools/rl/generate-data.ts:49-53,113,193-197,229-233,283-284` | v1 manifest, gpt-5.6-luna low, 120 s | `arena-rl-batch-v2`, gpt-6-luna low (b), timeout from the table. Resuming a v1 manifest throws a named error | B2 (after B1b) |
| `tools/d569-blind-experiment.ts` | v5-only registry | v7 exports **beside** v5; no v5 rename or value change (§4.4) | **B3b** |
| new `tools/d569-v7/{analyze-primary-pair,validate-first-arm}.ts` | n/a | v7 operators (§4.4) | **B3b** |
| new `tests/fixtures/d569-blind-experiment-manifest-v7.json` | n/a | Hand-written from v5 (§4.3) | **B3a** (alone, §4.5) (r2 P1-2) |

`max` is **not** added to any effort union (R1).

### 1.3 Code that does NOT change (D887)

- The no-flag defaults and `roundWallMs` 180 000, as in r2 [V-r2].
- The runners' escalation flags keep no code default (`ai-dm-conversation.ts:1125-1130`, `ai-dm-arena.ts:383-392`) [V]. R1 is carried out by the launcher's argv (§1.9) and by Part A :330 superseded by reference. No runner code changes for it.
- The runners' stdout. r2 had the runners print the resolved budget at start. **r3 drops that line** (r2 P2-3): the launcher records the budget (§3.5), and runner output stays byte-identical.
- Out of scope, as in r2: the Terra bridge, `scripted-skirmish.ts`, `agent-conformance.ts`, and `~/.codex-aidm/config.toml`.

### 1.4 History that lives in code or fixtures: byte-frozen

Unchanged from r2: the D575 registry, the v5 manifest (raw `8c0bcb3c…` = launch provenance [V], canonical `0316244a…` [V this round with an independent tool, §4.5]), the second-family and prepatch fixtures, every v5 export, `tools/d569-v5/*.ts` and the installed v5 scripts, the legacy fixtures and legacy-invariance test, and `authorized-arena-row.SIMULATED.jsonl`.

### 1.5 Tests: placement is fixed in advance (r2 P2-2) (r1 P2-4)

r2 put the wiring tests in a new file and, if the file broke the 5 s rule, moved them into `ai-dm-arena.test.ts`. That made one test file either byte-identical or append-only depending on a later measurement, and V6 checked only one of those states. **r3 fixes each file's placement now:**

| Class | Files | Check |
|---|---|---|
| **FROZEN** in every batch | `ai-dm-legacy-invariance.test.ts`, `ai-dm-conversation.test.ts`, `d569-blind-experiment.test.ts`, `d569-v5.test.ts`, `d569-second-family-manifest.test.ts`, `rl-extract-sft.test.ts`, `ai-dm-rerun-packet.test.ts`, `ai-dm-board-delivery.test.ts`, plus the §1.4 fixtures and code | V6a: `git diff --exit-code` |
| **APPEND-ONLY**, and only in the named batch | `ai-dm-arena.test.ts` (B1 appends describe `LUNA6 budget wiring`; B5 appends describe `LUNA6 route witnesses`); `ai-dm-screenshot-probe.test.ts` (B1 appends describe `LUNA6 budget wiring`) | V6b: exact byte prefix plus a suffix check. In every other batch these two files are FROZEN relative to the previous LUNA6 landing |
| Edited | `rl-generate-data.test.ts` (B2, as in r2) | V4 and mutants |
| New files, each ≤ 5 s solo (V10) | `model-routes.test.ts` (T1), `d569-v7.test.ts` (T3), `luna6-guard.test.ts` (T4), `luna6-route-launch.test.ts` (T7a) | V10. On failure, STOP and report; nothing is relocated |

**Why the runner-importing tests are appended rather than put in new files.** The T2 parser tests and the T7b route witnesses must import `tools/ai-dm-arena.ts` and `tools/ai-dm-conversation.ts`. `ai-dm-arena.test.ts` already imports both: it imports from `tools/ai-dm-arena` (import block ending at `:56`) and `parseConversationArgs` and `runConversation` from `tools/ai-dm-conversation` (`:69-72`) [V]. Appending therefore adds no import cost. An appended block reuses the host's existing top-level bindings (for example `LEGACY_BLOCK_ARGS`, `:682`) and declares imports only for names the host does not already bind; a duplicate binding fails V2. A new file would pay that import cost in full, against a 5 s cap. The screenshot parser tests go into `ai-dm-screenshot-probe.test.ts`, which already imports that module. New tests use `tests/helpers/test-filesystem` or `declareTestInputs`, because `ast-grep-rules/no-raw-fs-in-tests.yml` forbids importing `fs` in tests [V]. T4 follows the source-scan precedent in `tests/unit/source-is-greppable.test.ts` [V].

### 1.6 External configs and scripts (read only here)

- The model caches are as in r2 [V-r2]. `~/.codex-aidm` has no gpt-6-luna entry; `~/.codex` does (efforts low..max).
- `~/dnd-slim-runs/**` and `.tmp/runs/**` history wrappers are never edited or re-run (census in §1.9).
- `~/.claude/CLAUDE.md` explore route: unchanged (R3).
- After landing, the supervisor updates the memory note `model-routing-2026-09-08.md`. Its line 3 still says "luna becomes gpt-6-luna xhigh everywhere, scope being re-confirmed" [V].

### 1.7 Records are never rewritten

As in r2. The landing D-entry supersedes these Part A lines **by reference**: :329, :330 (R1), :425, :430, :449, :456 (R2), :459 (R2), :484, :561 and :568.

### 1.8 Shelved branches

As in r2: the new registration is v7, following the `_V7` suffix convention.

### 1.9 Run wrappers: census of today's wrappers, and the new artifacts (r2 P1-1)

**Census method [V].** I grepped for `gpt-5.6-luna` and `gpt-6-luna` in the script files (`.sh .bash .py .mjs .js .ts .md`) under `~/dnd-slim-runs/` (skipping the 2,690 files under `stale-worktrees/`, which have no Luna hit), under `.tmp/runs/**/*.sh`, in the repo's `tools/`, `scripts/` and `orchestration/`, and in `package.json`. Continuation lines were joined. Excluded: 4 hits in prose briefs and the two LUNA6 review scripts (sol).

Result: **66 files, 82 invocation lines that select a Luna route.** The 82 lines are 55 arena, 23 screenshot probe, 1 conversation, 2 `codex exec` probes and 1 in-repo argv. There are also 14 function-call lines that feed Luna routes into generic invocation lines, and 1 runbook prose line. By location: 37 files under `~/dnd-slim-runs/`, 28 under `.tmp/runs/`, and 1 tracked file (`tools/rl/generate-data.ts:283`). `scripts/`, `orchestration/` and `package.json` have none, apart from the `rl:generate-data` script name (`package.json:44`). The newest game-run wrapper is the D569 v5 runbook (2026-09-09); the newest file overall is the codex availability probe (2026-09-22).

Exact route-bearing argv, grouped by identical tokens. The route flags are verbatim and in the order written; other flags on the same line are omitted. Columns: runner | route flags | line count | file:line | class if re-run:

| Runner | Route flags (verbatim, in order) | n | Where | Class if re-run |
|---|---|---:|---|---|
| arena | `--model gpt-5.6-luna --effort medium --timeout-ms 240000` | 14 | `.tmp/runs/`: run-brutal-b-arms.sh:4,5; run-cap-arms.sh:6; run-e1c-judged.sh:3,4; run-e1cb-judged.sh:7,8; run-e1cc-rep.sh:4,5; run-pool-reps.sh:4; run-pool-screen.sh:5; run-reruns-after-caps.sh:5,7,8 | (a) live-route evaluation → launcher |
| arena | `--model gpt-5.6-luna --effort medium` | 5 | `.tmp/runs/`: run-e2-30rows.sh:3,4; run-e2-r110.sh:3,4; run-miniab-flags.sh:12 | (a) → launcher |
| arena | `--timeout-ms 240000 --model gpt-5.6-luna --effort medium` | 1 | run-d510-medium.sh:10 ("rerun … on Luna MEDIUM for comparison numbers") | (b) |
| arena | `--model gpt-5.6-luna --effort low` | 5 | run-d440-arms.sh:14; run-d441-arms.sh:9; run-d444-quads.sh:8; run-d514-reduced.sh:6; run-resume-arms.sh:36 | (b) D484/D425 |
| arena | `--timeout-ms 120000 --model gpt-5.6-luna --effort low` | 13 | run-d447-direct.sh:9; run-d447.sh:17; run-d466-control.sh:10; run-d483-cavfull.sh:12; run-d483-luna-protocol.sh:9; run-d483-rerun.sh:13; run-d490-override.sh:9; run-d500-transport.sh:9; run-d500-transport-2.sh:9; run-d500-transport-3.sh:9; run-d500-transport-4.sh:9; run-post-d443.sh:28; run-probe-then-d447.sh:18 | (b) |
| arena | `--timeout-ms 240000 --model gpt-5.6-luna --effort low` | 1 | run-d499-sgating-240.sh:10 | (b) |
| arena | `--model gpt-5.6-luna --effort low --timeout-ms 240000` | 5 | `.tmp/runs/run-d573-low.sh:4,7,8`; adoption-ab.sh:6; rejudge-driver.sh:17 | (b) |
| arena | effort as a variable: `--model gpt-5.6-luna --effort $eff`; `--model gpt-5.6-luna --effort "$effort"`; `--timeout-ms "$tmo" --model gpt-5.6-luna --effort "$effort"`; `--timeout-ms 240000 --model "$model" --effort "$effort"` | 1 + 1 + 1 + 3 | `.tmp/runs/run-miniab-classic5.sh:6`; run-d443-arms.sh:8; resume-after-reboot.sh:34; run-d513-image-on.sh:10, run-d514-reduced.sh:10, run-d521-capture-only.sh:7 (fed by `run_arm … gpt-5.6-luna low\|medium` at :17-19, :12-14, :9-11) | (b) |
| arena, escalation | `--model $m --effort $e $extra --timeout-ms 240000` with `extra="--escalation-model $em --escalation-effort $ee"`; `run t-ll-sl gpt-5.6-luna low gpt-5.6-sol low`, `run t-lm-sl gpt-5.6-luna medium gpt-5.6-sol low`, `run t-ll-lm gpt-5.6-luna low gpt-5.6-luna medium` | 1 | cycle2.sh:8,10,18-20 (2026-08-28; the only history wrapper that uses escalation) | (b) tiered study |
| arena, D569 | `--dm-mode blind … --model gpt-5.6-luna --effort high --timeout-ms 240000` | 4 | `d569-v5/runbook-84326354.md:269,282,1013,1025` | (a) D569 → v7 runbook (§4) |
| conversation | `--timeout-ms 120000 --model gpt-5.6-luna --effort low` | 1 | smoke-3round.sh:6 (D459 smoke, 30 rows) | (b) |
| screenshot | `--models gpt-5.6-luna:medium` | 7 | `.tmp/runs/`: run-d562-probe24-r5d-seed2.sh:3; run-e1-arms.sh:4; run-e1-replication.sh:4; run-e1b-arms.sh:5; run-e1b-seed2.sh:4 · run-d527-iso-baseline.sh:4; run-d541-probe24-r4-seed2.sh:4 | (a) by R2 → launcher `--runner screenshot` |
| screenshot | `--models gpt-5.6-luna:medium,gpt-5.6-luna:low` / `…:low,…:medium` | 7 + 3 | `.tmp/runs/`: run-d536-probe24-r5b.sh:4; run-d561-probe24-r5b-64.sh:3; run-d562-probe24-r5c.sh:3; run-d562-probe24-r5d.sh:3 · run-d536-probe24-r3/r4/r5.sh:4 · run-d525-glyph-probe.sh:3; run-d525-probe.sh:3; run-d525-probe24-inc4.sh:4 | per entry: medium (a) R2, low (b) |
| screenshot | `--models gpt-5.6-luna:low` | 6 | `.tmp/runs/`: run-d568-low-baseline.sh:5; run-d568-low-seed2.sh:5; run-d568-low-t1.sh:4; run-d568-t1.sh:4,6; run-d568-t2.sh:4 | (b) research arm |
| codex exec probe | `-m gpt-5.6-luna -c model_reasoning_effort='"low"'`; `-m gpt-5.6-luna` | 2 | rejudge-driver.sh:5; `.tmp/runs/conv-split-01/wait-and-dispatch.sh:7` | outside D887 (R3 extension) |
| in-repo argv | `'--model', 'gpt-5.6-luna'` … `'low'` | 1 | `tools/rl/generate-data.ts:283` | (b) → B2 |

Unprefixed file names are in `~/dnd-slim-runs/`. **Finding: no current wrapper selects Luna for live play.** Every wrapper above is dated history, and the D887 migration of live play needs new artifacts.

**New artifacts (exact argv).**

1. **Launcher (in repo, B5), invoked as** `node node_modules/vite-node/vite-node.mjs tools/luna-route-launch.ts --runner <arena|conversation|screenshot> <passthrough…>`.
   - Route prefix, exact:
     - arena and conversation: `--cli codex --model gpt-6-luna --effort xhigh --escalation-model gpt-6-luna --escalation-effort xhigh`
     - screenshot: `--models gpt-6-luna:xhigh`
   - **No `--timeout-ms`.** The runner resolves `route_table:<pilot D-id>` itself (§3.3), and the launcher records the same resolution (§3.5).
   - Refused passthrough flags: exit 2, nothing written. The list is `--cli --model --effort --escalation-model --escalation-effort --timeout-ms --models --dm-mode --arm --arm-combat-model --arm-override-policy --arm-instruction-source --arm-kb --local-base-url --local-model --local-api-key --local-think --round-wall-ms`. They are refused for these reasons:
     - All three parsers keep the **last** value of a repeated flag (`values.set`: `ai-dm-arena.ts:353`, `ai-dm-conversation.ts:1106`, `ai-dm-screenshot-probe.ts:2209`) [V]. An appended `--effort medium` would therefore silently override the route (M36).
     - `--dm-mode` belongs to the D569 runbook, and the parsers refuse escalation under an explicit mode anyway (`ai-dm-arena.ts:499`, `ai-dm-conversation.ts:1229`) [V].
     - `--arm*` runs are studies.
     - 180 000 is the only `--round-wall-ms` value accepted (`ai-dm-arena.ts:424-428`) [V-r2].
   - Child process, exact. cwd is the checkout, stdio is inherited, and the launcher exits with the child's code:
     - arena: `[process.execPath, 'node_modules/vite-node/vite-node.mjs', 'tools/ai-dm-arena.ts', '--', …prefix, …passthrough]`. This is the form proven by `ai-dm-arena.test.ts:2053-2073` [V: read].
     - conversation: the same with `'tools/ai-dm-conversation.ts'`. This is the form `~/dnd-slim-runs/smoke-3round.sh:6` used, and it produced 30 rows [V: `wc -l`]. I did not trace how the separator reaches the parser (`ai-dm-conversation.ts:7690` slices `process.argv.slice(2)`) [I]. V13b proves the form.
     - screenshot: `[process.execPath, 'node_modules/vite-node/vite-node.mjs', 'tools/ai-dm-screenshot-probe.ts', …prefix, …passthrough]`, with **no** `--`, because that parser does not strip one (`:3706-3722`) [V]. This is the history form, which completed with exit 0 (`d541-probe24-r4-seed2.log`) [V].
   - **The launcher never imports a runner module.** All three runners start `main()` when they are loaded under vite-node and certain flags are present in `process.argv`: arena on `--rooms` and `--seed` (`ai-dm-arena.ts:1042-1048`), conversation on `--rounds` or `--fixtures` (`ai-dm-conversation.ts:7693-7699`), screenshot on `--models` and `--states` (`:3727-3741`) [V]. A launcher run with those flags that imported a runner would start a second, unintended run (M39, risk R13).
2. **Wrappers (external, written by the supervisor in Phase 4, under `~/dnd-slim-runs/luna6/`).** Each wrapper is one launcher call. The study flags (basis, rooms, seed, out) are chosen per run and recorded, with the wrapper's sha256, in the launch D-entry.
   - `live-arena.sh`: `cd <checkout at the landed commit> && node node_modules/vite-node/vite-node.mjs tools/luna-route-launch.ts --runner arena --basis <b> --rooms <n> --reps <r> --seed <s> --out <absolute path outside the repo>`
   - `live-conversation.sh`: `… --runner conversation --fixtures <dir> --rooms <n> --rounds <r> --out <absolute path outside the repo>`
   - `gate-comprehension.sh` (:456) and `gate-sight-cover.sh` (:459): `… --runner screenshot --states 24 --seed <s> --images-root dnd-slim-runs/<tag>-images --out dnd-slim-runs/<tag>.jsonl <gate flags>`. The gate flags come from the gate's own registration. The :459 Sol-high stage is a separate direct `--models gpt-5.6-sol:high` call, which LUNA6 leaves unchanged.
3. **D569 v7 runbook v3** (`~/dnd-slim-runs/d569-v7/runbook-<sha8>.md`, Phase 4). It keeps v5's explicit-flag form, with the route flags `--dm-mode blind … --cli codex --cli-bin <absolute codex path> --model gpt-6-luna --effort xhigh --timeout-ms <D569_V7_EXPERIMENT_WALL_MS>`. The explicit timeout is the registered experiment wall, and the v7 validator checks it (§4.4). It does not go through the launcher.
4. **(b) study wrappers** call the runner directly with `--model gpt-6-luna --effort <low|medium>` and, after B1b, no `--timeout-ms` (route_table). They declare their budgets in their preregistration (Part A :430 "later studies declare budgets") [V].
5. **Pilot wrappers** (`~/dnd-slim-runs/luna6-pilot/`, §3.4) call the runner directly with `--timeout-ms 1800000`. They sit outside `luna6/`, so V14 does not flag them.

**What is enforced, and by what.** In the repo, the launcher is the only code that assembles an (a) live or gate argv. Its argv, its refusals and its provenance are unit-tested (T7a), and the routes it produces are witnessed through both runners (T7b). Outside the repo, a wrapper that bypassed the launcher cannot be stopped by code, because D887 (c) leaves the runner flags free. It is caught by the V14 audit and by the launch D-entry, which records each wrapper's sha256.

---

## 2. Pins, tests and mutants

### 2.1 Where each new expectation comes from (never from our own output)

| New expectation | Independent source | Forbidden shortcut |
|---|---|---|
| `LUNA_PRODUCTION_ROUTE`, `LUNA_LIVE_ESCALATION_ROUTE`, `lunaStudyRoute` literals | D887 verbatim (§0.1) and R1 | `expect(route).toEqual(LUNA_PRODUCTION_ROUTE)` |
| `SESSION_BUDGETS` entries | The pilot D-entry (§3.4 rule) | Reading the table in the test; re-pinning for load |
| Legacy no-flag defaults | Unchanged `ai-dm-legacy-invariance.test.ts` | none |
| **Launch argv literals** | §1.9, typed by hand | `expect(argv).toEqual(buildLunaRouteLaunch(…).argv)` |
| **Launch provenance literal** | §3.5 schema; values from the injected test table (`450000`, `LUNA6-TEST`) and an injected clock and commit | Reading `SESSION_BUDGETS` or the real clock |
| **Route-witness expectations** | Every dispatched invocation is `['gpt-6-luna','xhigh']` (D887 + R1). The phase set `{'initial','speculation','adjustment','correction'}` is the existing independent literal in `ai-dm-conversation.test.ts:4184-4186` [V] | Collecting phases from a run and asserting them back |
| v7 manifest, raw and canonical sha256, amendment list | The V7-TEXT and V7-FREEZE-1 D-entries (§4.5) | Generating the manifest from code; computing a sha inside a test |
| **M21 selection literal** | Path from §4.3; version literal; raw sha from V7-FREEZE-1 | Reading `D569_V7_MANIFEST_PATH` in the test |
| **M22 witness commits** | `90484d453b7b6d1fe63ed28c0a53570a80e158e6` = `D569_ORIGINAL_COMMIT` (`tools/d569-v5/validate-first-arm.ts:75`) [V]; launch commit `45c2056a6c48a05b5f14e79f4717168232cbc312` (this base, any distinct 40-hex value) | Importing either value from code |
| Append-only title lists (`titles.json`) | §2.3, typed by hand | Listing titles from the candidate file |
| v5 raw sha `8c0bcb3c…` | 2026-09-09 launch provenance | The current file's sha |
| Guard allowlist | The §1.1 census adjusted by the planned diffs | Counting at test time |

### 2.2 Mutation protocol (r2 P1-3) (r1 P1-4)

Unchanged from r2 (Part A :88). Each mutant runs on a clean checkout of the candidate SHA under `PhpstormProjects`, through `slot.sh`, with `--maxWorkers=1`, using `.tmp/runs/luna6/impl/<batch>/mutate.mjs <id>`. The script does the following:

1. Records the target's sha256 (ORIG).
2. Runs the killer **unmutated**. It must exit 0 with exactly one test passed; a skip or filter-out fails the step. Titles are regex-escaped for `-t`.
3. Applies an exact-string replacement that must match exactly once, and prints `CHANGED <file>:<line>: <old> -> <new> (1)`.
4. For a code mutant, runs `npx tsc -b --force` and requires exit 0.
5. Runs the killer again and tees the output to `<id>.log`.
6. Writes the original bytes back, requires sha256 = ORIG, and prints `RESTORED <sha>`.

**Kill evidence, tightened (r2 P1-3).** A kill needs all three of these:
- a non-zero exit;
- the named test listed as failed;
- an assertion diff, a violation list, or the code's own designed refusal message, **containing the mutated value**.

A crash, import error, timeout or skip is never a kill. **Outcome-as-data rule (new):** a new test that probes a path that can throw records each case as `{ ok: value }` or `{ error: message }` and asserts the whole list with `toEqual` against a literal. A mutant that turns a refusal into acceptance, or the reverse, then shows up as a diff and not as an uncaught throw. The existing T6 is unchanged; there, M5's evidence is the resolver's designed refusal message naming `gpt-5.6-sol`.

### 2.3 Mutants and exact killers

Killer = `file › describe › title`, with titles frozen verbatim:

- **T1** = `tests/unit/tools/model-routes.test.ts › LUNA6 model routes and session budgets`
- **T2a** = `tests/unit/tools/ai-dm-arena.test.ts › LUNA6 budget wiring` (appended in B1)
- **T2b** = `tests/unit/tools/ai-dm-screenshot-probe.test.ts › LUNA6 budget wiring` (appended in B1)
- **T3** = `tests/unit/tools/d569-v7.test.ts › D569 v7 registration (LUNA6)`
- **T4** = `tests/unit/tools/luna6-guard.test.ts › LUNA6 historical Luna literal guard`
- **T5** = `tests/unit/tools/rl-generate-data.test.ts › RL arena batch generator`
- **T6** = `tests/unit/tools/ai-dm-legacy-invariance.test.ts › D569 implicit advice legacy invariance`
- **T7a** = `tests/unit/tools/luna6-route-launch.test.ts › LUNA6 route launcher`
- **T7b** = `tests/unit/tools/ai-dm-arena.test.ts › LUNA6 route witnesses` (appended in B5)

Every T7b run uses the injected test table `{ gpt-6-luna|xhigh|legacy: 450000 ms, evidence LUNA6-TEST }` and in-process SIMULATED dispatch where the seam allows (`simulatedInProcessDispatchDelayMs`, `ai-dm-conversation.ts:918-919`) [V].

| # | Mutation (plausible wrong value) | Exact killer |
|---|---|---|
| M1 | `LUNA_PRODUCTION_ROUTE.model` `'gpt-6-luna'` → `'gpt-5.6-luna'` | T1 › `production Luna route is gpt-6-luna at xhigh (D887 a)`; also T7a › `builds the exact live argv for arena and conversation` |
| M2 | `LUNA_PRODUCTION_ROUTE.effort` `'xhigh'` → `'high'` | same two |
| M3 | `lunaStudyRoute(effort)` returns the production effort | T1 › `effort-study Luna routes keep their stated effort on gpt-6-luna (D887 b)` |
| M4 | The resolver returns 120 000 for an unmeasured gpt-6-luna route | T1 › `refuses a gpt-6-luna route with no measured budget and no explicit timeout` |
| M5 | The Luna predicate widens to `model.startsWith('gpt-')` | T1 › `keeps every non-Luna route on the legacy 120000 / 240000 defaults` (outcome list diff); T6 › `keeps implicit and explicit incumbent configs equal except outPath while retaining internal advice mode metadata` (designed refusal naming gpt-5.6-sol) |
| M6 | Legacy dm-mode default 240 000 → 180 000 | T1 › `keeps every non-Luna route on the legacy 120000 / 240000 defaults` |
| M7 | Mixed-budget arena run takes the first arm's entry | T1 › `refuses a mixed-budget arena run without an explicit timeout` |
| M8 | An explicit gpt-6-luna timeout is recorded as `route_table` | T1 › `records an explicit timeout for gpt-6-luna as a cli_override` |
| M9 | `parseArenaArgs` bypasses the resolver | T2a › `arena parser refuses gpt-6-luna without a measured budget or --timeout-ms`; T7b › `launch provenance timeout equals the timeout both runners parse from the launch argv` |
| M10 | `parseConversationArgs` bypasses the resolver | T2a › `conversation parser refuses gpt-6-luna without a measured budget or --timeout-ms`; same T7b |
| M11 | The screenshot answerer arms the timer but never kills the child | T2b › `screenshot probe kills a CLI call that exceeds its timeout and records timed_out` |
| M12 | (B1b) One table entry moves to the previous 30 s step | T1 › `session budget table equals the LUNA6 pilot record` |
| M13 | generate-data `--effort` `'low'` → `'xhigh'` | T5 › `writes per-batch manifests and resumes only incomplete or flapped seeds` (with the r2 value assertion) |
| M14 | generate-data resume accepts `arena-rl-batch-v1` | T5 › `refuses to resume a v1 gpt-5.6-luna batch manifest into a v2 gpt-6-luna batch` |
| M15 | v7 fixture: `gpt-6-luna-blind` `"effort": "xhigh"` → `"high"` | T3 › `validates the hand-written v7 manifest against the v7 registry` |
| M16 | v7 fixture: `gpt-5.6-sol-blind` `"effort": "high"` → `"xhigh"` | same |
| M17 | v7 fixture: `experimentWallMs` moves to the previous 30 s step | same, plus T3 › `rejects a v7 manifest whose experiment wall differs from the registered LUNA6 wall` |
| M18 | v7 validator: the per-arm model/effort check is dropped | T3 › `rejects a v7 gpt-6-luna arm registered at high`; T3 › `rejects a v7 non-Luna arm registered at xhigh` |
| M19 | v5 fixture: one trailing space appended | T3 › `pins the frozen v5 manifest raw bytes to the 2026-09-09 launch provenance sha256` |
| M20 | v7 fixture: one trailing space appended | T3 › `pins the v7 manifest raw bytes to the recorded preregistration sha256` |
| **M21** (r2 P1-3) (r1 P1-4) | `D569_V7_MANIFEST_PATH` `'tests/fixtures/d569-blind-experiment-manifest-v7.json'` → `'tests/fixtures/d569-blind-experiment-manifest.json'` | T3 › **`v7 manifest selection reads the registered v7 path and matches the recorded version and raw sha256`**. The test calls the exported no-argument `selectD569V7Manifest()`, the same selector both v7 operators call, and asserts `toEqual({ path: 'tests/fixtures/d569-blind-experiment-manifest-v7.json', version: 'd569-blind-experiment-v7', rawSha256: '<V7-FREEZE-1 literal>', violations: [] })`. Under M21 the diff shows the v5 path, `d569-blind-experiment-v5`, `8c0bcb3c…` and two violations. r2's `v7 operators refuse the v5 manifest and v5 operators refuse the v7 manifest` stays as a supporting test. It cannot kill M21, because it passes the v5 path explicitly; the reviewer's point is accepted |
| **M22** (r2 P1-3) (r1 P1-4) | The v7 first-arm validator's commit comparison `input.provenance.launchCommit` → the literal `'90484d453b7b6d1fe63ed28c0a53570a80e158e6'` (v5's original commit) | T3 › **`v7 first-arm validator rejects a row at the v5 original commit when the launch provenance names another commit`**. The input is an in-memory complete 60-row grid (30 hard + 30 brutal) with provenance `launchCommit: '45c2056a6c48a05b5f14e79f4717168232cbc312'`. Every row is at that commit except hard cell `1:1`, whose `repoCommit` is `90484d45…`. Asserted: `toEqual([{ code: 'repo_commit_mismatch', basis: 'hard', cell: '1:1', expected: '45c2056a…', actual: '90484d45…' }])`. Under the mutant, the 59 launch-commit rows are rejected with expected `90484d45…` and cell `1:1` is accepted, and the diff shows both. Second killer, in the opposite direction: T3 › `v7 first-arm validator accepts a complete simulated gpt-6-luna-blind grid at one launch commit` (all rows at `45c2056a…`, so the mutant reports 60 violations) |
| M23 | v7 first-arm filter `'gpt-6-luna-blind'` → `'gpt-6-luna-advice'` | T3 › `v7 first-arm validator accepts a complete simulated gpt-6-luna-blind grid at one launch commit` |
| M24 | v7 primary comparison id → `'gpt-5.6-luna-blind-vs-advice'` | T3 › `v7 analysis registers gpt-6-luna-blind-vs-advice as the primary comparison` |
| M25 | v7 tuning ladder starts at `'high'` | T3 › `v7 tuning ladder descends xhigh, high, medium, low` |
| M26 | Amendment #6 `date` `'2026-09-24'` → `'2026-09-23'` | T3 › `freezes the v7 amendments verbatim, including the gpt-6-luna xhigh amendment` |
| M27 | One extra `'gpt-5.6-luna'` in `tools/d569-blind-experiment.ts` | T4 › `forbids gpt-5.6-luna in tools/ and src/ outside the exact historical allowlist` |
| M28 | Plant `'gpt-5.6-luna'` in a comment in `src/vtt/agent-adapters/codex.ts` | same |
| M29 | `parseScreenshotProbeArgs` bypasses the resolver for a gpt-6-luna entry | T2b › `screenshot probe parser refuses a gpt-6-luna model without a measured budget or --timeout-ms` |
| M30 | (B2) generate-data keeps the 120 000 default | T5 › `writes per-batch manifests and resumes only incomplete or flapped seeds` |
| **M31** (R1) | `LUNA_LIVE_ESCALATION_ROUTE.effort` `'xhigh'` → `'high'` (Part A :330's old effort) | T1 › `live escalation route is a fresh gpt-6-luna xhigh session (D887 reading 1)`; T7b › `arena escalation after two validation failures dispatches every session at gpt-6-luna xhigh`; T7b › `conversation escalation after two validation failures dispatches every session at gpt-6-luna xhigh` |
| **M32** (r2 P1-1) | The launcher's `escalationArgs(route)` returns `[]` | T7a › `builds the exact live argv for arena and conversation`; T7b › `arena escalation after two validation failures dispatches every session at gpt-6-luna xhigh` (the diff shows `escalated: false`, `escalationModel: null`) |
| **M33** (r2 P1-1) | The launcher's base route `LUNA_PRODUCTION_ROUTE` → `lunaStudyRoute('medium')` (the pre-D887 live effort, :329) | T7a › `builds the exact live argv for arena and conversation`; T7b › `conversation primary, speculation, adjustment and correction sessions all run at gpt-6-luna xhigh` |
| **M34** (r2 P2-3) | Provenance `timeoutMs: resolved.ms` → `timeoutMs: LEGACY_SESSION_TIMEOUT_MS` (120 000) | T7a › `records the resolved session budget and its route_table source in launch provenance`; T7b › `launch provenance timeout equals the timeout both runners parse from the launch argv` |
| **M35** (r2 P2-3) | Provenance `timeoutSource: resolved.source` → `'cli_override'` | T7a › `records the resolved session budget and its route_table source in launch provenance` |
| **M36** (r2 P1-1) | The refused-passthrough list loses `'--effort'` | T7a › `refuses route-bearing passthrough flags` (outcome list: the mutant turns `{ error: …--effort… }` into `{ ok: … }`) |
| **M37** (r2 P2-3) | The runner is spawned before provenance is written | T7a › `writes launch provenance before the runner starts and refuses to overwrite it` (the injected spawner records `existsSync(provenancePath)` at call time; literal `true`) |
| **M38** (R2) | The screenshot branch's route `LUNA_PRODUCTION_ROUTE` → `lunaStudyRoute('medium')` (the old :456 gate effort) | T7a › `builds the exact screenshot gate argv at gpt-6-luna xhigh` |
| **M39** (R13) | `tools/model-routes.ts` `import type { ConversationEffort } from './ai-dm-conversation'` → `import { type ConversationEffort } from './ai-dm-conversation'`. This compiles. Under `verbatimModuleSyntax: true` (`tsconfig.node.json:9`) [V], it keeps a side-effect import, so the launcher would load the conversation module and its vite-node auto-main guard [I: emit behaviour per the TypeScript option] | T7a › `launcher and model routes import no runner module at runtime`. A source scan of both files asserts that the list of import lines naming `./ai-dm-` equals the literal `["import type { ConversationEffort } from './ai-dm-conversation';"]` |
| **M40** (r2 P1-1) | Launcher runner map: arena → `'tools/ai-dm-conversation.ts'` | T7a › `spawns the runner with the exact direct-run command line` (injected spawner; literal command arrays from §1.9) |

**Equivalent mutant, recorded as such.** "Escalation dispatch uses the base planner instead of the escalation planner" (`ai-dm-conversation.ts:4359-4361`) survives every LUNA6 witness by construction, because R1 makes the two routes equal. It is not a LUNA6 mutant. That routing is already pinned by `ai-dm-conversation.test.ts › AI-DM engine MCP conversation runner › speculation uses arm base until trigger`, which uses `gpt-base low` as the base and `gpt-5.6-luna high` as the escalation (`:1444-1511`) [V]. Freshness of the escalation session is pinned by `… › correction refusal triggers a fresh D474 escalation on the real path` (`:1708`) [V].

**The T7b witnesses, concretely.** Each runs the launcher-built argv through the real parser and runner with an `onAgentInvocation` collector (`ai-dm-conversation.ts:912`) [V], then asserts:
- `invocations.map(i => [i.model, i.reasoningEffort])` equals an all-`['gpt-6-luna','xhigh']` literal of the observed length;
- that length is at least 3 (a separate assertion).

The four witnesses:
- *Arena escalation:* passthrough `--rooms 1 --reps 1 --seed 3943001 --out <tmp> --dry-run --combat-model monster_block_v1 --initiative-profile legacy`, run options `{ invalidInitial: ['room-1-round-1'], failCorrection: ['room-1-round-1'] }`. This is the pattern `ai-dm-arena.test.ts:2254-2266` proves escalates in a dry run (`escalated: true`) [V]. Row subset: `{ model: 'gpt-6-luna', effort: 'xhigh', escalationEffort: 'xhigh', escalated: true, escalationModel: 'gpt-6-luna' }`. The row fields are at `ai-dm-conversation.ts:7522-7524,7593` [V].
- *Conversation phases:* the configuration of `ai-dm-conversation.test.ts:4161-4180` (`initiative_segments_v1`, `alternatingInitiativeRoom({ fragileMonsterCount: 1 })`, heuristic_v0 via `partyPolicyOverride`, an invalid adjustment, in-process delays), copied as literals. Asserts the phase set `{'initial','speculation','adjustment','correction'}` and every route.
- *Conversation escalation:* the arena-escalation options on the conversation runner (`--fixtures tests/fixtures/arena-basis --rooms 1 --rounds 1`). I infer it escalates as the arena does, because the arena delegates to `runConversation` (`ai-dm-arena.ts:911,950,993`) [V for the delegation; I for the outcome].
- *Provenance equals parse:* `{ provenance: launch.provenance.timeoutMs, arena: parseArenaArgs(argv, cwd, { budgets }).timeoutMs, conversation: parseConversationArgs(argvC, cwd, { budgets }).timeoutMs }` equals `{ provenance: 450000, arena: 450000, conversation: 450000 }`.

Supporting tests without a dedicated mutant: T3 › `registers every gpt-6-luna arm at xhigh and every other arm at high`; T3 › `v7 dry run yields 480 core and 660 total cells with gpt-6-luna cells at xhigh`; T3 › `v7 operators refuse the v5 manifest and v5 operators refuse the v7 manifest`; T4 › `reports a planted occurrence from an in-memory file map`; T2a › `arena and conversation parsers take a gpt-6-luna budget from the injected table as route_table`.

### 2.4 Rejected approaches

- Swapping the 124 passthrough test occurrences, and renaming the v5 exports: rejected as in r2.
- Row budget fields: dropped (D887).
- **A `timeoutSource` field on the parsed config (r2 P2-3).** T6 compares the implicit config and the explicit `--timeout-ms 120000` config as whole objects (`ai-dm-legacy-invariance.test.ts:1278-1294`, explicit args at `:274-289`) [V]. A source field would read `legacy_default` in one and `cli_override` in the other, so T6 would fail by construction.
- **A runner start line that prints the budget (r2's §3.3).** It is dropped because it changes runner output; the launcher records the budget instead.
- **Moving a slow new file into an existing one after measuring it (r2's V10).** Replaced by fixed placement (§1.5) (r2 P2-2).
- **Hand-written route flags in (a) wrappers.** They cannot be tested; replaced by the launcher (r2 P1-1).
- **A launcher that imports the runners and runs them in-process.** The runners' vite-node auto-main guards make that hazardous (§1.9, M39).

---

## 3. Budgets that depend on Luna latency

### 3.1 Inventory

As in r2, with the screenshot row now unconditional (R2) and the DATA-01 row pointing to §5.4. The round wall does not abort the primary session; this is grep-level evidence, which P0b/V13a confirms [V-r2].

### 3.2 History (every figure is gpt-5.6-luna)

Unchanged [V-r0]: screening medians low 23.2 s, medium 39.6 s, high 162.1 s; arena medium n = 1,720, p50 59.8 s, p95 164.9 s; arena low p50 52.3 s; D569 high p90 196.5 s.

### 3.3 Resolver (B1)

`resolveSessionTimeout({ model, effort, path, explicitMs, table })` works as in r2:
1. An explicit value → `cli_override`.
2. A model other than gpt-6-luna → today's defaults, `legacy_default`.
3. A gpt-6-luna route with a table entry → `route_table:<D-id>`.
4. A gpt-6-luna route with no entry → throws.

The mixed-arm and mixed-escalation rules stay. Under R1 the live escalation route equals the base route, so it resolves to the same budget; the mixed rule still guards (b) tiered studies such as cycle2.

**r3 changes:**
- Each parser gains an optional `{ budgets }` argument (default `SESSION_BUDGETS`), used for test injection.
- The resolved **source is not stored on the config** (T6, §2.4). It exists only in launch provenance (§3.5).
- Advice-mode arena and conversation runs share the `legacy` path (`ai-dm-conversation.ts:1264`: `dmModeExplicit ? '240000' : '120000'`) [V]. So one legacy xhigh entry serves live arena, live conversation and live escalation.

### 3.4 Pilot (supervisor-run; quiet box per D883; never re-pinned for load)

- **P0 route probes, one call each** (as in r2):
  - (a) `CODEX_HOME=/home/vagrant/.codex-aidm codex exec -m gpt-6-luna -c model_reasoning_effort=xhigh --sandbox read-only -` on the stale-cache path.
  - (b) = **V13a**: one arena round, `--cli codex --model gpt-6-luna --effort xhigh --timeout-ms 1800000`, isolated home.
- **P1 arm matrix (r2 P1-1) (fixed by R1/R2, no longer conditional on questions):**

| Arm | Route | Paths piloted | Needed because |
|---|---|---|---|
| A | gpt-6-luna xhigh | legacy (live arena, conversation and escalation), dm_mode (D569 v7), screenshot (both gates, R2) | (a) |
| B | gpt-6-luna medium | legacy | D484 loop (b) |
| C | gpt-6-luna low | legacy; screenshot only if a low screenshot study is scheduled | generate-data K6, D425, D449, D484, the :456 research arm (b) |
| E | gpt-5.6-luna medium | legacy | optional continuity; **no budget derived** |

  Arm D (max) is removed (R1).
- **Sample, censoring and budget rule:** unchanged from r2, and review r2 marked them CLOSED. The sample is 30 day-1 sessions plus a 10-session day-2 slice, counting every responded session. T = 1,800 s, and any T-hit withholds the budget for that arm/path. The budget is the smallest 30 s multiple ≥ 1.25 × the n = 40 nearest-rank p95 (the 38th order statistic). The stability check allows ≤ 20 % between the day-1 p95 (29th of 30) and the pooled p95 [V: ceil(0.95·40) = 38, ceil(0.95·30) = 29].
- **Escalation recovery rate (R1 consequence):** reported per A-legacy session as information. It is not a gate.
- **Wall:** 23,936 s ≈ 6.65 h serial, or 12.05 h if xhigh takes twice gpt-5.6-luna high [V: node, A 3 × 40 × 162.1 + B 40 × 59.8 + C 40 × 52.3]. r2 already counted arm A's screenshot path, so the figure is unchanged.
- **Order:** the screenshot path runs after B1, because it needs `--timeout-ms`. The other paths can run first, with an explicit `--timeout-ms 1800000`.

### 3.5 Launch provenance (new) (r2 P2-3)

For every (a) live or gate run, the launcher writes `<out>.luna6-launch.json` **before** spawning the runner (M37), with flag `wx` so it never overwrites. It is written next to `--out`, which is outside the repo for arena and conversation and inside the gitignored `dnd-slim-runs/` for the screenshot probe, whose parser requires an in-repo `--out` (`ai-dm-screenshot-probe.ts:2240`) [V]. Schema `luna6-launch-provenance-v1`:

```json
{
  "schema": "luna6-launch-provenance-v1",
  "ruling": "D887 (a); escalation per supervisor reading R1; gates per R2",
  "runner": "arena | conversation | screenshot",
  "model": "gpt-6-luna",
  "effort": "xhigh",
  "escalationModel": "gpt-6-luna | null (screenshot)",
  "escalationEffort": "xhigh | null (screenshot)",
  "sessionPath": "legacy | screenshot",
  "timeoutMs": "<resolved.ms>",
  "timeoutSource": "<resolved.source, e.g. route_table:D9xx>",
  "roundWallMs": "180000 | null (screenshot)",
  "argv": ["<exact child argv after the runner path>"],
  "repoCommit": "<git rev-parse HEAD>",
  "launchedAt": "<ISO-8601>"
}
```

`resolved` comes from the same `resolveSessionTimeout` the parser calls, with the same inputs (route, `sessionPath`, `explicitMs: null`, table). T7b proves that both runners parse the same `timeoutMs` from the launch argv (M34). The v5 launch provenance already recorded `timeoutMs` (240000), `model`, `effort` and `escalation` for D569 (`~/dnd-slim-runs/d569-v5/gpt-5.6-luna-blind-primary.provenance.json`) [V]. The v7 runbook keeps that schema and adds `timeoutSource: "cli_override:D569_V7_EXPERIMENT_WALL_MS"`.

---

## 4. D569 re-registration (v7)

### 4.1–4.3

Unchanged from r2: what v5 is, why a new version, and the v7 manifest's JSON-path allowlist. Amendment #6 is frozen verbatim as in r2, and the amendment #7 template is as in r2.

### 4.4 Code

As in r2 (registry beside v5, typed per-arm effort, explicit fail-closed selection, v7 row and commit rules, analysis, ladder), with two precisions (r2 P1-3):
- Both v7 operators select their manifest only through the exported **no-argument** `selectD569V7Manifest()`. It reads `D569_V7_MANIFEST_PATH` and returns `{ path, version, rawSha256, violations }`. The operators refuse when `violations` is non-empty. This makes M21 observable as data.
- The v7 first-arm validator compares every row's `repoCommit` with `input.provenance.launchCommit`. It imports nothing from `tools/d569-v5/`, so no v5 commit constant is in scope (M22).

### 4.5 Freeze sequence without circularity (r2 P1-2) (r1 P2-3)

In r2 the fixture, the raw-sha constant and T3 were all in B3, while the D-entry they had to copy from came later, in Phase 4. r3 orders the steps so that each one consumes only the outputs of earlier steps:

| Step | Who | Output | Consumes |
|---|---|---|---|
| S1 | owner | Q4a/b/c answers | — |
| S2 | supervisor, pilot | the gpt-6-luna xhigh `dm_mode` budget (arm A) | §3.4 |
| S3 | supervisor | **D-entry V7-TEXT**: the complete amendment list as text (#6 verbatim from §4.3, #7 filled from S1/S2, #8 if Q4a needs it) and the wall | S1, S2 |
| S4 | implementer, **batch B3a** | `tests/fixtures/d569-blind-experiment-manifest-v7.json` **only**, hand-written from the v5 bytes and V7-TEXT. No code and no test in this batch | S3 |
| S5 | implementer, then supervisor | V9: the differing JSON paths equal the §4.3 allowlist, and each changed value equals V7-TEXT | S4 |
| S6 | supervisor | **D-entry V7-FREEZE-1**: raw sha256 by `sha256sum` and by `openssl dgst -sha256`; canonical sha256 by the repo's `canonicalJson` (node) and by `python3 json.dumps(obj, sort_keys=True, separators=(',',':'))`. That python recipe reproduces v5's canonical `0316244a…` [V this round], so it is a verified second tool | S4, S5 |
| S7 | implementer, **batch B3b** | the v7 constants (`D569_V7_MANIFEST_RAW_SHA256` copied from V7-FREEZE-1), registry, schema, validator, operators, and T3 (raw pin copied from V7-FREEZE-1, amendment literal copied from V7-TEXT). The fixture is FROZEN in this batch: `git diff --exit-code <B3a landed> <cand> -- tests/fixtures/d569-blind-experiment-manifest-v7.json` | S3, S6 |
| S8 | supervisor, Phase 4 | **D-entry V7-FREEZE-2**: the in-repo v7 operator shas at the landed commit; the installed copies under `~/dnd-slim-runs/d569-v7/scripts/` with `.sha256` files; the runbook v3 sha; the codex CLI version; the launch commit | S7 landed |
| S9 | supervisor, Phase 5 | launch provenance carrying the V7-FREEZE-1 and V7-FREEZE-2 values; the v7 validator checks the manifest sha against its constant and the rows against the provenance | S6, S8 |

`d569-v5/` is never touched. The reused second-family sha (`83daa7ea…`) is recorded in V7-FREEZE-1.

### 4.6 What the analysis can and cannot say

Unchanged from r2. The v7 Luna-vs-judge contrasts are **route** contrasts (Q4b). Load: 180 primary + 120 second-family Luna cells at xhigh.

---

## 5. DATA-01 (r2 P2-1) (r1 P2-2)

### 5.1 The current schedule supersedes r2's figures (r2 P2-1)

The DATA-01 plan of record is `.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md`. It is byte-identical to `.claude/consensus/data-01/plan-r4.md` (both sha256 `067aedba72742e25…`, `cmp` identical) [V]. It already makes the teacher gpt-6-luna xhigh (r4:18, :56) [V]. Its no-failure ledger [V: r4:127-136] is:
- **minimum 17,201** requests;
- **scheduled maximum 34,801** requests;
- **absolute 60-attempt envelope 50,801** requests (48,000 significance attempts plus the 2,801 fixed calls).

r2's "max pilot 33,801" and the triage floors (9,801 / 17,801) are void.

**Status of r4 (D888) [V].** DATA-01 review r4 returned **REJECT 0 P1 / 4 P2 / 0 P3**. Three of the P2s are regressions: the format-selection contract, enriched-audit overlap and replenishment, and the family-disjoint audit and training-seed count. Review r4 CLOSED the cost-report item r3 P3-1, which carries the 83.52 % / 121.92 % figures. D888 sends round 5 to the owner (D885 §12a). The schedule above is therefore the latest *reviewed* ledger, not an approved one. If round 5 changes 17,201 / 34,801 / 50,801, §5.2–§5.3 are recomputed from the new ledger with the same formulas, and nothing else in LUNA6 depends on those figures.

### 5.2 Break-evens and costs over r4's schedule [V: node; every figure equals r4's own table, r4:138-147]

- Break-evens: `500 / 17,201 = $0.02906808`; **`500 / 34,801 = $0.01436740`** (scheduled); **`500 / 50,801 = $0.00984233`** (absolute envelope).

| Basis (12k input) | r | min 17,201 | scheduled 34,801 | % of $500 | absolute 50,801 | % of $500 |
|---|---:|---:|---:|---:|---:|---:|
| gpt-5.6-luna $0.20/$1.20, 8k out | $0.0120 | $206.412 | $417.612 | 83.52 % | $609.612 | 121.92 % |
| same, 16k / 24k / 32k | .0216 / .0312 / .0408 | $371.542 / $536.671 / $701.801 | $751.702 / $1,085.791 / $1,419.881 | 150.34 / 217.16 / 283.98 % | $1,097.302 / $1,584.991 / $2,072.681 | 219.46 / 317.00 / 414.54 % |
| gpt-6-luna **UNVERIFIED** $0.10/$0.50, 8k | $0.0052 | $89.445 | $180.965 | 36.19 % | $264.165 | 52.83 % |
| same, 16k / 24k / 32k | .0092 / .0132 / .0172 | $158.249 / $227.053 / $295.857 | $320.169 / $459.373 / $598.577 | 64.03 / 91.87 / 119.72 % | $467.369 / $670.573 / $873.777 | 93.47 / 134.11 / 174.76 % |

### 5.3 Cost gate: two defined denominators (r2 P2-1)

- **N_sched = 34,801** is the scheduled, no-failure completion. **N_abs = 50,801** is the physical attempted envelope. A generic `N_max` is no longer used.
- With the declared retry-and-hold reserve H:
  - **Test S** (completion is affordable): `r ≤ (500 − H) / 34,801`. At H = 10 %, r ≤ $0.01293066; at H = 20 %, r ≤ $0.01149392.
  - **Test A** (the worst physical case is affordable): `r ≤ (500 − H) / 50,801`. At H = 10 %, r ≤ $0.00885809; at H = 20 %, r ≤ $0.00787386 [V: node].
- Outcomes:
  - S fails → no pilot; stop and ask (Q5).
  - S passes and A fails → the pilot cannot overspend, because r4's dispatch guard enforces `settled + ambiguous_hold + in_flight_reserve + next_reserve <= cap` (r4:69) [V]. It can, however, be stopped before completion. Authorizing it needs the owner's explicit acceptance of that stop risk, with the numbers (Q5).
  - Both pass → authorized under the existing rulings.
- At the old basis ($0.012), S passes only for H ≤ 16.48 % and A fails for every H ≥ 0. At the unverified 8k gpt-6-luna basis ($0.0052), A passes for H ≤ 47.17 % [V: node].
- pricingVersion pins the model snapshot, processing tier, region, API route, fetch date and source URL, all from a primary source. One mismatch at the route probe stops the pilot (as in r2).

### 5.4 What r4 absorbed and what LUNA6 still hands over (r2 P2-1) (r1 P2-2)

| r2 item | r4 status | Residual for LUNA6 to hand over |
|---|---|---|
| Route probe measures input, output and reasoning tokens, snapshot, effort and billed-output treatment | absorbed (r4:56, :123) [V] | — |
| API acceptance of `reasoning.effort: "xhigh"` | absorbed ("Unsupported/unreported parameters force a new sampling-contract version", r4:56) [V] | — |
| Billed-output cap set after the probe | absorbed (r4:69) [V] | — |
| Shortfall stops and asks, never loosens a criterion | absorbed (r4:138) [V] | — |
| pricingVersion pins tier, region, route, fetch date and URL | **not present** (grep: 0 hits for `region`; the single `tier` hit is "carrier", r4:174) [V] | yes |
| H and the S/A tests over N_sched/N_abs | **not present** (r4 has only the runtime dispatch guard, r4:69, and zero-hold ceilings, r4:158) [V] | yes |
| Truncated responses: charged, invalid, excluded from n, reported by bucket, blocked above a declared rate | **not present** (0 hits for `truncat`) [V] | yes |
| Per-request timeout derived from probe latency | **not present** (0 hits for `timeout`; latency appears only in audit fields, r4:67) [V] | yes |
| Teacher wall and throughput re-projected at xhigh latency | **not present** (r4:119 projects rollout throughput, not teacher latency) [V] | yes |
| "No paid DATA-01 Luna call exists yet" | not stated | yes [I] |

**Delivery (updated for D888).** r2 planned to hand these items to DATA-01 review r4. That review has already run and rejected r4, and a round 5 needs the owner (D888) [V]. The supervisor therefore attaches the six residual items, as "LUNA6 cross-unit requirements", to whichever DATA-01 fix round the owner authorizes. They block no LUNA6 batch; they block only DATA-01's paid pilot, through test S/A and the route probe.

---

## 6. Order of work, verification, risks, owner questions

### 6.1 Order

1. **Phase 0 (supervisor):** R1–R3 are already recorded in D888 [V]; the landing D-entry cites them with the D887 quote. Ask Q4a, then Q4b, then Q4c, one at a time. They block S3 and B3. Q2 and Q5 wait for data.
2. **Phase 1 (pilot, supervisor):** P0a; V13a (= P0b); P1 on legacy and dm_mode. The screenshot path runs after B1.
3. **Phase 2 (DATA-01):** hand over the §5.4 residual items.
4. **Phase 3 (code; D885 §7: Opus implements, codex sol reviews read-only, the supervisor verifies and commits).** Each batch runs red-first, then mutants, then §6.2, then sol review, then the supervisor gate.
   - **B1:** model-routes (empty table), the parser wiring and `{ budgets }` options, the screenshot kill, T1 (without the table test), and T2a/T2b appended.
   - **B4:** the guard (T4).
   - **B5 (new; independent of the pilot through injected tables):** `tools/luna-route-launch.ts`, T7a, and T7b appended.
   - **B1b:** table entries from the pilot D-entry, plus T1 › `session budget table equals the LUNA6 pilot record`. Then **V13b**.
   - **B2 (after B1b):** generate-data v2. If the pilot withholds the low budget, B2 stays blocked and this is reported.
   - **B3a → S5/S6 → B3b:** the §4.5 sequence (after Q4 and the pilot) (r2 P1-2) (r1 P2-3).
5. **Phase 4 (supervisor, external):** V7-FREEZE-2; d569-v7 install; runbook v3; the `~/dnd-slim-runs/luna6/` wrappers (§1.9) and the **V14** audit; memory-note updates.
6. **Phase 5:** the first gpt-6-luna D569 v7 runs, under a separate launch decision.

**Coordination.** B1 and B5 append to `ai-dm-arena.test.ts`, which lengthens main's gate. V10b reports the added wall to PERF-02. If a PERF-02 timed pair is scheduled, B1 and B5 land after it (D885 §5–§6). The CONV-SPLIT-01 split touches `ai-dm-conversation.test.ts`, which LUNA6 keeps FROZEN.

### 6.2 Verification (r2 P2-2) (r2 P3-1) (r1 P2-4)

The implementer runs every check in its own clone. The supervisor re-runs them on a clean `git clone --shared` at the candidate SHA, under `PhpstormProjects`. Heavy commands go through `.tmp/runs/perf-02/fanout/slot.sh <clone> …` with `--maxWorkers=1`. Evidence goes to `.tmp/runs/luna6/impl/<batch>/`. What was claimed and what was verified are kept apart.

| # | Check | Command | Pass criterion |
|---|---|---|---|
| V1 | Command outcomes | `npm run check:command-outcomes` | exit 0 |
| V2 | Types | `npx tsc -b --force` | exit 0, plus the Part A :71 declaration-emit guard |
| V3 | Lint | `sg scan src tools tests` | 0 errors (includes `no-raw-fs-in-tests`) |
| V4 | Targeted suites | `node node_modules/vitest/vitest.mjs run --configLoader runner --maxWorkers=1 <files> 2>&1 \| tee targeted.log`, over the batch's new, edited and appended files plus every FROZEN test file | failed 0; skipped 0 in new files and appended describes; file and test counts pasted |
| V5 | Inventory | the r2 V5 command, unchanged | JSON line pasted; the listed specs are the denominator |
| **V6a** (r2 P2-2) | FROZEN files, every batch | `git diff --exit-code 45c2056a <cand> -- tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-prepatch-primary-bytes.json tests/fixtures/ai-dm-legacy/ tests/unit/tools/ai-dm-legacy-invariance.test.ts tests/unit/tools/d569-blind-experiment.test.ts tests/unit/tools/d569-v5.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/rl-extract-sft.test.ts tests/unit/tools/ai-dm-rerun-packet.test.ts tests/unit/tools/ai-dm-board-delivery.test.ts tools/d569-v5/ tools/ai-dm-rerun-packet.ts` and `sha256sum ~/dnd-slim-runs/d569-v5/scripts/*`. r2's V6 omitted four §1.5 files; they are added | exit 0; installed shas = provenance |
| **V6b** (r2 P2-2) | APPEND-ONLY files: only in B1 (arena and screenshot tests) and B5 (arena test). In every other batch these two files are added to V6a against the previous LUNA6 landing | `git show <prev>:F > base; git show <cand>:F > cand; cmp -n "$(stat -c %s base)" base cand`, where `<prev>` is the previous LUNA6 landing, or `45c2056a` for B1. Also `cmp -n 107857` (arena) or `cmp -n 59668` (screenshot) against the `45c2056a` bytes (sha `daa44515…` / `b3cbeae7…`) [V]. Then `python3 .tmp/runs/luna6/impl/check-append-only.py base cand '<describe>' <batch>/titles.json`, which requires: (1) the suffix is non-empty UTF-8; (2) its column-0 lines are only blank lines, `import` declarations, one `describe('<describe>', () => {` line and its `});`; (3) the `it(` titles in the suffix equal `titles.json` as an **ordered** list, not a multiset; (4) no `.only`, `.skip`, `.todo`, `.each` or `describe.` modifier | all exit 0. Both branches are fixed in advance per batch, so there is no measurement-dependent choice |
| V7 | Mutants | §2.2, per batch | every batch mutant KILLED with evidence; `RESTORED` sha = ORIG |
| V8 | Engine and tool pins | the r2 V8 command, for **B1 and B3b** | all 7 equal D880 |
| V9 | v7 vs v5 diff (**S5**) | a read-only node script | the path set equals the §4.3 allowlist; values equal V7-TEXT |
| **V10** (r2 P2-2) | New-file cost | each of T1, T3, T4 and T7a run solo 3× | median ≤ 5 s. This is the bounded-test cap from `.tmp-plans/2026-09-23-perf-02-makespan-experiments.md:89` [V], adopted here. On failure: STOP and report; nothing is relocated |
| **V10b** | Appended cost (information) | `-t '^LUNA6 budget wiring'` (B1) and `-t '^LUNA6 route witnesses'` (B5), solo 3× in their host files | median reported to PERF-02; not a gate |
| V11 | Negative controls | T4's planted map; M19; T1 non-Luna defaults plus the unchanged T6. **New:** `check-append-only.py` must fail on each of (i) a candidate with one byte flipped at offset 100 of the base region; (ii) a suffix containing `it.only(`; (iii) a top-level `it.skip(` appended after the describe's closing `});`; (iv) the frozen titles in a different order. Items (iii) and (iv) are the two fail-open paths D888 found in the CONV-SPLIT preservation checker (`preserve.mjs` accepted an appended top-level `it.skip` and compared multisets, not order) [V] | as stated; each negative control must exit non-zero |
| V12 | Review and gates | as in r2: codex sol read-only review, the supervisor's integrated gate on a quiet box, the post-merge authoritative gate on main; no Playwright | APPROVE; gate pass; post-merge pass |
| **V13a** (r2 P3-1) | Availability probe (= P0b, before code) | one arena round, `--cli codex --model gpt-6-luna --effort xhigh --timeout-ms 1800000`, isolated home | a row from gpt-6-luna xhigh. This proves availability only: its source is `cli_override` by construction and it does **not** test the table |
| **V13b** (r2 P3-1) | Table-wired smoke (after B1b and B5 land) | through the launcher: arena `--rooms 1 --reps 1` and conversation `--rooms 1 --rounds 1`, with **no `--timeout-ms` anywhere**. A python check confirms the absence in the wrapper text and in `provenance.argv` | provenance `timeoutSource` equals `route_table:<pilot D-id>` and `timeoutMs` equals the B1b literal; rows have `model: 'gpt-6-luna'`, `effort: 'xhigh'`, `escalationEffort: 'xhigh'` and `agentDispatched: true`. A fallback (`plannedBy: null`) is reported, not failed. Escalation is not forced live, because a live run has no SIMULATED seam; T7b covers it |
| **V14** (r2 P1-1) | Wrapper audit (Phase 4, python, read-only) | scan `~/dnd-slim-runs/luna6/*.sh` | (i) no line invoking `tools/luna-route-launch.ts` contains `--model`, `--effort`, `--escalation-model`, `--escalation-effort`, `--timeout-ms` or `--models`; (ii) no line invokes `tools/ai-dm-{arena,conversation,screenshot-probe}.ts` directly; (iii) each wrapper's sha256 is in the launch D-entry. Negative control: a planted temporary wrapper containing `--effort medium` is flagged |

### 6.3 Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | xhigh latency exceeds the session budgets and the 180 s wall | Uncensored pilot with the withhold rule; per-route table; Q2 |
| R2 | gpt-6-luna is missing from the stale `~/.codex-aidm` cache; the API route is unproven | P0a; DATA-01's r4 route probe |
| R3 | Output-cap truncation at xhigh; DATA-01 above $500 minus H | §5.3, §5.4; Q5 |
| R4 | (R1 consequence) Escalation at the same route may recover fewer failures than the old high-over-medium escalation | Pilot reports the escalation recovery rate; information only |
| R6 | Lost comparability with every gpt-5.6-luna baseline | v7; cross-version comparisons are descriptive only; gates are re-established on gpt-6-luna xhigh before they gate anything (R2) |
| R7 | Shelved-branch collisions | `_V7` convention |
| R8 | Codex-plan usage burn at xhigh | Pilot first; report usage per 30 rounds |
| R9 | Fable exhaustion on the v7 panel | Stop loudly; never substitute |
| R10 | A new test file breaks the 5 s cap | V10 stops and reports (fixed placement; no relocation) |
| R11 | Non-Luna screenshot-probe calls stay untimed | Out of scope; flagged |
| R12 | The RL corpus mixes gpt-5.6-luna low and gpt-6-luna low rows | Rows carry `model`; filter or stratify |
| **R13** | A runner module loaded by the launcher starts an unintended run through its vite-node auto-main guard | The launcher spawns runners as child processes and imports only `model-routes.ts`, whose effort import is `import type` (M39) |
| **R14** | An external wrapper bypasses the launcher for an (a) run | Not preventable in code (D887 (c) keeps the runner flags free); V14 audit plus wrapper shas in the launch D-entry |
| **R15** | Appended witnesses lengthen main's gate during PERF-02 | V10b reports the cost; B1 and B5 land after any scheduled PERF-02 timed pair |

### 6.4 Owner questions still open (ask one at a time, most blocking first) (r2 P1-1)

- **Q4. D569 v7 design** (blocks S3 and B3).
  - **(a) Cohorts and caps.** Part A :560/:568 say active cohorts and caps "obey COHORT v6". COHORT v6 exists only on the shelved `claude/cohort-01` (brutal 6209xxx, `semanticBytes` 32 768), and main's constants are v5's. Options:
    - (i) v7 uses the v5 cohorts and caps, which **explicitly supersedes :560/:568 for v7**, with the brutal-productivity limitation stated in an amendment;
    - (ii) wait for COHORT-01 to be unshelved (D847).
    - *Recommendation: (i).* It follows D886 §12b's precedent of running on main's baseline rather than waiting behind the shelved lane.
  - **(b) Non-Luna arms.** D887 moves only Luna runs, so Opus 4.8, Sol and Astra stay at high, and every Luna contrast becomes a route contrast (xhigh vs high). That departs from the equal-effort comparison D586.36 made after the owner's D586.24 remark ("Astra is supposed to be smarter than sol"): "the fair strength comparison at equal effort (high)" (archive `2026-09-18-full-chronology.md:17952,18714`) [V]. *(Citation corrected; r2 attributed the equal-effort logic to D586.24 itself, Appendix E.)* Options:
    - keep them at high and label the contrasts as route contrasts;
    - raise the non-Luna arms to xhigh, which D887 does not cover.
    - *Recommendation: keep them at high and label the contrasts.*
  - **(c) Wall.** One common wall for all arms = max(240 000, the gpt-6-luna xhigh dm_mode budget). This supersedes :430's 240 s for v7. *Recommendation: yes.* No arm is worse off than in v5, and the cost of xhigh is explicit.
- **Q2 (conditional, after the pilot). Live wall.** Asked only if the A-legacy p95 `endToEndWall` is above 180 s. Options: keep 180 s and accept more typed fallbacks; set a per-route wall; or lower the live effort, which would amend D887 (a). *Recommendation:* keep 180 s and report the fallback rate, since the wall is an owner product rule (:330). The numbers come with the question.
- **Q5 (conditional, after DATA-01's route probe). DATA-01 cap.** Asked only if test S fails, or if S passes and test A fails (§5.3). Options: raise the cap (D852.1 says caps are revisable); accept the stop-before-completion risk; or shrink the adaptive looks without loosening any significance criterion (D854 e). *Recommendation:* decided with the data. If only A fails, accept the stop risk, because the dispatch guard prevents overspend.

### 6.5 Questions removed because a ruling or a supervisor reading answers them

| Question | Answered by | Why |
|---|---|---|
| r2 Q7 (defaults and legacy pins) | D887 (c) | "the code's no-flag default stays gpt-5.6-sol" |
| r2 Q3 (effort-as-variable roles) | D887 (b) | "move to gpt-6-luna at their stated effort" |
| r2 Q6 (Terra DM bridge) | D887 scope | Not a Luna run |
| r2 Q5 part 2 (close v5 and D590) | D885/D887 | v5 closes as superseded; recorded in the landing D-entry |
| **r2 Q1 (live escalation effort)** | **R1** (r2 P1-1) | Fresh gpt-6-luna xhigh session; no max, no removal, no lower effort |
| **r2 Q9 (the medium quality gates)** | **R2** (r2 P1-1) | Script-chosen Luna runs → xhigh |
| **r2 Q8 (codex explore route)** | **R3** (r2 P1-1) | A codex helper setting, outside D887; no change |

---

## Appendix A. r3 verification log (commands I ran; outputs summarised)

1. `git rev-parse HEAD` → `45c2056a6c48…`. `git status --short` → one staged file, `A .claude/consensus/data-01/plan-r4.md`. `sha256sum plan-r2.md` → `b86d1e23…`, which equals the reviewed sha.
2. `review-r2.log` read in full at its final message (lines 8905-9051). The exit file reads 0.
3. `decisions.md:1714-1800` (D885-D887). Part A :329, :330, :425, :430, :449, :456, :459, :484, :561, :568 read verbatim. `answers.txt:22`. `~/.claude/CLAUDE.md:105-112`. The memory note `model-routing-2026-09-08.md`, lines 3, 13 and 21.
4. DATA-01:
   - `plan-r4.md` sha `067aedba…`, 334 lines. Read lines 1-30, 118-165 and 250-334.
   - `cmp` against the plan of record → identical. `stat`: the plan of record was modified 01:07:19; plan-r2 was saved 01:13:50; the fix-r3 brief sha is `e955401a…`, unchanged.
   - grep counts in r4: `region` 0, `truncat` 0, `timeout` 0; the `tier` hit is "carrier".
5. node arithmetic: `500/34801 = 0.01436740`; `500/50801 = 0.00984233`; `500/17201 = 0.02906808`; `500/33801 = 0.01479246`. Headroom: S 0.01293066 / 0.01149392; A 0.00885809 / 0.00787386. The cost table for all 8 rates × 3 N matches r4. Break-even H at $0.012: 16.4776 %; at $0.0052 on A: 47.167 %. Pilot wall 19,452 + 2,392 + 2,092 = 23,936 s (6.65 h; 12.05 h at 2×). `ceil(0.95·40) = 38`, `ceil(0.95·30) = 29`.
6. Wrapper census (python, read-only, scratchpad script): 66 files, 98 kept hit lines, 82 Luna-selecting invocation lines (55 arena, 23 screenshot, 1 conversation, 2 codex exec, 1 in-repo), 14 function-call feeders, 1 runbook prose line. 37 files under `~/dnd-slim-runs`, 28 under `.tmp/runs`, 1 tracked. File mtimes range from 2026-08-28 to 2026-09-09 for game wrappers; the 2026-09-22 file is the codex probe. Read directly: `cycle2.sh`, `smoke-3round.sh`, `rejudge-driver.sh:1-22`, `resume-after-reboot.sh:25-40`, `wait-and-dispatch.sh:1-12`, and the v5 runbook lines 255-300 and 455-560. `d459-smoke-3round.jsonl` has 30 lines. The `d541` probe log ends with `probe exit:0`.
7. Runner code read:
   - `ai-dm-arena.ts:311-470` (parser; `values.set` last-wins; round wall), `:700-740`, `:895-930` (option pass-through), `:1035-1048` (main guard);
   - `ai-dm-conversation.ts:896-1000` (run options: `onAgentInvocation` :912, `invalidInitial` :940, `failCorrection` :959, `selectSpeculationPlanner` :984), `:1084-1135`, `:1240-1320`, `:4195-4230`, `:4340-4375`, `:6170-6205`, `:7510-7600` (row fields), `:7680-7700` (main and guard);
   - `ai-dm-screenshot-probe.ts:2139-2240` (`parseModelSpec`; efforts low..xhigh at :174; in-repo `--out`), `:3706-3745` (main, no `--` strip; guard);
   - `src/vtt/agent-session.ts:43-48` (call phases); `turn-exhaustion-coordinator.ts:395-475` (escalation via `startEscalation`).
8. Tests read:
   - `ai-dm-conversation.test.ts:1440-1530` (speculation base and escalation witness), `:2445-2475`, `:4160-4235` (the phase-set literal);
   - `ai-dm-arena.test.ts:598-640` (in-process adapter), `:1537-1567`, `:1900-1928`, `:2053-2075`, `:2250-2296` (dry-run escalation `escalated: true`);
   - `ai-dm-legacy-invariance.test.ts:255-300`, `:1278-1300`, `:1492-1530`;
   - titles grepped.
9. Test infrastructure: `ast-grep-rules/no-raw-fs-in-tests.yml`, `tests/helpers/test-filesystem.ts`, `tests/helpers/test-inputs.ts:1-30`, `tests/unit/source-is-greppable.test.ts:1-30`. `tsconfig.node.json` sets `verbatimModuleSyntax` and `isolatedModules` to true.
10. `wc -lc` and the tail bytes of `ai-dm-arena.test.ts` (2,360 lines, 107,857 bytes, sha `daa44515…`, ends `});\n`) and `ai-dm-screenshot-probe.test.ts` (1,727 lines, 59,668 bytes, sha `b3cbeae7…`, ends `});\n`).
11. The v5 canonical sha by an independent tool: python `json.dumps(sort_keys=True, separators=(',',':'))` gives `0316244a29ae08f4…` with `ensure_ascii` both true and false. `openssl dgst -sha256` gives the raw `8c0bcb3c…`. The installed `check-manifest.ts:13-18` computes the canonical sha with the repo's `canonicalJson`.
12. `tools/d569-v5/validate-first-arm.ts:70-80`: `D569_ORIGINAL_COMMIT = '90484d453b7b6d1fe63ed28c0a53570a80e158e6'`.
13. D586.24 and D586.36 read in `.claude/decisions-archive/2026-09-18-full-chronology.md:17952-17965` and `:18686-18714`.
14. `.tmp-plans/2026-09-23-perf-02-makespan-experiments.md:89`: "Its solo cost is measured and capped at 5 s."
15. At the end of the round: `git log` shows the new HEAD `47f62e88` (D888, records only, 2 files, +360). `git diff --stat 45c2056a HEAD -- src tools tests` is empty. D888 read in full (`decisions.md:1771-1794`): the R1–R3 readings are recorded there, DATA-01 r4 was REJECTED with regressions, and the preservation-checker fail-open paths are described there.

## Appendix B. Inferred, not measured (the review should attack these)

- gpt-6-luna xhigh latency is at least gpt-5.6-luna high's; the pilot decides.
- The round wall does not abort the primary session (grep-level only); P0b/V13a confirms it.
- The conversation dry run escalates under `invalidInitial` plus `failCorrection` as the arena's does, because the arena delegates to the same runner.
- The conversation child command with `--` works as it did on 2026-09-02; `:7690`'s `process.argv.slice(2)` is not traced. V13b decides.
- Under `verbatimModuleSyntax`, `import { type X }` keeps a side-effect import at runtime (M39's premise). The M39 killer is a static scan, which fails the mutant either way.
- T1, T3, T4 and T7a meet the 5 s cap (V10 decides; on failure, STOP).
- The SIMULATED seams keep the three T7b witnesses to a few seconds each (V10b reports).
- xhigh exceeds the 8k DATA-01 output cap on packed requests; the gpt-6-luna prices ($0.10/$0.50 per M) are unverified; no paid DATA-01 Luna call has been made.

## Appendix C. Review r1 findings: status after r3

| r1 finding | r2 status (per review r2) | r3 |
|---|---|---|
| P1-1 v7 selection and provenance | CLOSED | M21 killer strengthened (§2.3) |
| P1-2 registry test marked unchanged | CLOSED | — |
| P1-3 censored pilot | CLOSED | — |
| **P1-4 mutation killers** | PARTIAL (M21/M22) | **Fixed:** M21 positive-selection killer; M22 witness at the v5 original commit with a distinct launch commit, killers in both directions; outcome-as-data rule (§2.2, §2.3) |
| P2-1 retained efforts piloted | CLOSED | Matrix now fixed by R1/R2 (§3.4) |
| **P2-2 DATA-01 tier, region and headroom** | PARTIAL (stale denominator) | **Fixed:** r4 schedule; N_sched/N_abs; tests S/A with H; residual hand-over (§5) |
| **P2-3 v7 freeze and COHORT supersession** | PARTIAL (circular order) | **Fixed:** the S1-S9 sequence with B3a/B3b split and two freeze D-entries (§4.5) |
| **P2-4 verification executable** | PARTIAL (V6/V10) | **Fixed:** fixed placement; V6a/V6b with exact commands and a checker spec plus negative controls; V13a/V13b split; V14 (§1.5, §6.2) |
| P3-1 lines vs occurrences | CLOSED | — |
| P3-2 amendment seed | CLOSED | — |

## Appendix D. Review r2 findings and where each is fixed

| Finding (review r2 order) | Fix |
|---|---|
| **r2 P1-1:** D887 scope reopened (Q1/Q9/Q8); wrapper migration unverifiable; V13 arena-only | §0.2 R1/R2/R3 with the D887 quote; Q1/Q9/Q8 removed (§6.5); §1.9 census of all 66 Luna-selecting files with verbatim argv (none is current live play); the launcher with exact prefix and child argv, refusals and wrapper templates; T7b arena and conversation witnesses covering primary, speculation, adjustment, correction and escalation; M31-M33, M36, M38-M40; V14 audit |
| **r2 P1-2:** circular v7 pin sequence | §4.5 S1-S9: V7-TEXT → B3a fixture only → V9 → V7-FREEZE-1 (two tools each for raw and canonical) → B3b code and tests copied from it → V7-FREEZE-2 → launch |
| **r2 P1-3:** M21/M22 lack exact killers | M21: `v7 manifest selection reads the registered v7 path and matches the recorded version and raw sha256` (a positive selection literal). M22: `v7 first-arm validator rejects a row at the v5 original commit when the launch provenance names another commit`, plus the positive-grid killer |
| **r2 P2-1:** DATA-01 denominator superseded | §5: 17,201 / 34,801 / 50,801; $0.01436740 and $0.00984233; $417.612 and $609.612; N_sched/N_abs with tests S/A |
| **r2 P2-2:** V6/V10 frozen-file rule | §1.5 fixed placement; V6a (exit-code list, now complete) and V6b (exact byte prefix at two bases plus the `check-append-only.py` suffix rules); V11 negative controls for the checker; V10 has no relocation branch |
| **r2 P2-3:** timeout provenance untested | §3.5 schema written by the launcher before the spawn; M34, M35, M37 with exact killers; T7b parse-equality witness; the config-field and start-line alternatives rejected with reasons (§2.4) |
| **r2 P3-1:** V13 bypasses the table | V13a is the explicit-timeout availability probe; V13b runs through the launcher with no `--timeout-ms` anywhere and must show `route_table:<pilot D-id>` |

## Appendix E. Findings against our own work (full length)

1. **r2 used a DATA-01 denominator that was already superseded when r2 was saved.** r2 Appendix A item 13 recorded the DATA-01 plan as "sha `f8ca3d0d…` (unchanged)". The plan of record was rewritten by DATA-01 fix r3 at 01:07:19 (it is now `067aedba…`, the same bytes as `plan-r4.md`). r2 was saved at 01:13:50, six minutes later [V: `stat`]. So r2's read of the plan predates that write, and r2 did not re-check before saving. Its §5 "max pilot 33,801" and `$0.01479246` break-even were stale on arrival. Review r2 caught this as P2-1. Corrected in §5. Rule applied this round: re-hash every cross-unit input immediately before saving (Appendix A item 4).
2. **r2 mis-cited the equal-effort fairness rule.** r2 Q4b said the non-Luna arms at high depart from "D586.24's same-effort fairness logic". D586.24 is the owner's Unicorn's Blessing ruling plus the remark "Astra is supposed to be smarter than sol". The equal-effort comparison is D586.36: "the fair strength comparison at equal effort (high)" [V: archive :17952, :18714]. Corrected in Q4b.
3. **r2's V6 command omitted four files that r2 §1.5 declared byte-identical.** The four are `d569-second-family-manifest.test.ts`, `rl-extract-sft.test.ts`, `ai-dm-rerun-packet.test.ts` and `ai-dm-board-delivery.test.ts`. r2's frozen-file claim for them therefore had no check. Added to V6a.
4. **r2's resolver design had the runners print their budget and wrappers copy it.** Printing changes runner output, and copying by hand is untestable, which was review r2 P2-3. Worse, the obvious repair, a `timeoutSource` field on the config, would have broken T6 by construction (§2.4). r3 moves the record into the launcher.
