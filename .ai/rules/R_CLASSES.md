# Class features and per-class resources — SRD 5.2.1

Format per FORMAT.md. Entries verified by verify_citations.py / kb_verify.py.

### R-CLASS-001 extra-attack-class-level-5-no-stacking
Q: extra attack what level which classes; does extra attack stack from two classes; fighter 5 attacks per turn; multiclass extra attack three attacks; thirsting blade plus extra attack
A: Barbarian, Fighter, Monk, Paladin, and Ranger gain Extra Attack at CLASS level 5 (attack twice when taking the Attack action); gaining it from more than one source never stacks — still two attacks unless a feature like Fighter 11's Two Extra Attacks says otherwise.
QUOTE: "If you gain the Extra Attack feature from more than one class, the features don’t stack."
SRC: docs/srd/source/attack-class-features.txt
CODE: src/rules/extra-attack.ts resolveAttacksPerAction()
TRAP: Granting Extra Attack at TOTAL character level 5, or summing two classes' grants into three attacks. The attack-twice sentence is column-interleaved in SRC ('whenever you Rest. take the Attack action'); only the non-stacking sentence is contiguous, so it is the QUOTE.

### R-CLASS-002 subclass-at-class-level-3-every-class
Q: what level do you get a subclass; cleric sorcerer warlock subclass level 2024; druid wizard subclass level; level 1 cleric domain legal
A: EVERY class gains its subclass at CLASS level 3 in SRD 5.2.1 — including Cleric, Sorcerer, and Warlock (and Druid/Wizard); there are no level-1 or level-2 subclasses.
QUOTE: "3 +2 Warlock Subclass 3 2 4 2 2"
SRC: docs/srd/source/class-level-tables.txt
CODE: NONE
TRAP: Applying 2014 acquisition levels (Cleric/Sorcerer/Warlock at 1, Druid/Wizard at 2), e.g. a Cleric 1 with Life Domain and always-prepared domain spells. All twelve Features tables in SRC show 'Subclass' in the level-3 row; later subclass-feature levels VARY BY CLASS (e.g. Fighter 7/10/15/18) — do not recite a single schedule.

### R-CLASS-003 barbarian-rage-uses-damage-by-barbarian-level
Q: how many rage uses barbarian level; rage damage bonus progression 2024; rage bonus action heavy armor; rages column
A: By BARBARIAN level (Rages / Rage Damage columns): 2 uses at levels 1-2, 3 at 3-5, 4 at 6-11, 5 at 12-16, 6 at 17-20; damage bonus +2 at 1-8, +3 at 9-15, +4 at 16+; Rage is a Bonus Action and only while not wearing Heavy armor.
QUOTE: "Rage, Unarmored Defense, Weapon Mastery 2 +2 2"
SRC: docs/srd/source/class-level-tables.txt
CODE: src/rules/class-resources-srd.ts LADDER_CONFIG (Barbarian, kind 'rage', acquisition_level 1)
TRAP: Reading the Rages column at total character level, or carrying 2014's flat progression. Recovery is R-REST-003. The Bonus Action / no-Heavy-armor sentence tails interleave with the equipment column in class-core-traits.txt, so a full-text entry needs a CHECK-style span pair.

### R-CLASS-004 warlock-pact-magic-slot-count-and-level
Q: warlock pact magic how many slots what level; warlock 5 spell slots; pact slot progression same level; warlock slot table
A: Pact Magic slots are ALL one shared level: 1 slot of level 1 at Warlock 1, 2 slots from Warlock 2, with the slot level rising to 2/3/4 at Warlock levels 3/5/7 — Warlock 5 has exactly two level-3 slots and nothing lower.
QUOTE: "5 +3 — 5 3 6 2 3"
SRC: docs/srd/source/class-level-tables.txt
CODE: src/rules/spell-slots.ts pactMagic() / PACT_SLOT_TABLE
TRAP: Giving Warlock the shared Spellcasting ladder (4/3/2 at level 5) or slots of multiple levels. The quoted level-5 row's trailing columns are: 5 invocations, 3 cantrips, 6 prepared, 2 Spell Slots, Slot Level 3. Short-Rest recovery text is not in these extracts and needs its own source span; R-MC-008/R-REST-010 cover what Pact Magic is NOT.

### R-CLASS-005 rogue-sneak-attack-dice-by-rogue-level
Q: sneak attack damage dice progression; how many d6 sneak attack at rogue level; multiclass sneak attack scaling character level
A: Sneak Attack scales on ROGUE level only: 1d6 at levels 1-2, 2d6 at 3-4, 3d6 at 5-6, 4d6 at 7-8 — one extra d6 at every odd Rogue level (ceil(Rogue level / 2) d6).
QUOTE: "Expertise, Sneak Attack, Thieves’ Cant, Weapon Mastery 1d6"
SRC: docs/srd/source/class-level-tables.txt
CODE: src/rules/class-progression-lookup.ts ROGUE_SNEAK_ATTACK_CONTRIBUTION
TRAP: Scaling the die count on total character level (a Rogue 1/Fighter 6 dealing 4d6 instead of 1d6), or +1d6 per level. The once-per-turn / Advantage-or-adjacent-ally usage conditions are NOT in these extracts — that clause needs a new SRD span before it can be an entry. Crit doubling is R-COMBAT-004.

### R-CLASS-006 fighter-second-wind-uses-action-surge-level
Q: second wind how many uses 2024; action surge what fighter level how many uses; fighter 1 dip action surge second wind
A: Second Wind has 2 uses from Fighter 1 (3 uses from Fighter 4); Action Surge arrives at Fighter 2 with ONE use (a second only at Fighter 17) — a Fighter 1 dip gets Second Wind but never Action Surge.
QUOTE: "Action Surge (one use), Tactical Mind 2 3"
SRC: docs/srd/source/class-level-tables.txt
CODE: src/rules/class-resources-srd.ts LADDER_CONFIG (Fighter, kind 'second_wind', acquisition_level 1)
TRAP: Applying 2014's one-use-per-Short-Rest Second Wind, halving Fighter self-healing at levels 1-3. In the quote the '2' is the Second Wind USES column and the '3' is Weapon Mastery. Second Wind's healing formula and Action Surge's extra-action text are column-interleaved in the feature extracts and need CHECK-style spans.
