# Species traits — SRD 5.2.1

Format per FORMAT.md. Entries verified by verify_citations.py / kb_verify.py.

### R-SPECIES-001 lineage-legacy-spells-character-level-3-5
Q: when do elven lineage and fiendish legacy spells arrive; elf tiefling species spells level 3 5 character level or class level; misty step darkness free casting long rest
A: At TOTAL CHARACTER levels 3 and 5 (never at level 1, never class level) each lineage/legacy spell is always prepared, castable once per Long Rest without a slot, and also castable with any appropriate-level slot — Drow Faerie Fire/Darkness, High Elf Detect Magic/Misty Step, Wood Elf Longstrider/Pass without Trace, Abyssal Ray of Sickness/Hold Person, Chthonic False Life/Ray of Enfeeblement, Infernal Hellish Rebuke/Darkness.
QUOTE: "When you reach character levels 3 and 5, you"
SRC: docs/srd/source/species-descriptions.txt
CODE: NONE
TRAP: 2014 recall grants racial spells on fixed racial schedules or gates them on class level in a multiclass, and omits the free once-per-Long-Rest slotless casting; the sentence's continuation 'learn a higher-level spell, as shown on the table.' is column-interleaved from it, so a CHECK should assert both spans separately.

### R-SPECIES-002 species-spell-ability-is-chosen
Q: what spellcasting ability do species trait spells use; elven lineage gnomish lineage fiendish legacy otherworldly presence save DC intelligence wisdom charisma chosen or class ability
A: A CHOSEN ability — Intelligence, Wisdom, or Charisma, picked when the lineage/legacy is selected — not the character's class spellcasting ability.
QUOTE: "(choose the ability when you select the lineage)."
SRC: docs/srd/source/species-descriptions.txt
CODE: NONE
TRAP: Computing the species-spell DC/attack from the class ability (e.g. forcing a Wisdom-Cleric Tiefling to Wis when Cha was chosen), or assuming one spellcasting ability per character (same family as R-MC-004); the lead-in 'Intelligence, Wisdom, or Charisma is your spell-' is column-interleaved from its continuation, so a CHECK should assert both spans.

### R-SPECIES-003 human-resourceful-skillful-versatile
Q: human species traits 2024; extra origin feat versatile; heroic inspiration on long rest resourceful; skillful skill proficiency; does a human get two origin feats
A: Resourceful grants Heroic Inspiration whenever you finish a Long Rest, Skillful grants one skill proficiency of choice, and Versatile grants an Origin feat of choice IN ADDITION to the background's feat — a Human has two Origin feats.
QUOTE: "Versatile. You gain an Origin feat of your choice"
SRC: docs/srd/source/species-descriptions.txt
CODE: NONE
TRAP: 2014 recall gives Humans +1 to all abilities and no feat, or Variant Human's single feat replacing other traits — either way the sheet ends one feat short; 'Resourceful. You gain Heroic Inspiration when-' is hyphen-split across a column boundary, so a CHECK should pair both spans.

### R-SPECIES-004 dwarven-toughness-hp-per-character-level
Q: dwarf hit point bonus; dwarven toughness hp per level; how much extra HP does a dwarf have; does dwarf HP bonus apply on multiclass level up
A: Hit Point maximum increases by 1 at level 1 and by 1 again at EVERY level gained — +N HP at character level N, on top of class Hit Dice math, including multiclass levels.
QUOTE: "increases by 1, and it increases by 1 again whenever you gain a level."
SRC: docs/srd/source/species-descriptions.txt
CODE: NONE
TRAP: Granting the extra HP per DWARF-class-something or once flat; it is +1 HP per CHARACTER level, growing retroactively at every level-up. Do not cite feat interactions here — the SRD 5.2.1 feat list is closed and small.

### R-SPECIES-005 species-damage-resistances
Q: which species have damage resistance; dwarf poison resistance; dragonborn ancestry resistance; tiefling legacy resistance abyssal chthonic infernal fire necrotic poison
A: Dwarf: Resistance to Poison plus Advantage on saves to avoid or end the Poisoned condition; Dragonborn: Resistance to its Draconic Ancestry's damage type; Tiefling level-1 legacy: Abyssal Poison, Chthonic Necrotic, Infernal Fire.
QUOTE: "You have Resistance to Poison damage."
SRC: docs/srd/source/species-descriptions.txt
CODE: NONE
TRAP: Simming full damage against a resistant species or assigning the wrong Tiefling legacy resistance; Dragonborn's type comes from the ancestry table (Gold/Red/Brass all Fire, Silver/White Cold), and 'Dwarven Resilience. You have Resistance to' splits across columns before 'Poison damage', so a CHECK should assert the pieces separately.

### R-SPECIES-006 species-combat-traits-scale-on-character-level
Q: dragonborn breath weapon damage scaling 2d10 character level or class level; breath weapon uses save DC; draconic flight level 5; goliath large form level 5 multiclass
A: Dragonborn Breath Weapon is 1d10 rising at CHARACTER levels 5 (2d10), 11 (3d10), 17 (4d10), usable PB times per Long Rest with Dex save DC 8 + Con modifier + Proficiency Bonus; Draconic Flight and Goliath Large Form both unlock at character level 5, regardless of class split.
QUOTE: "you reach character levels 5 (2d10), 11 (3d10), and"
SRC: docs/srd/source/species-descriptions.txt
CODE: NONE
TRAP: Gating species scaling on class level — a Dragonborn 3/Fighter 4 breathes 2d10, not 1d10, and a level-5 multiclassed Goliath gets Large Form (same error family as cantrip scaling, R-SPELL-001); 'Large Form. Starting at character level 5, you can' is also a proven contiguous span.
