# SRD-only comparator substitutions

This board uses only mechanics present in the repository's pinned SRD 5.2.1
text, `docs/srd/full/srd-5.2.1.txt`. The cited guide options below are labels
for excluded roles, not content used by the simulator.

Published guide DPR commonly assumes non-SRD subclasses and feats and will
generally run higher than these SRD-only builds. This board is internally
consistent; its numbers are not directly comparable to guide DPR.

| Excluded guide option | SRD board stand-in | Mechanical reason |
|---|---|---|
| Oath of Vengeance | Oath of Devotion | D233 precedent: Sacred Weapon supplies an oath nova accuracy channel without reproducing Vow of Enmity. |
| Oath of Glory | Oath of Devotion | The only SRD oath retains the paladin smite chassis; its accuracy boost is not a mobility analogue. |
| Gloom Stalker | Hunter | Same ranger chassis; Hunter supplies sustained marked-target damage, but no first-round ambush analogue. |
| Fey Wanderer | Hunter | Same ranger chassis and Hunter's Mark posture; no psychic/social rider analogue is invented. |
| Beast Master | Hunter | Same ranger chassis; there is no SRD subclass companion analogue, so only the ranger's personal damage role remains. |
| War Domain | Life Domain | Same cleric chassis; Life offers healing support, with no martial-domain damage analogue. |
| Light Domain | Life Domain | Same cleric chassis; Spirit Guardians is the honest damage channel, but there is no subclass blast analogue. |
| Trickery Domain | Life Domain | Same cleric chassis; there is no duplicate/stealth-domain damage analogue. |
| Circle of the Moon | Circle of the Land | Same druid chassis; Arid spells replace casting damage, but combat Wild Shape has no SRD subclass analogue. |
| Circle of Stars | Circle of the Land | Same druid chassis; Land's Aid and Arid spells provide mixed damage/support, not a Starry Form analogue. |
| Battle Master | Champion | Same fighter chassis; expanded criticals are the SRD martial spike, with no maneuver-die analogue. |
| Eldritch Knight | Champion | Same fighter chassis; no SRD spellblade subclass exists, so the spell channel is absent. |
| Zealot | Path of the Berserker | Same barbarian chassis; Frenzy is the SRD once-per-turn Rage damage rider. |
| Shadow Monk | Warrior of the Open Hand | Same monk chassis; Open Hand supplies control through Flurry, with no shadow-magic analogue. |
| Kensei | Warrior of the Open Hand | Same monk chassis; the SRD subclass is unarmed, so the dedicated-weapon role is absent. |
| Assassin | Thief | Same rogue chassis; Thief's Reflexes supplies tempo, but there is no surprise-critical analogue. |
| Soulknife | Thief | Same rogue chassis; Sneak Attack remains, but psychic blades and psionic dice have no analogue. |
| Arcane Trickster | Thief | Same rogue chassis; Sneak Attack remains, but subclass spellcasting has no SRD rogue analogue. |
| Bladesinger | Evoker | Same wizard chassis only; Evoker is a ranged blast build and no melee-wizard analogue exists. |
| Hexblade | Fiend Patron | Same warlock chassis; Hex plus Agonizing Eldritch Blast remains, but weapon curse/armor roles are absent. |
| College of Valor | College of Lore | D233 precedent: Lore retains Bardic Inspiration support and adds Magical Discoveries, without martial Extra Attack. Its CME burst and day cells are declared upper bounds: burst front-loads the largest remaining slots, and day omits cross-combat CME recasts. |
| College of Swords | College of Lore | Same bard chassis; Cutting Words replaces support tempo, with no weapon flourish analogue. Its CME burst and day cells carry the same declared upper-bound caveat. |
| Great Weapon Master | Savage Attacker | D233 precedent: the SRD origin feat gives a smaller once-per-turn weapon-die spike, with no power attack or bonus attack. |
| Sharpshooter | No analogue — role absent | Archery style improves accuracy, but SRD has no feat that supplies the guide's ranged damage package. |
| Crossbow Expert | Thief shortbow posture; no loading analogue | The legal ranged Thief uses a two-handed shortbow. The SRD has no feat that supplies free-hand/loading relief for the excluded dual-hand-crossbow guide posture. |
| Elven Accuracy | No analogue — role absent | No SRD feat grants the guide's three-d20 advantage reroll. |
| Elemental Adept | Evoker | Empowered Evocation adds Intelligence to an evocation roll, but no SRD feat bypasses resistance or raises low die faces. |
| Metamagic Adept | Draconic Sorcery | Native Sorcerer Metamagic supplies Quickened Spell; no feat-based cross-class metamagic analogue is used. |
| Spell Sniper | Fiend Patron | Agonizing Eldritch Blast preserves the ranged cantrip role, but no feat-based range/cover package is modeled. |

The exact SRD sections used by each modeled build are catalogued in the
provenance header of `sim.ts`.
