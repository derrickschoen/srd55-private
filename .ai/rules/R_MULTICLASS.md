# Multiclassing

Format: `FORMAT.md`. Verify: `python3 .ai/rules/verify_citations.py`.

### R-MC-001 caster-level-half-casters
Q: paladin ranger half caster multiclass spell slots round up or down; does a 1-level paladin dip give slots
A: HALF, ROUNDED UP. Paladin 1 or Ranger 1 contributes a FULL caster level, same as a Wizard dip.
QUOTE: "Half your levels (round up) in the Paladin and Ranger classes"
SRC: docs/srd/source/multiclassing.txt
CODE: src/rules/class-progression-lookup.ts (`half_up`)
TRAP: 2014 rules rounded DOWN and recall reproduces that. "Paladin dip is slot-dead" is WRONG. This exact error was asserted in a design doc and shipped to three agent lanes before being caught.

### R-MC-002 caster-level-full-casters
Q: which classes count full toward multiclass spell slots caster level
A: Bard, Cleric, Druid, Sorcerer, Wizard — every level counts.
QUOTE: "All your levels in the Bard, Cleric, Druid, Sorcerer,"
SRC: docs/srd/source/multiclassing.txt
CODE: src/rules/caster-contribution.ts
TRAP: NONE

### R-MC-003 slots-exceed-known-spells
Q: can multiclass slots be higher level than any spell you know or prepare; what are the extra slots for
A: Yes, and they are usable only to UPCAST spells you actually prepare. Five 1-level full-caster dips = caster level 5 (slots 4/3/2) while preparing only 1st-level spells.
QUOTE: "This table might give you spell slots of a higher"
SRC: docs/srd/source/multiclassing.txt
CODE: NONE
TRAP: Assuming a 3rd-level slot lets you cast 3rd-level spells. It does not — it upcasts 1st-level spells.

### R-MC-004 prepared-spell-ability
Q: which spellcasting ability applies to a multiclass prepared spell
A: The ability of the class the spell is associated with — each prepared spell belongs to one class.
QUOTE: "Each spell you prepare is associated with one of"
SRC: docs/srd/source/multiclassing.txt
CODE: NONE
TRAP: Assuming one save DC across a multiclass caster. Each class's spells use that class's ability.

### R-MC-005 entry-grants-reduced-proficiencies
Q: what proficiencies do you get when multiclassing into a new class; do you get level 1 features
A: REDUCED proficiencies, but the FULL level-1 class features. Sneak Attack, Second Wind, Unarmored Defense, Pact Magic, Expertise all arrive intact on a 1-level dip.
QUOTE: "you gain only some of the new"
SRC: docs/srd/source/multiclassing.txt
CODE: src/rules/multiclass-entry-srd.ts
TRAP: Assuming a dip grants the class's full starting proficiency list. It does not — check `docs/srd/source/multiclass-entry-grants.txt` for the per-class subset before assuming armour training.

### R-MC-006 proficiency-bonus-character-level
Q: proficiency bonus multiclass character level or class level
A: TOTAL CHARACTER level. Level 7 total = +3 regardless of how it is split.
QUOTE: "Your Proficiency Bonus is based on your total"
SRC: docs/srd/source/multiclassing.txt
CODE: NONE
TRAP: NONE

### R-MC-007 primary-abilities-table
Q: multiclass prerequisite ability scores; primary ability of each class; what 13 do I need
A: Barbarian Str; Bard Cha; Cleric Wis; Druid Wis; Fighter Str OR Dex; Monk Dex AND Wis; Paladin Str AND Cha; Ranger Dex AND Wis; Rogue Dex; Sorcerer Cha; Warlock Cha; Wizard Int.
QUOTE: "Primary Ability Strength or Dexterity"
SRC: docs/srd/source/class-core-traits.txt
CODE: src/rules/multiclass-prerequisite-gate.ts
TRAP: Treating 7 classes as needing 7 separate 13s. It is a SET COVER over this table — Cha 13 + Wis 13 + Dex 13 alone unlocks seven classes (Bard, Sorcerer, Warlock, Cleric, Druid, Rogue, Fighter).

### R-MC-008 warlock-levels-not-in-slot-total
Q: do warlock levels count toward multiclass spell slots; is pact magic added to the shared slot table; warlock dip caster level
A: NO. The Spell Slots total names Bard/Cleric/Druid/Sorcerer/Wizard in full and Paladin/Ranger at half rounded up. Warlock is ABSENT, so every Warlock level contributes ZERO shared slots; Pact Magic is a wholly separate pool.
CHECK: python3 -c "t=open('docs/srd/source/multiclassing.txt').read();s=t[t.find('You determine your available spell'):t.find('Then look up this total')];assert len(s)>200;assert all(c in s for c in ['Bard','Cleric','Druid','Sorcerer','Wizard','Paladin','Ranger']);assert 'Warlock' not in s"
SRC: docs/srd/source/multiclassing.txt
CODE: NONE
TRAP: This is proven by ABSENCE, so no QUOTE can establish it — an entry here needs a CHECK. The costly form of the error is not "Warlock 1 is bad" (a 1-level dip is cheap and buys Pact Magic plus an invocation) but a MULTI-LEVEL Warlock dip: Warlock 3 spends 3 of 7 character levels for zero shared-slot progression, collapsing a Shape B mutt from caster level 7 (4/3/3/1) to 4 (4/3) and deleting every 3rd- and 4th-level slot.
