### R-REST-001 channel-divinity-recovery
Q: how many Cleric or Paladin Channel Divinity uses return on a Short Rest or Long Rest
A: For both Cleric and Paladin, regain ONE expended use after a Short Rest and ALL expended uses after a Long Rest.
QUOTE: "a Short Rest, and you regain all expended uses when"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Restoring all Channel Divinity uses on a Short Rest, as older phrasing and memory suggest.

### R-REST-002 cleric-channel-divinity-uses
Q: how many Cleric Channel Divinity uses at level 2
A: TWO uses from Cleric level 2.
QUOTE: "You can use this class’s Channel Divinity twice."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/class-resources-srd.ts
TRAP: Assigning one use at level 2 from the 2014 Cleric table.

### R-REST-003 rage-recovery
Q: how many Rage uses return on a Short Rest or Long Rest
A: Regain ONE expended Rage use after a Short Rest and ALL expended uses after a Long Rest.
QUOTE: "You regain one expended use when you finish a Short Rest"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating Rage as Long-Rest-only because that was the 2014 recovery rule.

### R-REST-004 short-rest-definition
Q: how long is a Short Rest; what activity is allowed; minimum Hit Points to start
A: A Short Rest is 1 hour of no activity more strenuous than reading, talking, eating, or standing watch, and requires at least 1 Hit Point to start.
QUOTE: "A Short Rest is a 1-hour period of downtime"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating any quiet pause as a completed Short Rest or allowing a creature at 0 Hit Points to start one normally.

### R-REST-005 short-rest-hit-dice
Q: how do Hit Dice heal on a Short Rest; Constitution modifier; minimum healing
A: Spend Hit Dice one at a time; each restores the die roll plus Constitution modifier, minimum 1 Hit Point, and you may decide after each roll whether to spend another.
QUOTE: "Spend Hit Point Dice. You can spend one or more"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Spending all chosen Hit Dice before seeing any rolls, or allowing a low Constitution modifier to make a die restore 0 Hit Points.

### R-REST-006 short-rest-interruptions
Q: what interrupts a Short Rest; Initiative spell damage
A: Rolling Initiative, casting a spell other than a cantrip, or taking any damage stops the Short Rest and it grants no benefits.
QUOTE: "An interrupted Short Rest confers no benefits."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Letting the creature resume the same Short Rest after combat or a leveled spell without restarting the hour.

### R-REST-007 long-rest-definition
Q: how long is a Long Rest; required sleep and light activity; how often
A: A Long Rest is at least 8 hours: at least 6 hours asleep and no more than 2 hours of light activity; after finishing one, wait at least 16 hours before starting another.
QUOTE: "A Long Rest is a period of extended downtime—at"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating 8 hours of any downtime as a Long Rest without the sleep requirement.

### R-REST-008 long-rest-restoration
Q: what does a Long Rest restore; Hit Points Hit Dice ability scores Exhaustion
A: Restore all lost Hit Points, all spent Hit Dice, reduced ability scores and Hit Point maximums to normal, and reduce Exhaustion by 1; features recover only as their descriptions say.
QUOTE: "You regain all lost Hit Points and all spent Hit Point Dice."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Restoring only half the character's Hit Dice, which was the 2014 rule.

### R-REST-009 interrupted-long-rest
Q: what happens when a Long Rest is interrupted; does it give a Short Rest; can it resume
A: If at least 1 hour elapsed, gain Short Rest benefits; the Long Rest can resume immediately but needs 1 extra hour per interruption.
QUOTE: "If you rested at least 1 hour before the interruption"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Discarding all elapsed rest time after any interruption, or granting Short Rest benefits before 1 hour elapsed.

### R-REST-010 long-rest-spell-slots
Q: when do ordinary Spellcasting spell slots return
A: Finishing a Long Rest restores all expended Spellcasting spell slots, unless a specific feature says otherwise.
QUOTE: "Finishing a Long Rest restores any expended spell slots."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Applying Warlock Pact Magic recovery to the shared Spellcasting slot pool.

### R-REST-011 fighter-second-wind-uses-per-level
Q: how many Second Wind uses does a Fighter have; second wind count level 1 4 10
A: TWO uses at Fighter levels 1-3, THREE at levels 4-9, FOUR at level 10+, per the Fighter table's Second Wind column.
QUOTE: "1 +2 Fighting Style, Second Wind, Weapon Mastery 2 3"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Applying the 2014 one-use-per-Short-Rest model and giving a level 1-3 Fighter a single use. Corroborating unique spans: '4 +2 Ability Score Improvement 3 4' (3 uses at 4) and '10 +4 Subclass feature 4 5' (4 uses at 10). Second Wind's short-vs-long-rest recovery cadence is NOT in this source file — that half needs a CHECK against a feature-text extract.

### R-REST-012 sorcery-points-none-at-level-1-equal-class-level
Q: how many Sorcery Points at Sorcerer level 1; when does Font of Magic arrive; sorcery points per level multiclass dip
A: NONE at Sorcerer 1 (dash in the Sorcery Points column); Font of Magic arrives at Sorcerer 2 with points equal to SORCERER class level (2 at 2, 3 at 3, ...).
QUOTE: "Spellcasting, — 4 2 2"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Granting a Sorcerer 1 dip 'points = level' (1 point that does not exist), or reading points off total character level instead of Sorcerer class level. Corroborating unique spans: '2 +2 Font of Magic, 2 4 4 3' and '3 +2 Sorcerer Subclass 3 4 6 4 2'. Sorcery Point recovery cadence is not in this source file — needs a CHECK elsewhere.

### R-REST-013 warlock-pact-slot-count-and-slot-level
Q: how many Pact Magic spell slots does a Warlock have and what level are they; warlock slot level progression 1 2 3 5 7 9
A: From the Warlock table's own columns: 1 slot of level 1 at Warlock 1; 2 slots from Warlock 2; slot LEVEL rises to 2 at 3, 3 at 5, 4 at 7, 5 at 9.
QUOTE: "1 +2 Eldritch Invocations, Pact Magic 1 2 2 1 1"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Reading Pact slots off the shared Multiclass Spellcaster table, or assuming slot count scales like a full caster's — a Warlock 5-7 has TWO slots of level 3-4, not a full caster's spread. Corroborating unique span for Warlock 7 (2 slots, slot level 4): '7 +3 — 6 3 8 2 4'. Pact slots' Short-Rest recovery is not in this source file — CHECK needed (see R-REST-010 for the pool separation).

### R-REST-014 monk-focus-points-none-at-level-1-equal-class-level
Q: how many Focus Points at Monk level 1; when does Monk's Focus arrive; ki points monk dip flurry of blows
A: NONE at Monk 1 (dash in the Focus Points column); Monk's Focus arrives at Monk 2 with points equal to MONK class level (2 at 2, 3 at 3, ...).
QUOTE: "1 +2 Martial Arts, Unarmored Defense 1d6 — —"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Granting a Monk 1 dip Focus Points to spend on Flurry of Blows or Patient Defense, or setting points = total character level on a multiclass Monk. 2014 called this resource ki; the count rule matches but the name does not. Corroborating unique spans: 'Unarmored Movement, 1d6 2 +10 ft.' (2 points at 2) and '4 +2 Ability Score Improvement, Slow Fall 1d6 4' (4 at 4). Focus recovery cadence is not in this source file — CHECK needed.

### R-REST-015 barbarian-rage-uses-and-rage-damage-by-level
Q: how many Rages does a Barbarian have per level; rage damage bonus progression 2 3 4 uses
A: Per the Barbarian table: 2 Rages at levels 1-2, 3 at levels 3-5, 4 at levels 6-11; Rage Damage is +2 through Barbarian 8, rising to +3 at 9.
QUOTE: "1 +2 Rage, Unarmored Defense, Weapon Mastery 2 +2 2"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Reading Rage count off total character level in a multiclass build, or importing a remembered 2014 progression. Corroborating unique spans: '3 +2 Barbarian Subclass, Primal Knowledge 3 +2 2' (3 rages at 3) and '6 +3 Subclass feature 4 +2 3' (4 at 6). Recovery cadence is R-REST-003; this entry is the count being recovered.

### R-REST-016 paladin-channel-divinity-starts-level-3-two-uses
Q: when does Paladin get Channel Divinity and how many uses; paladin channel divinity level 2 level 3 count
A: Not before Paladin 3 (dashes at levels 1-2 in the Channel Divinity column); at Paladin 3 it arrives with TWO uses.
QUOTE: "3 +2 Channel Divinity, Paladin Subclass 2 4"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: 2014 recall gives Channel Divinity at Paladin 3 as one use recovering on any rest; in SRD 5.2.1 the Paladin table's level-3 row grants Channel Divinity with two uses. Verify the row in SRC rather than reciting a schedule.
