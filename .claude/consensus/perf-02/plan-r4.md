# PERF-02 — cut the full Vitest gate: concrete experiment plan (revision 4)

The self + codex consensus loop (§8) runs on this plan first. The plan then goes to the owner for approval. Only after approval do the experiments (§5–§7) run. Nothing lands from an experiment. Each lever that pays becomes its own landing unit under the normal protocol.

Revision 2 answers codex round 1 (sol xhigh, session `01a0cf61-3e70-75b3-972e-cb4454ed4553`, verdict REVISE, 2 P1 / 7 P2 / 1 P3). I verified all ten findings and accept all ten. Each change carries a tag of the form "(r1 Fn)".

Revision 3 answers codex round 2 (same session, verdict REVISE). Codex agreed with 7 of the 10 dispositions and disputed F2, F4 and F6, then added 2 P1 and 4 P2 findings. I verified all nine points and accept all nine; each change is tagged "(r2 n)". One is an error of mine: my failure census counted four report sidecar files as runs and missed one non-timeout failure (r2 5).

Revision 4 answers codex round 3, the last round (verdict REVISE, 1 P1 and 3 P2). Codex agreed with 7 of the 9 round-2 items and disputed the X7 metric and the X7 checker. It added four findings, which cover both disputes. I verified all four and accept all four; each change is tagged "(r3 n)". The round cap is reached, so codex has not re-reviewed the round-3 fixes (§8).

## 1. Context

The owner asked for more splits, faster awaits and other performance wins, with risk-taking and an Opus 5.5 xhigh planning fan-out (D877, D878). Eight planners returned (workflow `wf_375c4f6f-ed3`). Plan mode was active during their run, so most ran read-only analysis. The engine hot-path and blind fixture planners measured with in-memory harnesses that wrote no files. Their notes are in `/home/vagrant/.claude/plans/groovy-booping-lantern-agent-*.md`, and a combined export is in the session scratchpad at `perf02-results.md`.

The gate the owner waits for is `node tools/gate-vitest.mjs`: an initial run plus a serial retry of every failed file. Verified from the four Sep 22 gate reports:

| Gate | Initial | Retry | Total |
|---|---|---|---|
| 1183392 | 727 s | 442 s | 1,168 s |
| 1227631 | 672 s | 210 s | 881 s |
| 1271737 | 721 s | 533 s | 1,254 s |
| 1386678 | 759 s | 363 s | 1,122 s |

All four verdicts were `failed`, and the two docs test files failed in every one of them.

## 2. What the planners found, and what I checked

- **One root cause dominates.** Verified in `src/vtt/blind-turn-context.ts:1084-1121` and `src/vtt/engine-query-port.ts:1108-1147`. Blind legal movement calls `queries.path` once per grid cell per actor. Each call runs its own Dijkstra, and each miss runs a second whole-grid search whose error code legal movement throws away. Two planners independently attribute about 95% of blind-turn-context's 281 s setup to this.
- **A single cached search per actor gives identical output (planner-measured, in memory, under load, not in Vitest).** The blind fixture setup falls from about 277 s to about 10 s. The planners report 660,604 plus 144,690 differential comparisons with no mismatch, and 33 of 33 blind rows byte-identical. Arena setup falls from 35 s to 6 s, the conversation smoke from 69 s to 23 s, and the survival test from 114 s to 80 s.
- **Further exact memos and reorders (planner-measured).** Heavy files run 1.15× to 4.2× faster with identical result digests. One reference patch is NOT exact and is excluded (r1 F1, see X2).
- **The biggest await cost is child processes (planner-inferred).** Tests spawn `vite-node tools/engine-mcp-server.ts` children, estimated at about 5 s each to boot. The conversation file spawns about 107, arena about 49, and legacy invariance 8. The unsplit conversation file takes about 690 s in Vitest but about 187 s when the same work runs in one process.
- **Only three of the ten module-scope await files matter for scheduling.** They are blind-turn-context, legacy invariance and blind-context-source-binding.
- **The retry phase is file-grained and serial.** The timeout reds are marginal tests running at 70–92% of their budget solo. The D635.32 screenshot-probe budget was applied only on the shelved vis-field branch, never on main.
- **The makespan model is historical (r1 F9).** It reproduces 11 trial runs within 14.6 s on average, and gives a floor of about 459 s at 8 workers for today's workload. X1–X3 remove work, so that floor does not bind them. The model is re-fitted after each measured arm.
- **Two corrections against my own records.** D878 called two concurrent probes "solo". D876's 410–450 s prediction for split plus await fix was below the model's scheduling floor.

## 3. Assumptions

| # | Assumption | Status |
|---|---|---|
| A1 | Vitest's cached duration excludes module collection and includes beforeAll. | Proved (supervisor and codex, code read) |
| A2 | Legal movement calls `path()` per cell per actor, and a bounded miss triggers a second search whose code legal movement discards. Other callers do use that code. | Proved (both) |
| A3 | The lazy memoized Dijkstra returns identical results and identical `isGoal` and `rank` call sequences for encounter worlds, in any query order. | Unproven. Planner evidence only. Proof is the X1 controls. |
| A4 | A vite-node engine child costs about 5 s to boot, and a prebuilt bundle is behaviour-equivalent and boots faster. | Unproven. Proof is X3 step 0. |
| A5 | The four inspected gates spent 210–533 s in a serial whole-file retry. | Proved (both) |
| A6 | The two docs files failed in all 15 inspected runs: 11 trial runs plus the 4 gate initial phases. (r1: reworded. r2 5: the earlier "19" was my miscount; it included four report sidecar files.) | Proved as reworded (supervisor and codex) |
| A7 | In the 15 inspected runs, every non-docs red is a timeout apart from five named exceptions (r2 5). The exceptions are: the arena prompt-pin assertion in gate 1183392 (8 ms, the DM-BEST-EFFORT pin fixed in its fix r3); legacy invariance twice (`/tmp` artefact, D870); local-openai SIMULATED once (pin, fixed); and arena-interleave once (spawnSync ETIMEDOUT). | Proved as reworded: all timeout-marked failures ran at least 5,003 ms or their explicit 30 s; exceptions recounted from the untruncated reporter assertions |
| A8 | `src/` is identical on main and the split branch. | Proved at review time; rechecked at each tested commit |
| A9 | No caller mutates an `EncounterState` in place after it has been queried. | Unproven. TypeScript `readonly` only; no runtime freeze. Six state-keyed WeakMap memos already rely on it. The X1 audit proves it only for paths the audited families execute (r2). A landing unit would need a caller inventory or an enforced runtime invariant. |
| A11 | A load rise during a gate means outside contention. | Disproved (r2 N1). The gate's own 8 workers raise load. The void rule now attributes load by process (§7). |
| A12 | sha256 digests alone meet the independent-pin rule. | Disproved (r2 N2). decisions.md:96 also requires reversible bytes, provenance and two-checkout equality (§5). |
| A10 | Scheduling alone cannot take today's workload below about 459 s at 8 workers. | Historical model; not a floor for X1–X3 |

## 4. Rules that bind the choices

- **Rule (Part A:86): module-scope work is budget evasion.** "Generation during module collection before timeouts apply is budget evasion; fix performance within budget." The engine fix comes first. Moving setup into an untimed `beforeAll` would keep the evasion, and a timed hook needs a named exception.
- **Rule (Part A:79–80): budgets and retries.** Budgets are never re-pinned for load, and timeout raises need named exceptions. Each timeout red gets exactly one serial rerun. A per-test retry, a parallel retry and any re-budget are owner questions (§10).
- **Rule D306: no preseeded database shortcut here.** Preseeded database images are allowed only through the opt-in cloning helper with proven equivalence, and seed tests keep fresh DDL. The class-progression dedupe is therefore dropped (r1 F7).
- **Rule (decisions.md:88, :89, :96): independent pins and killed mutants.** Line 88 requires a named compiling runtime mutant with an exact killer for every load-bearing assertion. Line 89 requires mutation scripts to restore exact bytes. Line 96 governs independent pins. Legacy bytes must be captured independently, and load-bearing assertions must kill named runtime mutants. Every experiment below names its wrong-value mutants (r1 F4, F7).
- **Implementation roles.** Codex (`gpt-6-sol`, `--sandbox workspace-write`) implements each patch in a throwaway clone under `/home/vagrant/PhpstormProjects/dnd-gate-exp-*`, working from the planners' reference code. The supervisor commits, runs the controls and runs every measured arm.

## 5. Independent pins captured before any patch (r1 F4, r2 4)

These follow decisions.md:96. The supervisor captures them on clean approved main, and on the split commit where relevant, before any experiment code exists. Each capture records the commit, the tree hash, the tool versions (node, vitest) and a clean `git status`.

The bytes themselves are stored in a reversible encoding: canonical JSON, or base64 for raw bytes. Each capture runs in two independent checkouts, and the two sets of bytes must be equal. Only then is a sha256 recorded.

What is captured:
- the 33 `serializeBlindFixture` rows;
- the `get_turn_context` output for 5117001, 5117002 and 5117011 with `blindFacts` on;
- `generateRoom` canonical JSON for every versioned los_cover seed;
- the D569 v5 registered-arm cells;
- the arena deterministic verdict rows;
- the survival 30-seed per-seed measurements;
- the legacy-invariance capture.

No patched code produces these pins, and comparing two current outputs never substitutes for them.

## 6. Experiments, in order

**Phase 1: engine (src). The root cause and a product win.**

- **X1: lazy memoized Dijkstra.** `src/combat/movement.ts` gets a resumable search per (world, actor, start, bound), registered only for `encounterMovementWorld` worlds. It also memoizes `exhaustivePathCostBound`.

  Controls (r1 F4):
  1. **Frozen reference.** A verbatim, uncached copy of today's `findPath`, `findPathToAny` and `findPathToBest` goes into `tests/helpers/reference-movement.ts`.
  2. **Differential, in two layers (r3 1).** Both layers check results, path cells, thrown errors, and the full `isGoal` and `rank` call logs, in shuffled mixed query order.
     - **Exhaustive differential: experiment evidence only.** It covers every blind, arena-basis and generated-room state, every token, every budget and every cell. It runs once per experiment arm, outside the gate, and its counts go into the records. The planner's version cost about 482 s of uncached search, so it must never enter the gate.
     - **Bounded permanent test in the gate.** It covers three states: one hard blind fixture, one arena-basis fixture and one generated room. It uses every token; budgets of 0, exactly the budget, and full; and every cell for one actor plus a fixed cell sample for the rest. Its solo cost is measured and capped at 5 s. Each of the five mutants below must be killed by this bounded test on its own.
  3. **Independent oracle.** Blind-turn-context's parity oracle switches to the reference implementation and gains a path-cell comparison.
  4. **Pins.** All §5 pins must be unchanged.
  5. **World-callback trace (r2 4).** For each first (cold) query on a state, the differential also compares the ordered log of `canTraverseStep` and `traversal` calls between reference and registered.
  6. **Mutants (r2 4).** Before a mutant runs, the plan names the exact assertion (file and test title) that must newly fail, and that assertion must pass on the unmutated candidate. Mutants are judged by running the named files, never by the whole gate, which already fails on the docs files.
     - Swap the row and column tie-break inside the lazy search only: equal costs, different paths. Killer: the differential's path-cell comparison.
     - Ignore `canEnd`. Killer: differential results plus the blind reference-oracle parity.
     - Use `>=` instead of `>` at the budget. Killer: differential results at exact-budget cells.
     - Relax neighbours eagerly. Killer: the cold-query world-callback trace.
     - Drop the bound from the memo key. Killer: differential results for mixed budgets on the same actor.

  **A9 audit (r1 F5).** An env-gated mode deep-freezes each `EncounterState` the first time any state-keyed memo sees it. The engine-heavy families then run under it: blind, arena, conversation, survival, renderer-profile and d569. Any write throws, so a clean run proves no in-place mutation after a query on those paths. A planted mutation-after-query in a scratch test must throw.

- **X2: memo pack.** It covers the AoE origin memo, the `positionFits` reorder, the projected-movement memo, the occupant index and traversal memo, the `combatantSpace`/conditions memo, and the cover signature intern with one-pass `uniqueSources`.
  - **Excluded (r1 F1).** Replacing the aggregate `TerrainLineTrace.interveningCells` with `[]` is out. It is a plausible wrong value on a returned field. The field keeps its computed value. Deleting it would be a separate API change: remove it from the type and let `tsc` prove there are no readers.
  - **Controls.** An env-gated audit re-derives every cache hit and fails on any difference. §5 pins must be unchanged. Mutants: key AoE selection on actor only; drop the id from the `combatantSpace` key; make `positionFits` skip a cell inside the budget. Each must fail.

- **X3: engine child bundle (the riskiest item).**
  - **Step 0 (r1 F3).** List every engine child launch site and whether the experiment changes it. The known sites are `tools/ai-dm-conversation.ts:2029` (`startMcpClient`, the test path) and `:4327` (the live-agent `engineArgs`), `tools/engine-mcp-dry-client.ts:54`, `tools/agent-conformance.ts:323`, `tools/engine-mcp-proof.ts:70/90/117`, and `tests/unit/tools/engine-mcp-server.test.ts:695/782`. The experiment converts only `startMcpClient` and says so. Count the children spawned per file in one run, and time one vite-node boot against one bundle boot to readiness.
  - **Standalone path (r3 4).** `startMcpClient` is also reached by the conversation command-line tool through `runConversation` (`tools/ai-dm-conversation.ts:2516`, `:7689`), outside Vitest. It uses a bundle only when the bundle's content key validates against the current inputs. A missing or stale bundle falls back to vite-node, today's behaviour. The standalone command-line path is tested both with and without a bundle.
  - **Bundle.** Built by esbuild in globalSetup. It uses a `?raw` text loader and defines equal to the values vite-node resolves in the child. The `import.meta.env.MODE` value is captured from a real vite-node child, because `spell-source-parse-cache.ts:546` branches on it. The key is a content hash over the esbuild metafile's complete input list. Build time counts in the gate wall.
  - **Parity (r1 F2, r2 3).** Each child gets its own copy of the launcher and of every spool the launcher references, initialized to identical bytes. The server reads the proposal, UI-feedback, KB-read and blind-ingress spools (`entrypoint.ts:224`, `:1096`, `:1127`, `:1134`), so a shared copy would let the first child change the second child's input. The same stdin transcripts then run through a vite-node child and a bundle child. Compare exit status, stderr, stdout and every resulting spool file. Normalize only the two proven clock fields, `generatedAtUnixMs` and `writeCompletedAtUnixMs`, set by `Date.now()` at `src/vtt/mcp/entrypoint.ts:724` and `:760`. First grep the child graph to prove these are its only clock reads. A deliberately wrong tool response in the bundle must make the comparison fail. Legacy-invariance pins stay unchanged.

**Phase 2: the retry phase.**
- **X4: fix the two docs reds.** Measured on its own before/after, not inside other arms (r1 F6). First establish whether the tests or the documents are wrong.
- **X5: make the marginal victims cheaper (r1 F7).**
  - **Los-cover.** Build the nine rooms once. Each per-fixture title keeps a fresh second generation and compares it with both the cached room and the committed bytes. The mutant "generator right on the first call, wrong on later calls" must fail.
  - **D569.** Validate the manifest once through a branded validated type. The mutants "validator returns ok unchecked" and "cells from an unvalidated manifest" must fail.
  - **Board-delivery.** Share the two identical arena runs. Each board mode's distinct claim must still fail on its planner-named mutant.
  - **Screenshot probe.** Apply the existing D635.32 budget on main.

**Phase 3: only what the Phase 1 results still justify.**
- **X6: import-aware sequencer.** Entry criterion: a hidden-setup file still ends last. Controls: a permutation unit test, and an executable shuffle test showing two `test:shuffled` seeds produce different file orders (r1 F8).
- **X7: arena split in 3.** Run it only if arena is still a pole after X1–X3, or if an arena retry still costs a whole-file rerun.
  - **Checker (r3 3).** The CONV-SPLIT-01 `preserve.mjs` is hard-coded to the conversation file's declarations and four outputs. It is generalized to take the source file, the output files and the relocated-declaration list as parameters. It must prove itself on the arena split before any X7 timing is read: test-body multiset, per-file import inventory and declaration bytes. A dropped-test mutant must fail it.
  - **Metric (r3 2).** At 8 workers, the model's gain is in the retry phase: one third of the file reruns instead of all of it. So at 8 workers X7 is judged on total gate wall, with the 30 s initial-phase regression guard. It is judged on the initial phase only when tested at 12 or more workers.
- **X8: worker sweep at 10 and 12.** Run with a per-process memory sampler. The arm is void above 16 GB summed RSS or on any swap-in.

## 7. Trial design (r1 F6, F10; r2 1, 2, 6)

**Coverage inventory first (r2 6).** decisions.md:73 applies. Before any arm's timing is read, its JSON reporter output must show the expected, discovered and executed test identities. That means the multiset of file plus full test name, equal to the arm's declared expected inventory. For an arm that splits files, the preservation checker for that split must also pass. That is `preserve.mjs` for the conversation split, and the generalized checker for the arena split (r3 3). An arm that fails the inventory has no valid timing.

**Metric by lever class (r2 1).** Every run reports the initial phase, the retry phase, bundle-build time where relevant, and the total gate wall, all from `node tools/gate-vitest.mjs` reports.
- **Engine and scheduling levers** (X1, X2, X3, X6, X8, and X7 at 12 or more workers). Accepted on the initial phase. The total gate wall must also not regress.
- **Retry levers** (X4, X5, and X7 at 8 workers, r3 2). Accepted on the total gate wall. The initial phase must also not regress.
- **Thresholds.** The saving must be at least 60 s on the lever's own metric. "Not regress" means the other metric's median is no more than 30 s worse. Each run also reports an expected retry figure: its red set times each red file's solo rerun cost.

**Acceptance pairs.** Any arm proposed for landing runs matched, alternating pairs on fixed commits: A/B, B/A, A/B. Each arm has its own fresh cache, prewarmed once.

**Void rule (r2 2).** Load is attributed by process, not by load average.
- **Before each start.** The box must be quiet: no Node, vitest or codex process, and 1-minute load under 1.5 on two checks a minute apart.
- **During the run.** A sampler records every 10 s any Node, vitest, codex or claude-lane process that does not descend from the arm's own gate process. Any such process voids the run.
- **Minimum.** At least 3 valid pairs are needed. A voided pair is rerun, up to twice; with fewer than 3 valid pairs the result is inconclusive.
- **Decision.** Saving = median baseline minus median candidate. It must meet the threshold, and the candidate must win every valid pair.

**Expected red set.** Declared per arm before the pairs. It contains the docs files (until X4 lands) and the named timeout victims. It separates pins from timeouts. Any red outside the declared set disqualifies the arm, even if it passes solo.

**Exploratory arms.** Arms used only to price a lever run once with one prewarm, and are labelled exploratory. The inventory check still applies.

**Sequence.**
1. Exploratory ceiling C1: split + X1 + X2 + X3.
2. Exploratory: main + X1 + X2, to see whether the split is still needed.
3. Exploratory: C1 without X3.
4. The smallest arm that captures most of the gain goes to an acceptance comparison against main. X4 gets its own before/after comparison.

**Box time.** Budgeted from real gate walls of 15–21 min per run. That is about 1.5 h for the exploratory arms, and 2–3 h per acceptance comparison including reruns.

## 8. Consensus loop (owner ruling: self + codex, at most 3 rounds)

**Panel.**
- **Self:** Claude Opus 5.5, author and arbiter.
- **Codex:** `gpt-6-sol` at xhigh, `--sandbox read-only`. The round-1 session is `01a0cf61-3e70-75b3-972e-cb4454ed4553`, resumed by full UUID.

**Model authorization (r1 F9).** In this session the owner named "codex astra-high and gpt-6-sol-xhigh", then revised the panel to "self and codex". Sol at xhigh is the last codex model and effort the owner named. D860 (gpt-5.6-sol) is superseded for this unit by those in-session instructions. D879 records this as the first write after plan mode ends, and the owner is told so they can object.

**Each round.**
1. I prove what I can in §3.
2. Codex lists and tries to prove its own assumptions, then critiques with P1/P2/P3 findings.
3. I verify every finding and send back dispositions and revisions. Codex marks each agree or disagree.
4. I apply the agreed fixes and verify them. Rejections are written down.

The loop stops when codex approves, or when no P1 or P2 finding is disputed. After round 3, anything unresolved goes to the owner.

**Outcome.** Three rounds are done. Every codex finding was verified and accepted: 10 in round 1, 9 in round 2, 4 in round 3. No P1 or P2 finding is disputed. Codex never returned APPROVE, and the round cap stops the loop. The round-3 fixes (r3 1–4) were verified by me but not re-reviewed by codex. The owner can ask for one more codex pass on them.

**Archive.** Background-task output files hold the rounds during plan mode. After approval they are copied to `.claude/consensus/perf-02/`, and the plan to `.tmp-plans/2026-09-23-perf-02-makespan-experiments.md`.

## 9. Records (first writes after plan mode)

- **D879.** The review-model authorization; the planner results; the consensus outcome; the corrections to D878 and D876; and the plan-mode deviation (my writes during plan mode, and the planners' read-only runs).
- **Notes.** Copy the eight notes files into `.tmp/runs/perf-02/<lens>/notes.md`.
- **Memory.** Update the reviewer-model memory with this unit's exception.
- **Mirror.** Push after every records commit and check it with `git ls-remote`.

## 10. Owner questions this plan may raise later (not now)

- Named timeout re-budgets, only if X5 and the engine work leave reds.
- A per-test serial retry, or a parallel retry, in `tools/gate-vitest.mjs`. Both change a pinned retry policy (D264).
