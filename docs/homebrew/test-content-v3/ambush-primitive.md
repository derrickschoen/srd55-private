# Ambush Primitive: Vanward Conclave and Cold Open

**Visibility:** `ui_hidden` for both fixtures.

**Intended content kind / parent:** one shared subclass mechanic represented by
two compact fixtures: Vanward Conclave with a Ranger parent and Cold Open with a
Rogue parent. D297 requires both chassis.

## Mechanic facts

- The primitive can trigger only on the first turn, against a target that has
  not acted, on the first qualifying hit.
- It is spent after one trigger and cannot trigger again in the same combat.
- Vanward uses d8 rider dice; Cold Open uses d6 rider dice.
- Both use one die at level 5, two at level 11, and three at level 17.
- A critical hit doubles the rider dice.

## Required structured effects

- One shared first-turn/on-hit primitive with target-has-not-acted and unspent
  predicates.
- Per-combat spent state.
- A chassis-configured damage die plus level-scaled die count.
- Two parent-specific catalog records that reference the same mechanic shape.

## Deliberately unsupported mechanics

- Vanward's longbow routine and Cold Open's Steady Aim, Vex, and dual-light-
  weapon routine are validation chassis, not grants from this primitive.
- No Dread Ambusher text or other non-SRD rules text is reproduced.
- Cold Open carries no measured-damage claim until it is rerun as required by
  D297.

## MISSING FACTS

- Feature acquisition levels and the remainder of either subclass schedule.
- Rider damage type and qualifying attack or weapon restrictions.
- Exact reset boundary represented by the validator's per-combat state.
- Initiative tie handling and the meaning of “has not acted” for a creature
  joining combat late.
- Whether one attacker can choose among multiple eligible targets before the
  primitive is spent.
- Authoritative scaling points behind the recovered level-5/11/17 snapshots.
