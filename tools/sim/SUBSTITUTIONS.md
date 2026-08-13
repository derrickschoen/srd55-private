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
| Great Weapon Master (2024) | Savage Attacker | The non-SRD 2024 feat adds PB damage once per turn on a Heavy-weapon hit and a Bonus Action attack after a critical hit or kill. The older -5/+10 package is the 2014 feat and is not the reference. D233's SRD stand-in remains the smaller once-per-turn weapon-die spike. |
| Sharpshooter (2024) | No analogue — role absent | The non-SRD 2024 feat removes cover/long-range penalties and firing-in-melee Disadvantage; it has no -5/+10 damage option. That package belongs to the 2014 feat. Archery improves accuracy, but the SRD has no damage analogue. |
| Crossbow Expert | Thief shortbow posture; no loading analogue | The legal ranged Thief uses a two-handed shortbow. The SRD has no feat that supplies free-hand/loading relief for the excluded dual-hand-crossbow guide posture. |
| Elven Accuracy | No analogue — role absent | No SRD feat grants the guide's three-d20 advantage reroll. |
| Elemental Adept | Evoker | Empowered Evocation adds Intelligence to an evocation roll, but no SRD feat bypasses resistance or raises low die faces. |
| Metamagic Adept | Draconic Sorcery | Native Sorcerer Metamagic supplies Quickened Spell; no feat-based cross-class metamagic analogue is used. |
| Spell Sniper | Fiend Patron | Agonizing Eldritch Blast preserves the ranged cantrip role, but no feat-based range/cover package is modeled. |

The exact SRD sections used by each modeled build are catalogued in the
provenance header of `sim.ts`.

## Rotations

Published optimization rotations often assume mechanics not present in the
pinned SRD 5.2.1. They are useful context but are not simulator inputs.

| Non-SRD rotation element | Disposition |
|---|---|
| 2024 Great Weapon Master | Not modeled. Its +PB once-per-turn Heavy hit and critical/kill Bonus Action attack are outside SRD; the 2014 -5/+10 version is also not used. |
| 2024 Sharpshooter | Not modeled. It has no -5/+10 damage mode, and its cover/range/firing-in-melee benefits do not provide the missing SRD damage role. |
| Crossbow Expert, Piercer, Slasher, and Skulker | Not modeled. Their loading, damage-type, reroll, and Hide-loop packages are absent from the pinned SRD. |
| Hunter's Mark re-target on kill | Not modeled. The SRD 5.2.1 spell marks one creature and has no transfer or re-mark clause; a guide rotation using one is not sourced here. |
| Guide-only subclass packages | Gloom Stalker ambush, Battle Master maneuvers, Assassin surprise criticals, Open Hand dart feat packages, and other named non-SRD subclasses/feats remain substitutions rather than imported mechanics. |
| Guide-only spell selections | Synaptic Static and other spells absent from the pinned SRD are not borrowed through Magical Secrets or used to enlarge a caster rotation. |

SRD-legal mechanics that remain deliberately unpriced are recorded in
`ROTATION_AUDIT.md`, including stationary-target Slow/Sap, terrain- and
item-dependent Fast Hands/Hide, Horde Breaker's second-target requirement,
and repeat Overchannel self-damage.
