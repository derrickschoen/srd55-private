BLOCKED: D626.8’s demonstration invariant is false for the scene fixture.

Observed fixture:

- Bounds: 10×7.
- Seat observer: fighter at `(2,3)`; only the owned fighter is eligible.
- Other tokens: cleric `(1,4)`, wizard `(1,2)`, brute `(3,3)`.
- Blocked cell: `(7,2)`.
- Sight-blocking objects: `(6,3)` and `(6,4)`.
- Ordinary darkness: `(4,3)`.
- No obscurement regions.

Hand-derived/current result: ordinary darkness is target-cell-only, so the normal-sight fighter conceals `{(4,3)}`. This matches `projectPlayerView`.

The authored fog list is `{(8,1),(8,2)}`. Therefore persisted `visibleState` changes in at least two fields:

- `concealedCells`: `[(8,1),(8,2)]` → `[(4,3)]`
- `cells`: complement of the authored set → complement of `{(4,3)}`

This violates D626.8’s requirement that the byte-level difference be exclusively `concealedCells`. I removed the temporary dump and did not normalize or alter any hash.

`BLOCKED: persisted visibleState changes both cells and concealedCells, contrary to D626.8`
tokens used
1,670,389
BLOCKED: D626.8’s demonstration invariant is false for the scene fixture.

Observed fixture:

- Bounds: 10×7.
- Seat observer: fighter at `(2,3)`; only the owned fighter is eligible.
- Other tokens: cleric `(1,4)`, wizard `(1,2)`, brute `(3,3)`.
- Blocked cell: `(7,2)`.
- Sight-blocking objects: `(6,3)` and `(6,4)`.
- Ordinary darkness: `(4,3)`.
- No obscurement regions.

Hand-derived/current result: ordinary darkness is target-cell-only, so the normal-sight fighter conceals `{(4,3)}`. This matches `projectPlayerView`.

The authored fog list is `{(8,1),(8,2)}`. Therefore persisted `visibleState` changes in at least two fields:

- `concealedCells`: `[(8,1),(8,2)]` → `[(4,3)]`
- `cells`: complement of the authored set → complement of `{(4,3)}`

This violates D626.8’s requirement that the byte-level difference be exclusively `concealedCells`. I removed the temporary dump and did not normalize or alter any hash.

`BLOCKED: persisted visibleState changes both cells and concealedCells, contrary to D626.8`
