# VIS-FIELD B6 — astra review r1 (medium, resumed 01a0a642…, 1.72 M tokens): ACCEPT, no findings

No B6 findings requiring changes.

### Scope and contracts

- `git diff --stat 4c6a3315 10cc9f5e`: **11 files, 516 insertions, 32 deletions**. Clean working tree at `10cc9f5e`.
- Frozen-plan SHA matches `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- Screenshot-test changes are exactly the D635.32 comment and named 10-second timeout. The visibility-field test changes only its final migration stage.
- In-memory schema generation using the generator’s exact Zod options produced **159,453 bytes**, byte-identical to the committed schema.
- The requested `impl-b6-blocked-sol.md` was absent; I read `impl-b6-sol.md` and D635.31’s account of that stop.

### Implementation evidence

**Optional, strict v2 block.** Observer, subject, and containing visibility objects reject unknown fields at `src/vtt/mcp/schemas.ts:671–683`; blind validation mirrors this. Literal acceptance, omission, and malformed-input tests passed.

**Player boundary.** `projectPlayerBoard` builds from `PlayerView` (`encounter-projections.ts:322`), without the new visibility block. Serialization explicitly requires DM audience (`semantic-board-payload.ts:601`), and turn-context delivery rejects player projections (`:673`). MCP attachment paths are DM-specific (`engine-server.ts:1568–1579`). I found no DM-semantic-to-player delivery path.

**Single sight service and serializer seam.** Projection uses `visibilityField` and `cellsThatCanSee` at `semantic-board-payload.ts:334/344`; serialization consumes supplied rows at `:604–612`. Terrain/template imports support effect geometry, not another sight ladder. Sentinel cells are in bounds and contradict the complete geometric fields. Both recomputation mutants failed the sentinel assertion.

The final single-owner test is a **lexical source check**, not a transitive import-graph proof: aliases or delegated helpers could evade it. My source inspection found no such bypass.

**Truncation.** The ordered classes and switch agree (`semantic-board-payload.ts:27–32`, `engine-server.ts:2920–2942`). I reproduced attachment sizes, including truncation metadata:

| Stage | Bytes |
|---|---:|
| Complete | 16,120 |
| Without light | 15,167 |
| Without adjacency | 13,168 |
| Without objects | 12,259 |
| Without visibility | 5,492 |

Thus all four removals are required under 8,192 bytes. Removing the visibility audit entry failed the exact dropped-class assertion.

### Blind-cap ruling

I consider **32,768 bytes within B6’s explicitly open cap choice as interpreted by D635.32**, with the owner notification retained. Advice delivery still uses its existing 8,192-byte cap.

Independent runtime measurements matched:

| Hard seed | With visibility | Without visibility |
|---|---:|---:|
| 5117001 | 16,603 | 8,517 |
| 5117002 | 17,597 | 7,514 |
| 5117005 | 13,406 | 6,690 |

A reporting correction: blind delivery **rejects** oversized protected semantic blocks; it does not truncate them (`blind-turn-context.ts:1304–1316`). The report’s removal table is hypothetical. Also, the semantic allowance is **additional to** the 65,536-byte base allowance, not contained within it.

### Independent oracles and provenance

- Rational-arithmetic corner-ray enumeration, independent of the production tracer: **18 visible cells**, with only `[(4,0),(3,1)]` concealed in the 5×4 fixture (`semantic-board-payload.test.ts:65–98`).
- The eastward 5-foot line overlaps cell `(0,0)` with positive area. On the unobstructed bright 3×1 board, all three virtual-observer cells see the Invisible subject’s location; the subject’s condition does not alter that declared virtual profile (`:404–474`).
- Recounted **57 additional string leaves and 12 normalized paths**: `3 + 6×5 + 6×4`. This explains **493→550** and **131→143**. An in-memory probe using the actual source-binding assertion rejected all three changes: actor, profile, and numeric cell (`blind-context-source-binding.test.ts:579–605`).
- All **10 D569 fixture files** are byte-identical to the parent. Board-delivery test diff is empty; historical **31,995/32,000-byte** assertions and both hashes remain unchanged (`ai-dm-board-delivery.test.ts:583–584,700–711`).

### Commands and results — my runs

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
git diff --check 4c6a3315 10cc9f5e
```

All exited **0**. Added-line audit: **0 lines over 120 columns**.

Tests ran through `node --input-type=module` and programmatic `startVitest`, with configuration bundling disabled, one thread worker, `cache:false`, and in-memory transform plugins:

- Nine targeted suites: **275 passed, 4 failed, 1 suite could not collect**. Source-binding collection failed on `/tmp` EROFS. Boundary subprocesses failed on `.vite-temp` EROFS; two stdio tests reported early child closure.
- Named D524 primer: **1/1**, **5.562 seconds**.
- Replay + detection: **36/36**, **39.16 seconds**, below approximately 41 seconds.
- Schema/cap probe: **1/1**.
- Calibration probe: **1/1**.
- Source-binding probe: **1/1**.
- D569 targeted checks: both blocked by `/tmp` EROFS before reaching their assertions; I do **not** claim those pins executed successfully here.

Own in-memory mutants, all killed:

1. `SEMANTIC_VISIBILITY_RECOMPUTED` — recompute observer cells during serialization.
2. `VISIBLE_FROM_USES_SECOND_LADDER` variant — recompute reverse visibility instead of preserving supplied cells.
3. `VISIBILITY_TRUNCATION_UNAUDITED` — omit visibility from the removal record.

Production SHA-256 values printed before and after were identical:

```text
semantic-board-payload.ts 77cfdb2d65cfdfee214b1ecadd0311d3c2ce717fd1100883ba75e79a6773cbbc
engine-server.ts          b5eccfda2b8935d43efab043c75257b8493917321467f54f290364af33ae4627
schemas.ts                131b1a1a18246cbd1db304975847552736eeeb280a7f95fde9025d517ec095e8
```

VERDICT: ACCEPT
REVIEW DONE.