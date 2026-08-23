# D348.1 senses mutation ledger

Each production mutation below was applied alone. Its named imported-pack test was run, the observed
nonzero exit was recorded, and production code was restored before the next mutation. The restored
focused file finished with `Tests  6 passed (6)`.

SRD basis: heavy obscurement at `docs/srd/full/srd-5.2.1.txt:661-664`; Blur at
`docs/srd/full/srd-5.2.1.txt:6978-6995`; Blindsight at
`docs/srd/full/srd-5.2.1.txt:11356-11362`; Invisible at
`docs/srd/full/srd-5.2.1.txt:11838-11850`; and Truesight at
`docs/srd/full/srd-5.2.1.txt:12216-12231`.

## Boundary control

The Blindsight comparison was changed from inclusive (`distance <= range`) to exclusive. The named
`blindsight_ignores_range and blindsight_range_boundary: sees at exactly 30 feet and not one 5-foot cell beyond`
test produced exit 1 because visibility at exactly 30 feet became false. The inclusive comparison was restored.

## Restored negative controls

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `blindsight_ignores_range` | In-range Blindsight stopped comparing distance with its declared range. | `blindsight_ignores_range and blindsight_range_boundary: sees at exactly 30 feet and not one 5-foot cell beyond` | exit 1; the target one cell beyond 30 feet remained visible |
| `truesight_no_illusion_pierce` | Truesight was removed from the visual-illusion bypass predicate. | `truesight_no_illusion_pierce and blur_visual_sense_bypass: sighted and blindsighted attackers produce different attack outcomes` | exit 1; the Truesight attack against Blur missed instead of hitting |
| `obscured_still_visible` | Heavy subject-cell obscurement stopped blocking normal sight. | `obscured_still_visible and subject_cell_obscurement_edge: obscured subject is unseen while its adjacent clear cell remains visible` | exit 1; the obscured subject remained visible |
| `invisible_condition_ignored` | Normal sight stopped rejecting an Invisible subject. | `invisible_condition_ignored: invisible target differs under normal sight, in-range blindsight, and in-range truesight` | exit 1; normal sight reported the Invisible subject visible |

All four mutations and the independent boundary mutation were restored. No assertion, fixture
expectation, or import diagnostic was weakened or regenerated from mutated output.
