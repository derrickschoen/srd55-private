# VTT increment 10 mutation ledger

Date: 2026-08-20  
Baseline before mutation work: 35 authorized unit files, 1,530 tests passed;
10 sim files, 176 tests passed; bridge process 6/6; browser 1/1; both TypeScript
configs exited 0.

Each mutation below was applied alone to production code after the baseline was
green. The mutation was proved present with a source search, the named test was
run and failed, the original code was restored, restoration was proved with the
inverse source search, and the same named test passed.

| Mutation | Killing test | Mutant | Restored |
|---|---|---:|---:|
| 61 `telemetry_omits_rng_transition` | `M61-TELEMETRY-OMITS-RNG-TRANSITION identifies the first missing RNG post-state` | exit 1 | exit 0 |
| 62 `controller_response_misattributed` | `M62-CONTROLLER-RESPONSE-MISATTRIBUTED rejects a valid response linked to the prior request` | exit 1 | exit 0 |
| 63 `latency_changes_replay_hash` | `M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing` | exit 1 | exit 0 |
| 64 `replay_calls_live_controller` | `M64-REPLAY-CALLS-LIVE-CONTROLLER exposes no controller or exchange capability` | exit 1 | exit 0 |
| 65 `void_branch_replayed_as_live` | `M65-VOID-BRANCH-REPLAYED-AS-LIVE refuses a void revision marked active` | exit 1 | exit 0 |
| 66 `projection_divergence_ignored` | `M66-PROJECTION-DIVERGENCE-IGNORED pinpoints the first bad player projection hash` | exit 1 | exit 0 |
| Own `token_counts_influence_reducer` | `OWN-TOKEN-COUNTS-CANNOT-INFLUENCE-REDUCER keeps usage out of state and projections` | exit 1 | exit 0 |
| Own `bundle_version_outside_window_accepted` | `OWN-BUNDLE-VERSION-OUTSIDE-WINDOW is refused while the adjacent migration remains exact` | exit 1 | exit 0 |

The machine-readable phase ledger is
`docs/audits/2026-08-20-vtt-phase2-mutation-ledger.json`. Its manifest test
proves mutations 1–66 appear in the binding plan and every ledgered killing-test
name remains present in its named test file; it does not rerun historical
mutants.
