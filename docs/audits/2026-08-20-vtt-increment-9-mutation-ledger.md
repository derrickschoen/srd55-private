# VTT increment 9 mutation ledger

Date: 2026-08-20  
Gate: `npx vitest run tests/unit/vtt`  
Baseline when mutations 55–60 ran: 4 files, 36 tests passed. The round-2 owner
attestation control raises the current VTT gate to 37 tests.

The committed skirmish is an engine-only, **test-approved** example. It is not
an owner-approved encounter and records no owner act. The real first-skirmish
fixture is generated and owner-approved through the trusted playtest approval
UI at playtest time.

Each control was applied alone, killed by the named test, and restored before
the next control.

| Mutation | Killing test | Result | Restored |
|---|---|---|---|
| 55 `difficulty_defaults_medium` | `M55-DIFFICULTY-DEFAULTS-MEDIUM refuses a request with no required difficulty before exchange` | Killed | yes |
| 56 `generation_package_omits_fog` | `M56-GENERATION-PACKAGE-OMITS-FOG rejects an otherwise complete package without fog` | Killed | yes |
| 57 `unknown_roster_statblock_accepted` | `M57-UNKNOWN-ROSTER-STATBLOCK-ACCEPTED rejects ids outside the decoded roster` | Killed | yes |
| 58 `unapproved_package_persisted` | `M58-UNAPPROVED-PACKAGE-PERSISTED refuses candidate bytes before owner approval` | Killed | yes |
| 59 `approved_fixture_regenerated_on_load` | `M59-APPROVED-FIXTURE-REGENERATED-ON-LOAD never calls generation while loading saved bytes` | Killed (the byte-equivalent reload test also failed) | yes |
| 60 `tactics_leak_to_player_projection` | `M60-TACTICS-LEAK-TO-PLAYER-PROJECTION keeps all tactics in the DM projection only` | Killed | yes |
| Own `provenance_untracked_manual_patch` | `OWN-PROVENANCE-UNTRACKED-MANUAL-PATCH records the field and revalidates the whole package` | Killed | yes |
| Own `private_party_silently_accepted` | `OWN-PRIVATE-PARTY-SILENTLY-ACCEPTED carries the seam but refuses unavailable private loading` | Killed | yes |
| Round 2 `owner_approval_without_attestation` | `OWNER-APPROVAL-REQUIRES-TRUSTED-ATTESTATION rejects fixture and test construction` | Forged owner identity and untrusted UI activation both rejected | n/a |
