<!-- trimmed 2026-09-18 (D683): full codex log (706254 bytes) replaced by the lane's final message; session id 01a0b20e-61fa-7e52-897b-3b01b026c2ff; the full log is in the mirror history of commit 8889b450 -->

The vertex rule is correct, but four tests lose their intended subjects. Per the stop condition, I made no changes. The minimal scene edits below were temporarily proven, then fully restored.

| Test | Geometry and pre/post trace | Decision |
|---|---|---|
| `scene-snapshot` persisted bytes | Blockers: cell `(7,2)` and door `(6,3)`, diagonally meeting at vertex `(7,3)`. Fighter `(2,3)` and wizard `(1,2)` previously reached targets `(8,3)/(9,3)` along row-3 corner rays—for example `(3,3)→(8,3)` and `(2,3)→(9,3)`. Cleric `(1,4)` was already blocked by interiors. Each last-clear ray changes from `tier:none / blocksSight:false / first:null` to `tier:none / blocksSight:true / first:(7,2)`. | Correct D642 consequence. DM fog changes `{(4,3)}` → `{(4,3),(8,3),(9,3)}`. Fighter concealment additionally gains `(8,2),(9,2),(8,3),(9,3)`. No fixture generator owns this hand-authored state. Normalization was derived but not applied because later rows trigger the mandatory stop. |
| `blocked auto-submit` fallbackReason | The helper moves blockers `(10,1)→(9,1)` and `(10,5)→(9,5)`. Those now meet existing `(10,2)` and `(10,6)` diagonally at vertices `(10,2)` and `(10,6)`. Last-clear rays include `(19,2)→(1,2)`, `(13,2)→(1,2)`, `(14,1)→(2,4)`, `(19,6)→(1,6)`, and `(18,6)→(1,6)`. Each changes from `none/false/null` to `none/true/(9,1)` or `none/true/(9,5)`. | Correct D642 consequence, but the blocked-auto-submit subject disappears before execution: expected five opened pairs becomes `[]`. Requires scene re-authoring. |
| unresolved-frontier `sim_controller` | Same two vertices and five rays as above. The intended frontier-producing visibility openings are eliminated. | Correct D642 consequence, but the unresolved-frontier subject disappears. Requires the same scene re-authoring. |
| `dm-tactical-intel` R02 row | Scout `(19,3)` targets fighter `(1,2)`. Moving `(10,2)→(9,2)` created a diagonal pair with `(10,3)` at vertex `(10,3)`. Both formerly clear row-3 rays, `(19,3)→(1,3)` and `(19,3)→(2,3)`, change from `none/false/null` to `none/true/(9,2)`. Aggregate physical cover remains `half`, but optical sight changes clear→blocked, so the row becomes `HIDDEN`. | Correct D642 consequence, but the intended visible, non-nearest shot/reason row disappears. Requires scene re-authoring. |
| `tactical-evaluator-r02` two Scout shots | Same `(9,2)/(10,3)` pair at `(10,3)`. First Scout changes from `tier:half / blocksSight:false / first:null` to `half/true/(9,2)`; its reach becomes illegal and `minimumMovementFeet` becomes `null`. Second Scout `(19,5)` remains `three_quarters/false/null`. | Correct D642 consequence, but “both 90-foot Scout shots” is no longer true. Mandatory stop. |

Derived scene-snapshot normalization, not applied:

- `pendingRequestHash`: `78f31379…4049` → `0ec0fbbc…b8e0`
- `coordinatorHash`: `f8fa0780…9c66` → `79b076c9…36cd`
- `revisionChecksum`: `35c96ecc…0385` → `52305455…b3a8`
- `branchRngStateFingerprint`: remains `dd802783…46a`; encounter-state bytes did not change.

Minimal proposal:

- In both R02 helpers, move the re-authored blocker from `(9,2)` to `(8,2)`. This retains the original `half` and `three_quarters` cover tiers while restoring both 90-foot shots.
- In the conversation helper, move `(9,1)/(9,5)` to `(8,1)/(8,5)`. This restores exactly the original five opened monster→player pairs with zero closed pairs.

Temporary proof of that proposal: 3 files, 4 passed, 114 skipped; both conversation tests passed in 14.7 seconds each. All temporary edits were restored.

Verification:

- `npx tsc -p tsconfig.app.json --noEmit` — exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` — exit 0.
- Current five-red reproduction — 5 failed, 121 skipped, exactly the five named failures.
- Visibility/LOS run — visibility-field 46/46; LOS 110/112. The two LOS 5-second tests also timed out alone at 5.29 and 5.55 seconds, so I did not classify them as load-only.
- `git diff --check` — exit 0.
- `git status --short` — empty; files touched: none.

Full-run timeouts treated as load-only and untouched:

- node-runtime WebSocket close-code case
- `M576-E2-COVER-OVERLAPS-SPAWN`
- `rejects a deleted committed spec discovered through the Git seam`
- `js-round-plan-integration`
- `vane-tpk-clean-terminates`

WALL-01-FIX-R2 BLOCKED
