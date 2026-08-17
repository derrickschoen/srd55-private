### R-GLOS-001 ability-check
Q: term ability check meaning
A: An ability check is a D20 Test using one of the six abilities, or an associated skill, to overcome a challenge.
QUOTE: "An ability check is a D20 Test that represents using"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Calling attack rolls or saving throws ability checks merely because they also use an ability modifier.

### R-GLOS-002 ability-score-modifier
Q: terms ability score and ability modifier meaning
A: A creature has Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma scores, each with a corresponding modifier used for matching D20 Tests and other rules.
QUOTE: "A creature has six ability"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/ability-score.ts
TRAP: Using "ability" to mean only the modifier or only the score when the distinction changes arithmetic.

### R-GLOS-003 armor-class
Q: term Armor Class AC meaning
A: Armor Class is the target number for an attack roll and represents how difficult the target is to hit.
QUOTE: "An Armor Class (AC) is the target number"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/sheet.ts (`armorClass`)
TRAP: Treating AC as damage reduction.

### R-GLOS-004 attack-roll
Q: term attack roll meaning
A: An attack roll is a D20 Test for an attack with a weapon, an Unarmed Strike, or a spell.
QUOTE: "An attack roll is a D20 Test that represents making"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/attack-profiles.ts
TRAP: Treating a spell that forces only a saving throw as a spell attack.

### R-GLOS-005 bloodied
Q: term Bloodied meaning threshold
A: A creature is Bloodied while it has half its Hit Points or fewer remaining.
QUOTE: "A creature is Bloodied while it has half its Hit Points"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating Bloodied as a condition or as exactly half Hit Points only.

### R-GLOS-006 cantrip
Q: term cantrip meaning spell level slot
A: A cantrip is a level 0 spell cast without a spell slot.
QUOTE: "A cantrip is a level 0 spell, which is cast without a"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/spell-level.ts
TRAP: Calling cantrips level 1 spells because 1 is the lowest slot level.

### R-GLOS-007 concentration
Q: term Concentration meaning
A: Concentration is the sustained attention some spells and effects require to remain active; losing it ends the effect.
QUOTE: "Some spells and other effects require Concentration"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/domain/models.ts (`concentration`)
TRAP: Treating Concentration as a spell-only mechanic; other effects can require it too.

### R-GLOS-008 creature
Q: term creature meaning player character object monster
A: Any being in the game, including a player character, is a creature; an object is not a creature.
QUOTE: "Any being in the game, including a player’s"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Assuming "creature" excludes player characters or includes unattended objects.

### R-GLOS-009 hit-point-dice
Q: term Hit Point Dice Hit Dice meaning
A: Hit Point Dice, shortened to Hit Dice, help determine a player character's Hit Point maximum and can be spent during a Short Rest to regain Hit Points.
QUOTE: "Hit Point Dice, or Hit Dice for short, help determine"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Confusing Hit Dice with the dice rolled for weapon damage.

### R-GLOS-010 saving-throw
Q: term saving throw save meaning
A: A saving throw, also called a save, is an attempt to avoid or resist a threat.
QUOTE: "A saving throw—also called a save—represents an"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating a saving throw as an ability check; both are D20 Tests but are distinct kinds.

### R-GLOS-011 spell-slot
Q: term spell slot meaning
A: A spell slot represents a limited portion of a spellcaster's magical potential used to cast level 1+ spells.
QUOTE: "Spell slots are the main way a spellcaster’s magical"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/spell-slots.ts
TRAP: Treating a slot as a specific prepared spell rather than a level-bounded casting resource.

### R-GLOS-012 proficiency-bonus
Q: term Proficiency Bonus PB meaning
A: Proficiency Bonus reflects the effect of training and is added when a relevant rule or proficiency applies; for characters it increases with total character level.
QUOTE: "Proficiency Bonus, which reflects the"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/proficiency.ts (`proficiencyBonus`)
TRAP: Adding Proficiency Bonus to every D20 Test, or adding it more than once without a rule such as Expertise multiplying it.
