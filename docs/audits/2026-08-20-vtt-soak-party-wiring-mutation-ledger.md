# VTT soak party wiring mutation ledger

| Mutation | Killing test | Result |
|---|---|---|
| Required `gap_report_swallowed` | `tests/unit/vtt/party-pack.test.ts` — `gap_report_swallowed reports and strips every out-of-vocabulary feature`; `tests/unit/vtt/replay.test.ts` — `gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped` | Killed at import and replay boundaries |
| Required `fifty_fifty_skewed` | `tests/unit/vtt/soak-runner.test.ts` — `fifty_fifty_skewed alternates reference and external-pack tables from index zero` | Killed |
| Required `pack_smuggles_raw_text` | `tests/unit/vtt/party-pack.test.ts` — `pack_smuggles_raw_text refuses narration fields and never carries their value forward` | Killed |
| Own `duplicate_engine_id_accepted` | `tests/unit/vtt/party-pack.test.ts` — `own_duplicate_engine_id refuses identity collisions even when partial loading is allowed` | Killed |

All mutations were restored before the authorized suites ran. No expectation was generated from mutated output.
