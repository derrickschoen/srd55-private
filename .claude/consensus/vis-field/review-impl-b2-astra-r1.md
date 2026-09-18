# VIS-FIELD B2 — astra review r1 (medium, resumed 01a0a642…, 1.56 M tokens): REJECT (0 P1, 1 P2: sense array max(5) with six kinds)

## B2-F1 — P2: Devil’s Sight adds a sixth sense kind, but imports still allow only five entries

[content-pack.ts:291](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/content/content-pack.ts:291) retains `z.array(combatSenseSchema).min(1).max(5)` after adding `devils_sight`.

**Reproduced:** A literal monster with normal sight, darkvision, blindsight, tremorsense, truesight and Devil’s Sight is rejected entirely:

```text
monsters: 0
diagnostic: malformed_record
path: ["monsters",0,"statblock","senses"]
```

The five previously supported kinds import successfully. Changing only `.max(5)` to `.max(6)` in memory makes the six-kind literal pass. The same schema serves species and background grants.

**Fix:** Permit all six distinct supported kinds, retain duplicate-kind rejection, regenerate the schema, and add an independent six-kind acceptance test.

## Review results

### Detector and query consolidation

- Extracted and compared `detectCombatant` against `ec922c37:src/combat/encounter.ts`: **43 lines, byte-identical**. SHA-256: `90e422864dce9e7b4dc8b9c569db28dab9e77f97d90eed628bd417e7b67383e7`.
- The moved web helper substitutes `terrainWallCells(state)` for `templateBlockedCells(state)`; the latter is exactly a forwarding wrapper at [encounter.ts:2110](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:2110).
- Independent traversal of transpiled runtime imports reached **40 files from visibility-field**, with **zero forbidden modules** and **no runtime path to encounter.ts**. The reverse import is type-only. The unchanged capsule import-graph suite passed.
- Query visibility, target selection, tactical attacks and movement reactions now call the canonical detector. Placement guards precede calls requiring occupied spaces.
- The query witness is a real TypeScript AST assertion. It checks the named import, absence of a top-level `detect` function, and exactly two direct canonical calls in `visibility`. It does **not** resolve symbols or comprehensively prohibit differently named helpers elsewhere.

The four literal matrix outcomes follow from the fixture:

| Target | Independent outcome |
|---|---|
| Column 1, darkness, 5 feet | Located by tremorsense; not seen |
| Column 2, bright | Seen; intervening ordinary darkness does not block |
| Column 3, darkness, beyond tremorsense | Undetected: darkness |
| Column 4, Hidden | Undetected: hidden |

All reciprocal sight results are true because the observer’s cell is bright and the observer is not Hidden.

### Scope, artifacts and decoder

- `git diff --stat ec922c37 dcca84fd`: **18 files, 499+/238−**, matching the amended manifest.
- Frozen-plan SHA matches `6e8b3237…ef8fd2f`.
- In-memory schema generation matched the tracked file **byte-for-byte**. Recursive JSON comparison found exactly **three added `devils_sight` alternatives**, under species, monsters and backgrounds.
- `generateTwoRoomFixtureFiles({check:true})` passed. Source and snapshot bytes match the generator. The source diff is exactly **one deleted `foggedCells: []` line**.
- Legacy validation rejects malformed cells, duplicates and out-of-bounds coordinates before discarding the key. Distinct-list equality and fresh round-trip tests passed.
- No fixture or frozen-hash test changed under `tests/fixtures` or `room-roster-preflight.test.ts`. The **82 JSON and two TypeScript fixture files containing legacy fog references** remain unchanged.
- Los-cover now compares real-decoded states; full-envelope generation determinism remains separately tested at lines 330–331. Two-room retains generator `--check` coverage.
- The staged visibility test changes only its B2 boundary assertions. Semantic fog comes from `projectDmView`, not a direct field-service import.

### Every remaining `foggedCells` reference

`rg -n 'foggedCells' src tools` returned **36 matching lines**:

| File and lines | Classification |
|---|---|
| `combat/visibility.ts:93,315,524,735` | Retained derived DM projection types, producer and mapper |
| `vtt/encounter-board.ts:113,263,716,872` | Projection contracts, derived producer and renderer |
| `vtt/encounter-state-codec.ts:35,406–414` | Legacy validation and discard |
| `vtt/semantic-board-payload.ts:39,270,360,454,553,554` | Legal projection serialization; B6 owns remaining semantic changes |
| `vtt/encounter-app.ts:2208,2211` | Projection consistency checks |
| `vtt/accessible-board.ts:182` | Renderer input |
| `tools/ai-dm-blind-board-snapshot-check.ts:113` | DM projection comparison |
| `tools/ai-dm-screenshot-probe.ts:242,313,575,968,1053,1190,1473,1857,1958,2521` | Probe contracts and projection/image I/O |
| `tools/assets/generate-starter-art.ts:115` | Authored renderer-preview input |

No canonical-state consumer remains.

### D569 persistence demonstration

I reconstructed the legacy empty-key state and current state, then generated both persisted revisions.

- Old checksum reproduced: `df6f2cce…35fa4ee`.
- Current checksum reproduced: `35c96ecc…f900385`.
- Body differences: **only** `encounterState.foggedCells` removal and `branchRngStateFingerprint`.
- Independently recomputed fingerprint:
  `dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a`.
- Request and coordinator hashes reproduced unchanged.
- Before/after identity and negative mutation controls remain intact.

### B6-owned failures

I reproduced both expected failures:

1. `M576-E3-SEMANTIC-TERRAIN-NOT-A-PARTITION`.
2. `validates emitted adjustment_delta_truncated_board against the handler output schema`.

The latter’s diagnostic independently reproduced **7,817 → 9,322 bytes**, **106 derived fog cells**, and the **8,192-byte cap**. It drops `light, adjacency, objects` instead of only `light`. Deferral is appropriate: plan line 230 explicitly assigns that test to B6, which owns truncation calibration.

## Commands and tests I ran

| Command/check | Result |
|---|---|
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | **0** |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit` | **0** |
| `node scripts/check-offer-environment-architecture.mjs --self-test` | **77 fixtures passed** |
| `node scripts/check-command-outcomes.mjs` | **0**; 1 check passed, 1,624 TS files checked |
| `git diff --check ec922c37 dcca84fd` | **0** |
| Added-line length audit | **0 over 120 columns** |
| Targeted 13-suite run | **281 passed / 2 failed**: known semantic red and one 5-second timeout |
| Isolated los-cover timeout rerun | **1/1 passed**, 4.744 seconds |
| Replay + detection pair | **36/36 passed**, **38.51 seconds**, below ≈41-second ceiling |
| Artifact and persistence probes | **2/2 passed** |

Tests ran through `node --input-type=module` and programmatic `startVitest`, with `config:false`, `cache:false`, one thread worker and in-memory transforms.

**Mutants:**

- `ENGINE_QUERY_OLD_LADDER`: **killed by both** AST witness and behavior matrix.
- `ACTOR_KNOWLEDGE_FOG_OVERRIDE`: **killed** by the AST witness.
- Own decoder boundary mutant, `column >= width` → `column > width`: **killed** by the out-of-bounds literal.

Production hashes before/after were unchanged; worktree remained clean:

```text
engine-query-port.ts     c0155868975f5b9f86cdb13355540019f58875c31dcac52a4a044038fd3808d9
actor-knowledge.ts       beff0581a4ce2ec7d79e3c8ef017fc05d9419221fefca994120bd494e6aae0d6
encounter-state-codec.ts 0c592f652995a69ba81108bb510c83f5dda6e07f63a8b3c2d06b0f494cc4dfaf
content-pack.ts          1298613c53f740832c3211bff22df7e826cd4cff5cb1a6a00c05e0fb617503a1
```

VERDICT: REJECT (0 P1, 1 P2)
REVIEW DONE