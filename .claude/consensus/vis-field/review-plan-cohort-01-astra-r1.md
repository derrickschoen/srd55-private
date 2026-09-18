<!-- trimmed 2026-09-18 (D683): full codex log (1548614 bytes) replaced by the lane's final message; session id 01a0b1ca-33de-7e61-a6b4-37921da22565; the full log is in the mirror history of commit 8889b450 -->

**PLAN-F1 — P2 — Plan lines 243–268: v6 lacks an experiment-identity boundary.**

Evidence: `tools/d569-blind-experiment.ts:705` derives session keys from `{ family, arm, seed, rep }`; row matching at line 762 likewise omits manifest identity. The unchanged hard fixtures also retain their state and visual-source hashes. Consequently, the planned changes leave **240 primary core cells, 330 including hints, and 240 second-family core cells** indistinguishable across versions by these checks. Cardinality and manifest-path tests do not prevent historical hard rows from entering v6.

Fix: specify version/manifest identity in v6 execution and observed-row validation, preserve historical v5 behavior, and add cross-version rejection witnesses using the unchanged hard seeds. Keep content hashes truthful; use a separate experiment identity. Include the outer v6 manifest hash required by the costing ledger.

**PLAN-F2 — P2 — Plan lines 227–241, also 23–26: the namespace audit does not establish the claimed absence.**

Evidence: all three prescribed commands genuinely return empty stdout and exit 1:

```sh
git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
```

However, the worktree decision file has **22,707 lines**, versus **23,068** in the authoritative main copy. Moreover, these patterns miss both namespace notation (`6209xxx`) and TypeScript numeric separators (`6_209_001`). This command finds all three authorized reservations at main decision lines **23048 and 23061**:

```sh
rg -n '6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
```

Fix: move the audit into an explicit pre-Batch-2 gate; cover both decision records and relevant seed representations; record actual output and classify authorized reservations separately from prior use. Reserve all three families before candidate rejection/reselection. Specify how replacement ranges update the fixed allowed-file manifests before generation.

**PLAN-F3 — P2 — Plan lines 340–353: the speculative-planning oracle remains unspecified.**

Evidence: the formula matches `src/vtt/speculative-planning.ts:638–660`, but the plan provides no concrete scene, movement radii, proposal-reference sets, scores, fact-key order, or expected mutation result. “Add enough” dependencies does not demonstrate that **at least nine eligible, non-shadowed candidates** reach the eight-entry slice. Merely asserting eight outputs would not establish truncation. “Empty or deterministically change” also leaves the mutation expectation selectable after observing output.

Fix: predeclare the scene and a hand-calculated candidate table, including reachability proofs, tie ordering, the excluded ninth candidate, and the exact corner-mutation result. Separate the real `buildHostScenarioMenu` integration witness from a hand-authored dependency-table truncation witness if necessary. This closes the largest remaining opportunity to derive an expectation from changed-code output.

**PLAN-F4 — P3 — Plan line 216: Batch 6’s declared file count is incorrect.**

Evidence: it lists **eight**, not seven, files. Actual batch counts are **3/3/10/10/10/8/4/4/3/1**. The union contains **52 paths: 18 existing and 34 intentionally new**. Every existing path is present at the specified checkout.

Fix: change the heading to eight files. All batches remain within the ten-file limit.

Verification supports the other principal mechanisms:

- `git rev-parse HEAD` returned **807d2e3c8cbbda11cfa26d078ac7739f2954e27e**. `sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md` matched **6852051d267a983f20d398fb1873b8399a6eac4848beb76e896f7a7d12d36963**; `wc -l` returned **400**.
- In-memory Node probes using the real generator reproduced **20 first-regeneration + 20 independent-regeneration + 7 productivity violations**. All **20/20** structural differences were exactly `$.encounter.state.foggedCells`, with committed value `[]`. The proposed committed-side projection is appropriately narrow; retain explicit rejection tests for other changes and for legacy keys in new v2 brutal fixtures.
- Independent Python rational-ray enumeration confirmed the scout result: fighter and cleric each have **12 interior-blocked + 4 shared-edge-blocked rays** across the four source corners; wizard has **16 interior-blocked rays**. The runtime labels were exactly `['Dodge', 'End Turn']`.
- Room-8 probes confirmed monsters **1/2/4** have only Dodge/End Turn and select zero-foot Dodge at the stated cells. Monster **5** sees the wizard and selects the stated Dash to `(12,6)`: **10 steps × 5 feet + 5 additional difficult-terrain feet = 55 feet**.
- The cap probe produced a schema-valid **57,580-byte** semantic block and exactly: `RangeError: Protected blind semantic-board facts require 57580 UTF-8 bytes; maximum is 32768.` Disabling only the guard in memory accepted **57,580 bytes**. This is a real enforcement witness.
- The proposed separate generation invocations and A/B byte comparison are genuine generation checks. Require the active v6 test to use `canonicalD569SecondFamilyRegeneration`; the existing blind-experiment test helper at lines 294–296 returns committed fixture bytes as its regeneration.
- The productivity replacement retains the required active-family properties, while historical byte pins and round-execution tests remain. The proposed v1/v5 separation preserves meaningful historical validation.

These behavior measurements are for **807d2e3c**, before WALL-01; post-predecessor verification remains mandatory. No cohort generation, full Vitest, Playwright, build, model call, or filesystem edit was performed. Final `git status --porcelain` was empty.

VERDICT: REJECT (0 P1, 3 P2)
REVIEW DONE
