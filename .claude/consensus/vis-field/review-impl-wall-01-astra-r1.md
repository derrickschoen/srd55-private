<!-- trimmed 2026-09-18 (D683): full codex log (413269 bytes) replaced by the lane's final message; session id 01a0a642-35a1-7082-aba2-eda56ea291c1; the full log is in the mirror history of commit 8889b450 -->

## WALL-F3 — P1: Endpoint exclusion still permits sight through a sealed wall

**Evidence:** [cover.ts:369–373](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:369) excludes both endpoint vertices. D642 requires diagonal junctions to block sight.

I reproduced this with a **complete stepped wall** on a 6×6 board:

- Blockers: column 1, rows 0–1; column 2, rows 2–5.
- Observer `(2,1)`; target `(0,3)`.
- Sealed junction: `(2,2)`, between blockers `(1,1)` and `(2,2)`.

Independent rational enumeration of all **16 rays** found:

| Obstruction | Rays |
|---|---:|
| Blocker interior | 10 |
| Sealed vertex strictly inside the ray | 2 |
| Sealed vertex at the source endpoint | 4 |

The last four bypass the check. Production returns `blocksSight:false` and `{kind:'visible', grade:'seen', sense:'normal_sight'}`. My in-memory `REVIEW_FULL_WALL_ENDPOINT` assertion failed accordingly. Reversing the smaller endpoint probe also leaks through a target endpoint.

This is not the retracted D648 isolated-blocker finding: the wall spans the board, and the rational enumeration identifies every possible ray.

**Fix:** Handle sealed endpoint junctions using the source/target’s side of the junction, preventing passage into the opposite open quadrant while preserving legitimate same-side grazing. Add source-endpoint, target-endpoint, reversed-direction, and zero-length-corner witnesses. Revisit affected snapshot expectations through D569 rather than blindly blocking every endpoint.

## Other checks

**Geometry and ordering — read and independently checked**

- Single-blocker touches and outer-face grazes remain clear; shared edges block.
- Interior diagonal pairs block, including TL+BR with a TR→BL ray. Three/four surrounding blockers are covered by interior crossings or diagonal pairs.
- Python `Fraction` enumeration matched the gcd enumeration for **600 ordered integer endpoint pairs**.
- Progress ordering and lower-row/lower-column tie-breaking are explicit at [cover.ts:414–425](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:414). I found no ordering defect.
- Strictly speaking, a diagonal contact is not the Euclidean interior of the cells’ union. The implementation should follow D642’s explicit sealing rule, which resolves that terminology issue.

**Physical cover — verified**

Tier calculation remains independent of optical hits at [cover.ts:445](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:445), aggregation at line 484, and physical-corner selection at line 629. `coverTierBetweenObjects` uses the same physical selection.

My in-memory mutant assigning `total` whenever `firstBlockingCell !== null` was **killed** by `PHYSICAL_COVER_UNCHANGED_BY_VERTEX`: expected `half`, received `total`.

**r3 derivations — verified**

Independent rational geometry reproduced:

| Projection | Before | Candidate |
|---|---|---|
| DM fog | `(4,3)` | `(4,3),(8,3),(9,3)` |
| Fighter concealment additions | — | `(8,2),(9,2),(8,3),(9,3)` |

In-memory substitution of baseline `cover.ts` reproduced all three historical hashes. Candidate code reproduced all three replacements:

| Hash | Baseline prefix | Candidate prefix |
|---|---|---|
| Pending request | `78f31379` | `0ec0fbbc` |
| Coordinator | `f8fa0780` | `79b076c9` |
| Revision | `35c96ecc` | `52305455` |

The structural comparison found **only** `visibleState.cells` and `visibleState.concealedCells` changed. Canonical state bytes were identical; fingerprint remained `dd802783…66b46a`.

The hard-fixture helper independently produced the original **five opened pairs and zero closures**. Reading fixture bytes found **zero diagonal blocked-cell neighbours** at the three replacement positions `(8,1)`, `(8,5)`, `(8,2)`. The R02 tests retain explicit Half/Three-Quarters cover, clear sight, and both 90-foot-shot assertions.

## Commands and results

Ran:

```text
git diff --check e86a4d26 bc6422bf
git diff --numstat e86a4d26 bc6422bf
git diff e86a4d26 bc6422bf -- tests/fixtures fixtures
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
```

Results: **six files, 387 insertions/49 deletions; no fixture changes; diff-check 0; tsc 0/0; zero added lines over 120 columns; clean checkout.**

Vitest ran through `node --input-type=module` and `startVitest`, with `config:false`, `configFile:false`, `cache:false`, `maxWorkers:1`, `isolate:false`, `pool:'threads'`, and `experimental.viteModuleRunner:true`. All substitutions/probes used an in-memory Vite transform.

| Suite | Result |
|---|---:|
| visibility-field | 46/46 |
| scene-snapshot | 8/8 |
| dm-tactical-intel | 6/6 |
| tactical-evaluator-r02 | 2/2 |
| two-room-fixture | 4/4 |
| **Total** | **66/66** |

The six-suite attempt including conversation reported **79 passed/97 failed**, with read-only `/tmp` failures preventing conversation verification. Its changed geometry helper passed separately in memory.

**Performance:** isolated `retains a productive first-turn option for every living monster in the versioned basis`:

- Baseline cover substituted in memory: **4,935 ms, passed**.
- Candidate: **5,740 ms, failed the unchanged 5,000 ms timeout**.

The added work is gcd computation plus up to four blocker lookups per interior lattice vertex. This confirms the reported performance consequence; I have not treated the explicitly deferred performance work as another blocking finding.

Production `cover.ts` SHA-256 before/after was identical:

```text
e8e97592b4dad1a755a978706d83d2f9953fe9f2dd66339c816fc29f7abc616b
```

VERDICT: REJECT (1 P1, 0 P2)
REVIEW DONE.
