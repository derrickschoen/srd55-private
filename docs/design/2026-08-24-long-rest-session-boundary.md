# D373.7 Long Rest session boundary

The DM completes a Long Rest from the adventuring-day session. Completion ends
the current adventuring day, writes a durable `long_rest_completed` revision,
and exposes that revision as a per-character summary card. The implementation
reuses the landed Short Rest seams: `PartySessionState` owns resources,
`EncounterSessionJournal` records and replays the transition, and the DM host
is the only UI command authority.

## SRD clauses

| Behavior | SRD 5.2.1 citation |
|---|---|
| Long Rest is at least 8 hours, includes at least 6 hours of sleep and no more than 2 hours of light activity, and another cannot start for 16 hours | `docs/srd/full/srd-5.2.1.txt:11901-11909` |
| A creature normally needs at least 1 HP to start; completion grants the listed benefits | `docs/srd/full/srd-5.2.1.txt:11910-11924` |
| Completion restores all spent Hit Point Dice | `docs/srd/full/srd-5.2.1.txt:11915-11917` |
| Completion restores expended Spellcasting slots | `docs/srd/full/srd-5.2.1.txt:6321-6322` |
| Pact Magic slots return on a Short or Long Rest | `docs/srd/full/srd-5.2.1.txt:4290-4295` |
| Finishing removes exactly 1 Exhaustion level and the condition ends at 0 | `docs/srd/full/srd-5.2.1.txt:11686-11688` |
| A Stable creature remains Unconscious at 0 HP and naturally regains 1 HP after 1d4 hours if not healed | `docs/srd/full/srd-5.2.1.txt:1115-1120` |
| Long-Rest features recharge as their own descriptions specify | `docs/srd/full/srd-5.2.1.txt:11922-11924` |

## Stable-at-0 eligibility derivation

The engine follows 2024 RAW for both recovery amount and eligibility. A
completed Long Rest restores **all** spent Hit Point Dice
(`docs/srd/full/srd-5.2.1.txt:11915-11917`). There is no project override.

A Stable creature at 0 HP cannot start a Long Rest until it has at least 1 HP
(`docs/srd/full/srd-5.2.1.txt:11910-11913`), but natural Stable recovery grants
1 HP after 1d4 hours (`docs/srd/full/srd-5.2.1.txt:1115-1120`). Because 1d4 is
bounded by 4 hours, the 8-hour Long Rest always spans that recovery window. The
engine therefore resolves the bounded recovery deterministically at rest start,
granting 1 HP and consciousness, and only then applies the Long Rest benefits.
A Dead or Dying character remains completely unaffected.

## Named deferred boundary: Long Rest interruptions

Interruption handling is deliberately deferred this increment. The typed rule
metadata retains the one-hour boundary, but no elapsed-time reducer, partial
Short Rest benefit, resume operation, or extra-hour accounting is implemented.
The deferred SRD clauses are rolling Initiative, casting a non-cantrip, taking
damage, or one hour of exertion; at least one rested hour grants Short Rest
benefits; resuming adds one hour per interruption
(`docs/srd/full/srd-5.2.1.txt:11926-11941`). Until that boundary lands, the DM
command means the qualifying Long Rest completed without an interruption.
