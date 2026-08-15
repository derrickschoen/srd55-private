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
