### R-COMBAT-001 champion-critical-range
Q: Champion critical hit range at Fighter levels 3 and 15
A: Champion 3 scores a Critical Hit on 19–20; Champion 15 expands the range to 18–20.
QUOTE: "18–20 on the d20."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Remembering only the level-3 range, or applying the level-15 range at total character level 15 rather than Fighter level 15.

### R-COMBAT-002 natural-twenty-one-attack-rolls-only
Q: do natural 20 and natural 1 automatically succeed or fail saving throws and ability checks
A: No. The automatic hit or miss rule for a natural 20 or 1 is specifically about ATTACK ROLLS, not saving throws or ability checks.
QUOTE: "attack misses regardless of any"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/ui/screens/planner/dice.ts
TRAP: Treating every D20 Test as an automatic success on 20 and automatic failure on 1.

### R-COMBAT-003 damage-application-order
Q: order for damage bonuses penalties multipliers Resistance Vulnerability
A: Apply bonuses, penalties, and other multipliers first; Resistance second; Vulnerability third.
QUOTE: "multipliers are applied first; Resistance is applied"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Applying Resistance before a flat reduction, or cancelling Resistance and Vulnerability before other modifiers.

### R-COMBAT-004 critical-hit-all-damage-dice
Q: which damage dice double on a Critical Hit; weapon only or Sneak Attack and other dice
A: Roll ALL of the attack's damage dice twice, including other damage dice such as Sneak Attack; add relevant modifiers once.
QUOTE: "Roll all of the attack’s damage dice twice"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/ui/screens/planner/dice.ts
TRAP: Doubling only the weapon die, or doubling the flat ability modifier too.

### R-COMBAT-005 advantage-disadvantage-roll
Q: how do Advantage and Disadvantage change a D20 Test
A: Roll two d20s and use the higher for Advantage or the lower for Disadvantage.
QUOTE: "roll a second d20 when you make the roll"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/ui/screens/planner/dice.ts
TRAP: Adding a flat bonus or penalty instead of selecting one of two d20 rolls.

### R-COMBAT-006 advantage-disadvantage-stacking-cancel
Q: do multiple sources of Advantage stack; how do Advantage and Disadvantage cancel
A: Multiple Advantages or Disadvantages never add more d20s; any amount of Advantage and Disadvantage on the same roll cancels to one normal d20.
QUOTE: "advantage on the same roll cancel each other."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/ui/screens/planner/dice.ts
TRAP: Netting sources numerically, such as two Advantages versus one Disadvantage leaving Advantage.

### R-COMBAT-007 cover-benefits
Q: what do Half Cover Three-Quarters Cover and Total Cover grant; do cover sources stack
A: Half Cover gives +2 AC and Dexterity saves; Three-Quarters gives +5; Total Cover prevents direct targeting; use only the most protective degree, never add them.
QUOTE: "Cover (+2 bonus to AC and Dexterity saving throws)"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Adding multiple cover bonuses together, or applying cover to every saving throw rather than Dexterity saves.

### R-COMBAT-008 weapon-attack-bonus
Q: how to calculate melee and ranged weapon attack bonus when proficient
A: Melee attack bonus = Strength modifier + Proficiency Bonus; ranged attack bonus = Dexterity modifier + Proficiency Bonus, unless a property or feature says otherwise.
QUOTE: "Melee attack bonus = Strength modifier"
SRC: docs/srd/source/sheet-math.txt
CODE: src/rules/attack-profiles.ts
TRAP: Adding Proficiency Bonus to an attack with a weapon the attacker lacks proficiency with, or using Dexterity for every thrown weapon.

### R-COMBAT-009 initiative-calculation
Q: how is Initiative calculated; what ability check is Initiative
A: Initiative is a Dexterity check; the ordinary character-sheet modifier is the Dexterity modifier, with any applicable check modifiers.
QUOTE: "rolls Initiative; they make a Dexterity check that"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/sheet.ts (`initiative`)
TRAP: Adding Proficiency Bonus by default. It applies only if a feature grants proficiency or another relevant modifier.

### R-COMBAT-010 death-save-success-failure
Q: how do Death Saving Throws work; target number; successes failures reset
A: At 0 Hit Points, roll 1d20 at the start of each turn: 10+ succeeds; the third success makes you Stable, the third failure kills you; both counts reset on healing or becoming Stable.
QUOTE: "is 10 or higher, you succeed."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Adding Constitution or Proficiency Bonus by default. A Death Save is not tied to an ability score.

### R-COMBAT-011 death-save-natural-one-twenty
Q: what do natural 1 and natural 20 do on a Death Saving Throw
A: A natural 1 causes TWO failures; a natural 20 restores 1 Hit Point.
QUOTE: "you suffer two failures."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating a natural 20 as two successes rather than immediately regaining 1 Hit Point.

### R-COMBAT-012 damage-at-zero-hit-points
Q: what happens when taking damage at 0 Hit Points; Critical Hit; massive damage
A: Damage at 0 Hit Points causes one Death Save failure; a Critical Hit causes two; if the damage equals or exceeds the Hit Point maximum, the creature dies.
QUOTE: "while you have 0 Hit Points, you suffer a Death"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Comparing damage only with the creature's current 0 Hit Points rather than its Hit Point maximum for instant death.

### R-COMBAT-013 base-armor-class-one-formula
Q: base Armor Class without armor; can multiple AC formulas stack
A: Base AC is 10 + Dexterity modifier unless another calculation applies; choose only ONE base AC calculation, then apply eligible shield and other bonuses.
QUOTE: "Your base AC calculation is 10 plus your Dexterity"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/sheet.ts (`armorClass`)
TRAP: Adding Unarmored Defense or Mage Armor on top of 10 + Dexterity, or combining two alternative base formulas.

### R-COMBAT-014 armor-training-penalties
Q: what happens without armor or Shield training; can you cast spells
A: Without training in worn Light, Medium, or Heavy armor, you have Disadvantage on D20 Tests involving Strength or Dexterity and cannot cast spells; without Shield training, its AC bonus does not apply.
QUOTE: "you have Disadvantage on any D20 Test"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating armor training only as an AC or movement issue, or applying the armor penalties to an untrained Shield instead of merely losing its AC bonus.

### R-COMBAT-015 barbarian-unarmored-defense
Q: Barbarian Unarmored Defense formula; does it work with a Shield
A: While not wearing armor, Barbarian base AC = 10 + Dexterity modifier + Constitution modifier, and a Shield is allowed.
QUOTE: "You can use a Shield and still gain this benefit."
SRC: docs/srd/source/unarmored-defense.txt
CODE: src/rules/unarmored-defense-srd.ts
TRAP: Importing the Monk's no-Shield clause into Barbarian Unarmored Defense.

### R-COMBAT-016 monk-unarmored-defense
Q: Monk Unarmored Defense formula; does it work with armor or a Shield
A: While wearing neither armor nor a Shield, Monk base AC = 10 + Dexterity modifier + Wisdom modifier.
QUOTE: "your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers."
SRC: docs/srd/source/unarmored-defense.txt
CODE: src/rules/unarmored-defense-srd.ts
TRAP: Allowing a Shield because Barbarian Unarmored Defense does, or using Constitution instead of Wisdom.

### R-COMBAT-017 weapon-mastery-unlock
Q: when can a character use a weapon's mastery property
A: Only when a feature such as Weapon Mastery unlocks that property for the character; merely wielding or having proficiency with the weapon is insufficient.
QUOTE: "Weapon Mastery, that unlocks the property for the"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/weapon-mastery-lookup.ts
TRAP: Automatically granting every weapon's mastery property to anyone proficient with that weapon.

### R-COMBAT-018 mastery-cleave
Q: what does the Cleave weapon mastery property do
A: After hitting with the melee weapon, make one melee attack with it against a second creature within 5 feet of the first and within reach; on a hit deal weapon damage without a positive ability modifier; once per turn.
QUOTE: "against a second creature within 5 feet"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Adding a positive ability modifier to the second target's damage or cleaving more than once per turn.

### R-COMBAT-019 mastery-graze
Q: what does the Graze weapon mastery property do
A: On a miss, deal damage equal to the attack ability modifier, of the weapon's damage type; only increasing that modifier can increase this damage.
QUOTE: "to the ability modifier you used to make the attack"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Rolling the weapon die on a miss or adding other flat damage bonuses to Graze damage.

### R-COMBAT-020 mastery-nick
Q: what does the Nick weapon mastery property do
A: Make the Light property's extra attack as part of the Attack action instead of as a Bonus Action; still only once per turn.
QUOTE: "you can make it as part of the Attack action"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating Nick as an additional extra attack beyond the one granted by the Light property.

### R-COMBAT-021 mastery-push
Q: what does the Push weapon mastery property do
A: On a hit, push a Large or smaller creature up to 10 feet straight away from yourself.
QUOTE: "the creature up to 10 feet straight away from"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Allowing Push against Huge or Gargantuan creatures, or in any chosen direction.

### R-COMBAT-022 mastery-sap
Q: what does the Sap weapon mastery property do
A: On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.
QUOTE: "has Disadvantage on its next attack roll"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Applying Disadvantage to every attack until your next turn rather than only the next attack roll.

### R-COMBAT-023 mastery-slow
Q: what does the Slow weapon mastery property do; does it stack
A: On a damaging hit, reduce the target's Speed by 10 feet until the start of your next turn; repeated hits with Slow do not increase the reduction beyond 10 feet.
QUOTE: "you can reduce its Speed by 10 feet"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Stacking the same Slow mastery reduction for every hit.

### R-COMBAT-024 mastery-topple
Q: what does the Topple weapon mastery property do; save DC formula
A: On a hit, force a Constitution save against DC 8 + the attack ability modifier + Proficiency Bonus; on failure the target gains the Prone condition.
QUOTE: "DC 8 plus the ability modifier used to make the"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Using Strength for the DC regardless of the attack ability, or treating Topple as automatic on hit.

### R-COMBAT-025 mastery-vex
Q: what does the Vex weapon mastery property do
A: On a damaging hit, gain Advantage on your next attack roll against that creature before the end of your next turn.
QUOTE: "you have Advantage on your next attack roll"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Granting Advantage against any target or on every later attack during the duration.
