# Vane Warren loader/session mutation ledger

Each mutation below was applied alone, run against its named killing test, and
then restored before the next mutation. The command used for every row was:

`npx vitest run tests/integration/vtt/vane-warren-session.test.ts --configLoader runner --testNamePattern='<mutation name>'`

| Mutation | Applied fault | Named killing test | Result |
|---|---|---|---|
| `bounds_mismatch_reintroduced` | Changed the Vane Warren art package from 14 columns to 13 while the authored encounters remained 14 by 10. | `bounds_mismatch_reintroduced: reaches DM controls for all three authored fights with their matching art package` | `exit 1`; package decoding rejected the now-out-of-bounds door before DM controls could mount. Restored to 14 columns. |
| `session_forked` | Rewrote the `room_composed` revision's session id to a new `:fork` id. | `session_forked: keeps one session id while HP and a pact slot carry through all three fights` | `exit 1`; the ordered browser-session journal rejected the mid-chain fork. Restored the invariant session id. |
| `seat_unbound` | Removed the player-seat combatant membership guard. | `seat_unbound: resolves the local-party seat in every fight and rejects a missing combatant with a typed error` | `exit 1`; the later generic missing-token error was not the required `UnknownPlayerSeatCombatantError`. Restored the typed boundary guard. |
| `export_drops_encounter` | Removed the final encounter ordinal before deriving the structured session record. | `export_drops_encounter: End Session emits one parseable export containing all three played encounters` | `exit 1`; the export contained two encounters instead of three. Restored the complete ordinal set. |

All four mutations were restored. The full four-test file passed after
restoration.
