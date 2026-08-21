# VTT soak party wiring mutation ledger

| Mutation | Killing test | Result |
|---|---|---|
| Required `gap_report_swallowed` | `tests/unit/vtt/party-pack.test.ts` — `gap_report_swallowed reports and strips every out-of-vocabulary feature`; `tests/unit/vtt/replay.test.ts` — `gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped` | Killed at import and replay boundaries |
| Required `fifty_fifty_skewed` | `tests/unit/vtt/soak-runner.test.ts` — `fifty_fifty_skewed alternates reference and external-pack tables from index zero` | Killed |
| Required `pack_smuggles_raw_text` | `tests/unit/vtt/party-pack.test.ts` — `pack_smuggles_raw_text refuses narration fields and never carries their value forward` | Killed |
| Own `duplicate_engine_id_accepted` | `tests/unit/vtt/party-pack.test.ts` — `own_duplicate_engine_id refuses identity collisions even when partial loading is allowed` | Killed |
| Required `unknown_spell_id_dropped` | `tests/unit/vtt/party-pack.test.ts` — `unknown_spell_id_dropped refuses an unknown v2 spell id even when partial loading is allowed` | Killed; loader returned `loaded` with the reference removed under mutation, then restored |
| Required `slots_not_decremented` | `tests/unit/vtt/party-pack.test.ts` — `slots_not_decremented wires a referenced v2 spell through the existing resolver and spends its slot` | Killed; remaining stayed at 4 under mutation, then restored |
| Required `v1_rejected` | `tests/unit/vtt/party-pack.test.ts` — `v1_rejected keeps unchanged v1 packs inside the loader version window` | Killed; v1 header was refused under mutation, then restored |
| Round 2 `spell_save_dc_decremented` | `tests/unit/vtt/party-pack.test.ts` — `pack_spell_save_dc_boundary drives failure below DC and success at DC through encounter resolution` | Killed; a total of 14 changed from failure against DC 15 to success against mutated DC 14, then restored |
| Round 2 `spell_attack_bonus_decremented` | `tests/unit/vtt/party-pack.test.ts` — `pack_spell_attack_bonus_boundary drives miss below AC and hit at AC through encounter resolution` | Killed; the AC 17 boundary changed from hit at total 17 to miss at mutated total 16, then restored |

All mutations were restored before the authorized suites ran. No expectation was generated from mutated output.
