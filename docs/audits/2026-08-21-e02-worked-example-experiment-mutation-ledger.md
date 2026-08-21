# E02 worked-example experiment mutation ledger

Date: 2026-08-21

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `arms_share_examples` | `arms_share_examples: pins all arms and keeps non-empty example blocks separate from byte-identical instructions` | Appended the one-example arm's worked-example block to its shared instruction string. | exit 1; instruction cardinality was 2 instead of 1. | Restored the byte-identical `E02_SHARED_INSTRUCTIONS`; exit 0 in the clean gate. |
| `e02_reuses_e01_digest` | `e02_reuses_e01_digest: preregistration is stable across runs and distinct from E01` | Assigned E01's preregistration digest to E02. | exit 1; the distinct-digest assertion failed. | Restored digesting of E02's own canonical preregistration bytes; exit 0 in the clean gate. |
| `seed_pairing_broken` | `seed_pairing_broken: every E02 seed maps all adjacent arms to one fixture` | Assigned the three-example arm an alternate fixture id inside each paired seed group. | exit 1; fixture cardinality was 2 instead of 1. | Restored the experiment-level fixture id shared across all arms; exit 0 in the clean gate. |

Each mutation was applied alone, killed by its named test, and restored before the next mutation.
