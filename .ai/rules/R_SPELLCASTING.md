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

### R-SPELL-016 wizard-replacement-pool-is-spellbook
Q: wizard prepare spells from spellbook or full wizard spell list; wizard long rest replacement pool; what spells can a wizard prepare
A: On gaining a Wizard level, a Wizard REPLACES prepared spells only with spells recorded in their spellbook — the spellbook, not the full class list, is the replacement pool.
QUOTE: "replacing any of the spells there with spells from your spellbook."
SRC: docs/srd/source/class-spell-replacement.txt
CODE: NONE
TRAP: R-SPELL-011 gives the Wizard's replacement CADENCE (any, after a Long Rest) but not the POOL; recall pattern-matches Wizard onto Cleric/Druid and prepares from the whole class list, producing an illegal prepared list of spells never scribed.

### R-SPELL-017 prepared-spell-counts-fixed-table-not-formula
Q: how many spells can a cleric druid paladin prepare; prepared spells formula ability modifier plus level; where does prepared spell count come from
A: Prepared-spell counts are FIXED numbers read from each class's Features table Prepared Spells column with no ability-score dependence; e.g. Cleric 1 prepares exactly 4 spells (with 3 cantrips and 2 level-1 slots), Cleric 3 prepares 6.
QUOTE: "1 +2 Spellcasting, Divine Order — 3 4 2"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Using the 2014 formula (class level + ability mod). It coincides with the table at some levels — a Wis 16 Cleric 3 gives 6 both ways — and diverges elsewhere (Wis 20 Cleric 1: formula 6, table 4), so agreement at one level proves nothing.

### R-SPELL-018 warlock-pact-magic-slot-count-and-level-numbers
Q: warlock pact magic how many slots what slot level; warlock 3 5 7 spell slots; pact slot progression table levels 1-7
A: Pact Magic slots are few and ALL of one slot level from the Warlock table: Warlock 1 has 1 slot of level 1; Warlock 2 has 2 of level 1; Warlock 3-4 have 2 of level 2; Warlock 5-6 have 2 of level 3; Warlock 7-8 have 2 of level 4.
QUOTE: "3 +2 Warlock Subclass 3 2 4 2 2"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: R-MC-008 establishes Pact Magic is separate from shared slots but records no slot COUNT or LEVEL; recall substitutes a full-caster spread (e.g. 4/2 at Warlock 3) or wrong slot level, mispricing every slot round and short-rest recovery in the sim.

### R-SPELL-019 paladin-ranger-have-no-cantrips
Q: do paladins get cantrips 2024; ranger cantrips srd; half caster cantrips known; paladin sacred flame legal
A: NO cantrips for Paladin or Ranger at ANY level in SRD 5.2.1 — their Features tables have no Cantrips column at all; a mutt's cantrips come only from full-caster classes, species traits, or feats.
CHECK: python3 -c "import re;t=open('docs/srd/source/class-level-tables.txt').read();n=re.sub(r'-\\s*\\n\\s*','',t);n=re.sub(r'\\s+',' ',n);pal=n[n.find('Paladin Features'):][:260];ran=n[n.find('Ranger Features'):][:260];sor=n[n.find('Sorcerer Features'):][:260];assert 'Cantrips' in sor;assert 'Cantrips' not in pal;assert 'Cantrips' not in ran;assert 'Prepared' in pal and 'Prepared' in ran"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Full-PHB recall grants Paladins cantrips via the Blessed Warrior fighting style — that is NOT SRD content, and a drafted entry here originally QUOTED it from memory; the citation gate caught the fabrication. Proven by ABSENCE, hence CHECK not QUOTE, with the Sorcerer header as the positive control.

### R-SPELL-020 true-strike-2024-weapon-attack-spellcasting-ability
Q: true strike 2024 what does it do; true strike attack and damage ability; true strike radiant scaling components
A: True Strike (Divination cantrip; Bard, Sorcerer, Warlock, Wizard; Action; S, M — a proficient 1+ CP weapon, NO Verbal): make one weapon attack using your spellcasting ability for BOTH attack and damage rolls instead of Str/Dex; damage can be Radiant or the weapon's type; extra Radiant 1d6 at character level 5 (2d6 at 11, 3d6 at 17).
QUOTE: "damage rolls instead of using Strength or Dexterity."
SRC: docs/srd/source/weapon-attack-cantrips.txt
CODE: NONE
TRAP: Recall of 2014 True Strike (advantage on your next turn, no attack) is a completely different spell; and the ability substitution applies to the DAMAGE roll too, not just the attack roll — a sim rolling Str/Dex and omitting the level-5 +1d6 Radiant gets both numbers wrong.

### R-SPELL-021 shillelagh-bonus-action-d8-die-and-ability-swap
Q: shillelagh damage die casting time ability; shillelagh d8 scaling levels 5 11 17; does recasting shillelagh end the old one
A: Shillelagh (Druid cantrip, BONUS ACTION, 1 minute): a held Club or Quarterstaff attacks with your spellcasting ability instead of Strength and its damage die becomes a d8 (d10 at character level 5, d12 at 11, 2d6 at 17); damage can be Force or the weapon's normal type; ends early if you cast it again or let go of the weapon.
QUOTE: "and the weapon’s damage die becomes"
SRC: docs/srd/source/weapon-attack-cantrips.txt
CODE: NONE
TRAP: 2014 recall keeps the Wis-based attack but forgets the die upgrade to d8 and the 5/11/17 die scaling, or spends an Action instead of a Bonus Action — wrong die, wrong attack bonus, wasted action. Source is column-interleaved here: the d8/Force sentences are split by blank right-column lines ("becomes" and "a d8." are separated), so longer spans need CHECK-style short phrases.
