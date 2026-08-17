# Sheet math and derived numbers — SRD 5.2.1

Format per FORMAT.md. Entries verified by verify_citations.py / kb_verify.py.

### R-SHEET-001 level-1-hit-point-maximum-by-class
Q: level 1 hit points by class; hit point maximum at level 1; barbarian fighter wizard starting hp; max of hit die plus con modifier
A: Level 1 HP maximum is the die MAXIMUM + Con modifier: Barbarian 12; Fighter/Paladin/Ranger 10; Bard/Cleric/Druid/Monk/Rogue/Warlock 8; Sorcerer/Wizard 6.
QUOTE: "Barbarian 12 + Con. modifier"
SRC: docs/srd/source/sheet-math.txt
CODE: src/rules/sheet.ts hitPointMaximum
TRAP: Using the fixed per-level value (7/6/5/4) at level 1, or averaging the die instead of taking its maximum. The Level 1 table prints no minimum-of-1 floor; only later levels have one.

### R-SHEET-002 hit-points-gained-per-level-roll-or-fixed
Q: hit points gained on level up; fixed hit points by class; roll hit die plus con minimum 1; leveling hp per level barbarian wizard
A: Each new level: roll the class Hit Die + Con modifier and add the total (minimum 1), OR take the fixed value + Con modifier: Barbarian 7; Fighter/Paladin/Ranger 6; Bard/Cleric/Druid/Monk/Rogue/Warlock 5; Sorcerer/Wizard 4.
QUOTE: "Sorcerer or Wizard 4 + Con. modifier"
SRC: docs/srd/source/sheet-math.txt
CODE: NONE
TRAP: Computing the fixed value as die average rounded down (d10 gives 5 instead of 6), or letting a low Con modifier add 0 or negative HP on a rolled level. The minimum-of-1 sentence is column-interleaved; the span 'the roll, and add the total (minimum of 1) to your' is contiguous and passes a CHECK assertion.

### R-SHEET-003 proficiency-bonus-by-total-character-level
Q: proficiency bonus by level; pb table thresholds; when does proficiency bonus become +3 +4; level 5 proficiency bonus
A: By TOTAL character level: +2 up to level 4; +3 at 5-8; +4 at 9-12; +5 at 13-16; +6 at 17-20.
QUOTE: "5–8 +3 21–24 +7"
SRC: docs/srd/source/skills-table.txt
CODE: src/rules/sheet.ts sheetProficiencyBonus
TRAP: The table is laid out as two side-by-side 'Level or CR / Bonus' pairs, so one row reads as four values (the quote is one such row: levels 5-8 give +3, CR 21-24 gives +7). Recall also misses the level-5 breakpoint and carries +2 through level 7; R-MC-006 gives only the single data point level 7 = +3.

### R-SHEET-004 skills-table-governing-abilities
Q: which ability governs each skill; skills table skill to ability map; intimidation charisma medicine wisdom investigation intelligence stealth dexterity athletics strength
A: Str: Athletics (only Strength skill); Dex: Acrobatics, Sleight of Hand, Stealth; Int: Arcana, History, Investigation, Nature, Religion; Wis: Animal Handling, Insight, Medicine, Perception, Survival; Cha: Deception, Intimidation, Performance, Persuasion.
QUOTE: "Intimidation Charisma Awe or threaten someone into doing what you want."
SRC: docs/srd/source/skills-table.txt
CODE: src/rules/skills.ts abilityForSkill
TRAP: Importing the 2014 optional-variant recall of Strength (Intimidation), swapping Nature (Intelligence) with Survival (Wisdom), or making Medicine Intelligence. The Skills table in the extract is full width with no column bleed.

### R-SHEET-005 passive-perception-formula
Q: passive perception formula; 10 plus wisdom perception check modifier; does passive perception include proficiency; is passive perception rolled
A: Passive Perception = 10 + the Wisdom (Perception) check modifier, including Proficiency Bonus if proficient in Perception and every other modifier that applies to that check — it is a score, never a roll.
QUOTE: "you have a Passive Perception of 14 (10 + 2 for your Wisdom modifier + 2 for proficiency)."
SRC: docs/srd/source/sheet-math.txt
CODE: src/rules/sheet.ts passivePerception
TRAP: Adding only the Wisdom modifier and forgetting proficiency, or rolling a d20 instead of using 10. The formula line 'Passive Perception = 10 + Wisdom (Perception)' is split from 'check modifier' by column interleave — the worked example is the contiguous proof.

### R-SHEET-006 multiclass-entry-no-saves-hit-die-only-classes
Q: multiclassing into a class saving throw proficiency; what does a monk sorcerer wizard dip grant; hit point die only multiclass entry
A: Multiclassing INTO any of the twelve classes NEVER grants saving throw proficiency, and entering Monk, Sorcerer, or Wizard grants ONLY the Hit Point Die — no armor, weapon, tool, or skill proficiency at all.
QUOTE: "Gain the Hit Point Die trait from the Core Monk Traits table."
SRC: docs/srd/source/multiclass-entry-grants.txt
CODE: src/rules/multiclass-entry-srd.ts parseSrdMulticlassEntryGrants
TRAP: Computing a dip from the class's full Core Traits row over-grants: a Barbarian dip wrongly adds Con save proficiency, a Wizard dip wrongly adds weapon proficiencies. The no-saving-throws half is proven by ABSENCE — 'saving' appears nowhere in the twelve clauses (verified; it occurs only in the extract's commentary header) — so that facet needs a CHECK-style absence assertion, not a quote.
