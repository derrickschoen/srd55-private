# Envelope normalization mutation ledger

Date: 2026-08-22

Each production mutation was applied alone, killed by its named test, and
restored before the next mutation. No live model was used.

| Mutation | Named killing test | Production mutation | Mutated result | Restoration |
|---|---|---|---|---|
| `single_program_accepted_for_batch` | `single_program_accepted_for_batch: refuses a bare program for a batch and names every missing association` | Removed the exactly-one association guard and narrowed downstream validation to the first requested monster, allowing a four-monster request to resolve with one program. | exit 1; the resolved plan contained only `normalization-monster-1`, silently dropping monsters 2–4. | Restored the exactly-one guard and validation against the original request; the restored control run passed. |
| `wrong_identity_filled` | `wrong_identity_filled: refuses present-but-wrong expectedRevision instead of replacing it` | Made envelope filling overwrite `expectedRevision` even when present. | exit 1; the expected-revision case no longer threw. | Restored fill-on-absence only; all five identity cases passed in the restored control run. |
| `normalization_untracked` | `normalization_untracked: records the closed alias rule when the real E05 decoder normalizes a reply` | Forced `envelopeNormalizationRule` to null in the experiment call record. | exit 1; the real `plans`-alias call was valid but telemetry remained null instead of `plans_collection`. | Restored the decoder-provided enum; the restored control run passed. |

Restored named-control command: `npx vitest run --configLoader runner tests/unit/bridge/js-round-plan-integration.test.ts tests/unit/vtt/experiment-orchestrator.test.ts -t 'single_program_accepted_for_batch|wrong_identity_filled|normalization_untracked'` — exit 0; 2 files passed and 7 named cases passed. The final gate is reported by the implementation handoff.
