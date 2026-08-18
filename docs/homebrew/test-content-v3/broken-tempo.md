# Discipline of the Broken Tempo

**Visibility:** `ui_hidden`

**Intended content kind / parent:** compact Fighter feature fixture. A Fighter
parent is recovered; the exact catalog kind and owning feature are not.

## Mechanic facts

- The mechanic has a maneuver-die pool whose maximum equals proficiency bonus.
- One die can be spent per turn on a qualifying hit for added damage.
- The die is d6 at level 5, d8 at level 11, and d10 at level 17.
- A critical hit doubles the spent rider die.
- Using Second Wind restores one expended maneuver die, up to the pool maximum.
- One critical hit per combat can restore one expended maneuver die, up to the
  pool maximum.

## Required structured effects

- A bounded resource pool with a proficiency-bonus maximum.
- A once-per-turn on-hit spend and level-scaled damage die.
- Recovery events tied to Second Wind use and to one critical hit per combat,
  both capped at the pool maximum.
- Separate state for pool count and whether the critical recovery was used.

## Deliberately unsupported mechanics

- Second Wind healing is outside this damage-only fixture.
- No maneuver menu or non-damage maneuver effects are reconstructed.
- Greatsword damage and Fighter attack counts are validation chassis inputs.

## MISSING FACTS

- Exact catalog kind, owning feature/subclass, and acquisition level.
- Normal pool recovery cadence and the reset for the once-per-combat critical
  recovery.
- Qualifying attack restrictions, rider damage type, and spend declaration
  timing.
- Whether the d6/d8/d10 snapshots are the authored die progression and, if so,
  their exact scaling levels.
- Whether “maneuver” denotes additional choices beyond the recovered damage
  spend; no such choices survive.
