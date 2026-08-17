# Feats and origin-feat rules — SRD 5.2.1

Format per FORMAT.md. Entries verified by verify_citations.py / kb_verify.py.

### R-FEAT-001 background-grants-specified-origin-feat
Q: which origin feat does each background grant; acolyte criminal sage soldier feat; can a background choose any origin feat
A: A background grants one SPECIFIED Origin feat, not a choice: Acolyte = Magic Initiate (Cleric), Criminal = Alert, Sage = Magic Initiate (Wizard), Soldier = Savage Attacker.
QUOTE: "A background gives your character a specified Origin feat"
SRC: docs/srd/source/backgrounds.txt
CODE: NONE
TRAP: Treating the background feat as 'choose any Origin feat' (a 2024 PHB variant framing), or picking the wrong pinned list for a Magic Initiate background — Acolyte is Cleric, Sage is Wizard; verify against the 'Feat: ...' lines in backgrounds.txt. Quote spans a column hyphen-wrap ('Ori- gin'), so it is contiguous only in that hyphenated form.

### R-FEAT-002 magic-initiate-lists-and-ability-choice
Q: magic initiate which spell lists cantrips; magic initiate spellcasting ability int wis cha; is magic initiate ability forced by list
A: Magic Initiate: learn two cantrips from the Cleric, Druid, or Wizard spell list, and the feat's spellcasting ability is Intelligence, Wisdom, or Charisma — chosen FREELY when the feat is selected, not forced by the list.
QUOTE: "Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat’s spells"
SRC: docs/srd/source/feats.txt
CODE: NONE
TRAP: Keying the ability to the list (Cleric→Wis, Wizard→Int) as the class would — the feat lets a Paladin Acolyte run its Cleric-list spells on Charisma. Also do not offer Bard/Sorcerer/Warlock lists; only Cleric, Druid, or Wizard.

### R-FEAT-003 magic-initiate-level-1-spell-casting
Q: magic initiate level 1 spell free cast per day; magic initiate spell always prepared; can magic initiate spell use spell slots; recharge short or long rest
A: Magic Initiate's level 1 spell is always prepared, castable ONCE without a spell slot per Long Rest, and ALSO castable with any spell slots the character has.
QUOTE: "cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest"
SRC: docs/srd/source/feats.txt
CODE: NONE
TRAP: Forgetting the slot-casting clause: a Fighter gets exactly 1/day, but a Wizard Acolyte can additionally burn slots on it. The free use recharges on LONG Rest only, not Short. It does not count against a class's prepared-spell limit (see R-SPELL-012).

### R-FEAT-004 asi-feat-options-and-cap
Q: ability score improvement feat options plus 2 or two plus 1; asi cap 20; asi prerequisite level 4; is asi a feat repeatable
A: Ability Score Improvement is a General Feat (Prerequisite: Level 4+): increase one ability by 2 OR two abilities by 1, it cannot raise a score above 20, and it is Repeatable.
QUOTE: "increase two ability scores of your choice by 1. This feat can’t increase an ability score above 20."
SRC: docs/srd/source/feats.txt
CODE: NONE
TRAP: The cap is 20 for this feat (Epic Boons cap at 30 — a different rule). With a 19, the +2 option cannot land as +2; the split +1/+1 into two scores is the legal way to avoid waste. ASI is a FEAT here, so the class ASI feature slot can hold it or another feat.

### R-FEAT-005 savage-attacker-once-per-turn-weapon-dice
Q: savage attacker how it works; roll weapon damage dice twice use either; savage attacker once per turn or per attack; does savage attacker reroll sneak attack
A: Savage Attacker: once per TURN, when you hit with a weapon, roll the weapon's damage dice twice and use EITHER roll (take the better set).
QUOTE: "Once per turn when you hit a target with a weapon, you can roll the weapon’s damage dice twice and use either roll"
SRC: docs/srd/source/feats.txt
CODE: NONE
TRAP: Only the WEAPON'S damage dice are rolled twice — not Sneak Attack or other bonus dice (contrast R-COMBAT-004 where a crit doubles ALL dice). Not added together; not once per attack; usable on any hit including Opportunity Attacks on others' turns.

### R-FEAT-006 feat-taken-once-unless-repeatable
Q: can a feat be taken twice; repeatable feats list; take magic initiate twice; stack alert or savage attacker
A: A feat can be taken only once unless it has a 'Repeatable' subsection; in feats.txt those are exactly Magic Initiate (different spell list each time), Skilled, and Ability Score Improvement.
QUOTE: "A feat can be taken only once unless its description states otherwise in a “Repeatable” subsection."
SRC: docs/srd/source/feats.txt
CODE: NONE
TRAP: Stacking Alert or Savage Attacker, or taking Magic Initiate (Wizard) twice — its Repeatable clause requires a DIFFERENT list each time. Everything else — Alert, Savage Attacker, Grappler, all Fighting Styles, all Epic Boons — is once only. Quote uses curly quotes around “Repeatable”.
