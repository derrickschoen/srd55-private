# College of the Cutting Chorus

**Visibility:** `ui_hidden`

**Intended content kind / parent:** compact subclass fixture; Bard parent.

## Mechanic facts

- The Bard can spend its own Inspiration die before making an attack roll and
  add the die to that roll.
- The recovered fixture grants Extra Attack at level 6.
- Validation used d8 at levels 5 and 6, d10 at level 11, and d12 at level 17.
- Validation allowed at most one self-use per turn at levels 5 and 6 and two at
  levels 11 and 17. It used native pools of four dice at 5/6 and five at 11/17.
- This fixture ships **without a net-DPR claim**. The provisional displaced-ally
  proxy is not an authoring fact and must not appear in shipped content.

## Required structured effects

- An `extra_attack` effect with attack count 2 at Bard level 6.
- Spending from the existing Inspiration pool on the user's own attack.
- A pre-roll attack bonus using the current Inspiration die.
- A level-aware per-turn self-use limit.

## Deliberately unsupported mechanics

- No displaced-ally attack value or net-DPR claim is shipped (D298).
- Converting spell slots into additional uses is excluded until its opportunity
  cost and exact interaction are supplied.
- The rapier damage and attack modifier used by validation are chassis inputs.

## MISSING FACTS

- Complete subclass schedule and the acquisition level of self-Inspiration.
- Qualifying attack types, declaration timing details, duration, and whether an
  unused pre-rolled die is lost.
- The authoritative source of the per-turn limit and its exact scaling points.
- Exact interaction with every way the Inspiration pool can be replenished.
- The d4-derived displaced-ally opportunity cost; it is intentionally deferred
  and does not block this test fixture.
