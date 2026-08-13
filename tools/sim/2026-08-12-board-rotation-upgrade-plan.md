# Board rotation upgrade plan

## Scope

Audit every SRD board posture against the owner-supplied 2024 rotation digests,
adopt only mechanics supported by the pinned SRD 5.2.1, and retain the current
dirty homebrew-validation and Fiend-volley work as the comparison baseline.

## Verified readings that control implementation

- Weapon Mastery is in SRD 5.2.1. Greatsword has Graze, handaxe and shortbow
  have Vex, scimitar has Nick, javelin and longbow have Slow, and the remaining
  listed mastery mechanics are also present.
- Divine Smite is a Bonus Action taken immediately after a confirmed hit with
  a Melee weapon or Unarmed Strike. Sacred Weapon is activated as part of the
  Attack action, not a Bonus Action. The digest's claimed contention is absent
  from the SRD and will not be invented.
- A Rage initially lasts through the next turn and is extended by attacking,
  forcing a save, or taking a Bonus Action. Every Berserker posture attacks,
  so no recurring Bonus Action is required. Entering Rage still consumes the
  first turn's Bonus Action.
- The SRD permits only one spell-slot expenditure to cast a spell per turn.
  Quickened Spell additionally forbids quickening after a level 1+ spell or
  casting one afterward.
- Spirit Guardians triggers when the emanation enters a creature's space and
  when a creature ends its turn there, once per turn. Under the board's party-
  first initiative and walk-the-aura posture, that is two saves per round.
- Paladin starting equipment contains six javelins. The thrown posture uses
  that explicit loadout, recovers it between combats, and runs out after six
  attacks within a combat.
- Hunter's Mark is a Bonus Action and Concentration, but the SRD 5.2.1 spell
  has no retarget-on-kill clause. Guide retarget rotations remain excluded.

## Changes

1. Replace both Devotion post-turn Smite aggregators with an immediate post-hit
   decision: spend the next queued Smite on the first confirmed hit of an
   eligible turn. This removes the illegal after-the-turn crit selection rather
   than inventing a speculative crit-fishing policy. Keep Sacred Weapon
   available on round 1 because its
   SRD activation consumes no Bonus Action. Make the melee posture's actual
   shortsword/Vex + scimitar/Nick ordering and single enchanted weapon explicit.
2. Apply the round-1 Rage Bonus Action tax to the thrown Berserker's Light
   attack, and let handaxe Vex supply advantage to a Brutal Strike attack after
   Reckless advantage is forgone.
3. Move the ranged Champion's single Action Surge to round 2, where a carried
   shortbow Vex flag can support its opening attack. Retain the already-correct
   two distinct surge turns at level 17.
4. Carry handaxe Vex across attacks and turns for the thrown Open Hand posture;
   combine advantage sources with OR semantics.
5. Keep Hunter TWF's verified Nick/Mark Bonus Action economy and Vex chain.
   Keep longbow Slow unpriced against a stationary target; do not invent the
   absent Hunter's Mark retarget clause.
6. Correct slot casting rotations: Draconic quickens the leveled spell and uses
   the action for Fire Bolt; when slots are dry it can quicken one Fire Bolt and
   cast another. The Fiend slot-volley posture's first turn casts Hex and uses
   Eldritch Blast, never Hex plus Scorching Ray from two Pact slots.
7. Give Life's Spirit Guardians two sourced ticks per round under the declared
   walk-the-aura/initiative posture.
8. Add explicit board rotation metadata, including concentration roles and the
   primary decision primitives used by every SRD row. Add a durable per-build
   disposition audit.
9. Correct `SUBSTITUTIONS.md`'s 2014 feat framing and add a Rotations section
   for guide mechanics that are absent from the SRD or outside a row's declared
   environment.

## Tests and reporting

- Add deterministic tests for immediate post-hit Smite decisions, Sacred
  Weapon's no-BA activation, thrown supply exhaustion, Rage/Light contention,
  Vex-to-Brutal and thrown-Monk Vex carry, legal Quickened ordering, Hex's slot
  gate, and the two Spirit Guardians ticks.
- Extend identity tests for rotation metadata and retained build distinctions.
- Never delete or weaken an assertion. Update only the two exact totals whose
  sourced premises change (round-one Rage BA and six-javelin exhaustion), and
  keep D233 in `statistical.test.ts` byte-untouched.
- Run TypeScript, all tests, diff checks, and a 50,000-trial board. Report full
  before/after cells for every numerically changed row.

## Locally verified assumptions

- The current baseline board was captured at 50,000 trials with seed 31.
- Champion already models Action Surge, expanded per-roll critical thresholds,
  Graze, Vex, Studied Attacks, and Heroic Inspiration.
- Open Hand already shares one Focus pool between Flurry and once-per-turn
  Stunning Strike.
- Hunter melee already folds Nick into the Attack action, preserving its Bonus
  Action for Hunter's Mark; Hunter ranged already declares Slow as zero DPR.
- Evoker already protects the board's one exposed ally with Sculpt and limits
  Overchannel to the first free use per Long Rest. Repeats remain excluded
  because the board has no self-damage valuation channel.
- The current Draconic code produces the right spell-plus-cantrip damage total
  but assigns Quickened Spell to the illegal cantrip side of that pairing; the
  sequencing must be corrected even if the board cells remain statistically
  unchanged.

## Plan review outcome

The required Claude review confirmed the Smite, Rage/Light, Spirit Guardians,
and sequencing work. Two reviewer claims were rejected against the pinned text:

- Quickened Spell can modify an action cantrip; its prohibition concerns level
  1+ spells before or after the modified spell. Two Fire Bolts on a slot-dry
  turn are legal, so that fallback remains while leveled turns explicitly
  quicken the leveled spell.
- Divine Smite cannot fire twice on one turn: each casting is a Bonus Action.
  The deterministic critical test will instead prove that the first confirmed
  hit alone owns the Smite and controls whether its dice double.

The review quoted an older Spirit Guardians trigger formulation. The pinned
SRD instead says emanation-enters-space and creature-ends-turn; the planned two
ticks still follow, but the implementation and tests will cite the actual text.

## Implementation review outcome

Claude CLI's broad diff reviews timed out without a verdict. A bounded follow-
up confirmed the two-tick Spirit Guardians and immediate-Smite readings in
principle, but described the former as a start-turn trigger and implied the
current hit's critical state was unknown. Both phrasings were rejected: the
pinned text says `ends its turn`, and a natural 20 is already known when the
post-hit Bonus Action is offered. No implementation change followed from that
critique. The local verification remained the controlling evidence.
