# Patient Volley

**Visibility:** `ui_hidden`

**Intended content kind / parent:** compact Ranger feature fixture. The Ranger
parent is recovered; whether this is a feat, subclass feature, or another named
feature is not.

## Mechanic facts

- The rider is eligible when the target has not yet acted on the first turn, or
  when the attacker hit on the immediately preceding turn.
- On an eligible turn, the first qualifying hit deals the rider once.
- The rider is 1d8 at level 5 and 2d8 at levels 11 and 17.
- A critical hit doubles the rider dice.
- Eligibility for a later turn depends on whether any attack hit on the
  preceding turn, even when that preceding turn was itself ineligible.

## Required structured effects

- Per-turn state for whether the attacker hit on the immediately preceding
  turn.
- A target-has-not-acted predicate for first-turn eligibility.
- A once-per-turn damage rider with level scaling and critical dice doubling.

## Deliberately unsupported mechanics

- The two-attack longbow routine and acting before the target are validation
  inputs, not authored grants.
- The declared Patient Volley plus Vanward stack is a diagnostic, not a new
  combined feature.
- Base weapon damage is outside the fixture.

## MISSING FACTS

- Exact catalog kind, owning feature/subclass, and acquisition level.
- Whether the preceding-turn hit and current rider must concern the same target.
- Qualifying attack or weapon restrictions and rider damage type.
- Initiative tie handling, target selection, and what happens when the target
  enters combat after the first turn.
- Authoritative scaling points behind the recovered level-5/11/17 snapshots.
