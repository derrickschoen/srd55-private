# Art exchange

The art contract is `contracts/vtt-handoff/v1/art.schema.json`, with TypeScript shapes in `contracts.d.ts` and `src/vtt/handoff/v1/contracts.ts`. Linux owns validation and staging. Windows or another producer may write a result bundle, but it does not decide whether that bundle is safe to consume.

## Paths and ownership

- Linux writes immutable requests to `art/outbox/<uuid-v7>.request.json` with `npm run art:request` (`tools/vtt-handoff/art-request.ts`).
- The producer writes `art/inbox/<uuid-v7>.result.json` and payloads below `art/inbox/<uuid-v7>/`.
- Linux validates a completed result with `npm run art:validate`, then copies and revalidates it into `art/review/<uuid-v7>/` with `npm run art:stage` (`art-validator.ts`, `art-stage.ts`).

Writers must use their owned directory and must not alter `contracts/v1`, fixtures, another producer's bundle, or `reports/claude`. The Linux stage uses anchored, no-follow reads and exclusive promotion. It verifies source identities again after copying; the result manifest is written only after payload checks.

## Request and result shapes

An `ArtRequest` has `schemaVersion`, `requestId`, `assetId`, `brief`, requested `views` and `passes`, `pixelsPerCell`, and footprint. The current batch requests top-down and isometric views, four facings (0, 90, 180, 270), 128 pixels per cell, and albedo/normal with emissive only where requested. Sample asset IDs include `tile.stone.floor`, `wall.stone`, `door.wood`, `prop.barrel`, `prop.table`, `prop.pillar`, `prop.torch`, `token.adventurer`, and `token.goblin` (`tools/vtt-handoff/art-request.ts`).

An `ArtResult` reports `complete`, `partial`, or `blocked`, lists assets and frames, and supplies provenance. Complete results must have no errors. Every declared source and image path must be portable and relative. Every payload is covered by a provenance SHA-256. When both views are requested, each frame declares its view or `provenance.frameViews` resolves it unambiguously.

PNG validation checks signature, chunks, dimensions, color model, alpha expectations, pass dimensions, physical scale, pivots, and the requested facing set. The per-file limit is 64 MiB, the whole result limit is 256 MiB, the result JSON limit is 1 MiB, and provenance is limited to 4,096 entries (`tools/vtt-handoff/art-validator.ts`). Files outside the bundle, traversal paths, symlinks, changed files, hash mismatches, scale mismatches, missing facings, and incomplete results are refused.

At runtime, `src/vtt/handoff/scene-snapshot.ts` maps engine asset provenance to the renderer's logical IDs. Unknown presentation has an explicit role fallback recorded in `assetFallbacks`; it does not add art data to persisted encounter or visibility-domain types. The classic top-down renderer uses the frame view/provenance when available; isometric-only input keeps its existing presentation fallback.

The Windows probe is separate from art validation. `npm run windows:probe` opts in only with `VTT_WINDOWS_INTEROP=1`; it proves independent Windows-to-Linux and Linux-to-Windows byte/hash paths through the configured handoff root and removes only the named random probes (`tools/vtt-handoff/windows-probe.ts`).
