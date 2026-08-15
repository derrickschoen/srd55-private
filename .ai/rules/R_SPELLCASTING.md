### R-SPELL-001 cantrip-scaling-character-level
Q: do cantrips scale on class level or total character level in multiclassing
A: TOTAL CHARACTER level, unless the spell says otherwise.
QUOTE: "character level, not your level in a particular class"
SRC: docs/srd/source/multiclassing.txt
CODE: src/ui/screens/sheet/sheet-view.ts (`currentCantripEffect`)
TRAP: Applying the cantrip's scaling thresholds to the level in the class that granted it. A one-level caster dip still scales at character levels 5, 11, and 17.

### R-SPELL-002 higher-slots-upcast-prepared-spells
Q: can slots above your known or prepared spell level cast higher-level spells
A: No. Higher-level slots can only cast and potentially enhance lower-level spells you actually prepare.
QUOTE: "slots but only to cast your lower-level spells"
SRC: docs/srd/source/multiclassing.txt
CODE: NONE
TRAP: Treating possession of a level 3 slot as access to level 3 spells. Spell preparation is determined for each class independently.

### R-SPELL-003 magic-missile-darts-upcast
Q: how many Magic Missile darts; how many with a level 4 spell slot
A: Three darts at level 1, plus one dart per slot level above 1; a level 4 slot creates SIX darts.
QUOTE: "one more dart for each spell slot level above 1"
SRC: docs/srd/source/spell-descriptions.txt
CODE: NONE
TRAP: Adding one dart total when upcast, or confusing spell level 4 with four darts.

### R-SPELL-004 spell-slot-progression-class-tables
Q: where do single-class spell slot counts and levels come from; full caster half caster progression
A: A single class uses its Features table; multiclass shared slots count every Bard, Cleric, Druid, Sorcerer, and Wizard level plus half of each Paladin and Ranger level rounded UP, then use the Multiclass Spellcaster table; Pact Magic is separate.
QUOTE: "Half your levels (round up) in the Paladin and Ranger classes"
SRC: docs/srd/source/multiclassing.txt
CODE: src/rules/spell-slots.ts
TRAP: Applying 2014 half-caster rounding down, adding Pact Magic to shared slots, or using the multiclass table directly for a single-class Paladin or Ranger.

### R-SPELL-005 higher-slot-spell-level-effects
Q: what does upcasting do automatically; does every spell gain damage or targets
A: The spell takes on the slot's higher level, but it gains extra effects only when its description says so.
QUOTE: "higher level, as detailed in a spell’s description."
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Assuming every spell gains damage, targets, or duration from a higher slot.

### R-SPELL-006 concentration-one-effect
Q: can you concentrate on two spells or effects at once; when does new concentration end old concentration
A: No. Starting another Concentration spell or effect immediately ends the current Concentration.
QUOTE: "on an effect the moment you start casting"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Waiting until the new spell finishes casting before ending the old Concentration.

### R-SPELL-007 concentration-damage-save
Q: concentration check DC after taking damage; Constitution save formula maximum
A: Make a Constitution save with DC 10 or half the damage taken, rounded down, whichever is higher, to a maximum DC of 30.
QUOTE: "The DC equals 10 or half the damage taken"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Using half damage rounded up, omitting the DC 30 maximum, or treating this as an ability check.

### R-SPELL-008 concentration-incapacitated-dead
Q: does Incapacitated or death break concentration
A: Concentration ends if its creator has the Incapacitated condition or dies.
QUOTE: "Incapacitated or Dead. Your Concentration ends"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Assuming Unconscious is a separately listed trigger; it breaks Concentration because Unconscious includes Incapacitated.

### R-SPELL-009 ritual-requirements-cost
Q: how does ritual casting work; prepared required; extra time; spell slot cost
A: Under the general rule, a Ritual-tagged spell must be prepared, takes 10 minutes longer, and expends no spell slot; a specific feature can override the preparation requirement.
QUOTE: "takes 10 minutes longer to cast than normal"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/domain/models.ts (`supports_ritual_casting`, `ritual_casting_mode`)
TRAP: Forgetting that the Wizard's Ritual Adept feature overrides the general preparation requirement for Ritual spells in the Wizard's spellbook.

### R-SPELL-010 rituals-cannot-upcast
Q: can a ritual spell be cast at a higher level or upcast
A: No. Because the Ritual version expends no slot, it cannot be cast at a higher level.
QUOTE: "ritual version of a spell can’t be cast at a"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Treating the extra 10-minute casting time as permission to choose a higher spell level.

### R-SPELL-011 prepared-spell-change-cadence
Q: when can each class change prepared spells; preparing versus knowing spells 2024
A: Bard, Sorcerer, and Warlock replace one when gaining a class level; Cleric, Druid, and Wizard replace any after a Long Rest; Paladin and Ranger replace one after a Long Rest.
QUOTE: "Spell Preparation by Class"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/class-choice-entitlements-srd.ts (`spellReplacementPolicyForClassName`)
TRAP: Using the 2014 vocabulary split where Bard, Sorcerer, and Warlock "know" spells while only some classes prepare them. SRD 5.2.1 calls all of these prepared spells and varies replacement cadence.

### R-SPELL-012 always-prepared-list-limit
Q: do always-prepared spells count against number of prepared spells
A: No. An always-prepared spell does not count against a changeable prepared-spell list's limit.
QUOTE: "always have prepared doesn’t count against the"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/access/spell-access-builder.ts
TRAP: Counting subclass, species, background, or feat spells against a class's prepared-spell allowance merely because they appear in the same sheet section.

### R-SPELL-013 spell-save-dc-attack-bonus
Q: how to calculate spell save DC and spell attack bonus
A: Spell save DC = 8 + spellcasting ability modifier + Proficiency Bonus; spell attack bonus = spellcasting ability modifier + Proficiency Bonus.
QUOTE: "Spell save DC = 8 + spellcasting ability modifier"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/ability-score.ts (`spellSaveDC`, `spellAttackBonus`)
TRAP: Adding the full ability score, using class level for proficiency, or assuming every multiclass spell uses the same spellcasting ability.

### R-SPELL-014 one-spell-slot-per-turn
Q: can you cast two leveled spells in one turn; Bonus Action spell and action spell 2024
A: On a turn, you can expend only ONE spell slot to cast a spell; cantrips and slotless casting do not expend a slot.
QUOTE: "On a turn, you can expend only one spell slot"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: NONE
TRAP: Applying the 2014 Bonus Action spell restriction. SRD 5.2.1 instead limits the number of spell slots expended to cast spells on a turn.

### R-SPELL-015 wizard-ritual-adept
Q: must a Wizard prepare a Ritual spell in the spellbook to cast it as a Ritual
A: No. Ritual Adept lets a Wizard cast a Ritual-tagged spell from their spellbook without preparing it, but they must read from the book while casting.
QUOTE: "needn’t have the spell prepared, but you must read"
SRC: docs/srd/full/srd-5.2.1.txt
CODE: src/rules/class-progression-lookup.ts (`ritual-adept`)
TRAP: Applying the general prepared-spell requirement without the Wizard feature's specific exception.
