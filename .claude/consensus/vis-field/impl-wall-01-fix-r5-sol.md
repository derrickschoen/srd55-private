<!-- trimmed 2026-09-18 (D683): full codex log (1270630 bytes) replaced by the lane's final message; session id 01a0b20e-61fa-7e52-897b-3b01b026c2ff; the full log is in the mirror history of commit 8889b450 -->

Implemented WALL-01 fix r5.

Files changed:

- [cover.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/cover.ts:87)
- [visibility-field.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/combat/visibility-field.test.ts:1110)
- [scene-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts:241)

### Implemented rule

At a sealed endpoint vertex, the ray is clear only when its other endpoint lies in the closed quadrant occupied by the endpoint’s own cell, including its two boundary half-lines. Every other direction crosses the pinch and blocks sight.

Source hits retain progress `0`; target hits retain progress `1`. Lower-row/lower-column selection, interior vertices, shared edges, cell interiors, and physical cover are unchanged. `coverTierBetweenObjects` uses the same endpoint resolution path.

### Witness derivations

| Witness | Geometry and result |
|---|---|
| `SOURCE_ENDPOINT_JUNCTION_SEALED` | At `(2,2)`, source cell `(2,1)` is TR; ray `(2,2)→(0,4)` leaves into opposite BL through TL `(1,1)` + BR `(2,2)`. Blocked, first `(1,1)`, tier `none`. |
| `TARGET_ENDPOINT_JUNCTION_SEALED` | Reverse ray `(0,4)→(2,2)` arrives from BL, outside target cell’s closed TR quadrant. Blocked, first `(1,1)`, tier remains `half`. |
| `SAME_SIDE_ENDPOINT_GRAZE_CLEAR` | Rays from `(2,2)` toward `(5,1)` remain in closed TR or on its boundaries. Clear, `first=null`. |
| `ADJACENT_CORNER_ZERO_LENGTH` | Source TR and target BL share `(2,2)` across TL `(1,1)` + BR `(2,2)`. Zero-length contact and the diagonal ray are blocked; removing BR restores clear sight. |
| `ADJACENT_CORNER_AGGREGATE_BLOCKED` | The r4 leaks `(2,1)→(2,2)` and `(3,2)→(2,2)` arrive along the sealed junction’s far faces. Both now block; aggregate is `tier none / blocksSight true / first (1,1)`. |
| `EDGE_ARRIVAL_AT_JUNCTION_BLOCKED` | Exact vertical and horizontal arrivals above/right of target cell’s closed BL quadrant both block at `(1,1)`. |
| `OWN_EDGE_DEPARTURE_CLEAR` | Mirrored `(2,2)→(2,0)` lies on closed TR’s own-edge boundary. Clear. |
| `FAR_FACE_DEPARTURE_BLOCKED` | Mirrored `(2,2)→(0,2)` lies left of closed TR, on the wall’s far face. Blocked, first `(1,1)`. |
| `PHYSICAL_COVER_UNCHANGED_BY_VERTEX` | Endpoint optical hit remains `tier none`; physical cover is not raised. |

### D569 scene normalization

Cell `(7,3)` was previously visible only through endpoint-edge rays:

- Fighter: `(2,3)→(7,3)`
- Wizard: `(1,3)→(7,3)`

At sealed vertex `(7,3)`, blocked cell `(7,2)` and Oak Door `(6,3)` form the diagonal pair. Both rays changed from `tier none / false / null` to `tier none / true / first (7,2)`. The cleric was already blocked by the door.

Therefore:

- DM fog gained exactly `(7,3)`.
- Fighter concealment gained exactly `(7,3)`.
- `pendingRequestHash`: `0ec0fbbc… → 28a1eb7e…`
- `coordinatorHash`: `79b076c9… → 87fc04ad…`
- `revisionChecksum`: `52305455… → 9ee96377…`
- Encounter bytes and branch RNG fingerprint remained unchanged: `dd802783…`.

All five r3 consequence tests passed: `5 passed`, `121 skipped`.

### Mutants

- r4 diagonal-only endpoint rule: `ADJACENT_CORNER_AGGREGATE_BLOCKED`, `EDGE_ARRIVAL_AT_JUNCTION_BLOCKED`, and `FAR_FACE_DEPARTURE_BLOCKED` red.
- Block every sealed endpoint: `OWN_EDGE_DEPARTURE_CLEAR` and `SAME_SIDE_ENDPOINT_GRAZE_CLEAR` red.
- Raise physical tier on endpoint hits: `PHYSICAL_COVER_UNCHANGED_BY_VERTEX` red, showing `none → total`.

All mutants were removed.

### Frozen-family counts

| Family | Before `bc6422bf` offers/shotless | After offers/shotless |
|---|---:|---:|
| hard, 75 monsters | 142 / 35 | 142 / 35 |
| brutal, 44 monsters | 57 / 34 | 57 / 34 |
| brutal-b, 42 monsters | 15 / 41 | 15 / 41 |
| brutal-2, 44 monsters | 58 / 36 | 58 / 36 |

The 42-seed generation byte check remained identical:

`count=42`, aggregate SHA-256 `7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc`.

### Verification

- `npx vitest run tests/unit/combat/visibility-field.test.ts --reporter=dot`  
  `54/54 passed`.
- Prescribed ten-suite audit: `246 passed`, exactly `35` known frozen/behaviour reds, `34.63s`.
- Replay+detection: `36/36 passed`, `38.76s`, below the 41-second ceiling.
- Los-cover: `109 passed`, three known load-sensitive 5-second timeouts:
  - `kills M576-E2-WALL-SEALS-ROOM for every living footprint size`: `5365ms`; isolated `5560ms`.
  - `retains a productive first-turn option for every living monster in the versioned basis`: `5593ms`; isolated `5835ms`.
  - `kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side`: `5001ms`.
  No budgets or pins changed.
- `npx tsc -p tsconfig.app.json --noEmit`: passed.
- `npx tsc -p tsconfig.node.json --noEmit`: passed.
- `git diff --check`: passed.
- Lines over 120 characters: `0`.

The exact 35 expected reds remained:

- D569 blind experiment: six titles beginning `validates the exact v5…`, `dry-runs versioned…`, `adds exactly 180…`, `consumes the frozen second encounter family…`, `records exact model effort…`, and `rejects either decisive integrity field…`.
- Second-family manifest: the amended-range pin plus seed titles `6207002`, `6207004`–`6207009`.
- Brutal-b pins: seeds `6206001`–`6206010`.
- Room-generator brutal titles: seeds `6203001`–`6203004`, `6203006`, `6203008`–`6203010`.
- Behaviour titles:
  - `projects fresh options for every requested generated-room monster turn`
  - `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`
  - `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`

Final `git status --short`:

```text
 M src/combat/cover.ts
 M tests/unit/combat/visibility-field.test.ts
 M tests/unit/vtt/scene-snapshot.test.ts
```

WALL-01-FIX-R5 DONE
