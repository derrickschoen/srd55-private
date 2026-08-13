# SRD board rotation audit

Audit date: 2026-08-12. The rules authority is the pinned
`docs/srd/full/srd-5.2.1.txt`; optimization guides were used only to identify
questions to check. This audit covers all nineteen rows in `run.ts`'s
`COMPLETE SRD 5.2.1 SUBCLASS BOARD`. Homebrew and legacy-policy rows retain
their authored specifications and are outside this SRD comparator audit.

## Per-build disposition

“Adopted” means the implementation changed or gained an explicit decision
node. “Already modeled” includes a sourced mechanic that required no change.
Guide mechanics absent from SRD are not inferred.

| SRD board build | Disposition | Rotation result |
|---|---|---|
| Berserker — greatsword | Already modeled | Rage is entered once, every attack extends it, Reckless feeds Frenzy's first hit, Brutal Strike forgoes Reckless on one attack, Graze handles misses, and Retaliation has one reaction window. The guide's 2024 GWM package is non-SRD. |
| Berserker — thrown handaxes | SRD-legal upgrade adopted | Round 1 spends the Bonus Action on Rage, so the Light attack starts round 2. Reckless applies to thrown Strength attacks; handaxe Vex can supply Advantage to the Brutal Strike attack that forgoes Reckless. |
| Champion — greatsword | Already modeled | Action Surge is an explicit round-1 nova (rounds 1 and 2 at level 17), expanded critical range is checked per attack roll, Graze handles misses, and Savage Attacker is once per turn. GWM is non-SRD. |
| Champion — shortbow | SRD-legal upgrade adopted | The single pre-17 Action Surge moves to round 2 so round-1 shortbow Vex can bank Advantage for the nova. Level 17 still uses two surges on separate turns. Sharpshooter/Crossbow Expert/Piercer are non-SRD. |
| Open Hand — unarmed | Already modeled | Flurry and Stunning Strike draw the same Focus pool; Stunning Strike is capped once per turn; Topple and Stun advantage combine by OR; Quivering Palm competes with attacks and Focus. |
| Open Hand — thrown handaxe | SRD-legal upgrade adopted | Handaxe Vex now carries across attacks and turns and combines by OR with Stunning Strike's next-attack Advantage. Unarmed-only Flurry/Open Hand Technique/Quivering Palm remain excluded from this ranged posture. |
| Thief — swords | Already modeled | Steady Aim spends the Bonus Action and sets Speed 0, Vex feeds the Nick attack, Sneak Attack is once per turn, and Thief's Reflexes creates a whole extra turn rather than another action. Item-specific Fast Hands and Hide-loop value remain unpriced. |
| Thief — shortbow | Already modeled | Steady Aim supplies Advantage at the Bonus Action/Speed tax; shortbow Vex is redundant on the one-attack turn; Thief's Reflexes adds the sourced round-1 turn. Skulker is non-SRD. |
| Devotion — melee | SRD-legal upgrade adopted | Divine Smite now spends the Bonus Action immediately on the first confirmed hit each turn, so only that hit's critical state affects its dice. Sacred Weapon remains part of the Attack action and enchants only the shortsword; shortsword Vex and scimitar Nick are explicit. The guide's claimed Sacred-Weapon/Smite Bonus Action collision is absent from SRD. |
| Devotion — thrown javelins | SRD-legal upgrade adopted | Smite is immediate on the first confirmed thrown-javelin hit. The sourced six-javelin starting supply caps a four-round combat at six attacks; the thrown weapon can be drawn as part of each attack. Javelin Slow has no stationary-target DPR value. |
| Hunter — TWF melee | SRD-legal correction adopted | Scimitar Nick puts the Light attack in the Attack action, leaving the round-1 Bonus Action for Hunter's Mark. Shortsword Vex feeds the next attack, but the Nick scimitar does not create Vex. Mark remains per hit and Colossus Slayer once per turn. |
| Hunter — longbow | Already modeled | Round 1 casts Hunter's Mark, Archery applies, Mark is per hit, Colossus Slayer is once per turn, and Precise Hunter supplies Advantage at level 17. Longbow Slow is unpriced against a stationary target. The guide's re-mark-on-kill rotation is absent from the SRD spell. |
| Life — ranged spell posture | SRD-legal upgrade adopted | The walk-the-aura posture now resolves Spirit Guardians once when its Emanation enters the target's space on the cleric's turn and once when the target ends its turn there. The saves occur on different turns, satisfying the once-per-turn limit. Concentration role: damage-anchored. |
| Land (Arid) — ranged spells | Already modeled | Land's Aid, Arid non-Concentration blasts, and Natural Recovery are explicit. The board does not assign damage to an unspecified parallel control spell. Concentration role: buff/control. |
| Evoker — ranged spells | Already modeled | Sculpt Spells protects the one declared ally, which is within `1 + spell level`; the first level-1–5 Overchannel use is free and maximized. Repeat uses are declined because their escalating self-damage has no board channel. Concentration role: none. |
| Draconic (Fire) — ranged spells | SRD-legal decision node adopted | Every turn now has an explicit one-slot maximum. With Quickened and a slot, the leveled spell is the Bonus Action and Fire Bolt the action; with no slot, two cantrips are legal. Twinned adds no targets to this rotation. Concentration role: none. |
| Fiend — ranged spell attacks | Already modeled | Eldritch Blast beams scale with character level, Hex is the damage concentration, Pact slots refresh at the intervening Short Rests, and Hurl Through Hell has its separate free-use/reload clock. |
| Fiend — slot volleys | SRD-legal upgrade adopted | Combat 1 round 1 can cast Hex and Eldritch Blast, but cannot also spend a Pact slot on Scorching Ray. Later turns spend refreshed Pact slots on sourced ray counts before falling back to Eldritch Blast. |
| Lore — caster posture | Already modeled | Bardic Inspiration spends no spell slot; Magical Secrets and the existing concentration posture are explicit. Its concentration role is level-dependent, and the existing CME burst/day upper-bound declaration remains in force. Non-SRD guide spell choices are not imported. |

## Adoption citations

All references below are section headings in SRD 5.2.1; parenthetical line
numbers identify the pinned text used during this audit.

| Adopted mechanic | SRD 5.2.1 authority | Reading used by the simulator |
|---|---|---|
| Rage action economy and duration | `Barbarian` → `Level 1: Rage` (lines 1758–1763, 1804–1822) | Entering Rage is a Bonus Action. It lasts through the next turn and an attack roll extends it, so the simulator pays the Bonus Action once and sustains it by attacking; it does not re-pay every round or claim that the base feature simply lasts until combat ends. |
| Action Surge placement | `Fighter` → `Level 2: Action Surge` (lines 2938–2945) | The extra non-Magic action may be placed on a chosen turn. There is one use per Short Rest, two from level 17, and never more than one on a turn. |
| Mastery riders and thrown drawing | `Equipment` → `Weapons` → `Thrown` and `Mastery Properties` → `Nick`, `Vex` (lines 5428–5447, 5475–5479) | A thrown weapon is drawn as part of its attack; Nick moves the Light attack into the Attack action once per turn; Vex grants Advantage only to the next attack against that target before the end of the next turn. The weapon table assigns handaxe/shortbow/shortsword Vex, scimitar Nick, greatsword Graze, and javelin/longbow Slow. |
| Steady Aim audit | `Rogue` → `Level 3: Steady Aim` (lines 3762–3767) | It is SRD: Bonus Action, Advantage on the next attack this turn, requires no prior movement, then Speed 0. Existing Thief rows already paid this tax. |
| Immediate Divine Smite and Sacred Weapon timing | `Spell Descriptions` → `Divine Smite` (lines 7767–7780); `Paladin Subclass: Oath of Devotion` → `Level 3: Sacred Weapon` (lines 3400–3408) | Smite's Bonus Action occurs immediately after a qualifying hit. Sacred Weapon is activated when taking the Attack action, not with a Bonus Action, so both can occur on round 1. |
| Thrown-paladin stock | `Paladin` → `Core Paladin Traits` → `Starting Equipment` (lines 3201–3206) | The selected starting package contains six javelins. They are recovered between combats, but no seventh or eighth javelin is invented during one combat. |
| Hunter Nick/Mark economy | `Mastery Properties` → `Nick` (lines 5443–5447); `Spell Descriptions` → `Hunter's Mark` (lines 8917–8932) | Nick frees the Bonus Action used to cast Hunter's Mark. The spell adds 1d6 on every attack-roll hit and contains no target-transfer or re-mark-on-kill clause. |
| Spirit Guardians double trigger | `Spell Descriptions` → `Spirit Guardians` (lines 10490–10510) | The Emanation entering the target's space and the target ending its turn there are separate turns, so each can trigger one save. This is not a start-of-turn trigger. |
| One slot per turn and Quickened Spell | `Casting Spells` → `One Spell with a Spell Slot per Turn` (lines 6398–6402); `Sorcerer` → `Quickened Spell` (lines 4063–4072) | At most one spell slot is spent to cast a spell on a turn. Quickened cannot be applied after a level-1+ spell and prevents a later level-1+ spell, but does not prohibit the slotless action cantrip used here. |
| Fiend slot volleys | `Fiend Patron` → `Fiend Spells` (lines 4565–4571); `Spell Descriptions` → `Scorching Ray` (lines 10145–10164) | Fiend prepares Scorching Ray. It makes three 2d6 rays at slot level 2 and one additional ray per higher slot, so pact-slot levels 2/3/5/5 correctly produce 3/4/6/6 rays. |
| Sculpt Spells and Overchannel audit | `Wizard Subclass: Evoker` → `Level 6: Sculpt Spells` (lines 4923–4931), `Level 14: Overchannel` (lines 4952–4967) | Sculpt can exclude `1 + slot level` visible creatures. Overchannel's first use is free; repeats deal escalating unavoidable Necrotic self-damage, which this board does not silently ignore. |

## Explicitly unpriced SRD rotation elements

- Slow, Sap, and control-only Cunning Strike outcomes do not change damage
  against the stationary single-target dummy.
- Hunter Horde Breaker needs a second adjacent target and is not substituted
  for the row's selected Colossus Slayer option.
- Fast Hands and Hide depend on item, terrain, and detection assumptions that
  the board does not define.
- Repeat Overchannel uses are declined because the simulator has no
  self-damage channel; only the free first use is priced.
- Concentration-role tags describe opportunity cost without inventing damage
  for unspecified control spells.

## Board before/after

Damage dealt per round, using `npx vite-node run.ts 50000`, seed 31, for every
row whose implementation or explicit rotation decision node changed. Each
cell is `before→after`; all four burst cells and all four four-combat-day cells
are shown. The largest reported 95% CI half-width is 0.1 DPR (most are 0.0 at
the board's one-decimal precision).

| Changed SRD row | Burst L3 / L6 / L11 / L17 | Day L3 / L6 / L11 / L17 |
|---|---|---|
| Berserker — thrown handaxes | 20.1→18.6 / 32.9→31.4 / 46.0→48.0 / 64.7→66.0 | 20.1→18.6 / 32.9→31.4 / 46.0→48.0 / 64.7→66.0 |
| Champion — shortbow | 8.5→8.4 / 21.7→21.7 / 42.5→42.6 / 57.1→57.1 | 8.5→8.4 / 21.7→21.7 / 42.5→42.6 / 57.1→57.1 |
| Open Hand — thrown handaxe | 4.1→5.0 / 14.3→16.2 / 20.0→22.3 / 27.1→28.9 | 4.1→5.0 / 14.3→16.2 / 20.0→22.3 / 27.1→28.9 |
| Devotion — melee | 19.4→19.1 / 33.7→34.7 / 58.7→60.3 / 73.8→73.6 | 12.6→12.8 / 26.1→27.6 / 49.4→51.7 / 63.5→64.1 |
| Devotion — thrown javelins | 10.5→10.5 / 23.1→17.7 / 39.8→30.2 / 53.9→40.1 | 6.7→6.7 / 16.7→13.7 / 32.0→26.0 / 44.4→34.9 |
| Hunter — TWF melee | 20.8→18.5 / 36.2→33.5 / 43.0→40.2 / 51.0→51.0 | 20.8→18.4 / 36.2→33.6 / 43.1→40.2 / 51.0→51.0 |
| Life — ranged spell posture | 1.7→1.7 / 13.4→24.1 / 33.5→56.4 / 48.9→85.3 | 1.7→1.7 / 11.1→19.1 / 26.6→45.6 / 40.3→70.7 |
| Draconic (Fire) — ranged spells | 16.1→16.1 / 35.1→35.1 / 54.5→54.5 / 71.8→71.8 | 8.0→8.0 / 19.1→19.1 / 33.6→33.6 / 50.1→50.1 |
| Fiend — slot volleys | 10.9→10.9 / 19.2→19.2 / 33.7→33.7 / 45.6→45.6 | 13.3→13.3 / 21.2→21.2 / 36.4→36.4 / 46.8→46.8 |

The Champion, Draconic, and Fiend changes are decision-order corrections with
no material expected-value change in this stationary four-round environment;
the displayed 0.1 Champion differences are Monte Carlo/rounding noise. The
large Life increase and thrown-Devotion decrease are findings, not tuning.
