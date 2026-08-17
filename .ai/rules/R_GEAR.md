# Weapons, armor, and mastery — SRD 5.2.1

Format per FORMAT.md. Entries verified by verify_citations.py / kb_verify.py.

### R-GEAR-001 weapon-mastery-count-per-class
Q: how many weapon mastery weapons can each class choose; fighter barbarian paladin ranger rogue mastery count level 1; which classes have weapon mastery; does mastery count grow on level up
A: Barbarian, Fighter, Paladin, Ranger, and Rogue have the Weapon Mastery feature (Fighter 3 weapons; the others 2); the other SEVEN classes have none.
QUOTE: "1 +2 Fighting Style, Second Wind, Weapon Mastery 2 3"
SRC: docs/srd/source/weapon-mastery-progression.txt
CODE: src/rules/weapon-mastery-lookup.ts WeaponMasteryLookup.forClass
TRAP: Saying six classes lack it (there are seven), or granting mastery properties to any class without the feature; count the twelve Features tables, not recall.

### R-GEAR-002 armor-ac-formula-by-category
Q: worn armor ac formula light medium heavy; does dex modifier apply to armor; medium armor dex cap max 2; heavy armor flat ac no dex; half plate chain mail breastplate ac calculation
A: Light armor = base (11 or 12) + FULL Dex modifier; Medium armor = base (12–15) + Dex modifier CAPPED at +2; Heavy armor = flat AC (14–18) with NO Dex modifier at all, not even a penalty for negative Dex.
QUOTE: "Hide Armor 12 + Dex modifier (max 2)"
SRC: docs/srd/source/armor-table.txt
CODE: src/rules/sheet.ts dexterityTerm (full/capped/none per armor category)
TRAP: Applying the max-2 cap to Light armor, forgetting it on Medium (Breastplate is '14 + Dex modifier (max 2)', so Dex 18 Half Plate is AC 17 not 19), or applying any Dex adjustment to Heavy armor's flat number ('Ring Mail 14 — Disadvantage').

### R-GEAR-003 shield-ac-bonus-and-don-time
Q: shield ac bonus how much; does shield stack with armor or unarmored defense; how long to don doff shield vs armor; can you put on armor in combat; utilize action shield
A: A Shield gives a flat +2 AC bonus stacking on top of whichever SINGLE base AC formula applies, and takes the Utilize action to don or doff — armor takes 1–10 minutes per category, so shields are the only AC gear swappable in combat.
QUOTE: "Shield (Utilize Action to Don or Doff) Shield +2"
SRC: docs/srd/source/armor-table.txt
CODE: src/rules/sheet.ts armorClass (shieldBonus addend after single-base-formula competition)
TRAP: Treating the Shield as an alternative base formula rather than an additive bonus (sword-and-board Cleric in Chain Mail is AC 18, not 16), or copying the Utilize-action swap speed onto worn armor — 'Light Armor (1 Minute to Don or Doff)' and Heavy is 10 minutes to don, 5 to doff.

### R-GEAR-004 weapon-mastery-property-fixed-per-weapon
Q: which mastery property does each weapon have; can you choose a weapon's mastery property; greatsword graze greataxe cleave longsword sap rapier vex maul topple longbow slow dagger nick
A: Each weapon has exactly ONE fixed mastery property assigned by the Weapons table — the wielder picks which WEAPONS to master, never which property a weapon gets: Greatsword/Glaive=Graze, Greataxe/Halberd=Cleave, Longsword/Mace/Flail=Sap, Rapier/Shortsword/Handaxe=Vex, Maul/Quarterstaff/Battleaxe=Topple, Longbow/Whip/Club=Slow, Dagger/Scimitar/Sickle=Nick, Pike/Greatclub/Warhammer=Push.
QUOTE: "Greatsword 2d6 Slashing Heavy, Two-Handed Graze"
SRC: docs/srd/source/weapons-table.txt
CODE: src/rules/weapons-srd.ts mastery_property (TRAILING_MASTERY column parse, rejects rows without one)
TRAP: Treating the mastery property as chosen per character rather than fixed per weapon, or recalling the 2014 weapons table (which had no Mastery column) and concluding weapons have none. The property effects themselves are R-COMBAT-018..025; this entry is the weapon-to-property map they lacked.

### R-GEAR-005 versatile-weapon-two-handed-die
Q: versatile weapon damage one handed vs two handed; longsword 1d8 or 1d10; quarterstaff spear battleaxe warhammer trident versatile die; versatile vs two-handed property difference
A: A Versatile weapon deals its base die one-handed and the parenthesized die when swung with two hands: Quarterstaff/Spear 1d6→1d8; Longsword/Battleaxe/Warhammer/War Pick/Trident 1d8→1d10 — while a Two-Handed weapon like a Greatsword can never be used one-handed and a Longsword always can at 1d8.
QUOTE: "Longsword 1d8 Slashing Versatile (1d10) Sap"
SRC: docs/srd/source/weapons-table.txt
CODE: src/rules/attack-profiles.ts versatileNote / versatile_damage
TRAP: Using the versatile die while a shield or second weapon occupies the other hand, or confusing Versatile with Two-Handed. Recall also mangles specific rows: this gap's own draft cited 'Quarterstaff ... Versatile (1d10) Sap' but the table reads 'Quarterstaff 1d6 Bludgeoning Versatile (1d8) Topple'. The Versatile/Two-Handed rule-text definitions are NOT in this extract — that sentence needs a separate source or a CHECK.

### R-GEAR-006 heavy-armor-strength-requirement
Q: heavy armor strength requirement chain mail splint plate; can low str wear plate armor; str 13 str 15 armor threshold; penalty for not meeting armor strength requirement
A: Heavy armor carries a Strength column: Chain Mail requires Str 13, Splint and Plate require Str 15, Ring Mail has none, and no Light or Medium armor has one — a character below the score can still wear it but triggers the SRD's unmet-Strength penalty rather than making the build illegal.
QUOTE: "Splint Armor 17 Str 15"
SRC: docs/srd/source/armor-table.txt
CODE: src/rules/sheet.ts armorClass (strengthRequirementUnmet -> speed_penalty_feet: 10)
TRAP: Applying a Str requirement to Medium armor (all Medium Strength cells are '—'), giving a Str 11 character Plate with no consequence, or rejecting the sheet outright. The penalty itself (10-foot Speed reduction, as sheet.ts implements) is NOT in armor-table.txt — only the thresholds are; stating the consequence in the KB needs the armor rules text as a separate source or a CHECK.
