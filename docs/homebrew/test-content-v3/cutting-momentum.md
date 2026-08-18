# Cutting Momentum

**Visibility:** `ui_hidden`

**Intended content kind / parent:** compact Fighter feature fixture. A Fighter
chassis is recovered; the exact catalog kind and owning feature are not.

## Mechanic facts

- The first qualifying hit each turn adds 2 flat damage, increasing to 3 at
  level 13.
- If that first hit is a critical hit, later attacks in the same turn score a
  critical hit on an 18–20 roll.
- Only the additional weapon dice created by that expanded range are marginal
  package damage; ordinary critical damage belongs to the chassis.
- The expanded range ends with the triggering turn.

## Required structured effects

- Once-per-turn first-hit state and a level-scaled flat damage rider.
- A first-hit-critical trigger that changes the critical range to 18–20 for the
  remainder of that turn.
- Explicit turn-end cleanup and provenance so the temporary range cannot leak
  to unrelated attacks.

## Deliberately unsupported mechanics

- The greatsword and Fighter attack counts are validation chassis, not feature
  requirements.
- Base weapon damage and ordinary natural-20 critical dice are outside the
  fixture's marginal effect.
- No stacking with another critical-range modifier is assumed.

## MISSING FACTS

- Exact catalog kind, owner, acquisition level, and prerequisite rules.
- Qualifying attack or weapon restrictions and the flat rider's damage type.
- Critical-range stacking/precedence with other effects.
- Whether the expanded range applies to all later attacks or only attacks with
  the weapon that triggered it.
- Whether level 13 is the authored scaling point for every possible parent.
