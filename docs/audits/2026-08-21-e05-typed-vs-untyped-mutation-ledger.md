# E05 typed-versus-untyped mutation ledger

Date: 2026-08-21

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `arms_share_typecheck` | `arms_share_typecheck: untyped JS bypasses compilation while preserving byte-identical model requests` | Forced `decodeRoundPlanReply` to compile every JS program regardless of the arm's registered type-check mode. | exit 1; the untyped session exhausted corrections on TS2345 instead of accepting the interpreter-valid program. | Restored the `typeCheckMode !== 'untyped'` branch; exit 0 in the restored focused suite. |
| `shadow_run_leaks` | `shadow_run_leaks: classifies on a disposable state without adding model exchanges or touching encounter state` | Passed the authoritative projection object directly to the injected shadow interpreter instead of `structuredClone(state)`. | exit 1; the injected shadow changed the observed projection round from 1 to 99. | Restored the structured clone; exit 0 in the restored focused suite. |
| `correction_undercount` | `correction_undercount: counts a first-reply failure as one corrected decision and one correction round` | Subtracted the first correction from `correctionRoundCount`. | exit 1; the one failed-first-reply fixture reported zero correction rounds and a zero mean. | Restored counting every correction call; exit 0 in the restored focused suite. |

Each production mutation was applied alone, killed by its named test, and restored before the next mutation.

## Round 2 — supervisor-found real-call telemetry failure

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `empty_schema_path_reintroduced` | `empty_schema_path_reintroduced: records a root-path failure from the real E05 JS decoder as null or non-empty` | Replaced the non-empty capture plus normalization with the original `([^ ]*)` capture and nullish-only fallback, allowing a root-level decoder error to produce `''`. | exit 1; the real E05 JS decode/correction path reached table telemetry decoding, which rejected `calls[0].failedSchemaPath` with Zod `too_small`. | Restored `failedRoundPlanSchemaPath`; exit 0, 1 passed and 38 skipped in the restored focused suite. |
| `schema_loosened_instead` | `schema_loosened_instead: rejects an empty failed schema path while accepting null` | Replaced `nullableText` with `z.string().nullable()` for `failedSchemaPath`. | exit 1; the contract test observed that an empty path was accepted. | Restored `nullableText`; exit 0, 1 passed and 38 skipped in the restored focused suite. |

Each round-2 production mutation was applied alone, proved present by an exact source search, killed by its named test, restored, proved restored by an exact source search, and followed by a passing rerun of the killing test.
